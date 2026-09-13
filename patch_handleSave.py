import base64

def patch_file(filepath, target_b64, repl_b64):
    target = base64.b64decode(target_b64).decode('utf-8')
    repl = base64.b64decode(repl_b64).decode('utf-8')
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    if target not in content:
        print(f"FAILED to find target in {filepath}")
        return False
        
    new_content = content.replace(target, repl)
    with open(filepath, 'w') as f:
        f.write(new_content)
    print(f"SUCCESS: Patched {filepath}")
    return True

target_b64 = base64.b64encode("""  const handleSave = async () => {
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
                amount: totals.grand,
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
          grand_total: totals.grand
        },
        footer: {
          stamp_url: brandingInfo?.stamp_url
        },
        bill_number_code_type: brandingInfo?.bill_number_code_type || 'none',
        upi_payment: (paymentMethod === 'credit' && brandingInfo?.show_upi_qr_on_credit)
          ? (useRazorpayQr
              ? (qrImageUrl ? { qr_image_url: qrImageUrl, amount: totals.grand } : undefined)
              : (branchInfo?.upi_id ? { upi_id: branchInfo.upi_id, payee_name: tenantData?.business_name || 'Merchant', amount: totals.grand } : undefined))
          : undefined
      };
      if (supabase && currentTenantId) {
        await printBillForChannel(supabase, currentTenantId, 'sale_invoice', billData, 'A4');
      }

      setSuccessInvoice(invoiceRow);
      toast.success('Sale Invoice created successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create invoice');
    } finally {
      setSaving(false);
    }
  };""".encode('utf-8')).decode('utf-8')

repl_b64 = base64.b64encode("""  const handleSave = async () => {
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

      const rpcItems = items.map((it: any) => ({
        product_id: it.product_id,
        item_name: it.product_name,
        quantity: it.quantity,
        remarks: null,
        unit_price: it.selling_price,
        discount_type: it.discount_type === 'none' ? 'fixed' : it.discount_type,
        discount_value: it.discount_type === 'none' ? 0 : it.discount_value,
        sku: it.sku || null,
        barcode: it.barcode || null,
        mrp: it.mrp || null,
        w_sale_price: it.w_sale_price || null,
        batch_number: it.batch || null,
        expiry_date: it.exp_date || null,
        mfg_date: it.mfg_date || null,
        size: it.size || null,
        colour: it.colour || null,
        hsn_code: it.hsn_code || null,
        imei1: it.imei1 || null,
        imei2: it.imei2 || null,
        kitchen: it.kitchen || null,
        description: it.description || null,
        sales_unit: it.sales_unit || null,
        sales_alt_unit: it.sales_alt_unit || null,
        conv: it.conv || null,
        min_stock: it.min_stock || null,
        status: it.status || null,
        g_down: it.g_down || null,
        rack: it.rack || null,
        def_qty: it.def_qty || null,
        part_no: it.part_no || null,
        cmb_gst: it.cmb_gst || null,
        photo: null,
        category_plus: it.category_plus || null,
        subcategory_plus: it.subcategory_plus || null,
        gst_plus: it.gst_plus || null,
        cgst: it.est_gst_rate ? (it.est_gst_rate / 2) : null,
        sgst: it.est_gst_rate ? (it.est_gst_rate / 2) : null,
        igst: null,
        s_tax: it.s_tax || null,
        p_tax: it.p_tax || null
      }));

      const { data: challanId, error } = await supabase.rpc('create_delivery_challan_outward', {
        p_tenant_id: currentTenantId,
        p_branch_id: branchId,
        p_challan_number: invoiceNo,
        p_to_party_name: selectedCustomer.customer_name,
        p_to_party_gstin: selectedCustomer.gstin || null,
        p_vehicle_number: null,
        p_purpose: null,
        p_notes: null,
        p_items: rpcItems,
        p_created_by: user.id,
        p_customer_id: selectedCustomer.id,
        p_challan_date: invoiceDate || null,
        p_po_no: poNo || null,
        p_po_date: poDate || null,
        p_lr_no: lrNo || null,
        p_eway_no: ewayNo || null,
        p_delivery_mode: deliveryMode || null,
        p_payment_method: paymentMethod || null
      });

      if (error) throw error;

      const { data: challanRow } = await supabase.from('delivery_challans_outward').select('*').eq('id', challanId).single();

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
                challan_id: challanId,
                amount: totals.grand,
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
          console.error('Failed to create challan QR', e);
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
        meta: { label: 'Delivery Challan (Outward)', number: invoiceNo || 'DC-0001', date: new Date().toLocaleDateString() },
        items: items.map((it: any) => ({
          name: it.product_name,
          hsn: it.hsn_code,
          qty: it.quantity,
          rate: it.selling_price,
          tax: it.est_gst_rate > 0 ? `${it.est_gst_rate}%` : undefined,
          amount: ((it.quantity * it.selling_price) - (it.discount_value || 0)) * (1 + (it.est_gst_rate || 0) / 100)
        })),
        totals: {
          subtotal: items.reduce((s: number, it: any) => s + (it.quantity * it.selling_price) - (it.discount_value || 0), 0),
          grand_total: items.reduce((s: number, it: any) => {
            const base = (it.quantity * it.selling_price) - (it.discount_value || 0);
            return s + base + (base * (it.est_gst_rate || 0) / 100);
          }, 0)
        },
        footer: {
          stamp_url: brandingInfo?.stamp_url
        },
        bill_number_code_type: brandingInfo?.bill_number_code_type || 'none',
        upi_payment: (paymentMethod === 'credit' && brandingInfo?.show_upi_qr_on_credit)
          ? (useRazorpayQr
              ? (qrImageUrl ? { qr_image_url: qrImageUrl, amount: totals.grand } : undefined)
              : (branchInfo?.upi_id ? { upi_id: branchInfo.upi_id, payee_name: tenantData?.business_name || 'Merchant', amount: totals.grand } : undefined))
          : undefined
      };
      if (supabase && currentTenantId) {
        await printBillForChannel(supabase, currentTenantId, 'delivery_challan_out', billData, 'A4');
      }

      setSuccessInvoice(challanRow);
      toast.success('Delivery Challan created successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create delivery challan');
    } finally {
      setSaving(false);
    }
  };""".encode('utf-8')).decode('utf-8')

patch_file('src/components/retail/CreateDeliveryChallanOutward.tsx', target_b64, repl_b64)
