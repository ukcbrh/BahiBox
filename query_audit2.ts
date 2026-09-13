import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('target_id, actor_user_id, action_type, created_at')
    .eq('target_table', 'merchant_branding')
    .eq('action_type', 'approve_whitelabel_domain');
  console.log("Audit Logs all:", data, error);
}

check();
