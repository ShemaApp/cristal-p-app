# Despliegue de reglas e índices de Firestore desde Termux

**Proyecto:** Flutt-Water  
**Repositorio:** `ShemaApp/cristal-p-app`  
**Proyecto Firebase:** `flutt-water`  
**Método principal:** Termux nativo, sin Ubuntu proot

## 1. Alcance y advertencias

Este procedimiento publica únicamente recursos de Cloud Firestore. No publica GitHub Pages, no modifica Authentication, no cambia la configuración web de Firebase y no despliega funciones backend.

El repositorio ya contiene la configuración necesaria:

```text
.firebaserc
firebase.json
firestore.rules
firestore.indexes.json
```

`.firebaserc` apunta al proyecto `flutt-water` y `firebase.json` apunta a `firestore.rules` y `firestore.indexes.json`.

> **Advertencia crítica:** antes de confirmar un despliegue, verifica siempre que el proyecto activo sea exactamente `flutt-water`. No ejecutes `firebase init`, porque podría sobrescribir la configuración existente. Tampoco uses una cuenta o clave de servicio que no tenga autorización explícita sobre el proyecto.

## 2. Preparar Termux nativo

Se recomienda instalar Termux desde [F-Droid](https://f-droid.org/packages/com.termux/) o desde el repositorio oficial de Termux. La versión de Play Store puede estar desactualizada y producir problemas con paquetes recientes.

Abre Termux y ejecuta:

```bash
pkg update
pkg upgrade -y
pkg install git nodejs-lts openssh nano -y
```

Comprueba las versiones:

```bash
git --version
node --version
npm --version
```

Si `nodejs-lts` no existe en tu distribución de Termux, usa:

```bash
pkg install git nodejs openssh nano -y
```

Para evitar que Android suspenda la sesión durante la instalación o el despliegue, puedes usar opcionalmente:

```bash
termux-wake-lock
```

Al terminar, libera el bloqueo con:

```bash
termux-wake-unlock
```

## 3. Clonar el repositorio

Como el repositorio es público, la forma más sencilla es clonarlo por HTTPS:

```bash
cd "$HOME"
git clone https://github.com/ShemaApp/cristal-p-app.git
cd cristal-p-app
```

Comprueba la rama y el origen:

```bash
git branch --show-current
git remote -v
git pull --ff-only origin main
```

La rama debe ser `main` y el origen debe apuntar a:

```text
https://github.com/ShemaApp/cristal-p-app.git
```

Si el repositorio ya existe en Termux, no vuelvas a clonarlo. Usa:

```bash
cd "$HOME/cristal-p-app"
git status --short
git pull --ff-only origin main
```

Si `git status --short` muestra cambios locales, no ejecutes `git reset --hard` sin revisar primero esos cambios. El despliegue debe hacerse desde una copia limpia y aprobada.

## 4. Verificar los archivos antes de desplegar

Desde `/data/data/com.termux/files/home/cristal-p-app`, ejecuta:

```bash
pwd
cat .firebaserc
cat firebase.json
test -s firestore.rules && echo "OK: firestore.rules"
test -s firestore.indexes.json && echo "OK: firestore.indexes.json"
```

Debes ver en `.firebaserc`:

```json
{
  "projects": {
    "default": "flutt-water"
  }
}
```

Y en `firebase.json`:

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
```

Verifica el commit que vas a desplegar:

```bash
git log -1 --oneline
git status --short
```

El estado debe estar limpio. Si únicamente aparece el documento local de auditoría no rastreado, no afecta el despliegue, pero conviene no tener cambios de código sin revisar.

## 5. Instalar Firebase CLI

Instala la CLI con npm:

```bash
npm install --global firebase-tools
```

Comprueba que funciona:

```bash
firebase --version
```

Si Termux muestra un error de permisos durante la instalación global, configura el prefijo de npm dentro del entorno escribible de Termux y repite:

```bash
npm config set prefix "$PREFIX"
npm install --global firebase-tools
```

No instales la CLI con `sudo`; Termux no utiliza ese flujo como una distribución Ubuntu normal.

## 6. Iniciar sesión en Firebase desde Termux

Termux normalmente no puede recibir el callback local de autenticación del navegador. Utiliza la modalidad sin localhost:

```bash
firebase login --no-localhost
```

La CLI mostrará una URL. El procedimiento es:

1. Copia la URL que aparece en Termux.
2. Ábrela en el navegador del teléfono.
3. Inicia sesión con la cuenta de Google que tiene acceso administrativo a `flutt-water`.
4. Autoriza Firebase CLI.
5. Firebase mostrará un código de autorización.
6. Regresa a Termux y pega el código cuando lo solicite.

Confirma que la sesión quedó activa:

```bash
firebase login:list
firebase projects:list
```

En la lista de proyectos debe aparecer `flutt-water`. Si no aparece, la cuenta utilizada no tiene acceso al proyecto correcto o se inició sesión con otra cuenta.

## 7. Seleccionar producción explícitamente

Desde el repositorio:

```bash
cd "$HOME/cristal-p-app"
firebase use flutt-water
firebase use
```

La salida debe indicar que el proyecto activo es:

```text
flutt-water
```

También puedes forzar el proyecto en cada comando para evitar depender del estado de la sesión:

```bash
firebase deploy --project flutt-water --only firestore:rules
```

## 8. Desplegar primero las reglas

Se recomienda publicar las reglas separadas de los índices. Primero revisa el archivo:

```bash
sed -n '1,220p' firestore.rules
```

Después ejecuta:

```bash
firebase deploy \
  --project flutt-water \
  --only firestore:rules
```

Cuando Firebase CLI pida confirmación, verifica nuevamente el identificador `flutt-water` y confirma únicamente si es el proyecto correcto.

Las reglas tienen efecto sobre las lecturas y escrituras de producción. Por ello, después del despliegue prueba con cuentas separadas de `admin`, `vendedor` y `repartidor`; probar solamente con admin puede ocultar errores de autorización.

## 9. Verificar las reglas en Firebase Console

Abre [Firebase Console](https://console.firebase.google.com/) y selecciona `flutt-water`.

Ve a:

```text
Firestore Database → Rules
```

Comprueba que la versión publicada corresponda al archivo del commit local.

Pruebas mínimas:

| Rol | Prueba |
|---|---|
| Admin | Leer configuración, productos, clientes, vehículos, inventario, reportes y gerencia. |
| Vendedor | Abrir Planta, Venta de planta, Clientes de planta, Cobro de créditos y Mi caja. |
| Repartidor | Abrir Mi jornada, Mi cartera, Cobro de mi cartera, Mi vehículo, Venta QR y Mi caja. |

Si la consola del navegador muestra `permission-denied`, no modifiques inmediatamente el frontend. Primero registra el rol, la colección, el documento y la operación que fue rechazada. Ese error normalmente indica que la regla no coincide con los datos enviados o que la consulta no contiene el filtro que la regla necesita.

## 10. Desplegar los índices desde el repositorio

Si quieres publicar todos los índices declarados en `firestore.indexes.json`, ejecuta:

```bash
firebase deploy \
  --project flutt-water \
  --only firestore:indexes
```

La CLI puede informar que algunos índices ya existen, que otros están en construcción o que hay índices remotos que no aparecen en el archivo local.

> **No confirmes eliminaciones automáticamente.** Si Firebase propone eliminar índices existentes que no están en `firestore.indexes.json`, detén el proceso con `Ctrl+C`, revisa la diferencia en Firebase Console y decide si esa eliminación es realmente intencional.

Los índices pueden tardar en construir. Durante ese periodo pueden aparecer como `Building`. Una consulta que requiere un índice puede mostrar `FAILED_PRECONDITION`; esto no es lo mismo que `permission-denied`.

Si prefieres crearlos manualmente desde Firebase Console, omite el comando anterior y ve a:

```text
Firebase Console → Firestore Database → Indexes
```

En ese caso, crea los índices necesarios y espera a que estén en estado `Enabled`. Si Firestore muestra un enlace para crear un índice al ejecutar una consulta, utiliza ese enlace y luego documenta el índice en `firestore.indexes.json` para evitar que producción y Git diverjan.

## 11. Desplegar reglas e índices juntos

Una vez que hayas probado las reglas por separado, también puedes ejecutar:

```bash
firebase deploy \
  --project flutt-water \
  --only firestore:rules,firestore:indexes
```

Para el primer despliegue de este cambio, es más seguro mantenerlos separados. Las reglas cambian la autorización inmediatamente; los índices pueden tardar en construirse.

## 12. Errores frecuentes en Termux

### `firebase: command not found`

La instalación de npm no quedó en el `PATH`. Ejecuta:

```bash
npm config get prefix
npm install --global firebase-tools
hash -r
firebase --version
```

Si continúa el problema:

```bash
export PATH="$PREFIX/bin:$PATH"
```

### La autenticación intenta abrir localhost

Cancela el proceso y utiliza:

```bash
firebase login --no-localhost
```

### Error 403 o falta de permisos

La cuenta autenticada no tiene permisos suficientes sobre `flutt-water`, o se seleccionó otro proyecto. Comprueba:

```bash
firebase login:list
firebase projects:list
firebase use
```

### `permission-denied` desde la PWA

La regla está rechazando la operación. Revisa el rol guardado en `usuarios/{uid}`, el UID autenticado, el alcance del documento y los filtros de la consulta.

### `FAILED_PRECONDITION: The query requires an index`

La consulta necesita un índice compuesto. Créalo desde Firebase Console o despliega la definición correspondiente de `firestore.indexes.json`.

### La PWA sigue mostrando la versión anterior

El Service Worker puede conservar una caché anterior. Comprueba que GitHub Pages haya publicado la nueva versión y realiza una recarga forzada o elimina los datos del sitio. El despliegue de reglas no actualiza automáticamente el código de la PWA.

## 13. Rollback de reglas

Si una regla bloquea una operación válida, puedes restaurar temporalmente una versión anterior desde Git. Primero guarda el estado actual:

```bash
cd "$HOME/cristal-p-app"
git status --short
git branch backup-antes-rollback-$(date +%Y%m%d-%H%M)
```

Para restaurar temporalmente el archivo de reglas de un commit anterior:

```bash
git show 20f2498:firestore.rules > /tmp/firestore.rules.rollback
cp /tmp/firestore.rules.rollback firestore.rules
firebase deploy \
  --project flutt-water \
  --only firestore:rules
```

Después de resolver la incidencia, recupera el archivo actual sin perder el historial:

```bash
git restore --source=HEAD -- firestore.rules
```

El rollback de reglas no revierte datos de Firestore, ventas, créditos ni inventario. Los datos requieren un procedimiento de restauración separado.

## 14. Comandos resumidos para el primer despliegue

Una vez que Termux esté preparado, el flujo mínimo es:

```bash
pkg update && pkg upgrade -y
pkg install git nodejs-lts openssh -y
cd "$HOME"
git clone https://github.com/ShemaApp/cristal-p-app.git
cd cristal-p-app
npm install --global firebase-tools
firebase login --no-localhost
firebase projects:list
firebase use flutt-water
firebase deploy --project flutt-water --only firestore:rules
firebase deploy --project flutt-water --only firestore:indexes
```

No ejecutes `firebase deploy --only hosting` para este procedimiento. Tampoco ejecutes `firebase init` dentro del repositorio existente.

## 15. Alternativa desde Ubuntu proot

Si prefieres Ubuntu proot, el flujo es equivalente, pero los comandos iniciales cambian:

```bash
apt update
apt install -y git curl ca-certificates nodejs npm openssh-client
npm install --global firebase-tools
```

Después utiliza exactamente los pasos de clonación, autenticación, selección de proyecto y despliegue descritos arriba. Para el primer despliegue, Termux nativo es más sencillo porque evita problemas de PATH, permisos y callbacks adicionales de proot.

## Referencias

[1]: https://firebase.google.com/docs/cli "Firebase CLI reference"

[2]: https://firebase.google.com/docs/firestore/security/get-started "Get started with Cloud Firestore Security Rules"

[3]: https://firebase.google.com/docs/firestore/query-data/indexing "Manage indexes in Cloud Firestore"

[4]: https://firebase.google.com/docs/cli#cli-ci-systems "Firebase CLI in CI systems"

[5]: https://github.com/termux/termux-app "Termux official repository"

[6]: https://f-droid.org/packages/com.termux/ "Termux on F-Droid"
