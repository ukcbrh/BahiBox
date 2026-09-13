import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const { data: d1, error: e1 } = await supabase.from('purchase_order_items').select('*').limit(1);
  if (d1 && d1.length > 0) {
    console.log("purchase_order_items columns:", Object.keys(d1[0]).join(", "));
  } else if (d1) {
    console.log("No data in purchase_order_items to infer columns.");
  } else {
    console.log("Error querying purchase_order_items:", e1);
  }
  
  const { data: d2, error: e2 } = await supabase.from('purchase_orders').select('*').limit(1);
  if (d2 && d2.length > 0) {
    console.log("purchase_orders columns:", Object.keys(d2[0]).join(", "));
  } else if (d2) {
    console.log("No data in purchase_orders to infer columns.");
  } else {
    console.log("Error querying purchase_orders:", e2);
  }
  
  // also check via RPC if possible
  const { data, error } = await supabase.rpc('execute_sql', { query: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'purchase_order_items';" });
  if (!error) console.log("Information schema:", data);
}
run();
