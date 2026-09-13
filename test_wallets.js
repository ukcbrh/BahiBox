import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data: { user }, error: signInErr } = await supabase.auth.signInWithPassword({
    email: 'ukcbrh@gmail.com',
    password: 'Password123!'
  });
  const { data: wallets, error } = await supabase.from('wallet_accounts').select('*').limit(5);
  console.log("wallets:", wallets, error);
}
run();
