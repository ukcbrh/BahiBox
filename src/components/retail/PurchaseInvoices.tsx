import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { List, Search, Plus, Eye, Edit, Trash2, Printer, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getSupabaseClient } from '../../lib/supabase';
import { printBillForChannel, BillData } from '../../lib/billRenderer';
import { toast } from 'sonner';
import { CreatePurchaseInvoice } from './CreatePurchaseInvoice';

export function PurchaseInvoices() {
  const { currentTenantId, user, activeBranchId } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewOrder, setViewOrder] = useState<any>(null);

  const fetchOrders = async () => {
    if (!currentTenantId) return;
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) { setLoading(false); return; }
    const { data } = await supabase
      .from('purchase_orders')
      .select('*, suppliers(supplier_name, gstin, address, contact_person, contact_phone), purchase_order_items(*, products(product_name))')
      .eq('tenant_id', currentTenantId)
      .order('created_at', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, [currentTenantId]);

  const filteredOrders = orders.filter((o: any) =>
    o.po_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.suppliers?.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const reverseStockForOrder = async (order: any) => {
    const supabase = getSupabaseClient();
    if (!supabase || !user) return;
    for (const item of order.purchase_order_items || []) {
      if (item.received_quantity > 0) {
        await supabase.rpc('adjust_stock', {
          p_product_id: item.product_id,
          p_branch_id: order.branch_id,
          p_movement_type: 'adjustment_out',
          p_quantity: item.received_quantity,
          p_reference_type: 'purchase_order_reversal',
          p_reference_id: order.id,
          p_notes: 'Purchase invoice deleted/edited - stock reversed',
          p_created_by: user.id
        });
      }
    }
  };

  const handleDelete = async (order: any) => {
    if (!confirm('Are you sure you want to delete this purchase invoice? This will remove the received stock.')) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setLoading(true);
    try {
      await reverseStockForOrder(order);
      await supabase.from('purchase_order_items').delete().eq('purchase_order_id', order.id);
      await supabase.from('purchase_orders').delete().eq('id', order.id);
      toast.success('Purchase invoice deleted');
      fetchOrders();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (order: any) => {
    if (!confirm('This will delete the current invoice, return items to stock, and load them for editing. Continue?')) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setLoading(true);
    try {
      await reverseStockForOrder(order);
      const editPayload = {
        supplierId: order.supplier_id,
        selectedSupplier: order.suppliers,
        invoiceNo: order.po_number,
        items: (order.purchase_order_items || []).map((item: any) => ({
          id: Math.random().toString(),
          product_id: item.product_id,
          name: item.products?.product_name || '',
          qty: item.ordered_quantity,
          price: item.unit_cost
        }))
      };
      await supabase.from('purchase_order_items').delete().eq('purchase_order_id', order.id);
      await supabase.from('purchase_orders').delete().eq('id', order.id);
      setEditData(editPayload);
      setIsCreating(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load for editing');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async (order: any) => {
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) return;

    const { data: branchInfo } = order.branch_id
      ? await supabase.from('branches').select('branch_name, address').eq('id', order.branch_id).maybeSingle()
      : { data: null };
    const { data: brandingInfo } = await supabase.from('print_branding_settings').select('*').eq('tenant_id', currentTenantId).maybeSingle();
    const { data: tenantData } = await supabase.from('tenants').select('business_name').eq('id', currentTenantId).maybeSingle();

    const billData: BillData = {
      business: {
        name: tenantData?.business_name || 'Your Business',
        branch_name: branchInfo?.branch_name,
        address: branchInfo?.address,
        show_branch_name: brandingInfo?.show_branch_name !== false,
        show_branch_address: brandingInfo?.show_branch_address !== false,
        stamp_url: brandingInfo?.stamp_url
      },
      customer: order.suppliers ? {
        name: order.suppliers.supplier_name,
        phone: order.suppliers.contact_phone,
        address: order.suppliers.address
      } : undefined,
      customer_info_label: 'Supplier',
      meta: { label: 'Purchase Invoice', number: order.po_number, date: new Date(order.po_date || order.created_at).toLocaleDateString() },
      items: (order.purchase_order_items || []).map((item: any) => ({
        name: item.products?.product_name || '',
        qty: item.ordered_quantity,
        rate: item.unit_cost,
        amount: item.unit_cost * item.ordered_quantity
      })),
      totals: {
        grand_total: Number(order.total_amount || 0)
      },
      footer: {
        stamp_url: brandingInfo?.stamp_url
      },
      bill_number_code_type: brandingInfo?.bill_number_code_type || 'none'
    };

    await printBillForChannel(supabase, currentTenantId, 'purchase_invoice', billData, 'A4');
  };

  if (isCreating) {
    return <CreatePurchaseInvoice onBack={() => { setIsCreating(false); setEditData(null); fetchOrders(); }} editData={editData} />;
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-sm border-none">
        <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            Purchase Invoice
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                className="pl-9 h-9 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm px-3"
                placeholder="Search PO # or Supplier..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              className="bg-[#00b884] hover:bg-[#00a375] text-white border-none shadow-sm"
              onClick={() => { setEditData(null); setIsCreating(true); }}
            >
              <Plus className="mr-2 h-4 w-4" /> Add New
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card className="shadow-sm border-none min-h-[300px] flex items-center justify-center">
          <p className="text-slate-400">Loading...</p>
        </Card>
      ) : filteredOrders.length === 0 ? (
        <Card className="shadow-sm border-none min-h-[400px] flex items-center justify-center bg-white dark:bg-slate-950">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <p className="text-slate-500 dark:text-slate-400 font-medium text-lg mb-6">
              You don't have any Purchase Invoice
            </p>
            <Button
              className="bg-[#00b884] hover:bg-[#00a375] text-white border-none px-6 py-2 shadow-sm"
              onClick={() => { setEditData(null); setIsCreating(true); }}
            >
              Add Purchase Invoice
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-sm border-none overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">PO Number</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Date</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Supplier</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Status</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase text-right">Total</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o: any) => (
                  <tr key={o.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="py-4 px-6 font-medium text-slate-800 dark:text-slate-200">{o.po_number}</td>
                    <td className="py-4 px-6 text-slate-600 dark:text-slate-400">{new Date(o.created_at).toLocaleDateString()}</td>
                    <td className="py-4 px-6 text-slate-600 dark:text-slate-400">{o.suppliers?.supplier_name || '-'}</td>
                    <td className="py-4 px-6">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full uppercase bg-emerald-100 text-emerald-700">{o.status}</span>
                    </td>
                    <td className="py-4 px-6 text-right font-bold text-slate-800 dark:text-slate-200">₹{Number(o.total_amount || 0).toLocaleString('en-IN')}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setViewOrder(o)} className="h-8 shadow-sm text-slate-600 hover:text-slate-700">
                          <Eye size={14} className="mr-1" /> View
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handlePrint(o)} className="h-8 shadow-sm text-blue-600 hover:text-blue-700">
                          <Printer size={14} className="mr-1" /> Print
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(o)} className="h-8 shadow-sm text-amber-600 hover:text-amber-700">
                          <Edit size={14} className="mr-1" /> Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(o)} className="h-8 shadow-sm text-red-600 hover:text-red-700">
                          <Trash2 size={14} className="mr-1" /> Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {viewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">Purchase Invoice: {viewOrder.po_number}</h3>
                <button onClick={() => setViewOrder(null)}><X size={20} /></button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Supplier</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{viewOrder.suppliers?.supplier_name || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Date</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{new Date(viewOrder.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-slate-500">GSTIN</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{viewOrder.suppliers?.gstin || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Status</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 capitalize">{viewOrder.status}</p>
                </div>
              </div>
              <table className="w-full text-sm border-t border-slate-200 dark:border-slate-800 pt-2">
                <thead>
                  <tr className="text-xs text-slate-500 uppercase">
                    <th className="text-left py-2">Item</th>
                    <th className="text-right py-2">Qty</th>
                    <th className="text-right py-2">Price</th>
                    <th className="text-right py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewOrder.purchase_order_items || []).map((item: any) => (
                    <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="py-2">{item.products?.product_name || ''}</td>
                      <td className="py-2 text-right">{item.ordered_quantity}</td>
                      <td className="py-2 text-right">₹{item.unit_cost}</td>
                      <td className="py-2 text-right font-semibold">₹{Number(item.line_total || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
                <p className="font-bold text-lg text-slate-900 dark:text-slate-100">Grand Total: ₹{Number(viewOrder.total_amount || 0).toLocaleString('en-IN')}</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => handlePrint(viewOrder)}>
                  <Printer size={14} className="mr-2" /> Print
                </Button>
                <Button variant="outline" onClick={() => setViewOrder(null)}>Close</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
