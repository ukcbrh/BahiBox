import fs from 'fs';

function applyPatch(file, target, replacement, description) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(file, content, 'utf8');
    console.log(`[SUCCESS] Patched: ${description}`);
  } else {
    console.error(`[ERROR] Target not found for: ${description}`);
  }
}

// INWARD
// A1
applyPatch('src/components/retail/RetailPOSFullScreen.tsx',
`    const { data: prodData } = await supabase.from('products').select('id, product_name, purchase_price').eq('tenant_id', currentTenantId).eq('is_active', true).order('product_name');`,
`    const { data: prodData } = await supabase.from('products').select('id, product_name, purchase_price, mrp, w_sale_price, hsn_code, sku, barcode, batch, mfg_date, exp_date, size, colour, imei1, imei2, kitchen, description, sales_unit, sales_alt_unit, conv, min_stock, status, g_down, rack, def_qty, part_no, cmb_gst, discount').eq('tenant_id', currentTenantId).eq('is_active', true).order('product_name');`,
'A1');

// A2
applyPatch('src/components/retail/RetailPOSFullScreen.tsx',
`  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('delivery_challan_inward_columns');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return { unit_cost: true, batch_number: true, expiry_date: true, mfg_date: false, size: false, colour: false, hsn_code: true, mrp: true, discount: false };
  });`,
`  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('delivery_challan_inward_columns');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      unit_cost: true, batch_number: true, expiry_date: true, mfg_date: false, size: false, colour: false,
      hsn_code: true, mrp: true, w_sale_price: false, discount: false,
      sku: false, barcode: false, imei1: false, imei2: false, kitchen: false, description: false,
      sales_unit: false, sales_alt_unit: false, conv: false, min_stock: false, status: false,
      g_down: false, rack: false, def_qty: false, part_no: false, cmb_gst: false
    };
  });`,
'A2');

// A3
applyPatch('src/components/retail/RetailPOSFullScreen.tsx',
`  const addProductItem = (p: any) => {
    setItems(prev => [...prev, { product_id: p.id, item_name: p.product_name, quantity: '1', remarks: '', unit_cost: p.purchase_price || '', batch_number: '', expiry_date: '', mfg_date: '', size: '', colour: '', hsn_code: '', mrp: '', discount: '' } as any]);
    setProductSearch('');
  };`,
`  const addProductItem = (p: any) => {
    setItems(prev => [...prev, {
      product_id: p.id, item_name: p.product_name, quantity: '1', remarks: '',
      unit_cost: p.purchase_price || '', batch_number: p.batch || '', expiry_date: p.exp_date || '', mfg_date: p.mfg_date || '',
      size: p.size || '', colour: p.colour || '', hsn_code: p.hsn_code || '', mrp: p.mrp || '', w_sale_price: p.w_sale_price || '',
      discount: p.discount || '', sku: p.sku || '', barcode: p.barcode || '', imei1: p.imei1 || '', imei2: p.imei2 || '',
      kitchen: p.kitchen || '', description: p.description || '', sales_unit: p.sales_unit || '', sales_alt_unit: p.sales_alt_unit || '',
      conv: p.conv || '', min_stock: p.min_stock || '', status: p.status || '', g_down: p.g_down || '', rack: p.rack || '',
      def_qty: p.def_qty || '', part_no: p.part_no || '', cmb_gst: p.cmb_gst || ''
    } as any]);
    setProductSearch('');
  };`,
'A3');

