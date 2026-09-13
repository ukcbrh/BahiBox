import re

with open('src/components/retail/RetailProductsInventory.tsx', 'r') as f:
    content = f.read()

# Step 1: Add import
import_str = "import * as XLSX from 'xlsx';\n"
if "import * as XLSX from 'xlsx';" not in content:
    # insert after the last import
    last_import_idx = content.rfind("import ")
    end_of_last_import = content.find("\n", last_import_idx)
    content = content[:end_of_last_import+1] + import_str + content[end_of_last_import+1:]

# Step 2: Add states
state_target = r"(const \[uploadingPhoto, setUploadingPhoto\] = useState\(false\);)"
if re.search(state_target, content):
    new_states = r"\1\n  const [showBulkImport, setShowBulkImport] = useState(false);\n  const [bulkImporting, setBulkImporting] = useState(false);\n  const [bulkImportResults, setBulkImportResults] = useState<{success: number, failed: {row: number, reason: string}[]} | null>(null);"
    content = re.sub(state_target, new_states, content)
else:
    print("Failed Step 2")

# Step 3 & 4: Add functions
funcs_target = r"(const handlePhotoUpload = async \(file: File\) => \{)"
funcs_code = """const handleDownloadTemplate = () => {
    const headers = ['Product Name*', 'SKU', 'Barcode', 'Category', 'Unit*', 'Purchase Price', 'Selling Price*', 'MRP', 'Opening Stock', 'Description', 'HSN Code', 'Marketplace Category', 'List on Marketplace (Yes/No)'];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, 'bahibox_product_import_template.xlsx');
  };

  const handleBulkImportFile = async (file: File) => {
    if (!currentTenantId) return;
    setBulkImporting(true);
    setBulkImportResults(null);
    const supabase = getSupabaseClient();
    if (!supabase) { setBulkImporting(false); return; }

    const arrayBuffer = await file.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

    const { data: branches } = await supabase.from('branches').select('id').eq('tenant_id', currentTenantId).limit(1);
    const branchId = branches?.[0]?.id;

    let successCount = 0;
    const failedRows: { row: number, reason: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rowNum = i + 2;
      const productName = String(r['Product Name*'] || '').trim();
      const unitName = String(r['Unit*'] || '').trim();
      const sellingPriceRaw = r['Selling Price*'];

      if (!productName) { failedRows.push({ row: rowNum, reason: 'Product Name is required' }); continue; }
      if (!unitName) { failedRows.push({ row: rowNum, reason: 'Unit is required' }); continue; }
      const sellingPrice = parseFloat(sellingPriceRaw);
      if (isNaN(sellingPrice)) { failedRows.push({ row: rowNum, reason: 'Selling Price is required and must be a number' }); continue; }

      const matchedUnit = units.find((u: any) => u.unit_name.toLowerCase().trim() === unitName.toLowerCase());
      if (!matchedUnit) { failedRows.push({ row: rowNum, reason: `Unit '${unitName}' not found` }); continue; }

      const categoryName = String(r['Category'] || '').trim();
      const matchedCategory = categoryName ? categories.find((c: any) => c.category_name.toLowerCase().trim() === categoryName.toLowerCase()) : null;

      const martCategoryName = String(r['Marketplace Category'] || '').trim();
      const matchedMartCategory = martCategoryName ? martCategories.find((c: any) => c.category_name.toLowerCase().trim() === martCategoryName.toLowerCase()) : null;

      const listedRaw = String(r['List on Marketplace (Yes/No)'] || '').trim().toLowerCase();
      const isListed = listedRaw === 'no' ? false : true;

      const payload: any = {
        tenant_id: currentTenantId,
        product_name: productName,
        sku: String(r['SKU'] || '').trim() || null,
        barcode: String(r['Barcode'] || '').trim() || null,
        category_id: matchedCategory ? matchedCategory.id : null,
        unit_id: matchedUnit.id,
        purchase_price: parseFloat(r['Purchase Price']) || 0,
        selling_price: sellingPrice,
        mrp: r['MRP'] ? parseFloat(r['MRP']) : null,
        description: String(r['Description'] || '').trim() || null,
        hsn_code: String(r['HSN Code'] || '').trim() || null,
        mart_category_id: matchedMartCategory ? matchedMartCategory.id : null,
        is_marketplace_listed: isListed
      };

      const { data: inserted, error: insertError } = await supabase.from('products').insert(payload).select().single();
      if (insertError) { failedRows.push({ row: rowNum, reason: insertError.message }); continue; }

      const openingQty = parseFloat(r['Opening Stock']) || 0;
      if (openingQty > 0 && branchId) {
        await supabase.rpc('adjust_stock', {
          p_product_id: inserted.id,
          p_branch_id: branchId,
          p_movement_type: 'adjustment_in',
          p_quantity: openingQty,
          p_reference_type: 'opening_stock',
          p_reference_id: null,
          p_notes: 'Opening stock via bulk import',
          p_created_by: null
        });
      }

      successCount++;
    }

    setBulkImportResults({ success: successCount, failed: failedRows });
    setBulkImporting(false);
    fetchProducts();
  };

  \g<1>"""
if re.search(funcs_target, content):
    content = re.sub(funcs_target, funcs_code, content)
else:
    print("Failed Step 3 & 4")


# Step 5: Replace button
old_button = '<Button variant="outline"><Package size={16} className="mr-2"/> Bulk Import</Button>'
new_button = '<Button variant="outline" onClick={() => setShowBulkImport(true)}><Package size={16} className="mr-2"/> Bulk Import</Button>'
if old_button in content:
    content = content.replace(old_button, new_button)
else:
    print("Failed Step 5")


# Step 6: Add modal JSX
modal_jsx = """
      {showBulkImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Bulk Import Products</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => { setShowBulkImport(false); setBulkImportResults(null); }}><X size={16} /></Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" onClick={handleDownloadTemplate} className="w-full">
                Download Excel Template
              </Button>
              <div>
                <label className="text-sm font-medium block mb-2">Upload Filled Template</label>
                <input 
                  type="file" 
                  accept=".xlsx,.xls" 
                  onChange={(e) => { if (e.target.files?.[0]) handleBulkImportFile(e.target.files[0]); }}
                  disabled={bulkImporting}
                />
              </div>
              {bulkImporting && <p className="text-sm text-slate-500 dark:text-slate-400">Importing, please wait...</p>}
              {bulkImportResults && (
                <div className="text-sm space-y-2 max-h-[300px] overflow-y-auto">
                  <p className="font-medium text-emerald-600">{bulkImportResults.success} products added successfully</p>
                  {bulkImportResults.failed.length > 0 && (
                    <div>
                      <p className="font-medium text-red-600">{bulkImportResults.failed.length} rows failed:</p>
                      <ul className="list-disc pl-5 text-slate-600 dark:text-slate-400">
                        {bulkImportResults.failed.map((f, idx) => (
                          <li key={idx}>Row {f.row}: {f.reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
"""
# Search for `{isManagingColumns && (` block and insert right after it.
is_managing_re = r"(</Card>\n\s+</div>\n\s+\)}\n)"
if re.search(is_managing_re, content):
    # Find the last match or just append before the final `</div>`
    # Better approach: find `    </div>\n  );\n}\n` at the end
    end_div_idx = content.rfind("</div>\n  );\n}")
    if end_div_idx != -1:
        content = content[:end_div_idx] + modal_jsx + content[end_div_idx:]
    else:
        print("Failed to find end div for Step 6")
else:
    print("Failed Step 6")

with open('src/components/retail/RetailProductsInventory.tsx', 'w') as f:
    f.write(content)
print("Done")
