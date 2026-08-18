# Validación de identidad visual y marca comercial

La nueva propuesta de logo seleccionada es un icono cuadrado azul profundo con un símbolo de gota/cristal facetado en tonos cian y azul claro. Se generaron los tamaños PWA de 192 y 512 píxeles, incluyendo el icono maskable.

La pantalla de login se probó con Chromium en un viewport móvil de 390×844 píxeles usando un perfil limpio, sin Service Worker ni caché anterior. El logo cargó completo, centrado y nítido; el nombre predeterminado `FLUTT-WATER` y el subtítulo `PURIFICADORA Y REPARTO DE AGUA` también quedaron dentro del ancho disponible sin recorte.

La personalización de marca se guarda en `_meta/branding`. Si no existe ese documento, la PWA utiliza los valores predeterminados de Flutt-Water. La prueba de escritura autenticada requiere una sesión Firebase con rol `admin`, por lo que debe ejecutarse al abrir Configuración → Marca con la cuenta administrativa.

La PWA local volvió a cargar la pantalla de autenticación después de integrar `branding.js`. La consola no mostró excepciones de JavaScript; únicamente apareció la advertencia conocida de Firebase sobre la futura depreciación de `enableMultiTabIndexedDbPersistence()` y el mensaje de registro correcto del Service Worker.
