import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("Signing up...");
  const email = `testmerchant${Date.now()}@example.com`;
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: 'Password123!',
    options: {
      data: {
        full_name: 'Test Merchant',
        role: 'merchant'
      }
    }
  });

  const currentUserId = authData.user.id;
  const { data: { session } } = await supabase.auth.getSession();

  const { data: newTenantId, error: bootstrapError } = await supabase.rpc('bootstrap_merchant_tenant', {
    p_user_id: currentUserId,
    p_business_name: 'Test Business',
    p_business_type: 'retail'
  });

  const { data: roles } = await supabase.from('user_tenant_roles').select('tenant_id').eq('user_id', currentUserId).eq('role_name', 'owner');
  const resolvedTenantId = roles?.[0]?.tenant_id;
  
  const { data: matchedPlans } = await supabase.from('subscription_plans').select('id').eq('module_name', 'Retail POS').eq('name', 'Growth Plan');
  const planId = matchedPlans?.[0]?.id;
  
  // Now call edge function
  console.log("Calling API create-razorpay-order with planId", planId);
  const res = await fetch('http://localhost:3000/api/create-razorpay-order', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || ''}`
    },
    body: JSON.stringify({
        plan_id: planId,
        billing_cycle: 'monthly',
        tenant_id: resolvedTenantId,
        branch_id: null
    })
  });
  
  const responseData = await res.text();
  console.log("API Response Status:", res.status);
  console.log("API Response Data:", responseData);
}
run();
