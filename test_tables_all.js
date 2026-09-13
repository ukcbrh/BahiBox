import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('gst').select('*').limit(1);
  if (!error) console.log('gst exists');
  const { data: d2, error: e2 } = await supabase.from('gst_master').select('*').limit(1);
  if (!e2) console.log('gst_master exists');
  const { data: d3, error: e3 } = await supabase.from('gst_rates').select('*').limit(1);
  if (!e3) console.log('gst_rates exists');
  const { data: d4, error: e4 } = await supabase.from('tax_master').select('*').limit(1);
  if (!e4) console.log('tax_master exists', d4);
}
run();
