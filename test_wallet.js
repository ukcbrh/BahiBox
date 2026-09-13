import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data: users } = await supabase.from('users').select('tenant_id').limit(1);
  // since this fails, let's just query a valid tenant_id from branches
  const { data: b } = await supabase.from('branches').select('tenant_id').limit(1);
  if (!b || b.length === 0) return console.log("no branch");
  const t = b[0].tenant_id;
  
  const { data: ins, error: errIns } = await supabase.from('retail_customers').insert({
    tenant_id: t,
    customer_name: 'Test Delete Wallet',
    phone: '9999999991'
  }).select('*').single();
  
  if (errIns) {
    console.log("insert err", errIns);
    return;
  }
  
  console.log("inserted customer", ins.id);
  
  const { data: wallets } = await supabase.from('wallet_accounts').select('*').eq('owner_id', ins.id);
  console.log("wallets found:", wallets);
  
  const { error: delErr } = await supabase.from('retail_customers').delete().eq('id', ins.id);
  console.log("delete err", delErr);
}
run();
