import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

console.log("VITE_SUPABASE_URL", process.env.VITE_SUPABASE_URL);
console.log("VITE_SUPABASE_ANON_KEY", process.env.VITE_SUPABASE_ANON_KEY ? "EXISTS" : "MISSING");
