import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { ArrowLeft, Search, TrendingUp, TrendingDown, Package } from 'lucide-react';
import { getSupabaseClient } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { toast } from 'sonner';
import { ReportActionButtons } from './ReportActionButtons';

export function SalesByProductReport({ onBack }: { onBack?: () => void }) {
  const { currentTenantId } = useAuth();
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(1)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, [currentTenantId, startDate, endDate]);



  const fetchData = async () => {
    if (!currentTenantId) return;
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { data: reportData, error } = await supabase.rpc('get_sales_by_product', {
        p_tenant_id: currentTenantId,
        p_branch_id: null,
        p_start_date: startDate,
        p_end_date: endDate
      });

      if (error) throw error;
      setData(reportData || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch sales by product report');
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter(item => 
    item.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const topSellers = [...data].sort((a, b) => b.total_revenue - a.total_revenue).slice(0, 5);
  const slowMovers = [...data].sort((a, b) => a.total_revenue - b.total_revenue).slice(0, 5);

  const reportRows = filteredData.map((row: any) => ({
    'Product Name': row.product_name,
    'Qty Sold': row.total_quantity_sold,
    'Invoices': row.number_of_invoices,
    'Revenue': Number(row.total_revenue || 0)
  }));

  const reportColumns = [
    { key: 'Product Name', label: 'Product Name' },
    { key: 'Qty Sold', label: 'Qty Sold', align: 'right' as const },
    { key: 'Invoices', label: 'Invoices', align: 'right' as const },
    { key: 'Revenue', label: 'Revenue', align: 'right' as const }
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
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Sales by Product</h2>
          <p className="text-slate-500 dark:text-slate-400">Analyze product performance and revenue.</p>
        </div>
        <ReportActionButtons
          data={reportRows}
          columns={reportColumns}
          filename={`sales_by_product_${startDate}_to_${endDate}`}
          title="Sales by Product"
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
          <div className="flex-1 min-w-[200px] space-y-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Search Product</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Product name..." 
                className="pl-9"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={fetchData} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center text-emerald-800">
              <TrendingUp className="mr-2 h-4 w-4" /> Top 5 Best Sellers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topSellers.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <span className="font-medium text-emerald-900 truncate pr-4">{item.product_name}</span>
                  <span className="font-bold text-emerald-700 whitespace-nowrap">₹{item.total_revenue?.toLocaleString()}</span>
                </div>
              ))}
              {topSellers.length === 0 && <p className="text-sm text-emerald-600/70">No data available.</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-red-50 to-red-100/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center text-red-800">
              <TrendingDown className="mr-2 h-4 w-4" /> Top 5 Slow Movers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {slowMovers.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <span className="font-medium text-red-900 truncate pr-4">{item.product_name}</span>
                  <span className="font-bold text-red-700 whitespace-nowrap">₹{item.total_revenue?.toLocaleString()}</span>
                </div>
              ))}
              {slowMovers.length === 0 && <p className="text-sm text-red-600/70">No data available.</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-900 border-b">
              <tr>
                <th className="px-6 py-4 font-semibold">Product Name</th>
                <th className="px-6 py-4 font-semibold text-right">Qty Sold</th>
                <th className="px-6 py-4 font-semibold text-right">Invoices</th>
                <th className="px-6 py-4 font-semibold text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">Loading report...</td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">No sales data found for this period.</td>
                </tr>
              ) : (
                filteredData.map((row, idx) => (
                  <tr key={idx} className="border-b hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                      <div className="flex items-center">
                        <Package className="h-4 w-4 mr-2 text-slate-400" />
                        {row.product_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400">{row.total_quantity_sold}</td>
                    <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400">{row.number_of_invoices}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-slate-100">₹{row.total_revenue?.toLocaleString()}</td>
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
