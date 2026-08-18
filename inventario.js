function FabricacionInventario({ productos, currentUser, flash }) {
  const [productoId, setProductoId] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('Fabricación para venta');
  const [saving, setSaving] = useState(false);
  const localInputStyle = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', background: 'var(--surface-2)', border: '1px solid var(--line-strong)', borderRadius: 8, color: 'var(--ink)', fontSize: 13 };
  const producto = productos.find(p => p.id === productoId);
  const fabricacionValor = { productoId, cantidad, motivo };
  const fabricacionDraft = useBorradorLocal('inventario:fabricacion', fabricacionValor, { uid: currentUser?.uid, habilitado: true, etiqueta: 'Fabricación de inventario' });
  const cancelarFabricacion = () => {
    if (!confirmarSalidaBorrador({ sucio: fabricacionDraft.sucio, borrador: fabricacionDraft.borrador, etiqueta: 'la fabricación' })) return;
    fabricacionDraft.descartar();
    setProductoId(''); setCantidad(''); setMotivo('Fabricación para venta');
  };
  const recuperarFabricacion = () => {
    const recuperado = fabricacionDraft.consumir();
    if (recuperado) { setProductoId(recuperado.productoId || ''); setCantidad(recuperado.cantidad || ''); setMotivo(recuperado.motivo || 'Fabricación para venta'); }
  };
  const guardar = async () => {
    const cantidadNum = Number(cantidad);
    if (!producto) { flash(' Selecciona una presentación/SKU'); return; }
    if (!Number.isFinite(cantidadNum) || cantidadNum <= 0) { flash(' La cantidad fabricada debe ser mayor que cero'); return; }
    if (!producto.permiteDecimales && !Number.isInteger(cantidadNum)) { flash(' Este SKU solo admite unidades enteras'); return; }
    setSaving(true);
    try {
      const ref = db.collection('productos').doc(producto.id);
      const movimientoRef = db.collection('inventario_historial').doc();
      const fecha = new Date().toISOString();
      await db.runTransaction(async tx => {
        const snap = await tx.get(ref);
        if (!snap.exists) throw new Error('La presentación ya no existe');
        const data = snap.data();
        const anterior = Number(data.stock || 0);
        tx.update(ref, { stock: anterior + cantidadNum, ultimaFabricacionFecha: fecha, ultimaFabricacionCantidad: cantidadNum });
        tx.set(movimientoRef, {
          tipoMovimiento: 'fabricacion',
          productoId: producto.id,
          productoNombre: producto.nombre,
          etiquetaPresentacion: etiquetaProducto(producto),
          unidadInventario: producto.unidadInventario || 'pieza',
          stockAnterior: anterior,
          stockNuevo: anterior + cantidadNum,
          diferencia: cantidadNum,
          cantidad: cantidadNum,
          motivo: motivo || 'Fabricación para venta',
          usuarioUid: currentUser.uid,
          usuarioNombre: currentUser.nombre || '',
          usuarioEmail: currentUser.email || '',
          fecha
        });
      });
      flash(` Fabricación registrada: +${cantidadNum} ${etiquetaProducto(producto)}`);
      fabricacionDraft.descartar();
      setProductoId(''); setCantidad('');
    } catch (e) { flash(' ' + e.message); }
    setSaving(false);
  };
  return React.createElement(Card, null,
    React.createElement(BorradorRecuperable, { borrador: fabricacionDraft.borrador, onContinuar: recuperarFabricacion, onDescartar: fabricacionDraft.descartar }),
    React.createElement(BorradorGuardado, { guardadoEn: fabricacionDraft.guardadoEn }),
    React.createElement('div', { style: { fontWeight: 700, marginBottom: 6 } }, 'Fabricación / producción'),
    React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-faint)', marginBottom: 10, lineHeight: 1.4 } }, 'Cada presentación se fabrica y se almacena por separado. Fabricar un saco de 25 kg no modifica las bolsas de 10 kg.'),
    React.createElement('select', { value: productoId, onChange: e => setProductoId(e.target.value), style: { ...localInputStyle, marginBottom: 8 } }, React.createElement('option', { value: '' }, 'Selecciona presentación/SKU'), productos.filter(p => p.activo !== false).map(p => React.createElement('option', { key: p.id, value: p.id }, `${p.nombre} · ${etiquetaProducto(p)} · stock ${p.stock || 0}`))),
    producto && React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-soft)', marginBottom: 8 } }, `Existencia actual: ${producto.stock || 0} ${producto.unidadInventario || 'pieza'} · contenido: ${producto.contenidoPorUnidad ?? '—'} ${producto.unidadContenido || ''}`),
    React.createElement('input', { type: 'number', min: '0', step: producto?.permiteDecimales ? 'any' : '1', value: cantidad, onChange: e => setCantidad(e.target.value), placeholder: 'Cantidad fabricada', style: { ...localInputStyle, marginBottom: 8 } }),
    React.createElement('input', { value: motivo, onChange: e => setMotivo(e.target.value), placeholder: 'Motivo o lote de fabricación', style: { ...localInputStyle, marginBottom: 10 } }),
    React.createElement(Row, { style: { gap: 8, marginTop: 10 } }, React.createElement(BOut, { onClick: cancelarFabricacion, style: { flex: 1 } }, 'Cancelar'), React.createElement(BFill, { onClick: guardar, disabled: saving, style: { flex: 1 } }, saving ? 'Guardando…' : 'Registrar fabricación'))
  );
}

