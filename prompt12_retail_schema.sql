-- ============================================================================
-- 20. RETAIL / POS MODULE (STAGE 1 — PROMPT #12)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 20.1 PRODUCT CATALOG
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  parent_category_id UUID REFERENCES product_categories(id) ON DELETE RESTRICT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, category_name, parent_category_id)
);

CREATE TABLE IF NOT EXISTS products_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES product_categories(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  sku TEXT,
  barcode TEXT,
  unit_id UUID, -- Optional for now since unit table may not exist
  hsn_sac_id UUID REFERENCES hsn_sac_master(id) ON DELETE SET NULL,
  purchase_price NUMERIC(14,2) DEFAULT 0,
  selling_price NUMERIC(14,2) NOT NULL,
  mrp NUMERIC(14,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, sku)
);
DROP TRIGGER IF EXISTS update_products_updated_at ON products_new;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products_new
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_products_barcode ON products_new (tenant_id, barcode);
CREATE INDEX IF NOT EXISTS idx_products_name_search ON products_new USING gin (to_tsvector('simple', product_name));

-- ---------------------------------------------------------------------------
-- 20.2 BRANCH-WISE STOCK + STOCK LEDGER
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS product_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products_new(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  current_quantity NUMERIC(12,3) NOT NULL DEFAULT 0,
  reorder_level NUMERIC(12,3) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, branch_id)
);

DO $$ BEGIN
    CREATE TYPE stock_movement_type AS ENUM ('purchase_in', 'sale_out', 'adjustment_in', 'adjustment_out', 'transfer_in', 'transfer_out', 'return_in', 'return_out');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS stock_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products_new(id) ON DELETE RESTRICT,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  movement_type stock_movement_type NOT NULL,
  quantity NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
  balance_after NUMERIC(12,3) NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_product_branch ON stock_ledger (product_id, branch_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 20.3 SUPPLIERS + PURCHASE ORDERS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_name TEXT NOT NULL,
  contact_phone TEXT,
  contact_email TEXT,
  gstin TEXT,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
    CREATE TYPE purchase_order_status AS ENUM ('draft', 'ordered', 'partially_received', 'received', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  po_number TEXT NOT NULL,
  po_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status purchase_order_status NOT NULL DEFAULT 'draft',
  total_amount NUMERIC(14,2) DEFAULT 0,
  purchase_invoice_id UUID REFERENCES purchase_invoices(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, po_number)
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products_new(id) ON DELETE RESTRICT,
  ordered_quantity NUMERIC(12,3) NOT NULL,
  received_quantity NUMERIC(12,3) DEFAULT 0,
  unit_cost NUMERIC(14,2) NOT NULL,
  line_total NUMERIC(14,2) NOT NULL
);

-- ---------------------------------------------------------------------------
-- 20.4 CUSTOMERS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS retail_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  gstin TEXT,
  state_code TEXT,
  wallet_account_id UUID REFERENCES wallet_accounts(id) ON DELETE SET NULL,
  credit_limit_id UUID REFERENCES credit_limits(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, phone)
);

-- ---------------------------------------------------------------------------
-- 20.5 POS SHIFTS / CASH DRAWER
-- ---------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE pos_shift_status AS ENUM ('open', 'closed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS pos_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  cashier_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  register_name TEXT NOT NULL DEFAULT 'Register 1',
  opening_cash NUMERIC(12,2) NOT NULL DEFAULT 0,
  closing_cash NUMERIC(12,2),
  expected_cash NUMERIC(12,2),
  cash_variance NUMERIC(12,2),
  status pos_shift_status NOT NULL DEFAULT 'open',
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_pos_shifts_open ON pos_shifts (branch_id, status) WHERE status = 'open';

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE retail_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_shifts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN DROP POLICY IF EXISTS "Tenant sees own products" ON products_new; END $$;
CREATE POLICY "Tenant sees own products" ON products_new
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM user_tenant_roles WHERE user_id = auth.uid()));

DO $$ BEGIN DROP POLICY IF EXISTS "Tenant sees own stock" ON product_stock; END $$;
CREATE POLICY "Tenant sees own stock" ON product_stock
  FOR SELECT USING (product_id IN (SELECT id FROM products_new WHERE tenant_id IN (SELECT tenant_id FROM user_tenant_roles WHERE user_id = auth.uid())));

