# Matriz de roles, pantallas y permisos CRUD de Flutt-Water

**Estado:** propuesta técnica previa a cualquier modificación de código.
**Roles oficiales confirmados:** `admin`, `repartidor`, `vendedor`.
**Regla de trabajo:** un rol principal por cuenta; el cambio de función se realiza desde administración.

## 1. Criterio de autorización

La aplicación no debe administrar permisos como una combinación ilimitada de interruptores por botón. El rol determina las pantallas que existen para el usuario; el alcance determina los registros que puede consultar u operar dentro de esas pantallas; y la operación determina qué cambio puntual puede ejecutar.

> Ver una pantalla no equivale a poder modificar todo su contenido. Usar un producto en una venta no equivale a administrar el catálogo de Productos. Registrar un llenado que descuenta inventario no equivale a realizar un ajuste físico de inventario.

En las tablas se utilizan estas abreviaturas:

| Código | Significado |
|---|---|
| **A** | Administrador |
| **R** | Repartidor |
| **V** | Vendedor de planta |
| **—** | No permitido |
| **Propio** | Solo documentos creados por el usuario, su jornada, su cartera, su planta o su caja |
| **Operativo** | Solo el cambio específico del flujo, nunca edición libre del documento |
| **Inmutable** | Se puede crear y consultar, pero no actualizar ni eliminar |

Los permisos CRUD de Firestore deben ser la autoridad efectiva. La navegación y los botones solo deben reflejar esas reglas; nunca deben ser la única barrera.

## 2. Matriz CRUD de las colecciones actuales

### 2.1 Configuración, identidad y usuarios

| Colección o documento | C | R | U | D | Función y condición |
|---|---:|---:|---:|---:|---|
| `_meta/branding` | A | Todos para identidad pública | A | — | Nombre comercial, subtítulo, teléfono y logotipo permitido. No contiene datos operativos. |
| `_meta/system_setup` | A, una sola vez | A, R, V | — | — | Asistente inicial por proyecto Firebase. No debe reabrirse desde la PWA después de completarse. |
| `_meta/backups` | A | A | A | — | Metadatos y estados de respaldo. La regla genérica actual permite más lectura de la necesaria y debe restringirse a administración. |
| `_meta/{otro}` | A | Usuarios autenticados según sensibilidad | A | A solo si se define explícitamente | No debe usarse como depósito libre para datos nuevos. Cada colección futura necesita una regla propia. |
| `usuarios` | Flujo administrativo autorizado | A; cada usuario solo su perfil mínimo | A | A, excepto su propio perfil | Administración gestiona nombre, rol, estado, alcances y asignaciones. No hay registro público. El cambio de contraseña propia pertenece a Firebase Auth, no al CRUD de `usuarios`. |
| `permisos` dentro de `usuarios/{uid}` | — | A | A | — | No debe ser una pantalla de toggles CRUD por persona en el modelo final. Se conserva solo como compatibilidad temporal durante la migración. |

La implementación actual todavía reconoce `usuario` en `sesion.js` y `firestore.rules`. Ese rol debe quedar como alias temporal de migración hacia `vendedor`, no como cuarto rol operativo.

### 2.2 Catálogo y códigos de barras

| Colección | C | R | U | D | Función y condición |
|---|---:|---:|---:|---:|---|
| `productos` | A | A; R y V solo SKUs activos necesarios para operar | A | — recomendado | Alta y edición del catálogo, presentaciones, unidades, stock administrativo y metadatos. Para conservar historial, la baja debe ser `activo=false`; eliminar documentos usados por ventas no debe permitirse. |
| `barcodes` | A, dentro de transacción con Producto | A; R/V solo cuando necesiten escanear | A, dentro de transacción | — | Índice de unicidad. No se debe crear, editar ni borrar de forma independiente. Generar/imprimir etiquetas es función de catálogo, no de venta. |
| `tarifas_agua` | A | A, R y V para precios activos asignados | A | — | Colección heredada/compatible para tarifas por medidor. En el futuro debe quedar ligada a `plantaId` o `vehiculoId`. |
| `inventario_historial` | A; eventualmente V solo mediante movimiento operativo separado | A; V solo su historial de planta si se decide | — | — | Registro inmutable de fabricación, conteos y ajustes. El vendedor no debe recibir permiso genérico para editar stock. Sus llenados generan movimientos operativos específicos. |

