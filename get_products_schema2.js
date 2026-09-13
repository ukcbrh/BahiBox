import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('products').select('*').limit(1);
  if (data) {
     const { data: d2, error: e2 } = await supabase.from('products').insert({ invalid_column_name_xyz: '123' }).select();
     console.log(e2);
  }
}
run();
