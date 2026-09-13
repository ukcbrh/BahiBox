import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const url = process.env.VITE_SUPABASE_URL || 'https://jysqddhshxntfdfbifou.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (url && key) {
  const supabase = createClient(url, key);
  supabase.from('subscription_plans').insert({
    id: crypto.randomUUID(),
    module_name: 'Retail POS',
    name: 'Test Plan',
    tier: 'Test Tier',
    price_monthly: 100,
    price_yearly: 1000,
    commission: 10,
    features: ['feature 1'],
    is_active: true,
    white_label: true
  }).then(({data, error}) => {
    console.log("Insert result:");
    console.log(error);
  });
}
