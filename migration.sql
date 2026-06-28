-- Initial Migration Script for Bahibox / ERP App
-- Resolves PGRST205 / 42P01 schema cache errors

-- 1. Create explicitly referenced users table if using Supabase Auth (or link to auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  email text,
  phone text,
  role text,
  module text,
  business_name text,
  location text,
  status text DEFAULT 'Active',
  plan text,
  created_at timestamp with time zone DEFAULT now()
);

-- 2. Legacy merchants table (if still needed, though public.users is preferred for auth)
CREATE TABLE IF NOT EXISTS public.merchants (
  id text PRIMARY KEY,
  name text,
  email text,
  phone text,
  address text,
  role text,
  module text,
  business_name text,
  location text,
  status text DEFAULT 'Active',
  plan text,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. Products table
CREATE TABLE IF NOT EXISTS public.products (
  id text PRIMARY KEY,
  merchant_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric NOT NULL,
  stock integer NOT NULL DEFAULT 0,
  unit text,
  category text,
  barcode text,
  created_at timestamp with time zone DEFAULT now()
);

-- 4. Orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id text PRIMARY KEY,
  merchant_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  customer_name text,
  total_amount numeric,
  status text DEFAULT 'Completed',
  payment_method text,
  created_at timestamp with time zone DEFAULT now()
);

-- 5. Order Items table
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id text REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL,
  price numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- 6. Merchant Branding (White-Label)
CREATE TABLE IF NOT EXISTS public.merchant_branding (
  merchant_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  custom_domain text,
  brand_name text,
  primary_color text,
  secondary_color text,
  logo_url text,
  is_whitelabel_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_branding ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (For Development)
-- Note: In production, restrict access using auth.uid()
CREATE POLICY "Enable all for authenticated users" ON public.users FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.merchants FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.products FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.orders FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.order_items FOR ALL TO authenticated USING (true);

-- Merchant Branding Policies (Public read for custom domains, Authenticated write)
CREATE POLICY "Enable read for all" ON public.merchant_branding FOR SELECT USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.merchant_branding FOR ALL TO authenticated USING (true);

-- 7. Modules Master
CREATE TABLE IF NOT EXISTS public.modules_master (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  icon text,
  price numeric NOT NULL DEFAULT 49.00,
  status text DEFAULT 'Active',
  created_at timestamp with time zone DEFAULT now()
);

-- Seed modules_master
INSERT INTO public.modules_master (id, name, description, icon, price) VALUES
  ('retail', 'Retail POS', 'Point of sale and inventory', 'ShoppingCart', 49.00),
  ('manufacturing', 'Manufacturing', 'Production and tracking', 'Factory', 199.00),
  ('education', 'Education', 'School management', 'GraduationCap', 149.00),
  ('healthcare', 'Healthcare', 'Clinic and patient management', 'Stethoscope', 299.00),
  ('hospitality', 'Hospitality', 'Hotel and restaurant', 'Hotel', 99.00),
  ('transport', 'Transport', 'Fleet and logistics', 'Truck', 149.00),
  ('services', 'Services', 'Service and booking', 'Wrench', 49.00),
  ('agriculture', 'Agriculture', 'Farm and crop management', 'Tractor', 79.00)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon;

-- 8. Merchant Subscriptions
CREATE TABLE IF NOT EXISTS public.merchant_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id text REFERENCES public.merchants(id) ON DELETE CASCADE,
  module_id text REFERENCES public.modules_master(id) ON DELETE CASCADE,
  status text DEFAULT 'Active', -- 'Active', 'Suspended', 'Inactive'
  start_date timestamp with time zone DEFAULT now(),
  end_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(merchant_id, module_id)
);

ALTER TABLE public.modules_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for all" ON public.modules_master FOR SELECT USING (true);
CREATE POLICY "Enable update for authenticated users" ON public.modules_master FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON public.modules_master FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable all for authenticated users" ON public.merchant_subscriptions FOR ALL TO authenticated USING (true);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Schema Patch for modules_master description
ALTER TABLE public.modules_master ADD COLUMN IF NOT EXISTS description TEXT;
