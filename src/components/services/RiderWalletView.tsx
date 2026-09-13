import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { IndianRupee, ArrowDownLeft, ArrowUpRight, Clock } from 'lucide-react';
import { getSupabaseClient } from '@/src/lib/supabase';

interface RiderWalletViewProps {
  user: any;
}

export function RiderWalletView({ user }: RiderWalletViewProps) {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (user && supabase) {
      fetchWallet();
    }
  }, [user, supabase]);

  const fetchWallet = async () => {
    if (!supabase || !user) return;
    setLoading(true);
    
    // 1. Fetch or create staff wallet
    let walletId = null;
    const { data: walletData, error: wErr } = await supabase
      .from('wallet_accounts')
      .select('*')
      .eq('owner_type', 'staff')
      .eq('owner_id', user.id)
      .limit(1);
      
    if (walletData && walletData.length > 0) {
      setBalance(walletData[0].current_balance);
      walletId = walletData[0].id;
    } else {
      // Create wallet if it doesn't exist
      const { data: newWallet, error: createErr } = await supabase
        .from('wallet_accounts')
        .insert({
          owner_type: 'staff',
          owner_id: user.id,
          account_label: 'Rider Earnings',
          current_balance: 0
        })
        .select()
        .single();
        
      if (newWallet) {
        setBalance(newWallet.current_balance);
        walletId = newWallet.id;
      } else {
        console.error("Failed to create wallet", createErr);
      }
    }
    
    // 2. Fetch transaction history if we have a wallet
    if (walletId) {
      const { data: txData } = await supabase
        .from('ledger_transactions')
        .select('*')
        .eq('wallet_account_id', walletId)
        .order('created_at', { ascending: false });
        
      if (txData) {
        setTransactions(txData);
      }
    }
    
    setLoading(false);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-40">Loading wallet...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 border-none shadow-lg text-white rounded-3xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <IndianRupee size={120} />
        </div>
        <CardContent className="p-8 relative z-10">
          <p className="text-blue-100 font-medium uppercase tracking-wider text-sm mb-2">Available Balance</p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-medium">₹</span>
            <span className="text-5xl font-bold tracking-tight">{balance.toFixed(2)}</span>
          </div>
          
          <div className="flex gap-4 mt-8">
            <Button className="flex-1 bg-white/20 hover:bg-white/30 text-white border-none rounded-xl h-12 font-bold backdrop-blur-sm">
              Withdraw
            </Button>
            <Button className="flex-1 bg-white text-blue-600 hover:bg-slate-50 border-none rounded-xl h-12 font-bold">
              History
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Clock className="text-slate-400" size={20}/> 
          Recent Transactions
        </h3>
        
        {transactions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 border-dashed">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <IndianRupee className="text-slate-400" size={24} />
            </div>
            <p className="text-slate-500 font-medium">No transactions yet</p>
            <p className="text-xs text-slate-400 mt-1">Earnings will appear here when you complete jobs.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div key={tx.id} className="bg-white p-4 rounded-2xl flex items-center justify-between border border-slate-100 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.transaction_type === 'credit' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                    {tx.transaction_type === 'credit' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{tx.description || (tx.transaction_type === 'credit' ? 'Payment Received' : 'Withdrawal')}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <div className={`font-bold ${tx.transaction_type === 'credit' ? 'text-emerald-600' : 'text-slate-800'}`}>
                  {tx.transaction_type === 'credit' ? '+' : '-'}₹{tx.amount.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
