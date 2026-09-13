-- BahiBox Foundation Schema (Stage 0) - Idempotent Version
-- Target: Supabase (PostgreSQL)

-- ============================================================================
-- 1. ENUMS (Safe creation)
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE business_type AS ENUM ('retail', 'manufacturing', 'hospitality', 'healthcare', 'education', 'logistics', 'agri', 'services');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE tenant_status AS ENUM ('trial', 'active', 'suspended', 'deleted');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE plan_type AS ENUM ('free', 'basic', 'branded', 'white_label');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE role_scope AS ENUM ('platform', 'tenant');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE admin_role AS ENUM ('super_admin', 'support_manager', 'onboarding_officer', 'finance_auditor');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================================
-- 2. TRIGGERS & FUNCTIONS (Common)
-- ============================================================================
-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language plpgsql;

-- ============================================================================
-- 3. CORE PLATFORM TABLES
-- ============================================================================

-- 3.1. Users Table (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- 3.2. Tenants Table
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  business_type business_type NOT NULL,
  status tenant_status DEFAULT 'trial',
  plan_type plan_type DEFAULT 'free',
  custom_domain TEXT,
  subdomain TEXT UNIQUE,
  logo_url TEXT,
  theme_color TEXT,
  app_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- 3.3. Branches Table
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  branch_name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  is_main_branch BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
DROP TRIGGER IF EXISTS update_branches_updated_at ON branches;
CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- 3.4. Roles Master Table
CREATE TABLE IF NOT EXISTS roles_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name TEXT UNIQUE NOT NULL,
  role_scope role_scope NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.5. User Tenant Roles (Many-to-Many RBAC)
CREATE TABLE IF NOT EXISTS user_tenant_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  tenant_id UUID REFERENCES tenants(id) ON DELETE RESTRICT, -- Nullable for platform-level roles
  branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT, -- Nullable if access spans all branches
  role_name TEXT NOT NULL REFERENCES roles_master(role_name) ON DELETE RESTRICT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
DROP TRIGGER IF EXISTS update_user_tenant_roles_updated_at ON user_tenant_roles;
CREATE TRIGGER update_user_tenant_roles_updated_at BEFORE UPDATE ON user_tenant_roles FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- ============================================================================
-- 4. PLATFORM SUPER ADMIN TABLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS platform_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  admin_role admin_role NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
DROP TRIGGER IF EXISTS update_platform_admins_updated_at ON platform_admins;
CREATE TRIGGER update_platform_admins_updated_at BEFORE UPDATE ON platform_admins FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- ============================================================================
-- 5. CONSUMER APP TABLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS consumer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  city TEXT,
  preferred_pillars TEXT[], -- e.g., ['mart', 'food']
  kyc_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
DROP TRIGGER IF EXISTS update_consumer_profiles_updated_at ON consumer_profiles;
CREATE TRIGGER update_consumer_profiles_updated_at BEFORE UPDATE ON consumer_profiles FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- ============================================================================
-- 6. AUDIT & SAFETY TABLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  action_type TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_id UUID NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 7. INDEXES (Performance Optimization)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_branches_tenant_id ON branches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_tenant_roles_user_id ON user_tenant_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tenant_roles_tenant_id ON user_tenant_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_table, target_id);

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS) HELPER FUNCTIONS
-- ============================================================================
-- Check if a user is an active platform admin
CREATE OR REPLACE FUNCTION is_platform_admin(checking_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM platform_admins 
    WHERE user_id = checking_user_id AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get all active tenant_ids for a user
CREATE OR REPLACE FUNCTION get_user_tenant_ids(checking_user_id UUID)
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT tenant_id FROM user_tenant_roles
  WHERE user_id = checking_user_id AND is_active = true AND tenant_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tenant_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own profile" ON users;
  DROP POLICY IF EXISTS "Users can update own profile" ON users;
  DROP POLICY IF EXISTS "Platform admins can view all users" ON users;
  DROP POLICY IF EXISTS "Tenants viewable by associated users" ON tenants;
  DROP POLICY IF EXISTS "Branches viewable by tenant users" ON branches;
  DROP POLICY IF EXISTS "Roles are viewable by all authenticated users" ON roles_master;
  DROP POLICY IF EXISTS "Users can view own roles" ON user_tenant_roles;
  DROP POLICY IF EXISTS "Only super admins can view platform admins" ON platform_admins;
  DROP POLICY IF EXISTS "Consumers can view own profile" ON consumer_profiles;
  DROP POLICY IF EXISTS "Consumers can update own profile" ON consumer_profiles;
END $$;

-- Users Table Policies
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Platform admins can view all users" ON users FOR SELECT USING (is_platform_admin(auth.uid()));

-- Tenants Table Policies
CREATE POLICY "Tenants viewable by associated users" ON tenants FOR SELECT USING (
  id IN (SELECT get_user_tenant_ids(auth.uid())) OR is_platform_admin(auth.uid())
);

-- Branches Table Policies
CREATE POLICY "Branches viewable by tenant users" ON branches FOR SELECT USING (
  tenant_id IN (SELECT get_user_tenant_ids(auth.uid())) OR is_platform_admin(auth.uid())
);

-- Roles Master Policies
CREATE POLICY "Roles are viewable by all authenticated users" ON roles_master FOR SELECT TO authenticated USING (true);

-- User Tenant Roles Policies
CREATE POLICY "Users can view own roles" ON user_tenant_roles FOR SELECT USING (
  user_id = auth.uid() OR is_platform_admin(auth.uid())
);

-- Platform Admins Policies
CREATE POLICY "Only super admins can view platform admins" ON platform_admins FOR SELECT USING (is_platform_admin(auth.uid()));

-- Consumer Profiles Policies
CREATE POLICY "Consumers can view own profile" ON consumer_profiles FOR SELECT USING (
  user_id = auth.uid() OR is_platform_admin(auth.uid())
);
CREATE POLICY "Consumers can update own profile" ON consumer_profiles FOR UPDATE USING (user_id = auth.uid());

-- ============================================================================
-- 10. AUTH & RBAC ENGINE (STAGE 0)
-- ============================================================================

-- 10.1 Permissions Master
CREATE TABLE IF NOT EXISTS permissions_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key TEXT UNIQUE NOT NULL,
  module_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10.2 Role Permissions
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name TEXT NOT NULL REFERENCES roles_master(role_name) ON DELETE RESTRICT,
  permission_key TEXT NOT NULL REFERENCES permissions_master(permission_key) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_name, permission_key)
);

-- 10.3 Login Sessions (Security Audit)
CREATE TABLE IF NOT EXISTS login_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  ip_address TEXT,
  device_info TEXT,
  login_at TIMESTAMPTZ DEFAULT NOW(),
  logout_at TIMESTAMPTZ
);

-- ============================================================================
-- 11. RBAC HELPER FUNCTIONS
-- ============================================================================

-- Get all permissions for a user in a specific tenant (or platform admin)
CREATE OR REPLACE FUNCTION get_user_permissions(checking_user_id UUID, checking_tenant_id UUID)
RETURNS TABLE (permission_key TEXT) AS $$
BEGIN
  -- If platform admin, they might get all or specific admin permissions
  IF is_platform_admin(checking_user_id) THEN
    RETURN QUERY SELECT p.permission_key FROM permissions_master p;
  ELSE
    RETURN QUERY 
    SELECT rp.permission_key 
    FROM user_tenant_roles utr
    JOIN role_permissions rp ON utr.role_name = rp.role_name
    WHERE utr.user_id = checking_user_id 
      AND (utr.tenant_id = checking_tenant_id OR utr.tenant_id IS NULL)
      AND utr.is_active = true;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has a specific permission
