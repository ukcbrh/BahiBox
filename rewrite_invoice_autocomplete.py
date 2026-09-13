import re

with open("src/components/retail/CreatePurchaseInvoice.tsx", "r") as f:
    text = f.read()

# 1. Add supplierSearchTerm state
text = text.replace(
    "const [supplierId, setSupplierId] = useState('');",
    "const [supplierId, setSupplierId] = useState('');\n  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');"
)

# 2. Replace Supplier <select> with autocomplete <Input>
supplier_select = """<select 
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
                value={supplierId}
                onChange={e => setSupplierId(e.target.value)}
              >
                <option value="">Select Supplier</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
              </select>"""

supplier_autocomplete = """<div className="relative w-full">
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

text = text.replace(supplier_select, supplier_autocomplete)

# 3. Fix Product Dropdown (overflow-x-auto clips the absolute element)
text = text.replace('<div className="overflow-x-auto">', '<div className="overflow-visible">')
# ensure z-index is higher
text = text.replace('className="absolute z-10 w-full max-w-md', 'className="absolute z-50 w-full max-w-md')

# fix missing overflow-visible on card just in case
text = text.replace('<Card className="shadow-sm border-slate-200">', '<Card className="shadow-sm border-slate-200 overflow-visible">')

with open("src/components/retail/CreatePurchaseInvoice.tsx", "w") as f:
    f.write(text)

