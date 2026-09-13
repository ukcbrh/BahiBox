import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
async function run() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
  const { data, error } = await supabase.from('merchants').select('*').limit(1);
  console.log("Error:", error);
  console.log("Data:", data);
}
run();
