import re

with open("src/components/retail/CreatePurchaseInvoice.tsx", "r") as f:
    text = f.read()

# Add new states
imports_to_add = "import { Settings } from 'lucide-react';"
if "Settings" not in text:
    text = text.replace("import { Plus, Edit2, RotateCcw, Save, Printer, ArrowLeft, Trash2, Settings, MoreVertical, X } from 'lucide-react';", 
                        "import { Plus, Edit2, RotateCcw, Save, Printer, ArrowLeft, Trash2, Settings, MoreVertical, X } from 'lucide-react';")

# Replace states and useEffect
state_hook_regex = re.compile(r"const \[loading, setLoading\] = useState\(false\);")

new_states = """const [loading, setLoading] = useState(false);
  const [isSupplierFocused, setIsSupplierFocused] = useState(false);
  const [isItemFocused, setIsItemFocused] = useState(false);

  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('purchase_invoice_columns');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      batch: false,
      mrp: false,
      discount: false,
      exp_date: false,
      mfg_date: false,
      size: false,
      colour: false,
    };
  });
  const [showColumnSettings, setShowColumnSettings] = useState(false);

  useEffect(() => {
    localStorage.setItem('purchase_invoice_columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);
"""

text = state_hook_regex.sub(new_states, text)

# Handle add item
old_handle_add = """  const handleAddItem = (prod: any) => {
    setItems([...items, { 
      id: Math.random().toString(), 
      product_id: prod.id, 
      name: prod.product_name, 
      qty: 1, 
      price: prod.purchase_price || 0,
      tax_rate: prod.igst ? parseFloat(prod.igst) : 0,
      p_tax: prod.p_tax === 1 || prod.p_tax === '1'
    }]);
    setSearchTerm('');
  };"""

new_handle_add = """  const handleAddItem = (prod: any) => {
    setItems([...items, { 
      id: Math.random().toString(), 
      product_id: prod.id, 
      name: prod.product_name, 
      qty: 1, 
      price: prod.purchase_price || 0,
      tax_rate: prod.igst ? parseFloat(prod.igst) : 0,
      p_tax: prod.p_tax === 1 || prod.p_tax === '1',
      batch: '',
      mrp: prod.mrp || 0,
      discount: 0,
      exp_date: '',
      mfg_date: '',
      size: '',
      colour: ''
    }]);
    setSearchTerm('');
    setIsItemFocused(false);
  };

  const handleSupplierKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && supplierSearchTerm) {
      e.preventDefault();
      const existing = suppliers.find(s => s.supplier_name.toLowerCase() === supplierSearchTerm.toLowerCase());
      if (existing) {
        setSupplierId(existing.id);
        setSupplierSearchTerm(existing.supplier_name);
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
          toast.success('New supplier added');
        }
        setIsSupplierFocused(false);
      }
    }
  };
"""
text = text.replace(old_handle_add, new_handle_add)

# Fix supplier autocomplete
old_supplier = """<div className="relative w-full">
                <Input
                  className="h-9 w-full"
                  placeholder="Type to search supplier..."
                  value={supplierSearchTerm}
                  onChange={e => {
                    setSupplierSearchTerm(e.target.value);
                    if (supplierId) setSupplierId('');
                  }}
                />
                {supplierSearchTerm && !supplierId && (
                  <div className="absolute z-50 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-[200px] overflow-y-auto mt-1">
                    {suppliers.filter(s => s.supplier_name.toLowerCase().includes(supplierSearchTerm.toLowerCase())).length > 0 ? (
                      suppliers.filter(s => s.supplier_name.toLowerCase().includes(supplierSearchTerm.toLowerCase())).map(s => (
                        <div
                          key={s.id}
                          className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm"
                          onClick={() => {
                            setSupplierId(s.id);
                            setSupplierSearchTerm(s.supplier_name);
                          }}
                        >
                          {s.supplier_name}
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-slate-500 text-sm">No suppliers found</div>
                    )}
                  </div>
                )}
              </div>"""

new_supplier = """<div className="relative w-full">
                <Input
                  className="h-9 w-full"
                  placeholder="Type to search supplier..."
                  value={supplierSearchTerm}
                  onChange={e => {
                    setSupplierSearchTerm(e.target.value);
                    if (supplierId) setSupplierId('');
                  }}
                  onFocus={() => setIsSupplierFocused(true)}
                  onBlur={() => setTimeout(() => setIsSupplierFocused(false), 200)}
                  onKeyDown={handleSupplierKeyDown}
                />
                {isSupplierFocused && (
                  <div className="absolute z-50 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-[200px] overflow-y-auto mt-1">
                    {suppliers.filter(s => s.supplier_name.toLowerCase().includes(supplierSearchTerm.toLowerCase())).length > 0 ? (
                      suppliers.filter(s => s.supplier_name.toLowerCase().includes(supplierSearchTerm.toLowerCase())).map(s => (
                        <div
                          key={s.id}
                          className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm"
                          onClick={() => {
                            setSupplierId(s.id);
                            setSupplierSearchTerm(s.supplier_name);
                            setIsSupplierFocused(false);
                          }}
                        >
                          {s.supplier_name}
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-slate-500 text-sm">
                        No suppliers found. Press Enter to add "{supplierSearchTerm}"
                      </div>
                    )}
                  </div>
                )}
              </div>"""
