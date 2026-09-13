import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const email = `test_agent_${Date.now()}@example.com`;
  const { data, error } = await supabase.auth.signUp({
    email,
    password: 'Password123!',
    options: { data: { full_name: 'Test Agent', role: 'merchant' } }
  });
  
  if (error) return console.log("Signup error:", error);
  console.log("User:", data.user.id);
  
  let tenantId = null;
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const { data: utr } = await supabase.from('user_tenant_roles').select('tenant_id').eq('user_id', data.user.id).single();
    if (utr) { tenantId = utr.tenant_id; break; }
  }
  
  if (!tenantId) return console.log("No tenant found");
  console.log("Tenant:", tenantId);
  
  const { data: cust, error: insErr } = await supabase.from('retail_customers').insert({
    tenant_id: tenantId, customer_name: 'Delete Me', phone: '1231231234'
  }).select().single();
  
  if (insErr) return console.log("Cust insert err:", insErr);
  console.log("Customer inserted:", cust.id);
  
  await new Promise(r => setTimeout(r, 1000));
  
  const { error: wErr } = await supabase.from('wallet_accounts').delete().eq('owner_id', cust.id);
  console.log("wallet del err:", wErr);
  
  const { error: cErr } = await supabase.from('credit_limits').delete().eq('customer_id', cust.id);
  console.log("credit del err:", cErr);

  const { error: delErr } = await supabase.from('retail_customers').delete().eq('id', cust.id);
  console.log("customer del err:", delErr);
}
run();
