import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const tId = '54c9ce99-9606-4761-be38-6e576be8b7c9';
  const bId = '8f413366-f8a8-4caf-9ed5-09959b9f1975';
  // Note: user_id needs to be valid? We don't have a user token in this node script easily.
  // wait, the RPC is SECURITY DEFINER, so we could just pass any UUID if anon can execute it.
  // BUT the RLS on `orders` and `order_items`? The RPC runs as SECURITY DEFINER so it bypasses RLS for the insert.
  
  const { data: users } = await supabase.auth.admin.listUsers();
  // We can't use admin here since VITE_SUPABASE_ANON_KEY is anon key. 
  // We'll just generate a fake UUID for user_id to test if RPC rejects stock.
  
  const rpcParams = {
        p_tenant_id: tId,
        p_branch_id: bId,
        p_user_id: '123e4567-e89b-12d3-a456-426614174000',
        p_customer_name: 'Test',
        p_customer_phone: '123',
        p_delivery_address: 'Addr',
        p_payment_method: 'cod',
        p_items: [{
          product_id: '2a78e779-c41b-4b5a-a032-07146c0bdb03',
          quantity: 858
        }]
  };
  
  const { data, error } = await supabase.rpc('create_online_order', rpcParams);
  console.log("data:", data, "error:", error);
}
run();
