import { useState, useEffect } from 'react';
import { getSupabaseClient } from '../lib/supabase';
import { DEFAULT_PLANS, Plan } from '../components/payments/SubscriptionPlanManager';

export function usePlans() {
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchPlans = async () => {
      try {
        const supabase = getSupabaseClient();
        if (!supabase) {
          // fallback to localStorage if no supabase
          const cached = localStorage.getItem('admin_subscription_plans_v2');
          if (cached && isMounted) {
             try { setPlans(JSON.parse(cached)); } catch(e){}
          }
          if (isMounted) setLoading(false);
          return;
        }

        const { data, error } = await supabase.from('subscription_plans').select('*');
        if (data && data.length > 0 && isMounted) {
          setPlans(data.map((p: any) => ({
            id: p.id,
            moduleName: p.module_name,
            moduleKey: p.module_key,
            tier: p.tier,
            name: p.name,
            priceMonthly: p.price_monthly,
            priceYearly: p.price_yearly,
            commission: p.commission,
            features: Array.isArray(p.features) ? p.features : [],
            isActive: p.is_active,
            whiteLabel: p.white_label
          })));
        } else if (isMounted) {
          const cached = localStorage.getItem('admin_subscription_plans_v2');
          if (cached) {
             try { setPlans(JSON.parse(cached)); } catch(e){}
          }
        }
      } catch (err) {
        console.warn('Failed to fetch plans', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchPlans();
    return () => { isMounted = false; };
  }, []);

  return { plans, loading };
}
