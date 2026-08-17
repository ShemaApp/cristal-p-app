# Seguridad de Flutt-Water

## Alcance

La aplicación es una PWA con React cargado desde CDN y Firebase Authentication/Cloud Firestore. La configuración web de Firebase identifica el proyecto `flutt-water`, pero no constituye una credencial administrativa. Las contraseñas, cuentas de servicio, tokens de WhatsApp y claves de Admin SDK nunca deben estar en el cliente.

## Identidad y roles

Firebase Authentication controla la identidad. El perfil operativo se guarda en `usuarios/{uid}` y contiene, como mínimo, el correo, nombre visible, rol, estado activo y permisos operativos. La interfaz puede ocultar acciones, pero la autorización real debe permanecer en Firestore Rules y, para operaciones privilegiadas, en Cloud Functions o un backend con Admin SDK.

La creación de cuentas con contraseña desde el navegador debe considerarse temporal y de migración. Para producción, la alta de usuarios debe realizarse desde Firebase Console o mediante un backend privilegiado. El cliente no debe recibir ni almacenar contraseñas de terceros.

## Colecciones migradas

La aplicación utiliza `productos`, `inventario_historial`, `clientes`, `notas`, `creditos`, `pedidos`, `rutas`, `devoluciones`, `gastos`, `cierres_caja`, `usuarios` y `_meta`. Las reglas actuales niegan por defecto las colecciones no declaradas. Antes de agregar una colección nueva, se debe agregar su bloque de autorización y una prueba correspondiente.

Las ventas (`notas`) y cierres de caja son inmutables después de su creación. Los cambios de inventario deben quedar asociados al usuario que los realiza. El control de rutas y transferencias debe revisarse antes de adaptar el modelo a jornadas flexibles.

## QR y WhatsApp

El QR utiliza el prefijo de Flutt-Water `FLW-CLIENTE:` y solo transporta un identificador de cliente; no debe incluir nombre, teléfono, crédito, dirección ni datos del envase. El backend o las reglas deben validar que el documento exista y que el usuario pueda operar sobre él.

Los enlaces `wa.me` solo abren un mensaje prellenado y no prueban entrega. Cualquier envío automático, notificación de crédito o uso de un teléfono empresarial debe pasar por un proveedor autorizado desde backend. Nunca debe colocarse un token de WhatsApp en JavaScript, Firestore o el historial Git.

## Offline y caché

Firestore puede mantener datos offline según las capacidades del navegador. El service worker solo debe cachear el shell estático y recursos públicos; no debe cachear respuestas de Authentication, Firestore ni datos de clientes. Cada migración debe aumentar el nombre de caché y limpiar caches antiguas.

## App Check y despliegue

App Check debe activarse para el dominio final de Flutt-Water. No se incluye un token de depuración en producción. Las API keys web y la clave pública de reCAPTCHA deben restringirse por dominio y API en Firebase Console; las reglas de Firestore siguen siendo el control principal.

Antes de publicar, ejecutar las reglas en un proyecto de desarrollo o Emulator Suite, verificar dominios autorizados de Firebase Authentication y revisar que no existan secretos en el árbol de archivos ni en el historial Git.
