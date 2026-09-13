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
    .eq('merchant_id', '54c9ce99-9606-4761-be38-6e576be8b7c9');
  console.log("Merchant Branding:", data, error);
}

check();
