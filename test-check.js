import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: subs, error: subsError } = await supabase.from('merchant_subscriptions').select('*');
  console.log('Subscriptions:', subs, subsError);
  
  const { data: orders, error: ordersError } = await supabase.from('payment_orders').select('*').eq('purpose', 'platform_subscription').order('created_at', { ascending: false }).limit(2);
  console.log('Orders:', orders, ordersError);
}
run();
