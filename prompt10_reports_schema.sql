-- ============================================================================
-- 18. REPORTS & GST ENGINE (STAGE 0 — PROMPT #10)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 18.1 GENERIC SALES INVOICE (source of truth for all billing-heavy verticals)
-- ---------------------------------------------------------------------------
-- NOTE: Vertical-specific billing screens (Retail POS, Hospitality, Healthcare, etc.)
-- all write into this shared table so GST/Reports work identically everywhere.
-- Vertical-specific extra fields (e.g. table number, bed number) go into `meta JSONB`.

DO $$ BEGIN
    CREATE TYPE invoice_type AS ENUM ('b2b', 'b2c', 'export', 'sez');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE invoice_status AS ENUM ('draft', 'issued', 'paid', 'partially_paid', 'cancelled', 'credit_noted');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE gst_type AS ENUM ('cgst_sgst', 'igst', 'exempt', 'nil_rated', 'zero_rated');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS hsn_sac_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL = platform-wide standard code
  code TEXT NOT NULL,             -- HSN (goods, 4-8 digit) or SAC (services, 6 digit)
  code_type TEXT NOT NULL DEFAULT 'hsn', -- 'hsn' or 'sac'
  description TEXT,
  gst_rate_percent NUMERIC(5,2) NOT NULL, -- combined rate e.g. 18.00 (split 9+9 or full IGST)
  cess_rate_percent NUMERIC(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);

CREATE TABLE IF NOT EXISTS sales_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  module_code TEXT NOT NULL, -- 'retail','hospitality','healthcare', etc. — which vertical raised it
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  invoice_type invoice_type NOT NULL DEFAULT 'b2c',
  status invoice_status NOT NULL DEFAULT 'issued',
  customer_id UUID,
  customer_name TEXT,
  customer_gstin TEXT,
  seller_state_code TEXT NOT NULL,   -- 2-digit GST state code of the branch/tenant
  buyer_state_code TEXT,             -- 2-digit GST state code of the buyer (NULL for unregistered B2C without address)
  taxable_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  cgst_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  sgst_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  igst_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  cess_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  round_off NUMERIC(6,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  gst_type gst_type NOT NULL DEFAULT 'cgst_sgst',
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  reference_type TEXT,   -- links back to the vertical-specific order/booking id
  reference_id UUID,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_sales_invoices_tenant_date ON sales_invoices (tenant_id, invoice_date);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_branch_date ON sales_invoices (branch_id, invoice_date);

CREATE TABLE IF NOT EXISTS sales_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_invoice_id UUID NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  hsn_sac_id UUID REFERENCES hsn_sac_master(id) ON DELETE SET NULL,
  quantity NUMERIC(12,3) NOT NULL DEFAULT 1,
  unit_id UUID, -- references Unit Master Engine (Prompt #5) unit table
  unit_price NUMERIC(14,2) NOT NULL,
  discount_amount NUMERIC(14,2) DEFAULT 0,
  taxable_value NUMERIC(14,2) NOT NULL,
  gst_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  cgst_amount NUMERIC(14,2) DEFAULT 0,
  sgst_amount NUMERIC(14,2) DEFAULT 0,
  igst_amount NUMERIC(14,2) DEFAULT 0,
  cess_amount NUMERIC(14,2) DEFAULT 0,
  line_total NUMERIC(14,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON sales_invoice_items (sales_invoice_id);

-- Credit / Debit Notes (needed for accurate GSTR-1 reporting)
DO $$ BEGIN
    CREATE TYPE note_type AS ENUM ('credit_note', 'debit_note');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS sales_credit_debit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  original_invoice_id UUID NOT NULL REFERENCES sales_invoices(id) ON DELETE RESTRICT,
  note_type note_type NOT NULL,
  note_number TEXT NOT NULL,
  note_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT NOT NULL,
  taxable_value NUMERIC(14,2) NOT NULL,
  cgst_amount NUMERIC(14,2) DEFAULT 0,
  sgst_amount NUMERIC(14,2) DEFAULT 0,
  igst_amount NUMERIC(14,2) DEFAULT 0,
  total_amount NUMERIC(14,2) NOT NULL,
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, note_number)
);

-- ---------------------------------------------------------------------------
-- 18.2 PURCHASE / ITC SIDE (needed for GSTR-3B Input Tax Credit line)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS purchase_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  vendor_id UUID,
  vendor_name TEXT,
  vendor_gstin TEXT,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  taxable_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  cgst_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  sgst_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  igst_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  itc_eligible BOOLEAN DEFAULT true,
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, vendor_gstin, invoice_number)
);

