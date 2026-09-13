import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: users } = await supabase.from('users').select('tenant_id').limit(1);
  if (!users || users.length === 0) return console.log("no user");
  const t = users[0].tenant_id;
  
  // insert
  const { data: ins, error: errIns } = await supabase.from('retail_customers').insert({
    tenant_id: t,
    customer_name: 'Test Delete',
    phone: '9999999999'
  }).select('*').single();
  
  if (errIns) {
    console.log("insert err", errIns);
    return;
  }
  
  console.log("inserted", ins.id);
  
  const { error: delErr } = await supabase.from('retail_customers').delete().eq('id', ins.id);
  console.log("delete err", delErr);
}
run();
