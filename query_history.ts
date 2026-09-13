import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
      const { data, error } = await supabase
        .from('merchant_branding')
        .select('*')
        .in('domain_verification_status', ['verified', 'rejected'])
        .order('updated_at', { ascending: false });
        
      console.log("brandings:", data, error);
}

check();
