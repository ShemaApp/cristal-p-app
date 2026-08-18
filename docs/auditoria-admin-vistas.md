# Auditoría visual de pantallas — perfil admin

## Sesión

La sesión administrativa quedó autenticada correctamente en `http://localhost:4173/`. El perfil muestra el nombre **Jared** y la marca comercial visible **Cristal Plus**.

## Inicio observado

La pantalla inicial actual es **Inicio** y contiene:

- Resumen operativo del día.
- Ventas de hoy.
- Ingresos de hoy.
- Clientes registrados.
- Créditos pendientes.
- Acciones rápidas: Nuevo pedido, Venta rápida, Clientes y QR, Cobrar crédito, Jornadas y Revisar inventario.
- Barra lateral con: Inicio, Productos, Etiquetas, Pedidos, Clientes, Créditos, Jornada, Vehículos, Distribución, Inventario, Reportes y Gerencia.

## Hallazgo preliminar

Para un administrador, Inicio funciona como tablero general, pero combina indicadores globales con accesos operativos de repartidor y almacén. La futura separación debe conservar el resumen global y permitir supervisar esas operaciones, pero los accesos rápidos deberían agruparse por área: Catálogo/Inventario, Reparto/Jornadas, Clientes/Créditos y Finanzas.

No se ha modificado código durante esta auditoría.

## Productos observado

La pantalla muestra el título **Productos**, botones **Historial** y **+ Nuevo**, un buscador y una tarjeta de SKU. El menú contextual del SKU contiene **Editar**, **Precios**, **Etiqueta**, **Seleccionar** y **Eliminar**.

### Clasificación recomendada

| Función | Tratamiento |
|---|---|
| Crear y editar SKU | Exclusivo de admin |
| Activar/desactivar precios | Exclusivo de admin |
| Generar/imprimir etiquetas | Exclusivo de admin |
| Historial de inventario desde el catálogo | Exclusivo de admin |
| Seleccionar un SKU para vender | Debe vivir dentro de Pedidos, Jornada o Planta; no requiere mostrar la pantalla Productos |
| Eliminar | No recomendado; debe utilizarse baja lógica para conservar historial |
| Buscar productos | Admin puede hacerlo aquí; usuario/repartidor/vendedor solo deben consultar SKUs activos dentro de su flujo operativo |

El menú actual ya agrupa correctamente las acciones del SKU, pero toda la pantalla debe considerarse administrativa.

No se ha modificado código durante esta auditoría.

## Etiquetas observado

La pantalla se identifica como **Etiquetas — Gestión autorizada**. Permite buscar producto o código, seleccionar un producto, definir cantidad, obtener vista previa e imprimir. La propia descripción indica que genera códigos Code 128 internos enlazados a Productos o imprime códigos externos.

### Clasificación recomendada

Esta pantalla debe quedar exclusivamente para **admin** porque cambia o imprime identificadores del catálogo y puede generar etiquetas masivas. Los roles operativos solo deben escanear códigos dentro de Venta, Jornada o Planta; no necesitan acceder a la pantalla administrativa de Etiquetas.

## Pedidos observado

La pantalla muestra el texto de que un pedido no descuenta inventario ni genera crédito, un bloque **Nuevo pedido**, selección de cliente existente o nuevo, búsqueda de clientes, selección de productos, cantidades, pago previsto y un bloque **Pedidos registrados** con filtros: Abiertos, Pend. transferencia, En transferencia, Borradores y Todos.

### Clasificación recomendada

| Función | Tratamiento |
|---|---|
| Crear pedido para reparto | Admin; el repartidor podría crear uno propio si el flujo se mantiene, pero no necesita una pantalla administrativa completa |
| Asignar pedido a repartidor | Exclusivo de admin |
| Confirmar transferencia y entregar | Repartidor dentro de Jornada |
| Consultar estados globales | Admin |
| Consultar pedidos asignados propios | Repartidor, integrado en Mi Jornada |
| Crear cliente desde pedido | Debe conservarse en el flujo operativo autorizado, pero no convertir al usuario en administrador de Clientes |

La pantalla actual es principalmente administrativa por la asignación. Conviene separar **Pedidos administrativos** de **Pedidos asignados** dentro de Jornada.

## Clientes observado

La pantalla de admin muestra **Escanear QR**, **+ Nuevo**, un bloque de **Configuración comercial** con **Nueva localidad** y **Nueva ruta**, filtros avanzados y la lista agrupada por localidad. Cada tarjeta muestra estado de crédito, GPS, teléfono/localidad, miniatura QR, botón de acciones y, cuando aplica, **Capturar ubicación**.

### Clasificación recomendada

