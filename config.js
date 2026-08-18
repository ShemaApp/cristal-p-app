function Configuracion({
  currentUser,
  onBack,
  onLogout,
  branding,
  abrirUsuarios,
  onAbrirUsuariosConsumido
}) {
  const [sub, setSub] = useState('perfil');
  const [users, setUsersList] = useState([]);
  const [brandForm, setBrandForm] = useState(() => normalizarBranding(branding));
  const [form, setForm] = useState(null);
  const [vehicleForm, setVehicleForm] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [pw, setPw] = useState({
    old: '',
    new_: '',
    conf: ''
  });
  const [pinStep, setPinStep] = useState('idle');
  const [pinTmp, setPinTmp] = useState('');
  const [pinDigits, setPinDigits] = useState('');
  const hasPin = !!localStorage.getItem(pinKey(currentUser.uid));
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  useEffect(() => {
    setBrandForm(normalizarBranding(branding));
  }, [branding?.nombreComercial, branding?.subtitulo, branding?.lema, branding?.telefono, branding?.logoPath]);
  const pressTimer = useRef(null);
  const longPressed = useRef(false);
  const startPress = id => {
    longPressed.current = false;
    clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => {
      longPressed.current = true;
      if (navigator.vibrate) navigator.vibrate(12);
      setExpandedId(eid => eid === id ? null : id);
    }, 500);
  };
  const cancelPress = () => clearTimeout(pressTimer.current);
  const onUserTap = id => {
    if (longPressed.current) {
      longPressed.current = false;
      return;
    }
    if (expandedId === id) setExpandedId(null);
  };
  const isAdmin = currentUser.role === 'admin';
  const roleColor = r => r === 'admin' ? 'var(--admin)' : r === 'repartidor' ? 'var(--warn-text)' : 'var(--info-text)';
  const flash = (m, isErr = false) => {
    isErr ? setErr(m) : setMsg(m);
    setTimeout(() => {
      setErr('');
      setMsg('');
    }, 4000);
  };
  useEffect(() => {
    if (abrirUsuarios && isAdmin) {
      setSub('usuarios');
      onAbrirUsuariosConsumido && onAbrirUsuariosConsumido();
    }
  }, [abrirUsuarios]);
  useEffect(() => {
    if (!isAdmin) return;
    const unsub = db.collection('vehiculos').orderBy('nombre').onSnapshot(snap => {
      setVehicles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => setVehicles([]));
    return unsub;
  }, [isAdmin]);
  useEffect(() => {
    if (!isAdmin) return;
    const unsub = db.collection('usuarios').onSnapshot(snap => {
      setUsersList(snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })));
    });
    return unsub;
  }, [isAdmin]);
  const changePw = async () => {
    if (pw.new_.length < 6) {
      flash('Mínimo 6 caracteres', true);
      return;
    }
    if (pw.new_ !== pw.conf) {
      flash('Las contraseñas no coinciden', true);
      return;
    }
    try {
      const cred = firebase.auth.EmailAuthProvider.credential(currentUser.email, pw.old);
      await auth.currentUser.reauthenticateWithCredential(cred);
      await auth.currentUser.updatePassword(pw.new_);
      setPw({
        old: '',
        new_: '',
        conf: ''
      });
      flash('✅ Contraseña actualizada');
    } catch (e) {
      flash('Contraseña actual incorrecta', true);
    }
  };
  const saveVehicle = async () => {
    if (!isAdmin || !vehicleForm?.nombre?.trim() || !vehicleForm?.placa?.trim() || !vehicleForm?.numeroSerie?.trim()) {
      flash('Completa nombre, placa y número de serie del medidor', true); return;
    }
    const factor = Number(vehicleForm.factorLitrosPorUnidad);
    if (!Number.isFinite(factor) || factor <= 0) {
      flash('El factor de litros por unidad debe ser mayor que cero', true); return;
    }
    try {
      const vehicleRef = db.collection('vehiculos').doc();
      const meterRef = db.collection('medidores').doc();
      const fecha = firebase.firestore.FieldValue.serverTimestamp();
      const base = {
        nombre: vehicleForm.nombre.trim(), placa: vehicleForm.placa.trim().toUpperCase(), activo: true,
        medidorId: meterRef.id, numeroSerieMedidor: vehicleForm.numeroSerie.trim(), factorLitrosPorUnidad: factor,
        rutaBaseId: '', creadoPorUid: currentUser.uid, creadoPorNombre: currentUser.nombre || '', creadoEn: fecha
      };
      const batch = db.batch();
      batch.set(vehicleRef, base);
      batch.set(meterRef, {
        tipo: 'vehiculo', vehiculoId: vehicleRef.id, numeroSerie: vehicleForm.numeroSerie.trim(),
        factorLitrosPorUnidad: factor, unidadLectura: 'unidad', permiteDecimales: true, activo: true, creadoEn: fecha
      });
      await batch.commit();
      setVehicleForm(null); flash('✅ Vehículo y medidor autorizados fueron registrados');
    } catch (e) { flash('No se pudo registrar el vehículo: ' + e.message, true); }
  };
  const saveBranding = async () => {
    if (!isAdmin) {
      flash('Solo administración puede cambiar la marca comercial', true);
      return;
    }
    const next = normalizarBranding(brandForm);
    try {
      await db.collection('_meta').doc('branding').set({
        ...next,
        actualizadoPorUid: currentUser.uid,
        actualizadoPorNombre: currentUser.nombre || '',
        actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      setBrandForm(next);
      flash('✅ Marca comercial actualizada');
    } catch (e) {
      flash('No se pudo guardar la marca comercial: ' + e.message, true);
    }
  };
  const saveUser = async () => {
    if (!form?.id) {
      flash('Las cuentas nuevas se crean desde Firebase Console.', true);
      return;
    }
    if (!form.nombre || !form.email) {
      flash('Completa el nombre del usuario', true);
      return;
    }
    try {
      await db.collection('usuarios').doc(form.id).update({
        nombre: form.nombre,
        role: form.role,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      flash('✅ Perfil actualizado');
      setForm(null);
    } catch (e) {
      flash('No se pudo actualizar el perfil', true);
    }
  };
  const delUser = async u => {
    if (u.id === currentUser.uid) {
      flash('No puedes eliminarte', true);
      return;
    }
    await db.collection('usuarios').doc(u.id).delete();
    flash('Perfil eliminado. Borra también la cuenta en Firebase Console → Authentication.');
  };
  const startPin = () => {
    setPinStep('new1');
    setPinDigits('');
    setPinTmp('');
  };
  const onPinComplete = async val => {
    if (pinStep === 'new1') {
      setPinTmp(val);
      setPinDigits('');
      setPinStep('new2');
    } else {
      if (val !== pinTmp) {
        flash('Los PIN no coinciden', true);
        setPinStep('idle');
        setPinDigits('');
        return;
      }
      await savePin(currentUser.uid, val);
      flash('✅ PIN configurado');
      setPinStep('idle');
      setPinDigits('');
    }
  };
  const removePin = () => {
    clearPin(currentUser.uid);
    flash('PIN eliminado de este dispositivo');
  };
  return React.createElement("div", {
    style: {
      padding: '16px 12px'
    }
  }, React.createElement(Row, {
    style: {
      marginBottom: 16
    }
  }, React.createElement("button", {
    onClick: onBack,
    style: {
      background: 'none',
      border: 'none',
      color: 'var(--ink-soft)',
      cursor: 'pointer',
      fontSize: 22,
      padding: '0 4px 0 0',
      lineHeight: 1
    }
  }, "←"), React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 800
    }
  }, "⚙️ Configuración")), msg && React.createElement("div", {
    style: {
      background: 'var(--ok-bg)',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 13,
      color: 'var(--ok-text)',
      marginBottom: 12
    }
  }, msg), err && React.createElement("div", {
    style: {
      background: 'var(--danger-bg)',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 13,
      color: 'var(--danger-text)',
      marginBottom: 12
    }
  }, err), React.createElement(Row, {
    style: {
      gap: 6,
      marginBottom: 16
    }
  }, [['perfil', '👤 Perfil'], ...(isAdmin ? [['marca', '🎨 Marca']] : []), ...(permisoAcciones(currentUser).password ? [['password', '🔑 Contraseña']] : []), ['pin', '🔒 PIN'], ...(isAdmin ? [['usuarios', '👥 Usuarios'], ['vehiculos', '🚚 Vehículos'], ['permisos', '🔐 Permisos']] : [])].map(([v, l]) => React.createElement("button", {
    key: v,
    onClick: () => {
      setSub(v);
      setErr('');
      setMsg('');
    },
    style: {
      flex: 1,
      padding: '8px 2px',
      borderRadius: 8,
      border: 'none',
      background: sub === v ? 'var(--accent)' : 'var(--surface-2)',
      color: sub === v ? 'var(--ink)' : 'var(--ink-soft)',
      fontSize: 10,
      fontWeight: 700,
      cursor: 'pointer'
    }
  }, l))), sub === 'perfil' && React.createElement(React.Fragment, null, React.createElement(Card, null, React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: '12px 0 16px'
    }
  }, React.createElement("div", {
    style: {
      fontSize: 52,
      marginBottom: 8
    }
  }, "👤"), React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 700
    }
  }, currentUser.nombre), React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--ink-soft)',
      marginTop: 2
    }
  }, "✉️ ", currentUser.email), React.createElement(Tag, {
    color: roleColor(currentUser.role),
    style: {
      marginTop: 8,
      display: 'inline-block'
    }
  }, currentUser.role))), React.createElement(BOut, {
    onClick: onLogout,
    color: "var(--danger-text)",
    style: {
      width: '100%',
      marginTop: 8
    }
  }, "🚪 Cerrar sesión")), sub === 'marca' && isAdmin && React.createElement(Card, null,
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 } },
      React.createElement('img', { src: brandForm.logoPath, alt: 'Logo de ' + brandForm.nombreComercial, width: 64, height: 64, style: { width: 64, height: 64, borderRadius: 16, objectFit: 'cover', flexShrink: 0 } }),
      React.createElement('div', null,
        React.createElement('div', { style: { fontSize: 15, fontWeight: 800 } }, 'Marca visible al cliente'),
        React.createElement('div', { style: { fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.4, marginTop: 3 } }, 'Aparece en el inicio de sesión, encabezado y comprobantes. Flutt-Water permanece como identidad técnica de la aplicación.')
      )
    ),
    React.createElement(Lbl, null, 'Nombre comercial'), React.createElement(Inp, { value: brandForm.nombreComercial, maxLength: 80, placeholder: 'FluttWater Purificadora Hidequel', onChange: e => setBrandForm({ ...brandForm, nombreComercial: e.target.value }), style: { marginBottom: 10 } }),
    React.createElement(Lbl, null, 'Subtítulo o giro'), React.createElement(Inp, { value: brandForm.subtitulo, maxLength: 100, placeholder: 'Purificadora y reparto de agua', onChange: e => setBrandForm({ ...brandForm, subtitulo: e.target.value }), style: { marginBottom: 10 } }),
    React.createElement(Lbl, null, 'Lema opcional'), React.createElement(Inp, { value: brandForm.lema, maxLength: 120, placeholder: 'Agua limpia, siempre cerca', onChange: e => setBrandForm({ ...brandForm, lema: e.target.value }), style: { marginBottom: 10 } }),
    React.createElement(Lbl, null, 'Teléfono comercial'), React.createElement(Inp, { type: 'tel', value: brandForm.telefono, maxLength: 30, placeholder: '637 137 5399', onChange: e => setBrandForm({ ...brandForm, telefono: e.target.value }), style: { marginBottom: 12 } }),
    React.createElement(BFill, { onClick: saveBranding, style: { width: '100%' } }, '💾 Guardar personalización')
  ), sub === 'password' && React.createElement(Card, null, React.createElement(Lbl, null, "Contraseña actual"), React.createElement(PwInp, {
    value: pw.old,
    onChange: e => setPw(f => ({
      ...f,
      old: e.target.value
    }))
  }), React.createElement(Lbl, null, "Nueva contraseña"), React.createElement(PwInp, {
    value: pw.new_,
    onChange: e => setPw(f => ({
      ...f,
      new_: e.target.value
    }))
  }), React.createElement(Lbl, null, "Confirmar"), React.createElement(PwInp, {
    value: pw.conf,
    onChange: e => setPw(f => ({
      ...f,
      conf: e.target.value
    }))
  }), React.createElement(BFill, {
    onClick: changePw,
    style: {
      width: '100%',
      marginTop: 6
    }
  }, "🔑 Actualizar contraseña")), sub === 'pin' && React.createElement(Card, null, React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--ink-soft)',
      marginBottom: 16,
      lineHeight: 1.4
    }
  }, "El PIN es un candado local de este dispositivo: agiliza volver a entrar sin escribir tu contraseña cada vez. No la reemplaza ni se guarda en Firebase."), pinStep === 'idle' ? React.createElement(React.Fragment, null, React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      marginBottom: 12
    }
  }, hasPin ? '🔒 PIN activado en este dispositivo' : 'Sin PIN configurado en este dispositivo'), React.createElement(BFill, {
    onClick: startPin,
    style: {
      width: '100%'
    }
  }, hasPin ? 'Cambiar PIN' : 'Configurar PIN'), hasPin && React.createElement(BOut, {
    onClick: removePin,
    color: "var(--danger-text)",
    style: {
      width: '100%',
      marginTop: 8
    }
  }, "Quitar PIN")) : React.createElement("div", {
    style: {
      textAlign: 'center'
    }
  }, React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ink-faint)',
      marginBottom: 16,
      fontFamily: 'var(--font-mono)',
      textTransform: 'uppercase',
      letterSpacing: '.06em'
    }
  }, pinStep === 'new1' ? 'Elige un PIN de 4 dígitos' : 'Confírmalo'), React.createElement(PinPad, {
    len: 4,
    value: pinDigits,
    onChange: setPinDigits,
    onComplete: onPinComplete
  }), React.createElement("button", {
    onClick: () => {
      setPinStep('idle');
      setPinDigits('');
    },
    style: {
      background: 'none',
      border: 'none',
      color: 'var(--ink-soft)',
      fontSize: 12,
      cursor: 'pointer',
      marginTop: 18
    }
  }, "Cancelar"))), sub === 'vehiculos' && isAdmin && React.createElement(React.Fragment, null, React.createElement(Card, null, React.createElement(Row, { style: { justifyContent: 'space-between', gap: 8, marginBottom: 10 } }, React.createElement('div', null, React.createElement('strong', null, 'Vehículos autorizados'), React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-soft)', marginTop: 3 } }, 'Cada unidad conserva su medidor fijo y factor de conversión.')), React.createElement(BFill, { onClick: () => setVehicleForm({ nombre: '', placa: '', numeroSerie: '', factorLitrosPorUnidad: '10' }) }, '＋ Alta'))), vehicles.length === 0 ? React.createElement('div', { style: { color: 'var(--ink-faint)', fontSize: 12 } }, 'No hay vehículos registrados.') : vehicles.map(v => React.createElement(Card, { key: v.id }, React.createElement(Row, { style: { justifyContent: 'space-between' } }, React.createElement('div', null, React.createElement('strong', null, v.nombre), React.createElement('div', { style: { fontSize: 12, color: 'var(--ink-soft)', marginTop: 3 } }, `${v.placa || 'Sin placa'} · Medidor ${v.numeroSerieMedidor || 'Sin serie'}`)), React.createElement(Tag, { color: v.activo === false ? 'var(--danger-text)' : 'var(--ok-text)' }, v.activo === false ? 'INACTIVO' : 'ACTIVO')), React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-faint)', marginTop: 6 } }, `1 unidad del medidor = ${Number(v.factorLitrosPorUnidad || 10)} L`)))), sub === 'usuarios' && isAdmin && React.createElement(React.Fragment, null, React.createElement("div", {
    style: {
      background: 'var(--surface-2)',
      borderRadius: 8,
      padding: '10px 12px',
      fontSize: 12,
      color: 'var(--ink-soft)',
      marginBottom: 10
    }
  }, "Las cuentas nuevas se crean desde Firebase Console. Aquí solo se editan perfiles y roles."), React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ink-faint)',
      marginBottom: 10
    }
  }, "Mantén presionado un usuario para editarlo o eliminarlo."), users.map(u => {
    const expanded = expandedId === u.id;
    return React.createElement(Card, {
      key: u.id,
      style: {
        padding: 0,
        overflow: 'hidden'
      }
    }, React.createElement("div", {
      onMouseDown: () => startPress(u.id),
      onMouseUp: cancelPress,
      onMouseLeave: cancelPress,
      onTouchStart: () => startPress(u.id),
      onTouchEnd: cancelPress,
      onTouchMove: cancelPress,
      onClick: () => onUserTap(u.id),
      style: {
        padding: '12px 14px',
        cursor: 'pointer',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent'
      }
    }, React.createElement(Row, {
      style: {
        justifyContent: 'space-between'
      }
    }, React.createElement("div", null, React.createElement(Row, {
      style: {
        gap: 6,
        flexWrap: 'wrap'
      }
    }, React.createElement("span", {
      style: {
        fontWeight: 700,
        fontSize: 14
      }
    }, u.nombre), React.createElement(Tag, {
      color: roleColor(u.role)
    }, u.role), u.id === currentUser.uid && React.createElement(Tag, {
      color: "var(--ok-text)"
    }, "Tú")), React.createElement("div", {
      style: {
        fontSize: 12,
        color: 'var(--ink-soft)',
        marginTop: 2
      }
    }, "✉️ ", u.email)))), React.createElement("div", {
      style: {
        maxHeight: expanded ? 80 : 0,
        overflow: 'hidden',
        transition: 'max-height .2s ease'
      }
    }, React.createElement(Row, {
      style: {
        gap: 8,
        padding: '0 14px 12px'
      }
    }, React.createElement(BOut, {
      onClick: () => {
        setForm({
          id: u.id,
          nombre: u.nombre,
          email: u.email,
          role: u.role
        });
        setExpandedId(null);
      },
      style: {
        flex: 1
      }
    }, "✏️ Editar"), u.id !== currentUser.uid && React.createElement(BOut, {
      onClick: () => {
        if (window.confirm(`¿Eliminar el perfil de "${u.nombre}"? Esta acción no se puede deshacer.`)) {
          delUser(u);
        }
        setExpandedId(null);
      },
      color: "var(--danger-text)",
      style: {
        flex: 1
      }
    }, "🗑 Eliminar"))));
  })), sub === 'permisos' && isAdmin && React.createElement(Permisos, {
    currentUser: currentUser
  }), vehicleForm && React.createElement(Modal, { title: 'Alta de vehículo y medidor', onClose: () => setVehicleForm(null) }, React.createElement('div', { style: { fontSize: 12, color: 'var(--ink-soft)', marginBottom: 10 } }, 'Solo administración puede registrar unidades. El repartidor únicamente selecciona vehículos existentes.'), React.createElement(Lbl, null, 'Nombre de vehículo'), React.createElement(Inp, { value: vehicleForm.nombre, onChange: e => setVehicleForm({ ...vehicleForm, nombre: e.target.value }), placeholder: 'Pipa 01' }), React.createElement(Lbl, null, 'Placa'), React.createElement(Inp, { style: { marginTop: 8 }, value: vehicleForm.placa, onChange: e => setVehicleForm({ ...vehicleForm, placa: e.target.value }) }), React.createElement(Lbl, null, 'Número de serie del medidor'), React.createElement(Inp, { style: { marginTop: 8 }, value: vehicleForm.numeroSerie, onChange: e => setVehicleForm({ ...vehicleForm, numeroSerie: e.target.value }) }), React.createElement(Lbl, null, 'Litros por unidad de lectura'), React.createElement(Inp, { type: 'number', step: '0.01', style: { marginTop: 8 }, value: vehicleForm.factorLitrosPorUnidad, onChange: e => setVehicleForm({ ...vehicleForm, factorLitrosPorUnidad: e.target.value }) }), React.createElement(BFill, { onClick: saveVehicle, style: { width: '100%', marginTop: 14 } }, 'Guardar vehículo autorizado')), form && React.createElement(Modal, {
    title: 'Editar Usuario',
    onClose: () => {
      setForm(null);
      setErr('');
    }
  }, React.createElement(Lbl, null, "Nombre completo"), React.createElement(Inp, {
    value: form.nombre,
    onChange: e => setForm(f => ({
      ...f,
      nombre: e.target.value
    })),
    style: {
      marginBottom: 10
    }
  }), React.createElement(Lbl, null, "Correo electrónico"), React.createElement(Inp, {
    type: "email",
    value: form.email,
    disabled: !!form.id,
    onChange: e => setForm(f => ({
      ...f,
      email: e.target.value
    })),
    placeholder: "correo@ejemplo.com",
    style: {
      marginBottom: 10,
      opacity: form.id ? 0.6 : 1
    }
  }), React.createElement(Lbl, null, "Rol"), React.createElement("select", {
    value: form.role,
    onChange: e => setForm(f => ({
      ...f,
      role: e.target.value
    })),
    style: {
      background: 'var(--surface-2)',
      border: '1px solid var(--line-strong)',
      borderRadius: 8,
      padding: '8px 10px',
      color: 'var(--ink)',
      fontSize: 13,
      width: '100%',
      marginBottom: 16
    }
  }, React.createElement("option", {
    value: "usuario"
  }, "usuario"), React.createElement("option", {
    value: "repartidor"
  }, "repartidor"), React.createElement("option", {
    value: "admin"
  }, "admin")), form.id && React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ink-faint)',
      marginBottom: 12
    }
  }, "El correo y la contraseña solo los puede cambiar el propio usuario desde su pestaña de Contraseña."), React.createElement(BFill, {
    onClick: saveUser,
    style: {
      width: '100%'
    }
  }, "💾 Guardar cambios")));
}