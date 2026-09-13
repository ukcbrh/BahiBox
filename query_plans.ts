import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('subscription_plans').select('module_name');
  if (error) console.error(error);
  else {
    const modules = Array.from(new Set(data.map((r: any) => r.module_name)));
    console.log("Distinct modules:", modules);
  }
}
run();
