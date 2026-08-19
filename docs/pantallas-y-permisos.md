# Equivalencia entre pantallas y permisos

**Proyecto:** Flutt-Water
**Roles oficiales:** `admin`, `vendedor`, `repartidor`
**Alias de compatibilidad:** `usuario` equivale a `vendedor` y no debe volver a utilizarse para altas nuevas.

## Criterio de diseño

La aplicación no debe entregar una colección de interruptores independientes para construir combinaciones ambiguas de pantallas. La navegación se determina por rol y las reglas de Firestore validan la operación. Por ello se distinguen tres conceptos: **pantalla visible**, **acción funcional dentro de la pantalla** y **autorización de datos**. Que un usuario pueda seleccionar un producto desde una venta no significa que pueda administrar el catálogo; que pueda leer un cliente de su cartera no significa que pueda editar su ficha general.

> **Principio:** el frontend reduce exposición accidental; Firestore impide operaciones no autorizadas. Ambas capas deben expresar la misma matriz.

## Matriz de pantallas

| Pantalla interna | Admin | Vendedor | Repartidor | Etiqueta vendedor | Etiqueta repartidor | Alcance funcional |
|---|---:|---:|---:|---|---|---|
| `home` | Sí | Sí | Sí | Planta | Mi jornada | Inicio contextual y pendientes propios. |
| `productos` | Sí | No | No | — | — | Catálogo, SKU, precios, unidades y presentaciones. |
| `barcodes` | Sí | No | No | — | — | Crear, imprimir y resolver códigos de barras ligados a SKU. |
| `nota` | Sí | Sí | Sí | Venta de planta | Ventas y pedidos | Admin: venta directa; vendedor: ticket público; repartidor: venta/pedido ligado a jornada. |
| `clientes` | Sí | Sí | Sí | Clientes generales | Mi cartera | Admin: gestión general; vendedor: consulta del catálogo completo y cobro; repartidor: catálogo completo con zona prioritaria primero, QR y alta en campo. |
| `creditos` | Sí | Sí | Sí | Cobro de créditos | Cobro de mi cartera | Admin: gestión global; vendedor: cobro de cualquier crédito; repartidor: cobro solo de créditos propios autorizados. |
| `ruta` | Sí | No | Sí | — | Jornada | Admin: supervisión/configuración según módulo; repartidor: jornada propia y lecturas. |
| `vehiculos` | Sí | No | Sí | — | Mi vehículo | Admin: alta y configuración; repartidor: consulta operativa del vehículo asignado. |
| `repartidores` | Sí | No | Sí | — | Venta QR | Admin: distribución global; repartidor: solo QR, cliente y venta propia, sin vista global. |
| `inventario` | Sí | No | No | — | — | Inventario administrativo, movimientos, saldos y conciliación. |
| `reportes` | Sí | No | No | — | — | Reportes globales y exportaciones. No incluye datos GPS. |
| `gerencia` | Sí | Sí | Sí | Mi caja | Mi caja | Admin: consolidado; vendedor/repartidor: movimientos y cierre propios. |
| `config` | Sí | No como módulo | No como módulo | — | — | Configuración inicial, branding, usuarios, vehículos, medidores y parámetros; exclusiva de admin. |

## Matriz CRUD por dominio

| Dominio o colección | Admin | Vendedor | Repartidor | Inmutabilidad o condición |
|---|---|---|---|---|
| Productos y precios | Crear, leer, actualizar y administrar | Leer solo dentro de venta | Leer solo dentro de venta | Los cambios de catálogo son administrativos; cada SKU conserva su presentación y precio. |
| Inventario | Ajustar y conciliar | Descuento atómico desde ticket de planta | Descuento atómico desde transferencia/venta válida | No se permiten ajustes manuales de vendedor o repartidor. |
| Ticket de planta | Crear venta directa o supervisar | Crear `planta_publico_general` | No permitido | Cliente `publico_general`, sin transferencia, sin vehículo y sin crédito. |
| Venta de reparto | Supervisar y conciliar | No permitido | Crear venta `rapida_repartidor` | Requiere transferencia/jornada activa propia y cliente QR. |
| Clientes | Alta, edición, asignación, desactivación aprobada | Lectura del catálogo general; creación/aseguramiento de `publico_general` | Lectura del catálogo general, QR, alta en campo y asignación a zona propia | No borrar; vendedor no edita fichas y repartidor no edita nombre, teléfono, localidad, QR ni estado. La zona no bloquea ventas. |
| Rutas/carteras | Crear, asignar y supervisar | No | Operar solo asignadas | Ruta es cartera/grupo; jornada puede repetirse durante el día. |
| Vehículos/medidores | Alta, asignación y parámetros | Consulta de unidad de planta asignada | Consulta del vehículo asignado | El núcleo de medidor es compartido; `tipoUnidad` separa `planta` y `vehiculo`. |
| Créditos | Gestión global | Registrar abonos autorizados | Registrar abonos de cartera autorizada | El abono se crea pendiente en `creditos/{id}/abonos`; admin concilia y el crédito se marca liquidado sin borrar historial. |
| Caja y cierres | Consolidar y supervisar | Propia | Propia | El efectivo de abonos se separa de ventas del medidor y queda pendiente de validación hasta el cierre administrativo. |
| Reportes y CSV | Sí | No | No | Se elimina información GPS de filas, columnas y subpestañas. |
| Usuarios y configuración | Exclusivo | No | No | Alta desde consola o flujo administrativo autorizado; sin registro público. |

