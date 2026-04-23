# Documento de Drivers Arquitectónicos
## Proyecto: FastInventory SaaS

---

**Versión:** 2.0  
**Fecha:** 10/04/2026  
**Estado:** Borrador Inicial  
**Autor(es):** Equipo de Desarrollo

---

## Tabla de Contenidos

1. [Introducción](#1-introducción)
2. [Estilo y Tipo de Arquitectura](#2-estilo-y-tipo-de-arquitectura)
   - 2.1 [Tipo: Monolito Modular](#21-tipo-monolito-modular)
   - 2.2 [Estilo de organización: Vertical Slicing](#22-estilo-de-organización-vertical-slicing)
   - 2.3 [Estilo interno por módulo: Arquitectura en Capas](#23-estilo-interno-por-módulo-arquitectura-en-capas)
   - 2.4 [Estructura de carpetas resultante](#24-estructura-de-carpetas-resultante)
3. [Drivers Arquitectónicos](#3-drivers-arquitectónicos)
   - 3.1 [Restricciones Arquitectónicas](#31-restricciones-arquitectónicas)
   - 3.2 [Atributos de Calidad Clave (QAS)](#32-atributos-de-calidad-clave-qas)
   - 3.3 [Requerimientos Funcionales con Impacto Arquitectónico](#33-requerimientos-funcionales-con-impacto-arquitectónico)
4. [Decisiones Arquitectónicas (ADR)](#4-decisiones-arquitectónicas-adr)

---

## 1. Introducción

### 1.1 Propósito

Este documento identifica y justifica los **drivers arquitectónicos** del proyecto FastInventory SaaS: las restricciones, atributos de calidad y requerimientos funcionales que tienen mayor influencia sobre las decisiones de diseño del sistema en su versión multitenant. Adicionalmente, formaliza las decisiones arquitectónicas mediante **Architecture Decision Records (ADR)**.

La transición del modelo v1.0 (single-tenant, sistema monocliente) al modelo v2.0 (SaaS, multi-tenant) introduce nuevos drivers que no existían en la versión anterior, particularmente en torno al aislamiento de datos, la escalabilidad de la plataforma y la gestión del ciclo de vida de los tenants.

### 1.2 ¿Qué es un Driver Arquitectónico?

Un driver arquitectónico es cualquier factor que obliga al arquitecto a tomar una decisión de diseño específica. No todos los requerimientos son drivers; solo aquellos que tienen un **impacto real y medible sobre la estructura del sistema** merecen esta categoría:

| Tipo | Descripción | Ejemplos en este proyecto |
|---|---|---|
| **Restricciones** | Decisiones ya tomadas y no negociables. | Python + FastAPI, PostgreSQL, Docker, Redis. |
| **Atributos de calidad** | Criterios de rendimiento, seguridad, aislamiento. | Atomicidad de ventas, RBAC, aislamiento multi-tenant, caché. |
| **Req. funcionales clave** | Funcionalidades cuya complejidad impacta la arquitectura. | Transacción de ventas, onboarding atómico, generación de PDF en memoria. |

---

## 2. Estilo y Tipo de Arquitectura

La arquitectura de FastInventory SaaS combina tres conceptos complementarios que operan en niveles diferentes:

```
NIVEL SISTEMA   →  Monolito Modular
NIVEL CÓDIGO    →  Vertical Slicing (organización por dominio)
NIVEL MÓDULO    →  Arquitectura en Capas (Router → Service → Repository)
```

Esta combinación se mantiene intacta respecto a la v1.0. La transición al modelo SaaS **no cambia el estilo de arquitectura**; lo que cambia es la incorporación del contexto del tenant como un elemento transversal que fluye por todas las capas en cada request.

---

### 2.1 Tipo: Monolito Modular

**Definición:** Un único proceso de despliegue que internamente está dividido en módulos con fronteras claras y bien definidas entre dominios de negocio.

**¿Por qué sigue siendo válido para el modelo SaaS?**

La pregunta natural al pasar a SaaS es: ¿no deberíamos migrar a microservicios? La respuesta, en este punto de evolución del producto, es no:

| Criterio | Situación en SaaS v2.0 | Decisión |
|---|---|---|
| Tamaño del equipo | 1–3 desarrolladores | Los microservicios añaden overhead operacional (orquestación, tracing distribuido, service meshes) que un equipo pequeño no puede gestionar eficientemente. |
| Volumen inicial de tenants | < 100 tenants activos en el lanzamiento | Un monolito bien optimizado con caché (Redis) maneja este volumen sin estrés. |
| Aislamiento de datos | Row-Level Tenancy (`tenant_id`) | El aislamiento se logra a nivel de aplicación (filtros en repositorios), no a nivel de infraestructura (bases de datos separadas). No requiere microservicios. |
| Transacciones críticas | Onboarding atómico (tenant + usuario) | En una arquitectura de microservicios, esta transacción requeriría un patrón **Saga**, que añade complejidad sin beneficio en este volumen. En el monolito es una sola transacción SQL. |
| Ruta de escalado | Módulos desacoplados por Vertical Slicing | El módulo de Reportes (el más costoso computacionalmente) puede extraerse como microservicio cuando el volumen de tenants lo justifique, sin reescribir el resto del sistema. |

**Beneficio clave:** El Monolito Modular es la **puerta de entrada al SaaS escalable**. Permite concentrar el esfuerzo inicial en las reglas de negocio y el aislamiento de datos, y extraer módulos en el futuro cuando la necesidad surja de forma orgánica.

---

### 2.2 Estilo de organización: Vertical Slicing

**Definición:** El código se organiza por **dominio funcional** (slice vertical que atraviesa todas las capas técnicas), en lugar de agrupar todos los routers juntos, todos los servicios juntos, etc.

```
# ❌ Organización horizontal (por capa técnica)
app/
├── routers/        # todos los routers mezclados
├── services/       # todos los servicios mezclados
├── models/         # todos los modelos mezclados
└── schemas/        # todos los esquemas mezclados

# ✅ Vertical Slicing (por dominio de negocio)
app/
└── modules/
    ├── tenants/    # todo lo del tenant (nuevo en v2.0)
    ├── auth/       # autenticación + JWT con tenant_id
    ├── users/      # gestión de usuarios scoped al tenant
    ├── products/   # productos scoped al tenant
    ├── categories/ # categorías scoped al tenant
    ├── sales/      # ventas scoped al tenant
    ├── reports/    # reportes scoped al tenant
    └── admin/      # super-administración (nuevo en v2.0)
```

**Relevancia para el modelo SaaS:**

En el contexto SaaS, el Vertical Slicing tiene una ventaja adicional: es más fácil identificar dónde falta el filtro de `tenant_id`. Si toda la lógica de productos vive en `modules/products/`, el equipo de desarrollo sabe exactamente dónde revisar para garantizar el aislamiento. En una organización horizontal, el filtro tendría que verificarse en múltiples carpetas dispersas.

---

### 2.3 Estilo interno por módulo: Arquitectura en Capas

**Definición:** Dentro de cada vertical slice, el código sigue una separación estricta de responsabilidades en tres capas:

```
┌─────────────────────────────────────────────────────────┐
│                 CAPA DE PRESENTACIÓN                    │
│  router.py + schemas.py (Pydantic)                      │
│  Responsabilidad: Recibir HTTP, validar datos,          │
│  extraer tenant_id del JWT, serializar respuestas.      │
│  No contiene lógica de negocio.                         │
├─────────────────────────────────────────────────────────┤
│             CAPA DE APLICACIÓN / NEGOCIO                │
│  service.py                                             │
│  Responsabilidad: Orquestar lógica de negocio           │
│  (validar stock, verificar límites de plan, calcular    │
│  totales). Recibe tenant_id como parámetro explícito.   │
│  No sabe de HTTP ni de SQL.                             │
├─────────────────────────────────────────────────────────┤
│                  CAPA DE DATOS                          │
│  repository.py + models.py (SQLAlchemy)                 │
│  Responsabilidad: Interactuar con PostgreSQL y Redis.   │
│  Toda consulta incluye WHERE tenant_id = :tenant_id.   │
│  Abstrae las consultas de la lógica de negocio.         │
└─────────────────────────────────────────────────────────┘
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
       PostgreSQL 14+             Redis 7+
    (datos de negocio)         (caché y estado)
```

**Regla de dependencia:** Las capas superiores pueden llamar a las inferiores, pero nunca al revés.

**Propagación del `tenant_id` por las capas:**

El `tenant_id` es extraído del JWT en la capa de Presentación (via la dependencia `get_current_tenant()`) y se propaga explícitamente hacia abajo como parámetro en cada llamada:

```
Router (extrae tenant_id del JWT via Depends)
  → Service.metodo(tenant_id=tenant_id, ...)
    → Repository.query(tenant_id=tenant_id, ...)
      → SQL: WHERE tenant_id = :tenant_id
```

Esta propagación explícita (en lugar de una variable global o de hilo) garantiza que el contexto del tenant es correcto en entornos con múltiples workers Uvicorn concurrentes.

---

### 2.4 Estructura de carpetas resultante

La combinación de los tres estilos produce la siguiente estructura de proyecto para la v2.0 SaaS:

```
fastinventory-saas/
├── app/
│   ├── main.py                    # Punto de entrada: instancia FastAPI, registra routers,
│   │                              # configura middleware de rate limiting
│   ├── core/
│   │   ├── config.py              # Configuración global (pydantic-settings)
│   │   ├── security.py            # JWT: crear y verificar tokens (incluye tenant_id)
│   │   ├── database.py            # Engine y Session de SQLAlchemy (async)
│   │   ├── cache.py               # Cliente Redis async y helpers de caché
│   │   └── dependencies.py        # Dependencias FastAPI: get_current_user,
│   │                              # get_current_tenant, require_admin, require_superadmin
│   ├── modules/
│   │   ├── tenants/               # [NUEVO] Dominio de tenants
│   │   │   ├── router.py          # POST /auth/register, GET/PUT /tenants/me
│   │   │   ├── service.py         # Lógica de onboarding, validación de límites de plan
│   │   │   ├── repository.py      # Consultas SQL a la tabla tenants
│   │   │   ├── models.py          # Modelo SQLAlchemy: Tenant, PlanAuditLog
│   │   │   └── schemas.py         # Pydantic: TenantCreate, TenantRead, PlanEnum
│   │   ├── auth/
│   │   │   └── router.py          # POST /auth/token (ahora incluye tenant_id en JWT)
│   │   ├── users/
│   │   │   ├── router.py          # CRUD /users/ (scoped al tenant)
│   │   │   ├── service.py         # Verifica límite de usuarios del plan
│   │   │   ├── repository.py      # WHERE tenant_id = :tenant_id en todas las queries
│   │   │   ├── models.py          # User (ahora con tenant_id FK)
│   │   │   └── schemas.py
│   │   ├── categories/
│   │   │   ├── router.py          # CRUD /categories/ (scoped al tenant)
│   │   │   ├── service.py
│   │   │   ├── repository.py      # Caché Redis + WHERE tenant_id
│   │   │   ├── models.py          # Category (ahora con tenant_id FK)
│   │   │   └── schemas.py
│   │   ├── products/
│   │   │   ├── router.py          # CRUD /products/ + búsqueda (scoped al tenant)
│   │   │   ├── service.py         # Verifica límite de productos del plan
│   │   │   ├── repository.py      # Caché Redis + WHERE tenant_id
│   │   │   ├── models.py          # Product (ahora con tenant_id FK)
│   │   │   └── schemas.py
│   │   ├── sales/
│   │   │   ├── router.py          # POST /sales/, GET /sales/ (scoped al tenant)
│   │   │   ├── service.py         # Transacción: validación stock + inserción + descuento
│   │   │   ├── repository.py      # WHERE tenant_id en ventas e ítems
│   │   │   ├── models.py          # Sale, SaleItem (ambos con tenant_id FK)
│   │   │   └── schemas.py
│   │   ├── reports/
│   │   │   ├── router.py          # GET /reports/daily, /biweekly, /monthly, /daily/pdf
│   │   │   ├── service.py         # Construcción de reportes + validación de plan
│   │   │   └── schemas.py
│   │   └── admin/                 # [NUEVO] Super-administración de plataforma
│   │       ├── router.py          # GET/PATCH /admin/tenants/...
│   │       ├── service.py         # Lógica de suspensión, cambio de plan, auditoría
│   │       └── schemas.py
├── migrations/                    # Alembic: versiones del esquema de BD
│   ├── versions/
│   └── env.py
├── tests/
│   ├── test_auth.py
│   ├── test_tenants.py            # [NUEVO] Pruebas de onboarding y gestión de tenants
│   ├── test_products.py
│   ├── test_sales.py
│   ├── test_tenant_isolation.py   # [NUEVO] Pruebas de frontera entre tenants
│   └── conftest.py                # Fixtures: BD de prueba, cliente HTTP, tokens,
│                                  # creación de tenants de prueba
├── .env.example                   # Plantilla de variables de entorno (incluye REDIS_URL)
├── docker-compose.yml             # Orquesta API + PostgreSQL + Redis
├── Dockerfile
└── requirements.txt
```

---

## 3. Drivers Arquitectónicos

### 3.1 Restricciones Arquitectónicas

Las restricciones son condicionantes no negociables en la v2.0. Su cumplimiento debe verificarse en cada decisión de diseño:

| ID | Restricción | Impacto en la arquitectura |
|---|---|---|
| **CA-01** | Python 3.11+ con FastAPI como framework web. | El sistema de dependencias `Depends()` de FastAPI es el mecanismo central para propagar el `tenant_id` desde el JWT hasta los repositorios. |
| **CA-02** | PostgreSQL 14+ como único motor de BD con estrategia Row-Level Tenancy. | Todas las tablas de datos tienen una columna `tenant_id UUID FK → tenants.id`. El ORM nunca ejecuta una consulta de datos sin ese filtro. No se usan schemas separados por tenant. |
| **CA-03** | SQLAlchemy 2.0+ async como ORM con `asyncpg`. | Toda la capa de datos es asíncrona. Los repositorios reciben `AsyncSession` y `tenant_id` como dependencias. El `tenant_id` es un parámetro explícito de todos los métodos de repositorio, nunca una variable implícita o de hilo. |
| **CA-04** | Alembic para gestión de migraciones. | Los modelos SQLAlchemy son la fuente de verdad del esquema. La columna `tenant_id` se añade a los modelos existentes via una única migración de Alembic. |
| **CA-05** | Docker + Docker Compose para despliegue. | El `docker-compose.yml` orquesta tres servicios: `api`, `postgres` y `redis`. Ningún servicio puede depender de software instalado fuera del `Dockerfile`. |
| **CA-06** | Generación de PDF en memoria con FPDF2. | El módulo de reportes no escribe archivos temporales en disco. El nombre del negocio en el PDF se lee de `tenants.name`, no de una variable de entorno global. |
| **CA-07** | Configuración 100% por variables de entorno. | Se añade `REDIS_URL` y `RATE_LIMIT_PER_MINUTE` al conjunto de variables requeridas. El archivo `.env.example` se actualiza. |
| **CA-08** | Redis 7+ como sistema de caché y estado compartido. | El caché de catálogos (productos, categorías) y la verificación del estado del tenant (`is_active`) se delegan a Redis con TTLs definidos. Si Redis no está disponible, el sistema continúa en modo degradado consultando directamente la BD. |

---

### 3.2 Atributos de Calidad Clave (QAS)

Los QAS describen la situación, el estímulo y la respuesta esperada del sistema. Solo se documentan aquí los que tienen **mayor influencia sobre las decisiones arquitectónicas**.

---

**QAS-01 — Integridad transaccional de ventas (Confiabilidad)**

| Campo | Descripción |
|---|---|
| **Fuente del estímulo** | Un empleado del tenant A envía una solicitud de registro de venta con 3 ítems. |
| **Estímulo** | Después de insertar la venta en BD, el proceso falla al descontar el stock del tercer ítem. |
| **Entorno** | Operación normal en producción con múltiples tenants activos. |
| **Artefacto** | `SaleService` + `SaleRepository` del tenant A. |
| **Respuesta esperada** | La transacción completa se revierte (ROLLBACK). La venta y los descuentos de stock quedan en estado inconsistente 0% del tiempo. El cliente recibe HTTP 500. Los datos de otros tenants no se ven afectados. |
| **Medida** | 0% de ventas en estado inconsistente en cualquier tenant. |
| **Decisión arquitectónica** | Uso de `async with session.begin()` en `SaleService`. El `tenant_id` se verifica dentro de la misma transacción antes de procesar cada ítem. |

---

**QAS-02 — Control de acceso por rol (Seguridad)**

| Campo | Descripción |
|---|---|
| **Fuente del estímulo** | Un empleado autenticado del tenant B envía una solicitud a `GET /reports/daily`. |
| **Estímulo** | Token JWT válido con `role = "employee"` y `tenant_id = tenant_B`. |
| **Entorno** | Operación normal. |
| **Artefacto** | Dependencia FastAPI: `require_admin`. |
| **Respuesta esperada** | HTTP 403. El sistema no procesa la lógica del reporte. El reporte del tenant B no se expone. |
| **Medida** | 100% de las rutas de administrador protegidas por `require_admin`. |
| **Decisión arquitectónica** | `get_current_user` y `require_admin` como dependencias de FastAPI inyectables (`Depends`) en el decorador de cada ruta. |

---

**QAS-03 — Aislamiento de datos entre tenants (Seguridad / Isolation)**

| Campo | Descripción |
|---|---|
| **Fuente del estímulo** | Un administrador del tenant A, conociendo el UUID de un producto del tenant B, envía `GET /products/{product_id_de_B}`. |
| **Estímulo** | Token JWT válido con `tenant_id = tenant_A`. El `product_id` pertenece al tenant B. |
| **Entorno** | Operación normal. |
| **Artefacto** | `ProductRepository.get_by_id(tenant_id, product_id)`. |
| **Respuesta esperada** | HTTP 404. El sistema no revela la existencia del recurso en otro tenant. |
| **Medida** | 0% de solicitudes que retornan datos de un tenant diferente al del token JWT. Verificable mediante pruebas automatizadas de frontera de tenant en CI/CD. |
| **Decisión arquitectónica** | Toda consulta en los repositorios incluye `WHERE tenant_id = :tenant_id AND id = :id`. El `tenant_id` proviene del JWT, nunca del cuerpo de la petición. |

---

**QAS-04 — Mantenibilidad y extensibilidad modular (Mantenibilidad)**

| Campo | Descripción |
|---|---|
| **Fuente del estímulo** | El equipo decide añadir un módulo de "Proveedores" en la v3.0. |
| **Estímulo** | Un nuevo desarrollador debe incorporar el módulo sin modificar los módulos existentes. |
| **Entorno** | Evolución del sistema post-lanzamiento SaaS. |
| **Artefacto** | Estructura de carpetas y `app/main.py`. |
| **Respuesta esperada** | El desarrollador crea `app/modules/suppliers/` con sus capas internas, el model incluye `tenant_id`, y registra el router en `main.py`. Ningún módulo existente se modifica. |
| **Medida** | Integración de un nuevo módulo tompcone en menos de 1 jornada de trabajo. |
| **Decisión arquitectónica** | Vertical Slicing + registro de routers por inclusión en `main.py`. El patrón de `tenant_id` está establecido como convención en todos los módulos existentes. |

---

**QAS-05 — Tiempo de respuesta en búsqueda bajo carga multi-tenant (Desempeño)**

| Campo | Descripción |
|---|---|
| **Fuente del estímulo** | 50 tenants activos simultáneamente realizan búsquedas de productos al mismo tiempo. |
| **Estímulo** | 50 solicitudes concurrentes a `GET /products/?search=` de diferentes tenants. |
| **Entorno** | Carga normal de la plataforma. |
| **Artefacto** | `ProductRepository` + índice compuesto `(tenant_id, name)` en PostgreSQL + caché Redis. |
| **Respuesta esperada** | El servidor devuelve los resultados de cada tenant en ≤ 500 ms. |
| **Medida** | P95 ≤ 500 ms en pruebas de carga con 50 tenants × 50 usuarios. |
| **Decisión arquitectónica** | Índice compuesto `(tenant_id, name)` en PostgreSQL. Caché Redis por tenant con TTL de 60 segundos para listados de productos. |

---

**QAS-06 — Atomicidad del onboarding multi-paso (Confiabilidad)**

| Campo | Descripción |
|---|---|
| **Fuente del estímulo** | Un nuevo negocio completa el formulario de registro en la plataforma. |
| **Estímulo** | El proceso crea el tenant en BD, pero falla al crear el usuario administrador. |
| **Entorno** | Operación de registro bajo carga normal. |
| **Artefacto** | `TenantService.register_tenant()`. |
| **Respuesta esperada** | El tenant creado se revierte (ROLLBACK). No existe un tenant huérfano sin administrador. El cliente recibe HTTP 500 y puede reintentar. |
| **Medida** | 0% de tenants registrados sin usuario administrador asociado. |
| **Decisión arquitectónica** | El método `TenantService.register_tenant()` envuelve la creación del tenant y del usuario en una única transacción SQL con `async with session.begin()`. |

---

### 3.3 Requerimientos Funcionales con Impacto Arquitectónico

No todos los requerimientos funcionales influyen en la arquitectura. Los siguientes tienen impacto directo sobre el diseño del sistema:

| Requerimiento | Impacto arquitectónico |
|---|---|
| **HU-13: Registro autónomo de negocio (onboarding)** | Requiere un endpoint público (sin autenticación) y una transacción atómica de dos pasos (crear tenant + crear usuario admin). El `TenantService` debe gestionar la transacción explícitamente, no delegar al repositorio. |
| **HU-05: Registro de venta multi-ítem** | Requiere gestión de transacciones explícitas en `SaleService`. Dentro de la transacción, el `tenant_id` de cada producto se verifica contra el del JWT antes de decrementar el stock. |
| **HU-10: Generación de PDF en demanda** | El `ReportService` lee `tenants.name` de la BD (no de una variable de entorno) para el encabezado del PDF. El nombre del archivo incluye el `tenant_slug` para distinguir reportes entre tenants. |
| **HU-09/11/12: Reportes con restricción de plan** | El `ReportService` verifica `tenant.plan` antes de procesar el reporte. Si el plan no permite el reporte solicitado, retorna HTTP 403 sin ejecutar la consulta SQL costosa. |
| **HU-16/17: Suspensión y cambio de plan de tenant** | La suspensión debe tener efecto inmediato en todos los requests en curso. Se implementa mediante caché Redis con TTL corto (30 s) para el estado del tenant, verificado por la dependencia `get_current_tenant()` en cada request. |
| **RF-07: Super-administración de plataforma** | El módulo `admin/` opera sin filtro de `tenant_id`. La dependencia `require_superadmin` reemplaza a `get_current_tenant` en estos endpoints. Esta es la única excepción explícita y documentada a la regla de filtrado por tenant. |

---

## 4. Decisiones Arquitectónicas (ADR)

Un **ADR (Architecture Decision Record)** documenta una decisión relevante: el contexto que la generó, las opciones consideradas, la decisión tomada y sus consecuencias.

---

### ADR-01: Monolito Modular como tipo de sistema

| Campo | Descripción |
|---|---|
| **Fecha** | 10/04/2026 |
| **Estado** | Aceptada (reconfirmada en v2.0 SaaS) |
| **Contexto** | Al migrar al modelo SaaS, se evalúa si el tipo de sistema debe cambiar de Monolito Modular a Microservicios para soportar múltiples tenants. |
| **Opciones consideradas** | (1) Monolito Modular (misma arquitectura, adaptada para multi-tenant). (2) Microservicios desde el inicio. (3) Instancia separada por tenant (n monolitos). |
| **Decisión** | **Monolito Modular con Row-Level Tenancy.** |
| **Justificación** | Los microservicios agregan complejidad operacional (Kubernetes, service mesh, tracing distribuido, transacciones Saga) que no se justifica con el volumen de tenants inicial y el tamaño del equipo. La opción 3 (n instancias) es costosa en infraestructura, difícil de mantener y elimina los beneficios económicos del modelo SaaS. El Monolito Modular permite el aislamiento via `tenant_id` con complejidad operacional mínima. |
| **Consecuencias positivas** | Despliegue simple (tres contenedores: API, PostgreSQL, Redis). Transacciones atómicas locales. Desarrollo más rápido. Costo de infraestructura predecible. |
| **Consecuencias negativas / trade-offs** | Escalar un módulo específico (ej. Reportes) implica escalar todo el monolito. Si los módulos no respetan sus fronteras de `tenant_id`, puede ocurrir una fuga de datos. Se mitiga con pruebas automatizadas de frontera. |

---

### ADR-02: Vertical Slicing como estilo de organización del código

| Campo | Descripción |
|---|---|
| **Fecha** | 10/04/2026 |
| **Estado** | Aceptada (sin cambios respecto a v1.0) |
| **Contexto** | Decidir cómo organizar el código: por capa técnica (horizontal) o por dominio de negocio (vertical). |
| **Opciones consideradas** | (1) Organización por capa técnica: `routers/`, `services/`, `models/`. (2) Vertical Slicing: `modules/tenants/`, `modules/products/`, etc. |
| **Decisión** | **Vertical Slicing.** |
| **Justificación** | En el contexto SaaS, el Vertical Slicing facilita adicionalmente la auditoría del aislamiento de datos: todo el código que accede a datos de un dominio (ej. productos) está en un solo lugar (`modules/products/`), facilitando la revisión de que el filtro `tenant_id` esté presente en todas las consultas. |
| **Consecuencias positivas** | Alta cohesión por módulo. Facilita verificación de aislamiento. Preparado para extracción futura de microservicios. |
| **Consecuencias negativas / trade-offs** | Puede generar algo de duplicación si varios módulos comparten lógica similar. Se mitiga con utilidades compartidas en `app/core/`. |

---

### ADR-03: Arquitectura en Capas dentro de cada módulo

| Campo | Descripción |
|---|---|
| **Fecha** | 10/04/2026 |
| **Estado** | Aceptada (sin cambios respecto a v1.0) |
| **Contexto** | Dentro de cada módulo (vertical slice), separar las responsabilidades entre el endpoint HTTP, la lógica de negocio y el acceso a datos. |
| **Opciones consideradas** | (1) Todo en el router. (2) Router + Service. (3) Router + Service + Repository. |
| **Decisión** | **Tres capas: Router → Service → Repository.** |
| **Justificación** | La separación en tres capas adquiere mayor importancia en el modelo SaaS: el `Service` es el lugar natural para verificar los límites de plan del tenant (sin saber de HTTP) y el `Repository` es el lugar donde se garantiza el filtro de `tenant_id` (sin saber de lógica de negocio). Un diseño de dos capas o sin separación mezclaría estas responsabilidades de forma que hace el código más difícil de auditar para seguridad. |
| **Consecuencias positivas** | Testeabilidad. Separación clara de responsabilidades. El `tenant_id` fluye explícitamente por capas, siendo trazable. |
| **Consecuencias negativas / trade-offs** | Más archivos por módulo. Considerado un trade-off aceptable dado que la consistencia del patrón reduce los errores de seguridad. |

---

### ADR-04: Uso de asyncpg como driver asíncrono de PostgreSQL

| Campo | Descripción |
|---|---|
| **Fecha** | 10/04/2026 |
| **Estado** | Aceptada (sin cambios respecto a v1.0) |
| **Contexto** | FastAPI es un framework async. Con múltiples tenants generando requests concurrentes, un driver síncrono bloquearía el event loop y degradaría el rendimiento para todos los tenants. |
| **Decisión** | **`asyncpg` con SQLAlchemy 2.0 async.** |
| **Justificación** | En el contexto SaaS, la importancia de no bloquear el event loop es aún mayor: una operación lenta de un tenant (ej. generación de un PDF grande) no debe degradar el tiempo de respuesta de otros tenants. El diseño async garantiza que mientras espera I/O de BD, el servidor atiende otras solicitudes. |
| **Consecuencias positivas** | Alta concurrencia entre tenants sin bloqueos. Compatibilidad nativa con FastAPI. |
| **Consecuencias negativas / trade-offs** | Todo el código de acceso a datos debe ser `async def`. Curva de aprendizaje para desarrolladores no familiarizados con async/await. |

---

### ADR-05: Generación de PDF en memoria con FPDF2

| Campo | Descripción |
|---|---|
| **Fecha** | 10/04/2026 |
| **Estado** | Aceptada (actualizada en v2.0) |
| **Contexto** | El sistema debe generar reportes en PDF bajo demanda para múltiples tenants. En v1.0 el nombre del negocio venía de una variable de entorno. En v2.0 múltiples tenants tienen nombres distintos. |
| **Decisión** | **Generación en memoria con FPDF2 + `StreamingResponse`. El nombre del negocio se lee de `tenants.name`, no de una variable de entorno global.** |
| **Justificación** | Una variable de entorno `BUSINESS_NAME` solo puede tener un valor; es incompatible con múltiples tenants. El nombre debe venir de la base de datos, scoped al tenant del administrador que solicita el reporte. La generación en memoria sigue siendo la opción correcta: no deja estado en disco, es compatible con múltiples workers y con el escalado horizontal. |
| **Consecuencias positivas** | Sin estado en disco. Compatible con escalado horizontal. El PDF de cada tenant refleja el nombre correcto de su negocio. |
| **Consecuencias negativas / trade-offs** | Para reportes muy grandes (miles de transacciones en un tenant Pro), la memoria usada aumenta temporalmente. No representa un riesgo en el volumen actual. |

---

### ADR-06: Row-Level Tenancy como estrategia de aislamiento multi-tenant

| Campo | Descripción |
|---|---|
| **Fecha** | 10/04/2026 |
| **Estado** | Aceptada (nueva en v2.0) |
| **Contexto** | Al migrar al modelo SaaS, se debe decidir la estrategia de aislamiento de datos entre tenants. Existen tres enfoques principales en sistemas PostgreSQL. |
| **Opciones consideradas** | (1) **Una base de datos por tenant:** máximo aislamiento, backup independiente por cliente, pero altísimo costo operacional (N bases de datos, N conexiones, N procesos de migración). (2) **Un schema PostgreSQL por tenant:** buen aislamiento a nivel SQL, Alembic requiere gestionar N schemas. Complejidad operacional media. (3) **Tabla compartida con `tenant_id` (Row-Level Tenancy):** una sola BD, una sola migración de Alembic, `tenant_id` en cada fila. El aislamiento es responsabilidad de la aplicación. |
| **Decisión** | **Row-Level Tenancy: columna `tenant_id UUID FK → tenants.id` en todas las tablas de datos.** |
| **Justificación** | La opción 1 es inviable económicamente con un modelo SaaS de suscripción asequible y un equipo pequeño. La opción 2 añade complejidad a las migraciones (Alembic debe conocer todos los schemas activos). La opción 3 es la más simple de implementar, mantener y evolucionar con SQLAlchemy y Alembic, y la más económica en recursos de infraestructura. El riesgo de fuga de datos (si falta el filtro en alguna consulta) se mitiga con pruebas automatizadas de frontera de tenant en CI/CD. |
| **Consecuencias positivas** | Una sola base de datos. Una sola migración de Alembic para todos los tenants. Bajo costo de infraestructura. Pool de conexiones compartido eficientemente. |
| **Consecuencias negativas / trade-offs** | El aislamiento depende de la disciplina del equipo: toda consulta debe incluir `WHERE tenant_id = :tenant_id`. Una query sin ese filtro expone datos de todos los tenants. Se mitiga con revisiones de código y pruebas automatizadas de frontera. A gran escala (miles de tenants con millones de filas c/u), esta estrategia puede requerir particionamiento de tablas por `tenant_id` en PostgreSQL. |

---

### ADR-07: Redis como sistema de caché y estado compartido

| Campo | Descripción |
|---|---|
| **Fecha** | 10/04/2026 |
| **Estado** | Aceptada (nueva en v2.0) |
| **Contexto** | Con múltiples tenants activos simultáneamente, las consultas de catálogo (productos, categorías) y de verificación del estado del tenant se repiten constantemente. En v1.0 no se usaba caché (restricción RT-07), pero ese límite es incompatible con la carga de una plataforma SaaS. |
| **Opciones consideradas** | (1) Sin caché: todas las consultas van directamente a PostgreSQL. (2) Caché en memoria del proceso (diccionario Python): no compartido entre workers, se pierde al reiniciar. (3) Redis: caché externo, compartido entre todos los workers y procesos de la API. |
| **Decisión** | **Redis 7+ como sistema de caché centralizado, con claves de caché scoped por `tenant_id`.** |
| **Justificación** | La opción 1 genera carga innecesaria en PostgreSQL con operaciones repetidas de solo lectura (ej. listar categorías se ejecuta en cada búsqueda de productos). La opción 2 es incompatible con múltiples workers Uvicorn (cada worker tendría su propia caché desincronizada). Redis es el estándar de la industria para esta necesidad y es compatible con el diseño stateless de la API. El formato de clave `tenant:{tenant_id}:{recurso}` garantiza que la invalidación de caché de un tenant no afecta a otros. |
| **Consecuencias positivas** | Reducción de carga en PostgreSQL. Respuestas más rápidas para operaciones de lectura frecuentes. Estado del tenant (`is_active`) verificable rápidamente sin consulta SQL por request. Compartido entre todos los workers. |
| **Consecuencias negativas / trade-offs** | Dependencia adicional de infraestructura (Redis). Se implementa fallback graceful: si Redis no está disponible, el sistema consulta directamente la BD (con log de advertencia). La caché introduce una ventana de inconsistencia de hasta 60 segundos (TTL) entre un cambio en BD y su reflejo en la caché. Es un trade-off aceptable para operaciones no críticas (catálogos). Para operaciones críticas (estado del tenant), el TTL se reduce a 30 segundos. |

---

*Documento elaborado como parte del diseño arquitectónico del proyecto FastInventory SaaS.*  
*Versión 2.0 — 10/04/2026. Refactorización del documento v1.0 para el modelo SaaS multi-tenant.*
