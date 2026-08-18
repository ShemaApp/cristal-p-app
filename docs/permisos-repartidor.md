# Permisos habilitados del repartidor

**Proyecto:** Flutt-Water
**Rol oficial:** `repartidor`
**Identificación de cliente:** exclusivamente QR; GPS y mapas están retirados por privacidad.

## Propósito operativo

El repartidor trabaja con una cartera de clientes asignada por administración y con jornadas flexibles. En este modelo, **ruta** conserva el significado operativo de grupo o cartera de clientes y **jornada** representa el periodo de trabajo o una transferencia activa del día. Puede existir más de una jornada en el mismo día cuando el repartidor termina una salida y posteriormente inicia otra.

El repartidor puede utilizar un vehículo disponible. El medidor pertenece al vehículo y conserva su identidad aunque cambie el repartidor. Las lecturas inicial y final, las ventas y el cierre de caja se relacionan con la jornada, el vehículo, el medidor y el usuario que captura la operación.

## Navegación habilitada

| Identificador interno | Nombre visible para el repartidor | Acceso | Uso permitido |
|---|---|---:|---|
| `home` | **Mi jornada** | Sí | Resumen personal, pendientes offline y accesos rápidos operativos. |
| `nota` | **Ventas y pedidos** | Sí | Consultar pedidos propios y registrar ventas vinculadas a una jornada o transferencia activa. |
| `clientes` | **Mi cartera** | Sí | Consultar clientes asignados, buscar por filtro y usar identificación QR. |
| `creditos` | **Cobro de mi cartera** | Sí | Consultar y registrar abonos de créditos permitidos dentro de su cartera. |
| `ruta` | **Jornada** | Sí | Iniciar, consultar y cerrar sus jornadas o transferencias asignadas; registrar lecturas y ventas operativas. |
| `vehiculos` | **Mi vehículo** | Sí | Consultar el vehículo asignado y sus datos operativos necesarios; no administrar el catálogo de vehículos. |
| `repartidores` | **Venta QR** | Sí | Escanear QR, resolver el cliente y abrir la venta rápida asociada a la jornada activa. No es una vista global de Distribución. |
| `gerencia` | **Mi caja** | Sí | Consultar y registrar movimientos o cierre de caja propios. |
| `productos` | Productos | No | El repartidor selecciona productos dentro de una venta, pero no administra el catálogo. |
| `barcodes` | Etiquetas | No | No crea ni administra códigos de barras. |
| `inventario` | Inventario | No | No ajusta existencias ni consulta el inventario global. |
| `reportes` | Reportes | No | No consulta reportes globales ni descarga CSV. |

La interfaz puede mostrar solamente los componentes de operación del repartidor. No debe mostrar controles administrativos, clientes de otros repartidores, transferencias de terceros, inventario global, reportes ni configuración de usuarios.

## Acciones y permisos CRUD

| Recurso | Lectura | Creación | Actualización | Eliminación | Condición principal |
|---|---:|---:|---:|---:|---|
| Clientes asignados | Sí | Sí, en campo | Solo asignación permitida | No | El alta debe incluir QR, teléfono y pertenencia a una ruta autorizada. La ficha existente es de solo lectura para nombre, teléfono, localidad, QR y estado. |
| Venta QR / nota | Propias | Sí | No | No | Requiere jornada o transferencia activa del repartidor autenticado y cliente resuelto por QR. |
| Pedidos propios | Sí | Sí, si se asignan al propio repartidor | Solo transiciones operativas autorizadas | No | No puede reasignar, borrar ni editar pedidos históricos. |
| Créditos y abonos de cartera | Sí, según alcance | Abonos permitidos | Según flujo de abono | No | Los movimientos históricos son inmutables y quedan ligados al capturador. |
| Rutas o transferencias propias | Sí | Operación propia cuando corresponda | Venta, solicitud de cierre y campos operativos permitidos | No | Nunca puede consultar o modificar la jornada de otro repartidor. |
| Productos | Lectura funcional dentro de la venta | No | Descuento transaccional de transferencia | No | La carga o descuento debe estar respaldado por una operación válida; no hay ajustes manuales. |
| Devoluciones | Sí según operación | Sí, propia | No, salvo autorización administrativa | No | Debe quedar asociada a la operación y al usuario autenticado. |
| Vehículo y medidor | Consulta | No | No | No | El vehículo y su medidor fijo son configurados por administración. |
| Caja y cierres | Propios | Sí | Solo cierre de jornada abierta | No | Un cierre capturado no se corrige; se genera una incidencia o un nuevo registro autorizado. |

