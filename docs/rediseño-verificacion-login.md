# Verificación visual del rediseño — Login

Fecha de revisión: 2026-08-18.

Se hicieron dos comprobaciones sobre el servidor local de la PWA. La primera confirmó que el shell cargaba sin errores visibles, pero el inicio de sesión mostraba el recurso compacto `icons/icon-192.png` en lugar del logotipo horizontal. La causa fue un valor antiguo de branding persistido sin `logoLoginPath`.

Se corrigió `branding.js` para que `logoLoginPath` use siempre `icons/logo-flutt-water-login-base.png`, sin modificar el nombre comercial, subtítulo, teléfono, datos de Firestore ni el flujo de autenticación.

La segunda comprobación confirmó que el Markdown de la página y la vista visual ya muestran `icons/logo-flutt-water-login-base.png`, el logotipo horizontal “Flutt Water”, un panel blanco con borde aqua, fondo claro y botón aqua legible. No se observaron errores visibles de renderizado en el login.

Pendiente de esta fase: revisar las pantallas autenticadas con una sesión disponible y comprobar responsive en móvil y escritorio.