// A4
applyPatch('src/components/retail/RetailPOSFullScreen.tsx',
`                    {visibleColumns.discount && (
                      <Input type="number" placeholder="Discount" className="w-20 h-8 text-xs" value={item.discount} onChange={(e) => updateItem(idx, 'discount', e.target.value)} />
                    )}
                    <Input placeholder="Remarks" className="w-28 h-8 text-xs" value={item.remarks} onChange={(e) => updateItem(idx, 'remarks', e.target.value)} />
                  </div>
                </div>
              ))}
            </div>`,
`                    {visibleColumns.discount && (
                      <Input type="number" placeholder="Discount" className="w-20 h-8 text-xs" value={item.discount} onChange={(e) => updateItem(idx, 'discount', e.target.value)} />
                    )}
{visibleColumns.w_sale_price && (
  <Input type="number" placeholder="W.Sale Price" className="w-24 h-8 text-xs" value={item.w_sale_price} onChange={(e) => updateItem(idx, 'w_sale_price', e.target.value)} />
)}
{visibleColumns.sku && (
  <Input placeholder="SKU" className="w-24 h-8 text-xs" value={item.sku} onChange={(e) => updateItem(idx, 'sku', e.target.value)} />
)}
{visibleColumns.barcode && (
  <Input placeholder="Barcode" className="w-28 h-8 text-xs" value={item.barcode} onChange={(e) => updateItem(idx, 'barcode', e.target.value)} />
)}
{visibleColumns.imei1 && (
  <Input placeholder="IMEI 1" className="w-28 h-8 text-xs" value={item.imei1} onChange={(e) => updateItem(idx, 'imei1', e.target.value)} />
)}
{visibleColumns.imei2 && (
  <Input placeholder="IMEI 2" className="w-28 h-8 text-xs" value={item.imei2} onChange={(e) => updateItem(idx, 'imei2', e.target.value)} />
)}
{visibleColumns.kitchen && (
  <Input placeholder="Kitchen" className="w-24 h-8 text-xs" value={item.kitchen} onChange={(e) => updateItem(idx, 'kitchen', e.target.value)} />
)}
{visibleColumns.description && (
  <Input placeholder="Description" className="w-32 h-8 text-xs" value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} />
)}
{visibleColumns.sales_unit && (
  <Input placeholder="Sales Unit" className="w-24 h-8 text-xs" value={item.sales_unit} onChange={(e) => updateItem(idx, 'sales_unit', e.target.value)} />
)}
{visibleColumns.sales_alt_unit && (
  <Input placeholder="Alt Unit" className="w-24 h-8 text-xs" value={item.sales_alt_unit} onChange={(e) => updateItem(idx, 'sales_alt_unit', e.target.value)} />
)}
{visibleColumns.conv && (
  <Input type="number" placeholder="Conv" className="w-20 h-8 text-xs" value={item.conv} onChange={(e) => updateItem(idx, 'conv', e.target.value)} />
)}
{visibleColumns.min_stock && (
  <Input type="number" placeholder="Min Stock" className="w-24 h-8 text-xs" value={item.min_stock} onChange={(e) => updateItem(idx, 'min_stock', e.target.value)} />
)}
{visibleColumns.status && (
  <Input placeholder="Status" className="w-24 h-8 text-xs" value={item.status} onChange={(e) => updateItem(idx, 'status', e.target.value)} />
)}
{visibleColumns.g_down && (
  <Input placeholder="Godown" className="w-24 h-8 text-xs" value={item.g_down} onChange={(e) => updateItem(idx, 'g_down', e.target.value)} />
)}
{visibleColumns.rack && (
  <Input placeholder="Rack" className="w-20 h-8 text-xs" value={item.rack} onChange={(e) => updateItem(idx, 'rack', e.target.value)} />
)}
{visibleColumns.def_qty && (
  <Input type="number" placeholder="Def Qty" className="w-20 h-8 text-xs" value={item.def_qty} onChange={(e) => updateItem(idx, 'def_qty', e.target.value)} />
)}
{visibleColumns.part_no && (
  <Input placeholder="Part No" className="w-24 h-8 text-xs" value={item.part_no} onChange={(e) => updateItem(idx, 'part_no', e.target.value)} />
)}
{visibleColumns.cmb_gst && (
  <Input placeholder="Comb. GST" className="w-24 h-8 text-xs" value={item.cmb_gst} onChange={(e) => updateItem(idx, 'cmb_gst', e.target.value)} />
)}
                    <Input placeholder="Remarks" className="w-28 h-8 text-xs" value={item.remarks} onChange={(e) => updateItem(idx, 'remarks', e.target.value)} />
                  </div>
                </div>
              ))}
            </div>`,
'A4');