-- ---------------------------------------------------------------------------
-- 18.3 REPORT SNAPSHOT / EXPORT LOG (audit trail of generated GST returns)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gst_return_filings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  return_type TEXT NOT NULL, -- 'GSTR-1','GSTR-3B'
  period_month DATE NOT NULL, -- first day of the return period
  report_data JSONB NOT NULL, -- frozen snapshot of the computed report at generation time
  total_taxable_value NUMERIC(14,2),
  total_tax_liability NUMERIC(14,2),
  generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'generated', -- 'generated','filed'
  filed_at TIMESTAMPTZ,
  UNIQUE(tenant_id, return_type, period_month)
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE hsn_sac_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_credit_debit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE gst_return_filings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN DROP POLICY IF EXISTS "Tenant sees own or platform HSN" ON hsn_sac_master; END $$;
CREATE POLICY "Tenant sees own or platform HSN" ON hsn_sac_master
  FOR SELECT USING (tenant_id IS NULL OR tenant_id IN (SELECT tenant_id FROM user_tenant_roles WHERE user_id = auth.uid()));

DO $$ BEGIN DROP POLICY IF EXISTS "Tenant sees own invoices" ON sales_invoices; END $$;
CREATE POLICY "Tenant sees own invoices" ON sales_invoices
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM user_tenant_roles WHERE user_id = auth.uid()));

DO $$ BEGIN DROP POLICY IF EXISTS "Tenant sees own invoice items" ON sales_invoice_items; END $$;
CREATE POLICY "Tenant sees own invoice items" ON sales_invoice_items
  FOR SELECT USING (sales_invoice_id IN (SELECT id FROM sales_invoices WHERE tenant_id IN (SELECT tenant_id FROM user_tenant_roles WHERE user_id = auth.uid())));

DO $$ BEGIN DROP POLICY IF EXISTS "Tenant sees own purchase invoices" ON purchase_invoices; END $$;
CREATE POLICY "Tenant sees own purchase invoices" ON purchase_invoices
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM user_tenant_roles WHERE user_id = auth.uid()));

DO $$ BEGIN DROP POLICY IF EXISTS "Tenant sees own GST filings" ON gst_return_filings; END $$;
CREATE POLICY "Tenant sees own GST filings" ON gst_return_filings
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM user_tenant_roles WHERE user_id = auth.uid()));

-- ============================================================================
-- CORE FUNCTIONS
-- ============================================================================

-- 18.A Compute GST split for a single line, based on seller vs buyer state
CREATE OR REPLACE FUNCTION compute_gst_split(
  p_taxable_value NUMERIC,
  p_gst_rate_percent NUMERIC,
  p_seller_state_code TEXT,
  p_buyer_state_code TEXT
) RETURNS TABLE(cgst NUMERIC, sgst NUMERIC, igst NUMERIC) AS $$
BEGIN
  IF p_buyer_state_code IS NULL OR p_buyer_state_code = p_seller_state_code THEN
    -- intra-state: split equally into CGST + SGST
    RETURN QUERY SELECT
      ROUND(p_taxable_value * (p_gst_rate_percent / 2) / 100, 2),
      ROUND(p_taxable_value * (p_gst_rate_percent / 2) / 100, 2),
      0::NUMERIC;
  ELSE
    -- inter-state: full IGST
    RETURN QUERY SELECT
      0::NUMERIC,
      0::NUMERIC,
      ROUND(p_taxable_value * p_gst_rate_percent / 100, 2);
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 18.B Generate GSTR-1 report data for a tenant + period (outward supplies)
CREATE OR REPLACE FUNCTION generate_gstr1_report(p_tenant_id UUID, p_period_month DATE)
RETURNS JSONB AS $$
DECLARE
  v_period_start DATE := date_trunc('month', p_period_month)::DATE;
  v_period_end DATE := (date_trunc('month', p_period_month) + INTERVAL '1 month - 1 day')::DATE;
  v_b2b JSONB;
  v_b2c_summary JSONB;
  v_hsn_summary JSONB;
  v_cdnr JSONB;
