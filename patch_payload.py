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

target_b64 = base64.b64encode("""      const editPayload = {
        challanNumber: challan.challan_number,
        customerId: challan.customer_id || '',
        toParty: challan.to_party_name,
        toGstin: challan.to_party_gstin,
        vehicleNumber: challan.vehicle_number,
        purpose: challan.purpose,
        notes: challan.notes,
        items: (challan.delivery_challan_outward_items || []).map((item: any) => ({
          product_id: item.product_id,
          item_name: item.item_name,
          quantity: String(item.quantity),
          remarks: item.remarks || '',
          unit_price: item.unit_price || '',
          discount_type: item.discount_type || 'fixed',
          discount_value: item.discount_value || ''
        }))
      };""".encode('utf-8')).decode('utf-8')

repl_b64 = base64.b64encode("""      const editPayload = {
        invoiceNo: challan.challan_number,
        selectedCustomer: challan.customer_id ? { id: challan.customer_id, customer_name: challan.to_party_name, gstin: challan.to_party_gstin } : null,
        items: (challan.delivery_challan_outward_items || []).map((item: any) => ({
          key: `${item.product_id}-${Date.now()}-${Math.random()}`,
          product_id: item.product_id,
          product_name: item.item_name,
          hsn_sac_id: null,
          selling_price: Number(item.unit_price) || 0,
          quantity: Number(item.quantity) || 1,
          discount_type: item.discount_type || 'none',
          discount_value: Number(item.discount_value) || 0,
          est_gst_rate: (Number(item.cgst) || 0) + (Number(item.sgst) || 0) + (Number(item.igst) || 0),
          sku: item.sku || '',
          barcode: item.barcode || '',
          batch: item.batch_number || '',
          mfg_date: item.mfg_date || '',
          exp_date: item.expiry_date || '',
          size: item.size || '',
          colour: item.colour || '',
          mrp: Number(item.mrp) || 0,
          w_sale_price: Number(item.w_sale_price) || 0,
          imei1: item.imei1 || '',
          imei2: item.imei2 || '',
          kitchen: item.kitchen || '',
          category_plus: item.category_plus || '',
          subcategory_plus: item.subcategory_plus || '',
          description: item.description || '',
          gst_plus: item.gst_plus || '',
          sales_unit: item.sales_unit || '',
          sales_alt_unit: item.sales_alt_unit || '',
          conv: item.conv || '',
          min_stock: Number(item.min_stock) || 0,
          status: item.status || '',
          s_tax: Number(item.s_tax) || 0,
          p_tax: Number(item.p_tax) || 0,
          g_down: item.g_down || '',
          rack: item.rack || '',
          def_qty: Number(item.def_qty) || 0,
          part_no: item.part_no || '',
          hsn_code: item.hsn_code || '',
          cmb_gst: item.cmb_gst || '',
          purchase_price: 0,
          opening_stock: 0,
          unit: ''
        }))
      };""".encode('utf-8')).decode('utf-8')

patch_file('src/components/retail/DeliveryChallanOutwardList.tsx', target_b64, repl_b64)
