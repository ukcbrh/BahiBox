import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: c } = await supabase.from('retail_customers').select('tenant_id').limit(1);
  if (!c || c.length === 0) return console.log("no customers");
  const t = c[0].tenant_id;
  
  const { data: ins, error: errIns } = await supabase.from('retail_customers').insert({
    tenant_id: t,
    customer_name: 'Test Delete',
    phone: '9999999999'
  }).select('*').single();
  
  if (errIns) {
    console.log("insert err", errIns);
    return;
  }
  
  const { error: delErr } = await supabase.from('retail_customers').delete().eq('id', ins.id);
  console.log("delete err", delErr);
}
run();
