import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || 'https://matrhsaxqhkiblurpczo.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || 'sb_publishable_O7wjzST6KohORG--2DV_2Q_KnJJT47t';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase URL or Anon Key is missing. Please set them in your .env file.");
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
