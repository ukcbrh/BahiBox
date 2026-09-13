with open("src/components/hospitality/HospitalityComponents.tsx", "r") as f:
    content = f.read()

target = """  const handleSaveTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenantId || !newTable.table_number) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const branchRes = await supabase.from('branches').select('id').eq('tenant_id', currentTenantId).limit(1).single();
    const branchId = branchRes.data?.id;
    if (!branchId) { toast.error('No branch found for this tenant'); return; }
    const { error } = await supabase.from('restaurant_tables').insert({
      tenant_id: currentTenantId,
      branch_id: branchId,
      table_number: newTable.table_number,
      dining_area: newTable.dining_area || null,
      capacity: parseInt(newTable.capacity) || 4
    });
    if (error) { toast.error(`Failed to add table: ${error.message}`); return; }
    toast.success('Table added');
    setIsAddingTable(false);
    setNewTable({ table_number: '', dining_area: '', capacity: '4' });
    fetchTables();
  };"""

replacement = """  const handleSaveTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenantId || !newTable.table_number) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    if (editingTable) {
      const { error } = await supabase.from('restaurant_tables').update({
        table_number: newTable.table_number,
        dining_area: newTable.dining_area || null,
        capacity: parseInt(newTable.capacity) || 4
      }).eq('id', editingTable.id);
      if (error) { toast.error(`Failed to update table: ${error.message}`); return; }
      toast.success('Table updated');
    } else {
      const branchRes = await supabase.from('branches').select('id').eq('tenant_id', currentTenantId).limit(1).single();
      const branchId = branchRes.data?.id;
      if (!branchId) { toast.error('No branch found for this tenant'); return; }
      const { error } = await supabase.from('restaurant_tables').insert({
        tenant_id: currentTenantId,
        branch_id: branchId,
        table_number: newTable.table_number,
        dining_area: newTable.dining_area || null,
        capacity: parseInt(newTable.capacity) || 4
      });
      if (error) { toast.error(`Failed to add table: ${error.message}`); return; }
      toast.success('Table added');
    }
    setIsAddingTable(false);
    setEditingTable(null);
    setNewTable({ table_number: '', dining_area: '', capacity: '4' });
    fetchTables();
  };

  const handleDeleteTable = async (tableId: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data: checkData, error: checkError } = await supabase.rpc('safe_delete_check', {
      p_parent_table: 'restaurant_tables',
      p_parent_id: tableId,
      p_child_checks: [{ table: 'kitchen_order_tickets', column: 'table_id' }]
    });
    if (checkError) { toast.error(`Failed to check: ${checkError.message}`); return; }
    if (!checkData.safe_to_delete) {
      toast.error(`Cannot delete: this table has order history. Reset it instead.`);
      return;
    }
    if (!window.confirm('Delete this table?')) return;
    const { error } = await supabase.from('restaurant_tables').delete().eq('id', tableId);
    if (error) { toast.error(`Failed to delete: ${error.message}`); return; }
    toast.success('Table deleted');
    fetchTables();
  };"""

if target in content:
    content = content.replace(target, replacement)
    with open("src/components/hospitality/HospitalityComponents.tsx", "w") as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
