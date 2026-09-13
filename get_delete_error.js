import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data: { user }, error: signInErr } = await supabase.auth.signInWithPassword({
    email: 'ukcbrh@gmail.com',
    password: 'Password123!' // Try default password, if it fails we can't test
  });
  
  if (signInErr) {
    console.log("Sign in failed:", signInErr.message);
    return;
  }
  
  const { data: c } = await supabase.from('retail_customers').select('*');
  console.log("Found", c?.length, "customers");
  
  for (const cust of c || []) {
    const { error: delErr } = await supabase.from('retail_customers').delete().eq('id', cust.id);
    if (delErr) {
       console.log("Customer", cust.customer_name, "delete err:", delErr);
    } else {
       console.log("Customer", cust.customer_name, "deleted successfully");
    }
  }
}
run();
