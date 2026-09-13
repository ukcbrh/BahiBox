import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('product_stock').select('product_id, branch_id, current_quantity').limit(1);
  console.log("Stock data:", data);
  if (data && data.length > 0) {
      const pData = await supabase.from('products').select('id, product_name, tenant_id').eq('id', data[0].product_id);
      console.log("Product:", pData.data);
  }
}
run();
