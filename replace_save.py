import sys

with open('src/components/retail/CreateDeliveryChallanInward.tsx', 'r') as f:
    content = f.read()

start_str = "  const handleSave = async () => {"
if start_str not in content:
    print("start_str not found")
    sys.exit(1)

start_idx = content.find(start_str)
end_idx = -1
stack = 0
started = False

for i in range(start_idx, len(content)):
    char = content[i]
    if char == '{':
        stack += 1
        started = True
    elif char == '}':
        stack -= 1
        
    if started and stack == 0:
        end_idx = i + 1
        # Include the trailing semicolon if present
        if i + 1 < len(content) and content[i+1] == ';':
            end_idx += 1
        break

if end_idx == -1:
    print("end not found")
    sys.exit(1)

old_handle_save = content[start_idx:end_idx]
print("Found old handleSave:", len(old_handle_save), "chars")

new_handle_save = """  const handleSave = async () => {
    if (!supplierId || !invoiceNo || items.length === 0) {
      toast.error('Please fill supplier, challan number and add at least one item');
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

      const foundSupplier = suppliers.find((s: any) => s.id === supplierId);

      const rpcItems = items.map((item: any) => {
        const taxRate = item.tax_rate || 0;
        const baseRate = item.p_tax ? (item.price / (1 + taxRate / 100)) : item.price;
        return {
          product_id: item.product_id,
          item_name: item.name,
          quantity: item.qty,
          remarks: null,
          unit_cost: baseRate,
          batch_number: item.batch || null,
          expiry_date: item.exp_date || null,
          mfg_date: item.mfg_date || null,
          size: item.size || null,
          colour: item.colour || null,
          hsn_code: item.hsn_code || null,
          mrp: item.mrp || null,
          discount: item.discount || null,
          sku: item.sku || null,
          barcode: item.barcode || null,
          w_sale_price: item.w_sale_price || null,
          imei1: item.imei1 || null,
          imei2: item.imei2 || null,
          kitchen: item.kitchen || null,
          description: item.description || null,
          sales_unit: item.sales_unit || null,
          sales_alt_unit: item.sales_alt_unit || null,
          conv: item.conv || null,
          min_stock: item.min_stock || null,
          status: item.status || null,
          g_down: item.g_down || null,
          rack: item.rack || null,
          def_qty: item.def_qty || null,
          part_no: item.part_no || null,
          cmb_gst: item.cmb_gst || null,
          igst: taxRate || null
        };
      });

      const { data: challanId, error: challanErr } = await supabase.rpc('create_delivery_challan_inward', {
        p_tenant_id: currentTenantId,
        p_branch_id: branchId,
        p_challan_number: invoiceNo,
        p_from_party_name: foundSupplier?.supplier_name || foundSupplier?.name || '',
        p_from_party_gstin: foundSupplier?.gstin || null,
        p_vehicle_number: null,
        p_purpose: null,
        p_notes: null,
        p_items: rpcItems,
        p_created_by: user?.id,
        p_supplier_id: supplierId,
        p_challan_date: invoiceDate || null,
        p_po_no: poNo || null,
        p_po_date: poDate || null,
        p_lr_no: lrNo || null,
        p_eway_no: ewayNo || null,
        p_delivery_mode: deliveryMode || null
      });

      if (challanErr) throw challanErr;

      // Update products table with modified properties
      await Promise.all(items.map(async (item) => {
        if (!item.product_id) return;
        
        const payload: any = {};
        
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
        meta: { label: 'Delivery Challan (Inward)', number: invoiceNo, date: new Date(invoiceDate).toLocaleDateString() },
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
          grand_total: items.reduce((sum: number, item: any) => {
            const taxRate = item.tax_rate || 0;
            const baseRate = item.p_tax ? (item.price / (1 + taxRate / 100)) : item.price;
            const baseAmount = item.qty * baseRate;
            const taxAmount = (baseAmount * taxRate) / 100;
            return sum + baseAmount + taxAmount;
          }, 0)
        },
        footer: {
          stamp_url: brandingInfo?.stamp_url
        },
        bill_number_code_type: brandingInfo?.bill_number_code_type || 'none'
      };

      await printBillForChannel(supabase, currentTenantId, 'delivery_challan_in', billData, 'A4');

      toast.success('Delivery Challan saved successfully');
      onBack();
      
    } catch (err: any) {
      toast.error(err.message || 'Failed to save delivery challan');
    } finally {
      setLoading(false);
    }
  };"""

content = content.replace(old_handle_save, new_handle_save)

with open('src/components/retail/CreateDeliveryChallanInward.tsx', 'w') as f:
    f.write(content)

print("Replacement done.")