**Regla de negocio:** el repartidor y el vendedor pueden leer el catálogo que necesitan para vender, pero no deben ver ni editar el formulario administrativo de Productos. La venta consume un SKU; la administración modifica la definición del SKU.

### 2.3 Clientes, localidades y cartera

| Colección | C | R | U | D | Función y condición |
|---|---:|---:|---:|---:|---|
| `clientes` | A, R y V en alta controlada | A todos; R cartera/asignados; V clientes operables de planta | A; R/V solo campos operativos autorizados | — | El repartidor y vendedor pueden crear clientes nuevos. Ningún rol operativo puede cambiar libremente nombre, teléfono, localidad, QR o estado de un cliente existente. |
| `localidades_catalogo` | A | A, R y V para seleccionar | A | — | El administrador crea y normaliza localidades. Los usuarios operativos solo las consultan. |
| `rutas_catalogo` | A | A y repartidor asignado | A | — | Ruta es cartera/localidad, no jornada. Solo administración crea, asigna o modifica la cartera. El repartidor la consulta y agrega clientes existentes mediante la cartera. |
| `carteras_repartidores/{repartidorId}/clientes` | A; R propietario | A y R propietario | A solo para administración; R no edita libremente | A solo administración | Relación entre cliente, ruta y repartidor. El repartidor puede agregar un cliente disponible a su cartera; no cambia la cartera de otro repartidor. |
| `solicitudes_desactivacion_clientes` | R | A y R solicitante | A | — | El repartidor solicita baja con envase y base devueltos. Administración autoriza o rechaza; el rechazo exige motivo. El vendedor no solicita bajas en la primera versión. |

Para `clientes`, el permiso de actualización debe validarse con `diff(resource.data).affectedKeys()`. La interfaz no es suficiente, porque un usuario podría intentar escribir directamente un cambio de nombre o teléfono.

### 2.4 Ventas, pedidos y créditos

| Colección | C | R | U | D | Función y condición |
|---|---:|---:|---:|---:|---|
| `notas` | A, R y V mediante su flujo transaccional | A todo; R/V solo propias o de su centro operativo | — | — | Comprobante de venta inmutable. El repartidor crea ventas de su jornada; el vendedor crea ventas de su planta; administración puede consultar, no editar el comprobante. |
| `pedidos` | A y R en los estados autorizados | A; R pedidos asignados a él | A para asignación; R solo transiciones propias | — | Pedido previo a la transferencia. Administración asigna; repartidor confirma transferencia y entrega según estado. No se elimina: se cancela mediante estado. Vendedor no necesita esta pantalla salvo que se diseñe un pedido de planta. |
| `creditos` | A, R y V como resultado de una venta a crédito | A; R créditos de su cartera; V créditos de su planta | Operativo: abono propio y, temporalmente, corrección autorizada | — | No debe existir eliminación de crédito. Los abonos deberían evolucionar a registros append-only para evitar reescritura destructiva del historial. |
| `gastos` | A, R y V en su caja o centro | A todo; R/V propios | A; correcciones por movimiento compensatorio | — recomendado | Gasto es movimiento de caja. No conviene permitir borrar; una corrección debe generar un movimiento inverso y dejar auditoría. |
| `cierres_caja` | A, R y V, cada uno propio | A todo; R/V propios | — | — | Comprobante inmutable de cierre. Se crea una nueva corrección o aclaración, nunca se edita el cierre original. |
| `cajas_jornada` | R, con intervención de A | A y repartidor propietario | R solo cerrar su caja abierta; A supervisa según caso | — | Caja asociada a jornada de vehículo. El vendedor necesitará una colección equivalente de caja de planta, no esta misma si los flujos son diferentes. |

### 2.5 Vehículos, medidores y jornadas de reparto