BEGIN
  -- B2B invoices — GSTIN-wise detail (required line-item level for GSTR-1 B2B table)
  SELECT COALESCE(jsonb_agg(row_to_json(x)), '[]'::jsonb) INTO v_b2b FROM (
    SELECT customer_gstin, invoice_number, invoice_date, taxable_value, cgst_amount, sgst_amount, igst_amount, total_amount
    FROM sales_invoices
    WHERE tenant_id = p_tenant_id AND invoice_type = 'b2b' AND status <> 'cancelled'
      AND invoice_date BETWEEN v_period_start AND v_period_end
    ORDER BY invoice_date
  ) x;

  -- B2C summary — state-wise aggregate (as per GSTR-1 B2C(S) table requirement)
  SELECT COALESCE(jsonb_agg(row_to_json(x)), '[]'::jsonb) INTO v_b2c_summary FROM (
    SELECT buyer_state_code, SUM(taxable_value) AS taxable_value, SUM(cgst_amount) AS cgst_amount,
           SUM(sgst_amount) AS sgst_amount, SUM(igst_amount) AS igst_amount, SUM(total_amount) AS total_amount
    FROM sales_invoices
    WHERE tenant_id = p_tenant_id AND invoice_type = 'b2c' AND status <> 'cancelled'
      AND invoice_date BETWEEN v_period_start AND v_period_end
    GROUP BY buyer_state_code
  ) x;

  -- HSN-wise summary (all invoice types combined, as required by GSTR-1 HSN table)
  SELECT COALESCE(jsonb_agg(row_to_json(x)), '[]'::jsonb) INTO v_hsn_summary FROM (
    SELECT h.code AS hsn_code, h.description, SUM(sii.quantity) AS total_quantity,
           SUM(sii.taxable_value) AS taxable_value, SUM(sii.cgst_amount) AS cgst_amount,
           SUM(sii.sgst_amount) AS sgst_amount, SUM(sii.igst_amount) AS igst_amount
    FROM sales_invoice_items sii
    JOIN sales_invoices si ON si.id = sii.sales_invoice_id
    LEFT JOIN hsn_sac_master h ON h.id = sii.hsn_sac_id
    WHERE si.tenant_id = p_tenant_id AND si.status <> 'cancelled'
      AND si.invoice_date BETWEEN v_period_start AND v_period_end
    GROUP BY h.code, h.description
  ) x;

  -- Credit/Debit notes for the period
  SELECT COALESCE(jsonb_agg(row_to_json(x)), '[]'::jsonb) INTO v_cdnr FROM (
    SELECT note_number, note_type, note_date, taxable_value, cgst_amount, sgst_amount, igst_amount, total_amount
    FROM sales_credit_debit_notes
    WHERE tenant_id = p_tenant_id AND note_date BETWEEN v_period_start AND v_period_end
  ) x;

  RETURN jsonb_build_object(
    'period_month', v_period_start,
    'b2b_invoices', v_b2b,
    'b2c_state_summary', v_b2c_summary,
    'hsn_summary', v_hsn_summary,
    'credit_debit_notes', v_cdnr
  );
END;
$$ LANGUAGE plpgsql;

