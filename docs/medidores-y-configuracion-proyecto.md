# Medidores, configuración de proyecto y precios operativos

## Decisión principal

La configuración inicial pertenece al **proyecto Firebase**, no al teléfono. La aplicación detecta el proyecto mediante `firebase.app().options.projectId` y consulta `_meta/system_setup`.

Si el documento existe y `configuracionInicialCompletada == true`, un repartidor, usuario o administrador entra normalmente. Si no existe, el primer administrador autenticado recibe un asistente de configuración. El asistente se guarda una sola vez y las reglas Firestore impiden actualizarlo o eliminarlo desde la PWA.

El proyecto actual, que ya tenía `_meta/branding`, se migra automáticamente con un valor predeterminado de medidor de volumen en litros. Esta migración evita interrumpir una instalación que ya contiene datos; un proyecto Firebase nuevo sin configuración sí solicita el asistente.

## Magnitudes investigadas

| Magnitud | Ejemplos | ¿Sirve para calcular una venta por lectura acumulada? | Decisión |
|---|---|---:|---|
| Volumen acumulado | L, gal, m³, kL, ft³ | Sí | Magnitud operativa para vehículos y futuras plantas. |
| Caudal instantáneo | L/min, gal/min, m³/h, L/s | No por sí solo | Se reserva para sensores que midan volumen por tiempo. Requiere intervalo para calcular cantidad. |
| Presión | psi, bar, kPa | No | Se reserva para instrumentación técnica; no se convierte a litros ni participa en ventas. |

NIST mantiene tablas separadas para presión y flujo: PSI aparece en presión, mientras L/min, L/s y m³/h aparecen en flujo de gas o volumen por tiempo [1]. Oklahoma State University también distingue unidades de volumen de unidades de flujo [2]. La recomendación metrológica OIML R49/ISO 4064 trata el medidor de agua como instrumento para indicar volumen y usa m³ o kL en el contexto normativo [3].

Por ello, **PSI no será una unidad de cantidad vendible**. Podrá ser un futuro sensor de presión asociado a una planta, pero nunca se multiplicará por un precio como si fuera agua, gasolina o gas.

## Catálogo implementado

El archivo `medidores-config.js` centraliza magnitudes y unidades. Para volumen acumulado se habilitaron litros, galones, metros cúbicos, kilolitros y pies cúbicos. Para caudal se habilitaron L/min, gal/min, m³/h y L/s. Para presión se habilitaron psi, bar y kPa.

Cada medidor guarda:

```js
{
  tipo: 'vehiculo',
  tipoFlujoMedidor: 'volumen_acumulado',
  unidadMedida: 'L',
  cantidadPorDigito: 10,
  preciosMedidor: [
    {
      id: 'precio-01',
      nombre: 'Público',
      precioPorUnidad: 2.00,
      unidadMedida: 'L',
      activo: true
    }
  ]
}
```

`cantidadPorDigito` define cuánto representa una unidad de lectura. Si la lectura pasa de 12345.00 a 12350.00 y el factor es 10 L por dígito, la cantidad medida es 50 L. En una instalación de gasolina podría configurarse galón por dígito; la aplicación no debe llamar litros a esa cantidad.

## Precios por vehículo o planta

Al crear un vehículo se captura el medidor fijo y se pueden agregar hasta cinco precios. Cada precio tiene un nombre y un valor por unidad de medida. En una venta se calcula:

```text
cantidadMedida = (lecturaFinal - lecturaAnterior) × cantidadPorDigito
subtotal = cantidadMedida × precioPorUnidad
```

Los precios pertenecen al medidor, no a la colección global de productos. Una futura planta utilizará el mismo esquema con `tipo: 'planta'`, `plantaId` y `medidorId`.

Los documentos históricos guardan la unidad, cantidad por dígito, precio elegido y subtotal utilizados en la operación. Cambiar una configuración futura no reinterpreta ventas pasadas.

## WhatsApp

WhatsApp Business queda fuera de esta fase. La configuración conserva `whatsappModo: 'wa.me'`; los mensajes se abren desde el teléfono operativo mediante el enlace directo. No se guardan tokens, API keys ni credenciales de Meta en Firestore o en el frontend.

## Compatibilidad

Los productos nuevos guardan `unidadMedida` y `tamanoPresentacion`, además de `unidad` como campo de compatibilidad temporal. Los precios antiguos `tarifas_agua` se leen únicamente como migración en memoria; los medidores nuevos ya no dependen de garrafones ni de una medida fija de 19 L.

### Referencias

[1]: https://www.nist.gov/pml/owm/metric-si/unit-conversion/pressure-and-gas-flow-unit-conversions "NIST — Pressure and Gas Flow Unit Conversions"

[2]: https://extension.okstate.edu/fact-sheets/water-measurement-units-and-conversion-factors.html "Oklahoma State University Extension — Water Measurement Units and Conversion Factors"

[3]: https://www.oiml.org/en/files/pdf_r/r049-e24.pdf/@@download/file/r049-e24.pdf "OIML R 49:2024 — Water meters for cold potable water and hot water"

## Validación local

La PWA local cargó la pantalla de autenticación con el nuevo shell y el icono actualizado. La consola no registró excepciones de los módulos nuevos; únicamente mostró el aviso no bloqueante de Firebase sobre la futura deprecación de `enableMultiTabIndexedDbPersistence()` y confirmó el registro del Service Worker. La prueba se realizó sin iniciar sesión, por lo que la escritura del asistente y una venta autenticada quedan pendientes de validación con credenciales reales.
