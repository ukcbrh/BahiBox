import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSupabaseClient } from '../lib/supabase';
import { ModuleType } from '../types';

interface UserRoleInfo {
  tenant_id: string | null;
  role_name: string;
  tenant_name?: string;
  business_type?: string;
}

interface AuthContextType {
  user: any | null;
  currentRole: string | null;
  currentTenantId: string | null;
  currentPermissions: string[];
  activeModule: string | null;
  loading: boolean;
  availableRoles: UserRoleInfo[];
  isSuperAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permissionKey: string) => boolean;
  selectRole: (roleInfo: UserRoleInfo) => Promise<void>;
  clearRole: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);
  const [currentPermissions, setCurrentPermissions] = useState<string[]>([]);
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [availableRoles, setAvailableRoles] = useState<UserRoleInfo[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    const loadUserPermissions = async (userId: string, tenantId: string | null) => {
      // Call RPC function to get permissions
      const { data, error } = await supabase.rpc('get_user_permissions', {
        checking_user_id: userId,
        checking_tenant_id: tenantId
      });
      if (data && !error) {
        setCurrentPermissions(data.map((p: any) => p.permission_key));
      }
    };

    const fetchProfile = async (authUser: any) => {
      try {
        // 1. Check if super admin
        const { data: adminData } = await supabase
          .from('platform_admins')
          .select('admin_role')
          .eq('user_id', authUser.id)
          .eq('is_active', true)
          .single();

        if (adminData) {
          setIsSuperAdmin(true);
          setCurrentRole(adminData.admin_role);
          await loadUserPermissions(authUser.id, null);
          return;
        }

        setIsSuperAdmin(false);

        // 2. Fetch available roles
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_tenant_roles')
          .select(`
            tenant_id,
            role_name,
            tenants ( business_name, business_type )
          `)
          .eq('user_id', authUser.id)
          .eq('is_active', true);

        if (rolesData && rolesData.length > 0) {
          const roles = rolesData.map((r: any) => ({
            tenant_id: r.tenant_id,
            role_name: r.role_name,
            tenant_name: r.tenants?.business_name,
            business_type: r.tenants?.business_type,
          }));
          setAvailableRoles(roles);

          // If only one role, auto-select it
          if (roles.length === 1) {
            await selectRole(roles[0], authUser.id);
          }
        } else {
           // Fallback if no roles found - maybe first time login
           // Insert a default profile manually if trigger didn't fire
           await supabase.from('users').insert({
             id: authUser.id,
             full_name: authUser.user_metadata?.full_name || 'Unknown User',
             email: authUser.email
           }).select().single();
        }
      } catch (error) {
        console.warn("Error fetching user RBAC data", error);
      }
    };

    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user);
      }
      setLoading(false);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user);
      } else {
        setUser(null);
        setCurrentRole(null);
        setCurrentTenantId(null);
        setCurrentPermissions([]);
        setAvailableRoles([]);
        setIsSuperAdmin(false);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const selectRole = async (roleInfo: UserRoleInfo, uid?: string) => {
    const userId = uid || user?.id;
    if (!userId) return;

    setCurrentRole(roleInfo.role_name);
    setCurrentTenantId(roleInfo.tenant_id);
    setActiveModule(roleInfo.business_type || null);
    
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data } = await supabase.rpc('get_user_permissions', {
        checking_user_id: userId,
        checking_tenant_id: roleInfo.tenant_id
      });
      if (data) {
        setCurrentPermissions(data.map((p: any) => p.permission_key));
      }
    }
  };

  const clearRole = () => {
    setCurrentRole(null);
    setCurrentTenantId(null);
    setActiveModule(null);
    setCurrentPermissions([]);
  };

  const hasPermission = (permissionKey: string) => {
    if (isSuperAdmin) return true;
    return currentPermissions.includes(permissionKey);
  };

  const signInWithEmail = async (email: string, password: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not connected");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      alert("Supabase client not initialized.");
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/merchant` }
    });
    if (error) throw error;
  };

  const logout = async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, currentRole, currentTenantId, currentPermissions, activeModule, 
      loading, availableRoles, isSuperAdmin, 
      signInWithGoogle, signInWithEmail, logout, hasPermission, selectRole, clearRole 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