| Función | Tratamiento |
|---|---|
| Ver todos los clientes y filtros globales | Admin |
| Crear cliente nuevo | Admin; también flujo operativo controlado para usuario/repartidor, pero no como acceso a la administración global |
| Editar datos maestros | Exclusivo de admin |
| Crear localidad | Exclusivo de admin |
| Crear/asignar ruta o cartera | Exclusivo de admin |
| Agregar cliente disponible a cartera propia | Repartidor, desde Mi Cartera |
| Escanear QR y abrir ticket | Repartidor; usuario/planta solo si el flujo lo requiere |
| Capturar ubicación de cliente | Admin; repartidor solo en su cartera y como acción operativa |
| Autorizar/rechazar desactivación | Exclusivo de admin |
| Solicitar desactivación con devoluciones | Repartidor |

La pantalla actual reúne administración comercial y operación de campo. Debe dividirse en **Clientes administrativos** y **Mi Cartera**, manteniendo el mismo registro pero con diferentes acciones y alcance.

## Créditos observado

La pantalla admin muestra un resumen con **Total pendiente**, número de cuentas y estado **Sin créditos pendientes**. En esta sesión no había créditos con acciones visibles.

### Clasificación recomendada

| Función | Tratamiento |
|---|---|
| Ver cartera global y saldos consolidados | Admin |
| Registrar abono | Debe estar disponible en un flujo operativo de usuario/repartidor o planta, limitado a cliente y caja propios |
| Corregir o eliminar abono | No debe ser eliminación libre; usar corrección auditada o movimiento compensatorio |
| Consultar crédito propio de cartera/planta | Repartidor/usuario según centro operativo |
| Exportar o conciliar créditos globales | Exclusivo de admin |

La pantalla actual funciona como resumen administrativo. El cobro operativo debería aparecer como acción dentro de Clientes, Venta o Caja, no obligar a cada rol a abrir una pantalla global de Créditos.

## Jornada observado

La pantalla titulada **Transferencias de almacén** contiene **Crear transferencia de almacén**, responsable, **Confirmar asignación**, **Cancelar**, **Escanear producto** y **Agregar manualmente**. El texto explica que la transferencia queda asignada a un responsable y que las ventas de distribución consumen el saldo transferido.

### Clasificación recomendada

| Función | Tratamiento |
|---|---|
| Crear y asignar transferencia desde almacén | Exclusivo de admin o almacén administrativo |
| Escanear/agregar productos para la carga | Admin; repartidor solo si prepara su propia carga conforme al flujo aprobado |
| Confirmar recepción de carga | Repartidor, dentro de Mi Jornada |
| Registrar lectura inicial, recarga, venta medida y cierre | Repartidor, dentro de Mi Jornada |
| Conciliar devoluciones o mermas | Exclusivo de admin |
| Consultar jornadas globales | Admin |

**Hallazgo importante:** la pestaña actual llamada Jornada todavía muestra principalmente transferencias de almacén. Debe dividirse en una pantalla administrativa de **Cargas/Transferencias** y una pantalla operativa de **Mi Jornada** para el repartidor.

## Vehículos observado

La pantalla se presenta como **Libros operativos** con la descripción **Vehículos, medidores, jornadas y lecturas inmutables**. Contiene un selector **Vehículo / medidor** que actualmente no muestra opciones en la sesión admin.

### Clasificación recomendada

| Función | Tratamiento |
|---|---|
| Alta, edición y configuración de vehículo | Exclusivo de admin, dentro de Configuración |
| Alta y configuración del medidor | Exclusivo de admin, dentro de Configuración |
| Seleccionar vehículo y consultar libro | Admin global; repartidor solo vehículo y jornada asignados |
| Iniciar jornada, capturar lectura, recargar y cerrar | Repartidor para su jornada; admin para supervisión |
| Editar lecturas o cierres | Nadie; registros inmutables |
| Exportar libro completo | Exclusivo de admin |

La pantalla actual mezcla consulta de libros y operación de jornada. Se recomienda conservarla para consulta administrativa y mover la operación diaria del repartidor a **Mi Jornada**.

## Distribución observado

La pantalla se titula **Repartidores y rutas** y contiene pestañas internas **Activas**, **Mapa**, **Clientes**, **Comprob.** e **Historial**. En esta sesión no había transferencias activas.

### Clasificación recomendada

| Función | Tratamiento |
|---|---|
| Ver transferencias activas de todos | Admin |
| Mapa y GPS de todos los repartidores | Admin |
| Clientes asociados a distribución | Admin; repartidor solo su cartera |
| Comprobantes y guías | Admin global; repartidor solo sus propias guías |
| Historial de jornadas/transferencias | Admin global; repartidor solo propio |
| Registrar venta rápida, GPS y cierre de ruta | Repartidor, dentro de su operación |
| Exportar historial o comprobantes masivos | Exclusivo de admin |

