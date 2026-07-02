-- ============================================================================
-- 19. PAYMENT GATEWAY ENGINE (STAGE 0 — PROMPT #11 — FINAL CORE ENGINE)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 19.1 ENUMS
-- ---------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE subscription_plan_tier AS ENUM ('free', 'trial', 'premium', 'enterprise');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'past_due', 'cancelled', 'expired');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE connected_account_status AS ENUM ('pending_kyc', 'kyc_submitted', 'active', 'rejected', 'suspended');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE payment_order_purpose AS ENUM ('platform_subscription', 'merchant_invoice', 'wallet_topup', 'emi_installment', 'consumer_order');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('created', 'attempted', 'captured', 'failed', 'refunded', 'partially_refunded');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE refund_status AS ENUM ('initiated', 'processed', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE gateway_provider AS ENUM ('razorpay_platform', 'razorpay_route', 'razorpay_byo', 'other_byo');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ---------------------------------------------------------------------------
-- 19.2 PLATFORM SUBSCRIPTION PLANS + MERCHANT SUBSCRIPTIONS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS platform_subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_tier subscription_plan_tier NOT NULL,
  plan_name TEXT NOT NULL,
  price_monthly NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_yearly NUMERIC(10,2) NOT NULL DEFAULT 0,
  razorpay_plan_id_monthly TEXT,   -- Razorpay Plan ID for monthly billing cycle
  razorpay_plan_id_yearly TEXT,
  max_branches INT,                -- NULL = unlimited
  included_modules TEXT[],         -- which of the 9 verticals this tier unlocks
  commission_percent NUMERIC(5,2) NOT NULL DEFAULT 0, -- platform commission on this merchant's transactions
  white_label_allowed BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TABLE IF EXISTS merchant_subscriptions CASCADE;

CREATE TABLE IF NOT EXISTS merchant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES platform_subscription_plans(id) ON DELETE RESTRICT,
  razorpay_subscription_id TEXT UNIQUE,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly', -- 'monthly' or 'yearly'
  status subscription_status NOT NULL DEFAULT 'trialing',
  trial_ends_at TIMESTAMPTZ,
  current_period_start DATE,
  current_period_end DATE,
  next_renewal_date DATE,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
DROP TRIGGER IF EXISTS update_merchant_sub_updated_at ON merchant_subscriptions;
CREATE TRIGGER update_merchant_sub_updated_at BEFORE UPDATE ON merchant_subscriptions
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS subscription_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_subscription_id UUID NOT NULL REFERENCES merchant_subscriptions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  razorpay_invoice_id TEXT,
  amount NUMERIC(10,2) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status payment_status NOT NULL DEFAULT 'created',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 19.3 MERCHANT CONNECTED ACCOUNTS (Razorpay Route / Linked Accounts)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS merchant_connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  razorpay_account_id TEXT UNIQUE,   -- Razorpay Linked Account ID (acc_XXXXX)
  legal_business_name TEXT NOT NULL,
  business_pan TEXT,
  bank_account_number TEXT,          -- store only last-4 in app layer views; full value here at rest (Supabase encryption at rest)
  bank_ifsc TEXT,
  account_holder_name TEXT,
  kyc_status connected_account_status NOT NULL DEFAULT 'pending_kyc',
  kyc_submitted_at TIMESTAMPTZ,
  kyc_approved_at TIMESTAMPTZ,
  kyc_rejection_reason TEXT,
  default_commission_percent NUMERIC(5,2), -- overrides plan-level commission if set
  auto_settlement_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
DROP TRIGGER IF EXISTS update_connected_account_updated_at ON merchant_connected_accounts;
CREATE TRIGGER update_connected_account_updated_at BEFORE UPDATE ON merchant_connected_accounts
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- White-label / Bring-Your-Own gateway credentials (Full White-Label tier merchants)
CREATE TABLE IF NOT EXISTS merchant_gateway_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  provider gateway_provider NOT NULL DEFAULT 'razorpay_byo',
  credentials JSONB NOT NULL DEFAULT '{}'::jsonb, -- {key_id, key_secret, webhook_secret} — encrypt at app layer / Supabase Vault
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
DROP TRIGGER IF EXISTS update_gateway_creds_updated_at ON merchant_gateway_credentials;
CREATE TRIGGER update_gateway_creds_updated_at BEFORE UPDATE ON merchant_gateway_credentials
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 19.4 GENERIC PAYMENT ORDERS + TRANSACTIONS (source of truth for all payments)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL = platform-level order (e.g. subscription)
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  purpose payment_order_purpose NOT NULL,
  razorpay_order_id TEXT UNIQUE,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  reference_type TEXT,      -- 'sales_invoice','emi_schedule','wallet_accounts','merchant_subscriptions'
  reference_id UUID,
  payer_type TEXT,          -- 'consumer','merchant_admin','platform'
  payer_id UUID,
  connected_account_id UUID REFERENCES merchant_connected_accounts(id) ON DELETE SET NULL, -- which merchant Route account this settles to
  commission_percent_applied NUMERIC(5,2) DEFAULT 0,
  status payment_status NOT NULL DEFAULT 'created',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_tenant ON payment_orders (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_orders_reference ON payment_orders (reference_type, reference_id);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_order_id UUID NOT NULL REFERENCES payment_orders(id) ON DELETE RESTRICT,
  razorpay_payment_id TEXT UNIQUE,
  amount NUMERIC(14,2) NOT NULL,
  method TEXT,               -- 'card','upi','netbanking','wallet', etc.
  status payment_status NOT NULL DEFAULT 'attempted',
  gateway_fee NUMERIC(10,2) DEFAULT 0,
  platform_commission_amount NUMERIC(10,2) DEFAULT 0,
  merchant_net_amount NUMERIC(14,2),  -- amount - commission - gateway fee, what actually settles to merchant
  raw_response JSONB,
  ledger_transaction_id UUID REFERENCES ledger_transactions(id) ON DELETE SET NULL,
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  captured_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_txn_order ON payment_transactions (payment_order_id);

-- ---------------------------------------------------------------------------
-- 19.5 COMMISSION TRANSFERS (Route split-settlement record)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS commission_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_transaction_id UUID NOT NULL REFERENCES payment_transactions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  razorpay_transfer_id TEXT UNIQUE,
  gross_amount NUMERIC(14,2) NOT NULL,
  commission_amount NUMERIC(10,2) NOT NULL,
  merchant_settled_amount NUMERIC(14,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending','processed','failed','reversed'
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 19.6 REFUNDS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS payment_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_transaction_id UUID NOT NULL REFERENCES payment_transactions(id) ON DELETE RESTRICT,
  razorpay_refund_id TEXT UNIQUE,
  refund_amount NUMERIC(14,2) NOT NULL CHECK (refund_amount > 0),
  reason TEXT NOT NULL,
  status refund_status NOT NULL DEFAULT 'initiated',
  initiated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ledger_transaction_id UUID REFERENCES ledger_transactions(id) ON DELETE SET NULL,
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 19.7 WEBHOOK INGESTION LOG (idempotent processing)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS payment_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razorpay_event_id TEXT NOT NULL UNIQUE, -- Razorpay's x-razorpay-event-id header, guarantees idempotency
  event_type TEXT NOT NULL,               -- 'payment.captured','payment.failed','refund.processed','subscription.charged', etc.
  signature_verified BOOLEAN NOT NULL DEFAULT false,
  raw_payload JSONB NOT NULL,
  processing_status TEXT NOT NULL DEFAULT 'received', -- 'received','processed','failed','ignored'
  processing_error TEXT,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON payment_webhook_events (processing_status)
  WHERE processing_status = 'received';

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE platform_subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_gateway_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_webhook_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN DROP POLICY IF EXISTS "Everyone can view active plans" ON platform_subscription_plans; END $$;
CREATE POLICY "Everyone can view active plans" ON platform_subscription_plans FOR SELECT USING (is_active = true);

DO $$ BEGIN DROP POLICY IF EXISTS "Tenant sees own subscription" ON merchant_subscriptions; END $$;
CREATE POLICY "Tenant sees own subscription" ON merchant_subscriptions
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM user_tenant_roles WHERE user_id = auth.uid()));

DO $$ BEGIN DROP POLICY IF EXISTS "Tenant sees own connected account" ON merchant_connected_accounts; END $$;
CREATE POLICY "Tenant sees own connected account" ON merchant_connected_accounts
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM user_tenant_roles WHERE user_id = auth.uid()));

