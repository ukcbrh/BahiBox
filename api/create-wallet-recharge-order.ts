import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { createRazorpayOrder } from './_razorpay-helper';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { amount, wallet_owner_context, tenant_id } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL!;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

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

      let { data: tbId, error: tbError } = await supabase.rpc('get_or_create_tenant_bank_wallet', { p_tenant_id: tenant_id });
      if (tbError) {
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
      const { data: cId, error: cError } = await supabase.rpc('get_or_create_platform_wallet', { p_user_id: user.id });
      if (cError || !cId) throw new Error(cError?.message || 'Failed to get/create consumer wallet');
      walletId = cId;
      payerType = 'consumer';
      payerId = user.id;
    } else {
      return res.status(400).json({ error: 'Invalid wallet_owner_context' });
    }

    const amountPaise = amount * 100;

    const rzpOrder = await createRazorpayOrder(amountPaise, {
      tenant_id: resolvedTenantId || undefined,
      wallet_id: walletId,
      purpose: 'wallet_topup'
    });

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
}
