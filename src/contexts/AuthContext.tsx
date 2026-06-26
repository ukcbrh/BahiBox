import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSupabaseClient } from '../lib/supabase';
import { UserRole, ModuleType } from '../types';

interface AuthContextType {
  user: any | null;
  userRole: UserRole | null;
  activeModule: ModuleType | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [activeModule, setActiveModule] = useState<ModuleType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    const fetchProfile = async (user: any) => {
      try {
        const { data, error } = await supabase.from('users').select('*').eq('id', user.id).single();
        if (data && !error) {
          setUserRole(data.role as UserRole);
          setActiveModule(data.module as ModuleType);
        } else if (error?.code === 'PGRST116') {
          // Profile doesn't exist, create it (defaulting to admin for Google signins)
          const newProfile = {
            id: user.id,
            name: user.user_metadata?.full_name || 'Unknown User',
            email: user.email,
            role: 'admin',
            module: 'Retail POS',
            created_at: new Date().toISOString()
          };
          const { error: insertError } = await supabase.from('users').insert(newProfile);
          if (!insertError) {
            setUserRole('admin');
            setActiveModule('Retail POS');
          } else {
             console.error("Error creating user profile:", insertError);
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user);
      } else {
        setUser(null);
        setUserRole(null);
        setActiveModule(null);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user);
      } else {
        setUser(null);
        setUserRole(null);
        setActiveModule(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not connected");

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    
    if (data.user) {
      const { data: profile } = await supabase.from('users').select('*').eq('id', data.user.id).single();
      if (profile) {
        setUserRole(profile.role as UserRole);
        setActiveModule(profile.module as ModuleType);
      }
    }
  };

  const signInWithGoogle = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
       alert("Supabase client not initialized. Please connect your database first.");
       return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/merchant`,
      }
    });

    if (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
    // Note: OAuth redirects, so state is handled by onAuthStateChange on return
  };

  const logout = async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
  };

  return (
    <AuthContext.Provider value={{ user, userRole, activeModule, loading, signInWithGoogle, signInWithEmail, logout }}>
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

