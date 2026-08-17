# Flutt-Water: estado del proyecto y arquitectura Firestore

**Fecha de actualización:** 17 de agosto de 2026  
**Repositorio:** `ShemaApp/cristal-p-app`  
**Stack:** PWA con JavaScript Vanilla, Firebase Authentication, Cloud Firestore, Service Worker y GitHub Pages/Firebase Hosting.

## 1. Propósito del documento

Este documento consolida lo construido en Flutt-Water, identifica lo que todavía falta implementar y define la estructura de Firestore para el inventario general, la operación de Planta, los repartidores, los vehículos, los medidores, las rutas, los clientes y las cajas.

También documenta el script de inicialización estructural, el anexo de reglas para Planta y el procedimiento de despliegue. El script está diseñado para ejecutarse en modo simulación por defecto y no contiene credenciales ni datos operativos ficticios.

> La base de datos debe tener una única fuente de verdad por concepto: el usuario vive en `usuarios`, el cliente en `clientes`, la cartera en `carteras_repartidores`, el medidor en `medidores`, el saldo en `inventario_saldos` y la trazabilidad en `operaciones` y sus movimientos.

## 2. Estado construido

| Área | Estado |
|---|---|
| Autenticación | Firebase Authentication con correo y contraseña. El registro público está deshabilitado. Los usuarios deben existir previamente y contar con perfil en `usuarios`. |
| Roles | Administrador, repartidor y usuario operativo con permisos diferenciados. |
| Configuración | Perfil, datos de contacto, tarifas de agua y alta administrativa de vehículos y medidores. |
| Vehículos | Cada pipa tiene un medidor fijo. El repartidor puede cambiar sin mover la propiedad del medidor. |
| Jornadas | Inicio y cierre con lecturas decimales, tolerancia de cinco unidades y motivo obligatorio cuando el desfase supera la tolerancia. |
| Rutas y localidades | Administración crea localidades y rutas desde Clientes; la ruta representa la cartera de clientes, no el vehículo. |
| Clientes | Búsqueda, filtros, QR, alta en campo, cartera individual por repartidor y solicitudes de desactivación. |
| Permisos de clientes | El repartidor puede leer sus clientes y operar tickets, pero no puede modificar nombre, teléfono, localidad, QR ni estado de una ficha existente. |
| Envases | La desactivación exige devolución de envase y base; administración decide autorizar o rechazar. El rechazo exige motivo. |
| Tickets | El QR abre la venta y el ticket conserva cliente, jornada, vehículo, medidor, repartidor y caja. |
| Productos | Catálogo con nombre, precio, stock, unidad y código de barras. Incluye menú de acciones visible. |
| Inventario actual | Conteo físico, devoluciones e historial de ajustes manuales. Todavía está basado principalmente en stock por producto. |
| Caja | Cajas vinculadas a jornadas y comprobantes de cierre. El modelo nuevo de Planta todavía debe integrarse. |
| Índices | `firestore.indexes.json` contiene 28 índices válidos sin duplicados. |
| PWA | Service Worker con actualización de caché por versión. La última corrección de cantidades usa `flutt-water-v6-quantity-inputs`. |

## 3. Corrección reciente de cantidades

Se corrigió un comportamiento peligroso para captura en campo. En algunos formularios, borrar temporalmente el contenido de una cantidad convertía `''` en `0` mediante `Number('')`; después el producto se eliminaba del carrito.

La corrección se aplicó en:

```text
pedidos.js
ruta.js
rutas-repartidores.js
sw.js
```

El comportamiento actual es el siguiente:

| Acción | Comportamiento |
|---|---|
| Borrar temporalmente la cantidad | El producto permanece en el carrito con el campo vacío. |
| Capturar letras o símbolos | La entrada se rechaza. |
| Dejar la cantidad vacía y guardar | La operación se rechaza y solicita una cantidad válida. |
| Capturar cero y guardar | La operación se rechaza, pero el producto no desaparece automáticamente. |
| Eliminar intencionalmente | Debe hacerse mediante una acción explícita de eliminación. |
| Orientación de captura | Los campos muestran `Ej. 1` como placeholder. |

