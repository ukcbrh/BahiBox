import sys

with open('src/pages/MerchantDashboard.tsx', 'r') as f:
    content = f.read()

# Task 1: Add state
target_1 = "  const [orders, setOrders] = useState<OnlineOrder[]>([]);"
new_1 = "  const [orders, setOrders] = useState<OnlineOrder[]>([]);\n  const [selectedVehicleType, setSelectedVehicleType] = useState<Record<string, string>>({});"
if target_1 in content:
    content = content.replace(target_1, new_1)
else:
    print("Task 1 target not found")

# Task 2: updateOrderStatus
target_2 = """       if (newStatus === 'Dispatch') {
         const { error } = await supabase.rpc('create_delivery_job', { p_order_id: orderId });
         if (error) throw error;
         setOrders(prev => prev.map((o: any) => o.id === orderId ? { ...o, status: newStatus } : o));
         // also refetch assignments
         fetchAssignments();
       } else {"""
new_2 = """       if (newStatus === 'Dispatch') {
         const vehicleType = selectedVehicleType[orderId] || 'bike';
         const { error } = await supabase.rpc('create_delivery_job', { p_order_id: orderId, p_vehicle_type: vehicleType });
         if (error) throw error;
         setOrders(prev => prev.map((o: any) => o.id === orderId ? { ...o, status: newStatus } : o));
         // also refetch assignments
         fetchAssignments();
       } else {"""
if target_2 in content:
    content = content.replace(target_2, new_2)
else:
    print("Task 2 target not found")

# Task 3: Ready to Pack UI
target_3 = """                              </div>

                              <div className="flex gap-2">
                                <Button variant="outline" className="flex-1 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 font-bold h-10 rounded-lg text-xs" onClick={() => printOrderBillAndLabel(order)}>"""
new_3 = """                              </div>

                              <div className="mb-3">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-1.5">Delivery Vehicle Required</p>
                                <div className="grid grid-cols-3 gap-2">
                                  {(['bike', 'auto', 'car'] as const).map(vt => (
                                    <button
                                      key={vt}
                                      type="button"
                                      onClick={() => setSelectedVehicleType(prev => ({ ...prev, [order.id]: vt }))}
                                      className={`py-1.5 rounded-lg text-xs font-bold uppercase border-2 transition-colors ${(selectedVehicleType[order.id] || 'bike') === vt ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'}`}
                                    >
                                      {vt}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <Button variant="outline" className="flex-1 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 font-bold h-10 rounded-lg text-xs" onClick={() => printOrderBillAndLabel(order)}>"""
if target_3 in content:
    content = content.replace(target_3, new_3)
else:
    print("Task 3 target not found")

with open('src/pages/MerchantDashboard.tsx', 'w') as f:
    f.write(content)

print("Patched")
