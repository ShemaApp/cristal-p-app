# Permisos habilitados del vendedor

**Proyecto:** Flutt-Water
**Rol oficial:** `vendedor`
**Alias heredado:** `usuario` se interpreta como `vendedor` mediante `rolEfectivo()` y se conserva únicamente para compatibilidad con perfiles existentes.

## Propósito operativo

El vendedor representa al operador de planta o mostrador. Su trabajo principal es registrar tickets de venta pública de planta, cobrar créditos autorizados y consultar la información necesaria para atender al cliente. La venta de planta es un flujo separado de las transferencias y jornadas de los repartidores: no crea una ruta, no asigna un vehículo y no se mezcla con la cartera de un repartidor.

La aplicación identifica este rol por el perfil autenticado almacenado en `usuarios/{uid}.role`. La navegación se filtra por rol y no depende de activar manualmente permisos pantalla por pantalla. Los permisos de edición se mantienen como una segunda barrera, pero no deben utilizarse para volver a exponer módulos administrativos al vendedor.

## Navegación habilitada

| Identificador interno | Nombre visible para el vendedor | Acceso | Uso permitido |
|---|---|---:|---|
| `home` | **Planta** | Sí | Resumen operativo y acceso rápido al ticket público de planta. |
| `nota` | **Venta de planta** | Sí | Registrar tickets públicos de mostrador. |
| `clientes` | **Clientes generales** | Sí | Consultar el catálogo general completo y localizar información necesaria para cobros; no editar fichas. |
| `creditos` | **Cobro de créditos** | Sí | Consultar cualquier crédito del catálogo general y registrar abonos pendientes para conciliación administrativa. |
| `gerencia` | **Mi caja** | Sí | Consultar y registrar movimientos de caja propios según el flujo operativo disponible. |
| `productos` | Productos | No | El vendedor selecciona SKU dentro del ticket, pero no administra el catálogo. |
| `inventario` | Inventario | No | El descuento ocurre automáticamente al guardar el ticket; no hay ajuste manual. |
| `barcodes` | Etiquetas | No | No crea ni administra códigos de barras. |
| `ruta` | Jornada | No | No pertenece a una jornada de reparto. |
| `vehiculos` | Vehículos | No | No consulta ni asigna vehículos o medidores de reparto. |
| `repartidores` | Distribución | No | No consulta rutas, carteras ni ventas QR de repartidores. |
| `reportes` | Reportes | No | No descarga reportes globales ni CSV. |

La pantalla de configuración no debe convertirse en un panel administrativo para este rol. Si la interfaz expone una acción de configuración personal, únicamente debe permitir cambiar la contraseña propia y consultar datos mínimos de identidad; la creación de usuarios, branding, vehículos, medidores, productos, reglas de negocio y configuración inicial son funciones de administración.

## Acciones y permisos CRUD

| Recurso | Lectura | Creación | Actualización | Eliminación | Condición principal |
|---|---:|---:|---:|---:|---|
| Ticket público de planta (`notas`) | Propios | Sí | No | No | Cliente fijo **Público general**, `origen: planta_publico_general`, `medioOperacion: planta` y pago sin crédito. |
| Stock de productos | Indirecta | No | Solo descuento atómico | No | El descuento debe ocurrir en la misma transacción que crea el ticket y debe señalar el SKU, cantidad, vendedor y ticket. |
| Clientes | Catálogo general completo | No | No | No | Puede leer cualquier cliente autenticado; solo puede crear o asegurar `clientes/publico_general` para el ticket público. |
| Créditos y abonos | Todos los créditos | Crear abono pendiente en cualquier crédito | Solo admin valida y actualiza saldo | No | El vendedor puede cobrar a cualquier cliente; el abono queda en `creditos/{id}/abonos` y se aprueba sin borrar historial. |
| Caja propia | Según módulo | Operaciones propias | Cierre según flujo | No | Ventas del medidor y abonos se muestran separados; el efectivo de abonos queda pendiente de conciliación administrativa. |
| Productos, precios, inventario administrativo y barcodes | No como módulo | No | No | No | Administración exclusiva. |

La cantidad de cada línea conserva las reglas universales del SKU: piezas y paquetes deben ser enteros; los productos configurados como granel pueden usar decimales. El vendedor no modifica el catálogo; cuando se habilite su operación de medidor, usará la unidad de planta asociada y no una unidad de reparto. La lógica de litros vive en el medidor, no en el producto.

## Flujo autorizado de venta pública

El flujo inicia desde **Venta de planta**. El vendedor agrega uno o más SKU, indica cantidades válidas y selecciona la forma de pago permitida. El sistema fuerza el cliente **Público general** y rechaza la mezcla con clientes de cartera o con transferencias de repartidores. Al confirmar, se crea una nota inmutable y se descuenta el stock de cada SKU mediante una transacción atómica. Si existe una incidencia de inventario, debe quedar registrada para revisión administrativa; nunca se corrige modificando la venta histórica.

> **Regla de separación:** una venta pública de planta pertenece a la caja de planta y no debe contener `transferenciaId`, `rutaId` de reparto, vehículo o identificación QR de visita.

El vendedor no utiliza cámara ni QR. La identificación QR queda reservada al repartidor porque en ese contexto identifica al cliente visitado dentro de una jornada activa. La eliminación de GPS y mapas es intencional: el vendedor no captura, consulta ni valida coordenadas.

## Seguridad y datos visibles

El frontend usa `rolEfectivo()` para convertir el alias `usuario` en `vendedor`, fuerza las pestañas autorizadas y mantiene desactivadas las acciones de GPS y CSV. Las reglas de Firestore deben validar igualmente el rol y el origen de la operación; ocultar una pestaña no es una frontera de seguridad suficiente.

El vendedor puede leer el catálogo general de clientes y todos los créditos porque atiende pagos en planta de cualquier cliente; las demás colecciones conservan el alcance propio de su operación. Los tickets propios son consultables, pero no editables ni eliminables. Las operaciones de planta deben conservar `capturadoPorUid`, `capturadoPorNombre`, `responsableTipo: vendedor`, `tipoVenta: planta_publico_general`, `clienteId: publico_general` y, cuando aplique, `unidadOperativaTipo: planta`. Cada cobro se registra como abono pendiente; administración valida el dinero al cierre y después el crédito deja de aparecer entre pendientes, sin eliminar el historial.

## Referencias internas

La matriz se implementa principalmente en [`sesion.js`](../sesion.js), [`app.js`](../app.js), [`dashboard.js`](../dashboard.js), [`pedidos.js`](../pedidos.js), [`reportes.js`](../reportes.js) y [`firestore.rules`](../firestore.rules). La configuración de caché y shell se encuentra en [`sw.js`](../sw.js).