Commit de esta corrección:

```text
4ebf531 fix: preserve cart items while editing quantities
```

## 4. Reglas operativas consolidadas

### 4.1 Agua y medidores

La escala acordada es:

```text
1 unidad del medidor = 10 litros
1 garrafón = 19 litros
1 garrafón = 1.9 unidades del medidor
```

Las lecturas se almacenan con decimales. El agua se controla en litros; los productos terminados, envases y artículos externos se controlan en unidades.

### 4.2 Venta de garrafón nuevo con agua

Esta operación debe ser atómica:

```text
-1 garrafón vacío
-19 litros del medidor
+1 venta en caja
```

No se deben ejecutar esos efectos como tres operaciones independientes. Deben compartir un `operacionId` y confirmarse juntos.

### 4.3 Llenado de Planta

El llenado no es una venta. Consume agua y envases vacíos, y produce productos llenos:

```text
Agua: -litros_consumidos
Envase vacío: -cantidad
Producto lleno: +cantidad
Caja: sin movimiento
```

Ejemplo de 60 botellas de 500 ml:

```text
Agua: -30 L
Botella de 500 ml vacía: -60 unidades
Botella de 500 ml llena: +60 unidades
```

La pantalla de Planta tendrá una sección **Llenado** con historial propio. Las botellas llenas quedan disponibles para venderse posteriormente; no se convierten automáticamente en ventas.

## 5. Entidades maestras

Estas colecciones representan entidades persistentes y no deben crearse dentro de una venta.

| Colección | Propósito | Responsable de alta |
|---|---|---|
| `usuarios/{uid}` | Perfil vinculado a Authentication | Administración/Firebase Console |
| `localidades_catalogo/{localidadId}` | Ejidos, ranchos y campos agrícolas | Admin |
| `rutas_catalogo/{rutaId}` | Cartera de clientes asignada | Admin |
| `clientes/{clienteId}` | Ficha maestra del domicilio | Admin o repartidor en alta controlada |
| `carteras_repartidores/{uid}/clientes/{clienteId}` | Relación individual de cartera | Repartidor dentro de ruta autorizada |
| `vehiculos/{vehiculoId}` | Pipas y vehículos | Admin |
| `medidores/{medidorId}` | Medidores físicos | Admin |
| `plantas/{plantaId}` | Planta estacionaria futura | Admin |
| `ubicaciones/{ubicacionId}` | Almacén, planta y vehículos | Admin |
| `productos/{productoId}` | Catálogo general | Admin/usuario autorizado |
| `tarifas_agua/{tarifaId}` | Precios por garrafón | Admin |

No se recomienda crear una colección separada `repartidores`. El repartidor es un usuario con `role: 'repartidor'` en `usuarios/{uid}`. Así se evita duplicar nombres, teléfonos y estados.

## 6. Colecciones pendientes de implementar

Estas colecciones forman el modelo futuro de inventario y Planta. Actualmente están documentadas y algunas ya tienen índices preparados, pero no todas están implementadas en la interfaz ni deben escribirse desde la PWA hasta completar el flujo.

| Colección | Estado | Propósito |
|---|---|---|
| `inventario_saldos/{saldoId}` | Pendiente | Proyección del saldo actual por ubicación y producto. |
| `movimientos_inventario/{movimientoId}` | Pendiente | Libro inmutable de entradas, salidas, transformaciones y ajustes. |
| `operaciones/{operacionId}` | Pendiente | Encabezado idempotente de cada operación atómica. |
| `operaciones/{operacionId}/detalles/{detalleId}` | Pendiente | Detalles de agua, envases, productos y caja. |
| `llenados_planta/{llenadoId}` | Pendiente | Historial consultable de llenados. |
| `ventas/{ventaId}` | Pendiente | Venta general vinculada a una operación y caja. |
| `movimientos_caja/{movimientoId}` | Pendiente | Libro de cobros, abonos, gastos y devoluciones. |
| `envases_prestados/{prestamoId}` | Pendiente | Control de envases entregados a clientes. |
| `plantas/{plantaId}` | Pendiente | Configuración de la planta estacionaria. |
| `ubicaciones/{ubicacionId}` | Pendiente | Separación de almacén, planta y vehículos. |

