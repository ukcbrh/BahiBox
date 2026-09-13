import re

with open("src/components/retail/RetailProductsInventory.tsx", "r") as f:
    text = f.read()

modals = """
  const handleSaveUnit = async () => {
    if (!newUnitData.unit_name) return toast.error('Name is required');
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setLoading(true);
    
    if (editingUnitId) {
      const { error } = await supabase.from('units').update({
        unit_name: newUnitData.unit_name,
        unit_symbol: newUnitData.unit_symbol || newUnitData.unit_name
      }).eq('id', editingUnitId);
      if (error) toast.error(error.message);
      else { toast.success('Unit updated'); fetchUnits(); setNewUnitData({unit_name:'', unit_symbol:''}); setEditingUnitId(null); }
    } else {
      const { error } = await supabase.from('units').insert({
        tenant_id: currentTenantId,
        unit_name: newUnitData.unit_name,
        unit_symbol: newUnitData.unit_symbol || newUnitData.unit_name,
        unit_type: 'weight'
      });
      if (error) toast.error(error.message);
      else { toast.success('Unit added'); fetchUnits(); setNewUnitData({unit_name:'', unit_symbol:''}); }
    }
    setLoading(false);
  };

  const handleDeleteUnit = async (id: string) => {
    if (!confirm('Delete this unit?')) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from('units').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Unit deleted'); fetchUnits(); }
  };

  const handleSaveGst = async () => {
    if (!newGstData.unit_name) return toast.error('Name is required');
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setLoading(true);
    
    if (editingGstId) {
      const { error } = await supabase.from('units').update({
        unit_name: newGstData.unit_name,
        unit_symbol: newGstData.unit_symbol || newGstData.unit_name
      }).eq('id', editingGstId);
      if (error) toast.error(error.message);
      else { toast.success('GST updated'); fetchUnits(); setNewGstData({unit_name:'', unit_symbol:''}); setEditingGstId(null); }
    } else {
      const { error } = await supabase.from('units').insert({
        tenant_id: currentTenantId,
        unit_name: newGstData.unit_name,
        unit_symbol: newGstData.unit_symbol || newGstData.unit_name,
        unit_type: 'gst'
      });
      if (error) toast.error(error.message);
      else { toast.success('GST added'); fetchUnits(); setNewGstData({unit_name:'', unit_symbol:''}); }
    }
    setLoading(false);
  };

  const handleDeleteGst = async (id: string) => {
    if (!confirm('Delete this GST?')) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from('units').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('GST deleted'); fetchUnits(); }
  };

  {/* Modals string replace target below */}
"""

jsx_modals = """
      {isManagingUnits && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Manage Units</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => { setIsManagingUnits(false); setEditingUnitId(null); setNewUnitData({unit_name:'', unit_symbol:''}); }}><X size={16} /></Button>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-6">
                <Input placeholder="Unit Name (e.g. Box)" value={newUnitData.unit_name} onChange={e => setNewUnitData({...newUnitData, unit_name: e.target.value})} />
                <Input placeholder="Symbol (e.g. bx)" value={newUnitData.unit_symbol} onChange={e => setNewUnitData({...newUnitData, unit_symbol: e.target.value})} />
                <Button onClick={handleSaveUnit} disabled={loading}>{editingUnitId ? 'Update' : 'Add'}</Button>
                {editingUnitId && <Button variant="ghost" onClick={() => {setEditingUnitId(null); setNewUnitData({unit_name:'', unit_symbol:''});}}>Cancel</Button>}
              </div>
              <div className="max-h-[300px] overflow-y-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr><th className="px-4 py-2 text-left">Name</th><th className="px-4 py-2 text-left">Symbol</th><th className="px-4 py-2 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {units.map(u => (
                      <tr key={u.id}>
                        <td className="px-4 py-2">{u.unit_name}</td>
                        <td className="px-4 py-2">{u.unit_symbol}</td>
                        <td className="px-4 py-2 text-right flex justify-end gap-2">
                          {u.tenant_id ? (
                            <>
                              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setEditingUnitId(u.id); setNewUnitData({unit_name: u.unit_name, unit_symbol: u.unit_symbol}); }}>Edit</Button>
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600" onClick={() => handleDeleteUnit(u.id)}>Del</Button>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400 italic">System</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {units.length === 0 && <tr><td colSpan={3} className="text-center py-4 text-slate-500">No units found</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {isManagingGST && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Manage GST</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => { setIsManagingGST(false); setEditingGstId(null); setNewGstData({unit_name:'', unit_symbol:''}); }}><X size={16} /></Button>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-6">
                <Input placeholder="GST Name (e.g. GST 18%)" value={newGstData.unit_name} onChange={e => setNewGstData({...newGstData, unit_name: e.target.value})} />
                <Input placeholder="Value (e.g. 18)" value={newGstData.unit_symbol} onChange={e => setNewGstData({...newGstData, unit_symbol: e.target.value})} />
                <Button onClick={handleSaveGst} disabled={loading}>{editingGstId ? 'Update' : 'Add'}</Button>
                {editingGstId && <Button variant="ghost" onClick={() => {setEditingGstId(null); setNewGstData({unit_name:'', unit_symbol:''});}}>Cancel</Button>}
              </div>
              <div className="max-h-[300px] overflow-y-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr><th className="px-4 py-2 text-left">Name</th><th className="px-4 py-2 text-left">Value</th><th className="px-4 py-2 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {gsts.map(u => (
                      <tr key={u.id}>
                        <td className="px-4 py-2">{u.unit_name}</td>
                        <td className="px-4 py-2">{u.unit_symbol}</td>
                        <td className="px-4 py-2 text-right flex justify-end gap-2">
                          {u.tenant_id ? (
                            <>
                              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setEditingGstId(u.id); setNewGstData({unit_name: u.unit_name, unit_symbol: u.unit_symbol}); }}>Edit</Button>
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600" onClick={() => handleDeleteGst(u.id)}>Del</Button>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400 italic">System</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {gsts.length === 0 && <tr><td colSpan={3} className="text-center py-4 text-slate-500">No GST options found</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
"""

text = text.replace("  const [editingCategory, setEditingCategory] = useState<any>(null);", modals + "\n  const [editingCategory, setEditingCategory] = useState<any>(null);")

# Inject JSX modals just before the final </CardContent></Card></div></div>;
# Wait, the component returns <div className="p-6 max-w-full"> ... </div>
# I'll just append it before the final </div> of the component.
# Searching for the last `</div>`
last_div_index = text.rfind("</div>")
text = text[:last_div_index] + jsx_modals + text[last_div_index:]

with open("src/components/retail/RetailProductsInventory.tsx", "w") as f:
    f.write(text)
