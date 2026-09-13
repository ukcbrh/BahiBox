import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sql = fs.readFileSync('patch_42.sql', 'utf8');
  console.log("Applying patch_42.sql...");
  const { data, error } = await supabase.rpc('exec_sql', { sql: sql });
  if (error) {
    console.error("Error applying SQL:", error);
  } else {
    console.log("Success!", data);
  }
}
run();
