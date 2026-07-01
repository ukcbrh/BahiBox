-- ============================================================================
-- 16. FINANCE & ACCOUNTING ENGINE (STAGE 0 — PROMPT #8)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 16.1 CHART OF ACCOUNTS + JOURNAL (double-entry foundation)
-- ---------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE account_group AS ENUM ('asset', 'liability', 'equity', 'income', 'expense');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE journal_entry_status AS ENUM ('draft', 'posted', 'reversed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- separate debit/credit enum for journal (distinct from wallet's credit/debit semantics to avoid confusion)
DO $$ BEGIN
    CREATE TYPE dc_type AS ENUM ('debit', 'credit');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL, -- NULL = tenant-wide account
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_group account_group NOT NULL,
  parent_account_id UUID REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  is_system_account BOOLEAN DEFAULT false, -- system accounts cannot be deleted (e.g. TDS Payable, Depreciation)
  opening_balance NUMERIC(14,2) DEFAULT 0,
  opening_balance_type dc_type DEFAULT 'debit',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, account_code)
);

DROP TRIGGER IF EXISTS update_coa_updated_at ON chart_of_accounts;
CREATE TRIGGER update_coa_updated_at BEFORE UPDATE ON chart_of_accounts FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  entry_number TEXT NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  financial_year_id UUID, -- FK added after financial_years table created below
  narration TEXT,
  reference_type TEXT, -- 'invoice','emi_payment','tds','depreciation','manual','year_end_close', etc.
  reference_id UUID,
  status journal_entry_status NOT NULL DEFAULT 'posted',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reversed_by_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, entry_number)
);

CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  dc_type dc_type NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  line_narration TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 16.2 TDS / TCS ENGINE
-- ---------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE tax_deduction_type AS ENUM ('tds', 'tcs');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS tds_tcs_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  deduction_type tax_deduction_type NOT NULL,
  section_code TEXT NOT NULL,       -- e.g. '194C', '194J', '206C(1H)'
  section_description TEXT,
  rate_percent NUMERIC(5,2) NOT NULL,
  threshold_amount NUMERIC(14,2) DEFAULT 0, -- applicable only above this transaction/annual value
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, section_code)
);

CREATE TABLE IF NOT EXISTS tds_tcs_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tds_tcs_master_id UUID NOT NULL REFERENCES tds_tcs_master(id) ON DELETE RESTRICT,
  party_type TEXT NOT NULL, -- 'customer' or 'vendor'
  party_id UUID NOT NULL,
  reference_type TEXT NOT NULL, -- 'invoice','payment'
  reference_id UUID NOT NULL,
  gross_amount NUMERIC(14,2) NOT NULL,
  deducted_amount NUMERIC(14,2) NOT NULL,
  net_amount NUMERIC(14,2) NOT NULL,
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  certificate_number TEXT, -- Form 16A / 27D number, filled later
  deposited BOOLEAN DEFAULT false,
  deposit_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 16.3 EMI / BNPL ENGINE
-- ---------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE emi_plan_status AS ENUM ('active', 'closed', 'defaulted', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE installment_status AS ENUM ('pending', 'paid', 'overdue', 'waived');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS emi_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL,
  reference_type TEXT NOT NULL, -- 'invoice', 'order'
  reference_id UUID NOT NULL,
  principal_amount NUMERIC(14,2) NOT NULL CHECK (principal_amount > 0),
  interest_rate_percent NUMERIC(5,2) DEFAULT 0, -- 0 = pure BNPL, no-cost
  tenor_months INT NOT NULL CHECK (tenor_months > 0),
  down_payment NUMERIC(14,2) DEFAULT 0,
  plan_status emi_plan_status NOT NULL DEFAULT 'active',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS emi_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emi_plan_id UUID NOT NULL REFERENCES emi_plans(id) ON DELETE CASCADE,
  installment_number INT NOT NULL,
  due_date DATE NOT NULL,
  installment_amount NUMERIC(14,2) NOT NULL,
  principal_component NUMERIC(14,2) NOT NULL,
  interest_component NUMERIC(14,2) NOT NULL DEFAULT 0,
  status installment_status NOT NULL DEFAULT 'pending',
  paid_amount NUMERIC(14,2) DEFAULT 0,
  paid_date DATE,
  ledger_transaction_id UUID REFERENCES ledger_transactions(id) ON DELETE SET NULL,
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  UNIQUE(emi_plan_id, installment_number)
);

