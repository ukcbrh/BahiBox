import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const url = process.env.VITE_SUPABASE_URL + '/rest/v1/?apikey=' + process.env.VITE_SUPABASE_ANON_KEY;
  const res = await fetch(url);
  const json = await res.json();
  const schemas = json.definitions || (json.components && json.components.schemas) || {};
  const po = schemas.payment_orders;
  if(po) {
    console.log("Payment Orders Properties:", JSON.stringify(po.properties, null, 2));
  } else {
    console.log("payment_orders not found in schema");
  }
}
run();
