function LlenadosPlanta({ productos = [], currentUser, unidadesPlanta = [] }) {
  const [unidadId, setUnidadId] = useState(unidadesPlanta[0]?.id || '');
  const [modo, setModo] = useState('historial');
  const [paso, setPaso] = useState(1);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [llenados, setLlenados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [borrador, setBorrador] = useState({ lecturaInicial: '', lecturaFinal: '', lineas: [{ envaseVacioId: '', productoTerminadoId: '', cantidad: '1' }] });
  const requestIdRef = useRef(null);
  const unidad = unidadesPlanta.find(u => u.id === unidadId) || null;
  const activos = productos.filter(p => p.activo !== false);
  const vacios = activos.filter(p => p.tipoProducto === 'envase_vacio');
  const llenos = activos.filter(p => p.requiereLlenado === true || p.productoVacioId);
  const factor = Number(unidad?.cantidadPorDigito || unidad?.factorMedidor || 1);
  const unidadMedida = unidad?.unidadMedida || unidad?.unidadMedidor || 'L';

  useEffect(() => {
    if (!unidadId && unidadesPlanta[0]?.id) setUnidadId(unidadesPlanta[0].id);
  }, [unidadesPlanta, unidadId]);
  useEffect(() => {
    if (!unidad) return;
    const lecturaActual = unidad.medidorUltimaLectura ?? unidad.lecturaActual ?? '';
    setBorrador(b => b.lecturaInicial === '' && lecturaActual !== '' ? { ...b, lecturaInicial: String(lecturaActual) } : b);
  }, [unidad?.id, unidad?.medidorUltimaLectura, unidad?.lecturaActual]);
  useEffect(() => {
    if (!unidadId || !currentUser?.uid) { setLlenados([]); return undefined; }
    setCargando(true);
    let query = db.collection('llenados_planta').where('plantaId', '==', unidadId);
    if (currentUser.role !== 'admin') query = query.where('capturadoPorUid', '==', currentUser.uid);
    return query.orderBy('creadoEn', 'desc').limit(50).onSnapshot(snap => {
      setLlenados(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setCargando(false);
    }, () => { setLlenados([]); setCargando(false); });
  }, [unidadId, currentUser?.uid]);

  const inicial = Number(borrador.lecturaInicial);
  const final = Number(borrador.lecturaFinal);
  const lecturaValida = Number.isFinite(inicial) && Number.isFinite(final) && final > inicial;
  const salidaMedida = lecturaValida ? Number(((final - inicial) * factor).toFixed(6)) : 0;
  const lineas = borrador.lineas.map(linea => {
    const producto = llenos.find(p => p.id === linea.productoTerminadoId);
    const envase = vacios.find(p => p.id === linea.envaseVacioId);
    const cantidad = Number(linea.cantidad || 0);
    const litrosPorUnidad = Number(producto?.contenidoPorUnidad || 0);
    return { ...linea, producto, envase, cantidad, litrosPorUnidad, litros: cantidad * litrosPorUnidad };
  });
  const litrosLineas = Number(lineas.reduce((s, l) => s + l.litros, 0).toFixed(6));
  const lineasValidas = lineas.length > 0 && lineas.every(l => l.producto && l.envase && l.cantidad > 0 && l.litrosPorUnidad > 0);
  const stockSuficiente = lineas.every(l => !l.envase || Number(l.envase.stock || 0) >= l.cantidad);
  const balanceValido = lecturaValida && lineasValidas && stockSuficiente && Math.abs(salidaMedida - litrosLineas) < 0.000001;

  const limpiar = () => { setBorrador({ lecturaInicial: '', lecturaFinal: '', lineas: [{ envaseVacioId: '', productoTerminadoId: '', cantidad: '1' }] }); setPaso(1); setMensaje(''); };
  const actualizarLinea = (i, campo, valor) => setBorrador(b => ({ ...b, lineas: b.lineas.map((l, index) => index === i ? { ...l, [campo]: valor } : l) }));
  const agregarLinea = () => setBorrador(b => ({ ...b, lineas: [...b.lineas, { envaseVacioId: '', productoTerminadoId: '', cantidad: '1' }] }));
  const quitarLinea = i => setBorrador(b => ({ ...b, lineas: b.lineas.filter((_, index) => index !== i) }));
  const avanzar = () => {
    if (paso === 1 && !unidad) return setMensaje('Selecciona una planta operativa.');
    if (paso === 2 && !lecturaValida) return setMensaje('La lectura final debe ser mayor que la lectura inicial.');
    if (paso === 3 && (!lineasValidas || !stockSuficiente)) return setMensaje('Completa las líneas y verifica los envases disponibles.');
    setMensaje(''); setPaso(p => Math.min(4, p + 1));
  };
  const retroceder = () => { setMensaje(''); setPaso(p => Math.max(1, p - 1)); };
  const confirmarVista = async () => {
    if (!balanceValido || !unidad) return setMensaje('El llenado no puede confirmarse: revisa litros, lecturas o stock.');
    setGuardando(true);
    setMensaje('');
    const requestId = requestIdRef.current || FluttWaterPlanta.crearIdempotencyKey(unidad.id, `llenado_${Date.now()}`);
    requestIdRef.current = requestId;
    const fecha = new Date().toISOString();
    const plantaRef = db.collection('vehiculos').doc(unidad.id);
    const llenadoRef = db.collection('llenados_planta').doc(requestId);
    const operacionRef = db.collection('operaciones_planta').doc(requestId);
    const aguaRef = db.collection('movimientos_agua').doc(`agua_${requestId}`);
    try {
      await db.runTransaction(async tx => {
        const plantaSnap = await tx.get(plantaRef);
        if (!plantaSnap.exists) throw new Error('La planta ya no existe.');
        const plantaActual = plantaSnap.data() || {};
        if (plantaActual.tipoUnidad !== 'planta' || (currentUser.role !== 'admin' && plantaActual.operadorUid !== currentUser.uid)) throw new Error('No tienes acceso a esta planta.');
        const lecturaActual = Number(plantaActual.medidorUltimaLectura ?? plantaActual.lecturaActual ?? 0);
        if (Math.abs(lecturaActual - inicial) > 0.000001) throw new Error(`La lectura inicial cambió. La planta registra ${lecturaActual}.`);
        const refs = [];
        const vistos = {};
        lineas.forEach((linea, index) => {
          const vacioRef = db.collection('productos').doc(linea.envaseVacioId);
          const llenoRef = db.collection('productos').doc(linea.productoTerminadoId);
          refs.push({ vacioRef, llenoRef, linea, index });
          vistos[linea.envaseVacioId] = true;
          vistos[linea.productoTerminadoId] = true;
        });
        const productoSnaps = {};
        for (const id of Object.keys(vistos)) productoSnaps[id] = await tx.get(db.collection('productos').doc(id));
        for (const item of refs) {
          const vacio = productoSnaps[item.linea.envaseVacioId];
          const lleno = productoSnaps[item.linea.productoTerminadoId];
          if (!vacio.exists || !lleno.exists) throw new Error('Una presentación ya no existe.');
          const stockVacio = Number(vacio.data().stock || 0);
          if (stockVacio < item.linea.cantidad) throw new Error(`Stock insuficiente en ${vacio.data().nombre || 'envase vacío'}.`);
        }
        const existente = await tx.get(llenadoRef);
        if (existente.exists) return;
        const productoIds = Object.keys(vistos);
        const operacion = { tipo: 'llenado_produccion', estado: 'confirmada', plantaId: unidad.id, unidadOperativaId: unidad.id, unidadOperativaTipo: 'planta', productoIds, medidorId: plantaActual.medidorId || unidad.medidorId || unidad.numeroSerieMedidor || null, jornadaId: null, lecturaAnterior: inicial, lecturaNueva: final, cantidadMedida: salidaMedida, litrosAplicados: litrosLineas, unidadMedida, lineas: lineas.map(l => ({ envaseVacioId: l.envaseVacioId, productoTerminadoId: l.productoTerminadoId, cantidad: l.cantidad, litrosPorUnidad: l.litrosPorUnidad, litros: l.litros })), requestId, idempotencyKey: requestId, capturadoPorUid: currentUser.uid, capturadoPorNombre: currentUser.nombre || '', creadoEn: fecha, inmutable: true };
        tx.set(llenadoRef, operacion);
        tx.set(operacionRef, operacion);
        tx.set(aguaRef, { tipo: 'salida_produccion', medidorId: operacion.medidorId, unidadOperativaId: unidad.id, unidadOperativaTipo: 'planta', jornadaId: null, lecturaAnterior: inicial, lecturaNueva: final, cantidad: -Math.abs(salidaMedida), unidad: unidadMedida, origenTipo: 'operacion_planta', origenId: requestId, usuarioUid: currentUser.uid, fechaHora: fecha, requestId, idempotencyKey: requestId, inmutable: true });
        tx.update(plantaRef, { medidorUltimaLectura: final, actualizadoEn: fecha, ultimaProduccionId: requestId });
        const acumulados = {};
        for (const item of refs) {
          const vacioId = item.linea.envaseVacioId;
          const llenoId = item.linea.productoTerminadoId;
          acumulados[vacioId] = { id: vacioId, tipo: 'salida', cantidad: (acumulados[vacioId]?.cantidad || 0) + item.linea.cantidad };
          acumulados[llenoId] = { id: llenoId, tipo: 'entrada', cantidad: (acumulados[llenoId]?.cantidad || 0) + item.linea.cantidad };
          const vacioData = productoSnaps[vacioId].data();
          const llenoData = productoSnaps[llenoId].data();
          const vacioMovimientoId = `vacio_${requestId}_${vacioId}_${item.index}`;
          const llenoMovimientoId = `lleno_${requestId}_${llenoId}_${item.index}`;
          tx.set(db.collection('movimientos_inventario').doc(vacioMovimientoId), { tipo: 'salida_produccion', productoId: vacioId, productoNombre: vacioData.nombre || '', cantidad: item.linea.cantidad, unidad: vacioData.unidadInventario || 'pieza', origenTipo: 'operacion_planta', origenId: requestId, unidadOperativaId: unidad.id, unidadOperativaTipo: 'planta', jornadaId: null, usuarioUid: currentUser.uid, capturadoPorUid: currentUser.uid, fechaHora: fecha, requestId, idempotencyKey: `${requestId}:vacio:${item.index}`, inmutable: true });
          tx.set(db.collection('movimientos_inventario').doc(llenoMovimientoId), { tipo: 'entrada_produccion', productoId: llenoId, productoNombre: llenoData.nombre || '', cantidad: item.linea.cantidad, unidad: llenoData.unidadInventario || 'pieza', origenTipo: 'operacion_planta', origenId: requestId, unidadOperativaId: unidad.id, unidadOperativaTipo: 'planta', jornadaId: null, usuarioUid: currentUser.uid, capturadoPorUid: currentUser.uid, fechaHora: fecha, requestId, idempotencyKey: `${requestId}:lleno:${item.index}`, inmutable: true });
        }
        Object.values(acumulados).forEach(cambio => {
          const data = productoSnaps[cambio.id].data();
          const stockAnterior = Number(data.stock || 0);
          const stockNuevo = cambio.tipo === 'salida' ? stockAnterior - cambio.cantidad : stockAnterior + cambio.cantidad;
          tx.update(db.collection('productos').doc(cambio.id), { stock: stockNuevo, actualizadoEn: fecha, ultimaProduccionId: requestId, ultimaProduccionTipo: cambio.tipo, ultimaProduccionCantidad: cambio.cantidad, ultimaProduccionVendedorUid: currentUser.uid });
        });
      });
      setMensaje('Llenado confirmado. Se registraron agua, vacíos y productos llenos.');
      setModo('historial');
      setPaso(1);
      setBorrador({ lecturaInicial: String(final), lecturaFinal: '', lineas: [{ envaseVacioId: '', productoTerminadoId: '', cantidad: '1' }] });
      requestIdRef.current = null;
    } catch (error) {
      setMensaje(`No se confirmó el llenado: ${error.message}`);
    } finally {
      setGuardando(false);
    }
  };
  const selectStyle = { width: '100%', padding: 9, marginBottom: 7, boxSizing: 'border-box' };
  const inputStyle = { width: '100%', padding: 10, boxSizing: 'border-box', marginBottom: 9 };

  const renderHistorial = () => React.createElement(Card, null,
    React.createElement('div', { style: { fontWeight: 800, marginBottom: 10 } }, 'Historial'),
    cargando ? React.createElement('div', { style: { color: 'var(--ink-faint)', fontSize: 13 } }, 'Cargando…') : llenados.length === 0 ? React.createElement('div', { style: { color: 'var(--ink-faint)', fontSize: 13, padding: '12px 0' } }, 'Aún no hay llenados confirmados.') : llenados.map(item => React.createElement('div', { key: item.id, style: { borderTop: '1px solid var(--line)', padding: '11px 0' } },
      React.createElement('strong', null, item.folio || item.id),
      React.createElement('div', { style: { fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 } }, `${item.litrosAplicados || item.cantidadMedida || 0} ${item.unidadMedida || unidadMedida} · ${item.estado || 'confirmado'} · inmutable`),
      React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-faint)', marginTop: 3 } }, item.creadoEn ? new Date(item.creadoEn).toLocaleString('es-MX') : '—')
    ))
  );

  const renderCaptura = () => {
    const encabezado = React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 } }, React.createElement('strong', null, `Paso ${paso} de 4`), React.createElement('span', { style: { fontSize: 12, color: 'var(--ink-faint)' } }, `${unidadMedida} · factor ${factor}`));
    let contenido;
    if (paso === 1) contenido = React.createElement('div', null, React.createElement('div', { style: { fontWeight: 800, marginBottom: 8 } }, 'Unidad operativa'), React.createElement('div', { style: { fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.5 } }, `Planta: ${unidad?.nombre || '—'}`, React.createElement('br'), `Medidor: ${unidad?.numeroSerieMedidor || unidad?.medidorId || '—'}`));
    if (paso === 2) contenido = React.createElement('div', null, React.createElement('div', { style: { fontWeight: 800, marginBottom: 8 } }, 'Lecturas del medidor'), React.createElement('input', { type: 'number', step: 'any', value: borrador.lecturaInicial, onChange: e => setBorrador(b => ({ ...b, lecturaInicial: e.target.value })), placeholder: 'Lectura inicial', style: inputStyle }), React.createElement('input', { type: 'number', step: 'any', value: borrador.lecturaFinal, onChange: e => setBorrador(b => ({ ...b, lecturaFinal: e.target.value })), placeholder: 'Lectura final', style: inputStyle }), React.createElement('div', { style: { color: lecturaValida ? 'var(--ok-text)' : 'var(--ink-faint)', fontSize: 13 } }, `Salida calculada: ${salidaMedida} ${unidadMedida}`));
    if (paso === 3) contenido = React.createElement('div', null, React.createElement('div', { style: { fontWeight: 800, marginBottom: 8 } }, 'Líneas de producción'), lineas.map((linea, index) => React.createElement('div', { key: index, style: { borderTop: '1px solid var(--line)', padding: '10px 0' } }, React.createElement('select', { value: linea.envaseVacioId, onChange: e => actualizarLinea(index, 'envaseVacioId', e.target.value), style: selectStyle }, React.createElement('option', { value: '' }, 'Envase vacío'), vacios.map(p => React.createElement('option', { key: p.id, value: p.id }, `${p.nombre} · stock ${p.stock || 0}`))), React.createElement('select', { value: linea.productoTerminadoId, onChange: e => actualizarLinea(index, 'productoTerminadoId', e.target.value), style: selectStyle }, React.createElement('option', { value: '' }, 'Producto lleno'), llenos.map(p => React.createElement('option', { key: p.id, value: p.id }, `${p.nombre} · ${p.contenidoPorUnidad || '—'} ${p.unidadContenido || unidadMedida}`))), React.createElement('input', { type: 'number', min: '0', step: 'any', value: linea.cantidad, onChange: e => actualizarLinea(index, 'cantidad', e.target.value), placeholder: 'Cantidad', style: inputStyle }), React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 } }, `Litros de línea: ${linea.litros || 0} ${unidadMedida}`), lineas.length > 1 && React.createElement(BOut, { onClick: () => quitarLinea(index), style: { marginTop: 7 } }, 'Eliminar línea'))), React.createElement(BOut, { onClick: agregarLinea, style: { marginTop: 8 } }, 'Agregar presentación'));
    if (paso === 4) contenido = React.createElement('div', null, React.createElement('div', { style: { fontWeight: 800, marginBottom: 10 } }, 'Resumen antes de confirmar'), React.createElement('div', { style: { fontSize: 14, lineHeight: 1.7, color: 'var(--ink-soft)' } }, `Lectura: ${borrador.lecturaInicial || '—'} → ${borrador.lecturaFinal || '—'}`, React.createElement('br'), `Salida del medidor: ${salidaMedida} ${unidadMedida}`, React.createElement('br'), `Litros de líneas: ${litrosLineas} ${unidadMedida}`, React.createElement('br'), `Envases vacíos: −${lineas.reduce((s, l) => s + l.cantidad, 0)} pz`, React.createElement('br'), `Productos llenos: +${lineas.reduce((s, l) => s + l.cantidad, 0)} pz`, React.createElement('br'), 'Movimiento de caja: $0.00'), React.createElement('div', { style: { marginTop: 10, color: balanceValido ? 'var(--ok-text)' : 'var(--danger-text)', fontWeight: 800 } }, balanceValido ? 'Listo para confirmar' : 'No se puede confirmar todavía.'));
    return React.createElement(Card, null, encabezado, contenido, React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 18 } }, paso > 1 ? React.createElement(BOut, { onClick: retroceder }, 'Atrás') : React.createElement('span'), paso < 4 ? React.createElement(BFill, { onClick: avanzar }, 'Continuar') : React.createElement(BFill, { onClick: confirmarVista, disabled: guardando || !balanceValido }, guardando ? 'Preparando…' : 'Confirmar llenado')));
  };

  if (!unidad && unidadesPlanta.length === 0) return React.createElement('div', { style: { padding: 20 } }, React.createElement(Card, null, React.createElement('div', { style: { fontWeight: 800, fontSize: 18, marginBottom: 8 } }, 'Llenados de producción'), React.createElement('div', { style: { color: 'var(--ink-soft)', fontSize: 13, lineHeight: 1.45 } }, 'No tienes una planta operativa asignada. Solicita al administrador la planta y su medidor antes de registrar producción.')));
  return React.createElement('div', { style: { padding: '16px 12px' } },
    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 12 } }, React.createElement('div', null, React.createElement('div', { style: { fontSize: 22, fontWeight: 800, color: 'var(--fw-navy)' } }, 'Llenados de producción'), React.createElement('div', { style: { fontSize: 12, color: 'var(--ink-faint)', marginTop: 4 } }, unidad?.nombre || 'Planta operativa')), modo === 'historial' && React.createElement(BFill, { onClick: () => { limpiar(); setModo('nuevo'); } }, 'Nuevo llenado')),
    React.createElement('div', { style: { display: 'flex', gap: 8, marginBottom: 12 } }, React.createElement('select', { value: unidadId, onChange: e => setUnidadId(e.target.value), style: { flex: 1, padding: 9, background: 'var(--surface-2)', border: '1px solid var(--line-strong)', color: 'var(--ink)', borderRadius: 8 } }, unidadesPlanta.map(u => React.createElement('option', { key: u.id, value: u.id }, `${u.nombre || 'Planta'} · ${u.numeroSerieMedidor || 'medidor'}`))), modo === 'nuevo' && React.createElement(BOut, { onClick: () => { limpiar(); setModo('historial'); } }, 'Cancelar')),
    mensaje && React.createElement('div', { style: { background: balanceValido ? 'var(--ok-bg)' : 'var(--warn-bg)', color: balanceValido ? 'var(--ok-text)' : 'var(--warn-text)', padding: '9px 12px', borderRadius: 6, fontSize: 12, marginBottom: 12 } }, mensaje),
    modo === 'historial' ? renderHistorial() : renderCaptura()
  );
}
