import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
  // Try to find if there is a 'wallet_accounts' referencing the customer
  const { data, error } = await supabase.from('wallet_accounts').select('id, owner_id').limit(1);
  console.log("wallet_accounts:", error ? error.message : "ok");
}
run();
