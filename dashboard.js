function StatTile({
  value,
  label,
  bg,
  color,
  onClick
}) {
  const primary = bg === 'var(--rail)';
  const warning = bg === 'var(--warn)';
  return React.createElement("div", {
    onClick: onClick,
    style: {
      background: primary ? 'var(--fw-navy)' : 'var(--fw-surface)',
      color: primary ? '#FFFFFF' : warning ? 'var(--fw-warning)' : 'var(--fw-navy)',
      border: '1px solid ' + (primary ? 'var(--fw-navy)' : 'var(--fw-border)'),
      borderRadius: 12,
      padding: '18px 16px',
      boxShadow: '0 2px 8px rgba(16,42,67,.06)',
      cursor: onClick ? 'pointer' : 'default',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 132,
      justifyContent: 'space-between'
    }
  }, React.createElement("div", null, React.createElement("div", {
    style: {
      fontSize: 28,
      fontWeight: 800,
      fontFamily: 'var(--font-display)',
      lineHeight: 1
    }
  }, value), React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      marginTop: 6
    }
  }, label)), onClick && React.createElement(Row, {
    style: {
      gap: 4,
      fontSize: 11,
      fontWeight: 700,
      opacity: .85,
      marginTop: 8
    }
  }, React.createElement("span", null, "Ver más"), React.createElement("span", null, "→")));
}
function Dashboard({
  notas,
  productos,
  creditos,
  clientes,
  rutas,
  currentUser,
  notificacionesTransferencias = [],
  onIrA,
  onVentaRapida
}) {
  const isAdmin = currentUser.role === 'admin';
  const isRepartidor = currentUser.role === 'repartidor';
  const isVendedor = rolEfectivo(currentUser) === 'vendedor';
  const tabsPermitidos = permisoTabs(currentUser);
  const esEfectivo = fp => fp === 'efectivo' || fp === 'contado';
  const hoy = new Date().toDateString();
  const vhoy = notas.filter(n => new Date(n.fecha).toDateString() === hoy);
  const thoy = vhoy.reduce((s, n) => s + n.total, 0);
  const pend = creditos.filter(c => c.saldo > 0);
  const tcred = pend.reduce((s, c) => s + c.saldo, 0);
  const bajo = productos.filter(p => p.stock < 10);
  const avisosTransferencia = notificacionesTransferencias.slice(0, 4);
  const bmap = notas.reduce((m, n) => {
    m[n.clienteId] = m[n.clienteId] || {
      nombre: n.clienteNombre,
      total: 0,
      count: 0
    };
    m[n.clienteId].total += n.total;
    m[n.clienteId].count += 1;
    return m;
  }, {});
  const top = Object.values(bmap).sort((a, b) => b.total - a.total).slice(0, 5);
  const maxT = top[0]?.total || 1;
  const misNotasHoy = vhoy.filter(n => n.capturadoPorUid === currentUser.uid);
  const miVentaEfectivoHoy = misNotasHoy.filter(n => esEfectivo(n.formaPago)).reduce((s, n) => s + n.total, 0);
  const misClientesHoy = new Set(misNotasHoy.map(n => n.clienteId)).size;
  const rutaActiva = (rutas || []).find(r => r.estado === 'activa' && (!isRepartidor || r.repartidorId === currentUser.uid));
  const irA = id => () => {
    if (tabsPermitidos[id]) onIrA(id);
  };
  const acciones = (isRepartidor ? [{
    icon: 'note',
    label: 'Venta rápida',
    detalle: rutaActiva ? 'Vender durante mi jornada' : 'Revisar jornada',
    onClick: irA('ruta')
  }, {
    icon: 'route',
    label: 'Mi distribución',
    detalle: 'Revisar jornada, vehículo y clientes QR',
    onClick: irA('repartidores')
  }, {
    icon: 'cash',
    label: 'Corte del día',
    detalle: 'Consultar ventas y efectivo',
    onClick: irA('gerencia')
  }] : [{
    icon: 'note',
    label: isVendedor ? 'Venta pública de planta' : 'Nuevo pedido',
    detalle: isVendedor ? 'Ticket general de mostrador' : 'Solicitud sin descontar inventario',
    onClick: isVendedor ? onVentaRapida : irA('nota'),
    tab: 'nota'
  }, {
    icon: 'plus',
    label: 'Venta rápida',
    detalle: 'Venta directa desde almacén, sin jornada',
    onClick: onVentaRapida,
    tab: 'nota',
    soloAdmin: true
  }, {
    icon: 'users',
    label: 'Clientes y QR',
    detalle: 'Buscar, crear o mostrar QR',
    onClick: irA('clientes'),
    tab: 'clientes'
  }, {
    icon: 'credit',
    label: 'Cobrar crédito',
    detalle: 'Consultar saldo y registrar abono',
    onClick: irA('creditos'),
    tab: 'creditos'
  }, {
    icon: 'box',
    label: 'Jornadas',
    detalle: 'Iniciar, operar y cerrar jornadas',
    onClick: irA('ruta'),
    tab: 'ruta',
    soloAdmin: true
  }, {
    icon: 'inventory',
    label: 'Revisar inventario',
    detalle: 'Consultar existencias y alertas',
    onClick: irA('inventario'),
    tab: 'inventario'
  }]).filter(a => (a.soloAdmin ? isAdmin : true) && (!a.tab || tabsPermitidos[a.tab]));
  const tituloAcciones = isRepartidor ? 'Herramientas de campo' : 'Acciones rápidas';
  const ayudaAcciones = isRepartidor ? 'Accesos para operar tu jornada, identificar clientes y consultar tu corte.' : 'Accesos directos para las tareas operativas más frecuentes.';
  return React.createElement("div", {
    style: {
      padding: '16px 12px'
    }
  }, React.createElement("div", {
    style: {
      fontSize: 28,
      fontWeight: 800,
      marginBottom: 6,
      color: 'var(--fw-navy)'
    }
  }, "Inicio"), React.createElement("div", {
    style: { fontSize: 15, color: 'var(--fw-text-muted)', marginBottom: 18 }
  }, "Resumen operativo del día"), React.createElement("div", {
    style: { fontSize: 13, color: 'var(--fw-text-muted)', marginBottom: 16 }
  }, new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })), avisosTransferencia.length > 0 && React.createElement(Card, {
    style: {
      marginBottom: 14,
      border: '1px solid var(--warn)66'
    }
  }, React.createElement(Row, {
    style: {
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8
    }
  }, React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 800,
      color: 'var(--warn-text)'
    }
  }, 'Operaciones pendientes'), React.createElement("button", {
    onClick: () => onIrA('ruta'),
    style: {
      border: 'none',
      background: 'none',
      color: 'var(--accent)',
      fontSize: 11,
      fontWeight: 700,
      cursor: 'pointer'
    }
  }, 'Ver módulo →')), avisosTransferencia.map(aviso => React.createElement("button", {
    key: aviso.id,
    onClick: () => onIrA('ruta'),
    style: {
      display: 'block',
      width: '100%',
      textAlign: 'left',
      border: 'none',
      borderTop: '1px solid var(--line)',
      background: 'transparent',
      padding: '8px 0 0',
      marginTop: 8,
      cursor: 'pointer'
    }
  }, React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: 'var(--ink)'
    }
  }, aviso.titulo), React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ink-faint)',
      marginTop: 2
    }
  }, aviso.detalle)))), React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 10,
      marginBottom: 14
    }
  }, isRepartidor ? React.createElement(React.Fragment, null, React.createElement(StatTile, {
    value: misNotasHoy.length,
    label: "Ventas de jornada hoy",
    bg: "var(--rail)",
    color: "var(--rail-ink)",
    onClick: irA('ruta')
  }), React.createElement(StatTile, {
    value: fmt(miVentaEfectivoHoy),
    label: "Venta efectivo hoy",
    bg: "var(--accent)",
    color: "var(--accent-ink)",
    onClick: irA('gerencia')
  }), React.createElement(StatTile, {
    value: misClientesHoy,
    label: "Clientes atendidos hoy",
    bg: "var(--info)",
    color: "#fff",
    onClick: irA('ruta')
  }), React.createElement(StatTile, {
    value: rutaActiva ? 'Activa' : 'Sin jornada',
    label: "Estado de tu jornada",
    bg: rutaActiva ? 'var(--ok)' : 'var(--warn)',
    color: "#fff",
    onClick: irA('ruta')
  })) : React.createElement(React.Fragment, null, React.createElement(StatTile, {
    value: vhoy.length,
    label: "Ventas de hoy",
    bg: "var(--rail)",
    color: "var(--rail-ink)",
    onClick: irA('nota')
  }), React.createElement(StatTile, {
    value: fmt(thoy),
    label: "Ingresos de hoy",
    bg: "var(--accent)",
    color: "var(--accent-ink)",
    onClick: irA('gerencia')
  }), React.createElement(StatTile, {
    value: clientes.filter(c => c.activo).length,
    label: "Clientes registrados",
    bg: "var(--info)",
    color: "#fff",
    onClick: irA('clientes')
  }), React.createElement(StatTile, {
    value: fmt(tcred),
    label: "Créditos pendientes",
    bg: "var(--warn)",
    color: "#fff",
    onClick: irA('creditos')
  }))), acciones.length > 0 && React.createElement(Card, null, React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      marginBottom: 4,
      fontFamily: 'var(--font-display)',
      textTransform: 'uppercase',
      letterSpacing: '.02em'
    }
  }, tituloAcciones), React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ink-faint)',
      marginBottom: 12,
      lineHeight: 1.35
    }
  }, ayudaAcciones), React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 10
    }
  }, acciones.map(a => React.createElement("button", {
    key: a.label,
    onClick: a.onClick,
    style: {
      background: 'var(--fw-surface)',
      border: '1px solid var(--fw-border)',
      borderRadius: 10,
      padding: '16px 14px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 6,
      cursor: 'pointer',
      minHeight: 116,
      boxShadow: '0 2px 8px rgba(16,42,67,.05)'
    }
  }, React.createElement("span", {
    style: {
      width: 40,
      height: 40,
      display: 'grid',
      placeItems: 'center',
      color: 'var(--fw-aqua-action)'
    }
  }, React.createElement(LineIcon, { name: a.icon, size: 26 })), React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      textAlign: 'center',
      color: 'var(--ink)'
    }
  }, a.label), React.createElement("span", {
    style: {
      fontSize: 10,
      lineHeight: 1.25,
      textAlign: 'center',
      color: 'var(--ink-faint)'
    }
  }, a.detalle))))), !isRepartidor && React.createElement(React.Fragment, null, top.length > 0 && React.createElement(Card, null, React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ink-faint)',
      fontWeight: 700,
      marginBottom: 10
    }
  }, "CLIENTES CON MÁS COMPRAS"), top.map((b, i) => React.createElement("div", {
    key: i,
    style: {
      marginBottom: 10
    }
  }, React.createElement(Row, {
    style: {
      justifyContent: 'space-between',
      marginBottom: 3
    }
  }, React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 600
    }
  }, b.nombre), React.createElement(Row, {
    style: {
      gap: 6
    }
  }, React.createElement(Tag, {
    color: "var(--ink-faint)"
  }, b.count, " ped."), React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: 'var(--accent-text)'
    }
  }, fmt(b.total)))), React.createElement("div", {
    style: {
      background: 'var(--surface-2)',
      borderRadius: 10,
      height: 5
    }
  }, React.createElement("div", {
    style: {
      background: 'linear-gradient(90deg,var(--accent),var(--warn))',
      borderRadius: 10,
      height: 5,
      width: `${(b.total / maxT * 100).toFixed(0)}%`
    }
  }))))), bajo.length > 0 && React.createElement(Card, {
    style: {
      borderLeft: '3px solid var(--danger-text)'
    }
  }, React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--danger-text)',
      fontWeight: 700,
      marginBottom: 6
    }
  }, "Stock bajo"), bajo.map(p => React.createElement(Row, {
    key: p.id,
    style: {
      justifyContent: 'space-between',
      marginBottom: 4
    }
  }, React.createElement("span", {
    style: {
      fontSize: 13
    }
  }, p.nombre), React.createElement(Tag, {
    color: "var(--danger-text)"
  }, p.stock, " ", etiquetaProducto(p), " · ", PRODUCTO_UNIDADES_INVENTARIO.find(u => u.id === (p.unidadInventario || 'pieza'))?.nombre || unidadProductoNombre(p.unidadMedida || p.unidad || 'pieza'))))), vhoy.length > 0 && React.createElement(Card, null, React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ink-faint)',
      fontWeight: 700,
      marginBottom: 8
    }
  }, "VENTAS DE HOY"), vhoy.map(n => React.createElement(Row, {
    key: n.id,
    style: {
      justifyContent: 'space-between',
      paddingBottom: 8,
      borderBottom: '1px solid var(--line)',
      marginBottom: 4
    }
  }, React.createElement("div", null, React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600
    }
  }, n.clienteNombre), React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ink-faint)'
    }
  }, n.items.length, " prod. · ", n.formaPago)), React.createElement("span", {
    style: {
      fontWeight: 700,
      color: 'var(--accent-text)'
    }
  }, fmt(n.total)))))));
}
