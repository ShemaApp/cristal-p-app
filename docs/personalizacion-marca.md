# Personalización de marca comercial

## Separación de identidades

Flutt-Water conserva su identidad técnica como nombre de la PWA, del repositorio, del proyecto Firebase, del Service Worker y de la documentación. La configuración permite definir una **marca comercial visible al cliente** sin cambiar esa infraestructura. Ejemplos válidos son `FluttWater Purificadora Hidequel` y `Flutt-Water Cristal Plus`.

## Documento Firestore

La marca se guarda en `_meta/branding`:

```js
{
  nombreComercial: 'FluttWater Purificadora Hidequel',
  subtitulo: 'Purificadora y reparto de agua',
  lema: 'Agua limpia, siempre cerca',
  telefono: '637 137 5399',
  logoPath: 'icons/icon-192.png',
  actualizadoPorUid: 'uid-del-administrador',
  actualizadoPorNombre: 'Nombre del administrador',
  actualizadoEn: serverTimestamp()
}
```

El documento contiene únicamente identidad comercial no sensible. Puede leerse públicamente para mostrar la marca antes del login, pero solo un perfil `admin` puede crearlo o modificarlo. Las reglas validan longitudes, tipos de campo y el logo permitido.

## Superficies personalizadas

La marca se refleja en la pantalla de acceso, el título del documento, el encabezado, la pantalla de Etiquetas, las etiquetas de código de barras impresas, las guías de jornada y los comprobantes enviados por WhatsApp. Las notas y pedidos nuevos guardan también `marcaComercial` para conservar la identidad usada al momento de registrar la operación.

El nombre técnico `Flutt-Water` se utiliza como fallback si el documento todavía no existe o si la lectura de Firestore falla. Esto permite que la PWA siga siendo operativa incluso sin conexión o durante la primera instalación.

## Configuración

La sección se encuentra en **Configuración → Marca** y solo aparece para administración. Permite capturar nombre comercial, subtítulo, lema opcional y teléfono comercial. El logo base actualizado se distribuye con la PWA; la carga de archivos externos no se habilita para evitar dependencias inseguras y rutas no controladas.

## Instalación PWA

El manifiesto conserva `Flutt-Water` como nombre técnico del instalable porque el nombre de la marca comercial vive en Firestore y puede cambiar por cliente. La interfaz visible se actualiza dinámicamente; cambiar también la etiqueta del icono instalado requeriría generar o publicar un manifiesto específico por cliente.