DO $$ BEGIN DROP POLICY IF EXISTS "Tenant sees own payment orders" ON payment_orders; END $$;
CREATE POLICY "Tenant sees own payment orders" ON payment_orders
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM user_tenant_roles WHERE user_id = auth.uid()));

DO $$ BEGIN DROP POLICY IF EXISTS "Tenant sees own payment transactions" ON payment_transactions; END $$;
CREATE POLICY "Tenant sees own payment transactions" ON payment_transactions
  FOR SELECT USING (payment_order_id IN (SELECT id FROM payment_orders WHERE tenant_id IN (SELECT tenant_id FROM user_tenant_roles WHERE user_id = auth.uid())));

-- NOTE: merchant_gateway_credentials and payment_webhook_events are intentionally NOT given
-- broad SELECT policies — only service_role (backend/Edge Functions) and Super Admin should
-- touch these. Restrict via Supabase service key usage, not client-side RLS SELECT grants.

-- ============================================================================
-- CORE FUNCTIONS
-- ============================================================================

-- 19.A Create a generic payment order (called before redirecting to Razorpay Checkout)
CREATE OR REPLACE FUNCTION create_payment_order(
  p_tenant_id UUID,
  p_branch_id UUID,
  p_purpose payment_order_purpose,
  p_amount NUMERIC,
  p_reference_type TEXT,
  p_reference_id UUID,
  p_payer_type TEXT,
  p_payer_id UUID,
  p_razorpay_order_id TEXT
) RETURNS UUID AS $$
DECLARE
  v_order_id UUID;
  v_connected_account_id UUID;
  v_commission_percent NUMERIC(5,2) := 0;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be positive';
  END IF;

  -- resolve merchant's connected account + applicable commission (only relevant for merchant-facing payments)
  IF p_tenant_id IS NOT NULL AND p_purpose IN ('merchant_invoice', 'consumer_order', 'emi_installment') THEN
    SELECT id, COALESCE(default_commission_percent, 0) INTO v_connected_account_id, v_commission_percent
      FROM merchant_connected_accounts WHERE tenant_id = p_tenant_id AND kyc_status = 'active';

    IF v_commission_percent = 0 THEN
      SELECT psp.commission_percent INTO v_commission_percent
        FROM merchant_subscriptions ms JOIN platform_subscription_plans psp ON psp.id = ms.plan_id
        WHERE ms.tenant_id = p_tenant_id AND ms.status = 'active';
    END IF;
  END IF;

  INSERT INTO payment_orders (
    tenant_id, branch_id, purpose, razorpay_order_id, amount, reference_type, reference_id,
    payer_type, payer_id, connected_account_id, commission_percent_applied
  ) VALUES (
    p_tenant_id, p_branch_id, p_purpose, p_razorpay_order_id, p_amount, p_reference_type, p_reference_id,
    p_payer_type, p_payer_id, v_connected_account_id, COALESCE(v_commission_percent, 0)
  ) RETURNING id INTO v_order_id;

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 19.B Record a successful payment capture — posts to Wallet + Journal + calculates commission
-- This is called by the webhook handler (Edge Function) AFTER signature verification succeeds,
-- never directly from the client.
CREATE OR REPLACE FUNCTION capture_payment(
  p_payment_order_id UUID,
  p_razorpay_payment_id TEXT,
  p_method TEXT,
  p_gateway_fee NUMERIC,
  p_raw_response JSONB
) RETURNS UUID AS $$
DECLARE
  v_order payment_orders%ROWTYPE;
  v_commission_amount NUMERIC(10,2) := 0;
  v_merchant_net NUMERIC(14,2);
  v_transaction_id UUID;
  v_wallet_id UUID;
  v_ledger_txn_id UUID;
