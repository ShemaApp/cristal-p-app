# Especificación técnica integral del módulo de planta

**Proyecto:** Flutt-Water
**Firebase:** `flutt-water`
**Stack actual:** PWA Vanilla JavaScript, Firebase Authentication, Cloud Firestore, Service Worker e IndexedDB
**Versión del documento:** 1.0
**Fecha:** 20 de agosto de 2026
**Estado:** Diseño técnico para revisión; no representa todavía un despliegue en producción.

> **Principio rector:** una operación genera movimientos. Los saldos, existencias, totales, diferencias y reportes son proyecciones derivadas de esos movimientos; no deben corregirse modificando silenciosamente un total.

---

## 1. Propósito y alcance

El módulo de planta convertirá la venta pública actual en una unidad operativa completa capaz de registrar **rellenos de envases de clientes, producción de productos terminados, venta de productos, venta de agua medida, cobro de créditos, caja, inventario y conciliaciones**.

La planta será una unidad operativa estacionaria y no deberá mezclarse con las jornadas de reparto. El vendedor trabajará sobre una planta y un medidor estacionario asignados. El repartidor continuará trabajando sobre su vehículo, jornada y medidor móvil. Ambos roles podrán compartir capacidades de venta y cobro, pero sus ámbitos operativos y datos deben permanecer separados.

El alcance incluye:

| Área | Incluida |
|---|---:|
| Colecciones, documentos, campos y relaciones | Sí |
| Transacciones atómicas | Sí |
| Cloud Functions | Sí |
| Idempotencia | Sí |
| Funcionamiento offline | Sí |
| Índices compuestos | Sí |
| Reglas de Firestore | Sí |
| Movimientos de agua, inventario, caja y cuentas por cobrar | Sí |
| Conciliación de medidor, inventario, efectivo y créditos | Sí |
| Auditoría e incidencias | Sí |
| Migración progresiva desde el modelo actual | Sí |
| Integración WhatsApp Business | No; continúa `wa.me` |
| GPS y mapas | No |
| Registro público de usuarios | No |

## 2. Decisiones de negocio consolidadas

### 2.1 Roles oficiales

Se conservan únicamente tres roles efectivos:

| Rol | Unidad principal | Capacidades relevantes |
|---|---|---|
| `admin` | Toda la empresa | Configuración, inventario, usuarios, plantas, vehículos, conciliaciones, auditoría y aprobaciones. |
| `vendedor` | Planta | Llenados, ventas públicas, ventas de agua medida, productos, caja y abonos de cualquier cliente. |
| `repartidor` | Vehículo | Jornada propia, venta QR/manual, salida de agua, caja propia y créditos de su ámbito autorizado. |

El rol heredado `usuario` continúa mapeándose a `vendedor` mediante `rolEfectivo()` mientras existan perfiles antiguos.

### 2.2 Planta y vehículo son unidades diferentes

La colección existente `vehiculos` se reutilizará inicialmente para no romper datos históricos, pero cada documento deberá declarar explícitamente:

```text
tipoUnidad = "vehiculo" | "planta"
```

Una planta tendrá `tipoUnidad: "planta"`, un medidor estacionario y un operador o conjunto de operadores autorizados. Un vehículo tendrá `tipoUnidad: "vehiculo"`, un medidor fijo del vehículo y uno o más repartidores autorizados según el modelo de asignación vigente.

No se utilizará `rutaId`, `transferenciaId` ni cartera de reparto como requisito para las operaciones de planta.

### 2.3 Medidor ascendente

La lectura física del medidor siempre es ascendente:

```text
lecturaNueva > ultimaLecturaRegistrada
```

Una lectura menor, igual o repetida se rechaza. El movimiento de agua puede expresarse como salida negativa, pero nunca se decrementa la lectura física:

```text
lecturaAnterior = 10000.00
lecturaNueva    = 10050.00
salidaMedida    = 50.00
movimientoAgua  = -50.00
```

Esta regla se aplica al inicio de jornada, a cada venta o llenado, a la sincronización offline y al cierre.

### 2.4 Separación de operación comercial y efecto físico

Los conceptos no deben confundirse:

```text
VENTA       ≠ LLENADO       ≠ PRODUCCIÓN       ≠ ABONO
```

Una venta puede generar caja o cuenta por cobrar. Un llenado de producción puede generar inventario terminado sin generar caja. Un abono genera caja y disminuye cuentas por cobrar, pero no modifica la venta original ni el medidor.

### 2.5 Inventario por presentación

Cada presentación es un SKU independiente. Vender un saco de hielo de 25 kg no descuenta una bolsa de 10 kg aunque ambos contengan hielo. Las existencias se controlan por `productoId` y unidad de inventario, no por equivalencia abstracta de contenido.

### 2.6 Inmutabilidad y correcciones

No se borran ni se editan libremente ventas, lecturas, operaciones de planta, movimientos de inventario, movimientos de caja, abonos aprobados, cierres ni incidencias. Una corrección futura deberá ser una reversa o ajuste autorizado que conserve el registro original.

La cancelación y reapertura de jornadas no se habilitarán hasta diseñar sus efectos inversos sobre agua, inventario, caja, cuentas por cobrar y auditoría.

## 3. Modelo conceptual de operaciones

### 3.1 Relleno del envase del cliente

```text
Lectura del medidor aumenta
Movimiento de agua: -cantidadMedida
Inventario propio de envases: sin cambio
Venta: +importe
Caja: +importe si es efectivo
Cuenta por cobrar: +importe si es crédito
```

### 3.2 Producción de producto terminado

Ejemplo: llenar 50 botellas de 1 litro.

