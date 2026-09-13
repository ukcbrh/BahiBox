with open("src/components/hospitality/HospitalityComponents.tsx", "r") as f:
    content = f.read()

target = """// 4. KDS
export const HospitalityKDS = () => (
  <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-8 text-center h-[60vh] flex flex-col items-center justify-center">
    <ChefHat size={48} className="text-primary mb-4" />
    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">KDS & Kitchen Master</h2>
    <p className="text-slate-500 dark:text-slate-400 max-w-md">Kitchen Display System, Recipe Master, Auto-Consumption, and 86 Item List.</p>
  </div>
);"""

replacement = """// 4. KDS
export const HospitalityKDS = () => {
  const { currentTenantId } = useAuth();
  const [kots, setKots] = useState<any[]>([]);

  const fetchKots = async () => {
    if (!currentTenantId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase
      .from('kitchen_order_tickets')
      .select('*, kot_items(*, restaurant_menu_items(item_name, price)), restaurant_tables(table_number), orders(payment_method, total)')
      .eq('tenant_id', currentTenantId)
      .in('status', ['pending_approval', 'new', 'preparing', 'ready'])
      .order('created_at', { ascending: true });
    if (data) setKots(data);
  };

  useEffect(() => {
    fetchKots();
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const channel = supabase.channel('kds_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kitchen_order_tickets' }, () => fetchKots())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentTenantId]);

  const handleApprove = async (kotId: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.rpc('approve_kot', { p_kot_id: kotId });
    if (error) { toast.error(error.message); return; }
    toast.success('Order approved');
    fetchKots();
  };

  const handleReject = async (kotId: string) => {
    if (!window.confirm('Reject this order? Payment (if any) will be auto-refunded.')) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.rpc('reject_kot', { p_kot_id: kotId, p_reason: 'Rejected by manager' });
    if (error) { toast.error(error.message); return; }
    toast.success('Order rejected');
    fetchKots();
  };

  const updateStatus = async (kotId: string, newStatus: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from('kitchen_order_tickets').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', kotId);
    if (error) { toast.error(error.message); return; }
    fetchKots();
  };

  const columns = [
    { key: 'pending_approval', label: 'Pending Approval', color: 'border-amber-300 bg-amber-50/50 dark:bg-amber-900/10' },
    { key: 'new', label: 'New', color: 'border-blue-300 bg-blue-50/50 dark:bg-blue-900/10' },
    { key: 'preparing', label: 'Preparing', color: 'border-orange-300 bg-orange-50/50 dark:bg-orange-900/10' },
    { key: 'ready', label: 'Ready', color: 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/10' }
  ];

  const KotCard = ({ kot }: { kot: any }) => {
    const label = kot.table_id ? `Table ${kot.restaurant_tables?.table_number || ''}` : (kot.order_type === 'takeaway' ? 'Takeaway' : 'Online');
    const timeAgo = Math.round((Date.now() - new Date(kot.created_at).getTime()) / 60000);
    return (
      <Card className="shadow-sm">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{label}</span>
            <span className="text-[10px] text-slate-400">{timeAgo}m ago</span>
          </div>
          <div className="space-y-1">
            {kot.kot_items?.map((ki: any) => (
              <div key={ki.id} className="flex items-center justify-between text-xs">
                <span className="text-slate-700 dark:text-slate-300">{ki.restaurant_menu_items?.item_name || 'Item'}</span>
                <span className="font-bold text-slate-500">x{ki.quantity}</span>
              </div>
            ))}
          </div>
          {kot.status === 'pending_approval' && (
            <div className="flex gap-2 pt-2">
              <Button size="sm" className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => handleApprove(kot.id)}>Approve</Button>
              <Button size="sm" variant="outline" className="flex-1 h-8 text-xs text-red-600 border-red-200" onClick={() => handleReject(kot.id)}>Reject</Button>
            </div>
          )}
          {kot.status === 'new' && (
            <Button size="sm" className="w-full h-8 text-xs" onClick={() => updateStatus(kot.id, 'preparing')}>Start Preparing</Button>
          )}
          {kot.status === 'preparing' && (
            <Button size="sm" className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => updateStatus(kot.id, 'ready')}>Mark Ready</Button>
          )}
          {kot.status === 'ready' && (
            <Button size="sm" className="w-full h-8 text-xs bg-slate-700 hover:bg-slate-800" onClick={() => updateStatus(kot.id, 'served')}>Served</Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2"><ChefHat size={24} /> Kitchen Display</h2>
        <p className="text-slate-500 dark:text-slate-400">Live orders — updates automatically.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map(col => {
          const colKots = kots.filter(k => k.status === col.key);
          return (
            <div key={col.key} className={`rounded-2xl border-2 p-3 ${col.color} min-h-[300px]`}>
              <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-3 flex items-center justify-between">
                {col.label} <span className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full text-xs">{colKots.length}</span>
              </h3>
              <div className="space-y-3">
                {colKots.map(kot => <KotCard key={kot.id} kot={kot} />)}
                {colKots.length === 0 && <p className="text-xs text-slate-400 text-center py-6">No orders</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};"""

if target in content:
    content = content.replace(target, replacement)
    with open("src/components/hospitality/HospitalityComponents.tsx", "w") as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
