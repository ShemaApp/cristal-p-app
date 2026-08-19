# Auditoría línea por línea de `firestore.rules` antes del despliegue

**Proyecto:** Flutt-Water  
**Proyecto Firebase objetivo:** `flutt-water`  
**Archivo auditado:** `/home/cristalP/firestore.rules`  
**Estado:** revisión estática; no se modificó ni desplegó el archivo.  
**Fecha de revisión:** 18 de agosto de 2026.

## Conclusión ejecutiva

La estructura general es sólida: utiliza `rules_version = '2'`, separa las colecciones por dominio, mantiene un bloqueo final para rutas no declaradas, evita el borrado de muchos registros operativos y usa `getAfter()` para intentar exigir escrituras atómicas.

Sin embargo, **no recomiendo desplegar este archivo todavía**. La razón principal no es un error de sintaxis confirmado, sino varios desajustes entre el frontend actual y las condiciones de seguridad. El más inmediato afecta al vendedor: el cargador global de la PWA intenta leer `clientes`, `notas`, `creditos` y `pedidos` con consultas amplias, pero las reglas no conceden al vendedor el acceso compatible con esas consultas. Además, la venta pública de planta intenta leer `clientes/publico_general` dentro de una transacción y el vendedor no tiene permiso de lectura sobre ese documento.

También existen riesgos de integridad en créditos, inventario, transferencias y subcolecciones de jornadas. Estos riesgos deben resolverse antes de considerar las reglas como frontera de seguridad de producción.

> **Importante:** una pestaña oculta en el frontend no sustituye una regla de Firestore. Firestore evalúa una consulta contra sus posibles resultados y las reglas no funcionan como filtros; una consulta que podría devolver documentos no autorizados falla completa [3].

## Escala utilizada

| Nivel | Significado |
|---|---|
| **Correcto** | La intención y el comportamiento observado son coherentes, sujeto a pruebas autenticadas. |
| **Advertencia** | No necesariamente bloquea el flujo, pero necesita validación o endurecimiento. |
| **Bloqueante funcional** | Es muy probable que una operación válida de la aplicación falle. |
| **Riesgo alto** | Un cliente autenticado podría leer o modificar más de lo permitido, o fabricar registros operativos. |

## Validación previa de herramientas

Se comprobó que Firebase CLI `15.27.0` está disponible mediante `npx`. Se intentó ejecutar un dry-run sin publicar:

```bash
npx --yes firebase-tools@latest deploy \
  --only firestore:rules \
  --project flutt-water \
  --dry-run
```

El comando no llegó a compilar o publicar porque el entorno no está autenticado:

```text
Error: Failed to authenticate, have you run firebase login?
```

Por tanto, este informe contiene una revisión semántica y de integración con el frontend, pero **no afirma que el compilador remoto haya aceptado el archivo**. Después de resolver los hallazgos, debe repetirse el dry-run desde una sesión autenticada.

## Auditoría por rangos de líneas

