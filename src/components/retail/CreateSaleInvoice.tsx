import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Plus, Edit2, ArrowLeft, Trash2, Search, CheckCircle2, Minus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getSupabaseClient } from '../../lib/supabase';
import { toast } from 'sonner';
import { printBillForChannel, BillData } from '../../lib/billRenderer';
import { tenantScopedKey } from '@/src/lib/tenantStorage';

interface CreateSaleInvoiceProps {
  onBack: () => void;
}

interface ItemRow {
  key: string;
  product_id: string;
  product_name: string;
  unit_id?: string | null;
  hsn_sac_id: string | null;
  selling_price: number;
  quantity: number;
  discount_type: 'none' | 'percent' | 'fixed';
  discount_value: number;
  est_gst_rate: number;
  sku?: string;
  barcode?: string;
  batch?: string;
  mfg_date?: string;
  exp_date?: string;
  size?: string;
  colour?: string;
  mrp?: number;
  w_sale_price?: number;
  imei1?: string;
  imei2?: string;
  kitchen?: string;
  category_plus?: string;
  subcategory_plus?: string;
  description?: string;
  gst_plus?: string;
  sales_unit?: string;
  sales_alt_unit?: string;
  conv?: string;
  min_stock?: number;
  status?: string;
  s_tax?: number;
  p_tax?: number;
  g_down?: string;
  rack?: string;
  def_qty?: number;
  part_no?: string;
  hsn_code?: string;
  cmb_gst?: string;
  purchase_price?: number;
  opening_stock?: number;
  unit?: string;
}

