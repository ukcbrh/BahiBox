import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
    console.error("Missing credentials");
    process.exit(1);
}
const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.rpc('execute_sql', { query: "SELECT is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='email'" });
  if (error) {
     console.error("RPC error:", error.message);
  } else {
     console.log("SQL Result:", data);
  }
}
run();