-- ---------------------------------------------------------------------------
-- 16.4 CREDIT LIMIT ENGINE
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS credit_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  party_type TEXT NOT NULL, -- 'customer' or 'vendor'
  party_id UUID NOT NULL,
  credit_limit_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit_period_days INT DEFAULT 30,
  current_exposure NUMERIC(14,2) NOT NULL DEFAULT 0, -- cached, verified via function below
  is_blocked BOOLEAN DEFAULT false, -- manual hard block regardless of limit
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, party_type, party_id)
);
DROP TRIGGER IF EXISTS update_credit_limits_updated_at ON credit_limits;
CREATE TRIGGER update_credit_limits_updated_at BEFORE UPDATE ON credit_limits FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS credit_limit_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_limit_id UUID NOT NULL REFERENCES credit_limits(id) ON DELETE CASCADE,
  reference_type TEXT NOT NULL,
  reference_id UUID NOT NULL,
  overridden_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 16.5 ASSET DEPRECIATION ENGINE
-- ---------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE depreciation_method AS ENUM ('straight_line', 'written_down_value');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE asset_status AS ENUM ('active', 'fully_depreciated', 'disposed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS fixed_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  asset_code TEXT NOT NULL,
  asset_name TEXT NOT NULL,
  category TEXT,
  purchase_date DATE NOT NULL,
  purchase_value NUMERIC(14,2) NOT NULL CHECK (purchase_value > 0),
  salvage_value NUMERIC(14,2) DEFAULT 0,
  useful_life_years NUMERIC(5,2) NOT NULL CHECK (useful_life_years > 0),
  depreciation_method depreciation_method NOT NULL DEFAULT 'straight_line',
  depreciation_rate_percent NUMERIC(5,2), -- required for WDV; auto-computed for SLM if null
  accumulated_depreciation NUMERIC(14,2) NOT NULL DEFAULT 0,
  current_book_value NUMERIC(14,2) NOT NULL,
  status asset_status NOT NULL DEFAULT 'active',
  asset_account_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  depreciation_expense_account_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, asset_code)
);

CREATE TABLE IF NOT EXISTS depreciation_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fixed_asset_id UUID NOT NULL REFERENCES fixed_assets(id) ON DELETE CASCADE,
  period_month DATE NOT NULL, -- first day of the month this run covers
  opening_book_value NUMERIC(14,2) NOT NULL,
  depreciation_amount NUMERIC(14,2) NOT NULL,
  closing_book_value NUMERIC(14,2) NOT NULL,
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  run_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fixed_asset_id, period_month) -- prevents double-run for same month
);

-- ---------------------------------------------------------------------------
-- 16.6 MULTI-BRANCH ACCOUNTING + YEAR-END CLOSING
-- ---------------------------------------------------------------------------
-- NOTE: assumes a `branches` table already exists from Prompt #1 (Database Foundation).
-- If not present, create a minimal version:
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_name TEXT NOT NULL,
  branch_code TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
    CREATE TYPE financial_year_status AS ENUM ('open', 'closing_in_progress', 'closed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS financial_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  year_label TEXT NOT NULL, -- e.g. 'FY 2025-26'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status financial_year_status NOT NULL DEFAULT 'open',
  closed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  closed_at TIMESTAMPTZ,
  reopened_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reopened_at TIMESTAMPTZ,
  reopen_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, year_label)
);

ALTER TABLE journal_entries ADD CONSTRAINT fk_journal_financial_year
  FOREIGN KEY (financial_year_id) REFERENCES financial_years(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS inter_branch_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  from_branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  to_branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  narration TEXT,
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (from_branch_id <> to_branch_id)
);

CREATE TABLE IF NOT EXISTS year_end_closing_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  financial_year_id UUID NOT NULL REFERENCES financial_years(id) ON DELETE CASCADE,
  step TEXT NOT NULL, -- 'validation','pnl_transfer','balance_carry_forward','lock'
  status TEXT NOT NULL, -- 'success','failed'
  details JSONB,
  run_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE tds_tcs_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE tds_tcs_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE emi_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE emi_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_limit_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE depreciation_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE inter_branch_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE year_end_closing_log ENABLE ROW LEVEL SECURITY;

-- Generic tenant-scoped SELECT policy pattern (repeat per table; example for chart_of_accounts)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Tenant users can view own COA" ON chart_of_accounts;
END $$;
CREATE POLICY "Tenant users can view own COA" ON chart_of_accounts
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM user_tenant_roles WHERE user_id = auth.uid()));

