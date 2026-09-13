import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: users } = await supabase.from('users').select('id').limit(1);
  const userId = users && users[0] ? users[0].id : null;
  console.log("User ID:", userId);

  const { data: tenants } = await supabase.from('tenants').select('id').limit(1);
  const tenantId = tenants && tenants[0] ? tenants[0].id : null;
  console.log("Tenant ID:", tenantId);

  // Try insert with user id
  if (userId) {
     const res1 = await supabase.from('payment_orders').insert([{ tenant_id: userId, amount: 100, purpose: 'test', status: 'pending' }]);
     console.log("Insert with user id error:", res1.error);
  }

  // Try insert with tenant id
  if (tenantId) {
     const res2 = await supabase.from('payment_orders').insert([{ tenant_id: tenantId, amount: 100, purpose: 'test', status: 'pending' }]);
     console.log("Insert with tenant id error:", res2.error);
  }
}
run();