## Acciones especiales por rol

### Administrador

El administrador puede acceder a todas las pantallas y administrar la configuración del proyecto. Esto incluye branding, usuarios, roles, productos, precios, inventario, rutas o carteras, vehículos, medidores, reportes, cierres e incidencias. Aunque puede supervisar operaciones ajenas, los registros inmutables no deben editarse ni eliminarse; la corrección se representa mediante una nueva operación o una incidencia autorizada.

### Vendedor

El vendedor opera una unidad estacionaria de planta asociada a un medidor. Su acción principal es **Venta de planta**, cuyo cliente es siempre **Público general**. Puede consultar el catálogo general y registrar abonos de cualquier cliente, pero no cambia fichas, no usa QR, no consulta inventario administrativo, no crea productos y no descarga reportes. La venta debe guardar `responsableTipo: vendedor`, `medioOperacion: planta`, `tipoVenta: planta_publico_general` y `unidadOperativaTipo: planta` cuando intervenga el medidor.

### Repartidor

El repartidor opera una zona prioritaria, un vehículo con medidor y una jornada. Puede abrir la venta mediante QR, registrar clientes nuevos, capturar ventas y abonos de sus créditos autorizados, consultar su vehículo y solicitar el cierre de su jornada. Puede leer el catálogo general, pero no edita fichas existentes, no ajusta inventario, no administra productos, no ve reportes y no utiliza GPS o mapas.

## Identificadores y reglas de navegación

La tabla siguiente conecta los identificadores usados por la interfaz con la decisión de navegación. `rolEfectivo()` convierte el perfil heredado `usuario` en `vendedor`; `permisoTabs()` aplica el conjunto oficial; `permisoEdita()` limita la edición de productos, clientes y créditos; `permisoAcciones()` deja cámara/QR solo en repartidor y CSV solo en admin.

| Función | Admin | Vendedor | Repartidor |
|---|---|---|---|
| `permisoTabs().nota` | `true` | `true` | `true` |
| `permisoTabs().clientes` | `true` | `true` | `true` |
| `permisoTabs().creditos` | `true` | `true` | `true` |
| `permisoTabs().ruta` | `true` | `false` | `true` |
| `permisoTabs().vehiculos` | `true` | `false` | `true` |
| `permisoTabs().repartidores` | `true` | `false` | `true`, restringido a QR/operación propia |
| `permisoTabs().inventario` | `true` | `false` | `false` |
| `permisoTabs().reportes` | `true` | `false` | `false` |
| `permisoAcciones().camara` | `true` | `false` | `true` |
| `permisoAcciones().csv` | `true` | `false` | `false` |
| `permisoEdita().productos` | `true` | `false` | `false` |
| `permisoEdita().clientes` | `true` | `false` | `false` |
| `permisoEdita().creditos` | `true` | `true` | `true` |

## Privacidad y datos retirados

La retirada de privacidad es transversal. No deben aparecer botones, pestañas, campos de formulario, columnas Excel, cálculos, permisos, listeners ni cachés de GPS o mapas. Esto incluye `ubicacionVenta`, `ubicacionActual`, `navigator.geolocation`, seguimiento en vivo, mapa Leaflet, teselas OpenStreetMap, radio de visita y la pestaña administrativa **Ubicación**. El QR es el único mecanismo de identificación del cliente para el repartidor.

## Fuentes internas

La matriz se mantiene sincronizada con [`sesion.js`](../sesion.js), [`app.js`](../app.js), [`dashboard.js`](../dashboard.js), [`pedidos.js`](../pedidos.js), [`rutas-repartidores.js`](../rutas-repartidores.js), [`clientes.js`](../clientes.js), [`reportes.js`](../reportes.js), [`ventas-offline.js`](../ventas-offline.js), [`firestore.rules`](../firestore.rules) y [`sw.js`](../sw.js).
