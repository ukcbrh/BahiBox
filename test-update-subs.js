import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
    email: 'ukcbrh@gmail.com', // wait I don't have password.
    password: 'Password123!'
  });
}
run();
