# Auditoría inicial de identidad y configuración

La aplicación técnica utiliza el nombre **Flutt-Water** en `index.html`, el manifiesto y varias superficies de la interfaz. El logo actual está en `icons/icon-192.png` y `icons/icon-512.png`: es un cuadrado azul oscuro con una gota celeste y las letras `FW` en la parte inferior. El símbolo comunica agua, pero la composición es muy compacta, el texto pequeño pierde fuerza en tamaños reducidos y todavía no existe una variante horizontal o monocromática para tickets y encabezados.

La configuración actual tiene secciones para perfil, contraseña, PIN, usuarios, vehículos y permisos. No existe todavía una colección o documento global para el nombre comercial, subtítulo, teléfono, logotipo personalizado o lema.

La solución propuesta separa:

| Capa | Uso |
|---|---|
| Identidad técnica | `Flutt-Water`, nombre estable de la PWA, repositorio, Firebase, Service Worker y documentación técnica. |
| Marca comercial | Nombre que verá el cliente en login, encabezado, tickets, bienvenida y futuras etiquetas; por ejemplo `FluttWater Purificadora Hidequel` o `Flutt-Water Cristal Plus`. |
| Aplicación | Texto estable `Flutt-Water` como nombre técnico y fallback si no existe personalización. |

La primera versión mantendrá un logo base de Flutt-Water como fallback y permitirá que la marca comercial cambie sin alterar el proyecto Firebase ni las reglas de seguridad.