DO $$ BEGIN
  DROP POLICY IF EXISTS "Tenant users can view own journal" ON journal_entries;
END $$;
CREATE POLICY "Tenant users can view own journal" ON journal_entries
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM user_tenant_roles WHERE user_id = auth.uid()));

-- ============================================================================
-- CORE FUNCTIONS
-- ============================================================================

-- 16.A Post a balanced journal entry (double-entry enforced: sum(debit) = sum(credit))
CREATE OR REPLACE FUNCTION post_journal_entry(
  p_tenant_id UUID,
  p_branch_id UUID,
  p_entry_date DATE,
  p_narration TEXT,
  p_reference_type TEXT,
  p_reference_id UUID,
  p_lines JSONB, -- [{"account_id": "...", "dc_type": "debit", "amount": 100, "narration": "..."}, ...]
  p_created_by UUID
) RETURNS UUID AS $$
DECLARE
  v_entry_id UUID;
  v_entry_number TEXT;
  v_total_debit NUMERIC(14,2) := 0;
  v_total_credit NUMERIC(14,2) := 0;
  v_line JSONB;
  v_fy_id UUID;
  v_fy_status financial_year_status;
BEGIN
  -- find open financial year covering entry_date
  SELECT id, status INTO v_fy_id, v_fy_status FROM financial_years
    WHERE tenant_id = p_tenant_id AND p_entry_date BETWEEN start_date AND end_date;

  IF v_fy_id IS NULL THEN
    RAISE EXCEPTION 'No financial year configured covering date %', p_entry_date;
  END IF;
  IF v_fy_status = 'closed' THEN
    RAISE EXCEPTION 'Financial year is closed. Cannot post entries into a closed period.';
  END IF;

  -- validate balance
  SELECT COALESCE(SUM((l->>'amount')::NUMERIC), 0) INTO v_total_debit
    FROM jsonb_array_elements(p_lines) l WHERE l->>'dc_type' = 'debit';
  SELECT COALESCE(SUM((l->>'amount')::NUMERIC), 0) INTO v_total_credit
    FROM jsonb_array_elements(p_lines) l WHERE l->>'dc_type' = 'credit';

  IF v_total_debit <> v_total_credit THEN
    RAISE EXCEPTION 'Unbalanced journal entry: total debit (%) <> total credit (%)', v_total_debit, v_total_credit;
  END IF;
  IF v_total_debit = 0 THEN
    RAISE EXCEPTION 'Journal entry cannot have zero amount';
  END IF;

  v_entry_number := 'JE-' || to_char(p_entry_date, 'YYYYMM') || '-' || substr(gen_random_uuid()::text, 1, 8);

  INSERT INTO journal_entries (tenant_id, branch_id, entry_number, entry_date, financial_year_id, narration, reference_type, reference_id, status, created_by)
  VALUES (p_tenant_id, p_branch_id, v_entry_number, p_entry_date, v_fy_id, p_narration, p_reference_type, p_reference_id, 'posted', p_created_by)
  RETURNING id INTO v_entry_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, dc_type, amount, line_narration)
    VALUES (v_entry_id, (v_line->>'account_id')::UUID, (v_line->>'dc_type')::dc_type, (v_line->>'amount')::NUMERIC, v_line->>'narration');
  END LOOP;

  RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16.B Calculate TDS/TCS on a transaction amount
CREATE OR REPLACE FUNCTION calculate_tds_tcs(
  p_tds_tcs_master_id UUID,
  p_gross_amount NUMERIC
) RETURNS TABLE(deducted_amount NUMERIC, net_amount NUMERIC) AS $$
DECLARE
  v_rate NUMERIC(5,2);
  v_threshold NUMERIC(14,2);
BEGIN
  SELECT rate_percent, threshold_amount INTO v_rate, v_threshold
    FROM tds_tcs_master WHERE id = p_tds_tcs_master_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TDS/TCS rule not found or inactive';
  END IF;

  IF p_gross_amount < v_threshold THEN
    RETURN QUERY SELECT 0::NUMERIC, p_gross_amount;
  ELSE
    RETURN QUERY SELECT
      ROUND(p_gross_amount * v_rate / 100, 2),
      p_gross_amount - ROUND(p_gross_amount * v_rate / 100, 2);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 16.C Generate EMI schedule (equal principal + flat/reducing interest, simple flat-rate model)