CREATE OR REPLACE FUNCTION user_has_permission(checking_user_id UUID, checking_tenant_id UUID, req_permission_key TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM get_user_permissions(checking_user_id, checking_tenant_id) p
    WHERE p.permission_key = req_permission_key
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user profile after Auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown User'),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on auth.users (requires superuser, typically handled by Supabase Dashboard)
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================================
-- 12. RLS POLICIES FOR RBAC
-- ============================================================================
ALTER TABLE permissions_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Permissions viewable by authenticated users" ON permissions_master;
  DROP POLICY IF EXISTS "Role permissions viewable by authenticated users" ON role_permissions;
  DROP POLICY IF EXISTS "Platform admins can manage permissions" ON permissions_master;
  DROP POLICY IF EXISTS "Platform admins can manage role permissions" ON role_permissions;
  DROP POLICY IF EXISTS "Users can view own sessions" ON login_sessions;
  DROP POLICY IF EXISTS "System can insert sessions" ON login_sessions;
  DROP POLICY IF EXISTS "Only platform admins can view audit logs" ON audit_logs;
  DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
END $$;

CREATE POLICY "Permissions viewable by authenticated users" ON permissions_master FOR SELECT TO authenticated USING (true);
CREATE POLICY "Role permissions viewable by authenticated users" ON role_permissions FOR SELECT TO authenticated USING (true);

-- Only platform admins can modify roles and permissions
CREATE POLICY "Platform admins can manage permissions" ON permissions_master USING (is_platform_admin(auth.uid()));
CREATE POLICY "Platform admins can manage role permissions" ON role_permissions USING (is_platform_admin(auth.uid()));

-- Login sessions RLS
CREATE POLICY "Users can view own sessions" ON login_sessions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System can insert sessions" ON login_sessions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Audit Logs Policies
CREATE POLICY "Only platform admins can view audit logs" ON audit_logs FOR SELECT USING (is_platform_admin(auth.uid()));
CREATE POLICY "System can insert audit logs" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================================
-- 13. SEED DATA (Roles & Permissions)
-- ============================================================================
-- Insert basic roles if not exists
INSERT INTO roles_master (role_name, role_scope, description) VALUES
  ('owner', 'tenant', 'Full access to tenant'),
  ('manager', 'tenant', 'Manager access to tenant'),
  ('staff', 'tenant', 'Staff access to tenant'),
  ('cashier', 'tenant', 'Cashier access, restricted to billing'),
  ('super_admin', 'platform', 'Platform super admin'),
  ('support_manager', 'platform', 'Platform support access')
ON CONFLICT (role_name) DO NOTHING;

-- Insert basic permissions
INSERT INTO permissions_master (permission_key, module_name, description) VALUES
  ('pos.billing.create', 'retail', 'Create a bill'),
  ('inventory.product.delete', 'retail', 'Delete a product'),
  ('reports.gst.view', 'core', 'View GST reports'),
  ('staff.manage', 'core', 'Manage staff and roles')
ON CONFLICT (permission_key) DO NOTHING;

-- Assign permissions to roles
INSERT INTO role_permissions (role_name, permission_key) VALUES
  ('owner', 'pos.billing.create'),
  ('owner', 'inventory.product.delete'),
  ('owner', 'reports.gst.view'),
  ('owner', 'staff.manage'),
  ('cashier', 'pos.billing.create')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 14. DYNAMIC MENU LOADER (STAGE 0)
-- ============================================================================

-- 14.1 Menu Modules
CREATE TABLE IF NOT EXISTS menu_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key TEXT UNIQUE NOT NULL, -- 'retail', 'manufacturing', 'core'
  module_name TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
DROP TRIGGER IF EXISTS update_menu_modules_updated_at ON menu_modules;
CREATE TRIGGER update_menu_modules_updated_at BEFORE UPDATE ON menu_modules FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- 14.2 Menu Items
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_module_id UUID NOT NULL REFERENCES menu_modules(id) ON DELETE CASCADE,
  parent_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE, -- For sub-menus
  item_key TEXT UNIQUE NOT NULL,
  item_label TEXT NOT NULL,
  icon_name TEXT,
  route_path TEXT,
  required_permission TEXT REFERENCES permissions_master(permission_key) ON DELETE SET NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
DROP TRIGGER IF EXISTS update_menu_items_updated_at ON menu_items;
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- 14.3 Menu RLS Policies
ALTER TABLE menu_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Menu modules viewable by authenticated users" ON menu_modules;
  DROP POLICY IF EXISTS "Menu items viewable by authenticated users" ON menu_items;
  DROP POLICY IF EXISTS "Platform admins can manage menu modules" ON menu_modules;
  DROP POLICY IF EXISTS "Platform admins can manage menu items" ON menu_items;
END $$;

CREATE POLICY "Menu modules viewable by authenticated users" ON menu_modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Menu items viewable by authenticated users" ON menu_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Platform admins can manage menu modules" ON menu_modules USING (is_platform_admin(auth.uid()));
CREATE POLICY "Platform admins can manage menu items" ON menu_items USING (is_platform_admin(auth.uid()));

-- 14.4 Menu RPC Function
DO $$ BEGIN
  DROP FUNCTION IF EXISTS get_tenant_menu(UUID, UUID);
END $$;

CREATE OR REPLACE FUNCTION get_tenant_menu(checking_tenant_id UUID, checking_user_id UUID)
RETURNS TABLE (
  module_id UUID,
  module_key TEXT,
  module_name TEXT,
  module_icon TEXT,
  module_order INTEGER,
  item_id UUID,
  item_key TEXT,
  item_label TEXT,
  item_icon TEXT,
  route_path TEXT,
  parent_item_id UUID,
  item_order INTEGER
) AS $$
DECLARE
  t_business_type TEXT;
BEGIN
  -- Get the tenant's business type
  SELECT business_type::TEXT INTO t_business_type FROM tenants WHERE id = checking_tenant_id;

  RETURN QUERY
  WITH user_perms AS (
    SELECT permission_key FROM get_user_permissions(checking_user_id, checking_tenant_id)
  )
  SELECT 
    mm.id AS module_id,
    mm.module_key,
    mm.module_name,
    mm.icon_name AS module_icon,
    mm.display_order AS module_order,
    mi.id AS item_id,
    mi.item_key,
    mi.item_label,
    mi.icon_name AS item_icon,
    mi.route_path,
    mi.parent_item_id,
    mi.display_order AS item_order
  FROM menu_modules mm
  JOIN menu_items mi ON mm.id = mi.menu_module_id
  WHERE (LOWER(mm.module_key) = LOWER(t_business_type) OR mm.module_key = 'core')
    AND mm.is_active = true
    AND mi.is_active = true
    AND (
      mi.required_permission IS NULL 
      OR mi.required_permission IN (SELECT permission_key FROM user_perms)
      OR is_platform_admin(checking_user_id)
    )
  ORDER BY mm.display_order ASC, mi.parent_item_id ASC NULLS FIRST, mi.display_order ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14.5 Seed Data for Menus
-- Insert Modules
INSERT INTO menu_modules (id, module_key, module_name, icon_name, display_order) VALUES
  ('11111111-1111-1111-1111-111111111111', 'retail', 'Retail POS', 'Store', 10),
  ('22222222-2222-2222-2222-222222222222', 'manufacturing', 'Manufacturing ERP', 'Factory', 20),
  ('33333333-3333-3333-3333-333333333333', 'hospitality', 'Hospitality', 'Utensils', 30),
  ('44444444-4444-4444-4444-444444444444', 'healthcare', 'Healthcare', 'Activity', 40),
  ('55555555-5555-5555-5555-555555555555', 'education', 'Education', 'GraduationCap', 50),
  ('66666666-6666-6666-6666-666666666666', 'logistics', 'Logistics', 'Truck', 60),
  ('77777777-7777-7777-7777-777777777777', 'agri', 'Agri-Tech', 'Tractor', 70),
  ('88888888-8888-8888-8888-888888888888', 'services', 'Services', 'Wrench', 80),
  ('99999999-9999-9999-9999-999999999999', 'core', 'Platform & Admin', 'Settings', 100)
ON CONFLICT (module_key) DO NOTHING;

-- Insert Retail Menu Items
INSERT INTO menu_items (menu_module_id, item_key, item_label, icon_name, route_path, required_permission, display_order) VALUES
  ('11111111-1111-1111-1111-111111111111', 'retail.pos', 'Billing', 'ShoppingCart', '/merchant/pos', 'pos.billing.create', 10),
  ('11111111-1111-1111-1111-111111111111', 'retail.inventory', 'Inventory', 'Package', '/merchant/inventory', NULL, 20),
  ('11111111-1111-1111-1111-111111111111', 'retail.gst', 'GST Reports', 'FileText', '/merchant/gst', 'reports.gst.view', 30),
  ('11111111-1111-1111-1111-111111111111', 'retail.purchase', 'Purchase', 'ShoppingBag', '/merchant/purchase', NULL, 40),
  ('11111111-1111-1111-1111-111111111111', 'retail.ledger', 'Cash & Bank', 'Landmark', '/merchant/ledger', NULL, 50),
  ('11111111-1111-1111-1111-111111111111', 'retail.marketing', 'Marketing', 'Megaphone', '/merchant/marketing', NULL, 60),
  ('11111111-1111-1111-1111-111111111111', 'retail.payroll', 'Payroll', 'Users', '/merchant/payroll', NULL, 70),
  ('11111111-1111-1111-1111-111111111111', 'retail.reports', 'Reports', 'BarChart3', '/merchant/reports', NULL, 80)
ON CONFLICT (item_key) DO NOTHING;

-- Insert Core Menu Items
INSERT INTO menu_items (menu_module_id, item_key, item_label, icon_name, route_path, required_permission, display_order) VALUES
  ('99999999-9999-9999-9999-999999999999', 'core.staff', 'Staff & Roles', 'Users', '/merchant/staff', 'staff.manage', 10),
  ('99999999-9999-9999-9999-999999999999', 'core.settings', 'Admin Settings', 'Settings', '/merchant/settings', NULL, 20)
ON CONFLICT (item_key) DO NOTHING;

-- Insert Healthcare Placeholders
INSERT INTO menu_items (menu_module_id, item_key, item_label, icon_name, route_path, required_permission, display_order) VALUES
  ('44444444-4444-4444-4444-444444444444', 'healthcare.opd', 'OPD', 'Stethoscope', '/merchant/opd', NULL, 10),
  ('44444444-4444-4444-4444-444444444444', 'healthcare.ipd', 'IPD/Wards', 'Bed', '/merchant/ipd', NULL, 20),
  ('44444444-4444-4444-4444-444444444444', 'healthcare.pharmacy', 'Pharmacy', 'Pill', '/merchant/pharmacy', NULL, 30),
  ('44444444-4444-4444-4444-444444444444', 'healthcare.billing', 'Billing & TPA', 'Receipt', '/merchant/health_billing', NULL, 40)
ON CONFLICT (item_key) DO NOTHING;

-- Insert Manufacturing Placeholders
INSERT INTO menu_items (menu_module_id, item_key, item_label, icon_name, route_path, required_permission, display_order) VALUES
  ('22222222-2222-2222-2222-222222222222', 'manufacturing.bom', 'Bill of Materials', 'ListTree', '/merchant/bom', NULL, 10),
  ('22222222-2222-2222-2222-222222222222', 'manufacturing.production', 'Production', 'Factory', '/merchant/production', NULL, 20)
ON CONFLICT (item_key) DO NOTHING;

-- ============================================================================
-- 15. WALLET & LEDGER ENGINE (STAGE 0)
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE wallet_owner_type AS ENUM ('consumer', 'staff', 'tenant_cash', 'tenant_bank');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM ('credit', 'debit');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE batch_status AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 15.1 Wallet Accounts
CREATE TABLE IF NOT EXISTS wallet_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  owner_type wallet_owner_type NOT NULL,
  owner_id UUID NOT NULL,
  account_label TEXT NOT NULL,
  current_balance NUMERIC(14,2) DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
DROP TRIGGER IF EXISTS update_wallet_accounts_updated_at ON wallet_accounts;
CREATE TRIGGER update_wallet_accounts_updated_at BEFORE UPDATE ON wallet_accounts FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- 15.2 Ledger Transactions
CREATE TABLE IF NOT EXISTS ledger_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_account_id UUID NOT NULL REFERENCES wallet_accounts(id) ON DELETE RESTRICT,
  transaction_type transaction_type NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  balance_after NUMERIC(14,2) NOT NULL,
  reference_type TEXT NOT NULL,
  reference_id UUID,
  description TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15.3 Settlement Batches
CREATE TABLE IF NOT EXISTS settlement_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  wallet_account_id UUID NOT NULL REFERENCES wallet_accounts(id) ON DELETE RESTRICT,
  batch_status batch_status NOT NULL DEFAULT 'pending',
  total_amount NUMERIC(14,2) NOT NULL,
  settlement_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE wallet_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_batches ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Tenant users can view tenant wallets" ON wallet_accounts;
  DROP POLICY IF EXISTS "Consumers can view own wallets" ON wallet_accounts;
  DROP POLICY IF EXISTS "Tenant users can view tenant ledger" ON ledger_transactions;
  DROP POLICY IF EXISTS "Consumers can view own ledger" ON ledger_transactions;
END $$;

CREATE POLICY "Tenant users can view tenant wallets" ON wallet_accounts FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM user_tenant_roles WHERE user_id = auth.uid()));
CREATE POLICY "Consumers can view own wallets" ON wallet_accounts FOR SELECT USING (owner_type = 'consumer' AND owner_id = auth.uid());
CREATE POLICY "Tenant users can view tenant ledger" ON ledger_transactions FOR SELECT USING (wallet_account_id IN (SELECT id FROM wallet_accounts WHERE tenant_id IN (SELECT tenant_id FROM user_tenant_roles WHERE user_id = auth.uid())));
CREATE POLICY "Consumers can view own ledger" ON ledger_transactions FOR SELECT USING (wallet_account_id IN (SELECT id FROM wallet_accounts WHERE owner_type = 'consumer' AND owner_id = auth.uid()));

