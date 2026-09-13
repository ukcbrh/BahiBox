const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.VITE_SUPABASE_URL.replace('https', 'postgres').replace('.supabase.co', '') }); // Not quite right, better to use the connection string.
