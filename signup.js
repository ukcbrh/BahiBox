import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const email = `test_agent_${Date.now()}@example.com`;
  const { data, error } = await supabase.auth.signUp({
    email,
    password: 'Password123!',
    options: {
      data: { full_name: 'Test Agent', role: 'merchant' }
    }
  });
  
  if (error) {
    console.log("Signup error:", error);
    return;
  }
  
  console.log("User:", data.user.id);
  
  // Wait a few seconds for triggers to create tenant
  await new Promise(r => setTimeout(r, 2000));
  
  // Get tenant ID
  const { data: utr } = await supabase.from('user_tenant_roles').select('tenant_id').eq('user_id', data.user.id).single();
  if (!utr) {
    console.log("No tenant found");
    return;
  }
  const tenantId = utr.tenant_id;
  console.log("Tenant:", tenantId);
  
  // Insert customer
  const { data: cust, error: insErr } = await supabase.from('retail_customers').insert({
    tenant_id: tenantId,
    customer_name: 'Delete Me',
    phone: '1231231234'
  }).select().single();
  
  if (insErr) {
    console.log("Cust insert err:", insErr);
    return;
  }
  
  console.log("Customer inserted:", cust.id);
  
  // Delete customer
  const { error: delErr } = await supabase.from('retail_customers').delete().eq('id', cust.id);
  if (delErr) {
    console.log("Delete error!");
    console.log("Code:", delErr.code);
    console.log("Message:", delErr.message);
    console.log("Details:", delErr.details);
  } else {
    console.log("Deleted successfully!");
  }
  
  // Let's also do a supplier
  const { data: supp, error: suppIns } = await supabase.from('suppliers').insert({
    tenant_id: tenantId,
    supplier_name: 'Delete Me Supp',
    contact_phone: '1231231235'
  }).select().single();
  
  if (!suppIns) {
     const { error: sDel } = await supabase.from('suppliers').delete().eq('id', supp.id);
     if (sDel) {
       console.log("Supplier delete err:", sDel);
     } else {
       console.log("Supplier deleted successfully");
     }
  }
}
run();