function Inventario({
  productos,
  clientes,
  currentUser
}) {
  const inputStyle = {
    background: 'var(--surface-2)',
    border: '1px solid var(--line-strong)',
    borderRadius: 8,
    padding: '8px 10px',
    color: 'var(--ink)',
    fontSize: 13,
    width: '100%',
    boxSizing: 'border-box',
    marginBottom: 10
  };
  const lblStyle = {
    fontSize: 11,
    color: 'var(--ink-soft)',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: '.5px'
  };
  const fDateTime = d => d ? new Date(d).toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }) : '—';
  const [msg, setMsg] = useState('');
  const flash = m => {
    setMsg(m);
    setTimeout(() => setMsg(''), 3000);
  };
  const [subTab, setSubTab] = useState('conteo');
  const [conteoDraft, setConteoDraft] = useState({});
  const [conteoSearch, setConteoSearch] = useState('');
  const [conteoMotivo, setConteoMotivo] = useState('Conteo físico de bodega');
  const [conteoSaving, setConteoSaving] = useState(false);
  const setConteo = (id, val) => setConteoDraft(d => ({
    ...d,
    [id]: val
  }));
  const cambiosConteo = productos.filter(p => conteoDraft[p.id] !== undefined && conteoDraft[p.id] !== '' && Number(conteoDraft[p.id]) !== p.stock);
  const guardarConteo = async () => {
    if (cambiosConteo.length === 0) {
      flash(' No hay cambios que guardar');
      return;
    }
    setConteoSaving(true);
    try {
      const batch = db.batch();
      cambiosConteo.forEach(p => {
        const nuevo = Number(conteoDraft[p.id]);
        batch.update(db.collection('productos').doc(p.id), {
          stock: nuevo
        });
        batch.set(db.collection('inventario_historial').doc(), {
          productoId: p.id,
          productoNombre: p.nombre,
          stockAnterior: p.stock,
          stockNuevo: nuevo,
          diferencia: nuevo - p.stock,
          motivo: conteoMotivo || 'Conteo físico de bodega',
          usuarioUid: currentUser.uid,
          usuarioNombre: currentUser.nombre || '',
          usuarioEmail: currentUser.email || '',
          fecha: new Date().toISOString()
        });
      });
      await batch.commit();
      flash(' Conteo guardado — ' + cambiosConteo.length + ' producto(s) ajustado(s)');
      inventarioDraft.descartar();
      setConteoDraft({});
    } catch (e) {
      flash(' ' + e.message);
    }
    setConteoSaving(false);
  };
  const [devoluciones, setDevoluciones] = useState([]);
  const [devProdSearch, setDevProdSearch] = useState('');
  const [devProdSel, setDevProdSel] = useState(null);
  const [devCliSearch, setDevCliSearch] = useState('');
  const [devCliSel, setDevCliSel] = useState(null);
  const [devCantidad, setDevCantidad] = useState(1);
  const [devMotivo, setDevMotivo] = useState('dañado');
  const [devAccion, setDevAccion] = useState('reingreso');
  const [devSaving, setDevSaving] = useState(false);
  const inventarioDraftValor = { subTab, conteoDraft, conteoMotivo, devProdSearch, devProdSel, devCliSearch, devCliSel, devCantidad, devMotivo, devAccion };
  const inventarioDraft = useBorradorLocal('inventario:operacion', inventarioDraftValor, { uid: currentUser?.uid, habilitado: true, etiqueta: 'Operación de inventario' });
  const descartarInventario = () => {
    inventarioDraft.descartar();
    setConteoDraft({}); setConteoMotivo('Conteo físico de bodega'); setDevProdSearch(''); setDevProdSel(null); setDevCliSearch(''); setDevCliSel(null); setDevCantidad(1); setDevMotivo('dañado'); setDevAccion('reingreso');
  };
  const cancelarInventario = () => {
    if (!confirmarSalidaBorrador({ sucio: inventarioDraft.sucio, borrador: inventarioDraft.borrador, etiqueta: 'la operación de inventario' })) return;
    descartarInventario();
  };
  const recuperarInventario = () => {
    const recuperado = inventarioDraft.consumir();
    if (!recuperado) return;
    setSubTab(recuperado.subTab || 'conteo'); setConteoDraft(recuperado.conteoDraft || {}); setConteoMotivo(recuperado.conteoMotivo || 'Conteo físico de bodega'); setDevProdSearch(recuperado.devProdSearch || ''); setDevProdSel(recuperado.devProdSel || null); setDevCliSearch(recuperado.devCliSearch || ''); setDevCliSel(recuperado.devCliSel || null); setDevCantidad(recuperado.devCantidad ?? 1); setDevMotivo(recuperado.devMotivo || 'dañado'); setDevAccion(recuperado.devAccion || 'reingreso');
  };
  useEffect(() => {
    const unsub = db.collection('devoluciones').orderBy('fecha', 'desc').limit(100).onSnapshot(snap => setDevoluciones(snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))), () => {});
    return unsub;
  }, []);
  const registrarDevolucion = async () => {
    if (!devProdSel) {
      flash(' Selecciona un producto');
      return;
    }
    const cant = Number(devCantidad);
    if (!cant || cant < 1) {
      flash(' Cantidad inválida');
      return;
    }
    setDevSaving(true);
    try {
      const batch = db.batch();
      batch.set(db.collection('devoluciones').doc(), {
        fecha: new Date().toISOString(),
        productoId: devProdSel.id,
        productoNombre: devProdSel.nombre,
        cantidad: cant,
        clienteId: devCliSel ? devCliSel.id : null,
        clienteNombre: devCliSel ? devCliSel.nombre : '',
        motivo: devMotivo,
        accion: devAccion,
        usuarioNombre: currentUser.nombre || '',
        usuarioEmail: currentUser.email || '',
        capturadoPorUid: currentUser.uid,
        capturadoPorNombre: currentUser.nombre || ''
      });
      if (devAccion === 'reingreso') {
        const nuevo = devProdSel.stock + cant;
        batch.update(db.collection('productos').doc(devProdSel.id), {
          stock: nuevo
        });
        batch.set(db.collection('inventario_historial').doc(), {
          productoId: devProdSel.id,
          productoNombre: devProdSel.nombre,
          stockAnterior: devProdSel.stock,
          stockNuevo: nuevo,
          diferencia: cant,
          motivo: 'Devolución — ' + devMotivo,
          usuarioUid: currentUser.uid,
          usuarioNombre: currentUser.nombre || '',
          usuarioEmail: currentUser.email || '',
          fecha: new Date().toISOString()
        });
      }
      await batch.commit();
      flash(devAccion === 'reingreso' ? ' Devolución registrada — regresó a inventario' : ' Baja registrada');
      inventarioDraft.descartar();
      setDevProdSel(null);
      setDevProdSearch('');
      setDevCliSel(null);
      setDevCliSearch('');
      setDevCantidad(1);
      setDevMotivo('dañado');
    } catch (e) {
      flash(' ' + e.message);
    }
    setDevSaving(false);
  };
  return React.createElement("div", {
    style: {
      padding: '16px 12px'
    }
  }, React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 800,
      marginBottom: 12
    }
  }, " Inventario"), msg && React.createElement("div", {
    style: {
      background: 'var(--ok-bg)',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 13,
      color: 'var(--ok-text)',
      marginBottom: 12
    }
  }, msg), React.createElement(BorradorRecuperable, { borrador: inventarioDraft.borrador, onContinuar: recuperarInventario, onDescartar: descartarInventario }), React.createElement(BorradorGuardado, { guardadoEn: inventarioDraft.guardadoEn }), React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginBottom: 14
    }
  }, [['conteo', ' Conteo físico'], ['fabricacion', ' Fabricación'], ['devoluciones', '↩ Devoluciones']].map(([v, l]) => React.createElement("button", {
    key: v,
    onClick: () => setSubTab(v),
    style: {
      flex: 1,
      padding: '8px 4px',
      borderRadius: 8,
      border: 'none',
      background: subTab === v ? 'var(--accent)' : 'var(--surface)',
      color: subTab === v ? 'var(--surface-2)' : 'var(--ink-soft)',
      fontSize: 11,
      fontWeight: 700,
      cursor: 'pointer'
    }
  }, l))), subTab === 'conteo' && React.createElement(React.Fragment, null, React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ink-faint)',
      marginBottom: 10
    }
  }, "Cuenta físicamente lo que hay en bodega y anota la cantidad real. Solo se guardan los productos donde el número cambió — queda registrado en el historial de inventario de Productos."), React.createElement("input", {
    value: conteoSearch,
    onChange: e => setConteoSearch(e.target.value),
    placeholder: " Buscar producto…",
    style: inputStyle
  }), React.createElement("div", {
    style: {
      maxHeight: 320,
      overflowY: 'auto',
      marginBottom: 12
    }
  }, productos.filter(p => p.nombre.toLowerCase().includes(conteoSearch.toLowerCase())).map(p => {
    const val = conteoDraft[p.id];
    const diff = val !== undefined && val !== '' ? Number(val) - p.stock : 0;
    return React.createElement("div", {
      key: p.id,
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 0',
        borderBottom: '1px solid var(--line)'
      }
    }, React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 600
      }
    }, p.nombre), React.createElement("div", {
      style: {
        fontSize: 11,
        color: 'var(--ink-faint)'
      }
    }, "Sistema: ", p.stock, " ", etiquetaProducto(p), " · ", PRODUCTO_UNIDADES_INVENTARIO.find(u => u.id === (p.unidadInventario || 'pieza'))?.nombre || unidadProductoNombre(p.unidadMedida || p.unidad || 'pieza'), diff !== 0 && React.createElement("span", {
      style: {
        color: diff > 0 ? 'var(--ok)' : 'var(--danger-text)',
        fontWeight: 700
      }
    }, " · ", diff > 0 ? '+' : '', diff))), React.createElement("input", {
      type: "number",
      min: "0",
      value: val === undefined ? '' : val,
      onChange: e => setConteo(p.id, e.target.value),
      placeholder: Number(p.stock) > 0 ? String(p.stock) : 'Ej. 1',
      style: {
        width: 64,
        textAlign: 'center',
        fontSize: 13,
        background: 'var(--surface-2)',
        border: '1px solid ' + (diff !== 0 ? 'var(--accent)' : 'var(--line-strong)'),
        borderRadius: 6,
        color: 'var(--ink)',
        padding: '6px 2px'
      }
    }));
  })), cambiosConteo.length > 0 && React.createElement("div", {
    style: {
      background: 'var(--surface)',
      borderRadius: 12,
      padding: 14,
      marginBottom: 12
    }
  }, React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--accent)',
      fontWeight: 700,
      marginBottom: 8
    }
  }, cambiosConteo.length, " producto(s) con diferencia"), React.createElement("div", {
    style: lblStyle
  }, "Motivo (aplica a todos)"), React.createElement("input", {
    value: conteoMotivo,
    onChange: e => setConteoMotivo(e.target.value),
    style: {
      ...inputStyle,
      marginBottom: 12
    }
  }), React.createElement("button", {
    onClick: guardarConteo,
    disabled: conteoSaving,
    style: {
      width: '100%',
      background: 'var(--accent)',
      color: 'var(--surface-2)',
      border: 'none',
      borderRadius: 8,
      padding: 12,
      fontWeight: 700,
      cursor: 'pointer',
      opacity: conteoSaving ? 0.6 : 1
    }
      }, conteoSaving ? 'Guardando…' : ' Guardar conteo (' + cambiosConteo.length + ')'))), subTab === 'fabricacion' && React.createElement(FabricacionInventario, { productos, currentUser, flash }), subTab === 'devoluciones' && React.createElement(React.Fragment, null, React.createElement("div", {
    style: {
      background: 'var(--surface)',
      borderRadius: 12,
      padding: 14,
      marginBottom: 14
    }
  }, React.createElement("div", {
    style: lblStyle
  }, "Producto"), devProdSel ? React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: 'var(--surface-2)',
      borderRadius: 8,
      padding: '8px 10px',
      marginBottom: 10
    }
  }, React.createElement("span", {
    style: {
      fontSize: 13,
      color: 'var(--accent)',
      fontWeight: 700
    }
  }, devProdSel.nombre), React.createElement("button", {
    onClick: () => setDevProdSel(null),
    style: {
      background: 'none',
      border: 'none',
      color: 'var(--ink-soft)',
      cursor: 'pointer'
    }
  }, "")) : React.createElement(React.Fragment, null, React.createElement("input", {
    value: devProdSearch,
    onChange: e => setDevProdSearch(e.target.value),
    placeholder: "Buscar producto…",
    style: inputStyle
  }), React.createElement("div", {
    style: {
      maxHeight: 120,
      overflowY: 'auto',
      marginBottom: 10
    }
  }, productos.filter(p => p.nombre.toLowerCase().includes(devProdSearch.toLowerCase())).map(p => React.createElement("div", {
    key: p.id,
    onClick: () => setDevProdSel(p),
    style: {
      padding: '7px 8px',
      borderRadius: 6,
      cursor: 'pointer',
      fontSize: 13
    }
  }, p.nombre, " · ", etiquetaProducto(p)))), React.createElement("div", {
    style: lblStyle
  }, "Cliente (opcional)"), devCliSel ? React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: 'var(--surface-2)',
      borderRadius: 8,
      padding: '8px 10px',
      marginBottom: 10
    }
  }, React.createElement("span", {
    style: {
      fontSize: 13,
      color: 'var(--accent)',
      fontWeight: 700
    }
  }, devCliSel.nombre), React.createElement("button", {
    onClick: () => setDevCliSel(null),
    style: {
      background: 'none',
      border: 'none',
      color: 'var(--ink-soft)',
      cursor: 'pointer'
    }
  }, "")) : React.createElement(React.Fragment, null, React.createElement("input", {
    value: devCliSearch,
    onChange: e => setDevCliSearch(e.target.value),
    placeholder: "Buscar cliente…",
    style: inputStyle
  }), devCliSearch && React.createElement("div", {
    style: {
      maxHeight: 120,
      overflowY: 'auto',
      marginBottom: 10
    }
  }, clientes.filter(c => c.activo && c.nombre.toLowerCase().includes(devCliSearch.toLowerCase())).map(c => React.createElement("div", {
    key: c.id,
    onClick: () => setDevCliSel(c),
    style: {
      padding: '7px 8px',
      borderRadius: 6,
      cursor: 'pointer',
      fontSize: 13
    }
  }, c.nombre)))), React.createElement("div", {
    style: lblStyle
  }, "Cantidad"), React.createElement("input", {
    type: "number",
    min: "1",
    value: devCantidad,
    placeholder: 'Ej. 1',
    onChange: e => setDevCantidad(e.target.value),
    style: inputStyle
  }), React.createElement("div", {
    style: lblStyle
  }, "Motivo"), React.createElement("select", {
    value: devMotivo,
    onChange: e => setDevMotivo(e.target.value),
    style: inputStyle
  }, React.createElement("option", {
    value: "dañado"
  }, "Producto dañado"), React.createElement("option", {
    value: "incorrecto"
  }, "Se entregó incorrecto"), React.createElement("option", {
    value: "rechazado"
  }, "Rechazado por el cliente"), React.createElement("option", {
    value: "caducado"
  }, "Caducado / vencido"), React.createElement("option", {
    value: "otro"
  }, "Otro")), React.createElement("div", {
    style: lblStyle
  }, "Acción"), React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginBottom: 14
    }
  }, [['reingreso', '↩ Regresa a inventario', 'var(--ok-bg)', 'var(--ok-text)'], ['baja', ' Baja (no se vende)', 'var(--danger-bg)', 'var(--danger-text)']].map(([v, l, bg, col]) => React.createElement("button", {
    key: v,
    onClick: () => setDevAccion(v),
    style: {
      flex: 1,
      padding: 9,
      borderRadius: 8,
      border: 'none',
      background: devAccion === v ? bg : 'var(--surface-2)',
      color: devAccion === v ? col : 'var(--ink-soft)',
      fontSize: 11,
      fontWeight: 700,
      cursor: 'pointer'
    }
  }, l))), React.createElement("button", {
    onClick: registrarDevolucion,
    disabled: devSaving,
    style: {
      width: '100%',
      background: 'var(--accent)',
      color: 'var(--surface-2)',
      border: 'none',
      borderRadius: 8,
      padding: 12,
      fontWeight: 700,
      cursor: 'pointer',
      opacity: devSaving ? 0.6 : 1
    }
      }, devSaving ? 'Guardando…' : ' Registrar'), React.createElement(BOut, { onClick: cancelarInventario, style: { width: '100%', marginTop: 8 } }, 'Cancelar')), React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ink-faint)',
      fontWeight: 700,
      marginBottom: 8
    }
  }, "RECIENTES"), devoluciones.length === 0 && React.createElement("div", {
    style: {
      textAlign: 'center',
      color: 'var(--ink-faint)',
      padding: '16px 0'
    }
  }, "Sin devoluciones registradas"), devoluciones.map(d => React.createElement("div", {
    key: d.id,
    style: {
      background: 'var(--surface)',
      borderRadius: 12,
      padding: 12,
      marginBottom: 8
    }
  }, React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: 3
    }
  }, React.createElement("span", {
    style: {
      fontWeight: 700,
      fontSize: 13
    }
  }, d.productoNombre, " x", d.cantidad), React.createElement("span", {
    style: {
      background: (d.accion === 'reingreso' ? '#2E8B45' : '#C23B2E') + '22',
      color: d.accion === 'reingreso' ? '#2E8B45' : '#C23B2E',
      borderRadius: 20,
      padding: '2px 9px',
      fontSize: 11,
      fontWeight: 700
    }
    }, d.accion === 'reingreso' ? 'reingresó' : 'baja')), React.createElement(OpcionesMenu, { label: 'Acciones de devolución', items: [{ key: 'detalle', icon: 'file', label: 'Ver detalle', onClick: () => flash(`${d.productoNombre} · ${d.accion === 'reingreso' ? 'Reingreso a inventario' : 'Baja no vendible'} · ${d.motivo || 'Sin motivo'}`) }] }), React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ink-soft)'
    }
  }, d.motivo, d.clienteNombre ? ' · ' + d.clienteNombre : ''), React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ink-faint)',
      marginTop: 2
    }
    }, fDateTime(d.fecha)))))));
}