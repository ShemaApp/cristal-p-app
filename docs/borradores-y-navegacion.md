# Borradores locales y navegación segura

## Alcance

Flutt-Water conservará como borrador local el trabajo no confirmado de los formularios prioritarios: Productos, Clientes, alta de Vehículos, Configuración inicial, Fabricación de Inventario, Conteo físico, Devoluciones, Venta de Almacén, Pedidos asignables y programación de Jornada/Ruta. Los filtros, búsquedas, modales de consulta, contraseña y PIN quedan fuera del mecanismo.

## Contrato

Cada borrador se guarda en `localStorage` con una clave aislada por proyecto de interfaz, usuario autenticado y formulario. El valor contiene versión del contrato, identificador del formulario, etiqueta legible, fecha ISO de actualización y una copia serializada del estado del formulario.

| Flujo | Clave de formulario | Estado cubierto |
|---|---|---|
| Producto | `producto:{id|nuevo}` | Datos del SKU y precios |
| Cliente | `cliente:{id|nuevo}` | Datos del cliente y envase |
| Configuración | `configuracion-inicial` | Asistente de proyecto |
| Vehículo | `vehiculo:nuevo` | Alta administrativa |
| Inventario | `inventario:fabricacion` / `inventario:operacion` | Fabricación, conteo físico y devoluciones |
| Pedidos | `pedido:venta-almacen` / `pedido:nuevo` | Venta directa y pedido asignable |
| Jornada/Ruta | `jornada:ruta-transferencia` | Programación, carrito y pedidos incluidos |

La persistencia se ejecuta después de una pausa breve mientras existen cambios y también al recibir `pagehide` o `visibilitychange`. Esto cubre recarga, cierre de pestaña y la mayoría de los cierres del navegador móvil; ningún almacenamiento web puede garantizar escritura después de una pérdida eléctrica instantánea si el navegador no alcanzó a ejecutar el evento.

## Recuperación y descarte

Al abrir un formulario con un borrador disponible, la interfaz muestra las opciones **Continuar borrador** y **Descartar**. El botón **Cancelar** pregunta antes de descartar cambios; el regreso global y el cierre de sesión advierten si existe cualquier borrador del usuario. Un guardado exitoso en Firestore elimina el borrador local. Los botones de consulta o cierre sin cambios no muestran confirmaciones innecesarias.

No se guardan contraseñas, PIN, tokens, credenciales ni secretos. Firestore continúa siendo la fuente definitiva; el borrador solo representa trabajo local no confirmado.
