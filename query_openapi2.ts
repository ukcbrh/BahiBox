import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check() {
  const url = process.env.VITE_SUPABASE_URL + '/rest/v1/?apikey=' + process.env.VITE_SUPABASE_ANON_KEY;
  const res = await fetch(url);
  const data = await res.json();
  
  if (data.definitions && data.definitions.notification_queue) {
     console.dir(data.definitions.notification_queue.properties.channel, { depth: null });
  } else {
     console.log("Not found in definitions");
  }
}

check();
