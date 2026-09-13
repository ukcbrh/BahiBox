export interface PartyBalanceResult {
  balance: number; // positive = they owe us (Customer) / we owe them (Supplier); negative = advance/credit
  balanceLabel: 'Due' | 'Advance' | 'Settled';
}

export async function getCustomerBalance(supabase: any, tenantId: string, customer: any): Promise<PartyBalanceResult> {
  const { data: invoices } = await supabase.from('sales_invoices').select('id, total_amount').eq('tenant_id', tenantId).eq('customer_id', customer.id).neq('status', 'cancelled');
  const { data: payments } = await supabase.from('customer_payments').select('amount').eq('tenant_id', tenantId).eq('customer_id', customer.id);
  const { data: challans } = await supabase.from('delivery_challans_outward').select('id').eq('tenant_id', tenantId).eq('customer_id', customer.id).neq('status', 'converted');

  let challanTotal = 0;
  if (challans && challans.length > 0) {
    const { data: items } = await supabase.from('delivery_challan_outward_items').select('challan_id, quantity, unit_price, discount_value, cgst, sgst, igst').in('challan_id', challans.map((c: any) => c.id));
    challanTotal = (items || []).reduce((s: number, it: any) => {
      const base = (it.quantity * it.unit_price) - (it.discount_value || 0);
      const tax = base * ((it.cgst || 0) + (it.sgst || 0) + (it.igst || 0)) / 100;
      return s + base + tax;
    }, 0);
  }

  const totalInvoiced = (invoices || []).reduce((s: number, inv: any) => s + Number(inv.total_amount), 0) + challanTotal;
  const totalPaid = (payments || []).reduce((s: number, p: any) => s + Number(p.amount), 0);
  const opening = customer.balance_type === 'to_receive' ? (customer.opening_balance || 0) : -(customer.opening_balance || 0);
  const balance = opening + totalInvoiced - totalPaid;

  return {
    balance,
    balanceLabel: balance > 0.01 ? 'Due' : balance < -0.01 ? 'Advance' : 'Settled'
  };
}

export async function getSupplierBalance(supabase: any, tenantId: string, supplier: any): Promise<PartyBalanceResult> {
  const { data: invoices } = await supabase.from('purchase_invoices').select('id, total_amount').eq('tenant_id', tenantId).eq('vendor_id', supplier.id);
  const { data: payments } = await supabase.from('supplier_payments').select('amount').eq('tenant_id', tenantId).eq('supplier_id', supplier.id);
  const { data: challans } = await supabase.from('delivery_challans_inward').select('id').eq('tenant_id', tenantId).eq('supplier_id', supplier.id).neq('status', 'converted');

  let challanTotal = 0;
  if (challans && challans.length > 0) {
    const { data: items } = await supabase.from('delivery_challan_inward_items').select('challan_id, quantity, unit_cost, discount, cgst, sgst, igst').in('challan_id', challans.map((c: any) => c.id));
    challanTotal = (items || []).reduce((s: number, it: any) => {
      const base = (it.quantity * it.unit_cost) - (it.discount || 0);
      const tax = base * ((it.cgst || 0) + (it.sgst || 0) + (it.igst || 0)) / 100;
      return s + base + tax;
    }, 0);
  }

  const totalInvoiced = (invoices || []).reduce((s: number, inv: any) => s + Number(inv.total_amount), 0) + challanTotal;
  const totalPaid = (payments || []).reduce((s: number, p: any) => s + Number(p.amount), 0);
  const opening = supplier.balance_type === 'to_pay' ? (supplier.opening_balance || 0) : -(supplier.opening_balance || 0);
  const balance = opening + totalInvoiced - totalPaid;

  return {
    balance,
    balanceLabel: balance > 0.01 ? 'Due' : balance < -0.01 ? 'Advance' : 'Settled'
  };
}
