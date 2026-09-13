import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const url = process.env.VITE_SUPABASE_URL + '/rest/v1/?apikey=' + process.env.VITE_SUPABASE_ANON_KEY;
  const res = await fetch(url);
  const json = await res.json();
  const rpcs = json.paths;
  const funcs = Object.keys(rpcs).filter(k => k.startsWith('/rpc/'));
  console.log("Functions:", funcs.join(', '));
}
run();
