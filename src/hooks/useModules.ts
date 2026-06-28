import { useState, useEffect } from 'react';
import { getSupabaseClient } from '../lib/supabase';
import { ModuleMaster, MerchantSubscription } from '../types';

export function useModules(merchantId?: string) {
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
          { id: 'retail', module_name: 'Retail POS', description: 'Point of sale and inventory', icon: 'ShoppingCart', price: 49.00 },
          { id: 'manufacturing', module_name: 'Manufacturing', description: 'Production and tracking', icon: 'Factory', price: 199.00 },
          { id: 'education', module_name: 'Education', description: 'School management', icon: 'GraduationCap', price: 149.00 },
          { id: 'healthcare', module_name: 'Healthcare', description: 'Clinic and patient management', icon: 'Stethoscope', price: 299.00 },
          { id: 'hospitality', module_name: 'Hospitality', description: 'Hotel and restaurant', icon: 'Hotel', price: 99.00 },
          { id: 'transport', module_name: 'Transport', description: 'Fleet and logistics', icon: 'Truck', price: 149.00 },
          { id: 'services', module_name: 'Services', description: 'Service and booking', icon: 'Wrench', price: 49.00 },
          { id: 'agriculture', module_name: 'Agriculture', description: 'Farm and crop management', icon: 'Tractor', price: 79.00 }
        ];

        let loadedModules = fallbackModules;
        
        // Fetch modules
        const { data: mods, error: modsError } = await supabase.from('modules_master').select('*').order('module_name');
        
        if (mods && mods.length > 0) {
          if (mods.length < 8) {
            const existingIds = new Set(mods.map(m => m.id));
            const missingModules = fallbackModules.filter(m => !existingIds.has(m.id));
            loadedModules = [...mods, ...missingModules].sort((a, b) => (a.module_name || '').localeCompare(b.module_name || ''));
          } else {
            loadedModules = mods;
          }
        }

        if (isMounted) {
          setModules(loadedModules as any[]);
        }

        // Fetch subscriptions if merchantId is provided
        if (merchantId) {
          const { data: subs, error: subsError } = await supabase.from('merchant_subscriptions').select('*').eq('merchant_id', merchantId);
          if (isMounted && subs) {
            setSubscriptions(subs);
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
  }, [merchantId]);

  return { modules, subscriptions, loading, error };
}
