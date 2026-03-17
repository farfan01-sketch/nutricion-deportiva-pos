import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Only log errors if variables are truly missing and we are not in a placeholder state
if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
  if (import.meta.env.DEV) {
    console.warn('⚠️ VITE_SUPABASE_URL is missing. Please add it to your environment variables.');
  }
}

if (!supabaseAnonKey || supabaseAnonKey === 'placeholder-key') {
  if (import.meta.env.DEV) {
    console.warn('⚠️ VITE_SUPABASE_ANON_KEY is missing. Please add it to your environment variables.');
  }
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
);
