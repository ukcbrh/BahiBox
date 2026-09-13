# Database Update Instructions

To fix the missing tables and RLS policy errors when adding Categories, Units, GSTs, or Custom Columns, you need to run the following SQL script in your Supabase project.

### Instructions:
1. Go to your **Supabase Dashboard**.
2. Navigate to the **SQL Editor** on the left menu.
3. Click **New query**.
4. **Copy and paste** the entire SQL script below.
5. Click **Run**.

```sql
-- 1. Create units table (also handles GST) if it doesn't exist
CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    unit_name VARCHAR(255) NOT NULL,
    unit_symbol VARCHAR(50) NOT NULL,
    unit_type VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create product_categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    category_name VARCHAR(255) NOT NULL,
    parent_id UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add JSONB column for custom product attributes if not exists
ALTER TABLE products ADD COLUMN IF NOT EXISTS custom_attributes JSONB DEFAULT '{}'::jsonb;

-- 4. Create custom_columns table to manage user-defined columns
CREATE TABLE IF NOT EXISTS custom_columns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    table_name VARCHAR(255) NOT NULL,
    column_name VARCHAR(255) NOT NULL,
    column_label VARCHAR(255) NOT NULL,
    column_type VARCHAR(50) DEFAULT 'text',
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Enable RLS and add full access policies for authenticated users
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to select units" ON units;
DROP POLICY IF EXISTS "Allow authenticated users to insert units" ON units;
DROP POLICY IF EXISTS "Allow authenticated users to update units" ON units;
DROP POLICY IF EXISTS "Allow authenticated users to delete units" ON units;

CREATE POLICY "Allow authenticated users to select units" ON units FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert units" ON units FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update units" ON units FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete units" ON units FOR DELETE TO authenticated USING (true);

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to select product_categories" ON product_categories;
DROP POLICY IF EXISTS "Allow authenticated users to insert product_categories" ON product_categories;
DROP POLICY IF EXISTS "Allow authenticated users to update product_categories" ON product_categories;
DROP POLICY IF EXISTS "Allow authenticated users to delete product_categories" ON product_categories;

CREATE POLICY "Allow authenticated users to select product_categories" ON product_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert product_categories" ON product_categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update product_categories" ON product_categories FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete product_categories" ON product_categories FOR DELETE TO authenticated USING (true);

ALTER TABLE custom_columns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to select custom_columns" ON custom_columns;
DROP POLICY IF EXISTS "Allow authenticated users to insert custom_columns" ON custom_columns;
DROP POLICY IF EXISTS "Allow authenticated users to update custom_columns" ON custom_columns;
DROP POLICY IF EXISTS "Allow authenticated users to delete custom_columns" ON custom_columns;

CREATE POLICY "Allow authenticated users to select custom_columns" ON custom_columns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert custom_columns" ON custom_columns FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update custom_columns" ON custom_columns FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete custom_columns" ON custom_columns FOR DELETE TO authenticated USING (true);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to select products" ON products;
DROP POLICY IF EXISTS "Allow authenticated users to insert products" ON products;
DROP POLICY IF EXISTS "Allow authenticated users to update products" ON products;
DROP POLICY IF EXISTS "Allow authenticated users to delete products" ON products;

CREATE POLICY "Allow authenticated users to select products" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert products" ON products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update products" ON products FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete products" ON products FOR DELETE TO authenticated USING (true);
```
