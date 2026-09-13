import re

with open("src/components/retail/RetailProductsInventory.tsx", "r") as f:
    text = f.read()

tabs_pattern = r"""<div className="flex gap-2 p-1 bg-slate-100/50 rounded-lg max-w-fit mb-6">\s*\{\['list', 'categories', 'low_stock', 'adjustments'\]\.map\(t => \(\s*<button\s*key=\{t\}\s*onClick=\{\(\) => setActiveTab\(t\)\}\s*className=\{.*?\}\s*>\s*\{t.*?\}\s*</button>\s*\)\)\}\s*</div>"""

tabs_replacement = """<div className="flex flex-wrap gap-2 p-1 bg-slate-100/50 rounded-lg mb-6 w-full justify-between items-center">
        <div className="flex gap-2">
          {['list', 'categories', 'low_stock', 'adjustments'].map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === t ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t.replace('_', ' ').replace(/\\b\\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>
        <div className="flex gap-2 px-2">
          <Button variant="outline" size="sm" onClick={() => setIsManagingUnits(true)} className="h-9 gap-2 text-slate-600 bg-white">
            <Settings2 size={14} /> Units
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsManagingGST(true)} className="h-9 gap-2 text-slate-600 bg-white">
            <Settings2 size={14} /> GST
          </Button>
        </div>
      </div>"""

text = re.sub(tabs_pattern, tabs_replacement, text)

with open("src/components/retail/RetailProductsInventory.tsx", "w") as f:
    f.write(text)
