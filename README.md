# Flutt-Water

PWA para la operación de distribución de agua: productos, clientes, ventas, créditos, inventario, jornadas, reportes y configuración de usuarios.

## Stack

La interfaz usa HTML, CSS y JavaScript con React cargado desde CDN. Firebase Authentication gestiona el inicio de sesión y Cloud Firestore almacena los datos operativos. La aplicación mantiene soporte offline de Firestore cuando el navegador lo permite.

## Ejecución local

Sirve los archivos desde un servidor HTTP; no abras `index.html` directamente porque los módulos externos, el service worker y Firebase requieren un origen HTTP o HTTPS.

```bash
python3 -m http.server 8080
```

Después abre `http://localhost:8080/`.

## Firebase

La aplicación está configurada para el proyecto web `flutt-water`. Deben habilitarse en Firebase Authentication los proveedores necesarios y agregar los dominios de desarrollo/publicación a la lista de dominios autorizados. Las reglas se encuentran en `firestore.rules` y la configuración CLI en `firebase.json` y `.firebaserc`.

Antes de desplegar reglas en un proyecto real, probarlas en un proyecto de desarrollo o con Firebase Emulator Suite. No colocar cuentas de servicio, tokens de WhatsApp, claves de Admin SDK ni contraseñas en este repositorio.

## Identificadores QR

Los códigos de cliente usan el formato `FLW-CLIENTE:<id>`. El QR no debe incluir datos personales ni financieros; únicamente referencia el identificador que Firebase valida.

## WhatsApp

La PWA genera enlaces `wa.me` con mensajes de comprobante o guía. Un enlace prellenado no confirma entrega. La automatización futura debe realizarse mediante backend y un proveedor autorizado; nunca se debe guardar un token de WhatsApp en el navegador.

## Migración

Esta versión reutiliza lógica funcional de una aplicación anterior, pero separa el proyecto Firebase, elimina branding heredado, sustituye QR y cachés, y usa iconos neutrales de Flutt-Water. El repositorio productivo de origen no forma parte de este proyecto ni debe modificarse durante la migración.

Consulta `SECURITY.md` antes de añadir colecciones, permisos o integraciones externas.
