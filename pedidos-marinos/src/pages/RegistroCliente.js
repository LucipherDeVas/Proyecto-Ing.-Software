import { useState } from 'react';
import { supabase } from '../lib/supabase';
import './css/RegistroCliente.css';

function formatearRut(raw) {
  const limpio = (raw || '').replace(/[^0-9kK]/g, '').toUpperCase();
  if (limpio.length === 0) return '';
  if (limpio.length === 1) return limpio;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  let cuerpoFormat = '';
  for (let i = cuerpo.length; i > 0; i -= 3) {
    const start = Math.max(0, i - 3);
    cuerpoFormat = cuerpo.slice(start, i) + (cuerpoFormat ? '.' + cuerpoFormat : '');
  }
  return `${cuerpoFormat}-${dv}`;
}

const FORM_INICIAL = {
  rut: '',
  nombre: '',
  apellido: '',
  correo: '',
  direccion: '',
  password: '',
  confirmarPassword: '',
};

function RegistroCliente() {
  const [form, setForm] = useState({ ...FORM_INICIAL });
  const [mensaje, setMensaje] = useState({ texto: '', exito: null });
  const [cargando, setCargando] = useState(false);

  const handleChange = (e) => {
    const { id, value } = e.target;
    let val = value;
    if (id === 'rut') val = formatearRut(val);
    setForm({ ...form, [id]: val });
    setMensaje({ texto: '', exito: null });
  };

  const validar = () => {
    if (!form.rut.trim()) return 'El RUT es obligatorio.';
    const rutRegex = /^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/;
    if (!rutRegex.test(form.rut.trim())) return 'Formato de RUT inválido (ej: 12.345.678-9).';
    if (!form.nombre.trim()) return 'El nombre es obligatorio.';
    if (!form.apellido.trim()) return 'El apellido es obligatorio.';
    if (!form.correo.trim()) return 'El correo es obligatorio.';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.correo.trim())) return 'Correo electrónico inválido.';
    if (!form.password) return 'Debes ingresar una contraseña.';
    if (form.password.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
    if (form.password !== form.confirmarPassword) return 'Las contraseñas no coinciden.';
    return null;
  };

  const handleEnviar = async () => {
    const error = validar();
    if (error) {
      setMensaje({ texto: error, exito: false });
      return;
    }

    setCargando(true);
    setMensaje({ texto: '', exito: null });

    // Solo los campos que existen en la tabla clientes
    const datosCliente = {
      tipo: 'persona',
      rut: form.rut.trim(),
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      correo: form.correo.trim(),
      direccion: form.direccion.trim() || null,
      limite_deuda: 100000,   // valor fijo
      deuda_actual: 0,
      activo: true,
      // No enviamos telefono, fecha_vencimiento, ni campos de empresa
    };

    try {
      // Verificar duplicados
      const { data: existenteRut } = await supabase
        .from('clientes')
        .select('id')
        .eq('rut', datosCliente.rut)
        .maybeSingle();
      if (existenteRut) throw new Error('Ya existe un cliente con ese RUT.');

      const { data: existenteCorreo } = await supabase
        .from('clientes')
        .select('id')
        .eq('correo', datosCliente.correo)
        .maybeSingle();
      if (existenteCorreo) throw new Error('Ya existe un cliente con ese correo.');

      // Crear usuario en Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: datosCliente.correo,
        password: form.password,
        options: { data: { rol: 'cliente' } }
      });
      if (authError) throw new Error(`Error creando cuenta: ${authError.message}`);

      // Insertar cliente con auth_user_id
      const { error: insertError } = await supabase.from('clientes').insert([{
        ...datosCliente,
        auth_user_id: authData.user.id,
      }]);
      if (insertError) throw new Error(insertError.message);

      setMensaje({
        texto: `✅ Registro exitoso. Ya puedes iniciar sesión con ${datosCliente.correo}.`,
        exito: true,
      });
      setForm({ ...FORM_INICIAL });
    } catch (err) {
      console.error(err);
      if (err.message.includes('email rate limit exceeded')) {
        setMensaje({ texto: '❌ Demasiados intentos. Espera unos minutos o usa otro correo.', exito: false });
      } else {
        setMensaje({ texto: `❌ Error: ${err.message}`, exito: false });
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="rc-container">
      <h1>Registro de Cliente</h1>
      <p className="rc-subtitulo">Completa tus datos para crear una cuenta.</p>

      <div className="rc-form">
        <div className="rc-seccion">
          <h2 className="rc-seccion-titulo">Datos personales</h2>
          <div className="rc-grid">
            <div className="rc-campo">
              <label htmlFor="rut">RUT *</label>
              <input type="text" id="rut" value={form.rut} onChange={handleChange} placeholder="Ej: 12.345.678-9" maxLength={12} />
            </div>
            <div className="rc-campo">
              <label htmlFor="nombre">Nombre *</label>
              <input type="text" id="nombre" value={form.nombre} onChange={handleChange} />
            </div>
            <div className="rc-campo">
              <label htmlFor="apellido">Apellido *</label>
              <input type="text" id="apellido" value={form.apellido} onChange={handleChange} />
            </div>
            <div className="rc-campo">
              <label htmlFor="correo">Correo *</label>
              <input type="email" id="correo" value={form.correo} onChange={handleChange} />
            </div>
            <div className="rc-campo rc-campo-ancho">
              <label htmlFor="direccion">Dirección</label>
              <input type="text" id="direccion" value={form.direccion} onChange={handleChange} />
            </div>
          </div>
        </div>

        <div className="rc-seccion">
          <h2 className="rc-seccion-titulo">Límite de deuda</h2>
          <div className="rc-campo">
            <label>Monto máximo de crédito</label>
            <input type="text" value="$100.000" readOnly disabled style={{ backgroundColor: 'var(--color-mist)' }} />
            <small>Valor fijo asignado por la empresa.</small>
          </div>
        </div>

        <div className="rc-seccion">
          <h2 className="rc-seccion-titulo">Cuenta de acceso</h2>
          <div className="rc-grid">
            <div className="rc-campo">
              <label htmlFor="password">Contraseña *</label>
              <input type="password" id="password" value={form.password} onChange={handleChange} />
            </div>
            <div className="rc-campo">
              <label htmlFor="confirmarPassword">Confirmar contraseña *</label>
              <input type="password" id="confirmarPassword" value={form.confirmarPassword} onChange={handleChange} />
            </div>
          </div>
          <small>Usarás esta contraseña para iniciar sesión.</small>
        </div>

        <button className="rc-btn" onClick={handleEnviar} disabled={cargando}>
          {cargando ? 'Registrando...' : 'Registrar'}
        </button>

        {mensaje.texto && (
          <div className={`rc-mensaje ${mensaje.exito ? 'rc-exito' : 'rc-error'}`}>
            {mensaje.texto}
          </div>
        )}
      </div>
    </div>
  );
}

export default RegistroCliente;