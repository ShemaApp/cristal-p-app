const PRODUCTO_UNIDADES_UNIVERSALES = [
  { id: 'pieza', nombre: 'Pieza (pz)' },
  { id: 'litros', nombre: 'Litros (L)' },
  { id: 'mililitros', nombre: 'Mililitros (mL)' },
  { id: 'kilos', nombre: 'Kilos (kg)' },
  { id: 'gramos', nombre: 'Gramos (g)' },
  { id: 'metros', nombre: 'Metros (m)' },
  { id: 'metros_cubicos', nombre: 'Metros cúbicos (m³)' },
  { id: 'galones', nombre: 'Galones (gal)' }
];
const PRODUCTO_PRESENTACIONES = [
  { id: 'PZ', nombre: 'PZ · pieza' },
  { id: 'XP', nombre: 'XP · extra pequeña' },
  { id: 'P', nombre: 'P · pequeña' },
  { id: 'M', nombre: 'M · mediana' },
  { id: 'G', nombre: 'G · grande' },
  { id: 'XG', nombre: 'XG · extra grande' },
  { id: 'XL', nombre: 'XL · extra larga' },
  { id: '250ML', nombre: '250 mL' },
  { id: '500ML', nombre: '500 mL' },
  { id: '1L', nombre: '1 L' },
  { id: '1_5L', nombre: '1.5 L' },
  { id: '4L', nombre: '4 L' },
  { id: '1KG', nombre: '1 kg' },
  { id: '5KG', nombre: '5 kg' },
  { id: '10KG', nombre: '10 kg' }
];
const PRODUCTO_TIPOS_VENTA = [
  { id: 'pieza', nombre: 'Pieza' },
  { id: 'granel', nombre: 'A granel' },
  { id: 'paquete', nombre: 'Paquete' }
];
const PRODUCTO_UNIDADES_INVENTARIO = [
  { id: 'pieza', nombre: 'Pieza (pz)' },
  { id: 'kg', nombre: 'Kilogramo (kg)' },
  { id: 'g', nombre: 'Gramo (g)' },
  { id: 'L', nombre: 'Litro (L)' },
  { id: 'mL', nombre: 'Mililitro (mL)' },
  { id: 'paquete', nombre: 'Paquete' },
  { id: 'caja', nombre: 'Caja' },
  { id: 'saco', nombre: 'Saco' },
  { id: 'bolsa', nombre: 'Bolsa' }
];
const unidadProductoNombre = id => PRODUCTO_UNIDADES_UNIVERSALES.find(x => x.id === id)?.nombre || id || 'Pieza (pz)';
const presentacionProductoNombre = id => PRODUCTO_PRESENTACIONES.find(x => x.id === id)?.nombre || id || 'PZ · pieza';
window.PRODUCTO_UNIDADES_UNIVERSALES = PRODUCTO_UNIDADES_UNIVERSALES;
window.PRODUCTO_PRESENTACIONES = PRODUCTO_PRESENTACIONES;
window.unidadProductoNombre = unidadProductoNombre;
window.presentacionProductoNombre = presentacionProductoNombre;
window.PRODUCTO_TIPOS_VENTA = PRODUCTO_TIPOS_VENTA;
window.PRODUCTO_UNIDADES_INVENTARIO = PRODUCTO_UNIDADES_INVENTARIO;
const precioActivoProducto = producto => {
  const precios = Array.isArray(producto?.preciosVenta) ? producto.preciosVenta : [];
  const activo = precios.find(p => p.activo !== false && Number(p.precio) >= 0);
  if (activo) return { ...activo, precio: Number(activo.precio || 0) };
  if (precios.length) return { id: producto?.precioActivoId || 'sin-precio-activo', nombre: 'Sin precio activo', precio: 0, activo: false };
  return { id: producto?.precioActivoId || 'precio-legado', nombre: 'Precio actual', precio: Number(producto?.precio || 0), activo: true };
};
const precioProducto = producto => Number(precioActivoProducto(producto).precio || producto?.precio || 0);
const etiquetaProducto = producto => producto?.etiquetaPresentacion || presentacionProductoNombre(producto?.tamanoPresentacion || 'PZ');
window.precioActivoProducto = precioActivoProducto;
window.precioProducto = precioProducto;
window.etiquetaProducto = etiquetaProducto;

