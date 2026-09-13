require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function test() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);
  
  // Find the user
  const { data: { users }, error: uErr } = await supabase.auth.admin.listUsers();
  if (uErr) {
    console.error("Failed to list users", uErr);
    return;
  }
  const user = users.find(u => u.email === 'ukcbrh@gmail.com') || users[0];
  if (!user) {
    console.error("No user found");
    return;
  }
  console.log("Found user:", user.email, user.id);

  // Now create a client with anon key but set the Authorization header manually with a signed JWT if we had one.
  // Actually, we can just test the function directly via service role to see its definition.
  const { data: p_data, error: p_err } = await supabase.rpc('get_or_create_platform_wallet', { p_user_id: user.id });
  console.log("RPC result with service role:", p_data, p_err);
  
  // To test RLS, let's query wallet_accounts directly using a JWT for the user.
  // Wait, I can just write a quick route in server.ts to test it? Or generate a JWT using jsonwebtoken.
  
}
test();
