import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const res = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/?apikey=${process.env.VITE_SUPABASE_ANON_KEY}`);
  const data = await res.json();
  const paths = Object.keys(data.paths || {});
  console.log("paths:", paths.filter(p => p.includes('rpc/')).join(', '));
}
run();
