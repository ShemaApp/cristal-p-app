# Despliegue de reglas e índices de Firestore en producción

El despliegue no se realiza dentro del servidor de GitHub Pages. Se ejecuta desde una máquina administrativa o un pipeline CI/CD autenticado contra el proyecto Firebase **`flutt-water`**.

El repositorio contiene la configuración necesaria:

```text
firebase.json
.firebaserc
firestore.rules
firestore.indexes.json
```

> La ruta `/home/cristalP` es la ruta local utilizada en el entorno de desarrollo. Si ejecutas los comandos en otra máquina, reemplázala por la ruta real del repositorio.

## 1. Instalar y autenticar Firebase CLI

En una máquina segura, instala la CLI si aún no está disponible:

```bash
npm install -g firebase-tools
firebase --version
```

Para un despliegue manual interactivo:

```bash
firebase login
firebase projects:list
```

No introduzcas credenciales en el repositorio ni las compartas por chat. La configuración web de Firebase (`apiKey`) no autoriza despliegues; se necesita una sesión autenticada de Firebase CLI o una identidad de servicio con permisos administrativos.

## 2. Seleccionar explícitamente producción

Desde el proyecto local:

```bash
cd /home/cristalP
firebase use flutt-water
firebase use
```

Antes de continuar, confirma que el proyecto activo sea exactamente:

```text
flutt-water
```

Como verificación adicional:

```bash
cat .firebaserc
cat firebase.json
```

La configuración debe apuntar a:

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
```

## 3. Revisar el diff antes de desplegar

```bash
git status --short
git log -1 --oneline
sed -n '1,220p' firestore.rules
cat firestore.indexes.json
```

El commit que contiene la limpieza de roles y privacidad es:

```text
fd239ba feat: role-based navigation cleanup, remove GPS/maps, add planta ticket flow
```

Es recomendable crear una etiqueta o registrar el commit actual antes del despliegue:

```bash
git tag pre-produccion-firestore-$(date +%Y%m%d-%H%M)
git push origin --tags
```

## 4. Desplegar primero las reglas

Se recomienda desplegar las reglas por separado para identificar con claridad cualquier problema de autorización:

```bash
firebase deploy \
  --only firestore:rules \
  --project flutt-water
```

Este cambio se aplica a producción prácticamente de inmediato. Después del despliegue, prueba con cuentas separadas de **admin**, **vendedor** y **repartidor**. No utilices únicamente la cuenta de administrador, porque una regla incorrecta puede quedar oculta por sus privilegios.

## 5. Desplegar después los índices

Cuando las reglas hayan sido verificadas:

```bash
firebase deploy \
  --only firestore:indexes \
  --project flutt-water
```

También puedes desplegar ambos recursos en una sola operación:

```bash
firebase deploy \
  --only firestore:rules,firestore:indexes \
  --project flutt-water
```

Para este cambio es preferible utilizar dos comandos separados. Las reglas son una modificación de seguridad inmediata; los índices pueden tardar en construirse y aparecerán con estado pendiente durante ese proceso.

| Recurso | Efecto | Verificación recomendada |
|---|---|---|
| `firestore.rules` | Cambia quién puede leer o escribir | Firebase Console, Rules Playground y pruebas con los tres roles |
| `firestore.indexes.json` | Crea o actualiza índices compuestos | Firebase Console → Firestore Database → Indexes |
| Datos existentes | No se migran ni modifican por este despliegue | Revisar colecciones y respaldos por separado |

## 6. Verificar en Firebase Console

Abre [Firebase Console](https://console.firebase.google.com/), selecciona **`flutt-water`** y revisa lo siguiente:

| Área | Qué comprobar |
|---|---|
| Firestore Database → Rules | Que la versión publicada corresponda al archivo `firestore.rules` del commit desplegado. |
| Firestore Database → Indexes | Que los índices aparezcan como `Enabled` o `Building`, sin errores. |
| Authentication → Users | Que existan únicamente los usuarios creados administrativamente. |
| Firestore → `usuarios` | Que los perfiles tengan roles `admin`, `vendedor` o `repartidor`; `usuario` debe conservarse solo como alias temporal. |

## 7. Pruebas mínimas posteriores

### Cuenta de vendedor

Confirma que puede abrir **Venta de planta**, utilizar **Público general**, registrar una venta de contado y descontar stock atómicamente. Debe fallar si intenta utilizar crédito para **Público general**, modificar productos manualmente, crear clientes arbitrarios o acceder a reportes.

### Cuenta de repartidor

Confirma que puede abrir una jornada, usar **Venta QR**, registrar una venta vinculada a su transferencia y consultar únicamente su cartera. Debe fallar si intenta modificar productos, editar una ficha existente, consultar reportes, acceder a clientes de otro repartidor o escribir una venta sin transferencia activa.

### Cuenta de administrador

Confirma el acceso a configuración, catálogo, vehículos, medidores, inventario, reportes, rutas y supervisión de caja. También verifica que los registros inmutables no puedan actualizarse ni eliminarse.

## 8. Despliegue desde CI/CD o servidor sin sesión interactiva

Para producción automatizada, utiliza una cuenta de servicio almacenada fuera del repositorio. En el servidor, la variable puede apuntar a un archivo protegido:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/etc/flutt-water/firebase-deploy-sa.json
firebase deploy \
  --only firestore:rules,firestore:indexes \
  --project flutt-water
```

El archivo debe tener permisos restrictivos:

```bash
chmod 600 /etc/flutt-water/firebase-deploy-sa.json
```

La cuenta debe contar con permisos suficientes para publicar reglas e índices. En entornos empresariales es preferible utilizar Workload Identity Federation o credenciales temporales en lugar de una clave JSON permanente. Nunca almacenes ese archivo dentro de GitHub, GitHub Pages o el directorio público de la PWA.

## 9. Rollback

Si una regla bloquea una operación válida, vuelve al commit anterior y despliega únicamente las reglas:

```bash
git checkout defaf78 -- firestore.rules
firebase deploy \
  --only firestore:rules \
  --project flutt-water
```

Después puedes restaurar la versión posterior desde Git:

```bash
git checkout fd239ba -- firestore.rules
```

Para índices, restaura el `firestore.indexes.json` aprobado y vuelve a ejecutar el despliegue. Revisa cualquier solicitud de eliminación de índices antes de confirmarla; no uses opciones forzadas sin verificar el estado actual en Firebase Console.

> **Orden recomendado:** respaldo y revisión del diff → reglas → pruebas con los tres roles → índices → verificación en consola → publicación de la PWA.

## Referencias

[1]: https://firebase.google.com/docs/cli "Firebase CLI documentation"

[2]: https://firebase.google.com/docs/firestore/security/get-started "Cloud Firestore Security Rules"

[3]: https://firebase.google.com/docs/firestore/query-data/indexing "Cloud Firestore indexes"

[4]: https://firebase.google.com/docs/projects/iam/overview "Firebase and Google Cloud IAM overview"
