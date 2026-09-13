import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { ArrowLeft, Plus, Trash2, RefreshCw, X } from 'lucide-react';
import { getSupabaseClient } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { toast } from 'sonner';
import { ReportActionButtons } from './ReportActionButtons';

export function RecurringInvoicesView({ onBack }: { onBack?: () => void }) {
  const { currentTenantId, user } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [productSearch, setProductSearch] = useState('');
  const [items, setItems] = useState<{ product_id: string; item_name: string; price: number; quantity: string }[]>([]);

  useEffect(() => {
    fetchData();
  }, [currentTenantId]);

  const fetchData = async () => {
    if (!currentTenantId) return;
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      const { data: tData, error } = await supabase
        .from('recurring_invoice_templates')
        .select('*')
        .eq('tenant_id', currentTenantId)
        .order('next_generation_date', { ascending: true });
      if (error) throw error;
      setTemplates(tData || []);

      const { data: custData } = await supabase.from('retail_customers').select('id, customer_name').eq('tenant_id', currentTenantId);
      setCustomers(custData || []);

      const { data: prodData } = await supabase.from('products').select('id, product_name, selling_price').eq('tenant_id', currentTenantId).eq('is_active', true);
      setProducts(prodData || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch recurring invoices');
    } finally {
      setLoading(false);
    }
  };

  const addProductToItems = (p: any) => {
    setItems(prev => {
      const existing = prev.find(i => i.product_id === p.id);
      if (existing) return prev.map(i => i.product_id === p.id ? { ...i, quantity: (parseFloat(i.quantity) + 1).toString() } : i);
      return [...prev, { product_id: p.id, item_name: p.product_name, price: p.selling_price, quantity: '1' }];
    });
    setProductSearch('');
  };

  const updateItemQty = (productId: string, qty: string) => {
    setItems(prev => prev.map(i => i.product_id === productId ? { ...i, quantity: qty } : i));
  };

  const removeItem = (productId: string) => {
    setItems(prev => prev.filter(i => i.product_id !== productId));
  };

  const handleCreateTemplate = async () => {
    if (!templateName || !customerId || items.length === 0) {
      toast.error('Please fill template name, customer and add at least one item');
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase || !user) return;

    const { data: branches } = await supabase.from('branches').select('id').eq('tenant_id', currentTenantId).eq('module_key', 'retail').limit(1);
    const branchId = branches?.[0]?.id || null;

    const { error } = await supabase.from('recurring_invoice_templates').insert({
      tenant_id: currentTenantId,
      branch_id: branchId,
      customer_id: customerId,
      template_name: templateName,
      items: items.map(i => ({ product_id: i.product_id, quantity: parseFloat(i.quantity) || 1, discount_type: 'fixed', discount_value: 0 })),
      frequency,
      next_generation_date: startDate,
      created_by: user.id
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Recurring template created');
    setShowAddModal(false);
    setTemplateName(''); setCustomerId(''); setItems([]);
    fetchData();
  };

  const handleToggleActive = async (template: any) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from('recurring_invoice_templates').update({ is_active: !template.is_active }).eq('id', template.id);
    if (error) { toast.error(error.message); return; }
    fetchData();
  };

  const handleGenerateDue = async () => {
    setGenerating(true);
    const supabase = getSupabaseClient();
    if (!supabase || !user) { setGenerating(false); return; }
    const { data, error } = await supabase.rpc('generate_due_recurring_invoices', {
      p_tenant_id: currentTenantId,
      p_created_by: user.id
    });
    setGenerating(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Generated ${data.generated_count} invoice(s)`);
    fetchData();
  };

  const filteredProducts = products.filter((p: any) => p.product_name?.toLowerCase().includes(productSearch.toLowerCase()));
  const customerName = (id: string) => customers.find((c: any) => c.id === id)?.customer_name || 'Unknown';

  const reportRows = templates.map((t: any) => ({
    'Template': t.template_name,
    'Customer': customerName(t.customer_id),
    'Frequency': t.frequency,
    'Next Generation': t.next_generation_date,
    'Status': t.is_active ? 'Active' : 'Paused'
  }));

  const reportColumns = [
    { key: 'Template', label: 'Template' },
    { key: 'Customer', label: 'Customer' },
    { key: 'Frequency', label: 'Frequency' },
    { key: 'Next Generation', label: 'Next Generation' },
    { key: 'Status', label: 'Status' }
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
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Recurring Invoices</h2>
          <p className="text-slate-500 dark:text-slate-400">Auto-generate invoices for repeat customers on a schedule.</p>
        </div>
        <ReportActionButtons
          data={reportRows}
          columns={reportColumns}
          filename="recurring_invoices_templates"
          title="Recurring Invoices Templates"
        />
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-4 flex flex-wrap gap-3 items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">Invoices generate when you press "Generate Due Invoices" — this is not fully automatic in the background.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleGenerateDue} disabled={generating}>
              <RefreshCw className={"mr-2 h-4 w-4 " + (generating ? 'animate-spin' : '')} /> {generating ? 'Generating...' : 'Generate Due Invoices'}
            </Button>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="mr-2 h-4 w-4" /> New Template
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-900 border-b">
              <tr>
                <th className="px-6 py-4 font-semibold">Template</th>
                <th className="px-6 py-4 font-semibold">Customer</th>
                <th className="px-6 py-4 font-semibold">Frequency</th>
                <th className="px-6 py-4 font-semibold">Next Generation</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading...</td></tr>
              ) : templates.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No recurring templates yet.</td></tr>
              ) : (
                templates.map((t: any) => (
                  <tr key={t.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{t.template_name}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{customerName(t.customer_id)}</td>
                    <td className="px-6 py-4 capitalize text-slate-600 dark:text-slate-400">{t.frequency}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{t.next_generation_date}</td>
                    <td className="px-6 py-4">
                      <span className={"text-xs font-bold px-2 py-0.5 rounded-full uppercase " + (t.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500')}>{t.is_active ? 'Active' : 'Paused'}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="outline" size="sm" onClick={() => handleToggleActive(t)}>{t.is_active ? 'Pause' : 'Resume'}</Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-900 dark:text-slate-100">New Recurring Template</h3>
                <button onClick={() => setShowAddModal(false)}><X size={18} /></button>
              </div>
              <Input placeholder="Template name (e.g. Monthly AMC - ABC Corp)" value={templateName} onChange={e => setTemplateName(e.target.value)} />
              <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm">
                <option value="">Select customer</option>
                {customers.map((c: any) => <option key={c.id} value={c.id}>{c.customer_name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <select value={frequency} onChange={e => setFrequency(e.target.value)} className="h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm">
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>

              <div>
                <Input placeholder="Search products to add..." value={productSearch} onChange={e => setProductSearch(e.target.value)} />
                {productSearch && (
                  <div className="mt-2 border border-slate-200 dark:border-slate-800 rounded-lg max-h-40 overflow-y-auto">
                    {filteredProducts.slice(0, 10).map((p: any) => (
                      <button key={p.id} onClick={() => addProductToItems(p)} className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-900 text-sm border-b border-slate-100 dark:border-slate-800 last:border-0 flex justify-between">
                        <span>{p.product_name}</span><span className="text-primary font-bold">₹{p.selling_price}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {items.length > 0 && (
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.product_id} className="flex gap-2 items-center border border-slate-100 dark:border-slate-800 rounded-lg p-2">
                      <span className="flex-1 text-sm font-medium">{item.item_name}</span>
                      <Input type="number" className="w-16 h-9" value={item.quantity} onChange={e => updateItemQty(item.product_id, e.target.value)} />
                      <button onClick={() => removeItem(item.product_id)} className="text-red-500"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              )}

              <Button className="w-full h-11" onClick={handleCreateTemplate} disabled={!templateName || !customerId || items.length === 0}>
                Create Template
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
