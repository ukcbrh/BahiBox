import sys

def process_file(filename):
    with open(filename, 'r') as f:
        content = f.read()

    # 1. Add state variables for payment method and wallet balance
    state_target = "const [placingOrder, setPlacingOrder] = useState(false);"
    state_replacement = """const [placingOrder, setPlacingOrder] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'wallet'>('cod');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);"""

    # 2. Add useEffect to fetch wallet balance when entering checkout step 'form'
    checkout_effect_target = """  useEffect(() => {
    if (checkoutStep === 'form' && user && !checkoutAddressObj && !deliveryAddress) {
      const fetchDefaultAddress = async () => {"""
    checkout_effect_replacement = """  useEffect(() => {
    if (checkoutStep === 'form' && user) {
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
    
    if (checkoutStep === 'form' && user && !checkoutAddressObj && !deliveryAddress) {
      const fetchDefaultAddress = async () => {"""

    # 3. Update the payment method UI section
    payment_ui_target = """                  <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg border-b border-slate-100 dark:border-slate-800 pb-2">Payment Method</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="border-2 border-emerald-500 bg-emerald-50 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer text-emerald-700 relative overflow-hidden">
                        <Check size={16} className="absolute top-2 right-2 text-emerald-500" />
                        <span className="font-bold text-sm">Cash on Delivery</span>
                      </div>
                      <div className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-xl p-3 flex flex-col items-center justify-center text-slate-400 opacity-70 relative">
                        <span className="font-bold text-sm">Pay Online</span>
                        <span className="text-[9px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full absolute -top-1 -right-1">Coming Soon</span>
                      </div>
                    </div>
                  </div>"""

    payment_ui_replacement = """                  <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg border-b border-slate-100 dark:border-slate-800 pb-2">Payment Method</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div 
                        onClick={() => setPaymentMethod('cod')}
                        className={`border-2 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer relative overflow-hidden ${paymentMethod === 'cod' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-emerald-300'}`}
                      >
                        {paymentMethod === 'cod' && <Check size={16} className="absolute top-2 right-2 text-emerald-500" />}
                        <span className="font-bold text-sm">Cash on Delivery</span>
                      </div>
                      <div 
                        onClick={() => {
                          const total = cart.reduce((sum, item) => sum + ((item.product.price || 0) * item.quantity), 0);
                          if (walletBalance !== null && walletBalance >= total) {
                            setPaymentMethod('wallet');
                          }
                        }}
                        className={`border-2 rounded-xl p-3 flex flex-col items-center justify-center relative overflow-hidden ${paymentMethod === 'wallet' ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400'} ${walletBalance !== null && walletBalance < cart.reduce((sum, item) => sum + ((item.product.price || 0) * item.quantity), 0) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-300'}`}
                      >
                        {paymentMethod === 'wallet' && <Check size={16} className="absolute top-2 right-2 text-blue-500" />}
                        <span className="font-bold text-sm">Pay with Wallet</span>
                        {walletBalance !== null && (
                          <span className="text-[10px] mt-1 text-center font-medium">
                            {walletBalance < cart.reduce((sum, item) => sum + ((item.product.price || 0) * item.quantity), 0) 
                              ? `Insufficient (₹${walletBalance}) - Recharge in My Wallet` 
                              : `Balance: ₹${walletBalance}`}
                          </span>
                        )}
                        {!user && <span className="text-[10px] mt-1 text-center font-medium">Login required</span>}
                      </div>
                    </div>
                  </div>"""

    # 4. Update the rpc call
    rpc_target = """      const { data, error } = await supabase.rpc('create_online_order', {
        p_tenant_id: tId,
        p_branch_id: bId,
        p_user_id: user?.id || null,
        p_customer_name: user?.full_name || 'Guest User',
        p_customer_phone: checkoutPhone,
        p_customer_address: deliveryAddress,
        p_latitude: checkoutLat,
        p_longitude: checkoutLng,
        p_items: cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          price: item.product.price,
          name: item.product.name
        })),
        p_payment_method: 'cod'
      });"""

    rpc_replacement = """      const { data, error } = await supabase.rpc('create_online_order', {
        p_tenant_id: tId,
        p_branch_id: bId,
        p_user_id: user?.id || null,
        p_customer_name: user?.full_name || 'Guest User',
        p_customer_phone: checkoutPhone,
        p_customer_address: deliveryAddress,
        p_latitude: checkoutLat,
        p_longitude: checkoutLng,
        p_items: cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          price: item.product.price,
          name: item.product.name
        })),
        p_payment_method: paymentMethod
      });"""

    # 5. Order success UI update
    success_target = """                <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 p-4 rounded-xl text-sm font-medium border border-emerald-100 dark:border-emerald-800/30">
                  You can pay with cash or UPI upon delivery.
                </div>"""
                
    success_replacement = """                <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 p-4 rounded-xl text-sm font-medium border border-emerald-100 dark:border-emerald-800/30">
                  {paymentMethod === 'cod' ? 'You can pay with cash or UPI upon delivery.' : 'Paid via Wallet. Thank you!'}
                </div>"""

    if state_target in content:
        content = content.replace(state_target, state_replacement)
        print("Patched state")
    if checkout_effect_target in content:
        content = content.replace(checkout_effect_target, checkout_effect_replacement)
        print("Patched checkout effect")
    if payment_ui_target in content:
        content = content.replace(payment_ui_target, payment_ui_replacement)
        print("Patched payment UI")
    else:
        print("COULD NOT FIND PAYMENT UI TARGET")
    if rpc_target in content:
        content = content.replace(rpc_target, rpc_replacement)
        print("Patched rpc")
    if success_target in content:
        content = content.replace(success_target, success_replacement)
        print("Patched success message")

    with open(filename, 'w') as f:
        f.write(content)

process_file('src/pages/PublicApp.tsx')
