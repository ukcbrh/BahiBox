import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Since test scripts don't have access to .env if they don't load it correctly?
// Wait, dotenv.config() loads .env. But maybe VITE_SUPABASE_SERVICE_ROLE_KEY is in .env.local?
// Let's use fs to read it!
import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf-8');
const lines = envFile.split('\n');
const env = {};
for (const line of lines) {
  const [k, v] = line.split('=');
  if (k) env[k] = v;
}
console.log('Has service key:', !!env.VITE_SUPABASE_SERVICE_ROLE_KEY);

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data } = await supabase.from('merchant_subscriptions').select('*');
  console.log(data);
}
run();