La pantalla actual es de supervisión administrativa, aunque concentra acciones del repartidor. Debe conservarse para admin como **Supervisión de distribución** y extraer la operación de campo a **Mi Jornada** y **Mi Cartera**.

## Inventario observado

La pantalla muestra tres pestañas: **Conteo físico**, **Fabricación** y **↩ Devoluciones**. El conteo físico explica que se captura la cantidad real de bodega y que solo se guardan los productos cuyo número cambió, dejando historial en Productos. Se observa buscador de producto y cantidad física.

### Clasificación recomendada

| Función | Tratamiento |
|---|---|
| Conteo físico de bodega | Exclusivo de admin/almacén autorizado |
| Fabricación y entrada de stock | Exclusivo de admin/almacén |
| Recepción de devoluciones y conciliación de merma | Exclusivo de admin |
| Ver alertas o existencias operativas | Admin; usuario/repartidor solo indicadores necesarios para vender |
| Consumo de inventario por venta | Automático dentro de venta, sin acceso a ajuste libre |
| Llenado de planta y conversión de vacíos a llenos | Futuro vendedor, mediante `llenados_planta` y movimientos inmutables, no mediante esta pantalla |

La pestaña Inventario debe quedar administrativa. La operación de planta necesita una pantalla propia de **Llenados** para no otorgar al vendedor un permiso general de ajuste de stock.

## Reportes observado

La pantalla muestra las pestañas **Respaldo**, **Ubicación**, **Reporte de ventas** y **Exportar**. La vista inicial ofrece **Respaldo completo**, describe la descarga de productos, clientes, ventas, créditos, rutas, devoluciones e historial de inventario, muestra la fecha del último respaldo y el botón **Generar y descargar respaldo**.

### Clasificación recomendada

Toda la pantalla debe quedar exclusivamente para **admin**. Incluye datos masivos de clientes, ventas, créditos, rutas e inventario, además de respaldos y exportaciones. Repartidor y usuario no deben ver esta pestaña; para ellos solo puede existir **Mi Historial**, filtrado por su propio alcance y sin exportación masiva.

## Gerencia observado

La pantalla muestra **Tu caja de hoy** con venta en efectivo, abonos en efectivo, fórmula base, gastos y efectivo a entregar; botón **Cerrar caja de hoy**; formulario **Registrar gasto** con pagado a, monto, motivo y forma de pago; filtros de reporte **Semana**, **Mes** y **Todo**; historial de cierres y todos los gastos.

### Clasificación recomendada

| Función | Tratamiento |
|---|---|
| Cierre de caja global y conciliación | Exclusivo de admin |
| Cierre de caja propia | Usuario/repartidor/vendedor, si se separa por jornada o planta |
| Registrar gasto propio | Puede ser operativo con límites y caja/centro asociado |
| Editar/eliminar gasto | Admin mediante corrección auditada; no borrado libre |
| Reporte de caja por persona | Admin global; usuario operativo solo su caja |
| Historial de cierres global | Admin |

La pantalla actual se llama Gerencia, pero contiene tanto control administrativo como caja operativa. Debe dividirse en **Gerencia administrativa** y **Mi Caja**.

## Configuración observado

Configuración contiene las pestañas **Perfil**, **Marca**, **Contraseña**, **PIN**, **Usuarios**, **Vehículos** y **Permisos**. La vista inicial muestra nombre, correo, rol admin y **Cerrar sesión**.

### Clasificación recomendada

| Sección | Tratamiento |
|---|---|
| Perfil propio | Visible para todos, con edición limitada a datos personales permitidos |
| Marca | Exclusivo de admin |
| Contraseña/PIN propios | Visible para todos; solo afectan la cuenta o dispositivo propio |
| Usuarios | Exclusivo de admin |
| Vehículos y medidores | Exclusivo de admin para alta/configuración; consulta operativa separada para repartidor |
| Permisos | Debe eliminarse como matriz de toggles por persona en el modelo final; durante diagnóstico puede quedar visible solo para admin |
| Cerrar sesión | Visible para todos |

Configuración es la frontera administrativa principal y no debe aparecer en la navegación normal de usuario o repartidor, salvo Perfil, Contraseña, PIN y Cerrar sesión mediante un menú de cuenta.

## Usuarios observado

La pestaña indica que las cuentas nuevas se crean desde Firebase Console y que dentro de la PWA solo se editan perfiles y roles. Se observan perfiles `admin` y `repartidor`, con menú contextual para **Editar** y **Eliminar**; la propia cuenta admin no muestra eliminar.