-- Functions
CREATE OR REPLACE FUNCTION post_ledger_transaction(
  p_wallet_account_id UUID,
  p_type transaction_type,
  p_amount NUMERIC,
  p_reference_type TEXT,
  p_reference_id UUID,
  p_description TEXT,
  p_created_by UUID
) RETURNS UUID AS $$
DECLARE
  v_wallet wallet_accounts%ROWTYPE;
  v_new_balance NUMERIC(14,2);
  v_transaction_id UUID;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  SELECT * INTO v_wallet FROM wallet_accounts WHERE id = p_wallet_account_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet account not found';
  END IF;

  IF p_type = 'credit' THEN
    v_new_balance := v_wallet.current_balance + p_amount;
  ELSE
    v_new_balance := v_wallet.current_balance - p_amount;
    
    IF v_wallet.owner_type = 'consumer' AND v_new_balance < 0 THEN
      RAISE EXCEPTION 'Insufficient balance in consumer wallet';
    END IF;
  END IF;

  UPDATE wallet_accounts SET current_balance = v_new_balance WHERE id = p_wallet_account_id;

  INSERT INTO ledger_transactions (
    wallet_account_id, transaction_type, amount, balance_after, reference_type, reference_id, description, created_by
  ) VALUES (
    p_wallet_account_id, p_type, p_amount, v_new_balance, p_reference_type, p_reference_id, p_description, p_created_by
  ) RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION verify_wallet_balance(p_wallet_account_id UUID) RETURNS JSONB AS $$