text = text.replace(old_supplier, new_supplier)

# Fix item table and add column settings
old_item_table = """{/* Item Details Table */}
      <Card className="shadow-sm border-slate-200 overflow-visible">
        <div className="overflow-visible">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-4 py-2 font-medium text-left">Item Name</th>
                <th className="px-4 py-2 font-medium text-right w-24">Qty</th>
                <th className="px-4 py-2 font-medium text-right w-32">Price (Inc/Exc)</th>
                <th className="px-4 py-2 font-medium text-right w-24">Tax %</th>
                <th className="px-4 py-2 font-medium text-right w-32">Amount</th>
                <th className="px-4 py-2 font-medium w-12 text-center"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <div>{item.name}</div>
                    <div className="text-[10px] text-slate-400">{item.p_tax ? 'Tax Inclusive' : 'Tax Exclusive'}</div>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Input 
                      type="number" 
                      className="h-8 text-right w-full" 
                      value={item.qty}
                      onChange={e => updateItem(item.id, 'qty', parseFloat(e.target.value) || 0)}
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Input 
                      type="number" 
                      className="h-8 text-right w-full" 
                      value={item.price}
                      onChange={e => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                    />
                  </td>
                  <td className="px-4 py-2 text-right text-slate-600">{item.tax_rate}%</td>
                  <td className="px-4 py-2 text-right font-medium">₹ {(item.p_tax ? (item.qty * item.price) : (item.qty * item.price * (1 + item.tax_rate / 100))).toFixed(2)}</td>
                  <td className="px-4 py-2 text-center">
                    <button onClick={() => removeItem(item.id)} className="text-slate-400 hover:text-red-500">
                      <X className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              <tr>
                <td className="px-4 py-2 relative" colSpan={6}>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Type to search and select item..." 
                      className="h-9 w-full max-w-md"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                  {searchTerm && (
                    <div className="absolute z-50 w-full max-w-md bg-white border border-slate-200 rounded-md shadow-lg max-h-[200px] overflow-y-auto mt-1">
                      {filteredProducts.length > 0 ? (
                        filteredProducts.map(p => (
                          <div 
                            key={p.id} 
                            className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex justify-between items-center"
                            onClick={() => handleAddItem(p)}
                          >
                            <span>{p.product_name}</span>
                            <span className="text-slate-500 text-xs">₹{p.purchase_price}</span>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-slate-500 text-sm">No items found</div>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>"""

