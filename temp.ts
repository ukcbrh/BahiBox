import http from 'http';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import crypto from 'crypto';
import { createClient } from "@supabase/supabase-js";

// Use a simple fetch to Razorpay API for order creation
async function createRazorpayOrder(amount: number, notes: any) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  
  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials missing');
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`
    },
    body: JSON.stringify({
      amount: Math.round(amount), // paise
      currency: 'INR',
      notes
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Razorpay API error: ${errorText}`);
  }
  
  return await response.json();
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = 3000;

  // Webhook needs raw body for signature verification
  app.post('/api/razorpay-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    console.log('--- INCOMING WEBHOOK ---');
    console.log('Headers:', req.headers);
    console.log('Raw Body length:', req.body ? req.body.length : 0);
    if (req.body) console.log('Raw Body:', req.body.toString());
    console.log('------------------------');
    
    try {
      const signature = req.headers['x-razorpay-signature'] as string;
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
      
      if (!secret) {
        console.error('Webhook secret not configured');
        return res.status(500).send('Configuration Error');
      }

      const expectedSignature = crypto.createHmac('sha256', secret)
                                      .update(req.body)
                                      .digest('hex');

      if (signature !== expectedSignature) {
        return res.status(400).send('Invalid Signature');
      }

      const payload = JSON.parse(req.body.toString());
      console.log('Received Razorpay Webhook:', payload.event);

      if (payload.event === 'payment.captured') {
        const payment = payload.payload.payment.entity;
        
        // Import supabase client dynamically to avoid issues if not used
        
        const supabase = createClient(
          process.env.VITE_SUPABASE_URL!, 
          process.env.VITE_SUPABASE_SERVICE_ROLE_KEY! || process.env.VITE_SUPABASE_ANON_KEY!
        );

        // Extract required data
        const razorpay_order_id = payment.order_id;
        const razorpay_payment_id = payment.id;
        const method = payment.method;
        const gateway_fee = (payment.fee || 0) / 100; // paise to INR
        
        // Log event for audit
        await supabase.from('payment_webhook_events').insert({
          event_type: payload.event,
          payload: payload
        });

        // Get payment_order_id
        const { data: orderData } = await supabase
          .from('payment_orders')
          .select('id')
          .eq('razorpay_order_id', razorpay_order_id)
          .single();

        if (orderData) {
          // Call capture_payment RPC
          await supabase.rpc('capture_payment', {
            p_payment_order_id: orderData.id,
            p_razorpay_payment_id: razorpay_payment_id,
            p_method: method,
            p_gateway_fee: gateway_fee,
            p_raw_response: payload
          });
        } else {
          console.log(`Payment order not found for razorpay_order_id: ${razorpay_order_id}`);
        }
      }

      res.status(200).send('OK');
    } catch (err: any) {
      console.error('Webhook error:', err.message);
      res.status(200).send('Handled with error'); // Always return 200 to Razorpay
    }
  });

  // Regular JSON parser for other routes
  app.use(express.json());

  app.post('/api/create-razorpay-order', async (req, res) => {
    try {
      const { plan_id, billing_cycle, tenant_id, branch_id } = req.body;

      if (!tenant_id) {
        return res.status(400).json({ error: 'Could not identify your business account, please log out and log in again' });
      }
      
      
      const supabaseUrl = process.env.VITE_SUPABASE_URL!;
      const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Verify Auth (using the token passed in header)
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      if (authError || !user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Fetch plan price
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('price_monthly, price_yearly')
        .eq('id', plan_id)
        .single();
        
      if (planError || !plan) {
        return res.status(404).json({ error: 'Plan not found' });
      }

      const price = billing_cycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
      const amount = price * 100; // paise

      // Create Razorpay Order
      const rzpOrder = await createRazorpayOrder(amount, {
        tenant_id,
        plan_id,
        billing_cycle,
        purpose: 'platform_subscription'
      });

      // Insert into payment_orders
      // Need a service role or rely on RPC due to RLS, but RPC is provided: create_payment_order
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
  });


  app.post('/api/create-wallet-recharge-order', async (req, res) => {
    try {
      const { amount, wallet_owner_context, tenant_id } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      const supabaseUrl = process.env.VITE_SUPABASE_URL!;
      const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

      // Verify Auth
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Create client with user's auth context for RLS
      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      });
      
      const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      if (authError || !user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      let walletId: string | null = null;
      let payerType: string = '';
      let payerId: string = '';
      let resolvedTenantId: string | null = null;

      if (wallet_owner_context === 'merchant') {
        if (!tenant_id) return res.status(400).json({ error: 'tenant_id required for merchant wallet recharge' });
        // Call RPC to get or create tenant_bank wallet
        let { data: tbId, error: tbError } = await supabase.rpc('get_or_create_tenant_bank_wallet', { p_tenant_id: tenant_id });
        if (tbError) {
          // Fallback if RPC not yet applied: do it via direct table insert
          const { data: existing } = await supabase.from('wallet_accounts').select('id').eq('tenant_id', tenant_id).eq('owner_type', 'tenant_bank').single();
          if (existing) {
             tbId = existing.id;
          } else {
             const { data: newWallet, error: insertErr } = await supabase.from('wallet_accounts').insert({
               tenant_id: tenant_id, owner_type: 'tenant_bank', owner_id: tenant_id, account_label: 'Business Wallet'
             }).select('id').single();
             if (insertErr) throw new Error(insertErr.message);
             tbId = newWallet.id;
          }
        }
        if (!tbId) throw new Error('Failed to get/create merchant wallet');
        walletId = tbId;
        payerType = 'tenant';
        payerId = tenant_id;
        resolvedTenantId = tenant_id;
      } else if (wallet_owner_context === 'consumer') {
        // Consumer context
        const { data: cId, error: cError } = await supabase.rpc('get_or_create_platform_wallet', { p_user_id: user.id });
        if (cError || !cId) throw new Error(cError?.message || 'Failed to get/create consumer wallet');
        walletId = cId;
        payerType = 'consumer';
        payerId = user.id; // The RPC implicitly creates it for the logged in user
      } else {
        return res.status(400).json({ error: 'Invalid wallet_owner_context' });
      }

      // amount is expected in INR rupees, Razorpay needs paise
      const amountPaise = amount * 100;

      // Create Razorpay Order
      const rzpOrder = await createRazorpayOrder(amountPaise, {
        tenant_id: resolvedTenantId || undefined,
        wallet_id: walletId,
        purpose: 'wallet_topup'
      });

      // Insert into payment_orders
      const { data: paymentOrderId, error: orderError } = await supabase.rpc('create_payment_order', {
        p_tenant_id: resolvedTenantId,
        p_branch_id: null,
        p_purpose: 'wallet_topup',
        p_amount: amount,
        p_reference_type: 'wallet_account',
        p_reference_id: walletId,
        p_payer_type: payerType,
        p_payer_id: payerId,
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
      console.error('Error creating wallet recharge order:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  
  app.post('/api/invite-merchant', async (req, res) => {
    try {
      const { email, full_name, business_name, phone, address, module_name } = req.body;
      if (!email || !full_name) {
        return res.status(400).json({ error: 'Email aur naam zaroori hain' });
      }

      const supabaseUrl = process.env.VITE_SUPABASE_URL!;
      const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
      if (!serviceKey) {
        return res.status(500).json({ error: 'Server configuration error' });
      }
      const supabaseAdmin = createClient(supabaseUrl, serviceKey);

      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const alreadyExists = existingUsers?.users?.some((u: any) => u.email?.toLowerCase() === String(email).toLowerCase());
      if (alreadyExists) {
        return res.status(409).json({ error: 'Is email se pehle se ek account hai. Kripya Login page se login karein.' });
      }

      const siteUrl = process.env.SITE_URL || 'https://www.bahibox.com';
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${siteUrl}/set-password`,
        data: { full_name, role: 'merchant' }
      });

      if (inviteError) {
        return res.status(500).json({ error: inviteError.message });
      }

      const newUserId = inviteData.user.id;

      await supabaseAdmin.from('users').update({
        full_name, phone: phone || null, email
      }).eq('id', newUserId);

      const moduleTypeMap: Record<string, string> = {
        'Retail POS': 'retail',
        'Manufacturing ERP': 'manufacturing',
        'Hotel/Restaurant': 'hospitality',
        'Health Care': 'healthcare',
        'Education': 'education',
        'Transport Management': 'logistics',
        'Agri Management': 'agri',
        'Daily Services': 'services'
      };
      const businessType = moduleTypeMap[module_name] || 'retail';

      const { data: newTenantId, error: bootstrapError } = await supabaseAdmin.rpc('bootstrap_merchant_tenant', {
        p_user_id: newUserId,
        p_business_name: business_name || `${full_name}'s Business`,
        p_business_type: businessType
      });

      if (bootstrapError) {
        console.error('Bootstrap error:', bootstrapError.message);
      } else if (newTenantId && address) {
        const { data: branches } = await supabaseAdmin.from('branches').select('id').eq('tenant_id', newTenantId).eq('is_main_branch', true);
        if (branches && branches.length > 0) {
          await supabaseAdmin.from('branches').update({ address }).eq('id', branches[0].id);
        }
      }

      res.json({ success: true, tenant_id: newTenantId, user_id: newUserId });
    } catch (err: any) {
      console.error('Error inviting merchant:', err.message);
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  });

  app.post('/api/activate-free-plan', async (req, res) => {
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
  });



  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR === 'true' ? false : { server } },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
