ALTER TABLE retail_customers ADD COLUMN IF NOT EXISTS shipping_addresses JSONB DEFAULT '[]'::jsonb;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS shipping_addresses JSONB DEFAULT '[]'::jsonb;

-- Notify pgrst to reload schema
NOTIFY pgrst, 'reload schema';
