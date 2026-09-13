import { useState, useEffect } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { getSupabaseClient } from '@/src/lib/supabase';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Card, CardContent } from '@/src/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { printBillForChannel, BillData } from '@/src/lib/billRenderer';
import { tenantScopedKey } from '@/src/lib/tenantStorage';

interface PendingBill {
  id: string;
  type: 'invoice' | 'challan';
  number: string;
  date: string;
  balance: number;
  payAmount: string;
  checked: boolean;
}

export function CreateOutwardPayment({ onBack, editGroup }: { onBack: () => void; editGroup?: any }) {
  const { currentTenantId, user, activeBranchId } = useAuth();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [pendingBills, setPendingBills] = useState<PendingBill[]>([]);
  const [outstandingBalance, setOutstandingBalance] = useState(0);
  const [onAccountAmount, setOnAccountAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => editGroup?.date || new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState(editGroup?.method || 'cash');
  const [chequeNumber, setChequeNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [upiRef, setUpiRef] = useState('');
  const [referenceNote, setReferenceNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingBills, setLoadingBills] = useState(false);

  const isEditMode = !!editGroup;
  const excludePaymentIds = editGroup ? editGroup.rows.map((r: any) => r.id) : [];

  const fetchSuppliers = async () => {
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) return;
    const { data } = await supabase.rpc('get_suppliers_with_balance', { p_tenant_id: currentTenantId });
    setSuppliers(data || []);
  };

  useEffect(() => { fetchSuppliers(); }, [currentTenantId]);

  useEffect(() => {
    if (isEditMode && editGroup.rows[0]?.supplier_id && suppliers.length > 0) {
      const sup = suppliers.find((s: any) => s.id === editGroup.rows[0].supplier_id);
      if (sup) handleSelectSupplier(sup);
    }
  }, [isEditMode, suppliers]);

  const handleSelectSupplier = async (sup: any) => {
    setSelectedSupplier(sup);
    setSupplierSearch('');
    setLoadingBills(true);
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) { setLoadingBills(false); return; }

    const { data: invoices } = await supabase.from('purchase_invoices').select('id, invoice_number, invoice_date, total_amount').eq('tenant_id', currentTenantId).eq('vendor_id', sup.id);
    const { data: invoicePaymentsRaw } = await supabase.from('supplier_payments').select('purchase_invoice_id, amount, id').eq('tenant_id', currentTenantId).eq('supplier_id', sup.id);
    const invoicePayments = (invoicePaymentsRaw || []).filter((p: any) => !excludePaymentIds.includes(p.id));

    const { data: challans } = await supabase.from('delivery_challans_inward').select('id, challan_number, created_at').eq('tenant_id', currentTenantId).eq('supplier_id', sup.id).neq('status', 'converted');
    const { data: challanPaymentsRaw } = await supabase.from('supplier_payments').select('delivery_challan_inward_id, amount, id').eq('tenant_id', currentTenantId).eq('supplier_id', sup.id);
    const challanPayments = (challanPaymentsRaw || []).filter((p: any) => !excludePaymentIds.includes(p.id));
    const { data: challanItems } = challans && challans.length > 0
      ? await supabase.from('delivery_challan_inward_items').select('challan_id, quantity, unit_cost, discount, cgst, sgst, igst').in('challan_id', challans.map((c: any) => c.id))
      : { data: [] };

    const paidByInvoice: Record<string, number> = {};
    let totalPaid = 0;
    (invoicePayments || []).forEach((p: any) => {
      if (p.purchase_invoice_id) { paidByInvoice[p.purchase_invoice_id] = (paidByInvoice[p.purchase_invoice_id] || 0) + p.amount; totalPaid += p.amount; }
    });

    const paidByChallan: Record<string, number> = {};
    (challanPayments || []).forEach((p: any) => {
      if (p.delivery_challan_inward_id) { paidByChallan[p.delivery_challan_inward_id] = (paidByChallan[p.delivery_challan_inward_id] || 0) + p.amount; totalPaid += p.amount; }
    });

    const editedAmountByInvoice: Record<string, number> = {};
    const editedAmountByChallan: Record<string, number> = {};
    let editedOnAccount = 0;
    if (isEditMode) {
      editGroup.rows.forEach((r: any) => {
        if (r.purchase_invoice_id) editedAmountByInvoice[r.purchase_invoice_id] = Number(r.amount);
        else if (r.delivery_challan_inward_id) editedAmountByChallan[r.delivery_challan_inward_id] = Number(r.amount);
        else editedOnAccount += Number(r.amount);
      });
    }

    const invoiceBills: PendingBill[] = (invoices || []).map((inv: any) => {
      const paid = paidByInvoice[inv.id] || 0;
      const balance = Number(inv.total_amount) - paid;
      const editedAmt = editedAmountByInvoice[inv.id];
      return {
        id: inv.id, type: 'invoice' as const, number: inv.invoice_number, date: inv.invoice_date,
        balance: editedAmt ? balance + editedAmt : balance,
        payAmount: editedAmt ? editedAmt.toFixed(2) : '',
        checked: !!editedAmt
      };
    }).filter((b: PendingBill) => b.balance > 0.01 || b.checked);

    const challanBills: PendingBill[] = (challans || []).map((ch: any) => {
      const items = (challanItems || []).filter((it: any) => it.challan_id === ch.id);
      const total = items.reduce((s: number, it: any) => {
        const base = (it.quantity * (it.unit_cost || 0)) - (it.discount || 0);
        return s + base + (base * ((it.cgst || 0) + (it.sgst || 0) + (it.igst || 0)) / 100);
      }, 0);
      const paid = paidByChallan[ch.id] || 0;
      const balance = total - paid;
      const editedAmt = editedAmountByChallan[ch.id];
      return {
        id: ch.id, type: 'challan' as const, number: ch.challan_number, date: ch.created_at?.slice(0, 10) || '',
        balance: editedAmt ? balance + editedAmt : balance,
        payAmount: editedAmt ? editedAmt.toFixed(2) : '',
        checked: !!editedAmt
      };
    }).filter((b: PendingBill) => b.balance > 0.01 || b.checked);

    setPendingBills([...invoiceBills, ...challanBills]);
    if (isEditMode && editedOnAccount > 0) setOnAccountAmount(editedOnAccount.toFixed(2));

    const totalInvoiced = (invoices || []).reduce((s: number, inv: any) => s + Number(inv.total_amount), 0);
    const opening = sup.balance_type === 'to_pay' ? (sup.opening_balance || 0) : -(sup.opening_balance || 0);
    setOutstandingBalance(opening + totalInvoiced - totalPaid);
    setLoadingBills(false);
  };

  const toggleBill = (id: string) => {
    setPendingBills(prev => prev.map(b => b.id === id ? { ...b, checked: !b.checked, payAmount: !b.checked ? b.balance.toFixed(2) : '' } : b));
  };

  const updateBillAmount = (id: string, value: string) => {
    setPendingBills(prev => prev.map(b => b.id === id ? { ...b, payAmount: value } : b));
  };

  const totalToRecord = pendingBills.filter(b => b.checked).reduce((s, b) => s + (parseFloat(b.payAmount) || 0), 0) + (parseFloat(onAccountAmount) || 0);

  const handleSubmit = async () => {
    if (!selectedSupplier || !currentTenantId || !user || !activeBranchId || totalToRecord <= 0) return;
    setSaving(true);
    const supabase = getSupabaseClient();
    if (!supabase) { setSaving(false); return; }

    let note = referenceNote;
    if (paymentMethod === 'cheque') note = ('Cheque #' + chequeNumber + ', ' + bankName + '. ' + referenceNote).trim();
    if (paymentMethod === 'upi') note = ('UPI Ref: ' + upiRef + '. ' + referenceNote).trim();

    try {
      if (isEditMode) {
        for (const row of editGroup.rows) {
          const { error: delErr } = await supabase.rpc('delete_supplier_payment', { p_payment_id: row.id });
          if (delErr) throw delErr;
        }
      }

      const receiptNumber = isEditMode
        ? editGroup.receiptNumber
        : (() => {
            const s = localStorage.getItem(tenantScopedKey('posSettings', currentTenantId));
            const prefix = (s ? JSON.parse(s) : null)?.['outward_payment']?.prefix || 'RCPT-OUT-';
            return prefix + Date.now().toString().slice(-8);
          })();

      const billsToPay = pendingBills.filter(b => b.checked && parseFloat(b.payAmount) > 0);
      for (const bill of billsToPay) {
        const { error } = await supabase.rpc('record_supplier_payment', {
          p_tenant_id: currentTenantId,
          p_branch_id: activeBranchId,
          p_supplier_id: selectedSupplier.id,
          p_purchase_invoice_id: bill.type === 'invoice' ? bill.id : null,
          p_amount: parseFloat(bill.payAmount),
          p_payment_method: paymentMethod,
          p_reference_note: note || null,
          p_created_by: user.id,
          p_delivery_challan_inward_id: bill.type === 'challan' ? bill.id : null,
          p_receipt_number: receiptNumber
        });
        if (error) throw error;
      }

      const onAccount = parseFloat(onAccountAmount) || 0;
      if (onAccount > 0) {
        const { error } = await supabase.rpc('record_supplier_payment', {
          p_tenant_id: currentTenantId,
          p_branch_id: activeBranchId,
          p_supplier_id: selectedSupplier.id,
          p_purchase_invoice_id: null,
          p_amount: onAccount,
          p_payment_method: paymentMethod,
          p_reference_note: note || null,
          p_created_by: user.id,
          p_delivery_challan_inward_id: null,
          p_receipt_number: receiptNumber
        });
        if (error) throw error;
      }

      try {
        const savedSettingsStr = localStorage.getItem(tenantScopedKey('posSettings', currentTenantId));
        const savedSettings = savedSettingsStr ? JSON.parse(savedSettingsStr) : null;
        const printerSize = savedSettings?.['outward_payment']?.printerSize || '80mm';

        const { data: branchInfo } = activeBranchId
          ? await supabase.from('branches').select('branch_name, address').eq('id', activeBranchId).maybeSingle()
          : { data: null };
        const { data: tenantData } = await supabase.from('tenants').select('business_name').eq('id', currentTenantId).maybeSingle();
        const { data: brandingInfo } = await supabase.from('print_branding_settings').select('*').eq('tenant_id', currentTenantId).maybeSingle();

        const receiptItems = [
          ...billsToPay.map(b => ({
            name: 'Applied to ' + (b.type === 'invoice' ? 'Invoice' : 'Delivery Challan') + ' ' + b.number,
            qty: 1,
            rate: parseFloat(b.payAmount),
            amount: parseFloat(b.payAmount)
          })),
          ...(onAccount > 0 ? [{ name: 'On Account / Advance', qty: 1, rate: onAccount, amount: onAccount }] : [])
        ];

        const billData: BillData = {
          business: {
            name: tenantData?.business_name || 'Your Business',
            branch_name: branchInfo?.branch_name,
            address: branchInfo?.address,
            show_branch_name: brandingInfo?.show_branch_name !== false,
            show_branch_address: brandingInfo?.show_branch_address !== false,
            stamp_url: brandingInfo?.stamp_url
          },
          customer: { name: selectedSupplier.supplier_name, phone: selectedSupplier.contact_phone, address: selectedSupplier.address },
          customer_info_label: 'Paid To',
          meta: { label: 'Payment Receipt', number: receiptNumber, date: new Date().toLocaleDateString() },
          items: receiptItems,
          totals: { grand_total: totalToRecord },
          footer: { stamp_url: brandingInfo?.stamp_url },
          bill_number_code_type: brandingInfo?.bill_number_code_type || 'none'
        };

        await printBillForChannel(supabase, currentTenantId, 'outward_payment', billData, printerSize);
      } catch (printErr: any) {
        console.error('Failed to print receipt:', printErr.message);
      }

      toast.success(isEditMode ? 'Payment updated successfully' : 'Payment recorded successfully');
      onBack();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  const filteredSuppliers = suppliers.filter((s: any) => s.supplier_name?.toLowerCase().includes(supplierSearch.toLowerCase()));

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <Button variant="outline" size="sm" onClick={onBack} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Payments
      </Button>
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{isEditMode ? 'Edit Outward Payment' : 'Record Outward Payment'}</h2>
        <p className="text-slate-500 dark:text-slate-400">Record payments made to suppliers, against any pending invoice or delivery challan.</p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          {!selectedSupplier ? (
            <div>
              <label className="text-sm font-medium">Supplier</label>
              <Input
                placeholder="Click or type to search supplier..."
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                onFocus={() => setShowSupplierDropdown(true)}
                onBlur={() => setTimeout(() => setShowSupplierDropdown(false), 200)}
              />
              {showSupplierDropdown && (
                <div className="mt-2 border border-slate-200 dark:border-slate-800 rounded-lg max-h-64 overflow-y-auto">
                  {filteredSuppliers.length === 0 ? (
                    <p className="text-sm text-slate-400 p-3">No suppliers found.</p>
                  ) : filteredSuppliers.map((s: any) => (
                    <button key={s.id} onClick={() => { handleSelectSupplier(s); setShowSupplierDropdown(false); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-900 text-sm border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{s.supplier_name}</span>
                        {s.balance_label !== 'Settled' && (
                          <span className={"text-xs font-bold " + (s.balance_label === 'Due' ? 'text-red-600' : 'text-emerald-600')}>
                            ₹{Math.abs(s.balance).toFixed(0)} {s.balance_label}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">{s.contact_phone || ''}{s.address ? ' · ' + s.address : ''}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 rounded-xl p-4">
                <div>
                  <p className="font-bold text-slate-900 dark:text-slate-100">{selectedSupplier.supplier_name}</p>
                  <p className="text-xs text-slate-500">{selectedSupplier.contact_phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Outstanding Balance</p>
                  <p className={"text-xl font-extrabold " + (outstandingBalance > 0 ? 'text-red-600' : 'text-emerald-600')}>₹{Math.abs(outstandingBalance).toLocaleString('en-IN')}</p>
                </div>
                {!isEditMode && <button onClick={() => { setSelectedSupplier(null); setPendingBills([]); }} className="text-xs text-primary font-semibold ml-4">Change</button>}
              </div>

              <div>
                <label className="text-sm font-medium">Pending Bills (Invoices & Delivery Challans)</label>
                {loadingBills ? (
                  <p className="text-sm text-slate-400 py-3">Loading bills...</p>
                ) : pendingBills.length === 0 ? (
                  <p className="text-sm text-slate-400 py-3">No pending bills for this supplier.</p>
                ) : (
                  <div className="mt-2 border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-100 dark:divide-slate-800">
                    {pendingBills.map(bill => (
                      <div key={bill.id} className="flex items-center gap-3 p-3">
                        <input type="checkbox" checked={bill.checked} onChange={() => toggleBill(bill.id)} className="h-4 w-4" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{bill.number} <span className="text-xs text-slate-400 uppercase ml-1">{bill.type === 'invoice' ? 'Invoice' : 'Delivery Challan'}</span></p>
                          <p className="text-xs text-slate-500">{bill.date} · Balance: ₹{bill.balance.toFixed(2)}</p>
                        </div>
                        <Input
                          type="number"
                          className="w-28 h-8"
                          placeholder="Amount"
                          value={bill.payAmount}
                          disabled={!bill.checked}
                          onChange={(e) => updateBillAmount(bill.id, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">Additional / On-Account Amount (optional)</label>
                <Input type="number" placeholder="Extra advance not tied to a specific bill" value={onAccountAmount} onChange={(e) => setOnAccountAmount(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Payment Date</label>
                  <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Total to Record</label>
                  <p className="h-9 flex items-center text-lg font-bold text-red-600">₹{totalToRecord.toFixed(2)}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Payment Method</label>
                <div className="grid grid-cols-4 gap-2 mt-1">
                  {['cash', 'bank', 'upi', 'cheque'].map((m) => (
                    <button key={m} onClick={() => setPaymentMethod(m)} className={"py-2 rounded-lg text-xs font-bold uppercase border-2 " + (paymentMethod === m ? 'border-primary text-primary' : 'border-slate-200 dark:border-slate-800 text-slate-500')}>{m}</button>
                  ))}
                </div>
              </div>

              {paymentMethod === 'cheque' && (
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Cheque Number" value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value)} />
                  <Input placeholder="Bank Name" value={bankName} onChange={(e) => setBankName(e.target.value)} />
                </div>
              )}
              {paymentMethod === 'upi' && (
                <Input placeholder="UPI Reference / Transaction ID" value={upiRef} onChange={(e) => setUpiRef(e.target.value)} />
              )}

              <div>
                <label className="text-sm font-medium">Reference Note (optional)</label>
                <Input value={referenceNote} onChange={(e) => setReferenceNote(e.target.value)} />
              </div>

              <Button className="w-full h-12" onClick={handleSubmit} disabled={saving || totalToRecord <= 0}>
                {saving ? (isEditMode ? 'Updating...' : 'Recording...') : (isEditMode ? 'Update Payment · ₹' : 'Record Payment · ₹') + totalToRecord.toFixed(2)}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
