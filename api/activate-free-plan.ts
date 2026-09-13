import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { plan_id, tenant_id, promo_code } = req.body;

    if (!tenant_id || !plan_id) {
      return res.status(400).json({ error: 'Missing tenant or plan details' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL!;
    const supabaseAnon = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY!);

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: roleCheck } = await supabaseAnon
      .from('user_tenant_roles')
      .select('id')
      .eq('user_id', user.id)
      .eq('tenant_id', tenant_id)
      .limit(1);

    const { data: adminCheck } = await supabaseAnon.rpc('is_platform_admin', { p_user_id: user.id }).single();

    if ((!roleCheck || roleCheck.length === 0) && !adminCheck) {
      return res.status(403).json({ error: 'You are not authorized to activate a plan for this business account' });
    }

    // SECURITY-FIX: verify server-side this plan is ACTUALLY free (or a valid 
    // promo brings it to zero) — never trust the client's say-so
    const { data: plan, error: planError } = await supabaseAnon
      .from('subscription_plans')
      .select('price_monthly, module_name, name')
      .eq('id', plan_id)
      .single();

    if (planError || !plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    let price = Number(plan.price_monthly) || 0;

    if (price > 0 && promo_code) {
      const { data: coupon } = await supabaseAnon
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

    if (price > 0) {
      return res.status(400).json({ error: 'This plan requires payment. Please complete checkout via Razorpay.' });
    }

    const supabaseAdmin = createClient(supabaseUrl, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!);

    const v_start_date = new Date();
    const v_end_date = new Date();
    v_end_date.setFullYear(v_end_date.getFullYear() + 10);

    const { data: existing } = await supabaseAdmin.from('merchant_subscriptions')
      .select('id')
      .eq('tenant_id', tenant_id)
      .in('status', ['active', 'trialing', 'past_due'])
      .limit(1);

    if (existing && existing.length > 0) {
      await supabaseAdmin.from('merchant_subscriptions').update({
        plan_id,
        billing_cycle: 'monthly',
        status: 'active',
        current_period_start: v_start_date.toISOString(),
        current_period_end: v_end_date.toISOString(),
        next_renewal_date: v_end_date.toISOString(),
        updated_at: new Date().toISOString()
      }).eq('tenant_id', tenant_id).in('status', ['active', 'trialing', 'past_due']);
    } else {
      await supabaseAdmin.from('merchant_subscriptions').insert({
        tenant_id,
        plan_id,
        billing_cycle: 'monthly',
        status: 'active',
        current_period_start: v_start_date.toISOString(),
        current_period_end: v_end_date.toISOString(),
        next_renewal_date: v_end_date.toISOString()
      });
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error('Error activating free plan:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}
