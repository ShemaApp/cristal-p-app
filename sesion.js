/* sesion.js — capa de servicios.
   Todo lo que antes vivía repartido entre app-core.js (modelo de permisos) y
   app.js (auth, perfil, sembrado inicial, suscripciones a Firestore) se
   concentra aquí. app.js queda como un shell de navegación: llama a
   useSesion() para saber quién es el usuario y qué datos hay, y solo se
   encarga de pintar pestañas.
   Carga DESPUÉS de app-core.js (usa uid(), useState/useEffect ya globales)
   y ANTES de app.js (que consume useSesion()) y de permisos.js (que
   consume TABS_INFO/EDICION_INFO/ACCIONES_INFO). */

/* ── Modelo de permisos: constantes de rol + helpers de acceso ──
   (movido de app-core.js, sin cambios de lógica) */
const TABS_INFO = [['productos', 'box', 'Productos'], ['barcodes', 'tag', 'Etiquetas'], ['nota', 'note', 'Pedidos'], ['clientes', 'users', 'Clientes'], ['creditos', 'credit', 'Créditos'], ['ruta', 'compass', 'Jornada'], ['vehiculos', 'truck', 'Vehículos'], ['repartidores', 'route', 'Distribución'], ['inventario', 'inventory', 'Inventario'], ['reportes', 'chart', 'Reportes'], ['gerencia', 'cash', 'Gerencia']];
const EDICION_INFO = [['productos', 'box', 'Editar / dar de alta productos'], ['clientes', 'users', 'Editar / dar de alta clientes'], ['creditos', 'credit', 'Registrar abonos a créditos']];
const ACCIONES_INFO = [['camara', 'qr', 'Usar cámara (identificación QR de cliente)'], ['csv', 'note', 'Descargar reportes en CSV'], ['password', 'lock', 'Cambiar su propia contraseña']];
const ACCIONES_DEFAULT_ROL = {
  admin: {
    camara: true,
    csv: true,
    password: true
  },
  vendedor: {
    camara: false,
    csv: false,
    password: true
  },
  repartidor: {
    camara: true,
    csv: false,
    password: true
  }
};

