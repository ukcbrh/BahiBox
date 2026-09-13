import sys

def process_file(filename):
    with open(filename, 'r') as f:
        content = f.read()

    # 1. State change
    state_target = "const [showWithdrawForm, setShowWithdrawForm] = useState(false);"
    state_replacement = """const [activeWalletTab, setActiveWalletTab] = useState<'recharge' | 'withdraw' | 'send'>('recharge');
  const [sendForm, setSendForm] = useState({ phone: '', amount: '', note: '' });
  const [sendLoading, setSendLoading] = useState(false);"""
  
    # 2. Add Send Money handler
    handler_target = "const handleWithdrawRequest = async (e: React.FormEvent) => {"
    handler_replacement = """const handleSendMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletId || !user) return;
    const amount = parseFloat(sendForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Invalid amount");
      return;
    }
    if (!sendForm.phone) {
      toast.error("Please enter a phone number");
      return;
    }
    setSendLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
       const { data, error } = await supabase.rpc('transfer_wallet_to_phone', {
           p_from_wallet_id: walletId,
           p_amount: amount,
           p_to_phone: sendForm.phone,
           p_description: sendForm.note || 'Wallet Transfer'
       });
       if (error) throw error;
       toast.success(`Successfully sent ₹${amount} to ${data.recipient_name || 'recipient'}`);
       setSendForm({ phone: '', amount: '', note: '' });
       setRefreshKey(k => k + 1);
    } catch (err: any) {
       toast.error(err.message || 'Transfer failed');
    } finally {
       setSendLoading(false);
    }
  };

  const handleWithdrawRequest = async (e: React.FormEvent) => {"""

    # 3. Tab buttons
    tabs_target = """           <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full">
            <button
              onClick={() => setShowWithdrawForm(false)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${!showWithdrawForm ? 'bg-white dark:bg-slate-900 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
            >
              Recharge
            </button>
            <button
              onClick={() => setShowWithdrawForm(true)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${showWithdrawForm ? 'bg-white dark:bg-slate-900 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
            >
              Withdraw
            </button>
          </div>
          {!showWithdrawForm ? ("""
          
    tabs_replacement = """           <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full">
            <button
              onClick={() => setActiveWalletTab('recharge')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${activeWalletTab === 'recharge' ? 'bg-white dark:bg-slate-900 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
            >
              Recharge
            </button>
            <button
              onClick={() => setActiveWalletTab('withdraw')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${activeWalletTab === 'withdraw' ? 'bg-white dark:bg-slate-900 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
            >
              Withdraw
            </button>
            <button
              onClick={() => setActiveWalletTab('send')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${activeWalletTab === 'send' ? 'bg-white dark:bg-slate-900 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
            >
              Send Money
            </button>
          </div>
          
          {activeWalletTab === 'recharge' && ("""
          
    # 4. Form contents
    form_target = """                </Button>
              </CardContent>
            </Card>
          ) : ("""
          
    form_replacement = """                </Button>
              </CardContent>
            </Card>
          )}
          {activeWalletTab === 'withdraw' && ("""
          
    # 5. Add Send Form
    send_target = """                  <Button type="submit" className="w-full" disabled={withdrawLoading}>
                    {withdrawLoading ? 'Submitting...' : 'Request Withdrawal'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
           <LedgerHistoryTable walletId={walletId} />"""
        
    send_replacement = """                  <Button type="submit" className="w-full" disabled={withdrawLoading}>
                    {withdrawLoading ? 'Submitting...' : 'Request Withdrawal'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
          {activeWalletTab === 'send' && (
            <Card className="shadow-sm border-none bg-white dark:bg-slate-950">
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-lg">Send Money to Phone</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSendMoney} className="space-y-4">
                  <div>
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Recipient Phone Number</label>
                    <Input required value={sendForm.phone} onChange={e => setSendForm({...sendForm, phone: e.target.value})} placeholder="+919876543210" />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Amount (₹)</label>
                    <Input type="number" required min="1" value={sendForm.amount} onChange={e => setSendForm({...sendForm, amount: e.target.value})} placeholder="e.g. 500" />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Note (Optional)</label>
                    <Input value={sendForm.note} onChange={e => setSendForm({...sendForm, note: e.target.value})} placeholder="Payment for..." />
                  </div>
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={sendLoading}>
                    {sendLoading ? 'Processing...' : 'Send Money'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
           <LedgerHistoryTable walletId={walletId} />"""

    if state_target in content:
        content = content.replace(state_target, state_replacement)
        print("Patched state")
    if handler_target in content:
        content = content.replace(handler_target, handler_replacement)
        print("Patched handler")
    if tabs_target in content:
        content = content.replace(tabs_target, tabs_replacement)
        print("Patched tabs")
    if form_target in content:
        content = content.replace(form_target, form_replacement)
        print("Patched withdraw else")
    if send_target in content:
        content = content.replace(send_target, send_replacement)
        print("Patched send tab")

    with open(filename, 'w') as f:
        f.write(content)

process_file('src/components/consumer/ConsumerProfileView.tsx')
