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
  WHERE (mm.module_key = t_business_type OR mm.module_key = 'core')
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