-- 18.C Generate GSTR-3B summary (outward liability + ITC claim)
CREATE OR REPLACE FUNCTION generate_gstr3b_report(p_tenant_id UUID, p_period_month DATE)
RETURNS JSONB AS $$
DECLARE
  v_period_start DATE := date_trunc('month', p_period_month)::DATE;
  v_period_end DATE := (date_trunc('month', p_period_month) + INTERVAL '1 month - 1 day')::DATE;
  v_outward JSONB;
  v_itc JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_taxable_value', COALESCE(SUM(taxable_value), 0),
    'total_cgst', COALESCE(SUM(cgst_amount), 0),
    'total_sgst', COALESCE(SUM(sgst_amount), 0),
    'total_igst', COALESCE(SUM(igst_amount), 0),
    'total_cess', COALESCE(SUM(cess_amount), 0),
    'total_tax_liability', COALESCE(SUM(cgst_amount + sgst_amount + igst_amount + cess_amount), 0)
  ) INTO v_outward
  FROM sales_invoices
  WHERE tenant_id = p_tenant_id AND status <> 'cancelled'
    AND invoice_date BETWEEN v_period_start AND v_period_end;

  SELECT jsonb_build_object(
    'eligible_itc_cgst', COALESCE(SUM(cgst_amount) FILTER (WHERE itc_eligible), 0),
    'eligible_itc_sgst', COALESCE(SUM(sgst_amount) FILTER (WHERE itc_eligible), 0),
    'eligible_itc_igst', COALESCE(SUM(igst_amount) FILTER (WHERE itc_eligible), 0),
    'total_eligible_itc', COALESCE(SUM(cgst_amount + sgst_amount + igst_amount) FILTER (WHERE itc_eligible), 0)
  ) INTO v_itc
  FROM purchase_invoices
  WHERE tenant_id = p_tenant_id AND invoice_date BETWEEN v_period_start AND v_period_end;

  RETURN jsonb_build_object(
    'period_month', v_period_start,
    'outward_supplies', v_outward,
    'input_tax_credit', v_itc,
    'net_tax_payable', jsonb_build_object(
      'cgst', (v_outward->>'total_cgst')::NUMERIC - (v_itc->>'eligible_itc_cgst')::NUMERIC,
      'sgst', (v_outward->>'total_sgst')::NUMERIC - (v_itc->>'eligible_itc_sgst')::NUMERIC,
      'igst', (v_outward->>'total_igst')::NUMERIC - (v_itc->>'eligible_itc_igst')::NUMERIC
    )
  );
END;
$$ LANGUAGE plpgsql;

-- 18.D Freeze/snapshot a GST return (audit-safe — once filed, immutable)
CREATE OR REPLACE FUNCTION save_gst_return_filing(
  p_tenant_id UUID,
  p_branch_id UUID,
  p_return_type TEXT,
  p_period_month DATE,
  p_generated_by UUID
) RETURNS UUID AS $$
DECLARE
  v_report JSONB;
  v_filing_id UUID;
  v_taxable NUMERIC;
  v_tax NUMERIC;
BEGIN
  IF EXISTS (SELECT 1 FROM gst_return_filings WHERE tenant_id = p_tenant_id AND return_type = p_return_type AND period_month = date_trunc('month', p_period_month)::DATE AND status = 'filed') THEN
    RAISE EXCEPTION '% for % has already been filed and is locked', p_return_type, p_period_month;
  END IF;

  IF p_return_type = 'GSTR-1' THEN
    v_report := generate_gstr1_report(p_tenant_id, p_period_month);
  ELSIF p_return_type = 'GSTR-3B' THEN
    v_report := generate_gstr3b_report(p_tenant_id, p_period_month);
    v_taxable := (v_report->'outward_supplies'->>'total_taxable_value')::NUMERIC;
    v_tax := (v_report->'outward_supplies'->>'total_tax_liability')::NUMERIC;
  ELSE
    RAISE EXCEPTION 'Unsupported return_type: %', p_return_type;
  END IF;

  INSERT INTO gst_return_filings (tenant_id, branch_id, return_type, period_month, report_data, total_taxable_value, total_tax_liability, generated_by)
  VALUES (p_tenant_id, p_branch_id, p_return_type, date_trunc('month', p_period_month)::DATE, v_report, v_taxable, v_tax, p_generated_by)
  ON CONFLICT (tenant_id, return_type, period_month)
  DO UPDATE SET report_data = EXCLUDED.report_data, total_taxable_value = EXCLUDED.total_taxable_value,
                total_tax_liability = EXCLUDED.total_tax_liability, generated_at = NOW(), generated_by = EXCLUDED.generated_by
  RETURNING id INTO v_filing_id;

  RETURN v_filing_id;
