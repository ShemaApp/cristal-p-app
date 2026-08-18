/*
 * Flutt-Water — gestión de códigos de barras y etiquetas.
 *
 * Los códigos internos usan Code 128 porque no requieren un prefijo GS1
 * comercial y permiten identificar productos propios. Los códigos de
 * proveedores también pueden conservarse como texto y escanearse.
 */

function normalizarCodigoBarras(valor) {
  const codigo = String(valor == null ? '' : valor)
    .trim()
    .replace(/\s+/g, '');
  if (!codigo) return '';
  if (codigo.length > 80 || !/^[\x20-\x7E]+$/.test(codigo)) {
    throw new Error('El código de barras debe contener entre 1 y 80 caracteres ASCII.');
  }
  return codigo;
}

function codigoBarrasDeProducto(producto) {
  if (!producto) return '';
  return normalizarCodigoBarras(producto.codigoBarrasNormalizado || producto.codigoBarras || '');
}

function codigoInternoParaProducto(producto) {
  if (!producto || !producto.id) throw new Error('El producto todavía no tiene un ID.');
  return 'FLW-PROD-' + String(producto.id).toUpperCase();
}

function errorCodigoDuplicado(codigo, nombre) {
  const err = new Error('El código de barras ya está enlazado al producto "' + (nombre || 'otro producto') + '".');
  err.code = 'barcode-already-assigned';
  err.barcode = codigo;
  return err;
}