Firestore no mantiene colecciones vacías como objetos independientes. Una colección aparece cuando se escribe su primer documento; por eso el script acepta catálogos explícitos y no inventa documentos para forzar colecciones vacías.

## 7. Estructura de productos

El catálogo general debe soportar varios tipos de inventario sin crear catálogos separados para Planta.

```js
{
  nombre: 'Botella de 1 litro llena',
  tipoProducto: 'terminado',
  unidadInventario: 'unidad',
  contenidoLitros: 1,
  productoVacioId: 'botella_1l_vacia',
  requiereAgua: true,
  precio: 12,
  activo: true,
  visibleEn: ['planta']
}
```

| Tipo | Unidad | Ejemplos |
|---|---|---|
| `agua_medida` | Litros | Agua purificada para rellenar garrafones. |
| `envase_vacio` | Unidad | Botellas de 500 ml, 1 L, 1.5 L, galón de 4 L y garrafón. |
| `terminado` | Unidad | Botellas, galones y otros productos llenos. |
| `terminado_especial` | Unidad + litros | Garrafón nuevo con agua. |
| `externo` | Unidad | Paletas y productos comprados a terceros. |
| `hielo` | Unidad | Bolsas de hielo. |

## 8. Estructura de inventario

### Saldo por ubicación

```text
inventario_saldos/{ubicacionId}_{productoId}
```

```js
{
  ubicacionId: 'ubicacion_planta_01',
  productoId: 'botella_1l_vacia',
  cantidad: 100,
  unidad: 'unidad',
  actualizadoEn: serverTimestamp(),
  ultimaOperacionId: 'op_001'
}
```

Para el agua medida:

```js
{
  ubicacionId: 'ubicacion_planta_01',
  productoId: 'agua_purificada_granel',
  cantidadLitros: 5000,
  unidad: 'litro',
  medidorId: 'medidor_planta_01',
  ultimaLectura: 13000.0,
  ultimaOperacionId: 'op_001'
}
```

### Libro inmutable

```text
movimientos_inventario/{movimientoId}
```

Cada movimiento debe incluir `operacionId`, `ubicacionId`, `productoId`, `tipoMovimiento`, cantidad, unidad, operador y fecha del servidor. No se edita ni se elimina. Una corrección se realiza con una operación compensatoria.

## 9. Operaciones atómicas

```text
operaciones/{operacionId}
operaciones/{operacionId}/detalles/{detalleId}
```

Campos mínimos del encabezado:

```js
{
  operacionId: 'op_001',
  idempotencyKey: 'device-01-op-001',
  tipo: 'venta_planta_garrafon_nuevo',
  origen: 'planta',
  plantaId: 'planta_01',
  medidorId: 'medidor_planta_01',
  cajaId: 'caja_planta_01',
  operadorUid: 'despachador_01',
  estado: 'pendiente_sync',
  creadoEn: serverTimestamp()
}
```

La PWA puede crear la intención `pendiente_sync`. La confirmación de inventario, venta y caja debe ejecutarse mediante un proceso confiable de conciliación. Las transacciones de Firestore permiten que las lecturas y escrituras se apliquen de forma atómica y se reintenten ante conflictos; las funciones de reglas como `getAfter()` permiten validar el estado relacionado después de una escritura atómica.[1]

## 10. Cajas y ventas

La caja se comparte conceptualmente entre vehículo y Planta, pero cada caja conserva su tipo y propietario.

```text
cajas_jornada/{cajaId}
movimientos_caja/{movimientoId}
ventas/{ventaId}
```

Una caja de Planta:

