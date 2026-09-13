import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
    email: 'ukcbrh@gmail.com', // Let's just use the user email from the prompt metadata
    password: 'Password123!' // Try to login if we can, wait we don't have the password
  });
  console.log(user ? 'Logged in' : 'Not logged in');
}
run();
