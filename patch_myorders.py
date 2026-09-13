with open("src/components/hospitality/HospitalityComponents.tsx", "r") as f:
    content = f.read()

target1 = "  const [customerPhone, setCustomerPhone] = useState('');"
replace1 = """  const [customerPhone, setCustomerPhone] = useState('');
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [billPaymentMethod, setBillPaymentMethod] = useState<'cod' | 'wallet'>('cod');
  const [payingBill, setPayingBill] = useState(false);"""

target2 = "  const cartTotal = cart.reduce((sum, c) => sum + (c.price * c.quantity), 0);"
replace2 = """  const cartTotal = cart.reduce((sum, c) => sum + (c.price * c.quantity), 0);

  const fetchMyOrders = async () => {
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

  const handlePayBill = async () => {
    if (!user || !tableId) return;
    setPayingBill(true);
    const supabase = getSupabaseClient();
    if (!supabase) { setPayingBill(false); return; }
    const { data, error } = await supabase.rpc('pay_table_bill', {
      p_table_id: tableId,
      p_user_id: user.id,
      p_payment_method: billPaymentMethod
    });
    if (error) { toast.error(error.message); setPayingBill(false); return; }
    toast.success(`Bill paid: ₹${data.total}`);
    setPayingBill(false);
    fetchMyOrders();
  };"""

if target1 in content and target2 in content:
    content = content.replace(target1, replace1)
    content = content.replace(target2, replace2)
    with open("src/components/hospitality/HospitalityComponents.tsx", "w") as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
