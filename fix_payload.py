import sys

with open('src/components/retail/DeliveryChallanInwardList.tsx', 'r') as f:
    content = f.read()

start_str = "      const editPayload = {"
start_idx = content.find(start_str)
if start_idx == -1:
    print("Not found")
    sys.exit(1)

stack = 0
started = False
end_idx = -1
for i in range(start_idx, len(content)):
    if content[i] == '{':
        stack += 1
        started = True
    elif content[i] == '}':
        stack -= 1
    if started and stack == 0:
        end_idx = i + 1
        if i + 1 < len(content) and content[i+1] == ';':
            end_idx += 1
        break

old_block = content[start_idx:end_idx]

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

content = content.replace(old_block, new_block)

with open('src/components/retail/DeliveryChallanInwardList.tsx', 'w') as f:
    f.write(content)
print("Done")
