# Auditoría visual previa — Flutt-Water

## Alcance

Esta auditoría se realizó antes de editar el rediseño operativo. La regla aplicada es modificar únicamente presentación, jerarquía, estilos, iconos y organización visual. No se deben cambiar consultas, rutas, permisos, validaciones, estados, cálculos, persistencia ni contratos de datos.

## Mapa del shell y navegación

| Área | Ubicación | Contrato que debe permanecer intacto | Cambio visual permitido |
|---|---|---|---|
| Autenticación | `auth.js`, `app.js` | Inicio de sesión Firebase, perfil pendiente, PIN y cierre de sesión | Panel, logo base, tipografía, botones y estados |
| Encabezado | `app.js` | `tab`, `navegarA`, `volverAtras`, `goConfig`, notificaciones y `currentUser` | Altura, composición, iconos lineales, nombre comercial y foco |
| Menú lateral | `app.js` | `ALL_TABS`, `permisoTabs`, IDs de pestaña y callbacks `navegarA` | Agrupación visual, etiquetas visibles, iconos y estados activos |
| Sesión | `sesion.js` | Suscripciones Firestore, alcance por rol, modo offline, permisos y contadores pendientes | Ningún cambio funcional; solo mensajes y presentación consumidos por el shell |
| Componentes comunes | `app-core.js` | Contratos de `Card`, `BFill`, `BOut`, `Inp`, `Lbl`, `Row`, `Tag`, `Modal`, `Toggle` | Tokens, tamaños táctiles, bordes, sombras, foco, tipografía e iconografía |

## Pantalla Inicio

`dashboard.js` calcula ventas del día, ingresos, créditos pendientes, clientes atendidos, jornada activa, alertas, clientes principales, bajo inventario y ventas recientes. Las acciones llaman a `onIrA`, `onVentaRapida` y conservan sus destinos actuales.

Se puede rediseñar `StatTile`, las tarjetas de acciones, títulos, chips y jerarquía de secciones. No se deben modificar los filtros, cálculos, condiciones por rol ni callbacks existentes. La nueva jerarquía será: resumen operativo, acciones de campo, actividad y alertas.

## Pantalla Clientes

`clientes.js` contiene dos capas claramente separables. La lógica no visual incluye suscripciones de rutas, carteras, clientes disponibles, localidades, usuarios asignables y solicitudes; filtros derivados; guardados; asignación de clientes; QR; GPS; desactivación; aprobación y rechazo administrativo. Todo ello debe mantenerse intacto.

La capa visual puede reorganizar el encabezado, búsqueda, filtros plegables, chips, tarjetas compactas, miniatura QR, menú de acciones y modales. Deben conservarse los estados `filtroEstado`, `filtroCredito`, `filtroGPS`, `filtroLocalidad`, `filtroRuta`, `q`, `expandedId`, `form`, `histId` y todos sus handlers.

## Configuración

`config.js` mantiene los handlers de contraseña, PIN, vehículos, medidores, branding, usuarios, permisos y asistente inicial. El asistente actual concentra la configuración en un modal; el documento solicita distribuirla visualmente en cuatro pasos sin cambiar los campos ni `saveProjectSetup`.

La división visual prevista es: empresa/teléfono; medición/flujo/unidad; usuarios/roles/permisos; vehículos/rutas/operación. No se deben alterar `normalizarSetupProyecto`, valores válidos, `saveVehicle`, `saveProjectSetup`, el bloqueo por proyecto ni las consultas administrativas.

## Problemas visuales confirmados

1. El fondo actual usa `#EAF1F8` y debe pasar a `#F7FAFC`.
2. Los tokens actuales son industriales, pero no coinciden con el contrato visual solicitado.
3. El encabezado usa una franja diagonal repetida y debe sustituirse por una línea aqua o borde sutil.
4. Existen emojis en navegación, Inicio, Clientes, Configuración, mensajes y títulos; deben sustituirse progresivamente por una familia lineal consistente.
5. La tipografía de títulos y botones usa `Oswald` y mayúsculas extendidas; debe migrarse visualmente a una sans-serif legible.
6. Varios controles tienen áreas menores de 48 px o padding reducido; se deben ampliar sin cambiar eventos.
7. La pantalla Clientes expone todos los grupos de filtros simultáneamente; se debe convertir la mayor parte en un panel plegable sin perder filtros ni contadores.
8. La pantalla Inicio usa varias tarjetas de color fuerte; se debe reservar una tarjeta navy primaria y utilizar superficies blancas para el resto.

## Orden seguro de implementación

Primero se centralizarán tokens y componentes comunes. Después se actualizarán shell, encabezado y navegación. Luego se modificarán Inicio y Clientes. Finalmente se rediseñará Configuración inicial y se realizará verificación responsive y funcional. Cada etapa debe pasar validación de sintaxis antes de continuar.

**Estado:** auditoría completada; todavía no se ha modificado la lógica de negocio ni los contratos funcionales.