```text
Lectura del medidor aumenta 50 L
Movimiento de agua: -50 L
Vacíos: -50 unidades
Llenos: +50 unidades
Venta: no se genera
Caja: no se genera
```

La venta posterior de una botella descuenta el producto lleno, pero no vuelve a consumir el medidor.

### 3.3 Venta de producto terminado o externo

```text
Lectura del medidor: sin cambio
Inventario de llenos/externos: -cantidad
Venta: +importe
Caja o cuenta por cobrar: según forma de pago
Costo de venta: costo de la presentación
```

### 3.4 Venta de agua medida en planta

```text
Lectura del medidor aumenta
Movimiento de agua: -cantidadMedida
Envase del cliente: sin cambio
Venta: +importe
Caja o cuenta por cobrar: según forma de pago
```

### 3.5 Pago de crédito en planta

```text
Venta original: no cambia
Movimiento de caja: +importeAbono
Movimiento de cuenta por cobrar: -importeAbono
Medidor: sin cambio
Inventario: sin cambio
```

## 4. Colecciones y documentos

Se conservarán las colecciones actuales cuando sean compatibles y se añadirán libros de movimientos para hacer explícitos los efectos. No se crearán colecciones duplicadas que representen la misma entidad.

### 4.1 `vehiculos/{vehiculoId}`

Se utiliza para vehículos y plantas durante la transición.

```json
{
  "nombre": "Planta principal",
  "tipoUnidad": "planta",
  "activo": true,
  "medidorId": "medidor_planta_01",
  "numeroSerieMedidor": "M-PLANTA-01",
  "tipoFlujoMedidor": "volumen_acumulado",
  "unidadMedida": "L",
  "cantidadPorDigito": 10,
  "factorLitrosPorUnidad": 10,
  "operadorUids": ["uid_vendedor_01"],
  "repartidorIds": [],
  "rutaBaseId": "",
  "ultimaLectura": 15240.50,
  "ultimaLecturaEn": "Timestamp",
  "creadoPorUid": "uid_admin",
  "creadoEn": "Timestamp"
}
```

Para compatibilidad, los documentos existentes de vehículos podrán conservar `repartidorIds`, pero en una planta deberá permanecer vacío.

### 4.2 `medidores/{medidorId}`

```json
{
  "numeroSerie": "M-PLANTA-01",
  "tipoFlujo": "volumen_acumulado",
  "unidad": "L",
  "cantidadPorDigito": 10,
  "unidadOperativaId": "planta_01",
  "unidadOperativaTipo": "planta",
  "activo": true,
  "ultimaLectura": 15240.50,
  "ultimaLecturaEn": "Timestamp",
  "configVersion": 1
}
```

La lectura es un valor acumulado y nunca se utiliza como saldo negativo. La salida de agua se calcula por diferencia entre lecturas.

### 4.3 `vehiculos/{vehiculoId}/jornadas/{jornadaId}`

Se reutiliza para turnos de vehículo y turnos de planta.

```json
{
  "unidadOperativaId": "planta_01",
  "unidadOperativaTipo": "planta",
  "vehiculoId": "planta_01",
  "medidorId": "medidor_planta_01",
  "operadorUid": "uid_vendedor_01",
  "operadorNombre": "Vendedor Planta",
  "estado": "activa",
  "lecturaCierreAnterior": 15240.50,
  "lecturaInicial": 15241.20,
  "ultimaLectura": 15241.20,
  "lecturaFinal": null,
  "requiereMotivo": false,
  "motivoDesfase": "",
  "abiertaEn": "Timestamp",
  "cerradaEn": null,
  "requestIdApertura": "uuid",
  "version": 1
}
```

Estados válidos iniciales:

```text
activa | cerrando | cerrada | con_diferencia
```

### 4.4 Subcolección `lecturas`

Ruta:

```text
vehiculos/{vehiculoId}/jornadas/{jornadaId}/lecturas/{lecturaId}
```

```json
{
  "tipo": "inicio | salida_agua | cierre",
  "lectura": 15260.20,
  "lecturaAnterior": 15241.20,
  "cantidadMedida": 19.00,
  "unidad": "L",
  "origenTipo": "venta_agua | llenado_produccion | cierre",
  "origenId": "operacion_01",
  "capturadoPorUid": "uid_vendedor_01",
  "fechaHora": "Timestamp",
  "requestId": "uuid",
  "inmutable": true
}
```

### 4.5 `operaciones_planta/{operacionId}`

Representa un acontecimiento de planta, no necesariamente una venta.

```json
{
  "tipo": "llenado_produccion | relleno_cliente | venta_agua_medida | merma_agua | ajuste_agua",
  "estado": "pendiente | confirmada | rechazada | con_incidencia",
  "unidadOperativaId": "planta_01",
  "jornadaId": "jornada_01",
  "medidorId": "medidor_planta_01",
  "productoId": "botella_1l_llena",
  "clienteId": null,
  "lecturaAnterior": 15241.20,
  "lecturaNueva": 15301.20,
  "cantidadMedida": 60.00,
  "unidadMedida": "L",
  "cantidadProducto": 60,
  "unidadProducto": "pieza",
  "requestId": "uuid",
  "idempotencyKey": "planta_01_uuid",
  "capturadoPorUid": "uid_vendedor_01",
  "fechaHora": "Timestamp",
  "motivo": "Producción de botellas 1L"
}
```

### 4.6 `productos/{productoId}`

Se mantiene el catálogo actual y se añaden campos de clasificación.