| Colección | C | R | U | D | Función y condición |
|---|---:|---:|---:|---:|---|
| `vehiculos` | A | A y repartidor para vehículos operables | A; R solo campos operativos vinculados a su jornada | — | Alta y configuración de vehículo/medidor es administrativa. El repartidor puede actualizar lectura activa o asociación temporal mediante transacciones validadas. |
| `medidores` | A | A, R y V cuando esté ligado a su operación | A | — | El medidor es fijo del vehículo o de la planta. Los precios, unidad, magnitud y cantidad por dígito son configuración administrativa. |
| `vehiculos/{id}/jornadas` | A y R propietario | A y R propietario | A y R propietario con transiciones permitidas | — | Jornada abierta, acumuladores, cierre e incidencias. El repartidor no edita libremente una jornada cerrada. |
| `jornadas/{id}/lecturas` | A y R propietario | A y R propietario | — | — | Lecturas append-only: lectura inicial, lecturas operativas y lectura de cierre. |
| `jornadas/{id}/recargas` | A y R propietario | A y R propietario | — | — | Recarga o movimiento de medidor append-only. |
| `jornadas/{id}/ventas` | A y R propietario | A y R propietario | — | — | Venta vinculada al medidor, lectura, precio y caja. Es inmutable. |
| `jornadas/{id}/cierres` | A y R propietario | A y R propietario | — | — | Cierre de jornada append-only. |
| `jornadas/{id}/incidencias` | A y R propietario | A y R propietario | — | — | Incidencias con motivo obligatorio. No se eliminan ni editan. |
| `rutas` | A y R propietario, por compatibilidad actual | A y R propietario | A y R propietario solo transiciones del flujo | — | Actualmente representa transferencias/cargas antiguas. Debe diferenciarse de `rutas_catalogo`, que representa cartera/localidad. |
| `devoluciones` | A; R solo si se decide que solicite retorno operativo | A; R/V solo su operación | A para conciliación | — recomendado | Devolución, merma y retorno de transferencia. Administración concilia. Los registros no deben borrarse. |

La colección `rutas` y las jornadas de `vehiculos/{id}/jornadas` no deben confundirse. La primera conserva compatibilidad con transferencias; la segunda es el libro de la jornada del medidor del vehículo.

## 3. Colecciones necesarias para Planta, aún no implementadas completamente

Estas colecciones no deben otorgarse como permisos genéricos de inventario al vendedor. Deben existir como operaciones específicas de planta:

| Colección propuesta | C | R | U | D | Propósito |
|---|---:|---:|---:|---:|---|
| `plantas` | A | A; V plantas asignadas | A | — | Centro operativo, medidor fijo, vendedores asignados y estado. |
| `turnos_planta` | A y V propietario | A; V propio | V solo abrir/cerrar su turno según transición | — | Sustituye la jornada de vehículo para mostrador/planta. |
| `cajas_planta` | A y V propietario | A; V propio | V solo cerrar turno abierto | — | Caja independiente de `cajas_jornada`. |
| `llenados_planta` u `operaciones_planta` | A y V | A; V propia planta | — | — | Registro append-only de llenados, consumo de vacíos, producción y medidor. |
| `movimientos_inventario` | A; V movimientos operativos | A; V propia planta | — o corrección compensatoria | — | Entrada/salida de llenos, vacíos, producción y productos externos. |
| `ventas_planta` | A y V | A; V propia planta | — | — | Venta inmutable de mostrador con SKU, precio, cliente opcional, pago y turno. |
| `abonos_planta` | A y V | A; V propia planta | — | — | Abono append-only vinculado a cliente, crédito y caja. |

El vendedor debe crear documentos operativos en estas colecciones; no debe obtener `update` libre sobre `productos.stock`, `inventario_historial`, `creditos` completos o `cajas_jornada` de repartidores.

## 4. Matriz por pantalla y función

