# Seguridad del proyecto

## Principios

La PWA usa Firebase Authentication para identidad y Cloud Firestore para el perfil operativo. La contraseña nunca se almacena en Firestore, en el código fuente ni en logs. La configuración web de Firebase contiene datos públicos de identificación de la aplicación, pero no sustituye las reglas de Firestore ni concede privilegios administrativos.

## Roles

El rol se almacena en `users/{uid}`. Un usuario puede actualizar sus datos de perfil, pero no puede cambiar su propio `role`, `active`, `email` u `organizationId`. La asignación de roles y la desactivación de cuentas requieren un administrador y deben realizarse con reglas de Firestore y, para altas de cuentas Authentication, mediante Firebase Console o un backend con Admin SDK.

## Colecciones protegidas

`organizations/{organizationId}` contiene la configuración de empresa, el teléfono empresarial para avisos de crédito y la plantilla de bienvenida. Solo usuarios activos de la misma organización pueden leerla; únicamente administradores pueden escribirla.

`notifications/{notificationId}` se lee por el destinatario. El cliente solo puede actualizar campos operativos permitidos, como estado de lectura. La creación de notificaciones debe ocurrir mediante backend o Cloud Functions para impedir falsificación y duplicados.

`audit_logs/{auditId}` es de solo lectura para administradores desde la aplicación. La escritura debe ocurrir en backend o Cloud Functions, donde el actor y la acción se calculan de forma confiable.

## Despliegue

Antes de desplegar, probar las reglas en el emulador o en un proyecto de desarrollo. No usar una cuenta de servicio dentro de la PWA. Cualquier secreto de WhatsApp, proveedor de mensajería o Admin SDK debe permanecer en variables protegidas del backend.
