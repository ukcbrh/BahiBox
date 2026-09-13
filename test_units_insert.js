import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('units').insert({ tenant_id: '809312b9-dc7a-4cbf-8bb8-86d1a97dce51', unit_name: 'Test', unit_symbol: 'Test', unit_type: 'weight' }).select();
  console.log("INSERT DATA:", data);
  console.log("INSERT ERROR:", error);
}
run();
