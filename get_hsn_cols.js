import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('hsn_sac_master').select('*').limit(1);
  if(data) {
     const { data: d2 } = await supabase.from('hsn_sac_master').insert({ tenant_id: '123' }).select();
     // Will throw error with column info if fails
  }
}
run();