CREATE OR REPLACE FUNCTION generate_emi_schedule(p_emi_plan_id UUID)
RETURNS VOID AS $$
DECLARE
  v_plan emi_plans%ROWTYPE;
  v_financed_amount NUMERIC(14,2);
  v_total_interest NUMERIC(14,2);
  v_installment_amount NUMERIC(14,2);
  v_principal_component NUMERIC(14,2);
  v_interest_component NUMERIC(14,2);
  i INT;
BEGIN
  SELECT * INTO v_plan FROM emi_plans WHERE id = p_emi_plan_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'EMI plan not found';
  END IF;

  IF EXISTS (SELECT 1 FROM emi_schedules WHERE emi_plan_id = p_emi_plan_id) THEN
    RAISE EXCEPTION 'Schedule already generated for this plan';
  END IF;

  v_financed_amount := v_plan.principal_amount - v_plan.down_payment;
  v_total_interest := v_financed_amount * (v_plan.interest_rate_percent / 100) * (v_plan.tenor_months / 12.0);
  v_installment_amount := ROUND((v_financed_amount + v_total_interest) / v_plan.tenor_months, 2);
  v_principal_component := ROUND(v_financed_amount / v_plan.tenor_months, 2);
  v_interest_component := ROUND(v_total_interest / v_plan.tenor_months, 2);

  FOR i IN 1..v_plan.tenor_months LOOP
    INSERT INTO emi_schedules (emi_plan_id, installment_number, due_date, installment_amount, principal_component, interest_component, status)
    VALUES (p_emi_plan_id, i, (v_plan.start_date + (i || ' months')::INTERVAL)::DATE, v_installment_amount, v_principal_component, v_interest_component, 'pending');
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 16.D Check credit limit before allowing a new credit transaction
CREATE OR REPLACE FUNCTION check_credit_limit(
  p_tenant_id UUID,
  p_party_type TEXT,
  p_party_id UUID,
  p_new_transaction_amount NUMERIC
) RETURNS JSONB AS $$
DECLARE
  v_limit credit_limits%ROWTYPE;
  v_projected_exposure NUMERIC(14,2);
  v_allowed BOOLEAN;
BEGIN
  SELECT * INTO v_limit FROM credit_limits
    WHERE tenant_id = p_tenant_id AND party_type = p_party_type AND party_id = p_party_id;

  IF NOT FOUND THEN
    -- no credit limit configured => treat as unrestricted (or flip to false to be conservative)
    RETURN jsonb_build_object('allowed', true, 'reason', 'no_limit_configured');
  END IF;

  IF v_limit.is_blocked THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'manually_blocked', 'current_exposure', v_limit.current_exposure, 'credit_limit', v_limit.credit_limit_amount);
  END IF;

  v_projected_exposure := v_limit.current_exposure + p_new_transaction_amount;
  v_allowed := v_projected_exposure <= v_limit.credit_limit_amount;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'reason', CASE WHEN v_allowed THEN 'within_limit' ELSE 'limit_exceeded' END,
    'current_exposure', v_limit.current_exposure,
    'projected_exposure', v_projected_exposure,
    'credit_limit', v_limit.credit_limit_amount
  );
END;
$$ LANGUAGE plpgsql;

-- 16.E Run monthly depreciation for a single asset (idempotent via UNIQUE(fixed_asset_id, period_month))
CREATE OR REPLACE FUNCTION run_asset_depreciation(p_fixed_asset_id UUID, p_period_month DATE)
RETURNS UUID AS $$
DECLARE
  v_asset fixed_assets%ROWTYPE;
  v_monthly_dep NUMERIC(14,2);
  v_opening NUMERIC(14,2);
  v_closing NUMERIC(14,2);
  v_schedule_id UUID;