// A5
applyPatch('src/components/retail/RetailPOSFullScreen.tsx',
`      p_items: items.map(i => ({
        product_id: i.product_id,
        item_name: i.item_name,
        quantity: parseFloat(i.quantity) || 1,
        remarks: i.remarks || null,
        unit_cost: i.unit_cost || null,
        batch_number: i.batch_number || null,
        expiry_date: i.expiry_date || null,
        mfg_date: i.mfg_date || null,
        size: i.size || null,
        colour: i.colour || null,
        hsn_code: i.hsn_code || null,
        mrp: i.mrp || null,
        discount: i.discount || null
      })),`,
`      p_items: items.map(i => ({
        product_id: i.product_id,
        item_name: i.item_name,
        quantity: parseFloat(i.quantity) || 1,
        remarks: i.remarks || null,
        unit_cost: i.unit_cost || null,
        batch_number: i.batch_number || null,
        expiry_date: i.expiry_date || null,
        mfg_date: i.mfg_date || null,
        size: i.size || null,
        colour: i.colour || null,
        hsn_code: i.hsn_code || null,
        mrp: i.mrp || null,
        discount: i.discount || null,
        sku: i.sku || null,
        barcode: i.barcode || null,
        w_sale_price: i.w_sale_price || null,
        imei1: i.imei1 || null,
        imei2: i.imei2 || null,
        kitchen: i.kitchen || null,
        description: i.description || null,
        sales_unit: i.sales_unit || null,
        sales_alt_unit: i.sales_alt_unit || null,
        conv: i.conv || null,
        min_stock: i.min_stock || null,
        status: i.status || null,
        g_down: i.g_down || null,
        rack: i.rack || null,
        def_qty: i.def_qty || null,
        part_no: i.part_no || null,
        cmb_gst: i.cmb_gst || null
      })),`,
'A5');

// OUTWARD
// B1
applyPatch('src/components/retail/RetailPOSFullScreen.tsx',
`    const { data: prodData } = await supabase.from('products').select('id, product_name, selling_price').eq('tenant_id', currentTenantId).eq('is_active', true).order('product_name');`,
`    const { data: prodData } = await supabase.from('products').select('id, product_name, selling_price, mrp, w_sale_price, hsn_code, sku, barcode, batch, mfg_date, exp_date, size, colour, imei1, imei2, kitchen, description, sales_unit, sales_alt_unit, conv, min_stock, status, g_down, rack, def_qty, part_no, cmb_gst').eq('tenant_id', currentTenantId).eq('is_active', true).order('product_name');`,
'B1');

// B2
applyPatch('src/components/retail/RetailPOSFullScreen.tsx',
`  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('delivery_challan_outward_columns');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return { unit_price: true, discount_value: false };
  });`,
`  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('delivery_challan_outward_columns');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return { unit_price: true, discount_value: false, batch_number: false, expiry_date: false, mfg_date: false, size: false, colour: false, hsn_code: false, mrp: false, w_sale_price: false, sku: false, barcode: false, imei1: false, imei2: false, kitchen: false, description: false, sales_unit: false, sales_alt_unit: false, conv: false, min_stock: false, status: false, g_down: false, rack: false, def_qty: false, part_no: false, cmb_gst: false };
  });`,
'B2');

// B3
applyPatch('src/components/retail/RetailPOSFullScreen.tsx',
`  const addProductItem = (p: any) => {
    setItems(prev => [...prev, { product_id: p.id, item_name: p.product_name, quantity: '1', remarks: '', unit_price: p.selling_price || '', discount_type: 'fixed', discount_value: '' }]);
    setProductSearch('');
  };`,
`  const addProductItem = (p: any) => {
    setItems(prev => [...prev, {
      product_id: p.id, item_name: p.product_name, quantity: '1', remarks: '',
      unit_price: p.selling_price || '', discount_type: 'fixed', discount_value: '',
      batch_number: p.batch || '', expiry_date: p.exp_date || '', mfg_date: p.mfg_date || '',
      size: p.size || '', colour: p.colour || '', hsn_code: p.hsn_code || '', mrp: p.mrp || '', w_sale_price: p.w_sale_price || '',
      sku: p.sku || '', barcode: p.barcode || '', imei1: p.imei1 || '', imei2: p.imei2 || '',
      kitchen: p.kitchen || '', description: p.description || '', sales_unit: p.sales_unit || '', sales_alt_unit: p.sales_alt_unit || '',
      conv: p.conv || '', min_stock: p.min_stock || '', status: p.status || '', g_down: p.g_down || '', rack: p.rack || '',
      def_qty: p.def_qty || '', part_no: p.part_no || '', cmb_gst: p.cmb_gst || ''
    } as any]);
    setProductSearch('');
  };`,
'B3');

