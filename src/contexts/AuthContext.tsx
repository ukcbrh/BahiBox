import { tenantScopedKey } from '@/src/lib/tenantStorage';
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { getSupabaseClient } from '../lib/supabase';
import { ModuleType } from '../types';

interface UserRoleInfo {
  tenant_id: string | null;
  role_name: string;
  tenant_name?: string;
  business_type?: string;
  status?: string;
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
  activeBranchId: string | null;
  setActiveBranchId: (branchId: string | null) => void;
  signInWithGoogle: (redirectPath?: string) => Promise<void>;
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

  const [activeBranchId, setActiveBranchIdState] = useState<string | null>(null);

  // activeBranchId must be loaded AFTER currentTenantId is known (it's 
  // not available yet at initial mount), and re-loaded whenever the 
  // logged-in tenant changes — this prevents one tenant's last-selected 
  // branch from leaking into a different tenant's session on the same 
  // browser/device.
  useEffect(() => {
    if (currentTenantId) {
      const stored = localStorage.getItem(tenantScopedKey('bahi_active_branch_id', currentTenantId));
      setActiveBranchIdState(stored || null);
    } else {
      setActiveBranchIdState(null);
    }
  }, [currentTenantId]);

  const setActiveBranchId = (branchId: string | null) => {
    setActiveBranchIdState(branchId);
    const key = tenantScopedKey('bahi_active_branch_id', currentTenantId);
    if (branchId) {
      localStorage.setItem(key, branchId);
    } else {
      localStorage.removeItem(key);
    }
  };

  // "Latest-call-wins" guard: Supabase ka onAuthStateChange kai-baar 
  // (SIGNED_IN, TOKEN_REFRESHED, etc.) thode-hi-samay mein fire hota hai — 
  // har fire ek naya fetchProfile() chalata tha, aur purane/stale calls 
  // bhi galat-tarah se state-overwrite kar dete the (race-condition). 
  // Ab har call apna unique-id capture karta hai, aur har await ke baad 
  // check karta hai ki woh abhi bhi "latest" hai ya nahi — agar koi 
  // naya call already shuru ho chuka hai, purana-call chup-chaap ruk jata hai.
  const fetchIdRef = useRef(0);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    const loadUserPermissions = async (userId: string, tenantId: string | null, callId: number) => {
      const { data, error } = await supabase.rpc('get_user_permissions', {
        checking_user_id: userId,
        checking_tenant_id: tenantId
      });
      if (fetchIdRef.current !== callId) return;
      if (data && !error) {
        setCurrentPermissions(data.map((p: any) => p.permission_key));
      }
    };

    const fetchProfile = async (authUser: any, callId: number) => {
      try {
        const { data: adminData } = await supabase
          .from('platform_admins')
          .select('admin_role')
          .eq('user_id', authUser.id)
          .eq('is_active', true)
          .single();

        if (fetchIdRef.current !== callId) return;

        if (adminData) {
          setIsSuperAdmin(true);
          setCurrentRole(adminData.admin_role);
          await loadUserPermissions(authUser.id, null, callId);
          return;
        }

        setIsSuperAdmin(false);

        const { data: rolesData, error: rolesError } = await supabase
          .from('user_tenant_roles')
          .select(`
            tenant_id,
            role_name,
            tenants ( business_name, business_type, status )
          `)
          .eq('user_id', authUser.id)
          .eq('is_active', true);

        if (fetchIdRef.current !== callId) return;

        if (rolesData && rolesData.length > 0) {
          const roles = rolesData.map((r: any) => ({
            tenant_id: r.tenant_id,
            role_name: r.role_name,
            tenant_name: r.tenants?.business_name,
            business_type: r.tenants?.business_type,
            status: r.tenants?.status,
          }));
          setAvailableRoles(roles);

          if (roles.length === 1) {
            await selectRole(roles[0], authUser.id);
          }
        } else {
          setAvailableRoles([]);
        }
      } catch (error) {
        console.warn("Error fetching user RBAC data", error);
      }
    };

    const initAuth = async () => {
      const callId = ++fetchIdRef.current;
      const { data: { session } } = await supabase.auth.getSession();
      if (fetchIdRef.current !== callId) return;
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user, callId);
      }
      if (fetchIdRef.current === callId) setLoading(false);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
      const callId = ++fetchIdRef.current;
      // Mark loading=true while we (re)resolve the user's role/tenant data
      // after a login/auth-state change — not just on initial page load.
      // Without this, Login.tsx briefly sees "loading: false, no roles yet"
      // during the fetch and can mistakenly treat it as "no subscription",
      // triggering an unwanted logout before the real role data arrives.
      setLoading(true);
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user, callId);
      } else {
        setUser(null);
        setCurrentRole(null);
        setCurrentTenantId(null);
        setCurrentPermissions([]);
        setAvailableRoles([]);
        setIsSuperAdmin(false);
      }
      if (fetchIdRef.current === callId) setLoading(false);
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
    if (permissionKey === 'retail.picking.view') { console.log('DEBUG7 hasPermission check:', permissionKey, 'currentPermissions=', JSON.stringify(currentPermissions)); }
    return currentPermissions.includes(permissionKey);
  };

  const signInWithEmail = async (email: string, password: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not connected");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signInWithGoogle = async (redirectPath: string = '/login') => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      alert("Supabase client not initialized.");
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${redirectPath}` }
    });
    if (error) throw error;
  };

  const logout = async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ 
      user, currentRole, currentTenantId, currentPermissions, activeModule, 
      loading, availableRoles, isSuperAdmin, activeBranchId, setActiveBranchId,
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