DECLARE
  v_wallet_balance NUMERIC(14,2);
  v_calculated_balance NUMERIC(14,2);
  v_match BOOLEAN;
BEGIN
  SELECT current_balance INTO v_wallet_balance FROM wallet_accounts WHERE id = p_wallet_account_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet account not found';
  END IF;

  SELECT COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE -amount END), 0)
  INTO v_calculated_balance
  FROM ledger_transactions
  WHERE wallet_account_id = p_wallet_account_id;

  v_match := (v_wallet_balance = v_calculated_balance);

  RETURN json_build_object(
    'wallet_id', p_wallet_account_id,
    'stored_balance', v_wallet_balance,
    'calculated_balance', v_calculated_balance,
    'is_match', v_match
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================================================
-- 17. NOTIFICATION ENGINE (STAGE 0 — PROMPT #9)
-- Provider-agnostic: SMS + WhatsApp + App Push (FCM) + Offline-Scan Auto-Sync Fallback
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 17.1 CORE ENUMS
-- ---------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE notification_channel AS ENUM ('sms', 'whatsapp', 'push', 'email', 'in_app');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE notification_status AS ENUM ('queued', 'sending', 'sent', 'delivered', 'failed', 'read', 'opted_out');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE notification_priority AS ENUM ('critical', 'high', 'normal', 'low');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE provider_type AS ENUM (
      'twilio', 'msg91', 'textlocal',              -- SMS providers
      'gupshup', 'interakt', 'whatsapp_cloud_api',  -- WhatsApp providers
      'fcm',                                        -- Push provider
      'smtp', 'sendgrid'                             -- Email providers
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ---------------------------------------------------------------------------
-- 17.2 PROVIDER CONFIG (Platform-level default + Merchant-level override)
-- ---------------------------------------------------------------------------
-- tenant_id = NULL  → this is a PLATFORM-LEVEL default config (managed by Super Admin)
-- tenant_id = <uuid> → this merchant has brought their own provider/keys (white-label / BYO)

CREATE TABLE IF NOT EXISTS notification_provider_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL = platform default
  channel notification_channel NOT NULL,
  provider provider_type NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_default_for_channel BOOLEAN DEFAULT false, -- only one default per (tenant_id, channel)
  -- secrets stored via Supabase Vault / encrypted column in real deployment;
  -- here we keep a JSONB placeholder — DO NOT expose via any SELECT policy to non-admins
  credentials JSONB NOT NULL DEFAULT '{}'::jsonb, -- {api_key, sender_id, account_sid, from_number, etc.}
  monthly_quota INT,          -- optional cap (platform can throttle a merchant)
  used_this_month INT DEFAULT 0,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_notif_provider_updated_at ON notification_provider_config;
CREATE TRIGGER update_notif_provider_updated_at BEFORE UPDATE ON notification_provider_config
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- only one default provider per tenant+channel (partial unique index; tenant_id NULL handled separately)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_default_provider_per_tenant_channel
  ON notification_provider_config (tenant_id, channel)
  WHERE is_default_for_channel = true AND tenant_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_default_provider_platform_channel
  ON notification_provider_config (channel)
  WHERE is_default_for_channel = true AND tenant_id IS NULL;

-- ---------------------------------------------------------------------------
-- 17.3 TEMPLATES (per tenant, per channel, per event)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL = platform-wide system template
  event_code TEXT NOT NULL,        -- 'order_placed','payment_success','emi_due','otp','low_stock', etc.
  channel notification_channel NOT NULL,
  template_name TEXT NOT NULL,
  template_body TEXT NOT NULL,     -- supports {{variable}} placeholders
  whatsapp_template_id TEXT,       -- Meta/Gupshup pre-approved template ID (WhatsApp needs pre-approval)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, event_code, channel)
);

DROP TRIGGER IF EXISTS update_notif_template_updated_at ON notification_templates;
CREATE TRIGGER update_notif_template_updated_at BEFORE UPDATE ON notification_templates
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 17.4 RECIPIENT PREFERENCES / OPT-OUT (TRAI + WhatsApp policy compliance)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  recipient_type TEXT NOT NULL,   -- 'customer','staff','driver','merchant_admin'
  recipient_id UUID NOT NULL,
  channel notification_channel NOT NULL,
  is_opted_in BOOLEAN DEFAULT true,
  opted_out_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, recipient_type, recipient_id, channel)
);

-- ---------------------------------------------------------------------------
-- 17.5 NOTIFICATION QUEUE + LOGS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL = platform-level broadcast
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  channel notification_channel NOT NULL,
  event_code TEXT NOT NULL,
  priority notification_priority NOT NULL DEFAULT 'normal',
  recipient_type TEXT NOT NULL,
  recipient_id UUID,                  -- NULL allowed for ad-hoc/manual sends
  recipient_address TEXT NOT NULL,    -- phone number / email / device token
  template_id UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
  rendered_body TEXT NOT NULL,        -- final message after placeholder substitution
  reference_type TEXT,                -- 'invoice','emi_reminder','broadcast','otp', etc.
  reference_id UUID,
  status notification_status NOT NULL DEFAULT 'queued',
  attempt_count INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  provider_used provider_type,
  provider_message_id TEXT,           -- ID returned by SMS/WhatsApp/FCM provider for tracking
  failure_reason TEXT,
  scheduled_for TIMESTAMPTZ DEFAULT NOW(), -- allows future-dated sends (EMI reminders etc.)
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_queue_pending ON notification_queue (status, scheduled_for)
  WHERE status IN ('queued', 'failed');
CREATE INDEX IF NOT EXISTS idx_notif_queue_tenant ON notification_queue (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_queue_recipient ON notification_queue (recipient_type, recipient_id);

-- Append-only delivery event log (webhook callbacks from providers land here)
CREATE TABLE IF NOT EXISTS notification_delivery_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_queue_id UUID NOT NULL REFERENCES notification_queue(id) ON DELETE CASCADE,
  event_status notification_status NOT NULL,
  provider_payload JSONB,
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 17.6 OFFLINE-SCAN AUTO-SYNC FALLBACK
-- (For POS/billing devices that go offline — actions queue locally, then this
--  table holds the server-side mirror once connectivity resumes & app syncs)
-- ---------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE offline_sync_status AS ENUM ('pending_sync', 'synced', 'conflict', 'discarded');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS offline_action_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  device_id TEXT NOT NULL,             -- local device/session identifier
  action_type TEXT NOT NULL,           -- 'invoice_created','stock_scan','notification_trigger', etc.
  local_uuid UUID NOT NULL,            -- client-generated idempotency key (prevents duplicate on re-sync)
  payload JSONB NOT NULL,
  created_offline_at TIMESTAMPTZ NOT NULL, -- device local timestamp
  sync_status offline_sync_status NOT NULL DEFAULT 'pending_sync',
  synced_at TIMESTAMPTZ,
  server_reference_id UUID,            -- ID of the row created once processed (e.g. invoice id)
  conflict_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, device_id, local_uuid)  -- idempotent re-sync safe
);