DO $$ BEGIN DROP POLICY IF EXISTS "Tenant sees own suppliers" ON suppliers; END $$;
CREATE POLICY "Tenant sees own suppliers" ON suppliers
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM user_tenant_roles WHERE user_id = auth.uid()));

DO $$ BEGIN DROP POLICY IF EXISTS "Tenant sees own purchase orders" ON purchase_orders; END $$;
CREATE POLICY "Tenant sees own purchase orders" ON purchase_orders
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM user_tenant_roles WHERE user_id = auth.uid()));

DO $$ BEGIN DROP POLICY IF EXISTS "Tenant sees own customers" ON retail_customers; END $$;
CREATE POLICY "Tenant sees own customers" ON retail_customers
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM user_tenant_roles WHERE user_id = auth.uid()));

DO $$ BEGIN DROP POLICY IF EXISTS "Tenant sees own shifts" ON pos_shifts; END $$;
CREATE POLICY "Tenant sees own shifts" ON pos_shifts
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM user_tenant_roles WHERE user_id = auth.uid()));

-- ============================================================================
-- CORE FUNCTIONS
-- ============================================================================

-- 20.A Adjust stock
CREATE OR REPLACE FUNCTION adjust_stock(
  p_product_id UUID,
  p_branch_id UUID,
  p_movement_type stock_movement_type,
  p_quantity NUMERIC,
  p_reference_type TEXT,
  p_reference_id UUID,
  p_notes TEXT,
  p_created_by UUID
) RETURNS UUID AS $$
DECLARE
  v_stock product_stock%ROWTYPE;
  v_new_qty NUMERIC(12,3);
  v_is_inward BOOLEAN;
  v_ledger_id UUID;
BEGIN
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Stock adjustment quantity must be positive';
  END IF;

  v_is_inward := p_movement_type IN ('purchase_in', 'adjustment_in', 'transfer_in', 'return_in');

  INSERT INTO product_stock (product_id, branch_id, current_quantity)
    VALUES (p_product_id, p_branch_id, 0)
    ON CONFLICT (product_id, branch_id) DO NOTHING;

  SELECT * INTO v_stock FROM product_stock WHERE product_id = p_product_id AND branch_id = p_branch_id FOR UPDATE;

  IF v_is_inward THEN
    v_new_qty := v_stock.current_quantity + p_quantity;
  ELSE
    v_new_qty := v_stock.current_quantity - p_quantity;
    IF v_new_qty < 0 THEN
      RAISE EXCEPTION 'Insufficient stock: available %, requested %', v_stock.current_quantity, p_quantity;
    END IF;
  END IF;

  UPDATE product_stock SET current_quantity = v_new_qty, updated_at = NOW()
    WHERE product_id = p_product_id AND branch_id = p_branch_id;

  INSERT INTO stock_ledger (product_id, branch_id, movement_type, quantity, balance_after, reference_type, reference_id, notes, created_by)
  VALUES (p_product_id, p_branch_id, p_movement_type, p_quantity, v_new_qty, p_reference_type, p_reference_id, p_notes, p_created_by)
  RETURNING id INTO v_ledger_id;

  RETURN v_ledger_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 20.B Create a POS sale
CREATE OR REPLACE FUNCTION create_pos_sale(
  p_tenant_id UUID,
  p_branch_id UUID,
  p_cashier_id UUID,
  p_customer_id UUID,          -- nullable for walk-in
  p_seller_state_code TEXT,
  p_buyer_state_code TEXT,
  p_items JSONB,                -- [{"product_id":"...","quantity":2,"discount_type":"percent","discount_value":10}, ...]
  p_payment_method TEXT,        -- 'cash','wallet','razorpay'
  p_pos_shift_id UUID
) RETURNS UUID AS $$
DECLARE
  v_item JSONB;
  v_product products_new%ROWTYPE;
  v_line_taxable NUMERIC(14,2);
  v_line_discount NUMERIC(14,2);
  v_gst_split RECORD;
  v_invoice_id UUID;
  v_invoice_number TEXT;
  v_total_taxable NUMERIC(14,2) := 0;
  v_total_cgst NUMERIC(14,2) := 0;
  v_total_sgst NUMERIC(14,2) := 0;
  v_total_igst NUMERIC(14,2) := 0;
  v_total_amount NUMERIC(14,2) := 0;
  v_cash_wallet_id UUID;
  v_journal_id UUID;
