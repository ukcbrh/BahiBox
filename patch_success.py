import base64

def patch_file(filepath, target_b64, repl_b64):
    target = base64.b64decode(target_b64).decode('utf-8')
    repl = base64.b64decode(repl_b64).decode('utf-8')
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    if target not in content:
        print(f"FAILED to find target in {filepath}")
        return False
        
    new_content = content.replace(target, repl)
    with open(filepath, 'w') as f:
        f.write(new_content)
    print(f"SUCCESS: Patched {filepath}")
    return True

target_b64 = base64.b64encode("""        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Invoice Created!</h2>
        <p className="text-slate-500 dark:text-slate-400">{successInvoice.invoice_number}</p>
        <p className="text-3xl font-bold text-slate-900 dark:text-white">₹{Number(successInvoice.total_amount).toFixed(2)}</p>""".encode('utf-8')).decode('utf-8')

repl_b64 = base64.b64encode("""        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Delivery Challan Created!</h2>
        <p className="text-slate-500 dark:text-slate-400">{successInvoice.challan_number}</p>
        <p className="text-3xl font-bold text-slate-900 dark:text-white">₹{totals.grand.toFixed(2)}</p>""".encode('utf-8')).decode('utf-8')

patch_file('src/components/retail/CreateDeliveryChallanOutward.tsx', target_b64, repl_b64)
