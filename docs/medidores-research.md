# Investigación de medidores y unidades de flujo

## Hallazgos iniciales

La referencia de Oklahoma State University distingue entre **volumen** —agua en reposo— y **flujo/caudal** —agua en movimiento, expresada como volumen por unidad de tiempo—. Enumera como unidades de volumen el galón y el pie cúbico, y como unidades de caudal galones por minuto (gpm), pies cúbicos por segundo (cfs), acre-pulgadas por hora y acre-pies por día. Para Flutt-Water, la cantidad registrada por una lectura acumulada debe modelarse como volumen; L/min o GPM son caudal y requieren una duración para calcular volumen.

La referencia metrológica NMI R 49-2 del National Measurement Institute se titula *Water Meters Intended for the Metering of Cold Potable Water and Hot Water — Part 2: Test Methods*. Se usará junto con OIML R49/ISO 4064 para confirmar que un medidor de agua es un instrumento de medición de volumen y que la configuración debe separar la unidad de lectura acumulada de la unidad de caudal instantáneo.

## Decisión provisional

`PSI` no debe aparecer como unidad de cantidad del medidor de producto o agua. PSI mide presión, no volumen ni caudal. Puede ser un futuro sensor independiente de presión, pero no debe convertirse en litros ni participar en el cálculo de ventas.

La configuración recomendada para la lectura acumulada es una unidad de volumen elegida por instalación: litros, galones, metros cúbicos, pies cúbicos u otra unidad de volumen explícitamente habilitada. El factor de digitación será configurable, por ejemplo `10 litros por unidad de lectura` o `1 galón por unidad de lectura`.

El caudal instantáneo, si se requiere en el futuro, debe ser un parámetro independiente con unidad por tiempo, como L/min, gal/min o m³/h; no debe mezclarse con la lectura acumulada ni con el precio.

## Presión y flujo según NIST

NIST separa en tablas independientes las unidades de **Pressure** y **Gas Flow**. En presión incluye Pa, mbar, Torr, psi, atm, pulgadas de agua y pulgadas de mercurio. En flujo incluye, entre otras, L/min, L/sec y m³/h. Por lo tanto, `psi` debe modelarse como una magnitud de presión/sensor, nunca como unidad del volumen vendido o como factor de digitación del medidor.

El acceso directo a la página USGS consultada fue bloqueado, así que no se usará como evidencia primaria adicional. La fuente NIST accesible confirma la distinción necesaria para el diseño.

## OIML R49 e ISO 4064

Los resultados de OIML R49-2024 indican que el volumen indicado por un medidor de agua se expresa en metros cúbicos y que los estándares de agua trabajan con parámetros de flujo como Q1, Q2, Q3 y Q4. Esto refuerza el modelo de dos magnitudes: la lectura acumulada representa volumen, mientras que el rango/caudal del instrumento es información técnica del medidor y no debe confundirse con la cantidad vendida.

Para la aplicación se conservará la unidad física de lectura que tenga el equipo —por ejemplo litros, galones, m³ o kL— y se guardará el factor de conversión por unidad de digitación. No se convertirán PSI, bar o kPa a litros, porque son unidades de presión.
