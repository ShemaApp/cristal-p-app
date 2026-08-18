'use strict';

const MEDIDOR_MAGNITUDES = [
  { id: 'volumen_acumulado', nombre: 'Volumen acumulado', descripcion: 'Apto para ventas calculadas por lectura del medidor.' },
  { id: 'caudal_instantaneo', nombre: 'Caudal instantáneo', descripcion: 'Mide volumen por tiempo; requiere intervalo de tiempo para calcular cantidad.' },
  { id: 'presion', nombre: 'Presión', descripcion: 'Sensor de presión; no se convierte a litros ni calcula ventas por sí solo.' }
];

const MEDIDOR_UNIDADES = {
  volumen_acumulado: [
    { id: 'L', nombre: 'Litros (L)', simbolo: 'L' },
    { id: 'gal', nombre: 'Galones (gal)', simbolo: 'gal' },
    { id: 'm3', nombre: 'Metros cúbicos (m³)', simbolo: 'm³' },
    { id: 'kL', nombre: 'Kilolitros (kL)', simbolo: 'kL' },
    { id: 'ft3', nombre: 'Pies cúbicos (ft³)', simbolo: 'ft³' }
  ],
  caudal_instantaneo: [
    { id: 'L/min', nombre: 'Litros por minuto (L/min)', simbolo: 'L/min' },
    { id: 'gal/min', nombre: 'Galones por minuto (gal/min)', simbolo: 'gal/min' },
    { id: 'm3/h', nombre: 'Metros cúbicos por hora (m³/h)', simbolo: 'm³/h' },
    { id: 'L/s', nombre: 'Litros por segundo (L/s)', simbolo: 'L/s' }
  ],
  presion: [
    { id: 'psi', nombre: 'Libras por pulgada cuadrada (psi)', simbolo: 'psi' },
    { id: 'bar', nombre: 'Bar (bar)', simbolo: 'bar' },
    { id: 'kPa', nombre: 'Kilopascales (kPa)', simbolo: 'kPa' }
  ]
};

function unidadesMedidorPara(magnitud) {
  return MEDIDOR_UNIDADES[magnitud] || MEDIDOR_UNIDADES.volumen_acumulado;
}

function esMagnitudVendible(magnitud) {
  return magnitud === 'volumen_acumulado';
}

function simboloUnidadMedidor(unidad) {
  const todos = Object.values(MEDIDOR_UNIDADES).flat();
  return todos.find(u => u.id === unidad)?.simbolo || unidad || 'unidad';
}

function magnitudNombre(id) {
  return MEDIDOR_MAGNITUDES.find(x => x.id === id)?.nombre || 'Magnitud del medidor';
}

function normalizarPrecioMedidor(item, unidadMedidor) {
  const precio = Number(String(item?.precioPorUnidad ?? item?.precio ?? '').replace(',', '.'));
  return {
    id: String(item?.id || 'precio-' + Math.random().toString(36).slice(2, 9)),
    nombre: String(item?.nombre || '').trim().slice(0, 60),
    precioPorUnidad: Number.isFinite(precio) && precio >= 0 ? precio : 0,
    unidadMedida: String(item?.unidadMedida || unidadMedidor || 'L'),
    activo: item?.activo !== false
  };
}

function normalizarPreciosMedidor(items, unidadMedidor) {
  return (Array.isArray(items) ? items : []).slice(0, 5)
    .map(item => normalizarPrecioMedidor(item, unidadMedidor))
    .filter(item => item.nombre && item.precioPorUnidad > 0);
}

function factorMedidor(medidor) {
  const value = Number(medidor?.cantidadPorDigito ?? medidor?.factorLitrosPorUnidad ?? 1);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function cantidadMedidaDesdeLectura(diferencia, medidor) {
  const value = Number(diferencia || 0) * factorMedidor(medidor);
  return Number(value.toFixed(6));
}

function setupProyectoId() {
  try {
    return firebase.app().options.projectId || '';
  } catch (e) {
    return '';
  }
}

function setupProyectoPredeterminado() {
  return {
    firebaseProjectId: setupProyectoId(),
    nombreEmpresa: '',
    tipoFlujoMedidor: 'volumen_acumulado',
    unidadMedidorPredeterminada: 'L',
    cantidadPorDigitoPredeterminada: 1,
    telefonoEmpresa: '',
    administradoresIniciales: [],
    whatsappModo: 'wa.me',
    whatsappDestinatarios: [],
    configuracionInicialCompletada: false
  };
}

function normalizarSetupProyecto(data = {}) {
  const base = setupProyectoPredeterminado();
  const magnitud = MEDIDOR_MAGNITUDES.some(x => x.id === data.tipoFlujoMedidor) ? data.tipoFlujoMedidor : base.tipoFlujoMedidor;
  const unidades = unidadesMedidorPara(magnitud);
  const unidad = unidades.some(x => x.id === data.unidadMedidorPredeterminada) ? data.unidadMedidorPredeterminada : unidades[0].id;
  const factor = Number(data.cantidadPorDigitoPredeterminada);
  return {
    ...base,
    ...data,
    firebaseProjectId: String(data.firebaseProjectId || base.firebaseProjectId),
    nombreEmpresa: String(data.nombreEmpresa || '').trim().slice(0, 100),
    tipoFlujoMedidor: magnitud,
    unidadMedidorPredeterminada: unidad,
    cantidadPorDigitoPredeterminada: Number.isFinite(factor) && factor > 0 ? factor : 1,
    telefonoEmpresa: String(data.telefonoEmpresa || '').trim().slice(0, 30),
    administradoresIniciales: Array.isArray(data.administradoresIniciales) ? data.administradoresIniciales.slice(0, 20) : [],
    whatsappModo: 'wa.me',
    whatsappDestinatarios: Array.isArray(data.whatsappDestinatarios) ? data.whatsappDestinatarios.slice(0, 5) : [],
    configuracionInicialCompletada: data.configuracionInicialCompletada === true
  };
}

window.MEDIDOR_MAGNITUDES = MEDIDOR_MAGNITUDES;
window.MEDIDOR_UNIDADES = MEDIDOR_UNIDADES;
window.unidadesMedidorPara = unidadesMedidorPara;
window.esMagnitudVendible = esMagnitudVendible;
window.simboloUnidadMedidor = simboloUnidadMedidor;
window.magnitudNombre = magnitudNombre;
window.normalizarPrecioMedidor = normalizarPrecioMedidor;
window.normalizarPreciosMedidor = normalizarPreciosMedidor;
window.factorMedidor = factorMedidor;
window.cantidadMedidaDesdeLectura = cantidadMedidaDesdeLectura;
window.setupProyectoId = setupProyectoId;
window.setupProyectoPredeterminado = setupProyectoPredeterminado;
window.normalizarSetupProyecto = normalizarSetupProyecto;