| Pantalla o función | Admin | Repartidor | Vendedor |
|---|---|---|---|
| Inicio administrativo y alertas globales | CRUD/lectura global | — | — |
| Configuración del proyecto | C/U una vez o según documento | — | — |
| Usuarios, roles y asignaciones | C/R/U/D administrativo | — | — |
| Productos y presentaciones | C/R/U; baja lógica | No visible | No visible |
| Usar productos en ventas | Sí | Sí, SKUs activos | Sí, SKUs activos |
| Generar e imprimir códigos de barras | Sí | No como catálogo | No como catálogo |
| Escanear código de producto | Sí | Operativo si la venta lo requiere | Operativo si la venta lo requiere |
| Clientes globales | CRUD administrativo | No edición maestra; alta nueva y consulta de cartera | No edición maestra; alta nueva y consulta de planta |
| QR de clientes | Generar/consultar | Escanear cartera y abrir ticket | Consultar/escanear en planta si se decide |
| Localidades | C/U | R | R |
| Rutas/carteras | C/U | R de asignadas | — |
| Agregar cliente disponible a cartera | Sí | C en su cartera | — |
| Solicitar baja de cliente | Sí puede resolver | C solicitud con devoluciones | — inicialmente |
| Aprobar/rechazar baja | Sí | — | — |
| Venta de reparto | Sí supervisión/operación | C propia jornada | — |
| Venta de planta | Sí supervisión/operación | — | C propia planta/turno |
| Pedido para reparto | C/U/asignación | R y transiciones propias | — |
| Crédito | R global y administración | R/abono en cartera | R/abono en planta |
| Ajuste físico de inventario | C/U administrativo | — | — |
| Fabricación/llenado administrativo | Sí | — | No en historial genérico; sí en llenado operativo |
| Llenado de planta | R/supervisión | — | C propio turno |
| Recarga del medidor de vehículo | R/supervisión | C propia jornada | — |
| Lectura y cierre de jornada | R/supervisión | C propia jornada; cierre propio | — |
| Caja de reparto | R global | C/cierre propio | — |
| Caja de planta | R global | — | C/cierre propio |
| Gastos | R global/U administrativa | C y R propios si se habilita | C y R propios de planta |
| Reportes globales y exportaciones | Sí | No | No |
| Historial propio | Sí | Sí | Sí |
| GPS de cartera/jornada | Sí supervisión | C/actualización de ubicación propia | — o solo ubicación de planta si se requiere |
| Cámara/QR | Sí | Sí | Sí si el flujo lo necesita |
| CSV/Excel/backup | Sí | No | No |
| Contraseña y PIN propios | Sí | Sí | Sí |

## 5. Conflictos detectados en la implementación actual

| Conflicto | Evidencia actual | Consecuencia |
|---|---|---|
| El rol `vendedor` no existe todavía | `sesion.js` define `admin`, `usuario` y `repartidor`; las reglas usan `usuario` | El vendedor no tendrá una matriz de pantallas ni reglas propias. |
| `usuario` tiene acceso demasiado amplio | `isStaff()` considera `admin` y `usuario`; `reportes.js` excluye solo a `repartidor` | Un futuro vendedor podría heredar reportes, respaldos y lecturas globales. |
| Los permisos individuales contradicen el modelo objetivo | `permisos.js` ofrece toggles de pestañas y edición | Puede aparecer Inventario sin la pantalla de Productos o permitir combinaciones operativamente incoherentes. |
| `devoluciones` usa `usuario`, no `vendedor` | `firestore.rules` permite crear para `role() == 'usuario'` | El vendedor no podrá operar la futura lógica de planta sin cambiar reglas. |
| Clientes tiene campos de operación y datos maestros mezclados | `clientes` permite varios flujos distintos y reglas actuales muy específicas | Es necesario validar por campos: alta, asignación, GPS, estado y datos maestros no son el mismo permiso. |
| Créditos se corrigen reescribiendo el arreglo de abonos | `creditos.js` actualiza `abonos` y `saldo` | Se puede perder trazabilidad; conviene migrar a abonos append-only y ajustes compensatorios. |
| Gastos permiten crear a cualquier autenticado | Regla actual de `gastos` permite `create` si `capturadoPorUid` coincide | Debe agregarse alcance por centro, planta, jornada o caja. |
| Varias subcolecciones tienen lectura demasiado amplia | Lecturas, recargas, ventas, cierres e incidencias actuales usan `allow read: if signedIn()` | Un repartidor autenticado podría intentar consultar jornadas ajenas si conoce sus rutas; debe limitarse por propietario. |
| Inventario y venta mezclan ajustes con operaciones | `inventario_historial` y `productos.stock` se usan para funciones distintas | El vendedor no debe recibir permiso genérico de actualización de stock. |
| Configuración de vehículos y medidores debe ser administrativa | `config.js` crea vehículos y medidores; `vehiculos.js` opera jornadas | Debe mantenerse como dos niveles: configuración A y operación R. |