## Flujo de identificación QR y venta

El repartidor abre **Venta QR** y escanea el código del cliente. El QR solo resuelve una identidad almacenada en Firebase; no representa coordenadas, no inicia seguimiento y no valida una distancia. Si el cliente no existe, el repartidor puede crear uno nuevo durante el trabajo de campo siempre que la operación incluya la información requerida y quede asociado a su cartera autorizada.

Después de resolver el cliente, el repartidor selecciona productos y cantidades. Las piezas y paquetes se capturan como enteros; los SKU a granel admiten decimales. La venta se registra con `tipoVenta: rapida_repartidor`, el identificador de jornada o transferencia, el UID y nombre del repartidor y la identificación `qr`. La nota es inmutable y su modificación o eliminación está prohibida.

> **Regla de separación:** el repartidor nunca utiliza el flujo de **Venta pública de planta**. Esa operación es exclusiva del vendedor y usa el cliente `Público general`, sin ruta, vehículo o transferencia de reparto.

## Cartera y cambios de cliente

El repartidor puede buscar y agregar a su ruta un cliente existente de la lista general cuando la operación lo permita. Puede crear un cliente nuevo en campo y asociarle un QR. No puede cambiar el nombre, teléfono, localidad, QR o estado de un cliente existente ni convertir una visita en una modificación silenciosa de la ficha general.

La desactivación requiere devolución de envases y base prestados. La solicitud debe quedar pendiente de autorización administrativa; si administración rechaza la solicitud, el motivo es obligatorio. El repartidor no puede eliminar físicamente el registro del cliente ni omitir la evidencia de devolución.

## Jornada, lecturas y caja

La lectura inicial se captura al abrir la jornada y se compara con el cierre anterior del mismo vehículo o medidor. Una diferencia dentro del margen configurado puede continuar; una diferencia mayor no bloquea automáticamente el inicio, pero exige motivo. Las lecturas y cierres son inmutables. El medidor es propiedad operativa del vehículo, no del catálogo de productos y no se modifica desde la venta.

Las ventas offline pueden almacenarse localmente y sincronizarse cuando exista conexión. Al sincronizar, la aplicación debe conservar el orden de la operación, detectar faltantes de inventario y marcar incidencias para el cierre. El modo offline no autoriza editar ni borrar una venta ya capturada.

## Seguridad y privacidad

El frontend fuerza las pestañas mediante `rolEfectivo()` y `permisoTabs()`, pero la frontera real se implementa en [`firestore.rules`](../firestore.rules). Las consultas deben filtrar por el UID del repartidor o por las rutas explícitamente asignadas. Las reglas y consultas no deben utilizar GPS, `ubicacionActual`, mapas Leaflet, teselas OpenStreetMap ni validaciones por distancia.

Las únicas acciones especiales del rol son la cámara QR y la operación de su propia cartera. CSV, reportes, administración de productos, altas de vehículos, configuración inicial, usuarios, branding, asignación de rutas y aprobación de desactivaciones pertenecen a administración.

## Referencias internas

La matriz se implementa principalmente en [`sesion.js`](../sesion.js), [`app.js`](../app.js), [`rutas-repartidores.js`](../rutas-repartidores.js), [`ruta.js`](../ruta.js), [`clientes.js`](../clientes.js), [`ventas-offline.js`](../ventas-offline.js) y [`firestore.rules`](../firestore.rules).