BEGIN
  v_invoice_number := 'INV-' || to_char(NOW(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6);

  INSERT INTO sales_invoices (
    tenant_id, branch_id, module_code, invoice_number, invoice_type, status,
    customer_id, seller_state_code, buyer_state_code, gst_type
  ) VALUES (
    p_tenant_id, p_branch_id, 'retail', v_invoice_number,
    CASE WHEN p_customer_id IS NOT NULL THEN 'b2c' ELSE 'b2c' END, 'issued',
    p_customer_id, p_seller_state_code, p_buyer_state_code,
    CASE WHEN p_buyer_state_code IS NULL OR p_buyer_state_code = p_seller_state_code THEN 'cgst_sgst' ELSE 'igst' END
  ) RETURNING id INTO v_invoice_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_product FROM products_new WHERE id = (v_item->>'product_id')::UUID;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product not found: %', v_item->>'product_id';
    END IF;

    -- apply Smart Discount Engine logic (percent or fixed)
    IF (v_item->>'discount_type') = 'percent' THEN
      v_line_discount := ROUND(v_product.selling_price * (v_item->>'quantity')::NUMERIC * (v_item->>'discount_value')::NUMERIC / 100, 2);
    ELSIF (v_item->>'discount_type') = 'fixed' THEN
      v_line_discount := (v_item->>'discount_value')::NUMERIC;
    ELSE
      v_line_discount := 0;
    END IF;

    v_line_taxable := (v_product.selling_price * (v_item->>'quantity')::NUMERIC) - v_line_discount;

    SELECT * INTO v_gst_split FROM compute_gst_split(
      v_line_taxable,
      COALESCE((SELECT gst_rate_percent FROM hsn_sac_master WHERE id = v_product.hsn_sac_id), 0),
      p_seller_state_code, p_buyer_state_code
    );

    INSERT INTO sales_invoice_items (
      sales_invoice_id, item_name, hsn_sac_id, quantity, unit_id, unit_price,
      discount_amount, taxable_value, gst_rate_percent, cgst_amount, sgst_amount, igst_amount, line_total
    ) VALUES (
      v_invoice_id, v_product.product_name, v_product.hsn_sac_id, (v_item->>'quantity')::NUMERIC, v_product.unit_id,
      v_product.selling_price, v_line_discount, v_line_taxable,
      COALESCE((SELECT gst_rate_percent FROM hsn_sac_master WHERE id = v_product.hsn_sac_id), 0),
      v_gst_split.cgst, v_gst_split.sgst, v_gst_split.igst,
      v_line_taxable + v_gst_split.cgst + v_gst_split.sgst + v_gst_split.igst
    );

    -- deduct stock for this line
    PERFORM adjust_stock(v_product.id, p_branch_id, 'sale_out', (v_item->>'quantity')::NUMERIC, 'sales_invoice', v_invoice_id, 'POS sale', p_cashier_id);

    v_total_taxable := v_total_taxable + v_line_taxable;
    v_total_cgst := v_total_cgst + v_gst_split.cgst;
    v_total_sgst := v_total_sgst + v_gst_split.sgst;
    v_total_igst := v_total_igst + v_gst_split.igst;
  END LOOP;

  v_total_amount := v_total_taxable + v_total_cgst + v_total_sgst + v_total_igst;

  UPDATE sales_invoices SET
    taxable_value = v_total_taxable, cgst_amount = v_total_cgst, sgst_amount = v_total_sgst,
    igst_amount = v_total_igst, total_amount = v_total_amount
  WHERE id = v_invoice_id;

  -- cash/wallet settlement
  IF p_payment_method = 'cash' THEN
    SELECT id INTO v_cash_wallet_id FROM wallet_accounts WHERE tenant_id = p_tenant_id AND owner_type = 'tenant_cash' LIMIT 1;
    IF v_cash_wallet_id IS NOT NULL THEN
      PERFORM post_ledger_transaction(v_cash_wallet_id, 'credit', v_total_amount, 'sales_invoice', v_invoice_id, 'POS cash sale ' || v_invoice_number, p_cashier_id);
    END IF;
    UPDATE sales_invoices SET status = 'paid' WHERE id = v_invoice_id;
  END IF;

  RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 20.C Receive stock against a Purchase Order
CREATE OR REPLACE FUNCTION receive_purchase_order(p_purchase_order_id UUID, p_received_by UUID)
RETURNS VOID AS $$
DECLARE
  v_item RECORD;
  v_po purchase_orders%ROWTYPE;
BEGIN
  SELECT * INTO v_po FROM purchase_orders WHERE id = p_purchase_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Purchase order not found'; END IF;

  FOR v_item IN SELECT * FROM purchase_order_items WHERE purchase_order_id = p_purchase_order_id
  LOOP
    PERFORM adjust_stock(v_item.product_id, v_po.branch_id, 'purchase_in',
      v_item.ordered_quantity - v_item.received_quantity, 'purchase_order', p_purchase_order_id,
      'PO receipt', p_received_by);

    UPDATE purchase_order_items SET received_quantity = ordered_quantity WHERE id = v_item.id;
  END LOOP;

  UPDATE purchase_orders SET status = 'received' WHERE id = p_purchase_order_id;
END;
$$ LANGUAGE plpgsql;

-- 20.D Low stock check
CREATE OR REPLACE FUNCTION get_low_stock_products(p_tenant_id UUID, p_branch_id UUID)
RETURNS TABLE(product_id UUID, product_name TEXT, current_quantity NUMERIC, reorder_level NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.product_name, ps.current_quantity, ps.reorder_level
  FROM product_stock ps JOIN products_new p ON p.id = ps.product_id
  WHERE p.tenant_id = p_tenant_id AND (p_branch_id IS NULL OR ps.branch_id = p_branch_id)
    AND ps.current_quantity <= ps.reorder_level;
END;
$$ LANGUAGE plpgsql;

-- 20.E Open / Close POS Shift
CREATE OR REPLACE FUNCTION open_pos_shift(p_tenant_id UUID, p_branch_id UUID, p_cashier_id UUID, p_register_name TEXT, p_opening_cash NUMERIC)
RETURNS UUID AS $$
DECLARE
  v_shift_id UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM pos_shifts WHERE cashier_id = p_cashier_id AND status = 'open') THEN
    RAISE EXCEPTION 'Cashier already has an open shift. Close it before starting a new one.';
  END IF;

  INSERT INTO pos_shifts (tenant_id, branch_id, cashier_id, register_name, opening_cash)
  VALUES (p_tenant_id, p_branch_id, p_cashier_id, p_register_name, p_opening_cash)
  RETURNING id INTO v_shift_id;

  RETURN v_shift_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION close_pos_shift(p_shift_id UUID, p_counted_cash NUMERIC)
RETURNS JSONB AS $$
DECLARE
  v_shift pos_shifts%ROWTYPE;
  v_cash_sales NUMERIC(12,2);
  v_expected NUMERIC(12,2);
  v_variance NUMERIC(12,2);
BEGIN
  SELECT * INTO v_shift FROM pos_shifts WHERE id = p_shift_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Shift not found'; END IF;
  IF v_shift.status = 'closed' THEN RAISE EXCEPTION 'Shift already closed'; END IF;

  SELECT COALESCE(SUM(si.total_amount), 0) INTO v_cash_sales
  FROM sales_invoices si
  WHERE si.branch_id = v_shift.branch_id AND si.created_at >= v_shift.opened_at AND si.status = 'paid';

  v_expected := v_shift.opening_cash + v_cash_sales;
  v_variance := p_counted_cash - v_expected;

  UPDATE pos_shifts SET
    closing_cash = p_counted_cash, expected_cash = v_expected, cash_variance = v_variance,
    status = 'closed', closed_at = NOW()
  WHERE id = p_shift_id;

  RETURN jsonb_build_object('expected_cash', v_expected, 'counted_cash', p_counted_cash, 'variance', v_variance);
END;
$$ LANGUAGE plpgsql;