```json
{
  "nombre": "Botella 1 L llena",
  "activo": true,
  "tipoInventario": "lleno",
  "productoBaseId": "agua_purificada",
  "unidadInventario": "pieza",
  "unidadMedida": "pieza",
  "contenidoPorUnidad": 1,
  "unidadContenido": "L",
  "stock": 60,
  "costoUnitario": 4.50,
  "precioActivoId": "precio_01",
  "permiteDecimales": false,
  "presentacionClave": "botella_1l_llena"
}
```

Valores válidos de `tipoInventario`:

```text
vacio | lleno | externo | insumo | servicio
```

`stock` será una proyección de conveniencia. La fuente auditable será `movimientos_inventario`.

### 4.7 `movimientos_inventario/{movimientoId}`

```json
{
  "tipo": "entrada_produccion | salida_venta | salida_merma | entrada_compra | ajuste_entrada | ajuste_salida | reversa",
  "productoId": "botella_1l_llena",
  "cantidad": 60,
  "unidad": "pieza",
  "stockAnterior": 0,
  "stockResultante": 60,
  "costoUnitario": 4.50,
  "costoTotal": 270.00,
  "origenTipo": "operacion_planta",
  "origenId": "operacion_01",
  "unidadOperativaId": "planta_01",
  "jornadaId": "jornada_01",
  "usuarioUid": "uid_vendedor_01",
  "fechaHora": "Timestamp",
  "requestId": "uuid",
  "inmutable": true
}
```

### 4.8 `movimientos_agua/{movimientoId}`

```json
{
  "tipo": "salida_relleno | salida_produccion | salida_venta | ajuste_autorizado",
  "medidorId": "medidor_planta_01",
  "unidadOperativaId": "planta_01",
  "jornadaId": "jornada_01",
  "lecturaAnterior": 15241.20,
  "lecturaNueva": 15301.20,
  "cantidad": -60.00,
  "unidad": "L",
  "origenTipo": "operacion_planta",
  "origenId": "operacion_01",
  "usuarioUid": "uid_vendedor_01",
  "fechaHora": "Timestamp",
  "requestId": "uuid",
  "inmutable": true
}
```

El campo `cantidad` representa el efecto sobre la disponibilidad de agua. La lectura física continúa siendo ascendente.

### 4.9 `notas/{notaId}`

La nota sigue siendo el comprobante comercial.

```json
{
  "origen": "planta_publico_general | planta_agua_medida | planta_producto",
  "tipoVenta": "relleno_cliente | producto_terminado | producto_externo | agua_medida",
  "unidadOperativaId": "planta_01",
  "jornadaId": "jornada_01",
  "clienteId": "publico_general",
  "items": [],
  "cantidadMedida": 19,
  "unidadMedida": "L",
  "total": 240,
  "formaPago": "efectivo | transferencia | credito",
  "estado": "registrada",
  "capturadoPorUid": "uid_vendedor_01",
  "fecha": "Timestamp",
  "requestId": "uuid",
  "inmutable": true
}
```

### 4.10 `movimientos_caja/{movimientoId}`

```json
{
  "tipo": "apertura | venta_efectivo | abono_fiado | salida_autorizada | devolucion | cierre",
  "cajaId": "caja_planta_01",
  "jornadaId": "jornada_01",
  "unidadOperativaId": "planta_01",
  "importe": 400,
  "signo": 1,
  "formaPago": "efectivo",
  "origenTipo": "nota | abono | cierre",
  "origenId": "nota_01",
  "usuarioUid": "uid_vendedor_01",
  "fechaHora": "Timestamp",
  "requestId": "uuid",
  "inmutable": true
}
```

### 4.11 `creditos/{creditoId}` y `creditos/{creditoId}/abonos/{abonoId}`

Se conserva la subcolección actual de abonos pendientes.

```json
{
  "clienteId": "cliente_01",
  "notaOrigenId": "nota_01",
  "totalOriginal": 400,
  "saldoProyectado": 400,
  "estado": "vigente | liquidado | con_abono_pendiente",
  "cobradorUids": ["uid_repartidor_01", "uid_vendedor_01"],
  "capturadoPorUid": "uid_repartidor_01",
  "fecha": "Timestamp"
}
```

```json
{
  "importe": 200,
  "formaPago": "efectivo",
  "estado": "pendiente | aprobado | rechazado",
  "capturadoPorUid": "uid_vendedor_01",
  "aprobadoPorUid": null,
  "motivoRechazo": "",
  "requestId": "uuid",
  "fecha": "Timestamp",
  "aprobadoEn": null
}
```

El saldo no debe modificarse directamente por la interfaz. La aprobación de un abono genera el movimiento de caja y el movimiento de cuenta por cobrar dentro de una transacción o función idempotente.

### 4.12 `movimientos_cuentas_por_cobrar/{movimientoId}`

```json
{
  "tipo": "venta_credito | abono_aprobado | reversa_abono | ajuste_autorizado",
  "clienteId": "cliente_01",
  "creditoId": "credito_01",
  "importe": 200,
  "signo": -1,
  "origenTipo": "abono",
  "origenId": "abono_01",
  "usuarioUid": "uid_admin",
  "fechaHora": "Timestamp",
  "requestId": "uuid",
  "inmutable": true
}
```

### 4.13 `auditoria_eventos/{eventoId}`

```json
{
  "accion": "CREAR_VENTA | REGISTRAR_LLENADO | APROBAR_ABONO | CERRAR_JORNADA | AJUSTAR_INVENTARIO",
  "recursoTipo": "nota | operacion_planta | producto | credito | jornada",
  "recursoId": "operacion_01",
  "usuarioUid": "uid_admin",
  "usuarioRol": "admin",
  "antes": null,
  "despues": {},
  "motivo": "Diferencia física autorizada",
  "autorizadoPorUid": "uid_admin",
  "fechaHora": "Timestamp",
  "requestId": "uuid"
}
```

