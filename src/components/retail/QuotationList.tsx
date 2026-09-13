import { useState, useEffect } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { getSupabaseClient } from '@/src/lib/supabase';
import { printBillForChannel, BillData } from '@/src/lib/billRenderer';
import { tenantScopedKey } from '@/src/lib/tenantStorage';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent } from '@/src/components/ui/card';
import { ArrowLeft, Plus, Eye, Pencil, Trash2, FileText, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { QuotationForm } from './QuotationForm';

export function QuotationList({ onBack }: { onBack?: () => void }) {
  const { currentTenantId, user, activeBranchId } = useAuth();
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editTarget, setEditTarget] = useState<any>(null);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const statusColors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700',
    converted: 'bg-purple-100 text-purple-700'
  };

  const fetchQuotations = async () => {
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) { setLoading(false); return; }
    const { data } = await supabase.from('quotations').select('*, quotation_items(*)').eq('tenant_id', currentTenantId).order('created_at', { ascending: false }).limit(100);
    setQuotations(data || []);
    setLoading(false);
  };

  useEffect(() => { if (mode === 'list') fetchQuotations(); }, [currentTenantId, mode]);

  if (mode === 'create') {
    return <QuotationForm onBack={() => setMode('list')} />;
  }
  if (mode === 'edit' && editTarget) {
    return <QuotationForm onBack={() => { setMode('list'); setEditTarget(null); }} editQuotation={editTarget} />;
  }

  const handleView = async (q: any) => {
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) return;
    try {
      const saved = localStorage.getItem(tenantScopedKey('posSettings', currentTenantId));
      const printerSize = (saved ? JSON.parse(saved) : null)?.['quotation']?.printerSize || 'A4';
      const { data: branchInfo } = q.branch_id ? await supabase.from('branches').select('branch_name, address').eq('id', q.branch_id).maybeSingle() : { data: null };
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
        customer: { name: q.customer_name || 'Walk-in', phone: '', address: '' },
        meta: { label: 'Quotation', number: q.quotation_number, date: new Date(q.quotation_date || q.created_at).toLocaleDateString() },
        items: (q.quotation_items || []).map((it: any) => ({
          name: it.item_name, qty: Number(it.quantity), rate: Number(it.unit_price),
          amount: Number(it.line_total)
        })),
        totals: { grand_total: Number(q.total_amount) },
        footer: { stamp_url: brandingInfo?.stamp_url },
        bill_number_code_type: brandingInfo?.bill_number_code_type || 'none'
      };
      await printBillForChannel(supabase, currentTenantId, 'quotation', billData, printerSize);
    } catch (err: any) {
      toast.error('Failed to print: ' + err.message);
    }
  };

  const handleDelete = async (q: any) => {
    if (!confirm('Delete this quotation? This cannot be undone.')) return;
    setBusyId(q.id);
    const supabase = getSupabaseClient();
    if (!supabase) { setBusyId(null); return; }
    try {
      const { error } = await supabase.rpc('delete_quotation', { p_quotation_id: q.id });
      if (error) throw error;
      toast.success('Quotation deleted');
      fetchQuotations();
    } catch (err: any) {
      toast.error('Failed to delete: ' + err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleConvertToInvoice = async (q: any) => {
    if (!q.customer_id) { toast.error('This quotation has no linked customer — cannot convert to invoice.'); return; }
    if (!confirm('Convert this quotation to a Sale Invoice?')) return;
    setBusyId(q.id);
    const supabase = getSupabaseClient();
    if (!supabase || !user) { setBusyId(null); return; }
    try {
      const { error } = await supabase.rpc('convert_quotation_to_sale_invoice', {
        p_quotation_id: q.id, p_created_by: user.id, p_payment_method: 'cash'
      });
      if (error) throw error;
      toast.success('Converted to Sale Invoice');
      fetchQuotations();
    } catch (err: any) {
      toast.error('Failed to convert: ' + err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleConvertToChallan = async (q: any) => {
    if (!confirm('Convert this quotation to a Delivery Challan (Outward)?')) return;
    setBusyId(q.id);
    const supabase = getSupabaseClient();
    if (!supabase || !user || !currentTenantId) { setBusyId(null); return; }
    try {
      const saved = localStorage.getItem(tenantScopedKey('posSettings', currentTenantId));
      const prefix = (saved ? JSON.parse(saved) : null)?.['delivery_challan_out']?.prefix || 'DCO-';
      const challanNumber = prefix + Date.now().toString().slice(-8);
      const { error } = await supabase.rpc('convert_quotation_to_delivery_challan_outward', {
        p_quotation_id: q.id, p_challan_number: challanNumber, p_created_by: user.id
      });
      if (error) throw error;
      toast.success('Converted to Delivery Challan');
      fetchQuotations();
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
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Quotations</h2>
          <p className="text-slate-500 dark:text-slate-400">Price quotes for customers before invoicing.</p>
        </div>
        <Button onClick={() => setMode('create')}><Plus className="h-4 w-4 mr-2" /> Add New</Button>
      </div>

      <Card>
        <CardContent className="p-6">
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-6">Loading...</p>
          ) : quotations.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No quotations yet.</p>
          ) : (
            <div className="space-y-3">
              {quotations.map((q: any) => (
                <div key={q.id} className="border border-slate-100 dark:border-slate-800 rounded-xl p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100">{q.quotation_number}</p>
                      <p className="text-xs text-slate-500">{q.customer_name || 'Walk-in'} · {q.quotation_date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-primary">₹{Number(q.total_amount).toLocaleString('en-IN')}</p>
                      <span className={"text-[10px] font-bold px-2 py-0.5 rounded-full uppercase " + (statusColors[q.status] || 'bg-slate-100 text-slate-700')}>{q.status}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Button variant="outline" size="sm" className="h-8" onClick={() => handleView(q)} title="View / Print"><Eye className="h-3.5 w-3.5" /></Button>
                    {q.status !== 'converted' && (
                      <Button variant="outline" size="sm" className="h-8" onClick={() => { setEditTarget(q); setMode('edit'); }} title="Edit"><Pencil className="h-3.5 w-3.5" /></Button>
                    )}
                    <Button variant="outline" size="sm" className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(q)} disabled={busyId === q.id} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                    {q.status !== 'converted' && (
                      <>
                        <Button size="sm" className="h-8" onClick={() => handleConvertToInvoice(q)} disabled={busyId === q.id}>
                          <FileText className="h-3.5 w-3.5 mr-1" /> Convert to Invoice
                        </Button>
                        <Button size="sm" variant="secondary" className="h-8" onClick={() => handleConvertToChallan(q)} disabled={busyId === q.id}>
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
