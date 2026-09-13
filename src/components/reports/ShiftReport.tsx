import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { ArrowLeft, Search, Clock, BadgeAlert, CheckCircle2, ChevronDown, ChevronUp, Receipt } from 'lucide-react';
import { getSupabaseClient } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { toast } from 'sonner';
import { ReportActionButtons } from './ReportActionButtons';

export function ShiftReport({ onBack }: { onBack?: () => void }) {
  const { currentTenantId } = useAuth();
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [shiftSales, setShiftSales] = useState<any[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);

  useEffect(() => {
    fetchData();
  }, [currentTenantId, startDate, endDate]);

  const fetchData = async () => {
    if (!currentTenantId) return;
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { data: reportData, error } = await supabase.rpc('get_shift_report', {
        p_tenant_id: currentTenantId,
        p_branch_id: null,
        p_start_date: startDate,
        p_end_date: endDate
      });
      if (error) throw error;
      setData(reportData || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch shift report');
    } finally {
      setLoading(false);
    }
  };

  const reportRows = data.map((row: any) => ({
    'Register': row.register_name || 'Main Register',
    'Status': row.status,
    'Opened': row.opened_at,
    'Closed': row.closed_at || '-',
    'Opening Cash': Number(row.opening_cash || 0),
    'Expected': Number(row.expected_cash || 0),
    'Closing Cash': row.status === 'closed' ? Number(row.closing_cash || 0) : '-',
    'Variance': row.status === 'closed' ? Number(row.cash_variance || 0) : '-'
  }));

  const reportColumns = [
    { key: 'Register', label: 'Register' },
    { key: 'Status', label: 'Status' },
    { key: 'Opened', label: 'Opened' },
    { key: 'Closed', label: 'Closed' },
    { key: 'Opening Cash', label: 'Opening Cash', align: 'right' as const },
    { key: 'Expected', label: 'Expected', align: 'right' as const },
    { key: 'Closing Cash', label: 'Closing Cash', align: 'right' as const },
    { key: 'Variance', label: 'Variance', align: 'right' as const }
  ];

  const fetchShiftSales = async (shiftId: string, openedAt: string, closedAt: string | null) => {
    if (!currentTenantId) return;
    setLoadingSales(true);
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      let query = supabase
        .from('sales_invoices')
        .select('*')
        .eq('tenant_id', currentTenantId)
        .eq('module_code', 'retail')
        .gte('created_at', openedAt);

      if (closedAt) {
        query = query.lte('created_at', closedAt);
      }

      const { data: salesData, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      setShiftSales(salesData || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch shift sales');
    } finally {
      setLoadingSales(false);
    }
  };

  const toggleRow = (row: any) => {
    if (expandedRow === row.shift_id) {
      setExpandedRow(null);
    } else {
      setExpandedRow(row.shift_id);
      fetchShiftSales(row.shift_id, row.opened_at, row.closed_at);
    }
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-IN', { 
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="flex-1">          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Shift Report</h2>          <p className="text-slate-500 dark:text-slate-400">Track cashier shifts and cash variance.</p>        </div>        <ReportActionButtons          data={reportRows}          columns={reportColumns}          filename={`shift_report_${startDate}_to_${endDate}`}          title="Shift Report"          subtitle={`${startDate} to ${endDate}`}        />      </div>

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

      <Card className="border-none shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-900 border-b">
              <tr>
                <th className="px-6 py-4 font-semibold">Register</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Opened</th>
                <th className="px-6 py-4 font-semibold">Closed</th>
                <th className="px-6 py-4 font-semibold text-right">Opening Cash</th>
                <th className="px-6 py-4 font-semibold text-right">Expected</th>
                <th className="px-6 py-4 font-semibold text-right">Closing Cash</th>
                <th className="px-6 py-4 font-semibold text-right">Variance</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">Loading shifts...</td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">No shifts found for this period.</td>
                </tr>
              ) : (
                data.map((row, idx) => {
                  const variance = Number(row.cash_variance || 0);
                  const isClosed = row.status === 'closed';
                  
                  let varianceColor = 'text-slate-600 dark:text-slate-400';
                  let varianceBg = '';
                  
                  if (isClosed) {
                    if (variance === 0) {
                      varianceColor = 'text-emerald-700';
                      varianceBg = 'bg-emerald-50';
                    } else if (Math.abs(variance) <= 50) {
                      varianceColor = 'text-amber-700';
                      varianceBg = 'bg-amber-50';
                    } else {
                      varianceColor = 'text-red-700';
                      varianceBg = 'bg-red-50';
                    }
                  }

                  return (
                    <React.Fragment key={idx}>
                      <tr 
                        className={`border-b hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer ${expandedRow === row.shift_id ? 'bg-slate-50 dark:bg-slate-900' : ''}`}
                        onClick={() => toggleRow(row)}
                      >
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          {expandedRow === row.shift_id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                          {row.register_name || 'Main Register'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                            row.status === 'open' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{formatDateTime(row.opened_at)}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{formatDateTime(row.closed_at)}</td>
                        <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400">₹{(row.opening_cash || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400">₹{(row.expected_cash || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-slate-100">
                          {isClosed ? `₹${(row.closing_cash || 0).toLocaleString()}` : '-'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {isClosed ? (
                            <div className={`inline-flex items-center px-2.5 py-1 rounded-md font-bold ${varianceColor} ${varianceBg}`}>
                              {variance === 0 ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <BadgeAlert className="h-3 w-3 mr-1" />}
                              ₹{variance.toLocaleString()}
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                      {expandedRow === row.shift_id && (
                        <tr className="bg-slate-50 dark:bg-slate-900 border-b">
                          <td colSpan={8} className="p-0">
                            <div className="p-6">
                              <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center">
                                <Receipt className="h-4 w-4 mr-2 text-slate-500 dark:text-slate-400" />
                                Sales during this shift
                              </h4>
                              {loadingSales ? (
                                <div className="text-sm text-slate-500 dark:text-slate-400">Loading sales...</div>
                              ) : shiftSales.length === 0 ? (
                                <div className="text-sm text-slate-500 dark:text-slate-400">No sales recorded during this shift.</div>
                              ) : (
                                <div className="bg-white dark:bg-slate-950 rounded-lg border overflow-hidden">
                                  <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-900 border-b text-xs text-slate-500 dark:text-slate-400 uppercase">
                                      <tr>
                                        <th className="px-4 py-3">Invoice #</th>
                                        <th className="px-4 py-3">Time</th>
                                        <th className="px-4 py-3">Customer</th>
                                        <th className="px-4 py-3">Payment</th>
                                        <th className="px-4 py-3 text-right">Amount</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                      {shiftSales.map((sale) => (
                                        <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{sale.invoice_number}</td>
                                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{formatDateTime(sale.created_at)}</td>
                                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{sale.customer_name || 'Walk-in'}</td>
                                          <td className="px-4 py-3">
                                            <span className="px-2 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 capitalize">
                                              {sale.payment_method}
                                            </span>
                                          </td>
                                          <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-slate-100">₹{sale.total_amount?.toLocaleString()}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
