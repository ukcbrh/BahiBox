CREATE TABLE IF NOT EXISTS public.modules_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_name TEXT NOT NULL,
    base_price NUMERIC NOT NULL,
    icon_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    discount_percentage NUMERIC,
    fixed_discount NUMERIC,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.global_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_name TEXT UNIQUE NOT NULL,
    setting_value BOOLEAN NOT NULL
);

INSERT INTO public.modules_master (module_name, base_price) VALUES 
('Retail POS', 999), ('Manufacturing', 1499), ('Education', 1999), 
('Healthcare', 2499), ('Hospitality', 1299), ('Transport', 1499), 
('Services', 499), ('Agriculture', 999) 
ON CONFLICT DO NOTHING;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
