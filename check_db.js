import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: q1, error: e1 } = await supabase.rpc('get_schema_info', {}); // this won't work, we don't have this rpc.
}
run();
