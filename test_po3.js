import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const tenantId = '54c9ce99-9606-4761-be38-6e576be8b7c9';
  const res2 = await supabase.from('payment_orders').insert([{ tenant_id: tenantId, amount: 100, purpose: 'platform_subscription', status: 'pending' }]);
  console.log("Insert with valid tenant id error:", res2.error);
}
run();
