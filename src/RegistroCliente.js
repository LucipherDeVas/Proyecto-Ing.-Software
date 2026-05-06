import { useState } from 'react';
import './RegistroCliente.css';

// Cambia a true cuando tengas la tabla en Supabase lista
const USAR_SUPABASE = false;

let supabase = null;
if (USAR_SUPABASE) {
  const { supabase: sb } = require('./lib/supabase');
  supabase = sb;
}

function RegistroCliente() {
  const [tipo, setTipo] = useState('empresa');
  const [mensaje, setMensaje] = useState({ texto: '', exito: null });
  const [cargando, setCargando] = useState(false);
  const [registros, setRegistros] = useState(() => {
    const guardados = localStorage.getItem('clientes_demo');
    return guardados ? JSON.parse(guardados) : [];
  });

  const [form, setForm] = useState({
    rut: '', correo: '', telefono: '', direccion: '',
    razon_social: '', giro: '', nombre_contacto: '', cargo_contacto: '',
    nombre: '', apellido: '',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.id]: e.target.value });
    setMensaje({ texto: '', exito: null });
  };

  const handleTipo = (t) => {
    setTipo(t);
    setForm({
      rut: '', correo: '', telefono: '', direccion: '',
      razon_social: '', giro: '', nombre_contacto: '', cargo_contacto: '',
      nombre: '', apellido: '',
    });
    setMensaje({ texto: '', exito: null });
  };

  const validar = () => {
    if (!form.rut.trim()) return 'El RUT es obligatorio.';
    if (tipo === 'empresa') {
      if (!form.razon_social.trim()) return 'La razón social es obligatoria.';
      if (!form.nombre_contacto.trim()) return 'El nombre de contacto es obligatorio.';
    } else {
      if (!form.nombre.trim()) return 'El nombre es obligatorio.';
      if (!form.apellido.trim()) return 'El apellido es obligatorio.';
      if (!form.correo.trim()) return 'El correo es obligatorio para personas.';
    }
    if (form.correo.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.correo.trim())) return 'Ingresa un correo electrónico válido.';
    }
    if (!USAR_SUPABASE) {
      const existe = registros.find(r => r.rut === form.rut.trim());
      if (existe) return 'Ya existe un registro con ese RUT.';
    }
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

    const datos = {
      tipo,
      rut: form.rut.trim(),
      correo: form.correo.trim() || null,
      telefono: form.telefono.trim() || null,
      direccion: form.direccion.trim() || null,
      ...(tipo === 'empresa'
        ? {
            razon_social: form.razon_social.trim(),
            giro: form.giro.trim() || null,
            nombre_contacto: form.nombre_contacto.trim(),
            cargo_contacto: form.cargo_contacto.trim() || null,
          }
        : {
            nombre: form.nombre.trim(),
            apellido: form.apellido.trim(),
          }),
    };

    try {
      if (USAR_SUPABASE) {
        const { error: sbError } = await supabase.from('clientes').insert([datos]);
        if (sbError) throw new Error(sbError.message);
      } else {
        await new Promise(r => setTimeout(r, 600));
        const nuevos = [...registros, { ...datos, id: Date.now(), created_at: new Date().toISOString() }];
        localStorage.setItem('clientes_demo', JSON.stringify(nuevos));
        setRegistros(nuevos);
      }

      setMensaje({
        texto: `✅ ${tipo === 'empresa' ? 'Empresa' : 'Persona'} registrada correctamente.${!USAR_SUPABASE ? ' (modo demo)' : ''}`,
        exito: true
      });
      setForm({
        rut: '', correo: '', telefono: '', direccion: '',
        razon_social: '', giro: '', nombre_contacto: '', cargo_contacto: '',
        nombre: '', apellido: '',
      });
    } catch (err) {
      setMensaje({ texto: ` Error: ${err.message}`, exito: false });
    } finally {
      setCargando(false);
    }
  };

  const eliminarDemo = (id) => {
    const nuevos = registros.filter(r => r.id !== id);
    localStorage.setItem('clientes_demo', JSON.stringify(nuevos));
    setRegistros(nuevos);
  };

  return (
    <div className="rc-container">
      <h1>Registro de Clientes</h1>
      <p className="rc-subtitulo">Registra una empresa o una persona natural en el sistema.</p>

      {!USAR_SUPABASE && (
        <div className="rc-banner-demo">
           Modo demo — los datos se guardan localmente en el navegador, aun no en la base de datos (hasta tener acceso xd).
        </div>
      )}

      <div className="rc-toggle">
        <button className={`rc-toggle-btn ${tipo === 'empresa' ? 'activo' : ''}`} onClick={() => handleTipo('empresa')}>
           Empresa
        </button>
        <button className={`rc-toggle-btn ${tipo === 'persona' ? 'activo' : ''}`} onClick={() => handleTipo('persona')}>
           Persona
        </button>
      </div>

      <div className="rc-form">
        <div className="rc-seccion">
          <h2 className="rc-seccion-titulo">Datos generales</h2>
          <div className="rc-grid">
            <div className="rc-campo">
              <label htmlFor="rut">RUT *</label>
              <input type="text" id="rut" value={form.rut} onChange={handleChange} placeholder="Ej: 12.345.678-9" />
            </div>
            <div className="rc-campo">
              <label htmlFor="telefono">Teléfono</label>
              <input type="text" id="telefono" value={form.telefono} onChange={handleChange} placeholder="+56 9 1234 5678" />
            </div>
            <div className="rc-campo rc-campo-ancho">
              <label htmlFor="direccion">Dirección</label>
              <input type="text" id="direccion" value={form.direccion} onChange={handleChange} placeholder="Av. Principal 123, Santiago" />
            </div>
          </div>
        </div>

        {tipo === 'empresa' && (
          <>
            <div className="rc-seccion">
              <h2 className="rc-seccion-titulo">Datos de la empresa</h2>
              <div className="rc-grid">
                <div className="rc-campo rc-campo-ancho">
                  <label htmlFor="razon_social">Razón social *</label>
                  <input type="text" id="razon_social" value={form.razon_social} onChange={handleChange} placeholder="Ej: Pesquera del Sur S.A." />
                </div>
                <div className="rc-campo rc-campo-ancho">
                  <label htmlFor="giro">Giro</label>
                  <input type="text" id="giro" value={form.giro} onChange={handleChange} placeholder="Ej: Venta de productos del mar" />
                </div>
                <div className="rc-campo rc-campo-ancho">
                  <label htmlFor="correo">Correo empresa</label>
                  <input type="email" id="correo" value={form.correo} onChange={handleChange} placeholder="ventas@empresa.cl" />
                </div>
              </div>
            </div>
            <div className="rc-seccion">
              <h2 className="rc-seccion-titulo">Contacto</h2>
              <div className="rc-grid">
                <div className="rc-campo">
                  <label htmlFor="nombre_contacto">Nombre contacto *</label>
                  <input type="text" id="nombre_contacto" value={form.nombre_contacto} onChange={handleChange} placeholder="Ej: Juan Pérez" />
                </div>
                <div className="rc-campo">
                  <label htmlFor="cargo_contacto">Cargo</label>
                  <input type="text" id="cargo_contacto" value={form.cargo_contacto} onChange={handleChange} placeholder="Ej: Gerente de ventas" />
                </div>
              </div>
            </div>
          </>
        )}

        {tipo === 'persona' && (
          <div className="rc-seccion">
            <h2 className="rc-seccion-titulo">Datos personales</h2>
            <div className="rc-grid">
              <div className="rc-campo">
                <label htmlFor="nombre">Nombre *</label>
                <input type="text" id="nombre" value={form.nombre} onChange={handleChange} placeholder="Ej: Juan" />
              </div>
              <div className="rc-campo">
                <label htmlFor="apellido">Apellido *</label>
                <input type="text" id="apellido" value={form.apellido} onChange={handleChange} placeholder="Ej: Pérez" />
              </div>
              <div className="rc-campo rc-campo-ancho">
                <label htmlFor="correo">Correo *</label>
                <input type="email" id="correo" value={form.correo} onChange={handleChange} placeholder="juan.perez@correo.com" />
              </div>
            </div>
          </div>
        )}

        <button className="rc-btn" onClick={handleEnviar} disabled={cargando}>
          {cargando ? 'Guardando...' : 'Registrar'}
        </button>

        {mensaje.texto && (
          <div className={`rc-mensaje ${mensaje.exito ? 'rc-exito' : 'rc-error'}`}>
            {mensaje.texto}
          </div>
        )}
      </div>

      {!USAR_SUPABASE && registros.length > 0 && (
        <div className="rc-lista-demo">
          <h2>Registros guardados (demo) — {registros.length}</h2>
          {registros.map(r => (
            <div key={r.id} className="rc-item-demo">
              <div className="rc-item-info">
                <span className={`rc-badge ${r.tipo}`}>{r.tipo === 'empresa' ? '🏢 Empresa' : '👤 Persona'}</span>
                <strong>{r.tipo === 'empresa' ? r.razon_social : `${r.nombre} ${r.apellido}`}</strong>
                <span className="rc-item-rut">{r.rut}</span>
                {r.correo && <span className="rc-item-extra">{r.correo}</span>}
              </div>
              <button className="rc-btn-eliminar" onClick={() => eliminarDemo(r.id)}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RegistroCliente;