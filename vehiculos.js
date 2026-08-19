/* Flutt-Water — Libro operativo por vehículo.
 * Firestore es la fuente de verdad. Las lecturas, recargas, cierres e incidencias
 * se escriben como documentos append-only; el cierre de la jornada solo cambia
 * el estado operativo de la jornada, nunca altera una lectura ya capturada.
 */
function VehiculosOperativo({ clientes = [], currentUser = {} }) {
  const [vehiculos, setVehiculos] = useState([]);
  const [rutasCatalogo, setRutasCatalogo] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [jornadas, setJornadas] = useState([]);
  const [selectedJornadaId, setSelectedJornadaId] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [routeForm, setRouteForm] = useState(null);
  const [tarifas, setTarifas] = useState([]);
  const [startForm, setStartForm] = useState(null);
  const [closeForm, setCloseForm] = useState(null);
  const [recargaForm, setRecargaForm] = useState(null);
  const [ventaForm, setVentaForm] = useState(null);
  const [routeClients, setRouteClients] = useState([]);

  const isAdmin = currentUser.role === 'admin';
  const isOperator = isAdmin || currentUser.role === 'repartidor';
  const flash = text => {
    setMsg(text);
    setTimeout(() => setMsg(''), 3500);
  };
  const now = () => new Date().toISOString();
  const number = value => Number(String(value ?? '').replace(',', '.'));
  const validDecimal = value => Number.isFinite(number(value)) && number(value) >= 0;
  const factor = vehicle => factorMedidor(vehicle);
  const unidad = vehicle => vehicle?.unidadMedida || (vehicle?.factorLitrosPorUnidad ? 'L' : 'L');
  const magnitud = vehicle => vehicle?.tipoFlujoMedidor || 'volumen_acumulado';
  const simbolo = vehicle => simboloUnidadMedidor(unidad(vehicle));
  const fmtCantidad = (value, vehicle) => `${Number(value || 0).toFixed(2)} ${simbolo(vehicle)}`;
  const cantidadDesdeLectura = (diferencia, vehicle) => cantidadMedidaDesdeLectura(diferencia, vehicle);
  const fmtLitros = value => `${Number(value || 0).toFixed(2)} L`;
  const currentVehicle = vehiculos.find(v => v.id === selectedVehicleId) || null;
  const currentJornada = jornadas.find(j => j.id === selectedJornadaId) || null;
  const activeJornada = jornadas.find(j => j.estado === 'activa') || null;
  const lastClosed = jornadas
    .filter(j => j.estado === 'cerrada' && Number.isFinite(Number(j.lecturaCierre)))
    .sort((a, b) => new Date(b.fechaCierre || b.creadoEn || 0) - new Date(a.fechaCierre || a.creadoEn || 0))[0];

  useEffect(() => {
    if (!currentUser?.uid) return undefined;
    const rol = currentUser.role === 'usuario' ? 'vendedor' : currentUser.role;
    const baseRef = db.collection('vehiculos');
    const query = rol === 'admin'
      ? baseRef.where('activo', '==', true)
      : rol === 'repartidor'
        ? baseRef.where('repartidorIds', 'array-contains', currentUser.uid)
        : baseRef.where('tipoUnidad', '==', 'planta').where('operadorUid', '==', currentUser.uid);
    const unsub = query.onSnapshot(snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(v => v.activo !== false && (rol !== 'vendedor' || v.tipoUnidad === 'planta')).sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || '')));
      setVehiculos(list);
      if (!selectedVehicleId && list[0]) setSelectedVehicleId(list[0].id);
    }, () => flash(' No se pudieron cargar los vehículos'));
    return unsub;
  }, [currentUser?.uid, currentUser?.role]);

  useEffect(() => {
    if (!currentUser?.uid) return undefined;
    const unsub = db.collection('rutas_catalogo').where('activa', '==', true).onSnapshot(snap => {
      setRutasCatalogo(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => setRutasCatalogo([]));
    return unsub;
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid || !currentVehicle) { setTarifas([]); return undefined; }
    if (Array.isArray(currentVehicle.preciosMedidor) && currentVehicle.preciosMedidor.length) {
      setTarifas(normalizarPreciosMedidor(currentVehicle.preciosMedidor, unidad(currentVehicle)));
      return undefined;
    }
    // Compatibilidad con instalaciones antiguas: convierte precio por garrafón de 19 L a precio por litro solo en memoria.
    const unsub = db.collection('tarifas_agua').where('activa', '==', true).onSnapshot(snap => {
      setTarifas(snap.docs.map(d => {
        const data = d.data() || {};
        return { id: d.id, nombre: data.nombre || 'Tarifa antigua', precioPorUnidad: Number(data.precioPorGarrafon || 0) / 19, unidadMedida: 'L', activo: true };
      }).filter(x => x.precioPorUnidad > 0).sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''))));
    }, () => setTarifas([]));
    return unsub;
  }, [currentUser?.uid, currentVehicle?.id]);

  useEffect(() => {
    if (!isAdmin) return undefined;
    const unsub = db.collection('usuarios').where('active', '==', true).onSnapshot(snap => {
      setUsuarios(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => ['admin', 'repartidor'].includes(u.role)));
    }, () => setUsuarios([]));
    return unsub;
  }, [isAdmin]);

  useEffect(() => {
    const abrirTicketQR = event => {
      const cliente = event.detail;
      if (!currentJornada || currentJornada.estado !== 'activa') { flash(' Inicia una jornada activa antes de escanear clientes'); return; }
      setVentaForm({ lecturaFinal: currentJornada.ultimaLectura ?? currentJornada.lecturaInicial, precioPorUnidad: tarifas[0]?.precioPorUnidad || '', tarifaId: tarifas[0]?.id || '', tarifaNombre: tarifas[0]?.nombre || '', clienteId: cliente?.id || '', clienteNombre: cliente?.nombre || '', formaPago: 'efectivo' });
    };
    window.addEventListener('flutt-water:abrir-ticket-medidor', abrirTicketQR);
    return () => window.removeEventListener('flutt-water:abrir-ticket-medidor', abrirTicketQR);
  }, [currentJornada?.id, currentJornada?.estado, currentJornada?.ultimaLectura, tarifas]);

  useEffect(() => {
    if (!selectedVehicleId) {
      setJornadas([]);
      return undefined;
    }
    const jornadasRef = db.collection('vehiculos').doc(selectedVehicleId).collection('jornadas');
    const jornadasQuery = currentUser.role === 'repartidor'
      ? jornadasRef.where('repartidorId', '==', currentUser.uid).limit(100)
      : jornadasRef.orderBy('creadoEn', 'desc').limit(100);
    const unsub = jornadasQuery.onSnapshot(snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => new Date(b.fechaCierre || b.creadoEn || 0) - new Date(a.fechaCierre || a.creadoEn || 0));
        setJornadas(list);
        const abierta = list.find(j => j.estado === 'activa');
        setSelectedJornadaId(previous => previous || abierta?.id || list[0]?.id || '');
      }, () => flash(' No se pudieron cargar las jornadas del vehículo'));
    return unsub;
  }, [selectedVehicleId]);


  const crearRuta = async () => {
    if (!isAdmin || !routeForm?.nombre?.trim() || !routeForm?.repartidorId) { flash(' Captura el nombre y asigna un repartidor a la ruta'); return; }
    setSaving(true);
    try {
      const rutaRef = db.collection('rutas_catalogo').doc();
      const repartidor = usuarios.find(u => u.id === routeForm.repartidorId);
      const batch = db.batch();
      batch.set(rutaRef, {
        nombre: routeForm.nombre.trim(), vehiculoBaseId: routeForm.vehiculoBaseId || '', repartidorId: routeForm.repartidorId || '',
        repartidorNombre: repartidor?.nombre || '', clienteIds: routeClients, activa: true, creadoPorUid: currentUser.uid,
        creadoPorNombre: currentUser.nombre || '', creadoEn: now()
      });
      routeClients.forEach(clienteId => batch.update(db.collection('clientes').doc(clienteId), {
        rutaId: rutaRef.id, rutaIds: firebase.firestore.FieldValue.arrayUnion(rutaRef.id),
        repartidorId: routeForm.repartidorId || '', repartidorIds: routeForm.repartidorId ? firebase.firestore.FieldValue.arrayUnion(routeForm.repartidorId) : []
      }));
      if (routeForm.vehiculoBaseId && routeForm.repartidorId) {
        batch.update(db.collection('vehiculos').doc(routeForm.vehiculoBaseId), {
          tipoUnidad: 'vehiculo',
          repartidorIds: firebase.firestore.FieldValue.arrayUnion(routeForm.repartidorId)
        });
      }
      await batch.commit();
      setRouteForm(null); setRouteClients([]); flash(' Ruta y clientes configurables guardados');
    } catch (e) { flash(' No se pudo guardar la ruta: ' + e.message); }
    setSaving(false);
  };

  const iniciarJornada = async () => {
    if (!isOperator || !currentVehicle || !startForm || !validDecimal(startForm.lecturaInicial)) {
      flash(' Selecciona vehículo y captura una lectura inicial válida'); return;
    }
    const lecturaInicial = number(startForm.lecturaInicial);
    const anterior = validDecimal(startForm.lecturaCierreAnterior) ? number(startForm.lecturaCierreAnterior) : 0;
    const desfase = lecturaInicial - anterior;
    const requiereMotivo = Math.abs(desfase) > 5;
    if (requiereMotivo && !startForm.motivoDesfase?.trim()) {
      flash(' El desfase supera 5 unidades; captura el motivo para continuar'); return;
    }
    if (currentVehicle.jornadaActivaId || jornadas.some(j => j.estado === 'activa')) { flash(' Este vehículo ya tiene una jornada activa'); return; }
    setSaving(true);
    try {
      const jornadaRef = db.collection('vehiculos').doc(currentVehicle.id).collection('jornadas').doc();
      const lecturaRef = jornadaRef.collection('lecturas').doc();
      const cajaRef = db.collection('cajas_jornada').doc();
      const fecha = now();
      const repartidor = isAdmin ? usuarios.find(u => u.id === startForm.repartidorId) : currentUser;
      const ruta = rutasCatalogo.find(r => r.id === startForm.rutaId);
      const jornada = {
        tipo: 'jornada', estado: 'activa', vehiculoId: currentVehicle.id, medidorId: currentVehicle.medidorId,
        repartidorId: repartidor?.id || currentUser.uid, repartidorNombre: repartidor?.nombre || currentUser.nombre || '',
        rutaId: ruta?.id || currentVehicle.rutaBaseId || '', rutaNombre: ruta?.nombre || '',
        lecturaCierreAnterior: anterior, lecturaInicial, desfaseLectura: desfase,
        tipoFlujoMedidor: magnitud(currentVehicle), unidadMedida: unidad(currentVehicle), cantidadPorDigito: factor(currentVehicle), factorLitrosPorUnidad: unidad(currentVehicle) === 'L' ? factor(currentVehicle) : 0,
        cantidadMedidaVendidaAcumulada: 0, litrosVendidosAcumulados: unidad(currentVehicle) === 'L' ? 0 : 0, ventasCount: 0,
        cierreCajaId: cajaRef.id,
        requiereMotivo, motivoDesfase: requiereMotivo ? startForm.motivoDesfase.trim() : '',
        creadoPorUid: currentUser.uid, creadoPorNombre: currentUser.nombre || '', creadoEn: fecha
      };
      const batch = db.batch();
      batch.set(jornadaRef, jornada);
      batch.set(cajaRef, { tipo: 'caja_jornada', jornadaId: jornadaRef.id, vehiculoId: currentVehicle.id, medidorId: currentVehicle.medidorId, repartidorId: jornada.repartidorId, estado: 'abierta', creadoEn: fecha });
      batch.set(lecturaRef, { tipo: 'inicio_jornada', ...jornada, jornadaId: jornadaRef.id, lectura: lecturaInicial, creadoEn: fecha });
      batch.update(db.collection('vehiculos').doc(currentVehicle.id), { jornadaActivaId: jornadaRef.id, medidorUltimaLectura: lecturaInicial, actualizadoEn: fecha });
      if (requiereMotivo) {
        batch.set(jornadaRef.collection('incidencias').doc(), {
          tipo: 'desfase_lectura_inicio', jornadaId: jornadaRef.id, vehiculoId: currentVehicle.id,
          lecturaAnterior: anterior, lecturaCapturada: lecturaInicial, desfaseLectura: desfase,
          motivo: startForm.motivoDesfase.trim(), capturadoPorUid: currentUser.uid,
          capturadoPorNombre: currentUser.nombre || '', creadoEn: fecha
        });
      }
      await batch.commit();
      setStartForm(null); setSelectedJornadaId(jornadaRef.id); flash(' Jornada iniciada; lectura bloqueada');
    } catch (e) { flash(' No se pudo iniciar la jornada: ' + e.message); }
    setSaving(false);
  };

  const registrarRecarga = async () => {
    if (!currentJornada || currentJornada.estado !== 'activa' || !validDecimal(recargaForm?.lectura) || !validDecimal(recargaForm?.cantidadMedida)) {
      flash(' Captura lectura y cantidad medida válida para la recarga'); return;
    }
    setSaving(true);
    try {
      const fecha = now();
      const cantidadMedida = number(recargaForm.cantidadMedida);
      const payload = {
        tipo: 'recarga', jornadaId: currentJornada.id, vehiculoId: currentVehicle.id, medidorId: currentVehicle.medidorId,
        lecturaMedidor: number(recargaForm.lectura), cantidadMedida, unidadMedida: unidad(currentVehicle),
        ...(unidad(currentVehicle) === 'L' ? { litrosRecargados: cantidadMedida } : {}),
        observaciones: recargaForm.observaciones?.trim() || '',
        capturadoPorUid: currentUser.uid, capturadoPorNombre: currentUser.nombre || '', creadoEn: fecha
      };
      await db.collection('vehiculos').doc(currentVehicle.id).collection('jornadas').doc(currentJornada.id).collection('recargas').add(payload);
      setRecargaForm(null); flash(' Recarga registrada; el documento no puede editarse');
    } catch (e) { flash(' No se pudo registrar la recarga: ' + e.message); }
    setSaving(false);
  };

  const registrarVenta = async () => {
    if (!currentJornada || currentJornada.estado !== 'activa' || !validDecimal(ventaForm?.lecturaFinal)) {
      flash(' Captura una lectura final válida'); return;
    }
    const lecturaFinal = number(ventaForm.lecturaFinal);
    const tarifaSeleccionada = tarifas.find(t => t.id === ventaForm.tarifaId);
    const precioPorUnidad = isAdmin && validDecimal(ventaForm.precioPorUnidad)
      ? number(ventaForm.precioPorUnidad)
      : Number(tarifaSeleccionada?.precioPorUnidad || 0);
    if (precioPorUnidad <= 0 || (!isAdmin && !tarifaSeleccionada)) {
      flash(' Selecciona un precio válido para la unidad del medidor'); return;
    }
    setSaving(true);
    try {
      const jornadaRef = db.collection('vehiculos').doc(currentVehicle.id).collection('jornadas').doc(currentJornada.id);
      const ventaRef = jornadaRef.collection('ventas').doc();
      const lecturaRef = jornadaRef.collection('lecturas').doc();
      const fecha = now();
      let calculo = null;
      await db.runTransaction(async tx => {
        const snap = await tx.get(jornadaRef);
        if (!snap.exists || snap.data().estado !== 'activa') throw new Error('La jornada ya no está activa');
        const jornada = snap.data();
        const lecturaInicial = number(jornada.ultimaLectura ?? jornada.lecturaInicial);
        const diferenciaLectura = lecturaFinal - lecturaInicial;
        if (!Number.isFinite(diferenciaLectura) || diferenciaLectura <= 0) throw new Error('La lectura final debe ser mayor que la última lectura registrada');
        const cantidadMedida = cantidadDesdeLectura(diferenciaLectura, currentVehicle);
        const total = cantidadMedida * precioPorUnidad;
        const cliente = clientes.find(c => c.id === ventaForm.clienteId);
        calculo = { lecturaInicial, diferenciaLectura, cantidadMedida, total, cliente };
        tx.set(ventaRef, {
          tipo: 'venta_medidor', jornadaId: currentJornada.id, cierreCajaId: jornada.cierreCajaId || currentJornada.cierreCajaId || '', vehiculoId: currentVehicle.id, medidorId: currentVehicle.medidorId,
          lecturaInicial, lecturaFinal, diferenciaLectura, cantidadPorDigito: factor(currentVehicle), unidadMedida: unidad(currentVehicle), cantidadMedida,
          ...(unidad(currentVehicle) === 'L' ? { litros: cantidadMedida } : {}),
          precioPorUnidad, subtotal: total, clienteId: cliente?.id || '', clienteNombre: cliente?.nombre || 'Público general',
          formaPago: ventaForm.formaPago || 'efectivo', tarifaId: tarifaSeleccionada?.id || '', tarifaNombre: tarifaSeleccionada?.nombre || ventaForm.tarifaNombre?.trim() || 'Precio manual',
          capturadoPorUid: currentUser.uid, capturadoPorNombre: currentUser.nombre || '', creadoEn: fecha
        });
        tx.set(lecturaRef, {
          tipo: 'venta', jornadaId: currentJornada.id, vehiculoId: currentVehicle.id, medidorId: currentVehicle.medidorId,
          lectura: lecturaFinal, lecturaAnterior: lecturaInicial, diferenciaLectura, cantidadMedida, unidadMedida: unidad(currentVehicle), ventaId: ventaRef.id,
          capturadoPorUid: currentUser.uid, capturadoPorNombre: currentUser.nombre || '', creadoEn: fecha
        });
        tx.update(jornadaRef, {
          ultimaLectura: lecturaFinal,
          cantidadMedidaVendidaAcumulada: firebase.firestore.FieldValue.increment(cantidadMedida),
          ...(unidad(currentVehicle) === 'L' ? { litrosVendidosAcumulados: firebase.firestore.FieldValue.increment(cantidadMedida) } : {}),
          ventasCount: firebase.firestore.FieldValue.increment(1)
        });
      });
      setVentaForm(null); flash(` Venta registrada: ${fmtCantidad(calculo.cantidadMedida, currentVehicle)} · ${fmt(calculo.total)}`);
    } catch (e) { flash(' No se pudo registrar la venta: ' + e.message); }
    setSaving(false);
  };

  const cerrarJornada = async () => {
    if (!currentJornada || currentJornada.estado !== 'activa' || !validDecimal(closeForm?.lecturaCierre)) { flash(' Captura una lectura final válida'); return; }
    const lecturaCierre = number(closeForm.lecturaCierre);
    const diferenciaLectura = lecturaCierre - number(currentJornada.lecturaInicial);
    if (diferenciaLectura < 0) { flash(' La lectura final no puede ser menor que la inicial'); return; }
      const cantidadMedida = cantidadDesdeLectura(diferenciaLectura, currentVehicle);
      const requiereMotivo = Math.abs(diferenciaLectura) > 5;
    if (requiereMotivo && !closeForm.motivoDesfase?.trim()) { flash(' El desfase supera 5 unidades; captura el motivo'); return; }
    setSaving(true);
    try {
      const jornadaRef = db.collection('vehiculos').doc(currentVehicle.id).collection('jornadas').doc(currentJornada.id);
      const cierreRef = jornadaRef.collection('cierres').doc();
      const lecturaRef = jornadaRef.collection('lecturas').doc();
      const fecha = now();
      const cierre = {
        tipo: 'cierre_jornada', jornadaId: currentJornada.id, cierreCajaId: currentJornada.cierreCajaId || '', vehiculoId: currentVehicle.id, medidorId: currentVehicle.medidorId,
        lecturaInicial: Number(currentJornada.lecturaInicial), lecturaCierre, diferenciaLectura,
        tipoFlujoMedidor: magnitud(currentVehicle), unidadMedida: unidad(currentVehicle), cantidadPorDigito: factor(currentVehicle), cantidadMedida,
        ...(unidad(currentVehicle) === 'L' ? { litrosCalculados: cantidadMedida } : {}),
        requiereMotivo, motivoDesfase: requiereMotivo ? closeForm.motivoDesfase.trim() : '',
        cerradoPorUid: currentUser.uid, cerradoPorNombre: currentUser.nombre || '', creadoEn: fecha
      };
      const batch = db.batch();
      batch.set(cierreRef, cierre);
      batch.set(lecturaRef, { tipo: 'cierre_jornada', ...cierre, lectura: lecturaCierre });
      batch.update(jornadaRef, { estado: 'cerrada', lecturaCierre, fechaCierre: fecha, cantidadMedidaCalculada: cantidadMedida, ...(unidad(currentVehicle) === 'L' ? { litrosCalculados: cantidadMedida } : {}), cierreId: cierreRef.id });
      if (currentJornada.cierreCajaId) batch.update(db.collection('cajas_jornada').doc(currentJornada.cierreCajaId), { estado: 'cerrada', cierreJornadaId: cierreRef.id, fechaCierre: fecha });
      batch.update(db.collection('vehiculos').doc(currentVehicle.id), { jornadaActivaId: '', medidorUltimaLectura: lecturaCierre, actualizadoEn: fecha });
      if (requiereMotivo) batch.set(jornadaRef.collection('incidencias').doc(), {
        tipo: 'desfase_lectura_cierre', jornadaId: currentJornada.id, vehiculoId: currentVehicle.id,
        lecturaInicial: currentJornada.lecturaInicial, lecturaCierre, desfaseLectura: diferenciaLectura,
        motivo: closeForm.motivoDesfase.trim(), capturadoPorUid: currentUser.uid,
        capturadoPorNombre: currentUser.nombre || '', creadoEn: fecha
      });
      await batch.commit();
      setCloseForm(null); flash(` Jornada cerrada; ${fmtCantidad(cantidadMedida, currentVehicle)} registrados; lectura y cierre bloqueados`);
    } catch (e) { flash(' No se pudo cerrar la jornada: ' + e.message); }
    setSaving(false);
  };

  const exportarLibro = async () => {
    if (!isAdmin) { flash(' Solo administración puede exportar libros operativos'); return; }
    if (!currentVehicle || typeof XLSX === 'undefined') { flash(' Selecciona un vehículo y verifica la librería Excel'); return; }
    setSaving(true);
    try {
      const base = db.collection('vehiculos').doc(currentVehicle.id);
      const jornadasSnap = await base.collection('jornadas').orderBy('creadoEn', 'asc').limit(500).get();
      const rows = jornadasSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const all = async name => {
        const result = [];
        for (const jornada of rows) {
          const snap = await base.collection('jornadas').doc(jornada.id).collection(name).get();
          snap.docs.forEach(d => result.push({ id: d.id, jornadaId: jornada.id, ...d.data() }));
        }
        return result;
      };
      const [lecturas, recargas, ventas, cierres, incidencias] = await Promise.all([all('lecturas'), all('recargas'), all('ventas'), all('cierres'), all('incidencias')]);
      const wb = XLSX.utils.book_new();
      const sheet = (name, data) => XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.length ? data : [{ mensaje: 'Sin registros' }]), name);
      sheet('Resumen', [{ vehiculo: currentVehicle.nombre, placa: currentVehicle.placa, medidor: currentVehicle.numeroSerieMedidor, factorLitrosPorUnidad: factor(currentVehicle), generadoEn: now() }]);
      sheet('Jornadas', rows); sheet('Lecturas', lecturas); sheet('Recargas', recargas); sheet('Ventas', ventas); sheet('Cierres', cierres); sheet('Incidencias', incidencias);
      XLSX.writeFile(wb, `libro-${String(currentVehicle.nombre || 'vehiculo').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.xlsx`);
      flash(' Libro Excel generado');
    } catch (e) { flash(' No se pudo exportar el libro: ' + e.message); }
    setSaving(false);
  };

  const routeOptions = rutasCatalogo.filter(r => !r.vehiculoBaseId || r.vehiculoBaseId === selectedVehicleId);
  return React.createElement('div', { style: { padding: '16px 12px' } },
    React.createElement('div', { style: { fontSize: 20, fontWeight: 800, marginBottom: 4 } }, ' Libros operativos'),
    React.createElement('div', { style: { color: 'var(--ink-faint)', fontSize: 12, marginBottom: 12 } }, 'Vehículos, medidores, jornadas y lecturas inmutables'),
    msg && React.createElement('div', { style: { background: 'var(--ok-bg)', color: 'var(--ok-text)', padding: '8px 12px', borderRadius: 4, marginBottom: 10, fontSize: 12 } }, msg),
    React.createElement(Card, null,
      React.createElement(Lbl, null, 'Vehículo / medidor'),
      React.createElement('select', { value: selectedVehicleId, onChange: e => { setSelectedVehicleId(e.target.value); setSelectedJornadaId(''); }, style: { width: '100%', padding: 9, background: 'var(--surface-2)', border: '1px solid var(--line-strong)', color: 'var(--ink)', borderRadius: 3 } },
        React.createElement('option', { value: '' }, 'Selecciona un vehículo'), vehiculos.map(v => React.createElement('option', { key: v.id, value: v.id }, `${v.nombre} · ${v.placa} · ${v.numeroSerieMedidor || 'sin serie'}`))),
      currentVehicle && React.createElement('div', { style: { marginTop: 8, fontSize: 12, color: 'var(--ink-soft)' } }, `Medidor: ${currentVehicle.numeroSerieMedidor || 'sin serie'} · 1 dígito = ${factor(currentVehicle)} ${simbolo(currentVehicle)}`),
      currentVehicle && React.createElement('div', { style: { marginTop: 10, fontSize: 11, color: 'var(--ink-faint)' } }, Array.isArray(currentVehicle.preciosMedidor) && currentVehicle.preciosMedidor.length ? `${currentVehicle.preciosMedidor.length} precio(s) configurado(s) en este medidor` : 'Los precios se capturan al dar de alta el medidor.'),
      currentVehicle && magnitud(currentVehicle) === 'volumen_acumulado' && React.createElement(Row, { style: { gap: 8, marginTop: 10, flexWrap: 'wrap' } }, React.createElement(BFill, { onClick: () => setStartForm({ lecturaInicial: currentVehicle.medidorUltimaLectura ?? lastClosed?.lecturaCierre ?? '', lecturaCierreAnterior: currentVehicle.medidorUltimaLectura ?? lastClosed?.lecturaCierre ?? '', repartidorId: isAdmin ? '' : currentUser.uid, rutaId: currentVehicle.rutaBaseId || '', motivoDesfase: '' }) }, 'Iniciar jornada'), isAdmin && React.createElement(BOut, { onClick: exportarLibro }, 'Exportar Excel'))),
      currentVehicle && magnitud(currentVehicle) !== 'volumen_acumulado' && React.createElement('div', { style: { marginTop: 10, color: 'var(--warn-text)', fontSize: 11, lineHeight: 1.4 } }, `${magnitud(currentVehicle) === 'presion' ? 'Sensor de presión' : 'Sensor de caudal'}: se registra como instrumentación técnica y no abre ventas por lectura.`),
    currentVehicle && React.createElement(Card, null,
      React.createElement(Row, { style: { justifyContent: 'space-between', marginBottom: 8 } }, React.createElement('strong', null, 'Jornadas del vehículo'), React.createElement(Tag, { color: activeJornada ? 'var(--ok-text)' : 'var(--ink-faint)' }, activeJornada ? 'ACTIVA' : 'SIN JORNADA')),
      jornadas.length === 0 && React.createElement('div', { style: { color: 'var(--ink-faint)', fontSize: 12 } }, 'Aún no hay jornadas registradas.'),
      jornadas.map(j => React.createElement('button', { key: j.id, onClick: () => setSelectedJornadaId(j.id), style: { display: 'block', width: '100%', textAlign: 'left', border: '1px solid var(--line)', background: selectedJornadaId === j.id ? 'var(--info-bg)' : 'var(--surface-2)', color: 'var(--ink)', padding: 9, marginTop: 6, borderRadius: 3, cursor: 'pointer' } },
        React.createElement(Row, { style: { justifyContent: 'space-between' } }, React.createElement('span', { style: { fontWeight: 700, fontSize: 12 } }, j.repartidorNombre || 'Sin repartidor'), React.createElement(Tag, { color: j.estado === 'activa' ? 'var(--ok-text)' : 'var(--ink-faint)' }, j.estado === 'activa' ? 'ACTIVA' : 'CERRADA')), React.createElement('div', { style: { color: 'var(--ink-soft)', fontSize: 11, marginTop: 4 } }, `Inicio ${Number(j.lecturaInicial || 0).toFixed(2)} · ${j.rutaNombre || 'Sin ruta'}`), j.requiereMotivo && React.createElement('div', { style: { color: 'var(--warn-text)', fontSize: 11, marginTop: 3 } }, ' Con incidencia de desfase')))),
    currentJornada && React.createElement(Card, null,
      React.createElement('strong', null, 'Jornada seleccionada'), React.createElement('div', { style: { fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.6, marginTop: 8 } }, `Lectura inicial: ${Number(currentJornada.lecturaInicial || 0).toFixed(2)} · ${factor(currentVehicle)} ${simbolo(currentVehicle)} por dígito`, React.createElement('br'), `Repartidor: ${currentJornada.repartidorNombre || '—'} · Ruta: ${currentJornada.rutaNombre || '—'}`),
      currentJornada.estado === 'activa' && magnitud(currentVehicle) === 'volumen_acumulado' && isOperator && React.createElement(Row, { style: { gap: 8, marginTop: 12, flexWrap: 'wrap' } }, React.createElement(BOut, { onClick: () => setVentaForm({ lecturaFinal: currentJornada.ultimaLectura ?? currentJornada.lecturaInicial, precioPorUnidad: isAdmin ? (tarifas[0]?.precioPorUnidad || '') : '', tarifaId: tarifas[0]?.id || '', tarifaNombre: '', clienteId: '', formaPago: 'efectivo' }) }, '＋ Venta'), React.createElement(BOut, { onClick: () => setRecargaForm({ lectura: currentJornada.ultimaLectura ?? currentJornada.lecturaInicial, cantidadMedida: '', observaciones: '' }) }, '＋ Recarga'), React.createElement(BFill, { bg: 'var(--warn)', onClick: () => setCloseForm({ lecturaCierre: '', motivoDesfase: '' }) }, 'Cerrar jornada')),
      currentJornada.estado === 'cerrada' && React.createElement('div', { style: { marginTop: 10, color: 'var(--ok-text)', fontSize: 12 } }, `Cierre: ${Number(currentJornada.lecturaCierre || 0).toFixed(2)} · ${fmtCantidad(currentJornada.cantidadMedidaCalculada ?? currentJornada.litrosCalculados, currentVehicle)}`)
    ),

    false && routeForm && React.createElement(Modal, { title: 'Crear ruta y clientes', onClose: () => setRouteForm(null) }, React.createElement(Lbl, null, 'Nombre de ruta'), React.createElement(Inp, { value: routeForm.nombre, onChange: e => setRouteForm({ ...routeForm, nombre: e.target.value }), placeholder: 'La Rivera' }), React.createElement(Lbl, null, 'Repartidor responsable'), React.createElement('select', { value: routeForm.repartidorId || '', onChange: e => setRouteForm({ ...routeForm, repartidorId: e.target.value }), style: { width: '100%', padding: 8, marginTop: 3 } }, React.createElement('option', { value: '' }, 'Selecciona repartidor'), usuarios.filter(u => u.role === 'repartidor').map(u => React.createElement('option', { key: u.id, value: u.id }, u.nombre))), React.createElement(Lbl, null, 'Clientes de la ruta'), React.createElement('div', { style: { maxHeight: 220, overflowY: 'auto', marginTop: 8 } }, clientes.map(c => React.createElement('label', { key: c.id, style: { display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0', fontSize: 12 } }, React.createElement('input', { type: 'checkbox', checked: routeClients.includes(c.id), onChange: e => setRouteClients(x => e.target.checked ? [...new Set([...x, c.id])] : x.filter(id => id !== c.id)) }), c.nombre))), React.createElement(BFill, { onClick: crearRuta, style: { width: '100%', marginTop: 14 }, disabled: saving }, saving ? 'Guardando…' : 'Guardar ruta')),
    startForm && React.createElement(Modal, { title: 'Iniciar jornada', onClose: () => setStartForm(null) }, React.createElement('div', { style: { fontSize: 12, color: 'var(--ink-soft)', marginBottom: 10 } }, `Vehículo: ${currentVehicle.nombre} · Medidor: ${currentVehicle.numeroSerieMedidor || '—'}`), React.createElement(Lbl, null, 'Lectura de cierre anterior'), React.createElement(Inp, { type: 'number', step: '0.01', value: startForm.lecturaCierreAnterior, onChange: e => setStartForm({ ...startForm, lecturaCierreAnterior: e.target.value }) }), React.createElement(Lbl, null, 'Lectura inicial actual'), React.createElement(Inp, { type: 'number', step: '0.01', style: { marginTop: 8 }, value: startForm.lecturaInicial, onChange: e => setStartForm({ ...startForm, lecturaInicial: e.target.value }) }), isAdmin && React.createElement(React.Fragment, null, React.createElement(Lbl, null, 'Repartidor'), React.createElement('select', { value: startForm.repartidorId, onChange: e => setStartForm({ ...startForm, repartidorId: e.target.value }), style: { width: '100%', padding: 8, marginTop: 3 } }, React.createElement('option', { value: '' }, 'Selecciona'), usuarios.map(u => React.createElement('option', { key: u.id, value: u.id }, u.nombre))), React.createElement(Lbl, null, 'Ruta'), React.createElement('select', { value: startForm.rutaId, onChange: e => setStartForm({ ...startForm, rutaId: e.target.value }), style: { width: '100%', padding: 8, marginTop: 3 } }, React.createElement('option', { value: '' }, 'Sin ruta'), routeOptions.map(r => React.createElement('option', { key: r.id, value: r.id }, r.nombre)))), Math.abs(number(startForm.lecturaInicial) - number(startForm.lecturaCierreAnterior)) > 5 && React.createElement(React.Fragment, null, React.createElement(Lbl, null, 'Motivo obligatorio del desfase'), React.createElement('textarea', { value: startForm.motivoDesfase, onChange: e => setStartForm({ ...startForm, motivoDesfase: e.target.value }), style: { width: '100%', minHeight: 70, marginTop: 3, padding: 8, border: '1px solid var(--line-strong)', color: 'var(--ink)' } })), React.createElement(BFill, { onClick: iniciarJornada, style: { width: '100%', marginTop: 14 }, disabled: saving }, saving ? 'Guardando…' : 'Iniciar y bloquear lectura')),
    ventaForm && React.createElement(Modal, { title: 'Registrar venta por medidor', onClose: () => setVentaForm(null) }, React.createElement('div', { style: { fontSize: 12, color: 'var(--ink-soft)', marginBottom: 10 } }, `Última lectura: ${Number(currentJornada?.ultimaLectura ?? currentJornada?.lecturaInicial ?? 0).toFixed(2)} · 1 dígito = ${factor(currentVehicle)} ${simbolo(currentVehicle)}`), React.createElement(Lbl, null, 'Lectura final de la venta'), React.createElement(Inp, { type: 'number', step: '0.01', value: ventaForm.lecturaFinal, onChange: e => setVentaForm({ ...ventaForm, lecturaFinal: e.target.value }) }), React.createElement(Lbl, null, `Precio por ${simbolo(currentVehicle)}`), React.createElement('select', { value: ventaForm.tarifaId || '', onChange: e => { const t = tarifas.find(x => x.id === e.target.value); setVentaForm({ ...ventaForm, tarifaId: e.target.value, precioPorUnidad: t?.precioPorUnidad || '' }); }, style: { width: '100%', padding: 8, marginTop: 3 } }, React.createElement('option', { value: '' }, isAdmin ? 'Precio manual' : 'Selecciona precio'), tarifas.map(t => React.createElement('option', { key: t.id, value: t.id }, `${t.nombre} · ${fmt(t.precioPorUnidad)} / ${simbolo(currentVehicle)}`))), isAdmin && React.createElement(Inp, { type: 'number', step: '0.01', style: { marginTop: 8 }, value: ventaForm.precioPorUnidad, onChange: e => setVentaForm({ ...ventaForm, precioPorUnidad: e.target.value }), placeholder: 'Precio manual por unidad' }), React.createElement(Lbl, null, 'Cliente'), React.createElement('select', { value: ventaForm.clienteId, onChange: e => setVentaForm({ ...ventaForm, clienteId: e.target.value }), style: { width: '100%', padding: 8, marginTop: 8 } }, React.createElement('option', { value: '' }, 'Público general'), clientes.filter(c => c.activo !== false).map(c => React.createElement('option', { key: c.id, value: c.id }, c.nombre))), React.createElement(BFill, { onClick: registrarVenta, style: { width: '100%', marginTop: 14 }, disabled: saving }, saving ? 'Guardando…' : 'Guardar venta'  )),
    recargaForm && React.createElement(Modal, { title: 'Registrar recarga', onClose: () => setRecargaForm(null) }, React.createElement(Lbl, null, 'Lectura actual del medidor'), React.createElement(Inp, { type: 'number', step: '0.01', value: recargaForm.lectura, onChange: e => setRecargaForm({ ...recargaForm, lectura: e.target.value }) }), React.createElement(Lbl, null, `Cantidad recargada (${simbolo(currentVehicle)})`), React.createElement(Inp, { type: 'number', step: '0.01', style: { marginTop: 8 }, value: recargaForm.cantidadMedida, onChange: e => setRecargaForm({ ...recargaForm, cantidadMedida: e.target.value }) }), React.createElement(Lbl, null, 'Observaciones'), React.createElement('textarea', { value: recargaForm.observaciones, onChange: e => setRecargaForm({ ...recargaForm, observaciones: e.target.value }), style: { width: '100%', minHeight: 60, marginTop: 3, padding: 8 } }), React.createElement(BFill, { onClick: registrarRecarga, style: { width: '100%', marginTop: 14 }, disabled: saving }, saving ? 'Guardando…' : 'Guardar recarga')),
    closeForm && React.createElement(Modal, { title: 'Cerrar jornada', onClose: () => setCloseForm(null) }, React.createElement('div', { style: { fontSize: 12, color: 'var(--ink-soft)', marginBottom: 10 } }, 'La lectura se guardará de forma permanente y no podrá editarse.'), React.createElement(Lbl, null, 'Lectura final'), React.createElement(Inp, { type: 'number', step: '0.01', value: closeForm.lecturaCierre, onChange: e => setCloseForm({ ...closeForm, lecturaCierre: e.target.value }) }), Math.abs(number(closeForm.lecturaCierre) - number(currentJornada?.lecturaInicial)) > 5 && React.createElement(React.Fragment, null, React.createElement(Lbl, null, 'Motivo obligatorio'), React.createElement('textarea', { value: closeForm.motivoDesfase, onChange: e => setCloseForm({ ...closeForm, motivoDesfase: e.target.value }), style: { width: '100%', minHeight: 70, marginTop: 3, padding: 8 } })), React.createElement(BFill, { bg: 'var(--warn)', onClick: cerrarJornada, style: { width: '100%', marginTop: 14 }, disabled: saving }, saving ? 'Cerrando…' : `Cerrar y bloquear lectura (${simbolo(currentVehicle)})`))
  );
}
window.VehiculosOperativo = VehiculosOperativo;