### Líneas 1–3: versión y alcance del servicio

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
```

**Evaluación: Correcto.** La versión 2 permite, entre otras capacidades, `let` dentro de funciones y el comportamiento moderno de comodines recursivos. El archivo está declarado para Cloud Firestore y todos los `match` quedan bajo la base de datos dinámica.

### Líneas 5–22: comentarios de cobertura

Los comentarios documentan colecciones principales y explican que el `catch-all` no debe utilizarse como regla operativa.

**Evaluación: Advertencia documental.** La lista no representa todas las colecciones que el frontend consulta actualmente. El código también utiliza `localidades_catalogo`, `carteras_repartidores`, `solicitudes_desactivacion_clientes`, `cajas_jornada`, `medidores` y subcolecciones de `vehiculos/{id}/jornadas`. Esas rutas sí aparecen más adelante, pero la lista introductoria debería mantenerse sincronizada para no inducir a error durante futuras auditorías.

### Líneas 24–37: autenticación y roles

```rules
function signedIn() {
  return request.auth != null;
}
function role() {
  return get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.role;
}
function isAdmin() {
  return signedIn() && role() == 'admin';
}
function isStaff() {
  return signedIn() && (role() == 'admin' || role() == 'vendedor' || role() == 'usuario');
}
```

**Evaluación: Mixta.**

` signedIn()` es correcto. `role()` centraliza el perfil en Firestore, pero cada operación depende de que exista `usuarios/{uid}` y tenga `role`. Si el usuario está autenticado en Firebase Auth pero todavía no tiene perfil, la lectura del perfil puede fallar y la regla denegará la operación. Esto es correcto como postura de seguridad, pero debe probarse explícitamente.

`isAdmin()` es coherente. `isStaff()` conserva `usuario` como alias heredado de `vendedor`, pero únicamente se utiliza en algunos bloques. El frontend usa `rolEfectivo()`; las reglas no tienen una función equivalente global, por lo que la compatibilidad del alias está repartida manualmente por el archivo.

**Riesgo alto de sobreacceso:** `isStaff()` concede a `vendedor` lectura y creación de `pedidos` en los bloques de las líneas 262–304. El vendedor no debería ver ni crear pedidos de distribución si su función es la venta pública de planta. Aunque la pestaña esté oculta, un cliente autenticado podría invocar la colección directamente.

### Líneas 38–49: validación de branding

`brandingValida(data)` exige nombre comercial, subtítulo, lema, teléfono y una ruta de logo fija.

**Evaluación: Correcto con advertencias.** La validación limita longitudes y evita que el administrador cambie la ruta del logo a un valor arbitrario. No se validan formatos de teléfono, pero eso es integridad de datos y no autorización. También debe comprobarse que todos los documentos existentes de `_meta/branding` tengan `logoPath`; si alguno no lo tiene, un update posterior puede ser rechazado.

### Líneas 50–67: configuración inicial del proyecto

`setupProyectoValido(data)` exige identificadores y parámetros básicos de configuración, restringe `whatsappModo` a `wa.me`, limita administradores iniciales y exige `configuracionInicialCompletada == true`.

**Evaluación: Correcto para el alcance actual.** Es coherente con la decisión de mantener WhatsApp Business pendiente y usar `wa.me`.

**Advertencia:** `tipoFlujoMedidor` y `unidadMedidorPredeterminada` solo se validan como texto no vacío implícitamente en el primer caso y como string en el segundo. No se comprueba que correspondan a un catálogo conocido ni que la unidad sea compatible con la cantidad por dígito.

### Líneas 68–82: medidores y tarifas

`medidorConfigValida(data)` verifica tipo de flujo, unidad, cantidad positiva por dígito y una lista de hasta cinco precios. `precioMedidorValido(data)` está definido, pero no se utiliza en ningún `match`.

**Evaluación: Advertencia.** La regla permite que `preciosMedidor` contenga elementos con cualquier forma porque solo comprueba que sea una lista y que no tenga más de cinco elementos. Si la intención es validar cada precio, `precioMedidorValido()` debe integrarse en la regla o eliminarse para no sugerir una garantía inexistente.

### Líneas 83–87: visibilidad de clientes

```rules
function clienteVisible(data) {
  return isAdmin() || (signedIn() && role() == 'repartidor'
    && ((data.repartidorIds is list && request.auth.uid in data.repartidorIds)
      || data.asignacionEstado == 'disponible'));
}
```

**Bloqueante funcional para vendedor.** El vendedor no aparece en esta función. Por ello no puede leer ningún documento de `clientes`, incluido `clientes/publico_general`.

El frontend, en `sesion.js`, construye para cualquier rol distinto de repartidor o administrador una consulta global a `clientes`. Esa consulta será rechazada por Firestore. Además, `pedidos.js` hace un `tx.get(clienteRef)` para `publico_general` antes de crear o reutilizar el cliente dentro del ticket de planta. Esa lectura también puede fallar para vendedor.

**Advertencia de privacidad para repartidor:** la condición `asignacionEstado == 'disponible'` permite a cualquier repartidor autenticado leer clientes disponibles, incluso si no están en su cartera. Esto coincide parcialmente con el flujo de “agregar cliente existente”, pero debe ser una decisión explícita porque expone datos de todos los clientes marcados como disponibles.

### Líneas 88–112: permiso de edición

`datosUsuario()` obtiene el perfil actual. `permisoEdicion(recurso)` combina permisos heredados con overrides almacenados en el perfil.

**Evaluación: Riesgo alto de inconsistencias.**

La aplicación había decidido no utilizar interruptores granulares por pantalla, pero esta función todavía admite overrides en `usuarios/{uid}.permisos.edita`. Eso puede producir diferencias entre la navegación oficial y la autorización efectiva.

El vendedor obtiene edición de créditos por defecto. El repartidor obtiene edición de clientes y créditos por defecto, aunque el frontend actual limita la edición directa de fichas existentes. La regla solo bloquea expresamente la edición manual de productos para repartidor.

Además, `permisoEdicion('creditos')` no comprueba que el crédito pertenezca al usuario que realiza el abono. Cualquier vendedor o repartidor cuyo rol tenga ese permiso puede actualizar cualquier documento de `creditos` si conoce su ID.

### Líneas 114–123: relación entre productos y códigos de barras

`indiceCodigoProductoValido()` intenta que `productos/{id}` y `barcodes/{codigo}` se actualicen en la misma transacción mediante `existsAfter()` y `getAfter()`.

**Evaluación: Correcto en intención.** El patrón es válido para exigir consistencia entre documentos escritos atómicamente [2]. Debe probarse tanto al crear un producto con código, como al cambiar el código, quitarlo, reservar un código existente y eliminar el índice.

**Advertencia:** la regla valida el vínculo, pero no valida el formato, longitud o unicidad semántica del código más allá del ID del documento y la relación cruzada.

### Líneas 125–167: productos e inventario atómico

Los productos son legibles por cualquier usuario autenticado. Crear requiere permiso administrativo y relación válida con el código. Update permite al administrador, una excepción para repartidor durante una transferencia y una excepción para vendedor durante venta pública de planta.

**Líneas 127–129: create.** Solo admin puede crear porque `permisoEdicion('productos')` devuelve verdadero únicamente para admin en el modelo actual. Es coherente.

**Líneas 133–150: excepción de repartidor.** La regla limita campos modificables y exige una transferencia activa del mismo repartidor, con coincidencia de cantidad.

**Riesgo alto:** no se exige que el stock resultante sea mayor o igual a cero. La interfaz valida existencias, pero un cliente malicioso podría intentar una transferencia con cantidad mayor al stock y dejar `stock` negativo si consigue satisfacer las demás condiciones. Tampoco se valida la estructura completa de `rutas/{id}.items` al crear la transferencia.

**Líneas 151–165: excepción de vendedor.** La regla exige que exista una nota posterior de planta creada por el mismo vendedor y que el producto aparezca en `productoIds`.

**Riesgo alto de integridad:** no se comprueba que la cantidad descontada del producto coincida con la cantidad del producto dentro de `nota.items`. Tampoco se exige `stock >= 0`. Un cliente autenticado con rol vendedor podría intentar crear una nota mínima y descontar una cantidad arbitraria, incluso dejando stock negativo, si satisface las condiciones actuales.

La relación de la nota solo comprueba `productoIds.hasAny([id])`; no valida el importe, precio, cliente, forma de pago más allá de la regla de la nota, ni la cantidad exacta. La interfaz sí envía la estructura esperada, pero Firestore debe ser la autoridad contra clientes manipulados.

### Líneas 169–181: códigos de barras

Los códigos son legibles por usuarios autenticados. Crear y actualizar requiere permiso de productos, código activo, relación con el producto posterior y correspondencia entre documento e ID. El borrado exige que el producto todavía apunte al código.

**Evaluación: Correcto en estructura.** Concede administración a admin y bloquea vendedor/repartidor bajo los permisos actuales. La validación depende de que las operaciones de producto y código se realicen en la misma transacción, como hace el frontend.

### Líneas 183–196: historial de inventario

Solo admin puede leer. Cualquier autenticado que no sea repartidor puede crear un registro cuyo `usuarioUid` sea su propio UID. Nadie puede actualizar o borrar.

**Riesgo alto:** vendedor puede crear registros arbitrarios en `inventario_historial`, aunque no tenga acceso a la pantalla administrativa de inventario. La regla no valida `productoId`, fecha, tipo de movimiento, cantidad, stock anterior o stock posterior. Esto permite contaminar el historial de auditoría.

La regla debería limitar la creación a admin o a una operación transaccional específica y validada, no basarse únicamente en `role() != 'repartidor'`.

### Líneas 198–224: clientes

Admin puede crear y actualizar. Repartidor puede crear un cliente propio si aporta ruta y asignación. Vendedor puede crear únicamente `publico_general`.

**Líneas 200–215: lectura y creación.** La creación de `publico_general` es razonable en intención, pero la transacción del frontend primero ejecuta `tx.get(clienteRef)`. Como el vendedor no puede leer por `clienteVisible`, la primera venta y las posteriores pueden fallar antes de la creación.

**Líneas 216–222: actualización.** El repartidor solo puede cambiar asignación si el cliente existente está disponible y el nuevo estado es asignado. Esto evita editar nombre, teléfono, localidad, QR y estado arbitrariamente. La operación de agregar un cliente existente a una ruta debe probarse con una consulta que incluya las restricciones de lectura.

**Bloqueante confirmado por integración:** `ruta.js` tiene un flujo de alta de cliente nuevo durante una venta desde transferencia que crea únicamente nombre, teléfono, domicilio, activo y `creadoPorUid`. No incluye `repartidorIds`, `rutaId` ni `asignacionEstado`. La regla de creación del repartidor exige esos campos; esa operación quedará denegada.

### Líneas 226–251: notas y ventas

Las notas son inmutables. Admin lee todas; los demás solo las propias. Crear admite venta directa administrativa, ticket público de planta o venta asociada a transferencia activa.

**Líneas 230–231: lectura.** La regla para vendedor y cualquier rol no admin solo permite sus propias notas, pero `sesion.js` construye para vendedor una consulta global ordenada de `notas`. Las reglas no son filtros; esa consulta puede incluir notas de otros usuarios y será rechazada [3]. El vendedor debe usar una consulta con `where('capturadoPorUid', '==', currentUser.uid)` o recibir una autorización explícita distinta.

**Líneas 233–242: venta de planta.** La intención es correcta: origen, tipo de venta, medio, responsable, cliente público y prohibición de crédito. La validación no exige tipos para `total`, `items`, cada cantidad, precios ni `formaPago` dentro de un conjunto permitido.

**Líneas 243–248: ventas de transferencia.** La regla comprueba que exista transferencia, que esté activa, que pertenezca al repartidor y que aumente el tamaño de `entregas` en uno.

**Riesgo alto:** no se valida que la nota coincida con el contenido de la entrega, con el decremento de `items`, con cantidades máximas ni con el cliente autorizado. La integridad depende ampliamente de la lógica del cliente offline.

### Líneas 253–260: créditos

Todos los usuarios autenticados pueden leer todos los créditos. Vendedor y repartidor pueden crear o actualizar por `permisoEdicion('creditos')`. Nadie puede borrar.

**Riesgo alto de privacidad:** repartidores y vendedores pueden leer créditos globales, no solo los de su cartera o los de planta.

**Riesgo crítico de integridad:** cualquier vendedor o repartidor con el permiso de créditos puede modificar cualquier crédito, incluyendo `saldo` y el arreglo completo `abonos`. No hay restricción de propietario, cliente, cartera, nota original, monto ni campos modificables. El frontend limita visualmente las opciones, pero un cliente autenticado puede enviar un update directo.

Este bloque necesita una decisión de negocio antes del despliegue: si el vendedor cobra créditos de planta globales, debe definirse el alcance; si el repartidor cobra solo su cartera, la regla debe comprobar pertenencia a la cartera; en ambos casos conviene permitir únicamente append de un abono y calcular o verificar el saldo.

### Líneas 262–304: pedidos

`isStaff()` permite a admin y vendedor leer pedidos y crear pedidos propios. Repartidor puede leer y crear pedidos asignados a sí mismo. Solo admin actualiza libremente; repartidor tiene dos transiciones controladas.

**Riesgo alto de sobreacceso:** vendedor obtiene lectura y creación de pedidos de distribución por `isStaff()`, aunque su navegación oficial no incluye rutas ni pedidos. Esto contradice la separación de planta y reparto.

**Evaluación de las transiciones del repartidor:** la transición a `transferencia_confirmada` y la transición a `entregado` están razonablemente acotadas por estado, UID, transferencia y lista de campos. Debe probarse que el documento de transferencia consultado en `getAfter()` pertenece al mismo repartidor y queda activo, como exige la regla.

### Líneas 306–340: transferencias en `rutas`

Admin puede leer, crear y actualizar transferencias. Repartidor puede crear las propias, leer las propias y actualizar una transferencia activa para registrar entregas o solicitar recepción.

**Líneas 312–319: creación.** La regla exige transferencia activa de almacén, responsable propio para el repartidor y al menos un item.

**Riesgo alto:** no valida la forma de cada item, cantidades positivas, existencia de producto, precio, `cantRestante` ni consistencia con la actualización de `productos`. La transacción del frontend comprueba existencias, pero la regla debe protegerse ante un cliente manipulado.

**Líneas 320–338: update.** El repartidor puede cambiar `items` y `entregas` mientras aumenta `entregas.size()` en uno.

**Riesgo crítico de integridad:** no limita qué cambios dentro del mapa `items` son válidos ni exige que la nueva entrega corresponda a una nota creada en la misma transacción. Un repartidor podría intentar aumentar saldos, cambiar cantidades o introducir entregas arbitrarias sin que la regla compruebe el detalle.

### Líneas 342–349: devoluciones

Todos los autenticados pueden leer devoluciones. Repartidor puede crear cualquier devolución con su propio `capturadoPorUid`; admin puede actualizar o borrar.

**Advertencia:** no hay validación de pertenencia a transferencia, cantidades, merma, producto ni estado de la ruta. Si las devoluciones se consideran registros operativos inmutables, `allow update, delete: if isAdmin()` contradice ese principio y debe cambiarse a inmutable o a un flujo de corrección separado.

### Líneas 351–358: gastos

Cada usuario autenticado puede leer y crear sus propios gastos; admin lee todo, actualiza y elimina.

**Evaluación: Razonable para caja**, aunque no se valida monto, tipo de gasto, fecha ni moneda. Si los gastos son registros contables inmutables, el update/delete administrativo debería reemplazarse por anulaciones o ajustes trazables.

### Líneas 360–366: cierres de caja

Cada usuario puede crear y leer sus propios cierres; admin lee todos. Nadie puede actualizar o borrar.

**Evaluación: Correcto en inmutabilidad**, pero la validación es débil: solo se exige `capturadoPorUid` en creación. No se valida jornada, total, fecha, estado, responsable, suma de ventas, abonos y gastos. Un usuario autenticado podría fabricar un cierre propio con datos arbitrarios.

### Líneas 368–376: perfiles de usuarios

El usuario puede leer su propio perfil; admin puede leer cualquiera, actualizar y borrar perfiles ajenos. Nadie puede crear perfiles desde la PWA.

**Evaluación: Correcto para “sin registro público”.** La regla de update es amplia, pero solo admin puede ejecutarla. La creación desde consola o backend administrativo queda compatible con esta política.

### Líneas 378–386: `cajas_jornada`

Admin puede leer cualquier caja; un autenticado puede leer una caja cuyo `repartidorId` coincida con su UID. Cualquier autenticado puede crear una caja para sí mismo; el propietario puede cerrar una caja abierta.

**Riesgo alto:** la creación no exige `role() == 'repartidor'` ni que la caja corresponda a una jornada válida. Un vendedor puede crear una caja de jornada con un identificador propio y datos arbitrarios. La actualización tampoco comprueba que la caja esté vinculada correctamente a una jornada ni que el cierre lo realice el responsable real.

**Bloqueante administrativo:** `vehiculos.js` permite que admin inicie una jornada asignada a otro repartidor y crea una caja con `repartidorId` del repartidor. Esta regla exige que `repartidorId == request.auth.uid` para crearla, por lo que el inicio administrativo para terceros puede fallar.

### Líneas 388–407: vehículos y medidores fijos

Admin puede leer, crear y modificar vehículos. Repartidor puede leer todos los vehículos activos y modificar únicamente tres campos operativos durante su jornada.

**Riesgo alto de privacidad y operación:** `allow read: if signedIn() && (isAdmin() || role() == 'repartidor')` permite a cualquier repartidor consultar todos los vehículos. La interfaz también consulta todos los vehículos activos y selecciona el primero si no existe selección. Esto contradice el modelo de “Mi vehículo”. La regla debería relacionar el vehículo con el repartidor asignado o con una jornada propia.

La excepción de update de vehículo intenta ligar `jornadaActivaId` con una subcolección de jornada y su responsable. La intención es correcta, pero solo cubre el update del vehículo; no corrige los permisos demasiado amplios de las subcolecciones.

### Líneas 409–438: jornadas

Admin o el repartidor responsable pueden leer jornadas. Admin o repartidor pueden crear. Admin o responsable pueden cerrar o actualizar acumuladores.

**Advertencia:** admin puede crear jornadas para cualquier vehículo y repartidor, lo cual es funcional para administración. Repartidor puede crear en cualquier vehículo porque la regla no comprueba una asignación del vehículo al usuario.

La actualización de acumuladores solo exige que los valores sean monótonos y que `ventasCount` aumente en uno. No exige que exista una venta hija correspondiente en la misma transacción. Un cliente propio podría inflar `ventasCount`, lecturas y cantidades acumuladas.

### Líneas 440–448: lecturas

Todos los autenticados pueden leer lecturas. Admin o el creador pueden crear lecturas con jornada, vehículo y lectura no negativa. Nadie puede actualizar o borrar.

**Riesgo alto:** la creación no comprueba que el creador sea el repartidor de la jornada, que la jornada pertenezca al vehículo de la ruta, que esté activa ni que la lectura sea consistente con la anterior. Un usuario autenticado podría escribir una lectura en otra jornada si conoce sus IDs.

### Líneas 449–458: recargas

Todos pueden leer. Cualquier autenticado puede crear una recarga con jornada y vehículo, cantidad positiva y unidad; admin o el capturador pueden hacerlo. No hay update/delete.

**Riesgo alto:** falta la relación de propietario, estado de jornada, medidor, rango y consistencia de vehículo. Un vendedor o repartidor podría anexar una recarga a una jornada ajena mediante una escritura directa.

### Líneas 459–473: ventas de medidor

Todos pueden leer. Cualquier autenticado puede crear una venta de jornada si tiene UID propio, lectura final mayor que inicial, cantidad positiva, unidad, precio y subtotal. No hay update/delete.

**Riesgo alto:** no se verifica que la jornada pertenezca al capturador, que esté activa, que el vehículo y medidor coincidan, que la caja corresponda, que la lectura sea la siguiente lectura válida o que la venta esté asociada a un cliente QR. La comparación `lecturaFinal > lecturaInicial` es insuficiente para autorizar una venta operativa.

### Líneas 474–496: cierres e incidencias de jornada

Todos pueden leer cierres e incidencias. Cualquier autenticado puede crear un cierre o incidencia con los IDs y datos mínimos; nadie puede modificar o borrar.

**Riesgo alto:** no se verifica pertenencia a jornada, propietario, estado activo, unicidad de cierre ni relación con `cajas_jornada`. Un usuario autenticado puede intentar cerrar una jornada ajena o agregar una incidencia a un vehículo ajeno.

La inmutabilidad está bien aplicada, pero no basta si la creación no está vinculada al responsable y al estado correcto.

### Líneas 498–514: medidores y tarifas antiguas

Los medidores son legibles por admin y repartidor; solo admin puede crearlos o actualizarlos. `tarifas_agua` es legible por cualquier autenticado y solo admin puede escribir.

**Evaluación: Correcto para el alcance actual**, con la misma advertencia de que el repartidor puede leer cualquier medidor y las tarifas carecen de validación completa en update.

### Líneas 516–535: localidades y rutas configurables

Localidades son legibles por autenticados y administrables por admin. Rutas de catálogo son legibles por admin o por el repartidor asignado; solo admin puede crearlas o actualizarlas.

**Evaluación: Razonable.** La consulta de rutas del repartidor incluye `where('repartidorId', '==', uid)`, lo cual coincide con la regla. Vendedor no puede leer rutas de catálogo, coherente con su rol, pero su módulo Clientes actual intenta consultar rutas para cualquier usuario no admin; esa consulta fallará para vendedor.

La creación/actualización no valida todos los IDs de cliente ni garantiza que los clientes incluidos pertenezcan a la localidad o que la ruta permanezca activa.

### Líneas 537–545: carteras de repartidores

Admin puede leer todas; cada repartidor solo su subcolección. Solo el repartidor puede crear una relación de cliente, verificando que la ruta le pertenezca.

**Evaluación: Correcto en aislamiento básico.** No permite update/delete, lo cual protege el historial de pertenencia. Debe probarse que las operaciones batch de agregar cliente y actualizar cliente se autoricen conjuntamente.

### Líneas 547–562: solicitudes de desactivación

El repartidor crea solicitudes propias con envase y base devueltos, motivo y estado pendiente. Admin decide autorizada o rechazada; el rechazo exige motivo.

**Evaluación: Correcto en intención.** La regla no valida que `clienteId` exista, que el `repartidorId` tenga realmente al cliente en cartera o que la solicitud sea única. La autorización administrativa no actualiza automáticamente `clientes/{id}`; la interfaz lo hace en el mismo batch y debe verificarse que el batch incluya las escrituras autorizadas.

### Líneas 564–588: metadatos

`_meta/branding` es público para lectura y admin-only para crear/actualizar con validación. `_meta/system_setup` es legible por autenticados y solo el primer admin puede crearlo. Otros documentos `_meta/{id}` son legibles por autenticados y escribibles por admin, excepto branding y system_setup.

**Evaluación: Correcto con advertencias.** La lectura pública del branding es apropiada si no contiene datos sensibles. La lectura autenticada de `_meta/backups` debe confirmarse: cualquier usuario autenticado podría consultar metadatos de respaldo porque coincide con `_meta/{id}`. Si los metadatos incluyen rutas, nombres internos o información operativa, conviene hacerlos admin-only.

La regla `allow write` para `_meta/{id}` incluye create, update y delete para admin. Es coherente con un control administrativo general, pero debe mantenerse una lista explícita de documentos permitidos si se agregan metadatos sensibles.

### Líneas 590–599: denegación por defecto

```rules
match /{document=**} {
  allow read, write: if false;
}
```

**Evaluación: Correcto y recomendable.** Las colecciones que no tengan una regla explícita quedan denegadas. Esto convierte cualquier colección nueva en un error visible, pero exige actualizar las reglas antes de incorporar nuevas operaciones.

## Hallazgos que bloquean el despliegue recomendado

| Prioridad | Líneas | Hallazgo | Consecuencia probable |
|---|---:|---|---|
| Crítica | 83–87, 198–224 | Vendedor no puede leer clientes, incluido `publico_general` | El módulo Clientes y la transacción del ticket de planta pueden fallar con `permission-denied`. |
| Crítica | 230–231, 343–351 de `sesion.js` | Vendedor consulta todas las notas, pero la regla solo permite las propias | La suscripción global de notas puede rechazarse porque las reglas no son filtros. |
| Alta | 253–260 | Créditos legibles y editables sin pertenencia | Exposición y modificación de créditos de otros usuarios/carteras. |
| Alta | 183–196 | Vendedor puede crear historial de inventario arbitrario | Contaminación de la auditoría de inventario. |
| Alta | 151–165 | Venta pública puede dejar stock negativo o desincronizado con la nota | Integridad de inventario no garantizada contra clientes manipulados. |
| Alta | 320–338 | Repartidor puede modificar mapas `items`/`entregas` sin validar detalle | Transferencias y saldos operativos potencialmente manipulables. |
| Alta | 388–496 | Jornadas, lecturas, recargas, ventas, cierres e incidencias no validan plenamente propiedad/estado | Un usuario autenticado podría escribir operaciones en jornadas o vehículos ajenos. |
| Alta | 388–407 | Repartidor puede leer todos los vehículos | Contradice “Mi vehículo” y expone información operativa de otros vehículos. |
| Alta | 378–386 | Cualquier autenticado puede crear cajas de jornada propias sin relación | Cajas operativas fabricadas o desconectadas de una jornada real. |
| Funcional | `ruta.js` 597–603 | Alta de cliente en venta rápida no incluye campos exigidos | Venta QR con cliente nuevo puede fallar al crear el cliente. |
| Funcional | `vehiculos.js` 156–174 vs 378–386 | Admin puede iniciar jornada para otro repartidor, pero la caja exige UID del admin | Inicio administrativo de jornada puede fallar. |

## Qué sí parece compatible

La denegación por defecto, la prohibición de registro público de usuarios, la inmutabilidad de notas, cierres de caja, lecturas, recargas, ventas, cierres e incidencias, la validación básica de branding, la administración de vehículos y el vínculo transaccional de códigos de barras están alineados con la intención del proyecto.

Esto no elimina la necesidad de pruebas. Las operaciones con `getAfter()` tienen límites de llamadas de documentos: 10 para una operación individual y 20 para una transacción o batch, con el límite de 10 aplicable también a cada operación interna [2]. Las transferencias y ventas con muchos productos deben probarse con el tamaño máximo real utilizado por la aplicación.

## Recomendación antes de desplegar

Mi recomendación es **pausar el despliegue de estas reglas** hasta decidir y corregir al menos los bloqueantes del vendedor, los créditos, el historial de inventario y la propiedad de jornadas/vehículos. No es necesario tocar la navegación de permisos todavía; basta con alinear la frontera de Firestore con el flujo que ya se decidió.

El siguiente paso seguro sería preparar una revisión de reglas en dos capas:

1. **Corrección funcional mínima:** permitir exactamente las lecturas necesarias para vendedor, garantizar la transacción de `publico_general`, corregir el alta QR de cliente nuevo, y evitar consultas globales que las reglas no pueden autorizar.
2. **Endurecimiento de integridad:** ligar créditos, jornadas, lecturas, recargas, ventas, cierres, transferencias y stock al propietario, estado y documento de origen correspondientes.

No recomiendo desplegar primero para “ver qué falla” porque algunas reglas actuales no solo podrían bloquear operaciones: también podrían permitir escrituras de datos no deseadas. Es preferible probarlas en Emulator Suite o mediante dry-run autenticado y luego publicar.

## Comandos de validación posteriores

Cuando haya una cuenta autenticada en Firebase CLI y se hayan decidido los cambios:

```bash
cd /home/cristalP
firebase use flutt-water
firebase deploy \
  --only firestore:rules \
  --project flutt-water \
  --dry-run
```

Solo si el dry-run es exitoso y las pruebas con admin, vendedor y repartidor son satisfactorias:

```bash
firebase deploy \
  --only firestore:rules \
  --project flutt-water
```

Durante esta auditoría no se ejecutó el segundo comando.

## Referencias

[1]: https://firebase.google.com/docs/rules/rules-language "Firebase Security Rules language"

[2]: https://cloud.google.com/firestore/native/docs/security/rules-conditions "Writing conditions for Cloud Firestore Security Rules"

[3]: https://firebase.google.com/docs/firestore/security/rules-query "Securely query data with Cloud Firestore Security Rules"

[4]: https://firebase.google.com/docs/firestore/security/rules-fields "Control access to specific fields in Cloud Firestore Security Rules"
