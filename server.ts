import http from 'http';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import crypto from 'crypto';
import { createClient } from "@supabase/supabase-js";

async function sendWhatsAppMessage(toPhone: string, body: string): Promise<{ success: boolean; error?: string }> {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      return { success: false, error: 'WhatsApp is not configured (missing Twilio credentials)' };
    }

    let normalizedPhone = toPhone.trim();
    if (!normalizedPhone.startsWith('+')) {
      normalizedPhone = '+91' + normalizedPhone.replace(/^0+/, '');
    }

    const params = new URLSearchParams();
    params.append('From', fromNumber);
    params.append('To', `whatsapp:${normalizedPhone}`);
    params.append('Body', body);

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64')
        },
        body: params.toString()
      }
    );

    const data: any = await response.json();

    if (!response.ok) {
      console.error('Twilio WhatsApp send error:', data);
      return { success: false, error: data.message || 'Failed to send WhatsApp message' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('sendWhatsAppMessage exception:', err.message);
    return { success: false, error: err.message };
  }
}

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
        
        // Log event for audit (fixed column name: raw_payload, not payload)
        console.log('WEBHOOK_MARKER_V2_ACTIVE - this is the patched webhook code running');
        await supabase.from('payment_webhook_events').insert({
          event_type: payload.event,
          raw_payload: { ...payload, _webhook_code_version: 'v2-with-signup-check' },
          signature_verified: true
        });

        // Get payment_order_id, including tenant_id and pending_signup
        const { data: orderData } = await supabase
          .from('payment_orders')
          .select('id, tenant_id, pending_signup')
          .eq('razorpay_order_id', razorpay_order_id)
          .single();

        if (orderData) {
          const orderId = orderData.id;

          // NEW: if this order has no tenant yet but has pending signup data,
          // create the merchant account + tenant NOW (payment is confirmed).
          if (!orderData.tenant_id && orderData.pending_signup) {
            try {
              const { newTenantId } = await createMerchantAccountAndTenant(supabase, orderData.pending_signup);
              if (newTenantId) {
                await supabase.from('payment_orders').update({
                  tenant_id: newTenantId,
                  payer_type: 'tenant',
                  payer_id: newTenantId,
                  pending_signup: null
                }).eq('id', orderId);
              } else {
                console.error('Webhook: account creation returned no tenant_id for payment_order', orderId);
              }
            } catch (signupErr: any) {
              console.error('Webhook: failed to create merchant account for payment_order', orderId, signupErr.message);
            }
          }

          const { data: finalOrder } = await supabase
            .from('payment_orders')
            .select('tenant_id')
            .eq('id', orderId)
            .single();

          if (finalOrder && finalOrder.tenant_id) {
            await supabase.rpc('capture_payment', {
              p_payment_order_id: orderId,
              p_razorpay_payment_id: razorpay_payment_id,
              p_method: method,
              p_gateway_fee: gateway_fee,
              p_raw_response: payload
            });
          } else {
            console.error('Webhook: skipping capture_payment, no tenant_id resolved for payment_order', orderId);
          }
        } else {
          console.log(`Payment order not found for razorpay_order_id: ${razorpay_order_id}`);
        }
      } else if (payload.event === 'qr_code.credited') {
        const payment = payload.payload.payment.entity;
        const qrCodeEntity = payload.payload.qr_code.entity;

        const supabase = createClient(
          process.env.VITE_SUPABASE_URL!,
          process.env.VITE_SUPABASE_SERVICE_ROLE_KEY! || process.env.VITE_SUPABASE_ANON_KEY!
        );

        const tenantId = qrCodeEntity.notes?.tenant_id;
        const branchId = qrCodeEntity.notes?.branch_id;
        const invoiceId = qrCodeEntity.notes?.invoice_id;
        const challanId = qrCodeEntity.notes?.challan_id;

        if (challanId) {
          // This QR belongs to a specific Delivery Challan Outward — 
          // record a real payment against it (same accounting entries as 
          // any other customer payment) and close the QR so it can't be 
          // paid again.
          const { data: challanData } = await supabase
            .from('delivery_challans_outward')
            .select('id, tenant_id, customer_id, created_by, payment_status')
            .eq('id', challanId)
            .maybeSingle();

          if (challanData && challanData.payment_status !== 'paid' && challanData.customer_id) {
            const { error: payErr } = await supabase.rpc('record_customer_payment', {
              p_tenant_id: challanData.tenant_id,
              p_customer_id: challanData.customer_id,
              p_sales_invoice_id: null,
              p_amount: (payment.amount || 0) / 100,
              p_payment_method: 'online',
              p_payment_date: new Date().toISOString().slice(0, 10),
              p_reference_note: 'Razorpay QR payment (Delivery Challan)',
              p_created_by: challanData.created_by,
              p_delivery_challan_outward_id: challanId
            });

            if (!payErr) {
              await supabase.from('delivery_challans_outward').update({ payment_status: 'paid' }).eq('id', challanId);
            } else {
              console.error('Failed to record challan payment:', payErr.message);
            }

            try {
              const keyId = process.env.RAZORPAY_KEY_ID;
              const keySecret = process.env.RAZORPAY_KEY_SECRET;
              if (keyId && keySecret) {
                const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
                await fetch(`https://api.razorpay.com/v1/payments/qr_codes/${qrCodeEntity.id}/close`, {
                  method: 'POST',
                  headers: { 'Authorization': `Basic ${auth}` }
                });
              }
            } catch (closeErr: any) {
              console.error('Failed to close challan payment QR:', closeErr.message);
            }
          }
        } else if (invoiceId) {
          // This QR belongs to a specific credit-invoice — mark it paid, 
          // reduce the customer's credit exposure, and close the QR so 
          // it can't be paid again.
          const { data: invoiceData } = await supabase
            .from('sales_invoices')
            .select('id, tenant_id, customer_id, total_amount, status')
            .eq('id', invoiceId)
            .maybeSingle();

          if (invoiceData && invoiceData.status !== 'paid') {
            await supabase.from('sales_invoices').update({ status: 'paid' }).eq('id', invoiceId);

            const { data: creditLimitRow } = await supabase
              .from('credit_limits')
              .select('id, current_exposure')
              .eq('tenant_id', invoiceData.tenant_id)
              .eq('party_type', 'customer')
              .eq('party_id', invoiceData.customer_id)
              .maybeSingle();

            if (creditLimitRow) {
              const newExposure = Math.max(0, Number(creditLimitRow.current_exposure) - Number(invoiceData.total_amount));
              await supabase.from('credit_limits').update({ current_exposure: newExposure }).eq('id', creditLimitRow.id);
            }

            // Close the QR so it can't be scanned/paid again for this invoice.
            try {
              const keyId = process.env.RAZORPAY_KEY_ID;
              const keySecret = process.env.RAZORPAY_KEY_SECRET;
              if (keyId && keySecret) {
                const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
                await fetch(`https://api.razorpay.com/v1/payments/qr_codes/${qrCodeEntity.id}/close`, {
                  method: 'POST',
                  headers: { 'Authorization': `Basic ${auth}` }
                });
              }
            } catch (closeErr: any) {
              console.error('Failed to close invoice payment QR:', closeErr.message);
            }
          }
        } else if (tenantId) {
          await supabase.from('qr_code_payments').insert({
            tenant_id: tenantId,
            branch_id: branchId || null,
            razorpay_qr_id: qrCodeEntity.id,
            razorpay_payment_id: payment.id,
            amount: (payment.amount || 0) / 100,
            payer_vpa: payment.vpa || null
          });
        } else {
          console.log('qr_code.credited webhook received but no tenant_id or invoice_id in QR notes:', qrCodeEntity.id);
        }

        await supabase.from('payment_webhook_events').insert({
          event_type: payload.event,
          payload: payload
        });

        const qrEntity = payload.payload?.qr_code?.entity;
        const paymentEntity = payload.payload?.payment?.entity;
        const qrId = qrEntity?.id;

        if (qrId) {
          const { data: sessionData } = await supabase
            .from('pos_display_sessions')
            .select('*')
            .eq('razorpay_qr_id', qrId)
            .single();

          if (sessionData) {
            await supabase.from('pos_display_sessions').update({
              status: 'paid',
              updated_at: new Date().toISOString()
            }).eq('id', sessionData.id);

            const tenantId = sessionData.tenant_id;
            const amount = sessionData.amount;
            const merchantWalletRes = await supabase.rpc('get_or_create_tenant_bank_wallet', { p_tenant_id: tenantId });
            const merchantWalletId = merchantWalletRes.data;
            if (merchantWalletId) {
              await supabase.rpc('post_ledger_transaction', {
                p_wallet_account_id: merchantWalletId,
                p_type: 'credit',
                p_amount: amount,
                p_reference_type: sessionData.reference_type || 'pos_qr_payment',
                p_reference_id: sessionData.reference_id,
                p_description: 'POS Dynamic QR payment received',
                p_created_by: null
              });
            }
          } else {
            console.log(`No pos_display_sessions found for QR id: ${qrId}`);
          }
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

  app.post('/api/send-whatsapp-otp', async (req, res) => {
    try {
      const { phone, purpose } = req.body;
      if (!phone) {
        return res.status(400).json({ error: 'phone is required' });
      }

      const supabaseUrl = process.env.VITE_SUPABASE_URL!;
      const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      const { error: insertErr } = await supabase.from('whatsapp_otps').insert({
        phone,
        otp_code: otpCode,
        purpose: purpose || 'login',
        expires_at: expiresAt
      });

      if (insertErr) {
        return res.status(500).json({ error: insertErr.message });
      }

      const result = await sendWhatsAppMessage(
        phone,
        `Your BahiBox verification code is: ${otpCode}\n\nThis code expires in 5 minutes. Do not share it with anyone.`
      );

      if (!result.success) {
        return res.status(502).json({ error: result.error || 'Failed to send OTP via WhatsApp' });
      }

      res.json({ success: true, message: 'OTP sent via WhatsApp' });
    } catch (err: any) {
      console.error('send-whatsapp-otp error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/verify-whatsapp-otp', async (req, res) => {
    try {
      const { phone, otp_code } = req.body;
      if (!phone || !otp_code) {
        return res.status(400).json({ error: 'phone and otp_code are required' });
      }

      const supabaseUrl = process.env.VITE_SUPABASE_URL!;
      const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data: otpRow, error: fetchErr } = await supabase
        .from('whatsapp_otps')
        .select('*')
        .eq('phone', phone)
        .eq('is_verified', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchErr || !otpRow) {
        return res.status(400).json({ error: 'No pending OTP found for this number' });
      }

      if (new Date(otpRow.expires_at) < new Date()) {
        return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
      }

      if (otpRow.attempts >= 5) {
        return res.status(400).json({ error: 'Too many incorrect attempts. Please request a new OTP.' });
      }

      if (otpRow.otp_code !== otp_code) {
        await supabase.from('whatsapp_otps').update({ attempts: otpRow.attempts + 1 }).eq('id', otpRow.id);
        return res.status(400).json({ error: 'Incorrect OTP' });
      }

      await supabase.from('whatsapp_otps').update({ is_verified: true }).eq('id', otpRow.id);

      res.json({ success: true, message: 'OTP verified' });
    } catch (err: any) {
      console.error('verify-whatsapp-otp error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

    app.post('/api/create-razorpay-order', async (req, res) => {
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
  });

app.post('/api/create-dynamic-qr', async (req, res) => {
    try {
      const { tenant_id, branch_id, amount, reference_type, reference_id } = req.body;
      if (!tenant_id || !branch_id || !amount || amount <= 0) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      const supabaseUrl = process.env.VITE_SUPABASE_URL!;
      const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } }
      });
      const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      if (authError || !user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keyId || !keySecret) {
        return res.status(500).json({ error: 'Razorpay credentials missing' });
      }
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const closeBy = Math.floor(Date.now() / 1000) + 1800; // 30 min expiry

      const rzpResponse = await fetch('https://api.razorpay.com/v1/payments/qr_codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${auth}` },
        body: JSON.stringify({
          type: 'upi_qr',
          name: 'BahiBox POS',
          usage: 'single_use',
          fixed_amount: true,
          payment_amount: Math.round(amount * 100),
          description: 'BahiBox Payment',
          close_by: closeBy,
          notes: { tenant_id, branch_id, reference_type: reference_type || '', reference_id: reference_id || '' }
        })
      });

      if (!rzpResponse.ok) {
        const errText = await rzpResponse.text();
        console.error('Razorpay QR creation failed:', errText);
        return res.status(500).json({ error: 'Failed to create QR code. If this is the first time, ensure QR Code feature is activated on your Razorpay account.' });
      }
      const qrData = await rzpResponse.json();

      const { error: upsertError } = await supabase.from('pos_display_sessions').upsert({
        tenant_id,
        branch_id,
        status: 'pending',
        amount,
        razorpay_qr_id: qrData.id,
        qr_image_url: qrData.image_url,
        reference_type: reference_type || null,
        reference_id: reference_id || null,
        created_by: user.id,
        updated_at: new Date().toISOString()
      }, { onConflict: 'branch_id' });

      if (upsertError) {
        throw upsertError;
      }

      res.json({ qr_id: qrData.id, qr_image_url: qrData.image_url });
    } catch (err: any) {
      console.error('Error creating dynamic QR:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

app.post('/api/create-order-payment', async (req, res) => {
    try {
      const { amount, tenant_id, branch_id, reference_type, reference_id, purpose } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }
      if (!tenant_id || !reference_type || !reference_id) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      const supabaseUrl = process.env.VITE_SUPABASE_URL!;
      const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } }
      });
      const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      if (authError || !user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const amountPaise = Math.round(amount * 100);
      const rzpOrder = await createRazorpayOrder(amountPaise, {
        tenant_id,
        reference_type,
        reference_id,
        purpose: purpose || 'consumer_order'
      });

      const { data: paymentOrderId, error: orderError } = await supabase.rpc('create_payment_order', {
        p_tenant_id: tenant_id,
        p_branch_id: branch_id || null,
        p_purpose: purpose || 'consumer_order',
        p_amount: amount,
        p_reference_type: reference_type,
        p_reference_id: reference_id,
        p_payer_type: 'consumer',
        p_payer_id: user.id,
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
      console.error('Error creating order payment:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/ocr-purchase-invoice', async (req, res) => {
    try {
      const { image_base64, mime_type } = req.body;
      if (!image_base64) {
        return res.status(400).json({ error: 'image_base64 is required' });
      }

      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const supabaseUrl = process.env.VITE_SUPABASE_URL!;
      const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
      const supabaseAuthClient = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } }
      });
      const { data: { user }, error: authError } = await supabaseAuthClient.auth.getUser(authHeader.replace('Bearer ', ''));
      if (authError || !user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const geminiKey = process.env.BAHIBOX_GEMINI_API_KEY;
      if (!geminiKey) {
        return res.status(500).json({ error: 'AI OCR is not configured (missing API key)' });
      }

      const schema = {
        type: 'OBJECT',
        properties: {
          supplier_name: { type: 'STRING' },
          invoice_number: { type: 'STRING' },
          invoice_date: { type: 'STRING', description: 'YYYY-MM-DD format' },
          items: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                product_name: { type: 'STRING' },
                qty: { type: 'NUMBER' },
                price: { type: 'NUMBER', description: 'purchase price per unit' },
                tax_rate: { type: 'NUMBER', description: 'GST/tax percentage, 0 if not shown' },
                batch: { type: 'STRING' },
                mrp: { type: 'NUMBER' },
                discount: { type: 'NUMBER' },
                exp_date: { type: 'STRING', description: 'YYYY-MM-DD, empty string if not shown' },
                mfg_date: { type: 'STRING', description: 'YYYY-MM-DD, empty string if not shown' },
                size: { type: 'STRING' },
                colour: { type: 'STRING' },
                sku: { type: 'STRING' },
                barcode: { type: 'STRING' }
              },
              required: ['product_name', 'qty', 'price']
            }
          }
        },
        required: ['items']
      };

      const prompt = 'This is a photo of a purchase invoice/bill. Extract the supplier name, invoice number, invoice date, and every line item (product name, quantity, purchase price per unit, tax/GST rate if shown, batch number if shown, MRP if shown, discount if shown, expiry date if shown, manufacturing date if shown, size/colour/SKU/barcode if shown). If a field is not visible on the invoice, use an empty string or 0 as appropriate. Return ONLY the structured data.';

      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mime_type || 'image/jpeg', data: image_base64 } }
              ]
            }],
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: schema
            }
          })
        }
      );

      if (!geminiResponse.ok) {
        const errText = await geminiResponse.text();
        console.error('Gemini API error:', errText);
        return res.status(502).json({ error: 'AI OCR request failed' });
      }

      const geminiData: any = await geminiResponse.json();
      const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        return res.status(502).json({ error: 'AI OCR returned no data' });
      }

      const parsed = JSON.parse(rawText);
      res.json(parsed);

    } catch (err: any) {
      console.error('OCR purchase invoice error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

app.post('/api/ocr-delivery-challan', async (req, res) => {
    try {
      const { image_base64, mime_type } = req.body;
      if (!image_base64) {
        return res.status(400).json({ error: 'image_base64 is required' });
      }

      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const supabaseUrl = process.env.VITE_SUPABASE_URL!;
      const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
      const supabaseAuthClient = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } }
      });
      const { data: { user }, error: authError } = await supabaseAuthClient.auth.getUser(authHeader.replace('Bearer ', ''));
      if (authError || !user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const geminiKey = process.env.BAHIBOX_GEMINI_API_KEY;
      if (!geminiKey) {
        return res.status(500).json({ error: 'AI OCR is not configured (missing API key)' });
      }

      const schema = {
        type: 'OBJECT',
        properties: {
          from_party_name: { type: 'STRING' },
          from_gstin: { type: 'STRING', description: 'GSTIN number if shown, empty string otherwise' },
          vehicle_number: { type: 'STRING' },
          purpose: { type: 'STRING', description: 'reason for the delivery e.g. job work return, sample, replacement' },
          items: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                item_name: { type: 'STRING' },
                quantity: { type: 'STRING' },
                remarks: { type: 'STRING' }
              },
              required: ['item_name', 'quantity']
            }
          }
        },
        required: ['items']
      };

      const prompt = 'This is a photo of a delivery challan (a document accompanying goods received, often without pricing/invoice details). Extract the sender/from-party name, their GSTIN if shown, the vehicle number if shown, the purpose of delivery if stated, and every line item (item name, quantity, any remarks). If a field is not visible, use an empty string. Return ONLY the structured data.';

      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mime_type || 'image/jpeg', data: image_base64 } }
              ]
            }],
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: schema
            }
          })
        }
      );

      if (!geminiResponse.ok) {
        const errText = await geminiResponse.text();
        console.error('Gemini API error:', errText);
        return res.status(502).json({ error: 'AI OCR request failed' });
      }

      const geminiData: any = await geminiResponse.json();
      const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        return res.status(502).json({ error: 'AI OCR returned no data' });
      }

      const parsed = JSON.parse(rawText);
      res.json(parsed);

    } catch (err: any) {
      console.error('OCR delivery challan error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

app.post('/api/generate-product-images', async (req, res) => {
    try {
      console.log('--- DEBUG: /api/generate-product-images called ---', req.body);
      const { product_id, product_name, tenant_id, count } = req.body;
      if (!product_name || !tenant_id || !product_id) {
        return res.status(400).json({ error: 'product_id, product_name, and tenant_id are required' });
      }
      const imageCount = Math.min(Math.max(parseInt(count) || 1, 1), 4);

      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const supabaseUrl = process.env.VITE_SUPABASE_URL!;
      const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;
      const supabaseAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });
      const { data: { user }, error: authError } = await supabaseAuthClient.auth.getUser(authHeader.replace('Bearer ', ''));
      if (authError || !user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const geminiKey = process.env.BAHIBOX_GEMINI_API_KEY;
      const serpApiKey = process.env.SERPAPI_KEY;
      if (!geminiKey) {
        return res.status(500).json({ error: 'AI image feature is not configured (missing Gemini key)' });
      }

      // Step 1: classify branded vs generic using Gemini (text-only)
      const classifyResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: `Is "${product_name}" a well-known commercial brand or branded product (e.g. Colgate, Coca-Cola, Nike, Lifebuoy)? Reply with ONLY one word: BRANDED or GENERIC.` }]
            }]
          })
        }
      );
      const classifyData: any = await classifyResponse.json();
      const classifyText = (classifyData?.candidates?.[0]?.content?.parts?.[0]?.text || '').toUpperCase();
      const isBranded = classifyText.includes('BRANDED');

      const supabaseService = createClient(supabaseUrl, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey);
      const uploadedUrls: string[] = [];

      if (isBranded && serpApiKey) {
        // Step 2a: branded -> search real photos via SerpAPI, download, and re-host in our own storage
        const searchUrl = `https://serpapi.com/search.json?engine=google_images&q=${encodeURIComponent(product_name)}&api_key=${serpApiKey}`;
        const serpResponse = await fetch(searchUrl);
        const serpData: any = await serpResponse.json();
        const imageResults = (serpData.images_results || []).slice(0, imageCount);

        for (let i = 0; i < imageResults.length; i++) {
          try {
            const imgUrl = imageResults[i].original || imageResults[i].thumbnail;
            const imgResponse = await fetch(imgUrl);
            if (!imgResponse.ok) continue;
            const arrayBuffer = await imgResponse.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const path = `${tenant_id}/${product_id}_${Date.now()}_${i}.jpg`;
            const { error: uploadErr } = await supabaseService.storage
              .from('product-images')
              .upload(path, buffer, { contentType: 'image/jpeg', upsert: true });
            if (!uploadErr) {
              const { data: urlData } = supabaseService.storage.from('product-images').getPublicUrl(path);
              uploadedUrls.push(urlData.publicUrl);
            }
          } catch (e) {
            console.error('Failed to fetch/upload one search result image:', e);
          }
        }
      }

      if (uploadedUrls.length === 0) {
        // Step 2b: generic (or branded search found nothing) -> AI-generate photos
        const angleVariations = [
          'front-facing view, centered, straight-on angle',
          'three-quarter angle view, showing depth and side profile',
          'close-up detail shot highlighting texture and material',
          'slightly elevated top-down angle, showing the full product'
        ];

        for (let i = 0; i < imageCount; i++) {
          try {
            const angle = angleVariations[i % angleVariations.length];
            const genResponse = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${geminiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{
                    parts: [{ text: `Professional e-commerce product photo of "${product_name}", ${angle}, plain white background, studio lighting, no text, no watermark, no brand logos.` }]
                  }],
                  generationConfig: { responseModalities: ['IMAGE'] }
                })
              }
            );
            const genData: any = await genResponse.json();
            const inlineData = genData?.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData || p.inline_data)?.inlineData
              || genData?.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData || p.inline_data)?.inline_data;
            if (inlineData?.data) {
              const buffer = Buffer.from(inlineData.data, 'base64');
              const path = `${tenant_id}/${product_id}_${Date.now()}_${i}.png`;
              const { error: uploadErr } = await supabaseService.storage
                .from('product-images')
                .upload(path, buffer, { contentType: 'image/png', upsert: true });
              if (!uploadErr) {
                const { data: urlData } = supabaseService.storage.from('product-images').getPublicUrl(path);
                uploadedUrls.push(urlData.publicUrl);
              }
            } else {
              console.error('Gemini image-gen returned no image data:', JSON.stringify(genData).slice(0, 500));
            }
          } catch (e) {
            console.error('Failed to generate/upload one AI image:', e);
          }
        }
      }

      if (uploadedUrls.length === 0) {
        return res.status(502).json({ error: 'Could not find or generate any images for this product' });
      }

      console.log('--- DEBUG: /api/generate-product-images success ---', { uploadedUrls, isBranded });
      res.json({ urls: uploadedUrls, source: isBranded ? 'search' : 'generated' });

    } catch (err: any) {
      console.error('generate-product-images error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

app.post('/api/create-invoice-payment-qr', async (req, res) => {
    try {
      const { tenant_id, invoice_id, challan_id, amount, due_days } = req.body;
      if (!tenant_id || (!invoice_id && !challan_id) || !amount) {
        return res.status(400).json({ error: 'tenant_id, (invoice_id or challan_id), and amount are required' });
      }

      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

      const supabaseUrl = process.env.VITE_SUPABASE_URL!;
      const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keyId || !keySecret) {
        return res.status(500).json({ error: 'Razorpay credentials not configured' });
      }
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

      // NOTE: 'close_by' is intentionally NOT sent here — Razorpay's API 
      // rejects it for usage='multiple_use' QR codes (it's only valid for 
      // 'single_use'). multiple_use QR codes simply never expire on their 
      // own; our webhook explicitly calls the "close QR" API once payment 
      // is confirmed, so no close_by is needed.
      const rzpResponse = await fetch('https://api.razorpay.com/v1/payments/qr_codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${auth}` },
        body: JSON.stringify({
          type: 'upi_qr',
          name: challan_id ? 'Delivery Challan Payment' : 'Invoice Payment',
          usage: 'multiple_use',
          fixed_amount: true,
          payment_amount: Math.round(amount * 100),
          notes: challan_id ? { tenant_id, challan_id } : { tenant_id, invoice_id }
        })
      });

      if (!rzpResponse.ok) {
        const errText = await rzpResponse.text();
        console.error('Razorpay payment-QR create error:', errText);
        return res.status(502).json({ error: 'Failed to create payment QR with Razorpay' });
      }

      const rzpData: any = await rzpResponse.json();

      // Razorpay's image_url forces a download (Content-Disposition: 
      // attachment) rather than displaying inline, so an <img src="..."> 
      // tag can't render it directly. Download the actual image bytes 
      // ourselves and re-host them in our own storage bucket instead.
      let finalImageUrl = rzpData.image_url;
      try {
        const imgResponse = await fetch(rzpData.image_url);
        if (imgResponse.ok) {
          const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
          const fileName = `${challan_id ? 'challan-qr' : 'invoice-qr'}/${challan_id || invoice_id}-${Date.now()}.png`;
          const { error: uploadErr } = await supabase.storage
            .from('product-images')
            .upload(fileName, imgBuffer, { contentType: 'image/png', upsert: true });

          if (!uploadErr) {
            const { data: publicUrlData } = supabase.storage.from('product-images').getPublicUrl(fileName);
            if (publicUrlData?.publicUrl) {
              finalImageUrl = publicUrlData.publicUrl;
            }
          } else {
            console.error('Failed to re-host QR image, falling back to Razorpay URL:', uploadErr.message);
          }
        }
      } catch (rehostErr: any) {
        console.error('Error re-hosting QR image, falling back to Razorpay URL:', rehostErr.message);
      }

      if (challan_id) {
        await supabase.from('delivery_challans_outward').update({
          payment_qr_id: rzpData.id,
          payment_qr_image_url: finalImageUrl
        }).eq('id', challan_id);
      } else {
        await supabase.from('sales_invoices').update({
          payment_qr_id: rzpData.id,
          payment_qr_image_url: finalImageUrl
        }).eq('id', invoice_id);
      }

      res.json({ qr_id: rzpData.id, image_url: finalImageUrl });
    } catch (err: any) {
      console.error('create-invoice-payment-qr error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

app.post('/api/create-branch-qr-code', async (req, res) => {
    try {
      const { tenant_id, branch_id } = req.body;
      if (!tenant_id || !branch_id) {
        return res.status(400).json({ error: 'tenant_id and branch_id are required' });
      }

      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

      const supabaseUrl = process.env.VITE_SUPABASE_URL!;
      const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // If an active QR already exists for this branch, just return it.
      const { data: existing } = await supabase
        .from('branch_payment_qr_codes')
        .select('*')
        .eq('branch_id', branch_id)
        .eq('is_active', true)
        .maybeSingle();

      if (existing) {
        return res.json({ qr_id: existing.razorpay_qr_id, image_url: existing.qr_image_url });
      }

      const { data: branchData } = await supabase.from('branches').select('branch_name').eq('id', branch_id).maybeSingle();

      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keyId || !keySecret) {
        return res.status(500).json({ error: 'Razorpay credentials not configured' });
      }
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

      const rzpResponse = await fetch('https://api.razorpay.com/v1/payments/qr_codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${auth}` },
        body: JSON.stringify({
          type: 'upi_qr',
          name: (branchData?.branch_name || 'Store') + ' Counter QR',
          usage: 'multiple_use',
          fixed_amount: false,
          notes: { tenant_id, branch_id }
        })
      });

      if (!rzpResponse.ok) {
        const errText = await rzpResponse.text();
        console.error('Razorpay QR create error:', errText);
        return res.status(502).json({ error: 'Failed to create QR code with Razorpay' });
      }

      const rzpData: any = await rzpResponse.json();

      const { error: insertErr } = await supabase.from('branch_payment_qr_codes').insert({
        tenant_id,
        branch_id,
        razorpay_qr_id: rzpData.id,
        qr_image_url: rzpData.image_url
      });

      if (insertErr) {
        console.error('Failed to save QR code record:', insertErr.message);
      }

      res.json({ qr_id: rzpData.id, image_url: rzpData.image_url });
    } catch (err: any) {
      console.error('create-branch-qr-code error:', err.message);
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
      } else if (wallet_owner_context === 'platform_usage') {
        if (!tenant_id) return res.status(400).json({ error: 'tenant_id required for platform usage wallet recharge' });
        const { data: puId, error: puError } = await supabase.rpc('get_or_create_platform_usage_wallet', { p_tenant_id: tenant_id });
        if (puError || !puId) throw new Error(puError?.message || 'Failed to get/create platform usage wallet');
        walletId = puId;
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

  
  
async function createMerchantAccountAndTenant(supabaseAdmin: any, signup: {
  email: string;
  full_name: string;
  business_name?: string;
  phone?: string;
  address?: string;
  module_name?: string;
}) {
  const { email, full_name, business_name, phone, address, module_name } = signup;

  const siteUrl = process.env.SITE_URL || 'https://www.bahibox.com';
  const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/set-password`,
    data: { full_name, role: 'merchant' }
  });

  if (inviteError) {
    throw new Error(inviteError.message);
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

  const businessType = moduleTypeMap[module_name || ''] || 'retail';

  const { data: newTenantId, error: bootstrapError } = await supabaseAdmin.rpc('bootstrap_merchant_tenant', {
    p_user_id: newUserId,
    p_business_name: business_name || `${full_name}'s Business`,
    p_business_type: businessType
  });

  if (bootstrapError) {
    console.error('Bootstrap error:', bootstrapError.message);
    throw new Error(
      `Your account login was created, but setting up your business failed (${bootstrapError.message}). Please contact support — do not try signing up again with the same email.`
    );
  } else {
    // This user is now a confirmed merchant. Remove the consumer_profiles
    // row that the handle_new_user() trigger auto-creates on every signup,
    // so MerchantDashboard.tsx's "not-a-consumer" guard doesn't block them.
    await supabaseAdmin.from('consumer_profiles').delete().eq('user_id', newUserId);

    if (newTenantId && address) {
      const { data: branches } = await supabaseAdmin.from('branches').select('id').eq('tenant_id', newTenantId).eq('is_main_branch', true);
      if (branches && branches.length > 0) {
        await supabaseAdmin.from('branches').update({ address }).eq('id', branches[0].id);
      }
    }
  }

  return { newUserId, newTenantId };
}

  app.post('/api/invite-merchant', async (req, res) => {
    try {
      const { email, full_name, business_name, phone, address, module_name } = req.body;
      if (!email || !full_name) {
        return res.status(400).json({ error: 'Email aur naam zaroori hain' });
      }

      const supabaseUrl = process.env.VITE_SUPABASE_URL!;
      const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
      if (!serviceKey) {
        return res.status(500).json({ error: 'Server configuration error' });
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceKey);

      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const alreadyExists = existingUsers?.users?.some((u: any) => u.email?.toLowerCase() === String(email).toLowerCase());
      
      if (alreadyExists) {
        return res.status(409).json({ error: 'Is email se pehle se ek account hai. Kripya Login page se login karein.' });
      }

      let newUserId, newTenantId;
      try {
        const result = await createMerchantAccountAndTenant(supabaseAdmin, {
          email, full_name, business_name, phone, address, module_name
        });
        newUserId = result.newUserId;
        newTenantId = result.newTenantId;
      } catch (accErr: any) {
        return res.status(500).json({ error: accErr.message });
      }

      res.json({ success: true, tenant_id: newTenantId, user_id: newUserId });
    } catch (err: any) {
      console.error('Error inviting merchant:', err.message);
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  });

  app.post('/api/create-signup-order', async (req, res) => {
    try {
      const { email, full_name, business_name, phone, address, module_name, plan_id, billing_cycle, promo_code } = req.body;
      if (!email || !full_name || !plan_id) {
        return res.status(400).json({ error: 'Email, naam aur plan zaroori hain' });
      }

      const supabaseUrl = process.env.VITE_SUPABASE_URL!;
      const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
      if (!serviceKey) {
        return res.status(500).json({ error: 'Server configuration error' });
      }
      const supabaseAdmin = createClient(supabaseUrl, serviceKey);

      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const alreadyExists = existingUsers?.users?.some((u: any) => u.email?.toLowerCase() === String(email).toLowerCase());
      if (alreadyExists) {
        return res.status(409).json({ error: 'Is email se pehle se ek account hai. Kripya Login page se login karein.' });
      }

      const { data: plan, error: planError } = await supabaseAdmin
        .from('subscription_plans')
        .select('price_monthly, price_yearly, module_name, name')
        .eq('id', plan_id)
        .single();

      if (planError || !plan) {
        return res.status(404).json({ error: 'Plan not found' });
      }

      let price = billing_cycle === 'yearly' ? plan.price_yearly : plan.price_monthly;

      if (promo_code) {
        const { data: coupon } = await supabaseAdmin
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
        return res.status(400).json({ error: 'This plan is free — please use the free signup flow instead.' });
      }

      const amount = price * 100;
      const rzpOrder = await createRazorpayOrder(amount, {
        signup: 'true',
        email,
        module_name: module_name || '',
        plan_id,
        billing_cycle
      });

      const { data: paymentOrderId, error: orderError } = await supabaseAdmin.rpc('create_payment_order', {
        p_tenant_id: null,
        p_branch_id: null,
        p_purpose: 'platform_subscription',
        p_amount: price,
        p_reference_type: 'subscription_plan',
        p_reference_id: plan_id,
        p_payer_type: 'guest_signup',
        p_payer_id: null,
        p_razorpay_order_id: rzpOrder.id
      });

      if (orderError) {
        throw orderError;
      }

      await supabaseAdmin.from('payment_orders').update({
        pending_signup: { email, full_name, business_name, phone, address, module_name }
      }).eq('id', paymentOrderId);

      res.json({
        razorpay_order_id: rzpOrder.id,
        razorpay_key_id: process.env.RAZORPAY_KEY_ID,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        payment_order_id: paymentOrderId
      });
    } catch (err: any) {
      console.error('Error creating signup order:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin-set-temp-password', async (req, res) => {
    try {
      const { target_user_id } = req.body;
      if (!target_user_id) {
        return res.status(400).json({ error: 'target_user_id required' });
      }

      const supabaseUrl = process.env.VITE_SUPABASE_URL!;
      const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
      if (!serviceKey) {
        return res.status(500).json({ error: 'Server configuration error' });
      }

      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const supabaseAnon = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: authHeader } }
      });
      const { data: { user: callerUser }, error: authError } = await supabaseAnon.auth.getUser(authHeader.replace('Bearer ', ''));
      if (authError || !callerUser) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // SECURITY: sirf genuine platform-admin hi yeh call kar sake
      const { data: adminCheck } = await supabaseAnon.rpc('is_platform_admin', { checking_user_id: callerUser.id });
      if (!adminCheck) {
        return res.status(403).json({ error: 'Only platform admins can generate temporary passwords' });
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceKey);

      // Random 8-character temp-password banao
      const tempPassword = Math.random().toString(36).slice(-4).toUpperCase() + Math.random().toString(36).slice(-4);

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(target_user_id, {
        password: tempPassword
      });

      if (updateError) {
        return res.status(500).json({ error: updateError.message });
      }

      // Audit-log
      await supabaseAdmin.from('audit_logs').insert({
        actor_user_id: callerUser.id,
        action_type: 'admin_set_temp_password',
        target_table: 'auth.users',
        target_id: target_user_id
      });

      res.json({ success: true, temp_password: tempPassword });
    } catch (err: any) {
      console.error('Error setting temp password:', err.message);
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
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const supabaseAnon = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: authHeader } }
      });
      
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

      const { data: adminCheck } = await supabaseAnon.rpc('is_platform_admin', { checking_user_id: user.id }).single();

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

      const { data: samePlansInModule } = await supabaseAdmin
        .from('subscription_plans')
        .select('id')
        .eq('module_name', plan.module_name);
      const sameModulePlanIds = (samePlansInModule || []).map((p: any) => p.id);

      const { data: existing } = await supabaseAdmin.from('merchant_subscriptions')
        .select('id')
        .eq('tenant_id', tenant_id)
        .in('plan_id', sameModulePlanIds)
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
        }).eq('id', existing[0].id);
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
