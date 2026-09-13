with open("src/components/hospitality/HospitalityComponents.tsx", "r") as f:
    content = f.read()

target = """  const fetchMyOrders = async () => {
    if (!tableId || !user) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data: tableData } = await supabase.from('restaurant_tables').select('last_reset_at').eq('id', tableId).single();
    if (!tableData) return;
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*, restaurant_menu_items(item_name)), kitchen_order_tickets(status)')
      .eq('table_id', tableId)
      .eq('user_id', user.id)
      .neq('status', 'Cancelled')
      .gte('created_at', tableData.last_reset_at)
      .order('created_at', { ascending: true });
    if (data) setMyOrders(data);
  };

  useEffect(() => {
    if (step !== 'menu' && step !== 'success') return;
    fetchMyOrders();
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const channel = supabase.channel('my_table_orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kitchen_order_tickets' }, () => fetchMyOrders())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchMyOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [step, tableId, user]);"""

parts = content.split(target)

if len(parts) == 3:
    new_content = parts[0] + target + parts[1] + parts[2]
    with open("src/components/hospitality/HospitalityComponents.tsx", "w") as f:
        f.write(new_content)
    print("Replaced successfully")
else:
    print(f"Found {len(parts)-1} occurrences. Expected 2.")