### Clasificación recomendada

| Función | Tratamiento |
|---|---|
| Crear cuenta Authentication | Exclusivo de Firebase Console o backend administrativo seguro; no desde la PWA |
| Crear perfil operativo | Flujo administrativo controlado |
| Editar nombre, estado, rol y alcances | Exclusivo de admin |
| Eliminar perfil | Exclusivo de admin y nunca el propio |
| Cambiar contraseña propia | Cada usuario desde su cuenta |
| Asignar repartidor a ruta/vehículo o vendedor a planta | Exclusivo de admin |

El listado actual confirma que `usuario` sigue siendo necesario temporalmente para diagnóstico; no se debe introducir todavía `vendedor` en esta fase si el usuario va a probar ese rol como usuario de planta.

## Permisos observado

La pantalla describe toggles por persona para **Ver pantalla**, **Editar formulario** y **Otras acciones**. Indica que el repartidor mantiene capacidades operativas, pero bloquea Productos, Inventario, Reportes y CSV; también explica que parte de estos permisos se refleja en `firestore.rules`.

### Clasificación recomendada

Esta pantalla debe quedar exclusivamente para **admin** durante el diagnóstico. No se recomienda conservarla como matriz libre de toggles en producción. Su función temporal será ayudar a observar qué combinaciones existen; después debe sustituirse por una matriz fija por rol y por alcance operativo.

La limpieza propuesta no consiste en abrir botones sin criterio, sino en retirar las combinaciones heredadas que permiten: ver una pantalla sin poder ejecutar el flujo que la necesita, editar un formulario sin tener el alcance de datos correspondiente o habilitar una función administrativa a un rol operativo.

## Vehículos autorizados observado

Dentro de Configuración aparece **Vehículos autorizados**, con la descripción de que cada unidad conserva su medidor fijo y factor de conversión. Tiene el botón **＋ Alta** y muestra que no hay vehículos registrados.

### Clasificación recomendada

El alta, edición y eventual desactivación de vehículos y medidores debe ser exclusivamente de admin. El repartidor debe elegir un vehículo autorizado dentro de su jornada, pero no crear ni modificar su medidor, factor de conversión o precios.

# Mapa propuesto de pantallas por rol

## Matriz de destino

| Pantalla actual | Qué hace hoy | Admin | Usuario de planta | Repartidor | Nombre recomendado |
|---|---|---:|---:|---:|---|
| Inicio | Resumen global y accesos rápidos | Sí, completo | Resumen de planta | Resumen de jornada | Dashboard según centro |
| Productos | Catálogo, SKU, precios, stock e historial | Sí | No visible | No visible | Catálogo administrativo |
| Etiquetas | Generación Code 128 e impresión | Sí | No | No | Etiquetas administrativas |
| Pedidos | Crear pedidos, asignar y consultar estados | Sí | No | Solo pedidos propios dentro de Jornada | Pedidos administrativos / Pedidos asignados |
| Clientes | Clientes globales, QR, localidades, rutas y acciones | Sí | Solo clientes operables de planta | Mi cartera asignada | Clientes globales / Mi cartera / Clientes de planta |
| Créditos | Resumen global y abonos | Sí | Abonos de clientes de planta | Abonos de su cartera | Crédito global / Cobro operativo |
| Jornada | Actualmente transferencia de almacén | Cargas y conciliación | No | Mi jornada, lectura, ventas y cierre | Cargas administrativas / Mi Jornada |
| Vehículos | Libro de vehículos, medidores, jornadas y lecturas | Consulta global | No | Vehículo y jornada asignados | Libros operativos / Mi vehículo |
| Distribución | Todas las rutas, mapas, clientes, comprobantes e historial | Sí | No | Solo su operación | Supervisión de distribución |
| Inventario | Conteo, fabricación y devoluciones | Sí | No; usar Llenados | No | Inventario administrativo |
| Reportes | Respaldo, ubicación, ventas y exportaciones masivas | Sí | No | No | Reportes y respaldo |
| Gerencia | Caja, gastos, cierres y reportes por persona | Global | Mi caja de planta | Mi caja de jornada | Gerencia / Mi caja |
| Configuración | Perfil, marca, contraseña, PIN, usuarios, vehículos y permisos | Sí | Solo cuenta propia | Solo cuenta propia | Administración / Cuenta |

## Pantallas más adecuadas para cada rol

### Admin

La navegación inicial recomendada es **Dashboard administrativo**. Debe mostrar indicadores globales, alertas, jornadas pendientes, inventario crítico, créditos, cajas y accesos a Configuración, Catálogo, Inventario, Distribución y Reportes.

