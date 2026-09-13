import sys

with open('server.ts', 'r') as f:
    content = f.read()

new_route = """
  app.post('/api/create-wallet-recharge-order', async (req, res) => {
    try {
      const { amount, wallet_owner_context, tenant_id } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      const supabaseUrl = process.env.VITE_SUPABASE_URL!;
      // Use service role key to bypass RLS for getting/creating wallets and creating payment orders
      const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!; // Wait, we should use anon key and pass auth, but rpc will handle it, let's use anon + auth header
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Verify Auth
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
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
        const { data: tbId, error: tbError } = await supabase.rpc('get_or_create_tenant_bank_wallet', { p_tenant_id: tenant_id });
        if (tbError || !tbId) throw new Error(tbError?.message || 'Failed to get/create merchant wallet');
        walletId = tbId;
        payerType = 'tenant';
        payerId = tenant_id;
        resolvedTenantId = tenant_id;
      } else if (wallet_owner_context === 'consumer') {
        // Consumer context
        const { data: cId, error: cError } = await supabase.rpc('get_or_create_platform_wallet');
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
"""

target = "  app.post('/api/activate-free-plan', async (req, res) => {"

if "app.post('/api/create-wallet-recharge-order'" not in content:
    content = content.replace(target, new_route + "\n" + target)
    with open('server.ts', 'w') as f:
        f.write(content)
    print("Added route to server.ts")
else:
    print("Route already exists in server.ts")

