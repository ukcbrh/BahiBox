import { useState, useEffect } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { getSupabaseClient } from '@/src/lib/supabase';
import { printBillForChannel, BillData } from '@/src/lib/billRenderer';
import { tenantScopedKey } from '@/src/lib/tenantStorage';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Card, CardContent } from '@/src/components/ui/card';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface NoteItem {
  product_id: string | null;
  item_name: string;
  hsn_code: string;
  quantity: string;
  rate: string;
  gst_rate_percent: number;
  included: boolean;
}

export function CreateCreditNote({ onBack }: { onBack: () => void }) {
  const { currentTenantId, user, activeBranchId } = useAuth();
  const [sourceType, setSourceType] = useState<'sales_invoice' | 'delivery_challan_outward'>('sales_invoice');
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [sourceDocs, setSourceDocs] = useState<any[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState('');
  const [items, setItems] = useState<NoteItem[]>([]);
  const [reason, setReason] = useState('');
  const [noteNumber, setNoteNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    const fetchCustomers = async () => {
      const supabase = getSupabaseClient();
      if (!supabase || !currentTenantId) return;
      const { data } = await supabase.rpc('get_customers_with_balance', { p_tenant_id: currentTenantId });
      setCustomers(data || []);
    };
    fetchCustomers();

    const saved = localStorage.getItem(tenantScopedKey('posSettings', currentTenantId));
    const prefix = (saved ? JSON.parse(saved) : null)?.['credit_note']?.prefix || 'CN-';
    setNoteNumber(prefix + Date.now().toString().slice(-8));
  }, [currentTenantId]);

  const handleSelectCustomer = async (cust: any) => {
    setSelectedCustomer(cust);
    setCustomerSearch('');
    setShowCustomerDropdown(false);
    setSelectedSourceId('');
    setItems([]);
    await fetchSourceDocs(cust.id, sourceType);
  };

  const fetchSourceDocs = async (customerId: string, type: 'sales_invoice' | 'delivery_challan_outward') => {
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) return;
    if (type === 'sales_invoice') {
      const { data } = await supabase.from('sales_invoices').select('id, invoice_number, invoice_date, total_amount').eq('tenant_id', currentTenantId).eq('customer_id', customerId).neq('status', 'cancelled').order('created_at', { ascending: false });
      setSourceDocs(data || []);
    } else {
      const { data } = await supabase.from('delivery_challans_outward').select('id, challan_number, created_at').eq('tenant_id', currentTenantId).eq('customer_id', customerId).order('created_at', { ascending: false });
      setSourceDocs(data || []);
    }
  };

  const handleSourceTypeChange = async (type: 'sales_invoice' | 'delivery_challan_outward') => {
    setSourceType(type);
    setSelectedSourceId('');
    setItems([]);
    if (selectedCustomer) await fetchSourceDocs(selectedCustomer.id, type);
  };

  const handleSelectSource = async (sourceId: string) => {
    setSelectedSourceId(sourceId);
    setLoadingItems(true);
    const supabase = getSupabaseClient();
    if (!supabase) { setLoadingItems(false); return; }

    if (sourceType === 'sales_invoice') {
      const { data } = await supabase.from('sales_invoice_items').select('*, products(product_name, hsn_code)').eq('sales_invoice_id', sourceId);
      setItems((data || []).map((it: any) => ({
        product_id: it.product_id || null,
        item_name: it.products?.product_name || it.item_name || 'Item',
        hsn_code: it.products?.hsn_code || it.hsn_sac_id || '',
        quantity: String(it.quantity),
        rate: String(it.unit_price),
        gst_rate_percent: Number(it.gst_rate_percent) || 0,
        included: false
      })));
    } else {
      const { data } = await supabase.from('delivery_challan_outward_items').select('*').eq('challan_id', sourceId);
      setItems((data || []).map((it: any) => ({
        product_id: it.product_id || null,
        item_name: it.item_name || 'Item',
        hsn_code: it.hsn_code || '',
        quantity: String(it.quantity),
        rate: String(it.unit_price),
        gst_rate_percent: (Number(it.cgst) || 0) + (Number(it.sgst) || 0) + (Number(it.igst) || 0),
        included: false
      })));
    }
    setLoadingItems(false);
  };

  const toggleItem = (idx: number) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, included: !it.included } : it));
  };

  const updateItemField = (idx: number, field: 'quantity' | 'rate', value: string) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  };

  const includedItems = items.filter(it => it.included);
  const grandTotal = includedItems.reduce((sum, it) => {
    const base = (parseFloat(it.quantity) || 0) * (parseFloat(it.rate) || 0);
    return sum + base + (base * it.gst_rate_percent / 100);
  }, 0);

  const handleSubmit = async () => {
    if (!selectedCustomer || !selectedSourceId || includedItems.length === 0 || !currentTenantId || !user || !activeBranchId) {
      toast.error('Please select a customer, source document, and at least one item to return');
      return;
    }
    const invalidItem = includedItems.find(it => !(parseFloat(it.quantity) > 0));
    if (invalidItem) {
      toast.error(`Please enter a valid quantity (greater than 0) for "${invalidItem.item_name}"`);
      return;
    }
    setSaving(true);
    const supabase = getSupabaseClient();
    if (!supabase) { setSaving(false); return; }

    try {
      const rpcItems = includedItems.map(it => ({
        product_id: it.product_id,
        item_name: it.item_name,
        hsn_code: it.hsn_code || null,
        quantity: parseFloat(it.quantity) || 0,
        rate: parseFloat(it.rate) || 0,
        gst_rate_percent: it.gst_rate_percent
      }));

      const { data: noteId, error } = await supabase.rpc('create_credit_note', {
        p_tenant_id: currentTenantId,
        p_branch_id: activeBranchId,
        p_customer_id: selectedCustomer.id,
        p_note_number: noteNumber,
        p_source_type: sourceType,
        p_source_id: selectedSourceId,
        p_reason: reason || null,
        p_items: rpcItems,
        p_created_by: user.id
      });

      if (error) throw error;

      try {
        const saved = localStorage.getItem(tenantScopedKey('posSettings', currentTenantId));
        const printerSize = (saved ? JSON.parse(saved) : null)?.['credit_note']?.printerSize || 'A4';
        const { data: branchInfo } = await supabase.from('branches').select('branch_name, address').eq('id', activeBranchId).maybeSingle();
        const { data: tenantData } = await supabase.from('tenants').select('business_name').eq('id', currentTenantId).maybeSingle();
        const { data: brandingInfo } = await supabase.from('print_branding_settings').select('*').eq('tenant_id', currentTenantId).maybeSingle();

        const billData: BillData = {
          business: {
            name: tenantData?.business_name || 'Your Business',
            branch_name: branchInfo?.branch_name,
            address: branchInfo?.address,
            show_branch_name: brandingInfo?.show_branch_name !== false,
            show_branch_address: brandingInfo?.show_branch_address !== false,
            stamp_url: brandingInfo?.stamp_url
          },
          customer: { name: selectedCustomer.customer_name, phone: selectedCustomer.phone, address: selectedCustomer.address },
          meta: { label: 'Credit Note', number: noteNumber, date: new Date().toLocaleDateString() },
          items: includedItems.map(it => {
            const base = (parseFloat(it.quantity) || 0) * (parseFloat(it.rate) || 0);
            return {
              name: it.item_name, hsn: it.hsn_code, qty: parseFloat(it.quantity) || 0, rate: parseFloat(it.rate) || 0,
              tax: it.gst_rate_percent > 0 ? `${it.gst_rate_percent}%` : undefined,
              amount: base + (base * it.gst_rate_percent / 100)
            };
          }),
          totals: { grand_total: grandTotal },
          footer: { stamp_url: brandingInfo?.stamp_url },
          bill_number_code_type: brandingInfo?.bill_number_code_type || 'none'
        };

        await printBillForChannel(supabase, currentTenantId, 'credit_note', billData, printerSize);
      } catch (printErr: any) {
        console.error('Failed to print credit note:', printErr.message);
      }

      toast.success('Credit Note created successfully');
      onBack();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create credit note');
    } finally {
      setSaving(false);
    }
  };

  const filteredCustomers = customers.filter((c: any) => c.customer_name?.toLowerCase().includes(customerSearch.toLowerCase()));

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <Button variant="outline" size="sm" onClick={onBack} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Create Credit Note</h2>
        <p className="text-slate-500 dark:text-slate-400">Record a sales return or correction, reducing what the customer owes.</p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium">CN Number</label>
            <Input value={noteNumber} onChange={(e) => setNoteNumber(e.target.value)} />
          </div>

          <div>
            <label className="text-sm font-medium">Against</label>
            <div className="flex gap-2 mt-1">
              <button onClick={() => handleSourceTypeChange('sales_invoice')} className={"flex-1 py-2 rounded-xl text-sm font-semibold border-2 " + (sourceType === 'sales_invoice' ? 'border-primary text-primary' : 'border-slate-200 dark:border-slate-800 text-slate-500')}>Sale Invoice</button>
              <button onClick={() => handleSourceTypeChange('delivery_challan_outward')} className={"flex-1 py-2 rounded-xl text-sm font-semibold border-2 " + (sourceType === 'delivery_challan_outward' ? 'border-primary text-primary' : 'border-slate-200 dark:border-slate-800 text-slate-500')}>Delivery Challan</button>
            </div>
          </div>

          {!selectedCustomer ? (
            <div>
              <label className="text-sm font-medium">Customer</label>
              <Input placeholder="Click or type to search customer..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} onFocus={() => setShowCustomerDropdown(true)} onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)} />
              {showCustomerDropdown && (
                <div className="mt-2 border border-slate-200 dark:border-slate-800 rounded-lg max-h-64 overflow-y-auto">
                  {filteredCustomers.map((c: any) => (
                    <button key={c.id} onClick={() => handleSelectCustomer(c)} className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-900 text-sm border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <div className="font-medium">{c.customer_name}</div>
                      <div className="text-xs text-slate-400">{c.phone || ''}{c.address ? ' · ' + c.address : ''}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 rounded-xl p-4">
              <p className="font-bold">{selectedCustomer.customer_name}</p>
              <button onClick={() => { setSelectedCustomer(null); setSourceDocs([]); setItems([]); }} className="text-xs text-primary font-semibold">Change</button>
            </div>
          )}

          {selectedCustomer && (
            <div>
              <label className="text-sm font-medium">{sourceType === 'sales_invoice' ? 'Sale Invoice' : 'Delivery Challan'}</label>
              <select value={selectedSourceId} onChange={(e) => handleSelectSource(e.target.value)} className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm">
                <option value="">Select document</option>
                {sourceDocs.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.invoice_number || d.challan_number} {d.total_amount ? '— ₹' + d.total_amount : ''}</option>
                ))}
              </select>
            </div>
          )}

          {loadingItems ? (
            <p className="text-sm text-slate-400 py-3">Loading items...</p>
          ) : items.length > 0 && (
            <div>
              <label className="text-sm font-medium">Items to Return (check items and adjust quantity)</label>
              <div className="mt-2 border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((it, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3">
                    <input type="checkbox" checked={it.included} onChange={() => toggleItem(idx)} className="h-4 w-4" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{it.item_name}</p>
                      <p className="text-xs text-slate-500">HSN: {it.hsn_code || '-'} · GST: {it.gst_rate_percent}%</p>
                    </div>
                    <Input type="number" className="w-20 h-8" placeholder="Qty" value={it.quantity} disabled={!it.included} onChange={(e) => updateItemField(idx, 'quantity', e.target.value)} />
                    <Input type="number" className="w-24 h-8" placeholder="Rate" value={it.rate} disabled={!it.included} onChange={(e) => updateItemField(idx, 'rate', e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Reason</label>
            <Input placeholder="e.g. Goods returned, Billing correction" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>

          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 rounded-xl p-4">
            <span className="font-bold">Total Credit Amount</span>
            <span className="text-xl font-extrabold text-red-600">₹{grandTotal.toFixed(2)}</span>
          </div>

          <Button className="w-full h-12" onClick={handleSubmit} disabled={saving || includedItems.length === 0}>
            {saving ? 'Creating...' : 'Create Credit Note'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