### 4.14 `operaciones_pendientes/{requestId}`

Cola durable para operaciones creadas offline o enviadas a una Cloud Function.

```json
{
  "requestId": "uuid-v4",
  "idempotencyKey": "planta_01_uuid-v4",
  "tipo": "venta | llenado | abono | cierre",
  "estado": "pendiente | procesando | confirmada | rechazada | conflicto",
  "payloadVersion": 1,
  "payload": {},
  "unidadOperativaId": "planta_01",
  "jornadaId": "jornada_01",
  "creadoPorUid": "uid_vendedor_01",
  "creadoEn": "Timestamp",
  "procesadoEn": null,
  "resultadoId": null,
  "errorCodigo": null,
  "errorMensaje": null
}
```

### 4.15 `idempotencia/{idempotencyKey}`

```json
{
  "scope": "planta_01",
  "requestId": "uuid-v4",
  "tipoOperacion": "llenado",
  "estado": "procesando | confirmada | rechazada",
  "resultadoTipo": "operacion_planta",
  "resultadoId": "operacion_01",
  "respuestaHash": "sha256",
  "creadoEn": "Timestamp",
  "actualizadoEn": "Timestamp"
}
```

## 5. Relaciones principales

```text
usuarios/{uid}
      │
      └── operadorUids[] ── vehiculos/{unidadOperativaId}
                                  │
                                  ├── medidorId ── medidores/{medidorId}
                                  └── jornadas/{jornadaId}
                                             │
                                             ├── lecturas/{lecturaId}
                                             ├── ventas/{ventaId}
                                             ├── cierres/{cierreId}
                                             └── incidencias/{incidenciaId}

vehiculos/{plantaId}/jornadas/{jornadaId}
      │
      ├── operaciones_planta/{operacionId}  [referencia lógica]
      ├── notas/{notaId}                    [referencia lógica]
      ├── movimientos_agua/{id}
      ├── movimientos_inventario/{id}
      ├── movimientos_caja/{id}
      └── movimientos_cxc/{id}

productos/{productoId}
      │
      ├── movimientos_inventario/{movimientoId}
      └── notas.items[]

clientes/{clienteId}
      │
      ├── notas
      ├── creditos
      └── movimientos_cuentas_por_cobrar
```

En la primera implementación se podrán conservar los libros de movimientos como colecciones raíz para facilitar reportes globales, siempre incluyendo `unidadOperativaId`, `jornadaId`, `origenTipo` y `origenId`.

## 6. Transacciones obligatorias

Firestore permite operaciones atómicas: una transacción no aplica escrituras parciales y puede reintentarse ante conflictos; las lecturas deben ocurrir antes de las escrituras. Las transacciones de cliente fallan cuando el dispositivo está offline, mientras que las escrituras por lote pueden ejecutarse offline y quedar sincronizadas después.[1]

### 6.1 Abrir jornada de planta

**Entradas:** `unidadOperativaId`, `operadorUid`, `lecturaInicial`, `requestId`.

**Lecturas:** unidad operativa, medidor, última jornada abierta, última lectura.

**Validaciones:**

```text
unidad.tipoUnidad == planta
unidad.activo == true
operadorUid autorizado
no existe otra jornada abierta para el mismo medidor
lecturaInicial > ultimaLectura
requestId no procesado
```

**Escrituras atómicas:**

```text
jornada nueva
lectura de tipo inicio
actualización de medidor.ultimaLectura
idempotencia confirmada
auditoría de apertura
```

### 6.2 Registrar llenado de producción

**Entradas:** producto lleno, producto vacío, cantidad, lectura nueva, `requestId`.

**Validaciones:**

```text
jornada activa
operador autorizado
producto lleno tipoInventario == lleno
producto vacío tipoInventario == vacio
cantidad > 0
cantidad entera si la presentación lo exige
stock vacío >= cantidad
lecturaNueva > jornada.ultimaLectura
cantidadMedida coincide con lecturaNueva - jornada.ultimaLectura
idempotencyKey no procesada
```

**Efectos atómicos:**

```text
- cantidad de producto vacío
+ cantidad de producto lleno
- cantidadMedida en movimiento de agua
+ movimiento de inventario para llenos
- movimiento de inventario para vacíos
+ operación_planta confirmada
+ lectura de salida
+ actualización jornada.ultimaLectura
+ auditoría
```

La escritura deberá ejecutarse mediante función de servidor en el modelo objetivo. En transición, si se ejecuta desde el cliente, deberá obligarse a incluir todos los documentos relacionados y validarse con `getAfter()` en reglas.

### 6.3 Registrar relleno de cliente

**Entradas:** `clienteId` opcional, cantidad medida, lectura nueva, precio, forma de pago.

**Validaciones:**

```text
jornada activa
operador autorizado
lecturaNueva > jornada.ultimaLectura
cantidadMedida == lecturaNueva - jornada.ultimaLectura
cliente identificado si formaPago == credito
```

**Efectos:**

```text
- movimiento de agua
+ nota de venta
+ movimiento de caja si efectivo
+ movimiento de cuenta por cobrar y crédito si crédito
+ lectura de salida
+ actualización jornada.ultimaLectura
+ auditoría
```

No se descuenta inventario de envases si el garrafón pertenece al cliente.

### 6.4 Registrar venta de producto terminado o externo

**Entradas:** carrito de productos, cantidades, cliente, forma de pago, `requestId`.

**Validaciones:**

```text
producto activo
stock suficiente por cada SKU
cantidad válida
cliente identificado si crédito
jornada/caja activa cuando la venta sea de planta
```

