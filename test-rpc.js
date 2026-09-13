import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc('capture_payment', {
    p_payment_order_id: '00000000-0000-0000-0000-000000000000',
    p_razorpay_payment_id: 'pay_test',
    p_method: 'card',
    p_gateway_fee: 0,
    p_raw_response: {}
  });
  console.log(data, error);
}
run();
