import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('product_categories').insert({ tenant_id: '809312b9-dc7a-4cbf-8bb8-86d1a97dce51', category_name: 'Test' }).select();
  console.log("INSERT DATA:", data);
  console.log("INSERT ERROR:", error);
}
run();