## 6. Funciones que no son CRUD de Firestore

Algunas capacidades deben modelarse como permisos de interfaz/dispositivo, no como CRUD:

| Función | Admin | Repartidor | Vendedor | Observación |
|---|---|---|---|---|
| Cámara y escáner QR | Sí | Sí | Sí si aplica | La base de datos debe validar que el cliente esté dentro del alcance; activar la cámara no autoriza acceso a otro cliente. |
| GPS del dispositivo | Sí | Sí para jornada/cartera | Solo si la planta lo requiere | La escritura de ubicación debe limitarse a documentos propios. |
| Imprimir QR o etiquetas | Sí | No como catálogo | No como catálogo | Es una salida local del navegador; el índice/barcode sigue protegido en Firestore. |
| Descargar CSV/Excel | Sí | No | No | Es una exportación masiva y debe ser exclusivamente administrativa. |
| WhatsApp `wa.me` | Sí | Sí | Sí | Es un enlace externo; no constituye permiso CRUD. No incluir tokens ni credenciales. |
| Cambio de contraseña | Cada usuario propio | Propio | Propio | Firebase Auth, no edición del rol en Firestore. |
| PIN local | Cada usuario propio | Propio | Propio | Persistencia local; no es autorización backend. |
| Borradores locales | Cada usuario propio | Propio | Propio | No contienen permisos ni datos que deban compartirse entre cuentas. |
| Mapa offline | A/R según pantalla | Propio | — | Cache local del dispositivo; no sustituye las reglas de Firestore. |

## 7. Decisión recomendada para el modelo final

La administración debe dejar de configurar permisos CRUD por persona como comportamiento normal. El modelo estable debe ser:

```text
usuario
  role: admin | repartidor | vendedor
  activo: boolean
  centroOperativoId: opcional
  plantaIds: []
  carteraIds: []
  vehiculoIds: []

alcance de lectura/escritura
  propio usuario
  propia jornada o turno
  propia cartera o planta
  propios comprobantes y movimientos
```

Los permisos individuales actuales se pueden leer durante una migración, pero no deben reactivar pantallas incompatibles con el rol. La navegación debe construirse desde una matriz fija por rol, y Firestore debe comprobar además el alcance del documento.

## 8. Secuencia antes de escribir código

1. Crear la tabla definitiva de pantallas por rol y los nombres exactos: `Mi Jornada`, `Mi Cartera`, `Planta`, `Mi Historial`, `Caja de planta`, etc.
2. Mantener `usuario` como alias temporal y migrar sus perfiles a `vendedor`.
3. Definir `plantaId`, `centroOperativoId`, `turnoId`, `cajaId`, `jornadaId` y `repartidorId` como campos de alcance obligatorios donde correspondan.
4. Diseñar las reglas Firestore nuevas antes de cambiar la navegación.
5. Cambiar el shell para redirigir por rol y mostrar únicamente pantallas útiles.
6. Separar Clientes en modo administración, modo cartera de repartidor y modo clientes de planta.
7. Separar el inventario administrativo de los movimientos operativos de planta.
8. Crear ventas y abonos append-only en los flujos de reparto y planta.
9. Probar acceso positivo y negativo con tres cuentas reales de prueba.
10. Desplegar reglas e índices solo después de validar que cada consulta real coincide con su nuevo alcance.

**Este documento no modifica el código actual.** Las diferencias detectadas deben aprobarse antes de comenzar la migración.
