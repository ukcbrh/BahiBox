with open("src/components/hospitality/HospitalityComponents.tsx", "r") as f:
    content = f.read()

target = """  const unpaidTotal = myOrders.filter(o => o.payment_status === 'unpaid').reduce((sum, o) => sum + (o.total || 0), 0);
  console.log('DEBUG myOrders:', JSON.stringify(myOrders));

  const handlePayBill = async () => {"""

replace = """  const fetchMyOrders = async () => {
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
  }, [step, tableId, user]);

  const unpaidTotal = myOrders.filter(o => o.payment_status === 'unpaid').reduce((sum, o) => sum + (o.total || 0), 0);
  console.log('DEBUG myOrders:', JSON.stringify(myOrders));

  const handlePayBill = async () => {"""

if target in content:
    content = content.replace(target, replace)
    with open("src/components/hospitality/HospitalityComponents.tsx", "w") as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
