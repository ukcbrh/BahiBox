import { useState, useEffect } from 'react';
import { getSupabaseClient } from '../lib/supabase';
import { ModuleMaster, MerchantSubscription } from '../types';

export function useModules(tenantId?: string) {
  const [modules, setModules] = useState<ModuleMaster[]>([]);
  const [subscriptions, setSubscriptions] = useState<MerchantSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    async function fetchModules() {
      try {
        const supabase = getSupabaseClient();
        if (!supabase) {
          if (isMounted) setLoading(false);
          return;
        }

        const fallbackModules = [
          { id: 'retail', name: 'Retail POS', description: 'Point of sale and inventory', icon: 'ShoppingCart', price: 49.00 },
          { id: 'manufacturing', name: 'Manufacturing', description: 'Production and tracking', icon: 'Factory', price: 199.00 },
          { id: 'education', name: 'Education', description: 'School management', icon: 'GraduationCap', price: 149.00 },
          { id: 'healthcare', name: 'Healthcare', description: 'Clinic and patient management', icon: 'Stethoscope', price: 299.00 },
          { id: 'hospitality', name: 'Hotel & Restaurant', description: 'Hotel and restaurant management', icon: 'Hotel', price: 99.00 },
          { id: 'transport', name: 'Transport', description: 'Fleet and logistics', icon: 'Truck', price: 149.00 },
          { id: 'services', name: 'Daily Services', description: 'Service, repair, and bookings', icon: 'Wrench', price: 49.00 },
          { id: 'agriculture', name: 'Agriculture', description: 'Farm and crop management', icon: 'Tractor', price: 79.00 }
        ];

        let loadedModules = fallbackModules;
        
        // Fetch modules
        const { data: mods, error: modsError } = await supabase.from('modules_master').select('*').order('name');
        
        if (mods && mods.length > 0) {
          if (mods.length < 8) {
            const existingIds = new Set(mods.map((m: any) => m.id));
            const missingModules = fallbackModules.filter((m: any) => !existingIds.has(m.id));
            loadedModules = [...mods, ...missingModules].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
          } else {
            loadedModules = mods;
          }
        }

        if (isMounted) {
          setModules(loadedModules as any[]);
        }

        // Fetch subscriptions if tenantId is provided
        if (tenantId) {
          const { data: subs, error: subsError } = await supabase.from('merchant_subscriptions').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
          if (isMounted && subs) {
            // Manual merge since FK might be missing
            const planIds = subs.map((s: any) => s.plan_id).filter(Boolean);
            let mergedSubs = subs;
            if (planIds.length > 0) {
               const { data: plans } = await supabase.from('subscription_plans').select('id, module_name, module_key').in('id', planIds);
               if (plans) {
                  mergedSubs = subs.map((s: any) => ({
                     ...s,
                     subscription_plans: plans.find((p: any) => p.id === s.plan_id) || null
                  }));
               }
            }
            setSubscriptions(mergedSubs);
          }
        }
      } catch (err) {
        if (isMounted) setError(err as Error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchModules();
    
    return () => { isMounted = false; };
  }, [tenantId]);

  const refreshSubscriptions = async () => {
    if (!tenantId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data: subs } = await supabase.from('merchant_subscriptions').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
    if (subs) {
      const planIds = subs.map((s: any) => s.plan_id).filter(Boolean);
      let mergedSubs = subs;
      if (planIds.length > 0) {
         const { data: plans } = await supabase.from('subscription_plans').select('id, module_name, module_key').in('id', planIds);
         if (plans) {
            mergedSubs = subs.map((s: any) => ({
               ...s,
               subscription_plans: plans.find((p: any) => p.id === s.plan_id) || null
            }));
         }
      }
      setSubscriptions(mergedSubs);
    }
  };

  return { modules, subscriptions, loading, error, refreshSubscriptions };
}
