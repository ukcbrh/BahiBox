import { ReportActionButtons } from '../reports/ReportActionButtons';
import { useState, useEffect } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { getSupabaseClient } from '@/src/lib/supabase';
import { Button } from '@/src/components/ui/button';
import { X } from 'lucide-react';

interface LedgerRow {
  date: string;
  type: string;
  reference: string;
  debit: number;
  credit: number;
}

export function PartyLedgerModal({ party, onClose }: { party: any; onClose: () => void }) {
  const { currentTenantId } = useAuth();
  const [side, setSide] = useState<'customer' | 'supplier'>(party.isCustomer ? 'customer' : 'supplier');
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLedger();
  }, [side, currentTenantId]);

  const fetchLedger = async () => {
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) { setLoading(false); return; }

    if (side === 'customer') {
      const customerId = party.originalId;
      const { data: cust } = await supabase.from('retail_customers').select('opening_balance, balance_type').eq('id', customerId).maybeSingle();
      const opening = cust?.balance_type === 'to_receive' ? (cust.opening_balance || 0) : -(cust?.opening_balance || 0);
      setOpeningBalance(opening);

      const { data: invoices } = await supabase.from('sales_invoices').select('id, invoice_number, invoice_date, total_amount, created_at').eq('tenant_id', currentTenantId).eq('customer_id', customerId).neq('status', 'cancelled');
      const { data: challans } = await supabase.from('delivery_challans_outward').select('id, challan_number, created_at').eq('tenant_id', currentTenantId).eq('customer_id', customerId).neq('status', 'converted');
      const { data: challanItems } = challans && challans.length > 0
        ? await supabase.from('delivery_challan_outward_items').select('challan_id, quantity, unit_price, discount_value, cgst, sgst, igst').in('challan_id', challans.map((c: any) => c.id))
        : { data: [] };
      const { data: payments } = await supabase.from('customer_payments').select('amount, payment_date, created_at, reference_note, sales_invoice_id, delivery_challan_outward_id').eq('tenant_id', currentTenantId).eq('customer_id', customerId);

      const invoiceRows: LedgerRow[] = (invoices || []).map((inv: any) => ({
        date: inv.invoice_date || inv.created_at?.slice(0, 10), type: 'Sale Invoice', reference: inv.invoice_number, debit: Number(inv.total_amount), credit: 0
      }));
      const challanRows: LedgerRow[] = (challans || []).map((ch: any) => {
        const items = (challanItems || []).filter((it: any) => it.challan_id === ch.id);
        const total = items.reduce((s: number, it: any) => {
          const base = (it.quantity * it.unit_price) - (it.discount_value || 0);
          return s + base + (base * ((it.cgst || 0) + (it.sgst || 0) + (it.igst || 0)) / 100);
        }, 0);
        return { date: ch.created_at?.slice(0, 10), type: 'Delivery Challan', reference: ch.challan_number, debit: total, credit: 0 };
      });
      const paymentRows: LedgerRow[] = (payments || []).map((p: any) => ({
        date: p.payment_date || p.created_at?.slice(0, 10), type: 'Payment Received', reference: p.reference_note || (p.sales_invoice_id ? 'Against Invoice' : p.delivery_challan_outward_id ? 'Against Challan' : 'On Account'), debit: 0, credit: Number(p.amount)
      }));

      const allRows = [...invoiceRows, ...challanRows, ...paymentRows].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      setRows(allRows);
    } else {
      const supplierId = party.originalSupplierId || party.originalId;
      const { data: sup } = await supabase.from('suppliers').select('opening_balance, balance_type').eq('id', supplierId).maybeSingle();
      const opening = sup?.balance_type === 'to_pay' ? (sup.opening_balance || 0) : -(sup?.opening_balance || 0);
      setOpeningBalance(opening);

      const { data: invoices } = await supabase.from('purchase_invoices').select('id, invoice_number, invoice_date, total_amount, created_at').eq('tenant_id', currentTenantId).eq('vendor_id', supplierId);
      const { data: challans } = await supabase.from('delivery_challans_inward').select('id, challan_number, created_at').eq('tenant_id', currentTenantId).eq('supplier_id', supplierId).neq('status', 'converted');
      const { data: challanItems } = challans && challans.length > 0
        ? await supabase.from('delivery_challan_inward_items').select('challan_id, quantity, unit_cost, discount, cgst, sgst, igst').in('challan_id', challans.map((c: any) => c.id))
        : { data: [] };
      const { data: payments } = await supabase.from('supplier_payments').select('amount, created_at, reference_note, purchase_invoice_id, delivery_challan_inward_id').eq('tenant_id', currentTenantId).eq('supplier_id', supplierId);

      const invoiceRows: LedgerRow[] = (invoices || []).map((inv: any) => ({
        date: inv.invoice_date || inv.created_at?.slice(0, 10), type: 'Purchase Invoice', reference: inv.invoice_number, debit: 0, credit: Number(inv.total_amount)
      }));
      const challanRows: LedgerRow[] = (challans || []).map((ch: any) => {
        const items = (challanItems || []).filter((it: any) => it.challan_id === ch.id);
        const total = items.reduce((s: number, it: any) => {
          const base = (it.quantity * (it.unit_cost || 0)) - (it.discount || 0);
          return s + base + (base * ((it.cgst || 0) + (it.sgst || 0) + (it.igst || 0)) / 100);
        }, 0);
        return { date: ch.created_at?.slice(0, 10), type: 'Delivery Challan', reference: ch.challan_number, debit: 0, credit: total };
      });
      const paymentRows: LedgerRow[] = (payments || []).map((p: any) => ({
        date: p.created_at?.slice(0, 10), type: 'Payment Made', reference: p.reference_note || (p.purchase_invoice_id ? 'Against Invoice' : p.delivery_challan_inward_id ? 'Against Challan' : 'On Account'), debit: Number(p.amount), credit: 0
      }));

      const allRows = [...invoiceRows, ...challanRows, ...paymentRows].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      setRows(allRows);
    }
    setLoading(false);
  };

  let running = openingBalance;
  const rowsWithBalance = rows.map(r => {
    running += r.debit - r.credit;
    return { ...r, balance: running };
  });
  const closing = running;
  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

  const reportRows = [
    { 'Date': '', 'Type': 'Opening Balance', 'Reference': '', 'Debit': 0, 'Credit': 0, 'Balance': Math.abs(openingBalance).toFixed(2) + ' ' + (openingBalance >= 0 ? 'Dr' : 'Cr') },
    ...rowsWithBalance.map((r: any) => ({
      'Date': r.date,
      'Type': r.type,
      'Reference': r.reference,
      'Debit': r.debit > 0 ? Number(r.debit.toFixed(2)) : '',
      'Credit': r.credit > 0 ? Number(r.credit.toFixed(2)) : '',
      'Balance': Math.abs(r.balance).toFixed(2) + ' ' + (r.balance >= 0 ? 'Dr' : 'Cr')
    }))
  ];

  const reportColumns = [
    { key: 'Date', label: 'Date' },
    { key: 'Type', label: 'Type' },
    { key: 'Reference', label: 'Reference' },
    { key: 'Debit', label: 'Debit', align: 'right' as const },
    { key: 'Credit', label: 'Credit', align: 'right' as const },
    { key: 'Balance', label: 'Balance', align: 'right' as const }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-950 rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">{party.name} — Ledger</h3>
            {party.isCustomer && party.isSupplier && (
              <div className="flex gap-2 mt-2">
                <button onClick={() => setSide('customer')} className={"text-xs px-3 py-1 rounded-full font-semibold " + (side === 'customer' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500')}>As Customer</button>
                <button onClick={() => setSide('supplier')} className={"text-xs px-3 py-1 rounded-full font-semibold " + (side === 'supplier' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500')}>As Supplier</button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ReportActionButtons
              data={reportRows}
              columns={reportColumns}
              filename={`ledger_${party.name?.replace(/\s+/g, '_') || 'party'}`}
              title={`${party.name} — Ledger`}
              subtitle={side === 'customer' ? 'Customer Statement' : 'Supplier Statement'}
            />
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"><X className="h-5 w-5" /></button>
          </div>
        </div>

        <div className="p-4 grid grid-cols-3 gap-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <p className="text-xs text-slate-500 uppercase font-semibold">Total Debit</p>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">₹{totalDebit.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase font-semibold">Total Credit</p>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">₹{totalCredit.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase font-semibold">Closing Balance</p>
            <p className={"text-lg font-bold " + (closing >= 0 ? 'text-red-600' : 'text-emerald-600')}>₹{Math.abs(closing).toFixed(2)} {closing >= 0 ? 'Dr' : 'Cr'}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 sticky top-0">
              <tr>
                <th className="px-4 py-2 font-semibold">Date</th>
                <th className="px-4 py-2 font-semibold">Type</th>
                <th className="px-4 py-2 font-semibold">Reference</th>
                <th className="px-4 py-2 font-semibold text-right">Debit</th>
                <th className="px-4 py-2 font-semibold text-right">Credit</th>
                <th className="px-4 py-2 font-semibold text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <tr>
                <td colSpan={5} className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-400">Opening Balance</td>
                <td className="px-4 py-2 text-right font-semibold">₹{Math.abs(openingBalance).toFixed(2)} {openingBalance >= 0 ? 'Dr' : 'Cr'}</td>
              </tr>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">Loading...</td></tr>
              ) : rowsWithBalance.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No transactions yet.</td></tr>
              ) : rowsWithBalance.map((r, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{r.date}</td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{r.type}</td>
                  <td className="px-4 py-2 text-slate-500">{r.reference}</td>
                  <td className="px-4 py-2 text-right">{r.debit > 0 ? '₹' + r.debit.toFixed(2) : '-'}</td>
                  <td className="px-4 py-2 text-right">{r.credit > 0 ? '₹' + r.credit.toFixed(2) : '-'}</td>
                  <td className="px-4 py-2 text-right font-bold">₹{Math.abs(r.balance).toFixed(2)} {r.balance >= 0 ? 'Dr' : 'Cr'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
