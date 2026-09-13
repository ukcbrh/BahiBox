const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

// We need to parse VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY? No, Supabase usually has a direct DB URL if configured.
// Let's check process.env for any URL
console.log(Object.keys(process.env).filter(k => k.toLowerCase().includes('url') || k.toLowerCase().includes('db') || k.toLowerCase().includes('postgres')));

