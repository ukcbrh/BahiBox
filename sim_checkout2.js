import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: usersData } = await supabase.from('user_tenant_roles').select('user_id').limit(1);
  const realUserId = usersData[0].user_id;
  
  const tId = '54c9ce99-9606-4761-be38-6e576be8b7c9';
  const bId = '8f413366-f8a8-4caf-9ed5-09959b9f1975';
  
  const rpcParams = {
        p_tenant_id: tId,
        p_branch_id: bId,
        p_user_id: realUserId,
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
  console.log("858 quantity error:", error?.message);
  
  const rpcParams2 = { ...rpcParams, p_items: [{ product_id: '2a78e779-c41b-4b5a-a032-07146c0bdb03', quantity: 1 }] };
  const { data: data2, error: err2 } = await supabase.rpc('create_online_order', rpcParams2);
  console.log("1 quantity result:", data2, err2);
}
run();