function InventarioHistorial({
  onClose
}) {
  const [items, setItems] = useState(null);
  useEffect(() => {
    const unsub = db.collection('inventario_historial').orderBy('fecha', 'desc').limit(200).onSnapshot(snap => {
      setItems(snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })));
    }, () => setItems([]));
    return unsub;
  }, []);
  return React.createElement(Modal, {
    title: "📋 Historial de inventario",
    onClose: onClose
  }, React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ink-faint)',
      marginBottom: 10
    }
  }, "Solo cambios manuales de stock (altas y ajustes). No incluye descuentos automáticos por venta."), items === null && React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--ink-faint)',
      textAlign: 'center',
      padding: '20px 0'
    }
  }, "Cargando…"), items && items.length === 0 && React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--ink-faint)',
      textAlign: 'center',
      padding: '20px 0'
    }
  }, "Sin cambios registrados aún"), items && items.map(h => React.createElement("div", {
    key: h.id,
    style: {
      paddingBottom: 10,
      borderBottom: '1px solid var(--line-strong)',
      marginBottom: 10
    }
  }, React.createElement(Row, {
    style: {
      justifyContent: 'space-between',
      marginBottom: 3
    }
  }, React.createElement("span", {
    style: {
      fontWeight: 700,
      fontSize: 13
    }
  }, h.productoNombre, h.etiquetaPresentacion ? ' · ' + h.etiquetaPresentacion : ''), React.createElement(Tag, {
    color: h.diferencia >= 0 ? 'var(--ok-text)' : 'var(--danger-text)'
  }, h.diferencia >= 0 ? '+' : '', h.diferencia)), React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--ink-soft)'
    }
  }, h.stockAnterior, " → ", h.stockNuevo, " ", h.unidadInventario || 'unidades'), React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--ink-soft)',
      marginTop: 2
    }
  }, "Motivo: ", h.motivo || 'Sin especificar'), React.createElement(Row, {
    style: {
      justifyContent: 'space-between',
      marginTop: 4
    }
  }, React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--ink-faint)'
    }
  }, h.usuarioNombre || h.usuarioEmail || '—'), React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--ink-faint)'
    }
  }, fDate(h.fecha))))));
}
function PrecioProductoModal({ producto, currentUser, onClose }) {
  const iniciales = Array.isArray(producto?.preciosVenta) && producto.preciosVenta.length ? producto.preciosVenta : [{ id: producto?.precioActivoId || 'precio-legado', nombre: 'Precio actual', precio: Number(producto?.precio || 0), activo: true, vigenteDesde: null, vigenteHasta: null }];
  const [precios, setPrecios] = useState(iniciales);
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [saving, setSaving] = useState(false);
  const guardar = async (lista, activoId, compatPrecio) => {
    setSaving(true);
    try {
      await db.collection('productos').doc(producto.id).update({ preciosVenta: lista, precioActivoId: activoId || '', precio: Number(compatPrecio || 0), actualizadoPorUid: currentUser.uid, actualizadoEn: new Date().toISOString() });
      setPrecios(lista);
    } catch (e) { alert('No se pudo actualizar precios: ' + e.message); }
    setSaving(false);
  };
  const agregar = async () => {
    const valor = Number(precio);
    if (!nombre.trim() || !Number.isFinite(valor) || valor < 0) { alert('Captura nombre y un precio válido'); return; }
    const nuevo = { id: `pv_${Date.now()}`, nombre: nombre.trim(), precio: valor, activo: true, vigenteDesde: new Date().toISOString(), vigenteHasta: null, creadoPorUid: currentUser.uid };
    const lista = [...precios.map(p => ({ ...p, activo: false, vigenteHasta: p.activo === false ? p.vigenteHasta || null : new Date().toISOString() })), nuevo];
    await guardar(lista, nuevo.id, valor);
    setNombre(''); setPrecio('');
  };
  const alternar = async id => {
    const actual = precios.find(p => p.id === id);
    if (!actual) return;
    const activar = actual.activo === false;
    const lista = precios.map(p => ({ ...p, activo: activar ? p.id === id : false, vigenteHasta: p.id === id && !activar ? new Date().toISOString() : p.vigenteHasta }));
    const elegido = lista.find(p => p.activo);
    await guardar(lista, elegido?.id || '', elegido?.precio || 0);
  };
  return React.createElement(Modal, { title: '💵 Precios · ' + producto.nombre, onClose },
    React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-soft)', marginBottom: 10 } }, etiquetaProducto(producto), ' · El precio no cambia el stock y cada venta guarda una instantánea.'),
    precios.map(p => React.createElement(Row, { key: p.id, style: { justifyContent: 'space-between', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--line)' } }, React.createElement('div', { style: { minWidth: 0 } }, React.createElement('div', { style: { fontWeight: 700, fontSize: 13 } }, p.nombre), React.createElement('div', { style: { fontSize: 12, color: 'var(--accent-text)' } }, fmt(Number(p.precio || 0)), p.activo ? ' · ACTIVO' : ' · inactivo')), React.createElement(BOut, { onClick: () => alternar(p.id), disabled: saving }, p.activo ? 'Desactivar' : 'Activar'))),
    React.createElement('div', { style: { marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--line)' } }, React.createElement(Lbl, null, 'Nuevo precio'), React.createElement(Row, { style: { gap: 8 } }, React.createElement(Inp, { value: nombre, onChange: e => setNombre(e.target.value), placeholder: 'Ej. Mayoreo', style: { flex: 1 } }), React.createElement(Inp, { type: 'number', min: 0, step: '0.01', value: precio, onChange: e => setPrecio(e.target.value), placeholder: '$', style: { width: 90 } })), React.createElement(BFill, { onClick: agregar, disabled: saving, style: { width: '100%', marginTop: 8 } }, '＋ Agregar y activar'))
  );
}

function Productos({
  productos,
  currentUser,
  abrirForm,
  onAbrirFormConsumido,
  onAbrirEtiquetas
}) {
  const isAdmin = currentUser?.role === 'admin';
  const puedeEditar = isAdmin || permisoEdita(currentUser).productos;
  const [sel, setSel] = useState([]);
  const [selMode, setSelMode] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [q, setQ] = useState('');
  const [form, setForm] = useState(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [histOpen, setHistOpen] = useState(false);
  const [priceProduct, setPriceProduct] = useState(null);
  useEffect(() => {
    if (abrirForm) {
      setForm({
        nombre: '',
        productoBaseId: '',
        tipoProducto: 'terminado',
        tipoVenta: 'pieza',
        etiquetaPresentacion: '',
        unidadInventario: 'pieza',
        contenidoPorUnidad: '',
        unidadContenido: 'pieza',
        productoContenidoId: '',
        requiereLlenado: false,
        productoVacioId: '',
        precioNombre: 'Precio público',
        precio: '',
        stock: '',
        unidadMedida: 'pieza',
        tamanoPresentacion: 'PZ',
        codigoBarras: '',
        motivo: ''
      });
      onAbrirFormConsumido && onAbrirFormConsumido();
    }
  }, [abrirForm]);
  const list = productos.filter(p => p.nombre.toLowerCase().includes(q.toLowerCase()));
  const allSel = list.length > 0 && sel.length === list.length;
  const togSel = id => setSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const togAll = () => setSel(allSel ? [] : list.map(p => p.id));
  const delSel = async () => {
    await Promise.all(sel.map(id => db.collection('productos').doc(id).delete()));
    setSel([]);
    setSelMode(false);
  };
  const entrarSeleccion = id => {
    setSelMode(true);
    setSel([id]);
    setExpandedId(null);
  };
  const salirSeleccion = () => {
    setSelMode(false);
    setSel([]);
  };
  const toggleMenu = id => {
    setExpandedId(eid => eid === id ? null : id);
  };
  const logInventario = (productoId, productoNombre, stockAnterior, stockNuevo, motivo) => {
    if (stockAnterior === stockNuevo) return Promise.resolve();
    return db.collection('inventario_historial').add({
      productoId,
      productoNombre,
      stockAnterior,
      stockNuevo,
      diferencia: stockNuevo - stockAnterior,
      motivo: motivo || 'Sin especificar',
      usuarioUid: currentUser?.uid || '',
      usuarioNombre: currentUser?.nombre || '',
      usuarioEmail: currentUser?.email || '',
      fecha: new Date().toISOString()
    });
  };
  const save = async () => {
    if (!form.nombre || form.precio === '' || form.precio === undefined) {
      alert('Nombre y precio son obligatorios');
      return;
    }
    let codigo;
    try {
      codigo = normalizarCodigoBarras(form.codigoBarras || '');
    } catch (e) {
      alert('Código de barras inválido: ' + e.message);
      return;
    }
    setSaving(true);
    const nuevoStock = +form.stock || 0;
    const anterior = form.id ? productos.find(p => p.id === form.id) : null;
    const precioAnterior = precioActivoProducto(anterior || {});
    const precioCambio = !form.id || Number(form.precio) !== Number(precioAnterior.precio) || String(form.precioNombre || 'Precio actual') !== String(precioAnterior.nombre || 'Precio actual');
    const preciosPrevios = Array.isArray(anterior?.preciosVenta) && anterior.preciosVenta.length
      ? anterior.preciosVenta
      : (form.id ? [{ ...precioAnterior, activo: true }] : []);
    const precioId = precioCambio || !preciosPrevios.length ? `pv_${Date.now()}` : (anterior?.precioActivoId || preciosPrevios.find(p => p.activo !== false)?.id || `pv_${Date.now()}`);
    const preciosVenta = precioCambio || !preciosPrevios.length
      ? [...preciosPrevios.map(p => ({ ...p, activo: false, vigenteHasta: p.activo === false ? p.vigenteHasta || null : new Date().toISOString() })), { id: precioId, nombre: form.precioNombre || 'Precio público', precio: +form.precio, activo: true, vigenteDesde: new Date().toISOString(), vigenteHasta: null, creadoPorUid: currentUser?.uid || '' }]
      : preciosPrevios;
    const item = {
      nombre: form.nombre,
      productoBaseId: String(form.productoBaseId || form.nombre || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      tipoProducto: form.tipoProducto || 'terminado',
      tipoVenta: form.tipoVenta || 'pieza',
      etiquetaPresentacion: form.etiquetaPresentacion || '',
      unidadInventario: form.unidadInventario || 'pieza',
      contenidoPorUnidad: form.contenidoPorUnidad === '' ? null : Number(form.contenidoPorUnidad || 0),
      unidadContenido: form.unidadContenido || form.unidadMedida || 'pieza',
      productoContenidoId: form.productoContenidoId || '',
      requiereLlenado: !!form.requiereLlenado,
      productoVacioId: form.productoVacioId || '',
      permiteDecimales: form.tipoVenta === 'granel' || ['kg', 'g', 'L', 'mL'].includes(form.unidadInventario),
      precio: +form.precio,
      precioActivoId: precioId,
      preciosVenta,
      stock: nuevoStock,
      unidadMedida: form.unidadMedida,
      tamanoPresentacion: form.tamanoPresentacion,
      // Compatibilidad temporal con módulos y documentos antiguos.
      unidad: form.unidadMedida,
      codigoBarras: codigo,
      codigoBarrasNormalizado: codigo,
      codigoBarrasTipo: codigo ? (codigo.indexOf('FLW-PROD-') === 0 ? 'interno_code128' : 'externo') : ''
    };
    try {
      const existente = codigo && productos.find(p => {
        try {
          return codigoBarrasDeProducto(p) === codigo && p.id !== form.id;
        } catch (e) {
          return false;
        }
      });
      if (existente) {
        alert(`❌ El código de barras "${codigo}" ya está asignado a "${existente.nombre}"`);
        setSaving(false);
        return;
      }
      if (form.id) {
        const codigoAnterior = anterior ? codigoBarrasDeProducto(anterior) : '';
        await guardarProductoConIndiceCodigo(form.id, item, codigoAnterior);
        if (anterior) await logInventario(form.id, form.nombre, anterior.stock, nuevoStock, form.motivo);
      } else {
        const ref = await crearProductoConIndiceCodigo(item);
        await logInventario(ref.id, form.nombre, 0, nuevoStock, form.motivo || 'Alta de producto');
      }
      setForm(null);
    } catch (e) {
      alert(e.code === 'barcode-already-assigned' ? e.message : 'Error al guardar: ' + e.message);
    }
    setSaving(false);
  };
  return React.createElement("div", {
    style: {
      padding: '16px 12px'
    }
  }, React.createElement(Row, {
    style: {
      justifyContent: 'space-between',
      marginBottom: 12
    }
  }, React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 800
    }
  }, "📦 Productos"), React.createElement(Row, {
    style: {
      gap: 6
    }
  }, isAdmin && React.createElement(BOut, {
    onClick: () => setHistOpen(true)
  }, "📋 Historial"), puedeEditar && React.createElement(BFill, {
    onClick: () => setForm({
          nombre: '',
          productoBaseId: '',
          tipoProducto: 'terminado',
          tipoVenta: 'pieza',
          etiquetaPresentacion: '',
          unidadInventario: 'pieza',
          contenidoPorUnidad: '',
          unidadContenido: 'pieza',
          productoContenidoId: '',
          requiereLlenado: false,
          productoVacioId: '',
          precioNombre: 'Precio público',
          precio: '',
          stock: '',
          unidadMedida: 'pieza',
          tamanoPresentacion: 'PZ',
          codigoBarras: '',
      motivo: ''
    })
  }, "+ Nuevo"))), React.createElement(Inp, {
    placeholder: "🔍 Buscar...",
    value: q,
    onChange: e => setQ(e.target.value),
    style: {
      marginBottom: 10
    }
  }), React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ink-faint)',
      marginBottom: 10
    }
  }, "Usa el botón ⋮ de cada producto para ver sus acciones."), selMode && React.createElement(Row, {
    style: {
      marginBottom: 10,
      background: 'var(--danger-bg)',
      borderRadius: 8,
      padding: '8px 12px'
    }
  }, React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 13,
      color: 'var(--danger-text)'
    }
  }, sel.length, " seleccionado(s)"), React.createElement(BOut, {
    onClick: delSel,
    color: "var(--danger-text)"
  }, "🗑 Eliminar"), React.createElement(BOut, {
    onClick: salirSeleccion
  }, "Cancelar")), selMode && React.createElement(Row, {
    style: {
      paddingLeft: 4,
      marginBottom: 6
    }
  }, React.createElement("button", {
    onClick: togAll,
    style: {
      background: 'none',
      border: 'none',
      color: allSel ? 'var(--accent-text)' : 'var(--ink-soft)',
      cursor: 'pointer',
      padding: 0,
      display: 'flex'
    }
  }, allSel ? React.createElement(ChkSq, null) : React.createElement(SqI, null)), React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--ink-faint)'
    }
  }, "Seleccionar todos")), list.map(p => {
    const expanded = expandedId === p.id;
    return React.createElement(Card, {
      key: p.id,
      style: {
        padding: 0,
        overflow: 'hidden'
      }
    }, React.createElement("div", {

      onClick: () => {
        if (selMode) togSel(p.id);
      },
      style: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '12px 14px',
        cursor: selMode ? 'pointer' : 'default',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        background: selMode && sel.includes(p.id) ? 'var(--surface-2)' : 'none'
      }
    }, selMode && React.createElement("span", {
      style: {
        color: sel.includes(p.id) ? 'var(--accent-text)' : 'var(--ink-faint)',
        marginTop: 2,
        flexShrink: 0,
        display: 'flex'
      }
    }, sel.includes(p.id) ? React.createElement(ChkSq, null) : React.createElement(SqI, null)), React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, React.createElement(Row, {
      style: {
        justifyContent: 'space-between'
      }
    }, React.createElement("span", {
      style: {
        fontWeight: 700,
        fontSize: 14
      }
    }, p.nombre), React.createElement("span", {
      style: {
        fontWeight: 800,
        color: 'var(--accent-text)',
        fontSize: 14
      }
    }, fmt(precioProducto(p))), React.createElement("button", {
      type: "button",
      title: `Acciones de ${p.nombre}`,
      'aria-label': `Abrir acciones de ${p.nombre}`,
      'aria-expanded': expanded,
      onClick: e => {
        e.stopPropagation();
        if (selMode) {
          togSel(p.id);
          return;
        }
        toggleMenu(p.id);
      },
      style: {
        border: '1px solid var(--line-strong)',
        background: expanded ? 'var(--info-bg)' : 'var(--surface-2)',
        color: expanded ? 'var(--info-text)' : 'var(--ink-soft)',
        borderRadius: 6,
        minWidth: 34,
        height: 32,
        padding: '0 7px',
        cursor: 'pointer',
        fontSize: 20,
        lineHeight: 1,
        fontWeight: 800
      }
    }, '⋮')), React.createElement(Row, {
      style: {
        marginTop: 4
      }
          }, React.createElement(Tag, {
      color: p.stock < 10 ? 'var(--danger-text)' : 'var(--ok-text)'
          }, p.stock, " ", etiquetaProducto(p), " · ", PRODUCTO_UNIDADES_INVENTARIO.find(u => u.id === (p.unidadInventario || 'pieza'))?.nombre || unidadProductoNombre(p.unidadMedida || p.unidad))), p.codigoBarras && React.createElement("div", {
      style: {
        fontSize: 10,
        color: 'var(--ink-faint)',
        marginTop: 3
      }
    }, "🏷️ ", p.codigoBarras))), React.createElement("div", {
      style: {
        maxHeight: expanded ? 180 : 0,
        overflow: 'hidden',
        transition: 'max-height .2s ease'
      }
    }, React.createElement(Row, {
      style: {
        gap: 8,
        padding: '0 14px 12px'
      }
    }, puedeEditar && React.createElement(BOut, {
      onClick: () => {
        setForm({
          ...p,
          precio: String(precioProducto(p)),
          precioNombre: precioActivoProducto(p).nombre || 'Precio actual',
          stock: String(p.stock),
          productoBaseId: p.productoBaseId || '',
          tipoProducto: p.tipoProducto || 'terminado',
          tipoVenta: p.tipoVenta || 'pieza',
          etiquetaPresentacion: p.etiquetaPresentacion || '',
          unidadInventario: p.unidadInventario || 'pieza',
          contenidoPorUnidad: p.contenidoPorUnidad === null || p.contenidoPorUnidad === undefined ? '' : String(p.contenidoPorUnidad),
          unidadContenido: p.unidadContenido || p.unidadMedida || p.unidad || 'pieza',
          productoContenidoId: p.productoContenidoId || '',
          requiereLlenado: !!p.requiereLlenado,
          productoVacioId: p.productoVacioId || '',
          unidadMedida: PRODUCTO_UNIDADES_UNIVERSALES.some(x => x.id === (p.unidadMedida || p.unidad)) ? (p.unidadMedida || p.unidad) : 'pieza',
          tamanoPresentacion: PRODUCTO_PRESENTACIONES.some(x => x.id === p.tamanoPresentacion) ? p.tamanoPresentacion : 'PZ',
          codigoBarras: p.codigoBarras || '',
          motivo: ''
        });
        setExpandedId(null);
      },
      style: {
        flex: 1
      }
    }, "✏️ Editar"), puedeEditar && React.createElement(BOut, { onClick: () => { setPriceProduct(p); setExpandedId(null); }, style: { flex: 1 } }, '💵 Precios'),         React.createElement(BOut, {
          onClick: () => {
            onAbrirEtiquetas && onAbrirEtiquetas();
            setExpandedId(null);
          },
          style: {
            flex: 1
          }
        }, "🏷️ Etiqueta"), isAdmin && React.createElement(BOut, {
          onClick: () => entrarSeleccion(p.id),
          style: {
            flex: 1
          }
        }, "☑️ Seleccionar"), isAdmin && React.createElement(BOut, {
      onClick: () => {
        if (window.confirm(`¿Eliminar "${p.nombre}"? Esta acción no se puede deshacer.`)) db.collection('productos').doc(p.id).delete();
        setExpandedId(null);
      },
      color: "var(--danger-text)",
      style: {
        flex: 1
      }
    }, "🗑️ Eliminar"))));
  }), form && React.createElement(Modal, {
    title: form.id ? 'Editar Producto' : 'Nuevo Producto',
    onClose: () => setForm(null)
  }, React.createElement(Lbl, null, "Nombre"), React.createElement(Inp, {
    value: form.nombre,
    onChange: e => setForm(f => ({
      ...f,
      nombre: e.target.value
    })),
    style: {
      marginBottom: 10
    }
  }), React.createElement(Row, {
    style: {
      gap: 10,
      marginBottom: 10
    }
  }, React.createElement("div", {
    style: {
      flex: 1
    }
  }, React.createElement(Lbl, null, "Precio ($)"), React.createElement(Inp, {
    type: "number",
    placeholder: "Ej. 38.00",
    value: form.precio,
    onChange: e => setForm(f => ({
      ...f,
      precio: e.target.value
    }))
  })), React.createElement("div", {
    style: {
      flex: 1
    }
  }, React.createElement(Lbl, null, "Stock"), React.createElement(Inp, {
    type: "number",
    placeholder: "Ej. 100",
    value: form.stock,
    onChange: e => setForm(f => ({
      ...f,
      stock: e.target.value
    }))
        }))), React.createElement(Row, { style: { gap: 10, marginBottom: 10, alignItems: 'flex-end' } }, React.createElement('div', { style: { flex: 1, minWidth: 0 } }, React.createElement(Lbl, null, 'Producto base / familia'), React.createElement(Inp, { value: form.productoBaseId || '', onChange: e => setForm(f => ({ ...f, productoBaseId: e.target.value })), placeholder: 'Ej. hielo' })), React.createElement('div', { style: { flex: 1, minWidth: 0 } }, React.createElement(Lbl, null, 'Tipo de venta'), React.createElement('select', { value: form.tipoVenta || 'pieza', onChange: e => setForm(f => ({ ...f, tipoVenta: e.target.value })), style: { width: '100%', padding: 9, background: 'var(--surface-2)', border: '1px solid var(--line-strong)', color: 'var(--ink)', borderRadius: 6 } }, PRODUCTO_TIPOS_VENTA.map(t => React.createElement('option', { key: t.id, value: t.id }, t.nombre))))), React.createElement(Row, { style: { gap: 10, marginBottom: 10, alignItems: 'flex-end' } }, React.createElement('div', { style: { flex: 1, minWidth: 0 } }, React.createElement(Lbl, null, 'U/M inventario'), React.createElement('select', { value: form.unidadInventario || 'pieza', onChange: e => setForm(f => ({ ...f, unidadInventario: e.target.value })), style: { width: '100%', padding: 9, background: 'var(--surface-2)', border: '1px solid var(--line-strong)', color: 'var(--ink)', borderRadius: 6 } }, PRODUCTO_UNIDADES_INVENTARIO.map(u => React.createElement('option', { key: u.id, value: u.id }, u.nombre)))), React.createElement('div', { style: { flex: 1, minWidth: 0 } }, React.createElement(Lbl, null, 'Contenido por unidad'), React.createElement(Inp, { type: 'number', min: '0', step: 'any', value: form.contenidoPorUnidad ?? '', onChange: e => setForm(f => ({ ...f, contenidoPorUnidad: e.target.value })), placeholder: 'Ej. 25' })), React.createElement('div', { style: { flex: 1, minWidth: 0 } }, React.createElement(Lbl, null, 'U/M contenido'), React.createElement('select', { value: form.unidadContenido || 'pieza', onChange: e => setForm(f => ({ ...f, unidadContenido: e.target.value })), style: { width: '100%', padding: 9, background: 'var(--surface-2)', border: '1px solid var(--line-strong)', color: 'var(--ink)', borderRadius: 6 } }, PRODUCTO_UNIDADES_UNIVERSALES.map(u => React.createElement('option', { key: u.id, value: u.id }, u.nombre))))), React.createElement('div', { style: { marginBottom: 10 } }, React.createElement(Lbl, null, 'Nombre de presentación'), React.createElement(Inp, { value: form.etiquetaPresentacion || '', onChange: e => setForm(f => ({ ...f, etiquetaPresentacion: e.target.value })), placeholder: 'Ej. Saco de 25 kg, bolsa de 10 kg, paquete de 12 piezas' })), form.tipoVenta === 'paquete' && React.createElement('div', { style: { marginBottom: 10 } }, React.createElement(Lbl, null, 'SKU contenido del paquete'), React.createElement('select', { value: form.productoContenidoId || '', onChange: e => setForm(f => ({ ...f, productoContenidoId: e.target.value })), style: { width: '100%', padding: 9, background: 'var(--surface-2)', border: '1px solid var(--line-strong)', color: 'var(--ink)', borderRadius: 6 } }, React.createElement('option', { value: '' }, 'Selecciona el SKU que contiene'), productos.filter(p => p.id !== form.id && p.activo !== false).map(p => React.createElement('option', { key: p.id, value: p.id }, `${p.nombre} · ${etiquetaProducto(p)}`)))), React.createElement('label', { style: { display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, marginBottom: 10, color: 'var(--ink-soft)' } }, React.createElement('input', { type: 'checkbox', checked: !!form.requiereLlenado, onChange: e => setForm(f => ({ ...f, requiereLlenado: e.target.checked })) }), 'Requiere llenado / producción'), form.requiereLlenado && React.createElement('div', { style: { marginBottom: 10 } }, React.createElement(Lbl, null, 'Envase vacío consumido'), React.createElement('select', { value: form.productoVacioId || '', onChange: e => setForm(f => ({ ...f, productoVacioId: e.target.value })), style: { width: '100%', padding: 9, background: 'var(--surface-2)', border: '1px solid var(--line-strong)', color: 'var(--ink)', borderRadius: 6 } }, React.createElement('option', { value: '' }, 'Selecciona envase vacío'), productos.filter(p => p.id !== form.id && p.tipoProducto === 'envase_vacio').map(p => React.createElement('option', { key: p.id, value: p.id }, `${p.nombre} · ${etiquetaProducto(p)}`)))), React.createElement(Row, { style: { gap: 10, marginBottom: 10, alignItems: 'flex-end' } }, React.createElement('div', { style: { flex: 1, minWidth: 0 } }, React.createElement(Lbl, null, 'Nombre del precio'), React.createElement(Inp, { value: form.precioNombre || '', onChange: e => setForm(f => ({ ...f, precioNombre: e.target.value })), placeholder: 'Ej. Público, mayoreo, distribuidor' })), React.createElement('div', { style: { flex: 1, minWidth: 0 } }, React.createElement(Lbl, null, 'U/M universal'), React.createElement('select', { value: form.unidadMedida || 'pieza', onChange: e => setForm(f => ({ ...f, unidadMedida: e.target.value })), style: { width: '100%', padding: 9, background: 'var(--surface-2)', border: '1px solid var(--line-strong)', color: 'var(--ink)', borderRadius: 6 } }, PRODUCTO_UNIDADES_UNIVERSALES.map(u => React.createElement('option', { key: u.id, value: u.id }, u.nombre)))), React.createElement('div', { style: { flex: 1, minWidth: 0 } }, React.createElement(Lbl, null, 'Tamaño / presentación'), React.createElement('select', { value: form.tamanoPresentacion || 'PZ', onChange: e => setForm(f => ({ ...f, tamanoPresentacion: e.target.value })), style: { width: '100%', padding: 9, background: 'var(--surface-2)', border: '1px solid var(--line-strong)', color: 'var(--ink)', borderRadius: 6 } }, PRODUCTO_PRESENTACIONES.map(p => React.createElement('option', { key: p.id, value: p.id }, p.nombre))))), React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-faint)', lineHeight: 1.35, marginBottom: 10 } }, 'La cantidad del medidor no vive en Productos; se configura en el medidor.'), React.createElement(Lbl, null, "Código de barras"), React.createElement(Row, {
    style: {
      gap: 8,
      marginBottom: 10
    }
  }, React.createElement(Inp, {
    value: form.codigoBarras || '',
    onChange: e => setForm(f => ({
      ...f,
      codigoBarras: e.target.value
    })),
    placeholder: "Escanea o escribe el código",
    style: {
      flex: 1
    }
  }), React.createElement(BOut, {
    onClick: () => setScanOpen(true),
    style: {
      flexShrink: 0,
      padding: '8px 12px'
    }
  }, "📷")), React.createElement(Lbl, null, "Motivo del cambio de inventario (opcional)"), React.createElement(Inp, {
    value: form.motivo || '',
    onChange: e => setForm(f => ({
      ...f,
      motivo: e.target.value
    })),
    placeholder: "Ej. compra a proveedor, merma, conteo físico…",
    style: {
      marginBottom: 6
    }
  }), React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ink-faint)',
      marginBottom: 16
    }
  }, "Se registra en el historial de inventario si cambias la cantidad de stock."), React.createElement(BFill, {
    onClick: save,
    style: {
      width: '100%'
    },
    disabled: saving
  }, saving ? 'Guardando…' : '💾 Guardar')), priceProduct && React.createElement(PrecioProductoModal, { producto: priceProduct, currentUser, onClose: () => setPriceProduct(null) }), scanOpen && React.createElement(BarcodeScanner, {
    onDetected: code => {
      setForm(f => ({
        ...f,
        codigoBarras: code
      }));
      setScanOpen(false);
    },
    onClose: () => setScanOpen(false)
  }), histOpen && React.createElement(InventarioHistorial, {
    onClose: () => setHistOpen(false)
  }));
}