/* Actualiza un producto y su índice único en una misma transacción. */
async function guardarProductoConIndiceCodigo(productoId, item, codigoAnterior) {
  const nuevoCodigo = normalizarCodigoBarras(item.codigoBarras || '');
  const anterior = normalizarCodigoBarras(codigoAnterior || '');
  const productoRef = db.collection('productos').doc(productoId);
  const nuevoIndiceRef = nuevoCodigo ? db.collection('barcodes').doc(nuevoCodigo) : null;
  const anteriorIndiceRef = anterior && anterior !== nuevoCodigo ? db.collection('barcodes').doc(anterior) : null;

  await db.runTransaction(async tx => {
    const productoSnap = await tx.get(productoRef);
    if (!productoSnap.exists) throw new Error('El producto ya no existe.');
    const nuevoIndiceSnap = nuevoIndiceRef ? await tx.get(nuevoIndiceRef) : null;

    if (nuevoIndiceSnap && nuevoIndiceSnap.exists) {
      const reservadoPor = nuevoIndiceSnap.data() || {};
      if (reservadoPor.productoId !== productoId) {
        throw errorCodigoDuplicado(nuevoCodigo, reservadoPor.productoNombre);
      }
    }

    const productoActual = productoSnap.data() || {};
    const payload = {
      ...item,
      codigoBarras: nuevoCodigo,
      codigoBarrasNormalizado: nuevoCodigo,
      codigoBarrasTipo: nuevoCodigo ? (nuevoCodigo.indexOf('FLW-PROD-') === 0 ? 'interno_code128' : 'externo') : ''
    };
    tx.update(productoRef, payload);

    if (nuevoIndiceRef) {
      tx.set(nuevoIndiceRef, {
        productoId,
        productoNombre: payload.nombre || productoActual.nombre || '',
        codigo: nuevoCodigo,
        tipo: payload.codigoBarrasTipo,
        activo: true,
        actualizadoPorUid: auth.currentUser?.uid || '',
        actualizadoPorNombre: auth.currentUser?.displayName || auth.currentUser?.email || '',
        actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
    if (anteriorIndiceRef) tx.delete(anteriorIndiceRef);
  });
}

/* Crea un producto y, si tiene código, reserva el índice en la misma transacción. */
async function crearProductoConIndiceCodigo(item) {
  const codigo = normalizarCodigoBarras(item.codigoBarras || '');
  const productoRef = db.collection('productos').doc();
  const indiceRef = codigo ? db.collection('barcodes').doc(codigo) : null;

  await db.runTransaction(async tx => {
    const indiceSnap = indiceRef ? await tx.get(indiceRef) : null;
    if (indiceSnap && indiceSnap.exists) {
      const reservadoPor = indiceSnap.data() || {};
      throw errorCodigoDuplicado(codigo, reservadoPor.productoNombre);
    }
    const payload = {
      ...item,
      codigoBarras: codigo,
      codigoBarrasNormalizado: codigo,
      codigoBarrasTipo: codigo ? (codigo.indexOf('FLW-PROD-') === 0 ? 'interno_code128' : 'externo') : ''
    };
    tx.set(productoRef, payload);
    if (indiceRef) {
      tx.set(indiceRef, {
        productoId: productoRef.id,
        productoNombre: payload.nombre || '',
        codigo,
        tipo: payload.codigoBarrasTipo,
        activo: true,
        actualizadoPorUid: auth.currentUser?.uid || '',
        actualizadoPorNombre: auth.currentUser?.displayName || auth.currentUser?.email || '',
        actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
  });
  return productoRef;
}

function escaparHtmlBarcode(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

function crearSvgCodigoBarras(codigo, ancho = 2, alto = 58) {
  if (typeof JsBarcode === 'undefined') throw new Error('La librería de códigos de barras todavía no está disponible.');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  JsBarcode(svg, codigo, {
    format: 'CODE128',
    lineColor: '#10263F',
    background: '#FFFFFF',
    width: ancho,
    height: alto,
    displayValue: true,
    font: 'IBM Plex Mono',
    fontSize: 12,
    margin: 8,
    textMargin: 3
  });
  return svg.outerHTML;
}

function imprimirEtiquetasCodigoBarras(producto, codigo, cantidad, branding) {
  const marca = escaparHtmlBarcode(normalizarBranding(branding).nombreComercial);
  const total = Math.max(1, Math.min(100, Math.floor(Number(cantidad) || 1)));
  const svg = crearSvgCodigoBarras(codigo, 1.65, 54);
  const nombre = escaparHtmlBarcode(producto.nombre || 'Producto');
  const unidad = escaparHtmlBarcode(PRODUCTO_UNIDADES_INVENTARIO.find(u => u.id === (producto.unidadInventario || 'pieza'))?.nombre || unidadProductoNombre(producto.unidadMedida || producto.unidad || 'pieza'));
  const presentacion = escaparHtmlBarcode(etiquetaProducto(producto));
  const precio = precioProducto(producto);
  const precioTexto = Number.isFinite(precio) ? '$' + precio.toFixed(2) : '';
  const codigoHtml = escaparHtmlBarcode(codigo);
  const etiquetas = Array.from({ length: total }, () => '<section class="label"><div class="brand">' + marca + '</div><div class="name">' + nombre + '</div><div class="meta">' + escaparHtmlBarcode(precioTexto) + (precioTexto && unidad ? ' · ' : '') + presentacion + ' · ' + unidad + '</div>' + svg + '<div class="code">' + codigoHtml + '</div></section>').join('');
  const ventana = window.open('', '_blank');
  if (!ventana) throw new Error('Habilita las ventanas emergentes para imprimir las etiquetas.');
  ventana.document.write('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Etiquetas — ' + nombre + '</title><style>' +
    '*{box-sizing:border-box}body{font-family:Arial,sans-serif;margin:0;padding:12mm;background:#fff;color:#10263F}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:5mm}.label{border:1px solid #B9C9DA;min-height:34mm;padding:3mm;text-align:center;page-break-inside:avoid;display:flex;flex-direction:column;align-items:center;justify-content:center}.brand{font-size:7pt;color:#1F5E8C;font-weight:700;text-transform:uppercase;letter-spacing:.4px;max-width:100%;overflow-wrap:anywhere;margin-bottom:1mm}.name{font-weight:700;font-size:10pt;line-height:1.12;max-width:100%;overflow-wrap:anywhere}.meta{font-size:8pt;color:#52627A;margin:1.5mm 0}.label svg{display:block;max-width:100%;height:auto}.code{font-family:monospace;font-size:7pt;color:#52627A;margin-top:1mm}@page{margin:8mm}@media print{body{padding:0}.label{border-color:#888}}' +
    '</style></head><body><main class="grid">' + etiquetas + '</main><script>window.onload=function(){window.print();}</script></body></html>');
  ventana.document.close();
}

function BarcodePreview({ producto, codigo, branding }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !codigo || typeof JsBarcode === 'undefined') return;
    try {
      ref.current.innerHTML = '';
      JsBarcode(ref.current, codigo, {
        format: 'CODE128',
        lineColor: '#10263F',
        background: '#FFFFFF',
        width: 2,
        height: 70,
        displayValue: true,
        font: 'IBM Plex Mono',
        fontSize: 13,
        margin: 10,
        textMargin: 4
      });
    } catch (e) {
      ref.current.textContent = 'No se pudo dibujar este código.';
    }
  }, [codigo]);
  return React.createElement('div', {
    style: {
      background: '#fff',
      border: '1px solid var(--line-strong)',
      padding: 14,
      textAlign: 'center',
      marginBottom: 12
    }
  }, React.createElement('div', {
    style: { fontWeight: 700, fontSize: 14, color: 'var(--ink)', marginBottom: 4 }
  }, producto?.nombre || 'Producto'), React.createElement('div', {
    style: { fontSize: 11, color: 'var(--ink-soft)', marginBottom: 10 }
  }, etiquetaProducto(producto) + ' · ' + (PRODUCTO_UNIDADES_INVENTARIO.find(u => u.id === (producto?.unidadInventario || 'pieza'))?.nombre || unidadProductoNombre(producto?.unidadMedida || producto?.unidad || 'pieza')) + ' · $' + precioProducto(producto).toFixed(2)), React.createElement('svg', {
    ref,
    role: 'img',
    'aria-label': 'Código de barras ' + codigo,
    style: { maxWidth: '100%', height: 'auto' }
  }));
}

function CodigosBarras({ productos, currentUser, branding }) {
  const marca = normalizarBranding(branding);
  const puedeGestionar = currentUser?.role === 'admin' || !!permisoEdita(currentUser).productos;
  const [q, setQ] = useState('');
  const [soloSinCodigo, setSoloSinCodigo] = useState(false);
  const [productoActivo, setProductoActivo] = useState(null);
  const [cantidad, setCantidad] = useState('1');
  const [guardando, setGuardando] = useState('');
  const [error, setError] = useState('');

  const list = productos.filter(p => {
    const codigo = codigoBarrasDeProducto(p);
    const texto = ((p.nombre || '') + ' ' + codigo).toLowerCase();
    return texto.includes(q.toLowerCase()) && (!soloSinCodigo || !codigo);
  });

  const generar = async producto => {
    if (!puedeGestionar) return;
    const actual = codigoBarrasDeProducto(producto);
    if (actual) {
      setProductoActivo(producto);
      return;
    }
    setGuardando(producto.id);
    setError('');
    try {
      const codigo = codigoInternoParaProducto(producto);
      await guardarProductoConIndiceCodigo(producto.id, {
        nombre: producto.nombre,
        precio: precioProducto(producto),
        stock: Number(producto.stock) || 0,
        productoBaseId: producto.productoBaseId || '',
        tipoVenta: producto.tipoVenta || 'pieza',
        unidadInventario: producto.unidadInventario || 'pieza',
        contenidoPorUnidad: producto.contenidoPorUnidad ?? null,
        unidadContenido: producto.unidadContenido || producto.unidadMedida || producto.unidad || 'pieza',
        etiquetaPresentacion: etiquetaProducto(producto),
        precioActivoId: precioActivoProducto(producto).id,
        unidadMedida: producto.unidadMedida || producto.unidad || 'pieza',
        tamanoPresentacion: producto.tamanoPresentacion || 'PZ',
        unidad: producto.unidadMedida || producto.unidad || 'pieza',
        codigoBarras: codigo
      }, '');
      setProductoActivo({ ...producto, codigoBarras: codigo, codigoBarrasNormalizado: codigo, codigoBarrasTipo: 'interno_code128' });
    } catch (e) {
      setError(e.code === 'barcode-already-assigned' ? e.message : 'No se pudo generar el código: ' + e.message);
    }
    setGuardando('');
  };

  const imprimir = producto => {
    try {
      const codigo = codigoBarrasDeProducto(producto);
      if (!codigo) throw new Error('Primero genera o asigna un código al producto.');
      imprimirEtiquetasCodigoBarras(producto, codigo, cantidad, marca);
    } catch (e) {
      setError(e.message);
    }
  };

  return React.createElement('div', { style: { padding: '16px 12px' } },
    React.createElement(Row, { style: { justifyContent: 'space-between', marginBottom: 8 } },
      React.createElement('div', { style: { fontSize: 20, fontWeight: 800 } }, '🏷️ Etiquetas'),
      React.createElement(Tag, { color: puedeGestionar ? 'var(--ok-text)' : 'var(--info-text)' }, puedeGestionar ? 'Gestión autorizada' : 'Solo lectura')
    ),
    React.createElement('div', { style: { fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.5, marginBottom: 12 } }, 'Genera códigos Code 128 internos enlazados a Productos o imprime etiquetas de códigos externos. El código identifica la presentación; el medidor continúa controlando los litros.'),
    error && React.createElement('div', { style: { background: 'var(--danger-bg)', color: 'var(--danger-text)', padding: '9px 11px', fontSize: 12, marginBottom: 10, borderRadius: 6 } }, error),
    React.createElement(Row, { style: { gap: 8, marginBottom: 8 } },
      React.createElement(Inp, { value: q, onChange: e => setQ(e.target.value), placeholder: '🔍 Buscar producto o código', style: { flex: 1 } }),
      React.createElement('button', { onClick: () => setSoloSinCodigo(v => !v), style: { border: '1px solid var(--line-strong)', background: soloSinCodigo ? 'var(--info-bg)' : 'var(--surface)', color: soloSinCodigo ? 'var(--info-text)' : 'var(--ink-soft)', borderRadius: 6, padding: '0 10px', minHeight: 38, cursor: 'pointer', fontSize: 12 } }, soloSinCodigo ? 'Todos' : 'Sin código')
    ),
    React.createElement(Row, { style: { gap: 8, marginBottom: 12, alignItems: 'center' } },
      React.createElement(Lbl, { style: { margin: 0 } }, 'Etiquetas por impresión'),
      React.createElement(Inp, { type: 'number', min: 1, max: 100, value: cantidad, onChange: e => setCantidad(e.target.value), placeholder: '1', style: { width: 80, margin: 0 } }),
      React.createElement('span', { style: { fontSize: 11, color: 'var(--ink-faint)' } }, 'máximo 100')
    ),
    React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-faint)', marginBottom: 8 } }, list.length + ' producto' + (list.length === 1 ? '' : 's') + ' mostrado' + (list.length === 1 ? '' : 's')), 
    list.map(p => {
      const codigo = codigoBarrasDeProducto(p);
      const interno = p.codigoBarrasTipo === 'interno_code128' || codigo.indexOf('FLW-PROD-') === 0;
      return React.createElement(Card, { key: p.id, style: { padding: 12, marginBottom: 8 } },
        React.createElement(Row, { style: { justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' } },
          React.createElement('div', { style: { minWidth: 0, flex: 1 } },
            React.createElement('div', { style: { fontWeight: 700, fontSize: 14, overflowWrap: 'anywhere' } }, p.nombre),
            React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-soft)', marginTop: 3 } }, etiquetaProducto(p) + ' · ' + (PRODUCTO_UNIDADES_INVENTARIO.find(u => u.id === (p.unidadInventario || 'pieza'))?.nombre || unidadProductoNombre(p.unidadMedida || p.unidad || 'pieza')) + ' · $' + precioProducto(p).toFixed(2)),
            React.createElement('div', { style: { fontFamily: 'var(--font-mono)', fontSize: 10, color: codigo ? 'var(--accent-text)' : 'var(--warn-text)', marginTop: 5, overflowWrap: 'anywhere' } }, codigo ? '🏷️ ' + codigo + (interno ? ' · interno' : ' · externo') : 'Sin código enlazado')
          ),
          codigo ? React.createElement(Tag, { color: 'var(--ok-text)' }, 'Listo') : React.createElement(Tag, { color: 'var(--warn-text)' }, 'Pendiente')
        ),
        React.createElement(Row, { style: { gap: 8, marginTop: 10 } },
          !codigo && puedeGestionar && React.createElement(BFill, { disabled: guardando === p.id, onClick: () => generar(p), style: { flex: 1 } }, guardando === p.id ? 'Generando…' : '⚙️ Generar código'),
          codigo && React.createElement(BOut, { onClick: () => { setProductoActivo(p); setError(''); }, style: { flex: 1 } }, '👁️ Vista previa'),
          codigo && React.createElement(BFill, { onClick: () => imprimir(p), style: { flex: 1 } }, '🖨️ Imprimir')
        )
      );
    }),
    list.length === 0 && React.createElement('div', { style: { textAlign: 'center', color: 'var(--ink-faint)', padding: '28px 12px', fontSize: 13 } }, 'No hay productos que coincidan con el filtro.'),
    productoActivo && React.createElement(Modal, { title: '🏷️ Código enlazado al producto', onClose: () => setProductoActivo(null) },
      React.createElement(BarcodePreview, { producto: productoActivo, codigo: codigoBarrasDeProducto(productoActivo), branding: marca }),
      React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-soft)', lineHeight: 1.45, marginBottom: 12 } }, 'Este código se guarda como cadena de texto y queda reservado en Firestore para este producto. No se regenera automáticamente para no invalidar etiquetas ya impresas.'),
      React.createElement(Row, { style: { gap: 8, justifyContent: 'flex-end' } },
        React.createElement(BOut, { onClick: () => setProductoActivo(null) }, 'Cerrar'),
        React.createElement(BFill, { onClick: () => imprimir(productoActivo) }, '🖨️ Imprimir ' + Math.max(1, Math.min(100, Math.floor(Number(cantidad) || 1))))
      )
    )
  );
}