BEGIN
  SELECT * INTO v_order FROM payment_orders WHERE id = p_payment_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment order not found';
  END IF;
  IF v_order.status = 'captured' THEN
    RAISE EXCEPTION 'Payment already captured for this order (idempotency guard)';
  END IF;

  v_commission_amount := ROUND(v_order.amount * v_order.commission_percent_applied / 100, 2);
  v_merchant_net := v_order.amount - v_commission_amount - COALESCE(p_gateway_fee, 0);

  INSERT INTO payment_transactions (
    payment_order_id, razorpay_payment_id, amount, method, status,
    gateway_fee, platform_commission_amount, merchant_net_amount, raw_response, captured_at
  ) VALUES (
    p_payment_order_id, p_razorpay_payment_id, v_order.amount, p_method, 'captured',
    p_gateway_fee, v_commission_amount, v_merchant_net, p_raw_response, NOW()
  ) RETURNING id INTO v_transaction_id;

  UPDATE payment_orders SET status = 'captured' WHERE id = p_payment_order_id;

  -- credit the relevant wallet if this payment funds a wallet/EMI/invoice tied to a tenant
  IF v_order.tenant_id IS NOT NULL THEN
    SELECT id INTO v_wallet_id FROM wallet_accounts
      WHERE tenant_id = v_order.tenant_id AND owner_type = 'tenant_bank' LIMIT 1;

    IF v_wallet_id IS NOT NULL THEN
      v_ledger_txn_id := post_ledger_transaction(
        v_wallet_id, 'credit', v_merchant_net, 'payment_capture', v_transaction_id,
        'Payment captured via Razorpay: ' || p_razorpay_payment_id, NULL
      );
      UPDATE payment_transactions SET ledger_transaction_id = v_ledger_txn_id WHERE id = v_transaction_id;
    END IF;

    -- record commission transfer if applicable
    IF v_commission_amount > 0 THEN
      INSERT INTO commission_transfers (payment_transaction_id, tenant_id, gross_amount, commission_amount, merchant_settled_amount, status)
      VALUES (v_transaction_id, v_order.tenant_id, v_order.amount, v_commission_amount, v_merchant_net, 'pending');
    END IF;
  END IF;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 19.C Idempotent webhook event recorder — call this FIRST for every incoming webhook
