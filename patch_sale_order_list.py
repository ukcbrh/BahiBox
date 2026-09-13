import sys

def apply_patches(filename):
    with open(filename, 'r') as f:
        content = f.read()

    # PATCH A
    content = content.replace("import { QuotationForm } from './QuotationForm';", "import { SaleOrderForm } from './SaleOrderForm';")
    content = content.replace("export function QuotationList({ onBack }: { onBack?: () => void }) {", "export function SaleOrderList({ onBack }: { onBack?: () => void }) {")

    # PATCH B
    orig_b = """  const statusColors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700',
    converted: 'bg-purple-100 text-purple-700'
  };"""
    new_b = """  const statusColors: Record<string, string> = {
    confirmed: 'bg-blue-100 text-blue-700',
    fulfilled: 'bg-amber-100 text-amber-700',
    converted: 'bg-purple-100 text-purple-700',
    cancelled: 'bg-red-100 text-red-700'
  };"""
    content = content.replace(orig_b, new_b)

    # PATCH C
    orig_c1 = """  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);"""
    new_c1 = """  const [saleOrders, setSaleOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);"""
    content = content.replace(orig_c1, new_c1)

    orig_c2 = """  const fetchQuotations = async () => {
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) { setLoading(false); return; }
    const { data } = await supabase.from('quotations').select('*, quotation_items(*)').eq('tenant_id', currentTenantId).order('created_at', { ascending: false }).limit(100);
    setQuotations(data || []);
    setLoading(false);
  };

  useEffect(() => { if (mode === 'list') fetchQuotations(); }, [currentTenantId, mode]);

  if (mode === 'create') {
    return <QuotationForm onBack={() => setMode('list')} />;
  }
  if (mode === 'edit' && editTarget) {
    return <QuotationForm onBack={() => { setMode('list'); setEditTarget(null); }} editQuotation={editTarget} />;
  }"""
    new_c2 = """  const fetchSaleOrders = async () => {
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) { setLoading(false); return; }
    const { data } = await supabase.from('sale_orders').select('*, sale_order_items(*)').eq('tenant_id', currentTenantId).order('created_at', { ascending: false }).limit(100);
    setSaleOrders(data || []);
    setLoading(false);
  };

  useEffect(() => { if (mode === 'list') fetchSaleOrders(); }, [currentTenantId, mode]);

  if (mode === 'create') {
    return <SaleOrderForm onBack={() => setMode('list')} />;
  }
  if (mode === 'edit' && editTarget) {
    return <SaleOrderForm onBack={() => { setMode('list'); setEditTarget(null); }} editSaleOrder={editTarget} />;
  }"""
    content = content.replace(orig_c2, new_c2)

    # PATCH D
    orig_d = """      const printerSize = (saved ? JSON.parse(saved) : null)?.['quotation']?.printerSize || 'A4';
      const { data: branchInfo } = q.branch_id ? await supabase.from('branches').select('branch_name, address').eq('id', q.branch_id).maybeSingle() : { data: null };
      const { data: tenantData } = await supabase.from('tenants').select('business_name').eq('id', currentTenantId).maybeSingle();
      const { data: brandingInfo } = await supabase.from('print_branding_settings').select('*').eq('tenant_id', currentTenantId).maybeSingle();

      const billData: BillData = {
        business: {
          name: tenantData?.business_name || 'Your Business',
          branch_name: branchInfo?.branch_name,
          address: branchInfo?.address,
          show_branch_name: brandingInfo?.show_branch_name !== false,
          show_branch_address: brandingInfo?.show_branch_address !== false,
          stamp_url: brandingInfo?.stamp_url
        },
        customer: { name: q.customer_name || 'Walk-in', phone: '', address: '' },
        meta: { label: 'Quotation', number: q.quotation_number, date: new Date(q.quotation_date || q.created_at).toLocaleDateString() },
        items: (q.quotation_items || []).map((it: any) => ({
          name: it.item_name, qty: Number(it.quantity), rate: Number(it.unit_price),
          amount: Number(it.line_total)
        })),
        totals: { grand_total: Number(q.total_amount) },
        footer: { stamp_url: brandingInfo?.stamp_url },
        bill_number_code_type: brandingInfo?.bill_number_code_type || 'none'
      };
      await printBillForChannel(supabase, currentTenantId, 'quotation', billData, printerSize);"""
    new_d = """      const printerSize = (saved ? JSON.parse(saved) : null)?.['sale_order']?.printerSize || 'A4';
      const { data: branchInfo } = q.branch_id ? await supabase.from('branches').select('branch_name, address').eq('id', q.branch_id).maybeSingle() : { data: null };
      const { data: tenantData } = await supabase.from('tenants').select('business_name').eq('id', currentTenantId).maybeSingle();
      const { data: brandingInfo } = await supabase.from('print_branding_settings').select('*').eq('tenant_id', currentTenantId).maybeSingle();

      const billData: BillData = {
        business: {
          name: tenantData?.business_name || 'Your Business',
          branch_name: branchInfo?.branch_name,
          address: branchInfo?.address,
          show_branch_name: brandingInfo?.show_branch_name !== false,
          show_branch_address: brandingInfo?.show_branch_address !== false,
          stamp_url: brandingInfo?.stamp_url
        },
        customer: { name: q.customer_name || 'Walk-in', phone: '', address: '' },
        meta: { label: 'Sale Order', number: q.sale_order_number, date: new Date(q.order_date || q.created_at).toLocaleDateString() },
        items: (q.sale_order_items || []).map((it: any) => ({
          name: it.item_name, qty: Number(it.quantity), rate: Number(it.unit_price),
          amount: Number(it.line_total)
        })),
        totals: { grand_total: Number(q.total_amount) },
        footer: { stamp_url: brandingInfo?.stamp_url },
        bill_number_code_type: brandingInfo?.bill_number_code_type || 'none'
      };
      await printBillForChannel(supabase, currentTenantId, 'sale_order', billData, printerSize);"""
    content = content.replace(orig_d, new_d)

    # PATCH E
    orig_e = """  const handleDelete = async (q: any) => {
    if (!confirm('Delete this quotation? This cannot be undone.')) return;
    setBusyId(q.id);
    const supabase = getSupabaseClient();
    if (!supabase) { setBusyId(null); return; }
    try {
      const { error } = await supabase.rpc('delete_quotation', { p_quotation_id: q.id });
      if (error) throw error;
      toast.success('Quotation deleted');
      fetchQuotations();
    } catch (err: any) {
      toast.error('Failed to delete: ' + err.message);
    } finally {
      setBusyId(null);
    }
  };"""
    new_e = """  const handleDelete = async (q: any) => {
    if (!confirm('Delete this sale order? This cannot be undone.')) return;
    setBusyId(q.id);
    const supabase = getSupabaseClient();
    if (!supabase) { setBusyId(null); return; }
    try {
      const { error } = await supabase.rpc('delete_sale_order', { p_sale_order_id: q.id });
      if (error) throw error;
      toast.success('Sale Order deleted');
      fetchSaleOrders();
    } catch (err: any) {
      toast.error('Failed to delete: ' + err.message);
    } finally {
      setBusyId(null);
    }
  };"""
    content = content.replace(orig_e, new_e)

    # PATCH F
    orig_f = """  const handleConvertToInvoice = async (q: any) => {
    if (!q.customer_id) { toast.error('This quotation has no linked customer — cannot convert to invoice.'); return; }
    if (!confirm('Convert this quotation to a Sale Invoice?')) return;
    setBusyId(q.id);
    const supabase = getSupabaseClient();
    if (!supabase || !user) { setBusyId(null); return; }
    try {
      const { error } = await supabase.rpc('convert_quotation_to_sale_invoice', {
        p_quotation_id: q.id, p_created_by: user.id, p_payment_method: 'cash'
      });
      if (error) throw error;
      toast.success('Converted to Sale Invoice');
      fetchQuotations();
    } catch (err: any) {
      toast.error('Failed to convert: ' + err.message);
    } finally {
      setBusyId(null);
    }
  };"""
    new_f = """  const handleConvertToInvoice = async (q: any) => {
    if (!confirm('Convert this sale order to a Sale Invoice?')) return;
    setBusyId(q.id);
    const supabase = getSupabaseClient();
    if (!supabase || !user) { setBusyId(null); return; }
    try {
      const { error } = await supabase.rpc('convert_sale_order_to_sale_invoice', {
        p_sale_order_id: q.id, p_created_by: user.id, p_payment_method: 'cash'
      });
      if (error) throw error;
      toast.success('Converted to Sale Invoice');
      fetchSaleOrders();
    } catch (err: any) {
      toast.error('Failed to convert: ' + err.message);
    } finally {
      setBusyId(null);
    }
  };"""
    content = content.replace(orig_f, new_f)

    # PATCH G
    orig_g = """  const handleConvertToChallan = async (q: any) => {
    if (!confirm('Convert this quotation to a Delivery Challan (Outward)?')) return;
    setBusyId(q.id);
    const supabase = getSupabaseClient();
    if (!supabase || !user || !currentTenantId) { setBusyId(null); return; }
    try {
      const saved = localStorage.getItem(tenantScopedKey('posSettings', currentTenantId));
      const prefix = (saved ? JSON.parse(saved) : null)?.['delivery_challan_out']?.prefix || 'DCO-';
      const challanNumber = prefix + Date.now().toString().slice(-8);
      const { error } = await supabase.rpc('convert_quotation_to_delivery_challan_outward', {
        p_quotation_id: q.id, p_challan_number: challanNumber, p_created_by: user.id
      });
      if (error) throw error;
      toast.success('Converted to Delivery Challan');
      fetchQuotations();
    } catch (err: any) {
      toast.error('Failed to convert: ' + err.message);
    } finally {
      setBusyId(null);
    }
  };"""
    new_g = """  const handleConvertToChallan = async (q: any) => {
    if (!confirm('Convert this sale order to a Delivery Challan (Outward)?')) return;
    setBusyId(q.id);
    const supabase = getSupabaseClient();
    if (!supabase || !user || !currentTenantId) { setBusyId(null); return; }
    try {
      const saved = localStorage.getItem(tenantScopedKey('posSettings', currentTenantId));
      const prefix = (saved ? JSON.parse(saved) : null)?.['delivery_challan_out']?.prefix || 'DCO-';
      const challanNumber = prefix + Date.now().toString().slice(-8);
      const { error } = await supabase.rpc('convert_sale_order_to_delivery_challan_outward', {
        p_sale_order_id: q.id, p_challan_number: challanNumber, p_created_by: user.id
      });
      if (error) throw error;
      toast.success('Converted to Delivery Challan');
      fetchSaleOrders();
    } catch (err: any) {
      toast.error('Failed to convert: ' + err.message);
    } finally {
      setBusyId(null);
    }
  };"""
    content = content.replace(orig_g, new_g)

    # PATCH H
    orig_h1 = """        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Quotations</h2>
          <p className="text-slate-500 dark:text-slate-400">Price quotes for customers before invoicing.</p>
        </div>"""
    new_h1 = """        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Sale Orders</h2>
          <p className="text-slate-500 dark:text-slate-400">Confirmed customer orders before invoicing.</p>
        </div>"""
    content = content.replace(orig_h1, new_h1)

    orig_h2 = """          {loading ? (
            <p className="text-sm text-slate-400 text-center py-6">Loading...</p>
          ) : quotations.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No quotations yet.</p>
          ) : (
            <div className="space-y-3">
              {quotations.map((q: any) => (
                <div key={q.id} className="border border-slate-100 dark:border-slate-800 rounded-xl p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100">{q.quotation_number}</p>
                      <p className="text-xs text-slate-500">{q.customer_name || 'Walk-in'} · {q.quotation_date}</p>
                    </div>"""
    new_h2 = """          {loading ? (
            <p className="text-sm text-slate-400 text-center py-6">Loading...</p>
          ) : saleOrders.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No sale orders yet.</p>
          ) : (
            <div className="space-y-3">
              {saleOrders.map((q: any) => (
                <div key={q.id} className="border border-slate-100 dark:border-slate-800 rounded-xl p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100">{q.sale_order_number}</p>
                      <p className="text-xs text-slate-500">{q.customer_name} · {q.order_date}</p>
                    </div>"""
    content = content.replace(orig_h2, new_h2)

    with open(filename, 'w') as f:
        f.write(content)

if __name__ == "__main__":
    apply_patches('src/components/retail/SaleOrderList.tsx')
