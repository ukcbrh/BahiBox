with open("src/components/hospitality/HospitalityComponents.tsx", "r") as f:
    content = f.read()

target = """    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*, restaurant_menu_items(item_name)), kitchen_order_tickets(status)')
      .eq('table_id', tableId)
      .eq('user_id', user.id)
      .neq('status', 'Cancelled')
      .gte('created_at', tableData.last_reset_at)
      .order('created_at', { ascending: true });
    if (data) setMyOrders(data);
  };"""

replace = """    const { data, error } = await supabase
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
    content = content.replace(target, replace)
    with open("src/components/hospitality/HospitalityComponents.tsx", "w") as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
