import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Check if we can fetch nested relationship
  const { data, error } = await supabase.from('merchant_subscriptions').select('*, subscription_plans(module_name)').limit(1);
  console.log("Error:", error);
  console.log("Data:", data);
}
run();
