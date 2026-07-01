// BahiBox Foundation Schema Types (Stage 0)
// These types map directly to the Supabase PostgreSQL schema.

export type BusinessType = 'retail' | 'manufacturing' | 'hospitality' | 'healthcare' | 'education' | 'logistics' | 'agri' | 'services';
export type TenantStatus = 'trial' | 'active' | 'suspended' | 'deleted';
export type PlanType = 'free' | 'basic' | 'branded' | 'white_label';
export type RoleScope = 'platform' | 'tenant';
export type AdminRole = 'super_admin' | 'support_manager' | 'onboarding_officer' | 'finance_auditor';

export interface User {
  id: string; // UUID mapping to auth.users
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string; // UUID
  business_name: string;
  business_type: BusinessType;
  status: TenantStatus;
  plan_type: PlanType;
  custom_domain: string | null;
  subdomain: string | null;
  logo_url: string | null;
  theme_color: string | null;
  app_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string; // UUID
  tenant_id: string; // UUID
  branch_name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  is_main_branch: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface RoleMaster {
  id: string; // UUID
  role_name: string;
  role_scope: RoleScope;
  description: string | null;
  created_at: string;
}

export interface UserTenantRole {
  id: string; // UUID
  user_id: string; // UUID
  tenant_id: string | null; // UUID (Null for platform roles)
  branch_id: string | null; // UUID (Null for tenant-wide access)
  role_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlatformAdmin {
  id: string; // UUID
  user_id: string; // UUID
  admin_role: AdminRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConsumerProfile {
  id: string; // UUID
  user_id: string; // UUID
  city: string | null;
  preferred_pillars: string[] | null;
  kyc_status: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string; // UUID
  actor_user_id: string | null; // UUID
  action_type: string;
  target_table: string;
  target_id: string; // UUID
  details: Record<string, any> | null; // JSONB mapping
  created_at: string;
}

export interface MenuModule {
  id: string;
  module_key: string;
  module_name: string;
  icon_name: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MenuItem {
  id: string;
  menu_module_id: string;
  parent_item_id: string | null;
  item_key: string;
  item_label: string;
  icon_name: string | null;
  route_path: string | null;
  required_permission: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantMenuResult {
  module_id: string;
  module_key: string;
  module_name: string;
  module_icon: string;
  module_order: number;
  item_id: string;
  item_key: string;
  item_label: string;
  item_icon: string;
  route_path: string;
  parent_item_id: string | null;
  item_order: number;
}

// Database schema wrapper type
export interface Database {
  public: {
    Tables: {
      users: { Row: User; Insert: Partial<User>; Update: Partial<User> };
      tenants: { Row: Tenant; Insert: Partial<Tenant>; Update: Partial<Tenant> };
      branches: { Row: Branch; Insert: Partial<Branch>; Update: Partial<Branch> };
      roles_master: { Row: RoleMaster; Insert: Partial<RoleMaster>; Update: Partial<RoleMaster> };
      user_tenant_roles: { Row: UserTenantRole; Insert: Partial<UserTenantRole>; Update: Partial<UserTenantRole> };
      platform_admins: { Row: PlatformAdmin; Insert: Partial<PlatformAdmin>; Update: Partial<PlatformAdmin> };
      consumer_profiles: { Row: ConsumerProfile; Insert: Partial<ConsumerProfile>; Update: Partial<ConsumerProfile> };
      audit_logs: { Row: AuditLog; Insert: Partial<AuditLog>; Update: Partial<AuditLog> };
    };
  };
}