CREATE OR REPLACE FUNCTION record_webhook_event(
  p_razorpay_event_id TEXT,
  p_event_type TEXT,
  p_signature_verified BOOLEAN,
  p_raw_payload JSONB
) RETURNS JSONB AS $$
DECLARE
  v_existing_id UUID;
  v_new_id UUID;
BEGIN
  SELECT id INTO v_existing_id FROM payment_webhook_events WHERE razorpay_event_id = p_razorpay_event_id;
  IF FOUND THEN
    RETURN jsonb_build_object('already_processed', true, 'id', v_existing_id);
  END IF;

  IF NOT p_signature_verified THEN
    INSERT INTO payment_webhook_events (razorpay_event_id, event_type, signature_verified, raw_payload, processing_status)
    VALUES (p_razorpay_event_id, p_event_type, false, p_raw_payload, 'ignored')
    RETURNING id INTO v_new_id;
    RETURN jsonb_build_object('already_processed', false, 'id', v_new_id, 'action', 'reject_invalid_signature');
  END IF;

  INSERT INTO payment_webhook_events (razorpay_event_id, event_type, signature_verified, raw_payload, processing_status)
  VALUES (p_razorpay_event_id, p_event_type, true, p_raw_payload, 'received')
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object('already_processed', false, 'id', v_new_id, 'action', 'process');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION mark_webhook_processed(p_webhook_event_id UUID, p_status TEXT, p_error TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  UPDATE payment_webhook_events
  SET processing_status = p_status, processing_error = p_error, processed_at = NOW()
  WHERE id = p_webhook_event_id;
END;
$$ LANGUAGE plpgsql;

-- 19.D Initiate a refund
CREATE OR REPLACE FUNCTION initiate_refund(
  p_payment_transaction_id UUID,
  p_refund_amount NUMERIC,
  p_reason TEXT,
  p_initiated_by UUID
) RETURNS UUID AS $$
DECLARE
  v_txn payment_transactions%ROWTYPE;
  v_already_refunded NUMERIC(14,2);
  v_refund_id UUID;
BEGIN
  SELECT * INTO v_txn FROM payment_transactions WHERE id = p_payment_transaction_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment transaction not found';
  END IF;

  SELECT COALESCE(SUM(refund_amount), 0) INTO v_already_refunded
    FROM payment_refunds WHERE payment_transaction_id = p_payment_transaction_id AND status <> 'failed';

  IF v_already_refunded + p_refund_amount > v_txn.amount THEN
    RAISE EXCEPTION 'Refund amount exceeds original payment (already refunded: %, requested: %, original: %)',
      v_already_refunded, p_refund_amount, v_txn.amount;
  END IF;

  INSERT INTO payment_refunds (payment_transaction_id, refund_amount, reason, initiated_by, status)
  VALUES (p_payment_transaction_id, p_refund_amount, p_reason, p_initiated_by, 'initiated')
  RETURNING id INTO v_refund_id;

  UPDATE payment_transactions SET
    status = CASE WHEN v_already_refunded + p_refund_amount = v_txn.amount THEN 'refunded' ELSE 'partially_refunded' END
  WHERE id = p_payment_transaction_id;

  RETURN v_refund_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
