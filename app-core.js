const {
  useState,
  useEffect,
  useRef
} = React;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
const snapTienePendientes = snap => snap.docs.some(d => d.metadata.hasPendingWrites);
// Los helpers de sesión y almacenamiento local viven en módulos separados.
const fmt = n => '$' + Number(n || 0).toFixed(2);
const fDate = d => new Date(d).toLocaleDateString('es-MX', {
  day: '2-digit',
  month: 'short',
  year: '2-digit'
});
const Ic = ({
  children,
  size = 18
}) => React.createElement("svg", {
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, children);
const CDown = () => React.createElement(Ic, null, React.createElement("polyline", {
  points: "6 9 12 15 18 9"
}));
const CUp = () => React.createElement(Ic, null, React.createElement("polyline", {
  points: "18 15 12 9 6 15"
}));
const XI = ({
  size = 20
}) => React.createElement(Ic, {
  size: size
}, React.createElement("line", {
  x1: "18",
  y1: "6",
  x2: "6",
  y2: "18"
}), React.createElement("line", {
  x1: "6",
  y1: "6",
  x2: "18",
  y2: "18"
}));
const ChkSq = () => React.createElement(Ic, null, React.createElement("polyline", {
  points: "9 11 12 14 22 4"
}), React.createElement("path", {
  d: "M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
}));
const SqI = () => React.createElement(Ic, null, React.createElement("rect", {
  x: "3",
  y: "3",
  width: "18",
  height: "18",
  rx: "2"
}));
const EyeI = () => React.createElement(Ic, {
  size: 16
}, React.createElement("path", {
  d: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
}), React.createElement("circle", {
  cx: "12",
  cy: "12",
  r: "3"
}));
const EyeX = () => React.createElement(Ic, {
  size: 16
}, React.createElement("path", {
  d: "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
}), React.createElement("line", {
  x1: "1",
  y1: "1",
  x2: "23",
  y2: "23"
}));
const Gear = () => React.createElement(Ic, null, React.createElement("circle", {
  cx: "12",
  cy: "12",
  r: "3"
}), React.createElement("path", {
  d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
}));
const LINE_ICON_SHAPES = {
  dot: [['circle', { cx: '12', cy: '12', r: '3' }]],
  home: [['path', { d: 'M3 11.5 12 4l9 7.5' }], ['path', { d: 'M5 10v10h14V10' }], ['path', { d: 'M9 20v-6h6v6' }]],
  box: [['path', { d: 'm4 7 8-4 8 4-8 4-8-4Z' }], ['path', { d: 'M4 7v10l8 4 8-4V7' }], ['path', { d: 'M12 11v10' }]],
  tag: [['path', { d: 'M20 13 13 20 4 11V4h7l9 9Z' }], ['circle', { cx: '8', cy: '8', r: '1' }]],
  note: [['path', { d: 'M5 3h14v18H5z' }], ['path', { d: 'M8 8h8M8 12h8M8 16h5' }]],
  users: [['path', { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' }], ['circle', { cx: '9', cy: '7', r: '4' }], ['path', { d: 'M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' }]],
  credit: [['rect', { x: '3', y: '5', width: '18', height: '14', rx: '2' }], ['path', { d: 'M3 10h18M7 15h3' }]],
  compass: [['circle', { cx: '12', cy: '12', r: '9' }], ['path', { d: 'm15 9-2 4-4 2 2-4 4-2Z' }]],
  route: [['circle', { cx: '5', cy: '19', r: '2' }], ['circle', { cx: '19', cy: '5', r: '2' }], ['path', { d: 'M7 18c4-1 3-6 6-7s3-5 4-6' }]],
  truck: [['path', { d: 'M3 6h11v10H3zM14 10h4l3 3v3h-7z' }], ['circle', { cx: '7', cy: '19', r: '2' }], ['circle', { cx: '18', cy: '19', r: '2' }]],
  inventory: [['path', { d: 'M4 4h16v16H4zM4 9h16M9 4v5' }], ['path', { d: 'M8 13h8M8 17h5' }]],
  chart: [['path', { d: 'M4 19V5M4 19h16' }], ['path', { d: 'm7 15 3-4 3 2 4-6' }]],
  cash: [['rect', { x: '3', y: '6', width: '18', height: '12', rx: '2' }], ['circle', { cx: '12', cy: '12', r: '2' }], ['path', { d: 'M7 9h.01M17 15h.01' }]],
  bell: [['path', { d: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4' }]],
  plus: [['path', { d: 'M12 5v14M5 12h14' }]],
  search: [['circle', { cx: '11', cy: '11', r: '7' }], ['path', { d: 'm20 20-4-4' }]],
  qr: [['rect', { x: '4', y: '4', width: '6', height: '6' }], ['rect', { x: '14', y: '4', width: '6', height: '6' }], ['rect', { x: '4', y: '14', width: '6', height: '6' }], ['path', { d: 'M14 14h3v3h3v3h-6v-6Z' }]],
  alert: [['path', { d: 'M12 3 2 21h20L12 3Z' }], ['path', { d: 'M12 9v4M12 17h.01' }]],
  lock: [['rect', { x: '5', y: '10', width: '14', height: '10', rx: '2' }], ['path', { d: 'M8 10V7a4 4 0 0 1 8 0v3' }]],
  arrowLeft: [['path', { d: 'm15 18-6-6 6-6M9 12h11' }]],
  chevronRight: [['path', { d: 'm9 18 6-6-6-6' }]]
};
const LineIcon = ({ name = 'dot', size = 20 }) => React.createElement(Ic, { size }, ...(LINE_ICON_SHAPES[name] || LINE_ICON_SHAPES.dot).map(([tag, props]) => React.createElement(tag, props)));
const Menu = () => React.createElement(Ic, null, React.createElement("line", {
  x1: "3",
  y1: "6",
  x2: "21",
  y2: "6"
}), React.createElement("line", {
  x1: "3",
  y1: "12",
  x2: "21",
  y2: "12"
}), React.createElement("line", {
  x1: "3",
  y1: "18",
  x2: "21",
  y2: "18"
}));
const Card = ({
  children,
  style = {}
}) => React.createElement("div", {
  style: {
    background: 'var(--fw-surface)',
    border: '1px solid var(--fw-border)',
    borderRadius: 10,
    padding: '16px',
    marginBottom: 12,
    boxShadow: '0 2px 8px rgba(16,42,67,.06)',
    minWidth: 0,
    maxWidth: '100%',
    boxSizing: 'border-box',
    ...style
  }
}, children);
const BFill = ({
  children,
  onClick,
  bg = 'var(--accent)',
  color = 'var(--accent-ink)',
  style = {},
  ...p
}) => React.createElement("button", {
  onClick: onClick,
  style: {
    background: bg,
    color,
    border: '1px solid transparent',
    borderRadius: 8,
    padding: '12px 16px',
    cursor: 'pointer',
    fontSize: 16,
    fontWeight: 700,
    fontFamily: 'var(--font-body)',
    letterSpacing: '0',
    minHeight: 48,
    minWidth: 0,
    maxWidth: '100%',
    overflowWrap: 'anywhere',
    whiteSpace: 'normal',
    lineHeight: 1.2,
    ...style
  },
  ...p
}, children);
const BOut = ({
  children,
  onClick,
  color = 'var(--accent-text)',
  style = {},
  ...p
}) => React.createElement("button", {
  onClick: onClick,
  style: {
    background: 'var(--fw-surface)',
    color,
    border: `1px solid ${color}`,
    borderRadius: 8,
    padding: '11px 16px',
    cursor: 'pointer',
    fontSize: 16,
    fontWeight: 600,
    fontFamily: 'var(--font-body)',
    letterSpacing: '0',
    minHeight: 48,
    minWidth: 0,
    maxWidth: '100%',
    overflowWrap: 'anywhere',
    whiteSpace: 'normal',
    lineHeight: 1.2,
    ...style
  },
  ...p
}, children);
const Inp = ({
  style = {},
  ...p
}) => React.createElement("input", {
  style: {
    background: 'var(--fw-surface)',
    border: '1px solid var(--fw-border)',
    borderRadius: 8,
    padding: '12px 14px',
    color: 'var(--fw-text)',
    fontSize: 16,
    width: '100%',
    boxSizing: 'border-box',
    ...style
  },
  ...p
});
const Lbl = ({
  children
}) => React.createElement("div", {
  style: {
    fontSize: 12,
    color: 'var(--fw-text-muted)',
    marginBottom: 6,
    textTransform: 'none',
    letterSpacing: '.01em',
    fontFamily: 'var(--font-body)',
    fontWeight: 700
  }
}, children);
const Row = ({
  children,
  style = {}
}) => React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
    maxWidth: '100%',
    ...style
  }
}, children);
const Tag = ({
  children,
  color = 'var(--accent-text)',
  style = {}
}) => React.createElement("span", {
  style: {
    background: `color-mix(in srgb, ${color} 14%, white)`,
    color,
    border: `1px solid color-mix(in srgb, ${color} 45%, white)`,
    borderRadius: 3,
    padding: '2px 8px',
    fontSize: 11,
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    ...style
  }
}, children);
function Modal({
  title,
  onClose,
  children
}) {
  return React.createElement("div", {
    style: {
      position: 'fixed',
      inset: 0,
      background: '#1B1D19cc',
      zIndex: 300,
      display: 'flex',
      alignItems: 'flex-end'
    }
  }, React.createElement("div", {
    style: {
      background: 'var(--fw-surface)',
      width: '100%',
      maxWidth: 420,
      minWidth: 0,
      boxSizing: 'border-box',
      margin: '0 auto',
      borderRadius: '16px 16px 0 0',
      padding: 20,
      paddingTop: 18,
      maxHeight: '90vh',
      overflowY: 'auto',
      borderTop: '3px solid var(--fw-aqua)'
    }
  }, React.createElement(Row, {
    style: {
      justifyContent: 'space-between',
      marginBottom: 16
    }
  }, React.createElement("span", {
    style: {
      fontSize: 15,
      fontWeight: 700,
      fontFamily: 'var(--font-display)',
      textTransform: 'uppercase',
      letterSpacing: '.02em'
    }
  }, title), React.createElement("button", {
    onClick: onClose,
    style: {
      background: 'none',
      border: 'none',
      color: 'var(--ink-soft)',
      cursor: 'pointer',
      display: 'flex'
    }
  }, React.createElement(XI, null))), children));
}
function distanciaMetros(lat1, lng1, lat2, lng2) {
  const R = 6371000,
    toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1),
    dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
const RADIO_VISITA_METROS = 150;
const Toggle = ({
  checked,
  onChange,
  disabled = false
}) => React.createElement("button", {
  onClick: () => !disabled && onChange(!checked),
  disabled: disabled,
  "aria-pressed": checked,
  style: {
    width: 44,
    height: 26,
    borderRadius: 13,
    border: 'none',
    padding: 2,
    flexShrink: 0,
    background: checked ? 'var(--ok)' : 'var(--line-strong)',
    cursor: disabled ? 'default' : 'pointer',
    position: 'relative',
    transition: 'background .15s',
    opacity: disabled ? 0.5 : 1
  }
}, React.createElement("div", {
  style: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: '#fff',
    transform: checked ? 'translateX(18px)' : 'translateX(0)',
    transition: 'transform .15s',
    boxShadow: '0 1px 2px rgba(0,0,0,.3)'
  }
}));
// El modelo de permisos (TABS_INFO, EDICION_INFO, ACCIONES_INFO,
// *_DEFAULT_ROL, permisoTabs, permisoEdita, permisoAcciones) se movió a
// sesion.js (capa de servicios) — sigue siendo global, solo cambió el archivo.
function PwInp({
  value,
  onChange,
  placeholder
}) {
  const [show, setShow] = useState(false);
  return React.createElement("div", {
    style: {
      position: 'relative',
      marginBottom: 10
    }
  }, React.createElement(Inp, {
    type: show ? 'text' : 'password',
    value: value,
    onChange: onChange,
    placeholder: placeholder || '••••••',
    style: {
      paddingRight: 38
    }
  }), React.createElement("button", {
    onClick: () => setShow(v => !v),
    style: {
      position: 'absolute',
      right: 10,
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'none',
      border: 'none',
      color: 'var(--ink-faint)',
      cursor: 'pointer',
      padding: 0,
      display: 'flex'
    }
  }, show ? React.createElement(EyeX, null) : React.createElement(EyeI, null)));
}
function BarcodeScanner({
  onDetected,
  onClose
}) {
  const [elId] = useState(() => 'scanner-' + uid());
  const [err, setErr] = useState('');
  useEffect(() => {
    if (typeof Html5Qrcode === 'undefined') {
      setErr('No se pudo cargar la librería de escaneo. Revisa tu conexión a internet.');
      return;
    }
    let scanner = null,
      stopped = false,
      cancelled = false;
    (async () => {
      try {
        scanner = new Html5Qrcode(elId);
        await scanner.start({
          facingMode: 'environment'
        }, {
          fps: 10,
          qrbox: {
            width: 260,
            height: 130
          }
        }, decodedText => {
          if (stopped || cancelled) return;
          stopped = true;
          scanner.stop().then(() => scanner.clear()).catch(() => {});
          onDetected(decodedText);
        }, () => {});
      } catch (e) {
        if (!cancelled) setErr('No se pudo acceder a la cámara. Revisa los permisos del navegador.');
      }
    })();
    return () => {
      cancelled = true;
      if (scanner && !stopped) {
        stopped = true;
        try {
          scanner.stop().then(() => scanner.clear()).catch(() => {});
        } catch (e) {}
      }
    };
  }, []);
  return React.createElement(Modal, {
    title: "Escanear código de barras",
    onClose: onClose
  }, err ? React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--danger-text)',
      textAlign: 'center',
      padding: '24px 0'
    }
  }, err) : React.createElement("div", {
    id: elId,
    style: {
      width: '100%',
      borderRadius: 4,
      overflow: 'hidden',
      background: '#000'
    }
  }), React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ink-faint)',
      textAlign: 'center',
      marginTop: 10
    }
  }, "Apunta la cámara al código de barras del producto"));
}