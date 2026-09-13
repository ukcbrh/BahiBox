import { useState, useEffect } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { getSupabaseClient } from '@/src/lib/supabase';
import { printBillForChannel, BillData } from '@/src/lib/billRenderer';
import { tenantScopedKey } from '@/src/lib/tenantStorage';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent } from '@/src/components/ui/card';
import { ArrowLeft, Plus, Eye, Pencil, Trash2, FileText, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { PurchaseOrderForm } from './PurchaseOrderForm';

export function PurchaseOrderList({ onBack }: { onBack?: () => void }) {
  const { currentTenantId, user } = useAuth();
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editTarget, setEditTarget] = useState<any>(null);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const statusColors: Record<string, string> = {
    ordered: 'bg-blue-100 text-blue-700',
    converted: 'bg-purple-100 text-purple-700',
    cancelled: 'bg-red-100 text-red-700'
  };

  const fetchPurchaseOrders = async () => {
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) { setLoading(false); return; }
    const { data } = await supabase.from('purchase_order_documents').select('*, purchase_order_document_items(*)').eq('tenant_id', currentTenantId).order('created_at', { ascending: false }).limit(100);
    setPurchaseOrders(data || []);
    setLoading(false);
  };

  useEffect(() => { if (mode === 'list') fetchPurchaseOrders(); }, [currentTenantId, mode]);

  if (mode === 'create') {
    return <PurchaseOrderForm onBack={() => setMode('list')} />;
  }
  if (mode === 'edit' && editTarget) {
    return <PurchaseOrderForm onBack={() => { setMode('list'); setEditTarget(null); }} editData={editTarget} />;
  }

  const handleView = async (po: any) => {
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) return;
    try {
      const saved = localStorage.getItem(tenantScopedKey('posSettings', currentTenantId));
      const printerSize = (saved ? JSON.parse(saved) : null)?.['purchase_order']?.printerSize || 'A4';
      const { data: branchInfo } = po.branch_id ? await supabase.from('branches').select('branch_name, address').eq('id', po.branch_id).maybeSingle() : { data: null };
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
        customer: { name: po.supplier_name || 'Supplier', phone: '', address: '' },
        customer_info_label: 'Supplier',
        meta: { label: 'Purchase Order', number: po.po_number, date: new Date(po.order_date || po.created_at).toLocaleDateString() },
        items: (po.purchase_order_document_items || []).map((it: any) => ({
          name: it.item_name, qty: Number(it.quantity), rate: Number(it.unit_price),
          amount: Number(it.line_total)
        })),
        totals: { grand_total: Number(po.total_amount) },
        footer: { stamp_url: brandingInfo?.stamp_url },
        bill_number_code_type: brandingInfo?.bill_number_code_type || 'none'
      };
      await printBillForChannel(supabase, currentTenantId, 'purchase_order', billData, printerSize);
    } catch (err: any) {
      toast.error('Failed to print: ' + err.message);
    }
  };

  const handleDelete = async (po: any) => {
    if (!confirm('Delete this purchase order? This cannot be undone.')) return;
    setBusyId(po.id);
    const supabase = getSupabaseClient();
    if (!supabase) { setBusyId(null); return; }
    try {
      const { error } = await supabase.rpc('delete_purchase_order_document', { p_purchase_order_document_id: po.id });
      if (error) throw error;
      toast.success('Purchase Order deleted');
      fetchPurchaseOrders();
    } catch (err: any) {
      toast.error('Failed to delete: ' + err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleConvertToInvoice = async (po: any) => {
    if (!confirm('Convert this purchase order to a Purchase Invoice? Stock will be updated.')) return;
    setBusyId(po.id);
    const supabase = getSupabaseClient();
    if (!supabase || !user) { setBusyId(null); return; }
    try {
      const { error } = await supabase.rpc('convert_po_document_to_purchase_invoice', {
        p_purchase_order_document_id: po.id, p_created_by: user.id
      });
      if (error) throw error;
      toast.success('Converted to Purchase Invoice');
      fetchPurchaseOrders();
    } catch (err: any) {
      toast.error('Failed to convert: ' + err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleConvertToChallan = async (po: any) => {
    if (!confirm('Convert this purchase order to a Delivery Challan (Inward)?')) return;
    setBusyId(po.id);
    const supabase = getSupabaseClient();
    if (!supabase || !user || !currentTenantId) { setBusyId(null); return; }
    try {
      const saved = localStorage.getItem(tenantScopedKey('posSettings', currentTenantId));
      const prefix = (saved ? JSON.parse(saved) : null)?.['delivery_challan_in']?.prefix || 'DCI-';
      const challanNumber = prefix + Date.now().toString().slice(-8);
      const { error } = await supabase.rpc('convert_po_document_to_delivery_challan_inward', {
        p_purchase_order_document_id: po.id, p_challan_number: challanNumber, p_created_by: user.id
      });
      if (error) throw error;
      toast.success('Converted to Delivery Challan');
      fetchPurchaseOrders();
    } catch (err: any) {
      toast.error('Failed to convert: ' + err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      {onBack && (
        <Button variant="ghost" onClick={onBack} className="gap-2 -ml-2"><ArrowLeft className="h-4 w-4" /> Back to Documents</Button>
      )}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Purchase Orders</h2>
          <p className="text-slate-500 dark:text-slate-400">Orders placed with suppliers, before receiving or invoicing.</p>
        </div>
        <Button onClick={() => setMode('create')}><Plus className="h-4 w-4 mr-2" /> Add New</Button>
      </div>

      <Card>
        <CardContent className="p-6">
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-6">Loading...</p>
          ) : purchaseOrders.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No purchase orders yet.</p>
          ) : (
            <div className="space-y-3">
              {purchaseOrders.map((po: any) => (
                <div key={po.id} className="border border-slate-100 dark:border-slate-800 rounded-xl p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100">{po.po_number}</p>
                      <p className="text-xs text-slate-500">{po.supplier_name} · {po.order_date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-primary">₹{Number(po.total_amount).toLocaleString('en-IN')}</p>
                      <span className={"text-[10px] font-bold px-2 py-0.5 rounded-full uppercase " + (statusColors[po.status] || 'bg-slate-100 text-slate-700')}>{po.status}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Button variant="outline" size="sm" className="h-8" onClick={() => handleView(po)} title="View / Print"><Eye className="h-3.5 w-3.5" /></Button>
                    {po.status !== 'converted' && (
                      <Button variant="outline" size="sm" className="h-8" onClick={() => { setEditTarget(po); setMode('edit'); }} title="Edit"><Pencil className="h-3.5 w-3.5" /></Button>
                    )}
                    <Button variant="outline" size="sm" className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(po)} disabled={busyId === po.id} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                    {po.status !== 'converted' && (
                      <>
                        <Button size="sm" className="h-8" onClick={() => handleConvertToInvoice(po)} disabled={busyId === po.id}>
                          <FileText className="h-3.5 w-3.5 mr-1" /> Convert to Invoice
                        </Button>
                        <Button size="sm" variant="secondary" className="h-8" onClick={() => handleConvertToChallan(po)} disabled={busyId === po.id}>
                          <Truck className="h-3.5 w-3.5 mr-1" /> Convert to Delivery Challan
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
