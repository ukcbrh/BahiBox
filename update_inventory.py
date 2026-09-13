import re

with open("src/components/retail/RetailProductsInventory.tsx", "r") as f:
    text = f.read()

# 1. State for managing GST and Units
state_pattern = r"const \[isAddingCategory, setIsAddingCategory\] = useState\(false\);\s*const \[newCategory, setNewCategory\] = useState\(\{ category_name: \'\', parent_id: \'\' \}\);"
state_replacement = """const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState({ category_name: '', parent_id: '' });
  
  const [isManagingUnits, setIsManagingUnits] = useState(false);
  const [newUnitData, setNewUnitData] = useState({ unit_name: '', unit_symbol: '' });
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);

  const [isManagingGST, setIsManagingGST] = useState(false);
  const [newGstData, setNewGstData] = useState({ unit_name: '', unit_symbol: '' });
  const [editingGstId, setEditingGstId] = useState<string | null>(null);
  
  const [gsts, setGsts] = useState<any[]>([]);
"""
text = re.sub(state_pattern, state_replacement, text)

# 2. Modify fetchUnits to also fetch GSTs
fetch_units_pattern = r"const fetchUnits = async \(\) => \{.*?if \(data\) setUnits\(data\);\s*\};"
fetch_units_replacement = """const fetchUnits = async () => {
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) return;
    const { data } = await supabase
      .from('units')
      .select('*')
      .or(`tenant_id.is.null,tenant_id.eq.${currentTenantId}`);
    if (data) {
        setUnits(data.filter((u: any) => u.unit_type !== 'gst'));
        setGsts(data.filter((u: any) => u.unit_type === 'gst'));
    }
  };"""
text = re.sub(fetch_units_pattern, fetch_units_replacement, text, flags=re.DOTALL)


# 3. Change render logic for unit and cmb_gst
unit_render_pattern = r"if \(col === \'unit\' \|\| col === \'sales_unit\' \|\| col === \'sales_alt_unit\'\) \{.*?return <select.*?/select>;\s*\}"
unit_render_replacement = """if (col === 'unit' || col === 'sales_unit' || col === 'sales_alt_unit') { 
       return (
         <div className="flex bg-transparent w-full">
           <select className={commonClasses + " appearance-none text-slate-300 !min-w-[100px]"} value={col === 'unit' ? newProduct.unit_id : value} onChange={col === 'unit' ? e => setNewProduct({...newProduct, unit_id: e.target.value}) : handleChange}><option value="" className="text-slate-900">Unit...</option>{units.map(u => <option key={u.id} value={u.id} className="text-slate-900">{u.unit_name}</option>)}</select>
           <button className="bg-slate-700 hover:bg-slate-600 px-2 flex items-center justify-center text-white border-l border-slate-600" onClick={() => setIsManagingUnits(true)} type="button"><Settings2 size={14}/></button>
         </div>
       );
    }"""
text = re.sub(unit_render_pattern, unit_render_replacement, text, flags=re.DOTALL)

# Add cmb_gst rendering similar to unit
text = text.replace("|| col === 'cmb_gst'", "")
# Let's just find the big if and remove cmb_gst from it
big_if_pattern = r"if \(col === 'sku'.*?\|\| col === 'hsn_code'\) \{"
big_if_replacement = r"if (col === 'cmb_gst') { return ( <div className=\"flex bg-transparent w-full\"> <select className={commonClasses + \" appearance-none text-slate-300 !min-w-[100px]\"} value={newProduct.cmb_gst} onChange={e => setNewProduct({...newProduct, cmb_gst: e.target.value})}><option value=\"\" className=\"text-slate-900\">Select GST...</option>{gsts.map(g => <option key={g.id} value={g.unit_name} className=\"text-slate-900\">{g.unit_name}</option>)}</select> <button className=\"bg-slate-700 hover:bg-slate-600 px-2 flex items-center justify-center text-white border-l border-slate-600\" onClick={() => setIsManagingGST(true)} type=\"button\"><Settings2 size={14}/></button> </div> ); }\n    " + big_if_pattern.replace("\\|\\| col === 'cmb_gst'", "")
# We already removed cmb_gst using the string replace `replace("|| col === 'cmb_gst'", "")` above.
# So we just find `if (col === 'sku'` and prepend our cmb_gst block.
text = text.replace("if (col === 'sku'", "if (col === 'cmb_gst') { return ( <div className=\"flex bg-transparent w-full\"> <select className={commonClasses + \" appearance-none text-slate-300 !min-w-[100px]\"} value={newProduct.cmb_gst || ''} onChange={e => setNewProduct({...newProduct, cmb_gst: e.target.value})}><option value=\"\" className=\"text-slate-900\">Select GST...</option>{gsts.map(g => <option key={g.id} value={g.unit_name} className=\"text-slate-900\">{g.unit_name}</option>)}</select> <button className=\"bg-slate-700 hover:bg-slate-600 px-2 flex items-center justify-center text-white border-l border-slate-600\" onClick={() => setIsManagingGST(true)} type=\"button\"><Settings2 size={14}/></button> </div> ); }\n    if (col === 'sku'")

with open("src/components/retail/RetailProductsInventory.tsx", "w") as f:
    f.write(text)
