import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const url = process.env.VITE_SUPABASE_URL || 'https://jysqddhshxntfdfbifou.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (url && key) {
  const supabase = createClient(url, key);

  const plans = [
    {
        id: '688b05e3-0bc5-4a0f-b478-70a0466ea4d8',
        moduleName: 'Retail POS',
        tier: 'Free',
        name: 'Starter Plan',
        priceMonthly: 0,
        priceYearly: 0,
    },
    {
        id: '4f470680-68e5-4865-a8b1-f0417a67a26a',
        moduleName: 'Retail POS',
        tier: 'Premium',
        name: 'Growth Plan',
        priceMonthly: 999,
        priceYearly: 9999,
    },
    {
        id: '5e7aaf10-e60d-4155-b4c3-6c97b143e5d2',
        moduleName: 'Retail POS',
        tier: 'Enterprise',
        name: 'White-Label Pro',
        priceMonthly: 4999,
        priceYearly: 49999,
    },
    {
        id: '0e09a174-1238-4aba-8800-03868869cc30',
        moduleName: 'Daily Services',
        tier: 'Free',
        name: 'Starter Plan',
        priceMonthly: 0,
        priceYearly: 0,
    },
    {
        id: 'a8d64deb-be3d-4235-86e0-d27116dab37f',
        moduleName: 'Daily Services',
        tier: 'Premium',
        name: 'Growth Plan',
        priceMonthly: 999,
        priceYearly: 9999,
    },
    {
        id: 'fb22381c-2765-4c74-a5ed-ff497313b5d2',
        moduleName: 'Daily Services',
        tier: 'Enterprise',
        name: 'White-Label Pro',
        priceMonthly: 4999,
        priceYearly: 49999,
    },
    {
        id: '10907883-46e5-46cd-9fd2-563cdded40c8',
        moduleName: 'Education',
        tier: 'Free',
        name: 'Starter Plan',
        priceMonthly: 0,
        priceYearly: 0,
    },
    {
        id: '3f1fb66e-295a-49ff-bc90-54d306c309ed',
        moduleName: 'Education',
        tier: 'Premium',
        name: 'Growth Plan',
        priceMonthly: 999,
        priceYearly: 9999,
    },
    {
        id: 'f7311628-c167-48e0-8707-4c3a53f2269a',
        moduleName: 'Education',
        tier: 'Enterprise',
        name: 'White-Label Pro',
        priceMonthly: 4999,
        priceYearly: 49999,
    },
    {
        id: '8315c4b6-10ad-48ec-aca7-76d3b83030ee',
        moduleName: 'Health Care',
        tier: 'Free',
        name: 'Starter Plan',
        priceMonthly: 0,
        priceYearly: 0,
    },
    {
        id: '86bab8fa-45b5-412f-bc00-de5647b6009c',
        moduleName: 'Health Care',
        tier: 'Premium',
        name: 'Growth Plan',
        priceMonthly: 999,
        priceYearly: 9999,
    },
    {
        id: 'fb7e5e58-e3eb-477f-8142-3ef5aca6f623',
        moduleName: 'Health Care',
        tier: 'Enterprise',
        name: 'White-Label Pro',
        priceMonthly: 4999,
        priceYearly: 49999,
    },
    {
        id: '7426f1d3-e79d-4e3e-a0cc-58aee4063bfd',
        moduleName: 'Hotel/Restaurant',
        tier: 'Free',
        name: 'Starter Plan',
        priceMonthly: 0,
        priceYearly: 0,
    },
    {
        id: 'bff901e0-cc2f-4d4c-87a4-ada4500f938a',
        moduleName: 'Hotel/Restaurant',
        tier: 'Premium',
        name: 'Growth Plan',
        priceMonthly: 999,
        priceYearly: 9999,
    },
    {
        id: 'aa420e53-9cd2-4b80-af1f-3a54bad5ac1d',
        moduleName: 'Hotel/Restaurant',
        tier: 'Enterprise',
        name: 'White-Label Pro',
        priceMonthly: 4999,
        priceYearly: 49999,
    },
    {
        id: 'c92c459b-0218-4c7e-b4b7-0dffac7670d8',
        moduleName: 'Manufacturing ERP',
        tier: 'Free',
        name: 'Starter Plan',
        priceMonthly: 0,
        priceYearly: 0,
    },
    {
        id: 'e6fb48d5-bf35-467e-bc88-ce86a08dfb5f',
        moduleName: 'Manufacturing ERP',
        tier: 'Premium',
        name: 'Growth Plan',
        priceMonthly: 999,
        priceYearly: 9999,
    },
    {
        id: '215b8d0f-d262-4b7c-9432-235d014256cb',
        moduleName: 'Manufacturing ERP',
        tier: 'Enterprise',
        name: 'White-Label Pro',
        priceMonthly: 4999,
        priceYearly: 49999,
    },
    {
        id: 'c2852ff1-13be-49d6-ad46-9e7d7e40aff7',
        moduleName: 'Transport Management',
        tier: 'Free',
        name: 'Starter Plan',
        priceMonthly: 0,
        priceYearly: 0,
    },
    {
        id: 'f191c96d-dfba-48fe-89fc-9a4e53367331',
        moduleName: 'Transport Management',
        tier: 'Premium',
        name: 'Growth Plan',
        priceMonthly: 999,
        priceYearly: 9999,
    },
    {
        id: 'e1dfb5db-4cb3-4dd9-9a22-4416874bfdf4',
        moduleName: 'Transport Management',
        tier: 'Enterprise',
        name: 'White-Label Pro',
        priceMonthly: 4999,
        priceYearly: 49999,
    },
    {
        id: '520aae39-1c7d-4252-8592-64b662baab74',
        moduleName: 'Agri Management',
        tier: 'Free',
        name: 'Starter Plan',
        priceMonthly: 0,
        priceYearly: 0,
    },
    {
        id: '84b5b383-ec89-49e3-b877-d2686a001fc7',
        moduleName: 'Agri Management',
        tier: 'Premium',
        name: 'Growth Plan',
        priceMonthly: 999,
        priceYearly: 9999,
    },
    {
        id: '1523d701-a3b6-4967-9932-c30378d65130',
        moduleName: 'Agri Management',
        tier: 'Enterprise',
        name: 'White-Label Pro',
        priceMonthly: 4999,
        priceYearly: 49999,
    }
  ];

  async function seed() {
    for (const p of plans) {
      const { error } = await supabase.from('subscription_plans').upsert({
        id: p.id,
        module_name: p.moduleName,
        tier: p.tier,
        name: p.name,
        price_monthly: p.priceMonthly,
        price_yearly: p.priceYearly,
        is_active: true
      }, { onConflict: 'id' });
      if (error) console.error("Error inserting plan:", error);
    }

    const { error: promoErr } = await supabase.from('promo_codes').upsert({
      id: 'cf41d728-907c-4187-9336-50eea8e8c4a8',
      code: 'LAUNCH50',
      discount_type: 'percentage',
      discount_value: 50,
      is_active: true
    }, { onConflict: 'id' });

    console.log("Seeding complete. Error promo:", promoErr);
  }
  
  seed();
}
