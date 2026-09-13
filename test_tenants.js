import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
async function run() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
  const { data, error } = await supabase.from('tenants').select('*').eq('id', 'e41760ad-eeb6-4a7d-a5e1-c2538b85c94b');
  console.log("Error:", error);
  console.log("Data:", data);
}
run();
