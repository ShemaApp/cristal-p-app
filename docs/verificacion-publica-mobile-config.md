# Verificación pública del hotfix móvil

Fecha: 2026-08-18.

La PWA pública fue abierta en `https://shemaapp.github.io/cristal-p-app/`. La pantalla de login carga correctamente el logotipo horizontal base `icons/logo-flutt-water-login-base.png`.

Desde la consola de la propia página se consultó `navigator.serviceWorker` y `caches.keys()`. El resultado fue:

- Registro de Service Worker: activo.
- Estado: `activated`.
- Scope: `https://shemaapp.github.io/cristal-p-app/`.
- Cache activa: `flutt-water-v19-mobile-config-fix`.

Conclusión: la publicación pública ya sirve el Service Worker del hotfix responsive v19. La pantalla de Configuración autenticada todavía requiere sesión iniciada para inspección visual directa en esta sesión de navegador.
