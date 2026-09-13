import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check() {
  const url = process.env.VITE_SUPABASE_URL + '/rest/v1/?apikey=' + process.env.VITE_SUPABASE_ANON_KEY;
  const res = await fetch(url);
  const data = await res.json();
  
  const keys = Object.keys(data.definitions || {});
  console.log("Tables available:", keys.filter(k => k.includes('notif')));
}

check();
