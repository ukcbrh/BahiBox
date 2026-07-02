-- ============================================================================
-- PATCH 12b — PART A: PRODUCT TABLE CONSOLIDATION
-- ============================================================================

-- Step 1: Safely handle the legacy products table. 
-- Only drop and rename IF products_new actually exists, preventing double-drops on retries.
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'products_new') THEN
    DROP TABLE IF EXISTS public.products CASCADE;
    ALTER TABLE products_new RENAME TO products;
  END IF;
END $$;

-- Step 1b: Recreate products and dependent tables just in case they were accidentally cascade-dropped
-- during a failed retry of this script.
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id UUID,
  product_name TEXT NOT NULL,
  sku TEXT,
  barcode TEXT,
  unit_id UUID,
  hsn_sac_id UUID,
  purchase_price NUMERIC(14,2) DEFAULT 0,
  selling_price NUMERIC(14,2) NOT NULL,
  mrp NUMERIC(14,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, sku)
);

CREATE TABLE IF NOT EXISTS product_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
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
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
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

-- Apply Row Level Security to the tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_ledger ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN DROP POLICY IF EXISTS "Tenant sees own products" ON products; END $$;
CREATE POLICY "Tenant sees own products" ON products
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM user_tenant_roles WHERE user_id = auth.uid()));

DO $$ BEGIN DROP POLICY IF EXISTS "Tenant sees own stock" ON product_stock; END $$;
CREATE POLICY "Tenant sees own stock" ON product_stock
  FOR ALL USING (product_id IN (SELECT id FROM products WHERE tenant_id IN (SELECT tenant_id FROM user_tenant_roles WHERE user_id = auth.uid())));

DO $$ BEGIN DROP POLICY IF EXISTS "Tenant sees own stock ledger" ON stock_ledger; END $$;
CREATE POLICY "Tenant sees own stock ledger" ON stock_ledger
  FOR ALL USING (product_id IN (SELECT id FROM products WHERE tenant_id IN (SELECT tenant_id FROM user_tenant_roles WHERE user_id = auth.uid())));

-- Step 3: Re-point every function that had "products_new" hardcoded in its body
-- (table rename does NOT auto-fix literal text inside function bodies)

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

