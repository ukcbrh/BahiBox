import sys

def apply_patches(filename):
    with open(filename, 'r') as f:
        content = f.read()

    # PATCH A
    content = content.replace("interface QuotationFormProps {", "interface SaleOrderFormProps {")
    content = content.replace("export function QuotationForm({ onBack, editQuotation }: QuotationFormProps & { editQuotation?: any }) {",
                              "export function SaleOrderForm({ onBack, editSaleOrder }: SaleOrderFormProps & { editSaleOrder?: any }) {")
    
    # PATCH B
    content = content.replace("tenantScopedKey('quotation_columns', currentTenantId)", 
                              "tenantScopedKey('sale_order_columns', currentTenantId)")
    
    # PATCH C
    content = content.replace("const prefix = savedSettings?.['quotation']?.prefix || 'QTN-';",
                              "const prefix = savedSettings?.['sale_order']?.prefix || 'SO-';")
    
    # PATCH D
    orig_d = """  useEffect(() => {
    if (!editQuotation || customers.length === 0) return;
    const cust = customers.find((c: any) => c.id === editQuotation.customer_id);
    if (cust) setSelectedCustomer(cust);
    setInvoicePrefix(editQuotation.quotation_number || '');
    setInvoiceNumberPart('');
    setInvoiceSuffix('');
    const editedItems = (editQuotation.quotation_items || []).map((it: any) => ({
      key: it.id + '-' + Date.now(),
      product_id: it.product_id,
      product_name: it.item_name,
      hsn_sac_id: null,
      selling_price: Number(it.unit_price),
      quantity: Number(it.quantity),
      discount_type: (it.discount_value > 0 ? 'fixed' : 'none') as 'none' | 'fixed',
      discount_value: Number(it.discount_value) || 0,
      est_gst_rate: 0
    }));
    setItems(editedItems);
  }, [editQuotation, customers]);"""
    
    new_d = """  useEffect(() => {
    if (!editSaleOrder || customers.length === 0) return;
    const cust = customers.find((c: any) => c.id === editSaleOrder.customer_id);
    if (cust) setSelectedCustomer(cust);
    setInvoicePrefix(editSaleOrder.sale_order_number || '');
    setInvoiceNumberPart('');
    setInvoiceSuffix('');
    const editedItems = (editSaleOrder.sale_order_items || []).map((it: any) => ({
      key: it.id + '-' + Date.now(),
      product_id: it.product_id,
      product_name: it.item_name,
      hsn_sac_id: null,
      selling_price: Number(it.unit_price),
      quantity: Number(it.quantity),
      discount_type: (it.discount_value > 0 ? 'fixed' : 'none') as 'none' | 'fixed',
      discount_value: Number(it.discount_value) || 0,
      est_gst_rate: 0
    }));
    setItems(editedItems);
  }, [editSaleOrder, customers]);"""
    content = content.replace(orig_d, new_d)

    # PATCH E
    orig_e = """  const handleSave = async () => {
    if (items.length === 0) {
      toast.error('Please add at least one product');
      return;
    }
    if (!supabase || !currentTenantId || !user) return;

    setSaving(true);
    try {
      const branchId = activeBranchId;
      if (!branchId) throw new Error('No active branch selected. Please select a branch from Switch Business.');

      const rpcItems = items.map(it => ({
        product_id: it.product_id,
        item_name: it.product_name,
        quantity: it.quantity,
        unit_price: it.selling_price,
        discount_type: it.discount_type === 'none' ? 'fixed' : it.discount_type,
        discount_value: it.discount_type === 'none' ? 0 : it.discount_value
      }));

      let quotationId: string;
      if (editQuotation) {
        const { error: updErr } = await supabase.rpc('update_quotation', {
          p_quotation_id: editQuotation.id,
          p_customer_id: selectedCustomer?.id || null,
          p_customer_name: selectedCustomer?.customer_name || null,
          p_customer_gstin: selectedCustomer?.gstin || null,
          p_valid_until: null,
          p_notes: null,
          p_items: rpcItems
        });
        if (updErr) throw updErr;
        quotationId = editQuotation.id;
      } else {
        const { data: newId, error } = await supabase.rpc('create_quotation', {
          p_tenant_id: currentTenantId,
          p_branch_id: branchId,
          p_created_by: user.id,
          p_customer_id: selectedCustomer?.id || null,
          p_customer_name: selectedCustomer?.customer_name || null,
          p_customer_gstin: selectedCustomer?.gstin || null,
          p_valid_until: null,
          p_notes: null,
          p_items: rpcItems
        });
        if (error) throw error;
        quotationId = newId;
      }

      await supabase.from('quotations').update({ quotation_number: invoiceNo || undefined }).eq('id', quotationId);
      const { data: quotationRow } = await supabase.from('quotations').select('*').eq('id', quotationId).single();"""

    new_e = """  const handleSave = async () => {
    if (!selectedCustomer) {
      toast.error('Please select a customer — Sale Order requires a customer');
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

      const rpcItems = items.map(it => ({
        product_id: it.product_id,
        item_name: it.product_name,
        quantity: it.quantity,
        unit_price: it.selling_price,
        discount_type: it.discount_type === 'none' ? 'fixed' : it.discount_type,
        discount_value: it.discount_type === 'none' ? 0 : it.discount_value
      }));

      let quotationId: string;
      if (editSaleOrder) {
        const { error: updErr } = await supabase.rpc('update_sale_order', {
          p_sale_order_id: editSaleOrder.id,
          p_customer_id: selectedCustomer.id,
          p_customer_name: selectedCustomer?.customer_name || null,
          p_customer_gstin: selectedCustomer?.gstin || null,
          p_expected_delivery_date: null,
          p_notes: null,
          p_items: rpcItems
        });
        if (updErr) throw updErr;
        quotationId = editSaleOrder.id;
      } else {
        const { data: newId, error } = await supabase.rpc('create_sale_order', {
          p_tenant_id: currentTenantId,
          p_branch_id: branchId,
          p_created_by: user.id,
          p_customer_id: selectedCustomer.id,
          p_customer_name: selectedCustomer?.customer_name || null,
          p_customer_gstin: selectedCustomer?.gstin || null,
          p_expected_delivery_date: null,
          p_notes: null,
          p_items: rpcItems
        });
        if (error) throw error;
        quotationId = newId;
      }

      await supabase.from('sale_orders').update({ sale_order_number: invoiceNo || undefined }).eq('id', quotationId);
      const { data: quotationRow } = await supabase.from('sale_orders').select('*').eq('id', quotationId).single();"""
    content = content.replace(orig_e, new_e)

    # PATCH F
    orig_f1 = "meta: { label: 'Quotation', number: invoiceNo || 'QTN-0001', date: new Date().toLocaleDateString() },"
    new_f1 = "meta: { label: 'Sale Order', number: invoiceNo || 'SO-0001', date: new Date().toLocaleDateString() },"
    content = content.replace(orig_f1, new_f1)

    orig_f2 = """      if (supabase && currentTenantId) {
        await printBillForChannel(supabase, currentTenantId, 'quotation', billData, printerSize);
      }

      setSuccessInvoice(quotationRow);
      toast.success(editQuotation ? 'Quotation updated successfully' : 'Quotation created successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create quotation');
    } finally {
      setSaving(false);
    }
  };"""
    new_f2 = """      if (supabase && currentTenantId) {
        await printBillForChannel(supabase, currentTenantId, 'sale_order', billData, printerSize);
      }

      setSuccessInvoice(quotationRow);
      toast.success(editSaleOrder ? 'Sale Order updated successfully' : 'Sale Order created successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create sale order');
    } finally {
      setSaving(false);
    }
  };"""
    content = content.replace(orig_f2, new_f2)

    # PATCH H
    orig_h = """        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Quotation Created!</h2>
        <p className="text-slate-500 dark:text-slate-400">{successInvoice.quotation_number}</p>"""
    new_h = """        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Sale Order Created!</h2>
        <p className="text-slate-500 dark:text-slate-400">{successInvoice.sale_order_number}</p>"""
    content = content.replace(orig_h, new_h)

    # Extra catch-alls for remaining quotation -> sale_order
    content = content.replace("Create Quotation", "Create Sale Order")
    content = content.replace("Update Quotation", "Update Sale Order")
    content = content.replace("New Quotation", "New Sale Order")
    content = content.replace("quotations", "sale_orders")
    
    with open(filename, 'w') as f:
        f.write(content)

if __name__ == "__main__":
    apply_patches('src/components/retail/SaleOrderForm.tsx')
