# Documento de Visión y Alcance
## Proyecto: FastInventory SaaS

---

**Versión:** 2.0  
**Fecha:** 10/04/2026  
**Estado:** Borrador Inicial  
**Autor(es):** Equipo de Desarrollo  
**Referencia metodológica:** Wiegers, K. E. (2013). *Software Requirements* (3rd ed.). Microsoft Press.

---

## Tabla de Contenidos

1. [Requerimientos de Negocio](#1-requerimientos-de-negocio)
   - 1.1 [Antecedentes](#11-antecedentes)
   - 1.2 [Oportunidad de Negocio](#12-oportunidad-de-negocio)
   - 1.3 [Objetivos de Negocio y Criterios de Éxito](#13-objetivos-de-negocio-y-criterios-de-éxito)
   - 1.4 [Necesidades del Cliente o del Mercado](#14-necesidades-del-cliente-o-del-mercado)
   - 1.5 [Riesgos de Negocio](#15-riesgos-de-negocio)
2. [Visión de la Solución](#2-visión-de-la-solución)
   - 2.1 [Enunciado de Visión](#21-enunciado-de-visión)
   - 2.2 [Características Principales](#22-características-principales)
   - 2.3 [Suposiciones y Dependencias](#23-suposiciones-y-dependencias)
3. [Alcance y Limitaciones](#3-alcance-y-limitaciones)
   - 3.1 [Alcance de la Versión Inicial](#31-alcance-de-la-versión-inicial)
   - 3.2 [Alcance de las Versiones Subsecuentes](#32-alcance-de-las-versiones-subsecuentes)
   - 3.3 [Limitaciones y Exclusiones](#33-limitaciones-y-exclusiones)
4. [Contexto de Negocio](#4-contexto-de-negocio)
   - 4.1 [Perfiles de los Interesados en el Sistema](#41-perfiles-de-los-interesados-en-el-sistema)
   - 4.2 [Prioridades del Proyecto](#42-prioridades-del-proyecto)
   - 4.3 [Ambiente de Operación](#43-ambiente-de-operación)

---

## 1. Requerimientos de Negocio

### 1.1 Antecedentes

El segmento de pequeñas y medianas empresas (PYME) dedicadas a la venta de productos físicos de consumo —tiendas de barrio, minimercados, distribuidoras, papelerías y negocios similares— enfrenta de forma sistemática los mismos problemas operativos en la gestión de su inventario y sus ventas:

- **Registros manuales propensos al error:** El uso de cuadernos y hojas de cálculo genera inconsistencias frecuentes en el inventario real versus el registrado.
- **Ausencia de visibilidad en tiempo real:** Los dueños y empleados no tienen acceso inmediato al stock real, lo que genera ventas de productos sin existencias y pérdida de confianza del cliente.
- **Sin inteligencia de negocio:** No existen mecanismos sistemáticos para analizar la rotación de productos, los ingresos diarios o el desempeño de ventas por período.
- **Dependencia costosa de plataformas genéricas:** Las soluciones existentes en el mercado son demasiado complejas, costosas o poco adaptadas al flujo de trabajo de una PYME latinoamericana, implicando suscripciones elevadas y curvas de aprendizaje altas.

Ante este panorama, surge la oportunidad de construir **FastInventory SaaS**: una plataforma de gestión de inventario y punto de venta (POS) en la nube, diseñada específicamente para este segmento, operable desde cualquier dispositivo con conexión a internet y accesible a través de un modelo de suscripción mensual asequible.

A diferencia de un sistema desarrollado a medida para un único cliente, FastInventory SaaS opera bajo un modelo **multi-tenant**: una única infraestructura sirve a múltiples negocios de forma simultánea, con los datos de cada uno completamente aislados entre sí.

### 1.2 Oportunidad de Negocio

El mercado objetivo está compuesto por miles de PYMEs en América Latina que actualmente gestionan su inventario de forma ineficiente. Una plataforma SaaS especializada aprovecha esta brecha de las siguientes formas:

- **Reducir la barrera de entrada:** Al no requerir infraestructura propia ni desarrollo personalizado, cualquier negocio puede comenzar a operar en minutos tras completar su registro.
- **Modelo de ingresos recurrente y escalable:** Una suscripción mensual por negocio genera ingresos predecibles. Cuantos más negocios usen la plataforma, mayor es el ingreso sin incremento proporcional de los costos de infraestructura.
- **Efecto de red y retención:** Un sistema que almacena el historial de ventas e inventario de un negocio genera alta retención; migrar a una alternativa implica perder esa información histórica.
- **Datos agregados anonimizados:** A largo plazo, el volumen de datos transaccionales de múltiples negocios puede convertirse en un activo estratégico para ofrecer benchmarks del sector (funcionalidad futura).

### 1.3 Objetivos de Negocio y Criterios de Éxito

| ID | Objetivo de Negocio | Criterio de Éxito (Métrica) |
|----|---------------------|----------------------------|
| OB-01 | Ofrecer una solución lista-para-usar que elimine la dependencia de registros manuales para la gestión de inventario y ventas. | El primer negocio puede completar su registro y registrar su primera venta en menos de 15 minutos desde que accede a la plataforma. |
| OB-02 | Garantizar la precisión del inventario en tiempo real para cada negocio registrado. | 0% de ventas confirmadas con stock insuficiente en cualquier tenant, gracias a la validación automática. |
| OB-03 | Proveer al administrador de cada negocio con información para la toma de decisiones comerciales. | El administrador puede generar un reporte diario en PDF en menos de 30 segundos. |
| OB-04 | Lograr una retención de tenants superior al 80% a los 3 meses del lanzamiento. | Al menos 8 de cada 10 negocios que se registran siguen activos 90 días después. |
| OB-05 | Escalar la plataforma para soportar un número creciente de negocios sin degradación del servicio. | La plataforma soporta al menos 100 tenants activos con 50 usuarios concurrentes c/u sin superar los umbrales de tiempo de respuesta definidos. |
| OB-06 | Establecer una base tecnológica que permita incorporar nuevos módulos y planes de suscripción. | La arquitectura permite añadir un nuevo módulo o plan sin modificar el núcleo existente. |

### 1.4 Necesidades del Cliente o del Mercado

Las siguientes necesidades se identifican como comunes al segmento de PYMEs objetivo:

| ID | Necesidad | Prioridad |
|----|-----------|-----------|
| NC-01 | Registrarse en la plataforma de forma autónoma, sin intervención del equipo de desarrollo. | Alta |
| NC-02 | Registrar la venta de uno o más productos en una sola operación. | Alta |
| NC-03 | Verificar el stock disponible de un producto antes de confirmar la venta. | Alta |
| NC-04 | Buscar productos rápidamente por nombre o navegar por categorías. | Alta |
| NC-05 | Gestionar el catálogo de productos (agregar, editar, eliminar). | Alta |
| NC-06 | Organizar los productos en categorías. | Media |
| NC-07 | Visualizar el reporte de ventas del día actual con total acumulado. | Alta |
| NC-08 | Exportar el reporte diario en formato PDF para archivo o revisión. | Alta |
| NC-09 | Visualizar resúmenes de ventas de los últimos 15 y 30 días. | Media |
| NC-10 | Controlar quién puede realizar cada acción dentro de su negocio (roles). | Alta |
| NC-11 | Acceder al sistema desde un dispositivo móvil con conexión a internet. | Alta |
| NC-12 | Conocer en qué plan de suscripción está su negocio y sus límites de uso. | Media |

### 1.5 Riesgos de Negocio

| ID | Riesgo | Probabilidad | Impacto | Estrategia de Mitigación |
|----|--------|:---:|:---:|-----------------------------|
| RN-01 | Una falla de aislamiento entre tenants expone datos de un negocio a otro, generando pérdida de confianza severa y riesgo legal. | Baja | Muy Alto | Implementar filtrado obligatorio por `tenant_id` en todos los repositorios + pruebas de penetración de frontera entre tenants antes de cada release. |
| RN-02 | Pérdida de datos por falla en la infraestructura compartida afecta a todos los tenants simultáneamente. | Baja | Muy Alto | Backups automáticos diarios de la base de datos con retención mínima de 7 días. Monitoreo proactivo de disponibilidad (Uptime Robot, Grafana). |
| RN-03 | Baja adopción inicial: los negocios no completan el proceso de registro o lo abandonan. | Media | Alto | Diseñar un flujo de onboarding de máximo 3 pasos. Ofrecer un plan gratuito (free tier) para eliminar toda fricción económica en la primera experiencia. |
| RN-04 | Un tenant abusa de la plataforma (exceso de requests) y degrada el servicio para otros. | Media | Medio | Implementar rate limiting por tenant desde la primera versión. |
| RN-05 | El crecimiento en número de tenants sobrepasa la capacidad de la base de datos compartida. | Media | Alto | Arquitectura stateless que permite escalar horizontalmente las instancias de la API. Introducción de caché (Redis) antes de que el número de tenants activos supere los 50. |
| RN-06 | Resistencia al cambio por parte de los empleados de cada negocio al adoptar el sistema. | Media | Medio | Diseñar una interfaz intuitiva y proveer documentación de uso dentro de la plataforma. |

---

## 2. Visión de la Solución

### 2.1 Enunciado de Visión

> **Para** dueños de pequeños y medianos negocios de venta de productos físicos en América Latina,  
> **Que** necesitan controlar su inventario y registrar sus ventas en tiempo real sin depender de hojas de cálculo, registros manuales ni software costoso de terceros,  
> **FastInventory SaaS** es una plataforma de gestión de inventario y punto de venta (POS) en la nube con modelo de suscripción mensual,  
> **Que** permite a cualquier negocio registrarse, configurar su catálogo y comenzar a operar en minutos, con los datos de cada negocio completamente aislados entre sí y accesibles desde cualquier dispositivo con conexión a internet,  
> **A diferencia de** soluciones genéricas de contabilidad o ERP que requieren costosa implementación y capacitación,  
> **Nuestro producto** está diseñado específicamente para el flujo de trabajo de una PYME latinoamericana: simple, rápido, accesible y enfocado en lo que realmente importa — registrar ventas y conocer el inventario en tiempo real.

### 2.2 Características Principales

#### F-01: Onboarding Autónomo (Registro de Negocio)

Cualquier negocio puede registrarse en la plataforma de forma completamente autónoma a través de un endpoint público. El proceso crea simultáneamente:

1. El **tenant** (registro del negocio) con nombre y datos básicos.
2. El **primer usuario administrador** del negocio, listo para iniciar sesión.

No se requiere intervención del equipo de desarrollo para dar de alta a un nuevo cliente.

#### F-02: Aislamiento Multi-Tenant por Negocio

Cada negocio registrado en la plataforma opera en un espacio de datos completamente aislado:

- Todos los recursos (productos, categorías, ventas, usuarios) de un negocio son invisibles para cualquier otro negocio.
- El aislamiento se garantiza mediante un identificador único de tenant (`tenant_id`) presente en cada registro de la base de datos y validado en cada solicitud a la API.
- Un empleado o administrador de un negocio no puede acceder, ni por accidente ni intencionalmente, a los datos de otro negocio.

#### F-03: Autenticación y Control de Acceso por Roles (RBAC)

El sistema protege todos sus recursos mediante autenticación basada en **JWT**. Dentro de cada negocio (tenant), se definen dos roles con permisos diferenciados. Adicionalmente, existe el rol de **Super-Administrador de Plataforma**, exclusivo del equipo operador de FastInventory SaaS.

| Funcionalidad | Empleado | Admin del Negocio | Super-Admin |
|---|:---:|:---:|:---:|
| Iniciar sesión | ✅ | ✅ | ✅ |
| Buscar productos y consultar stock | ✅ | ✅ | — |
| Registrar ventas | ✅ | ✅ | — |
| CRUD de Productos y Categorías | ❌ | ✅ | — |
| Ver reportes y generar PDF | ❌ | ✅ | — |
| Gestionar usuarios del negocio | ❌ | ✅ | — |
| Ver y editar perfil del negocio (tenant) | ❌ | ✅ | — |
| Listar y gestionar todos los tenants | ❌ | ❌ | ✅ |
| Suspender / reactivar un tenant | ❌ | ❌ | ✅ |
| Cambiar el plan de un tenant | ❌ | ❌ | ✅ |

#### F-04: Gestión del Catálogo (Productos y Categorías)

El administrador de cada negocio dispondrá de operaciones CRUD completas sobre su catálogo propio:

- **Categorías:** Nombre y descripción. Permiten agrupar productos para facilitar la navegación (ej. "Bebidas", "Snacks").
- **Productos:** Nombre, descripción, precio de venta, unidad de medida, cantidad en stock y categoría asociada.

Los límites en la cantidad de productos y categorías dependerán del plan de suscripción del tenant.

#### F-05: Motor de Ventas (POS)

El registro de ventas está optimizado para dispositivos móviles:

- **Búsqueda predictiva:** El empleado escribe las primeras letras del producto y el sistema filtra resultados en tiempo real dentro del catálogo del negocio.
- **Navegación por categorías:** Filtrado de productos por categorías del negocio.
- **Carrito multi-producto:** Una venta puede incluir múltiples productos y cantidades en una sola transacción.
- **Validación de stock:** Verificación automática antes de confirmar. Una validación fallida retorna un error claro e impide la venta.
- **Descuento automático de inventario:** Al confirmar la venta, el stock de cada producto se reduce automáticamente.

#### F-06: Reportes Gerenciales y Exportación PDF

| Reporte | Período | Exportación |
|---------|---------|:-----------:|
| Diario | Día actual (o fecha indicada) | PDF ✅ |
| Quincenal | Últimos 15 días | — |
| Mensual | Últimos 30 días | — |

> **Nota:** La disponibilidad de cada tipo de reporte depende del plan de suscripción del tenant.

#### F-07: Planes de Suscripción y Límites de Uso

La plataforma opera bajo un modelo freemium con planes diferenciados:

| Feature | Free | Basic | Pro |
|---|:---:|:---:|:---:|
| Productos máximos | 50 | 500 | Ilimitado |
| Usuarios del negocio | 2 | 10 | Ilimitado |
| Reporte diario (JSON + PDF) | ✅ | ✅ | ✅ |
| Reporte quincenal y mensual | ❌ | ✅ | ✅ |
| Historial de ventas consultable | 30 días | 6 meses | Ilimitado |

#### F-08: Panel de Super-Administrador de Plataforma

El equipo operador de FastInventory SaaS dispondrá de endpoints privilegiados para gestionar la plataforma globalmente:

- Listar todos los tenants registrados con su estado y plan.
- Suspender o reactivar tenants.
- Cambiar el plan de un tenant manualmente.
- Consultar métricas globales de la plataforma (tenants activos, volumen de transacciones).

### 2.3 Suposiciones y Dependencias

#### Suposiciones

| ID | Suposición |
|----|------------|
| SA-01 | El equipo de desarrollo dispone de una infraestructura cloud centralizada (Railway, Render, DigitalOcean o AWS) para el despliegue de la plataforma. |
| SA-02 | El frontend (aplicación móvil o web) para los usuarios finales de cada tenant será desarrollado en una fase posterior; en la v2.0 la API se validará mediante Swagger UI. |
| SA-03 | Cada tenant (negocio) opera como una organización independiente. No se requiere soporte para múltiples sucursales de un mismo negocio en la v2.0. |
| SA-04 | El volumen de usuarios concurrentes por tenant no superará los 50 simultáneos en el lanzamiento inicial. |
| SA-05 | Los productos no requieren gestión de variantes (tallas, colores) en la v2.0. |
| SA-06 | La facturación de los planes de suscripción se gestionará de forma manual en la v2.0; la integración con una pasarela de pago (Stripe) se realizará en la v2.1. |

#### Dependencias

| ID | Dependencia | Tipo |
|----|-------------|------|
| DE-01 | Python 3.11+ disponible en el entorno de desarrollo y producción. | Técnica |
| DE-02 | PostgreSQL 14+ como motor de base de datos relacional. | Técnica |
| DE-03 | Docker y Docker Compose instalados en el servidor de despliegue. | Técnica |
| DE-04 | Librería `FPDF2` para la generación de PDFs. | Técnica |
| DE-05 | Redis para caché de datos de catálogo (productos y categorías) con invalidación por tenant. | Técnica |

---

## 3. Alcance y Limitaciones

### 3.1 Alcance de la Versión Inicial (v2.0 SaaS)

La versión 2.0 comprende el desarrollo completo del backend de la plataforma SaaS:

- ✅ **API REST** construida con **Python 3.11+** y **FastAPI**.
- ✅ **Base de datos** relacional con **PostgreSQL** gestionada mediante **SQLAlchemy 2.0+** con separación de datos por `tenant_id` en todas las tablas.
- ✅ **Módulo de Tenants:** registro autónomo de negocios, gestión del perfil del negocio y control de estado (activo/suspendido).
- ✅ **Autenticación y autorización** con **JWT** que incluye el `tenant_id` en el payload.
- ✅ **RBAC con tres roles:** Empleado, Admin del Negocio y Super-Administrador de Plataforma.
- ✅ **CRUD de Usuarios** con asignación de roles, scoped al tenant del administrador.
- ✅ **CRUD de Categorías y Productos** con control de stock, scoped al tenant.
- ✅ **Módulo de Ventas** con validación de stock y descuento automático de inventario, scoped al tenant.
- ✅ **Módulo de Reportes** (diario, quincenal, mensual) con exportación PDF del diario, scoped al tenant.
- ✅ **Planes de suscripción** con feature flags para limitar el uso según el plan del tenant.
- ✅ **Panel de Super-Administrador** para gestión operativa de la plataforma.
- ✅ **Rate Limiting** por tenant para garantizar calidad de servicio compartida.
- ✅ **Documentación interactiva** de la API mediante **Swagger UI** y **ReDoc**.
- ✅ **Contenerización** con **Docker** y orquestación con **Docker Compose**.
- ✅ **Migraciones de base de datos** gestionadas con **Alembic**.

### 3.2 Alcance de las Versiones Subsecuentes

| Módulo | Descripción | Versión Estimada |
|--------|-------------|:---:|
| **Frontend Web** | Aplicación web que consume la API para los tenants (tecnología reactiva por definir). | v2.1 |
| **Integración con Stripe** | Cobro automático de suscripciones recurrentes por plan. | v2.1 |
| **Dashboard de KPIs** | Gráficos de desempeño de ventas dentro del panel del administrador. | v2.1 |
| **Aplicación Móvil** | App Android/iOS para empleados y administradores de cada negocio. | v2.2 |
| **Alertas de Stock Bajo** | Notificaciones automáticas (email/push) cuando un producto baja de un umbral. | v2.2 |
| **Exportación PDF (15/30 días)** | Generación de PDF para los reportes quincenal y mensual. | v2.2 |
| **Soporte Multi-Sucursal** | Gestión de inventario para negocios con múltiples puntos de venta. | v3.0 |
| **Módulo de Proveedores** | Gestión de proveedores y órdenes de compra/reposición. | v3.0 |
| **Benchmarks del Sector** | Datos agregados y anonimizados para comparar el desempeño del negocio vs. el sector. | v3.0+ |

### 3.3 Limitaciones y Exclusiones

Los siguientes elementos quedan **explícitamente excluidos** de la v2.0:

- ❌ Cualquier tipo de frontend (web o móvil); la API se valida con Swagger UI.
- ❌ Integración automática con pasarelas de pago (Stripe, Wompi, PayU); la facturación es manual en esta versión.
- ❌ Escáner de códigos de barras u otras entradas de hardware.
- ❌ Cálculo, gestión o desglose de impuestos (IVA, retenciones, etc.).
- ❌ Gestión de variantes de producto (tallas, colores, etc.).
- ❌ Notificaciones automáticas push, SMS o email.
- ❌ Soporte para múltiples sucursales de un mismo negocio.
- ❌ Módulo de compras o gestión de proveedores.
- ❌ Dashboard analítico con gráficas (se limita a datos JSON en la v2.0).
- ❌ Exportación de datos del tenant en formato CSV/Excel.

---

## 4. Contexto de Negocio

### 4.1 Perfiles de los Interesados en el Sistema

#### Interesado 1: Administrador del Negocio (Admin Tenant)

| Atributo | Detalle |
|----------|---------||
| **Descripción** | Dueño o gerente del negocio cliente. Toma las decisiones estratégicas y operativas de su negocio dentro de la plataforma. |
| **Rol en el sistema** | `admin` (scoped a su tenant) |
| **Responsabilidades** | Gestionar el catálogo de su negocio, administrar usuarios de su equipo, revisar reportes, generar PDFs, gestionar el perfil del negocio. |
| **Criterio de éxito personal** | Tener visibilidad total de su negocio desde el celular, sin nada técnico que configurar. |
| **Nivel técnico** | Básico. Requiere flujos simples y resultados claros. |
| **Entorno de uso** | Dispositivo móvil (principal), posiblemente computadora (futuro). |

#### Interesado 2: Empleado del Negocio

| Atributo | Detalle |
|----------|---------|
| **Descripción** | Personal operativo del negocio que atiende al cliente y registra ventas. |
| **Rol en el sistema** | `employee` (scoped a su tenant) |
| **Responsabilidades** | Buscar productos, verificar stock, registrar ventas dentro de su negocio. |
| **Criterio de éxito personal** | Poder procesar una venta rápido y sin errores desde el celular. |
| **Nivel técnico** | Básico. Necesita una interfaz directa y sin ambigüedades. |
| **Entorno de uso** | Dispositivo móvil exclusivamente. |

#### Interesado 3: Super-Administrador de Plataforma

| Atributo | Detalle |
|----------|---------|
| **Descripción** | Miembro del equipo operador de FastInventory SaaS. Tiene visibilidad y control sobre todos los tenants registrados. |
| **Rol en el sistema** | `superadmin` (no pertenece a ningún tenant específico) |
| **Responsabilidades** | Monitorear el estado de los tenants, gestionar planes, suspender tenants por incumplimiento, consultar métricas globales de la plataforma. |
| **Criterio de éxito personal** | Tener control operativo completo de la plataforma desde un panel centralizado. |
| **Nivel técnico** | Alto. Familiarizado con APIs y herramientas de administración. |
| **Entorno de uso** | Computadora de escritorio / Swagger UI / herramienta interna. |

#### Interesado 4: Equipo de Desarrollo

| Atributo | Detalle |
|----------|---------|
| **Descripción** | Responsable del diseño, construcción, pruebas, mantenimiento y evolución de la plataforma. |
| **Rol en el sistema** | Proveedor de la solución |
| **Responsabilidades** | Implementar los requerimientos, asegurar la calidad, documentar la API, gestionar la infraestructura cloud. |
| **Criterio de éxito personal** | Mantener una plataforma estable, segura y fácil de evolucionar con el crecimiento de la base de tenants. |

### 4.2 Prioridades del Proyecto

| Dimensión | Prioridad | Postura |
|-----------|:---------:|---------|
| **Seguridad y Aislamiento** | 1 | El aislamiento de datos entre tenants es no negociable. Ninguna funcionalidad se entrega si compromete la privacidad de los datos de los clientes. |
| **Características (Funcionalidades)** | 2 | Las funcionalidades del alcance v2.0 son fijas. Las nuevas ideas se registran para versiones futuras. |
| **Calidad** | 3 | La API debe validar datos correctamente, manejar errores de forma segura y estar documentada. |
| **Cronograma** | 4 | El plazo puede ajustarse para no comprometer seguridad ni calidad. |
| **Costo** | 5 | El presupuesto es el parámetro más flexible. |

### 4.3 Ambiente de Operación

#### Ambiente de Producción (Plataforma SaaS)

| Componente | Especificación |
|------------|----------------|
| **Servidor** | Servicio cloud PaaS con soporte para contenedores (Railway, Render, DigitalOcean App Platform, AWS ECS) |
| **Sistema Operativo** | Linux (Ubuntu 22.04 LTS recomendado) |
| **Contenerización** | Docker + Docker Compose (desarrollo) / Kubernetes opcional en escala |
| **Base de Datos** | PostgreSQL 14+, servicio administrado en cloud (Supabase, RDS, Neon) recomendado para producción |
| **Caché** | Redis, servicio administrado (Upstash, Redis Cloud) |
| **Acceso a la API** | HTTPS (puerto 443) con certificado SSL (Let's Encrypt o certificado del proveedor cloud) |
| **Monitoreo** | Uptime Robot para disponibilidad + Grafana/Sentry para errores y rendimiento |
| **Variables de entorno** | Configuración sensible gestionada mediante secretos del proveedor cloud; no incluida en el repositorio |

#### Ambiente de los Usuarios Finales

| Componente | Especificación |
|------------|----------------|
| **Dispositivo de acceso** | Smartphone (Android / iOS) con navegador web moderno |
| **Conectividad requerida** | Conexión a internet mínima: 3G/4G o WiFi |
| **Cliente de la API (v2.0)** | Swagger UI / Postman (para validación durante el desarrollo) |
| **Cliente de la API (v2.1+)** | Aplicación web progresiva (PWA) o aplicación móvil nativa |

#### Ambiente de Desarrollo

| Componente | Especificación |
|------------|----------------|
| **Lenguaje** | Python 3.11+ |
| **Framework** | FastAPI |
| **ORM** | SQLAlchemy 2.0+ con Alembic para migraciones |
| **Base de datos local** | PostgreSQL en contenedor Docker |
| **Caché local** | Redis en contenedor Docker |
| **Gestor de dependencias** | `pip` con `requirements.txt` o `Poetry` |
| **Control de versiones** | Git con repositorio en GitHub o GitLab |
| **Pruebas** | `pytest` con `httpx` para pruebas de integración; pruebas de aislamiento multi-tenant obligatorias |

---

*Documento elaborado según el modelo de Wiegers, K. E. (2013). Software Requirements (3rd ed.). Microsoft Press.*  
*Versión 2.0 — 10/04/2026. Refactorización del documento v1.0 para el modelo SaaS multi-tenant.*
