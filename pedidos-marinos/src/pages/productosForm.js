// src/pages/ProductosForm.js
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function ProductosForm() {
  const [productos, setProductos] = useState([]);
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);

  // Cargar productos al montar el componente
  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('id');
    
    if (error) {
      console.error(error);
      setMensaje('Error al cargar productos: ' + error.message);
    } else {
      setProductos(data || []);
    }
    setCargando(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje('');

    // Validaciones
    if (!nombre.trim()) {
      setMensaje('El nombre del producto es obligatorio');
      return;
    }
    const precioNum = parseFloat(precio);
    if (isNaN(precioNum) || precioNum <= 0) {
      setMensaje('Ingresa un precio válido (mayor a 0)');
      return;
    }

    try {
      if (editandoId !== null) {
        // Actualizar producto existente
        const { error } = await supabase
          .from('productos')
          .update({ nombre: nombre.trim(), precio_unitario: precioNum })
          .eq('id', editandoId);
        
        if (error) throw error;
        setMensaje('Producto actualizado correctamente');
        setEditandoId(null);
      } else {
        // Insertar nuevo producto
        const { error } = await supabase
          .from('productos')
          .insert([{ nombre: nombre.trim(), precio_unitario: precioNum }]);
        
        if (error) throw error;
        setMensaje('Producto agregado correctamente');
      }
      // Limpiar formulario y recargar lista
      setNombre('');
      setPrecio('');
      cargarProductos();
    } catch (error) {
      console.error(error);
      if (error.code === '23505') { // código de violación de unique constraint en PostgreSQL
        setMensaje('Ya existe un producto con ese nombre');
      } else {
        setMensaje('Error: ' + error.message);
      }
    }
  };

  const handleEditar = (producto) => {
    setNombre(producto.nombre);
    setPrecio(String(producto.precio_unitario));
    setEditandoId(producto.id);
    // Opcional: scroll al formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEliminar = async (id, nombreProducto) => {
    if (!window.confirm(`¿Eliminar el producto "${nombreProducto}" permanentemente?`)) return;
    
    setMensaje('');
    try {
      const { error } = await supabase
        .from('productos')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setMensaje('Producto eliminado');
      // Si estábamos editando justo ese producto, cancelar edición
      if (editandoId === id) {
        setEditandoId(null);
        setNombre('');
        setPrecio('');
      }
      cargarProductos();
    } catch (error) {
      console.error(error);
      setMensaje('Error al eliminar: ' + error.message);
    }
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setNombre('');
    setPrecio('');
    setMensaje('');
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
      <h2>Administración de Productos</h2>
      
      {/* Formulario para agregar/editar */}
      {/* Restyling visual al sistema "Floema": colores/bordes vía tokens.
          Estructura, handlers y estado SIN CAMBIOS. */}
      <form onSubmit={handleSubmit} style={{ marginBottom: '2rem', border: '1px solid var(--color-border)', background: 'var(--color-surface)', padding: '1rem', borderRadius: 'var(--r-md)' }}>
        <h3>{editandoId !== null ? 'Editar producto' : 'Agregar nuevo producto'}</h3>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.25rem' }}>Nombre del producto *</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Atún fresco"
            style={{ width: '100%', padding: '0.5rem' }}
            required
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.25rem' }}>Precio unitario (CLP) *</label>
          <input
            type="number"
            step="0.01"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            placeholder="0"
            style={{ width: '100%', padding: '0.5rem' }}
            required
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="submit" style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--color-fg)', color: 'var(--color-bg)', border: '1px solid var(--color-fg)', borderRadius: 'var(--r-pill)', cursor: 'pointer' }}>
            {editandoId !== null ? 'Actualizar' : 'Agregar'}
          </button>
          {editandoId !== null && (
            <button type="button" onClick={cancelarEdicion} style={{ padding: '0.5rem 1rem', backgroundColor: 'transparent', color: 'var(--color-fg)', border: '1px solid var(--color-fg-20)', borderRadius: 'var(--r-pill)', cursor: 'pointer' }}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* Mensajes informativos */}
      {mensaje && (
        <div style={{ marginBottom: '1rem', padding: '0.5rem', backgroundColor: 'var(--color-mist)', borderRadius: 'var(--r-xs)' }}>
          {mensaje}
        </div>
      )}

      {/* Listado de productos */}
      <h3>Productos existentes</h3>
      {cargando ? (
        <p>Cargando...</p>
      ) : productos.length === 0 ? (
        <p>No hay productos registrados. Agrega uno usando el formulario.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--color-mist)' }}>
              <th style={{ border: '1px solid var(--color-border)', padding: '8px', textAlign: 'left' }}>ID</th>
              <th style={{ border: '1px solid var(--color-border)', padding: '8px', textAlign: 'left' }}>Nombre</th>
              <th style={{ border: '1px solid var(--color-border)', padding: '8px', textAlign: 'left' }}>Precio unitario</th>
              <th style={{ border: '1px solid var(--color-border)', padding: '8px', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((prod) => (
              <tr key={prod.id}>
                <td style={{ border: '1px solid var(--color-border)', padding: '8px' }}>{prod.id}</td>
                <td style={{ border: '1px solid var(--color-border)', padding: '8px' }}>{prod.nombre}</td>
                <td style={{ border: '1px solid var(--color-border)', padding: '8px' }}>${prod.precio_unitario.toLocaleString()}</td>
                <td style={{ border: '1px solid var(--color-border)', padding: '8px', textAlign: 'center' }}>
                  <button
                    onClick={() => handleEditar(prod)}
                    style={{ marginRight: '0.5rem', padding: '0.25rem 0.5rem', backgroundColor: 'transparent', color: 'var(--color-fg)', border: '1px solid var(--color-fg-20)', borderRadius: 'var(--r-xs)', cursor: 'pointer' }}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleEliminar(prod.id, prod.nombre)}
                    style={{ padding: '0.25rem 0.5rem', backgroundColor: 'var(--color-orange)', color: 'white', border: '1px solid var(--color-orange)', borderRadius: 'var(--r-xs)', cursor: 'pointer' }}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}