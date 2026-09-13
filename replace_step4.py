import re

with open('src/components/retail/CreateDeliveryChallanInward.tsx', 'r') as f:
    content = f.read()

old_block = """            <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                <label className="text-sm text-slate-600 dark:text-slate-400">Challan No.</label>
                <Input className="h-9 w-full" placeholder="Challan No." />
              </div>
              <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                <label className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">Challan Date</label>
                <Input type="date" className="h-9 w-full" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                <label className="text-sm text-slate-600 dark:text-slate-400">P.O. No.</label>
                <Input className="h-9 w-full" placeholder="P.O. No." />
              </div>
              <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                <label className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">P.O. Date</label>
                <Input type="date" className="h-9 w-full" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                <label className="text-sm text-slate-600 dark:text-slate-400">L.R. No.</label>
                <Input className="h-9 w-full" placeholder="L.R. No." />
              </div>
              <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                <label className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">E-Way No.</label>
                <Input className="h-9 w-full" placeholder="E-Way No." />
              </div>
            </div>
            
            <div className="grid grid-cols-[100px_1fr] items-center gap-4 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <label className="text-sm text-slate-600 dark:text-slate-400">Delivery</label>
              <select className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-950">
                <option>Select Delivery Mode</option>
                <option>Transport</option>
                <option>Courier</option>
                <option>By Hand</option>
              </select>
            </div>"""

new_block = """            <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                <label className="text-sm text-slate-600 dark:text-slate-400">P.O. No.</label>
                <Input className="h-9 w-full" placeholder="P.O. No." value={poNo} onChange={e => setPoNo(e.target.value)} />
              </div>
              <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                <label className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">P.O. Date</label>
                <Input type="date" className="h-9 w-full" value={poDate} onChange={e => setPoDate(e.target.value)} />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                <label className="text-sm text-slate-600 dark:text-slate-400">L.R. No.</label>
                <Input className="h-9 w-full" placeholder="L.R. No." value={lrNo} onChange={e => setLrNo(e.target.value)} />
              </div>
              <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                <label className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">E-Way No.</label>
                <Input className="h-9 w-full" placeholder="E-Way No." value={ewayNo} onChange={e => setEwayNo(e.target.value)} />
              </div>
            </div>
            
            <div className="grid grid-cols-[100px_1fr] items-center gap-4 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <label className="text-sm text-slate-600 dark:text-slate-400">Delivery</label>
              <select className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-950" value={deliveryMode} onChange={e => setDeliveryMode(e.target.value)}>
                <option value="">Select Delivery Mode</option>
                <option value="Transport">Transport</option>
                <option value="Courier">Courier</option>
                <option value="By Hand">By Hand</option>
              </select>
            </div>"""

if old_block in content:
    content = content.replace(old_block, new_block)
    print("Block replaced successfully.")
else:
    print("WARNING: Block not found.")

state_insert = """  const [poNo, setPoNo] = useState('');
  const [poDate, setPoDate] = useState('');
  const [lrNo, setLrNo] = useState('');
  const [ewayNo, setEwayNo] = useState('');
  const [deliveryMode, setDeliveryMode] = useState('');"""

old_state = "  const [invoiceNo, setInvoiceNo] = useState('');"
if old_state in content:
    content = content.replace(old_state, old_state + "\\n" + state_insert)
    print("State inserted successfully.")
else:
    print("WARNING: State insert hook not found.")

with open('src/components/retail/CreateDeliveryChallanInward.tsx', 'w') as f:
    f.write(content)
