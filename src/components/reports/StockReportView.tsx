import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { ArrowLeft, Search, Package } from 'lucide-react';
import { getSupabaseClient } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { toast } from 'sonner';
import { ReportActionButtons } from './ReportActionButtons';

export function StockReportView({ onBack }: { onBack?: () => void }) {
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
      const { data, error } = await supabase
        .from('products')
        .select('id, product_name, purchase_price, selling_price, mrp, product_stock(current_quantity)')
        .eq('tenant_id', currentTenantId)
        .eq('is_active', true)
        .order('product_name');
      if (error) throw error;
      setRows(data || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch stock report');
    } finally {
      setLoading(false);
    }
  };

  const getQty = (r: any) => r.product_stock?.[0]?.current_quantity ?? 0;
  const filteredRows = rows.filter((r: any) => r.product_name?.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalQty = rows.reduce((s, r) => s + getQty(r), 0);
  const totalCostValue = rows.reduce((s, r) => s + (getQty(r) * (r.purchase_price || 0)), 0);
  const totalSellValue = rows.reduce((s, r) => s + (getQty(r) * (r.selling_price || 0)), 0);

  const reportRows = filteredRows.map((r: any) => ({
    'Product': r.product_name,
    'Qty in Stock': getQty(r),
    'Purchase Price': Number(r.purchase_price || 0),
    'Selling Price': Number(r.selling_price || 0),
    'Stock Value (Cost)': Number(getQty(r) * (r.purchase_price || 0))
  }));

  const reportColumns = [
    { key: 'Product', label: 'Product' },
    { key: 'Qty in Stock', label: 'Qty in Stock', align: 'right' as const },
    { key: 'Purchase Price', label: 'Purchase Price', align: 'right' as const },
    { key: 'Selling Price', label: 'Selling Price', align: 'right' as const },
    { key: 'Stock Value (Cost)', label: 'Stock Value (Cost)', align: 'right' as const }
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
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Stock Report</h2>
          <p className="text-slate-500 dark:text-slate-400">Current inventory valuation across all products.</p>
        </div>
        <ReportActionButtons
          data={reportRows}
          columns={reportColumns}
          filename="stock_report"
          title="Stock Report"
        />
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-4 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px] space-y-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Search Product</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input placeholder="Product name..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <Button onClick={fetchData} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase">Total Stock Quantity</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{totalQty}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase">Stock Value (Cost)</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">₹{totalCostValue.toLocaleString('en-IN')}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase">Stock Value (Selling)</p>
            <p className="text-2xl font-bold text-primary mt-1">₹{totalSellValue.toLocaleString('en-IN')}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-900 border-b">
              <tr>
                <th className="px-6 py-4 font-semibold">Product</th>
                <th className="px-6 py-4 font-semibold text-right">Qty in Stock</th>
                <th className="px-6 py-4 font-semibold text-right">Purchase Price</th>
                <th className="px-6 py-4 font-semibold text-right">Selling Price</th>
                <th className="px-6 py-4 font-semibold text-right">Stock Value (Cost)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading report...</td></tr>
              ) : filteredRows.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No products found.</td></tr>
              ) : (
                filteredRows.map((r: any) => {
                  const qty = getQty(r);
                  return (
                    <tr key={r.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-900/50">
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                        <div className="flex items-center"><Package className="h-4 w-4 mr-2 text-slate-400" />{r.product_name}</div>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400">{qty}</td>
                      <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400">₹{(r.purchase_price || 0).toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400">₹{(r.selling_price || 0).toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-slate-100">₹{(qty * (r.purchase_price || 0)).toLocaleString('en-IN')}</td>
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
