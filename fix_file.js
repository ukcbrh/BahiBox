const fs = require('fs');
let content = fs.readFileSync('src/components/payments/SubscriptionPlanManager.tsx', 'utf8');

const target = `  useEffect(() => {
    const initData = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      
      const { data: modsData } = await supabase.from('modules_master').select('name');
      if (modsData && modsData.length > 0) {
         setAvailableModules(modsData.map((m: any) => m.name));
      }

      // Fetch plans from DB
      const { data: plansData, error: plansErr } = await supabase.from('subscription_plans').select('*');
      if (plansData && plansData.length > 0) {
        setPlans(plansData.map((p: any) => ({
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
        })));
      } else {
        // Fallback to local defaults if DB is empty, but push to DB so they exist
        setPlans(currentPlans => {
          const pushDefaults = async () => {
            for (const p of currentPlans) {
              await supabase.from('subscription_plans').upsert({
                id: p.id,
                module_name: p.moduleName,
                tier: p.tier,
                name: p.name,
                price_monthly: p.priceMonthly,
                price_yearly: p.priceYearly,
                commission: p.commission,
                features: p.features,
                is_active: p.isActive,
                white_label: p.whiteLabel
              }, { onConflict: 'id' });
            }
          };
          pushDefaults();
          return currentPlans;
        });
      }

      // Fetch coupons from DB
      const { data: couponsData } = await supabase.from('promo_codes').select('*');
      if (couponsData && couponsData.length > 0) {
        setCoupons(couponsData.map((c: any) => ({
          id: c.id,
          code: c.code,
          discountType: c.discount_type || (c.discount_percentage ? 'percentage' : 'fixed'),
          discountValue: c.discount_value || c.discount_percentage || c.fixed_discount || 0,
          applicableModule: c.applicable_module || 'All',
          applicablePlan: c.applicable_plan || 'All',
          isActive: c.is_active
        })));
      } else {
        setCoupons(currentCoupons => {
          const pushDefaults = async () => {
            for (const c of currentCoupons) {
              await supabase.from('promo_codes').upsert({
                id: c.id,
                code: c.code,
                discount_type: c.discountType,
                discount_value: c.discountValue,
                applicable_module: c.applicableModule,
                applicable_plan: c.applicablePlan,
                is_active: c.isActive
              }, { onConflict: 'id' });
            }
          };
          pushDefaults();
          return currentCoupons;
        });
      }
    };
    
    initData();
  }, []);`;

const replacement = `  const fetchPlans = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      
      const { data: modsData } = await supabase.from('modules_master').select('name');
      if (modsData && modsData.length > 0) {
         setAvailableModules(modsData.map((m: any) => m.name));
      }

      // Fetch plans from DB
      const { data: plansData, error: plansErr } = await supabase.from('subscription_plans').select('*');
      if (plansData && plansData.length > 0) {
        setPlans(plansData.map((p: any) => ({
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
        })));
      } else {
        // Fallback to local defaults if DB is empty, but push to DB so they exist
        setPlans(currentPlans => {
          const pushDefaults = async () => {
            for (const p of currentPlans) {
              await supabase.from('subscription_plans').upsert({
                id: p.id,
                module_name: p.moduleName,
                tier: p.tier,
                name: p.name,
                price_monthly: p.priceMonthly,
                price_yearly: p.priceYearly,
                commission: p.commission,
                features: p.features,
                is_active: p.isActive,
                white_label: p.whiteLabel
              }, { onConflict: 'id' });
            }
          };
          pushDefaults();
          return currentPlans;
        });
      }

      // Fetch coupons from DB
      const { data: couponsData } = await supabase.from('promo_codes').select('*');
      if (couponsData && couponsData.length > 0) {
        setCoupons(couponsData.map((c: any) => ({
          id: c.id,
          code: c.code,
          discountType: c.discount_type || (c.discount_percentage ? 'percentage' : 'fixed'),
          discountValue: c.discount_value || c.discount_percentage || c.fixed_discount || 0,
          applicableModule: c.applicable_module || 'All',
          applicablePlan: c.applicable_plan || 'All',
          isActive: c.is_active
        })));
      } else {
        setCoupons(currentCoupons => {
          const pushDefaults = async () => {
            for (const c of currentCoupons) {
              await supabase.from('promo_codes').upsert({
                id: c.id,
                code: c.code,
                discount_type: c.discountType,
                discount_value: c.discountValue,
                applicable_module: c.applicableModule,
                applicable_plan: c.applicablePlan,
                is_active: c.isActive
              }, { onConflict: 'id' });
            }
          };
          pushDefaults();
          return currentCoupons;
        });
      }
    };

  useEffect(() => {
    fetchPlans();
  }, []);`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/components/payments/SubscriptionPlanManager.tsx', content, 'utf8');
  console.log("REPLACED SUCCESSFULLY");
} else {
  console.log("TARGET NOT FOUND");
}