**Efectos:**

```text
- stock del producto
+ nota
+ movimiento de inventario tipo salida_venta
+ movimiento de caja o cuenta por cobrar
+ costo de venta
+ auditoría
```

No se modifica la lectura del medidor si se vende un producto que ya estaba producido.

### 6.5 Registrar abono pendiente y aprobarlo

La captura del abono crea una subcolección pendiente y no modifica el saldo aprobado. La aprobación administrativa ejecuta una transacción que:

```text
lee abono pendiente
verifica estado == pendiente
verifica importe > 0
crea movimiento de caja
crea movimiento de cuenta por cobrar
actualiza el saldo proyectado o snapshot
cambia abono a aprobado
registra aprobador y fecha
crea auditoría
```

Si la operación ya fue aprobada, una repetición con la misma idempotencia debe devolver el resultado anterior sin duplicar efectivo ni reducir nuevamente el saldo.

### 6.6 Cerrar jornada

**Validaciones:**

```text
jornada activa
lecturaCierre > jornada.ultimaLectura
no existe operación pendiente crítica
```

**Efectos:**

```text
lectura de cierre
conciliación de medidor
conciliación de caja
cierre de jornada
auditoría
```

La existencia de una diferencia no debe borrar ni editar ventas. La jornada puede quedar `cerrada` y `con_diferencia`, o quedar `cerrando` hasta que administración confirme el cierre, según la política final elegida.

## 7. Cloud Functions

### 7.1 Principio de autoridad

Las operaciones que afectan simultáneamente agua, inventario, caja, crédito y auditoría deben ejecutarse mediante una API de servidor o una Cloud Function callable. El cliente no debe poder escribir directamente los libros canónicos de movimientos en el modelo final.

Funciones recomendadas:

| Función | Responsabilidad |
|---|---|
| `abrirJornadaOperativa` | Validar unidad, operador y lectura inicial. |
| `registrarLlenadoPlanta` | Ejecutar producción, inventario, agua y lectura. |
| `registrarVentaPlanta` | Ejecutar venta de agua o productos, caja/crédito e inventario. |
| `registrarAbono` | Crear abono pendiente con idempotencia. |
| `aprobarAbono` | Aplicar caja y cuenta por cobrar. |
| `cerrarJornadaOperativa` | Cerrar, conciliar y registrar diferencias. |
| `procesarOperacionPendiente` | Procesar la cola offline creada por el cliente. |
| `reconstruirProyecciones` | Recalcular snapshots administrativos desde movimientos; solo admin. |
| `emitirNotificacionesOperacion` | Notificar diferencias, rechazos y aprobaciones. |

Las Cloud Functions deben ser idempotentes y producir el mismo resultado aunque reciban más de una invocación del mismo evento.[3]

### 7.2 Triggers versus comandos

Los comandos críticos deben ser funciones callable/HTTPS o procesadores de una cola. Los triggers `onCreate` deben reservarse para tareas derivadas como notificaciones, materialización de reportes o auditoría complementaria. No se debe repartir la autoridad entre el cliente y varios triggers que puedan duplicar movimientos.

### 7.3 Reintentos

Cada función debe:

1. Recibir `requestId` e `idempotencyKey`.
2. Leer `idempotencia/{idempotencyKey}` dentro de la transacción.
3. Devolver el resultado almacenado si está `confirmada`.
4. Reservar el procesamiento si está `pendiente`.
5. Escribir todos los efectos y marcar `confirmada` en una operación atómica.
6. Guardar error estructurado si la operación es rechazada.

## 8. Idempotencia

La idempotencia es obligatoria para evitar duplicados por doble toque, reintentos de red, refresh, reenvío offline o reintentos automáticos de Cloud Functions.

### 8.1 Reglas

```text
requestId = UUID generado antes del primer intento
idempotencyKey = unidadOperativaId + ':' + requestId
```

Nunca se debe generar un nuevo ID al reintentar la misma operación. El documento final puede usar `requestId` como ID determinista o mantener un índice único lógico en `idempotencia`.

### 8.2 Resultado de repetición

Una repetición confirmada debe devolver:

```json
{
  "ok": true,
  "replayed": true,
  "resultadoId": "operacion_01",
  "estado": "confirmada"
}
```

Nunca debe crear una segunda nota, segundo movimiento de caja, segundo descuento de stock o segundo abono.

## 9. Funcionamiento offline

En la PWA web, la persistencia offline de Firestore debe configurarse explícitamente con IndexedDB. Firestore puede leer, escuchar, consultar y encolar escrituras contra la caché persistente; al volver la conexión, sincroniza los cambios. La documentación oficial advierte que, para varios cambios sobre el mismo documento, la política general es `last write wins`, por lo que los documentos críticos no deben depender de actualizaciones offline ciegas.[2]

### 9.1 Política propuesta

| Tipo de operación | Offline | Tratamiento |
|---|---:|---|
| Consulta de catálogo cacheado | Sí | Mostrar indicador `fromCache` si la información puede estar desactualizada. |
| Captura de venta | Sí | Crear `operaciones_pendientes` con payload inmutable. |
| Captura de llenado | Sí | Crear solicitud pendiente; no confirmar como canónica hasta servidor. |
| Abono | Sí | Crear solicitud pendiente, no marcar aprobado. |
| Cierre | Sí | Capturar solicitud, pero confirmar cierre al servidor. |
| Transacción directa cliente | No como autoridad final | Las transacciones de cliente fallan offline.[1] |
| Escritura por lote | Sí, con límites | Útil para outbox, no sustituye la validación de servidor.[1] |

