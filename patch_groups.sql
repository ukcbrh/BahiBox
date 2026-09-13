CREATE TABLE IF NOT EXISTS customer_supplier_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'Both',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, name)
);
ALTER TABLE customer_supplier_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to select customer_supplier_groups" ON customer_supplier_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert customer_supplier_groups" ON customer_supplier_groups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update customer_supplier_groups" ON customer_supplier_groups FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete customer_supplier_groups" ON customer_supplier_groups FOR DELETE TO authenticated USING (true);
NOTIFY pgrst, 'reload schema';
