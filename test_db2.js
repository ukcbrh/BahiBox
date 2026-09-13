import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.rpc('get_tables'); // Or just fetch a list of tables if we have a way. 
  // Let's try to query 'gst_rates' or 'taxes'
  const { data: gst, error: e1 } = await supabase.from('gst_rates').select('*').limit(1);
  console.log("gst_rates:", e1 ? e1.message : gst);
  const { data: tax, error: e2 } = await supabase.from('taxes').select('*').limit(1);
  console.log("taxes:", e2 ? e2.message : tax);
}
run();
