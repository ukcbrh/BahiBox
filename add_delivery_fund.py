import sys
with open('src/pages/MerchantDashboard.tsx', 'r') as f:
    content = f.read()

# Add handleRechargeDeliveryFund
recharge_func = """  const handleRechargeDeliveryFund = async () => {
    if (!deliveryFundWalletId || !user || !currentTenantId) return;
    const amountToRecharge = prompt("Enter amount to recharge Delivery Fund from Cash Wallet (₹):", "500");
    if (!amountToRecharge || isNaN(Number(amountToRecharge))) return;
    
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { data, error } = await supabase.rpc('recharge_delivery_fund', {
        p_tenant_id: currentTenantId,
        p_amount: parseFloat(amountToRecharge),
        p_created_by: user.id
      });
      if (error) throw error;
      toast.success(`Successfully recharged delivery fund with ₹${amountToRecharge}`);
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      toast.error(err.message || 'Recharge failed');
    } finally {
      setLoading(false);
    }
  };
"""

if "const handleRechargeDeliveryFund =" not in content:
    content = content.replace(
        "  const handleTransaction = async () => {",
        recharge_func + "\n  const handleTransaction = async () => {"
    )

# Add tabs UI and Delivery Fund View
tabs_ui = """      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Cash & Bank Ledger</h2>
        <p className="text-slate-500 dark:text-slate-400">Central Wallet & Ledger Engine (Stage 0)</p>
      </div>

      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'cash' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('cash')}
        >
          Main Cash Book
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'delivery' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('delivery')}
        >
          Rider Delivery Fund
        </button>
      </div>

      {activeTab === 'cash' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
"""

end_cash_tab = """        <div className="lg:col-span-2">
          <LedgerHistoryTable walletId={walletId} />
        </div>
      </div>
      )}

      {activeTab === 'delivery' && deliveryFundWalletId && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
        <div className="lg:col-span-1 space-y-6">
          <WalletBalanceCard walletId={deliveryFundWalletId} onRefresh={() => setRefreshKey(k=>k+1)} />
          <Card className="shadow-sm border-none bg-white dark:bg-slate-950">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-lg">Recharge Fund</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <p className="text-sm text-slate-500">
                Move funds from your Main Cash Book to your Rider Delivery Fund. This fund is used to automatically pay delivery riders when they complete jobs for your store.
              </p>
              <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleRechargeDeliveryFund} disabled={loading}>
                {loading ? 'Processing...' : 'Recharge from Cash Wallet'}
              </Button>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <LedgerHistoryTable walletId={deliveryFundWalletId} />
        </div>
      </div>
      )}"""

if "Main Cash Book" not in content and "Rider Delivery Fund" not in content:
    target_start = """      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Cash & Bank Ledger</h2>
        <p className="text-slate-500 dark:text-slate-400">Central Wallet & Ledger Engine (Stage 0)</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">"""
    content = content.replace(target_start, tabs_ui)
    
    target_end = """        <div className="lg:col-span-2">
          <LedgerHistoryTable walletId={walletId} />
        </div>
      </div>"""
    content = content.replace(target_end, end_cash_tab)

with open('src/pages/MerchantDashboard.tsx', 'w') as f:
    f.write(content)