CREATE INDEX IF NOT EXISTS idx_offline_queue_pending ON offline_action_queue (tenant_id, sync_status)
  WHERE sync_status = 'pending_sync';

-- ---------------------------------------------------------------------------
-- 17.7 GLOBAL BROADCAST (Super Admin → all merchants / all consumers)
-- ---------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE broadcast_audience AS ENUM ('all_merchants', 'all_consumers', 'specific_module', 'specific_tenant_list');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS platform_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message_body TEXT NOT NULL,
  audience broadcast_audience NOT NULL,
  target_module_code TEXT,            -- used when audience = 'specific_module'
  target_tenant_ids UUID[],           -- used when audience = 'specific_tenant_list'
  channels notification_channel[] NOT NULL DEFAULT ARRAY['in_app']::notification_channel[],
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  sent_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft','queued','sent'
  created_by UUID NOT NULL REFERENCES platform_admins(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE notification_provider_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_delivery_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_action_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_broadcasts ENABLE ROW LEVEL SECURITY;

-- Merchant users see only their tenant's rows; platform default rows (tenant_id NULL)
-- are visible to everyone for read (so app knows a fallback provider exists) but
-- credentials JSONB should be masked at the application layer for non-admins.
DO $$ BEGIN DROP POLICY IF EXISTS "Tenant sees own or platform provider config" ON notification_provider_config; END $$;
CREATE POLICY "Tenant sees own or platform provider config" ON notification_provider_config
  FOR SELECT USING (
    tenant_id IS NULL OR tenant_id IN (SELECT tenant_id FROM user_tenant_roles WHERE user_id = auth.uid())
  );

DO $$ BEGIN DROP POLICY IF EXISTS "Tenant sees own or platform templates" ON notification_templates; END $$;
CREATE POLICY "Tenant sees own or platform templates" ON notification_templates
  FOR SELECT USING (
    tenant_id IS NULL OR tenant_id IN (SELECT tenant_id FROM user_tenant_roles WHERE user_id = auth.uid())
  );

DO $$ BEGIN DROP POLICY IF EXISTS "Tenant sees own queue" ON notification_queue; END $$;
CREATE POLICY "Tenant sees own queue" ON notification_queue
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM user_tenant_roles WHERE user_id = auth.uid())
  );

DO $$ BEGIN DROP POLICY IF EXISTS "Tenant sees own offline queue" ON offline_action_queue; END $$;
CREATE POLICY "Tenant sees own offline queue" ON offline_action_queue
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM user_tenant_roles WHERE user_id = auth.uid())
  );

DO $$ BEGIN DROP POLICY IF EXISTS "Platform admins manage broadcasts" ON platform_broadcasts; END $$;
CREATE POLICY "Platform admins manage broadcasts" ON platform_broadcasts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM platform_admins WHERE id = auth.uid())
  );

-- ============================================================================
-- CORE FUNCTIONS
-- ============================================================================

-- 17.A Enqueue a notification (renders template, checks opt-out, respects priority)
CREATE OR REPLACE FUNCTION enqueue_notification(
  p_tenant_id UUID,
  p_branch_id UUID,
  p_channel notification_channel,
  p_event_code TEXT,
  p_recipient_type TEXT,
  p_recipient_id UUID,
  p_recipient_address TEXT,
  p_variables JSONB,          -- {"customer_name": "Rahul", "amount": "500"}
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_priority notification_priority DEFAULT 'normal',
  p_scheduled_for TIMESTAMPTZ DEFAULT NOW()
) RETURNS UUID AS $$
DECLARE
  v_template notification_templates%ROWTYPE;
  v_body TEXT;
  v_key TEXT;
  v_val TEXT;
  v_is_opted_in BOOLEAN := true;
  v_queue_id UUID;
