const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.log("No Supabase URL or Key found");
  process.exit(1);
}

const supabase = createClient(url, key);

async function test() {
  const { data, error } = await supabase.from('subscription_plans').update({
    name: 'Test Plan'
  }).eq('id', '1');
  
  if (error) {
    console.error("Error:", JSON.stringify(error, null, 2));
  } else {
    console.log("Success:", data);
  }
}

test();
