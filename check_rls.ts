import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || 'https://jysqddhshxntfdfbifou.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (url && key) {
  const supabase = createClient(url, key);
  supabase.from('subscription_plans').select('*').then(({data, error}) => {
    console.log("Data length:", data?.length);
    console.log("Error:", error);
  });
}