```js
{
  tipoCaja: 'planta',
  plantaId: 'planta_01',
  operadorUid: 'despachador_01',
  jornadaId: null,
  estado: 'abierta',
  fechaApertura: serverTimestamp()
}
```

Una caja de vehículo:

```js
{
  tipoCaja: 'vehiculo',
  vehiculoId: 'vehiculo_01',
  medidorId: 'medidor_pipa_01',
  jornadaId: 'jornada_01',
  repartidorId: 'repartidor_01',
  estado: 'abierta'
}
```

El cierre debe sumar `movimientos_caja` confirmados por `cajaId` y no depender únicamente de la colección histórica `notas`.

## 11. Envases prestados

Los envases vacíos disponibles en Planta no son lo mismo que los envases prestados a clientes.

```text
envases_prestados/{prestamoId}
```

```js
{
  clienteId: 'cliente_01',
  productoId: 'garrafon_vacio',
  cantidad: 1,
  estado: 'prestado',
  origenOperacionId: 'op_001',
  fechaSalida: serverTimestamp(),
  fechaDevolucion: null,
  recibidoPorUid: null
}
```

La devolución genera un movimiento nuevo y no borra el préstamo original.

## 12. Script de inicialización estructural

Archivos incluidos:

```text
scripts/init-firestore-structure.js
scripts/firestore-structure.config.example.json
```

El script no crea usuarios, clientes, rutas, jornadas, cajas, ventas ni movimientos operativos. Solo puede crear documentos maestros que se indiquen explícitamente en el archivo de configuración.

### Requisitos

```bash
npm install firebase-admin
```

La credencial debe estar fuera del repositorio:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/ruta/segura/service-account.json"
```

También puede usarse `FIREBASE_SERVICE_ACCOUNT_JSON`, sin guardar su contenido en archivos versionados.

### Configuración

Copia la plantilla:

```bash
cp scripts/firestore-structure.config.example.json scripts/firestore-structure.config.json
```

Edita `scripts/firestore-structure.config.json` con datos reales aprobados por administración. La plantilla inicia con arreglos vacíos para evitar datos ficticios.

### Simulación

```bash
node scripts/init-firestore-structure.js \
  --config ./scripts/firestore-structure.config.json
```

El modo predeterminado es `dry-run`; solo muestra los documentos que prepararía.

### Aplicación

```bash
node scripts/init-firestore-structure.js \
  --config ./scripts/firestore-structure.config.json \
  --apply
