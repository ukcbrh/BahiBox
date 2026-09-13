import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.rpc('run_sql', { sql: "SELECT enumlabel FROM pg_enum WHERE enumtypid = 'notification_channel'::regtype;" });
  
  if (error) {
    // If we don't have an rpc function for run_sql, maybe we can fetch it some other way or just report what's in schema.sql.
    console.error("Error with rpc:", error);
    // Alternatively just output what schema.sql says
  } else {
    console.log("Enum values:", data);
  }
}

check();