// Compatibilidad temporal: perfiles antiguos con role="usuario" se comportan
// como vendedor, sin volver a exponer módulos administrativos.
const rolEfectivo = u => u?.role === 'usuario' ? 'vendedor' : (u?.role || 'vendedor');
const CONTRATO_OPERATIVO = {
  admin: {
    unidadTipo: 'global', puedeOperarMedidor: true, puedeUsarCaja: true,
    puedeCobrarAbonos: true, puedeUsarRutas: true, puedeUsarTransferencias: true,
    puedeVerReportes: true
  },
  vendedor: {
    unidadTipo: 'planta', puedeOperarMedidor: true, puedeUsarCaja: true,
    puedeCobrarAbonos: true, puedeUsarRutas: false, puedeUsarTransferencias: false,
    puedeVerReportes: false
  },
  repartidor: {
    unidadTipo: 'vehiculo', puedeOperarMedidor: true, puedeUsarCaja: true,
    puedeCobrarAbonos: true, puedeUsarRutas: false, puedeUsarTransferencias: false,
    puedeVerReportes: false
  }
};
const contratoOperativo = u => CONTRATO_OPERATIVO[rolEfectivo(u)] || null;
const permisoAcciones = u => {
  const rol = rolEfectivo(u);
  if (rol === 'admin') return { ...ACCIONES_DEFAULT_ROL.admin };
  const acciones = {
    ...(ACCIONES_DEFAULT_ROL[rol] || ACCIONES_DEFAULT_ROL.vendedor),
    ...(u?.permisos?.acciones || {})
  };
  // CSV solo queda para admin; QR/cámara solo para repartidor.
  acciones.csv = false;
  acciones.camara = rol === 'repartidor';
  return acciones;
};
const TABS_DEFAULT_ROL = {
  admin: {
    productos: true,
    barcodes: true,
    nota: true,
    clientes: true,
    creditos: true,
    ruta: true,
    vehiculos: true,
    repartidores: true,
    inventario: true,
    reportes: true,
    gerencia: true
  },
  vendedor: {
    // El vendedor usa productos e inventario dentro de Venta en planta,
    // pero no necesita sus pantallas administrativas.
    productos: false,
    barcodes: false,
    nota: true,
    llenados: true,
    clientes: true,
    creditos: true,
    ruta: false,
    vehiculos: false,
    repartidores: false,
    inventario: false,
    reportes: false,
    gerencia: true
  },
  repartidor: {
    productos: false,
    barcodes: false,
    nota: true,
    clientes: true,
    creditos: true,
    ruta: false,
    vehiculos: true,
    repartidores: false,
    inventario: false,
    reportes: false,
    gerencia: true
  }
};
const EDITA_DEFAULT_ROL = {
  admin: {
    productos: true,
    clientes: true,
    creditos: true
  },
  vendedor: {
    productos: false,
    clientes: false,
    creditos: true
  },
  repartidor: {
    productos: false,
    clientes: false,
    creditos: true
  }
};
const permisoTabs = u => {
  const rol = rolEfectivo(u);
  if (rol === 'admin') return { ...TABS_DEFAULT_ROL.admin };
  const tabs = {
    ...(TABS_DEFAULT_ROL[rol] || TABS_DEFAULT_ROL.vendedor),
    ...(u?.permisos?.tabs || {})
  };
  // La matriz de diagnóstico no permite reactivar pantallas administrativas
  // mediante overrides antiguos. Las funciones de venta se embeben en el flujo.
  if (rol === 'vendedor') {
    tabs.productos = false;
    tabs.barcodes = false;
    tabs.ruta = false;
    tabs.vehiculos = false;
    tabs.repartidores = false;
    tabs.inventario = false;
    tabs.reportes = false;
    tabs.nota = true;
    tabs.llenados = true;
    tabs.clientes = true;
    tabs.creditos = true;
    tabs.gerencia = true;
  }
  if (rol === 'repartidor') {
    tabs.productos = false;
    tabs.barcodes = false;
    tabs.repartidores = false;
    tabs.inventario = false;
    tabs.reportes = false;
    tabs.nota = true;
    tabs.llenados = false;
    tabs.clientes = true;
    tabs.creditos = true;
    tabs.ruta = false;
    tabs.vehiculos = true;
    tabs.repartidores = false;
    tabs.gerencia = true;
  }
  return tabs;
};
const permisoEdita = u => {
  const rol = rolEfectivo(u);
  if (rol === 'admin') return { ...EDITA_DEFAULT_ROL.admin };
  const edita = {
    ...(EDITA_DEFAULT_ROL[rol] || EDITA_DEFAULT_ROL.vendedor),
    ...(u?.permisos?.edita || {})
  };
  // Durante esta limpieza los roles operativos no reciben edición de datos
  // maestros; sus altas y abonos se ejecutan en flujos específicos.
  edita.productos = false;
  edita.clientes = false;
  edita.creditos = true;
  return edita;
};

/* ── Utilidades de sesión local (candado por PIN) ──
   (movido de app-core.js, sin cambios de lógica) */
const pinKey = uid_ => 'pdc_pin_' + uid_;
const hashPin = async (pin, salt) => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin + ':' + salt));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
};
const savePin = async (uid_, pin) => {
  const salt = uid() + uid();
  const hash = await hashPin(pin, salt);
  localStorage.setItem(pinKey(uid_), JSON.stringify({
    hash,
    salt,
    len: pin.length
  }));
};
const clearPin = uid_ => localStorage.removeItem(pinKey(uid_));

/* ── Datos semilla (solo la primera vez que Firestore está vacío) ──
   (movido de app-core.js, sin cambios de lógica) */
/* ── useSesion(): auth, perfil, sembrado inicial, suscripciones ──
   (movido de app.js, sin cambios de lógica — mismos efectos, mismo orden,
   mismas dependencias, solo ahora detrás de un hook en vez de inline en App) */
