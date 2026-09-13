CREATE OR REPLACE FUNCTION activate_free_plan(p_tenant_id UUID, p_plan_id UUID)
RETURNS VOID AS $$
DECLARE
  v_start_date TIMESTAMPTZ := NOW();
  v_end_date TIMESTAMPTZ := NOW() + INTERVAL '10 years';
BEGIN
  IF EXISTS (
    SELECT 1 FROM merchant_subscriptions
    WHERE tenant_id = p_tenant_id AND LOWER(status) IN ('active', 'trialing', 'past_due')
  ) THEN
    UPDATE merchant_subscriptions
    SET plan_id = p_plan_id,
        billing_cycle = 'monthly',
        status = 'active',
        current_period_start = v_start_date,
        current_period_end = v_end_date,
        next_renewal_date = v_end_date,
        updated_at = NOW()
    WHERE tenant_id = p_tenant_id AND LOWER(status) IN ('active', 'trialing', 'past_due');
  ELSE
    INSERT INTO merchant_subscriptions (
      tenant_id, plan_id, billing_cycle, status, current_period_start, current_period_end, next_renewal_date
    ) VALUES (
      p_tenant_id, p_plan_id, 'monthly', 'active', v_start_date, v_end_date, v_end_date
    );
  END IF;

  DELETE FROM merchant_subscriptions
  WHERE tenant_id = p_tenant_id AND LOWER(status) = 'active'
  AND id NOT IN (
    SELECT id FROM merchant_subscriptions 
    WHERE tenant_id = p_tenant_id AND LOWER(status) = 'active'
    ORDER BY updated_at DESC NULLS LAST, created_at DESC
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
