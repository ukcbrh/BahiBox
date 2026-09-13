import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { ArrowLeft, FileText } from 'lucide-react';
import { getSupabaseClient } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { toast } from 'sonner';
import { ReportActionButtons } from './ReportActionButtons';

export function SaleReportView({ onBack }: { onBack?: () => void }) {
  const { currentTenantId } = useAuth();
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(1)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customerMap, setCustomerMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, [currentTenantId, startDate, endDate]);



  const fetchData = async () => {
    if (!currentTenantId) return;
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('sales_invoices')
        .select('*')
        .eq('tenant_id', currentTenantId)
        .eq('module_code', 'retail')
        .gte('invoice_date', startDate)
        .lte('invoice_date', endDate)
        .order('invoice_date', { ascending: false });
      if (error) throw error;
      setInvoices(data || []);

      const customerIds = [...new Set((data || []).map((i: any) => i.customer_id).filter(Boolean))];
      if (customerIds.length > 0) {
        const { data: custData } = await supabase.from('retail_customers').select('id, customer_name').in('id', customerIds);
        const map: Record<string, string> = {};
        (custData || []).forEach((c: any) => { map[c.id] = c.customer_name; });
        setCustomerMap(map);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch sale report');
    } finally {
      setLoading(false);
    }
  };

  const totalTaxable = invoices.reduce((s, i) => s + (i.taxable_value || 0), 0);
  const totalGst = invoices.reduce((s, i) => s + (i.cgst_amount || 0) + (i.sgst_amount || 0) + (i.igst_amount || 0), 0);
  const totalAmount = invoices.reduce((s, i) => s + (i.total_amount || 0), 0);

  const reportRows = invoices.map((inv: any) => ({
    'Invoice #': inv.invoice_number,
    'Date': inv.invoice_date,
    'Customer': customerMap[inv.customer_id] || 'Walk-in',
    'Status': inv.status,
    'Taxable': Number(inv.taxable_value || 0),
    'GST': Number((inv.cgst_amount || 0) + (inv.sgst_amount || 0) + (inv.igst_amount || 0)),
    'Total': Number(inv.total_amount || 0)
  }));

  const reportColumns = [
    { key: 'Invoice #', label: 'Invoice #' },
    { key: 'Date', label: 'Date' },
    { key: 'Customer', label: 'Customer' },
    { key: 'Status', label: 'Status' },
    { key: 'Taxable', label: 'Taxable', align: 'right' as const },
    { key: 'GST', label: 'GST', align: 'right' as const },
    { key: 'Total', label: 'Total', align: 'right' as const }
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
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Sale Report</h2>
          <p className="text-slate-500 dark:text-slate-400">All sales invoices for the selected period.</p>
        </div>
        <ReportActionButtons
          data={reportRows}
          columns={reportColumns}
          filename={`sale_report_${startDate}_to_${endDate}`}
          title="Sale Report"
          subtitle={`${startDate} to ${endDate}`}
        />
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-4 flex flex-wrap gap-4 items-end">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Start Date</label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">End Date</label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <Button onClick={fetchData} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase">Total Invoices</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{invoices.length}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase">Total GST</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">₹{totalGst.toLocaleString('en-IN')}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase">Total Sales</p>
            <p className="text-2xl font-bold text-primary mt-1">₹{totalAmount.toLocaleString('en-IN')}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-900 border-b">
              <tr>
                <th className="px-6 py-4 font-semibold">Invoice #</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Customer</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Taxable</th>
                <th className="px-6 py-4 font-semibold text-right">GST</th>
                <th className="px-6 py-4 font-semibold text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500">Loading report...</td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500">No sales found for this period.</td></tr>
              ) : (
                invoices.map((inv: any) => (
                  <tr key={inv.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                      <div className="flex items-center"><FileText className="h-4 w-4 mr-2 text-slate-400" />{inv.invoice_number}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{inv.invoice_date}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{customerMap[inv.customer_id] || 'Walk-in'}</td>
                    <td className="px-6 py-4">
                      <span className={"text-xs font-bold px-2 py-0.5 rounded-full uppercase " + (inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>{inv.status}</span>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400">₹{inv.taxable_value?.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400">₹{((inv.cgst_amount || 0) + (inv.sgst_amount || 0) + (inv.igst_amount || 0)).toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-slate-100">₹{inv.total_amount?.toLocaleString('en-IN')}</td>
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