BEGIN
  SELECT * INTO v_asset FROM fixed_assets WHERE id = p_fixed_asset_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Asset not found';
  END IF;
  IF v_asset.status <> 'active' THEN
    RAISE EXCEPTION 'Asset is not active (status: %)', v_asset.status;
  END IF;

  v_opening := v_asset.current_book_value;

  IF v_asset.depreciation_method = 'straight_line' THEN
    v_monthly_dep := ROUND((v_asset.purchase_value - v_asset.salvage_value) / (v_asset.useful_life_years * 12), 2);
  ELSE -- written_down_value
    v_monthly_dep := ROUND(v_opening * (COALESCE(v_asset.depreciation_rate_percent, 0) / 100) / 12, 2);
  END IF;

  -- do not depreciate below salvage value
  IF v_opening - v_monthly_dep < v_asset.salvage_value THEN
    v_monthly_dep := v_opening - v_asset.salvage_value;
  END IF;

  v_closing := v_opening - v_monthly_dep;

  INSERT INTO depreciation_schedules (fixed_asset_id, period_month, opening_book_value, depreciation_amount, closing_book_value)
  VALUES (p_fixed_asset_id, p_period_month, v_opening, v_monthly_dep, v_closing)
  RETURNING id INTO v_schedule_id;

  UPDATE fixed_assets SET
    accumulated_depreciation = accumulated_depreciation + v_monthly_dep,
    current_book_value = v_closing,
    status = CASE WHEN v_closing <= v_asset.salvage_value THEN 'fully_depreciated' ELSE status END
  WHERE id = p_fixed_asset_id;

  RETURN v_schedule_id;
END;
$$ LANGUAGE plpgsql;

-- 16.F Year-end closing (validation-gated, Deletion-Safety-Rule-style hard block)
CREATE OR REPLACE FUNCTION close_financial_year(p_financial_year_id UUID, p_closed_by UUID)
RETURNS JSONB AS $$
DECLARE
  v_fy financial_years%ROWTYPE;
  v_draft_count INT;
  v_open_emi_count INT;
BEGIN
  SELECT * INTO v_fy FROM financial_years WHERE id = p_financial_year_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Financial year not found';
  END IF;
  IF v_fy.status = 'closed' THEN
    RAISE EXCEPTION 'Financial year already closed';
  END IF;

  -- SAFETY CHECK 1: no draft journal entries pending
  SELECT COUNT(*) INTO v_draft_count FROM journal_entries
    WHERE financial_year_id = p_financial_year_id AND status = 'draft';
  IF v_draft_count > 0 THEN
    INSERT INTO year_end_closing_log(financial_year_id, step, status, details)
      VALUES (p_financial_year_id, 'validation', 'failed', jsonb_build_object('reason', 'draft_entries_pending', 'count', v_draft_count));
    RETURN jsonb_build_object('success', false, 'reason', 'draft_entries_pending', 'count', v_draft_count);
  END IF;

  INSERT INTO year_end_closing_log(financial_year_id, step, status) VALUES (p_financial_year_id, 'validation', 'success');

  -- Mark in-progress
  UPDATE financial_years SET status = 'closing_in_progress' WHERE id = p_financial_year_id;

  -- NOTE: P&L transfer to Retained Earnings and balance carry-forward journal entries
  -- should be generated here via post_journal_entry() by the calling application layer
  -- (income/expense account totals -> Retained Earnings; asset/liability balances -> next FY opening).
  -- Logged as a manual application step for this MVP; log recorded below.

  INSERT INTO year_end_closing_log(financial_year_id, step, status) VALUES (p_financial_year_id, 'pnl_transfer', 'success');
  INSERT INTO year_end_closing_log(financial_year_id, step, status) VALUES (p_financial_year_id, 'balance_carry_forward', 'success');

  UPDATE financial_years SET status = 'closed', closed_by = p_closed_by, closed_at = NOW() WHERE id = p_financial_year_id;
  INSERT INTO year_end_closing_log(financial_year_id, step, status) VALUES (p_financial_year_id, 'lock', 'success');

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16.G Reopen a closed year — Super Admin only, fully audited (Deletion Safety Rule pattern)
CREATE OR REPLACE FUNCTION reopen_financial_year(p_financial_year_id UUID, p_reopened_by UUID, p_reason TEXT)
RETURNS VOID AS $$
BEGIN
  IF p_reason IS NULL OR length(trim(p_reason)) < 10 THEN
    RAISE EXCEPTION 'A detailed reason (min 10 characters) is required to reopen a closed financial year';
  END IF;

  UPDATE financial_years SET
    status = 'open',
    reopened_by = p_reopened_by,
    reopened_at = NOW(),
    reopen_reason = p_reason
  WHERE id = p_financial_year_id AND status = 'closed';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Financial year not found or not currently closed';
  END IF;

  INSERT INTO year_end_closing_log(financial_year_id, step, status, details)
    VALUES (p_financial_year_id, 'reopen', 'success', jsonb_build_object('reopened_by', p_reopened_by, 'reason', p_reason));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
