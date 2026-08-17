# Control de Operaciones PWA

PWA inicial construida con **HTML, CSS y JavaScript vanilla**. La autenticación utiliza Firebase Authentication mediante el proveedor **Correo electrónico/contraseña**.

## Alcance actual

Esta primera fase incluye únicamente:

- Inicio de sesión con `signInWithEmailAndPassword`.
- Persistencia de la sesión administrada por Firebase Auth.
- Detección de sesión con `onAuthStateChanged`.
- Cierre de sesión.
- Vista protegida básica.
- Manifest de PWA y service worker para recursos estáticos.
- Sin registro público.
- Sin recuperación de contraseña implementada.
- Sin clientes, rutas, ventas, inventario ni escrituras en Firestore.

## Ejecución local

La aplicación debe servirse mediante HTTP, no abriendo el archivo directamente con `file://`, para que el service worker funcione correctamente y para aproximarse al entorno real de despliegue.

Por ejemplo, desde esta carpeta puede usarse cualquier servidor estático local compatible:

```bash
npx serve .
```

Después se abre la URL local mostrada por el servidor.

## Configuración de Firebase

La configuración web de Firebase está en `src/auth.js`. Es normal que la configuración web contenga `apiKey`, `projectId` y `appId`; no es una cuenta de servicio ni una credencial administrativa. Nunca se deben introducir en el repositorio contraseñas, tokens privados, certificados ni archivos de cuenta de servicio.

En Firebase Console debe permanecer habilitado únicamente el flujo requerido: **Authentication → Sign-in method → Email/Password**. Los usuarios se crean desde la consola o desde un futuro panel administrativo autorizado. No se debe añadir una función `createUserWithEmailAndPassword` al cliente público.

## Prueba manual

1. Abrir la PWA servida por HTTP.
2. Introducir el correo del usuario creado en Firebase Console.
3. Introducir su contraseña directamente en el formulario; no compartirla con el equipo de desarrollo ni guardarla en archivos.
4. Confirmar que aparece el panel protegido.
5. Cerrar sesión y confirmar que vuelve el formulario.
6. Probar una contraseña incorrecta y confirmar que se muestra un mensaje genérico, sin revelar si el correo existe.

## Siguiente aprobación requerida

Antes de crear la estructura de Firestore se deben aprobar los roles, organizaciones, rutas, clientes, unidades de medida, precios, estados de jornada, movimientos de caja y reglas de autorización. Ningún módulo de negocio debe escribirse hasta acordar ese modelo.
