import React, { useState, useEffect } from 'react';
import { getSupabaseClient } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { Wallet, History, ArrowUpRight, ArrowDownRight, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function WalletBalanceCard({ walletId, onRefresh }: { walletId: string, onRefresh?: () => void }) {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");

  const fetchBalance = async () => {
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { data, error } = await supabase
      .from('wallet_accounts')
      .select('current_balance, account_label')
      .eq('id', walletId)
      .single();

    if (error) {
      console.error(error);
    } else if (data) {
      setBalance(data.current_balance);
      setLabel(data.account_label);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (walletId) fetchBalance();
  }, [walletId]);

  return (
    <Card className="shadow-sm border-none bg-white">
      <CardHeader className="border-b pb-4 flex flex-row justify-between items-center">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wallet size={20} className="text-emerald-600" /> 
          {label || "Wallet Balance"}
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={() => { fetchBalance(); onRefresh?.(); }}>
          <RefreshCw size={16} className={loading ? "animate-spin text-slate-400" : "text-slate-600"} />
        </Button>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">Current Balance</span>
          <span className="text-4xl font-black text-slate-900 tracking-tight">
            ₹ {Number(balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function LedgerHistoryTable({ walletId }: { walletId: string }) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async () => {
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { data, error } = await supabase
      .from('ledger_transactions')
      .select('*')
      .eq('wallet_account_id', walletId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error(error);
    } else if (data) {
      setTransactions(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (walletId) fetchTransactions();
  }, [walletId]);

  return (
    <Card className="shadow-sm border-none">
      <CardHeader className="border-b pb-4 flex flex-row justify-between items-center">
        <CardTitle className="flex items-center gap-2 text-lg">
          <History size={20} className="text-blue-600" /> Ledger History
        </CardTitle>
        <Button variant="outline" size="sm" onClick={fetchTransactions}>Refresh</Button>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading history...</div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No transactions found for this wallet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3 text-right">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{tx.description || tx.reference_type}</p>
                      <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">{tx.transaction_type} • Ref: {tx.reference_type}</p>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap font-bold">
                      {tx.transaction_type === 'credit' ? (
                        <span className="text-emerald-600 flex items-center justify-end gap-1">
                          <ArrowUpRight size={14} /> +₹{Number(tx.amount).toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-red-600 flex items-center justify-end gap-1">
                          <ArrowDownRight size={14} /> -₹{Number(tx.amount).toLocaleString('en-IN')}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap font-mono text-slate-700">
                      ₹{Number(tx.balance_after).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