El admin debe conservar acceso a todas las pantallas, pero no necesita que todas las funciones aparezcan mezcladas en Inicio. Las acciones globales de aprobar, asignar, conciliar, exportar, configurar o editar datos maestros deben permanecer claramente identificadas.

### Usuario

Durante esta etapa `usuario` funcionará como el rol de **planta/punto de venta** para diagnóstico. Su pantalla inicial ideal es **Planta** o **Venta de planta**, aunque esa pantalla todavía no está implementada como módulo independiente.

Mientras exista la pantalla actual, no conviene mostrarle Productos, Etiquetas, Inventario administrativo, Reportes, Distribución, Vehículos ni Configuración. El flujo que debe construirse para este rol es: Venta en planta, Llenados, Clientes de planta, Cobro de crédito, Mi caja y Mi historial.

### Repartidor

La pantalla inicial ideal es **Mi Jornada**. Desde ahí debe iniciar o continuar jornada, seleccionar vehículo autorizado, capturar lectura, confirmar carga, registrar recargas/ventas, escanear QR, consultar pedidos propios y cerrar jornada.

Su segundo acceso principal debe ser **Mi Cartera**, con clientes asignados, búsqueda, QR, alta de cliente en campo, solicitud de desactivación y consulta de crédito. No debe ver Configuración, Productos, Etiquetas, Inventario administrativo, Reportes, Distribución global ni usuarios.

## Funciones exclusivamente administrativas

Las siguientes funciones deben quedar solo para `admin`, incluso durante la apertura temporal de lectura:

1. Configuración inicial del proyecto, branding, medidores, unidades, precios y parámetros globales.
2. Administración de perfiles, roles, estado de cuentas, asignaciones y permisos temporales.
3. Alta, edición, desactivación de vehículos y configuración de medidores.
4. Catálogo de Productos, SKU, presentaciones, precios, códigos de barras y etiquetas.
5. Conteo físico, fabricación, ajuste de stock y recepción/conciliación de devoluciones.
6. Creación de localidades, rutas, carteras y asignación de repartidores.
7. Vista global de Distribución, mapas, GPS, comprobantes, historiales y exportaciones.
8. Aprobación o rechazo de desactivación de clientes, con motivo obligatorio cuando se rechaza.
9. Reportes globales, respaldos completos, Excel, CSV y exportaciones masivas.
10. Conciliación global de cajas, cierres de otras personas, gastos de terceros y reportes financieros consolidados.
11. Edición de datos maestros de clientes existentes.
12. Revisión global de jornadas, lecturas, transferencias, mermas, incidencias y cierres.

## Funciones operativas que no deben convertirse en administración

Los roles `usuario` y `repartidor` sí deben poder usar las funciones necesarias para trabajar, aunque no vean los módulos administrativos que las respaldan:

- Seleccionar productos activos dentro de una venta.
- Crear un cliente nuevo en su propio flujo.
- Consultar clientes dentro de su centro o cartera.
- Registrar ventas y pagos propios.
- Registrar abonos dentro de su alcance.
- Registrar gastos propios si se habilita esa operación.
- Consultar su historial.
- Usar cámara, QR y GPS cuando el flujo lo requiera.
- Recuperar borradores locales y cerrar su propia sesión.

## Modo de diagnóstico acordado

Durante la fase de diagnóstico, la lectura de Firestore podrá quedar abierta para cualquier usuario que haya iniciado sesión y tenga un perfil creado en Firestore desde una cuenta creada en Firebase Console. Esto significa **lectura autenticada**, no lectura pública: visitantes sin sesión seguirán fuera.

Esta apertura permitirá comparar las pantallas y datos de `admin`, `usuario` y `repartidor`, pero no debe considerarse configuración de producción porque expone información sensible como teléfonos, créditos, ventas, saldos, rutas y movimientos. Las escrituras, eliminaciones, transiciones de estado y registros inmutables deben conservar sus validaciones hasta que se apruebe la limpieza final.

## Siguiente paso

La auditoría visual del admin queda completa para las pantallas principales. Antes de modificar reglas o navegación, se debe revisar el perfil `usuario` y luego el perfil `repartidor` para comparar qué aparece realmente y qué botones deben trasladarse a sus flujos operativos.

# Auditoría visual — perfil vendedor

## Sesión y navegación

La cuenta autenticada muestra **Hola, Mariano** y el rol operativo se identifica por la navegación visible. El vendedor actualmente ve: **Inicio, Productos, Etiquetas, Pedidos, Clientes, Créditos, Inventario y Gerencia**. No aparecen Jornada, Vehículos, Distribución, Reportes ni Configuración.

