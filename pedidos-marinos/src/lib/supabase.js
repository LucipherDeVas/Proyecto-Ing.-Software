// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Faltan REACT_APP_SUPABASE_URL o REACT_APP_SUPABASE_PUBLISHABLE_KEY en pedidos-marinos/.env'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