BEGIN
  -- opt-out check (default true if no explicit preference row exists)
  SELECT is_opted_in INTO v_is_opted_in FROM notification_preferences
    WHERE tenant_id = p_tenant_id AND recipient_type = p_recipient_type
      AND recipient_id = p_recipient_id AND channel = p_channel;

  IF v_is_opted_in IS FALSE THEN
    RAISE NOTICE 'Recipient has opted out of % notifications — skipping', p_channel;
    RETURN NULL;
  END IF;

  -- fetch tenant-specific template, fallback to platform-wide template
  SELECT * INTO v_template FROM notification_templates
    WHERE tenant_id = p_tenant_id AND event_code = p_event_code AND channel = p_channel AND is_active = true;
  IF NOT FOUND THEN
    SELECT * INTO v_template FROM notification_templates
      WHERE tenant_id IS NULL AND event_code = p_event_code AND channel = p_channel AND is_active = true;
  END IF;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active template found for event % on channel %', p_event_code, p_channel;
  END IF;

  v_body := v_template.template_body;
  FOR v_key, v_val IN SELECT * FROM jsonb_each_text(COALESCE(p_variables, '{}'::jsonb))
  LOOP
    v_body := replace(v_body, '{{' || v_key || '}}', v_val);
  END LOOP;

  INSERT INTO notification_queue (
    tenant_id, branch_id, channel, event_code, priority, recipient_type, recipient_id,
    recipient_address, template_id, rendered_body, reference_type, reference_id, scheduled_for
  ) VALUES (
    p_tenant_id, p_branch_id, p_channel, p_event_code, p_priority, p_recipient_type, p_recipient_id,
    p_recipient_address, v_template.id, v_body, p_reference_type, p_reference_id, p_scheduled_for
  ) RETURNING id INTO v_queue_id;

  RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 17.B Fetch the next batch of due, unsent notifications (called by an Edge
-- Function / cron worker every ~30s, which then calls the actual SMS/WhatsApp/FCM API)
CREATE OR REPLACE FUNCTION fetch_pending_notifications(p_limit INT DEFAULT 50)
RETURNS SETOF notification_queue AS $$
BEGIN
  RETURN QUERY
    UPDATE notification_queue
    SET status = 'sending', attempt_count = attempt_count + 1
    WHERE id IN (
      SELECT id FROM notification_queue
      WHERE status IN ('queued', 'failed')
        AND scheduled_for <= NOW()
        AND attempt_count < max_attempts
        AND (next_retry_at IS NULL OR next_retry_at <= NOW())
      ORDER BY priority = 'critical' DESC, priority = 'high' DESC, scheduled_for ASC
      LIMIT p_limit
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- 17.C Mark result after the worker actually calls the provider API
CREATE OR REPLACE FUNCTION update_notification_result(
  p_notification_id UUID,
  p_status notification_status,
  p_provider_used provider_type DEFAULT NULL,
  p_provider_message_id TEXT DEFAULT NULL,
  p_failure_reason TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_row notification_queue%ROWTYPE;
  v_backoff_minutes INT;
BEGIN
  SELECT * INTO v_row FROM notification_queue WHERE id = p_notification_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Notification not found';
  END IF;

  IF p_status = 'failed' AND v_row.attempt_count < v_row.max_attempts THEN
    v_backoff_minutes := POWER(2, v_row.attempt_count) * 2; -- exponential backoff: 2,4,8 min
    UPDATE notification_queue SET
      status = 'failed', failure_reason = p_failure_reason,
      next_retry_at = NOW() + (v_backoff_minutes || ' minutes')::INTERVAL
    WHERE id = p_notification_id;
  ELSE
    UPDATE notification_queue SET
      status = p_status,
      provider_used = COALESCE(p_provider_used, provider_used),
      provider_message_id = COALESCE(p_provider_message_id, provider_message_id),
      failure_reason = p_failure_reason,
      sent_at = CASE WHEN p_status IN ('sent','delivered') THEN NOW() ELSE sent_at END,
      delivered_at = CASE WHEN p_status = 'delivered' THEN NOW() ELSE delivered_at END
    WHERE id = p_notification_id;
  END IF;

  INSERT INTO notification_delivery_events (notification_queue_id, event_status, provider_payload)
    VALUES (p_notification_id, p_status, jsonb_build_object('provider_message_id', p_provider_message_id, 'failure_reason', p_failure_reason));
END;
$$ LANGUAGE plpgsql;

-- 17.D Sync an offline-queued action once device reconnects (idempotent)
CREATE OR REPLACE FUNCTION sync_offline_action(
  p_tenant_id UUID,
  p_branch_id UUID,
  p_device_id TEXT,
  p_action_type TEXT,
  p_local_uuid UUID,
  p_payload JSONB,
  p_created_offline_at TIMESTAMPTZ
) RETURNS JSONB AS $$
DECLARE
  v_existing offline_action_queue%ROWTYPE;
  v_id UUID;
BEGIN
  SELECT * INTO v_existing FROM offline_action_queue
    WHERE tenant_id = p_tenant_id AND device_id = p_device_id AND local_uuid = p_local_uuid;

  IF FOUND THEN
    -- already synced earlier — return existing result, do NOT reprocess (idempotency)
    RETURN jsonb_build_object('already_synced', true, 'sync_status', v_existing.sync_status, 'id', v_existing.id);
  END IF;

  INSERT INTO offline_action_queue (
    tenant_id, branch_id, device_id, action_type, local_uuid, payload, created_offline_at, sync_status
  ) VALUES (
    p_tenant_id, p_branch_id, p_device_id, p_action_type, p_local_uuid, p_payload, p_created_offline_at, 'pending_sync'
  ) RETURNING id INTO v_id;

  -- NOTE: actual processing (e.g. creating the invoice from payload) is done by the
  -- application layer / edge function immediately after this insert, which then calls
  -- mark_offline_action_synced() below.

  RETURN jsonb_build_object('already_synced', false, 'id', v_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION mark_offline_action_synced(
  p_offline_action_id UUID,
  p_server_reference_id UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE offline_action_queue
  SET sync_status = 'synced', synced_at = NOW(), server_reference_id = p_server_reference_id
  WHERE id = p_offline_action_id;
END;
$$ LANGUAGE plpgsql;

-- 17.E Queue a platform-wide broadcast to all recipients of the chosen audience
CREATE OR REPLACE FUNCTION dispatch_platform_broadcast(p_broadcast_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_broadcast platform_broadcasts%ROWTYPE;
  v_channel notification_channel;
  v_count INT := 0;
BEGIN
  SELECT * INTO v_broadcast FROM platform_broadcasts WHERE id = p_broadcast_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Broadcast not found'; END IF;
  IF v_broadcast.status <> 'draft' THEN RAISE EXCEPTION 'Broadcast already queued or sent'; END IF;

  FOREACH v_channel IN ARRAY v_broadcast.channels LOOP
    IF v_broadcast.audience = 'all_merchants' THEN
      INSERT INTO notification_queue (tenant_id, channel, event_code, priority, recipient_type, recipient_id, recipient_address, rendered_body, reference_type, reference_id)
        SELECT t.id, v_channel, 'platform_broadcast', 'high', 'merchant_admin', u.id, COALESCE(u.phone, u.email, ''), v_broadcast.message_body, 'broadcast', p_broadcast_id
        FROM tenants t JOIN user_tenant_roles utr ON utr.tenant_id = t.id JOIN users u ON u.id = utr.user_id
        WHERE utr.role_id IN (SELECT id FROM roles_master WHERE role_name = 'Admin');
      GET DIAGNOSTICS v_count = ROW_COUNT;
    ELSIF v_broadcast.audience = 'all_consumers' THEN
      INSERT INTO notification_queue (tenant_id, channel, event_code, priority, recipient_type, recipient_id, recipient_address, rendered_body, reference_type, reference_id)
        SELECT NULL, v_channel, 'platform_broadcast', 'normal', 'consumer', cp.id, COALESCE(cp.phone, cp.email, ''), v_broadcast.message_body, 'broadcast', p_broadcast_id
        FROM consumer_profiles cp;
      GET DIAGNOSTICS v_count = ROW_COUNT;
    ELSIF v_broadcast.audience = 'specific_tenant_list' THEN
      INSERT INTO notification_queue (tenant_id, channel, event_code, priority, recipient_type, recipient_id, recipient_address, rendered_body, reference_type, reference_id)
        SELECT t.id, v_channel, 'platform_broadcast', 'high', 'merchant_admin', u.id, COALESCE(u.phone, u.email, ''), v_broadcast.message_body, 'broadcast', p_broadcast_id
        FROM tenants t JOIN user_tenant_roles utr ON utr.tenant_id = t.id JOIN users u ON u.id = utr.user_id
        WHERE t.id = ANY(v_broadcast.target_tenant_ids) AND utr.role_id IN (SELECT id FROM roles_master WHERE role_name = 'Admin');
      GET DIAGNOSTICS v_count = ROW_COUNT;
    END IF;
  END LOOP;

  UPDATE platform_broadcasts SET status = 'queued', sent_count = v_count, sent_at = NOW() WHERE id = p_broadcast_id;
  RETURN jsonb_build_object('queued_count', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SEED: a few essential platform-wide system templates so the engine works out-of-the-box
-- ============================================================================
INSERT INTO notification_templates (tenant_id, event_code, channel, template_name, template_body)
VALUES
  (NULL, 'otp', 'sms', 'OTP - SMS', 'Your BahiBox OTP is {{otp}}. Valid for 5 minutes. Do not share.'),
  (NULL, 'order_placed', 'whatsapp', 'Order Confirmation - WhatsApp', 'Hi {{customer_name}}, your order #{{order_id}} of ₹{{amount}} has been placed successfully.'),
  (NULL, 'payment_success', 'sms', 'Payment Success - SMS', 'Payment of ₹{{amount}} received for invoice {{invoice_number}}. Thank you!'),
  (NULL, 'emi_due', 'whatsapp', 'EMI Reminder - WhatsApp', 'Hi {{customer_name}}, your EMI of ₹{{amount}} is due on {{due_date}}. Pay now to avoid late fees.'),
  (NULL, 'low_stock', 'push', 'Low Stock Alert - Push', 'Stock alert: {{product_name}} is running low ({{quantity}} left).'),
  (NULL, 'platform_broadcast', 'in_app', 'Platform Broadcast - In App', '{{message}}')
ON CONFLICT (tenant_id, event_code, channel) DO NOTHING;
-- ============================================================================
-- 22. RETAIL REPORTS POLISH + SCAN-AND-GO (STAGE 1 — PROMPT #14)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 22.1 SALES BY PRODUCT REPORT
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS get_sales_by_product(UUID, UUID, DATE, DATE, TEXT);

CREATE OR REPLACE FUNCTION get_sales_by_product(
  p_tenant_id UUID,
  p_branch_id UUID,       -- NULL = all branches
  p_start_date DATE,
  p_end_date DATE,
  p_sort TEXT DEFAULT 'top' -- 'top' or 'bottom'
) RETURNS TABLE(
  product_id UUID, product_name TEXT, total_quantity_sold NUMERIC,
  total_revenue NUMERIC, number_of_invoices BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id, p.product_name,
    SUM(sii.quantity) AS total_quantity_sold,
    SUM(sii.line_total) AS total_revenue,
    COUNT(DISTINCT si.id) AS number_of_invoices
  FROM sales_invoice_items sii
  JOIN sales_invoices si ON si.id = sii.sales_invoice_id
  JOIN products p ON p.product_name = sii.item_name AND p.tenant_id = si.tenant_id -- item_name is denormalized at sale time; join by name+tenant
  WHERE si.tenant_id = p_tenant_id
    AND (p_branch_id IS NULL OR si.branch_id = p_branch_id)
    AND si.module_code = 'retail'
    AND si.status <> 'cancelled'
    AND si.invoice_date BETWEEN p_start_date AND p_end_date
  GROUP BY p.id, p.product_name
  ORDER BY CASE WHEN p_sort = 'top' THEN SUM(sii.line_total) END DESC NULLS LAST,
           CASE WHEN p_sort = 'bottom' THEN SUM(sii.line_total) END ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- 22.2 SHIFT REPORT
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS get_shift_report(UUID, UUID, DATE, DATE);

CREATE OR REPLACE FUNCTION get_shift_report(
  p_tenant_id UUID,
  p_branch_id UUID,      -- NULL = all branches
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE(
  shift_id UUID, cashier_name TEXT, register_name TEXT,
  opened_at TIMESTAMPTZ, closed_at TIMESTAMPTZ,
  opening_cash NUMERIC, closing_cash NUMERIC, expected_cash NUMERIC, cash_variance NUMERIC,
  status pos_shift_status
) AS $$
BEGIN
  RETURN QUERY
  SELECT ps.id, u.full_name, ps.register_name, ps.opened_at, ps.closed_at,
    ps.opening_cash, ps.closing_cash, ps.expected_cash, ps.cash_variance, ps.status
  FROM pos_shifts ps
  JOIN users u ON u.id = ps.cashier_id
  WHERE ps.tenant_id = p_tenant_id
    AND (p_branch_id IS NULL OR ps.branch_id = p_branch_id)
    AND ps.opened_at::DATE BETWEEN p_start_date AND p_end_date
  ORDER BY ps.opened_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- 22.3 SCAN-AND-GO ORDER CREATION (consumer self-checkout, no cashier/shift)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION create_scan_and_go_order(
  p_tenant_id UUID,
  p_branch_id UUID,
  p_consumer_id UUID,          -- auth.uid() of the logged-in consumer app user
  p_seller_state_code TEXT,
  p_buyer_state_code TEXT,
  p_items JSONB                -- [{"product_id":"...","quantity":2}] — no per-line discount at self-checkout by default
) RETURNS JSONB AS $$
DECLARE
  v_invoice_id UUID;
  v_total_amount NUMERIC(14,2);
  v_payment_order_id UUID;
  v_customer_phone TEXT;
BEGIN
  -- create the invoice + deduct stock, but as UNPAID (no cashier/shift, no cash settlement)
  v_invoice_id := create_pos_sale(
    p_tenant_id, p_branch_id, NULL, NULL,
    p_seller_state_code, p_buyer_state_code,
    p_items, 'razorpay', NULL
  );

  SELECT total_amount INTO v_total_amount FROM sales_invoices WHERE id = v_invoice_id;

  -- create a payment order for the consumer to pay via Razorpay Checkout
  v_payment_order_id := create_payment_order(
    p_tenant_id, p_branch_id, 'consumer_order', v_total_amount,
    'sales_invoice', v_invoice_id, 'consumer', p_consumer_id, NULL -- razorpay_order_id filled in by Edge Function after Razorpay API call
  );

  RETURN jsonb_build_object(
    'sales_invoice_id', v_invoice_id,
    'payment_order_id', v_payment_order_id,
    'amount', v_total_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 22.4 PAYMENT → INVOICE SYNC (closes the loop once Razorpay webhook confirms capture)
-- ---------------------------------------------------------------------------

-- Extends capture_payment()'s job: after a payment_order tied to a sales_invoice is
-- captured, flip the invoice to 'paid' and fire a receipt notification.
-- Call this from the webhook handler immediately AFTER capture_payment() succeeds.
CREATE OR REPLACE FUNCTION sync_invoice_on_payment_capture(p_payment_order_id UUID)
RETURNS VOID AS $$
DECLARE
  v_order payment_orders%ROWTYPE;
  v_invoice sales_invoices%ROWTYPE;
  v_customer_phone TEXT;
BEGIN
  SELECT * INTO v_order FROM payment_orders WHERE id = p_payment_order_id;
  IF NOT FOUND OR v_order.reference_type <> 'sales_invoice' THEN
    RETURN; -- not an invoice-linked payment (e.g. subscription/wallet top-up) — nothing to sync
  END IF;

  UPDATE sales_invoices SET status = 'paid' WHERE id = v_order.reference_id
  RETURNING * INTO v_invoice;

  IF v_invoice.customer_id IS NOT NULL THEN
    SELECT phone INTO v_customer_phone FROM retail_customers WHERE id = v_invoice.customer_id;
  END IF;

  IF v_customer_phone IS NOT NULL THEN
    PERFORM enqueue_notification(
      v_order.tenant_id, v_order.branch_id, 'sms', 'payment_success',
      'customer', v_invoice.customer_id, v_customer_phone,
      jsonb_build_object('amount', v_invoice.total_amount::TEXT, 'invoice_number', v_invoice.invoice_number),
      'sales_invoice', v_invoice.id, 'high'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Enable RLS for all listed tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE retail_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_rules ENABLE ROW LEVEL SECURITY;

-- Products Policies
CREATE POLICY "Allow authenticated users to select products" ON products FOR SELECT TO public USING (true);
CREATE POLICY "Allow authenticated users to insert products" ON products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update products" ON products FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete products" ON products FOR DELETE TO authenticated USING (true);

-- Suppliers Policies
CREATE POLICY "Allow authenticated users to select suppliers" ON suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert suppliers" ON suppliers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update suppliers" ON suppliers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete suppliers" ON suppliers FOR DELETE TO authenticated USING (true);

-- Retail Customers Policies
CREATE POLICY "Allow authenticated users to select retail_customers" ON retail_customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert retail_customers" ON retail_customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update retail_customers" ON retail_customers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete retail_customers" ON retail_customers FOR DELETE TO authenticated USING (true);

-- Purchase Orders Policies
CREATE POLICY "Allow authenticated users to select purchase_orders" ON purchase_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert purchase_orders" ON purchase_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update purchase_orders" ON purchase_orders FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete purchase_orders" ON purchase_orders FOR DELETE TO authenticated USING (true);

-- POS Shifts Policies
CREATE POLICY "Allow authenticated users to select pos_shifts" ON pos_shifts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert pos_shifts" ON pos_shifts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update pos_shifts" ON pos_shifts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete pos_shifts" ON pos_shifts FOR DELETE TO authenticated USING (true);

-- Discount Rules Policies
CREATE POLICY "Allow authenticated users to select discount_rules" ON discount_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert discount_rules" ON discount_rules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update discount_rules" ON discount_rules FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete discount_rules" ON discount_rules FOR DELETE TO authenticated USING (true);

-- Customers Policies (in case it is named 'customers')
ALTER TABLE IF EXISTS customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to select customers" ON customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert customers" ON customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update customers" ON customers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete customers" ON customers FOR DELETE TO authenticated USING (true);
CREATE OR REPLACE FUNCTION bootstrap_merchant_tenant(
  p_user_id UUID,
  p_business_name TEXT,
  p_business_type TEXT
)
RETURNS UUID AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Insert the new tenant
  INSERT INTO tenants (business_name, business_type, status, plan_type)
  VALUES (p_business_name, p_business_type::business_type, 'active', 'free')
  RETURNING id INTO v_tenant_id;

  -- Assign the user as the owner
  INSERT INTO user_tenant_roles (user_id, tenant_id, role_name)
  VALUES (p_user_id, v_tenant_id, 'owner');

  -- Create a default branch
  INSERT INTO branches (tenant_id, branch_name, is_main_branch, status)
  VALUES (v_tenant_id, 'Main Branch', true, 'active');

  RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT,
  phone TEXT,
  inquiry_type TEXT,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'New'
);


-- Added for CustomerSupplierForm
ALTER TABLE retail_customers ADD COLUMN IF NOT EXISTS registration_type VARCHAR(50);
ALTER TABLE retail_customers ADD COLUMN IF NOT EXISTS pan VARCHAR(50);
ALTER TABLE retail_customers ADD COLUMN IF NOT EXISTS landmark TEXT;
ALTER TABLE retail_customers ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India';
ALTER TABLE retail_customers ADD COLUMN IF NOT EXISTS distance VARCHAR(50);
ALTER TABLE retail_customers ADD COLUMN IF NOT EXISTS customer_group VARCHAR(100);
ALTER TABLE retail_customers ADD COLUMN IF NOT EXISTS opening_balance NUMERIC(14,2) DEFAULT 0;
ALTER TABLE retail_customers ADD COLUMN IF NOT EXISTS balance_type VARCHAR(20) DEFAULT 'Credit';
ALTER TABLE retail_customers ADD COLUMN IF NOT EXISTS license_no VARCHAR(100);
ALTER TABLE retail_customers ADD COLUMN IF NOT EXISTS custom_field_1 TEXT;
ALTER TABLE retail_customers ADD COLUMN IF NOT EXISTS custom_field_2 TEXT;
ALTER TABLE retail_customers ADD COLUMN IF NOT EXISTS fax_no VARCHAR(50);
ALTER TABLE retail_customers ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE retail_customers ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(14,2);
ALTER TABLE retail_customers ADD COLUMN IF NOT EXISTS due_days INTEGER;
ALTER TABLE retail_customers ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE retail_customers ADD COLUMN IF NOT EXISTS enable BOOLEAN DEFAULT true;

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS registration_type VARCHAR(50);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS pan VARCHAR(50);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS landmark TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS distance VARCHAR(50);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS supplier_group VARCHAR(100);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS opening_balance NUMERIC(14,2) DEFAULT 0;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS balance_type VARCHAR(20) DEFAULT 'Credit';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS license_no VARCHAR(100);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS custom_field_1 TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS custom_field_2 TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS fax_no VARCHAR(50);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(14,2);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS due_days INTEGER;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS enable BOOLEAN DEFAULT true;

-- Added for CustomerSupplierForm
ALTER TABLE retail_customers ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE retail_customers ADD COLUMN IF NOT EXISTS gstin VARCHAR(50);
ALTER TABLE retail_customers ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);
ALTER TABLE retail_customers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE retail_customers ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE retail_customers ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE retail_customers ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS gstin VARCHAR(50);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);
ALTER TABLE retail_customers ADD COLUMN IF NOT EXISTS shipping_addresses JSONB DEFAULT '[]'::jsonb;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS shipping_addresses JSONB DEFAULT '[]'::jsonb;

-- Notify pgrst to reload schema
NOTIFY pgrst, 'reload schema';
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

-- Add missing columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_plus VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory_plus VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS discount NUMERIC(10, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS gst_plus VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS cgst NUMERIC(10, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS sgst NUMERIC(10, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS igst NUMERIC(10, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS sales_unit VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS sales_alt_unit VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS conv NUMERIC(10, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock NUMERIC(10, 3);
ALTER TABLE products ADD COLUMN IF NOT EXISTS status VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS s_tax NUMERIC(10, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS p_tax NUMERIC(10, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS g_down VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS rack VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS def_qty NUMERIC(10, 3);
ALTER TABLE products ADD COLUMN IF NOT EXISTS part_no VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS update_button_column VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS delete_button_column VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS print_barcode_button VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS mark VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS photo TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS cmb_gst VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS hsn_sac_id UUID;

-- 2. Add Row Level Security (RLS) policies for the units table
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to select units" ON units FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert units" ON units FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update units" ON units FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete units" ON units FOR DELETE TO authenticated USING (true);
-- Create the provider-documents storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('provider-documents', 'provider-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Policies for provider-documents
CREATE POLICY "Users can upload their own provider documents" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'provider-documents' AND 
  (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own provider documents" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (
  bucket_id = 'provider-documents' AND 
  (auth.uid())::text = (storage.foldername(name))[1]
);

-- Super admins and tenant staff can view all documents in this bucket
CREATE POLICY "Admins can view provider documents" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (
  bucket_id = 'provider-documents'
);

-- Platform Settings
CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read platform settings" ON platform_settings
  FOR SELECT USING (true);

CREATE POLICY "Only platform admin can modify settings" ON platform_settings
  FOR ALL USING (is_platform_admin(auth.uid()));

INSERT INTO platform_settings (setting_key, setting_value, description) VALUES
  ('delivery_base_fee', '15', 'Package delivery: fixed base fee (₹) paid to rider per delivery'),
  ('delivery_per_km_rate', '5', 'Package delivery: additional ₹ per km paid to rider'),
  ('ride_base_fare', '30', 'Move ride booking: fixed base fare (₹) charged to customer'),
  ('ride_per_km_rate', '12', 'Move ride booking: additional ₹ per km charged to customer'),
  ('ride_platform_commission_percent', '20', 'Move ride booking: % commission BahiBox takes from each ride')
ON CONFLICT (setting_key) DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description;


CREATE OR REPLACE FUNCTION get_or_create_tenant_bank_wallet(p_tenant_id UUID) RETURNS UUID AS $$
DECLARE
  v_wallet_id UUID;
BEGIN
  -- Try to find existing
  SELECT id INTO v_wallet_id
  FROM wallet_accounts
  WHERE tenant_id = p_tenant_id AND owner_type = 'tenant_bank'
  LIMIT 1;
  
  -- If not found, create
  IF v_wallet_id IS NULL THEN
    INSERT INTO wallet_accounts (tenant_id, owner_type, owner_id, account_label)
    VALUES (p_tenant_id, 'tenant_bank', p_tenant_id, 'Business Wallet')
    RETURNING id INTO v_wallet_id;
  END IF;
  
  RETURN v_wallet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
