# Modelo universal de presentaciones, inventario y precios

## Decisión de diseño

El catálogo debe distinguir entre el **producto base** y la **presentación vendible**. Para la operación actual, cada documento de `productos` representa una presentación/SKU concreta que puede tener stock, código de barras, estado y precios propios. El producto base sirve para agrupar presentaciones relacionadas, pero no se utiliza para sumar o descontar automáticamente existencias de otra presentación.

> Una venta siempre descuenta el SKU seleccionado. El contenido declarado de una presentación sirve para describirla, llenar productos o calcular una transformación explícita; nunca autoriza sustituirla por otra presentación.

## Ejemplo de inventario

| SKU | Producto base | Presentación | Stock |
|---|---|---|---:|
| `hielo-saco-25kg` | Hielo | Saco de 25 kg | 10 piezas |
| `hielo-bolsa-10kg` | Hielo | Bolsa de 10 kg | 25 piezas |

Si se vende `hielo-saco-25kg` por una pieza, el saldo pasa de 10 a 9. El saldo de `hielo-bolsa-10kg` permanece en 25, aunque ambos SKU tengan la misma unidad de contenido (`kg`).

## Esquema propuesto para `productos/{skuId}`

```js
{
  nombre: 'Hielo',
  productoBaseId: 'hielo',
  nombreProductoBase: 'Hielo',
  tipoProducto: 'terminado',
  tipoVenta: 'pieza',
  etiquetaPresentacion: 'Saco de 25 kg',
  unidadInventario: 'pieza',
  contenidoPorUnidad: 25,
  unidadContenido: 'kg',
  stock: 10,
  activo: true,
  requiereLlenado: false,
  productoVacioId: null,
  codigoBarras: 'FLW-PROD-...',
  precioActivoId: 'precio-publico-01'
}
```

Para venta a granel:

```js
{
  nombre: 'Hielo a granel',
  productoBaseId: 'hielo',
  tipoProducto: 'granel',
  tipoVenta: 'peso',
  etiquetaPresentacion: 'Venta por kilogramo',
  unidadInventario: 'kg',
  contenidoPorUnidad: 1,
  unidadContenido: 'kg',
  permiteDecimales: true,
  stock: 250
}
```

Para un paquete mayorista:

```js
{
  nombre: 'Hielo',
  productoBaseId: 'hielo',
  tipoProducto: 'terminado',
  tipoVenta: 'paquete',
  etiquetaPresentacion: 'Paquete de 10 bolsas de 2 kg',
  unidadInventario: 'paquete',
  contenidoPorUnidad: 10,
  unidadContenido: 'pieza',
  productoContenidoId: 'hielo-bolsa-2kg',
  stock: 8
}
```

El paquete se trata como un SKU independiente. Una venta del paquete descuenta paquetes. Si en el futuro se desea abrir un paquete y convertirlo a piezas, será una operación explícita de transformación con su propio historial; no ocurrirá durante una venta de otra presentación.

## Precios separados del producto

Los precios no deben ser la identidad del producto ni la única fuente del inventario. Se recomienda mantenerlos en `productos/{skuId}/precios/{precioId}` o en una colección equivalente con `skuId`:

```js
{
  skuId: 'hielo-saco-25kg',
  nombre: 'Mayoreo',
  precio: 280,
  moneda: 'MXN',
  activo: true,
  vigenteDesde: serverTimestamp(),
  vigenteHasta: null,
  creadoPorUid: 'uid-admin'
}
```

Una venta guarda una instantánea del precio: `precioId`, `precioNombre`, `precioUnitario` y `subtotal`. Desactivar un precio no modifica ventas históricas. Crear otro precio no cambia el stock ni convierte el SKU. Si un SKU se agota, puede desactivarse el SKU o el precio sin borrar el documento ni su historial.

## Reglas de descuento

```text
venta de 1 saco de 25 kg → stock[hielo-saco-25kg] -= 1
venta de 1 bolsa de 10 kg → stock[hielo-bolsa-10kg] -= 1
venta a granel de 3.5 kg → stock[hielo-granel] -= 3.5
venta de 1 paquete → stock[hielo-paquete] -= 1
```

La coincidencia por `productoBaseId`, `unidadContenido` o `contenidoPorUnidad` solo sirve para agrupación, reportes o validación. Nunca se usa para elegir un sustituto automáticamente.

## Relación con medidores y llenados

Los SKU con `requiereLlenado: true` pueden declarar `contenidoPorUnidad` y `unidadContenido`, por ejemplo una botella de 1 L o un garrafón de 19 L. Un llenado explícito consume el contenido declarado y el envase vacío relacionado, y produce el SKU terminado. Una venta posterior del SKU terminado únicamente descuenta su stock; no vuelve a descontar el medidor.

El medidor sigue siendo el único lugar donde se interpreta la lectura acumulada y `cantidadPorDigito`. El inventario de presentaciones no reemplaza la lógica del medidor.

## Validación local

La PWA cargó correctamente el login con el shell actual, el Service Worker y los módulos modificados. La consola no reportó excepciones de Productos, Inventario, Pedidos, Ruta o Etiquetas; únicamente mostró el aviso no bloqueante de Firebase sobre `enableMultiTabIndexedDbPersistence()`.

La prueba se realizó sin autenticación, por lo que la escritura de un SKU, la fabricación y la venta requieren una prueba posterior con un administrador autenticado y datos reales del proyecto.

## Implementación aplicada en la PWA

Productos ahora permite capturar el producto base, tipo de venta, unidad de inventario, contenido por unidad, unidad del contenido, etiqueta de presentación, relación de SKU para paquetes y si el producto requiere llenado. Esto permite registrar de forma independiente `Hielo · Saco de 25 kg` y `Hielo · Bolsa de 10 kg`.

Inventario incorpora la sección **Fabricación / producción**. La fabricación usa una transacción que lee el SKU seleccionado, incrementa únicamente su stock y escribe un movimiento `tipoMovimiento: 'fabricacion'` en `inventario_historial`. La fabricación del saco no toca la bolsa.

Productos incorpora el gestor **Precios**. Cada SKU puede conservar varios precios con nombre, importe, estado, vigencia y usuario creador. Al agregar un precio nuevo, el anterior se desactiva, el nuevo se activa y el stock permanece intacto. Las ventas de Pedidos y Ruta conservan `precioId`, `precioNombre`, `precio` y los metadatos de la presentación en el carrito y en los artículos guardados.

Los precios sin activo dejan el SKU sin precio vendible; no se recupera silenciosamente el precio legado. Las ventas históricas conservan su importe aunque el precio actual se desactive o se active otro.

## Cantidades a granel

Pedidos, Ruta y venta rápida permiten capturar decimales cuando el SKU tiene `tipoVenta: 'granel'` o `permiteDecimales: true`. Las presentaciones por pieza y los paquetes mantienen cantidades enteras. Un valor negativo continúa siendo una acción explícita de eliminación del carrito; borrar temporalmente el campo no elimina el artículo.
