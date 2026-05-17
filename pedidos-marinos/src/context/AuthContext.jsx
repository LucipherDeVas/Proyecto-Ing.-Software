import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [cargando, setCargando] = useState(true);

  const cargarCliente = async (userId) => {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('auth_user_id', userId)
      .maybeSingle();
    if (!error && data) setCliente(data);
    else setCliente(null);
  };

  useEffect(() => {
    // Obtener sesión actual al cargar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) cargarCliente(session.user.id);
      setCargando(false);
    });

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        cargarCliente(session.user.id);
      } else {
        setCliente(null);
      }
      setCargando(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, cliente, cargando, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);