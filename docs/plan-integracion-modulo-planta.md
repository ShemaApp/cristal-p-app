# Plan de integración del módulo de planta

**Proyecto:** Flutt-Water
**Estado:** Etapa 1 — contrato técnico y línea base
**Regla de trabajo:** no desplegar reglas, índices ni Cloud Functions a producción hasta completar pruebas locales y revisión explícita.

## Etapas

| Etapa | Alcance | Puerta de salida |
|---|---|---|
| 1 | Versionar la especificación, congelar nombres y proteger la línea base actual. | Markdown válido, sintaxis actual correcta, diff revisado y commit aislado. |
| 2 | Agregar `tipoUnidad` y configuración de planta/vehículo sin cambiar todavía ventas. | Admin puede distinguir planta y vehículo; no se rompen jornadas existentes. |
| 3 | Agregar operaciones de planta y movimientos de agua/inventario. | Pruebas atómicas de producción, relleno y salida de agua. |
| 4 | Integrar ventas, caja, créditos e idempotencia. | Doble toque y repetición offline no duplican efectos. |
| 5 | Alinear outbox offline, Cloud Functions, reglas e índices. | Emulator Suite y consultas principales pasan. |
| 6 | Migración, documentación, commit final y despliegue controlado. | Revisión administrativa aprobada; despliegue separado del código de GitHub Pages. |

## Criterios de seguridad por etapa

Cada etapa debe cumplir estas condiciones antes de avanzar:

1. Los cambios deben quedar limitados al alcance de la etapa.
2. Se debe ejecutar `node --check` en los módulos JavaScript afectados.
3. Se debe ejecutar `git diff --check`.
4. Las reglas no se despliegan automáticamente.
5. No se eliminan colecciones ni documentos históricos.
6. Todo cambio de datos críticos debe ser inmutable o idempotente.
7. Si una regla bloquea una operación necesaria, se documenta y se corrige antes de continuar.
8. El commit de cada etapa debe ser pequeño, descriptivo y reversible.

## Estado inicial protegido

Antes de comenzar la etapa 2 se creó un checkpoint local fuera de GitHub en:

```text
/home/ubuntu/flutt-water-checkpoints/2026-08-20-before-planta/
```

La copia contiene el diff local, el estado de Git, los archivos modificados y la especificación técnica.

## No incluido todavía

Todavía no se crean colecciones de producción, no se modifican datos de Firebase, no se despliegan reglas ni índices, y no se agregan Cloud Functions al proyecto. Esas acciones requieren completar primero el diseño de la etapa correspondiente y probarlo localmente.

## Contrato de medidor

La lectura física es acumulada y estrictamente ascendente:

```text
lecturaNueva > ultimaLectura
cantidadSalida = lecturaNueva - ultimaLectura
```

El movimiento de agua puede registrar una salida negativa, pero la lectura física nunca disminuye.

## Contrato de unidades

```text
tipoUnidad = "vehiculo" | "planta"
```

La planta no recibe `rutaId` ni `transferenciaId` como requisito operativo. El vehículo mantiene jornada, medidor y venta QR/manual. La venta de agua no depende de transferencia.

## Revisión pendiente

La etapa 1 queda lista para revisión. Después de confirmar el commit de esta etapa, se puede iniciar la etapa 2 con cambios mínimos en la configuración de unidades.