## Inicio del vendedor observado

Inicio muestra Ventas de hoy, Ingresos de hoy, Clientes registrados y Créditos pendientes. Sus acciones rápidas actuales son **Nuevo pedido**, **Clientes y QR**, **Cobrar crédito** y **Revisar inventario**.

### Hallazgo preliminar

El vendedor ya tiene una navegación parcialmente limitada, pero todavía recibe pantallas administrativas como Productos, Etiquetas, Inventario y Gerencia. La futura pantalla inicial debería ser **Planta / Venta del día**, con ventas, llenados, clientes de planta, abonos, caja e historial propio. Los indicadores globales deben cambiar a indicadores del turno o planta actual.

No se ha modificado código durante esta auditoría.

## Productos desde vendedor

El vendedor puede abrir **Productos** y ve **+ Nuevo**, buscador y menú contextual con **Editar**, **Precios** y **Etiqueta**. No aparece Eliminar, pero sí conserva acciones de administración del catálogo.

### Hallazgo

Esta es una contaminación clara de la navegación del vendedor. El vendedor necesita seleccionar productos activos para vender, pero no debe abrir esta pantalla ni ver alta de SKU, precios, etiquetas o edición. El catálogo operativo debe presentarse dentro de Venta en planta como lista de SKUs activos, con precio vigente y stock disponible.

## Etiquetas desde vendedor

El vendedor también puede abrir Etiquetas y ve búsqueda de producto/código, cantidad, **Vista previa** e **Imprimir**.

### Hallazgo

Debe retirarse completamente de su navegación. La impresión y administración de identificadores de producto son funciones de admin; el vendedor solo debe escanear o seleccionar productos activos desde Venta en planta.

## Pedidos desde vendedor

El vendedor ve la misma pantalla de Pedidos que permite elegir cliente existente o nuevo, seleccionar productos, capturar cantidades, elegir pago previsto y consultar filtros de pedidos: Abiertos, Pendiente de transferencia, En transferencia, Borradores y Todos.

### Hallazgo

Este flujo no corresponde al vendedor de planta tal como está diseñado porque habla de transferencia de almacén y asignación a repartidor. El vendedor necesita una pantalla **Venta de planta** con pago real, cliente opcional, crédito, caja y llenados; no debe crear pedidos para distribución ni consultar estados de transferencia.

## Clientes desde vendedor

El vendedor ve **Clientes**, **Escanear QR**, buscador por nombre/teléfono/localidad y **Filtros avanzados**. En la sesión actual aparecen **0 clientes encontrados** y no se muestra **+ Nuevo**, **Nueva localidad** ni **Nueva ruta**.

### Hallazgo

La ocultación de creación y configuración es correcta, pero debe definirse el alcance de consulta. Para planta, el vendedor debería poder buscar clientes de planta o registrar un cliente nuevo desde Venta de planta/Clientes de planta; la pantalla global no debería mostrar clientes de rutas de repartidores. El QR debe abrir venta o abono solo cuando el cliente corresponda a la planta o al flujo autorizado.

## Créditos desde vendedor

El vendedor ve el resumen **Total pendiente**, número de cuentas y mensaje de ausencia de créditos pendientes. No aparecen acciones porque no existen saldos en la sesión.

### Hallazgo

La pantalla puede conservarse como resumen de **Créditos de planta**, pero el botón principal debe ser registrar abono para clientes vinculados a la planta o al turno propio. No debe mostrar créditos de repartidores ni permitir correcciones globales.

## Inventario desde vendedor

El vendedor puede abrir **Inventario** y ve **Conteo físico**, **Fabricación** y **Devoluciones**, incluyendo búsqueda de producto y captura de cantidades.

### Hallazgo

Esta pantalla debe retirarse de la navegación del vendedor. Conteo físico, fabricación y devolución de almacén son funciones administrativas. El vendedor necesitará una pantalla independiente **Llenados de planta**, donde registrar producción/llenado y movimientos automáticos de vacíos, llenos y medidor, sin permiso de ajuste físico global.

## Gerencia desde vendedor

El vendedor ve **Tu caja de hoy**, ventas en efectivo, abonos en efectivo, gastos, efectivo a entregar, **Cerrar caja de hoy**, formulario de gasto y los bloques **Tus cierres de caja** y **Tus gastos registrados**. No se muestran reporte por persona, historial global ni todos los gastos.

### Hallazgo

La limitación actual es parcialmente correcta: el vendedor puede operar su caja y sus gastos, pero la pantalla debe renombrarse **Mi Caja** y vincularse a un turno/planta. La administración global de cierres, gastos de terceros y reportes consolidados debe permanecer únicamente en Gerencia de admin.

