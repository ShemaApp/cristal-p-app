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
const unidadProductoNombre = id => PRODUCTO_UNIDADES_UNIVERSALES.find(x => x.id === id)?.nombre || id || 'Pieza (pz)';
const presentacionProductoNombre = id => PRODUCTO_PRESENTACIONES.find(x => x.id === id)?.nombre || id || 'PZ · pieza';
window.PRODUCTO_UNIDADES_UNIVERSALES = PRODUCTO_UNIDADES_UNIVERSALES;
window.PRODUCTO_PRESENTACIONES = PRODUCTO_PRESENTACIONES;
window.unidadProductoNombre = unidadProductoNombre;
window.presentacionProductoNombre = presentacionProductoNombre;

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
  }, h.productoNombre), React.createElement(Tag, {
    color: h.diferencia >= 0 ? 'var(--ok-text)' : 'var(--danger-text)'
  }, h.diferencia >= 0 ? '+' : '', h.diferencia)), React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--ink-soft)'
    }
  }, h.stockAnterior, " → ", h.stockNuevo, " unidades"), React.createElement("div", {
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
  useEffect(() => {
    if (abrirForm) {
      setForm({
        nombre: '',
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
    const item = {
      nombre: form.nombre,
      precio: +form.precio,
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
        const anterior = productos.find(p => p.id === form.id);
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
    }, fmt(p.precio)), React.createElement("button", {
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
    }, p.stock, " ", presentacionProductoNombre(p.tamanoPresentacion || 'PZ'), " · ", unidadProductoNombre(p.unidadMedida || p.unidad))), p.codigoBarras && React.createElement("div", {
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
          precio: String(p.precio),
          stock: String(p.stock),
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
    }, "✏️ Editar"),         React.createElement(BOut, {
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
  }))), React.createElement(Row, { style: { gap: 10, marginBottom: 10, alignItems: 'flex-end' } }, React.createElement('div', { style: { flex: 1, minWidth: 0 } }, React.createElement(Lbl, null, 'U/M universal'), React.createElement('select', { value: form.unidadMedida || 'pieza', onChange: e => setForm(f => ({ ...f, unidadMedida: e.target.value })), style: { width: '100%', padding: 9, background: 'var(--surface-2)', border: '1px solid var(--line-strong)', color: 'var(--ink)', borderRadius: 6 } }, PRODUCTO_UNIDADES_UNIVERSALES.map(u => React.createElement('option', { key: u.id, value: u.id }, u.nombre)))), React.createElement('div', { style: { flex: 1, minWidth: 0 } }, React.createElement(Lbl, null, 'Tamaño / presentación'), React.createElement('select', { value: form.tamanoPresentacion || 'PZ', onChange: e => setForm(f => ({ ...f, tamanoPresentacion: e.target.value })), style: { width: '100%', padding: 9, background: 'var(--surface-2)', border: '1px solid var(--line-strong)', color: 'var(--ink)', borderRadius: 6 } }, PRODUCTO_PRESENTACIONES.map(p => React.createElement('option', { key: p.id, value: p.id }, p.nombre))))), React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-faint)', lineHeight: 1.35, marginBottom: 10 } }, 'La cantidad del medidor no vive en Productos; se configura en el medidor.'), React.createElement(Lbl, null, "Código de barras"), React.createElement(Row, {
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
  }, saving ? 'Guardando…' : '💾 Guardar')), scanOpen && React.createElement(BarcodeScanner, {
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