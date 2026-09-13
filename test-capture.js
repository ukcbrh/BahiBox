import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'password123'
  }); // Just skip auth for this test, call RPC directly and see RLS error or other error
  
  // Create a dummy order via create_payment_order
  const { data: orderId, error: orderError } = await supabase.rpc('create_payment_order', {
    p_tenant_id: '123e4567-e89b-12d3-a456-426614174000',
    p_branch_id: null,
    p_purpose: 'platform_subscription',
    p_amount: 99,
    p_reference_type: 'subscription_plan',
    p_reference_id: '123e4567-e89b-12d3-a456-426614174001',
    p_payer_type: 'tenant',
    p_payer_id: '123e4567-e89b-12d3-a456-426614174000',
    p_razorpay_order_id: 'order_test123'
  });
  
  console.log('Order:', orderId, orderError);
  
  if (orderId) {
    const { data: capData, error: capError } = await supabase.rpc('capture_payment', {
        p_payment_order_id: orderId,
        p_razorpay_payment_id: 'pay_test123',
        p_method: 'razorpay',
        p_gateway_fee: 0,
        p_raw_response: {notes: {billing_cycle: 'monthly'}}
    });
    console.log('Capture:', capData, capError);
  }
}
run();
