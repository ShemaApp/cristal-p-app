# Validación de layout móvil

La aplicación local cargó correctamente la pantalla de autenticación. La primera medición se ejecutó con un viewport de escritorio de 1280 px y no mostró un ancho de documento superior al viewport.

La medición mostró `overflowX: visible` en `body` y `#root`, lo que indica que el navegador de prueba todavía estaba usando una versión anterior del Service Worker/caché antes de aplicar la nueva versión `v9-mobile-overflow-fix`. La siguiente comprobación debe limpiar el Service Worker y recargar el shell antes de medir nuevamente.

Se eliminó el Service Worker, se borraron las cachés locales y se recargó el shell. La pantalla de autenticación volvió a cargar correctamente sin error visible. Falta ejecutar la medición final sobre esta versión limpia.

La captura con Chromium en viewport real de 390×844 px se generó correctamente. La pantalla de autenticación quedó contenida dentro del viewport, con márgenes laterales visibles y sin recorte del panel, campos ni botón. El shell responsive actualizado usa `overflow-x:hidden` en el documento, `overflow-x:clip` en `#root`, ancho 100% y controles con `min-width:0`.
