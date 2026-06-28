-- Supabase Schema Setup

-- Users table (formerly merchants)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
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

-- Legacy Merchants table (if required by older code)
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

-- Modules Master
CREATE TABLE IF NOT EXISTS public.modules_master (
  id text PRIMARY KEY,
  module_name text NOT NULL,
  description text,
  base_price numeric,
  created_at timestamp with time zone DEFAULT now()
);

-- Subscriptions table (merchant_subscriptions / subscriptions)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid REFERENCES public.users(id),
  module_id text REFERENCES public.modules_master(id),
  name text,
  email text,
  phone text,
  business_name text,
  module text,
  plan text,
  amount numeric,
  status text DEFAULT 'active',
  created_at timestamp with time zone DEFAULT now()
);

-- Legacy Merchant Subscriptions table
CREATE TABLE IF NOT EXISTS public.merchant_subscriptions (
  id text PRIMARY KEY,
  merchant_id text REFERENCES public.merchants(id),
  module_id text REFERENCES public.modules_master(id),
  name text,
  email text,
  phone text,
  business_name text,
  module text,
  plan text,
  amount numeric,
  status text DEFAULT 'active',
  created_at timestamp with time zone DEFAULT now()
);

-- Products table
CREATE TABLE IF NOT EXISTS public.products (
  id text PRIMARY KEY,
  merchant_id uuid REFERENCES public.users(id),
  name text NOT NULL,
  price numeric NOT NULL,
  stock integer NOT NULL DEFAULT 0,
  unit text,
  category text,
  barcode text,
  created_at timestamp with time zone DEFAULT now()
);

-- Orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id text PRIMARY KEY,
  merchant_id uuid REFERENCES public.users(id),
  customer_name text,
  total_amount numeric,
  status text DEFAULT 'Completed',
  payment_method text,
  created_at timestamp with time zone DEFAULT now()
);

-- Order Items table
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id text REFERENCES public.products(id),
  quantity integer NOT NULL,
  price numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS and create policies (if needed)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules_master ENABLE ROW LEVEL SECURITY;

-- Allow read/write access for authenticated users (update these for production)
CREATE POLICY "Enable all for authenticated users" ON public.users FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.merchants FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.subscriptions FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.merchant_subscriptions FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.products FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.orders FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.order_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.modules_master FOR ALL TO authenticated USING (true);

-- Merchant Branding
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

ALTER TABLE public.merchant_branding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read for all" ON public.merchant_branding FOR SELECT USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.merchant_branding FOR ALL TO authenticated USING (true);

-- Schema Patch for modules_master description
ALTER TABLE public.modules_master ADD COLUMN IF NOT EXISTS description TEXT;
