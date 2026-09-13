import sys

def process_file(filename):
    with open(filename, 'r') as f:
        content = f.read()
        
    target1 = """          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full max-w-sm mx-auto lg:max-w-none">
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
          </div>"""
          
    replacement1 = """          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full max-w-sm mx-auto lg:max-w-none">
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
          </div>"""
          
    if target1 in content:
        content = content.replace(target1, replacement1)
        print("Patched target1")
        
    target2 = "{!showWithdrawForm ? ("
    replacement2 = "{activeWalletTab === 'recharge' && ("
    
    if target2 in content:
        content = content.replace(target2, replacement2)
        print("Patched target2")

    with open(filename, 'w') as f:
        f.write(content)

process_file('src/pages/MerchantDashboard.tsx')