```

El script valida IDs, referencias de planta, medidores, ubicaciones y productos antes de escribir. Usa IDs explícitos y `merge: true`, por lo que puede reejecutarse sin crear duplicados para esos documentos maestros.

No uses el script para cargar datos reales de usuarios o clientes sin una revisión administrativa. Los usuarios continúan siendo preprovisionados mediante Firebase Authentication y sus perfiles correspondientes.

## 13. Reglas Firestore actuales y futuras

El archivo activo es:

```text
firestore.rules
```

Actualmente ya protege autenticación, clientes, rutas, carteras, vehículos, medidores, jornadas, lecturas, recargas, ventas medidas, cierres, tarifas y solicitudes de desactivación. También contiene un catch-all final que deniega colecciones no declaradas.

El anexo para Planta está en:

```text
docs/firestore-planta.rules.addendum
```

Este anexo **no se despliega automáticamente** porque las colecciones de Planta todavía no están implementadas en la interfaz. Debe integrarse después de completar el módulo y probarlo con usuarios admin y despachador.

Las reglas del anexo aplican estas restricciones:

| Recurso | Regla principal |
|---|---|
| `operaciones` | El operador crea una intención pendiente; la confirmación no queda abierta a cualquier cliente. |
| `inventario_saldos` | Solo se actualiza con una operación confirmada y saldo no negativo. |
| `movimientos_inventario` | Solo creación, nunca edición ni eliminación. |
| `llenados_planta` | Solo se crea vinculado a una operación confirmada. |
| `ventas` | Requiere origen Planta, caja, operador y operación confirmada. |
| `movimientos_caja` | Requiere caja, importe, operador y operación confirmada. |
| `envases_prestados` | Requiere cliente, producto, cantidad y operación confirmada. |
| `plantas` y `ubicaciones` | Alta y configuración exclusivas de administración. |

Las reglas de acceso deben combinarse con Authentication y validaciones por rol/propietario; los filtros de la interfaz no sustituyen las reglas del servidor.[2]

## 14. Índices compuestos

El archivo `firestore.indexes.json` contiene 28 índices sin duplicados para:

```text
rutas y carteras
jornadas
cajas
operaciones
movimientos de inventario
movimientos de caja
ventas
llenados de Planta
envases prestados
productos visibles en Planta
```

Commit de índices:

```text
9c75894 feat: add firestore indexes for plant inventory
```

Para desplegarlos desde un entorno autenticado:

```bash
firebase deploy --only firestore:indexes
```

Firestore crea índices simples automáticamente, pero las consultas compuestas requieren índices compatibles con sus campos y ordenamientos.[3]

## 15. Pendientes principales

| Prioridad | Pendiente | Riesgo si se omite |
|---:|---|---|
| 1 | Implementar `inventario_saldos` y `movimientos_inventario`. | Stock no auditable y saldos inconsistentes. |
| 2 | Crear módulo exclusivo de Planta. | El despachador no tiene flujo de llenado ni venta de tienda. |
| 3 | Implementar operaciones atómicas e idempotencia. | Posibles duplicados de litros, productos o efectivo al reconectar. |
| 4 | Migrar ventas offline del modelo antiguo de transferencia. | Ventas nuevas pueden quedar fuera del inventario general. |
| 5 | Integrar `movimientos_caja` al cierre. | El corte no incluiría correctamente Planta y operaciones nuevas. |
| 6 | Actualizar reportes y Excel. | Reportes con campos heredados de transferencias. |
| 7 | Desplegar reglas e índices en Firebase. | El repositorio tendría una configuración distinta al proyecto remoto. |
| 8 | Ejecutar pruebas con dos operadores y una pipa compartida. | No se validaría concurrencia, offline ni aislamiento real. |

## 16. Mejoras recomendadas

La siguiente etapa debe comenzar por el libro inmutable de movimientos de inventario. El campo de saldo debe conservarse como una proyección rápida, pero cada cambio tiene que estar respaldado por un movimiento con `operacionId`.

Después debe construirse Planta sobre el catálogo general, usando ubicaciones y cajas diferenciadas. No conviene crear `productos_planta` ni `inventario_planta` como copias aisladas.

También se recomienda crear una pantalla administrativa de operaciones pendientes para revisar ventas offline, llenados incompletos, diferencias de medidor, faltantes de envases y cobros pendientes antes del cierre.

## 17. Procedimiento de despliegue recomendado

Antes de desplegar:

```text
1. Respaldar reglas e índices actuales.
2. Ejecutar el script en dry-run.
3. Revisar la configuración real con administración.
4. Probar reglas en el emulador.
5. Desplegar índices.
6. Desplegar reglas solo cuando el módulo correspondiente exista.
7. Probar admin, repartidor y despachador por separado.
8. Verificar que un reintento no duplique inventario ni caja.
```

Comandos típicos:

```bash
firebase emulators:start --only firestore
firebase deploy --only firestore:indexes
firebase deploy --only firestore:rules
```

No se debe ejecutar `firebase deploy --only firestore:rules` con el anexo de Planta si todavía no se ha integrado y probado con el módulo de Planta. El catch-all de las reglas actuales seguirá bloqueando colecciones nuevas hasta que exista una decisión explícita de despliegue.

## 18. Referencias

[1]: [Firebase — Transactions and batched writes](https://firebase.google.com/docs/firestore/manage-data/transactions)  
[2]: [Firebase — Role-based access control](https://firebase.google.com/docs/firestore/solutions/role-based-access)  
[3]: [Firebase — Manage Cloud Firestore indexes](https://firebase.google.com/docs/firestore/query-data/indexing)
