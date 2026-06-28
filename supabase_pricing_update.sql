ALTER TABLE public.modules_master ADD COLUMN IF NOT EXISTS test_mode_free BOOLEAN DEFAULT false;
ALTER TABLE public.modules_master ADD COLUMN IF NOT EXISTS test_mode_pro BOOLEAN DEFAULT false;
ALTER TABLE public.modules_master ADD COLUMN IF NOT EXISTS test_mode_custom BOOLEAN DEFAULT false;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
