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

  -- 4. Upsert merchant_subscriptions (fix case sensitivity)
  IF EXISTS (
    SELECT 1 FROM merchant_subscriptions 
    WHERE tenant_id = v_order.tenant_id AND LOWER(status) IN ('active', 'trialing', 'past_due')
  ) THEN
    UPDATE merchant_subscriptions
    SET plan_id = v_order.reference_id,
        billing_cycle = v_billing_cycle,
        status = 'active',
        current_period_start = v_start_date,
        current_period_end = v_end_date,
        next_renewal_date = v_end_date,
        updated_at = NOW()
    WHERE tenant_id = v_order.tenant_id AND LOWER(status) IN ('active', 'trialing', 'past_due');
  ELSE
    INSERT INTO merchant_subscriptions (
      tenant_id, plan_id, billing_cycle, status, current_period_start, current_period_end, next_renewal_date
    ) VALUES (
      v_order.tenant_id, v_order.reference_id, v_billing_cycle, 'active', v_start_date, v_end_date, v_end_date
    );
  END IF;
  
  -- Also delete duplicate active subscriptions keeping only the most recently updated one
  DELETE FROM merchant_subscriptions
  WHERE tenant_id = v_order.tenant_id AND LOWER(status) = 'active'
  AND id NOT IN (
    SELECT id FROM merchant_subscriptions 
    WHERE tenant_id = v_order.tenant_id AND LOWER(status) = 'active'
    ORDER BY updated_at DESC NULLS LAST, created_at DESC
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
