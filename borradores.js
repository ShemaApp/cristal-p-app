/* ── Borradores locales de formularios ─────────────────────────────────────
   Solo guarda datos de trabajo no confirmados. No almacenar contraseñas, PIN,
   tokens ni secretos en este mecanismo. Firestore sigue siendo la fuente final.
*/
const BORRADOR_VERSION = 1;
const BORRADOR_PREFIX = 'flutt-water:draft:';

const borradorClave = (formulario, uid = 'anonimo') => {
  const proyecto = String(window.location.hostname || 'local').replace(/[^a-z0-9.-]/gi, '_');
  const usuario = String(uid || 'anonimo').replace(/[^a-z0-9._-]/gi, '_');
  const nombre = String(formulario || 'formulario').replace(/[^a-z0-9._:-]/gi, '_');
  return `${BORRADOR_PREFIX}${proyecto}:${usuario}:${nombre}`;
};

const clonarBorrador = valor => {
  try {
    return valor === undefined ? undefined : JSON.parse(JSON.stringify(valor));
  } catch (e) {
    return undefined;
  }
};

const borradorVacio = valor => {
  if (valor === null || valor === undefined || valor === '') return true;
  if (Array.isArray(valor)) return valor.length === 0;
  if (typeof valor === 'object') return Object.values(valor).every(v => borradorVacio(v));
  return false;
};

const valoresIgualesBorrador = (a, b) => {
  try { return JSON.stringify(a) === JSON.stringify(b); } catch (e) { return false; }
};

function leerBorradorLocal(formulario, uid) {
  try {
    const raw = localStorage.getItem(borradorClave(formulario, uid));
    if (!raw) return null;
    const dato = JSON.parse(raw);
    if (!dato || dato.version !== BORRADOR_VERSION || !dato.valor) return null;
    return dato;
  } catch (e) {
    return null;
  }
}

function guardarBorradorLocal(formulario, valor, { uid, etiqueta = '' } = {}) {
  if (borradorVacio(valor)) return eliminarBorradorLocal(formulario, uid);
  const dato = {
    version: BORRADOR_VERSION,
    formulario,
    etiqueta,
    uid: uid || 'anonimo',
    actualizadoEn: new Date().toISOString(),
    valor: clonarBorrador(valor)
  };
  try {
    localStorage.setItem(borradorClave(formulario, uid), JSON.stringify(dato));
    return dato;
  } catch (e) {
    console.warn('No se pudo guardar el borrador local:', e);
    return null;
  }
}

function eliminarBorradorLocal(formulario, uid) {
  try { localStorage.removeItem(borradorClave(formulario, uid)); } catch (e) {}
  return null;
}

function confirmarSalidaBorrador({ sucio, borrador, etiqueta = 'este formulario' } = {}) {
  if (!sucio && !borrador) return true;
  return window.confirm(`Tienes cambios sin guardar en ${etiqueta}. ¿Quieres salir y descartar el borrador?`);
}

function hayBorradoresLocales(uid) {
  const proyecto = String(window.location.hostname || 'local').replace(/[^a-z0-9.-]/gi, '_');
  const usuario = String(uid || 'anonimo').replace(/[^a-z0-9._-]/gi, '_');
  const prefijo = `${BORRADOR_PREFIX}${proyecto}:${usuario}:`;
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      if (String(localStorage.key(i) || '').startsWith(prefijo)) return true;
    }
  } catch (e) {}
  return false;
}


function useBorradorLocal(formulario, valor, { uid, habilitado = true, etiqueta = '' } = {}) {
  const { useCallback, useEffect, useRef, useState } = React;
  const inicialRef = useRef(null);
  const valorRef = useRef(valor);
  const [borrador, setBorrador] = useState(null);
  const [guardadoEn, setGuardadoEn] = useState(null);
  valorRef.current = valor;

  useEffect(() => {
    if (!habilitado || !formulario) {
      inicialRef.current = null;
      setBorrador(null);
      setGuardadoEn(null);
      return undefined;
    }
    inicialRef.current = clonarBorrador(valor);
    setBorrador(leerBorradorLocal(formulario, uid));
    return undefined;
  }, [formulario, uid, habilitado]);

  const sucio = !!habilitado && !!formulario && inicialRef.current !== null && !valoresIgualesBorrador(valor, inicialRef.current);

  const guardarActual = useCallback(() => {
    if (!habilitado || !formulario || !sucio) return null;
    const dato = guardarBorradorLocal(formulario, valorRef.current, { uid, etiqueta });
    if (dato) setGuardadoEn(dato.actualizadoEn);
    return dato;
  }, [formulario, uid, habilitado, sucio, etiqueta]);

  useEffect(() => {
    if (!habilitado || !formulario || !sucio) return undefined;
    const timer = setTimeout(guardarActual, 650);
    const persistirAlSalir = () => guardarActual();
    window.addEventListener('pagehide', persistirAlSalir);
    document.addEventListener('visibilitychange', persistirAlSalir);
    return () => {
      guardarActual();
      clearTimeout(timer);
      window.removeEventListener('pagehide', persistirAlSalir);
      document.removeEventListener('visibilitychange', persistirAlSalir);
    };
  }, [formulario, habilitado, sucio, guardarActual, valor]);

  const descartar = useCallback(() => {
    eliminarBorradorLocal(formulario, uid);
    setBorrador(null);
    setGuardadoEn(null);
  }, [formulario, uid]);

  const consumir = useCallback(() => {
    const valorRecuperado = clonarBorrador(borrador?.valor);
    setBorrador(null);
    return valorRecuperado;
  }, [borrador]);

  return { borrador, sucio, guardadoEn, guardarActual, descartar, consumir };
}

function BorradorRecuperable({ borrador, onContinuar, onDescartar }) {
  if (!borrador) return null;
  const fecha = borrador.actualizadoEn ? new Date(borrador.actualizadoEn).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '';
  return React.createElement('div', {
    style: { padding: 14, marginBottom: 14, background: 'var(--info-bg)', border: '1px solid var(--info)', borderRadius: 10, color: 'var(--info-text)' },
    role: 'status'
  }, React.createElement('div', { style: { fontWeight: 800, fontSize: 14, marginBottom: 4 } }, 'Hay un borrador recuperable'), React.createElement('div', { style: { fontSize: 12, lineHeight: 1.4, marginBottom: 10 } }, borrador.etiqueta || 'Se encontró trabajo pendiente', fecha ? ` · Guardado ${fecha}` : ''), React.createElement(Row, { style: { gap: 8, flexWrap: 'wrap' } }, React.createElement(BFill, { onClick: onContinuar, style: { flex: '1 1 150px' } }, 'Continuar borrador'), React.createElement(BOut, { onClick: onDescartar, style: { flex: '1 1 120px' } }, 'Descartar')));
}

function BorradorGuardado({ guardadoEn }) {
  if (!guardadoEn) return null;
  return React.createElement('div', { style: { fontSize: 11, color: 'var(--ok-text)', margin: '8px 0 0' }, role: 'status' }, 'Borrador guardado localmente');
}

window.borradorClave = borradorClave;
window.leerBorradorLocal = leerBorradorLocal;
window.guardarBorradorLocal = guardarBorradorLocal;
window.eliminarBorradorLocal = eliminarBorradorLocal;
window.confirmarSalidaBorrador = confirmarSalidaBorrador;
window.hayBorradoresLocales = hayBorradoresLocales;
window.useBorradorLocal = useBorradorLocal;
window.BorradorRecuperable = BorradorRecuperable;
window.BorradorGuardado = BorradorGuardado;