new_item_table = """{/* Item Details Table */}
      <Card className="shadow-sm border-slate-200 overflow-visible relative">
        <div className="flex justify-between items-center p-2 bg-slate-50 border-b border-slate-200 rounded-t-md">
          <span className="text-sm font-semibold text-slate-700 ml-2">Items</span>
          <div className="relative">
            <Button 
              variant="outline" 
              className="h-8 text-xs bg-white text-slate-600" 
              onClick={() => setShowColumnSettings(!showColumnSettings)}
            >
              <Settings className="h-3.5 w-3.5 mr-1" /> Columns
            </Button>
            {showColumnSettings && (
              <div className="absolute right-0 top-10 w-48 bg-white rounded-md shadow-lg border border-slate-200 z-50 p-2">
                <div className="text-xs font-semibold text-slate-500 mb-2 px-1 uppercase">Visible Columns</div>
                {Object.keys(visibleColumns).map(col => (
                  <label key={col} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer text-sm">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-[#00b884] focus:ring-[#00b884]"
                      checked={visibleColumns[col as keyof typeof visibleColumns]}
                      onChange={() => setVisibleColumns(prev => ({ ...prev, [col]: !prev[col as keyof typeof visibleColumns] }))}
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
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-4 py-2 font-medium text-left min-w-[200px]">Item Name</th>
                {visibleColumns.batch && <th className="px-4 py-2 font-medium text-left w-24">Batch</th>}
                {visibleColumns.mfg_date && <th className="px-4 py-2 font-medium text-left w-32">Mfg Date</th>}
                {visibleColumns.exp_date && <th className="px-4 py-2 font-medium text-left w-32">Exp Date</th>}
                {visibleColumns.size && <th className="px-4 py-2 font-medium text-left w-20">Size</th>}
                {visibleColumns.colour && <th className="px-4 py-2 font-medium text-left w-20">Colour</th>}
                <th className="px-4 py-2 font-medium text-right w-24">Qty</th>
                {visibleColumns.mrp && <th className="px-4 py-2 font-medium text-right w-24">MRP</th>}
                <th className="px-4 py-2 font-medium text-right w-32">Price (Inc/Exc)</th>
                {visibleColumns.discount && <th className="px-4 py-2 font-medium text-right w-24">Disc %</th>}
                <th className="px-4 py-2 font-medium text-right w-24">Tax %</th>
                <th className="px-4 py-2 font-medium text-right w-32">Amount</th>
                <th className="px-4 py-2 font-medium w-12 text-center"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <div className="font-medium text-slate-800">{item.name}</div>
                    <div className="text-[10px] text-slate-400">{item.p_tax ? 'Tax Inclusive' : 'Tax Exclusive'}</div>
                  </td>
                  {visibleColumns.batch && (
                    <td className="px-4 py-2">
                      <Input className="h-8 w-full" value={item.batch} onChange={e => updateItem(item.id, 'batch', e.target.value)} />
                    </td>
                  )}
                  {visibleColumns.mfg_date && (
                    <td className="px-4 py-2">
                      <Input type="date" className="h-8 w-full" value={item.mfg_date} onChange={e => updateItem(item.id, 'mfg_date', e.target.value)} />
                    </td>
                  )}
                  {visibleColumns.exp_date && (
                    <td className="px-4 py-2">
                      <Input type="date" className="h-8 w-full" value={item.exp_date} onChange={e => updateItem(item.id, 'exp_date', e.target.value)} />
                    </td>
                  )}
                  {visibleColumns.size && (
                    <td className="px-4 py-2">
                      <Input className="h-8 w-full" value={item.size} onChange={e => updateItem(item.id, 'size', e.target.value)} />
                    </td>
                  )}
                  {visibleColumns.colour && (
                    <td className="px-4 py-2">
                      <Input className="h-8 w-full" value={item.colour} onChange={e => updateItem(item.id, 'colour', e.target.value)} />
                    </td>
                  )}
                  <td className="px-4 py-2 text-right">
                    <Input type="number" className="h-8 text-right w-full min-w-[60px]" value={item.qty} onChange={e => updateItem(item.id, 'qty', parseFloat(e.target.value) || 0)} />
                  </td>
                  {visibleColumns.mrp && (
                    <td className="px-4 py-2 text-right">
                      <Input type="number" className="h-8 text-right w-full min-w-[60px]" value={item.mrp} onChange={e => updateItem(item.id, 'mrp', parseFloat(e.target.value) || 0)} />
                    </td>
                  )}
                  <td className="px-4 py-2 text-right">
                    <Input type="number" className="h-8 text-right w-full min-w-[80px]" value={item.price} onChange={e => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)} />
                  </td>
                  {visibleColumns.discount && (
                    <td className="px-4 py-2 text-right">
                      <Input type="number" className="h-8 text-right w-full min-w-[60px]" value={item.discount} onChange={e => updateItem(item.id, 'discount', parseFloat(e.target.value) || 0)} />
                    </td>
                  )}
                  <td className="px-4 py-2 text-right text-slate-600">{item.tax_rate}%</td>
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
                <td className="px-4 py-2 relative" colSpan={12}>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Type to search and select item..." 
                      className="h-9 w-full max-w-md"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      onFocus={() => setIsItemFocused(true)}
                      onBlur={() => setTimeout(() => setIsItemFocused(false), 200)}
                    />
                  </div>
                  {isItemFocused && (
                    <div className="absolute z-50 w-full max-w-md bg-white border border-slate-200 rounded-md shadow-lg max-h-[200px] overflow-y-auto mt-1">
                      {filteredProducts.length > 0 ? (
                        filteredProducts.map(p => (
                          <div 
                            key={p.id} 
                            className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex justify-between items-center"
                            onClick={() => handleAddItem(p)}
                          >
                            <span>{p.product_name}</span>
                            <span className="text-slate-500 text-xs">₹{p.purchase_price}</span>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-slate-500 text-sm">No items found</div>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>"""

text = text.replace(old_item_table, new_item_table)

# update subtotal to consider discount
old_totals = """  let subtotal = 0;
  let taxAmount = 0;

  items.forEach(item => {
    let itemBaseAmount = 0;
    let itemTaxAmount = 0;
    
    if (item.p_tax) {
      // Inclusive tax: price includes tax
      const totalAmount = item.qty * item.price;
      itemBaseAmount = totalAmount / (1 + (item.tax_rate / 100));
      itemTaxAmount = totalAmount - itemBaseAmount;
    } else {
      // Exclusive tax: price is base price
      itemBaseAmount = item.qty * item.price;
      itemTaxAmount = itemBaseAmount * (item.tax_rate / 100);
    }
    
    subtotal += itemBaseAmount;
    taxAmount += itemTaxAmount;
  });
  const grandTotal = subtotal + taxAmount;"""

new_totals = """  let subtotal = 0;
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
  const grandTotal = subtotal + taxAmount;"""

text = text.replace(old_totals, new_totals)

with open("src/components/retail/CreatePurchaseInvoice.tsx", "w") as f:
    f.write(text)