// B4
applyPatch('src/components/retail/RetailPOSFullScreen.tsx',
`              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center border border-slate-100 dark:border-slate-800 rounded-lg p-2">
                  <span className="flex-1 text-sm font-medium">{item.item_name}</span>
                  <Input type="number" placeholder="Qty" className="w-20 h-9" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} />
                  {visibleColumns.unit_price && (
                    <Input type="number" placeholder="Price ₹" className="w-24 h-9" value={item.unit_price} onChange={(e) => updateItem(idx, 'unit_price', e.target.value)} />
                  )}
                  {visibleColumns.discount_value && (
                    <Input type="number" placeholder="Discount" className="w-24 h-9" value={item.discount_value} onChange={(e) => updateItem(idx, 'discount_value', e.target.value)} />
                  )}
                  <Input placeholder="Remarks" className="w-32 h-9" value={item.remarks} onChange={(e) => updateItem(idx, 'remarks', e.target.value)} />
                  <button onClick={() => removeItem(idx)} className="text-red-500"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>`,
`              {items.map((item, idx) => (
                <div key={idx} className="flex flex-col gap-2 border border-slate-100 dark:border-slate-800 rounded-lg p-2">
                  <div className="flex gap-2 items-center">
                    <span className="flex-1 text-sm font-medium">{item.item_name}</span>
                    <Input type="number" placeholder="Qty" className="w-20 h-9" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} />
                    {visibleColumns.unit_price && (
                      <Input type="number" placeholder="Price ₹" className="w-24 h-9" value={item.unit_price} onChange={(e) => updateItem(idx, 'unit_price', e.target.value)} />
                    )}
                    {visibleColumns.discount_value && (
                      <Input type="number" placeholder="Discount" className="w-24 h-9" value={item.discount_value} onChange={(e) => updateItem(idx, 'discount_value', e.target.value)} />
                    )}
                    <button onClick={() => removeItem(idx)} className="text-red-500"><Trash2 size={14} /></button>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    {visibleColumns.batch_number && (
                      <Input placeholder="Batch" className="w-24 h-8 text-xs" value={item.batch_number} onChange={(e) => updateItem(idx, 'batch_number', e.target.value)} />
                    )}
                    {visibleColumns.expiry_date && (
                      <Input type="date" placeholder="Expiry" className="w-32 h-8 text-xs" value={item.expiry_date} onChange={(e) => updateItem(idx, 'expiry_date', e.target.value)} />
                    )}
                    {visibleColumns.mfg_date && (
                      <Input type="date" placeholder="Mfg Date" className="w-32 h-8 text-xs" value={item.mfg_date} onChange={(e) => updateItem(idx, 'mfg_date', e.target.value)} />
                    )}
                    {visibleColumns.size && (
                      <Input placeholder="Size" className="w-20 h-8 text-xs" value={item.size} onChange={(e) => updateItem(idx, 'size', e.target.value)} />
                    )}
                    {visibleColumns.colour && (
                      <Input placeholder="Colour" className="w-20 h-8 text-xs" value={item.colour} onChange={(e) => updateItem(idx, 'colour', e.target.value)} />
                    )}
                    {visibleColumns.hsn_code && (
                      <Input placeholder="HSN" className="w-20 h-8 text-xs" value={item.hsn_code} onChange={(e) => updateItem(idx, 'hsn_code', e.target.value)} />
                    )}
                    {visibleColumns.mrp && (
                      <Input type="number" placeholder="MRP" className="w-20 h-8 text-xs" value={item.mrp} onChange={(e) => updateItem(idx, 'mrp', e.target.value)} />
                    )}
{visibleColumns.w_sale_price && (
  <Input type="number" placeholder="W.Sale Price" className="w-24 h-8 text-xs" value={item.w_sale_price} onChange={(e) => updateItem(idx, 'w_sale_price', e.target.value)} />
)}
{visibleColumns.sku && (
  <Input placeholder="SKU" className="w-24 h-8 text-xs" value={item.sku} onChange={(e) => updateItem(idx, 'sku', e.target.value)} />
)}
{visibleColumns.barcode && (
  <Input placeholder="Barcode" className="w-28 h-8 text-xs" value={item.barcode} onChange={(e) => updateItem(idx, 'barcode', e.target.value)} />
)}
{visibleColumns.imei1 && (
  <Input placeholder="IMEI 1" className="w-28 h-8 text-xs" value={item.imei1} onChange={(e) => updateItem(idx, 'imei1', e.target.value)} />
)}
{visibleColumns.imei2 && (
  <Input placeholder="IMEI 2" className="w-28 h-8 text-xs" value={item.imei2} onChange={(e) => updateItem(idx, 'imei2', e.target.value)} />
)}
{visibleColumns.kitchen && (
  <Input placeholder="Kitchen" className="w-24 h-8 text-xs" value={item.kitchen} onChange={(e) => updateItem(idx, 'kitchen', e.target.value)} />
)}
{visibleColumns.description && (
  <Input placeholder="Description" className="w-32 h-8 text-xs" value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} />
)}
{visibleColumns.sales_unit && (
  <Input placeholder="Sales Unit" className="w-24 h-8 text-xs" value={item.sales_unit} onChange={(e) => updateItem(idx, 'sales_unit', e.target.value)} />
)}
{visibleColumns.sales_alt_unit && (
  <Input placeholder="Alt Unit" className="w-24 h-8 text-xs" value={item.sales_alt_unit} onChange={(e) => updateItem(idx, 'sales_alt_unit', e.target.value)} />
)}
{visibleColumns.conv && (
  <Input type="number" placeholder="Conv" className="w-20 h-8 text-xs" value={item.conv} onChange={(e) => updateItem(idx, 'conv', e.target.value)} />
)}
{visibleColumns.min_stock && (
  <Input type="number" placeholder="Min Stock" className="w-24 h-8 text-xs" value={item.min_stock} onChange={(e) => updateItem(idx, 'min_stock', e.target.value)} />
)}
{visibleColumns.status && (
  <Input placeholder="Status" className="w-24 h-8 text-xs" value={item.status} onChange={(e) => updateItem(idx, 'status', e.target.value)} />
)}
{visibleColumns.g_down && (
  <Input placeholder="Godown" className="w-24 h-8 text-xs" value={item.g_down} onChange={(e) => updateItem(idx, 'g_down', e.target.value)} />
)}
{visibleColumns.rack && (
  <Input placeholder="Rack" className="w-20 h-8 text-xs" value={item.rack} onChange={(e) => updateItem(idx, 'rack', e.target.value)} />
)}
{visibleColumns.def_qty && (
  <Input type="number" placeholder="Def Qty" className="w-20 h-8 text-xs" value={item.def_qty} onChange={(e) => updateItem(idx, 'def_qty', e.target.value)} />
)}
{visibleColumns.part_no && (
  <Input placeholder="Part No" className="w-24 h-8 text-xs" value={item.part_no} onChange={(e) => updateItem(idx, 'part_no', e.target.value)} />
)}
{visibleColumns.cmb_gst && (
  <Input placeholder="Comb. GST" className="w-24 h-8 text-xs" value={item.cmb_gst} onChange={(e) => updateItem(idx, 'cmb_gst', e.target.value)} />
)}
                    <Input placeholder="Remarks" className="w-28 h-8 text-xs" value={item.remarks} onChange={(e) => updateItem(idx, 'remarks', e.target.value)} />
                  </div>
                </div>
              ))}
            </div>`,
'B4');

