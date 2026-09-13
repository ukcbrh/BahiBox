import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data: gst, error: e1 } = await supabase.from('gst_slabs').select('*').limit(1);
  console.log("gst_slabs:", e1 ? e1.message : gst);
}
run();