END;
$$ LANGUAGE plpgsql;

-- 18.E Day Book — chronological all-transactions view for a branch/date
CREATE OR REPLACE FUNCTION get_day_book(p_tenant_id UUID, p_branch_id UUID, p_date DATE)
RETURNS TABLE(
  entry_time TIMESTAMPTZ, entry_type TEXT, reference_number TEXT,
  description TEXT, debit_amount NUMERIC, credit_amount NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT je.created_at, 'Journal'::TEXT, je.entry_number, je.narration,
         SUM(jel.amount) FILTER (WHERE jel.dc_type = 'debit'),
         SUM(jel.amount) FILTER (WHERE jel.dc_type = 'credit')
  FROM journal_entries je
  JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
  WHERE je.tenant_id = p_tenant_id AND (p_branch_id IS NULL OR je.branch_id = p_branch_id)
    AND je.entry_date = p_date AND je.status = 'posted'
  GROUP BY je.id, je.created_at, je.entry_number, je.narration
  ORDER BY je.created_at;
END;
$$ LANGUAGE plpgsql;

-- 18.F P&L Statement — Income vs Expense from Chart of Accounts for a period
CREATE OR REPLACE FUNCTION get_profit_and_loss(
  p_tenant_id UUID,
  p_branch_id UUID,      -- NULL = consolidated across all branches
  p_start_date DATE,
  p_end_date DATE
) RETURNS JSONB AS $$
DECLARE
  v_income JSONB;
  v_expense JSONB;
  v_total_income NUMERIC;
  v_total_expense NUMERIC;
BEGIN
  SELECT COALESCE(jsonb_agg(row_to_json(x)), '[]'::jsonb), COALESCE(SUM(x.net_amount), 0)
  INTO v_income, v_total_income
  FROM (
    SELECT coa.account_name,
      SUM(CASE WHEN jel.dc_type = 'credit' THEN jel.amount ELSE -jel.amount END) AS net_amount
    FROM journal_entry_lines jel
    JOIN journal_entries je ON je.id = jel.journal_entry_id
    JOIN chart_of_accounts coa ON coa.id = jel.account_id
    WHERE je.tenant_id = p_tenant_id AND (p_branch_id IS NULL OR je.branch_id = p_branch_id)
      AND je.entry_date BETWEEN p_start_date AND p_end_date AND je.status = 'posted'
      AND coa.account_group = 'income'
    GROUP BY coa.account_name
  ) x;

  SELECT COALESCE(jsonb_agg(row_to_json(x)), '[]'::jsonb), COALESCE(SUM(x.net_amount), 0)
  INTO v_expense, v_total_expense
  FROM (
    SELECT coa.account_name,
      SUM(CASE WHEN jel.dc_type = 'debit' THEN jel.amount ELSE -jel.amount END) AS net_amount
    FROM journal_entry_lines jel
    JOIN journal_entries je ON je.id = jel.journal_entry_id
    JOIN chart_of_accounts coa ON coa.id = jel.account_id
    WHERE je.tenant_id = p_tenant_id AND (p_branch_id IS NULL OR je.branch_id = p_branch_id)
      AND je.entry_date BETWEEN p_start_date AND p_end_date AND je.status = 'posted'
      AND coa.account_group = 'expense'
    GROUP BY coa.account_name
  ) x;

  RETURN jsonb_build_object(
    'period', jsonb_build_object('start_date', p_start_date, 'end_date', p_end_date),
    'income_breakdown', v_income,
    'total_income', v_total_income,
    'expense_breakdown', v_expense,
    'total_expense', v_total_expense,
    'net_profit', v_total_income - v_total_expense
  );
END;
$$ LANGUAGE plpgsql;
