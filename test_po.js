import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // let's try to fetch a payment_order to see what tenant_id it has
  const { data, error } = await supabase.from('payment_orders').select('*').limit(1);
  console.log("Error:", error);
  console.log("Data:", data);
}
run();
