import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || 'https://jysqddhshxntfdfbifou.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (url && key) {
  const supabase = createClient(url, key);
  supabase.from('subscription_plans').select('*').then(({data, error}) => {
    if (data && data.length > 0) {
      const mappedPlans = data.map(p => ({
        id: p.id,
        moduleName: p.module_name,
        tier: p.tier,
        name: p.name,
        priceMonthly: p.price_monthly,
        priceYearly: p.price_yearly,
        commission: p.commission,
        features: p.features || [],
        isActive: p.is_active,
        whiteLabel: p.white_label
      }));
      
      const modName = 'Retail POS';
      const dynamicPlansForModule = mappedPlans.filter(p => p.moduleName === modName && p.isActive !== false);
      console.log("Filtered count:", dynamicPlansForModule.length);
      console.log("First:", dynamicPlansForModule[0]);
    }
  });
}
