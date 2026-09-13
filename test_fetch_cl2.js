import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const url = `${process.env.VITE_SUPABASE_URL}/rest/v1/?apikey=${process.env.VITE_SUPABASE_ANON_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.definitions && data.definitions.credit_limits) {
    console.log(data.definitions.credit_limits);
  } else {
    console.log("Not accessible with anon key");
  }
}
run();