// B5
applyPatch('src/components/retail/RetailPOSFullScreen.tsx',
`      p_items: items.map(i => ({
        product_id: i.product_id,
        item_name: i.item_name,
        quantity: parseFloat(i.quantity) || 1,
        remarks: i.remarks || null,
        unit_price: i.unit_price || null,
        discount_type: i.discount_type || null,
        discount_value: i.discount_value || null
      })),`,
`      p_items: items.map(i => ({
        product_id: i.product_id,
        item_name: i.item_name,
        quantity: parseFloat(i.quantity) || 1,
        remarks: i.remarks || null,
        unit_price: i.unit_price || null,
        discount_type: i.discount_type || null,
        discount_value: i.discount_value || null,
        sku: i.sku || null,
        barcode: i.barcode || null,
        mrp: i.mrp || null,
        w_sale_price: i.w_sale_price || null,
        batch_number: i.batch_number || null,
        expiry_date: i.expiry_date || null,
        mfg_date: i.mfg_date || null,
        size: i.size || null,
        colour: i.colour || null,
        hsn_code: i.hsn_code || null,
        imei1: i.imei1 || null,
        imei2: i.imei2 || null,
        kitchen: i.kitchen || null,
        description: i.description || null,
        sales_unit: i.sales_unit || null,
        sales_alt_unit: i.sales_alt_unit || null,
        conv: i.conv || null,
        min_stock: i.min_stock || null,
        status: i.status || null,
        g_down: i.g_down || null,
        rack: i.rack || null,
        def_qty: i.def_qty || null,
        part_no: i.part_no || null,
        cmb_gst: i.cmb_gst || null
      })),`,
'B5');