### 9.2 Estados de la outbox

```text
pendiente → enviando → confirmada
                    ↘ rechazada
                    ↘ conflicto
```

Una operación con conflicto de lectura, stock insuficiente, jornada cerrada o idempotencia duplicada debe conservarse para diagnóstico. El usuario no debe poder editar silenciosamente el payload original.

### 9.3 Reglas de sincronización

La aplicación debe mostrar:

```text
Pendiente de sincronizar
Confirmada por servidor
Rechazada: motivo
Conflicto de lectura: requiere revisión
```

Al existir conflicto de medidor, no se debe inventar una nueva lectura ni avanzar el medidor localmente como si el servidor hubiera confirmado la operación.

## 10. Reglas de Firestore

La arquitectura final deberá usar reglas de Firestore como segunda barrera, aunque las operaciones complejas se ejecuten por Cloud Functions. El SDK Admin de las Cloud Functions escribe con privilegios de servidor, por lo que la función debe validar explícitamente autorización y datos antes de escribir.

### 10.1 Principios normativos

```text
signedIn()
+ rol efectivo correcto
+ unidad operativa asignada
+ jornada activa propia
+ estado permitido
+ campos inmutables
+ requestId válido
= escritura permitida
```

### 10.2 Colecciones protegidas

| Colección | Cliente operativo | Admin SDK/servidor |
|---|---|---|
| `operaciones_pendientes` | Crear la propia; no actualizar/eliminar | Leer y procesar |
| `operaciones_planta` | Solo lectura o creación transitoria controlada | Crear y confirmar |
| `movimientos_agua` | Sin escritura directa en modelo final | Crear |
| `movimientos_inventario` | Sin escritura directa en modelo final | Crear |
| `movimientos_caja` | Sin escritura directa en modelo final | Crear |
| `movimientos_cuentas_por_cobrar` | Sin escritura directa en modelo final | Crear |
| `auditoria_eventos` | Sin escritura directa | Crear |
| `productos.stock` | No actualización directa del cliente operativo | Actualizar proyección |
| `notas` | Crear solo mediante flujo autorizado/transitorio | Crear |
| `creditos/{id}/abonos` | Crear abono pendiente según rol | Aprobar/rechazar |

### 10.3 Esqueleto de reglas objetivo

El siguiente fragmento es un contrato de diseño, no debe desplegarse sin adaptarlo a los helpers y nombres existentes:

```text
function signedIn() {
  return request.auth != null;
}

function isAdmin() {
  return signedIn() && userRole(request.auth.uid) == 'admin';
}

function isVendedor() {
  return signedIn() && effectiveRole(request.auth.uid) == 'vendedor';
}

function ownsPlant(unitId) {
  return get(/databases/$(database)/documents/vehiculos/$(unitId)).data.tipoUnidad == 'planta'
      && request.auth.uid in get(/databases/$(database)/documents/vehiculos/$(unitId)).data.operadorUids;
}

function jornadaActiva(unitId, jornadaId) {
  return get(/databases/$(database)/documents/vehiculos/$(unitId)/jornadas/$(jornadaId)).data.estado == 'activa';
}

match /operaciones_pendientes/{requestId} {
  allow create: if signedIn()
    && request.resource.data.requestId == requestId
    && request.resource.data.creadoPorUid == request.auth.uid
    && request.resource.data.estado == 'pendiente';
  allow read: if isAdmin() || resource.data.creadoPorUid == request.auth.uid;
  allow update, delete: if false;
}

match /movimientos_agua/{id} {
  allow read: if isAdmin() || isVendedor();
  allow write: if false;
}

match /movimientos_inventario/{id} {
  allow read: if isAdmin() || isVendedor();
  allow write: if false;
}

match /movimientos_caja/{id} {
  allow read: if isAdmin() || isVendedor();
  allow write: if false;
}
```

### 10.4 Uso de `getAfter()`

Si durante la transición se permiten escrituras cliente de varios documentos, las reglas deben validar que el estado posterior de jornada, lectura y movimientos sea consistente mediante `getAfter()`. Firestore permite usar `getAfter()` para validar el estado posterior de una operación atómica antes de confirmar el commit.[1]

Debe tenerse en cuenta el límite de llamadas de documentos en reglas: una operación atómica tiene un límite adicional de 20 accesos, además del límite por escritura individual.[1] Por eso se debe evitar diseñar una sola transacción cliente que lea decenas de productos y movimientos.

## 11. Índices compuestos

Firestore crea índices simples automáticamente, pero las combinaciones de filtros y ordenamientos requieren índices manuales.[4] La siguiente lista es la propuesta mínima para las consultas del módulo de planta. Debe validarse contra las consultas reales antes del despliegue.