export function CreateSaleInvoice({ onBack }: CreateSaleInvoiceProps) {
  const { user, currentTenantId, activeBranchId } = useAuth();
  const supabase = getSupabaseClient();

  const [customers, setCustomers] = useState<any[]>([]);
  const [invoicePrefix, setInvoicePrefix] = useState('');
  const [invoiceNumberPart, setInvoiceNumberPart] = useState('');
  const [invoiceSuffix, setInvoiceSuffix] = useState('');
  const [invoiceType, setInvoiceType] = useState('b2b');
  const [challanNo, setChallanNo] = useState('');
  const [challanDate, setChallanDate] = useState('');
  const [poNo, setPoNo] = useState('');
  const [poDate, setPoDate] = useState('');
  const [lrNo, setLrNo] = useState('');
  const [ewayNo, setEwayNo] = useState('');
  const [deliveryMode, setDeliveryMode] = useState('');
  const [isReverseCharge, setIsReverseCharge] = useState(false);
  const [shipToSame, setShipToSame] = useState(true);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem(tenantScopedKey('sale_invoice_columns', currentTenantId));
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      sku: true, purchase_price: false, unit: true, opening_stock: false, barcode: true, mrp: true,
      w_sale_price: false, batch: true, mfg_date: true, exp_date: true, size: false, colour: false,
      imei1: false, imei2: false, kitchen: false, category_plus: true, subcategory_plus: true, description: false,
      gst_plus: false, sales_unit: false, sales_alt_unit: false,
      conv: false, min_stock: false, status: false, s_tax: false, p_tax: false, g_down: false, rack: false,
      def_qty: false, part_no: false, hsn_code: false, cmb_gst: true
    };
  });
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  useEffect(() => {
    localStorage.setItem(tenantScopedKey('sale_invoice_columns', currentTenantId), JSON.stringify(visibleColumns));
  }, [visibleColumns]);
  const invoiceNo = `${invoicePrefix}${invoiceNumberPart}${invoiceSuffix}`;
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  useEffect(() => {
    const generateDefaultInvoiceNo = async () => {
      if (!currentTenantId) return;
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data: tenantData } = await supabase.from('tenants').select('invoice_prefix').eq('id', currentTenantId).single();
      const prefix = tenantData?.invoice_prefix || 'INV-';
      const datePart = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const randomPart = Math.floor(100000 + Math.random() * 900000);
      setInvoicePrefix(prefix);
      setInvoiceNumberPart(`${datePart}-${randomPart}`);
      setInvoiceSuffix('');
    };
    generateDefaultInvoiceNo();
  }, [currentTenantId]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [advanceToApply, setAdvanceToApply] = useState('');

  const [products, setProducts] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  const [items, setItems] = useState<ItemRow[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'cash' | 'cheque' | 'online'>('cash');
  const [saving, setSaving] = useState(false);
  const [successInvoice, setSuccessInvoice] = useState<any>(null);
  const [unitsList, setUnitsList] = useState<any[]>([]);

  useEffect(() => {
    if (!supabase || !currentTenantId) return;
    const fetchData = async () => {
      const { data: custData } = await supabase.rpc('get_customers_with_balance', { p_tenant_id: currentTenantId });
      if (custData) setCustomers(custData);

      const { data: prodData } = await supabase.from('products').select('*').eq('tenant_id', currentTenantId).eq('is_active', true);
      if (prodData) setProducts(prodData);

      const { data: unitsData, error: unitsError } = await supabase.from('units').select('id, unit_name, unit_symbol').or(`tenant_id.is.null,tenant_id.eq.${currentTenantId}`).eq('is_active', true);
      if (unitsError) console.error('units fetch error:', unitsError);
      if (unitsData) setUnitsList(unitsData);
    };
    fetchData();
  }, [supabase, currentTenantId]);

  const filteredCustomers = customers.filter(c =>
    c.customer_name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone?.includes(customerSearch)
  );

  const filteredProducts = products.filter(p =>
    p.product_name?.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.barcode && p.barcode.includes(productSearch))
  );

  const addProductRow = (product: any) => {
    const estRate = product.cgst != null || product.sgst != null
      ? (Number(product.cgst || 0) + Number(product.sgst || 0))
      : (product.igst != null ? Number(product.igst) : 0);
    setItems(prev => [...prev, {
      key: `${product.id}-${Date.now()}`,
      product_id: product.id,
      product_name: product.product_name,
      unit_id: product.unit_id || null,
      hsn_sac_id: product.hsn_sac_id,
      selling_price: Number(product.selling_price) || 0,
      quantity: 1,
      discount_type: 'none',
      discount_value: 0,
      est_gst_rate: estRate,
      sku: product.sku || '',
      barcode: product.barcode || '',
      batch: product.batch || '',
      mfg_date: product.mfg_date || '',
      exp_date: product.exp_date || '',
      size: product.size || '',
      colour: product.colour || '',
      mrp: product.mrp || 0,
      w_sale_price: product.w_sale_price || 0,
      imei1: product.imei1 || '',
      imei2: product.imei2 || '',
      kitchen: product.kitchen || '',
      category_plus: product.category_plus || '',
      subcategory_plus: product.subcategory_plus || '',
      description: product.description || '',
      gst_plus: product.gst_plus || '',
      sales_unit: product.sales_unit || '',
      sales_alt_unit: product.sales_alt_unit || '',
      conv: product.conv || '',
      min_stock: product.min_stock || 0,
      status: product.status || '',
      s_tax: product.s_tax || 0,
      p_tax: product.p_tax || 0,
      g_down: product.g_down || '',
      rack: product.rack || '',
      def_qty: product.def_qty || 0,
      part_no: product.part_no || '',
      hsn_code: product.hsn_code || '',
      cmb_gst: product.cmb_gst || '',
      purchase_price: product.purchase_price || 0,
      opening_stock: product.opening_stock || 0,
      unit: product.unit || ''
    }]);
    setProductSearch('');
    setShowProductDropdown(false);
  };

  const updateItem = (key: string, patch: Partial<ItemRow>) => {
    setItems(prev => prev.map(it => it.key === key ? { ...it, ...patch } : it));
  };

  const removeItem = (key: string) => {
    setItems(prev => prev.filter(it => it.key !== key));
  };

  const computeLine = (item: ItemRow) => {
    const gross = item.selling_price * item.quantity;
    const discount = item.discount_type === 'percent'
      ? Math.round((gross * item.discount_value / 100) * 100) / 100
      : item.discount_type === 'fixed' ? item.discount_value : 0;
    const taxable = gross - discount;
    const gstAmount = Math.round((taxable * item.est_gst_rate / 100) * 100) / 100;
    return { gross, discount, taxable, gstAmount, total: taxable + gstAmount };
  };

  const totals = items.reduce((acc, item) => {
    const l = computeLine(item);
    acc.taxable += l.taxable;
    acc.gst += l.gstAmount;
    acc.grand += l.total;
    return acc;
  }, { taxable: 0, gst: 0, grand: 0 });

  const handleSave = async () => {
    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }
    if (items.length === 0) {
      toast.error('Please add at least one product');
      return;
    }
    if (!supabase || !currentTenantId || !user) return;

    setSaving(true);
    try {
      const branchId = activeBranchId;
      if (!branchId) throw new Error('No active branch selected. Please select a branch from Switch Business.');

      const { data, error } = await supabase.rpc('create_sales_invoice', {
        p_tenant_id: currentTenantId,
        p_branch_id: branchId,
        p_created_by: user.id,
        p_customer_id: selectedCustomer.id,
        p_items: items.map(it => ({
          product_id: it.product_id,
          quantity: it.quantity,
          discount_type: it.discount_type === 'none' ? 'fixed' : it.discount_type,
          discount_value: it.discount_type === 'none' ? 0 : it.discount_value
        })),
        p_payment_method: paymentMethod
      });

      if (error) throw error;
      const updatePayload: any = {};
      if (invoiceNo && invoiceNo.trim() !== '') updatePayload.invoice_number = invoiceNo.trim();
      if (invoiceDate) updatePayload.invoice_date = invoiceDate;
      updatePayload.invoice_type = invoiceType;
      updatePayload.is_reverse_charge = isReverseCharge;
      if (challanNo) updatePayload.challan_no = challanNo;
      if (challanDate) updatePayload.challan_date = challanDate;
      if (poNo) updatePayload.po_no = poNo;
      if (poDate) updatePayload.po_date = poDate;
      if (lrNo) updatePayload.lr_no = lrNo;
      if (ewayNo) updatePayload.eway_no = ewayNo;
      if (deliveryMode) updatePayload.delivery_mode = deliveryMode;
      await supabase.from('sales_invoices').update(updatePayload).eq('id', data);
      const { data: invoiceRow } = await supabase.from('sales_invoices').select('*').eq('id', data).single();

      // Apply any existing unallocated advance the customer has, if the 
      // user chose to. This does NOT create a new payment/journal entry — 
      // it links already-recorded advance money to this new invoice for 
      // tracking. Returns the ACTUAL amount applied (may be less than 
      // requested if less advance was actually available).
      let actualAdvanceApplied = 0;
      const requestedAdvance = parseFloat(advanceToApply) || 0;
      if (requestedAdvance > 0 && selectedCustomer.balance_label === 'Advance') {
        const { data: allocated, error: allocErr } = await supabase.rpc('allocate_advance_to_bill', {
          p_tenant_id: currentTenantId,
          p_party_type: 'customer',
          p_party_id: selectedCustomer.id,
          p_bill_type: 'sales_invoice',
          p_bill_id: data,
          p_amount: requestedAdvance,
          p_created_by: user.id
        });
        if (allocErr) {
          console.error('Failed to allocate advance:', allocErr.message);
          toast.error('Invoice created, but advance could not be applied: ' + allocErr.message);
        } else {
          actualAdvanceApplied = Number(allocated) || 0;
        }
      }

      const { data: branchInfo } = currentTenantId && activeBranchId
        ? await supabase.from('branches').select('branch_name, address, upi_id').eq('id', activeBranchId).maybeSingle()
        : { data: null };
      const { data: tenantData } = currentTenantId
        ? await supabase.from('tenants').select('business_name').eq('id', currentTenantId).maybeSingle()
        : { data: null };
      const { data: brandingInfo } = currentTenantId
        ? await supabase.from('print_branding_settings').select('*').eq('tenant_id', currentTenantId).maybeSingle()
        : { data: null };

      let qrImageUrl = '';
      const useRazorpayQr = (brandingInfo?.credit_qr_provider || 'razorpay') === 'razorpay';

      if (paymentMethod === 'credit' && brandingInfo?.show_upi_qr_on_credit && useRazorpayQr) {
        try {
          const sessionRes = await supabase.auth.getSession();
          const token = sessionRes.data.session?.access_token;
          if (token) {
            const res = await fetch('/api/create-invoice-payment-qr', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                tenant_id: currentTenantId,
                invoice_id: invoiceRow?.id,
                amount: totals.grand - actualAdvanceApplied,
                due_days: 30
              })
            });
            if (res.ok) {
              const data = await res.json();
              qrImageUrl = data.image_url;
            } else {
              const errData = await res.json().catch(() => ({}));
              toast.error('Payment QR could not be created: ' + (errData.error || res.status));
            }
          }
        } catch (e: any) {
          console.error('Failed to create invoice QR', e);
          toast.error('Payment QR creation error: ' + e.message);
        }
      }

      const billData: BillData = {
        business: {
          name: tenantData?.business_name || 'Your Business',
          branch_name: branchInfo?.branch_name,
          address: branchInfo?.address,
          show_branch_name: brandingInfo?.show_branch_name !== false,
          show_branch_address: brandingInfo?.show_branch_address !== false,
          stamp_url: brandingInfo?.stamp_url
        },
        customer: selectedCustomer ? { name: selectedCustomer.customer_name, phone: selectedCustomer.phone, address: selectedCustomer.address } : undefined,
        meta: { label: 'Tax Invoice (Sale)', number: invoiceNo || 'INV-0001', date: new Date().toLocaleDateString() },
        items: items.map((it: any) => ({
          name: it.product_name,
          hsn: it.hsn_code,
          qty: it.quantity,
          rate: it.selling_price,
          amount: (it.quantity * it.selling_price) - (it.discount_value || 0)
        })),
        totals: {
          subtotal: items.reduce((s: number, it: any) => s + (it.quantity * it.selling_price), 0),
          tax_breakdown: actualAdvanceApplied > 0 ? [
            { label: 'Bill Amount', amount: totals.grand },
            { label: 'Less: Advance Applied', amount: actualAdvanceApplied }
          ] : [],
          grand_total: totals.grand - actualAdvanceApplied
        },
        footer: {
          stamp_url: brandingInfo?.stamp_url
        },
        bill_number_code_type: brandingInfo?.bill_number_code_type || 'none',
        upi_payment: (paymentMethod === 'credit' && brandingInfo?.show_upi_qr_on_credit)
          ? (useRazorpayQr
              ? (qrImageUrl ? { qr_image_url: qrImageUrl, amount: totals.grand - actualAdvanceApplied } : undefined)
              : (branchInfo?.upi_id ? { upi_id: branchInfo.upi_id, payee_name: tenantData?.business_name || 'Merchant', amount: totals.grand - actualAdvanceApplied } : undefined))
          : undefined
      };
      if (supabase && currentTenantId) {
        await printBillForChannel(supabase, currentTenantId, 'sale_invoice', billData, 'A4');
      }

      setSuccessInvoice(invoiceRow);
      toast.success(actualAdvanceApplied > 0 ? `Sale Invoice created — ₹${actualAdvanceApplied.toFixed(2)} advance applied` : 'Sale Invoice created successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create invoice');
    } finally {
      setSaving(false);
    }
  };

  if (successInvoice) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-4">
        <CheckCircle2 className="h-16 w-16 text-[#00b884] mx-auto" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Invoice Created!</h2>
        <p className="text-slate-500 dark:text-slate-400">{successInvoice.invoice_number}</p>
        <p className="text-3xl font-bold text-slate-900 dark:text-white">₹{Number(successInvoice.total_amount).toFixed(2)}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">Status: {successInvoice.status}</p>
        <div className="flex gap-3 justify-center pt-4">
          <Button variant="outline" onClick={onBack}>Back to List</Button>
          <Button
            className="bg-[#00b884] hover:bg-[#00a375] text-white"
            onClick={() => { setSuccessInvoice(null); setItems([]); setSelectedCustomer(null); setCustomerSearch(''); }}
          >
            Create Another Invoice
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <Edit2 className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Create Sale Invoice (B2B)</h2>
        </div>
        <Button variant="outline" onClick={onBack} className="h-9">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="shadow-sm border-slate-200 dark:border-slate-800 h-full">
        <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Customer Information</CardTitle>
          {selectedCustomer && <Button variant="outline" size="sm" onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }}>Change</Button>}
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-[120px_1fr] items-center gap-4">
            <label className="text-sm text-slate-600 dark:text-slate-400">M/S.<span className="text-red-500">*</span></label>
            <div className="relative w-full">
              <Input
                className="h-9 w-full"
                placeholder="Type to search customer..."
                value={selectedCustomer ? selectedCustomer.customer_name : customerSearch}
                onChange={e => {
                  if (selectedCustomer) setSelectedCustomer(null);
                  setCustomerSearch(e.target.value);
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
              />
              {showCustomerDropdown && !selectedCustomer && (
                <div className="absolute z-50 w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md shadow-lg max-h-[200px] overflow-y-auto mt-1">
                  {filteredCustomers.length === 0 ? (
                    <p className="p-3 text-sm text-slate-400">No customers found. Add one via Customer/Supplier tab first.</p>
                  ) : filteredCustomers.map(c => (
                    <div
                      key={c.id}
                      className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer text-sm"
                      onClick={() => { setSelectedCustomer(c); setCustomerSearch(c.customer_name); setShowCustomerDropdown(false); }}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{c.customer_name}</span>
                        {c.balance_label && c.balance_label !== 'Settled' && (
                          <span className={"text-xs font-bold " + (c.balance_label === 'Due' ? 'text-red-600' : 'text-emerald-600')}>
                            ₹{Math.abs(c.balance).toFixed(0)} {c.balance_label}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">{c.phone || ''}{c.address ? ' · ' + c.address : ''}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-[120px_1fr] items-start gap-4">
            <label className="text-sm text-slate-600 dark:text-slate-400 mt-2">Address</label>
            <textarea
              className="flex w-full rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-3 py-2 text-sm outline-none resize-none min-h-[60px]"
              readOnly
              value={selectedCustomer ? `${selectedCustomer.address || ''} ${selectedCustomer.city || ''} ${selectedCustomer.pincode || ''}`.trim() : ''}
            />
          </div>
          <div className="grid grid-cols-[120px_1fr] items-center gap-4">
            <label className="text-sm text-slate-600 dark:text-slate-400">State</label>
            <Input className="h-9 bg-slate-50 dark:bg-slate-900/50" readOnly value={selectedCustomer?.state || ''} placeholder="State" />
          </div>
          <div className="grid grid-cols-[120px_1fr] items-center gap-4">
            <label className="text-sm text-slate-600 dark:text-slate-400">Phone No</label>
            <Input className="h-9 bg-slate-50 dark:bg-slate-900/50" readOnly value={selectedCustomer?.phone || ''} placeholder="Phone No" />
          </div>
          <div className="grid grid-cols-[120px_1fr] items-center gap-4">
            <label className="text-sm text-slate-600 dark:text-slate-400">GSTIN / PAN</label>
            <Input className="h-9 bg-slate-50 dark:bg-slate-900/50" readOnly value={selectedCustomer?.gstin || selectedCustomer?.pan || ''} />
          </div>
          {selectedCustomer && selectedCustomer.balance_label && selectedCustomer.balance_label !== 'Settled' && (
            <div className={"rounded-lg p-3 border-2 " + (selectedCustomer.balance_label === 'Due' ? 'border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900' : 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900')}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {selectedCustomer.balance_label === 'Due' ? 'Existing Amount Due' : 'Advance Available'}
                </span>
                <span className={"text-lg font-extrabold " + (selectedCustomer.balance_label === 'Due' ? 'text-red-600' : 'text-emerald-600')}>
                  ₹{Math.abs(selectedCustomer.balance).toFixed(2)}
                </span>
              </div>
              {selectedCustomer.balance_label === 'Advance' && (
                <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                  <label className="text-xs text-slate-600 dark:text-slate-400">Apply from Advance (₹)</label>
                  <Input type="number" className="h-8" placeholder="Amount to adjust" value={advanceToApply} onChange={e => setAdvanceToApply(e.target.value)} />
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-[120px_1fr] items-center gap-4">
            <label className="text-sm text-slate-600 dark:text-slate-400">Rev. Charge</label>
            <select className="h-9 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm" value={isReverseCharge ? 'yes' : 'no'} onChange={e => setIsReverseCharge(e.target.value === 'yes')}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
          <div className="grid grid-cols-[120px_1fr] items-center gap-4">
            <label className="text-sm text-slate-600 dark:text-slate-400">Ship To</label>
            <select className="h-9 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm" value={shipToSame ? 'same' : 'other'} onChange={e => setShipToSame(e.target.value === 'same')}>
              <option value="same">Same as Billing Address</option>
              <option value="other">Other Address</option>
            </select>
          </div>
          <div className="grid grid-cols-[120px_1fr] items-center gap-4">
            <label className="text-sm text-slate-600 dark:text-slate-400">Place of Supply<span className="text-red-500">*</span></label>
            <Input className="h-9 bg-slate-50 dark:bg-slate-900/50" readOnly value={selectedCustomer?.state || ''} placeholder="Place of Supply" />
          </div>
        </CardContent>
      </Card>
      <Card className="shadow-sm border-slate-200 dark:border-slate-800 h-full">
        <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Invoice Detail</CardTitle>
        </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <label className="text-sm text-slate-600 dark:text-slate-400">Invoice Type</label>
              <select className="h-9 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm" value={invoiceType} onChange={e => setInvoiceType(e.target.value)}>
                <option value="b2b">B2B</option>
                <option value="b2c">B2C</option>
                <option value="export">Export</option>
                <option value="sez">SEZ</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                <label className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">Invoice No.<span className="text-red-500">*</span></label>
                <div className="flex gap-1">
                  <Input className="h-9 w-1/3" placeholder="Prefix" value={invoicePrefix} onChange={e => setInvoicePrefix(e.target.value)} />
                  <Input className="h-9 w-1/3" placeholder="Number" value={invoiceNumberPart} onChange={e => setInvoiceNumberPart(e.target.value)} />
                  <Input className="h-9 w-1/3" placeholder="Suffix" value={invoiceSuffix} onChange={e => setInvoiceSuffix(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-[60px_1fr] items-center gap-2">
                <label className="text-sm text-slate-600 dark:text-slate-400">Date<span className="text-red-500">*</span></label>
                <Input type="date" className="h-9 w-full" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                <label className="text-sm text-slate-600 dark:text-slate-400">Challan No.</label>
                <Input className="h-9 w-full" placeholder="Challan No." value={challanNo} onChange={e => setChallanNo(e.target.value)} />
              </div>
              <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                <label className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">Challan Date</label>
                <Input type="date" className="h-9 w-full" value={challanDate} onChange={e => setChallanDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                <label className="text-sm text-slate-600 dark:text-slate-400">P.O. No.</label>
                <Input className="h-9 w-full" placeholder="P.O. No." value={poNo} onChange={e => setPoNo(e.target.value)} />
              </div>
              <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                <label className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">P.O. Date</label>
                <Input type="date" className="h-9 w-full" value={poDate} onChange={e => setPoDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                <label className="text-sm text-slate-600 dark:text-slate-400">L.R. No.</label>
                <Input className="h-9 w-full" placeholder="L.R. No." value={lrNo} onChange={e => setLrNo(e.target.value)} />
              </div>
              <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                <label className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">E-Way No.</label>
                <Input className="h-9 w-full" placeholder="E-Way No." value={ewayNo} onChange={e => setEwayNo(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <label className="text-sm text-slate-600 dark:text-slate-400">Delivery</label>
              <select className="h-9 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm" value={deliveryMode} onChange={e => setDeliveryMode(e.target.value)}>
                <option value="">Select Delivery Mode</option>
                <option value="road">Road</option>
                <option value="rail">Rail</option>
                <option value="air">Air</option>
                <option value="ship">Ship</option>
              </select>
            </div>
          </CardContent>
      </Card>
      </div>

      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto shadow-sm">
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex justify-end relative"><div className="relative">
              <Button variant="outline" size="sm" className="h-9" onClick={() => setShowColumnSettings(!showColumnSettings)}>Columns</Button>
              {showColumnSettings && (
                <div className="absolute right-0 top-10 w-48 bg-white dark:bg-slate-950 rounded-md shadow-lg border border-slate-200 dark:border-slate-800 z-50 p-2 max-h-96 overflow-y-auto">
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 px-1 uppercase">Visible Columns</div>
                  {Object.keys(visibleColumns).map(col => (
                    <label key={col} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 rounded cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 dark:border-slate-700"
                        checked={visibleColumns[col as keyof typeof visibleColumns]}
                        onChange={() => setVisibleColumns((prev: any) => ({ ...prev, [col]: !prev[col as keyof typeof visibleColumns] }))}
                      />
                      <span className="capitalize">{col.replace(/_/g, ' ')}</span>
                    </label>
                  ))}
                </div>
              )}
            </div></div>
      <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-4 py-3">PRODUCT</th>
              {visibleColumns.sku && <th className="px-4 py-3 text-center">SKU</th>}
              {visibleColumns.barcode && <th className="px-4 py-3 text-center">BARCODE</th>}
              {visibleColumns.hsn_code && <th className="px-4 py-3 text-center">HSN</th>}
              {visibleColumns.batch && <th className="px-4 py-3 text-center">BATCH</th>}
              {visibleColumns.mfg_date && <th className="px-4 py-3 text-center">MFG DATE</th>}
              {visibleColumns.exp_date && <th className="px-4 py-3 text-center">EXP DATE</th>}
              {visibleColumns.size && <th className="px-4 py-3 text-center">SIZE</th>}
              {visibleColumns.colour && <th className="px-4 py-3 text-center">COLOUR</th>}
              {visibleColumns.mrp && <th className="px-4 py-3 text-center">MRP</th>}
              {visibleColumns.w_sale_price && <th className="px-4 py-3 text-center">W.PRICE</th>}
              {visibleColumns.purchase_price && <th className="px-4 py-3 text-center">P.PRICE</th>}
              {visibleColumns.unit && <th className="px-4 py-3 text-center">UNIT</th>}
              {visibleColumns.opening_stock && <th className="px-4 py-3 text-center">STOCK</th>}
              {visibleColumns.imei1 && <th className="px-4 py-3 text-center">IMEI1</th>}
              {visibleColumns.imei2 && <th className="px-4 py-3 text-center">IMEI2</th>}
              {visibleColumns.kitchen && <th className="px-4 py-3 text-center">KITCHEN</th>}
              {visibleColumns.category_plus && <th className="px-4 py-3 text-center">CATEGORY</th>}
              {visibleColumns.subcategory_plus && <th className="px-4 py-3 text-center">SUBCATEGORY</th>}
              {visibleColumns.description && <th className="px-4 py-3 text-center">DESC</th>}
              {visibleColumns.gst_plus && <th className="px-4 py-3 text-center">GST+</th>}
              {visibleColumns.sales_unit && <th className="px-4 py-3 text-center">S.UNIT</th>}
              {visibleColumns.sales_alt_unit && <th className="px-4 py-3 text-center">ALT UNIT</th>}
              {visibleColumns.conv && <th className="px-4 py-3 text-center">CONV</th>}
              {visibleColumns.min_stock && <th className="px-4 py-3 text-center">MIN STOCK</th>}
              {visibleColumns.status && <th className="px-4 py-3 text-center">STATUS</th>}
              {visibleColumns.s_tax && <th className="px-4 py-3 text-center">S.TAX</th>}
              {visibleColumns.p_tax && <th className="px-4 py-3 text-center">P.TAX</th>}
              {visibleColumns.g_down && <th className="px-4 py-3 text-center">G DOWN</th>}
              {visibleColumns.rack && <th className="px-4 py-3 text-center">RACK</th>}
              {visibleColumns.def_qty && <th className="px-4 py-3 text-center">DEF QTY</th>}
              {visibleColumns.part_no && <th className="px-4 py-3 text-center">PART NO</th>}
              {visibleColumns.cmb_gst && <th className="px-4 py-3 text-center">CMB GST</th>}
              <th className="px-4 py-3 w-24 text-center">PRICE</th>
              <th className="px-4 py-3 w-32 text-center">QTY</th>
              <th className="px-4 py-3 w-40 text-center">DISCOUNT</th>
              <th className="px-4 py-3 w-24 text-center">GST %</th>
              <th className="px-4 py-3 w-28 text-center">LINE TOTAL</th>
              <th className="px-4 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-slate-400">Search and add products above</td></tr>
            ) : items.map(item => {
              const line = computeLine(item);
              return (
                <tr key={item.key} className="border-b border-slate-100 dark:border-slate-800/50">
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{item.product_name}</td>
                  {visibleColumns.sku && <td className="px-4 py-3"><Input className="h-7 w-20 text-xs" value={item.sku || ''} onChange={e => updateItem(item.key, { sku: e.target.value })} /></td>}
                  {visibleColumns.barcode && <td className="px-4 py-3"><Input className="h-7 w-24 text-xs" value={item.barcode || ''} onChange={e => updateItem(item.key, { barcode: e.target.value })} /></td>}
                  {visibleColumns.hsn_code && <td className="px-4 py-3"><Input className="h-7 w-20 text-xs" value={item.hsn_code || ''} onChange={e => updateItem(item.key, { hsn_code: e.target.value })} /></td>}
                  {visibleColumns.batch && <td className="px-4 py-3"><Input className="h-7 w-20 text-xs" value={item.batch || ''} onChange={e => updateItem(item.key, { batch: e.target.value })} /></td>}
                  {visibleColumns.mfg_date && <td className="px-4 py-3"><Input type="date" className="h-7 w-28 text-xs" value={item.mfg_date || ''} onChange={e => updateItem(item.key, { mfg_date: e.target.value })} /></td>}
                  {visibleColumns.exp_date && <td className="px-4 py-3"><Input type="date" className="h-7 w-28 text-xs" value={item.exp_date || ''} onChange={e => updateItem(item.key, { exp_date: e.target.value })} /></td>}
                  {visibleColumns.size && <td className="px-4 py-3"><Input className="h-7 w-16 text-xs" value={item.size || ''} onChange={e => updateItem(item.key, { size: e.target.value })} /></td>}
                  {visibleColumns.colour && <td className="px-4 py-3"><Input className="h-7 w-16 text-xs" value={item.colour || ''} onChange={e => updateItem(item.key, { colour: e.target.value })} /></td>}
                  {visibleColumns.mrp && <td className="px-4 py-3"><Input type="number" className="h-7 w-20 text-xs" value={item.mrp || 0} onChange={e => updateItem(item.key, { mrp: Number(e.target.value) || 0 })} /></td>}
                  {visibleColumns.w_sale_price && <td className="px-4 py-3"><Input type="number" className="h-7 w-20 text-xs" value={item.w_sale_price || 0} onChange={e => updateItem(item.key, { w_sale_price: Number(e.target.value) || 0 })} /></td>}
                  {visibleColumns.purchase_price && <td className="px-4 py-3"><Input type="number" className="h-7 w-20 text-xs" value={item.purchase_price || 0} onChange={e => updateItem(item.key, { purchase_price: Number(e.target.value) || 0 })} /></td>}
                  {visibleColumns.unit && <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                    {(() => {
                      const matchedUnit = unitsList.find((u: any) => u.id === item.unit_id);
                      return matchedUnit ? `${matchedUnit.unit_name}${matchedUnit.unit_symbol ? ' (' + matchedUnit.unit_symbol + ')' : ''}` : '-';
                    })()}
                  </td>}
                  {visibleColumns.opening_stock && <td className="px-4 py-3"><Input type="number" className="h-7 w-16 text-xs" value={item.opening_stock || 0} onChange={e => updateItem(item.key, { opening_stock: Number(e.target.value) || 0 })} /></td>}
                  {visibleColumns.imei1 && <td className="px-4 py-3"><Input className="h-7 w-24 text-xs" value={item.imei1 || ''} onChange={e => updateItem(item.key, { imei1: e.target.value })} /></td>}
                  {visibleColumns.imei2 && <td className="px-4 py-3"><Input className="h-7 w-24 text-xs" value={item.imei2 || ''} onChange={e => updateItem(item.key, { imei2: e.target.value })} /></td>}
                  {visibleColumns.kitchen && <td className="px-4 py-3"><Input className="h-7 w-20 text-xs" value={item.kitchen || ''} onChange={e => updateItem(item.key, { kitchen: e.target.value })} /></td>}
                  {visibleColumns.category_plus && <td className="px-4 py-3"><Input className="h-7 w-24 text-xs" value={item.category_plus || ''} onChange={e => updateItem(item.key, { category_plus: e.target.value })} /></td>}
                  {visibleColumns.subcategory_plus && <td className="px-4 py-3"><Input className="h-7 w-24 text-xs" value={item.subcategory_plus || ''} onChange={e => updateItem(item.key, { subcategory_plus: e.target.value })} /></td>}
                  {visibleColumns.description && <td className="px-4 py-3"><Input className="h-7 w-28 text-xs" value={item.description || ''} onChange={e => updateItem(item.key, { description: e.target.value })} /></td>}
                  {visibleColumns.gst_plus && <td className="px-4 py-3"><Input className="h-7 w-20 text-xs" value={item.gst_plus || ''} onChange={e => updateItem(item.key, { gst_plus: e.target.value })} /></td>}
                  {visibleColumns.sales_unit && <td className="px-4 py-3"><Input className="h-7 w-16 text-xs" value={item.sales_unit || ''} onChange={e => updateItem(item.key, { sales_unit: e.target.value })} /></td>}
                  {visibleColumns.sales_alt_unit && <td className="px-4 py-3"><Input className="h-7 w-16 text-xs" value={item.sales_alt_unit || ''} onChange={e => updateItem(item.key, { sales_alt_unit: e.target.value })} /></td>}
                  {visibleColumns.conv && <td className="px-4 py-3"><Input className="h-7 w-16 text-xs" value={item.conv || ''} onChange={e => updateItem(item.key, { conv: e.target.value })} /></td>}
                  {visibleColumns.min_stock && <td className="px-4 py-3"><Input type="number" className="h-7 w-16 text-xs" value={item.min_stock || 0} onChange={e => updateItem(item.key, { min_stock: Number(e.target.value) || 0 })} /></td>}
                  {visibleColumns.status && <td className="px-4 py-3"><Input className="h-7 w-16 text-xs" value={item.status || ''} onChange={e => updateItem(item.key, { status: e.target.value })} /></td>}
                  {visibleColumns.s_tax && <td className="px-4 py-3"><Input type="number" className="h-7 w-16 text-xs" value={item.s_tax || 0} onChange={e => updateItem(item.key, { s_tax: Number(e.target.value) || 0 })} /></td>}
                  {visibleColumns.p_tax && <td className="px-4 py-3"><Input type="number" className="h-7 w-16 text-xs" value={item.p_tax || 0} onChange={e => updateItem(item.key, { p_tax: Number(e.target.value) || 0 })} /></td>}
                  {visibleColumns.g_down && <td className="px-4 py-3"><Input className="h-7 w-20 text-xs" value={item.g_down || ''} onChange={e => updateItem(item.key, { g_down: e.target.value })} /></td>}
                  {visibleColumns.rack && <td className="px-4 py-3"><Input className="h-7 w-16 text-xs" value={item.rack || ''} onChange={e => updateItem(item.key, { rack: e.target.value })} /></td>}
                  {visibleColumns.def_qty && <td className="px-4 py-3"><Input type="number" className="h-7 w-16 text-xs" value={item.def_qty || 0} onChange={e => updateItem(item.key, { def_qty: Number(e.target.value) || 0 })} /></td>}
                  {visibleColumns.part_no && <td className="px-4 py-3"><Input className="h-7 w-20 text-xs" value={item.part_no || ''} onChange={e => updateItem(item.key, { part_no: e.target.value })} /></td>}
                  {visibleColumns.cmb_gst && <td className="px-4 py-3"><Input className="h-7 w-16 text-xs" value={item.cmb_gst || ''} onChange={e => updateItem(item.key, { cmb_gst: e.target.value })} /></td>}
                  <td className="px-4 py-3 text-center">₹{item.selling_price}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateItem(item.key, { quantity: Math.max(1, item.quantity - 1) })}><Minus className="h-3 w-3" /></Button>
                      <Input type="number" className="h-7 w-14 text-center px-1" value={item.quantity} onChange={e => updateItem(item.key, { quantity: Math.max(1, Number(e.target.value) || 1) })} />
                      <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateItem(item.key, { quantity: item.quantity + 1 })}><Plus className="h-3 w-3" /></Button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-center">
                      <select className="h-7 text-xs border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-950" value={item.discount_type} onChange={e => updateItem(item.key, { discount_type: e.target.value as any, discount_value: 0 })}>
                        <option value="none">None</option>
                        <option value="percent">%</option>
                        <option value="fixed">₹</option>
                      </select>
                      {item.discount_type !== 'none' && (
                        <Input type="number" className="h-7 w-16 text-center px-1" value={item.discount_value} onChange={e => updateItem(item.key, { discount_value: Number(e.target.value) || 0 })} />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-500 dark:text-slate-400">{item.est_gst_rate}%</td>
                  <td className="px-4 py-3 text-center font-semibold text-slate-800 dark:text-slate-200">₹{line.total.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => removeItem(item.key)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 relative">
          <div className="flex gap-2 items-start">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                className="pl-10 h-9"
                placeholder="Search product to add..."
                value={productSearch}
                onChange={e => { setProductSearch(e.target.value); setShowProductDropdown(true); }}
                onFocus={() => setShowProductDropdown(true)}
              />
            </div>
            
          </div>
          {showProductDropdown && (
            <div className="absolute z-10 left-3 right-3 mt-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <p className="p-3 text-sm text-slate-400">No products found.</p>
              ) : filteredProducts.map(p => (
                <div
                  key={p.id}
                  className="p-3 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0 flex justify-between"
                  onClick={() => addProductRow(p)}
                >
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{p.product_name}</span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">₹{p.selling_price}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Payment Type</h3>
          <div className="flex flex-wrap gap-2">
            {(['credit', 'cash', 'cheque', 'online'] as const).map(pm => (
              <button
                key={pm}
                onClick={() => setPaymentMethod(pm)}
                className={`px-4 py-2 text-sm font-semibold rounded-lg border-2 uppercase transition-colors ${paymentMethod === pm ? 'border-[#00b884] bg-[#00b884]/10 text-[#00b884]' : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'}`}
              >
                {pm}
              </button>
            ))}
          </div>
          {paymentMethod === 'credit' && (
            <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
              Credit sale requires the customer to have an assigned credit limit with sufficient available balance.
            </p>
          )}
        </div>

        <div className="space-y-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
          <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">Taxable Value</span><span className="font-semibold">₹{totals.taxable.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">Total GST</span><span className="font-semibold">₹{totals.gst.toFixed(2)}</span></div>
          <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-lg font-bold text-slate-900 dark:text-white">
            <span>Grand Total</span><span>₹{totals.grand.toFixed(2)}</span>
          </div>
          <p className="text-[10px] text-slate-400 italic">Final GST/totals are authoritatively recalculated on save.</p>
        </div>
      </div>

      <div className="flex justify-end pb-8">
        <Button
          className="h-11 px-8 bg-[#00b884] hover:bg-[#00a375] text-white font-bold"
          disabled={saving || items.length === 0 || !selectedCustomer}
          onClick={handleSave}
        >
          {saving ? 'Saving...' : 'Save & Print'}
        </Button>
      </div>
    </div>
  );
}
