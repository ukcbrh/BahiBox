import sys

file_path = 'src/components/hospitality/HospitalityComponents.tsx'
with open(file_path, 'r') as f:
    content = f.read()

target = """export const HospitalityPOS = () => (
  <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-8 text-center h-[60vh] flex flex-col items-center justify-center">
    <Receipt size={48} className="text-primary mb-4" />
    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Smart POS & Billing</h2>
    <p className="text-slate-500 dark:text-slate-400 max-w-md">Unified Check-out, Smart Discounts, Payment Gateway, and Split Bills.</p>
  </div>
);"""

replacement = """export const HospitalityPOS = () => {
  const { currentTenantId } = useAuth();
  const [tables, setTables] = useState<any[]>([]);
  const [unpaidOrders, setUnpaidOrders] = useState<any[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [branchUpiId, setBranchUpiId] = useState<string | null>(null);
  const [billPaymentMethod, setBillPaymentMethod] = useState<'cod' | 'wallet' | 'upi'>('cod');
  const [processing, setProcessing] = useState(false);
  const [showUpiQr, setShowUpiQr] = useState(false);

  const fetchData = async () => {
    if (!currentTenantId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { data: tablesData } = await supabase
      .from('restaurant_tables')
      .select('*')
      .eq('tenant_id', currentTenantId)
      .eq('is_active', true);
    if (tablesData) setTables(tablesData);

    const { data: ordersData } = await supabase
      .from('orders')
      .select('*, order_items(*, restaurant_menu_items(item_name))')
      .eq('tenant_id', currentTenantId)
      .eq('order_type', 'dine_in')
      .eq('payment_status', 'unpaid')
      .neq('status', 'Cancelled');
    if (ordersData) setUnpaidOrders(ordersData);

    const { data: branchData } = await supabase
      .from('branches')
      .select('upi_id')
      .eq('tenant_id', currentTenantId)
      .limit(1)
      .single();
    if (branchData) setBranchUpiId(branchData.upi_id);
  };

  useEffect(() => {
    fetchData();
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const channel = supabase.channel('pos_billing_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentTenantId]);

  const tablesWithBills = tables
    .map(t => ({ ...t, orders: unpaidOrders.filter(o => o.table_id === t.id) }))
    .filter(t => t.orders.length > 0);

  const selectedTableData = tablesWithBills.find(t => t.id === selectedTableId);
  const selectedTotal = selectedTableData?.orders.reduce((sum: number, o: any) => sum + (o.total || 0), 0) || 0;

  const upiLink = branchUpiId
    ? `upi://pay?pa=${encodeURIComponent(branchUpiId)}&am=${selectedTotal}&cu=INR&tn=${encodeURIComponent('Table ' + (selectedTableData?.table_number || ''))}`
    : '';

  const handleCollectPayment = async () => {
    if (!selectedTableId) return;
    setProcessing(true);
    const supabase = getSupabaseClient();
    if (!supabase) { setProcessing(false); return; }

    if (billPaymentMethod === 'wallet') {
      toast.error('Wallet payment must be collected via customer app. Use Cash or UPI here.');
      setProcessing(false);
      return;
    }

    const orderIds = selectedTableData?.orders.map((o: any) => o.id) || [];
    const { error } = await supabase
      .from('orders')
      .update({ payment_status: 'paid', payment_method: billPaymentMethod })
      .in('id', orderIds);

    if (error) { toast.error(error.message); setProcessing(false); return; }

    toast.success(`Bill collected: ₹${selectedTotal}`);
    setSelectedTableId(null);
    setShowUpiQr(false);
    setProcessing(false);
    fetchData();
  };

  if (selectedTableData) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <button onClick={() => { setSelectedTableId(null); setShowUpiQr(false); }} className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
          <ArrowLeft size={16} /> Back to Bills
        </button>

        <Card>
          <CardHeader>
            <CardTitle>Table {selectedTableData.table_number} — Bill</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedTableData.orders.map((o: any, idx: number) => (
              <div key={o.id} className="border-t border-slate-100 dark:border-slate-800 pt-3 first:border-t-0 first:pt-0">
                <p className="text-xs font-bold text-slate-400 mb-1">Round {idx + 1} {o.token_number ? `· Token #${o.token_number}` : ''}</p>
                {o.order_items?.map((oi: any) => (
                  <div key={oi.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700 dark:text-slate-300">{oi.restaurant_menu_items?.item_name} x{oi.quantity}</span>
                    <span className="text-slate-500">₹{oi.price * oi.quantity}</span>
                  </div>
                ))}
              </div>
            ))}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex items-center justify-between">
              <span className="font-bold text-lg text-slate-900 dark:text-slate-100">Total</span>
              <span className="font-extrabold text-xl text-primary">₹{selectedTotal}</span>
            </div>

            {showUpiQr && upiLink ? (
              <div className="text-center space-y-3 py-4">
                <div className="bg-white p-4 rounded-xl inline-block">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiLink)}`} alt="UPI QR" className="w-full" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Ask customer to scan and pay ₹{selectedTotal}. Confirm once received.</p>
                <Button className="w-full h-11" disabled={processing} onClick={handleCollectPayment}>
                  {processing ? 'Confirming...' : 'Confirm UPI Payment Received'}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setBillPaymentMethod('cod')} className={`py-2 rounded-xl text-sm font-semibold border-2 ${billPaymentMethod === 'cod' ? 'border-primary text-primary' : 'border-slate-200 dark:border-slate-800 text-slate-500'}`}>Cash</button>
                  <button
                    onClick={() => { if (branchUpiId) { setBillPaymentMethod('upi'); setShowUpiQr(true); } else { toast.error('No UPI ID set for this branch. Add it in Settings → Branches.'); } }}
                    className={`py-2 rounded-xl text-sm font-semibold border-2 ${billPaymentMethod === 'upi' ? 'border-primary text-primary' : 'border-slate-200 dark:border-slate-800 text-slate-500'}`}
                  >
                    UPI
                  </button>
                </div>
                {billPaymentMethod === 'cod' && (
                  <Button className="w-full h-11" disabled={processing} onClick={handleCollectPayment}>
                    {processing ? 'Processing...' : `Confirm Cash Received · ₹${selectedTotal}`}
                  </Button>
                )}
                <Button variant="outline" className="w-full h-11" onClick={() => window.print()}>Print Bill</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2"><Receipt size={24} /> Smart POS & Billing</h2>
        <p className="text-slate-500 dark:text-slate-400">Tables with pending bills across the restaurant.</p>
      </div>

      {tablesWithBills.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tablesWithBills.map(t => {
            const total = t.orders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
            return (
              <button key={t.id} onClick={() => setSelectedTableId(t.id)} className="text-left bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Table {t.table_number}</span>
                  <span className="text-xs font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">{t.orders.length} round{t.orders.length > 1 ? 's' : ''}</span>
                </div>
                <p className="text-2xl font-extrabold text-primary">₹{total}</p>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          <Receipt className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <p className="text-slate-500 dark:text-slate-400">No pending bills right now.</p>
        </div>
      )}
    </div>
  );
};"""

if target in content:
    content = content.replace(target, replacement)
    
    # Also add ArrowLeft to lucide-react import
    if "import {" in content and "lucide-react" in content:
        lucide_import_line = [line for line in content.split('\\n') if 'lucide-react' in line][0]
        if "ArrowLeft" not in lucide_import_line:
             content = content.replace(lucide_import_line, lucide_import_line.replace('import {', 'import { ArrowLeft,'))

    with open(file_path, 'w') as f:
        f.write(content)
    print("Success")
else:
    print("Target not found")
