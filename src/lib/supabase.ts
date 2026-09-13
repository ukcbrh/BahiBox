/// <reference types="vite/client" />

import { createClient } from '@supabase/supabase-js';

let supabaseInstance: any = (window as any).__supabaseInstance || null;

export const getSupabaseClient = () => {
  if (supabaseInstance) return supabaseInstance;
  
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (url && key) {
    supabaseInstance = createClient(url, key);
    (window as any).__supabaseInstance = supabaseInstance;
    return supabaseInstance;
  }
  return null;
};

export const supabase = getSupabaseClient();
