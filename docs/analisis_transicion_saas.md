# Análisis de Transición a Modelo SaaS
## Proyecto: FastInventory Core → FastInventory SaaS

---

**Versión:** 0.1  
**Fecha:** 10/04/2026  
**Estado:** Borrador para revisión  
**Autor(es):** Equipo de Desarrollo  

---

## Tabla de Contenidos

1. [Contexto del Cambio](#1-contexto-del-cambio)
2. [Lo que debe AGREGARSE (nuevo en SaaS)](#2-lo-que-debe-agregarse-nuevo-en-saas)
3. [Lo que puede CONSERVARSE (reutilizable)](#3-lo-que-puede-conservarse-reutilizable)
4. [Lo que debe DESCARTARSE o REEMPLAZARSE](#4-lo-que-debe-descartarse-o-reemplazarse)
5. [Impacto en la Documentación Existente](#5-impacto-en-la-documentación-existente)
6. [Resumen Ejecutivo de Cambios](#6-resumen-ejecutivo-de-cambios)

---

## 1. Contexto del Cambio

### 1.1 ¿Qué es el modelo actual?

FastInventory Core v1.0 es un sistema **single-tenant**: se despliega una instancia separada de la aplicación y la base de datos por cada cliente. Todos los datos viven en una sola base de datos sin ningún mecanismo de separación lógica entre organizaciones.

### 1.2 ¿Qué implica el modelo SaaS?

Un modelo **SaaS multi-tenant** significa que:

- **Una sola infraestructura** sirve a múltiples negocios (tenants) simultáneamente.
- Cada tenant (negocio) tiene sus propios datos aislados, pero comparte la misma API y el mismo servidor.
- Los negocios pueden **suscribirse, pagar y cancelar** de forma autónoma.
- El equipo de desarrollo administra un único sistema centralizado en lugar de múltiples despliegues.

### 1.3 Estrategia de Multi-tenancy recomendada

Para este proyecto se propone la estrategia **Single Database + `tenant_id` en cada tabla** (también llamada "Row-Level Tenancy"):

| Estrategia | Ventajas | Desventajas |
|---|---|---|
| **Una BD por tenant** | Máximo aislamiento, fácil backup por cliente | Costoso, difícil de escalar, gestión compleja |
| **Un esquema por tenant (PostgreSQL schemas)** | Buen aislamiento a nivel SQL | Migraciones complejas al escalar |
| **✅ Tabla compartida con `tenant_id`** | Fácil de implementar, bajo costo de infra, Alembic simple | Requiere filtrado riguroso en cada consulta |

Se elige la tercera opción por su compatibilidad con la arquitectura actual (SQLAlchemy, Alembic) y su menor costo operacional inicial.

---

## 2. Lo que debe AGREGARSE (nuevo en SaaS)

### 2.1 Módulo de Tenants (Negocios / Organizaciones)

Este es el cambio más fundamental. Se necesita un nuevo dominio de negocio que no existe en la v1.0:

#### Modelo de datos `tenants`

| Campo | Tipo SQL | Descripción |
|---|---|---|
| `id` | `UUID` | PK — Identificador único del tenant |
| `name` | `VARCHAR(150)` | Nombre del negocio (ej. "Tienda Don Pedro") |
| `slug` | `VARCHAR(100)` | Identificador URL-friendly único (ej. `tienda-don-pedro`) |
| `plan` | `ENUM('free', 'basic', 'pro')` | Plan de suscripción activo |
| `is_active` | `BOOLEAN` | Estado del tenant (suspendido, activo) |
| `created_at` | `TIMESTAMP` | Fecha de registro |

#### Nuevos endpoints necesarios

| Endpoint | Descripción |
|---|---|
| `POST /tenants/register` | Auto-registro de un nuevo negocio (público) |
| `GET /tenants/me` | Información del tenant actual (admin del tenant) |
| `PUT /tenants/me` | Actualizar datos del negocio |
| `DELETE /tenants/me` | Solicitar baja del servicio |

> **Nota:** La gestión de todos los tenants desde una consola de superadmin es una funcionalidad adicional que se documenta en la sección 2.5.

---

### 2.2 Campo `tenant_id` en TODAS las tablas de datos

Cada tabla existente debe incluir una clave foránea hacia `tenants.id`. Esto garantiza el aislamiento de datos entre negocios:

| Tabla afectada | Cambio requerido |
|---|---|
| `users` | Agregar `tenant_id UUID FK → tenants.id` |
| `categories` | Agregar `tenant_id UUID FK → tenants.id` |
| `products` | Agregar `tenant_id UUID FK → tenants.id` |
| `sales` | Agregar `tenant_id UUID FK → tenants.id` |
| `sale_items` | Se hereda via `sale_id`, pero se recomienda agregar también por performance |

**Impacto:** Todas las consultas del ORM deben filtrar por `tenant_id` de forma obligatoria. Se debe implementar un mecanismo global (middleware o dependencia FastAPI) que inyecte el `tenant_id` en cada request.

---

### 2.3 Identificación del Tenant en cada Request

En el modelo actual, el JWT solo contiene `sub` (username) y `role`. En el modelo SaaS, debe incluir también el `tenant_id`:

**JWT actual:**
```json
{
  "sub": "empleado1",
  "role": "employee",
  "exp": 1234567890
}
```

**JWT requerido en SaaS:**
```json
{
  "sub": "empleado1",
  "role": "employee",
  "tenant_id": "uuid-del-negocio",
  "exp": 1234567890
}
```

Se debe crear una dependencia FastAPI `get_current_tenant()` que extraiga el `tenant_id` del token y lo propague a los repositorios en cada request.

---

### 2.4 Módulo de Planes y Suscripciones

El modelo SaaS requiere gestionar qué puede hacer cada tenant según su plan:

#### Límites por plan (ejemplo)

| Feature | Plan Free | Plan Basic | Plan Pro |
|---|---|---|---|
| Productos máximos | 50 | 500 | Ilimitado |
| Usuarios del tenant | 2 | 10 | Ilimitado |
| Reportes disponibles | Solo diario | Diario + quincenal | Todos + PDF |
| Historial de ventas | 30 días | 6 meses | Ilimitado |

Se necesita un sistema de **feature flags por plan** que valide en cada endpoint si el tenant tiene acceso a esa funcionalidad.

---

### 2.5 Panel de Super-Administrador (SaaS Admin)

Se requiere un nuevo actor y sus endpoints: el **operador de la plataforma**, distinto del administrador de cada negocio:

| Recurso | Descripción |
|---|---|
| `GET /admin/tenants` | Listar todos los tenants registrados |
| `PATCH /admin/tenants/{id}/suspend` | Suspender un tenant por incumplimiento |
| `PATCH /admin/tenants/{id}/change-plan` | Cambiar el plan de un tenant |
| `GET /admin/metrics` | Métricas globales de la plataforma |

Este actor tiene un rol especial `superadmin` que no pertenece a ningún tenant específico.

---

### 2.6 Registro y Onboarding de Nuevos Clientes

En el modelo actual, el administrador del tenant es creado manualmente. En SaaS se necesita un flujo público de registro:

1. **`POST /auth/register`** — El nuevo cliente crea su cuenta y su tenant en un solo paso.
2. **Creación automática del primer Admin** — Al registrar el tenant, se crea automáticamente el primer usuario con rol `admin`.
3. **Email de bienvenida** — Notificación opcional post-registro (requiere integración con servicio de correo como SendGrid o Resend).

---

### 2.7 Sistema de Billing / Pagos (Integración Externa)

El modelo SaaS requiere cobrar a los tenants. Opciones:

| Opción | Descripción |
|---|---|
| **Stripe** | Estándar de la industria, excelente API, soporta suscripciones recurrentes |
| **Wompi / PayU** | Alternativas regionales (Colombia, Latinoamérica) |
| **Facturación manual** | Para la fase inicial, facturación fuera del sistema |

En la primera versión SaaS se recomienda iniciar con **facturación manual** e integrar Stripe en la segunda iteración para no aumentar la complejidad del MVP.

---

### 2.8 Nuevos Atributos de Calidad requeridos

| ID | Atributo | Especificación nueva |
|---|---|---|
| **AQ-MT-01** | Aislamiento de datos | Ninguna consulta puede retornar datos de un tenant diferente al del token JWT. Verificable mediante pruebas de penetración de frontera de tenant. |
| **AQ-MT-02** | Escalabilidad | El sistema debe soportar al menos 100 tenants activos con 50 usuarios concurrentes c/u sin degradación (5.000 usuarios totales). Requiere revisar los pools de conexión y posiblemente introducir caché (Redis). |
| **AQ-MT-03** | Disponibilidad SLA | En SaaS, la disponibilidad objetivo sube de 99% (single-tenant) a **99.5% o 99.9%** (SLA publicado en los planes). Requiere monitoreo proactivo (Uptime Robot, Grafana). |
| **AQ-MT-04** | Rate Limiting | Cada tenant debe tener límites de uso de la API (requests/minuto) para prevenir abuso y garantizar calidad de servicio entre tenants. |

---

## 3. Lo que puede CONSERVARSE (reutilizable)

La arquitectura modular del proyecto facilita enormemente la transición. La mayoría de la lógica de negocio puede conservarse con ajustes mínimos:

### 3.1 Stack Tecnológico — Se conserva íntegramente ✅

| Componente | Decisión |
|---|---|
| Python 3.11+ + FastAPI | **Sin cambios.** El sistema de dependencias de FastAPI es ideal para implementar multi-tenancy via middleware. |
| PostgreSQL 14+ | **Sin cambios.** Row-Level Tenancy es perfectamente compatible. Se añaden índices compuestos por `tenant_id`. |
| SQLAlchemy 2.0+ async + asyncpg | **Sin cambios.** Los repositorios reciben `tenant_id` como parámetro adicional en sus métodos. |
| Alembic para migraciones | **Sin cambios.** Las migraciones son las mismas, solo se agregan columnas `tenant_id`. |
| Docker + Docker Compose | **Sin cambios** para desarrollo. En producción, el despliegue escala a un solo contenedor multi-tenant en lugar de N contenedores. |
| Pydantic v2 + pydantic-settings | **Sin cambios.** |
| FPDF2 para PDFs | **Sin cambios.** Solo se actualiza el encabezado del PDF para usar el nombre del tenant, no el de un negocio fijo. |

---

### 3.2 Módulos de Negocio — Se conservan con ajustes menores ✅

| Módulo | Estado | Ajuste requerido |
|---|---|---|
| **Módulo de Productos** | ✅ Conservar | Agregar filtro `WHERE tenant_id = :tenant_id` en todos los repositorios. |
| **Módulo de Categorías** | ✅ Conservar | Mismo ajuste de `tenant_id`. |
| **Módulo de Ventas** | ✅ Conservar | Mismo ajuste de `tenant_id`. La lógica transaccional (stock, ROLLBACK) no cambia. |
| **Módulo de Reportes** | ✅ Conservar | Los reportes ya son por período. Se añade el filtro de `tenant_id` en las consultas SQL. |
| **Módulo de Usuarios** | ✅ Conservar con cambio | Los usuarios ahora pertenecen a un tenant. Se agrega `tenant_id` a la tabla `users`. El admin solo puede gestionar usuarios DE SU tenant. |

---

### 3.3 Atributos de Calidad — Se conservan y amplían ✅

Los atributos de calidad definidos en el SRS son válidos y extensibles al modelo SaaS:

| Atributo | Estado en SaaS |
|---|---|
| Atomicidad de ventas (AQ-REL-01) | ✅ Sin cambio. Aplica por tenant de forma natural. |
| HTTPS obligatorio (AQ-SEC-05) | ✅ Sin cambio. Más crítico en SaaS. |
| Hashing bcrypt (AQ-SEC-03) | ✅ Sin cambio. |
| Diseño stateless / JWT (AQ-ESC-01) | ✅ Sin cambio. El token ahora incluye `tenant_id`. |
| Organización modular del código (AQ-MNT-01) | ✅ Sin cambio. Vertical Slicing facilita agregar el módulo `tenants`. |
| Documentación Swagger (AQ-MNT-05) | ✅ Sin cambio. |
| Paginación (AQ-USA-03) | ✅ Sin cambio. |

---

### 3.4 Decisiones Arquitectónicas (ADR) — Se conservan ✅

Todos los ADR del documento de Drivers Arquitectónicos siguen siendo válidos:

| ADR | Estado |
|---|---|
| ADR-01: Monolito Modular | ✅ Válido. El monolito modular escala bien para la primera etapa del SaaS. |
| ADR-02: Vertical Slicing | ✅ Válido. Se añade un nuevo slice `tenants/`. |
| ADR-03: Arquitectura en Capas (Router → Service → Repository) | ✅ Válido. El `tenant_id` viaja del Router al Service al Repository por inyección de dependencias. |
| ADR-04: asyncpg como driver async | ✅ Válido. |
| ADR-05: PDF en memoria con FPDF2 | ✅ Válido. |

---

### 3.5 Historias de Usuario — Se conservan (12 HU actuales) ✅

Las 12 historias de usuario existentes (HU-01 a HU-12) siguen siendo válidas. Solo cambia el **contexto**: ahora cada empleado y administrador pertenece a un tenant específico, pero las operaciones que realizan son idénticas.

---

## 4. Lo que debe DESCARTARSE o REEMPLAZARSE

### 4.1 Restricción RA-02 — Single-Tenant ❌ ELIMINAR

> **Restricción actual (RA-02):** *"El sistema opera bajo el modelo de un único negocio (single-tenant). No se soportan múltiples negocios o sucursales en la v1.0."*

Esta restricción desaparece completamente. Es la razón de ser de todo este análisis.

---

### 4.2 Variable de entorno `BUSINESS_NAME` ❌ REEMPLAZAR

En el modelo actual, el nombre del negocio que aparece en el PDF se configura con la variable de entorno `BUSINESS_NAME`. En SaaS, cada tenant tiene su propio nombre almacenado en la tabla `tenants`.

**Antes (single-tenant):**
```env
BUSINESS_NAME=Tienda Don Pedro
```

**Después (SaaS):**
```python
# El nombre del negocio se lee de la DB, no de una variable de entorno global
tenant = await tenant_repository.get_by_id(tenant_id)
business_name = tenant.name
```

---

### 4.3 Asunción SA-03 — Sin multi-tenant ❌ ELIMINAR

> **Suposición actual (SA-03):** *"El negocio opera con una única sucursal; no se requiere soporte multi-tenant en esta versión."*

Esta suposición se convierte en su opuesto: el sistema **está diseñado específicamente** para múltiples negocios.

---

### 4.4 Enunciado de Visión — Debe reescribirse ⚠️ REEMPLAZAR

El enunciado de visión actual posiciona el producto "a diferencia de las plataformas SaaS genéricas de terceros". En el nuevo modelo, **el producto ES una plataforma SaaS**, por lo que el enunciado debe reescribirse desde cero.

**Visión actual:**
> *"A diferencia de las plataformas SaaS genéricas de terceros, nuestro producto es de propiedad exclusiva del cliente..."*

**Visión propuesta para SaaS:**
> *"Para dueños de pequeños negocios de venta de productos físicos que necesitan controlar su inventario y ventas sin invertir en desarrollo propio, **FastInventory SaaS** es una plataforma de gestión de inventario y punto de venta lista para usar, que permite a cualquier negocio registrarse y operar en minutos, con datos completamente aislados de otros clientes, a un costo de suscripción mensual accesible."*

---

### 4.5 Restricción RT-07 (Sin caché en v1.0) ⚠️ REVISAR

> **Restricción actual (RT-07):** *"La versión 1.0 no implementa sistema de caché."*

Con múltiples tenants activos simultáneamente, este límite podría volverse un cuello de botella. Con 100+ tenants activos, las consultas de productos y categorías se repetirán constantemente. Se recomienda **revisar y posiblemente eliminar** esta restricción para el MVP SaaS, considerando un caché con **Redis** con invalidación por `tenant_id`.

---

### 4.6 Objetivo de concurrencia AQ-PERF-04 ⚠️ ESCALAR

> **Actual:** soportar 50 usuarios concurrentes.

En SaaS con múltiples tenants, este número debe revisarse significativamente al alza. El nuevo target depende del número de tenants activos estimados en el lanzamiento.

---

### 4.7 Backup de base de datos por cliente ⚠️ REVISAR

En el modelo actual (RA-04 implícito), el backup beneficia a un solo cliente. En SaaS, el backup es compartido entre todos los tenants. Se debe definir:

- ¿Se ofrecerá exportación de datos por tenant como feature del plan Pro?
- ¿Qué sucede con los datos de un tenant que cancela su suscripción?

Estas son decisiones de negocio que deben documentarse como nuevas políticas.

---

## 5. Impacto en la Documentación Existente

| Documento | Impacto | Acción requerida |
|---|---|---|
| **Visión y Alcance** | 🔴 Alto | Reescribir: visión, antecedentes, objetivos de negocio, interesados (agregar tenant admin y superadmin), alcance (agregar módulo tenants, billing). |
| **Requerimientos de Usuario** | 🟡 Medio | Conservar las 12 HU actuales. Agregar nuevas HU para: registro de tenant, gestión de plan, onboarding, panel superadmin. Actualizar el enunciado de actores. |
| **SRS (Especificación de Requerimientos)** | 🔴 Alto | Agregar módulo de Tenants (RF-00). Agregar `tenant_id` a las estructuras de datos de todos los módulos. Actualizar atributos de calidad de escalabilidad y disponibilidad. Eliminar restricciones RA-02, SA-03. Agregar nuevas restricciones de billing. |
| **Drivers Arquitectónicos** | 🟡 Medio | Agregar nuevo QAS para aislamiento multi-tenant. Agregar ADR-06 sobre la estrategia de tenancy (Row-Level vs Schema-per-tenant). Actualizar la estructura de carpetas para incluir `modules/tenants/`. |

---

## 6. Resumen Ejecutivo de Cambios

```
┌─────────────────────────────────────────────────────────────────────┐
│                    RESUMEN DE TRANSICIÓN A SaaS                     │
├─────────────────┬───────────────────────────────────────────────────┤
│  🆕 AGREGAR     │ Módulo de Tenants (tabla + API + lógica)           │
│                 │ Campo tenant_id en todas las tablas                │
│                 │ tenant_id en el payload del JWT                    │
│                 │ Dependencia get_current_tenant() en FastAPI        │
│                 │ Módulo de Planes/Feature Flags                     │
│                 │ Panel de Superadmin (nuevo actor)                  │
│                 │ Flujo de registro público (onboarding)             │
│                 │ Integración de billing (Stripe, en v2)             │
│                 │ Rate Limiting por tenant                           │
│                 │ Redis para caché (recomendado)                     │
├─────────────────┼───────────────────────────────────────────────────┤
│  ✅ CONSERVAR   │ Stack tecnológico completo (FastAPI, PG, SQLAlchemy)│
│                 │ Los 5 módulos de negocio (con filtro tenant_id)    │
│                 │ Las 12 Historias de Usuario existentes             │
│                 │ Todos los ADR arquitectónicos                      │
│                 │ Atributos de calidad base (seguridad, atomicidad)  │
│                 │ Organización Vertical Slicing                      │
│                 │ Generación de PDF en memoria (FPDF2)               │
├─────────────────┼───────────────────────────────────────────────────┤
│  ❌ DESCARTAR   │ Restricción RA-02 (modelo single-tenant)           │
│                 │ Suposición SA-03 (sin multi-tenant)                │
│                 │ Variable de entorno BUSINESS_NAME (reemplazar por  │
│                 │   campo en tabla tenants)                          │
│                 │ Enunciado de visión actual (reescribir)            │
│  ⚠️ REVISAR    │ Restricción RT-07 (sin caché)                      │
│                 │ AQ-PERF-04 (target de concurrencia: 50 usuarios)   │
│                 │ Política de backup y retención de datos por tenant │
└─────────────────┴───────────────────────────────────────────────────┘
```

---

*Documento elaborado como análisis previo a la refactorización de la documentación del proyecto FastInventory Core para su transición al modelo SaaS.*  
*Versión 0.1 — 10/04/2026. Sujeto a revisión del equipo antes de iniciar la refactorización documental.*
