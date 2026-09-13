import React, { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/src/lib/supabase';
import { ShoppingBag, Clock } from 'lucide-react';
import { Card, CardContent } from '@/src/components/ui/card';
import { LiveTrackingMap } from './LiveTrackingMap';

export function OrderHistoryView({ userName, tenant }: { userName?: string, tenant?: any } = {}) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchOrders = async () => {
      try {
        const supabase = getSupabaseClient();
        if (!supabase) return;
        
        const { data: session } = await supabase.auth.getSession();
        const userId = session?.session?.user?.id;
        
        if (!userId) {
          if (isMounted) setOrders([]);
          return;
        }
        
        let query = supabase.from('orders').select('*').eq('user_id', userId).order('created_at', { ascending: false });
        
        const { data: ordersData, error } = await query;
        if (error || !ordersData) {
          if (isMounted) setOrders([]);
          return;
        }
        
        if (ordersData.length === 0) {
          if (isMounted) setOrders([]);
          return;
        }
        
        const orderIds = ordersData.map((o: any) => o.id);
        const { data: itemsData } = await supabase.from('order_items').select('*').in('order_id', orderIds);
        
        let productsData: any[] = [];
        if (itemsData && itemsData.length > 0) {
            const productIds = [...new Set(itemsData.map((i: any) => i.product_id))];
            const { data: pData } = await supabase.from('products').select('id, product_name').in('id', productIds);
            productsData = pData || [];
        }
        
        const pMap = new globalThis.Map(productsData.map(p => [p.id, p.product_name]));
        
        const { data: daData } = await supabase
          .from('delivery_assignments')
          .select('*, service_providers(id, full_name, current_lat, current_lng)')
          .in('order_id', orderIds);
          
        const mergedOrders = ordersData.map((o: any) => {
           const oItems = itemsData ? itemsData.filter((i: any) => i.order_id === o.id) : [];
           return {
              ...o,
              total_amount: o.total,
              delivery_assignment: daData ? daData.find((d: any) => d.order_id === o.id) : null,
              order_items: oItems.map((i: any) => ({
                 ...i,
                 products: { name: pMap.get(i.product_id) || 'Unknown Product' }
              }))
           };
        });
        
        if (isMounted) setOrders(mergedOrders);
      } catch (err) {
        console.warn("Failed to fetch order history:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchOrders();
    return () => { isMounted = false; };
  }, [userName, tenant]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="w-8 h-8 border-4 border-slate-300 dark:border-slate-700 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }
  
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'New': return 'Placed';
      case 'Ready to Pack': return 'Packed';
      case 'Dispatch': return 'Dispatched';
      case 'Completed': return 'Delivered';
      default: return status;
    }
  };

  const getStatusStep = (status: string) => {
    switch (status) {
      case 'New': return 1;
      case 'Ready to Pack': return 2;
      case 'Dispatch': return 3;
      case 'Completed': return 4;
      default: return 0;
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 px-2">Order History</h2>
      
      {orders.length === 0 ? (
        <div className="text-center py-10 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed">
          <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">No past orders found.</p>
          <p className="text-xs text-slate-400 mt-1">When you place an order, it will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => {
            const step = getStatusStep(order.status);
            return (
            <Card key={order.id} className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold px-2 py-1 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 mb-2 inline-block">
                      Order #{order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs font-medium">
                      <Clock size={12} />
                      <span>{new Date(order.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-slate-900 dark:text-slate-100 text-lg">₹{order.total_amount}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${step >= 4 ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full z-0"></div>
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-emerald-500 rounded-full z-0 transition-all duration-500" style={{ width: `${(Math.max(1, step) - 1) * 33.33}%` }}></div>
                    
                    <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${step >= 1 ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>1</div>
                    <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${step >= 2 ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>2</div>
                    <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${step >= 3 ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>3</div>
                    <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${step >= 4 ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>4</div>
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    <span className={step >= 1 ? 'text-emerald-700' : ''}>Placed</span>
                    <span className={step >= 2 ? 'text-emerald-700' : ''}>Packed</span>
                    <span className={step >= 3 ? 'text-emerald-700' : ''}>Shipped</span>
                    <span className={step >= 4 ? 'text-emerald-700' : ''}>Delivered</span>
                  </div>
                </div>
                
                {order.status === 'Dispatch' && order.delivery_assignment?.service_provider_id && ['assigned', 'picked_up'].includes(order.delivery_assignment.status) && (
                  <LiveTrackingMap deliveryAssignment={order.delivery_assignment} destinationAddress={order.delivery_address} />
                )}
                {order.delivery_assignment?.status === 'picked_up' && order.delivery_assignment?.delivery_otp && (
                  <div className="mx-4 mt-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Share this code with your rider on delivery</span>
                    <span className="text-2xl font-extrabold text-amber-800 dark:text-amber-300 tracking-widest">{order.delivery_assignment.delivery_otp}</span>
                  </div>
                )}

                <div className="p-4 space-y-3 bg-white dark:bg-slate-950">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">Items</p>
                  {order.order_items && order.order_items.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm items-center">
                      <div className="flex gap-3 items-center">
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded font-bold text-xs">{item.quantity}x</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{item.products?.name || 'Unknown Product'}</span>
                      </div>
                      <span className="text-slate-600 dark:text-slate-400 font-medium">₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                  
                  {(!order.order_items || order.order_items.length === 0) && (
                    <p className="text-xs text-slate-400 italic">No items details available.</p>
                  )}
                  
                  {order.delivery_address && (
                     <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">Delivery To</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{order.delivery_address}</p>
                     </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )})}
        </div>
      )}
    </div>
  );
}
