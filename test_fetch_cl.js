import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const url = `${process.env.VITE_SUPABASE_URL}/rest/v1/credit_limits?select=*&limit=1`;
  const res = await fetch(url, { headers: { 'apikey': process.env.VITE_SUPABASE_ANON_KEY, 'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}` } });
  console.log(res.status, await res.text());
}
run();
