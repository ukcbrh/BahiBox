import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const url = process.env.VITE_SUPABASE_URL + '/rest/v1/?apikey=' + process.env.VITE_SUPABASE_ANON_KEY;
  const res = await fetch(url);
  const json = await res.json();
  const schemas = json.definitions || (json.components && json.components.schemas) || {};
  const si = schemas.sales_invoices;
  if(si) {
    console.log("Sales Invoices Columns:", Object.keys(si.properties));
    console.log("Customer ID type:", si.properties.customer_id);
  } else {
    console.log("sales_invoices not found in schema");
  }
}
run();