CREATE OR REPLACE FUNCTION create_pos_sale(
  p_tenant_id UUID,
  p_branch_id UUID,
  p_cashier_id UUID,
  p_customer_id UUID,
  p_seller_state_code TEXT,
  p_buyer_state_code TEXT,
  p_items JSONB,
  p_payment_method TEXT,
  p_pos_shift_id UUID
) RETURNS UUID AS $$
DECLARE
  v_item JSONB;
  v_product products%ROWTYPE;
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
BEGIN
  v_invoice_number := 'INV-' || to_char(NOW(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6);

  INSERT INTO sales_invoices (
    tenant_id, branch_id, module_code, invoice_number, invoice_type, status,
    customer_id, seller_state_code, buyer_state_code, gst_type
  ) VALUES (
    p_tenant_id, p_branch_id, 'retail', v_invoice_number, 'b2c', 'issued',
    p_customer_id, p_seller_state_code, p_buyer_state_code,
    CASE WHEN p_buyer_state_code IS NULL OR p_buyer_state_code = p_seller_state_code THEN 'cgst_sgst' ELSE 'igst' END
  ) RETURNING id INTO v_invoice_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_product FROM products WHERE id = (v_item->>'product_id')::UUID;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product not found: %', v_item->>'product_id';
    END IF;

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

CREATE OR REPLACE FUNCTION get_low_stock_products(p_tenant_id UUID, p_branch_id UUID)
RETURNS TABLE(product_id UUID, product_name TEXT, current_quantity NUMERIC, reorder_level NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.product_name, ps.current_quantity, ps.reorder_level
  FROM product_stock ps JOIN products p ON p.id = ps.product_id
  WHERE p.tenant_id = p_tenant_id AND (p_branch_id IS NULL OR ps.branch_id = p_branch_id)
    AND ps.current_quantity <= ps.reorder_level;
END;
$$ LANGUAGE plpgsql;

-- (RLS policies for products are handled in Step 1b above)


-- ============================================================================
-- PATCH 12b — PART B: UNIT MASTER ENGINE (STAGE 0 — PROMPT #5, was never created)
-- ============================================================================

CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL = platform-wide standard unit
  unit_name TEXT NOT NULL,        -- 'Kilogram', 'Litre', 'Piece', 'Box', 'Strip'
  unit_symbol TEXT NOT NULL,      -- 'Kg', 'Ltr', 'Pcs', 'Box', 'Strip'
  unit_type TEXT NOT NULL DEFAULT 'count', -- 'weight','volume','count','length'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, unit_symbol)
);

ALTER TABLE units ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN DROP POLICY IF EXISTS "Tenant sees own or platform units" ON units; END $$;
CREATE POLICY "Tenant sees own or platform units" ON units
  FOR SELECT USING (tenant_id IS NULL OR tenant_id IN (SELECT tenant_id FROM user_tenant_roles WHERE user_id = auth.uid()));

-- Seed common platform-wide units so the dropdown works immediately
INSERT INTO units (tenant_id, unit_name, unit_symbol, unit_type) VALUES
  (NULL, 'Kilogram', 'Kg', 'weight'),
  (NULL, 'Gram', 'Gm', 'weight'),
  (NULL, 'Litre', 'Ltr', 'volume'),
  (NULL, 'Millilitre', 'Ml', 'volume'),
  (NULL, 'Piece', 'Pcs', 'count'),
  (NULL, 'Box', 'Box', 'count'),
  (NULL, 'Strip', 'Strip', 'count'),
  (NULL, 'Dozen', 'Dzn', 'count'),
  (NULL, 'Meter', 'Mtr', 'length')
ON CONFLICT (tenant_id, unit_symbol) DO NOTHING;

-- Backfill: assign a default unit ('Pcs') to any existing products with a NULL unit_id
DO $$
DECLARE
  v_default_unit_id UUID;
BEGIN
  SELECT id INTO v_default_unit_id FROM units WHERE tenant_id IS NULL AND unit_symbol = 'Pcs';
  UPDATE products SET unit_id = v_default_unit_id WHERE unit_id IS NULL;
END $$;

-- Now enforce Unit as compulsory going forward, and properly FK-link it
ALTER TABLE products DROP CONSTRAINT IF EXISTS fk_products_unit;
ALTER TABLE products
  ADD CONSTRAINT fk_products_unit FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE RESTRICT;
ALTER TABLE products ALTER COLUMN unit_id SET NOT NULL;

-- Also link sales_invoice_items.unit_id (Reports Engine, Prompt #10) properly
ALTER TABLE sales_invoice_items DROP CONSTRAINT IF EXISTS fk_invoice_items_unit;
ALTER TABLE sales_invoice_items
  ADD CONSTRAINT fk_invoice_items_unit FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL;


-- ============================================================================
-- PATCH 12b — PART C: SMART DISCOUNT ENGINE (STAGE 0 — PROMPT #6, was never created)
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE discount_type AS ENUM ('percent', 'fixed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS discount_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  discount_type discount_type NOT NULL DEFAULT 'percent',
  discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  max_discount_percent_by_role JSONB DEFAULT '{}'::jsonb, -- {"cashier": 5, "manager": 20, "owner": 100}
  applies_to TEXT NOT NULL DEFAULT 'all', -- 'all','category','product'
  applies_to_id UUID, -- category_id or product_id, when applies_to <> 'all'
  valid_from DATE,
  valid_until DATE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE discount_rules ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN DROP POLICY IF EXISTS "Tenant sees own discount rules" ON discount_rules; END $$;
CREATE POLICY "Tenant sees own discount rules" ON discount_rules
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM user_tenant_roles WHERE user_id = auth.uid()));

-- Server-side enforcement: validate a discount against the role's configured max before applying.
-- Frontend billing screens should call this before calling create_pos_sale(), and create_pos_sale()
-- itself should be extended to call this per line in a future patch once role-context is wired through.
CREATE OR REPLACE FUNCTION validate_discount_for_role(
  p_tenant_id UUID,
  p_role_name TEXT,
  p_discount_type discount_type,
  p_discount_percent_equivalent NUMERIC -- caller pre-converts fixed amounts to an equivalent % of line total
) RETURNS BOOLEAN AS $$
DECLARE
  v_max_percent NUMERIC;
BEGIN
  SELECT MAX((max_discount_percent_by_role->>p_role_name)::NUMERIC)
  INTO v_max_percent
  FROM discount_rules
  WHERE tenant_id = p_tenant_id AND is_active = true
    AND max_discount_percent_by_role ? p_role_name;

  IF v_max_percent IS NULL THEN
    RETURN true; -- no rule configured for this role => unrestricted (adjust to false if conservative default preferred)
  END IF;

  RETURN p_discount_percent_equivalent <= v_max_percent;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- PATCH 12b — PART D: DELETION SAFETY RULE ENGINE (STAGE 0 — PROMPT #4, was never created)
-- ============================================================================

-- Generic function: check if a row has any child records in a given table/column
-- before allowing delete. Usable from the frontend via RPC before showing the
-- confirmation modal, or wrapped in a trigger per-table (see example trigger below).
CREATE OR REPLACE FUNCTION check_child_records_exist(
  p_child_table TEXT,
  p_child_fk_column TEXT,
  p_parent_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_count INT;
BEGIN
  EXECUTE format(
    'SELECT COUNT(*) FROM %I WHERE %I = $1',
    p_child_table, p_child_fk_column
  ) INTO v_count USING p_parent_id;

  RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Convenience wrapper the frontend can call directly before showing the
-- DeleteConfirmationModal: returns which child tables (if any) still hold records.
CREATE OR REPLACE FUNCTION safe_delete_check(
  p_parent_table TEXT,
  p_parent_id UUID,
  p_child_checks JSONB -- [{"table": "products", "column": "category_id"}, ...]
) RETURNS JSONB AS $$
DECLARE
  v_check JSONB;
  v_blocking JSONB := '[]'::jsonb;
  v_has_children BOOLEAN;
BEGIN
  FOR v_check IN SELECT * FROM jsonb_array_elements(p_child_checks)
  LOOP
    v_has_children := check_child_records_exist(v_check->>'table', v_check->>'column', p_parent_id);
    IF v_has_children THEN
      v_blocking := v_blocking || jsonb_build_array(v_check->>'table');
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'safe_to_delete', jsonb_array_length(v_blocking) = 0,
    'blocking_tables', v_blocking
  );
END;
$$ LANGUAGE plpgsql;

-- Example: apply the "child before parent" rule directly at the DB level for
-- product_categories (the most common real case in Retail) via a trigger.
CREATE OR REPLACE FUNCTION prevent_delete_if_children_exist()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'product_categories' THEN
    IF EXISTS (SELECT 1 FROM products WHERE category_id = OLD.id)
       OR EXISTS (SELECT 1 FROM product_categories WHERE parent_category_id = OLD.id) THEN
      RAISE EXCEPTION 'Cannot delete category: it still has products or sub-categories assigned. Reassign or remove them first.';
    END IF;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_delete_category ON product_categories;
CREATE TRIGGER trg_prevent_delete_category
  BEFORE DELETE ON product_categories
  FOR EACH ROW EXECUTE PROCEDURE prevent_delete_if_children_exist();
