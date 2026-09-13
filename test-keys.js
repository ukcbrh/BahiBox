import dotenv from 'dotenv';
dotenv.config();
console.log("URL:", process.env.VITE_SUPABASE_URL);
console.log("ANON:", !!process.env.VITE_SUPABASE_ANON_KEY);
console.log("SERVICE:", !!process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);
console.log("RZP_WEBHOOK:", !!process.env.RAZORPAY_WEBHOOK_SECRET);
console.log("RZP_SECRET:", !!process.env.RAZORPAY_KEY_SECRET);
