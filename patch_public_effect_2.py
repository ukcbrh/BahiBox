import sys

def process_file(filename):
    with open(filename, 'r') as f:
        content = f.read()

    target = """  useEffect(() => {
    if (user && checkoutStep === 'form') {
      const fetchDefaultAddress = async () => {"""
      
    replacement = """  useEffect(() => {
    if (user && checkoutStep === 'form') {
      const fetchWalletBalance = async () => {
        const supabase = getSupabaseClient();
        if(!supabase) return;
        const { data } = await supabase.rpc('get_or_create_platform_wallet', { p_user_id: user.id });
        if(data) {
           const { data: wData } = await supabase.from('wallet_accounts').select('current_balance').eq('id', data).single();
           if(wData) setWalletBalance(wData.current_balance);
        }
      };
      fetchWalletBalance();
    }
    
    if (user && checkoutStep === 'form') {
      const fetchDefaultAddress = async () => {"""
      
    if target in content:
        content = content.replace(target, replacement)
        print("Patched effect")
    else:
        print("Target not found for effect")

    with open(filename, 'w') as f:
        f.write(content)

process_file('src/pages/PublicApp.tsx')