```json
{
  "indexes": [
    {
      "collectionGroup": "operaciones_planta",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "unidadOperativaId", "order": "ASCENDING" },
        { "fieldPath": "estado", "order": "ASCENDING" },
        { "fieldPath": "fechaHora", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "operaciones_planta",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "capturadoPorUid", "order": "ASCENDING" },
        { "fieldPath": "fechaHora", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "movimientos_inventario",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "productoId", "order": "ASCENDING" },
        { "fieldPath": "fechaHora", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "movimientos_inventario",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "unidadOperativaId", "order": "ASCENDING" },
        { "fieldPath": "tipo", "order": "ASCENDING" },
        { "fieldPath": "fechaHora", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "movimientos_agua",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "medidorId", "order": "ASCENDING" },
        { "fieldPath": "fechaHora", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "movimientos_caja",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "cajaId", "order": "ASCENDING" },
        { "fieldPath": "fechaHora", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "movimientos_cuentas_por_cobrar",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "clienteId", "order": "ASCENDING" },
        { "fieldPath": "fechaHora", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "auditoria_eventos",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "recursoTipo", "order": "ASCENDING" },
        { "fieldPath": "recursoId", "order": "ASCENDING" },
        { "fieldPath": "fechaHora", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "creditos",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "clienteId", "order": "ASCENDING" },
        { "fieldPath": "estado", "order": "ASCENDING" },
        { "fieldPath": "fecha", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

La forma exacta de `firestore.indexes.json` debe ajustarse a la sintaxis ya existente del repositorio y no debe reemplazar índices actualmente habilitados sin comparación previa.

## 12. Conciliaciones

Las conciliaciones son tres procesos distintos y no deben mezclarse.

### 12.1 Conciliación de medidor

```text
consumoMedidor = lecturaFinal - lecturaInicial
consumoOperaciones = SUM(cantidadMedida de operaciones confirmadas)
diferenciaAgua = consumoMedidor - consumoOperaciones
```

Estados sugeridos:

```text
cuadrada | con_diferencia | pendiente_revisión
```

### 12.2 Conciliación de inventario

```text
existenciaEsperada = existenciaInicial
                  + entradas
                  - salidas
                  - mermas
                  + reversas

existenciaEsperada VS existenciaFisica
```

Una diferencia genera `incidencia_inventario` o `ajuste_inventario` autorizado. No se permite editar `productos.stock` para ocultarla.

### 12.3 Conciliación de efectivo

```text
efectivoEsperado = efectivoInicial
                 + ventasEfectivo
                 + abonosAprobados
                 - devoluciones
                 - salidasAutorizadas

efectivoEsperado VS efectivoContado
```

La diferencia se conserva con monto, motivo, usuario y autorización. El sistema no debe convertir artificialmente el efectivo contado en el esperado.

### 12.4 Conciliación de cuentas por cobrar

```text
saldoDerivado = ventasCredito
              - abonosAprobados
              + reversas
              ± ajustesAutorizados
