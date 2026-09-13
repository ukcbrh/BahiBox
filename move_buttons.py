import re

with open("src/components/retail/RetailProductsInventory.tsx", "r") as f:
    text = f.read()

# First, remove the column button from the header
header_pattern = r"""<div className="flex items-center gap-2 relative">\s*<Button variant="outline" size="icon" onClick=\{\(\) => setShowColumnSettings\(!showColumnSettings\)\}>\s*<Settings2 size=\{16\} />\s*</Button>\s*\{showColumnSettings && \(\s*<div className="absolute top-12 right-0 bg-white border border-slate-200 shadow-xl rounded-lg p-4 z-50 min-w-\[200px\]">\s*<h4 className="font-medium text-sm mb-3 text-slate-900">Visible Columns</h4>\s*<div className="space-y-2 max-h-\[300px\] overflow-y-auto pr-2">\s*\{Object\.keys\(visibleColumns\)\.map\(col => \(\s*<label key=\{col\} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer hover:text-slate-900">\s*<input \s*type="checkbox" \s*className="rounded border-slate-300"\s*checked=\{visibleColumns\[col as keyof typeof visibleColumns\]\}\s*onChange=\{\(\) => setVisibleColumns\(prev => \(\{ \.\.\.prev, \[col\]: !prev\[col as keyof typeof visibleColumns\] \}\)\)\}\s*/>\s*\{COLUMN_LABELS\[col\]\}\s*</label>\s*\)\)\}\s*</div>\s*</div>\s*\)\}\s*<Button className="gap-2" onClick=\{\(\) => setIsAddingProduct\(true\)\}>\s*<Plus size=\{16\} /> Add Product\s*</Button>\s*</div>"""

header_replacement = """<div className="flex items-center gap-2">
          <Button className="gap-2" onClick={() => setIsAddingProduct(true)}>
            <Plus size={16} /> Add Product
          </Button>
        </div>"""

text = re.sub(header_pattern, header_replacement, text)

# Now, update the secondary bar
bar_pattern = r"""<div className="flex gap-2 px-2">\s*<Button variant="outline" size="sm" onClick=\{\(\) => setIsManagingUnits\(true\)\} className="h-9 gap-2 text-slate-600 bg-white">\s*<Settings2 size=\{14\} /> Units\s*</Button>\s*<Button variant="outline" size="sm" onClick=\{\(\) => setIsManagingGST\(true\)\} className="h-9 gap-2 text-slate-600 bg-white">\s*<Settings2 size=\{14\} /> GST\s*</Button>\s*</div>"""

bar_replacement = """<div className="flex gap-2 px-2 items-center relative">
          <Button variant="outline" size="sm" onClick={() => setShowColumnSettings(!showColumnSettings)} className="h-9 gap-2 text-slate-600 bg-white">
            <Settings2 size={14} /> Columns
          </Button>
          {showColumnSettings && (
            <div className="absolute top-12 left-0 bg-white border border-slate-200 shadow-xl rounded-lg p-4 z-50 min-w-[200px]">
              <h4 className="font-medium text-sm mb-3 text-slate-900">Visible Columns</h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {Object.keys(visibleColumns).map(col => (
                  <label key={col} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer hover:text-slate-900">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300"
                      checked={visibleColumns[col as keyof typeof visibleColumns]}
                      onChange={() => setVisibleColumns(prev => ({ ...prev, [col]: !prev[col as keyof typeof visibleColumns] }))}
                    />
                    {COLUMN_LABELS[col]}
                  </label>
                ))}
              </div>
            </div>
          )}
          
          <Button variant="outline" size="sm" onClick={() => setActiveTab('categories')} className="h-9 gap-2 text-slate-600 bg-white">
            <FolderTree size={14} /> Categories
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsManagingUnits(true)} className="h-9 gap-2 text-slate-600 bg-white">
            <Settings2 size={14} /> Units
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsManagingGST(true)} className="h-9 gap-2 text-slate-600 bg-white">
            <Settings2 size={14} /> GST
          </Button>
        </div>"""

text = re.sub(bar_pattern, bar_replacement, text)

with open("src/components/retail/RetailProductsInventory.tsx", "w") as f:
    f.write(text)
