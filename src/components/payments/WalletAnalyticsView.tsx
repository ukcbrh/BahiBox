import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/card';
import { IndianRupee, TrendingUp, Users, Receipt } from 'lucide-react';
import { getSupabaseClient } from '@/src/lib/supabase';
import { LedgerHistoryTable } from '../WalletComponents';

export function WalletAnalyticsView() {
  const [summary, setSummary] = useState<any>(null);
  const [rechargers, setRechargers] = useState<any[]>([]);
  const [feeBreakdown, setFeeBreakdown] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [selectedWallet, setSelectedWallet] = useState<any>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setSearchError('');
    setSearchResults([]);
    setSelectedWallet(null);
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data, error } = await supabase.rpc('search_wallet_directory', {
      p_identifier: searchQuery.trim()
    });
    if (error) {
      setSearchError(error.message || 'No account found');
    } else {
      setSearchResults(data || []);
    }
    setSearchLoading(false);
  };

  const fetchAll = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setLoading(true);

    const [summaryRes, rechargersRes, feeRes] = await Promise.all([
      supabase.rpc('get_wallet_commission_summary'),
      supabase.rpc('get_wallet_rechargers_list'),
      supabase.rpc('get_gateway_fee_breakdown'),
    ]);

    if (summaryRes.data) {
      setSummary(Array.isArray(summaryRes.data) ? summaryRes.data[0] : summaryRes.data);
    }
    if (rechargersRes.data) setRechargers(rechargersRes.data);
    if (feeRes.data) setFeeBreakdown(feeRes.data);
    setLoading(false);
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading wallet analytics...</div>;

  const merchantRechargers = rechargers.filter(r => r.owner_type === 'tenant_bank');
  const consumerRechargers = rechargers.filter(r => r.owner_type === 'consumer');

  const fmt = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold dark:text-white">Wallet Analytics</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Platform commission, recharges, and gateway costs.</p>
      </div>

      <Card>
        <CardHeader className="border-b pb-4"><CardTitle className="text-lg">Search Wallet Directory</CardTitle></CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Phone number ya email daalo..."
              className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 dark:text-white"
            />
            <button
              onClick={handleSearch}
              disabled={searchLoading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50"
            >
              {searchLoading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {searchError && (
            <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">{searchError}</p>
          )}

          {searchResults.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2">
              {searchResults.map((r) => (
                <div
                  key={r.wallet_id}
                  onClick={() => setSelectedWallet(r)}
                  className={`p-4 rounded-xl border cursor-pointer transition-colors ${selectedWallet?.wallet_id === r.wallet_id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-800 hover:border-blue-300'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      {r.owner_type === 'tenant_bank' ? 'Merchant' : 'Consumer'}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {r.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {r.owner_type === 'tenant_bank' ? r.business_name : r.display_name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{r.phone} • {r.email}</p>
                  <p className="text-lg font-bold text-blue-600 mt-2">{fmt(r.current_balance)}</p>
                </div>
              ))}
            </div>
          )}

          {selectedWallet && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <h4 className="font-bold text-sm text-slate-600 dark:text-slate-400 mb-3">
                Ledger for {selectedWallet.owner_type === 'tenant_bank' ? selectedWallet.business_name : selectedWallet.display_name}
              </h4>
              <LedgerHistoryTable walletId={selectedWallet.wallet_id} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-emerald-600 mb-2"><TrendingUp size={18} /><span className="text-xs font-bold uppercase tracking-wide">Total Commission</span></div>
            <p className="text-2xl font-bold dark:text-white">{fmt(summary?.combined_commission_total)}</p>
            <p className="text-xs text-slate-400 mt-1">Ride: {fmt(summary?.ride_commission_total)} + Order: {fmt(summary?.order_commission_total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-blue-600 mb-2"><IndianRupee size={18} /><span className="text-xs font-bold uppercase tracking-wide">Platform Wallet Balance</span></div>
            <p className="text-2xl font-bold dark:text-white">{fmt(summary?.platform_wallet_balance)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-amber-600 mb-2"><Receipt size={18} /><span className="text-xs font-bold uppercase tracking-wide">Gateway Fees Paid</span></div>
            <p className="text-2xl font-bold dark:text-white">{fmt(summary?.total_gateway_fees)}</p>
            <p className="text-xs text-slate-400 mt-1">Cost paid to Razorpay</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-purple-600 mb-2"><Users size={18} /><span className="text-xs font-bold uppercase tracking-wide">Total Rechargers</span></div>
            <p className="text-2xl font-bold dark:text-white">{rechargers.length}</p>
            <p className="text-xs text-slate-400 mt-1">{merchantRechargers.length} Merchants, {consumerRechargers.length} Consumers</p>
          </CardContent>
        </Card>
      </div>

      {/* Order Commission Status Breakdown */}
      <Card>
        <CardHeader className="border-b pb-4"><CardTitle className="text-lg">Order/Retail Commission Status</CardTitle></CardHeader>
        <CardContent className="p-6 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Pending Settlement</p>
            <p className="text-xl font-bold text-amber-600">{fmt(summary?.order_commission_pending)}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Settled</p>
            <p className="text-xl font-bold text-emerald-600">{fmt(summary?.order_commission_settled)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Gateway Fee Breakdown */}
      <Card>
        <CardHeader className="border-b pb-4"><CardTitle className="text-lg">Gateway Fee Breakdown</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="text-left p-3 font-semibold">Purpose</th>
                <th className="text-right p-3 font-semibold">Transactions</th>
                <th className="text-right p-3 font-semibold">Total Amount</th>
                <th className="text-right p-3 font-semibold">Gateway Fee</th>
              </tr>
            </thead>
            <tbody>
              {feeBreakdown.map((row, i) => (
                <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="p-3 capitalize">{row.purpose?.replace(/_/g, ' ')}</td>
                  <td className="p-3 text-right">{row.txn_count}</td>
                  <td className="p-3 text-right">{fmt(row.total_amount)}</td>
                  <td className="p-3 text-right text-amber-600">{fmt(row.total_gateway_fee)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Merchant Rechargers */}
      <Card>
        <CardHeader className="border-b pb-4"><CardTitle className="text-lg">Merchant Recharges</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="text-left p-3 font-semibold">Business Name</th>
                <th className="text-right p-3 font-semibold">Recharges</th>
                <th className="text-right p-3 font-semibold">Total Amount</th>
                <th className="text-right p-3 font-semibold">Last Recharge</th>
              </tr>
            </thead>
            <tbody>
              {merchantRechargers.length === 0 ? (
                <tr><td colSpan={4} className="p-6 text-center text-slate-400">No merchant recharges yet</td></tr>
              ) : merchantRechargers.map((r, i) => (
                <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="p-3">{r.display_name || 'Unknown'}</td>
                  <td className="p-3 text-right">{r.recharge_count}</td>
                  <td className="p-3 text-right font-semibold">{fmt(r.total_recharged)}</td>
                  <td className="p-3 text-right text-slate-500">{r.last_recharge_at ? new Date(r.last_recharge_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Consumer/Public Rechargers */}
      <Card>
        <CardHeader className="border-b pb-4"><CardTitle className="text-lg">Public / Consumer Recharges</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="text-left p-3 font-semibold">Name</th>
                <th className="text-left p-3 font-semibold">Phone</th>
                <th className="text-right p-3 font-semibold">Recharges</th>
                <th className="text-right p-3 font-semibold">Total Amount</th>
                <th className="text-right p-3 font-semibold">Last Recharge</th>
              </tr>
            </thead>
            <tbody>
              {consumerRechargers.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-slate-400">No consumer recharges yet</td></tr>
              ) : consumerRechargers.map((r, i) => (
                <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="p-3">{r.display_name || 'Unknown'}</td>
                  <td className="p-3 text-slate-500">{r.phone || '-'}</td>
                  <td className="p-3 text-right">{r.recharge_count}</td>
                  <td className="p-3 text-right font-semibold">{fmt(r.total_recharged)}</td>
                  <td className="p-3 text-right text-slate-500">{r.last_recharge_at ? new Date(r.last_recharge_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
