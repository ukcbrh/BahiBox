import { useState, useEffect } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { getSupabaseClient } from '@/src/lib/supabase';
import { printBillForChannel, BillData } from '@/src/lib/billRenderer';
import { tenantScopedKey } from '@/src/lib/tenantStorage';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent } from '@/src/components/ui/card';
import { Plus, Eye, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { CreateInwardPayment } from './CreateInwardPayment';

interface ReceiptGroup {
  receiptKey: string;
  receiptNumber: string | null;
  date: string;
  partyName: string;
  method: string;
  totalAmount: number;
  rows: any[];
}

export function InwardPaymentList() {
  const { currentTenantId } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [editingGroup, setEditingGroup] = useState<ReceiptGroup | null>(null);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) { setLoadingHistory(false); return; }
    const { data } = await supabase
      .from('customer_payments')
      .select('*, retail_customers(customer_name, phone, address), sales_invoices(invoice_number), delivery_challans_outward(challan_number)')
      .eq('tenant_id', currentTenantId)
      .order('created_at', { ascending: false })
      .limit(200);
    setPaymentHistory(data || []);
    setLoadingHistory(false);
  };

  useEffect(() => { if (!isCreating && !editingGroup) fetchHistory(); }, [currentTenantId, isCreating, editingGroup]);

  if (isCreating) {
    return <CreateInwardPayment onBack={() => setIsCreating(false)} />;
  }

  if (editingGroup) {
    return <CreateInwardPayment onBack={() => setEditingGroup(null)} editGroup={editingGroup} />;
  }

  // Group individual payment rows into one "receipt" per receipt_number 
  // (older payments made before this feature existed won't have a 
  // receipt_number, so each of those falls back to its own single-row group).
  const groupsMap = new Map<string, ReceiptGroup>();
  paymentHistory.forEach((p: any) => {
    const key = p.receipt_number || ('legacy_' + p.id);
    if (!groupsMap.has(key)) {
      groupsMap.set(key, {
        receiptKey: key,
        receiptNumber: p.receipt_number,
        date: p.payment_date || p.created_at?.slice(0, 10),
        partyName: p.retail_customers?.customer_name || 'Unknown',
        method: p.payment_method,
        totalAmount: 0,
        rows: []
      });
    }
    const g = groupsMap.get(key)!;
    g.totalAmount += Number(p.amount);
    g.rows.push(p);
  });
  const groups = Array.from(groupsMap.values());

  const handleViewPrint = async (group: ReceiptGroup) => {
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) return;
    try {
      const savedSettingsStr = localStorage.getItem(tenantScopedKey('posSettings', currentTenantId));
      const savedSettings = savedSettingsStr ? JSON.parse(savedSettingsStr) : null;
      const printerSize = savedSettings?.['inward_payment']?.printerSize || '80mm';

      const firstRow = group.rows[0];
      const { data: branchInfo } = firstRow?.branch_id
        ? await supabase.from('branches').select('branch_name, address').eq('id', firstRow.branch_id).maybeSingle()
        : { data: null };
      const { data: tenantData } = await supabase.from('tenants').select('business_name').eq('id', currentTenantId).maybeSingle();
      const { data: brandingInfo } = await supabase.from('print_branding_settings').select('*').eq('tenant_id', currentTenantId).maybeSingle();

      const receiptItems = group.rows.map((p: any) => ({
        name: p.sales_invoices?.invoice_number
          ? 'Applied to Invoice ' + p.sales_invoices.invoice_number
          : p.delivery_challans_outward?.challan_number
          ? 'Applied to Delivery Challan ' + p.delivery_challans_outward.challan_number
          : 'On Account / Advance',
        qty: 1,
        rate: Number(p.amount),
        amount: Number(p.amount)
      }));

      const billData: BillData = {
        business: {
          name: tenantData?.business_name || 'Your Business',
          branch_name: branchInfo?.branch_name,
          address: branchInfo?.address,
          show_branch_name: brandingInfo?.show_branch_name !== false,
          show_branch_address: brandingInfo?.show_branch_address !== false,
          stamp_url: brandingInfo?.stamp_url
        },
        customer: { name: group.partyName, phone: firstRow?.retail_customers?.phone, address: firstRow?.retail_customers?.address },
        customer_info_label: 'Received From',
        meta: { label: 'Payment Receipt', number: group.receiptNumber || 'N/A', date: new Date(group.date).toLocaleDateString() },
        items: receiptItems,
        totals: { grand_total: group.totalAmount },
        footer: { stamp_url: brandingInfo?.stamp_url },
        bill_number_code_type: brandingInfo?.bill_number_code_type || 'none'
      };

      await printBillForChannel(supabase, currentTenantId, 'inward_payment', billData, printerSize);
    } catch (err: any) {
      toast.error('Failed to reprint: ' + err.message);
    }
  };

  const handleDelete = async (group: ReceiptGroup) => {
    if (!confirm('Delete this payment receipt? This will reverse the accounting entry and cannot be undone.')) return;
    setDeletingKey(group.receiptKey);
    const supabase = getSupabaseClient();
    if (!supabase) { setDeletingKey(null); return; }
    try {
      for (const row of group.rows) {
        const { error } = await supabase.rpc('delete_customer_payment', { p_payment_id: row.id });
        if (error) throw error;
      }
      toast.success('Payment receipt deleted');
      fetchHistory();
    } catch (err: any) {
      toast.error('Failed to delete: ' + err.message);
    } finally {
      setDeletingKey(null);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Inward Payment</h2>
          <p className="text-slate-500 dark:text-slate-400">Payments received from customers.</p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add New
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4">Recent Payments</h3>
          {loadingHistory ? (
            <p className="text-sm text-slate-400 text-center py-6">Loading...</p>
          ) : groups.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No payments recorded yet.</p>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2 font-semibold">Receipt No.</th>
                  <th className="px-3 py-2 font-semibold">Date</th>
                  <th className="px-3 py-2 font-semibold">Party</th>
                  <th className="px-3 py-2 font-semibold">Method</th>
                  <th className="px-3 py-2 font-semibold text-right">Amount</th>
                  <th className="px-3 py-2 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {groups.map((g) => (
                  <tr key={g.receiptKey}>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{g.receiptNumber || '—'}</td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{g.date}</td>
                    <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">{g.partyName}</td>
                    <td className="px-3 py-2 text-slate-500 capitalize">{g.method}</td>
                    <td className="px-3 py-2 text-right font-bold text-emerald-600">₹{g.totalAmount.toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="outline" size="sm" className="h-8" onClick={() => handleViewPrint(g)} title="View / Print">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="outline" size="sm" className="h-8" onClick={() => setEditingGroup(g)} title="Edit" disabled={!g.receiptNumber}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(g)} disabled={deletingKey === g.receiptKey} title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
