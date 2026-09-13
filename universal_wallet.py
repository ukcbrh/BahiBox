import sys

with open('src/pages/MerchantDashboard.tsx', 'r') as f:
    content = f.read()

wallet_view = """
function UniversalMerchantWalletView() {
  const { currentTenantId, user } = useAuth();
  const [walletId, setWalletId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  useEffect(() => {
    const initWallet = async () => {
      const supabase = getSupabaseClient();
      if (!supabase || !currentTenantId || !user) return;
      
      try {
        let { data: tbId, error: tbError } = await supabase.rpc('get_or_create_tenant_bank_wallet', { p_tenant_id: currentTenantId });
        if (tbError) {
          const { data: existing } = await supabase.from('wallet_accounts').select('id').eq('tenant_id', currentTenantId).eq('owner_type', 'tenant_bank').single();
          if (existing) {
             tbId = existing.id;
          } else {
             const { data: newWallet, error: insertErr } = await supabase.from('wallet_accounts').insert({
               tenant_id: currentTenantId, owner_type: 'tenant_bank', owner_id: currentTenantId, account_label: 'Business Wallet'
             }).select('id').single();
             if (insertErr) throw new Error(insertErr.message);
             tbId = newWallet.id;
          }
        }
        if (tbId) setWalletId(tbId);
      } catch (err: any) {
        console.error("Failed to init merchant wallet", err);
      }
    };
    initWallet();
  }, [currentTenantId, user]);

  const handleRecharge = async () => {
    if (!walletId || !user || !currentTenantId) return;
    const amountStr = prompt("Enter amount to recharge Business Wallet (₹):", "1000");
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) return;
    
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/create-wallet-recharge-order', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token || ''}`
          },
          body: JSON.stringify({
              amount: amount,
              wallet_owner_context: 'merchant',
              tenant_id: currentTenantId
          })
      });

      if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to create Razorpay order');
      }
      
      const orderData = await response.json();
      
      const options = {
          key: orderData.razorpay_key_id,
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'BahiBox',
          description: `Wallet Recharge (Business Wallet)`,
          order_id: orderData.razorpay_order_id,
          handler: async function (response: any) {
              const { error } = await supabase.rpc('capture_payment', {
                  p_payment_order_id: orderData.payment_order_id,
                  p_razorpay_payment_id: response.razorpay_payment_id,
                  p_method: 'razorpay',
                  p_gateway_fee: 0,
                  p_raw_response: response
              });
              
              if (error) {
                  toast.error(error.message || 'Payment capture failed');
              } else {
                  toast.success(`Successfully recharged ₹${amount}`);
                  setRefreshKey(k => k + 1);
              }
          },
          prefill: {
              name: user.full_name || '',
              email: user.email || '',
              contact: user.phone || ''
          },
          theme: {
              color: '#3b82f6'
          }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
          toast.error(response.error.description || 'Payment failed');
      });
      rzp.open();

    } catch (err: any) {
      toast.error(err.message || 'Recharge failed');
    } finally {
      setLoading(false);
    }
  };

  if (!walletId) {
    return <div className="p-8 text-center text-slate-500">Loading wallet...</div>;
  }

  return (
    <div key={refreshKey} className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Universal Business Wallet</h2>
        <p className="text-slate-500 dark:text-slate-400">Manage your central BahiBox business balance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <WalletBalanceCard walletId={walletId} onRefresh={() => setRefreshKey(k=>k+1)} />
          
          <Card className="shadow-sm border-none bg-white dark:bg-slate-950">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-lg">Recharge Wallet</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <p className="text-sm text-slate-500">
                Add funds to your business wallet using Razorpay. These funds can be used for platform services, delivery funds, or external payouts.
              </p>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={handleRecharge} disabled={loading}>
                {loading ? 'Processing...' : 'Recharge via Razorpay'}
              </Button>
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-2">
          <LedgerHistoryTable walletId={walletId} />
        </div>
      </div>
    </div>
  );
}
"""

if "UniversalMerchantWalletView" not in content:
    content += "\n" + wallet_view
    
    # 2. Add Wallet to Sidebar Nav
    sidebar_target = """              <button 
                onClick={() => {
                  setActiveTab('settings');
                  setIsMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-colors ${
                  activeTab === 'settings'
                    ? 'text-primary bg-primary/10' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Settings size={18} />
                Settings
              </button>"""
              
    wallet_button = """              <button 
                onClick={() => {
                  setActiveTab('wallet');
                  setIsMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-colors ${
                  activeTab === 'wallet'
                    ? 'text-primary bg-primary/10' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Wallet size={18} />
                Wallet
              </button>"""
              
    content = content.replace(sidebar_target, wallet_button + "\n" + sidebar_target)
    
    # 3. Add to content area
    content_area = "{activeTab === 'settings' && <SettingsView activeModule={activeModuleState} />}"
    wallet_content = "{activeTab === 'wallet' && <UniversalMerchantWalletView />}"
    content = content.replace(content_area, content_area + "\n          " + wallet_content)
    
    with open('src/pages/MerchantDashboard.tsx', 'w') as f:
        f.write(content)
    print("Added UniversalMerchantWalletView")

