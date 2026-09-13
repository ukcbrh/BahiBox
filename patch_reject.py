import sys

with open('src/pages/MerchantDashboard.tsx', 'r') as f:
    content = f.read()

# Task 1
target_1 = """                              <div className="flex justify-between items-center">
                                <p className="text-lg font-extrabold text-slate-900 dark:text-slate-100">₹ {order.total_amount}.00 <span className="text-emerald-600 text-xs ml-1 bg-emerald-50 px-2 py-0.5 rounded">Paid</span></p>
                                <Button size="sm" onClick={() => { printOrderBillAndLabel(order); updateOrderStatus(order.id, 'Ready to Pack'); }} className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-10 px-4 rounded-lg">Accept Order</Button>
                              </div>"""
new_1 = """                              <div className="flex justify-between items-center">
                                <p className="text-lg font-extrabold text-slate-900 dark:text-slate-100">₹ {order.total_amount}.00 <span className="text-emerald-600 text-xs ml-1 bg-emerald-50 px-2 py-0.5 rounded">Paid</span></p>
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => { printOrderBillAndLabel(order); updateOrderStatus(order.id, 'Ready to Pack'); }} className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-10 px-4 rounded-lg">Accept Order</Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={async () => {
                                      const reason = window.prompt('Reason for rejecting this order (optional):');
                                      if (reason === null) return;
                                      const supabase = getSupabaseClient();
                                      if (!supabase) return;
                                      const { error } = await supabase.rpc('reject_online_order', { p_order_id: order.id, p_reason: reason || null });
                                      if (error) { alert(error.message); return; }
                                      setOrders(prev => prev.filter((o: any) => o.id !== order.id));
                                    }}
                                    className="border-red-300 text-red-600 hover:bg-red-50 font-bold h-10 px-4 rounded-lg"
                                  >
                                    Reject
                                  </Button>
                                </div>
                              </div>"""
if target_1 in content:
    content = content.replace(target_1, new_1)
else:
    # Try exact match without formatting if it fails
    target_1_alt = """<Button size="sm" onClick={() => { printOrderBillAndLabel(order); updateOrderStatus(order.id, 'Ready to Pack'); }} className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-10 px-4 rounded-lg">Accept Order</Button>"""
    new_1_alt = """<Button size="sm" onClick={() => { printOrderBillAndLabel(order); updateOrderStatus(order.id, 'Ready to Pack'); }} className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-10 px-4 rounded-lg">Accept Order</Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={async () => {
                                    const reason = window.prompt('Reason for rejecting this order (optional):');
                                    if (reason === null) return;
                                    const supabase = getSupabaseClient();
                                    if (!supabase) return;
                                    const { error } = await supabase.rpc('reject_online_order', { p_order_id: order.id, p_reason: reason || null });
                                    if (error) { alert(error.message); return; }
                                    setOrders(prev => prev.filter((o: any) => o.id !== order.id));
                                  }}
                                  className="border-red-300 text-red-600 hover:bg-red-50 font-bold h-10 px-4 rounded-lg"
                                >
                                  Reject
                                </Button>"""
    if target_1_alt in content:
        content = content.replace(target_1_alt, new_1_alt)
        print("Used alt 1")
    else:
        print("Task 1 target not found")


# Task 2
target_2 = """                              <div className="flex gap-2">
                                <Button variant="outline" className="flex-1 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 font-bold h-10 rounded-lg text-xs" onClick={() => printOrderBillAndLabel(order)}>
                                   <Printer size={14} className="mr-1"/> Print Bill + Label
                                </Button>
                                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 rounded-lg text-xs" onClick={() => updateOrderStatus(order.id, 'Dispatch')}>
                                   <CheckCircle size={14} className="mr-1"/> Pack & Ship
                                </Button>
                              </div>"""
new_2 = """                              <div className="flex gap-2">
                                <Button variant="outline" className="flex-1 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 font-bold h-10 rounded-lg text-xs" onClick={() => printOrderBillAndLabel(order)}>
                                   <Printer size={14} className="mr-1"/> Print Bill + Label
                                </Button>
                                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 rounded-lg text-xs" onClick={() => updateOrderStatus(order.id, 'Dispatch')}>
                                   <CheckCircle size={14} className="mr-1"/> Pack & Ship
                                </Button>
                                <Button 
                                  variant="outline"
                                  onClick={async () => {
                                    const reason = window.prompt('Reason for rejecting this order (optional):');
                                    if (reason === null) return;
                                    const supabase = getSupabaseClient();
                                    if (!supabase) return;
                                    const { error } = await supabase.rpc('reject_online_order', { p_order_id: order.id, p_reason: reason || null });
                                    if (error) { alert(error.message); return; }
                                    setOrders(prev => prev.filter((o: any) => o.id !== order.id));
                                  }}
                                  className="border-red-300 text-red-600 hover:bg-red-50 font-bold h-10 rounded-lg text-xs"
                                >
                                  Reject
                                </Button>
                              </div>"""
if target_2 in content:
    content = content.replace(target_2, new_2)
else:
    print("Task 2 target not found")

with open('src/pages/MerchantDashboard.tsx', 'w') as f:
    f.write(content)

print("Patched")
