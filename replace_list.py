import sys

with open('src/components/retail/DeliveryChallanInwardList.tsx', 'r') as f:
    content = f.read()

# STEP 1
content = content.replace("import { DeliveryChallanInwardPage } from './RetailPOSFullScreen';", "import { CreateDeliveryChallanInward } from './CreateDeliveryChallanInward';")

# STEP 2
content = content.replace("return <DeliveryChallanInwardPage onBack={() => { setIsCreating(false); setEditData(null); fetchChallans(); }} editData={editData} />;", "return <CreateDeliveryChallanInward onBack={() => { setIsCreating(false); setEditData(null); fetchChallans(); }} editData={editData} />;")

# STEP 3
old_block = """      const editPayload = {
        supplierId: challan.supplier_id || '',
        fromParty: challan.from_party_name,
        fromGstin: challan.from_party_gstin,
        vehicleNumber: challan.vehicle_number,
        purpose: challan.purpose,
        notes: challan.notes,
        items: (challan.delivery_challan_inward_items || []).map((item: any) => ({
          product_id: item.product_id,
          item_name: item.item_name,
          quantity: String(item.quantity),
          remarks: item.remarks || '',
          unit_cost: item.unit_cost || '',
          batch_number: item.batch_number || '',
          expiry_date: item.expiry_date || '',
          mfg_date: item.mfg_date || '',
          size: item.size || '',
          colour: item.colour || '',
          hsn_code: item.hsn_code || '',
          mrp: item.mrp || '',
          discount: item.discount || ''
        }))
      };"""

new_block = """      const editPayload = {
        supplierId: challan.supplier_id || '',
        selectedSupplier: challan.supplier_id ? { id: challan.supplier_id, supplier_name: challan.from_party_name, gstin: challan.from_party_gstin } : null,
        invoiceNo: challan.challan_number,
        items: (challan.delivery_challan_inward_items || []).map((item: any) => ({
          id: Math.random().toString(),
          product_id: item.product_id,
          name: item.item_name,
          qty: Number(item.quantity) || 1,
          price: Number(item.unit_cost) || 0,
          tax_rate: (Number(item.cgst) || 0) + (Number(item.sgst) || 0) + (Number(item.igst) || 0),
          p_tax: false,
          batch: item.batch_number || '',
          mrp: Number(item.mrp) || 0,
          discount: Number(item.discount) || 0,
          exp_date: item.expiry_date || '',
          mfg_date: item.mfg_date || '',
          size: item.size || '',
          colour: item.colour || '',
          sku: item.sku || '',
          barcode: item.barcode || '',
          selling_price: 0,
          w_sale_price: Number(item.w_sale_price) || 0,
          imei1: item.imei1 || '',
          imei2: item.imei2 || '',
          kitchen: item.kitchen || '',
          description: item.description || '',
          sales_unit: item.sales_unit || '',
          sales_alt_unit: item.sales_alt_unit || '',
          conv: item.conv || '',
          min_stock: Number(item.min_stock) || 0,
          status: item.status || '',
          g_down: item.g_down || '',
          rack: item.rack || '',
          def_qty: Number(item.def_qty) || 0,
          part_no: item.part_no || '',
          hsn_code: item.hsn_code || '',
          cmb_gst: item.cmb_gst || ''
        }))
      };"""

if old_block in content:
    content = content.replace(old_block, new_block)
    print("Step 3 applied successfully.")
else:
    print("Warning: old block not found.")

with open('src/components/retail/DeliveryChallanInwardList.tsx', 'w') as f:
    f.write(content)
