import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: ten } = await supabase.from('retail_customers').select('tenant_id').limit(1);
  if (!ten || ten.length === 0) return console.log("no tenant in retail_customers");
  const tenantId = ten[0].tenant_id;
  
  const { data: cust, error: insErr } = await supabase.from('retail_customers').insert({
    tenant_id: tenantId,
    customer_name: 'Delete Me',
    phone: '1231231234'
  }).select().single();
  
  if (insErr) return console.log("Cust insert err:", insErr);
  
  // wait to ensure triggers create wallet
  await new Promise(r => setTimeout(r, 1000));

  const { error: wErr } = await supabase.from('wallet_accounts').delete().eq('owner_id', cust.id);
  console.log("wallet del err:", wErr);
  
  const { error: cErr } = await supabase.from('credit_limits').delete().eq('customer_id', cust.id);
  console.log("credit del err:", cErr);

  const { error: rclErr } = await supabase.from('retail_customer_ledgers').delete().eq('customer_id', cust.id);
  console.log("ledger del err:", rclErr);

  const { error: delErr } = await supabase.from('retail_customers').delete().eq('id', cust.id);
  console.log("customer del err:", delErr);
}
run();
