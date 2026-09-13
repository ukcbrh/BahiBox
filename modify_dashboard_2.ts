import fs from 'fs';
let content = fs.readFileSync('src/pages/MerchantDashboard.tsx', 'utf-8');

const oldBlock = `                                  if (assignment) {
                                    return (
                                      <div className="flex flex-col gap-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800/30">
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
                                    );
                                  } else {
                                    return (
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
                                    );
                                  }`;

const newBlock = `                                  if (assignment) {
                                    return (
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
                                    );
                                  } else {
                                    return (
                                      <div className="flex flex-col gap-2">
                                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                          <p className="text-sm font-medium text-slate-500 text-center">Creating delivery job...</p>
                                        </div>
                                      </div>
                                    );
                                  }`;

if(content.includes(oldBlock)) {
  content = content.replace(oldBlock, newBlock);
  console.log('Replaced oldBlock');
} else {
  console.log('Could not find oldBlock');
}

fs.writeFileSync('src/pages/MerchantDashboard.tsx', content);
