import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { ArrowLeft, Search, User } from 'lucide-react';
import { getSupabaseClient } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { toast } from 'sonner';
import { ReportActionButtons } from './ReportActionButtons';

export function SaleOutstandingView({ onBack }: { onBack?: () => void }) {
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
      const { data: customers, error: custErr } = await supabase
        .from('retail_customers')
        .select('id, customer_name, phone, opening_balance')
        .eq('tenant_id', currentTenantId);
      if (custErr) throw custErr;

      const { data: invoices } = await supabase
        .from('sales_invoices')
        .select('customer_id, total_amount')
        .eq('tenant_id', currentTenantId)
        .eq('module_code', 'retail')
        .not('customer_id', 'is', null);

      const { data: payments } = await supabase
        .from('customer_payments')
        .select('customer_id, amount')
        .eq('tenant_id', currentTenantId);

      const invoiceTotals: Record<string, number> = {};
      (invoices || []).forEach((inv: any) => {
        invoiceTotals[inv.customer_id] = (invoiceTotals[inv.customer_id] || 0) + (inv.total_amount || 0);
      });

      const paymentTotals: Record<string, number> = {};
      (payments || []).forEach((p: any) => {
        paymentTotals[p.customer_id] = (paymentTotals[p.customer_id] || 0) + (p.amount || 0);
      });

      const computed = (customers || []).map((c: any) => {
        const totalInvoiced = invoiceTotals[c.id] || 0;
        const totalPaid = paymentTotals[c.id] || 0;
        const outstanding = (c.opening_balance || 0) + totalInvoiced - totalPaid;
        return { ...c, totalInvoiced, totalPaid, outstanding };
      }).filter((c: any) => c.outstanding > 0.5)
        .sort((a: any, b: any) => b.outstanding - a.outstanding);

      setRows(computed);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch outstanding report');
    } finally {
      setLoading(false);
    }
  };

  const filteredRows = rows.filter((r: any) => r.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalOutstanding = rows.reduce((s: number, r: any) => s + r.outstanding, 0);

  const reportRows = filteredRows.map((r: any) => ({
    'Customer': r.customer_name,
    'Phone': r.phone || '-',
    'Total Invoiced': Number(r.totalInvoiced || 0),
    'Total Paid': Number(r.totalPaid || 0),
    'Outstanding': Number(r.outstanding || 0)
  }));

  const reportColumns = [
    { key: 'Customer', label: 'Customer' },
    { key: 'Phone', label: 'Phone' },
    { key: 'Total Invoiced', label: 'Total Invoiced', align: 'right' as const },
    { key: 'Total Paid', label: 'Total Paid', align: 'right' as const },
    { key: 'Outstanding', label: 'Outstanding', align: 'right' as const }
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
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Sale Outstanding</h2>
          <p className="text-slate-500 dark:text-slate-400">Customers with pending balances.</p>
        </div>
        <ReportActionButtons
          data={reportRows}
          columns={reportColumns}
          filename="sale_outstanding_report"
          title="Sale Outstanding"
        />
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-4 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px] space-y-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Search Customer</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input placeholder="Customer name..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <Button onClick={fetchData} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm bg-gradient-to-br from-red-50 to-red-100/50">
        <CardContent className="p-5">
          <p className="text-xs font-semibold text-red-600 uppercase">Total Outstanding</p>
          <p className="text-3xl font-bold text-red-700 mt-1">₹{totalOutstanding.toLocaleString('en-IN')}</p>
          <p className="text-xs text-red-500 mt-1">{rows.length} customer{rows.length !== 1 ? 's' : ''} with pending dues</p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-900 border-b">
              <tr>
                <th className="px-6 py-4 font-semibold">Customer</th>
                <th className="px-6 py-4 font-semibold">Phone</th>
                <th className="px-6 py-4 font-semibold text-right">Total Invoiced</th>
                <th className="px-6 py-4 font-semibold text-right">Total Paid</th>
                <th className="px-6 py-4 font-semibold text-right">Outstanding</th>
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
                      <div className="flex items-center"><User className="h-4 w-4 mr-2 text-slate-400" />{r.customer_name}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{r.phone || '-'}</td>
                    <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400">₹{r.totalInvoiced.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400">₹{r.totalPaid.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-right font-bold text-red-600">₹{r.outstanding.toLocaleString('en-IN')}</td>
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
