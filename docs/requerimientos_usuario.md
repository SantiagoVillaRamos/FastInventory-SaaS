# Documento de Requerimientos de Usuario
## Proyecto: FastInventory SaaS

---

**Versión:** 2.0  
**Fecha:** 10/04/2026  
**Estado:** Borrador Inicial  
**Autor(es):** Equipo de Desarrollo

---

## Tabla de Contenidos

1. [Introducción](#1-introducción)
2. [Actores del Sistema](#2-actores-del-sistema)
3. [Historias de Usuario — Empleado del Negocio](#3-historias-de-usuario--empleado-del-negocio)
4. [Historias de Usuario — Administrador del Negocio](#4-historias-de-usuario--administrador-del-negocio)
5. [Historias de Usuario — Super-Administrador de Plataforma](#5-historias-de-usuario--super-administrador-de-plataforma)
6. [Restricciones de Usuario](#6-restricciones-de-usuario)

---

## 1. Introducción

### 1.1 Propósito

Este documento especifica los requerimientos de usuario del sistema **FastInventory SaaS**, describiendo las acciones que cada tipo de actor puede realizar sobre la plataforma. A diferencia del sistema monocliente previo (v1.0), FastInventory SaaS opera bajo un modelo **multi-tenant**: múltiples negocios (tenants) comparten una misma infraestructura, con datos completamente aislados entre sí.

Se emplea la técnica de **Historias de Usuario**, complementada con criterios de aceptación y reglas de negocio que permiten al equipo de desarrollo comprender con precisión cada necesidad, incluyendo las particularidades del aislamiento multi-tenant.

### 1.2 Estructura de una Historia de Usuario

Cada historia de usuario sigue la siguiente estructura:

| Campo | Descripción |
|---|---|
| **ID** | Identificador único (formato: HU-XX) |
| **Especificación** | Frase corta: *"Como [actor], quiero [acción] para [objetivo]."* |
| **Conversación / Detalle** | Descripción ampliada, reglas de negocio y consideraciones de multi-tenancy. |
| **Criterios de Aceptación** | Condiciones verificables para determinar si la HU fue implementada correctamente. |
| **Prioridad** | Alta / Media / Baja según el valor de negocio. |
| **Objetivos relacionados** | Referencia a los OBs del documento de Visión y Alcance. |

### 1.3 Convenciones de Prioridad

| Prioridad | Significado |
|---|---|
| **Alta** | Funcionalidad esencial para el MVP de la plataforma SaaS. |
| **Media** | Agrega valor significativo pero puede implementarse en una segunda iteración. |
| **Baja** | Mejora la experiencia pero no bloquea el uso del sistema. |

---

## 2. Actores del Sistema

FastInventory SaaS define tres actores principales con diferentes alcances de acción:

| Actor | Rol en el sistema | Alcance |
|---|---|---|
| **Empleado** | Usuario operativo del negocio | Scoped al tenant al que pertenece. Registra ventas y consulta inventario. |
| **Administrador del Negocio** | Dueño o gerente del negocio | Scoped al tenant al que pertenece. Control total dentro de su negocio. |
| **Super-Administrador de Plataforma** | Operador de FastInventory SaaS | Global. Gestiona todos los tenants registrados en la plataforma. |

> **Regla transversal de aislamiento:** Los actores `Empleado` y `Administrador del Negocio` solo pueden ver y modificar los datos de su propio tenant. Ninguna acción de estos actores puede afectar, ni acceder, a los datos de otro negocio registrado en la plataforma.

---

## 3. Historias de Usuario — Empleado del Negocio

---

### HU-01: Iniciar Sesión en el Sistema

| Campo | Detalle |
|---|---|
| **Especificación** | *Como empleado, quiero iniciar sesión con mi usuario y contraseña para acceder a las funciones de mi negocio.* |
| **Prioridad** | Alta |
| **Objetivos relacionados** | OB-01, OB-04 |

**Conversación / Detalle:**

El sistema provee un endpoint de autenticación que recibe las credenciales del usuario. Si son válidas, devuelve un token JWT que contiene el `sub` (username), el `role` y el `tenant_id` del negocio al que pertenece el usuario. El sistema garantiza que un empleado de un negocio no pueda autenticarse como si perteneciera a otro negocio, ya que el `tenant_id` se determina desde la base de datos en el momento de la autenticación, no desde el cliente.

**Criterios de Aceptación:**

- [ ] Dado que un empleado ingresa credenciales válidas, el sistema responde con un token JWT (que incluye `tenant_id`) y código HTTP 200.
- [ ] Dado que un empleado ingresa credenciales incorrectas, el sistema responde con HTTP 401 y un mensaje de error claro, sin revelar si el usuario existe.
- [ ] Dado que el token ha expirado, el sistema rechaza la solicitud con HTTP 401.
- [ ] El `tenant_id` en el JWT corresponde al negocio al que pertenece el usuario en la base de datos; el cliente no puede modificarlo.
- [ ] La contraseña nunca se almacena en texto plano; se utiliza hashing con `bcrypt`.

---

### HU-02: Buscar un Producto por Nombre

| Campo | Detalle |
|---|---|
| **Especificación** | *Como empleado, quiero buscar un producto escribiendo las primeras letras de su nombre para encontrarlo rápidamente dentro del catálogo de mi negocio.* |
| **Prioridad** | Alta |
| **Objetivos relacionados** | OB-04 |

**Conversación / Detalle:**

El sistema expone un endpoint de búsqueda que devuelve productos cuyo nombre contenga el texto buscado (búsqueda parcial, insensible a mayúsculas/minúsculas). La búsqueda opera exclusivamente dentro del catálogo del tenant del empleado autenticado; nunca puede retornar productos de otro negocio.

**Criterios de Aceptación:**

- [ ] El endpoint acepta un parámetro de búsqueda de al menos 1 carácter.
- [ ] La búsqueda no distingue entre mayúsculas y minúsculas (ej. "beb" encuentra "Bebida Gaseosa").
- [ ] Los resultados incluyen únicamente productos del tenant del empleado autenticado.
- [ ] El resultado incluye: nombre, precio de venta, stock disponible y categoría.
- [ ] Si no hay coincidencias, la respuesta es una lista vacía (no un error).
- [ ] El endpoint responde en menos de 500 ms con hasta 1.000 productos activos en el tenant.

---

### HU-03: Navegar Productos por Categoría

| Campo | Detalle |
|---|---|
| **Especificación** | *Como empleado, quiero filtrar los productos por categoría para encontrar rápidamente lo que el cliente pide sin necesidad de escribir.* |
| **Prioridad** | Alta |
| **Objetivos relacionados** | OB-04 |

**Conversación / Detalle:**

El sistema expone endpoints para listar las categorías disponibles y filtrar productos por categoría. Ambas operaciones están restringidas al catálogo del tenant del empleado autenticado.

**Criterios de Aceptación:**

- [ ] Existe un endpoint para listar todas las categorías del tenant del empleado.
- [ ] Existe un endpoint para obtener los productos de una categoría específica por ID, dentro del mismo tenant.
- [ ] Un empleado no puede consultar categorías ni productos de otro tenant, aunque conozca sus IDs.
- [ ] Si la categoría no existe dentro del tenant, el sistema devuelve HTTP 404.
- [ ] Los productos con stock en 0 aparecen en el listado con `stock = 0`, no se omiten.

---

### HU-04: Consultar el Stock de un Producto

| Campo | Detalle |
|---|---|
| **Especificación** | *Como empleado, quiero consultar el stock disponible de un producto específico para informarle al cliente si está disponible antes de registrar la venta.* |
| **Prioridad** | Alta |
| **Objetivos relacionados** | OB-02 |

**Conversación / Detalle:**

El endpoint de detalle de un producto devuelve nombre, precio y cantidad disponible en inventario. El sistema verifica que el producto pertenezca al tenant del empleado antes de retornar la información.

**Criterios de Aceptación:**

- [ ] El endpoint devuelve el detalle completo del producto (nombre, precio, stock, categoría).
- [ ] Si el producto no existe dentro del tenant del empleado, el sistema devuelve HTTP 404 (igual que si el producto no existiera en absoluto, para no revelar la existencia de recursos de otros tenants).
- [ ] El campo `stock` refleja el inventario real en el momento de la consulta.

---

### HU-05: Registrar una Venta

| Campo | Detalle |
|---|---|
| **Especificación** | *Como empleado, quiero registrar la venta de uno o más productos en una sola operación para completar el proceso con el cliente de forma eficiente.* |
| **Prioridad** | Alta |
| **Objetivos relacionados** | OB-02, OB-04 |

**Conversación / Detalle:**

El sistema expone un endpoint transaccional para crear una nueva venta. El empleado envía una lista de ítems con el ID del producto y la cantidad. El sistema valida que todos los productos pertenezcan al tenant del empleado y que tengan stock suficiente. Si todo es válido, registra la venta con el `tenant_id`, el `seller_id` del empleado y descuenta el stock. Si algún producto no tiene stock suficiente, se rechaza toda la operación de forma atómica (ningún ítem se confirma parcialmente).

**Criterios de Aceptación:**

- [ ] El endpoint acepta una lista de ítems con `product_id` y `quantity` (mínimo 1 ítem).
- [ ] El sistema verifica que cada `product_id` pertenezca al tenant del empleado autenticado. Un producto de otro tenant es tratado como inexistente (HTTP 404).
- [ ] Si todos los productos tienen stock suficiente, la venta se confirma con HTTP 201 y el resumen (total, ítems, fecha, hora).
- [ ] Si algún producto no tiene stock suficiente, la venta se rechaza completamente con HTTP 409, indicando el producto con stock insuficiente.
- [ ] El stock de cada producto se descuenta correctamente al confirmar la venta (operación atómica).
- [ ] La venta queda registrada con el `tenant_id`, la fecha/hora UTC y el `seller_id` del empleado.
- [ ] No es posible registrar una venta con `quantity <= 0` para algún ítem.

---

## 4. Historias de Usuario — Administrador del Negocio

---

### HU-06: Gestionar Categorías de Productos

| Campo | Detalle |
|---|---|
| **Especificación** | *Como administrador, quiero crear, editar y eliminar categorías para organizar el catálogo de productos de mi negocio.* |
| **Prioridad** | Alta |
| **Objetivos relacionados** | OB-01, OB-02 |

**Conversación / Detalle:**

El sistema expone endpoints CRUD completos para la gestión de categorías. El nombre de la categoría es único dentro del tenant, no de forma global entre toda la plataforma: dos negocios distintos pueden tener una categoría llamada "Bebidas" sin conflicto.

**Criterios de Aceptación:**

- [ ] El administrador puede crear una categoría con nombre y descripción, asociada automáticamente a su tenant.
- [ ] El nombre de la categoría es único dentro del tenant; un nombre duplicado dentro del mismo negocio retorna HTTP 400.
- [ ] Dos tenants diferentes pueden tener categorías con el mismo nombre sin interferencia.
- [ ] El administrador puede editar el nombre y descripción de una categoría de su tenant.
- [ ] El administrador puede eliminar una categoría de su tenant que no tenga productos asociados.
- [ ] Intentar eliminar una categoría con productos asociados retorna HTTP 400 con mensaje explicativo.
- [ ] Solo el rol Administrador (del tenant) puede crear, editar y eliminar categorías; el Empleado recibe HTTP 403.

---

### HU-07: Gestionar Productos del Inventario

| Campo | Detalle |
|---|---|
| **Especificación** | *Como administrador, quiero agregar, editar y eliminar productos del catálogo para mantener el inventario de mi negocio actualizado.* |
| **Prioridad** | Alta |
| **Objetivos relacionados** | OB-01, OB-02 |

**Conversación / Detalle:**

El sistema expone endpoints CRUD completos para productos. El nombre del producto es único dentro del tenant. El stock no se edita directamente desde este módulo: disminuye con cada venta confirmada y se repondrá mediante un módulo futuro de compras/reposición. El sistema valida que el número de productos activos no supere el límite del plan de suscripción del tenant.

**Criterios de Aceptación:**

- [ ] El administrador puede crear un producto con todos sus campos requeridos (nombre, precio, unidad, stock inicial, categoría), asociado automáticamente a su tenant.
- [ ] El nombre del producto es único dentro del tenant; un nombre duplicado en el mismo negocio retorna HTTP 400.
- [ ] El precio de venta debe ser mayor a 0; un valor inválido retorna HTTP 422.
- [ ] El stock inicial debe ser mayor o igual a 0.
- [ ] Si el tenant ha alcanzado el límite de productos de su plan, la creación retorna HTTP 403 con un mensaje que indica el límite del plan y sugiere hacer upgrade.
- [ ] El administrador puede actualizar nombre, descripción, precio, unidad de medida y categoría; el stock no es editable directamente.
- [ ] El administrador puede eliminar lógicamente un producto (`is_active = false`).
- [ ] Solo el rol Administrador del tenant puede crear, actualizar o eliminar productos; el Empleado recibe HTTP 403.

---

### HU-08: Gestionar Usuarios del Negocio

| Campo | Detalle |
|---|---|
| **Especificación** | *Como administrador, quiero crear y administrar las cuentas de los empleados de mi negocio para controlar quién tiene acceso al sistema.* |
| **Prioridad** | Alta |
| **Objetivos relacionados** | OB-01 |

**Conversación / Detalle:**

El administrador puede crear cuentas de usuario para sus empleados, asignarles un rol y desactivarlas cuando sea necesario. El sistema valida que el número de usuarios activos del tenant no supere el límite del plan de suscripción. Los usuarios de un tenant son completamente invisibles para los administradores de otros tenants.

**Criterios de Aceptación:**

- [ ] El administrador puede crear un usuario (nombre, username, contraseña, rol) asociado automáticamente a su tenant.
- [ ] El username es único dentro del tenant; un duplicado retorna HTTP 400. El mismo username puede existir en diferentes tenants sin conflicto.
- [ ] Si el tenant ha alcanzado el límite de usuarios de su plan, la creación retorna HTTP 403 con mensaje informativo sobre el límite.
- [ ] El administrador puede cambiar el rol de un usuario de su tenant.
- [ ] El administrador puede desactivar una cuenta (el usuario no puede iniciar sesión, pero su historial de ventas se conserva).
- [ ] El administrador no puede desactivar ni modificar el rol de su propia cuenta.
- [ ] El administrador solo puede ver y gestionar usuarios de su propio tenant.
- [ ] Solo el rol Administrador del tenant puede gestionar usuarios.

---

### HU-09: Consultar el Reporte Diario de Ventas

| Campo | Detalle |
|---|---|
| **Especificación** | *Como administrador, quiero consultar el reporte de ventas del día actual de mi negocio para conocer el total facturado y los productos vendidos en la jornada.* |
| **Prioridad** | Alta |
| **Objetivos relacionados** | OB-03 |

**Conversación / Detalle:**

El sistema devuelve todas las ventas registradas en el día actual dentro del tenant del administrador. El reporte incluye: hora de registro, lista de productos con cantidades y precios, subtotal por venta y total general acumulado. El reporte es estrictamente scoped al tenant: no puede incluir ventas de otros negocios.

**Criterios de Aceptación:**

- [ ] El endpoint devuelve las ventas del día actual del tenant del administrador, con detalle por ítem.
- [ ] El reporte incluye `total_dia` que suma todos los subtotales de la jornada del tenant.
- [ ] Si no hay ventas en el día para el tenant, el reporte devuelve lista vacía y `total_dia = 0`.
- [ ] Solo el rol Administrador del tenant puede acceder a este endpoint; el Empleado recibe HTTP 403.
- [ ] Este endpoint está disponible para todos los planes de suscripción (Free, Basic, Pro).

---

### HU-10: Descargar el Reporte Diario en PDF

| Campo | Detalle |
|---|---|
| **Especificación** | *Como administrador, quiero descargar el reporte diario de ventas de mi negocio en PDF para archivarlo o revisarlo fuera de la aplicación.* |
| **Prioridad** | Alta |
| **Objetivos relacionados** | OB-03 |

**Conversación / Detalle:**

El sistema genera y devuelve un PDF del reporte diario. El encabezado del PDF incluye el nombre del negocio (obtenido del registro del tenant en la base de datos, no de una variable de entorno global). El PDF no incluye datos de ningún otro tenant.

**Criterios de Aceptación:**

- [ ] El endpoint genera un PDF válido y descargable con el nombre del negocio (tenant) y la fecha del reporte.
- [ ] El nombre del negocio en el encabezado del PDF corresponde al nombre registrado en el tenant del administrador.
- [ ] La tabla del PDF contiene: Hora, Producto, Cantidad, Precio Unitario, Subtotal.
- [ ] El PDF muestra el total general al final del documento.
- [ ] Si no hay ventas en el día, el PDF se genera con tabla vacía y total en $0.
- [ ] Solo el rol Administrador del tenant puede acceder; el Empleado recibe HTTP 403.
- [ ] Este endpoint está disponible para todos los planes (Free, Basic, Pro).

---

### HU-11: Consultar el Reporte Quincenal de Ventas

| Campo | Detalle |
|---|---|
| **Especificación** | *Como administrador, quiero consultar un resumen de las ventas de los últimos 15 días de mi negocio para evaluar el rendimiento reciente.* |
| **Prioridad** | Media |
| **Objetivos relacionados** | OB-03 |

**Conversación / Detalle:**

El sistema devuelve un resumen de ventas de los últimos 15 días naturales dentro del tenant. El resumen incluye: total del período, número de transacciones y ranking de productos más vendidos (top 10 por unidades). Este reporte no está disponible en el plan Free; intentar acceder con un plan Free retorna HTTP 403 con mensaje que indica la restricción del plan.

**Criterios de Aceptación:**

- [ ] El endpoint devuelve el resumen de ventas de los últimos 15 días del tenant.
- [ ] El resumen incluye: `total_periodo`, `numero_transacciones` y `productos_mas_vendidos`.
- [ ] `productos_mas_vendidos` lista los 10 productos con mayor cantidad de unidades vendidas en el período, ordenados de mayor a menor.
- [ ] Solo el rol Administrador del tenant puede acceder; el Empleado recibe HTTP 403.
- [ ] Tenants con plan Free reciben HTTP 403 con mensaje sobre la restricción del plan.
- [ ] Tenants con plan Basic o Pro pueden acceder sin restricción.

---

### HU-12: Consultar el Reporte Mensual de Ventas

| Campo | Detalle |
|---|---|
| **Especificación** | *Como administrador, quiero consultar un resumen de las ventas del último mes de mi negocio para analizar el desempeño comercial del período.* |
| **Prioridad** | Media |
| **Objetivos relacionados** | OB-03 |

**Conversación / Detalle:**

Funcionalidad equivalente a HU-11 pero con un período de 30 días naturales. Aplican las mismas restricciones de plan: no disponible en el plan Free.

**Criterios de Aceptación:**

- [ ] El endpoint devuelve el resumen de ventas de los últimos 30 días del tenant.
- [ ] El resumen incluye: `total_periodo`, `numero_transacciones` y `productos_mas_vendidos`.
- [ ] Solo el rol Administrador del tenant puede acceder; el Empleado recibe HTTP 403.
- [ ] Tenants con plan Free reciben HTTP 403 con mensaje sobre la restricción del plan.

---

### HU-13: Registrar el Negocio en la Plataforma (Onboarding)

| Campo | Detalle |
|---|---|
| **Especificación** | *Como dueño de un negocio, quiero registrarme en FastInventory SaaS de forma autónoma para comenzar a operar sin necesidad de contactar al equipo de soporte.* |
| **Prioridad** | Alta |
| **Objetivos relacionados** | OB-01, OB-04 |

**Conversación / Detalle:**

El sistema expone un endpoint público (sin autenticación) que permite a cualquier persona registrar su negocio en la plataforma. En un solo paso, se crea el tenant (negocio) y el primer usuario con rol Administrador, listo para iniciar sesión. El negocio inicia en el plan Free de forma automática. El nombre del negocio registrado será el que aparece en los reportes PDF y en el panel del administrador.

**Criterios de Aceptación:**

- [ ] El endpoint es público (no requiere token JWT).
- [ ] El cuerpo de la petición incluye: nombre del negocio, username del primer admin, contraseña y nombre completo.
- [ ] En una única operación atómica, el sistema crea el tenant y el primer usuario administrador asociado a ese tenant.
- [ ] El tenant inicia automáticamente en el plan `free`.
- [ ] El username del administrador debe ser único dentro del tenant recién creado (siempre lo será, al ser el primero).
- [ ] Si ya existe un tenant con el mismo nombre de negocio, el sistema retorna HTTP 400 con mensaje descriptivo.
- [ ] La contraseña se almacena hasheada con bcrypt; nunca se persiste en texto plano.
- [ ] Tras el registro, el administrador puede iniciar sesión de inmediato con las credenciales proporcionadas.

---

### HU-14: Gestionar el Perfil del Negocio

| Campo | Detalle |
|---|---|
| **Especificación** | *Como administrador, quiero ver y actualizar la información de mi negocio registrada en la plataforma para mantenerla al día.* |
| **Prioridad** | Media |
| **Objetivos relacionados** | OB-01 |

**Conversación / Detalle:**

El administrador puede consultar y actualizar los datos principales del tenant: nombre del negocio y otros metadatos relevantes (teléfono, dirección, en versiones futuras). No puede cambiar el plan de suscripción desde este endpoint; el cambio de plan lo gestiona el Super-Administrador. El administrador puede ver el plan actual al que está suscrito su negocio.

**Criterios de Aceptación:**

- [ ] El endpoint `GET /tenants/me` devuelve el nombre del negocio, el plan actual y la fecha de registro.
- [ ] El endpoint `PUT /tenants/me` permite actualizar el nombre del negocio.
- [ ] Solo el Administrador del tenant puede acceder y modificar el perfil del negocio; el Empleado recibe HTTP 403.
- [ ] El Super-Administrador no puede modificar el perfil de un tenant a través de este endpoint (tiene sus propios endpoints).
- [ ] El campo `plan` es de solo lectura desde este endpoint; modificarlo retorna HTTP 403.

---

## 5. Historias de Usuario — Super-Administrador de Plataforma

---

### HU-15: Listar y Monitorear los Tenants de la Plataforma

| Campo | Detalle |
|---|---|
| **Especificación** | *Como super-administrador, quiero ver un listado de todos los negocios registrados en la plataforma con su estado y plan para monitorear la salud del servicio.* |
| **Prioridad** | Alta |
| **Objetivos relacionados** | OB-05, OB-06 |

**Conversación / Detalle:**

El Super-Administrador tiene acceso a un conjunto de endpoints reservados bajo el prefijo `/admin/` que requieren el rol `superadmin`. Estos endpoints son completamente ajenos al sistema de tenants: el Super-Administrador no pertenece a ningún tenant y puede ver todos los datos operativos de la plataforma de forma agregada.

**Criterios de Aceptación:**

- [ ] El endpoint `GET /admin/tenants` devuelve la lista paginada de todos los tenants con: nombre, plan, estado (activo/suspendido), fecha de registro y número de usuarios.
- [ ] Solo el rol `superadmin` puede acceder; cualquier otro rol recibe HTTP 403.
- [ ] El endpoint soporta filtrado por estado (`activo`, `suspendido`) y por plan (`free`, `basic`, `pro`).
- [ ] La respuesta incluye paginación mediante `skip` y `limit`.

---

### HU-16: Suspender o Reactivar un Negocio

| Campo | Detalle |
|---|---|
| **Especificación** | *Como super-administrador, quiero poder suspender o reactivar un negocio registrado para gestionar incumplimientos de los términos de uso o problemas de pago.* |
| **Prioridad** | Alta |
| **Objetivos relacionados** | OB-05 |

**Conversación / Detalle:**

Cuando un tenant es suspendido, todos sus usuarios (empleados y administradores) pierden acceso a la plataforma inmediatamente: cualquier token JWT vigente de ese tenant es rechazado con HTTP 403. Los datos del tenant no se eliminan; la suspensión es reversible.

**Criterios de Aceptación:**

- [ ] El endpoint `PATCH /admin/tenants/{tenant_id}/suspend` cambia el estado del tenant a `suspendido`.
- [ ] El endpoint `PATCH /admin/tenants/{tenant_id}/reactivate` cambia el estado del tenant a `activo`.
- [ ] Una vez suspendido, cualquier solicitud con un token JWT de un usuario de ese tenant recibe HTTP 403 con mensaje: *"Tu cuenta ha sido suspendida. Contacta con soporte."*
- [ ] La suspensión no elimina los datos del tenant; son recuperables al reactivar.
- [ ] Solo el rol `superadmin` puede ejecutar estas acciones.
- [ ] El Super-Administrador no puede suspender su propia cuenta de plataforma.

---

### HU-17: Cambiar el Plan de Suscripción de un Negocio

| Campo | Detalle |
|---|---|
| **Especificación** | *Como super-administrador, quiero cambiar el plan de suscripción de un negocio para reflejar un upgrade, downgrade o cortesía.* |
| **Prioridad** | Media |
| **Objetivos relacionados** | OB-05, OB-06 |

**Conversación / Detalle:**

El cambio de plan es inmediato. Si un tenant hace downgrade a un plan con menos capacidad y ya supera los límites del nuevo plan (ej. tiene 200 productos y baja al plan Free con límite de 50), el sistema aplica el nuevo plan pero no elimina los recursos existentes; simplemente impide crear nuevos recursos hasta que el tenant esté dentro del límite.

**Criterios de Aceptación:**

- [ ] El endpoint `PATCH /admin/tenants/{tenant_id}/plan` acepta el nuevo plan (`free`, `basic`, `pro`) y actualiza el tenant de inmediato.
- [ ] El cambio de plan entra en vigor en la siguiente solicitud del tenant (no requiere que los usuarios cierren sesión).
- [ ] Si el downgrade deja al tenant por encima de sus límites, se aplica el nuevo plan sin eliminar datos, pero se bloquea la creación de nuevos recursos hasta que el tenant reduzca su uso.
- [ ] Solo el rol `superadmin` puede ejecutar esta acción.
- [ ] La operación queda registrada en un log de auditoría con: `tenant_id`, `plan_anterior`, `plan_nuevo`, `timestamp` y `superadmin_id`.

---

## 6. Restricciones de Usuario

Las siguientes restricciones aplican de forma transversal a todos los actores del sistema:

| ID | Restricción |
|---|---|
| **RU-01** | Todo usuario debe autenticarse antes de acceder a cualquier recurso del sistema. Las rutas no autenticadas retornan HTTP 401. |
| **RU-02** | Un `Empleado` que intente acceder a un recurso exclusivo del `Administrador del Negocio` recibe HTTP 403; nunca se revela la existencia del recurso. |
| **RU-03** | Un `Administrador del Negocio` que intente acceder a un endpoint del `Super-Administrador` recibe HTTP 403. |
| **RU-04** | Ningún usuario puede acceder, visualizar ni modificar datos de un tenant diferente al que está registrado su cuenta, independientemente del rol. |
| **RU-05** | Las sesiones tienen un tiempo de expiración. El usuario debe volver a autenticarse cuando su token JWT expire. |
| **RU-06** | El sistema no permite la operación de ventas si el stock del producto solicitado es insuficiente, sin excepción. |
| **RU-07** | Ningún usuario puede modificar el stock de un producto directamente; el stock solo se modifica como consecuencia del registro de una venta. |
| **RU-08** | Los usuarios de un tenant suspendido no pueden acceder al sistema, aunque tengan un token JWT vigente. El sistema verifica el estado del tenant en cada solicitud. |
| **RU-09** | Los límites de uso (productos, usuarios) impuestos por el plan de suscripción del tenant son verificados en tiempo real en cada operación de creación. Superar el límite retorna HTTP 403 con mensaje descriptivo del plan. |

---

*Documento elaborado siguiendo la técnica de Historias de Usuario, adaptado al contexto multi-tenant del proyecto FastInventory SaaS.*  
*Versión 2.0 — 10/04/2026. Refactorización del documento v1.0 para el modelo SaaS multi-tenant.*
