
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Plus, Edit2, RotateCcw, Save, Printer, ArrowLeft, Trash2, Settings, MoreVertical, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getSupabaseClient } from '../../lib/supabase';
import { toast } from 'sonner';
import { printBillForChannel, BillData } from '../../lib/billRenderer';
import { tenantScopedKey } from '@/src/lib/tenantStorage';

interface CreatePurchaseInvoiceProps {
  onBack: () => void;
  editData?: any;
}

export function CreatePurchaseInvoice({ onBack, editData }: CreatePurchaseInvoiceProps) {
  const { currentTenantId, user, activeBranchId } = useAuth();
  
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [termsTitle, setTermsTitle] = useState('');
  const [termsDetail, setTermsDetail] = useState('');
  const [documentNote, setDocumentNote] = useState('');
  const [tcsType, setTcsType] = useState<'%' | 'Rs'>('%');
  const [tcsValue, setTcsValue] = useState('');
  const [discountType, setDiscountType] = useState<'%' | 'Rs'>('Rs');
  const [discountValueOverall, setDiscountValueOverall] = useState('');
  const [roundOffEnabled, setRoundOffEnabled] = useState(true);
  const [paymentType, setPaymentType] = useState<'credit' | 'cash' | 'cheque' | 'online'>('credit');
  const [paymentReference, setPaymentReference] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [advanceToApply, setAdvanceToApply] = useState('');
  
  const [items, setItems] = useState<any[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [isSupplierFocused, setIsSupplierFocused] = useState(false);
  const [isItemFocused, setIsItemFocused] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);



  useEffect(() => {
    if (editData) {
      if (editData.supplierId) setSupplierId(editData.supplierId);
      if (editData.selectedSupplier) {
        setSelectedSupplier(editData.selectedSupplier);
        setSupplierSearchTerm(editData.selectedSupplier.supplier_name || '');
      }
      if (editData.invoiceNo) setInvoiceNo(editData.invoiceNo);
      if (editData.items) setItems(editData.items);
    }
  }, [editData]);

  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem(tenantScopedKey('retail_inventory_columns', currentTenantId));
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      sku: true, product_name: true, purchase_price: true, unit: true, opening_stock: true, barcode: true, mrp: true,
      selling_price: true, w_sale_price: false, batch: true, mfg_date: true, exp_date: true, size: false, colour: false,
      imei1: false, imei2: false, kitchen: false, category_plus: true, subcategory_plus: true, description: false,
      discount: false, gst_plus: false, cgst: true, sgst: true, igst: true, sales_unit: false, sales_alt_unit: false,
      conv: false, min_stock: false, status: false, s_tax: false, p_tax: false, g_down: false, rack: false,
      def_qty: false, part_no: false, hsn_code: false, cmb_gst: true
    };
  });
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [unitsList, setUnitsList] = useState<any[]>([]);



  useEffect(() => {
    localStorage.setItem(tenantScopedKey('retail_inventory_columns', currentTenantId), JSON.stringify(visibleColumns));
  }, [visibleColumns]);




  useEffect(() => {
    if (currentTenantId) {
      const supabase = getSupabaseClient();
      if (supabase) {
        supabase.rpc('get_suppliers_with_balance', { p_tenant_id: currentTenantId }).then(({data}: any) => {
          if (data) setSuppliers(data);
        });
        supabase.from('products').select('*').eq('tenant_id', currentTenantId).then(({data}: any) => {
          if (data) setProducts(data);
        });
        supabase.from('units').select('id, unit_name, unit_symbol').or(`tenant_id.is.null,tenant_id.eq.${currentTenantId}`).eq('is_active', true).then(({data, error}: any) => {
          if (error) console.error('units fetch error:', error);
          if (data) setUnitsList(data);
        });
      }
    }
  }, [currentTenantId]);

  const handleOcrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrLoading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/ocr-purchase-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({ image_base64: base64, mime_type: file.type })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'AI scan failed');
      }

      const result = await response.json();

      if (result.invoice_number) setInvoiceNo(result.invoice_number);
      if (result.invoice_date) setInvoiceDate(result.invoice_date);

      if (result.supplier_name) {
        const existingSupplier = suppliers.find((s: any) => s.supplier_name.toLowerCase().trim() === result.supplier_name.toLowerCase().trim());
        if (existingSupplier) {
          setSupplierId(existingSupplier.id);
          setSupplierSearchTerm(existingSupplier.supplier_name);
          setSelectedSupplier(existingSupplier);
        } else {
          const { data: newSupplier, error: supErr } = await supabase.from('suppliers').insert({
            tenant_id: currentTenantId,
            supplier_name: result.supplier_name.trim()
          }).select().single();
          if (newSupplier && !supErr) {
            setSuppliers((prev: any[]) => [...prev, newSupplier]);
            setSupplierId(newSupplier.id);
            setSupplierSearchTerm(newSupplier.supplier_name);
            setSelectedSupplier(newSupplier);
          }
        }
      }

      const newItems = (result.items || []).map((ocrItem: any) => {
        const matchedProduct = products.find((p: any) =>
          p.product_name.toLowerCase().trim() === ocrItem.product_name?.toLowerCase().trim() ||
          (ocrItem.barcode && p.barcode === ocrItem.barcode)
        );
        return {
          id: Math.random().toString(),
          product_id: matchedProduct ? matchedProduct.id : null,
          name: ocrItem.product_name || (matchedProduct?.product_name ?? ''),
          qty: ocrItem.qty || 1,
          price: ocrItem.price || 0,
          tax_rate: ocrItem.tax_rate || (matchedProduct?.igst ? parseFloat(matchedProduct.igst) : 0),
          p_tax: matchedProduct ? (matchedProduct.p_tax === 1 || matchedProduct.p_tax === '1') : false,
          batch: ocrItem.batch || '',
          mrp: ocrItem.mrp || matchedProduct?.mrp || 0,
          discount: ocrItem.discount || 0,
          exp_date: ocrItem.exp_date || '',
          mfg_date: ocrItem.mfg_date || '',
          size: ocrItem.size || matchedProduct?.size || '',
          colour: ocrItem.colour || matchedProduct?.colour || '',
          sku: ocrItem.sku || matchedProduct?.sku || '',
          barcode: ocrItem.barcode || matchedProduct?.barcode || '',
          selling_price: matchedProduct?.selling_price || 0,
          w_sale_price: matchedProduct?.w_sale_price || 0,
          imei1: matchedProduct?.imei1 || '',
          imei2: matchedProduct?.imei2 || '',
          kitchen: matchedProduct?.kitchen || '',
          description: matchedProduct?.description || '',
          unit_id: matchedProduct?.unit_id || '',
          sales_unit: matchedProduct?.sales_unit || '',
          sales_alt_unit: matchedProduct?.sales_alt_unit || '',
          conv: matchedProduct?.conv || '',
          min_stock: matchedProduct?.min_stock || 0,
          status: matchedProduct?.status || '',
          g_down: matchedProduct?.g_down || '',
          rack: matchedProduct?.rack || '',
          def_qty: matchedProduct?.def_qty || 0,
          part_no: matchedProduct?.part_no || '',
          hsn_code: matchedProduct?.hsn_code || '',
          cmb_gst: matchedProduct?.cmb_gst || ''
        };
      });

      setItems((prev: any[]) => [...prev, ...newItems]);
      toast.success(`Scanned invoice: ${newItems.length} item(s) added. Please review before saving.`);

    } catch (err: any) {
      toast.error(err.message || 'AI scan failed');
    } finally {
      setOcrLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddItem = (prod: any) => {
    setItems([...items, { 
      id: Math.random().toString(), 
      product_id: prod.id, 
      name: prod.product_name, 
      qty: 1, 
      price: prod.purchase_price || 0,
      tax_rate: prod.igst ? parseFloat(prod.igst) : 0,
      p_tax: prod.p_tax === 1 || prod.p_tax === '1',
      batch: prod.batch || '',
      mrp: prod.mrp || 0,
      discount: prod.discount || 0,
      exp_date: prod.exp_date || '',
      mfg_date: prod.mfg_date || '',
      size: prod.size || '',
      colour: prod.colour || '',
      sku: prod.sku || '',
      barcode: prod.barcode || '',
      selling_price: prod.selling_price || 0,
      w_sale_price: prod.w_sale_price || 0,
      imei1: prod.imei1 || '',
      imei2: prod.imei2 || '',
      kitchen: prod.kitchen || '',
      description: prod.description || '',
      unit_id: prod.unit_id || '',
      sales_unit: prod.sales_unit || '',
      sales_alt_unit: prod.sales_alt_unit || '',
      conv: prod.conv || '',
      min_stock: prod.min_stock || 0,
      status: prod.status || '',
      g_down: prod.g_down || '',
      rack: prod.rack || '',
      def_qty: prod.def_qty || 0,
      part_no: prod.part_no || '',
      hsn_code: prod.hsn_code || '',
      cmb_gst: prod.cmb_gst || ''
    }]);
    setSearchTerm('');
    setIsItemFocused(false);
  };

  const handleItemKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchTerm) {
      e.preventDefault();
      const existing = products.find(p => p.product_name.toLowerCase() === searchTerm.toLowerCase());
      if (existing) {
        handleAddItem(existing);
      } else {
        const supabase = getSupabaseClient();
        if (!supabase) return;
        const { data, error } = await supabase.from('products').insert({
          tenant_id: currentTenantId,
          product_name: searchTerm.trim(),
          purchase_price: 0,
          selling_price: 0,
          qty: 0,
          tax_rate: 0
        }).select().single();
        if (data && !error) {
          setProducts([...products, data]);
          handleAddItem(data);
          toast.success('New product added');
        }
      }
    }
  };

  const handleSupplierKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && supplierSearchTerm) {
      e.preventDefault();
      const existing = suppliers.find(s => s.supplier_name.toLowerCase() === supplierSearchTerm.toLowerCase());
      if (existing) {
        setSupplierId(existing.id);
        setSupplierSearchTerm(existing.supplier_name);
        setSelectedSupplier(existing);
        setIsSupplierFocused(false);
      } else {
        // create new supplier
        const supabase = getSupabaseClient();
        if (!supabase) return;
        const { data, error } = await supabase.from('suppliers').insert({
          tenant_id: currentTenantId,
          supplier_name: supplierSearchTerm.trim()
        }).select().single();
        if (data && !error) {
          setSuppliers([...suppliers, data]);
          setSupplierId(data.id);
          setSupplierSearchTerm(data.supplier_name);
          setSelectedSupplier(data);
          toast.success('New supplier added');
        }
        setIsSupplierFocused(false);
      }
    }
  };


  const updateItem = (id: string, field: string, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };
  
  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  let subtotal = 0;
  let taxAmount = 0;

  items.forEach(item => {
    let itemBaseAmount = 0;
    let itemTaxAmount = 0;
    const priceAfterDiscount = item.price * (1 - (item.discount || 0) / 100);
    
    if (item.p_tax) {
      // Inclusive tax: price includes tax
      const totalAmount = item.qty * priceAfterDiscount;
      itemBaseAmount = totalAmount / (1 + (item.tax_rate / 100));
      itemTaxAmount = totalAmount - itemBaseAmount;
    } else {
      // Exclusive tax: price is base price
      itemBaseAmount = item.qty * priceAfterDiscount;
      itemTaxAmount = itemBaseAmount * (item.tax_rate / 100);
    }
    
    subtotal += itemBaseAmount;
    taxAmount += itemTaxAmount;
  });
  const tcsAmountCalc = tcsType === '%' ? (subtotal * (parseFloat(tcsValue) || 0)) / 100 : (parseFloat(tcsValue) || 0);
  const discountAmountCalc = discountType === '%' ? (subtotal * (parseFloat(discountValueOverall) || 0)) / 100 : (parseFloat(discountValueOverall) || 0);
  const preRoundTotal = subtotal + taxAmount + tcsAmountCalc - discountAmountCalc;
  const roundOffAmount = roundOffEnabled ? (Math.round(preRoundTotal) - preRoundTotal) : 0;
  const grandTotal = preRoundTotal + roundOffAmount;

  function numberToWordsIndian(num: number): string {
    if (num === 0) return 'Zero';
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const inWords = (n: number): string => {
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
      if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + inWords(n % 100) : '');
      if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + inWords(n % 1000) : '');
      if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + inWords(n % 100000) : '');
      return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + inWords(n % 10000000) : '');
    };
    return inWords(Math.round(num)) + ' Rupees Only';
  }

  const handleSave = async () => {
    if (!supplierId || !invoiceNo || items.length === 0) {
      toast.error('Please fill supplier, invoice number and add at least one item');
      return;
    }
    
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) return;
    
    try {
      const branchId = activeBranchId;
      if (!branchId) {
        toast.error("No active branch selected. Please select a branch from Switch Business.");
        setLoading(false);
        return;
      }

      const rpcItems = items.map((item: any) => {
        const taxRate = item.tax_rate || 0;
        const baseRate = item.p_tax ? (item.price / (1 + taxRate / 100)) : item.price;
        return {
          product_id: item.product_id,
          quantity: item.qty,
          unit_cost: baseRate,
          discount_amount: 0,
          gst_rate_percent: taxRate,
          hsn_code: item.hsn_code || null,
          batch_number: item.batch || null,
          expiry_date: item.exp_date || null,
          mfg_date: item.mfg_date || null
        };
      });

      const { data: poId, error: poErr } = await supabase.rpc('create_standalone_purchase_invoice', {
        p_tenant_id: currentTenantId,
        p_branch_id: branchId,
        p_supplier_id: supplierId,
        p_invoice_number: invoiceNo,
        p_invoice_date: invoiceDate,
        p_po_number: invoiceNo,
        p_items: rpcItems,
        p_created_by: user?.id,
        p_due_date: dueDate || null,
        p_terms_title: termsTitle,
        p_terms_detail: termsDetail,
        p_document_note: documentNote,
        p_tcs_type: tcsType,
        p_tcs_value: parseFloat(tcsValue) || 0,
        p_discount_type: discountType,
        p_discount_value: parseFloat(discountValueOverall) || 0,
        p_round_off_enabled: roundOffEnabled,
        p_payment_type: paymentType,
        p_payment_reference: paymentReference
      });

      if (poErr) throw poErr;

      // Apply any existing unallocated advance (money we already paid 
      // this supplier extra) to this new bill, if the user chose to. 
      // This does NOT create a new payment/journal entry — it links 
      // already-recorded advance money to this bill for tracking. 
      // Returns the ACTUAL amount applied (may be less than requested).
      let actualAdvanceApplied = 0;
      const requestedAdvance = parseFloat(advanceToApply) || 0;

      if (requestedAdvance > 0 && selectedSupplier?.balance_label === 'Advance') {
        const { data: allocated, error: allocErr } = await supabase.rpc('allocate_advance_to_bill', {
          p_tenant_id: currentTenantId,
          p_party_type: 'supplier',
          p_party_id: supplierId,
          p_bill_type: 'purchase_invoice',
          p_bill_id: poId,
          p_amount: requestedAdvance,
          p_created_by: user?.id
        });

        if (allocErr) {
          console.error('Failed to allocate advance:', allocErr.message);
          toast.error('Purchase Invoice saved, but advance could not be applied: ' + allocErr.message);
        } else {
          actualAdvanceApplied = Number(allocated) || 0;
        }
      }
      
      // Update products table with modified properties
      await Promise.all(items.map(async (item) => {
        if (!item.product_id) return;
        
        const payload: any = {};
        
        // Include properties that could have been modified
        if (item.sku !== undefined) payload.sku = item.sku;
        if (item.barcode !== undefined) payload.barcode = item.barcode;
        if (item.batch !== undefined) payload.batch = item.batch;
        if (item.mfg_date !== undefined) payload.mfg_date = item.mfg_date || null;
        if (item.exp_date !== undefined) payload.exp_date = item.exp_date || null;
        if (item.size !== undefined) payload.size = item.size;
        if (item.colour !== undefined) payload.colour = item.colour;
        if (item.selling_price !== undefined) payload.selling_price = item.selling_price;
        if (item.w_sale_price !== undefined) payload.w_sale_price = item.w_sale_price;
        if (item.mrp !== undefined) payload.mrp = item.mrp;
        if (item.discount !== undefined) payload.discount = item.discount;
        if (item.price !== undefined) payload.purchase_price = item.price; // update purchase price too
        if (item.hsn_code !== undefined) payload.hsn_code = item.hsn_code;
        if (item.imei1 !== undefined) payload.imei1 = item.imei1;
        if (item.imei2 !== undefined) payload.imei2 = item.imei2;
        if (item.kitchen !== undefined) payload.kitchen = item.kitchen;
        if (item.description !== undefined) payload.description = item.description;
        if (item.sales_unit !== undefined) payload.sales_unit = item.sales_unit;
        if (item.sales_alt_unit !== undefined) payload.sales_alt_unit = item.sales_alt_unit;
        if (item.conv !== undefined) payload.conv = item.conv;
        if (item.min_stock !== undefined) payload.min_stock = item.min_stock;
        if (item.status !== undefined) payload.status = item.status;
        if (item.g_down !== undefined) payload.g_down = item.g_down;
        if (item.rack !== undefined) payload.rack = item.rack;
        if (item.def_qty !== undefined) payload.def_qty = item.def_qty;
        if (item.part_no !== undefined) payload.part_no = item.part_no;
        if (item.cmb_gst !== undefined) payload.cmb_gst = item.cmb_gst;
        
        await supabase.from('products').update(payload).eq('id', item.product_id);
      }));

      const foundSupplier = suppliers.find((s: any) => s.id === supplierId);
      const { data: branchInfo } = await supabase.from('branches').select('branch_name, address').eq('id', branchId).maybeSingle();
      const { data: brandingInfo } = await supabase.from('print_branding_settings').select('*').eq('tenant_id', currentTenantId).maybeSingle();
      const { data: tenantData } = await supabase.from('tenants').select('business_name').eq('id', currentTenantId).maybeSingle();

      const billData: BillData = {
        business: {
          name: tenantData?.business_name || 'Your Business',
          branch_name: branchInfo?.branch_name,
          address: branchInfo?.address,
          show_branch_name: brandingInfo?.show_branch_name !== false,
          show_branch_address: brandingInfo?.show_branch_address !== false,
          stamp_url: brandingInfo?.stamp_url
        },
        customer: foundSupplier ? {
          name: foundSupplier.supplier_name || foundSupplier.name || foundSupplier.business_name || 'Supplier',
          phone: foundSupplier.phone,
          address: foundSupplier.address
        } : undefined,
        customer_info_label: 'Supplier',
        meta: { label: 'Purchase Invoice', number: invoiceNo, date: new Date(invoiceDate).toLocaleDateString() },
        items: items.map((item: any) => {
          const taxRate = item.tax_rate || 0;
          const baseRate = item.p_tax ? (item.price / (1 + taxRate / 100)) : item.price;
          const baseAmount = item.qty * baseRate;
          const taxAmount = (baseAmount * taxRate) / 100;
          return {
            name: item.name,
            hsn: item.hsn_code,
            qty: item.qty,
            rate: baseRate,
            tax: taxRate > 0 ? `${taxRate}%` : undefined,
            amount: baseAmount + taxAmount
          };
        }),
        totals: {
          subtotal: items.reduce((s: number, item: any) => {
            const taxRate = item.tax_rate || 0;
            const baseRate = item.p_tax ? (item.price / (1 + taxRate / 100)) : item.price;
            return s + (item.qty * baseRate);
          }, 0),
          tax_breakdown: (() => {
            const lines: { label: string; amount: number }[] = [];
            const totalTax = items.reduce((s: number, item: any) => {
              const taxRate = item.tax_rate || 0;
              const baseRate = item.p_tax ? (item.price / (1 + taxRate / 100)) : item.price;
              const baseAmount = item.qty * baseRate;
              return s + (baseAmount * taxRate / 100);
            }, 0);
            if (totalTax > 0) lines.push({ label: 'GST', amount: totalTax });
            if (actualAdvanceApplied > 0) {
              lines.push({ label: 'Bill Amount', amount: grandTotal });
              lines.push({ label: 'Less: Advance Applied', amount: actualAdvanceApplied });
            }
            return lines;
          })(),
          grand_total: grandTotal - actualAdvanceApplied
        },
        footer: {
          stamp_url: brandingInfo?.stamp_url
        },
        bill_number_code_type: brandingInfo?.bill_number_code_type || 'none'
      };

      await printBillForChannel(supabase, currentTenantId as any, 'purchase_invoice', billData, 'A4');

      toast.success(actualAdvanceApplied > 0 ? `Purchase Invoice saved — ₹${actualAdvanceApplied.toFixed(2)} advance applied` : 'Purchase Invoice saved successfully');
      onBack();
      
    } catch (err: any) {
      toast.error(err.message || 'Failed to save purchase invoice');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => p.product_name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto animate-in fade-in duration-300 pb-12">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <Edit2 className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Create Purchase Invoice</h2>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={fileInputRef}
            className="hidden"
            onChange={handleOcrUpload}
          />
          <input
            type="file"
            accept="image/*"
            ref={galleryInputRef}
            className="hidden"
            onChange={handleOcrUpload}
          />
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            disabled={ocrLoading}
            onClick={() => fileInputRef.current?.click()}
          >
            {ocrLoading ? 'Scanning...' : 'Take Photo (AI Auto-fill)'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            disabled={ocrLoading}
            onClick={() => galleryInputRef.current?.click()}
          >
            {ocrLoading ? 'Scanning...' : 'Choose File (AI Auto-fill)'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Supplier Information */}
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 h-full">
          <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between bg-slate-50 dark:bg-slate-900/50">
            <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Supplier Information</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-[120px_1fr] items-center gap-4">
              <label className="text-sm text-slate-600 dark:text-slate-400">M/S.<span className="text-red-500">*</span></label>
              <div className="relative w-full">
                <Input
                  className="h-9 w-full"
                  placeholder="Type to search supplier..."
                  value={supplierSearchTerm}
                  onChange={e => {
                    setSupplierSearchTerm(e.target.value);
                    if (supplierId) {
                      setSupplierId('');
                      setSelectedSupplier(null);
                    }
                  }}
                  onFocus={() => setIsSupplierFocused(true)}
                  onBlur={() => setTimeout(() => setIsSupplierFocused(false), 200)}
                  onKeyDown={handleSupplierKeyDown}
                />
                {isSupplierFocused && (
                  <div className="absolute z-50 w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md shadow-lg max-h-[200px] overflow-y-auto mt-1">
                    {suppliers.filter(s => s.supplier_name.toLowerCase().includes(supplierSearchTerm.toLowerCase())).length > 0 ? (
                      suppliers.filter(s => s.supplier_name.toLowerCase().includes(supplierSearchTerm.toLowerCase())).map(s => (
                        <div
                          key={s.id}
                          className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer text-sm"
                          onClick={() => {
                            setSupplierId(s.id);
                            setSupplierSearchTerm(s.supplier_name);
                            setSelectedSupplier(s);
                            setIsSupplierFocused(false);
                          }}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{s.supplier_name}</span>
                            {s.balance_label && s.balance_label !== 'Settled' && (
                              <span className={"text-xs font-bold " + (s.balance_label === 'Due' ? 'text-red-600' : 'text-emerald-600')}>
                                ₹{Math.abs(s.balance).toFixed(0)} {s.balance_label}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400">{s.contact_phone || ''}{s.address ? ' · ' + s.address : ''}</div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-slate-500 dark:text-slate-400 text-sm">
                        No suppliers found. Press Enter to add "{supplierSearchTerm}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-[120px_1fr] items-start gap-4">
              <label className="text-sm text-slate-600 dark:text-slate-400 mt-2">Address</label>
              <textarea 
                className="flex w-full rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-3 py-2 text-sm outline-none resize-none min-h-[60px]" 
                readOnly
                value={selectedSupplier ? `${selectedSupplier.address || ''} ${selectedSupplier.city || ''} ${selectedSupplier.pincode || ''}`.trim() : ''}
              />
            </div>
            <div className="grid grid-cols-[120px_1fr] items-center gap-4">
              <label className="text-sm text-slate-600 dark:text-slate-400">State</label>
              <Input className="h-9 bg-slate-50 dark:bg-slate-900/50" readOnly value={selectedSupplier?.state || ''} placeholder="State" />
            </div>
            <div className="grid grid-cols-[120px_1fr] items-center gap-4">
              <label className="text-sm text-slate-600 dark:text-slate-400">Contact Person</label>
              <Input className="h-9 bg-slate-50 dark:bg-slate-900/50" readOnly value={selectedSupplier?.contact_person || ''} placeholder="Contact Person" />
            </div>
            <div className="grid grid-cols-[120px_1fr] items-center gap-4">
              <label className="text-sm text-slate-600 dark:text-slate-400">Phone No</label>
              <Input className="h-9 bg-slate-50 dark:bg-slate-900/50" readOnly value={selectedSupplier?.contact_phone || ''} placeholder="Phone No" />
            </div>
            <div className="grid grid-cols-[120px_1fr] items-center gap-4">
              <label className="text-sm text-slate-600 dark:text-slate-400">GSTIN / PAN</label>
              <Input className="h-9 bg-slate-50 dark:bg-slate-900/50" readOnly value={selectedSupplier?.gstin || selectedSupplier?.pan || ''} />
            </div>
            {selectedSupplier && selectedSupplier.balance_label && selectedSupplier.balance_label !== 'Settled' && (
              <div className={"rounded-lg p-3 border-2 " + (selectedSupplier.balance_label === 'Due' ? 'border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900' : 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900')}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {selectedSupplier.balance_label === 'Due' ? 'Existing Amount Due' : 'Advance Available (Paid Extra)'}
                  </span>
                  <span className={"text-lg font-extrabold " + (selectedSupplier.balance_label === 'Due' ? 'text-red-600' : 'text-emerald-600')}>
                    ₹{Math.abs(selectedSupplier.balance).toFixed(2)}
                  </span>
                </div>
                {selectedSupplier.balance_label === 'Advance' && (
                  <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                    <label className="text-xs text-slate-600 dark:text-slate-400">Apply from Advance (₹)</label>
                    <Input type="number" className="h-8" placeholder="Amount to adjust" value={advanceToApply} onChange={e => setAdvanceToApply(e.target.value)} />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoice Detail */}
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 h-full">
          <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between bg-slate-50 dark:bg-slate-900/50">
            <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Invoice Detail</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                <label className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">Invoice No.<span className="text-red-500">*</span></label>
                <Input 
                  className="h-9 w-full" 
                  placeholder="Enter Invoice Number" 
                  value={invoiceNo}
                  onChange={e => setInvoiceNo(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-[60px_1fr] items-center gap-2">
                <label className="text-sm text-slate-600 dark:text-slate-400">Date<span className="text-red-500">*</span></label>
                <Input 
                  type="date" 
                  className="h-9 w-full" 
                  value={invoiceDate}
                  onChange={e => setInvoiceDate(e.target.value)}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                <label className="text-sm text-slate-600 dark:text-slate-400">Challan No.</label>
                <Input className="h-9 w-full" placeholder="Challan No." />
              </div>
              <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                <label className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">Challan Date</label>
                <Input type="date" className="h-9 w-full" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                <label className="text-sm text-slate-600 dark:text-slate-400">P.O. No.</label>
                <Input className="h-9 w-full" placeholder="P.O. No." />
              </div>
              <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                <label className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">P.O. Date</label>
                <Input type="date" className="h-9 w-full" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                <label className="text-sm text-slate-600 dark:text-slate-400">L.R. No.</label>
                <Input className="h-9 w-full" placeholder="L.R. No." />
              </div>
              <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                <label className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">E-Way No.</label>
                <Input className="h-9 w-full" placeholder="E-Way No." />
              </div>
            </div>
            
            <div className="grid grid-cols-[100px_1fr] items-center gap-4 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <label className="text-sm text-slate-600 dark:text-slate-400">Delivery</label>
              <select className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-950">
                <option>Select Delivery Mode</option>
                <option>Transport</option>
                <option>Courier</option>
                <option>By Hand</option>
              </select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Item Details Table */}
      <Card className="shadow-sm border-slate-200 dark:border-slate-800 overflow-visible relative">
        <div className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 rounded-t-md">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-2">Items</span>
          <div className="relative">
            <Button 
              variant="outline" 
              className="h-8 text-xs bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400" 
              onClick={() => setShowColumnSettings(!showColumnSettings)}
            >
              <Settings className="h-3.5 w-3.5 mr-1" /> Columns
            </Button>
            {showColumnSettings && (
              <div className="absolute right-0 top-10 w-48 bg-white dark:bg-slate-950 rounded-md shadow-lg border border-slate-200 dark:border-slate-800 z-50 p-2">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 px-1 uppercase">Visible Columns</div>
                {Object.keys(visibleColumns).map(col => (
                  <label key={col} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 rounded cursor-pointer text-sm">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 dark:border-slate-700 text-[#00b884] focus:ring-[#00b884]"
                      checked={visibleColumns[col as keyof typeof visibleColumns]}
                      onChange={() => setVisibleColumns((prev: any) => ({ ...prev, [col]: !prev[col as keyof typeof visibleColumns] }))}
                    />
                    <span className="capitalize">{col.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="overflow-x-auto pb-32">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2 font-medium text-left min-w-[200px]">Item Name</th>
                {visibleColumns.sku && <th className="px-4 py-2 font-medium text-left">SKU</th>}
                {visibleColumns.barcode && <th className="px-4 py-2 font-medium text-left">Barcode</th>}
                {visibleColumns.batch && <th className="px-4 py-2 font-medium text-left w-24">Batch</th>}
                {visibleColumns.mfg_date && <th className="px-4 py-2 font-medium text-left w-32">Mfg Date</th>}
                {visibleColumns.exp_date && <th className="px-4 py-2 font-medium text-left w-32">Exp Date</th>}
                {visibleColumns.size && <th className="px-4 py-2 font-medium text-left w-20">Size</th>}
                {visibleColumns.colour && <th className="px-4 py-2 font-medium text-left w-20">Colour</th>}
                {visibleColumns.selling_price && <th className="px-4 py-2 font-medium text-right w-24">S.Price</th>}
                {visibleColumns.w_sale_price && <th className="px-4 py-2 font-medium text-right w-24">W.Price</th>}
                {visibleColumns.mrp && <th className="px-4 py-2 font-medium text-right w-24">MRP</th>}
                {visibleColumns.hsn_code && <th className="px-4 py-2 font-medium text-left w-24">HSN</th>}
                {visibleColumns.imei1 && <th className="px-4 py-2 font-medium text-left w-24">IMEI1</th>}
                {visibleColumns.imei2 && <th className="px-4 py-2 font-medium text-left w-24">IMEI2</th>}
                {visibleColumns.kitchen && <th className="px-4 py-2 font-medium text-left w-24">Kitchen</th>}
                {visibleColumns.description && <th className="px-4 py-2 font-medium text-left w-32">Desc</th>}
                {visibleColumns.unit && <th className="px-4 py-2 font-medium text-left w-24">Unit</th>}
                {visibleColumns.sales_unit && <th className="px-4 py-2 font-medium text-left w-20">S.Unit</th>}
                {visibleColumns.sales_alt_unit && <th className="px-4 py-2 font-medium text-left w-20">Alt.Unit</th>}
                {visibleColumns.conv && <th className="px-4 py-2 font-medium text-left w-20">Conv</th>}
                {visibleColumns.min_stock && <th className="px-4 py-2 font-medium text-right w-20">Min Stock</th>}
                {visibleColumns.status && <th className="px-4 py-2 font-medium text-left w-20">Status</th>}
                {visibleColumns.g_down && <th className="px-4 py-2 font-medium text-left w-24">G Down</th>}
                {visibleColumns.rack && <th className="px-4 py-2 font-medium text-left w-20">Rack</th>}
                {visibleColumns.def_qty && <th className="px-4 py-2 font-medium text-right w-20">Def Qty</th>}
                {visibleColumns.part_no && <th className="px-4 py-2 font-medium text-left w-24">Part No</th>}
                {visibleColumns.cmb_gst && <th className="px-4 py-2 font-medium text-left w-20">CMB GST</th>}

                <th className="px-4 py-2 font-medium text-right w-24">Qty</th>
                <th className="px-4 py-2 font-medium text-right w-32">Price (Inc/Exc)</th>
                {visibleColumns.discount && <th className="px-4 py-2 font-medium text-right w-24">Disc %</th>}
                <th className="px-4 py-2 font-medium text-right w-24">Tax %</th>
                <th className="px-4 py-2 font-medium text-right w-32">Amount</th>
                <th className="px-4 py-2 font-medium w-12 text-center"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900">
                  <td className="px-4 py-2">
                    <div className="font-medium text-slate-800 dark:text-slate-200">{item.name}</div>
                    <div className="text-[10px] text-slate-400">{item.p_tax ? 'Tax Inclusive' : 'Tax Exclusive'}</div>
                  </td>
                  {visibleColumns.sku && <td className="px-4 py-2"><Input className="h-8 w-full min-w-[80px]" value={item.sku} onChange={e => updateItem(item.id, 'sku', e.target.value)} /></td>}
                  {visibleColumns.barcode && <td className="px-4 py-2"><Input className="h-8 w-full min-w-[100px]" value={item.barcode} onChange={e => updateItem(item.id, 'barcode', e.target.value)} /></td>}
                  {visibleColumns.batch && <td className="px-4 py-2"><Input className="h-8 w-full min-w-[80px]" value={item.batch} onChange={e => updateItem(item.id, 'batch', e.target.value)} /></td>}
                  {visibleColumns.mfg_date && <td className="px-4 py-2"><Input type="date" className="h-8 w-full min-w-[120px]" value={item.mfg_date} onChange={e => updateItem(item.id, 'mfg_date', e.target.value)} /></td>}
                  {visibleColumns.exp_date && <td className="px-4 py-2"><Input type="date" className="h-8 w-full min-w-[120px]" value={item.exp_date} onChange={e => updateItem(item.id, 'exp_date', e.target.value)} /></td>}
                  {visibleColumns.size && <td className="px-4 py-2"><Input className="h-8 w-full min-w-[60px]" value={item.size} onChange={e => updateItem(item.id, 'size', e.target.value)} /></td>}
                  {visibleColumns.colour && <td className="px-4 py-2"><Input className="h-8 w-full min-w-[80px]" value={item.colour} onChange={e => updateItem(item.id, 'colour', e.target.value)} /></td>}
                  {visibleColumns.selling_price && <td className="px-4 py-2 text-right"><Input type="number" className="h-8 text-right w-full min-w-[80px]" value={item.selling_price} onChange={e => updateItem(item.id, 'selling_price', parseFloat(e.target.value) || 0)} /></td>}
                  {visibleColumns.w_sale_price && <td className="px-4 py-2 text-right"><Input type="number" className="h-8 text-right w-full min-w-[80px]" value={item.w_sale_price} onChange={e => updateItem(item.id, 'w_sale_price', parseFloat(e.target.value) || 0)} /></td>}
                  {visibleColumns.mrp && <td className="px-4 py-2 text-right"><Input type="number" className="h-8 text-right w-full min-w-[80px]" value={item.mrp} onChange={e => updateItem(item.id, 'mrp', parseFloat(e.target.value) || 0)} /></td>}
                  {visibleColumns.hsn_code && <td className="px-4 py-2"><Input className="h-8 w-full min-w-[80px]" value={item.hsn_code} onChange={e => updateItem(item.id, 'hsn_code', e.target.value)} /></td>}
                  {visibleColumns.imei1 && <td className="px-4 py-2"><Input className="h-8 w-full min-w-[100px]" value={item.imei1} onChange={e => updateItem(item.id, 'imei1', e.target.value)} /></td>}
                  {visibleColumns.imei2 && <td className="px-4 py-2"><Input className="h-8 w-full min-w-[100px]" value={item.imei2} onChange={e => updateItem(item.id, 'imei2', e.target.value)} /></td>}
                  {visibleColumns.kitchen && <td className="px-4 py-2"><Input className="h-8 w-full min-w-[100px]" value={item.kitchen} onChange={e => updateItem(item.id, 'kitchen', e.target.value)} /></td>}
                  {visibleColumns.description && <td className="px-4 py-2"><Input className="h-8 w-full min-w-[150px]" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} /></td>}
                  {visibleColumns.unit && <td className="px-4 py-2 text-slate-600 dark:text-slate-400 text-sm">
                    {(() => {
                      const matchedUnit = unitsList.find((u: any) => u.id === item.unit_id);
                      return matchedUnit ? `${matchedUnit.unit_name}${matchedUnit.unit_symbol ? ' (' + matchedUnit.unit_symbol + ')' : ''}` : '-';
                    })()}
                  </td>}
                  {visibleColumns.sales_unit && <td className="px-4 py-2"><Input className="h-8 w-full min-w-[80px]" value={item.sales_unit} onChange={e => updateItem(item.id, 'sales_unit', e.target.value)} /></td>}
                  {visibleColumns.sales_alt_unit && <td className="px-4 py-2"><Input className="h-8 w-full min-w-[80px]" value={item.sales_alt_unit} onChange={e => updateItem(item.id, 'sales_alt_unit', e.target.value)} /></td>}
                  {visibleColumns.conv && <td className="px-4 py-2"><Input className="h-8 w-full min-w-[60px]" value={item.conv} onChange={e => updateItem(item.id, 'conv', e.target.value)} /></td>}
                  {visibleColumns.min_stock && <td className="px-4 py-2 text-right"><Input type="number" className="h-8 text-right w-full min-w-[80px]" value={item.min_stock} onChange={e => updateItem(item.id, 'min_stock', parseFloat(e.target.value) || 0)} /></td>}
                  {visibleColumns.status && <td className="px-4 py-2"><Input className="h-8 w-full min-w-[80px]" value={item.status} onChange={e => updateItem(item.id, 'status', e.target.value)} /></td>}
                  {visibleColumns.g_down && <td className="px-4 py-2"><Input className="h-8 w-full min-w-[100px]" value={item.g_down} onChange={e => updateItem(item.id, 'g_down', e.target.value)} /></td>}
                  {visibleColumns.rack && <td className="px-4 py-2"><Input className="h-8 w-full min-w-[80px]" value={item.rack} onChange={e => updateItem(item.id, 'rack', e.target.value)} /></td>}
                  {visibleColumns.def_qty && <td className="px-4 py-2 text-right"><Input type="number" className="h-8 text-right w-full min-w-[80px]" value={item.def_qty} onChange={e => updateItem(item.id, 'def_qty', parseFloat(e.target.value) || 0)} /></td>}
                  {visibleColumns.part_no && <td className="px-4 py-2"><Input className="h-8 w-full min-w-[100px]" value={item.part_no} onChange={e => updateItem(item.id, 'part_no', e.target.value)} /></td>}
                  {visibleColumns.cmb_gst && <td className="px-4 py-2"><Input className="h-8 w-full min-w-[80px]" value={item.cmb_gst} onChange={e => updateItem(item.id, 'cmb_gst', e.target.value)} /></td>}

                  <td className="px-4 py-2 text-right">
                    <Input type="number" className="h-8 text-right w-full min-w-[60px]" value={item.qty} onChange={e => updateItem(item.id, 'qty', parseFloat(e.target.value) || 0)} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Input type="number" className="h-8 text-right w-full min-w-[80px]" value={item.price} onChange={e => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)} />
                  </td>
                  {visibleColumns.discount && (
                    <td className="px-4 py-2 text-right">
                      <Input type="number" className="h-8 text-right w-full min-w-[60px]" value={item.discount} onChange={e => updateItem(item.id, 'discount', parseFloat(e.target.value) || 0)} />
                    </td>
                  )}
                  <td className="px-4 py-2 text-right text-slate-600 dark:text-slate-400">{item.tax_rate}%</td>
                  <td className="px-4 py-2 text-right font-medium">₹ {(() => {
                    const priceAfterDiscount = item.price * (1 - (item.discount || 0) / 100);
                    return (item.p_tax ? (item.qty * priceAfterDiscount) : (item.qty * priceAfterDiscount * (1 + item.tax_rate / 100))).toFixed(2);
                  })()}</td>
                  <td className="px-4 py-2 text-center">
                    <button onClick={() => removeItem(item.id)} className="text-slate-400 hover:text-red-500">
                      <X className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              <tr>
                <td className="px-4 py-2 relative" colSpan={30}>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Type to search and select item..." 
                      className="h-9 w-full max-w-md"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      onFocus={() => setIsItemFocused(true)}
                      onBlur={() => setTimeout(() => setIsItemFocused(false), 200)}
                      onKeyDown={handleItemKeyDown}
                    />
                  </div>
                  {isItemFocused && (
                    <div className="absolute z-50 w-full max-w-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md shadow-lg max-h-[200px] overflow-y-auto mt-1">
                      {filteredProducts.length > 0 ? (
                        filteredProducts.map(p => (
                          <div 
                            key={p.id} 
                            className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer flex justify-between items-center"
                            onClick={() => handleAddItem(p)}
                          >
                            <span>{p.product_name}</span>
                            <span className="text-slate-500 dark:text-slate-400 text-xs">₹{p.purchase_price}</span>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-slate-500 dark:text-slate-400 text-sm">No items found. Press Enter to add "{searchTerm}"</div>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
      
      {/* Bottom Section: Notes (left) + Totals (right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Due Date</label>
            <Input type="date" className="h-9" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-3 mb-2">Terms & Condition / Additional Note</h3>
            <label className="block text-xs font-medium mb-1 text-slate-500">Title</label>
            <Input className="h-9 mb-2" value={termsTitle} onChange={e => setTermsTitle(e.target.value)} />
            <label className="block text-xs font-medium mb-1 text-slate-500">Detail</label>
            <textarea className="w-full min-h-[70px] rounded-md border border-input bg-background px-3 py-2 text-sm" value={termsDetail} onChange={e => setTermsDetail(e.target.value)} />
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Document Note / Remarks</label>
            <span className="block text-[10px] text-slate-400 mb-1">Not Visible on Print</span>
            <textarea className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm" value={documentNote} onChange={e => setDocumentNote(e.target.value)} />
          </div>
        </div>
        <div className="w-full space-y-6">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-600 dark:text-slate-400">Taxable Amount</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">₹ {subtotal.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-600 dark:text-slate-400">Total Tax</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">₹ {taxAmount.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center py-1">
              <div className="flex items-center gap-2">
                <span className="text-slate-600 dark:text-slate-400 w-24">Discount</span>
                <select className="h-7 text-xs border rounded px-1" value={discountType} onChange={(e: any) => setDiscountType(e.target.value)}>
                  <option value="%">%</option>
                  <option value="Rs">Rs</option>
                </select>
                <Input type="number" className="h-7 w-20 text-xs" placeholder="0" value={discountValueOverall} onChange={e => setDiscountValueOverall(e.target.value)} />
              </div>
              <span className="font-semibold text-red-600 dark:text-red-400">- ₹ {discountAmountCalc.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center py-1">
              <div className="flex items-center gap-2">
                <span className="text-slate-600 dark:text-slate-400 w-24">TCS</span>
                <select className="h-7 text-xs border rounded px-1" value={tcsType} onChange={(e: any) => setTcsType(e.target.value)}>
                  <option value="%">%</option>
                  <option value="Rs">Rs</option>
                </select>
                <Input type="number" className="h-7 w-20 text-xs" placeholder="0" value={tcsValue} onChange={e => setTcsValue(e.target.value)} />
              </div>
              <span className="font-semibold text-slate-800 dark:text-slate-200">+ ₹ {tcsAmountCalc.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={roundOffEnabled} onChange={e => setRoundOffEnabled(e.target.checked)} className="rounded border-slate-300" id="roundOffCheck" />
                <label htmlFor="roundOffCheck" className="text-slate-600 dark:text-slate-400 cursor-pointer">Round Off</label>
              </div>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {roundOffAmount >= 0 ? '+' : '-'} ₹ {Math.abs(roundOffAmount).toFixed(2)}
              </span>
            </div>

            <div className="flex flex-col py-3 bg-yellow-100/50 px-2 -mx-2">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-slate-800 dark:text-slate-200 text-base">Grand Total</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-lg">₹ {grandTotal.toFixed(2)}</span>
              </div>
              <div className="text-right text-[11px] text-slate-600 font-medium">
                {numberToWordsIndian(grandTotal)}
              </div>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Payment Type</span>
              <select 
                className="h-8 border border-slate-300 rounded-md px-2 text-sm bg-white dark:bg-slate-900"
                value={paymentType} 
                onChange={(e: any) => setPaymentType(e.target.value)}
              >
                <option value="credit">Credit</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="online">Online / UPI</option>
              </select>
            </div>
            {(paymentType === 'cheque' || paymentType === 'online') && (
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-600 dark:text-slate-400 font-medium">
                  {paymentType === 'cheque' ? 'Cheque Number' : 'Reference Number'}
                </span>
                <Input
                  className="h-8 w-40 text-sm"
                  value={paymentReference}
                  onChange={e => setPaymentReference(e.target.value)}
                  placeholder={paymentType === 'cheque' ? 'Cheque No.' : 'UTR / Ref No.'}
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-6 gap-2">
              <div className="flex gap-2">
                <Button variant="outline" className="h-9 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400" onClick={onBack}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
              </div>
              <div className="flex gap-2">
                <Button 
                  className="h-9 bg-[#00b884] hover:bg-[#00a375] text-white px-6"
                  onClick={handleSave}
                  disabled={loading}
                >
                  <Save className="mr-2 h-4 w-4" /> {loading ? 'Saving...' : 'Save & Print'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
