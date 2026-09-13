import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { createRazorpayOrder } from './_razorpay-helper';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { plan_id, billing_cycle, tenant_id, branch_id, promo_code } = req.body;
    if (!tenant_id) {
      return res.status(400).json({ error: 'Could not identify your business account, please log out and log in again' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL!;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('price_monthly, price_yearly, module_name, name')
      .eq('id', plan_id)
      .single();

    if (planError || !plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    let price = billing_cycle === 'yearly' ? plan.price_yearly : plan.price_monthly;

    if (promo_code) {
      const { data: coupon } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', String(promo_code).toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (coupon) {
        const moduleMatch = coupon.applicable_module === 'All' || coupon.applicable_module === plan.module_name;
        const planMatch = coupon.applicable_plan === 'All' || coupon.applicable_plan === plan.name;
        if (moduleMatch && planMatch) {
          const discountType = coupon.discount_type || (coupon.discount_percentage ? 'percentage' : 'fixed');
          const discountValue = coupon.discount_value ?? coupon.discount_percentage ?? coupon.fixed_discount ?? 0;
          const discountAmount = discountType === 'percentage' ? (price * Number(discountValue)) / 100 : Number(discountValue);
          price = Math.max(0, price - discountAmount);
        }
      }
    }

    if (price <= 0) {
      return res.status(400).json({ error: 'This plan is free after discount. Please use the free-activation flow.' });
    }

    const amount = price * 100;

    const rzpOrder = await createRazorpayOrder(amount, {
      tenant_id,
      plan_id,
      billing_cycle,
      purpose: 'platform_subscription'
    });

    const { data: paymentOrderId, error: orderError } = await supabase.rpc('create_payment_order', {
      p_tenant_id: tenant_id,
      p_branch_id: branch_id || null,
      p_purpose: 'platform_subscription',
      p_amount: price,
      p_reference_type: 'subscription_plan',
      p_reference_id: plan_id,
      p_payer_type: 'tenant',
      p_payer_id: tenant_id,
      p_razorpay_order_id: rzpOrder.id
    });

    if (orderError) {
      throw orderError;
    }

    res.json({
      razorpay_order_id: rzpOrder.id,
      razorpay_key_id: process.env.RAZORPAY_KEY_ID,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      payment_order_id: paymentOrderId
    });

  } catch (err: any) {
    console.error('Error creating order:', err.message);
    res.status(500).json({ error: err.message });
  }
}
