# Implementación de Llenado de producción

## Estado

La interfaz y la persistencia atómica del llenado de producción quedaron integradas por subetapas. La implementación está publicada en GitHub, pero las reglas e índices todavía deben desplegarse explícitamente al proyecto Firebase de producción.

| Subetapa | Commit | Estado |
|---|---:|---|
| Pantalla y navegación del vendedor | `c893cd6` | Publicada |
| Transacción, reglas e índice compuesto | `1cc39cf` | Publicada en GitHub; pendiente de despliegue Firebase |

## Flujo implementado

El vendedor abre **Llenados de producción**, selecciona una planta operativa y comienza un formulario de cuatro pasos. El primer paso identifica la planta y su medidor. El segundo captura lectura inicial y lectura final; la lectura final debe ser estrictamente mayor. El tercer paso permite agregar una o varias presentaciones, relacionando un envase vacío con un producto terminado y una cantidad. El cuarto paso muestra el resumen y solo habilita la confirmación cuando el volumen del medidor coincide exactamente con la suma de los litros de las líneas y existe stock suficiente de envases vacíos.

La pantalla no incluye edición ni eliminación del historial. Un llenado confirmado es inmutable. El botón de confirmación utiliza una clave idempotente para que una repetición de la misma solicitud no genere movimientos duplicados.

## Escrituras atómicas

La transacción crea el documento `llenados_planta/{requestId}`, la operación equivalente en `operaciones_planta/{requestId}` y el movimiento negativo de agua en `movimientos_agua/agua_{requestId}`. También actualiza la lectura ascendente de la planta y modifica el stock de cada presentación. Por cada línea se registra una salida de envase vacío y una entrada de producto lleno en `movimientos_inventario`.

Los movimientos conservan `requestId`, `idempotencyKey`, `origenTipo: operación_planta`, `unidadOperativaTipo: planta`, el usuario capturador y la marca de inmutabilidad. Si dos líneas utilizan el mismo SKU, las cantidades se agregan antes de actualizar el documento de producto para evitar sobrescribir el stock con un valor parcial.

## Validaciones

| Validación | Comportamiento |
|---|---|
| Planta asignada | El vendedor solo puede usar una planta cuyo `operadorUid` sea su UID. |
| Lectura ascendente | Se rechazan lecturas iguales o menores. |
| Lectura consistente | La lectura inicial capturada debe coincidir con la última lectura almacenada en la planta. |
| Balance de volumen | `lectura final - lectura inicial`, multiplicado por el factor del medidor, debe coincidir con los litros de las líneas. |
| Presentaciones | Cada línea debe tener envase vacío, producto lleno, cantidad positiva y contenido por unidad mayor que cero. |
| Stock | La cantidad de envase vacío disponible debe ser suficiente. |
| Idempotencia | La misma clave no puede volver a crear un llenado confirmado. |
| Inmutabilidad | No se permiten actualizaciones ni eliminaciones de llenados o movimientos. |

## Reglas e índices

Se agregaron reglas para `llenados_planta` y `movimientos_agua`, se ampliaron las reglas de `operaciones_planta` y `movimientos_inventario`, y se restringieron las actualizaciones de stock y lectura de la planta a cambios vinculados con la operación de producción. También se agregó el índice compuesto para consultar `llenados_planta` por `plantaId`, `capturadoPorUid` y `creadoEn`.

El ruleset y el JSON de índices fueron validados localmente con el emulador de Firestore. Esta validación no equivale a un despliegue en producción.

## Service Worker

El Service Worker se actualizó a `flutt-water-v32-llenado-produccion` e incluye `llenados-planta.js` en el app shell. Esto fuerza la renovación de la caché cuando la nueva versión se publique en GitHub Pages.

## Pendiente antes de producción

Debe desplegarse el ruleset y los índices desde una máquina autenticada contra Firebase. Antes de hacerlo, se recomienda probar con un usuario vendedor real y una planta de prueba, confirmar que la consulta del historial requiere el índice compuesto y verificar que una segunda pulsación o reintento no duplique inventario ni movimientos.