```

Los abonos pendientes no reducen el saldo aprobado hasta que administración los apruebe.

## 13. Auditoría y notificaciones

Cada operación sensible debe poder responder:

```text
Quién
Qué hizo
Cuándo
Sobre qué registro
Valor anterior
Valor resultante
Motivo
Quién autorizó
```

Se generarán notificaciones para:

| Evento | Destinatario |
|---|---|
| Lectura no ascendente | Operador y admin |
| Diferencia de medidor | Admin y operador de la jornada |
| Diferencia de inventario | Admin |
| Diferencia de caja | Admin y vendedor |
| Abono pendiente | Admin |
| Abono aprobado/rechazado | Capturista y admin |
| Operación offline rechazada | Operador y admin si es crítica |
| Intento de duplicado | Admin en auditoría |

Las notificaciones informan; no modifican la operación original.

## 14. Criterios de aceptación

### 14.1 Configuración

- [ ] Admin puede crear una unidad `tipoUnidad: planta`.
- [ ] La planta exige medidor estacionario, unidad y factor configurados.
- [ ] Se puede asignar uno o más vendedores autorizados.
- [ ] Una planta no aparece como vehículo de reparto.
- [ ] Un vehículo no aparece como planta por inferencia; el tipo es explícito.

### 14.2 Medidor

- [ ] La lectura inicial debe ser mayor que la última lectura registrada.
- [ ] Una lectura igual o menor se rechaza en interfaz, función y Firestore.
- [ ] Una venta o llenado registra lectura anterior, nueva y diferencia.
- [ ] La lectura física nunca se decrementa.
- [ ] El cierre exige una lectura mayor a la última lectura.

### 14.3 Llenado

- [ ] El llenado de producción descuenta vacíos.
- [ ] El llenado de producción incrementa llenos.
- [ ] El llenado actualiza el movimiento de agua.
- [ ] El llenado no crea una venta ni movimiento de caja.
- [ ] Stock insuficiente provoca rollback completo.
- [ ] La operación repetida con el mismo `requestId` no duplica efectos.

### 14.4 Venta

- [ ] La venta de producto terminado descuenta el SKU exacto.
- [ ] La venta de un SKU no descuenta otra presentación equivalente.
- [ ] La venta de agua medida actualiza agua, nota y caja/cxc.
- [ ] La venta de producto ya producido no vuelve a consumir el medidor.
- [ ] El crédito exige cliente identificado.
- [ ] La venta pública usa `Público general` y no crea crédito para ese cliente.

### 14.5 Créditos y abonos

- [ ] La venta a crédito aumenta la cuenta por cobrar.
- [ ] El abono se crea inicialmente como pendiente.
- [ ] El vendedor puede registrar abonos de clientes generales.
- [ ] El repartidor solo registra abonos dentro de su alcance autorizado.
- [ ] La aprobación crea caja y reduce cuenta por cobrar.
- [ ] La repetición de aprobación no duplica el efectivo.
- [ ] Un rechazo exige motivo obligatorio.

### 14.6 Offline

- [ ] Se puede capturar una operación sin conexión.
- [ ] La operación queda visible como pendiente.
- [ ] Al reconectar, se valida contra la última lectura real del servidor.
- [ ] Un conflicto no altera la jornada ni inventario canónico.
- [ ] La sincronización es idempotente.
- [ ] Un refresh o doble toque no crea duplicados.

### 14.7 Seguridad

- [ ] Repartidor no lee inventario global de planta.
- [ ] Vendedor no administra usuarios ni vehículos globales.
- [ ] Solo admin puede aprobar ajustes, abonos y diferencias.
- [ ] Los movimientos canónicos no se actualizan ni eliminan desde cliente.
- [ ] Los registros históricos conservan auditoría.
- [ ] Las reglas se prueban con Emulator Suite antes de producción.

## 15. Plan de implementación

### Fase 0 — Contrato y pruebas

Congelar nombres, estados, tipos de operación, campos obligatorios e idempotencia. Crear pruebas de reglas y casos de negocio antes de tocar producción.

### Fase 1 — Unidad planta y medidor

Agregar `tipoUnidad: planta`, alta administrativa, medidor estacionario, operador autorizado y jornada de planta. No cambiar todavía el comportamiento del ticket público existente.

### Fase 2 — Movimientos de agua e inventario

Crear `operaciones_planta`, `movimientos_agua` y `movimientos_inventario`. Implementar llenado de producción con transacción e idempotencia.

### Fase 3 — Venta integrada

Separar relleno de cliente, venta de producto terminado, venta de productos externos y venta de agua medida. Vincular notas, caja, créditos y movimientos.

### Fase 4 — Cloud Functions y outbox

Mover operaciones críticas a funciones callable o procesador de `operaciones_pendientes`. Mantener temporalmente adaptadores de compatibilidad para las ventas existentes.

### Fase 5 — Conciliaciones

Implementar conciliación de medidor, inventario, caja y cuenta por cobrar. Mostrar diferencias sin alterar datos originales.

### Fase 6 — Endurecimiento y despliegue

Probar reglas con Emulator Suite, validar índices, ejecutar migraciones controladas, revisar duplicados y desplegar reglas desde una máquina autenticada. No desplegar reglas desde GitHub Pages.

## 16. Compatibilidad y migración

La migración debe ser incremental. Las colecciones actuales `vehiculos`, `medidores`, `notas`, `productos`, `inventario_historial`, `creditos`, `abonos` y `cajas_jornada` no se deben borrar.

Durante la transición:

1. Mantener los campos actuales de compatibilidad.
2. Añadir `unidadOperativaId`, `unidadOperativaTipo`, `requestId` y `origenTipo` a las nuevas operaciones.
3. Crear movimientos paralelos únicamente para operaciones nuevas.
4. No reconstruir históricos sin una fuente confiable.
5. Comparar snapshots actuales contra movimientos nuevos.
6. Marcar documentos migrados con `schemaVersion`.
7. No publicar reglas nuevas hasta probar usuarios admin, vendedor y repartidor.

## 17. Riesgos y controles

| Riesgo | Control |
|---|---|
| Doble toque o reintento | Idempotencia por `requestId`. |
| Lectura offline desfasada | Outbox y validación en servidor. |
| Doble descuento de agua | Separar producción de venta de producto terminado. |
| Ajuste manual de stock | Movimientos inmutables y proyecciones protegidas. |
| Abono duplicado | Estado pendiente/aprobado y transacción idempotente. |
| Venta después del cierre | Estado de jornada validado en reglas y función. |
| Mezcla de planta y reparto | `tipoUnidad` y ámbitos explícitos. |
| Índices excesivos | Crear solo índices derivados de consultas reales; los índices impactan almacenamiento y escritura.[4] |
| Función no idempotente | Diseñar comandos para reintento seguro y usar Emulator Suite. |
| Reglas con demasiados `get()` | Reducir documentos consultados y respetar límites de reglas.[1] |

## 18. Decisiones pendientes antes de codificar

Estas decisiones deben confirmarse antes de generar colecciones definitivas y reglas de producción:

1. Si `productos.stock` seguirá como proyección mantenida o se calculará bajo demanda en reportes.
2. Si el medidor de planta representa únicamente agua procesada o también una disponibilidad inicial física de agua.
3. Si se almacenará costo por lote para productos comprados y producidos.
4. Si la planta tendrá una jornada por vendedor, por turno o una caja compartida por planta.
5. Si una venta de agua medida puede registrarse como crédito desde planta cuando el cliente sí está identificado.
6. Si los movimientos canónicos se escribirán únicamente desde Cloud Functions o habrá una transición temporal con `getAfter()`.
7. Si se permitirá reversa autorizada en producción y cuáles serán sus efectos exactos.
8. Si el cierre con diferencia queda cerrado inmediatamente o en estado `con_diferencia` hasta aprobación administrativa.
9. Qué productos serán obligatoriamente pares vacío/lleno y cuáles serán productos sin envase retornable.
10. Cuál será el modelo de costo: costo fijo por SKU, costo por lote, promedio ponderado o FIFO.

## 19. Referencias técnicas

[1]: https://firebase.google.com/docs/firestore/manage-data/transactions "Firebase — Transactions and batched writes"

[2]: https://firebase.google.com/docs/firestore/manage-data/enable-offline "Firebase — Access data offline"

[3]: https://firebase.google.com/docs/functions/tips "Firebase — Cloud Functions tips and best practices"

[4]: https://firebase.google.com/docs/firestore/query-data/index-overview "Firebase — Cloud Firestore index overview"

**Base funcional interna:** documentos proporcionados para Flutt-Water sobre permisos, ventas de agua, efectos contables, inventario, movimientos, medidores, jornadas y operación de planta. Estos documentos representan requisitos del negocio y deben mantenerse como fuente de decisión durante la implementación.

---

**Estado final de esta especificación:** lista para revisión funcional y aprobación arquitectónica. No se modificaron reglas, índices ni datos de producción al crear este documento.

**Autor:** Manus AI

**Archivo:** `flutt-water-especificacion-tecnica-planta-2026-08-20.md`

**Fecha:** 20 de agosto de 2026

Aquí termina la especificación.
