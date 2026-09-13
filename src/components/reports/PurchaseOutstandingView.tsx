import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { ArrowLeft, Search, Truck } from 'lucide-react';
import { getSupabaseClient } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { toast } from 'sonner';
import { ReportActionButtons } from './ReportActionButtons';

export function PurchaseOutstandingView({ onBack }: { onBack?: () => void }) {
  const { currentTenantId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, [currentTenantId]);

  const fetchData = async () => {
    if (!currentTenantId) return;
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      const { data: suppliers, error: supErr } = await supabase
        .from('suppliers')
        .select('id, supplier_name, gstin, opening_balance')
        .eq('tenant_id', currentTenantId);
      if (supErr) throw supErr;

      const { data: orders } = await supabase
        .from('purchase_orders')
        .select('supplier_id, total_amount')
        .eq('tenant_id', currentTenantId)
        .not('supplier_id', 'is', null);

      const { data: payments } = await supabase
        .from('supplier_payments')
        .select('supplier_id, amount')
        .eq('tenant_id', currentTenantId);

      const orderTotals: Record<string, number> = {};
      (orders || []).forEach((o: any) => {
        orderTotals[o.supplier_id] = (orderTotals[o.supplier_id] || 0) + (o.total_amount || 0);
      });

      const paymentTotals: Record<string, number> = {};
      (payments || []).forEach((p: any) => {
        paymentTotals[p.supplier_id] = (paymentTotals[p.supplier_id] || 0) + (p.amount || 0);
      });

      const computed = (suppliers || []).map((s: any) => {
        const totalPurchased = orderTotals[s.id] || 0;
        const totalPaid = paymentTotals[s.id] || 0;
        const outstanding = (s.opening_balance || 0) + totalPurchased - totalPaid;
        return { ...s, totalPurchased, totalPaid, outstanding };
      }).filter((s: any) => s.outstanding > 0.5)
        .sort((a: any, b: any) => b.outstanding - a.outstanding);

      setRows(computed);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch purchase outstanding report');
    } finally {
      setLoading(false);
    }
  };

  const filteredRows = rows.filter((r: any) => r.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalOutstanding = rows.reduce((s: number, r: any) => s + r.outstanding, 0);

  const reportRows = filteredRows.map((r: any) => ({
    'Supplier': r.supplier_name,
    'GSTIN': r.gstin || '-',
    'Total Purchased': Number(r.totalPurchased || 0),
    'Total Paid': Number(r.totalPaid || 0),
    'Payable': Number(r.outstanding || 0)
  }));

  const reportColumns = [
    { key: 'Supplier', label: 'Supplier' },
    { key: 'GSTIN', label: 'GSTIN' },
    { key: 'Total Purchased', label: 'Total Purchased', align: 'right' as const },
    { key: 'Total Paid', label: 'Total Paid', align: 'right' as const },
    { key: 'Payable', label: 'Payable', align: 'right' as const }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Purchase Outstanding</h2>
          <p className="text-slate-500 dark:text-slate-400">Suppliers with pending balances owed by you.</p>
        </div>
        <ReportActionButtons
          data={reportRows}
          columns={reportColumns}
          filename="purchase_outstanding_report"
          title="Purchase Outstanding"
        />
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-4 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px] space-y-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Search Supplier</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input placeholder="Supplier name..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <Button onClick={fetchData} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm bg-gradient-to-br from-orange-50 to-orange-100/50">
        <CardContent className="p-5">
          <p className="text-xs font-semibold text-orange-700 uppercase">Total Payable</p>
          <p className="text-3xl font-bold text-orange-800 mt-1">₹{totalOutstanding.toLocaleString('en-IN')}</p>
          <p className="text-xs text-orange-600 mt-1">{rows.length} supplier{rows.length !== 1 ? 's' : ''} with pending dues</p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-900 border-b">
              <tr>
                <th className="px-6 py-4 font-semibold">Supplier</th>
                <th className="px-6 py-4 font-semibold">GSTIN</th>
                <th className="px-6 py-4 font-semibold text-right">Total Purchased</th>
                <th className="px-6 py-4 font-semibold text-right">Total Paid</th>
                <th className="px-6 py-4 font-semibold text-right">Payable</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading report...</td></tr>
              ) : filteredRows.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No outstanding dues found.</td></tr>
              ) : (
                filteredRows.map((r: any) => (
                  <tr key={r.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                      <div className="flex items-center"><Truck className="h-4 w-4 mr-2 text-slate-400" />{r.supplier_name}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{r.gstin || '-'}</td>
                    <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400">₹{r.totalPurchased.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400">₹{r.totalPaid.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-right font-bold text-orange-600">₹{r.outstanding.toLocaleString('en-IN')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
