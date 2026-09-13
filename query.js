import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('service_providers').select('vehicle_category');
  if (error) console.error("Error:", error);
  else {
    const categories = new Set(data.map(r => r.vehicle_category));
    console.log("Distinct categories:", Array.from(categories));
  }
}
run();
