# Gestión de códigos de barras en Flutt-Water

## Objetivo

Flutt-Water ahora trata el código de barras como una relación operativa entre una etiqueta y un producto del catálogo. Ya no es únicamente un campo informativo: el sistema puede generar un código interno real, reservarlo para un producto, renderizarlo como Code 128, imprimir etiquetas y resolverlo durante el escaneo de productos.

## Decisión de formato

Los códigos generados por la aplicación utilizan **Code 128** con el prefijo interno `FLW-PROD-`, seguido del ID del producto. Por ejemplo:

```text
FLW-PROD-AB12CD34
```

Code 128 es adecuado para identificadores internos porque admite texto y no requiere un prefijo comercial GS1. Los códigos de proveedor se conservan como texto y se pueden capturar manualmente o con cámara. No se convierten a número para conservar ceros iniciales.

## Modelo de datos

El documento de `productos/{productoId}` conserva el código visible y añade metadatos de normalización:

```js
{
  codigoBarras: 'FLW-PROD-AB12CD34',
  codigoBarrasNormalizado: 'FLW-PROD-AB12CD34',
  codigoBarrasTipo: 'interno_code128'
}
```

La relación única se mantiene en:

```text
barcodes/{codigoNormalizado}
```

```js
{
  productoId: 'AB12CD34',
  productoNombre: 'Botella de un litro llena',
  codigo: 'FLW-PROD-AB12CD34',
  tipo: 'interno_code128',
  activo: true,
  actualizadoPorUid: 'uid-del-usuario'
}
```

El código se normaliza quitando espacios externos e internos y validando una longitud máxima de 80 caracteres ASCII. El valor sigue siendo cadena de texto.

## Flujos disponibles

Desde la nueva pantalla **Etiquetas**, un usuario autorizado puede buscar productos, filtrar los que todavía no tienen código, generar el código interno, abrir una vista previa y elegir el número de etiquetas que se imprimirán. La impresión se abre en una ventana separada con CSS de impresión y una cuadrícula de etiquetas; cada etiqueta contiene nombre, unidad, precio y código Code 128.

Desde el menú de acciones de un producto existe también el acceso directo **Etiqueta**, que lleva a la sección especializada. La pantalla de Productos continúa permitiendo capturar un código externo manualmente o con cámara.

Cuando se escanea un producto desde Jornada, se busca usando el valor normalizado. Si el código no existe y el usuario tiene permiso de edición de Productos, se conserva el código en el flujo de alta y se crea la reserva en `barcodes` dentro de la misma transacción.

## Seguridad

La creación o modificación de un código actualiza el producto y la reserva de `barcodes` en una transacción Firestore. Las reglas verifican que la reserva apunte al mismo producto mediante `getAfter()` y `existsAfter()`. Un repartidor no puede gestionar el catálogo ni crear reservas de códigos.

La colección `barcodes` permite lectura a usuarios autenticados, pero no permite crear o modificar una reserva desconectada de un producto. La eliminación solo es válida cuando la reserva todavía corresponde al código que figura en el producto. El respaldo operativo incluye la colección `barcodes`.

## Relación con inventario y Planta

El código identifica una **presentación o producto**, no litros. Una botella de medio litro, una botella de un litro, un galón, una paleta o una bolsa de hielo pueden tener productos y etiquetas distintas. El medidor sigue registrando el volumen de agua utilizado durante el llenado o la venta de agua.

La siguiente integración debe usar el código para resolver el producto y después ejecutar una operación atómica de inventario y caja. Escanear una botella llena debe afectar unidades del producto; llenar botellas vacías debe afectar el medidor y los saldos de vacíos/llenos según la operación de Planta.

## Archivos principales

| Archivo | Responsabilidad |
|---|---|
| `codigos-barras.js` | Generación Code 128, normalización, índice único, vista previa e impresión. |
| `productos.js` | Alta y edición de productos utilizando la reserva transaccional. |
| `ruta.js` | Resolución normalizada al escanear y alta de producto escaneado. |
| `app.js` | Nueva pantalla superior `Etiquetas` y acceso desde Productos. |
| `sesion.js` | Permisos predeterminados para admin, usuario y repartidor. |
| `firestore.rules` | Protección de `barcodes` y validación producto-reserva. |
| `index.html` | Carga de JsBarcode 3.11.6 y del módulo. |
| `sw.js` | Caché `v8-barcode-labels` con los nuevos recursos. |
| `reportes.js` | Respaldo de `barcodes` y corrección del nombre de archivo Flutt-Water. |
