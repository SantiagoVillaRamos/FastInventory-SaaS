# Especificación de Requerimientos de Software (SRS)
## Proyecto: FastInventory SaaS

---

**Versión:** 2.0  
**Fecha:** 10/04/2026  
**Estado:** Borrador Inicial  
**Autor(es):** Equipo de Desarrollo

---

## Tabla de Contenidos

1. [Requerimientos Funcionales Detallados](#1-requerimientos-funcionales-detallados)
   - 1.1 [Módulo de Tenants (Negocios)](#11-módulo-de-tenants-negocios)
   - 1.2 [Módulo de Autenticación y Seguridad](#12-módulo-de-autenticación-y-seguridad)
   - 1.3 [Módulo de Usuarios](#13-módulo-de-usuarios)
   - 1.4 [Módulo de Categorías](#14-módulo-de-categorías)
   - 1.5 [Módulo de Productos](#15-módulo-de-productos)
   - 1.6 [Módulo de Ventas](#16-módulo-de-ventas)
   - 1.7 [Módulo de Reportes](#17-módulo-de-reportes)
   - 1.8 [Módulo de Super-Administración de Plataforma](#18-módulo-de-super-administración-de-plataforma)
2. [Atributos de Calidad](#2-atributos-de-calidad)
   - 2.1 [Desempeño (Performance)](#21-desempeño-performance)
   - 2.2 [Seguridad (Security)](#22-seguridad-security)
   - 2.3 [Confiabilidad (Reliability)](#23-confiabilidad-reliability)
   - 2.4 [Mantenibilidad (Maintainability)](#24-mantenibilidad-maintainability)
   - 2.5 [Usabilidad de la API (Usability)](#25-usabilidad-de-la-api-usability)
   - 2.6 [Escalabilidad (Scalability)](#26-escalabilidad-scalability)
   - 2.7 [Aislamiento Multi-Tenant (Isolation)](#27-aislamiento-multi-tenant-isolation)
3. [Restricciones](#3-restricciones)
   - 3.1 [Restricciones Técnicas](#31-restricciones-técnicas)
   - 3.2 [Restricciones Administrativas](#32-restricciones-administrativas)
4. [Interfaces Externas](#4-interfaces-externas)
   - 4.1 [Interfaz con el Cliente HTTP (Frontend)](#41-interfaz-con-el-cliente-http-frontend)
   - 4.2 [Interfaz con la Base de Datos](#42-interfaz-con-la-base-de-datos)
   - 4.3 [Interfaz de Caché (Redis)](#43-interfaz-de-caché-redis)
   - 4.4 [Interfaz de Generación de PDF](#44-interfaz-de-generación-de-pdf)

---

## 1. Requerimientos Funcionales Detallados

Esta sección describe los detalles técnicos de implementación que dan soporte a cada Historia de Usuario del documento de Requerimientos de Usuario v2.0.

---

### 1.1 Módulo de Tenants (Negocios)

Este módulo es el núcleo del modelo SaaS. Gestiona el ciclo de vida de cada negocio registrado en la plataforma.

**RF-00.1 — Estructura de datos del tenant**

La tabla `tenants` es la raíz de la jerarquía de datos de la plataforma. Todo recurso de la aplicación (usuarios, productos, ventas) debe tener una clave foránea hacia esta tabla.

| Campo | Tipo SQL | Restricciones | Descripción |
|---|---|---|---|
| `id` | `UUID` | PK, NOT NULL | Identificador único del tenant generado automáticamente |
| `name` | `VARCHAR(150)` | UNIQUE, NOT NULL | Nombre del negocio (ej. "Tienda Don Pedro") |
| `slug` | `VARCHAR(100)` | UNIQUE, NOT NULL | Identificador URL-friendly generado automáticamente desde `name` |
| `plan` | `ENUM('free','basic','pro')` | NOT NULL, DEFAULT `'free'` | Plan de suscripción activo |
| `is_active` | `BOOLEAN` | NOT NULL, DEFAULT TRUE | Estado del tenant. `false` = suspendido |
| `created_at` | `TIMESTAMP` | NOT NULL, DEFAULT NOW() | Fecha de registro en la plataforma |

**RF-00.2 — Endpoint de registro público (Onboarding)**

| Atributo | Especificación |
|---|---|
| **Endpoint** | `POST /auth/register` |
| **Autenticación requerida** | Ninguna (endpoint público) |
| **Content-Type** | `application/json` |

**Cuerpo de la petición:**
```json
{
  "business_name": "Tienda Don Pedro",
  "admin_username": "donpedro",
  "admin_full_name": "Pedro Ramírez",
  "admin_password": "contraseña_segura"
}
```

**Flujo atómico de registro (todo o nada):**

1. Validar que `business_name` no esté registrado ya en la tabla `tenants`. Si existe: HTTP 400.
2. Generar el `slug` a partir de `business_name` (minúsculas, sin espacios, sin caracteres especiales).
3. Crear el registro en `tenants` con `plan = 'free'` e `is_active = true`.
4. Hashear `admin_password` con bcrypt (cost factor: 12).
5. Crear el registro en `users` con `role = 'admin'`, `tenant_id` del tenant recién creado.
6. Si cualquier paso falla: `ROLLBACK` completo. HTTP 500.
7. Si todo es exitoso: `COMMIT`. Retornar HTTP 201 con el resumen del tenant creado.

**RF-00.3 — Endpoints de gestión del perfil del negocio**

| Operación | Endpoint | Rol requerido | Descripción |
|---|---|---|---|
| Ver perfil del negocio | `GET /tenants/me` | Admin (tenant) | Devuelve nombre, plan, estado y fecha de registro del tenant actual |
| Actualizar nombre del negocio | `PUT /tenants/me` | Admin (tenant) | Actualiza el `name` y regenera el `slug` del tenant |

> **Regla:** El campo `plan` e `is_active` son de solo lectura desde estos endpoints. Solo el Super-Administrador puede modificarlos.

**RF-00.4 — Validación de límites por plan**

El sistema debe verificar los siguientes límites antes de cada operación de creación, retornando HTTP 403 si el tenant ha alcanzado su tope:

| Límite | Plan Free | Plan Basic | Plan Pro |
|---|:---:|:---:|:---:|
| Productos activos máximos | 50 | 500 | Sin límite |
| Usuarios activos máximos | 2 | 10 | Sin límite |
| Acceso a reportes quincenal/mensual | ❌ | ✅ | ✅ |
| Historial de ventas consultable | 30 días | 6 meses | Sin límite |

El mensaje de error retornado con HTTP 403 debe incluir el límite actual del plan y una sugerencia de upgrade:
```json
{
  "detail": "Has alcanzado el límite de 50 productos del plan Free. Actualiza a Basic o Pro para añadir más."
}
```

---

### 1.2 Módulo de Autenticación y Seguridad

**RF-01.1 — Flujo de autenticación OAuth2 Password Bearer**

| Atributo | Especificación |
|---|---|
| **Endpoint** | `POST /auth/token` |
| **Content-Type de entrada** | `application/x-www-form-urlencoded` |
| **Campos requeridos** | `username` (str), `password` (str) |
| **Respuesta exitosa** | `{"access_token": "<jwt>", "token_type": "bearer"}` con HTTP 200 |
| **Respuesta de error** | `{"detail": "Credenciales inválidas"}` con HTTP 401 |

El sistema busca el usuario por `username` en la tabla `users`. Adicionalmente, verifica que `tenant.is_active = true`. Si el tenant está suspendido, retorna HTTP 403 con mensaje de suspensión, independientemente de si las credenciales son correctas.

**RF-01.2 — Estructura y firma del token JWT**

El token JWT se generará con la librería `python-jose` y firmado con el algoritmo `HS256`. El payload del token contendrá:

| Campo del Payload | Tipo | Descripción |
|---|---|---|
| `sub` | `string` | Nombre de usuario del usuario autenticado |
| `role` | `string` | Rol del usuario: `"employee"`, `"admin"` o `"superadmin"` |
| `tenant_id` | `string (UUID)` | ID del tenant al que pertenece el usuario. `null` para el rol `superadmin` |
| `exp` | `timestamp` | Tiempo de expiración del token (Unix timestamp) |

El tiempo de expiración por defecto será de **480 minutos (8 horas)**, configurable mediante `ACCESS_TOKEN_EXPIRE_MINUTES`.

**RF-01.3 — Hashing de contraseñas**

Las contraseñas se almacenan con `passlib` usando el esquema `bcrypt` (cost factor: 12). Ninguna contraseña en texto plano se persiste ni se incluye en ninguna respuesta.

**RF-01.4 — Protección de rutas por rol**

Se implementarán las siguientes dependencias de FastAPI para la verificación de acceso:

| Dependencia | Descripción | Error si falla |
|---|---|---|
| `get_current_user` | Decodifica y valida el JWT; extrae usuario activo | HTTP 401 |
| `get_current_tenant` | Extrae el `tenant_id` del JWT y verifica que el tenant esté activo (`is_active = true`) | HTTP 403 si suspendido |
| `require_admin` | Extiende `get_current_user` y verifica `role == "admin"` | HTTP 403 |
| `require_superadmin` | Verifica `role == "superadmin"` sin validar `tenant_id` | HTTP 403 |

**RF-01.5 — Verificación de estado del tenant en cada request**

En cada solicitud autenticada de un usuario con rol `employee` o `admin`, el sistema verifica que `tenant.is_active = true`. Esta verificación puede implementarse con caché de corta duración (máx. 60 segundos en Redis) para no añadir una consulta extra a la BD por cada request.

---

### 1.3 Módulo de Usuarios

**RF-02.1 — Estructura de datos del usuario**

La tabla `users` incluye ahora la columna `tenant_id` como clave foránea obligatoria:

| Campo | Tipo SQL | Restricciones | Descripción |
|---|---|---|---|
| `id` | `UUID` | PK, NOT NULL | Identificador único generado automáticamente |
| `tenant_id` | `UUID` | FK → tenants.id, NOT NULL | Tenant al que pertenece el usuario |
| `username` | `VARCHAR(50)` | NOT NULL | Nombre de usuario para inicio de sesión |
| `full_name` | `VARCHAR(150)` | NOT NULL | Nombre completo del empleado |
| `hashed_password` | `VARCHAR(255)` | NOT NULL | Contraseña cifrada con bcrypt |
| `role` | `ENUM('admin','employee')` | NOT NULL, DEFAULT `'employee'` | Rol del usuario dentro de su tenant |
| `is_active` | `BOOLEAN` | NOT NULL, DEFAULT TRUE | Estado de la cuenta |
| `created_at` | `TIMESTAMP` | NOT NULL, DEFAULT NOW() | Fecha de creación del registro |

> **Índice:** `UNIQUE(tenant_id, username)` — El username solo debe ser único dentro del mismo tenant, no de forma global.

**RF-02.2 — Gestión de usuarios por el Administrador del negocio**

| Operación | Endpoint | Rol requerido | Descripción |
|---|---|---|---|
| Crear usuario | `POST /users/` | Admin (tenant) | Crea una nueva cuenta scoped al tenant del admin |
| Listar usuarios | `GET /users/` | Admin (tenant) | Devuelve usuarios activos e inactivos del tenant |
| Obtener usuario | `GET /users/{user_id}` | Admin (tenant) | Devuelve el detalle de un usuario del tenant |
| Actualizar usuario | `PUT /users/{user_id}` | Admin (tenant) | Actualiza nombre, rol o estado de la cuenta |
| Desactivar cuenta | `PATCH /users/{user_id}/deactivate` | Admin (tenant) | Establece `is_active = false` |

**RF-02.3 — Reglas de negocio para la gestión de usuarios**

- Antes de crear un usuario, el sistema verifica que el número de usuarios activos del tenant no supere el límite del plan (RF-00.4). Si se supera: HTTP 403.
- El `username` acepta únicamente caracteres alfanuméricos y guiones bajos (`[a-zA-Z0-9_]`), con longitud entre 3 y 50 caracteres.
- Un administrador no puede desactivar ni modificar el rol de su propia cuenta.
- La eliminación física de usuarios no está permitida. Se usa eliminación lógica mediante `is_active = false`.
- Todos los endpoints del módulo filtran automáticamente por `tenant_id` del token JWT. Un admin no puede ver ni modificar usuarios de otro tenant, aunque conozca sus UUIDs.

---

### 1.4 Módulo de Categorías

**RF-03.1 — Estructura de datos de la categoría**

| Campo | Tipo SQL | Restricciones | Descripción |
|---|---|---|---|
| `id` | `UUID` | PK, NOT NULL | Identificador único generado automáticamente |
| `tenant_id` | `UUID` | FK → tenants.id, NOT NULL | Tenant propietario de la categoría |
| `name` | `VARCHAR(100)` | NOT NULL | Nombre de la categoría |
| `description` | `TEXT` | NULLABLE | Descripción opcional |
| `created_at` | `TIMESTAMP` | NOT NULL, DEFAULT NOW() | Fecha de creación |

> **Índice:** `UNIQUE(tenant_id, name)` — El nombre de categoría debe ser único dentro del tenant, no globalmente.

**RF-03.2 — Endpoints del módulo de categorías**

| Operación | Endpoint | Rol requerido | Descripción |
|---|---|---|---|
| Crear categoría | `POST /categories/` | Admin (tenant) | Crea una nueva categoría en el tenant actual |
| Listar categorías | `GET /categories/` | Admin / Empleado | Devuelve las categorías del tenant actual |
| Obtener categoría | `GET /categories/{category_id}` | Admin / Empleado | Detalle de una categoría del tenant actual |
| Actualizar categoría | `PUT /categories/{category_id}` | Admin (tenant) | Actualiza nombre y/o descripción |
| Eliminar categoría | `DELETE /categories/{category_id}` | Admin (tenant) | Elimina si no tiene productos asociados en el tenant |

**RF-03.3 — Reglas de negocio para categorías**

- El nombre de la categoría no puede estar en blanco ni contener solo espacios en blanco.
- La unicidad del nombre se verifica dentro del tenant (`WHERE tenant_id = :tenant_id AND name ILIKE :name`).
- Antes de eliminar, el sistema verifica si existen productos activos con `category_id` igual al ID de la categoría **y** `tenant_id` del tenant. Si existen: HTTP 400.
- Todos los endpoints filtran por `tenant_id` del JWT. Un usuario no puede acceder a categorías de otro tenant.

---

### 1.5 Módulo de Productos

**RF-04.1 — Estructura de datos del producto**

| Campo | Tipo SQL | Restricciones | Descripción |
|---|---|---|---|
| `id` | `UUID` | PK, NOT NULL | Identificador único generado automáticamente |
| `tenant_id` | `UUID` | FK → tenants.id, NOT NULL | Tenant propietario del producto |
| `name` | `VARCHAR(150)` | NOT NULL | Nombre del producto |
| `description` | `TEXT` | NULLABLE | Descripción opcional |
| `sale_price` | `NUMERIC(10, 2)` | NOT NULL, CHECK > 0 | Precio de venta al público |
| `unit` | `VARCHAR(30)` | NOT NULL | Unidad de medida (ej. "unidad", "kg", "litro") |
| `stock` | `INTEGER` | NOT NULL, DEFAULT 0, CHECK >= 0 | Cantidad disponible en inventario |
| `category_id` | `UUID` | FK → categories.id, NOT NULL | Categoría a la que pertenece (mismo tenant) |
| `is_active` | `BOOLEAN` | NOT NULL, DEFAULT TRUE | Estado del producto (eliminación lógica) |
| `created_at` | `TIMESTAMP` | NOT NULL, DEFAULT NOW() | Fecha de registro |
| `updated_at` | `TIMESTAMP` | NOT NULL, DEFAULT NOW() | Fecha de última actualización |

> **Índices:** `UNIQUE(tenant_id, name)` — unicidad de nombre dentro del tenant. Índice adicional en `(tenant_id, category_id)` y `(tenant_id, name)` para las búsquedas frecuentes.

**RF-04.2 — Endpoints del módulo de productos**

| Operación | Endpoint | Rol requerido | Descripción |
|---|---|---|---|
| Crear producto | `POST /products/` | Admin (tenant) | Registra un nuevo producto en el tenant |
| Listar productos | `GET /products/` | Admin / Empleado | Devuelve productos activos del tenant |
| Buscar por nombre | `GET /products/?search={query}` | Admin / Empleado | Búsqueda parcial dentro del catálogo del tenant |
| Filtrar por categoría | `GET /products/?category_id={id}` | Admin / Empleado | Filtra por categoría dentro del tenant |
| Obtener producto | `GET /products/{product_id}` | Admin / Empleado | Detalle de un producto del tenant |
| Actualizar producto | `PUT /products/{product_id}` | Admin (tenant) | Actualiza atributos del producto (excepto stock) |
| Eliminar producto | `DELETE /products/{product_id}` | Admin (tenant) | Eliminación lógica: `is_active = false` |

**RF-04.3 — Reglas de negocio para productos**

- Antes de crear un producto, el sistema verifica que el número de productos activos del tenant no supere el límite del plan (RF-00.4). Si se supera: HTTP 403.
- El `sale_price` debe ser estrictamente mayor que 0. Valores en 0 o negativos: HTTP 422.
- El campo `stock` **no es modificable directamente** a través del endpoint de actualización.
- Todos los endpoints filtran por `tenant_id` del JWT. Un usuario no puede acceder a productos de otro tenant.
- La `category_id` proporcionada al crear o actualizar un producto debe pertenecer al mismo tenant. Si no: HTTP 400.

---

### 1.6 Módulo de Ventas

**RF-05.1 — Estructura de datos de la venta**

**Tabla `sales` (encabezado de venta):**

| Campo | Tipo SQL | Restricciones | Descripción |
|---|---|---|---|
| `id` | `UUID` | PK, NOT NULL | Identificador único de la venta |
| `tenant_id` | `UUID` | FK → tenants.id, NOT NULL | Tenant al que pertenece la venta |
| `seller_id` | `UUID` | FK → users.id, NOT NULL | Empleado que registró la venta |
| `total` | `NUMERIC(10, 2)` | NOT NULL | Sumatoria total de la venta |
| `created_at` | `TIMESTAMP` | NOT NULL, DEFAULT NOW() | Fecha y hora de la transacción |

**Tabla `sale_items` (ítems de la venta):**

| Campo | Tipo SQL | Restricciones | Descripción |
|---|---|---|---|
| `id` | `UUID` | PK, NOT NULL | Identificador único del ítem |
| `sale_id` | `UUID` | FK → sales.id, NOT NULL | Venta a la que pertenece |
| `product_id` | `UUID` | FK → products.id, NOT NULL | Producto vendido |
| `product_name` | `VARCHAR(150)` | NOT NULL | Nombre del producto al momento de la venta |
| `quantity` | `INTEGER` | NOT NULL, CHECK > 0 | Cantidad vendida |
| `unit_price` | `NUMERIC(10, 2)` | NOT NULL | Precio unitario al momento de la venta |
| `subtotal` | `NUMERIC(10, 2)` | NOT NULL | `quantity * unit_price` |

> **Nota:** Los campos `product_name` y `unit_price` se copian desde el producto al momento de la venta (desnormalización intencional). Esto garantiza la integridad histórica de los reportes ante cambios futuros de precio o nombre.

> **Índice:** `(tenant_id, created_at)` en `sales` para optimizar las consultas de reportes por período.

**RF-05.2 — Endpoint de registro de ventas**

| Atributo | Especificación |
|---|---|
| **Endpoint** | `POST /sales/` |
| **Rol requerido** | Admin / Empleado (del tenant) |
| **Content-Type** | `application/json` |

**Cuerpo de la petición (ejemplo):**
```json
{
  "items": [
    {"product_id": "uuid-del-producto-1", "quantity": 2},
    {"product_id": "uuid-del-producto-2", "quantity": 1}
  ]
}
```

**RF-05.3 — Algoritmo de validación y registro de ventas**

El procesamiento de una venta sigue el siguiente flujo atómico dentro de una transacción de base de datos:

1. Extraer `tenant_id` del JWT del usuario autenticado.
2. Recibir la lista de ítems con `product_id` y `quantity`.
3. Para cada ítem, verificar que el producto exista, esté activo (`is_active = true`) **y que su `tenant_id` coincida con el del usuario**. Si no existe o pertenece a otro tenant: HTTP 404.
4. Para cada ítem, verificar que `stock >= quantity`. Si alguno falla, abortar con HTTP 409.
5. Insertar el registro en `sales` (incluyendo `tenant_id`) y los ítems en `sale_items`, copiando `product_name` y `unit_price`.
6. Decrementar el `stock` de cada producto.
7. `COMMIT` y retornar HTTP 201 con el resumen de la venta.
8. Si ocurre cualquier error en los pasos 5–6, hacer `ROLLBACK` y retornar HTTP 500.

**RF-05.4 — Historial de ventas**

| Operación | Endpoint | Rol requerido | Descripción |
|---|---|---|---|
| Listar ventas | `GET /sales/` | Admin (tenant) | Historial paginado de ventas del tenant |
| Detalle de venta | `GET /sales/{sale_id}` | Admin (tenant) | Detalle completo de una venta del tenant |

El historial de ventas consultable está limitado según el plan del tenant (RF-00.4). Las ventas fuera del rango del plan no se devuelven (no se eliminan).

---

### 1.7 Módulo de Reportes

**RF-06.1 — Reporte Diario (JSON)**

| Atributo | Especificación |
|---|---|
| **Endpoint** | `GET /reports/daily` |
| **Parámetro opcional** | `date` (formato: `YYYY-MM-DD`). Si se omite, usa la fecha actual del servidor. |
| **Rol requerido** | Admin (tenant) |
| **Planes** | Free, Basic, Pro |

La respuesta incluye cada venta del día **dentro del tenant** con sus ítems y el `total_day` acumulado:

```json
{
  "tenant": "Tienda Don Pedro",
  "date": "2026-04-10",
  "total_day": 45000.00,
  "transactions_count": 8,
  "sales": [
    {
      "sale_id": "...",
      "time": "08:15:30",
      "seller": "empleado1",
      "items": [...],
      "total": 5500.00
    }
  ]
}
```

**RF-06.2 — Reporte Diario (PDF)**

| Atributo | Especificación |
|---|---|
| **Endpoint** | `GET /reports/daily/pdf` |
| **Parámetro opcional** | `date` (formato: `YYYY-MM-DD`) |
| **Rol requerido** | Admin (tenant) |
| **Planes** | Free, Basic, Pro |
| **Response headers** | `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="reporte_diario_{date}.pdf"` |

**Estructura del PDF generado:**

- **Encabezado:** Nombre del negocio leído desde `tenants.name` del tenant actual (no desde variable de entorno global), título "Reporte de Ventas Diario" y la fecha.
- **Tabla de ventas:** Columnas: `Hora | Producto | Cantidad | Precio Unitario | Subtotal`.
- **Pie de documento:** Total General de la jornada.
- La librería empleada será `FPDF2`. El documento se genera en memoria (sin escritura en disco) y se devuelve como `StreamingResponse`.

**RF-06.3 — Reporte Quincenal (JSON)**

| Atributo | Especificación |
|---|---|
| **Endpoint** | `GET /reports/biweekly` |
| **Rol requerido** | Admin (tenant) |
| **Planes** | Basic, Pro (Free: HTTP 403 con mensaje de plan) |
| **Período** | Últimos 15 días naturales (incluyendo el día actual) |

```json
{
  "tenant": "Tienda Don Pedro",
  "period": {"from": "2026-03-26", "to": "2026-04-10"},
  "total_period": 320000.00,
  "transactions_count": 75,
  "top_products": [
    {"product_name": "Gaseosa 350ml", "total_units_sold": 120},
    {"product_name": "Papas Fritas", "total_units_sold": 85}
  ]
}
```

**RF-06.4 — Reporte Mensual (JSON)**

Idéntico al reporte quincenal (RF-06.3) en estructura, con período de **últimos 30 días naturales**.

| Atributo | Especificación |
|---|---|
| **Endpoint** | `GET /reports/monthly` |
| **Rol requerido** | Admin (tenant) |
| **Planes** | Basic, Pro (Free: HTTP 403 con mensaje de plan) |

---

### 1.8 Módulo de Super-Administración de Plataforma

Los endpoints de este módulo requieren el rol `superadmin` y **no están scoped a ningún tenant**. Son exclusivos del equipo operador de FastInventory SaaS.

**RF-07.1 — Estructura de datos del Super-Administrador**

El Super-Administrador existe como un usuario especial en la tabla `users` con:
- `role = 'superadmin'`
- `tenant_id = NULL`

Estos usuarios son creados únicamente de forma manual por el equipo de desarrollo (no existe endpoint público para crearlos).

**RF-07.2 — Endpoints de gestión de tenants**

| Operación | Endpoint | Descripción |
|---|---|---|
| Listar tenants | `GET /admin/tenants` | Lista paginada de todos los tenants con filtros por `plan` e `is_active` |
| Detalle del tenant | `GET /admin/tenants/{tenant_id}` | Información detallada de un tenant y sus métricas básicas |
| Suspender tenant | `PATCH /admin/tenants/{tenant_id}/suspend` | Cambia `is_active = false`. Todos los usuarios del tenant pierden acceso inmediatamente |
| Reactivar tenant | `PATCH /admin/tenants/{tenant_id}/reactivate` | Cambia `is_active = true` |
| Cambiar plan | `PATCH /admin/tenants/{tenant_id}/plan` | Actualiza el campo `plan` del tenant de forma inmediata |

**RF-07.3 — Reglas de negocio para la super-administración**

- La suspensión de un tenant no elimina sus datos. Es una operación reversible.
- Cuando un tenant es suspendido, el sistema invalida el acceso verificando `tenant.is_active` en cada request (via caché Redis con TTL corto).
- El cambio de plan es inmediato. Si el downgrade deja al tenant por encima de sus nuevos límites, se aplica el plan pero se bloquea la creación de nuevos recursos hasta que el tenant esté dentro del límite.
- Todo cambio de plan queda registrado en una tabla de auditoría `plan_audit_log` con: `tenant_id`, `old_plan`, `new_plan`, `changed_by` (superadmin_id), `changed_at`.
- El Super-Administrador no puede suspender ni modificar su propia cuenta.

**RF-07.4 — Tabla de auditoría de cambios de plan**

| Campo | Tipo SQL | Descripción |
|---|---|---|
| `id` | `UUID` | PK |
| `tenant_id` | `UUID` | FK → tenants.id |
| `old_plan` | `ENUM` | Plan anterior |
| `new_plan` | `ENUM` | Plan nuevo |
| `changed_by` | `UUID` | FK → users.id (superadmin) |
| `changed_at` | `TIMESTAMP` | Fecha y hora del cambio |

---

## 2. Atributos de Calidad

### 2.1 Desempeño (Performance)

| ID | Atributo | Especificación |
|---|---|---|
| **AQ-PERF-01** | Tiempo de respuesta — Búsqueda de productos | El endpoint `GET /products/?search=` debe responder en **≤ 500 ms** para un catálogo con hasta 1.000 productos activos por tenant, medido desde que el servidor recibe la solicitud. |
| **AQ-PERF-02** | Tiempo de respuesta — Registro de venta | El endpoint `POST /sales/` debe completar la transacción en **≤ 1.000 ms** para ventas con hasta 10 ítems. |
| **AQ-PERF-03** | Tiempo de respuesta — Generación de PDF | El endpoint `GET /reports/daily/pdf` debe generar y devolver el PDF en **≤ 3.000 ms** para reportes con hasta 200 transacciones diarias por tenant. |
| **AQ-PERF-04** | Concurrencia de la plataforma | El sistema debe soportar **al menos 100 tenants activos simultáneamente**, con hasta 50 usuarios concurrentes por tenant, sin degradación notable (≤ 20% de incremento sobre los tiempos base). |
| **AQ-PERF-05** | Índices de base de datos | Se deben crear índices compuestos en: `(tenant_id, name)` en `products` y `categories`; `(tenant_id, created_at)` en `sales`; `(tenant_id, sale_id)` en `sale_items`. |
| **AQ-PERF-06** | Caché de catálogos | Las consultas de listado de categorías y productos (operaciones de solo lectura frecuentes) deben cachearse en Redis con TTL de 60 segundos por tenant. La invalidación del caché ocurre al crear, actualizar o eliminar un producto o categoría del tenant. |

### 2.2 Seguridad (Security)

| ID | Atributo | Especificación |
|---|---|---|
| **AQ-SEC-01** | Autenticación obligatoria | Cada endpoint (excepto `POST /auth/token` y `POST /auth/register`) debe verificar la presencia y validez del JWT. Sin token válido: HTTP 401. |
| **AQ-SEC-02** | Autorización por rol | Los endpoints de Admin deben retornar HTTP 403 cuando el token es válido pero el rol es insuficiente. Los endpoints de Superadmin retornan HTTP 403 para cualquier rol que no sea `superadmin`. |
| **AQ-SEC-03** | Hashing de contraseñas | Toda contraseña se almacena con `bcrypt` (cost factor ≥ 12). Prohibido almacenar o registrar contraseñas en texto plano. |
| **AQ-SEC-04** | Secreto del JWT | La clave `SECRET_KEY` debe tener mínimo 32 caracteres aleatorios y estar en variables de entorno (nunca en código fuente). |
| **AQ-SEC-05** | HTTPS obligatorio en producción | Todas las comunicaciones en producción deben realizarse sobre HTTPS/TLS. |
| **AQ-SEC-06** | Cabeceras de seguridad HTTP | El servidor debe incluir: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` en todas las respuestas. |
| **AQ-SEC-07** | Aislamiento de datos entre tenants | Ningún endpoint puede retornar datos de un tenant diferente al del `tenant_id` en el JWT. Este requisito debe ser verificado mediante pruebas automatizadas de frontera de tenant en cada ciclo de CI/CD. |
| **AQ-SEC-08** | Rate Limiting por tenant | Cada tenant tiene un límite de requests por minuto configurable mediante variable de entorno (`RATE_LIMIT_PER_MINUTE`, default: 300). Solicitudes que superen el límite retornan HTTP 429 con el header `Retry-After`. |

### 2.3 Confiabilidad (Reliability)

| ID | Atributo | Especificación |
|---|---|---|
| **AQ-REL-01** | Atomicidad de ventas | El registro de una venta (inserción + descuento de stock) debe ejecutarse en una única transacción SQL con `COMMIT` / `ROLLBACK` garantizado. Un estado inconsistente (venta registrada sin descuento de stock, o viceversa) es inaceptable. |
| **AQ-REL-02** | Atomicidad del onboarding | La creación del tenant y del primer usuario administrador (RF-00.2) debe ejecutarse en una única transacción. Si falla alguno de los dos pasos, ambos se revierten. |
| **AQ-REL-03** | Disponibilidad objetivo (SLA) | La plataforma debe tener disponibilidad mínima del **99.5%** mensual (≤ 3.6 horas de inactividad/mes), medida por herramientas de monitoreo externas. Este SLA aplica en horas de uso típico (06:00–24:00, hora servidor). |
| **AQ-REL-04** | Manejo de errores | Ningún endpoint puede devolver un traceback interno de Python al cliente. Los errores inesperados deben retornar un mensaje genérico HTTP 500 y registrarse en el sistema de logging del servidor. |
| **AQ-REL-05** | Backup de base de datos | La base de datos PostgreSQL compartida debe tener backup automático diario con retención mínima de 7 días. Al ser una plataforma SaaS, una falla de backup afecta a todos los tenants. |

### 2.4 Mantenibilidad (Maintainability)

| ID | Atributo | Especificación |
|---|---|---|
| **AQ-MNT-01** | Organización del código | El proyecto sigue Vertical Slicing: `app/modules/tenants/`, `app/modules/auth/`, `app/modules/users/`, `app/modules/products/`, `app/modules/sales/`, `app/modules/reports/`, `app/modules/admin/`. Cada módulo contiene `router.py`, `schemas.py`, `models.py`, `service.py` y `repository.py`. |
| **AQ-MNT-02** | Migraciones de base de datos | Todos los cambios al esquema deben gestionarse a través de **Alembic**. No se permiten cambios manuales al esquema en producción. |
| **AQ-MNT-03** | Variables de configuración | Toda configuración sensible o variable por entorno debe cargarse desde variables de entorno usando `pydantic-settings`. No existen valores hardcodeados en el código fuente. |
| **AQ-MNT-04** | Cobertura de pruebas | Los módulos de Tenants, Ventas y Autenticación deben contar con pruebas de integración para: flujos happy path, casos de error críticos, y **pruebas de aislamiento multi-tenant** (verificar que un usuario de tenant A no puede acceder a datos del tenant B). |
| **AQ-MNT-05** | Documentación de la API | FastAPI generará automáticamente la documentación Swagger UI en `/docs` y ReDoc en `/redoc`. Todos los endpoints deben incluir `summary`, `description` y ejemplos de respuesta. |

### 2.5 Usabilidad de la API (Usability)

| ID | Atributo | Especificación |
|---|---|---|
| **AQ-USA-01** | Mensajes de error descriptivos | Los errores de validación (HTTP 422) deben indicar exactamente qué campo falló y por qué, usando el formato estándar de Pydantic/FastAPI. Los errores de plan (HTTP 403) deben incluir el límite actual y la sugerencia de upgrade. |
| **AQ-USA-02** | Consistencia de respuestas | Todas las respuestas exitosas que devuelven entidades únicas usan el mismo esquema de campos. Las respuestas de lista incluyen `items` (array) y `total` (conteo). |
| **AQ-USA-03** | Paginación | Los endpoints de listado (`GET /products/`, `GET /sales/`, `GET /admin/tenants`) deben soportar paginación mediante `skip` (offset, default: 0) y `limit` (default: 20, máximo: 100). |

### 2.6 Escalabilidad (Scalability)

| ID | Atributo | Especificación |
|---|---|---|
| **AQ-ESC-01** | Diseño sin estado (Stateless) | La API no almacena estado de sesión en el servidor. Toda la información de autenticación y tenant viaja en el JWT. Esto permite escalar horizontalmente añadiendo instancias sin coordinación adicional. |
| **AQ-ESC-02** | Configuración del pool de conexiones | SQLAlchemy debe configurarse con: `pool_size=10`, `max_overflow=20`. Estos valores son configurables mediante variables de entorno. El pool es compartido entre todos los tenants. |
| **AQ-ESC-03** | Caché con Redis | Redis se usa para caché de catálogos (TTL 60 s) y verificación de estado del tenant (TTL 30 s). Las claves de caché tienen el formato `tenant:{tenant_id}:products`, `tenant:{tenant_id}:categories`, `tenant:{tenant_id}:status`. |

### 2.7 Aislamiento Multi-Tenant (Isolation)

Esta sección formaliza los requisitos de aislamiento como atributo de calidad propio, dado el impacto crítico que tiene en la confianza del negocio SaaS.

| ID | Atributo | Especificación |
|---|---|---|
| **AQ-ISO-01** | Filtrado obligatorio por `tenant_id` | Todo método de repositorio que acceda a datos de negocio (productos, categorías, ventas, usuarios) debe incluir `WHERE tenant_id = :tenant_id` de forma obligatoria. No se permite ningún método de repositorio que retorne datos multi-tenant (excepto en el módulo de super-administración). |
| **AQ-ISO-02** | Pruebas de frontera de tenant | El conjunto de pruebas de integración debe incluir casos que intenten acceder a recursos de otro tenant usando credenciales válidas de un tenant diferente. Todos estos casos deben retornar HTTP 404 (no 403, para no revelar la existencia del recurso). |
| **AQ-ISO-03** | Propagación del tenant por inyección de dependencias | El `tenant_id` debe fluir desde el JWT hasta cada llamada al repositorio a través del sistema `Depends()` de FastAPI, nunca como una variable global o de hilo. Esto garantiza que el contexto del tenant es correcto en entornos con múltiples workers. |

---

## 3. Restricciones

### 3.1 Restricciones Técnicas

| ID | Restricción | Razón |
|---|---|---|
| **RT-01** | El backend se implementa exclusivamente en **Python 3.11+** con **FastAPI** como framework web. | FastAPI ofrece validación automática (Pydantic), documentación generada, rendimiento asíncrono y excelente sistema de inyección de dependencias para propagar el contexto del tenant. |
| **RT-02** | El motor de base de datos es **PostgreSQL 14+** con estrategia **Row-Level Tenancy** (`tenant_id` en cada tabla). | PostgreSQL garantiza transacciones ACID. La estrategia Row-Level Tenancy es la más simple de implementar y mantener con SQLAlchemy y Alembic, y la más económica en términos de infraestructura. |
| **RT-03** | La interacción con la base de datos se realiza exclusivamente a través de **SQLAlchemy 2.0+** async como ORM. El uso de `text()` está permitido solo para consultas de reportes complejas. | Mantenibilidad y seguridad (prevención de SQL Injection). El ORM también facilita la adición universal del filtro `tenant_id`. |
| **RT-04** | Las migraciones de esquema se gestionan con **Alembic**. Ningún cambio de esquema puede aplicarse manualmente en producción. | Trazabilidad y reproducibilidad. |
| **RT-05** | La aplicación debe ser contenerizable con **Docker**. El ambiente completo (API + PostgreSQL + Redis) debe poder levantarse con `docker compose up`. | Portabilidad y consistencia entre ambientes. |
| **RT-06** | La generación de PDFs se realiza en memoria usando **FPDF2**. No se permite la escritura de archivos temporales en el sistema de archivos del servidor. | Compatible con escalado horizontal (varios workers no comparten disco). |
| **RT-07** | Se implementa **Redis** como sistema de caché para catálogos y verificación del estado del tenant. | El volumen de consultas repetidas de múltiples tenants activos hace necesario el caché desde la primera versión SaaS, a diferencia del sistema single-tenant previo. |
| **RT-08** | **Rate limiting** por tenant implementado mediante middleware de FastAPI. | Prevención de abuso y garantía de calidad de servicio compartida entre todos los tenants. |

### 3.2 Restricciones Administrativas

| ID | Restricción | Razón |
|---|---|---|
| **RA-01** | La v2.0 no incluye cálculo, desglose ni gestión de impuestos (IVA u otros). Los reportes trabajan exclusivamente con el precio de venta final como ingreso bruto. | Mantiene la simplicidad del MVP SaaS. El cálculo de impuestos varía por país y se reserva para una versión futura. |
| **RA-02** | El módulo de reportes cubre períodos de 1, 15 y 30 días. No se implementan rangos de fechas personalizados en la v2.0. | Definido en el alcance de la versión inicial. |
| **RA-03** | La facturación de los planes de suscripción es manual en la v2.0. No se integra ninguna pasarela de pago en esta versión. La integración con Stripe se planifica para la v2.1. | Reduce la complejidad del MVP. La facturación manual es viable con una base de tenants pequeña inicial. |
| **RA-04** | Los Super-Administradores no se crean mediante endpoints públicos. Su creación es exclusivamente manual por el equipo de desarrollo directamente en la base de datos o a través de un script interno. | Seguridad: prevención de escalada de privilegios no autorizada. |
| **RA-05** | El código fuente debe versionarse en un repositorio **Git**. Las variables de entorno sensibles no deben incluirse en el repositorio; se provee un archivo `.env.example` como plantilla. | Estándar de seguridad y gestión de código. |
| **RA-06** | Cada tenant opera como una organización independiente. No se soporta la gestión de múltiples sucursales de un mismo negocio en la v2.0. | Definido en el alcance. Planificado para v3.0. |

---

## 4. Interfaces Externas

### 4.1 Interfaz con el Cliente HTTP (Frontend)

El sistema provee una API REST que es el único punto de acceso para todos los clientes (aplicaciones móviles, web, Swagger UI, Postman).

| Atributo | Especificación |
|---|---|
| **Protocolo** | HTTP/1.1 sobre TCP (HTTPS/TLS en producción) |
| **Puerto por defecto** | 8000 (desarrollo), 443 (producción vía proxy inverso o plataforma cloud) |
| **Formato de datos** | JSON (`application/json`) para todos los endpoints, excepto PDF (`application/pdf`) y autenticación (`application/x-www-form-urlencoded`) |
| **Formato de fechas** | ISO 8601: `YYYY-MM-DDTHH:MM:SS` para timestamps, `YYYY-MM-DD` para fechas |
| **Formato de IDs** | UUID v4. Nunca se usan IDs enteros secuenciales para las entidades de negocio |
| **Autenticación** | Header `Authorization: Bearer <jwt_token>` en todas las rutas protegidas |
| **Paginación** | Query params `skip` y `limit` en endpoints de listado |
| **Encoding** | UTF-8 en todas las respuestas |
| **CORS** | Los orígenes permitidos se configuran mediante `ALLOWED_ORIGINS`. En desarrollo: `*`. En producción: el origen exacto del cliente |
| **Documentación interactiva** | Swagger UI en `GET /docs`. ReDoc en `GET /redoc` |

**Códigos de respuesta HTTP utilizados:**

| Código | Uso |
|---|---|
| `200 OK` | Consulta exitosa (GET, autenticación). |
| `201 Created` | Recurso creado exitosamente (POST). |
| `204 No Content` | Eliminación o desactivación exitosa (DELETE, PATCH). |
| `400 Bad Request` | Regla de negocio violada (nombre duplicado, categoría con productos al eliminar). |
| `401 Unauthorized` | Token ausente, inválido o expirado. |
| `403 Forbidden` | Token válido pero rol insuficiente, tenant suspendido, o límite de plan superado. |
| `404 Not Found` | Recurso no encontrado en el tenant del usuario (incluyendo recursos de otros tenants). |
| `409 Conflict` | Conflicto de estado (stock insuficiente al registrar venta). |
| `422 Unprocessable Entity` | Validación de esquema fallida (Pydantic). |
| `429 Too Many Requests` | Rate limit del tenant superado. Incluye header `Retry-After`. |
| `500 Internal Server Error` | Error inesperado del servidor (se loguea internamente, nunca se expone el traceback). |

---

### 4.2 Interfaz con la Base de Datos

El sistema se comunica con PostgreSQL a través de **SQLAlchemy 2.0+** usando un pool de conexiones asíncronas con `asyncpg` como driver.

| Atributo | Especificación |
|---|---|
| **Motor** | PostgreSQL 14+ |
| **Driver Python** | `asyncpg` (driver asíncrono nativo para PostgreSQL) |
| **ORM** | SQLAlchemy 2.0+ con soporte async |
| **Cadena de conexión** | `postgresql+asyncpg://user:password@host:port/dbname` — cargada desde variable de entorno `DATABASE_URL` |
| **Pool de conexiones** | `pool_size=10`, `max_overflow=20`, `pool_timeout=30s` (compartido entre todos los tenants) |
| **Encoding** | UTF-8 (`client_encoding=utf8`) |
| **Gestión de esquema** | Alembic. El esquema no se crea con `create_all()` en producción. |
| **Transacciones** | Toda operación de escritura crítica (ventas, onboarding) se ejecuta en una transacción explícita con `async with session.begin()`. |
| **Estrategia multi-tenant** | Row-Level Tenancy: columna `tenant_id UUID FK → tenants.id` en todas las tablas de datos. Todo `SELECT`, `UPDATE` y `DELETE` incluye `WHERE tenant_id = :tenant_id`. |

---

### 4.3 Interfaz de Caché (Redis)

El sistema utiliza Redis como capa de caché para reducir la carga sobre PostgreSQL en consultas frecuentes de solo lectura.

| Atributo | Especificación |
|---|---|
| **Motor** | Redis 7+ |
| **Librería Python** | `redis-py` con soporte async (`redis.asyncio`) |
| **Cadena de conexión** | Cargada desde variable de entorno `REDIS_URL` |
| **Estrategia de claves** | Prefijo por tenant: `tenant:{tenant_id}:{recurso}` (ej. `tenant:abc123:products`) |
| **TTL de caché de catálogos** | 60 segundos para productos y categorías |
| **TTL de estado del tenant** | 30 segundos para `tenant.is_active` (verificación de suspensión) |
| **Invalidación** | Al crear, actualizar o eliminar un producto o categoría, se elimina (`DEL`) la clave de caché correspondiente al tenant |
| **Fallback** | Si Redis no está disponible, el sistema continúa operando consultando directamente la BD (degradación graceful). Se registra un log de warning. |

---

### 4.4 Interfaz de Generación de PDF

El módulo de reportes utiliza la librería **FPDF2** para generar documentos PDF en memoria.

| Atributo | Especificación |
|---|---|
| **Librería** | `fpdf2` (versión ≥ 2.7) |
| **Nombre del negocio** | Leído desde `tenants.name` del tenant actual en la BD. No se usa ninguna variable de entorno global para este campo. |
| **Generación** | En memoria (`BytesIO`). No se escriben archivos en el sistema de archivos. |
| **Entrega al cliente** | FastAPI `StreamingResponse` con `media_type="application/pdf"` |
| **Nombre del archivo** | Controlado por el header `Content-Disposition: attachment; filename="reporte_diario_{tenant_slug}_{YYYY-MM-DD}.pdf"` |
| **Fuente tipográfica** | Helvetica (incluida en FPDF2, sin dependencias externas). |
| **Dependencias externas** | Ninguna. La generación es completamente local. |

---

*Documento elaborado como parte de la especificación técnica del proyecto FastInventory SaaS.*  
*Versión 2.0 — 10/04/2026. Refactorización del documento v1.0 para el modelo SaaS multi-tenant.*
