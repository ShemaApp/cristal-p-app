# Validación del rediseño de menús contextuales

Fecha: 18 de agosto de 2026.

La PWA local carga la pantalla de inicio de sesión y solicita `app-core.js` correctamente. La primera consulta del navegador mostró `document.readyState = complete` y un Service Worker disponible.

La consulta de `window.OpcionesMenu` devolvió `undefined`, por lo que se debe revisar la consola del navegador antes de publicar. El componente se añadió a `app-core.js`, pero todavía no se considera validado hasta confirmar que el archivo termina de ejecutarse sin excepciones.
Tras incrementar la caché del Service Worker a `flutt-water-v21-context-menus` y recargar, el navegador confirmó `OpcionesMenu: function`, `app-core.js` cargado y únicamente la caché v21 activa. El hallazgo inicial correspondía a la caché local v20, no a una excepción del componente.
La migración cubre Clientes, Productos, Inventario, Créditos, Gerencia y Configuración. Todos los archivos JavaScript pasan `node --check` y `git diff --check` no reporta errores. La consola del navegador solo mostró la advertencia conocida de Firestore sobre `enableMultiTabIndexedDbPersistence`; no hubo excepciones de la aplicación.
