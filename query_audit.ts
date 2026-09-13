import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('target_id, actor_user_id, action_type, created_at, users:actor_user_id(full_name, email)')
    .eq('target_table', 'merchant_branding')
    .in('target_id', ['54c9ce99-9606-4761-be38-6e576be8b7c9'])
    .in('action_type', ['approve_whitelabel_domain', 'reject_whitelabel_domain'])
    .order('created_at', { ascending: false });
  console.log("Audit Logs:", data, error);
}

check();
