import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: { user }, error: signInErr } = await supabase.auth.signInWithPassword({
    email: 'ukcbrh@gmail.com',
    password: 'Password123!'
  });
  
  const res = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/?apikey=${process.env.VITE_SUPABASE_ANON_KEY}`);
  const data = await res.json();
  const defs = data.definitions;
  
  let refs = [];
  for (const [table, def] of Object.entries(defs)) {
     if (def.properties) {
        for (const [col, info] of Object.entries(def.properties)) {
           if (info.description && info.description.includes('retail_customers')) {
              refs.push(`${table}.${col} -> ${info.description}`);
           }
        }
     }
  }
  console.log("References to retail_customers:", refs);
}
run();