# Auditoría visual — perfil repartidor

## Sesión y navegación inicial

La cuenta muestra **Hola, repartidor** y actualmente abre **Pedidos**; al navegar a Inicio se observan los accesos: **Inicio, Productos, Etiquetas, Pedidos, Clientes, Créditos, Jornada, Vehículos, Distribución, Inventario, Reportes y Gerencia**.

Inicio del repartidor muestra Ventas de hoy, Ingresos de hoy, Clientes registrados, Créditos pendientes y acciones rápidas: **Nuevo pedido**, **Clientes y QR**, **Cobrar crédito** y **Revisar inventario**.

### Hallazgo preliminar

La navegación efectiva del repartidor está mostrando prácticamente todos los módulos, incluidos Productos, Etiquetas, Inventario, Reportes y Gerencia. Esto contradice el flujo previsto de campo. El inicio recomendado debe ser **Mi Jornada**, no Pedidos ni Inicio administrativo, y la navegación debe reducirse a Mi Jornada, Mi Cartera, Cobro/Créditos, Mi Historial, Mi Caja y Cuenta.

No se ha modificado código durante esta auditoría.

## Jornada desde repartidor

El repartidor entra a **Transferencias de almacén** y ve **Escanear producto** y **Agregar manualmente**. La descripción indica que cada producto transferido se descuenta del inventario disponible de almacén.

### Hallazgo

La pantalla actual no representa todavía la jornada real solicitada: lectura inicial del medidor, tolerancia, recargas, ventas por lectura, caja, incidencias y cierre. Debe reconvertirse en **Mi Jornada**, con transferencia/carga como una etapa inicial y con el libro operativo del vehículo visible solo para el repartidor responsable y administración.

## Vehículos desde repartidor

El repartidor puede abrir **Libros operativos** y ve un selector **Vehículo / medidor** con la opción inicial **Selecciona un vehículo**. En la sesión actual no hay unidades disponibles para seleccionar.

### Hallazgo

El repartidor debe consultar únicamente vehículos autorizados y asignados a su jornada o turno. No debe crear, editar ni configurar vehículos, medidores, conversiones o precios. La ausencia de vehículo asignado debe llevarlo a un estado operativo claro dentro de Mi Jornada, no a una pantalla administrativa vacía.

## Distribución desde repartidor

Al abrir **Distribución**, el contenido principal queda vacío y solo permanece la navegación. La consola no muestra una excepción JavaScript del módulo; únicamente aparecen advertencias de conexión WebChannel de Firestore y la recomendación de persistencia multi-pestaña. En consecuencia, la vista parece no tener datos o no ofrecer un estado vacío útil para el repartidor.

### Hallazgo

El repartidor no necesita la supervisión global de Distribución. Debe recibir sus clientes, jornada, mapa y comprobantes dentro de **Mi Jornada** o **Mi Cartera**, con un estado vacío explícito cuando no tenga ruta, carga o jornada asignada.

## Clientes desde repartidor

El repartidor ve **Clientes**, **Escanear QR**, buscador y **Filtros avanzados**. En la sesión actual aparecen **0 clientes encontrados**, sin tarjetas ni botones de alta porque no tiene cartera asignada.

### Hallazgo

La pantalla debe convertirse en **Mi Cartera**. Debe mostrar clientes asignados, búsqueda, QR, historial/ventas del cliente, solicitud de desactivación con devolución de envase y alta de clientes nuevos en campo. No debe mostrar Nueva localidad, Nueva ruta ni edición de datos maestros existentes.

## Créditos desde repartidor

El repartidor ve el resumen **Total pendiente**, número de cuentas y ausencia de créditos pendientes; no se muestran acciones por falta de cartera/saldos en la sesión.

### Hallazgo

Debe convertirse en **Cobro de mi cartera** o integrarse en Mi Cartera. El repartidor podrá consultar saldo y registrar abonos de clientes asignados, pero no ver créditos de otros repartidores ni realizar correcciones globales.

## Gerencia desde repartidor

El repartidor ve **Tu caja de hoy**, ventas y abonos en efectivo, gastos, efectivo a entregar, **Cerrar caja de hoy**, registro de gastos y sus propios cierres/gastos. No se muestran reportes por persona ni todos los gastos.

### Hallazgo

El acceso operativo a caja es coherente, pero el nombre **Gerencia** es incorrecto para este rol. Debe convertirse en **Mi Caja**, asociarse a la jornada/vehículo y mantener únicamente movimientos propios. La Gerencia global queda exclusivamente en admin.

## Reportes desde repartidor

