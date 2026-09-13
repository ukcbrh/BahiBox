import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data: { user }, error: signInErr } = await supabase.auth.signInWithPassword({
    email: 'test_agent_1739097746401@example.com',
    password: 'Password123!'
  });
  
  if (signInErr) {
    console.log("SignIn error:", signInErr);
    return;
  }
  
  const { data, error } = await supabase.from('credit_limits').select('*').limit(1);
  console.log("credit_limits table?", error ? error.message : "Exists!");
}
run();
