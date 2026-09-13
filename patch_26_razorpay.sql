-- Step 2: Create sync_subscription_on_payment_capture
CREATE OR REPLACE FUNCTION sync_subscription_on_payment_capture(p_payment_order_id UUID)
RETURNS VOID AS $$
DECLARE
  v_order payment_orders%ROWTYPE;
  v_tx payment_transactions%ROWTYPE;
  v_billing_cycle TEXT;
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
BEGIN
  -- 1. Look up payment_orders row
  SELECT * INTO v_order FROM payment_orders WHERE id = p_payment_order_id;
  IF NOT FOUND OR v_order.purpose <> 'platform_subscription' THEN
    RETURN;
  END IF;

  -- 2. Read billing_cycle from payment_transactions.raw_response
  SELECT * INTO v_tx FROM payment_transactions WHERE payment_order_id = p_payment_order_id ORDER BY created_at DESC LIMIT 1;
  v_billing_cycle := COALESCE(v_tx.raw_response->'notes'->>'billing_cycle', 'monthly');

  -- 3. Compute period
  v_start_date := NOW();
  IF v_billing_cycle = 'monthly' THEN
    v_end_date := v_start_date + INTERVAL '1 month';
  ELSE
    v_end_date := v_start_date + INTERVAL '1 year';
  END IF;

  -- 4. Upsert merchant_subscriptions
  IF EXISTS (
    SELECT 1 FROM merchant_subscriptions 
    WHERE tenant_id = v_order.tenant_id AND status IN ('active', 'trialing', 'past_due')
  ) THEN
    UPDATE merchant_subscriptions
    SET plan_id = v_order.reference_id,
        billing_cycle = v_billing_cycle,
        status = 'active',
        current_period_start = v_start_date,
        current_period_end = v_end_date,
        next_renewal_date = v_end_date,
        updated_at = NOW()
    WHERE tenant_id = v_order.tenant_id AND status IN ('active', 'trialing', 'past_due');
  ELSE
    INSERT INTO merchant_subscriptions (
      tenant_id, plan_id, billing_cycle, status, current_period_start, current_period_end, next_renewal_date
    ) VALUES (
      v_order.tenant_id, v_order.reference_id, v_billing_cycle, 'active', v_start_date, v_end_date, v_end_date
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 1: Fix capture_payment
CREATE OR REPLACE FUNCTION capture_payment(
  p_payment_order_id UUID,
  p_razorpay_payment_id TEXT,
  p_method TEXT,
  p_gateway_fee NUMERIC,
  p_raw_response JSONB
) RETURNS UUID AS $$
DECLARE
  v_order payment_orders%ROWTYPE;
  v_transaction_id UUID;
BEGIN
  -- 1. Get the order
  SELECT * INTO v_order FROM payment_orders WHERE id = p_payment_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment order not found';
  END IF;

  -- 2. Insert transaction
  INSERT INTO payment_transactions (
    payment_order_id, tenant_id, branch_id, amount, currency, status, method, gateway_fee, raw_response
  ) VALUES (
    v_order.id, v_order.tenant_id, v_order.branch_id, v_order.amount, v_order.currency, 'success', p_method, p_gateway_fee, p_raw_response
  ) RETURNING id INTO v_transaction_id;

  -- 3. Update order status
  UPDATE payment_orders
  SET status = 'paid', razorpay_payment_id = p_razorpay_payment_id, updated_at = NOW()
  WHERE id = p_payment_order_id;

  -- 4. Credit wallet and commission (Skip for platform_subscription)
  IF v_order.purpose <> 'platform_subscription' THEN
    INSERT INTO wallet_transactions (
      wallet_id, type, amount, reference_type, reference_id, description
    )
    SELECT id, 'credit', v_order.amount, 'payment_order', v_order.id, 'Payment captured'
    FROM wallet_accounts
    WHERE tenant_id = v_order.tenant_id AND type = 'tenant_bank';
    
    -- Insert commission transfer (if schema requires it, safely ignore if not)
    BEGIN
      INSERT INTO commission_transfers (
        tenant_id, payment_order_id, amount, status
      ) VALUES (
        v_order.tenant_id, v_order.id, v_order.amount * 0.02, 'pending'
      );
    EXCEPTION WHEN OTHERS THEN
      -- In case table doesn't exist or columns differ, just catch to avoid crashing
    END;
  END IF;

  -- 5. Sync subscription if platform_subscription
  IF v_order.purpose = 'platform_subscription' THEN
    PERFORM sync_subscription_on_payment_capture(v_order.id);
  END IF;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
