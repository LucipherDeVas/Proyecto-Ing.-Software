import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ediknsdqsxtyidfooxug.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkaWtuc2Rxc3h0eWlkZm9veHVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5Mzk0ODEsImV4cCI6MjA5MzUxNTQ4MX0.z2GfimIyOs-7XFoDnz9LvvbAATvKaZZag4aAPcxRUsk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);