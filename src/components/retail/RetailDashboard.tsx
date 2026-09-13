import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { IndianRupee, TrendingUp, ShoppingCart, Package, Monitor, Store, ShoppingBag } from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { tenantScopedKey } from '@/src/lib/tenantStorage';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function RetailDashboard({ setActiveTab }: { setActiveTab?: (tab: string) => void }) {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const currentTenantId = tenant?.merchant_id;
  
  const [totalSales, setTotalSales] = useState(0);
  const [totalPurchases, setTotalPurchases] = useState(0);
  const [itemsSold, setItemsSold] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fallback data if no real data is found to keep the chart looking nice initially
  const [salesData, setSalesData] = useState([
    { name: 'Mon', sales: 0, purchases: 0 },
    { name: 'Tue', sales: 0, purchases: 0 },
    { name: 'Wed', sales: 0, purchases: 0 },
    { name: 'Thu', sales: 0, purchases: 0 },
    { name: 'Fri', sales: 0, purchases: 0 },
    { name: 'Sat', sales: 0, purchases: 0 },
    { name: 'Sun', sales: 0, purchases: 0 },
  ]);

  const [categoryData, setCategoryData] = useState([
    { name: 'Electronics', value: 400 },
    { name: 'Clothing', value: 300 },
    { name: 'Grocery', value: 300 },
  ]);

  const [yearlyData, setYearlyData] = useState([
    { month: 'Jan', profit: 0 },
    { month: 'Feb', profit: 0 },
    { month: 'Mar', profit: 0 },
    { month: 'Apr', profit: 0 },
    { month: 'May', profit: 0 },
    { month: 'Jun', profit: 0 },
  ]);

  
  useEffect(() => {
    if (!currentTenantId) return;

    async function fetchData() {
      setIsLoading(true);
      const supabase = getSupabaseClient();
      if (!supabase) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch real sales data
        const { data: dbSales } = await supabase
          .from('sales_invoices')
          .select('total_amount, invoice_date')
          .eq('tenant_id', currentTenantId)
          .eq('status', 'paid');
          
        let localInvoices: any[] = [];
        try {
          const localData = localStorage.getItem(tenantScopedKey('local_sales_invoices', currentTenantId));
          if (localData) {
            localInvoices = JSON.parse(localData);
          }
        } catch(e) {}
        
        const sales = [...(dbSales || []), ...localInvoices.map(inv => ({ 
          total_amount: inv.total_amount, 
          invoice_date: inv.created_at || inv.invoice_date 
        }))];
          
        let tSales = 0;
        
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const newSalesData = [
          { name: 'Mon', sales: 0, purchases: 0 },
          { name: 'Tue', sales: 0, purchases: 0 },
          { name: 'Wed', sales: 0, purchases: 0 },
          { name: 'Thu', sales: 0, purchases: 0 },
          { name: 'Fri', sales: 0, purchases: 0 },
          { name: 'Sat', sales: 0, purchases: 0 },
          { name: 'Sun', sales: 0, purchases: 0 },
        ];

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const newYearlyData = Array.from({ length: 6 }).map((_, i) => {
           const d = new Date();
           d.setMonth(d.getMonth() - (5 - i));
           return { month: months[d.getMonth()], profit: 0, _monthKey: d.getMonth() };
        });

        if (sales) {
          tSales = sales.reduce((acc, s) => acc + (Number(s.total_amount) || 0), 0);
          setTotalSales(tSales);
          
          sales.forEach(s => {
             if(s.invoice_date) {
               const d = new Date(s.invoice_date);
               const dayName = days[d.getDay()];
               const item = newSalesData.find(x => x.name === dayName);
               if(item) {
                 item.sales += Number(s.total_amount) || 0;
               }
               
               const mItem = newYearlyData.find(x => x._monthKey === d.getMonth());
               if (mItem) {
                 mItem.profit += Number(s.total_amount) || 0;
               }
             }
          });
        }

        // Fetch purchases
        const { data: purchases } = await supabase
          .from('purchase_orders')
          .select('total_amount, created_at')
          .eq('tenant_id', currentTenantId);

        let tPurchases = 0;
        if (purchases) {
          tPurchases = purchases.reduce((acc: any, p: any) => acc + (Number(p.total_amount) || 0), 0);
          setTotalPurchases(tPurchases);

          purchases.forEach((p: any) => {
             if(p.created_at) {
               const d = new Date(p.created_at);
               const dayName = days[d.getDay()];
               const item = newSalesData.find(x => x.name === dayName);
               if(item) {
                 item.purchases += Number(p.total_amount) || 0;
               }
               
               const mItem = newYearlyData.find(x => x._monthKey === d.getMonth());
               if (mItem) {
                 mItem.profit -= Number(p.total_amount) || 0;
               }
             }
          });
        }
        
        setSalesData(newSalesData);
        setYearlyData(newYearlyData);

        // Fetch items sold and category breakdown
        const { data: dbInvoiceItems } = await supabase
          .from('sales_invoice_items')
          .select('quantity, item_name, sales_invoices!inner(tenant_id)')
          .eq('sales_invoices.tenant_id', currentTenantId)
          .limit(1000); 
          
        let localInvoiceItems: any[] = [];
        localInvoices.forEach(inv => {
          if (inv.sales_invoice_items) {
            localInvoiceItems = [...localInvoiceItems, ...inv.sales_invoice_items];
          }
        });
        
        const invoiceItems = [...(dbInvoiceItems || []), ...localInvoiceItems];
          
        if (invoiceItems && invoiceItems.length > 0) {
           const tItems = invoiceItems.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
           setItemsSold(tItems > 0 ? tItems : 0);
           
           // Category mock by parsing item_name just for nice charts if no category exists
           const catMap: Record<string, number> = {};
           invoiceItems.forEach(item => {
             const name = item.item_name || 'Misc';
             const category = name.split(' ')[0] || 'Misc'; // Simple mock category extraction
             if (!catMap[category]) catMap[category] = 0;
             catMap[category] += Number(item.quantity) || 0;
           });
           
           const newCatData = Object.keys(catMap).map(k => ({ name: k, value: catMap[k] })).sort((a,b) => b.value - a.value).slice(0, 5);
           if (newCatData.length > 0) {
             setCategoryData(newCatData);
           }
        }
        
      } catch (e) {
         console.error("Error fetching dashboard data", e);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [currentTenantId]);


  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400">Overview of your retail performance</p>
        </div>
        <div className="flex flex-wrap gap-2">
            <button onClick={() => setActiveTab && setActiveTab('fullpos')} className="flex items-center gap-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors text-sm shadow-sm">
                <Monitor size={16} /> Retail POS
            </button>
            <button onClick={() => setActiveTab && setActiveTab('pos')} className="flex items-center gap-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors text-sm shadow-sm">
                <ShoppingCart size={16} /> Billing
            </button>
            <button onClick={() => setActiveTab && setActiveTab('purchases')} className="flex items-center gap-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors text-sm shadow-sm">
                <ShoppingBag size={16} /> Purchases
            </button>
            <button onClick={() => setActiveTab && setActiveTab('inventory')} className="flex items-center gap-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors text-sm shadow-sm">
                <Package size={16} /> Inventory
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total Sales</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">₹{totalSales.toLocaleString()}</h3>
            </div>
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
              <IndianRupee size={24} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total Purchases</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">₹{totalPurchases.toLocaleString()}</h3>
            </div>
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
              <ShoppingCart size={24} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total Profit</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">₹{(totalSales - totalPurchases).toLocaleString()}</h3>
            </div>
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
              <TrendingUp size={24} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Items Sold</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{itemsSold.toLocaleString()}</h3>
            </div>
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
              <Package size={24} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Sales vs Purchases Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <CartesianGrid strokeDasharray="3 3" />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="sales" stroke="#8884d8" fillOpacity={1} fill="url(#colorSales)" />
                  <Area type="monotone" dataKey="purchases" stroke="#82ca9d" fillOpacity={1} fill="url(#colorPurchases)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Profit Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="profit" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
