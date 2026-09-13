import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { ArrowLeft, Search, Boxes } from 'lucide-react';
import { getSupabaseClient } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { toast } from 'sonner';
import { ReportActionButtons } from './ReportActionButtons';

export function BatchReportView({ onBack }: { onBack?: () => void }) {
  const { currentTenantId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expiryFilter, setExpiryFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, [currentTenantId]);

  const fetchData = async () => {
    if (!currentTenantId) return;
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('product_batches')
        .select('*, products(product_name)')
        .eq('tenant_id', currentTenantId)
        .gt('quantity_remaining', 0)
        .order('expiry_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      setBatches(data || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch batch report');
    } finally {
      setLoading(false);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return 'none';
    const exp = new Date(expiryDate);
    const daysLeft = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return 'expired';
    if (daysLeft <= 30) return 'expiring_soon';
    return 'ok';
  };

  const filteredBatches = batches.filter((b: any) => {
    const matchesSearch = b.products?.product_name?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (expiryFilter === 'all') return true;
    return getExpiryStatus(b.expiry_date) === expiryFilter;
  });

  const expiredCount = batches.filter((b: any) => getExpiryStatus(b.expiry_date) === 'expired').length;
  const expiringSoonCount = batches.filter((b: any) => getExpiryStatus(b.expiry_date) === 'expiring_soon').length;
  const totalValue = batches.reduce((s, b) => s + (b.quantity_remaining * (b.purchase_price || 0)), 0);

  const statusStyles: Record<string, string> = {
    expired: 'bg-red-100 text-red-700',
    expiring_soon: 'bg-amber-100 text-amber-700',
    ok: 'bg-emerald-100 text-emerald-700',
    none: 'bg-slate-100 text-slate-500'
  };
    const statusLabels: Record<string, string> = {    expired: 'Expired',    expiring_soon: 'Expiring Soon',    ok: 'OK',    none: 'No Expiry'  };

  const reportRows = filteredBatches.map((b: any) => ({
    'Product': b.products?.product_name || 'Unknown',
    'Batch #': b.batch_number || '-',
    'Expiry Date': b.expiry_date || '-',
    'Status': statusLabels[getExpiryStatus(b.expiry_date)],
    'Qty Remaining': b.quantity_remaining,
    'Value': Number(b.quantity_remaining * (b.purchase_price || 0))
  }));

  const reportColumns = [
    { key: 'Product', label: 'Product' },
    { key: 'Batch #', label: 'Batch #' },
    { key: 'Expiry Date', label: 'Expiry Date' },
    { key: 'Status', label: 'Status' },
    { key: 'Qty Remaining', label: 'Qty Remaining', align: 'right' as const },
    { key: 'Value', label: 'Value', align: 'right' as const }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="flex-1">          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Batch Report</h2>          <p className="text-slate-500 dark:text-slate-400">All active stock batches with expiry tracking.</p>        </div>        <ReportActionButtons          data={reportRows}          columns={reportColumns}          filename={`batch_report_${new Date().toISOString().split('T')[0]}`}          title="Batch Report"          subtitle="All active stock batches with expiry tracking."        />      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-4 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px] space-y-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Search Product</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input placeholder="Product name..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Status</label>
            <select value={expiryFilter} onChange={e => setExpiryFilter(e.target.value)} className="h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm">
              <option value="all">All</option>
              <option value="expired">Expired</option>
              <option value="expiring_soon">Expiring Soon (30d)</option>
              <option value="ok">OK</option>
              <option value="none">No Expiry</option>
            </select>
          </div>
          <Button onClick={fetchData} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm bg-gradient-to-br from-red-50 to-red-100/50">
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-red-700 uppercase">Expired Batches</p>
            <p className="text-2xl font-bold text-red-800 mt-1">{expiredCount}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-gradient-to-br from-amber-50 to-amber-100/50">
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-amber-700 uppercase">Expiring in 30 Days</p>
            <p className="text-2xl font-bold text-amber-800 mt-1">{expiringSoonCount}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase">Total Stock Value</p>
            <p className="text-2xl font-bold text-primary mt-1">₹{totalValue.toLocaleString('en-IN')}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-900 border-b">
              <tr>
                <th className="px-6 py-4 font-semibold">Product</th>
                <th className="px-6 py-4 font-semibold">Batch #</th>
                <th className="px-6 py-4 font-semibold">Expiry Date</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Qty Remaining</th>
                <th className="px-6 py-4 font-semibold text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading report...</td></tr>
              ) : filteredBatches.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No batches found.</td></tr>
              ) : (
                filteredBatches.map((b: any) => {
                  const status = getExpiryStatus(b.expiry_date);
                  return (
                    <tr key={b.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-900/50">
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                        <div className="flex items-center"><Boxes className="h-4 w-4 mr-2 text-slate-400" />{b.products?.product_name || 'Unknown'}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{b.batch_number || '-'}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{b.expiry_date || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={"text-xs font-bold px-2 py-0.5 rounded-full uppercase " + statusStyles[status]}>{statusLabels[status]}</span>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400">{b.quantity_remaining}</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-slate-100">₹{(b.quantity_remaining * (b.purchase_price || 0)).toLocaleString('en-IN')}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
