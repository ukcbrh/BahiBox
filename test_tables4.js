import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('purchase_invoices').select().limit(0);
  // to get columns we can just do a select limit 0 and check data type? Actually, no, data is an empty array without keys if empty.
  // better to query information_schema or just handle it if it throws.
  const { data: cols, error: err2 } = await supabase.rpc('get_columns_for_table', { table_name: 'purchase_invoices' });
  console.log(cols, err2);
}
check();
