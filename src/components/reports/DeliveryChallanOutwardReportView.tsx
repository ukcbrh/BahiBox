import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { ArrowLeft, Truck } from 'lucide-react';
import { getSupabaseClient } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { toast } from 'sonner';
import { ReportActionButtons } from './ReportActionButtons';

export function DeliveryChallanOutwardReportView({ onBack }: { onBack?: () => void }) {
  const { currentTenantId } = useAuth();
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(1)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [challans, setChallans] = useState<any[]>([]);

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
        .from('delivery_challans_outward')
        .select('*, retail_customers(customer_name), delivery_challan_outward_items(quantity, unit_price, discount_value, cgst, sgst, igst)')
        .eq('tenant_id', currentTenantId)
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const withTotals = (data || []).map((ch: any) => {
        const total = (ch.delivery_challan_outward_items || []).reduce((s: number, it: any) => {
          const base = (it.quantity * (it.unit_price || 0)) - (it.discount_value || 0);
          return s + base + (base * ((it.cgst || 0) + (it.sgst || 0) + (it.igst || 0)) / 100);
        }, 0);
        return { ...ch, computedTotal: total };
      });
      setChallans(withTotals);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch delivery challan report');
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = challans.reduce((s, c) => s + c.computedTotal, 0);

  const reportRows = challans.map((c: any) => ({
    'Challan #': c.challan_number,
    'Date': c.created_at?.slice(0, 10),
    'Customer': c.retail_customers?.customer_name || c.to_party_name || 'Walk-in',
    'Status': c.status,
    'Payment Status': c.payment_status || '-',
    'Amount': Number(c.computedTotal || 0)
  }));

  const reportColumns = [
    { key: 'Challan #', label: 'Challan #' },
    { key: 'Date', label: 'Date' },
    { key: 'Customer', label: 'Customer' },
    { key: 'Status', label: 'Status' },
    { key: 'Payment Status', label: 'Payment Status' },
    { key: 'Amount', label: 'Amount', align: 'right' as const }
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
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Delivery Challan (Outward) Report</h2>
          <p className="text-slate-500 dark:text-slate-400">Goods dispatched via delivery challan for the selected period.</p>
        </div>
        <ReportActionButtons
          data={reportRows}
          columns={reportColumns}
          filename={`delivery_challan_outward_report_${startDate}_to_${endDate}`}
          title="Delivery Challan (Outward) Report"
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase">Total Challans</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{challans.length}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase">Total Value</p>
            <p className="text-2xl font-bold text-primary mt-1">₹{totalAmount.toLocaleString('en-IN')}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-900 border-b">
              <tr>
                <th className="px-6 py-4 font-semibold">Challan #</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Customer</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Payment Status</th>
                <th className="px-6 py-4 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading report...</td></tr>
              ) : challans.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No delivery challans found for this period.</td></tr>
              ) : (
                challans.map((c: any) => (
                  <tr key={c.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                      <div className="flex items-center"><Truck className="h-4 w-4 mr-2 text-slate-400" />{c.challan_number}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{c.created_at?.slice(0, 10)}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{c.retail_customers?.customer_name || c.to_party_name || 'Walk-in'}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full uppercase bg-slate-100 text-slate-700">{c.status}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 capitalize">{c.payment_status || '-'}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-slate-100">₹{c.computedTotal.toLocaleString('en-IN')}</td>
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
