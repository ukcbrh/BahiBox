import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: tenants } = await supabase.from('tenants').select('id').limit(1);
  if (!tenants || !tenants.length) return console.log('no tenants');
  const tenantId = tenants[0].id;
  
  const { data: plans } = await supabase.from('subscription_plans').select('id').limit(1);
  const planId = plans[0].id;

  const { data: orderId } = await supabase.rpc('create_payment_order', {
    p_tenant_id: tenantId,
    p_branch_id: null,
    p_purpose: 'platform_subscription',
    p_amount: 99,
    p_reference_type: 'subscription_plan',
    p_reference_id: planId,
    p_payer_type: 'tenant',
    p_payer_id: tenantId,
    p_razorpay_order_id: 'order_test123_' + Date.now()
  });
  
  if (orderId) {
    const { data: capData, error: capError } = await supabase.rpc('capture_payment', {
        p_payment_order_id: orderId,
        p_razorpay_payment_id: 'pay_test123',
        p_method: 'razorpay',
        p_gateway_fee: 0,
        p_raw_response: {notes: {billing_cycle: 'yearly'}}
    });
    console.log('Capture:', capData, capError);
    
    const { data: subs } = await supabase.from('merchant_subscriptions').select('*').eq('tenant_id', tenantId);
    console.log('Subs:', subs);
  } else {
    console.log('Order creation failed');
  }
}
run();
