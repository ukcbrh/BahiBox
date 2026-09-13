import fs from 'fs';
let content = fs.readFileSync('src/pages/MerchantDashboard.tsx', 'utf-8');

// Update `updateOrderStatus` to use the RPC if 'Dispatch' is the target
const oldUpdateOrderStr = `const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
       const supabase = getSupabaseClient();
       if (!supabase) return;
       const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
       if (error) throw error;
       setOrders(prev => prev.map((o: any) => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch(err) {
       console.error("Failed to update order status:", err);
       alert("Failed to update order status");
    }
  };`;

const newUpdateOrderStr = `const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
       const supabase = getSupabaseClient();
       if (!supabase) return;
       
       if (newStatus === 'Dispatch') {
         const { error } = await supabase.rpc('create_delivery_job', { p_order_id: orderId });
         if (error) throw error;
         setOrders(prev => prev.map((o: any) => o.id === orderId ? { ...o, status: newStatus } : o));
         // also refetch assignments
         fetchAssignments();
       } else {
         const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
         if (error) throw error;
         setOrders(prev => prev.map((o: any) => o.id === orderId ? { ...o, status: newStatus } : o));
       }
    } catch(err) {
       console.error("Failed to update order status:", err);
       alert("Failed to update order status");
    }
  };`;

if(content.includes(oldUpdateOrderStr)) {
  content = content.replace(oldUpdateOrderStr, newUpdateOrderStr);
  console.log('Replaced updateOrderStatus');
} else {
  console.log('Could not find updateOrderStatus');
}

// Remove assignRider, onlineRiders, selectedRiderMap if we don't need them
// Well, we can keep them or remove them. The prompt says "Remove the old manual 'Assign Rider' UI entirely"

const cardRiderAreaStart = `                                  {assignment ? (`;
const cardRiderAreaOld = `                                  {assignment ? (
                                    <div className="flex flex-col gap-1 bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-blue-800 dark:text-blue-300">Rider Assigned</span>
                                        <span className="text-xs font-bold bg-blue-100 dark:bg-blue-800/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded uppercase">{assignment.status.replace('_', ' ')}</span>
                                      </div>
                                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{assignment.service_providers?.full_name}</p>
                                      <p className="text-xs text-slate-500">{assignment.service_providers?.phone}</p>
                                      
                                      {assignment.status === 'assigned' && (
                                        <Button size="sm" className="mt-2 text-xs w-full bg-blue-600 hover:bg-blue-700" onClick={() => updateAssignmentStatus(assignment.id, 'picked_up')}>
                                          Mark as Picked Up (Manual)
                                        </Button>
                                      )}
                                      {assignment.status === 'picked_up' && (
                                        <Button size="sm" className="mt-2 text-xs w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => updateAssignmentStatus(assignment.id, 'delivered')}>
                                          Mark as Delivered (Manual)
                                        </Button>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex flex-col gap-2">
                                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assign Rider</label>
                                      <div className="flex gap-2">
                                        <Select value={selectedRiderMap[order.id] || ''} onValueChange={(v) => setSelectedRiderMap(prev => ({...prev, [order.id]: v}))}>
                                          <SelectTrigger className="h-9 flex-1 text-sm bg-white dark:bg-slate-950">
                                            <SelectValue placeholder="Select rider..." />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {onlineRiders.length === 0 ? (
                                              <SelectItem value="none" disabled>No riders online</SelectItem>
                                            ) : (
                                              onlineRiders.map(rider => (
                                                <SelectItem key={rider.id} value={rider.id}>{rider.full_name}</SelectItem>
                                              ))
                                            )}
                                          </SelectContent>
                                        </Select>
                                        <Button size="sm" className="h-9" disabled={!selectedRiderMap[order.id] || selectedRiderMap[order.id] === 'none'} onClick={() => assignRider(order.id, selectedRiderMap[order.id])}>
                                          Assign
                                        </Button>
                                      </div>
                                    </div>
                                  )}`;

const cardRiderAreaNew = `                                  {assignment ? (
                                    <div className="flex flex-col gap-1 bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-blue-800 dark:text-blue-300">Delivery Status</span>
                                        <span className="text-xs font-bold bg-blue-100 dark:bg-blue-800/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded uppercase">{assignment.status.replace('_', ' ')}</span>
                                      </div>
                                      {assignment.status === 'unassigned' ? (
                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Awaiting rider...</p>
                                      ) : (
                                        <>
                                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{assignment.status === 'delivered' ? 'Delivered by' : 'Assigned to'}: {assignment.service_providers?.full_name}</p>
                                          <p className="text-xs text-slate-500">{assignment.service_providers?.phone}</p>
                                        </>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex flex-col gap-2">
                                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                        <p className="text-sm font-medium text-slate-500 text-center">Creating delivery job...</p>
                                      </div>
                                    </div>
                                  )}`;

if(content.includes(cardRiderAreaOld)) {
  content = content.replace(cardRiderAreaOld, cardRiderAreaNew);
  console.log('Replaced cardRiderAreaOld');
} else {
  console.log('Could not find cardRiderAreaOld');
}

fs.writeFileSync('src/pages/MerchantDashboard.tsx', content);