El repartidor puede abrir **Reportes** y ve **Respaldo**, **Ubicación**, **Reporte de ventas** y **Exportar**, incluyendo **Respaldo completo** y el botón **Generar y descargar respaldo**. El respaldo describe productos, clientes, ventas, créditos, rutas, devoluciones e historial de inventario.

### Hallazgo crítico

Esta pantalla debe retirarse inmediatamente de la navegación del repartidor. Un respaldo o exportación global expone información de toda la empresa y no corresponde a la operación de campo. El repartidor solo debe tener un **Mi Historial** limitado a sus jornadas, ventas, clientes asignados, abonos y caja propia, sin exportación masiva.

# Comparación consolidada y orden de limpieza

## Estado observado

| Rol | Navegación actual observada | Problema principal |
|---|---|---|
| Admin | Inicio, Productos, Etiquetas, Pedidos, Clientes, Créditos, Jornada, Vehículos, Distribución, Inventario, Reportes y Gerencia; Configuración desde encabezado | Tiene todo lo esperado, pero Inicio y Jornada mezclan funciones administrativas y operativas |
| Vendedor | Inicio, Productos, Etiquetas, Pedidos, Clientes, Créditos, Inventario y Gerencia | Ve catálogo, etiquetas, inventario administrativo y pedidos de distribución; no tiene Planta ni Llenados |
| Repartidor | Durante la auditoría se mostraron prácticamente todas las pestañas, incluyendo Productos, Etiquetas, Inventario, Reportes y Gerencia | Puede alcanzar respaldos y exportaciones globales; no inicia en Mi Jornada y Distribución quedó vacía sin estado útil |

## Navegación objetivo

### Admin

`Inicio administrativo` · `Productos` · `Etiquetas` · `Pedidos administrativos` · `Clientes globales` · `Créditos globales` · `Cargas/Transferencias` · `Vehículos y libros` · `Supervisión de distribución` · `Inventario` · `Reportes` · `Gerencia` · `Configuración`.

### Vendedor

`Planta / Venta del día` · `Llenados` · `Clientes de planta` · `Cobro de créditos` · `Mi Caja` · `Mi Historial` · `Mi cuenta`.

La pantalla Productos debe desaparecer para este rol. La selección de SKU activo debe vivir dentro de Venta de planta. La pantalla Inventario debe desaparecer; el vendedor registrará llenados y operaciones que generen movimientos específicos. La pantalla Gerencia se renombra Mi Caja.

### Repartidor

`Mi Jornada` · `Mi Cartera` · `Mis pedidos/ventas` · `Cobro de mi cartera` · `Mi Caja` · `Mi Historial` · `Mi cuenta`.

La carga o transferencia de almacén puede ser una etapa de Mi Jornada. Productos, Etiquetas, Inventario, Reportes, Configuración, Usuarios, Localidades, Rutas globales y Distribución global deben quedar fuera de su navegación.

## Limpieza prioritaria antes de construir nuevas pantallas

1. Retirar de vendedor y repartidor **Reportes**, porque actualmente exponen respaldo completo y exportaciones masivas.
2. Retirar de vendedor y repartidor **Productos** y **Etiquetas**; dejar solamente selección/escaneo de SKU dentro de la venta.
3. Retirar de vendedor y repartidor **Inventario administrativo**; separar conteo/fabricación/devoluciones de los llenados operativos.
4. Cambiar el punto de entrada de repartidor de Pedidos a Mi Jornada.
5. Cambiar el punto de entrada de vendedor a Planta / Venta del día.
6. Dividir Gerencia en Gerencia global para admin y Mi Caja para los roles operativos.
7. Dividir Clientes en Clientes globales, Mi Cartera y Clientes de planta.
8. Mantener Configuración, Usuarios, Permisos, Marca, Vehículos autorizados, Medidores, Rutas globales y asignaciones solo para admin.
9. Mantener durante diagnóstico la lectura autenticada abierta únicamente para cuentas con sesión Firebase y perfil Firestore creado desde Console; no convertir esa apertura en configuración de producción.
10. Después de validar visualmente los tres perfiles, reemplazar los toggles contaminados por una matriz fija de pantallas por rol y alcances de datos.

## Conclusión de la auditoría

La aplicación no necesita más interruptores CRUD por usuario para resolver el problema observado. Necesita tres experiencias de navegación distintas: administración global, operación de planta y operación de reparto. El problema actual no es que falten botones; es que las pantallas administrativas están siendo reutilizadas como pantallas operativas y que los roles reciben módulos que no corresponden a su función.

La siguiente etapa debe ser la limpieza de navegación y reglas temporales de diagnóstico, pero no se debe aplicar hasta que se confirme este mapa final.
