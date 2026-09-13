import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('customer_ledgers').select('*').limit(1);
  console.log("customer_ledgers:", error ? error.message : "ok");
  const { data: d2, error: e2 } = await supabase.from('retail_customer_ledgers').select('*').limit(1);
  console.log("retail_customer_ledgers:", e2 ? e2.message : "ok");
}
run();
