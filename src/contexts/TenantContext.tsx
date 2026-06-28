import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSupabaseClient } from '../lib/supabase';

export interface TenantData {
  merchant_id: string;
  custom_domain: string;
  brand_name: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  is_whitelabel_active: boolean;
}

interface TenantContextType {
  tenant: TenantData | null;
  setTenant: (tenant: TenantData | null) => void;
  resetTenant: () => void;
  loading: boolean;
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  setTenant: () => {},
  resetTenant: () => {},
  loading: true,
});

export const useTenant = () => useContext(TenantContext);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchTenant = async () => {
      try {
        const hostname = window.location.hostname;
        const searchParams = new URLSearchParams(window.location.search);
        const tenantIdParam = searchParams.get('tenant'); // e.g. ?tenant=domain

        const supabase = getSupabaseClient();
        if (!supabase) {
          if (isMounted) setLoading(false);
          return;
        }

        let query = supabase.from('merchant_branding').select('*').eq('is_whitelabel_active', true);
        
        if (tenantIdParam) {
          query = query.eq('custom_domain', tenantIdParam);
        } else {
          query = query.eq('custom_domain', hostname);
        }

        const { data, error } = await query.maybeSingle();

        if (error && error.code !== 'PGRST116' && error.code !== 'PGRST205' && error.code !== '42P01') {
          console.warn("Error fetching tenant config:", error);
        }

        if (data && isMounted) {
          setTenant(data);
        }
      } catch (err) {
        console.warn("Tenant configuration load failed:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchTenant();
    
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (tenant) {
      // Apply CSS Custom Properties for theming overriding primary/secondary colors
      if (tenant.primary_color) {
        document.documentElement.style.setProperty('--primary', hexToHsl(tenant.primary_color));
      }
    } else {
      // Reset to default
      document.documentElement.style.removeProperty('--primary');
    }
  }, [tenant]);

  const resetTenant = () => {
    setTenant(null);
    // Remove query params if they exist
    const url = new URL(window.location.href);
    url.searchParams.delete('tenant');
    window.history.replaceState({}, '', url);
  };

  return (
    <TenantContext.Provider value={{ tenant, setTenant, resetTenant, loading }}>
      {children}
    </TenantContext.Provider>
  );
};

// Helper to convert hex to HSL for Tailwind CSS variables
function hexToHsl(hex: string) {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${(h * 360).toFixed(0)} ${(s * 100).toFixed(0)}% ${(l * 100).toFixed(0)}%`;
}