function useSesion() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [firestoreError, setFirestoreError] = useState(null);
  const [profilePending, setProfilePending] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [locked, setLocked] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [notas, setNotas] = useState([]);
  const [creditos, setCreditos] = useState([]);
  const [rutas, setRutas] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [pendCounts, setPendCounts] = useState({
    productos: 0,
    clientes: 0,
    notas: 0,
    creditos: 0,
    rutas: 0,
    pedidos: 0
  });
  const totalPendientes = Object.values(pendCounts).reduce((s, n) => s + n, 0);
  const notificacionesTransferencias = (() => {
    if (!currentUser) return [];
    const avisos = [];
    const fechaAviso = valor => valor || new Date().toISOString();
    if (currentUser.role === 'admin') {
      (rutas || []).filter(r => r.estado === 'pendiente_recepcion').forEach(r => avisos.push({
        id: 'recepcion-' + r.id,
        tipo: 'recepcion',
        titulo: 'Transferencia pendiente de recepción',
        detalle: `${r.repartidorNombre || 'Repartidor'} tiene mercancía pendiente de conciliar`,
        fecha: fechaAviso(r.fechaRegresoReal || r.fecha),
        rutaId: r.id
      }));
      (pedidos || []).filter(p => p.estado === 'asignado_pendiente_transferencia').forEach(p => avisos.push({
        id: 'carga-pedido-' + p.id,
        tipo: 'carga',
        titulo: 'Pedido esperando confirmación de transferencia',
        detalle: `${p.clienteNombre || 'Cliente'} · ${p.repartidorNombre || 'sin repartidor'}`,
        fecha: fechaAviso(p.fechaActualizacion || p.fechaCreacion),
        rutaId: null
      }));
    }
    if (currentUser.role === 'repartidor') {
      (pedidos || []).filter(p => p.estado === 'transferencia_confirmada' && p.repartidorId === currentUser.uid).forEach(p => avisos.push({
        id: 'entrega-pedido-' + p.id,
        tipo: 'entrega',
        titulo: 'Pedido pendiente de entrega',
        detalle: `${p.clienteNombre || 'Cliente'} · transferencia confirmada`,
        fecha: fechaAviso(p.fechaConfirmacionTransferencia || p.fechaActualizacion),
        rutaId: p.transferenciaId || null
      }));
    }
    return avisos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  })();

  useEffect(() => {
    const on = () => setIsOnline(true),
      off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => {
    setLocked(currentUser ? !!localStorage.getItem(pinKey(currentUser.uid)) : false);
  }, [currentUser?.uid]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async fbUser => {
      if (!fbUser) {
        setCurrentUser(null);
        setProfilePending(false);
        setPendingEmail('');
        setAuthChecked(true);
        return;
      }

      const cacheKey = `perfil_sesion_v1_${fbUser.uid}`;
      let perfilCache = null;
      try {
        perfilCache = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      } catch (e) {
        localStorage.removeItem(cacheKey);
      }

      // La pantalla no queda detenida por la lectura remota cuando ya existe
      // una sesión conocida. Firestore sigue refrescando el perfil en segundo
      // plano y prevalece sobre la copia local en cuanto responde.
      if (perfilCache && perfilCache.email === fbUser.email && perfilCache.role) {
        setCurrentUser({ uid: fbUser.uid, ...perfilCache });
        setAuthChecked(true);
      }

      try {
        const ref = db.collection('usuarios').doc(fbUser.uid);
        const snap = await ref.get();
        let perfil;
        if (!snap.exists) {
          localStorage.removeItem(cacheKey);
          setCurrentUser(null);
          setProfilePending(true);
          setPendingEmail(fbUser.email || '');
          setFirestoreError('La cuenta existe en Firebase Authentication, pero aún no tiene perfil operativo en Firestore. Un administrador debe crear usuarios/' + fbUser.uid + ' desde un flujo autorizado.');
          return;
        }
        perfil = snap.data();
        if (!perfil || perfil.active === false || !perfil.role || !perfil.nombre) {
          localStorage.removeItem(cacheKey);
          setCurrentUser(null);
          setProfilePending(true);
          setPendingEmail(fbUser.email || '');
          setFirestoreError('El perfil operativo está incompleto o inactivo. Solicita al administrador que lo configure en Firestore.');
          return;
        }
        setProfilePending(false);
        setPendingEmail('');
        setFirestoreError(null);
        localStorage.setItem(cacheKey, JSON.stringify(perfil));
        setCurrentUser({ uid: fbUser.uid, ...perfil });
      } catch (e) {
        console.error('No se pudo verificar el perfil operativo:', e);
        if (!perfilCache) {
          setCurrentUser(null);
          setProfilePending(false);
          setPendingEmail('');
          setFirestoreError('No se pudo verificar tu perfil operativo. Intenta nuevamente cuando haya conexión.');
        }
      } finally {
        setAuthChecked(true);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!currentUser) return;
  const errorHandler = err => {
      console.error('Firestore error:', err);
      setFirestoreError('Error de conexión con la base de datos. Revisa tus permisos.');
  };
  const pend = (col, snap) => setPendCounts(p => ({
      ...p,
      [col]: snap.docs.filter(d => d.metadata.hasPendingWrites).length
    }));
    const rol = rolEfectivo(currentUser);
    const esAdmin = rol === 'admin';
    const esVendedor = rol === 'vendedor';
    const esRepartidor = rol === 'repartidor';
    const rutasQuery = esRepartidor
      ? db.collection('rutas').where('repartidorId', '==', currentUser.uid)
      : esAdmin
        ? db.collection('rutas').orderBy('fecha', 'desc').limit(100)
        : null;
    const pedidosQuery = esRepartidor
      ? db.collection('pedidos').where('repartidorId', '==', currentUser.uid)
      : esAdmin
        ? db.collection('pedidos').orderBy('fechaCreacion', 'desc').limit(500)
        : null;
    // El catálogo de clientes es general. La prioridad de cartera se resuelve
    // en Clientes mediante repartidorIds/rutaIds, pero nunca bloquea la venta.
    const clientesQueries = (esAdmin || esVendedor || esRepartidor)
      ? [db.collection('clientes')]
      : [];
    const notasQuery = esRepartidor
      ? db.collection('notas').where('capturadoPorUid', '==', currentUser.uid).orderBy('fecha', 'desc').limit(500)
      : esAdmin
        ? db.collection('notas').orderBy('fecha', 'desc').limit(500)
        : esVendedor
          ? db.collection('notas').where('capturadoPorUid', '==', currentUser.uid).orderBy('fecha', 'desc').limit(500)
          : null;
    // Administración y vendedor pueden conciliar/cobrar cualquier crédito
    // del catálogo general; el repartidor conserva únicamente los suyos.
    const creditosQueries = (esAdmin || esVendedor)
      ? [db.collection('creditos')]
      : [
        db.collection('creditos').where('cobradorUids', 'array-contains', currentUser.uid).limit(200),
        db.collection('creditos').where('capturadoPorUid', '==', currentUser.uid).limit(200)
      ];
    const suscribir = (query, onNext) => {
      if (!query) {
        onNext({ docs: [] });
        return () => {};
      }
      return query.onSnapshot({ includeMetadataChanges: true }, onNext, errorHandler);
    };
    const suscribirMultiples = (queries, onNext) => {
      const docsPorConsulta = new Map();
      const unsubs = queries.map((query, index) => query.onSnapshot({ includeMetadataChanges: true }, snap => {
        docsPorConsulta.set(index, snap.docs);
        const unicos = new Map();
        docsPorConsulta.forEach(docs => docs.forEach(doc => unicos.set(doc.id, doc)));
        onNext({ docs: Array.from(unicos.values()) });
      }, errorHandler));
      return () => unsubs.forEach(unsub => unsub());
    };
    const unsubs = [
      db.collection('productos').onSnapshot({ includeMetadataChanges: true }, snap => {
        setProductos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        pend('productos', snap);
      }, errorHandler),
      suscribirMultiples(clientesQueries, snap => {
        setClientes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        pend('clientes', snap);
      }),
      suscribir(notasQuery, snap => {
        setNotas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        pend('notas', snap);
      }),
      suscribirMultiples(creditosQueries, snap => {
        setCreditos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        pend('creditos', snap);
      }),
      suscribir(pedidosQuery, snap => {
        const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        lista.sort((a, b) => new Date(b.fechaCreacion || 0) - new Date(a.fechaCreacion || 0));
        setPedidos(lista);
        pend('pedidos', snap);
      }),
      suscribir(rutasQuery, snap => {
        const transferencias = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        transferencias.sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
        setRutas(transferencias.slice(0, 100));
        pend('rutas', snap);
      })
    ];
    return () => unsubs.forEach(u => u());
  }, [currentUser]);

  return {
    currentUser, contratoOperativo: contratoOperativo(currentUser), authChecked, firestoreError, profilePending, pendingEmail,
    locked, setLocked,
    isOnline,
    productos, clientes, notas, creditos, rutas, pedidos,
    pendCounts, totalPendientes, notificacionesTransferencias,
  };
}
