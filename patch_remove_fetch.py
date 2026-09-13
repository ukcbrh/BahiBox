with open("src/components/hospitality/HospitalityComponents.tsx", "r") as f:
    content = f.read()

target = """  const fetchMyOrders = async () => {
    if (!tableId || !user) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data: tableData } = await supabase.from('restaurant_tables').select('last_reset_at').eq('id', tableId).single();
    if (!tableData) return;
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, restaurant_menu_items(item_name)), kitchen_order_tickets(status)')
      .eq('table_id', tableId)
      .eq('user_id', user.id)
      .neq('status', 'Cancelled')
      .gte('created_at', tableData.last_reset_at)
      .order('created_at', { ascending: true });
    console.log('DEBUG tableData:', JSON.stringify(tableData), 'error:', JSON.stringify(error));
    if (data) setMyOrders(data);
  };"""

if target in content:
    content = content.replace(target, "", 1)
    with open("src/components/hospitality/HospitalityComponents.tsx", "w") as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
