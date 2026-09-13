import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const currentTenantId = '54c9ce99-9606-4761-be38-6e576be8b7c9';
  const { data, error } = await supabase
    .from('sales_invoices')
    .select(`*`)
    .eq('tenant_id', currentTenantId)
    .order('created_at', { ascending: false });
  console.log("Error:", error);
  console.log("Data length:", data?.length);
}
run();
