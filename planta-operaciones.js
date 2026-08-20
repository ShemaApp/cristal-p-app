/*
 * Contrato ejecutable inicial del módulo de planta.
 *
 * Esta etapa contiene normalización y validaciones puras. No escribe en
 * Firestore. Las transacciones y Cloud Functions se incorporarán después,
 * reutilizando exactamente estas estructuras y reglas.
 */
(function (global) {
  'use strict';

  const TIPOS_OPERACION_PLANTA = Object.freeze({
    LLENADO_PRODUCCION: 'llenado_produccion',
    RELLENO_CLIENTE: 'relleno_cliente',
    VENTA_AGUA_MEDIDA: 'venta_agua_medida',
    MERMA_AGUA: 'merma_agua',
    AJUSTE_AGUA: 'ajuste_agua'
  });

  const ESTADOS_OPERACION_PLANTA = Object.freeze({
    PENDIENTE: 'pendiente',
    CONFIRMADA: 'confirmada',
    RECHAZADA: 'rechazada',
    CON_INCIDENCIA: 'con_incidencia'
  });

  const TIPOS_MOVIMIENTO_AGUA = Object.freeze({
    SALIDA_RELLENO: 'salida_relleno',
    SALIDA_PRODUCCION: 'salida_produccion',
    SALIDA_VENTA: 'salida_venta',
    AJUSTE_AUTORIZADO: 'ajuste_autorizado'
  });

  const TIPOS_MOVIMIENTO_INVENTARIO = Object.freeze({
    ENTRADA_PRODUCCION: 'entrada_produccion',
    SALIDA_VENTA: 'salida_venta',
    SALIDA_MERMA: 'salida_merma',
    ENTRADA_COMPRA: 'entrada_compra',
    AJUSTE_ENTRADA: 'ajuste_entrada',
    AJUSTE_SALIDA: 'ajuste_salida',
    REVERSA: 'reversa'
  });

  const TIPOS_MOVIMIENTO_CAJA = Object.freeze({
    APERTURA: 'apertura',
    VENTA_EFECTIVO: 'venta_efectivo',
    ABONO_FIADO: 'abono_fiado',
    SALIDA_AUTORIZADA: 'salida_autorizada',
    DEVOLUCION: 'devolucion',
    CIERRE: 'cierre'
  });

  const TIPOS_MOVIMIENTO_CXC = Object.freeze({
    VENTA_CREDITO: 'venta_credito',
    ABONO_APROBADO: 'abono_aprobado',
    REVERSA_ABONO: 'reversa_abono',
    AJUSTE_AUTORIZADO: 'ajuste_autorizado'
  });

  const esNumeroFinito = value => Number.isFinite(Number(value));
  const numero = (value, fallback = 0) => esNumeroFinito(value) ? Number(value) : fallback;
  const texto = (value, fallback = '') => typeof value === 'string' ? value.trim() : fallback;
  const ahoraIso = () => new Date().toISOString();
  const requestId = () => {
    if (global.crypto && typeof global.crypto.randomUUID === 'function') return global.crypto.randomUUID();
    return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  };

  function crearIdempotencyKey(unidadOperativaId, id) {
    const scope = texto(unidadOperativaId, 'sin_unidad');
    const operationId = texto(id) || requestId();
    return `${scope}:${operationId}`;
  }

  function validarLecturaAscendente(lecturaAnterior, lecturaNueva) {
    const anterior = numero(lecturaAnterior, NaN);
    const nueva = numero(lecturaNueva, NaN);
    if (!Number.isFinite(anterior) || !Number.isFinite(nueva)) {
      return { ok: false, codigo: 'LECTURA_NO_NUMERICA', anterior, nueva };
    }
    if (nueva <= anterior) {
      return { ok: false, codigo: 'LECTURA_NO_ASCENDENTE', anterior, nueva, diferencia: nueva - anterior };
    }
    return { ok: true, anterior, nueva, diferencia: nueva - anterior };
  }

  function calcularSalidaMedida(lecturaAnterior, lecturaNueva, cantidadPorDigito = 1) {
    const validacion = validarLecturaAscendente(lecturaAnterior, lecturaNueva);
    if (!validacion.ok) return { ...validacion, cantidadMedida: 0 };
    const factor = numero(cantidadPorDigito, NaN);
    if (!Number.isFinite(factor) || factor <= 0) {
      return { ok: false, codigo: 'FACTOR_MEDIDOR_INVALIDO', anterior: validacion.anterior, nueva: validacion.nueva, cantidadMedida: 0 };
    }
    return {
      ...validacion,
      cantidadMedida: Number((validacion.diferencia * factor).toFixed(6)),
      factor
    };
  }

  function validarBaseOperacion(input) {
    const data = input || {};
    const errores = [];
    if (!texto(data.unidadOperativaId)) errores.push('unidadOperativaId requerido');
    if (!texto(data.jornadaId)) errores.push('jornadaId requerido');
    if (!texto(data.medidorId)) errores.push('medidorId requerido');
    if (!texto(data.tipo) || !Object.values(TIPOS_OPERACION_PLANTA).includes(data.tipo)) errores.push('tipo de operación inválido');
    if (!texto(data.capturadoPorUid)) errores.push('capturadoPorUid requerido');
    if (!texto(data.requestId)) errores.push('requestId requerido');
    return errores;
  }

  function normalizarOperacionPlanta(input) {
    const data = input || {};
    const id = texto(data.requestId) || requestId();
    const lecturaAnterior = numero(data.lecturaAnterior, 0);
    const lecturaNueva = numero(data.lecturaNueva, 0);
    const salida = calcularSalidaMedida(lecturaAnterior, lecturaNueva, data.cantidadPorDigito || 1);
    const errores = validarBaseOperacion({ ...data, requestId: id });
    if (!salida.ok && data.tipo !== TIPOS_OPERACION_PLANTA.AJUSTE_AGUA) errores.push(salida.codigo);
    if (numero(data.cantidadProducto, 0) < 0) errores.push('cantidadProducto no puede ser negativa');
    if (data.tipo === TIPOS_OPERACION_PLANTA.LLENADO_PRODUCCION && !texto(data.productoId)) errores.push('productoId requerido para producción');
    if (data.tipo === TIPOS_OPERACION_PLANTA.RELLENO_CLIENTE && data.formaPago === 'credito' && !texto(data.clienteId)) errores.push('clienteId requerido para crédito');

    return {
      ok: errores.length === 0,
      errores,
      operacion: {
        tipo: texto(data.tipo),
        estado: errores.length === 0 ? ESTADOS_OPERACION_PLANTA.PENDIENTE : ESTADOS_OPERACION_PLANTA.RECHAZADA,
        unidadOperativaId: texto(data.unidadOperativaId),
        unidadOperativaTipo: 'planta',
        jornadaId: texto(data.jornadaId),
        medidorId: texto(data.medidorId),
        productoId: texto(data.productoId) || null,
        clienteId: texto(data.clienteId) || null,
        lecturaAnterior,
        lecturaNueva,
        cantidadMedida: salida.ok ? salida.cantidadMedida : 0,
        unidadMedida: texto(data.unidadMedida, 'L'),
        cantidadProducto: numero(data.cantidadProducto, 0),
        unidadProducto: texto(data.unidadProducto, 'pieza'),
        formaPago: texto(data.formaPago) || null,
        importe: numero(data.importe, 0),
        requestId: id,
        idempotencyKey: texto(data.idempotencyKey) || crearIdempotencyKey(data.unidadOperativaId, id),
        capturadoPorUid: texto(data.capturadoPorUid),
        fechaHora: data.fechaHora || ahoraIso(),
        motivo: texto(data.motivo)
      }
    };
  }

  function crearMovimientoAgua(operacion, tipo) {
    const op = operacion || {};
    return {
      tipo: tipo || (op.tipo === TIPOS_OPERACION_PLANTA.LLENADO_PRODUCCION ? TIPOS_MOVIMIENTO_AGUA.SALIDA_PRODUCCION : TIPOS_MOVIMIENTO_AGUA.SALIDA_RELLENO),
      medidorId: texto(op.medidorId),
      unidadOperativaId: texto(op.unidadOperativaId),
      jornadaId: texto(op.jornadaId),
      lecturaAnterior: numero(op.lecturaAnterior),
      lecturaNueva: numero(op.lecturaNueva),
      cantidad: -Math.abs(numero(op.cantidadMedida)),
      unidad: texto(op.unidadMedida, 'L'),
      origenTipo: 'operacion_planta',
      origenId: texto(op.requestId),
      usuarioUid: texto(op.capturadoPorUid),
      fechaHora: op.fechaHora || ahoraIso(),
      requestId: texto(op.requestId),
      inmutable: true
    };
  }

  function crearMovimientoInventario({ productoId, cantidad, tipo, unidadOperativaId, jornadaId, origenId, usuarioUid, fechaHora }) {
    return {
      tipo: tipo || TIPOS_MOVIMIENTO_INVENTARIO.SALIDA_VENTA,
      productoId: texto(productoId),
      cantidad: Math.abs(numero(cantidad)),
      unidad: 'pieza',
      origenTipo: 'operacion_planta',
      origenId: texto(origenId),
      unidadOperativaId: texto(unidadOperativaId),
      jornadaId: texto(jornadaId),
      usuarioUid: texto(usuarioUid),
      fechaHora: fechaHora || ahoraIso(),
      requestId: texto(origenId),
      inmutable: true
    };
  }

  function crearMovimientoCaja({ tipo, importe, formaPago, unidadOperativaId, jornadaId, origenTipo, origenId, usuarioUid, fechaHora }) {
    return {
      tipo: tipo || TIPOS_MOVIMIENTO_CAJA.VENTA_EFECTIVO,
      cajaId: texto(unidadOperativaId),
      jornadaId: texto(jornadaId),
      unidadOperativaId: texto(unidadOperativaId),
      importe: Math.abs(numero(importe)),
      signo: tipo === TIPOS_MOVIMIENTO_CAJA.DEVOLUCION || tipo === TIPOS_MOVIMIENTO_CAJA.SALIDA_AUTORIZADA ? -1 : 1,
      formaPago: texto(formaPago, 'efectivo'),
      origenTipo: texto(origenTipo, 'operacion_planta'),
      origenId: texto(origenId),
      usuarioUid: texto(usuarioUid),
      fechaHora: fechaHora || ahoraIso(),
      requestId: texto(origenId),
      inmutable: true
    };
  }

  function crearMovimientoCxc({ tipo, clienteId, creditoId, importe, unidadOperativaId, jornadaId, origenId, usuarioUid, fechaHora }) {
    return {
      tipo: tipo || TIPOS_MOVIMIENTO_CXC.VENTA_CREDITO,
      clienteId: texto(clienteId),
      creditoId: texto(creditoId),
      importe: Math.abs(numero(importe)),
      signo: tipo === TIPOS_MOVIMIENTO_CXC.VENTA_CREDITO ? 1 : -1,
      unidadOperativaId: texto(unidadOperativaId),
      jornadaId: texto(jornadaId),
      origenTipo: 'operacion_planta',
      origenId: texto(origenId),
      usuarioUid: texto(usuarioUid),
      fechaHora: fechaHora || ahoraIso(),
      requestId: texto(origenId),
      inmutable: true
    };
  }

  global.FluttWaterPlanta = Object.freeze({
    TIPOS_OPERACION_PLANTA,
    ESTADOS_OPERACION_PLANTA,
    TIPOS_MOVIMIENTO_AGUA,
    TIPOS_MOVIMIENTO_INVENTARIO,
    TIPOS_MOVIMIENTO_CAJA,
    TIPOS_MOVIMIENTO_CXC,
    crearIdempotencyKey,
    validarLecturaAscendente,
    calcularSalidaMedida,
    validarBaseOperacion,
    normalizarOperacionPlanta,
    crearMovimientoAgua,
    crearMovimientoInventario,
    crearMovimientoCaja,
    crearMovimientoCxc
  });
})(window);
