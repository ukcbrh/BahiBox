with open("src/components/hospitality/HospitalityComponents.tsx", "r") as f:
    content = f.read()

target = "  const handleDeleteTable = async (tableId: string) => {"
replacement = """  const handleLinkTables = async () => {
    if (selectedForLink.length < 2) { toast.error('Select at least 2 tables to link'); return; }
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data, error } = await supabase.rpc('link_tables', { p_table_ids: selectedForLink });
    if (error) { toast.error(`Failed to link: ${error.message}`); return; }
    toast.success(`${data.linked_count} tables linked`);
    setLinkMode(false);
    setSelectedForLink([]);
    fetchTables();
  };

  const handleUnlinkTable = async (groupId: string) => {
    if (!window.confirm('Unlink these tables?')) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.rpc('unlink_table_group', { p_group_id: groupId });
    if (error) { toast.error(`Failed to unlink: ${error.message}`); return; }
    toast.success('Tables unlinked');
    fetchTables();
  };

  const handleDeleteTable = async (tableId: string) => {"""

if target in content:
    content = content.replace(target, replacement)
    with open("src/components/hospitality/HospitalityComponents.tsx", "w") as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
