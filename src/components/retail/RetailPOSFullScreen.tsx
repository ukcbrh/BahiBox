import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ShoppingCart, Maximize, Smartphone, Package, Search, Printer, CheckCircle2, ChevronDown, ChevronUp, Plus, Minus, Trash2, X, Settings } from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabase';
import { LiveTrackingMap } from '../consumer/LiveTrackingMap';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { printBillForChannel, renderBillHtml, getBillPageCss, BillBlock, BillData } from '../../lib/billRenderer';
import InvoiceHistory from './InvoiceHistory';

interface Product {
  id: string;
  product_name: string;
  barcode: string;
  selling_price: number;
  category_id?: string;
  category_name?: string;
  stock?: number;
}

interface HeldBill {
  id: string;
  cart: CartItem[];
  time: string;
}
interface CartItem {
  product_id: string;
  product_name: string;
  quantity: number;
  selling_price: number;
  discount_type: 'percent' | 'fixed' | 'none';
  discount_value: number;
}
import { useEffect } from 'react';
import { tenantScopedKey } from '@/src/lib/tenantStorage';

export const RetailOnlineOrdersPage = () => {
  const { currentTenantId, activeBranchId } = useAuth();
  const tenant = { id: currentTenantId };
  console.log('DEBUG-RETAIL-ONLINE:', JSON.stringify({tenantId: tenant?.id}));
  const [readyOrders, setReadyOrders] = useState<any[]>([]);
  const [dispatchAssignments, setDispatchAssignments] = useState<any[]>([]);
  const [onlineRiders, setOnlineRiders] = useState<any[]>([]);
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);

  const fetchReadyOrders = async () => {
    if (!tenant?.id) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data: ordersData } = await supabase.from('orders')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('order_type', 'online')
      .in('status', ['New', 'Ready to Pack']);

    if (!ordersData || ordersData.length === 0) { setReadyOrders([]); return; }
    const orderIds = ordersData.map((o: any) => o.id);
    const { data: itemsData } = await supabase.from('order_items').select('*').in('order_id', orderIds);
    let productsData: any[] = [];
    if (itemsData && itemsData.length > 0) {
      const productIds = [...new Set(itemsData.map((i: any) => i.product_id))];
      const { data: pData } = await supabase.from('products').select('id, product_name').in('id', productIds);
      productsData = pData || [];
    }
    const pMap = new globalThis.Map(productsData.map((p: any) => [p.id, p.product_name]));
    const merged = ordersData.map((o: any) => {
      const oItems = itemsData ? itemsData.filter((i: any) => i.order_id === o.id) : [];
      return { ...o, order_items: oItems.map((i: any) => ({ ...i, product_name: pMap.get(i.product_id) || 'Unknown Product' })) };
    });
    setReadyOrders(merged);
  };

  const fetchDispatchAssignments = async () => {
    if (!tenant?.id) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data: dispatchOrders } = await supabase.from('orders')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('status', 'Dispatch');
    if (!dispatchOrders || dispatchOrders.length === 0) { setDispatchAssignments([]); return; }

    const orderIds = dispatchOrders.map((o: any) => o.id);
    const { data: itemsData } = await supabase.from('order_items').select('*').in('order_id', orderIds);
    let productsData: any[] = [];
    if (itemsData && itemsData.length > 0) {
      const productIds = [...new Set(itemsData.map((i: any) => i.product_id))];
      const { data: pData } = await supabase.from('products').select('id, product_name').in('id', productIds);
      productsData = pData || [];
    }
    const pMap = new globalThis.Map(productsData.map((p: any) => [p.id, p.product_name]));

    const { data: assignData } = await supabase
      .from('delivery_assignments')
      .select('*, service_providers(full_name, phone, current_lat, current_lng)')
      .in('order_id', orderIds);

    const merged = dispatchOrders.map((o: any) => {
      const oItems = itemsData ? itemsData.filter((i: any) => i.order_id === o.id) : [];
      return {
        ...o,
        order_items: oItems.map((i: any) => ({ ...i, product_name: pMap.get(i.product_id) || 'Unknown Product' })),
        assignment: assignData?.find((a: any) => a.order_id === o.id)
      };
    });
    setDispatchAssignments(merged);
  };

  const fetchOnlineRiders = async () => {
    if (!tenant?.id) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase
      .from('service_providers')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .eq('is_online', true)
      .ilike('provider_type', 'rider');
    if (data) setOnlineRiders(data);
  };

  useEffect(() => {
    fetchReadyOrders();
    fetchDispatchAssignments();
    fetchOnlineRiders();
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const channel = supabase.channel('retail_online_orders_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => { fetchReadyOrders(); fetchDispatchAssignments(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_assignments' }, () => fetchDispatchAssignments())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenant?.id]);

  const handleMarkReady = async (orderId: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from('orders').update({ status: 'Ready to Pack' }).eq('id', orderId);
    if (error) { toast.error(error.message); return; }
    toast.success('Marked ready for pickup');
    fetchReadyOrders();
  };

  const handleAssignRider = async (orderId: string, riderId: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const order = readyOrders.find((o) => o.id === orderId);
    if (!order) return;
    const { error: assignError } = await supabase.from('delivery_assignments').insert({
      order_id: orderId,
      service_provider_id: riderId,
      status: 'assigned',
      pickup_address: 'Store',
      drop_address: order.delivery_address || order.address || 'Delivery Address',
      assigned_at: new Date().toISOString()
    });
    if (assignError) { toast.error(assignError.message); return; }
    await supabase.from('orders').update({ status: 'Dispatch' }).eq('id', orderId);
    toast.success('Rider assigned!');
    setAssigningOrderId(null);
    fetchReadyOrders();
  };

  const handleRejectOrder = async (orderId: string) => {
    if (!window.confirm('Reject this order?')) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from('orders').update({ status: 'Cancelled' }).eq('id', orderId);
    if (error) { toast.error(error.message); return; }
    toast.success('Order rejected');
    fetchReadyOrders();
  };

  const handlePrintOrderBill = (order: any) => {
    const itemsHtml = order.order_items?.map((oi: any) => `<div style="display:flex;justify-content:space-between;"><span>${oi.product_name} x${oi.quantity}</span><span>₹${oi.price * oi.quantity}</span></div>`).join('') || '';
    const win = window.open('', '_blank', 'width=400,height=600');
    if (!win) return;
    win.document.write(`<html><head><title>Order Bill</title></head><body style="font-family:sans-serif;padding:16px;"><h2>Order Bill</h2><p><b>Customer:</b> ${order.customer_name}</p><p><b>Address:</b> ${order.delivery_address || order.address}</p><hr/>${itemsHtml}<hr/><p style="font-size:18px;"><b>Total: ₹${order.total_amount}</b></p></body></html>`);
    win.document.close();
    win.print();
  };

  const newOrders = readyOrders.filter((o) => o.status === 'New');
  const readyToPackOrders = readyOrders.filter((o) => o.status === 'Ready to Pack');

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Online Orders Hub</h2>
        <p className="text-slate-500 dark:text-slate-400">Manage deliveries, picking, and dispatch kanban.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div>
          <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-3">New Orders ({newOrders.length})</h3>
          <div className="space-y-3">
            {newOrders.map((o) => (
              <Card key={o.id}>
                <div className="p-4">
                  <p className="font-bold text-slate-900 dark:text-slate-100">{o.customer_name}</p>
                  <p className="text-xs text-slate-400 mb-2">{o.delivery_address || o.address}</p>
                  {o.order_items?.map((oi: any) => (
                    <p key={oi.id} className="text-xs text-slate-600 dark:text-slate-400">{oi.product_name} x{oi.quantity}</p>
                  ))}
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => handleMarkReady(o.id)}>Mark Ready to Pack</Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs text-red-600 border-red-200" onClick={() => handleRejectOrder(o.id)}>Reject</Button>
                  </div>
                </div>
              </Card>
            ))}
            {newOrders.length === 0 && <p className="text-xs text-slate-400 py-4 text-center">No new orders</p>}
          </div>
        </div>

        <div>
          <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-3">Ready to Pack ({readyToPackOrders.length})</h3>
          <div className="space-y-3">
            {readyToPackOrders.map((o) => (
              <Card key={o.id}>
                <div className="p-4">
                  <p className="font-bold text-slate-900 dark:text-slate-100">{o.customer_name}</p>
                  <p className="text-xs text-slate-400 mb-2">{o.delivery_address || o.address}</p>
                  {assigningOrderId === o.id ? (
                    <div className="space-y-2 mt-2">
                      {onlineRiders.length === 0 ? (
                        <p className="text-xs text-slate-400">No riders online</p>
                      ) : (
                        onlineRiders.map((r) => (
                          <button key={r.id} onClick={() => handleAssignRider(o.id, r.id)} className="w-full text-left text-xs bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2 rounded-lg">{r.full_name}</button>
                        ))
                      )}
                      <button onClick={() => setAssigningOrderId(null)} className="text-xs text-slate-400">Cancel</button>
                    </div>
                  ) : (
                    <div className="space-y-2 mt-3">
                      <Button size="sm" variant="outline" className="w-full h-8 text-xs" onClick={() => setAssigningOrderId(o.id)}>Assign Rider</Button>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => handlePrintOrderBill(o)}>Print Bill</Button>
                        <Button size="sm" variant="outline" className="flex-1 h-8 text-xs text-red-600 border-red-200" onClick={() => handleRejectOrder(o.id)}>Reject</Button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
            {readyToPackOrders.length === 0 && <p className="text-xs text-slate-400 py-4 text-center">No orders to pack</p>}
          </div>
        </div>

        <div>
          <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-3">Dispatch ({dispatchAssignments.length})</h3>
          <div className="space-y-3">
            {dispatchAssignments.map((o: any) => (
              <Card key={o.id}>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-bold text-slate-900 dark:text-slate-100">{o.customer_name}</p>
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">DISPATCHED</span>
                  </div>
                  {o.assignment && (
                    <>
                      <p className="text-xs text-slate-500 mb-1">Assigned to {o.assignment.service_providers?.full_name}</p>
                      {o.assignment.service_providers?.phone && (
                        <a href={`tel:${o.assignment.service_providers.phone}`} className="text-xs text-blue-600 font-semibold underline">📞 {o.assignment.service_providers.phone}</a>
                      )}
                      {o.assignment.pickup_otp && o.assignment.status === 'assigned' && (
                        <div className="mt-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-700 uppercase">Pickup Code</span>
                          <span className="text-lg font-extrabold text-amber-800 tracking-widest">{o.assignment.pickup_otp}</span>
                        </div>
                      )}
                      {(o.assignment.status === 'assigned' || o.assignment.status === 'picked_up') && (
                        <div className="mt-3 -mx-4 -mb-4">
                          <LiveTrackingMap
                            deliveryAssignment={o.assignment}
                            destinationAddress={o.assignment.status === 'assigned' ? o.assignment.pickup_address : o.assignment.drop_address}
                            statusText={o.assignment.status === 'assigned' ? `${(o.assignment.service_providers?.full_name || 'Rider').split(' ')[0]} is heading to pick up` : `${(o.assignment.service_providers?.full_name || 'Rider').split(' ')[0]} is on the way`}
                            compact={true}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </Card>
            ))}
            {dispatchAssignments.length === 0 && <p className="text-xs text-slate-400 py-4 text-center">No active deliveries</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export const RetailScanGoOrdersPage = () => {
  const { currentTenantId, activeBranchId } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchScanGoInvoices = async () => {
    if (!currentTenantId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setLoading(true);
    const { data: invoiceData } = await supabase
      .from('sales_invoices')
      .select('*')
      .eq('tenant_id', currentTenantId)
      .eq('status', 'paid')
      .eq('order_source', 'scan_go')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!invoiceData || invoiceData.length === 0) { setInvoices([]); setLoading(false); return; }

    const invoiceIds = invoiceData.map((inv: any) => inv.id);
    const { data: itemsData } = await supabase
      .from('sales_invoice_items')
      .select('*')
      .in('sales_invoice_id', invoiceIds);

    const merged = invoiceData.map((inv: any) => ({
      ...inv,
      items: itemsData?.filter((it: any) => it.sales_invoice_id === inv.id) || []
    }));
    setInvoices(merged);
    setLoading(false);
  };

  const handlePrint = async (invoice: any) => {
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) return;

    const { data: branchInfo } = activeBranchId
      ? await supabase.from('branches').select('branch_name, address').eq('id', activeBranchId).maybeSingle()
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
      customer: { name: invoice.retail_customers?.customer_name || invoice.customer_name || 'Walk-in Customer' },
      meta: {
        label: 'Scan & Go Bill',
        number: invoice.invoice_number || invoice.id,
        date: new Date(invoice.created_at).toLocaleString()
      },
      items: (invoice.items || []).map((item: any) => ({
        name: (item as any).item_name || (item as any).product_name,
        qty: (item as any).quantity,
        rate: (item as any).price || (item as any).selling_price,
        amount: ((item as any).quantity * ((item as any).price || (item as any).selling_price)) - ((item as any).discount_value || 0)
      })),
      totals: {
        grand_total: Number(invoice.total_amount)
      },
      footer: {
        stamp_url: brandingInfo?.stamp_url
      },
      bill_number_code_type: brandingInfo?.bill_number_code_type || 'none'
    };

    await printBillForChannel(supabase, currentTenantId, 'scan_go', billData, '80mm');
  };

  useEffect(() => {
    fetchScanGoInvoices();
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const channel = supabase.channel('retail_scan_go_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_invoices' }, () => fetchScanGoInvoices())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentTenantId]);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Scan & Go Orders</h2>
          <p className="text-slate-500 dark:text-slate-400">Completed self-checkout transactions.</p>
        </div>
        <div className="bg-green-50 text-green-700 px-4 py-2 rounded-full font-bold text-sm border border-green-200">
          {invoices.length} Transactions
        </div>
      </div>

      {loading ? (
        <p className="text-center text-slate-400 py-12">Loading...</p>
      ) : invoices.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          <p className="text-slate-500 dark:text-slate-400">No completed Scan &amp; Go orders yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {invoices.map((inv: any) => (
            <Card key={inv.id}>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100">{inv.customer_name || 'Walk-in Customer'}</span>
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">PAID</span>
                </div>
                <p className="text-xs text-slate-400 mb-2">{inv.invoice_number} · {new Date(inv.created_at).toLocaleString()}</p>
                <div className="space-y-1 mb-3">
                  {inv.items.map((it: any) => (
                    <p key={it.id} className="text-xs text-slate-600 dark:text-slate-400">{it.item_name} x{it.quantity}</p>
                  ))}
                </div>
                <div className="border-t border-slate-100 dark:border-slate-800 pt-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Total</span>
                  <span className="text-lg font-extrabold text-primary">₹{inv.total_amount}</span>
                </div>
                <div className="mt-3">
                  <Button variant="outline" size="sm" onClick={() => handlePrint(inv)} className="gap-2 w-full">
                    <Printer size={14} /> Print Bill
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export function RetailPOSFullScreen({ branchConfig, initialTab, hideTabBar }: { branchConfig?: any; initialTab?: 'instore' | 'scan_go' | 'online' | 'invoices'; hideTabBar?: boolean } = {}) {
  const { tenant } = useTenant();
  const [activeTab, setActiveTab] = useState<'instore' | 'scan_go' | 'online' | 'invoices'>(initialTab || 'instore');
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    if (activeTab === 'scan_go' && !branchConfig?.is_scan_and_go_active) setActiveTab('instore');
    if (activeTab === 'online' && !branchConfig?.is_online_store_active) setActiveTab('instore');
  }, [branchConfig, activeTab]);
  const { user, currentTenantId, activeBranchId } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [heldBills, setHeldBills] = useState<HeldBill[]>([]);
  const [showHeldBills, setShowHeldBills] = useState(false);
  const [showSplitPayment, setShowSplitPayment] = useState(false);
  const [showUpiWaitModal, setShowUpiWaitModal] = useState(false);
  const [upiSessionStatus, setUpiSessionStatus] = useState<'pending' | 'paid' | null>(null);
  const [upiChannel, setUpiChannel] = useState<any>(null);
  const [splitAmounts, setSplitAmounts] = useState({ cash: 0, card: 0, upi: 0 });

  const [searchTerm, setSearchTerm] = useState('');
const [customerName, setCustomerName] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    if (!currentTenantId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const fetchCustomers = async () => {
      const { data } = await supabase
        .from('retail_customers')
        .select('*')
        .eq('tenant_id', currentTenantId);
      if (data) setCustomers(data);
    };
    fetchCustomers();
  }, [currentTenantId]);

  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanGoUsers, setScanGoUsers] = useState<any[]>([]);
  const [onlineOrders, setOnlineOrders] = useState<any[]>([]);
  const [deliveryAssignments, setDeliveryAssignments] = useState<any[]>([]);
  const [selectedVehicleType, setSelectedVehicleType] = useState<Record<string, string>>({});
  const [assignmentRefreshCount, setAssignmentRefreshCount] = useState(0);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);

  const handleEditInvoice = (invoice: any) => {
    setActiveTab('instore');
    
    // Convert invoice items to cart format
    const newCart: CartItem[] = (invoice.sales_invoice_items || []).map((item: any) => ({
      product_id: (item as any).product_id,
      product_name: (item as any).item_name,
      quantity: (item as any).quantity,
      selling_price: (item as any).price,
      discount_type: 'none',
      discount_value: 0
    }));
    
    setCart(newCart);
    if (invoice.retail_customers?.customer_name) {
      setCustomerName(invoice.retail_customers.customer_name);
    } else {
      setCustomerName('');
    }
    
    toast.success('Invoice ready for editing in POS');
  };

  
  const simulateOnlineOrder = async () => {
    if (!currentTenantId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const mockOrder = {
      id: 'ORD-' + Math.floor(Math.random() * 1000000),
      merchant_id: user?.id,
      
      customer_name: 'Online Customer ' + Math.floor(Math.random() * 100),
      total_amount: Math.floor(Math.random() * 500) + 100,
      status: 'Pending',
      payment_method: 'online',
      created_at: new Date().toISOString()
    };
    const { error } = await supabase.from('orders').insert(mockOrder);
    if (!error) {
       setOnlineOrders([mockOrder, ...onlineOrders]);
    } else {
       console.error("Failed to simulate order:", error);
    }
  };

  const [receiptData, setReceiptData] = useState<{items: CartItem[], total: number, date: string, invoiceNumber: string, customerName?: string} | null>(null);

  React.useEffect(() => {
    if (!currentTenantId) return;
    const fetchProducts = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data: catData } = await supabase.from('product_categories').select('*').eq('tenant_id', currentTenantId);
      if (catData) setCategories(catData);
      
      const { data, error } = await supabase.from('products').select('*, product_stock(*)').eq('tenant_id', currentTenantId);
      if (error) console.error("fetchProducts error:", error);
      if (data) {
        const prods = data.map((p: any) => ({
          id: p.id,
          product_name: p.product_name,
          barcode: p.barcode,
          selling_price: p.selling_price,
          category_id: p.category_id,
          category_name: catData?.find((c: any) => c.id === p.category_id)?.category_name,
          stock: p.product_stock?.[0]?.current_quantity || 0,
          photo: p.photo
        }));
        setProducts(prods);
      }
      
      // Fetch scan go users (using retail_customers as proxy for active shoppers)
      const { data: customers } = await supabase.from('retail_customers').select('*').eq('tenant_id', currentTenantId).neq('enable', false).limit(5);
      if (customers) setScanGoUsers(customers);
      
      // Fetch online orders safely
      const { data: ordersData } = await supabase.from('orders')
         .select('*')
         .eq('tenant_id', currentTenantId)
         .order('created_at', { ascending: false })
         .limit(50);
         
      if (ordersData && ordersData.length > 0) {
         const orderIds = ordersData.map((o: any) => o.id);
         const { data: itemsData } = await supabase.from('order_items').select('*').in('order_id', orderIds);
         
         let productsData: any[] = [];
         if (itemsData && itemsData.length > 0) {
             const productIds = [...new Set(itemsData.map((i: any) => i.product_id))];
             const { data: pData } = await supabase.from('products').select('id, product_name').in('id', productIds);
             productsData = pData || [];
         }
         
         const pMap = new globalThis.Map(productsData.map(p => [p.id, p.product_name]));
         
         const mergedOrders = ordersData.map((o: any) => {
            const oItems = itemsData ? itemsData.filter((i: any) => i.order_id === o.id) : [];
            return {
               ...o,
               order_items: oItems.map((i: any) => ({
                  ...i,
                  products: { product_name: pMap.get(i.product_id) || 'Unknown Product' }
               }))
            };
         });
         setOnlineOrders(mergedOrders);
      } else {
         setOnlineOrders([]);
      }

      // Fetch recent invoices
      const { data: invData } = await supabase.from('sales_invoices')
        .select('*')
        .eq('tenant_id', currentTenantId)
        .eq('order_source', 'in_store')
        .order('created_at', { ascending: false })
        .limit(50);
      if (invData && invData.length > 0) {
        const customerIds = [...new Set(invData.map((i: any) => i.customer_id).filter(Boolean))];
        if (customerIds.length > 0) {
          const { data: customersData } = await supabase.from('retail_customers').select('id, customer_name').in('id', customerIds);
          if (customersData) {
            invData.forEach((inv: any) => {
              const cust = customersData.find((c: any) => c.id === inv.customer_id);
              if (cust) {
                inv.retail_customers = { customer_name: cust.customer_name };
              }
            });
          }
        }
        setRecentInvoices(invData);
      }
    };
    fetchProducts();
  }, [currentTenantId]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) return;
    const fetchAssignments = async () => {
      const dispatchOrderIds = onlineOrders.filter((o: any) => o.status === 'Dispatch' || o.status === 'Completed').map((o: any) => o.id);
      if (dispatchOrderIds.length === 0) {
        setDeliveryAssignments([]);
        return;
      }
      const { data } = await supabase.from('delivery_assignments').select('*, service_providers(full_name, phone, current_lat, current_lng)').in('order_id', dispatchOrderIds);
      if (data) setDeliveryAssignments(data);
    };
    fetchAssignments();
  }, [onlineOrders, currentTenantId, assignmentRefreshCount]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const channel = supabase.channel('retail_assignments_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_assignments' }, () => {
         setAssignmentRefreshCount(c => c + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
       const supabase = getSupabaseClient();
       if (!supabase) return;
       if (newStatus === 'Dispatch') {
         const { error } = await supabase.rpc('create_delivery_job', { p_order_id: orderId });
         if (error) throw error;
         setOnlineOrders(prev => prev.map((o: any) => o.id === orderId ? { ...o, status: newStatus } : o));
         // Optional: if it tracks assignments, it would refetch here.
       } else {
         const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
         if (error) throw error;
         setOnlineOrders(prev => prev.map((o: any) => o.id === orderId ? { ...o, status: newStatus } : o));
       }
    } catch(err: any) {
       console.error("Failed to update order status FULL ERROR:", err);
       toast.error("RPC Error: " + (err.message || JSON.stringify(err)));
    }
  };

  const printOrderBillAndLabel = async (order: any) => {
    const itemsList = Array.isArray(order.items) ? order.items : (order.order_items || []).map((oi: any) => ({ name: oi.products?.product_name || 'Item', quantity: oi.quantity, price: oi.price }));
    const orderTotal = itemsList.reduce((sum: number, it: any) => sum + (it.price * it.quantity), 0);
    const shortId = order.id.substring(0, 8).toUpperCase();

    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) return;

    // Look up the merchant's selected bill-template + branding for the 
    // "online" channel — same lookup logic printBillForChannel uses 
    // internally, done here manually since we need to combine the 
    // rendered bill with a second (shipping-label) page in ONE print job.
    let blocks: BillBlock[] = [];
    let printerSize = '80mm';
    const { data: selection } = await supabase.from('bill_format_selection').select('template_id, printer_size').eq('tenant_id', currentTenantId).eq('channel', 'online').maybeSingle();
    if (selection?.template_id) {
      const { data: template } = await supabase.from('bill_templates').select('blocks, printer_size').eq('id', selection.template_id).maybeSingle();
      if (template) { blocks = template.blocks; printerSize = template.printer_size; }
    }
    if (blocks.length === 0) {
      const { data: defaultTemplate } = await supabase.from('bill_templates').select('blocks, printer_size').eq('printer_size', '80mm').eq('style_name', 'Classic').eq('is_default', true).maybeSingle();
      if (defaultTemplate) { blocks = defaultTemplate.blocks; printerSize = defaultTemplate.printer_size; }
    }

    const { data: branchInfo } = activeBranchId
      ? await supabase.from('branches').select('branch_name, address').eq('id', activeBranchId).maybeSingle()
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
      customer: { name: order.customer_name || 'N/A', phone: order.customer_phone || undefined },
      customer_info_label: 'Ship To',
      meta: {
        label: 'Online Order Invoice',
        number: shortId,
        date: new Date(order.created_at).toLocaleString()
      },
      items: itemsList.map((it: any) => ({
        name: it.name,
        qty: it.quantity,
        rate: it.price,
        amount: it.price * it.quantity
      })),
      totals: { grand_total: orderTotal },
      footer: { stamp_url: brandingInfo?.stamp_url },
      bill_number_code_type: brandingInfo?.bill_number_code_type || 'none'
    };

    const billHtml = blocks.length > 0 ? renderBillHtml(blocks, billData, printerSize) : '';
    const pageCss = getBillPageCss(printerSize);

    const combinedHtml = `
      <html>
        <head>
          <title>Bill and Label - ${shortId}</title>
          <style>
            ${pageCss}
            body { font-family: sans-serif; }
            .bill-page { page-break-after: always; }
            .label-page { padding: 10px; }
            .label-box { border: 2px solid #000; padding: 16px; border-radius: 6px; max-width: 380px; margin: 40px auto; }
            .label-title { font-size: 11px; letter-spacing: 1px; color: #555; text-transform: uppercase; margin-bottom: 4px; }
            .name { font-size: 20px; font-weight: bold; margin-bottom: 6px; }
            .address { font-size: 15px; line-height: 1.5; margin-bottom: 14px; }
            .phone { font-size: 14px; margin-bottom: 14px; }
            .order-id { font-size: 12px; color: #666; border-top: 1px dashed #999; padding-top: 10px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="bill-page">${billHtml}</div>
          <div class="label-page">
            <div class="label-box">
              <div class="label-title">Ship To</div>
              <div class="name">${order.customer_name || 'N/A'}</div>
              <div class="address">${order.address || order.delivery_address || 'No address provided'}</div>
              <div class="phone">Phone: ${order.customer_phone || 'N/A'}</div>
              <div class="order-id">Order #${shortId}</div>
            </div>
          </div>
        </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    const win = iframe.contentWindow;
    if (win) {
      win.document.write(combinedHtml);
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
        setTimeout(() => document.body.removeChild(iframe), 500);
      }, 200);
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    const reason = window.prompt('Reason for rejecting this order (optional):');
    if (reason === null) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.rpc('reject_online_order', { p_order_id: orderId, p_reason: reason || null });
    if (error) { toast.error(error.message); return; }
    setOnlineOrders((prev: any) => prev.filter((o: any) => o.id !== orderId));
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find((p: any) => p.product_id === product.id);
      if (existing) {
        return prev.map((p: any) => p.product_id === product.id ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, {
        product_id: product.id,
        product_name: product.product_name,
        quantity: 1,
        selling_price: product.selling_price,
        discount_type: 'none',
        discount_value: 0
      }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if ((item as any).product_id === id) {
        const newQ = (item as any).quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => (item as any).product_id !== id));
  };

  
  const grandTotal = cart.reduce((sum, item) => sum + ((item as any).quantity * (item as any).selling_price), 0);

  const handleHoldBill = () => {
    if (cart.length === 0) return;
    setHeldBills([...heldBills, { id: 'HB-' + Math.floor(Math.random()*10000), cart, time: new Date().toLocaleTimeString() }]);
    setCart([]);
    toast.success('Bill placed on hold');
  };

  const handleRestoreBill = (bill: HeldBill) => {
    setCart(bill.cart);
    setHeldBills(heldBills.filter(b => b.id !== bill.id));
    setShowHeldBills(false);
  };

  const handlePrint = async (cartToPrint: CartItem[], total: number, invoiceNum?: string) => {
    let printerSize = '80mm';
    try {
      const saved = localStorage.getItem(tenantScopedKey('posSettings', currentTenantId));
      if (saved) {
        const settings = JSON.parse(saved);
        if (settings['instore']) {
          printerSize = settings['instore'].printerSize || '80mm';
        }
      }
    } catch (e) {}

    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) return;

    const { data: branchInfo } = activeBranchId
      ? await supabase.from('branches').select('branch_name, address').eq('id', activeBranchId).maybeSingle()
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
      customer: { name: receiptData?.customerName || 'Walk-in Customer' },
      meta: {
        label: 'Retail Invoice',
        number: invoiceNum || 'N/A',
        date: new Date().toLocaleString()
      },
      items: cartToPrint.map(item => ({
        name: (item as any).product_name,
        qty: (item as any).quantity,
        rate: (item as any).selling_price,
        amount: (item as any).quantity * (item as any).selling_price
      })),
      totals: {
        grand_total: total
      },
      footer: {
        stamp_url: brandingInfo?.stamp_url,
        signature_label: undefined
      },
      bill_number_code_type: brandingInfo?.bill_number_code_type || 'none'
    };

    await printBillForChannel(supabase, currentTenantId, 'instore', billData, printerSize);
  };


  
    const handleUpiPayment = async () => {
    if (cart.length === 0 || !currentTenantId || !user) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    let branchId = activeBranchId;
    if (!branchId) {
      toast.error("No active branch selected. Please select a branch from Switch Business.");
      return;
    }

    setShowUpiWaitModal(true);
    setUpiSessionStatus('pending');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error('Please login again'); setShowUpiWaitModal(false); return; }

    try {
      const response = await fetch('/api/create-dynamic-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.access_token },
        body: JSON.stringify({
          tenant_id: currentTenantId,
          branch_id: branchId,
          amount: grandTotal,
          reference_type: 'pos_sale',
          reference_id: null
        })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to generate QR');
      }

      const channel = supabase
        .channel('pos_upi_wait_' + branchId + '_' + Date.now())
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'pos_display_sessions', filter: 'branch_id=eq.' + branchId },
          (payload: any) => {
            if (payload.new.status === 'paid') {
              setUpiSessionStatus('paid');
              supabase.removeChannel(channel);
              setTimeout(() => {
                setShowUpiWaitModal(false);
                setUpiSessionStatus(null);
                handleCheckout('upi');
              }, 1500);
            }
          }
        )
        .subscribe();
      setUpiChannel(channel);
    } catch (err) {
      toast.error((err as any)?.message || 'Failed to start UPI payment');
      setShowUpiWaitModal(false);
      setUpiSessionStatus(null);
    }
  };

    const handleCheckout = async (paymentMethod = 'cash', amountPaid = grandTotal) => {
    if (cart.length === 0 || !currentTenantId || !user) return;
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      let finalCustomerId = selectedCustomer?.id || null;

      // If new customer details provided but no selected customer
      if (!finalCustomerId && (customerName || customerPhone)) {
        if (customerPhone) {
          const { data: existing } = await supabase.from('retail_customers').select('id, customer_name, phone').eq('tenant_id', currentTenantId).eq('phone', customerPhone).single();
          if (existing) finalCustomerId = existing.id;
        }

        if (!finalCustomerId) {
          const { data: newCust, error: newCustErr } = await supabase.from('retail_customers').insert({
            tenant_id: currentTenantId,
            customer_name: customerName || 'Unknown',
            phone: customerPhone || null,
            address: customerAddress || null,
            email: null
          }).select().single();
          if (newCust && !newCustErr) {
            finalCustomerId = newCust.id;
            setCustomers(prev => [...prev, newCust]);
          } else if (newCustErr) {
            console.error('Failed to save customer:', newCustErr.message);
            toast.error('Customer save failed: ' + newCustErr.message);
          }
        }
      }

      let branchId = activeBranchId;
      if (!branchId) {
        toast.error("No active branch selected. Please select a branch from Switch Business.");
        setLoading(false);
        return;
      }

      
      const rpcPayload = {
        p_tenant_id: currentTenantId,
        p_branch_id: branchId,
        p_cashier_id: user.id,
        p_customer_id: finalCustomerId,
        p_pos_shift_id: null,
        p_payment_method: paymentMethod,
        p_seller_state_code: '27',
        p_buyer_state_code: '27',
        p_items: cart.map(item => ({
          product_id: (item as any).product_id,
          quantity: (item as any).quantity,
          discount_type: 'amount',
          discount_value: 0
        }))
      };

      const { data, error } = await supabase.rpc('create_pos_sale', rpcPayload);
      
      if (error) {
         console.error('RPC ERROR: ', JSON.stringify(error, null, 2));
         toast.error(error.message || 'Failed to complete sale');
         setLoading(false);
         return;
      }
      
      
      let finalInvoiceNumber = 'INV-UNKNOWN';
      let finalInvoiceId = data; // data is the UUID returned by create_pos_sale

      if (data && typeof data === 'string') {
        const { data: invData } = await supabase
          .from('sales_invoices')
          .select('invoice_number')
          .eq('id', data)
          .single();
        if (invData) {
          finalInvoiceNumber = invData.invoice_number;
        }
      } else if (data && data.invoice_number) {
        // Just in case it actually returns an object
        finalInvoiceNumber = data.invoice_number;
        finalInvoiceId = data.sales_invoice_id || data.id;
      }
      
      toast.success('Sale completed successfully!');
      
      setReceiptData({
        items: [...cart],
        total: grandTotal,
        date: new Date().toLocaleString(),
        invoiceNumber: finalInvoiceNumber,
        customerName: customerName || selectedCustomer?.customer_name || 'Walk-in Customer'
      });
      
      const newInvoice = {
        id: finalInvoiceId,
        invoice_number: finalInvoiceNumber,
        created_at: new Date().toISOString(),
        total_amount: grandTotal,
        status: 'paid',
        retail_customers: { customer_name: customerName || selectedCustomer?.customer_name || 'Walk-in Customer' },
        sales_invoice_items: cart.map(item => ({
          item_name: (item as any).product_name,
          quantity: (item as any).quantity,
          price: (item as any).selling_price
        }))
      };
      setRecentInvoices(prev => [newInvoice, ...prev]);
      
      try {
        const localKey = tenantScopedKey('local_sales_invoices', currentTenantId);
        const localStr = localStorage.getItem(localKey);
        let allLocal = localStr ? JSON.parse(localStr) : [];
        allLocal = [newInvoice, ...allLocal];
        localStorage.setItem(localKey, JSON.stringify(allLocal));
      } catch(e) {}
      
      setCart([]);

      setShowSplitPayment(false);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setSelectedCustomer(null);
      setShowCustomerDropdown(false);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to complete sale: ' + JSON.stringify(err));
console.error('POS ERROR', err);
    } finally {
      setLoading(false);
    }
  };

  const submitSplitPayment = () => {
    const totalSplit = Number(splitAmounts.cash) + Number(splitAmounts.card) + Number(splitAmounts.upi);
    if (Math.abs(totalSplit - grandTotal) > 0.01) {
      toast.error('Split amounts must equal the grand total.');
      return;
    }
    handleCheckout('split', grandTotal);
  };


  const filteredProducts = products.filter((p: any) => {
    const matchesSearch = p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.barcode && p.barcode.includes(searchTerm));
    const matchesCat = activeCategory === 'all' || p.category_name?.toLowerCase() === activeCategory;
    return matchesSearch && matchesCat;
  });


  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-slate-50 dark:bg-slate-900">
      {/* Top Tabs */}
      {/* Top tab bar removed — "Recent Sales" moved to the sidebar 
          menu (retail.recent_sales), "In-Store POS" is this screen's 
          only remaining view. */}

      <div className="flex flex-col md:flex-row flex-1 overflow-y-auto md:overflow-hidden">
        {activeTab === 'instore' && (
          <>
        {/* Left Panel: Cart */}
        <div className="w-full md:w-1/2 flex-none md:flex-none flex flex-col bg-white dark:bg-slate-950 border-t md:border-t-0 md:border-r order-2 md:order-1 min-h-[500px] md:min-h-0">
          <div className="p-4 border-b flex flex-col gap-3">
            <div className="relative flex gap-2">
              <Input 
                placeholder="Customer Name" 
                className="h-9 text-sm w-1/3" 
                value={customerName} 
                onFocus={() => setShowCustomerDropdown(true)}
                onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                onChange={e => {
                  setCustomerName(e.target.value);
                  setSelectedCustomer(null);
                  setShowCustomerDropdown(true);
                }} 
              />
              <Input 
                placeholder="Mobile Number" 
                className="h-9 text-sm w-1/3" 
                value={customerPhone} 
                onFocus={() => setShowCustomerDropdown(true)}
                onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                onChange={e => {
                  setCustomerPhone(e.target.value);
                  setSelectedCustomer(null);
                  setShowCustomerDropdown(true);
                }} 
              />
              <Input 
                placeholder="Address" 
                className="h-9 text-sm w-1/3" 
                value={customerAddress} 
                onChange={e => setCustomerAddress(e.target.value)} 
              />

              {showCustomerDropdown && (customerName || customerPhone) && !selectedCustomer && (
                <div className="absolute top-10 left-0 w-[66%] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                   {customers.filter((c: any) => 
                      (customerName && c.customer_name?.toLowerCase().includes(customerName.toLowerCase())) || 
                      (customerPhone && c.phone?.includes(customerPhone))
                   ).length > 0 ? customers.filter((c: any) => 
                      (customerName && c.customer_name?.toLowerCase().includes(customerName.toLowerCase())) || 
                      (customerPhone && c.phone?.includes(customerPhone))
                   ).map((c: any) => (
                     <div 
           key={c.id} 
           className="p-2 border-b hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer"
           onMouseDown={(e) => {
             e.preventDefault(); // Prevent blur
             setSelectedCustomer(c);
             setCustomerName(c.customer_name || '');
             setCustomerPhone(c.phone || '');
             setCustomerAddress(c.address || '');
             setShowCustomerDropdown(false);
           }}
         >
           <p className="text-sm font-bold">{c.customer_name}</p>
           <p className="text-xs text-slate-500 dark:text-slate-400">{c.phone}{c.address ? ' • ' + c.address : ''}</p>
         </div>
                   )) : (
                     <div className="p-3 text-sm text-slate-500 dark:text-slate-400 text-center flex flex-col items-center">
                       <span className="font-medium text-slate-700 dark:text-slate-300 block mb-1">New Customer</span>
                       A new customer record will be created automatically.
                     </div>
                   )}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Scan Barcode or Search..." 
                  className="pl-9 h-9 w-full"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && searchTerm) {
                      const match = products.find((p: any) => p.barcode === searchTerm || p.product_name.toLowerCase() === searchTerm.toLowerCase());
                      if (match) {
                        addToCart(match);
                        setSearchTerm('');
                      }
                    }
                  }}
                />
              </div>
              <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-slate-600 dark:text-slate-400">
                  <path d="M4 6V4H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M18 4H20V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M4 18V20H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M18 20H20V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 8H16V10H8V8Z" fill="currentColor"/>
                  <path d="M8 11H16V13H8V11Z" fill="currentColor"/>
                  <path d="M8 14H12V16H8V14Z" fill="currentColor"/>
                  <path d="M14 14H16V16H14V14Z" fill="currentColor"/>
                </svg>
              </Button>
            </div>
          </div>
          
          <div className="flex text-xs font-bold text-slate-500 dark:text-slate-400 px-4 py-2 border-b uppercase">
            <div className="flex-1">Item</div>
            <div className="w-16 text-center">Qty</div>
            <div className="w-20 text-right">Discount</div>
            <div className="w-24 text-right">Total</div>
          </div>

          <div className="flex-1 overflow-y-auto relative bg-slate-50 dark:bg-slate-900 flex flex-col min-h-[300px] md:min-h-0">
             {cart.length === 0 ? (
             <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                <ShoppingCart size={64} className="mb-4 text-slate-200" />
                <p className="font-semibold text-slate-500 dark:text-slate-400">Cart is empty</p>
                <p className="text-sm">Scan or tap products to add</p>
             </div>
           ) : (
             <div className="flex-1 overflow-y-auto w-full p-2 space-y-2">
               {cart.map(item => (
                 <div key={(item as any).product_id} className="flex items-center text-sm bg-white dark:bg-slate-950 p-2 rounded shadow-sm border border-slate-100 dark:border-slate-800">
                   <div className="flex-1 font-medium">{(item as any).product_name}</div>
                   <div className="w-20 flex items-center justify-center gap-2">
                     <button onClick={() => updateQuantity((item as any).product_id, -1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 dark:text-slate-400"><Minus size={14}/></button>
                     <span>{(item as any).quantity}</span>
                     <button onClick={() => updateQuantity((item as any).product_id, 1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 dark:text-slate-400"><Plus size={14}/></button>
                   </div>
                   <div className="w-16 text-right text-slate-500 dark:text-slate-400">-</div>
                   <div className="w-20 text-right font-bold pr-2 flex items-center justify-end gap-2">
                     ₹{((item as any).quantity * (item as any).selling_price).toFixed(2)}
                     <button onClick={() => removeFromCart((item as any).product_id)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                   </div>
                 </div>
               ))}
             </div>
           )}
             
             
          </div>

          <div className="p-4 border-t bg-white dark:bg-slate-950 space-y-4">
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleHoldBill} disabled={cart.length === 0} className="flex-1 h-10 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  Hold Bill
                </div>
              </Button>
              <Button variant="outline" onClick={() => { setSplitAmounts({ cash: grandTotal, card: 0, upi: 0 }); setShowSplitPayment(true); }} disabled={cart.length === 0} className="flex-1 h-10 border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300">
                Split Payment
              </Button>
              {heldBills.length > 0 && (
                <Button variant="outline" onClick={() => setShowHeldBills(true)} className="h-10 border-slate-200 dark:border-slate-800 font-bold text-orange-600">
                  {heldBills.length} Held
                </Button>
              )}
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">GRAND TOTAL</p>
                <p className="text-4xl font-bold text-slate-900 dark:text-slate-100">₹{grandTotal.toFixed(2)}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => handleCheckout('cash')} disabled={loading || cart.length === 0} className="h-14 px-4 bg-[#858d9d] hover:bg-[#737a8a] text-white font-bold text-sm rounded-lg shadow-sm">
                  Cash
                </Button>
                <Button onClick={() => handleCheckout('card')} disabled={loading || cart.length === 0} className="h-14 px-4 bg-slate-700 hover:bg-slate-800 text-white font-bold text-sm rounded-lg shadow-sm">
                  Card
                </Button>
                <Button onClick={handleUpiPayment} disabled={loading || cart.length === 0} className="h-14 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg shadow-sm">
                  UPI
                </Button>
              </div>
              </div>
              </div>
              </div>

              {showUpiWaitModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                  <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-xl w-full max-w-sm p-8 text-center">
                    {upiSessionStatus === 'paid' ? (
                      <>
                        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                          <span className="text-3xl">✓</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Payment Received!</h3>
                      </>
                    ) : (
                      <>
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Waiting for Payment</h3>
                        <p className="text-sm text-slate-500 mt-1">QR code is showing on customer display</p>
                        <p className="text-2xl font-extrabold text-emerald-600 mt-3">₹{grandTotal.toFixed(2)}</p>
                        <Button variant="outline" className="w-full mt-6" onClick={() => { const supabase = getSupabaseClient(); if (supabase && upiChannel) { supabase.removeChannel(upiChannel); setUpiChannel(null); } setShowUpiWaitModal(false); setUpiSessionStatus(null); }}>Cancel</Button>
                      </>
                    )}
                  </div>
                </div>
              )}
              {/* Right Panel: Products */}
        <div className="flex-none md:w-1/2 flex flex-col p-2 md:p-4 bg-slate-50 dark:bg-slate-900 order-1 md:order-2 max-h-[60vh] md:max-h-none min-h-[400px] md:min-h-0">
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
            <button 
              onClick={() => setActiveCategory('all')}
              className={`px-6 py-2 rounded-full text-sm font-bold border transition-colors whitespace-nowrap ${activeCategory === 'all' ? 'bg-slate-900 dark:bg-slate-100 dark:bg-slate-800 text-white dark:text-slate-900 dark:text-slate-100 border-slate-900 dark:border-slate-100 dark:border-slate-800' : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}`}
            >
              All
            </button>
            {categories.map(cat => (
              <button 
                key={cat.id}
                onClick={() => setActiveCategory(cat.category_name.toLowerCase())}
                className={`px-6 py-2 rounded-full text-sm font-bold border transition-colors whitespace-nowrap ${activeCategory === cat.category_name.toLowerCase() ? 'bg-slate-900 dark:bg-slate-100 dark:bg-slate-800 text-white dark:text-slate-900 dark:text-slate-100 border-slate-900 dark:border-slate-100 dark:border-slate-800' : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}`}
              >
                {cat.category_name}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto max-h-[500px] md:max-h-none">
             <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-4">
                {filteredProducts.length === 0 && (
                  <div className="col-span-full text-center text-slate-500 dark:text-slate-400 py-12">No products found.</div>
                )}
                {filteredProducts.map((p: any) => (
                  <div key={p.id} onClick={() => addToCart(p)} className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden cursor-pointer hover:shadow-md transition-shadow flex flex-col h-28 md:h-48 relative">
                    <div className="flex-1 bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-2 md:p-4 overflow-hidden">
                      {p.photo ? (
                        <img src={p.photo} alt={p.product_name} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <Package className="w-8 h-8 md:w-16 md:h-16 text-slate-300 stroke-[1.5]" />
                      )}
                    </div>
                    <div className="p-1 md:p-3 border-t text-center flex flex-col justify-center">
                      <p className="text-[9px] md:text-xs text-slate-800 dark:text-slate-200 font-medium truncate" title={p.product_name}>{p.product_name}</p>
                      <p className="text-xs text-blue-500 font-medium mb-1 hidden md:block">• Stock: {p.stock || 0}</p>
                      <p className="font-bold text-[10px] md:text-sm text-slate-900 dark:text-slate-100">₹{p.selling_price}</p>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
        </>
        )}
        
        {activeTab === 'scan_go' && branchConfig?.is_scan_and_go_active && (
          <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
            <div className="bg-white dark:bg-slate-950 border rounded-xl p-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Live Scan & Go</h2>
                <p className="text-slate-500 dark:text-slate-400">Monitor self-checkout customers in real-time.</p>
              </div>
              <div className="bg-green-50 text-green-700 px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 border border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                {scanGoUsers.length} Active Shoppers
              </div>
            </div>
            <div className="flex gap-6 items-start flex-wrap">
              {scanGoUsers.length === 0 ? (
                <div className="w-full text-center py-12 text-slate-500 dark:text-slate-400">No active shoppers found.</div>
              ) : (
                scanGoUsers.map((user, idx) => (
                  <div key={user.id} className={`w-96 bg-white dark:bg-slate-950 border-[2.5px] ${idx % 2 === 0 ? 'border-green-400' : 'border-blue-500'} rounded-xl p-6 flex flex-col gap-6 shadow-sm relative overflow-hidden`}>
                    <div className={`absolute top-0 ${idx % 2 === 0 ? 'right-0 w-2' : 'left-0 w-1.5'} h-full ${idx % 2 === 0 ? 'bg-green-400' : 'bg-blue-500'}`}></div>
                    <div className="flex justify-between items-start">
                      <div className="flex gap-4">
                        <div className={`w-12 h-12 ${idx % 2 === 0 ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'} rounded-full flex items-center justify-center font-bold text-lg`}>
                          {user.customer_name ? user.customer_name.substring(0, 2).toUpperCase() : 'CU'}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">{user.customer_name}</h3>
                          <p className="text-slate-500 dark:text-slate-400 text-sm">ID: SG-{user.id.substring(0,4)} • {idx % 2 === 0 ? 'Shopping...' : 'Checking out'}</p>
                        </div>
                      </div>
                      <div className={`${idx % 2 === 0 ? 'bg-green-100 text-green-800' : 'bg-blue-600 text-white'} px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1`}>
                        {idx % 2 === 0 ? 'Shopping...' : <><CheckCircle2 size={14}/> Payment Cleared</>}
                      </div>
                    </div>
                    {idx % 2 !== 0 ? (
                      <>
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">TOTAL PAID</p>
                          <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">₹ {(Math.random() * 2000).toFixed(2)}</p>
                        </div>
                        <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base rounded-lg">Clear Exit</Button>
                      </>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center text-sm border-b pb-3">
                          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-medium"><CheckCircle2 size={16} className="text-green-500"/> Scanned Item 1</div>
                          <span className="text-slate-400 text-xs">1m ago</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-medium"><CheckCircle2 size={16} className="text-green-500"/> Scanned Item 2</div>
                          <span className="text-slate-400 text-xs">3m ago</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'online' && branchConfig?.is_online_store_active && (
          <div className="flex-1 p-6 flex flex-col gap-6 overflow-hidden">
            <div className="bg-white dark:bg-slate-950 border rounded-xl p-6 flex items-center justify-between shadow-sm">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Online Orders Hub</h2>
                <p className="text-slate-500 dark:text-slate-400">Manage deliveries, picking, and dispatch kanban.</p>
              </div>
            </div>
            
            <div className="flex flex-1 gap-6 overflow-x-auto pb-4">
              {/* New Orders */}
              <div className="flex-1 min-w-[300px] flex flex-col gap-4">
                <div className="bg-white dark:bg-slate-950 rounded-xl border p-4 flex items-center justify-between shadow-sm">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">New Orders</h3>
                  <span className="bg-orange-50 text-orange-600 border border-orange-100 text-xs font-bold px-2 py-0.5 rounded-full">
                    {onlineOrders.filter((o: any) => o.status === 'New').length}
                  </span>
                </div>
                <div className="flex-1 bg-slate-50 dark:bg-slate-900 rounded-xl flex flex-col gap-3 p-2 overflow-y-auto">
                    {onlineOrders.filter((o: any) => o.status === 'New').map((order: any) => (
                      <div key={order.id} className="bg-white dark:bg-slate-950 p-4 border rounded-lg shadow-sm flex flex-col gap-2">
                        <div className="flex justify-between font-bold">
                          <span>{order.customer_name}</span>
                          <span>₹{order.total}</span>
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Order #{order.id.substring(0,6)} • {order.payment_method}</span>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                           {order.order_items?.map((item: any, i: number) => (
                              <div key={i}>- {(item as any).quantity}x {(item as any).products?.product_name || 'Unknown Item'}</div>
                           ))}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Button variant="outline" className="flex-1 text-sm" onClick={() => updateOrderStatus(order.id, 'Ready to Pack')}>Mark as Ready</Button>
                          <Button variant="outline" className="flex-1 text-sm border-red-300 text-red-600 hover:bg-red-50" onClick={() => handleRejectOrder(order.id)}>Reject</Button>
                        </div>
                      </div>
                    ))}
                    {onlineOrders.filter((o: any) => o.status === 'New').length === 0 && (
                       <div className="text-center p-8 text-slate-400 text-sm">No new online orders</div>
                    )}
                </div>
              </div>

              {/* Ready to Pack */}
              <div className="flex-1 min-w-[300px] flex flex-col gap-4">
                <div className="bg-white dark:bg-slate-950 rounded-xl border p-4 flex items-center justify-between shadow-sm">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">Ready to Pack</h3>
                  <span className="bg-blue-50 text-blue-600 border border-blue-100 text-xs font-bold px-2 py-0.5 rounded-full">
                     {onlineOrders.filter((o: any) => o.status === 'Ready to Pack').length}
                  </span>
                </div>
                <div className="flex-1 bg-slate-50 dark:bg-slate-900 rounded-xl flex flex-col gap-3 p-2 overflow-y-auto">
                    {onlineOrders.filter((o: any) => o.status === 'Ready to Pack').map((order: any) => (
                      <div key={order.id} className="bg-white dark:bg-slate-950 p-4 border rounded-lg shadow-sm flex flex-col gap-2">
                        <div className="flex justify-between font-bold">
                          <span>{order.customer_name}</span>
                          <span>₹{order.total}</span>
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Order #{order.id.substring(0,6)}</span>
                        <div className="mt-2 mb-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Delivery Vehicle Required</p>
                          <div className="grid grid-cols-3 gap-1">
                            {(['bike', 'auto', 'car'] as const).map(vt => (
                              <button
                                key={vt}
                                type="button"
                                onClick={() => setSelectedVehicleType(prev => ({ ...prev, [order.id]: vt }))}
                                className={`py-1 rounded text-[10px] font-bold uppercase border-2 transition-colors ${(selectedVehicleType[order.id] || 'bike') === vt ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'}`}
                              >
                                {vt}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" className="flex-1 text-xs" onClick={() => printOrderBillAndLabel(order)}>Print Bill + Label</Button>
                          <Button className="flex-1 text-xs bg-blue-600 hover:bg-blue-700 text-white" onClick={() => {
                            const vehicleType = selectedVehicleType[order.id] || 'bike';
                            const supabase = getSupabaseClient();
                            supabase?.rpc('create_delivery_job', { p_order_id: order.id, p_vehicle_type: vehicleType }).then(({ error }: any) => {
                              if (error) { toast.error(error.message); return; }
                              setOnlineOrders((prev: any) => prev.map((o: any) => o.id === order.id ? { ...o, status: 'Dispatch' } : o));
                            });
                          }}>Dispatch</Button>
                          <Button variant="outline" className="text-xs border-red-300 text-red-600 hover:bg-red-50" onClick={() => handleRejectOrder(order.id)}>Reject</Button>
                        </div>
                      </div>
                    ))}
                    {onlineOrders.filter((o: any) => o.status === 'Ready to Pack').length === 0 && (
                       <div className="text-center p-8 text-slate-400 text-sm">No orders to pack</div>
                    )}
                </div>
              </div>

              {/* Dispatch */}
              <div className="flex-1 min-w-[300px] flex flex-col gap-4">
                <div className="bg-white dark:bg-slate-950 rounded-xl border p-4 flex items-center justify-between shadow-sm">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">Dispatch</h3>
                  <span className="bg-green-50 text-green-600 border border-green-100 text-xs font-bold px-2 py-0.5 rounded-full">
                     {onlineOrders.filter((o: any) => o.status === 'Dispatch' || o.status === 'Completed').length}
                  </span>
                </div>
                <div className="flex-1 bg-slate-50 dark:bg-slate-900 rounded-xl flex flex-col gap-3 p-2 overflow-y-auto">
                    {onlineOrders.filter((o: any) => o.status === 'Dispatch' || o.status === 'Completed').map((order: any) => (
                      <div key={order.id} className="bg-white dark:bg-slate-950 p-4 border rounded-lg shadow-sm flex flex-col gap-2">
                        <div className="flex justify-between font-bold">
                          <span>{order.customer_name}</span>
                          <span>₹{order.total}</span>
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Order #{order.id.substring(0,6)}</span>
                        {(() => {
                          const assignment = deliveryAssignments.find((a: any) => a.order_id === order.id);
                                  if (assignment) {
                                    let badgeColor = 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300';
                                    let statusText = 'ASSIGNED';
                                    let descText = 'Assigned to: ' + (assignment.service_providers?.full_name || 'Unknown');
                                    
                                    if (assignment.status === 'unassigned') {
                                      badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300';
                                      statusText = 'AWAITING RIDER';
                                      descText = 'Awaiting rider...';
                                    } else if (assignment.status === 'assigned') {
                                      badgeColor = 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300';
                                      statusText = 'ASSIGNED';
                                      descText = 'Assigned to ' + (assignment.service_providers?.full_name || 'Unknown');
                                    } else if (assignment.status === 'picked_up') {
                                      badgeColor = 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300';
                                      statusText = 'IN TRANSIT';
                                      descText = 'Picked up by ' + (assignment.service_providers?.full_name || 'Unknown') + ' — in transit';
                                    } else if (assignment.status === 'delivered') {
                                      badgeColor = 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300';
                                      statusText = 'DELIVERED';
                                      descText = 'Delivered ✓';
                                    }
                                    
                                    return (
<>
                                      <div className="flex flex-col gap-1 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-md border border-slate-100 dark:border-slate-800 mt-1">
                                        <div className="flex justify-between items-center mb-1">
                                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Delivery</span>
                                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${badgeColor}`}>{statusText}</span>
                                        </div>
                                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{descText}</p>
                                        {assignment.service_providers?.phone && assignment.status !== 'unassigned' && assignment.status !== 'delivered' && (
                                          <p className="text-[10px] text-slate-500">{assignment.service_providers.phone}</p>
                                        )}
                                      </div>
                                      
                                      {(assignment.status === 'assigned' || assignment.status === 'picked_up') && (
                                        <div className="mt-2 -mx-4 -mb-4">
                                          <LiveTrackingMap 
                                            deliveryAssignment={assignment}
                                            destinationAddress={assignment.status === 'assigned' ? assignment.pickup_address : assignment.drop_address}
                                            statusText={assignment.status === 'assigned' ? `${(assignment.service_providers?.full_name || 'Rider').split(' ')[0]} is heading to pick up this order` : `${(assignment.service_providers?.full_name || 'Rider').split(' ')[0]} is on the way to deliver`}
                                            compact={true}
                                          />
                                        </div>
                                      )}
                                      </>
                                    );
                                  } else {
                                    return <div className="bg-green-50 text-green-700 text-xs p-2 rounded text-center font-bold mt-1">Dispatched</div>;
                                  }
                        })()}
                      </div>
                    ))}
                    {onlineOrders.filter((o: any) => o.status === 'Dispatch' || o.status === 'Completed').length === 0 && (
                       <div className="text-center p-8 text-slate-400 text-sm">No dispatched orders</div>
                    )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="flex-1 flex flex-col bg-white dark:bg-slate-950 overflow-hidden w-full h-full">
            <InvoiceHistory onEditInvoice={handleEditInvoice} />
          </div>
        )}
      </div>

      {/* Modals Overlay */}
      {showHeldBills && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-950 rounded-xl shadow-lg w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Held Bills</h2>
              <button onClick={() => setShowHeldBills(false)}><X className="text-slate-400" /></button>
            </div>
            {heldBills.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 text-center py-4">No held bills.</p>
            ) : (
              <div className="space-y-3">
                {heldBills.map(bill => (
                  <div key={bill.id} className="flex justify-between items-center border p-3 rounded-lg">
                    <div>
                      <p className="font-bold">{bill.id}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{bill.time} - {bill.cart.length} items</p>
                    </div>
                    <Button onClick={() => handleRestoreBill(bill)} variant="outline" size="sm">Restore</Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showSplitPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-950 rounded-xl shadow-lg w-full max-w-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Split Payment</h2>
              <button onClick={() => setShowSplitPayment(false)}><X className="text-slate-400" /></button>
            </div>
            <div className="mb-4">
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">GRAND TOTAL</p>
              <p className="text-2xl font-bold">₹{grandTotal.toFixed(2)}</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Cash</label>
                <Input type="number" min="0" step="0.01" value={splitAmounts.cash} onChange={(e) => setSplitAmounts({...splitAmounts, cash: Number(e.target.value) || 0})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Card</label>
                <Input type="number" min="0" step="0.01" value={splitAmounts.card} onChange={(e) => setSplitAmounts({...splitAmounts, card: Number(e.target.value) || 0})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">UPI</label>
                <Input type="number" min="0" step="0.01" value={splitAmounts.upi} onChange={(e) => setSplitAmounts({...splitAmounts, upi: Number(e.target.value) || 0})} />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button onClick={() => setShowSplitPayment(false)} variant="outline">Cancel</Button>
              <Button onClick={submitSplitPayment} disabled={loading} className="bg-blue-600 text-white hover:bg-blue-700">Confirm & Pay</Button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {receiptData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" 
            onClick={() => setReceiptData(null)}
          ></div>
          <div className="bg-white dark:bg-slate-950 p-6 md:p-8 rounded-2xl shadow-2xl relative z-10 w-full max-w-lg flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-start mb-6 print:hidden">
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Checkout Success</h2>
              <button onClick={() => setReceiptData(null)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"><X size={20}/></button>
            </div>

            <div className="flex-1 overflow-y-auto mb-6 px-4 py-6 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 relative print:border-none print:bg-white dark:bg-slate-950 print:p-0">
              <div className="text-center mb-6">
                <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight uppercase mb-1">{tenant?.brand_name || 'Retail POS'}</h1>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Tax Invoice / Receipt</p>
              </div>

              <div className="flex justify-between items-end mb-6 pb-6 border-b border-slate-200 dark:border-slate-800 border-dashed">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Date & Time</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{receiptData.date}</p>
                  {receiptData.customerName && (
                    <>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-3 mb-1">Customer</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{receiptData.customerName}</p>
                    </>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Invoice Number</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{receiptData.invoiceNumber}</p>
                </div>
              </div>

              <div className="mb-6">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-200 dark:border-slate-800">
                      <th className="py-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Item</th>
                      <th className="py-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Qty</th>
                      <th className="py-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Price</th>
                      <th className="py-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {receiptData.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-3 text-sm font-semibold text-slate-800 dark:text-slate-200">{(item as any).product_name}</td>
                        <td className="py-3 text-sm font-medium text-slate-600 dark:text-slate-400 text-center">{(item as any).quantity}</td>
                        <td className="py-3 text-sm font-medium text-slate-600 dark:text-slate-400 text-right">₹{(item as any).selling_price.toFixed(2)}</td>
                        <td className="py-3 text-sm font-bold text-slate-900 dark:text-slate-100 text-right">₹{((item as any).selling_price * (item as any).quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t-2 border-slate-200 dark:border-slate-800 pt-4 space-y-2">
                <div className="flex justify-between items-center pt-4 mt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-base font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Grand Total</span>
                  <span className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">₹{receiptData.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4 print:hidden mt-auto">
              <Button className="flex-1 h-12 bg-slate-900 dark:bg-slate-100 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-200 dark:bg-slate-700 text-white dark:text-slate-900 dark:text-slate-100 font-bold text-base shadow-lg shadow-slate-200" onClick={() => handlePrint(receiptData.items, receiptData.total, receiptData.invoiceNumber)}>
                <Printer size={18} className="mr-2" /> Print Receipt
              </Button>
              <Button variant="outline" className="flex-1 h-12 font-bold" onClick={() => setReceiptData(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export const InwardPaymentPage = () => {
  const { currentTenantId, user, activeBranchId } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [unpaidInvoices, setUnpaidInvoices] = useState<any[]>([]);
  const [outstandingBalance, setOutstandingBalance] = useState(0);
  const [applyMode, setApplyMode] = useState<'on_account' | 'specific_invoice'>('on_account');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [chequeNumber, setChequeNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [upiRef, setUpiRef] = useState('');
  const [referenceNote, setReferenceNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const fetchCustomers = async () => {
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) return;
    const { data } = await supabase.from('retail_customers').select('*').eq('tenant_id', currentTenantId).order('customer_name');
    setCustomers(data || []);
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) { setLoadingHistory(false); return; }
    const { data } = await supabase.from('customer_payments').select('*, retail_customers(customer_name)').eq('tenant_id', currentTenantId).order('created_at', { ascending: false }).limit(50);
    setPaymentHistory(data || []);
    setLoadingHistory(false);
  };

  useEffect(() => { fetchCustomers(); fetchHistory(); }, [currentTenantId]);

  const handleSelectCustomer = async (cust: any) => {
    setSelectedCustomer(cust);
    setCustomerSearch('');
    setSelectedInvoiceId('');
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) return;

    const { data: invoices } = await supabase.from('sales_invoices').select('id, invoice_number, invoice_date, total_amount').eq('tenant_id', currentTenantId).eq('customer_id', cust.id).neq('status', 'cancelled');
    const { data: payments } = await supabase.from('customer_payments').select('sales_invoice_id, amount').eq('tenant_id', currentTenantId).eq('customer_id', cust.id);

    const paidByInvoice: Record<string, number> = {};
    let totalPaid = 0;
    (payments || []).forEach((p: any) => {
      totalPaid += p.amount;
      if (p.sales_invoice_id) paidByInvoice[p.sales_invoice_id] = (paidByInvoice[p.sales_invoice_id] || 0) + p.amount;
    });

    const withBalance = (invoices || []).map((inv: any) => ({
      ...inv,
      paid: paidByInvoice[inv.id] || 0,
      balance: inv.total_amount - (paidByInvoice[inv.id] || 0)
    })).filter((inv: any) => inv.balance > 0.01);
    setUnpaidInvoices(withBalance);

    const totalInvoiced = (invoices || []).reduce((s: number, inv: any) => s + inv.total_amount, 0);
    const opening = cust.balance_type === 'to_receive' ? (cust.opening_balance || 0) : -(cust.opening_balance || 0);
    setOutstandingBalance(opening + totalInvoiced - totalPaid);
  };

  const handleSubmit = async () => {
    if (!selectedCustomer || !amount || parseFloat(amount) <= 0 || !currentTenantId || !user) return;
    setSaving(true);
    const supabase = getSupabaseClient();
    if (!supabase) { setSaving(false); return; }

    let note = referenceNote;
    if (paymentMethod === 'cheque') note = ('Cheque #' + chequeNumber + ', ' + bankName + '. ' + referenceNote).trim();
    if (paymentMethod === 'upi') note = ('UPI Ref: ' + upiRef + '. ' + referenceNote).trim();

    const { error } = await supabase.rpc('record_customer_payment', {
      p_tenant_id: currentTenantId,
      p_customer_id: selectedCustomer.id,
      p_sales_invoice_id: applyMode === 'specific_invoice' ? selectedInvoiceId || null : null,
      p_amount: parseFloat(amount),
      p_payment_method: paymentMethod,
      p_payment_date: paymentDate,
      p_reference_note: note || null,
      p_created_by: user.id
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Payment recorded successfully');
    setSelectedCustomer(null);
    setAmount('');
    setSelectedInvoiceId('');
    setChequeNumber(''); setBankName(''); setUpiRef(''); setReferenceNote('');
    fetchHistory();
  };

  const filteredCustomers = customers.filter((c: any) => c.customer_name?.toLowerCase().includes(customerSearch.toLowerCase()));

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Inward Payment</h2>
        <p className="text-slate-500 dark:text-slate-400">Record payments received from customers.</p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          {!selectedCustomer ? (
            <div>
              <label className="text-sm font-medium">Customer</label>
              <Input placeholder="Search customer by name..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} />
              {customerSearch && (
                <div className="mt-2 border border-slate-200 dark:border-slate-800 rounded-lg max-h-48 overflow-y-auto">
                  {filteredCustomers.length === 0 ? (
                    <p className="text-sm text-slate-400 p-3">No customers found.</p>
                  ) : filteredCustomers.map((c: any) => (
                    <button key={c.id} onClick={() => handleSelectCustomer(c)} className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-900 text-sm border-b border-slate-100 dark:border-slate-800 last:border-0">
                      {c.customer_name}{c.phone ? ' · ' + c.phone : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 rounded-xl p-4">
                <div>
                  <p className="font-bold text-slate-900 dark:text-slate-100">{selectedCustomer.customer_name}</p>
                  <p className="text-xs text-slate-500">{selectedCustomer.phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Outstanding Balance</p>
                  <p className={"text-xl font-extrabold " + (outstandingBalance > 0 ? 'text-red-600' : 'text-emerald-600')}>₹{Math.abs(outstandingBalance).toLocaleString('en-IN')}</p>
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="text-xs text-primary font-semibold ml-4">Change</button>
              </div>

              <div>
                <label className="text-sm font-medium">Apply Payment To</label>
                <div className="flex gap-2 mt-1">
                  <button onClick={() => setApplyMode('on_account')} className={"flex-1 py-2 rounded-xl text-sm font-semibold border-2 " + (applyMode === 'on_account' ? 'border-primary text-primary' : 'border-slate-200 dark:border-slate-800 text-slate-500')}>On Account (Advance)</button>
                  <button onClick={() => setApplyMode('specific_invoice')} className={"flex-1 py-2 rounded-xl text-sm font-semibold border-2 " + (applyMode === 'specific_invoice' ? 'border-primary text-primary' : 'border-slate-200 dark:border-slate-800 text-slate-500')}>Specific Invoice</button>
                </div>
              </div>

              {applyMode === 'specific_invoice' && (
                <div>
                  <label className="text-sm font-medium">Select Invoice</label>
                  <select value={selectedInvoiceId} onChange={(e) => { setSelectedInvoiceId(e.target.value); const inv = unpaidInvoices.find((i: any) => i.id === e.target.value); if (inv) setAmount(inv.balance.toString()); }} className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm">
                    <option value="">Select an unpaid invoice</option>
                    {unpaidInvoices.map((inv: any) => (
                      <option key={inv.id} value={inv.id}>{inv.invoice_number} — Balance: ₹{inv.balance.toFixed(2)}</option>
                    ))}
                  </select>
                  {unpaidInvoices.length === 0 && <p className="text-xs text-slate-400 mt-1">No unpaid invoices for this customer.</p>}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Amount (₹)</label>
                  <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Payment Date</label>
                  <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Payment Method</label>
                <div className="grid grid-cols-4 gap-2 mt-1">
                  {['cash', 'bank', 'upi', 'cheque'].map((m) => (
                    <button key={m} onClick={() => setPaymentMethod(m)} className={"py-2 rounded-lg text-xs font-bold uppercase border-2 " + (paymentMethod === m ? 'border-primary text-primary' : 'border-slate-200 dark:border-slate-800 text-slate-500')}>{m}</button>
                  ))}
                </div>
              </div>

              {paymentMethod === 'cheque' && (
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Cheque Number" value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value)} />
                  <Input placeholder="Bank Name" value={bankName} onChange={(e) => setBankName(e.target.value)} />
                </div>
              )}
              {paymentMethod === 'upi' && (
                <Input placeholder="UPI Reference / Transaction ID" value={upiRef} onChange={(e) => setUpiRef(e.target.value)} />
              )}

              <div>
                <label className="text-sm font-medium">Reference Note (optional)</label>
                <Input value={referenceNote} onChange={(e) => setReferenceNote(e.target.value)} />
              </div>

              <Button className="w-full h-12" onClick={handleSubmit} disabled={saving || !amount || parseFloat(amount) <= 0}>
                {saving ? 'Recording...' : 'Record Payment · ₹' + (amount || 0)}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4">Recent Payments</h3>
          {loadingHistory ? (
            <p className="text-sm text-slate-400 text-center py-6">Loading...</p>
          ) : paymentHistory.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No payments recorded yet.</p>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2 font-semibold">Date</th>
                  <th className="px-3 py-2 font-semibold">Customer</th>
                  <th className="px-3 py-2 font-semibold">Method</th>
                  <th className="px-3 py-2 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paymentHistory.map((p: any) => (
                  <tr key={p.id}>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{p.payment_date}</td>
                    <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">{p.retail_customers?.customer_name}</td>
                    <td className="px-3 py-2 text-slate-500 capitalize">{p.payment_method}</td>
                    <td className="px-3 py-2 text-right font-bold text-emerald-600">₹{p.amount.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};


export const OutwardPaymentPage = () => {
  const { currentTenantId, user, activeBranchId } = useAuth();
  const [branchId, setBranchId] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [unpaidInvoices, setUnpaidInvoices] = useState<any[]>([]);
  const [outstandingBalance, setOutstandingBalance] = useState(0);
  const [applyMode, setApplyMode] = useState<'on_account' | 'specific_invoice'>('on_account');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [chequeNumber, setChequeNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [upiRef, setUpiRef] = useState('');
  const [referenceNote, setReferenceNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const fetchSuppliers = async () => {
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) return;
    setBranchId(activeBranchId || null);
    const { data } = await supabase.from('suppliers').select('*').eq('tenant_id', currentTenantId).order('supplier_name');
    setSuppliers(data || []);
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) { setLoadingHistory(false); return; }
    const { data } = await supabase.from('supplier_payments').select('*, suppliers(supplier_name)').eq('tenant_id', currentTenantId).order('created_at', { ascending: false }).limit(50);
    setPaymentHistory(data || []);
    setLoadingHistory(false);
  };

  useEffect(() => { fetchSuppliers(); fetchHistory(); }, [currentTenantId]);

  const handleSelectSupplier = async (sup: any) => {
    setSelectedSupplier(sup);
    setSupplierSearch('');
    setSelectedInvoiceId('');
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) return;

    const { data: invoices } = await supabase.from('purchase_invoices').select('id, invoice_number, invoice_date, total_amount').eq('tenant_id', currentTenantId).eq('vendor_id', sup.id);
    const { data: payments } = await supabase.from('supplier_payments').select('purchase_invoice_id, amount').eq('tenant_id', currentTenantId).eq('supplier_id', sup.id);

    const paidByInvoice: Record<string, number> = {};
    let totalPaid = 0;
    (payments || []).forEach((p: any) => {
      totalPaid += p.amount;
      if (p.purchase_invoice_id) paidByInvoice[p.purchase_invoice_id] = (paidByInvoice[p.purchase_invoice_id] || 0) + p.amount;
    });

    const withBalance = (invoices || []).map((inv: any) => ({
      ...inv,
      paid: paidByInvoice[inv.id] || 0,
      balance: inv.total_amount - (paidByInvoice[inv.id] || 0)
    })).filter((inv: any) => inv.balance > 0.01);
    setUnpaidInvoices(withBalance);

    const totalInvoiced = (invoices || []).reduce((s: number, inv: any) => s + inv.total_amount, 0);
    const opening = sup.balance_type === 'to_pay' ? (sup.opening_balance || 0) : -(sup.opening_balance || 0);
    setOutstandingBalance(opening + totalInvoiced - totalPaid);
  };

  const handleSubmit = async () => {
    if (!selectedSupplier || !amount || parseFloat(amount) <= 0 || !currentTenantId || !user || !branchId) return;
    setSaving(true);
    const supabase = getSupabaseClient();
    if (!supabase) { setSaving(false); return; }

    let note = referenceNote;
    if (paymentMethod === 'cheque') note = ('Cheque #' + chequeNumber + ', ' + bankName + '. ' + referenceNote).trim();
    if (paymentMethod === 'upi') note = ('UPI Ref: ' + upiRef + '. ' + referenceNote).trim();

    const { error } = await supabase.rpc('record_supplier_payment', {
      p_tenant_id: currentTenantId,
      p_branch_id: branchId,
      p_supplier_id: selectedSupplier.id,
      p_purchase_invoice_id: applyMode === 'specific_invoice' ? selectedInvoiceId || null : null,
      p_amount: parseFloat(amount),
      p_payment_method: paymentMethod,
      p_reference_note: note || null,
      p_created_by: user.id
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Payment recorded successfully');
    setSelectedSupplier(null);
    setAmount('');
    setSelectedInvoiceId('');
    setChequeNumber(''); setBankName(''); setUpiRef(''); setReferenceNote('');
    fetchHistory();
  };

  const filteredSuppliers = suppliers.filter((s: any) => s.supplier_name?.toLowerCase().includes(supplierSearch.toLowerCase()));

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Outward Payment</h2>
        <p className="text-slate-500 dark:text-slate-400">Record payments made to suppliers.</p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          {!selectedSupplier ? (
            <div>
              <label className="text-sm font-medium">Supplier</label>
              <Input placeholder="Search supplier by name..." value={supplierSearch} onChange={(e) => setSupplierSearch(e.target.value)} />
              {supplierSearch && (
                <div className="mt-2 border border-slate-200 dark:border-slate-800 rounded-lg max-h-48 overflow-y-auto">
                  {filteredSuppliers.length === 0 ? (
                    <p className="text-sm text-slate-400 p-3">No suppliers found.</p>
                  ) : filteredSuppliers.map((s: any) => (
                    <button key={s.id} onClick={() => handleSelectSupplier(s)} className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-900 text-sm border-b border-slate-100 dark:border-slate-800 last:border-0">
                      {s.supplier_name}{s.contact_phone ? ' · ' + s.contact_phone : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 rounded-xl p-4">
                <div>
                  <p className="font-bold text-slate-900 dark:text-slate-100">{selectedSupplier.supplier_name}</p>
                  <p className="text-xs text-slate-500">{selectedSupplier.contact_phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Outstanding Balance</p>
                  <p className={"text-xl font-extrabold " + (outstandingBalance > 0 ? 'text-red-600' : 'text-emerald-600')}>₹{Math.abs(outstandingBalance).toLocaleString('en-IN')}</p>
                </div>
                <button onClick={() => setSelectedSupplier(null)} className="text-xs text-primary font-semibold ml-4">Change</button>
              </div>

              <div>
                <label className="text-sm font-medium">Apply Payment To</label>
                <div className="flex gap-2 mt-1">
                  <button onClick={() => setApplyMode('on_account')} className={"flex-1 py-2 rounded-xl text-sm font-semibold border-2 " + (applyMode === 'on_account' ? 'border-primary text-primary' : 'border-slate-200 dark:border-slate-800 text-slate-500')}>On Account (Advance)</button>
                  <button onClick={() => setApplyMode('specific_invoice')} className={"flex-1 py-2 rounded-xl text-sm font-semibold border-2 " + (applyMode === 'specific_invoice' ? 'border-primary text-primary' : 'border-slate-200 dark:border-slate-800 text-slate-500')}>Specific Invoice</button>
                </div>
              </div>

              {applyMode === 'specific_invoice' && (
                <div>
                  <label className="text-sm font-medium">Select Invoice</label>
                  <select value={selectedInvoiceId} onChange={(e) => { setSelectedInvoiceId(e.target.value); const inv = unpaidInvoices.find((i: any) => i.id === e.target.value); if (inv) setAmount(inv.balance.toString()); }} className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm">
                    <option value="">Select an unpaid invoice</option>
                    {unpaidInvoices.map((inv: any) => (
                      <option key={inv.id} value={inv.id}>{inv.invoice_number} — Balance: ₹{inv.balance.toFixed(2)}</option>
                    ))}
                  </select>
                  {unpaidInvoices.length === 0 && <p className="text-xs text-slate-400 mt-1">No unpaid invoices for this supplier.</p>}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Amount (₹)</label>
                  <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Payment Date</label>
                  <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Payment Method</label>
                <div className="grid grid-cols-4 gap-2 mt-1">
                  {['cash', 'bank', 'upi', 'cheque'].map((m) => (
                    <button key={m} onClick={() => setPaymentMethod(m)} className={"py-2 rounded-lg text-xs font-bold uppercase border-2 " + (paymentMethod === m ? 'border-primary text-primary' : 'border-slate-200 dark:border-slate-800 text-slate-500')}>{m}</button>
                  ))}
                </div>
              </div>

              {paymentMethod === 'cheque' && (
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Cheque Number" value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value)} />
                  <Input placeholder="Bank Name" value={bankName} onChange={(e) => setBankName(e.target.value)} />
                </div>
              )}
              {paymentMethod === 'upi' && (
                <Input placeholder="UPI Reference / Transaction ID" value={upiRef} onChange={(e) => setUpiRef(e.target.value)} />
              )}

              <div>
                <label className="text-sm font-medium">Reference Note (optional)</label>
                <Input value={referenceNote} onChange={(e) => setReferenceNote(e.target.value)} />
              </div>

              <Button className="w-full h-12" onClick={handleSubmit} disabled={saving || !amount || parseFloat(amount) <= 0}>
                {saving ? 'Recording...' : 'Record Payment · ₹' + (amount || 0)}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4">Recent Payments</h3>
          {loadingHistory ? (
            <p className="text-sm text-slate-400 text-center py-6">Loading...</p>
          ) : paymentHistory.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No payments recorded yet.</p>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2 font-semibold">Date</th>
                  <th className="px-3 py-2 font-semibold">Supplier</th>
                  <th className="px-3 py-2 font-semibold">Method</th>
                  <th className="px-3 py-2 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paymentHistory.map((p: any) => (
                  <tr key={p.id}>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{p.created_at ? p.created_at.slice(0, 10) : ''}</td>
                    <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">{p.suppliers?.supplier_name}</td>
                    <td className="px-3 py-2 text-slate-500 capitalize">{p.payment_method}</td>
                    <td className="px-3 py-2 text-right font-bold text-red-600">₹{p.amount.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};


export const DailyExpensePage = () => {
  const { currentTenantId, user, activeBranchId } = useAuth();
  const [branchId, setBranchId] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [categoryId, setCategoryId] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paidTo, setPaidTo] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) { setLoading(false); return; }

    setBranchId(activeBranchId || null);

    const { data: catData } = await supabase.from('expense_categories').select('*').eq('tenant_id', currentTenantId).eq('is_active', true).order('category_name');
    setCategories(catData || []);

    const { data: expData } = await supabase.from('daily_expenses').select('*, expense_categories(category_name)').eq('tenant_id', currentTenantId).order('expense_date', { ascending: false }).limit(50);
    setExpenses(expData || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [currentTenantId]);

  const handleAddCategory = async () => {
    if (!newCategoryName || !currentTenantId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data, error } = await supabase.from('expense_categories').insert({ tenant_id: currentTenantId, category_name: newCategoryName }).select().single();
    if (error) { toast.error(error.message); return; }
    toast.success('Category added');
    setNewCategoryName('');
    setShowNewCategory(false);
    await fetchData();
    setCategoryId(data.id);
  };

  const handleSubmit = async () => {
    if (!categoryId || !amount || parseFloat(amount) <= 0 || !currentTenantId || !branchId || !user) return;
    setSaving(true);
    const supabase = getSupabaseClient();
    if (!supabase) { setSaving(false); return; }

    const { error } = await supabase.rpc('record_daily_expense', {
      p_tenant_id: currentTenantId,
      p_branch_id: branchId,
      p_category_id: categoryId,
      p_amount: parseFloat(amount),
      p_payment_method: paymentMethod,
      p_expense_date: expenseDate,
      p_description: description || null,
      p_paid_to: paidTo || null,
      p_created_by: user.id
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Expense recorded');
    setCategoryId('');
    setAmount('');
    setPaidTo('');
    setDescription('');
    fetchData();
  };

  const totalToday = expenses.filter((e: any) => e.expense_date === new Date().toISOString().slice(0, 10)).reduce((s: number, e: any) => s + e.amount, 0);

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Daily Expense</h2>
        <p className="text-slate-500 dark:text-slate-400">Record business expenses like rent, utilities, and supplies.</p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Category</label>
            <div className="flex gap-2">
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="flex-1 h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm">
                <option value="">Select category</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.category_name}</option>)}
              </select>
              <Button variant="outline" onClick={() => setShowNewCategory(!showNewCategory)}>+ New</Button>
            </div>
            {showNewCategory && (
              <div className="flex gap-2 mt-2">
                <Input placeholder="New category name (e.g. Rent, Electricity)" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                <Button onClick={handleAddCategory} disabled={!newCategoryName}>Add</Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Amount (₹)</label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Expense Date</label>
              <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Payment Method</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {['cash', 'bank'].map((m) => (
                <button key={m} onClick={() => setPaymentMethod(m)} className={"py-2 rounded-lg text-xs font-bold uppercase border-2 " + (paymentMethod === m ? 'border-primary text-primary' : 'border-slate-200 dark:border-slate-800 text-slate-500')}>{m}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Paid To (optional)</label>
            <Input placeholder="e.g. Landlord, Electricity Board" value={paidTo} onChange={(e) => setPaidTo(e.target.value)} />
          </div>

          <div>
            <label className="text-sm font-medium">Description (optional)</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <Button className="w-full h-12" onClick={handleSubmit} disabled={saving || !categoryId || !amount || parseFloat(amount) <= 0}>
            {saving ? 'Recording...' : 'Record Expense · ₹' + (amount || 0)}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-900 dark:text-slate-100">Recent Expenses</h3>
            <div className="text-right">
              <p className="text-xs text-slate-500">Today's Total</p>
              <p className="text-lg font-extrabold text-red-600">₹{totalToday.toLocaleString('en-IN')}</p>
            </div>
          </div>
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-6">Loading...</p>
          ) : expenses.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No expenses recorded yet.</p>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2 font-semibold">Date</th>
                  <th className="px-3 py-2 font-semibold">Category</th>
                  <th className="px-3 py-2 font-semibold">Paid To</th>
                  <th className="px-3 py-2 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {expenses.map((e: any) => (
                  <tr key={e.id}>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{e.expense_date}</td>
                    <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">{e.expense_categories?.category_name}</td>
                    <td className="px-3 py-2 text-slate-500">{e.paid_to || '-'}</td>
                    <td className="px-3 py-2 text-right font-bold text-red-600">₹{e.amount.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};


export const OtherIncomePage = () => {
  const { currentTenantId, user, activeBranchId } = useAuth();
  const [branchId, setBranchId] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [incomeList, setIncomeList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [categoryId, setCategoryId] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [amount, setAmount] = useState('');
  const [incomeDate, setIncomeDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [receivedFrom, setReceivedFrom] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) { setLoading(false); return; }

    setBranchId(activeBranchId || null);

    const { data: catData } = await supabase.from('other_income_categories').select('*').eq('tenant_id', currentTenantId).eq('is_active', true).order('category_name');
    setCategories(catData || []);

    const { data: incData } = await supabase.from('other_income').select('*, other_income_categories(category_name)').eq('tenant_id', currentTenantId).order('income_date', { ascending: false }).limit(50);
    setIncomeList(incData || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [currentTenantId]);

  const handleAddCategory = async () => {
    if (!newCategoryName || !currentTenantId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data, error } = await supabase.from('other_income_categories').insert({ tenant_id: currentTenantId, category_name: newCategoryName }).select().single();
    if (error) { toast.error(error.message); return; }
    toast.success('Category added');
    setNewCategoryName('');
    setShowNewCategory(false);
    await fetchData();
    setCategoryId(data.id);
  };

  const handleSubmit = async () => {
    if (!categoryId || !amount || parseFloat(amount) <= 0 || !currentTenantId || !branchId || !user) return;
    setSaving(true);
    const supabase = getSupabaseClient();
    if (!supabase) { setSaving(false); return; }

    const { error } = await supabase.rpc('record_other_income', {
      p_tenant_id: currentTenantId,
      p_branch_id: branchId,
      p_category_id: categoryId,
      p_amount: parseFloat(amount),
      p_payment_method: paymentMethod,
      p_income_date: incomeDate,
      p_description: description || null,
      p_received_from: receivedFrom || null,
      p_created_by: user.id
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Income recorded');
    setCategoryId('');
    setAmount('');
    setReceivedFrom('');
    setDescription('');
    fetchData();
  };

  const totalToday = incomeList.filter((e: any) => e.income_date === new Date().toISOString().slice(0, 10)).reduce((s: number, e: any) => s + e.amount, 0);

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Other Income</h2>
        <p className="text-slate-500 dark:text-slate-400">Record income from sources other than regular sales, like rent received or interest.</p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Category</label>
            <div className="flex gap-2">
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="flex-1 h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm">
                <option value="">Select category</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.category_name}</option>)}
              </select>
              <Button variant="outline" onClick={() => setShowNewCategory(!showNewCategory)}>+ New</Button>
            </div>
            {showNewCategory && (
              <div className="flex gap-2 mt-2">
                <Input placeholder="New category name (e.g. Rent Received, Interest)" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                <Button onClick={handleAddCategory} disabled={!newCategoryName}>Add</Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Amount (₹)</label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Income Date</label>
              <Input type="date" value={incomeDate} onChange={(e) => setIncomeDate(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Payment Method</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {['cash', 'bank'].map((m) => (
                <button key={m} onClick={() => setPaymentMethod(m)} className={"py-2 rounded-lg text-xs font-bold uppercase border-2 " + (paymentMethod === m ? 'border-primary text-primary' : 'border-slate-200 dark:border-slate-800 text-slate-500')}>{m}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Received From (optional)</label>
            <Input placeholder="e.g. Tenant, Bank Interest" value={receivedFrom} onChange={(e) => setReceivedFrom(e.target.value)} />
          </div>

          <div>
            <label className="text-sm font-medium">Description (optional)</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <Button className="w-full h-12" onClick={handleSubmit} disabled={saving || !categoryId || !amount || parseFloat(amount) <= 0}>
            {saving ? 'Recording...' : 'Record Income · ₹' + (amount || 0)}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-900 dark:text-slate-100">Recent Income</h3>
            <div className="text-right">
              <p className="text-xs text-slate-500">Today's Total</p>
              <p className="text-lg font-extrabold text-emerald-600">₹{totalToday.toLocaleString('en-IN')}</p>
            </div>
          </div>
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-6">Loading...</p>
          ) : incomeList.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No income recorded yet.</p>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2 font-semibold">Date</th>
                  <th className="px-3 py-2 font-semibold">Category</th>
                  <th className="px-3 py-2 font-semibold">Received From</th>
                  <th className="px-3 py-2 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {incomeList.map((e: any) => (
                  <tr key={e.id}>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{e.income_date}</td>
                    <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">{e.other_income_categories?.category_name}</td>
                    <td className="px-3 py-2 text-slate-500">{e.received_from || '-'}</td>
                    <td className="px-3 py-2 text-right font-bold text-emerald-600">₹{e.amount.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};


export const QuotationPage = ({ onBack }: { onBack?: () => void } = {}) => {
  const { currentTenantId, user, activeBranchId } = useAuth();
  const [branchId, setBranchId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [customerId, setCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [items, setItems] = useState<{ product_id: string; item_name: string; price: number; quantity: string; discount_value: string }[]>([]);
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewingQuotation, setViewingQuotation] = useState<any>(null);
  const [converting, setConverting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) { setLoading(false); return; }

    setBranchId(activeBranchId || null);

    const { data: custData } = await supabase.from('retail_customers').select('*').eq('tenant_id', currentTenantId).order('customer_name');
    setCustomers(custData || []);

    const { data: prodData } = await supabase.from('products').select('id, product_name, selling_price, mrp, w_sale_price, hsn_code, sku, barcode, batch, mfg_date, exp_date, size, colour, imei1, imei2, kitchen, description, sales_unit, sales_alt_unit, conv, min_stock, status, g_down, rack, def_qty, part_no, cmb_gst').eq('tenant_id', currentTenantId).eq('is_active', true).order('product_name');
    setProducts(prodData || []);

    const { data: qData } = await supabase.from('quotations').select('*, quotation_items(*)').eq('tenant_id', currentTenantId).order('created_at', { ascending: false }).limit(50);
    setQuotations(qData || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [currentTenantId]);

  const addProductToItems = (p: any) => {
    setItems(prev => {
      const existing = prev.find(i => i.product_id === p.id);
      if (existing) return prev.map(i => i.product_id === p.id ? { ...i, quantity: (parseFloat(i.quantity) + 1).toString() } : i);
      return [...prev, { product_id: p.id, item_name: p.product_name, price: p.selling_price, quantity: '1', discount_value: '0' }];
    });
    setProductSearch('');
  };

  const updateItem = (productId: string, field: string, value: string) => {
    setItems(prev => prev.map(i => i.product_id === productId ? { ...i, [field]: value } : i));
  };

  const removeItem = (productId: string) => {
    setItems(prev => prev.filter(i => i.product_id !== productId));
  };

  const estimatedTotal = items.reduce((s, i) => s + (i.price * (parseFloat(i.quantity) || 0)) - (parseFloat(i.discount_value) || 0), 0);

  const handleSubmit = async () => {
    if (items.length === 0 || !currentTenantId || !branchId || !user) return;
    setSaving(true);
    const supabase = getSupabaseClient();
    if (!supabase) { setSaving(false); return; }

    const selectedCustomer = customers.find((c: any) => c.id === customerId);

    const { error } = await supabase.rpc('create_quotation', {
      p_tenant_id: currentTenantId,
      p_branch_id: branchId,
      p_created_by: user.id,
      p_customer_id: customerId || null,
      p_customer_name: selectedCustomer?.customer_name || null,
      p_customer_gstin: selectedCustomer?.gstin || null,
      p_valid_until: validUntil || null,
      p_notes: notes || null,
      p_items: items.map(i => ({ product_id: i.product_id, quantity: parseFloat(i.quantity) || 1, discount_type: 'fixed', discount_value: parseFloat(i.discount_value) || 0 }))
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Quotation created');
    setItems([]);
    setCustomerId('');
    setValidUntil('');
    setNotes('');
    fetchData();
  };

  const handleConvert = async (quotationId: string) => {
    if (!window.confirm('Convert this quotation to a Sales Invoice?')) return;
    setConverting(true);
    const supabase = getSupabaseClient();
    if (!supabase || !user) { setConverting(false); return; }
    const { error } = await supabase.rpc('convert_quotation_to_invoice', {
      p_quotation_id: quotationId,
      p_created_by: user.id,
      p_payment_method: 'cash'
    });
    setConverting(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Converted to invoice successfully');
    setViewingQuotation(null);
    fetchData();
  };

  const filteredProducts = products.filter((p: any) => p.product_name?.toLowerCase().includes(productSearch.toLowerCase()));
  const filteredCustomers = customers.filter((c: any) => c.customer_name?.toLowerCase().includes(customerSearch.toLowerCase()));

  const statusColors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700',
    sent: 'bg-blue-100 text-blue-700',
    accepted: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    converted: 'bg-purple-100 text-purple-700',
    expired: 'bg-amber-100 text-amber-700'
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      {onBack && (
        <Button variant="ghost" onClick={onBack} className="gap-2">← Back to Documents</Button>
      )}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Quotation</h2>
        <p className="text-slate-500 dark:text-slate-400">Create price quotes for customers before invoicing.</p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Customer (optional)</label>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm">
              <option value="">Walk-in / No customer selected</option>
              {customers.map((c: any) => <option key={c.id} value={c.id}>{c.customer_name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Add Products</label>
            <Input placeholder="Search products to add..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
            {productSearch && (
              <div className="mt-2 border border-slate-200 dark:border-slate-800 rounded-lg max-h-48 overflow-y-auto">
                {filteredProducts.length === 0 ? (
                  <p className="text-sm text-slate-400 p-3">No products found.</p>
                ) : filteredProducts.slice(0, 10).map((p: any) => (
                  <button key={p.id} onClick={() => addProductToItems(p)} className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-900 text-sm border-b border-slate-100 dark:border-slate-800 last:border-0 flex justify-between">
                    <span>{p.product_name}</span>
                    <span className="text-primary font-bold">₹{p.selling_price}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="space-y-2">
              {items.map((item) => (
                <div key={(item as any).product_id} className="flex gap-2 items-center border border-slate-100 dark:border-slate-800 rounded-lg p-2">
                  <span className="flex-1 text-sm font-medium">{(item as any).item_name}</span>
                  <Input type="number" placeholder="Qty" className="w-16 h-9" value={(item as any).quantity} onChange={(e) => updateItem((item as any).product_id, 'quantity', e.target.value)} />
                  <Input type="number" placeholder="Disc ₹" className="w-20 h-9" value={(item as any).discount_value} onChange={(e) => updateItem((item as any).product_id, 'discount_value', e.target.value)} />
                  <span className="text-sm font-bold w-20 text-right">₹{(((item as any).price * (parseFloat((item as any).quantity) || 0)) - (parseFloat((item as any).discount_value) || 0)).toFixed(2)}</span>
                  <button onClick={() => removeItem((item as any).product_id)} className="text-red-500"><Trash2 size={14} /></button>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-slate-100">Estimated Subtotal (before GST)</span>
                <span className="font-extrabold text-lg text-primary">₹{estimatedTotal.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Valid Until (optional)</label>
              <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Notes (optional)</label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          <Button className="w-full h-12" onClick={handleSubmit} disabled={saving || items.length === 0}>
            {saving ? 'Creating...' : 'Create Quotation'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4">Recent Quotations</h3>
          {loading ? (
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
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-primary">₹{q.total_amount?.toLocaleString('en-IN')}</p>
                      <span className={"text-[10px] font-bold px-2 py-0.5 rounded-full uppercase " + (statusColors[q.status] || 'bg-slate-100 text-slate-700')}>{q.status}</span>
                    </div>
                  </div>
                  {q.status !== 'converted' && (
                    <Button size="sm" className="mt-3" onClick={() => handleConvert(q.id)} disabled={converting}>
                      {converting ? 'Converting...' : 'Convert to Invoice'}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};


export const ProformaInvoicePage = ({ onBack }: { onBack?: () => void } = {}) => {
  const { currentTenantId, user, activeBranchId } = useAuth();
  const [branchId, setBranchId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [proformas, setProformas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [customerId, setCustomerId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [items, setItems] = useState<{ product_id: string; item_name: string; price: number; quantity: string; discount_value: string }[]>([]);
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) { setLoading(false); return; }

    setBranchId(activeBranchId || null);

    const { data: custData } = await supabase.from('retail_customers').select('*').eq('tenant_id', currentTenantId).order('customer_name');
    setCustomers(custData || []);

    const { data: prodData } = await supabase.from('products').select('id, product_name, selling_price').eq('tenant_id', currentTenantId).eq('is_active', true).order('product_name');
    setProducts(prodData || []);

    const { data: pData } = await supabase.from('proforma_invoices').select('*, proforma_invoice_items(*)').eq('tenant_id', currentTenantId).order('created_at', { ascending: false }).limit(50);
    setProformas(pData || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [currentTenantId]);

  const addProductToItems = (p: any) => {
    setItems(prev => {
      const existing = prev.find(i => i.product_id === p.id);
      if (existing) return prev.map(i => i.product_id === p.id ? { ...i, quantity: (parseFloat(i.quantity) + 1).toString() } : i);
      return [...prev, { product_id: p.id, item_name: p.product_name, price: p.selling_price, quantity: '1', discount_value: '0' }];
    });
    setProductSearch('');
  };

  const updateItem = (productId: string, field: string, value: string) => {
    setItems(prev => prev.map(i => i.product_id === productId ? { ...i, [field]: value } : i));
  };

  const removeItem = (productId: string) => {
    setItems(prev => prev.filter(i => i.product_id !== productId));
  };

  const estimatedTotal = items.reduce((s, i) => s + (i.price * (parseFloat(i.quantity) || 0)) - (parseFloat(i.discount_value) || 0), 0);

  const handleSubmit = async () => {
    if (items.length === 0 || !currentTenantId || !branchId || !user) return;
    setSaving(true);
    const supabase = getSupabaseClient();
    if (!supabase) { setSaving(false); return; }

    const selectedCustomer = customers.find((c: any) => c.id === customerId);

    const { error } = await supabase.rpc('create_proforma_invoice', {
      p_tenant_id: currentTenantId,
      p_branch_id: branchId,
      p_created_by: user.id,
      p_customer_id: customerId || null,
      p_customer_name: selectedCustomer?.customer_name || null,
      p_customer_gstin: selectedCustomer?.gstin || null,
      p_valid_until: validUntil || null,
      p_notes: notes || null,
      p_items: items.map(i => ({ product_id: i.product_id, quantity: parseFloat(i.quantity) || 1, discount_type: 'fixed', discount_value: parseFloat(i.discount_value) || 0 }))
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Proforma invoice created');
    setItems([]);
    setCustomerId('');
    setValidUntil('');
    setNotes('');
    fetchData();
  };

  const handleConvert = async (proformaId: string) => {
    if (!window.confirm('Convert this proforma to a Sales Invoice?')) return;
    setConverting(true);
    const supabase = getSupabaseClient();
    if (!supabase || !user) { setConverting(false); return; }
    const { error } = await supabase.rpc('convert_proforma_to_invoice', {
      p_proforma_id: proformaId,
      p_created_by: user.id,
      p_payment_method: 'cash'
    });
    setConverting(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Converted to invoice successfully');
    fetchData();
  };

  const filteredProducts = products.filter((p: any) => p.product_name?.toLowerCase().includes(productSearch.toLowerCase()));

  const statusColors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700',
    sent: 'bg-blue-100 text-blue-700',
    converted: 'bg-purple-100 text-purple-700',
    cancelled: 'bg-red-100 text-red-700'
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      {onBack && (
        <Button variant="ghost" onClick={onBack} className="gap-2">← Back to Documents</Button>
      )}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Proforma Invoice</h2>
        <p className="text-slate-500 dark:text-slate-400">Create formal pre-sale invoices, often used for advance payment requests.</p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Customer (optional)</label>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm">
              <option value="">Walk-in / No customer selected</option>
              {customers.map((c: any) => <option key={c.id} value={c.id}>{c.customer_name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Add Products</label>
            <Input placeholder="Search products to add..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
            {productSearch && (
              <div className="mt-2 border border-slate-200 dark:border-slate-800 rounded-lg max-h-48 overflow-y-auto">
                {filteredProducts.length === 0 ? (
                  <p className="text-sm text-slate-400 p-3">No products found.</p>
                ) : filteredProducts.slice(0, 10).map((p: any) => (
                  <button key={p.id} onClick={() => addProductToItems(p)} className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-900 text-sm border-b border-slate-100 dark:border-slate-800 last:border-0 flex justify-between">
                    <span>{p.product_name}</span>
                    <span className="text-primary font-bold">₹{p.selling_price}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="space-y-2">
              {items.map((item) => (
                <div key={(item as any).product_id} className="flex gap-2 items-center border border-slate-100 dark:border-slate-800 rounded-lg p-2">
                  <span className="flex-1 text-sm font-medium">{(item as any).item_name}</span>
                  <Input type="number" placeholder="Qty" className="w-16 h-9" value={(item as any).quantity} onChange={(e) => updateItem((item as any).product_id, 'quantity', e.target.value)} />
                  <Input type="number" placeholder="Disc ₹" className="w-20 h-9" value={(item as any).discount_value} onChange={(e) => updateItem((item as any).product_id, 'discount_value', e.target.value)} />
                  <span className="text-sm font-bold w-20 text-right">₹{(((item as any).price * (parseFloat((item as any).quantity) || 0)) - (parseFloat((item as any).discount_value) || 0)).toFixed(2)}</span>
                  <button onClick={() => removeItem((item as any).product_id)} className="text-red-500"><Trash2 size={14} /></button>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-slate-100">Estimated Subtotal (before GST)</span>
                <span className="font-extrabold text-lg text-primary">₹{estimatedTotal.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Valid Until (optional)</label>
              <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Notes (optional)</label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          <Button className="w-full h-12" onClick={handleSubmit} disabled={saving || items.length === 0}>
            {saving ? 'Creating...' : 'Create Proforma Invoice'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4">Recent Proforma Invoices</h3>
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-6">Loading...</p>
          ) : proformas.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No proforma invoices yet.</p>
          ) : (
            <div className="space-y-3">
              {proformas.map((p: any) => (
                <div key={p.id} className="border border-slate-100 dark:border-slate-800 rounded-xl p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100">{p.proforma_number}</p>
                      <p className="text-xs text-slate-500">{p.customer_name || 'Walk-in'} · {p.proforma_date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-primary">₹{p.total_amount?.toLocaleString('en-IN')}</p>
                      <span className={"text-[10px] font-bold px-2 py-0.5 rounded-full uppercase " + (statusColors[p.status] || 'bg-slate-100 text-slate-700')}>{p.status}</span>
                    </div>
                  </div>
                  {p.status !== 'converted' && (
                    <Button size="sm" className="mt-3" onClick={() => handleConvert(p.id)} disabled={converting}>
                      {converting ? 'Converting...' : 'Convert to Invoice'}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};


export const DeliveryChallanInwardPage = ({ onBack, editData }: { onBack?: () => void; editData?: any }) => {
  const { currentTenantId, user, activeBranchId } = useAuth();
  const [branchId, setBranchId] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [challans, setChallans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [challanNumber, setChallanNumber] = useState('');
  const [fromParty, setFromParty] = useState('');
  const [fromGstin, setFromGstin] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [supplierId, setSupplierId] = useState<string>('');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [isItemFocused, setIsItemFocused] = useState(false);
  const [customColumns, setCustomColumns] = useState<{ column_name: string; column_label: string }[]>([]);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem(tenantScopedKey('delivery_challan_inward_columns', currentTenantId));
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      unit_cost: true, batch_number: true, expiry_date: true, mfg_date: false, size: false, colour: false,
      hsn_code: true, mrp: true, w_sale_price: false, discount: false,
      sku: false, barcode: false, imei1: false, imei2: false, kitchen: false, description: false,
      sales_unit: false, sales_alt_unit: false, conv: false, min_stock: false, status: false,
      g_down: false, rack: false, def_qty: false, part_no: false, cmb_gst: false,
      photo: false, category_plus: false, subcategory_plus: false, gst_plus: false,
      cgst: true, sgst: true, igst: true, s_tax: false, p_tax: false
    };
  });
  const [showColumnSettings, setShowColumnSettings] = useState(false);

  useEffect(() => {
    localStorage.setItem(tenantScopedKey('delivery_challan_inward_columns', currentTenantId), JSON.stringify(visibleColumns));
  }, [visibleColumns]);
  const [items, setItems] = useState<any[]>([]);
  const [manualItemName, setManualItemName] = useState('');
  const [saving, setSaving] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const galleryInputRef = React.useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) { setLoading(false); return; }

    setBranchId(activeBranchId || null);

    const { data: prodData } = await supabase.from('products').select('id, product_name, purchase_price, mrp, w_sale_price, hsn_code, sku, barcode, batch, mfg_date, exp_date, size, colour, imei1, imei2, kitchen, description, sales_unit, sales_alt_unit, conv, min_stock, status, g_down, rack, def_qty, part_no, cmb_gst, discount, custom_attributes, photo, category_plus, subcategory_plus, gst_plus, cgst, sgst, igst, s_tax, p_tax').eq('tenant_id', currentTenantId).eq('is_active', true).order('product_name');
    setProducts(prodData || []);
    const { data: customColsData } = await supabase.from('custom_columns').select('column_name, column_label').eq('tenant_id', currentTenantId).eq('table_name', 'products');
    setCustomColumns(customColsData || []);

    const { data: supData } = await supabase.from('suppliers').select('id, supplier_name, gstin').eq('tenant_id', currentTenantId).order('supplier_name');
    setSuppliers(supData || []);

    const { data: cData } = await supabase.from('delivery_challans_inward').select('*, delivery_challan_inward_items(*)').eq('tenant_id', currentTenantId).order('created_at', { ascending: false }).limit(50);
    setChallans(cData || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [currentTenantId]);

  useEffect(() => {
    if (editData) {
      setChallanNumber(editData.challanNumber || '');
      setSupplierId(editData.supplierId || '');
      setFromParty(editData.fromParty || '');
      setFromGstin(editData.fromGstin || '');
      setVehicleNumber(editData.vehicleNumber || '');
      setPurpose(editData.purpose || '');
      setNotes(editData.notes || '');
      setItems(editData.items || []);
    }
  }, [editData]);

  const addProductItem = (p: any) => {
    setItems(prev => [...prev, {
      product_id: p.id, item_name: p.product_name, quantity: '1', remarks: '',
      unit_cost: p.purchase_price || '', batch_number: p.batch || '', expiry_date: p.exp_date || '', mfg_date: p.mfg_date || '',
      size: p.size || '', colour: p.colour || '', hsn_code: p.hsn_code || '', mrp: p.mrp || '', w_sale_price: p.w_sale_price || '',
      discount: p.discount || '', sku: p.sku || '', barcode: p.barcode || '', imei1: p.imei1 || '', imei2: p.imei2 || '',
      kitchen: p.kitchen || '', description: p.description || '', sales_unit: p.sales_unit || '', sales_alt_unit: p.sales_alt_unit || '',
      conv: p.conv || '', min_stock: p.min_stock || '', status: p.status || '', g_down: p.g_down || '', rack: p.rack || '',
      def_qty: p.def_qty || '', part_no: p.part_no || '', cmb_gst: p.cmb_gst || '',
      photo: p.photo || '', category_plus: p.category_plus || '', subcategory_plus: p.subcategory_plus || '',
      gst_plus: p.gst_plus || '', cgst: p.cgst || '', sgst: p.sgst || '', igst: p.igst || '',
      s_tax: p.s_tax || '', p_tax: p.p_tax || '', custom_attributes: p.custom_attributes || {}
    } as any]);
    setProductSearch('');
  };

  const addManualItem = () => {
    if (!manualItemName) return;
    setItems(prev => [...prev, { product_id: null, item_name: manualItemName, quantity: '1', remarks: '', unit_cost: '', batch_number: '', expiry_date: '', mfg_date: '', size: '', colour: '', hsn_code: '', mrp: '', discount: '', photo: '', category_plus: '', subcategory_plus: '', gst_plus: '', cgst: '', sgst: '', igst: '', s_tax: '', p_tax: '', custom_attributes: {} } as any]);
    setManualItemName('');
  };

  const handleOcrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrLoading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/ocr-delivery-challan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({ image_base64: base64, mime_type: file.type })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'AI scan failed');
      }

      const result = await response.json();

      if (result.from_party_name) setFromParty(result.from_party_name);
      if (result.from_gstin) setFromGstin(result.from_gstin);
      if (result.vehicle_number) setVehicleNumber(result.vehicle_number);
      if (result.purpose) setPurpose(result.purpose);

      const newItems = (result.items || []).map((ocrItem: any) => {
        const matchedProduct = products.find((p: any) =>
          p.product_name.toLowerCase().trim() === ocrItem.item_name?.toLowerCase().trim()
        );
        return {
          product_id: matchedProduct ? matchedProduct.id : null,
          item_name: ocrItem.item_name || '',
          quantity: ocrItem.quantity || '1',
          remarks: ocrItem.remarks || ''
        };
      });

      setItems(prev => [...prev, ...newItems]);
      toast.success(`Scanned challan: ${newItems.length} item(s) added. Please review before saving.`);

    } catch (err: any) {
      toast.error(err.message || 'AI scan failed');
    } finally {
      setOcrLoading(false);
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const updateItem = (idx: number, field: string, value: string) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  };

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!challanNumber || !fromParty || items.length === 0 || !currentTenantId || !branchId || !user) return;
    setSaving(true);
    const supabase = getSupabaseClient();
    if (!supabase) { setSaving(false); return; }
    const { data, error } = await supabase.rpc('create_delivery_challan_inward', {
      p_tenant_id: currentTenantId,
      p_branch_id: branchId,
      p_challan_number: challanNumber,
      p_from_party_name: fromParty,
      p_from_party_gstin: fromGstin || null,
      p_vehicle_number: vehicleNumber || null,
      p_purpose: purpose || null,
      p_notes: notes || null,
      p_items: items.map(i => ({
        product_id: i.product_id,
        item_name: i.item_name,
        quantity: parseFloat(i.quantity) || 1,
        remarks: i.remarks || null,
        unit_cost: i.unit_cost || null,
        batch_number: i.batch_number || null,
        expiry_date: i.expiry_date || null,
        mfg_date: i.mfg_date || null,
        size: i.size || null,
        colour: i.colour || null,
        hsn_code: i.hsn_code || null,
        mrp: i.mrp || null,
        discount: i.discount || null,
        sku: i.sku || null,
        barcode: i.barcode || null,
        w_sale_price: i.w_sale_price || null,
        imei1: i.imei1 || null,
        imei2: i.imei2 || null,
        kitchen: i.kitchen || null,
        description: i.description || null,
        sales_unit: i.sales_unit || null,
        sales_alt_unit: i.sales_alt_unit || null,
        conv: i.conv || null,
        min_stock: i.min_stock || null,
        status: i.status || null,
        g_down: i.g_down || null,
        rack: i.rack || null,
        def_qty: i.def_qty || null,
        part_no: i.part_no || null,
        cmb_gst: i.cmb_gst || null,
        photo: i.photo || null,
        category_plus: i.category_plus || null,
        subcategory_plus: i.subcategory_plus || null,
        gst_plus: i.gst_plus || null,
        cgst: i.cgst || null,
        sgst: i.sgst || null,
        igst: i.igst || null,
        s_tax: i.s_tax || null,
        p_tax: i.p_tax || null,
        custom_attributes: i.custom_attributes || {}
      })),
      p_created_by: user.id,
      p_supplier_id: supplierId || null
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }

    const { data: branchInfo } = await supabase.from('branches').select('branch_name, address').eq('id', branchId).maybeSingle();
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
      customer: { name: fromParty, gstin: fromGstin || undefined },
      customer_info_label: 'From',
      meta: {
        label: 'Delivery Challan (Inward)',
        number: challanNumber,
        date: new Date().toLocaleDateString(),
        extra: [
          ...(vehicleNumber ? [{ label: 'Vehicle No', value: vehicleNumber }] : []),
          ...(purpose ? [{ label: 'Purpose', value: purpose }] : [])
        ]
      },
      items: items.map(i => {
        const qty = parseFloat(i.quantity) || 1;
        const rate = parseFloat(i.unit_cost) || 0;
        const base = qty * rate;
        const cgst = parseFloat(i.cgst) || 0;
        const sgst = parseFloat(i.sgst) || 0;
        const igst = parseFloat(i.igst) || 0;
        const taxRate = cgst + sgst + igst;
        const taxAmt = (base * taxRate) / 100;
        return {
          name: i.item_name + (i.remarks ? ` (${i.remarks})` : ''),
          hsn: i.hsn_code || undefined,
          qty,
          rate: rate || undefined,
          tax: taxRate > 0 ? `${taxRate}%` : undefined,
          amount: base + taxAmt
        };
      }),
      totals: {
        grand_total: items.reduce((sum, i) => {
          const qty = parseFloat(i.quantity) || 1;
          const rate = parseFloat(i.unit_cost) || 0;
          const base = qty * rate;
          const cgst = parseFloat(i.cgst) || 0;
          const sgst = parseFloat(i.sgst) || 0;
          const igst = parseFloat(i.igst) || 0;
          const taxAmt = (base * (cgst + sgst + igst)) / 100;
          return sum + base + taxAmt;
        }, 0)
      },
      footer: {
        stamp_url: brandingInfo?.stamp_url
      },
      bill_number_code_type: brandingInfo?.bill_number_code_type || 'none'
    };

    await printBillForChannel(supabase, currentTenantId, 'delivery_challan_in', billData, 'A4');

    toast.success('Delivery challan recorded');
    setChallanNumber(''); setFromParty(''); setFromGstin(''); setVehicleNumber(''); setPurpose(''); setNotes('');
    setItems([]);
    fetchData();
    if (onBack) onBack();
  };

  const filteredProducts = products.filter((p: any) => p.product_name?.toLowerCase().includes(productSearch.toLowerCase()));

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Delivery Challan (Inward)</h2>
          <p className="text-slate-500 dark:text-slate-400">Record goods received without an invoice, such as job work returns or samples.</p>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={cameraInputRef}
            className="hidden"
            onChange={handleOcrUpload}
          />
          <input
            type="file"
            accept="image/*"
            ref={galleryInputRef}
            className="hidden"
            onChange={handleOcrUpload}
          />
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            disabled={ocrLoading}
            onClick={() => cameraInputRef.current?.click()}
          >
            {ocrLoading ? 'Scanning...' : 'Take Photo (AI Auto-fill)'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            disabled={ocrLoading}
            onClick={() => galleryInputRef.current?.click()}
          >
            {ocrLoading ? 'Scanning...' : 'Choose File (AI Auto-fill)'}
          </Button>
        </div>
      </div>

      {onBack && (
        <Button variant="ghost" onClick={onBack} className="gap-2">
          ← Back to List
        </Button>
      )}

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Challan Number * (as written on the supplier's document)</label>
              <Input value={challanNumber} onChange={(e) => setChallanNumber(e.target.value)} placeholder="e.g. DC-4521" />
            </div>
            <div>
              <label className="text-sm font-medium">Supplier (optional, but required to convert to Purchase Invoice later)</label>
              <select
                className="w-full border rounded-md h-9 px-2 text-sm bg-white dark:bg-slate-950"
                value={supplierId}
                onChange={(e) => {
                  setSupplierId(e.target.value);
                  const sup = suppliers.find((s: any) => s.id === e.target.value);
                  if (sup) {
                    setFromParty(sup.supplier_name);
                    setFromGstin(sup.gstin || '');
                  }
                }}
              >
                <option value="">-- No supplier / one-time party --</option>
                {suppliers.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.supplier_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">From Party Name *</label>
              <Input value={fromParty} onChange={(e) => setFromParty(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">GSTIN (optional)</label>
              <Input value={fromGstin} onChange={(e) => setFromGstin(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Vehicle Number (optional)</label>
              <Input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Purpose (optional)</label>
              <Input placeholder="e.g. Job Work Return, Sample" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
            </div>
          </div>

          <div className="relative">
            <label className="text-sm font-medium">Add Items From Inventory</label>
            <Input
              placeholder="Click to browse or type to search products..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              onFocus={() => setIsItemFocused(true)}
              onBlur={() => setTimeout(() => setIsItemFocused(false), 200)}
            />
            {isItemFocused && (
              <div className="absolute z-50 w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md shadow-lg max-h-[200px] overflow-y-auto mt-1">
                {filteredProducts.length > 0 ? (
                  filteredProducts.slice(0, 20).map((p: any) => (
                    <div
                      key={p.id}
                      className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer text-sm border-b border-slate-100 dark:border-slate-800 last:border-0"
                      onClick={() => { addProductItem(p); setProductSearch(''); }}
                    >
                      {p.product_name}
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-2 text-slate-500 dark:text-slate-400 text-sm">No items found.</div>
                )}
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-end relative">
                <Button variant="outline" size="sm" onClick={() => setShowColumnSettings(!showColumnSettings)}>
                  <Settings className="h-3.5 w-3.5 mr-1" /> Columns
                </Button>
                {showColumnSettings && (
                  <div className="absolute right-0 top-9 w-48 bg-white dark:bg-slate-950 rounded-md shadow-lg border border-slate-200 dark:border-slate-800 z-50 p-2">
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 px-1 uppercase">Visible Columns</div>
                    <div className="max-h-64 overflow-y-auto space-y-1">
                      {Object.keys(visibleColumns).map(col => (
                        <label key={col} className="flex items-center p-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            className="mr-2 rounded border-slate-300"
                            checked={visibleColumns[col as keyof typeof visibleColumns]}
                            onChange={(e) => setVisibleColumns({ ...visibleColumns, [col]: e.target.checked })}
                          />
                          <span className="text-sm text-slate-700 dark:text-slate-300 capitalize">{col.replace(/_/g, ' ')}</span>
                        </label>
                      ))}
                      {customColumns.length > 0 && (
                        <>
                          <div className="text-xs font-semibold text-slate-400 mt-2 mb-1 px-1 uppercase border-t pt-2">Custom Columns</div>
                          {customColumns.map(cc => (
                            <label key={cc.column_name} className="flex items-center p-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 rounded cursor-pointer">
                              <input
                                type="checkbox"
                                className="mr-2 rounded border-slate-300"
                                checked={!!visibleColumns[`custom_${cc.column_name}` as keyof typeof visibleColumns]}
                                onChange={(e) => setVisibleColumns({ ...visibleColumns, [`custom_${cc.column_name}`]: e.target.checked })}
                              />
                              <span className="text-sm text-slate-700 dark:text-slate-300">{cc.column_label}</span>
                            </label>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {items.map((item, idx) => (
                <div key={idx} className="border border-slate-100 dark:border-slate-800 rounded-lg p-2 space-y-1">
                  <div className="flex gap-2 items-center">
                    <span className="flex-1 text-sm font-medium">{(item as any).item_name}</span>
                    <Input type="number" placeholder="Qty" className="w-20 h-9" value={(item as any).quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} />
                    {visibleColumns.unit_cost && (
                      <Input type="number" placeholder="Rate ₹" className="w-24 h-9" value={(item as any).unit_cost} onChange={(e) => updateItem(idx, 'unit_cost', e.target.value)} />
                    )}
                    <button onClick={() => removeItem(idx)} className="text-red-500"><Trash2 size={14} /></button>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {visibleColumns.batch_number && (
                      <Input placeholder="Batch No" className="w-28 h-8 text-xs" value={(item as any).batch_number} onChange={(e) => updateItem(idx, 'batch_number', e.target.value)} />
                    )}
                    {visibleColumns.expiry_date && (
                      <Input type="date" placeholder="Expiry" className="w-32 h-8 text-xs" value={(item as any).expiry_date} onChange={(e) => updateItem(idx, 'expiry_date', e.target.value)} />
                    )}
                    {visibleColumns.mfg_date && (
                      <Input type="date" placeholder="Mfg Date" className="w-32 h-8 text-xs" value={(item as any).mfg_date} onChange={(e) => updateItem(idx, 'mfg_date', e.target.value)} />
                    )}
                    {visibleColumns.size && (
                      <Input placeholder="Size" className="w-20 h-8 text-xs" value={(item as any).size} onChange={(e) => updateItem(idx, 'size', e.target.value)} />
                    )}
                    {visibleColumns.colour && (
                      <Input placeholder="Colour" className="w-20 h-8 text-xs" value={(item as any).colour} onChange={(e) => updateItem(idx, 'colour', e.target.value)} />
                    )}
                    {visibleColumns.hsn_code && (
                      <Input placeholder="HSN" className="w-20 h-8 text-xs" value={(item as any).hsn_code} onChange={(e) => updateItem(idx, 'hsn_code', e.target.value)} />
                    )}
                    {visibleColumns.mrp && (
                      <Input type="number" placeholder="MRP" className="w-20 h-8 text-xs" value={(item as any).mrp} onChange={(e) => updateItem(idx, 'mrp', e.target.value)} />
                    )}
                    {visibleColumns.discount && (
                      <Input type="number" placeholder="Discount" className="w-20 h-8 text-xs" value={(item as any).discount} onChange={(e) => updateItem(idx, 'discount', e.target.value)} />
                    )}
{visibleColumns.w_sale_price && (
  <Input type="number" placeholder="W.Sale Price" className="w-24 h-8 text-xs" value={(item as any).w_sale_price} onChange={(e) => updateItem(idx, 'w_sale_price', e.target.value)} />
)}
{visibleColumns.sku && (
  <Input placeholder="SKU" className="w-24 h-8 text-xs" value={(item as any).sku} onChange={(e) => updateItem(idx, 'sku', e.target.value)} />
)}
{visibleColumns.barcode && (
  <Input placeholder="Barcode" className="w-28 h-8 text-xs" value={(item as any).barcode} onChange={(e) => updateItem(idx, 'barcode', e.target.value)} />
)}
{visibleColumns.imei1 && (
  <Input placeholder="IMEI 1" className="w-28 h-8 text-xs" value={(item as any).imei1} onChange={(e) => updateItem(idx, 'imei1', e.target.value)} />
)}
{visibleColumns.imei2 && (
  <Input placeholder="IMEI 2" className="w-28 h-8 text-xs" value={(item as any).imei2} onChange={(e) => updateItem(idx, 'imei2', e.target.value)} />
)}
{visibleColumns.kitchen && (
  <Input placeholder="Kitchen" className="w-24 h-8 text-xs" value={(item as any).kitchen} onChange={(e) => updateItem(idx, 'kitchen', e.target.value)} />
)}
{visibleColumns.description && (
  <Input placeholder="Description" className="w-32 h-8 text-xs" value={(item as any).description} onChange={(e) => updateItem(idx, 'description', e.target.value)} />
)}
{visibleColumns.sales_unit && (
  <Input placeholder="Sales Unit" className="w-24 h-8 text-xs" value={(item as any).sales_unit} onChange={(e) => updateItem(idx, 'sales_unit', e.target.value)} />
)}
{visibleColumns.sales_alt_unit && (
  <Input placeholder="Alt Unit" className="w-24 h-8 text-xs" value={(item as any).sales_alt_unit} onChange={(e) => updateItem(idx, 'sales_alt_unit', e.target.value)} />
)}
{visibleColumns.conv && (
  <Input type="number" placeholder="Conv" className="w-20 h-8 text-xs" value={(item as any).conv} onChange={(e) => updateItem(idx, 'conv', e.target.value)} />
)}
{visibleColumns.min_stock && (
  <Input type="number" placeholder="Min Stock" className="w-24 h-8 text-xs" value={(item as any).min_stock} onChange={(e) => updateItem(idx, 'min_stock', e.target.value)} />
)}
{visibleColumns.status && (
  <Input placeholder="Status" className="w-24 h-8 text-xs" value={(item as any).status} onChange={(e) => updateItem(idx, 'status', e.target.value)} />
)}
{visibleColumns.g_down && (
  <Input placeholder="Godown" className="w-24 h-8 text-xs" value={(item as any).g_down} onChange={(e) => updateItem(idx, 'g_down', e.target.value)} />
)}
{visibleColumns.rack && (
  <Input placeholder="Rack" className="w-20 h-8 text-xs" value={(item as any).rack} onChange={(e) => updateItem(idx, 'rack', e.target.value)} />
)}
{visibleColumns.def_qty && (
  <Input type="number" placeholder="Def Qty" className="w-20 h-8 text-xs" value={(item as any).def_qty} onChange={(e) => updateItem(idx, 'def_qty', e.target.value)} />
)}
{visibleColumns.part_no && (
  <Input placeholder="Part No" className="w-24 h-8 text-xs" value={(item as any).part_no} onChange={(e) => updateItem(idx, 'part_no', e.target.value)} />
)}
{visibleColumns.cmb_gst && (
  <Input placeholder="Comb. GST" className="w-24 h-8 text-xs" value={(item as any).cmb_gst} onChange={(e) => updateItem(idx, 'cmb_gst', e.target.value)} />
)}

{visibleColumns.photo && (
  <Input placeholder="Photo URL" className="w-24 h-8 text-xs" value={(item as any).photo} onChange={(e) => updateItem(idx, 'photo', e.target.value)} />
)}
{visibleColumns.category_plus && (
  <Input placeholder="Category" className="w-24 h-8 text-xs" value={(item as any).category_plus} onChange={(e) => updateItem(idx, 'category_plus', e.target.value)} />
)}
{visibleColumns.subcategory_plus && (
  <Input placeholder="Subcategory" className="w-24 h-8 text-xs" value={(item as any).subcategory_plus} onChange={(e) => updateItem(idx, 'subcategory_plus', e.target.value)} />
)}
{visibleColumns.gst_plus && (
  <Input placeholder="GST%" className="w-20 h-8 text-xs" value={(item as any).gst_plus} onChange={(e) => updateItem(idx, 'gst_plus', e.target.value)} />
)}
{visibleColumns.cgst && (
  <Input placeholder="CGST" className="w-20 h-8 text-xs" value={(item as any).cgst} onChange={(e) => updateItem(idx, 'cgst', e.target.value)} />
)}
{visibleColumns.sgst && (
  <Input placeholder="SGST" className="w-20 h-8 text-xs" value={(item as any).sgst} onChange={(e) => updateItem(idx, 'sgst', e.target.value)} />
)}
{visibleColumns.igst && (
  <Input placeholder="IGST" className="w-20 h-8 text-xs" value={(item as any).igst} onChange={(e) => updateItem(idx, 'igst', e.target.value)} />
)}
{visibleColumns.s_tax && (
  <Input placeholder="S Tax" className="w-20 h-8 text-xs" value={(item as any).s_tax} onChange={(e) => updateItem(idx, 's_tax', e.target.value)} />
)}
{visibleColumns.p_tax && (
  <Input placeholder="P Tax" className="w-20 h-8 text-xs" value={(item as any).p_tax} onChange={(e) => updateItem(idx, 'p_tax', e.target.value)} />
)}
{customColumns.map(cc => visibleColumns[`custom_${cc.column_name}` as keyof typeof visibleColumns] && (
  <Input
    key={cc.column_name}
    placeholder={cc.column_label}
    className="w-24 h-8 text-xs"
    value={(item as any).custom_attributes?.[cc.column_name] || ''}
    onChange={(e) => {
      const newCustom = { ...(item as any).custom_attributes, [cc.column_name]: e.target.value };
      updateItem(idx, 'custom_attributes', newCustom as any);
    }}
  />
))}
                    <Input placeholder="Remarks" className="w-28 h-8 text-xs" value={(item as any).remarks} onChange={(e) => updateItem(idx, 'remarks', e.target.value)} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Notes (optional)</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <Button className="w-full h-12" onClick={handleSubmit} disabled={saving || !challanNumber || !fromParty || items.length === 0}>
            {saving ? 'Recording...' : 'Record & Print'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}


export const DeliveryChallanOutwardPage = ({ onBack, editData }: { onBack?: () => void; editData?: any }) => {
  const { currentTenantId, user, activeBranchId } = useAuth();
  const [branchId, setBranchId] = useState<string | null>(null);

  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const [challanNumber, setChallanNumber] = useState('');
  const [toParty, setToParty] = useState('');
  const [toGstin, setToGstin] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [isItemFocused, setIsItemFocused] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [manualItemName, setManualItemName] = useState('');
  const [saving, setSaving] = useState(false);
  const [customColumns, setCustomColumns] = useState<{ column_name: string; column_label: string }[]>([]);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem(tenantScopedKey('delivery_challan_outward_columns', currentTenantId));
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return { unit_price: true, discount_value: false, batch_number: false, expiry_date: false, mfg_date: false, size: false, colour: false, hsn_code: false, mrp: false, w_sale_price: false, sku: false, barcode: false, imei1: false, imei2: false, kitchen: false, description: false, sales_unit: false, sales_alt_unit: false, conv: false, min_stock: false, status: false, g_down: false, rack: false, def_qty: false, part_no: false, cmb_gst: false, photo: false, category_plus: false, subcategory_plus: false, gst_plus: false, cgst: true, sgst: true, igst: true, s_tax: false, p_tax: false };
  });
  const [showColumnSettings, setShowColumnSettings] = useState(false);

  useEffect(() => {
    localStorage.setItem(tenantScopedKey('delivery_challan_outward_columns', currentTenantId), JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const fetchData = async () => {
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) { setLoading(false); return; }

    setBranchId(activeBranchId || null);

    const { data: prodData } = await supabase.from('products').select('id, product_name, purchase_price, mrp, w_sale_price, hsn_code, sku, barcode, batch, mfg_date, exp_date, size, colour, imei1, imei2, kitchen, description, sales_unit, sales_alt_unit, conv, min_stock, status, g_down, rack, def_qty, part_no, cmb_gst, discount, selling_price, custom_attributes, photo, category_plus, subcategory_plus, gst_plus, cgst, sgst, igst, s_tax, p_tax').eq('tenant_id', currentTenantId).eq('is_active', true).order('product_name');
    setProducts(prodData || []);
    const { data: customColsData } = await supabase.from('custom_columns').select('column_name, column_label').eq('tenant_id', currentTenantId).eq('table_name', 'products');
    setCustomColumns(customColsData || []);

    const { data: custData } = await supabase.from('retail_customers').select('id, customer_name, phone').eq('tenant_id', currentTenantId).order('customer_name');
    setCustomers(custData || []);

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [currentTenantId]);

  useEffect(() => {
    if (!editData) {
      let prefix = 'DCO-';
      try {
        const saved = localStorage.getItem(tenantScopedKey('posSettings', currentTenantId));
        if (saved) {
          const settings = JSON.parse(saved);
          prefix = settings['delivery_challan_out']?.prefix || 'DCO-';
        }
      } catch (e) {}
      const generated = prefix + Date.now().toString().slice(-8);
      setChallanNumber(generated);
    }
  }, []);

  useEffect(() => {
    if (editData) {
      setChallanNumber(editData.challanNumber || '');
      setCustomerId(editData.customerId || '');
      setToParty(editData.toParty || '');
      setToGstin(editData.toGstin || '');
      setVehicleNumber(editData.vehicleNumber || '');
      setPurpose(editData.purpose || '');
      setNotes(editData.notes || '');
      setItems(editData.items || []);
    }
  }, [editData]);

  const addProductItem = (p: any) => {
    setItems(prev => [...prev, {
      product_id: p.id, item_name: p.product_name, quantity: '1', remarks: '',
      unit_price: p.selling_price || '', discount_type: 'fixed', discount_value: '',
      batch_number: p.batch || '', expiry_date: p.exp_date || '', mfg_date: p.mfg_date || '',
      size: p.size || '', colour: p.colour || '', hsn_code: p.hsn_code || '', mrp: p.mrp || '', w_sale_price: p.w_sale_price || '',
      sku: p.sku || '', barcode: p.barcode || '', imei1: p.imei1 || '', imei2: p.imei2 || '',
      kitchen: p.kitchen || '', description: p.description || '', sales_unit: p.sales_unit || '', sales_alt_unit: p.sales_alt_unit || '',
      conv: p.conv || '', min_stock: p.min_stock || '', status: p.status || '', g_down: p.g_down || '', rack: p.rack || '',
      def_qty: p.def_qty || '', part_no: p.part_no || '', cmb_gst: p.cmb_gst || '',
      photo: p.photo || '', category_plus: p.category_plus || '', subcategory_plus: p.subcategory_plus || '',
      gst_plus: p.gst_plus || '', cgst: p.cgst || '', sgst: p.sgst || '', igst: p.igst || '',
      s_tax: p.s_tax || '', p_tax: p.p_tax || '', custom_attributes: p.custom_attributes || {}
    } as any]);
    setProductSearch('');
  };

  const addManualItem = () => {
    if (!manualItemName) return;
    setItems(prev => [...prev, { product_id: null, item_name: manualItemName, quantity: '1', remarks: '', unit_price: '', discount_type: 'fixed', discount_value: '', photo: '', category_plus: '', subcategory_plus: '', gst_plus: '', cgst: '', sgst: '', igst: '', s_tax: '', p_tax: '', custom_attributes: {} }]);
    setManualItemName('');
  };

  const updateItem = (idx: number, field: string, value: string) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  };

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!challanNumber || !toParty || items.length === 0 || !currentTenantId || !branchId || !user) return;
    setSaving(true);
    const supabase = getSupabaseClient();
    if (!supabase) { setSaving(false); return; }

    const { error } = await supabase.rpc('create_delivery_challan_outward', {
      p_tenant_id: currentTenantId,
      p_branch_id: branchId,
      p_challan_number: challanNumber,
      p_to_party_name: toParty,
      p_to_party_gstin: toGstin || null,
      p_vehicle_number: vehicleNumber || null,
      p_purpose: purpose || null,
      p_notes: notes || null,
      p_items: items.map(i => ({
        product_id: i.product_id,
        item_name: i.item_name,
        quantity: parseFloat(i.quantity) || 1,
        remarks: i.remarks || null,
        unit_price: i.unit_price || null,
        discount_type: i.discount_type || null,
        discount_value: i.discount_value || null,
        sku: i.sku || null,
        barcode: i.barcode || null,
        mrp: i.mrp || null,
        w_sale_price: i.w_sale_price || null,
        batch_number: i.batch_number || null,
        expiry_date: i.expiry_date || null,
        mfg_date: i.mfg_date || null,
        size: i.size || null,
        colour: i.colour || null,
        hsn_code: i.hsn_code || null,
        imei1: i.imei1 || null,
        imei2: i.imei2 || null,
        kitchen: i.kitchen || null,
        description: i.description || null,
        sales_unit: i.sales_unit || null,
        sales_alt_unit: i.sales_alt_unit || null,
        conv: i.conv || null,
        min_stock: i.min_stock || null,
        status: i.status || null,
        g_down: i.g_down || null,
        rack: i.rack || null,
        def_qty: i.def_qty || null,
        part_no: i.part_no || null,
        cmb_gst: i.cmb_gst || null,
        photo: i.photo || null,
        category_plus: i.category_plus || null,
        subcategory_plus: i.subcategory_plus || null,
        gst_plus: i.gst_plus || null,
        cgst: i.cgst || null,
        sgst: i.sgst || null,
        igst: i.igst || null,
        s_tax: i.s_tax || null,
        p_tax: i.p_tax || null,
        custom_attributes: i.custom_attributes || {}
      })),
      p_created_by: user.id,
      p_customer_id: customerId || null
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }

    const { data: branchInfo } = await supabase.from('branches').select('branch_name, address').eq('id', branchId).maybeSingle();
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
      customer: { name: toParty, gstin: toGstin || undefined },
      customer_info_label: 'To',
      meta: {
        label: 'Delivery Challan (Outward)',
        number: challanNumber,
        date: new Date().toLocaleDateString(),
        extra: [
          ...(vehicleNumber ? [{ label: 'Vehicle No', value: vehicleNumber }] : []),
          ...(purpose ? [{ label: 'Purpose', value: purpose }] : [])
        ]
      },
      items: items.map(i => {
        const qty = parseFloat(i.quantity) || 1;
        const rate = parseFloat(i.unit_price) || 0;
        const base = (qty * rate) - (parseFloat(i.discount_value) || 0);
        const cgst = parseFloat(i.cgst) || 0;
        const sgst = parseFloat(i.sgst) || 0;
        const igst = parseFloat(i.igst) || 0;
        const taxRate = cgst + sgst + igst;
        const taxAmt = (base * taxRate) / 100;
        return {
          name: i.item_name + (i.remarks ? ` (${i.remarks})` : ''),
          hsn: i.hsn_code || undefined,
          qty,
          rate: rate || undefined,
          tax: taxRate > 0 ? `${taxRate}%` : undefined,
          amount: base + taxAmt
        };
      }),
      totals: {
        grand_total: items.reduce((sum, i) => {
          const qty = parseFloat(i.quantity) || 1;
          const rate = parseFloat(i.unit_price) || 0;
          const base = (qty * rate) - (parseFloat(i.discount_value) || 0);
          const cgst = parseFloat(i.cgst) || 0;
          const sgst = parseFloat(i.sgst) || 0;
          const igst = parseFloat(i.igst) || 0;
          const taxAmt = (base * (cgst + sgst + igst)) / 100;
          return sum + base + taxAmt;
        }, 0)
      },
      footer: { stamp_url: brandingInfo?.stamp_url },
      bill_number_code_type: brandingInfo?.bill_number_code_type || 'none'
    };
    await printBillForChannel(supabase, currentTenantId, 'delivery_challan_out', billData, 'A4');

    toast.success('Delivery challan recorded');
    setChallanNumber(''); setCustomerId(''); setToParty(''); setToGstin(''); setVehicleNumber(''); setPurpose(''); setNotes('');
    setItems([]);
    fetchData();
    if (onBack) onBack();
  };

  const filteredProducts = products.filter((p: any) => p.product_name?.toLowerCase().includes(productSearch.toLowerCase()));

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Delivery Challan (Outward)</h2>
          <p className="text-slate-500 dark:text-slate-400">Record goods sent out without an invoice, such as job work or samples.</p>
        </div>
      </div>
      {onBack && (
        <Button variant="ghost" onClick={onBack} className="gap-2">← Back to List</Button>
      )}

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Challan Number (auto-generated, editable)</label>
              <Input value={challanNumber} onChange={(e) => setChallanNumber(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Customer (optional, but required to convert to Sale Invoice later)</label>
              <select
                className="w-full border rounded-md h-9 px-2 text-sm bg-white dark:bg-slate-950"
                value={customerId}
                onChange={(e) => {
                  setCustomerId(e.target.value);
                  const cust = customers.find((c: any) => c.id === e.target.value);
                  if (cust) setToParty(cust.customer_name);
                }}
              >
                <option value="">-- No customer / one-time party --</option>
                {customers.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.customer_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">To Party Name *</label>
              <Input value={toParty} onChange={(e) => setToParty(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">GSTIN (optional)</label>
              <Input value={toGstin} onChange={(e) => setToGstin(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Vehicle Number (optional)</label>
              <Input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Purpose (optional)</label>
              <Input placeholder="e.g. Job Work, Sample" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
            </div>
          </div>

          <div className="relative">
            <label className="text-sm font-medium">Add Items From Inventory</label>
            <Input
              placeholder="Click to browse or type to search products..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              onFocus={() => setIsItemFocused(true)}
              onBlur={() => setTimeout(() => setIsItemFocused(false), 200)}
            />
            {isItemFocused && (
              <div className="absolute z-50 w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md shadow-lg max-h-[200px] overflow-y-auto mt-1">
                {filteredProducts.length > 0 ? (
                  filteredProducts.slice(0, 20).map((p: any) => (
                    <div key={p.id} className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer text-sm border-b border-slate-100 dark:border-slate-800 last:border-0" onClick={() => { addProductItem(p); setProductSearch(''); }}>
                      {p.product_name}
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-2 text-slate-500 dark:text-slate-400 text-sm">No items found.</div>
                )}
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-end relative">
                <Button variant="outline" size="sm" onClick={() => setShowColumnSettings(!showColumnSettings)}>
                  <Settings className="h-3.5 w-3.5 mr-1" /> Columns
                </Button>
                {showColumnSettings && (
                  <div className="absolute right-0 top-9 w-48 bg-white dark:bg-slate-950 rounded-md shadow-lg border border-slate-200 dark:border-slate-800 z-50 p-2">
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 px-1 uppercase">Visible Columns</div>
                    <div className="max-h-64 overflow-y-auto space-y-1">
                      {Object.keys(visibleColumns).map(col => (
                        <label key={col} className="flex items-center p-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 rounded cursor-pointer">
                          <input type="checkbox" className="mr-2 rounded border-slate-300" checked={visibleColumns[col as keyof typeof visibleColumns]} onChange={(e) => setVisibleColumns({ ...visibleColumns, [col]: e.target.checked })} />
                          <span className="text-sm text-slate-700 dark:text-slate-300 capitalize">{col.replace(/_/g, ' ')}</span>
                        </label>
                      ))}
                      {customColumns.length > 0 && (
                        <>
                          <div className="text-xs font-semibold text-slate-400 mt-2 mb-1 px-1 uppercase border-t pt-2">Custom Columns</div>
                          {customColumns.map(cc => (
                            <label key={cc.column_name} className="flex items-center p-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 rounded cursor-pointer">
                              <input
                                type="checkbox"
                                className="mr-2 rounded border-slate-300"
                                checked={!!visibleColumns[`custom_${cc.column_name}` as keyof typeof visibleColumns]}
                                onChange={(e) => setVisibleColumns({ ...visibleColumns, [`custom_${cc.column_name}`]: e.target.checked })}
                              />
                              <span className="text-sm text-slate-700 dark:text-slate-300">{cc.column_label}</span>
                            </label>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {items.map((item, idx) => (
                <div key={idx} className="flex flex-col gap-2 border border-slate-100 dark:border-slate-800 rounded-lg p-2">
                  <div className="flex gap-2 items-center">
                    <span className="flex-1 text-sm font-medium">{(item as any).item_name}</span>
                    <Input type="number" placeholder="Qty" className="w-20 h-9" value={(item as any).quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} />
                    {visibleColumns.unit_price && (
                      <Input type="number" placeholder="Price ₹" className="w-24 h-9" value={(item as any).unit_price} onChange={(e) => updateItem(idx, 'unit_price', e.target.value)} />
                    )}
                    {visibleColumns.discount_value && (
                      <Input type="number" placeholder="Discount" className="w-24 h-9" value={(item as any).discount_value} onChange={(e) => updateItem(idx, 'discount_value', e.target.value)} />
                    )}
                    <button onClick={() => removeItem(idx)} className="text-red-500"><Trash2 size={14} /></button>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    {visibleColumns.batch_number && (
                      <Input placeholder="Batch" className="w-24 h-8 text-xs" value={(item as any).batch_number} onChange={(e) => updateItem(idx, 'batch_number', e.target.value)} />
                    )}
                    {visibleColumns.expiry_date && (
                      <Input type="date" placeholder="Expiry" className="w-32 h-8 text-xs" value={(item as any).expiry_date} onChange={(e) => updateItem(idx, 'expiry_date', e.target.value)} />
                    )}
                    {visibleColumns.mfg_date && (
                      <Input type="date" placeholder="Mfg Date" className="w-32 h-8 text-xs" value={(item as any).mfg_date} onChange={(e) => updateItem(idx, 'mfg_date', e.target.value)} />
                    )}
                    {visibleColumns.size && (
                      <Input placeholder="Size" className="w-20 h-8 text-xs" value={(item as any).size} onChange={(e) => updateItem(idx, 'size', e.target.value)} />
                    )}
                    {visibleColumns.colour && (
                      <Input placeholder="Colour" className="w-20 h-8 text-xs" value={(item as any).colour} onChange={(e) => updateItem(idx, 'colour', e.target.value)} />
                    )}
                    {visibleColumns.hsn_code && (
                      <Input placeholder="HSN" className="w-20 h-8 text-xs" value={(item as any).hsn_code} onChange={(e) => updateItem(idx, 'hsn_code', e.target.value)} />
                    )}
                    {visibleColumns.mrp && (
                      <Input type="number" placeholder="MRP" className="w-20 h-8 text-xs" value={(item as any).mrp} onChange={(e) => updateItem(idx, 'mrp', e.target.value)} />
                    )}
{visibleColumns.w_sale_price && (
  <Input type="number" placeholder="W.Sale Price" className="w-24 h-8 text-xs" value={(item as any).w_sale_price} onChange={(e) => updateItem(idx, 'w_sale_price', e.target.value)} />
)}
{visibleColumns.sku && (
  <Input placeholder="SKU" className="w-24 h-8 text-xs" value={(item as any).sku} onChange={(e) => updateItem(idx, 'sku', e.target.value)} />
)}
{visibleColumns.barcode && (
  <Input placeholder="Barcode" className="w-28 h-8 text-xs" value={(item as any).barcode} onChange={(e) => updateItem(idx, 'barcode', e.target.value)} />
)}
{visibleColumns.imei1 && (
  <Input placeholder="IMEI 1" className="w-28 h-8 text-xs" value={(item as any).imei1} onChange={(e) => updateItem(idx, 'imei1', e.target.value)} />
)}
{visibleColumns.imei2 && (
  <Input placeholder="IMEI 2" className="w-28 h-8 text-xs" value={(item as any).imei2} onChange={(e) => updateItem(idx, 'imei2', e.target.value)} />
)}
{visibleColumns.kitchen && (
  <Input placeholder="Kitchen" className="w-24 h-8 text-xs" value={(item as any).kitchen} onChange={(e) => updateItem(idx, 'kitchen', e.target.value)} />
)}
{visibleColumns.description && (
  <Input placeholder="Description" className="w-32 h-8 text-xs" value={(item as any).description} onChange={(e) => updateItem(idx, 'description', e.target.value)} />
)}
{visibleColumns.sales_unit && (
  <Input placeholder="Sales Unit" className="w-24 h-8 text-xs" value={(item as any).sales_unit} onChange={(e) => updateItem(idx, 'sales_unit', e.target.value)} />
)}
{visibleColumns.sales_alt_unit && (
  <Input placeholder="Alt Unit" className="w-24 h-8 text-xs" value={(item as any).sales_alt_unit} onChange={(e) => updateItem(idx, 'sales_alt_unit', e.target.value)} />
)}
{visibleColumns.conv && (
  <Input type="number" placeholder="Conv" className="w-20 h-8 text-xs" value={(item as any).conv} onChange={(e) => updateItem(idx, 'conv', e.target.value)} />
)}
{visibleColumns.min_stock && (
  <Input type="number" placeholder="Min Stock" className="w-24 h-8 text-xs" value={(item as any).min_stock} onChange={(e) => updateItem(idx, 'min_stock', e.target.value)} />
)}
{visibleColumns.status && (
  <Input placeholder="Status" className="w-24 h-8 text-xs" value={(item as any).status} onChange={(e) => updateItem(idx, 'status', e.target.value)} />
)}
{visibleColumns.g_down && (
  <Input placeholder="Godown" className="w-24 h-8 text-xs" value={(item as any).g_down} onChange={(e) => updateItem(idx, 'g_down', e.target.value)} />
)}
{visibleColumns.rack && (
  <Input placeholder="Rack" className="w-20 h-8 text-xs" value={(item as any).rack} onChange={(e) => updateItem(idx, 'rack', e.target.value)} />
)}
{visibleColumns.def_qty && (
  <Input type="number" placeholder="Def Qty" className="w-20 h-8 text-xs" value={(item as any).def_qty} onChange={(e) => updateItem(idx, 'def_qty', e.target.value)} />
)}
{visibleColumns.part_no && (
  <Input placeholder="Part No" className="w-24 h-8 text-xs" value={(item as any).part_no} onChange={(e) => updateItem(idx, 'part_no', e.target.value)} />
)}
{visibleColumns.cmb_gst && (
  <Input placeholder="Comb. GST" className="w-24 h-8 text-xs" value={(item as any).cmb_gst} onChange={(e) => updateItem(idx, 'cmb_gst', e.target.value)} />
)}

{visibleColumns.photo && (
  <Input placeholder="Photo URL" className="w-24 h-8 text-xs" value={(item as any).photo} onChange={(e) => updateItem(idx, 'photo', e.target.value)} />
)}
{visibleColumns.category_plus && (
  <Input placeholder="Category" className="w-24 h-8 text-xs" value={(item as any).category_plus} onChange={(e) => updateItem(idx, 'category_plus', e.target.value)} />
)}
{visibleColumns.subcategory_plus && (
  <Input placeholder="Subcategory" className="w-24 h-8 text-xs" value={(item as any).subcategory_plus} onChange={(e) => updateItem(idx, 'subcategory_plus', e.target.value)} />
)}
{visibleColumns.gst_plus && (
  <Input placeholder="GST%" className="w-20 h-8 text-xs" value={(item as any).gst_plus} onChange={(e) => updateItem(idx, 'gst_plus', e.target.value)} />
)}
{visibleColumns.cgst && (
  <Input placeholder="CGST" className="w-20 h-8 text-xs" value={(item as any).cgst} onChange={(e) => updateItem(idx, 'cgst', e.target.value)} />
)}
{visibleColumns.sgst && (
  <Input placeholder="SGST" className="w-20 h-8 text-xs" value={(item as any).sgst} onChange={(e) => updateItem(idx, 'sgst', e.target.value)} />
)}
{visibleColumns.igst && (
  <Input placeholder="IGST" className="w-20 h-8 text-xs" value={(item as any).igst} onChange={(e) => updateItem(idx, 'igst', e.target.value)} />
)}
{visibleColumns.s_tax && (
  <Input placeholder="S Tax" className="w-20 h-8 text-xs" value={(item as any).s_tax} onChange={(e) => updateItem(idx, 's_tax', e.target.value)} />
)}
{visibleColumns.p_tax && (
  <Input placeholder="P Tax" className="w-20 h-8 text-xs" value={(item as any).p_tax} onChange={(e) => updateItem(idx, 'p_tax', e.target.value)} />
)}
{customColumns.map(cc => visibleColumns[`custom_${cc.column_name}` as keyof typeof visibleColumns] && (
  <Input
    key={cc.column_name}
    placeholder={cc.column_label}
    className="w-24 h-8 text-xs"
    value={(item as any).custom_attributes?.[cc.column_name] || ''}
    onChange={(e) => {
      const newCustom = { ...(item as any).custom_attributes, [cc.column_name]: e.target.value };
      updateItem(idx, 'custom_attributes', newCustom as any);
    }}
  />
))}
                    <Input placeholder="Remarks" className="w-28 h-8 text-xs" value={(item as any).remarks} onChange={(e) => updateItem(idx, 'remarks', e.target.value)} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Notes (optional)</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <Button className="w-full h-12" onClick={handleSubmit} disabled={saving || !challanNumber || !toParty || items.length === 0}>
            {saving ? 'Recording...' : 'Record & Print'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
export const PickingQueuePage = () => {
  const { currentTenantId, activeBranchId } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickedItems, setPickedItems] = useState<Record<string, Set<string>>>({});
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchOrders = async () => {
    if (!currentTenantId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setLoading(true);
    const { data: ordersData } = await supabase
      .from('orders')
      .select('*')
      .eq('tenant_id', currentTenantId)
      .eq('status', 'New')
      .eq('order_type', 'online')
      .order('created_at', { ascending: true });

    if (!ordersData || ordersData.length === 0) { setOrders([]); setLoading(false); return; }

    const orderIds = ordersData.map((o: any) => o.id);
    const { data: itemsData } = await supabase.from('order_items').select('*').in('order_id', orderIds);

    const productIds = [...new Set((itemsData || []).map((i: any) => i.product_id).filter(Boolean))];
    let productsData: any[] = [];
    if (productIds.length > 0) {
      const { data: pData } = await supabase.from('products').select('id, product_name').in('id', productIds);
      productsData = pData || [];
    }
    setProducts(productsData);

    const merged = ordersData.map((o: any) => ({
      ...o,
      items: (itemsData || []).filter((i: any) => i.order_id === o.id)
    }));
    setOrders(merged);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, [currentTenantId]);

  const getProductName = (productId: string) => {
    const p = products.find((pr: any) => pr.id === productId);
    return p?.product_name || 'Unknown Product';
  };

  const toggleItemPicked = (orderId: string, itemId: string) => {
    setPickedItems(prev => {
      const orderSet = new Set(prev[orderId] || []);
      if (orderSet.has(itemId)) orderSet.delete(itemId);
      else orderSet.add(itemId);
      return { ...prev, [orderId]: orderSet };
    });
  };

  const isOrderFullyPicked = (order: any) => {
    const pickedSet = pickedItems[order.id] || new Set();
    return order.items.length > 0 && order.items.every((it: any) => pickedSet.has(it.id));
  };

  const handleMarkReady = async (orderId: string) => {
    setUpdating(orderId);
    const supabase = getSupabaseClient();
    if (!supabase) { setUpdating(null); return; }
    const { error } = await supabase.from('orders').update({ status: 'Ready to Pack' }).eq('id', orderId);
    setUpdating(null);
    if (error) { toast.error(error.message); return; }
    toast.success('Order marked ready to pack');
    setPickedItems(prev => { const copy = { ...prev }; delete copy[orderId]; return copy; });
    fetchOrders();
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Picking Queue</h2>
        <p className="text-slate-500 dark:text-slate-400">Check off items as you pick them for each new online order.</p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400 text-center py-8">Loading...</p>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-slate-400">
            No new orders to pick right now.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order: any) => {
            const pickedSet = pickedItems[order.id] || new Set();
            const fullyPicked = isOrderFullyPicked(order);
            return (
              <Card key={order.id}>
                <CardContent className="p-5">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100">{order.customer_name || 'Guest'}</p>
                      <p className="text-xs text-slate-500">{order.delivery_address}</p>
                    </div>
                    <span className="text-xs font-bold text-primary">{pickedSet.size}/{order.items.length} picked</span>
                  </div>
                  <div className="space-y-2 mb-4">
                    {order.items.map((item: any) => {
                      const isPicked = pickedSet.has((item as any).id);
                      return (
                        <label key={(item as any).id} className={"flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors " + (isPicked ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-200 dark:border-slate-800')}>
                          <input type="checkbox" checked={isPicked} onChange={() => toggleItemPicked(order.id, (item as any).id)} className="w-5 h-5" />
                          <span className={"flex-1 text-sm " + (isPicked ? 'line-through text-slate-400' : 'text-slate-900 dark:text-slate-100 font-medium')}>{getProductName((item as any).product_id)}</span>
                          <span className="text-sm font-bold text-slate-600 dark:text-slate-400">x{(item as any).quantity}</span>
                        </label>
                      );
                    })}
                  </div>
                  <Button className="w-full h-11" onClick={() => handleMarkReady(order.id)} disabled={!fullyPicked || updating === order.id}>
                    {updating === order.id ? 'Updating...' : fullyPicked ? 'Mark Picked & Ready to Pack' : 'Pick all items first'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};


export const SaleOrderPage = ({ onBack }: { onBack?: () => void } = {}) => {
  const { currentTenantId, user, activeBranchId } = useAuth();
  const [branchId, setBranchId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [saleOrders, setSaleOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [customerId, setCustomerId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [items, setItems] = useState<{ product_id: string; item_name: string; price: number; quantity: string; discount_value: string }[]>([]);
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) { setLoading(false); return; }

    setBranchId(activeBranchId || null);

    const { data: custData } = await supabase.from('retail_customers').select('*').eq('tenant_id', currentTenantId).order('customer_name');
    setCustomers(custData || []);

    const { data: prodData } = await supabase.from('products').select('id, product_name, selling_price').eq('tenant_id', currentTenantId).eq('is_active', true).order('product_name');
    setProducts(prodData || []);

    const { data: soData } = await supabase.from('sale_orders').select('*, sale_order_items(*)').eq('tenant_id', currentTenantId).order('created_at', { ascending: false }).limit(50);
    setSaleOrders(soData || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [currentTenantId]);

  const addProductToItems = (p: any) => {
    setItems(prev => {
      const existing = prev.find(i => i.product_id === p.id);
      if (existing) return prev.map(i => i.product_id === p.id ? { ...i, quantity: (parseFloat(i.quantity) + 1).toString() } : i);
      return [...prev, { product_id: p.id, item_name: p.product_name, price: p.selling_price, quantity: '1', discount_value: '0' }];
    });
    setProductSearch('');
  };

  const updateItem = (productId: string, field: string, value: string) => {
    setItems(prev => prev.map(i => i.product_id === productId ? { ...i, [field]: value } : i));
  };

  const removeItem = (productId: string) => {
    setItems(prev => prev.filter(i => i.product_id !== productId));
  };

  const estimatedTotal = items.reduce((s, i) => s + (i.price * (parseFloat(i.quantity) || 0)) - (parseFloat(i.discount_value) || 0), 0);

  const handleSubmit = async () => {
    if (!customerId || items.length === 0 || !currentTenantId || !branchId || !user) return;
    setSaving(true);
    const supabase = getSupabaseClient();
    if (!supabase) { setSaving(false); return; }

    const selectedCustomer = customers.find((c: any) => c.id === customerId);

    const { error } = await supabase.rpc('create_sale_order', {
      p_tenant_id: currentTenantId,
      p_branch_id: branchId,
      p_created_by: user.id,
      p_customer_id: customerId,
      p_customer_name: selectedCustomer?.customer_name || null,
      p_customer_gstin: selectedCustomer?.gstin || null,
      p_expected_delivery_date: expectedDelivery || null,
      p_notes: notes || null,
      p_items: items.map(i => ({ product_id: i.product_id, quantity: parseFloat(i.quantity) || 1, discount_type: 'fixed', discount_value: parseFloat(i.discount_value) || 0 }))
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Sale order created');
    setItems([]);
    setCustomerId('');
    setExpectedDelivery('');
    setNotes('');
    fetchData();
  };

  const handleConvert = async (saleOrderId: string) => {
    if (!window.confirm('Convert this sale order to a Sales Invoice?')) return;
    setConverting(true);
    const supabase = getSupabaseClient();
    if (!supabase || !user) { setConverting(false); return; }
    const { error } = await supabase.rpc('convert_sale_order_to_invoice', {
      p_sale_order_id: saleOrderId,
      p_created_by: user.id,
      p_payment_method: 'cash'
    });
    setConverting(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Converted to invoice successfully');
    fetchData();
  };

  const filteredProducts = products.filter((p: any) => p.product_name?.toLowerCase().includes(productSearch.toLowerCase()));

  const statusColors: Record<string, string> = {
    confirmed: 'bg-blue-100 text-blue-700',
    fulfilled: 'bg-amber-100 text-amber-700',
    converted: 'bg-purple-100 text-purple-700',
    cancelled: 'bg-red-100 text-red-700'
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      {onBack && (
        <Button variant="ghost" onClick={onBack} className="gap-2">← Back to Documents</Button>
      )}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Sale Order</h2>
        <p className="text-slate-500 dark:text-slate-400">Record confirmed customer orders before final invoicing.</p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Customer *</label>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm">
              <option value="">Select customer</option>
              {customers.map((c: any) => <option key={c.id} value={c.id}>{c.customer_name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Add Products</label>
            <Input placeholder="Search products to add..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
            {productSearch && (
              <div className="mt-2 border border-slate-200 dark:border-slate-800 rounded-lg max-h-48 overflow-y-auto">
                {filteredProducts.length === 0 ? (
                  <p className="text-sm text-slate-400 p-3">No products found.</p>
                ) : filteredProducts.slice(0, 10).map((p: any) => (
                  <button key={p.id} onClick={() => addProductToItems(p)} className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-900 text-sm border-b border-slate-100 dark:border-slate-800 last:border-0 flex justify-between">
                    <span>{p.product_name}</span>
                    <span className="text-primary font-bold">₹{p.selling_price}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="space-y-2">
              {items.map((item) => (
                <div key={(item as any).product_id} className="flex gap-2 items-center border border-slate-100 dark:border-slate-800 rounded-lg p-2">
                  <span className="flex-1 text-sm font-medium">{(item as any).item_name}</span>
                  <Input type="number" placeholder="Qty" className="w-16 h-9" value={(item as any).quantity} onChange={(e) => updateItem((item as any).product_id, 'quantity', e.target.value)} />
                  <Input type="number" placeholder="Disc ₹" className="w-20 h-9" value={(item as any).discount_value} onChange={(e) => updateItem((item as any).product_id, 'discount_value', e.target.value)} />
                  <span className="text-sm font-bold w-20 text-right">₹{(((item as any).price * (parseFloat((item as any).quantity) || 0)) - (parseFloat((item as any).discount_value) || 0)).toFixed(2)}</span>
                  <button onClick={() => removeItem((item as any).product_id)} className="text-red-500"><Trash2 size={14} /></button>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-slate-100">Estimated Subtotal (before GST)</span>
                <span className="font-extrabold text-lg text-primary">₹{estimatedTotal.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Expected Delivery (optional)</label>
              <Input type="date" value={expectedDelivery} onChange={(e) => setExpectedDelivery(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Notes (optional)</label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          <Button className="w-full h-12" onClick={handleSubmit} disabled={saving || !customerId || items.length === 0}>
            {saving ? 'Creating...' : 'Create Sale Order'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4">Recent Sale Orders</h3>
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-6">Loading...</p>
          ) : saleOrders.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No sale orders yet.</p>
          ) : (
            <div className="space-y-3">
              {saleOrders.map((so: any) => (
                <div key={so.id} className="border border-slate-100 dark:border-slate-800 rounded-xl p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100">{so.sale_order_number}</p>
                      <p className="text-xs text-slate-500">{so.customer_name} · {so.order_date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-primary">₹{so.total_amount?.toLocaleString('en-IN')}</p>
                      <span className={"text-[10px] font-bold px-2 py-0.5 rounded-full uppercase " + (statusColors[so.status] || 'bg-slate-100 text-slate-700')}>{so.status}</span>
                    </div>
                  </div>
                  {so.status !== 'converted' && (
                    <Button size="sm" className="mt-3" onClick={() => handleConvert(so.id)} disabled={converting}>
                      {converting ? 'Converting...' : 'Convert to Invoice'}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};


export const ConsumerPosDisplay = () => {
  const [searchParams] = useSearchParams();
  const branchId = searchParams.get('branch_id');
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = async () => {
    if (!branchId) { setLoading(false); return; }
    const supabase = getSupabaseClient();
    if (!supabase) { setLoading(false); return; }
    const { data } = await supabase.from('pos_display_sessions').select('*').eq('branch_id', branchId).maybeSingle();
    setSession(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSession();
    if (!branchId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const channel = supabase
      .channel('pos_display_' + branchId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pos_display_sessions', filter: 'branch_id=eq.' + branchId },
        () => fetchSession()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [branchId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!session || session.status === 'idle') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col items-center justify-center p-8 text-center">
        <img src="/logolight.png" alt="BahiBox" className="h-14 mb-8 object-contain" />
        <h1 className="text-3xl font-bold text-white mb-2">Welcome!</h1>
        <p className="text-slate-400 text-lg">Your bill will appear here</p>
      </div>
    );
  }

  if (session.status === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col items-center justify-center p-8 text-center">
        <img src="/logolight.png" alt="BahiBox" className="h-12 mb-8 object-contain" />
        <p className="text-white/70 text-lg font-semibold mb-1">Amount to Pay</p>
        <p className="text-white text-6xl font-extrabold mb-8">₹{Number(session.amount).toFixed(2)}</p>
        <div className="bg-white p-3 rounded-3xl shadow-2xl">
          <img src={session.qr_image_url} alt="Payment QR" className="w-96 h-auto object-contain" />
        </div>
      </div>
    );
  }

  if (session.status === 'paid') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-emerald-700 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mb-6">
          <span className="text-6xl">✓</span>
        </div>
        <h1 className="text-4xl font-extrabold text-white mb-2">Payment Received!</h1>
        <p className="text-white/90 text-2xl font-bold">₹{Number(session.amount).toFixed(2)}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <p className="text-white">Waiting for next bill...</p>
    </div>
  );
};


export const CreditNotePage = ({ onBack }: { onBack?: () => void } = {}) => {
  const { currentTenantId, user, activeBranchId } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [reason, setReason] = useState('');
  const [taxableValue, setTaxableValue] = useState('');
  const [gstRate, setGstRate] = useState('18');
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) { setLoading(false); return; }

    const { data: invData } = await supabase.from('sales_invoices').select('id, invoice_number, total_amount').eq('tenant_id', currentTenantId).eq('module_code', 'retail').order('created_at', { ascending: false }).limit(100);
    setInvoices(invData || []);

    const { data: noteData } = await supabase.from('sales_credit_debit_notes').select('*, sales_invoices(invoice_number)').eq('tenant_id', currentTenantId).eq('note_type', 'credit_note').order('created_at', { ascending: false }).limit(50);
    setNotes(noteData || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [currentTenantId]);

  const handleSubmit = async () => {
    if (!selectedInvoiceId || !taxableValue || !currentTenantId || !user) return;
    setSaving(true);
    const supabase = getSupabaseClient();
    if (!supabase) { setSaving(false); return; }

    const { error } = await supabase.rpc('create_credit_note', {
      p_tenant_id: currentTenantId,
      p_original_invoice_id: selectedInvoiceId,
      p_reason: reason || null,
      p_taxable_value: parseFloat(taxableValue),
      p_gst_rate_percent: parseFloat(gstRate) || 0,
      p_created_by: user.id
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Credit note created');
    setSelectedInvoiceId(''); setReason(''); setTaxableValue('');
    fetchData();
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      {onBack && (
        <Button variant="ghost" onClick={onBack} className="gap-2">← Back to Documents</Button>
      )}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Credit Note</h2>
        <p className="text-slate-500 dark:text-slate-400">Record a sales return or correction against an invoice, reducing customer's due.</p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Original Invoice *</label>
            <select value={selectedInvoiceId} onChange={(e) => setSelectedInvoiceId(e.target.value)} className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm">
              <option value="">Select invoice</option>
              {invoices.map((inv: any) => <option key={inv.id} value={inv.id}>{inv.invoice_number} — ₹{inv.total_amount}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Taxable Value *</label>
              <Input type="number" value={taxableValue} onChange={(e) => setTaxableValue(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">GST Rate %</label>
              <Input type="number" value={gstRate} onChange={(e) => setGstRate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Reason</label>
            <Input placeholder="e.g. Goods returned, Billing correction" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <Button className="w-full h-12" onClick={handleSubmit} disabled={saving || !selectedInvoiceId || !taxableValue}>
            {saving ? 'Creating...' : 'Create Credit Note'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4">Recent Credit Notes</h3>
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-6">Loading...</p>
          ) : notes.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No credit notes yet.</p>
          ) : (
            <div className="space-y-3">
              {notes.map((n: any) => (
                <div key={n.id} className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 flex justify-between">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{n.note_number}</p>
                    <p className="text-xs text-slate-500">Against: {n.sales_invoices?.invoice_number} · {n.note_date}</p>
                    {n.reason && <p className="text-xs text-slate-400 mt-1">{n.reason}</p>}
                  </div>
                  <p className="font-extrabold text-red-600">₹{n.total_amount?.toLocaleString('en-IN')}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};


export const DebitNotePage = ({ onBack }: { onBack?: () => void } = {}) => {
  const { currentTenantId, user, activeBranchId } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [reason, setReason] = useState('');
  const [taxableValue, setTaxableValue] = useState('');
  const [gstRate, setGstRate] = useState('18');
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) { setLoading(false); return; }

    const { data: invData } = await supabase.from('purchase_invoices').select('id, invoice_number, total_amount').eq('tenant_id', currentTenantId).order('created_at', { ascending: false }).limit(100);
    setInvoices(invData || []);

    const { data: noteData } = await supabase.from('purchase_credit_debit_notes').select('*, purchase_invoices(invoice_number)').eq('tenant_id', currentTenantId).order('created_at', { ascending: false }).limit(50);
    setNotes(noteData || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [currentTenantId]);

  const handleSubmit = async () => {
    if (!selectedInvoiceId || !taxableValue || !currentTenantId || !user) return;
    setSaving(true);
    const supabase = getSupabaseClient();
    if (!supabase) { setSaving(false); return; }

    const { error } = await supabase.rpc('create_debit_note', {
      p_tenant_id: currentTenantId,
      p_original_invoice_id: selectedInvoiceId,
      p_reason: reason || null,
      p_taxable_value: parseFloat(taxableValue),
      p_gst_rate_percent: parseFloat(gstRate) || 0,
      p_created_by: user.id
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Debit note created');
    setSelectedInvoiceId(''); setReason(''); setTaxableValue('');
    fetchData();
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      {onBack && (
        <Button variant="ghost" onClick={onBack} className="gap-2">← Back to Documents</Button>
      )}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Debit Note</h2>
        <p className="text-slate-500 dark:text-slate-400">Record a purchase return against a supplier invoice, reducing your payable.</p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Original Purchase Invoice *</label>
            <select value={selectedInvoiceId} onChange={(e) => setSelectedInvoiceId(e.target.value)} className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm">
              <option value="">Select invoice</option>
              {invoices.map((inv: any) => <option key={inv.id} value={inv.id}>{inv.invoice_number} — ₹{inv.total_amount}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Taxable Value *</label>
              <Input type="number" value={taxableValue} onChange={(e) => setTaxableValue(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">GST Rate %</label>
              <Input type="number" value={gstRate} onChange={(e) => setGstRate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Reason</label>
            <Input placeholder="e.g. Goods returned to supplier, Billing correction" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <Button className="w-full h-12" onClick={handleSubmit} disabled={saving || !selectedInvoiceId || !taxableValue}>
            {saving ? 'Creating...' : 'Create Debit Note'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4">Recent Debit Notes</h3>
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-6">Loading...</p>
          ) : notes.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No debit notes yet.</p>
          ) : (
            <div className="space-y-3">
              {notes.map((n: any) => (
                <div key={n.id} className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 flex justify-between">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{n.note_number}</p>
                    <p className="text-xs text-slate-500">Against: {n.purchase_invoices?.invoice_number} · {n.note_date}</p>
                    {n.reason && <p className="text-xs text-slate-400 mt-1">{n.reason}</p>}
                  </div>
                  <p className="font-extrabold text-emerald-600">₹{n.total_amount?.toLocaleString('en-IN')}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
