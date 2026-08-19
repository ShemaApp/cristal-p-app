function Creditos({
  creditos,
  currentUser
}) {
  const rol = currentUser?.role === 'usuario' ? 'vendedor' : currentUser?.role;
  const puedeRegistrar = ['admin', 'vendedor', 'repartidor'].includes(rol);
  const puedeAprobar = rol === 'admin';
  const [abonoId, setAbonoId] = useState(null);
  const [abonosPendientes, setAbonosPendientes] = useState({});
  const [monto, setMonto] = useState('');
  const [formaPagoAbono, setFormaPagoAbono] = useState('efectivo');
  const [savingAbono, setSavingAbono] = useState(false);
  const pend = creditos.filter(c => c.saldo > 0 && c.estado !== 'liquidado');
  const totalPend = pend.reduce((s, c) => s + c.saldo, 0);
  useEffect(() => {
    const unsubs = [];
    (creditos || []).forEach(c => {
      const unsub = db.collection('creditos').doc(c.id).collection('abonos')
        .where('estado', '==', 'pendiente')
        .onSnapshot(snap => setAbonosPendientes(prev => ({
          ...prev,
          [c.id]: snap.docs.map(d => ({ id: d.id, ...d.data() }))
        })), () => setAbonosPendientes(prev => ({ ...prev, [c.id]: [] })));
      unsubs.push(unsub);
    });
    return () => unsubs.forEach(unsub => unsub());
  }, [creditos]);
  const aprobarAbono = async (credito, abono) => {
    if (!puedeAprobar) return;
    const montoAprobado = Math.min(Number(abono.monto || 0), Number(credito.saldo || 0));
    if (!montoAprobado) return;
    const creditoRef = db.collection('creditos').doc(credito.id);
    const abonoRef = creditoRef.collection('abonos').doc(abono.id);
    try {
      await db.runTransaction(async tx => {
        const [creditoSnap, abonoSnap] = await Promise.all([tx.get(creditoRef), tx.get(abonoRef)]);
        if (!creditoSnap.exists || !abonoSnap.exists || abonoSnap.data().estado !== 'pendiente') {
          throw new Error('El abono ya fue conciliado o no existe');
        }
        const saldoActual = Number(creditoSnap.data().saldo || 0);
        const saldoNuevo = Math.max(0, saldoActual - montoAprobado);
        tx.update(creditoRef, {
          saldo: saldoNuevo,
          estado: saldoNuevo === 0 ? 'liquidado' : 'vigente',
          ultimoAbonoAprobadoId: abono.id,
          fechaLiquidacion: saldoNuevo === 0 ? new Date().toISOString() : ''
        });
        tx.update(abonoRef, {
          estado: 'aprobado',
          aprobadoPorUid: currentUser.uid,
          aprobadoPorNombre: currentUser.nombre || '',
          fechaAprobacion: new Date().toISOString()
        });
      });
    } catch (e) {
      alert('No se pudo aprobar el abono: ' + e.message);
    }
  };
  const abonar = async c => {
    if (savingAbono || !puedeRegistrar) return;
    let m = parseFloat(monto);
    if (!m || m <= 0) return;
    m = Math.min(m, Number(c.saldo || 0));
    if (!m) return;
    setSavingAbono(true);
    try {
      await db.collection('creditos').doc(c.id).collection('abonos').add({
        fecha: new Date().toISOString(),
        monto: m,
        formaPago: formaPagoAbono,
        estado: 'pendiente',
        capturadoPorUid: currentUser.uid,
        capturadoPorNombre: currentUser.nombre || '',
        clienteId: c.clienteId,
        clienteNombre: c.clienteNombre || ''
      });
      setMonto('');
      setFormaPagoAbono('efectivo');
      setAbonoId(null);
    } catch (e) {
      alert('Error al registrar abono pendiente: ' + e.message);
    }
    setSavingAbono(false);
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
  }, " Créditos"), React.createElement(Card, {
    style: {
      borderLeft: '3px solid var(--warn-text)',
      marginBottom: 14
    }
  }, React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--ink-soft)'
    }
  }, "Total pendiente"), React.createElement("div", {
    style: {
      fontSize: 28,
      fontWeight: 800,
      color: 'var(--warn-text)'
    }
  }, fmt(totalPend)), React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ink-faint)'
    }
  }, pend.length, " cuenta(s)")), pend.length === 0 && React.createElement("div", {
    style: {
      textAlign: 'center',
      color: 'var(--ink-faint)',
      fontSize: 14,
      paddingTop: 20
    }
  }, "Sin créditos pendientes "), pend.map(c => React.createElement(Card, {
    key: c.id
  }, React.createElement(Row, {
    style: {
      justifyContent: 'space-between',
      marginBottom: 8
    }
  }, React.createElement("div", null, React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 14
    }
  }, c.clienteNombre), React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ink-faint)'
    }
  }, fDate(c.fecha))), React.createElement("div", {
    style: {
      textAlign: 'right'
    }
  }, React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 800,
      color: 'var(--warn-text)'
    }
  }, fmt(c.saldo)), React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ink-faint)'
    }
  }, "de ", fmt(c.total)))), React.createElement("div", {
    style: {
      background: 'var(--surface-2)',
      borderRadius: 10,
      height: 6,
      marginBottom: 10
    }
  }, React.createElement("div", {
    style: {
      background: 'var(--ok)',
      borderRadius: 10,
      height: 6,
      width: `${Math.round((c.total - c.saldo) / c.total * 100)}%`
    }
  })), abonosPendientes[c.id]?.length > 0 && React.createElement("div", { style: { marginBottom: 10, paddingTop: 6, borderTop: '1px solid var(--line)' } },
    React.createElement("div", { style: { fontSize: 11, color: 'var(--warn-text)', fontWeight: 700, marginBottom: 5 } }, "ABONOS PENDIENTES DE CONCILIACIÓN"),
    abonosPendientes[c.id].map(a => React.createElement(Row, { key: a.id, style: { justifyContent: 'space-between', gap: 8, fontSize: 12, marginBottom: 4 } },
      React.createElement("span", null, fDate(a.fecha), " · ", fmt(a.monto), " · ", a.formaPago || 'efectivo'),
      puedeAprobar && React.createElement(BOut, { onClick: () => aprobarAbono(c, a), style: { padding: '5px 8px', fontSize: 10 } }, "Aceptar")
    ))), puedeRegistrar && (abonoId === c.id ? React.createElement("div", null, React.createElement(Row, {
    style: {
      gap: 6,
      marginBottom: 6
    }
  }, [['efectivo', ' Efectivo', 'var(--ok-bg)', 'var(--ok-text)'], ['transferencia', ' Transferencia', 'var(--info-bg)', 'var(--info-text)']].map(([v, l, bg, col]) => React.createElement("button", {
    key: v,
    onClick: () => setFormaPagoAbono(v),
    style: {
      flex: 1,
      padding: '6px',
      borderRadius: 8,
      border: 'none',
      background: formaPagoAbono === v ? bg : 'var(--surface-2)',
      color: formaPagoAbono === v ? col : 'var(--ink-soft)',
      fontSize: 11,
      fontWeight: 700,
      cursor: 'pointer'
    }
  }, l))), React.createElement(Row, {
    style: {
      gap: 8
    }
  }, React.createElement(Inp, {
    type: "number",
    placeholder: "Monto abono…",
    value: monto,
    onChange: e => setMonto(e.target.value),
    style: {
      flex: 1
    }
  }), React.createElement(BFill, {
    onClick: () => abonar(c),
    bg: "var(--ok)",
    color: "var(--ink)",
    style: {
      padding: '8px 14px',
      opacity: savingAbono ? 0.6 : 1
    },
    disabled: savingAbono
  }, savingAbono ? '…' : ''), React.createElement("button", {
    onClick: () => {
      setAbonoId(null);
      setMonto('');
      setFormaPagoAbono('efectivo');
    },
    style: {
      background: 'none',
      border: 'none',
      color: 'var(--ink-soft)',
      cursor: 'pointer',
      display: 'flex'
    }
  }, React.createElement(XI, {
    size: 18
  })))) : React.createElement(BOut, {
    onClick: () => setAbonoId(c.id),
    color: "var(--ok-text)",
    style: {
      width: '100%'
    }
  }, "+ Registrar abono")))));
}