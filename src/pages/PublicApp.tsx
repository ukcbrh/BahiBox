import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ShoppingBag, Wallet, User as UserIcon, Search, Stethoscope, GraduationCap, Truck, ArrowLeft, Store, Package, Clock } from 'lucide-react';
import { Card, CardContent } from '@/src/components/ui/card';
import { Input } from '@/src/components/ui/input';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { Button } from '@/src/components/ui/button';
import { Product } from '@/src/types';
import { getSupabaseClient } from '../lib/supabase';

export default function PublicApp() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('home');
  const [products, setProducts] = useState<Product[]>([]);
  const { user } = useAuth();
  const { tenant, resetTenant } = useTenant();
  
  const userName = user?.displayName || 'Rahul Kumar';
  const userInitials = userName.split(' ').map(n => n[0]).join('').substring(0, 2);

  useEffect(() => {
    let isMounted = true;
    const fetchProducts = async () => {
      if (tenant?.merchant_id) {
        try {
          const supabase = getSupabaseClient();
          if (!supabase) return;
          const { data } = await supabase.from('products').select('*').eq('merchant_id', tenant.merchant_id);
          if (data && isMounted) {
            setProducts(data);
          }
        } catch (err) {
          console.warn("Failed to fetch products:", err);
        }
      } else {
        if (isMounted) setProducts([]);
      }
    };
    fetchProducts();
    return () => { isMounted = false; };
  }, [tenant]);

  return (
    <div className="min-h-screen bg-slate-900 flex justify-center items-center p-4">
      {/* Mobile Simulator Container */}
      <div className="w-full max-w-[400px] h-[800px] bg-slate-50 font-sans text-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative border-8 border-slate-800">
        
        {/* Header */}
        <header className="bg-primary text-white px-6 py-6 rounded-b-3xl shadow-sm z-10" style={tenant ? { backgroundColor: tenant.primary_color } : {}}>
          <div className="flex justify-between items-center mb-6 mt-4">
            <div>
              {tenant ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden">
                    <img src={tenant.logo_url} alt="Logo" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold">{tenant.brand_name}</h1>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-primary-foreground/80 text-sm">Hello,</p>
                  <h1 className="text-xl font-bold">{userName}</h1>
                </>
              )}
            </div>
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center cursor-pointer" onClick={() => navigate('/')}>
              <span className="font-bold">{userInitials}</span>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
            <Input 
              placeholder={tenant ? `Search in ${tenant.brand_name}...` : "Search groceries, doctors, cabs..."} 
              className="pl-10 bg-white text-slate-900 border-0 h-10 rounded-xl"
            />
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-auto pb-24 pt-4 px-4 space-y-6">
          
          {activeTab === 'home' && (
            tenant ? (
              // MODE A: TENANT SPECIFIC
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 mb-4 px-2">Featured Products</h2>
                  {products.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {products.map(product => (
                        <Card key={product.id} className="border-0 shadow-sm overflow-hidden rounded-2xl flex flex-col h-full">
                          <div className="h-28 bg-slate-100 flex items-center justify-center">
                            <Package size={24} className="text-slate-400" />
                          </div>
                          <CardContent className="p-3 flex flex-col flex-1">
                            <h3 className="font-semibold text-sm line-clamp-2 leading-tight flex-1">{product.name}</h3>
                            <div className="mt-2 flex items-center justify-between">
                               <p className="font-bold text-sm" style={{ color: tenant.primary_color }}>₹{product.price}</p>
                               <span className="text-[10px] text-slate-400">{product.unit}</span>
                            </div>
                            <Button className="w-full mt-2 h-8 text-xs font-bold rounded-lg transition-transform active:scale-95" style={{ backgroundColor: tenant.primary_color }}>Add</Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-white rounded-2xl border border-slate-200 border-dashed">
                      <Store className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 font-medium">No products found for this merchant.</p>
                    </div>
                  )}
                </div>
                
                <div className="mt-8 pt-6 border-t border-slate-200">
                  <Button 
                    onClick={resetTenant}
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2 border-2 text-slate-700 rounded-xl h-12"
                  >
                    <ArrowLeft size={16} /> Explore BahiBox Ecosystem
                  </Button>
                </div>
              </div>
            ) : (
              // MODE B: BAHIBOX SUPER APP
              <>
                {/* Services Grid */}
                <div>
                  <h2 className="text-lg font-bold text-slate-900 mb-4 px-2">BahiBox Services</h2>
                  <div className="grid grid-cols-4 gap-y-4 gap-x-2">
                    <ServiceIcon icon={ShoppingBag} label="Grocery" color="bg-blue-100 text-blue-600" />
                    <ServiceIcon icon={Stethoscope} label="Doctors" color="bg-emerald-100 text-emerald-600" />
                    <ServiceIcon icon={GraduationCap} label="School" color="bg-orange-100 text-orange-600" />
                    <ServiceIcon icon={Truck} label="Transport" color="bg-yellow-100 text-yellow-600" />
                    <ServiceIcon icon={Store} label="Services" color="bg-purple-100 text-purple-600" />
                    <ServiceIcon icon={Store} label="Kisan" color="bg-green-100 text-green-600" />
                    <ServiceIcon icon={Store} label="Jobs" color="bg-indigo-100 text-indigo-600" />
                    <ServiceIcon icon={Store} label="Move" color="bg-red-100 text-red-600" />
                  </div>
                </div>

                {/* Featured Deals / Merchants */}
                <div>
                  <h2 className="text-lg font-bold text-slate-900 mb-4 px-2">Local Shops (Retail POS)</h2>
                  <Card 
                    className="mb-3 border-0 shadow-sm overflow-hidden rounded-2xl cursor-pointer"
                    onClick={() => {
                      // Simulate opening a tenant
                      navigate('/public?tenant=sharmamart.com');
                      window.location.reload(); // Quick hack to trigger the effect in this demo context
                    }}
                  >
                    <div className="h-24 bg-blue-500 p-4 flex items-end">
                      <h3 className="text-white font-bold text-lg">Sharma General Store</h3>
                    </div>
                    <CardContent className="p-4">
                      <p className="text-sm text-slate-500 mb-2">Groceries, Daily Needs • 1.2km</p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Open Now</span>
                        <span className="text-sm font-semibold text-primary">Order &rarr;</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Job Portal Access */}
                <Card className="bg-gradient-to-r from-primary to-blue-600 border-0 rounded-2xl text-white cursor-pointer hover:opacity-90 transition-opacity">
                  <CardContent className="p-5 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold mb-1">Local Job Portal</h3>
                      <p className="text-xs text-white/80">Upload CV & apply to merchants directly.</p>
                    </div>
                    <div className="bg-white/20 p-2 rounded-xl">
                      <UserIcon size={24} />
                    </div>
                  </CardContent>
                </Card>
              </>
            )
          )}
          
          {activeTab === 'orders' && <OrderHistoryView userName={userName} tenant={tenant} />}

        </main>

        {/* Bottom Nav Bar */}
        <nav className="absolute bottom-0 w-full bg-white border-t border-slate-100 px-6 py-4 flex justify-between items-center rounded-b-[2rem]">
          <NavItem icon={Home} label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} tenantColor={tenant?.primary_color} />
          <NavItem icon={ShoppingBag} label="Orders" active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} tenantColor={tenant?.primary_color} />
          <NavItem icon={Wallet} label="Wallet" active={activeTab === 'wallet'} onClick={() => setActiveTab('wallet')} tenantColor={tenant?.primary_color} />
          <NavItem icon={UserIcon} label="Profile" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} tenantColor={tenant?.primary_color} />
        </nav>
      </div>
    </div>
  );
}

function ServiceIcon({ icon: Icon, label, color }: { icon: any, label: string, color: string }) {
  return (
    <div className="flex flex-col items-center gap-2 cursor-pointer hover:scale-105 transition-transform">
      <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center`}>
        <Icon size={24} />
      </div>
      <span className="text-xs font-medium text-slate-700 text-center">{label}</span>
    </div>
  );
}

function NavItem({ icon: Icon, label, active, onClick, tenantColor }: { icon: any, label: string, active: boolean, onClick: () => void, tenantColor?: string }) {
  return (
    <div onClick={onClick} className="flex flex-col items-center gap-1 cursor-pointer">
      <Icon size={24} className={active ? '' : 'text-slate-400'} style={active ? { color: tenantColor || 'var(--primary)' } : {}} />
      <span className={`text-[10px] font-medium ${active ? '' : 'text-slate-400'}`} style={active ? { color: tenantColor || 'var(--primary)' } : {}}>{label}</span>
    </div>
  );
}

function OrderHistoryView({ userName, tenant }: { userName: string, tenant: any }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchOrders = async () => {
      try {
        const supabase = getSupabaseClient();
        if (!supabase) return;
        
        // Fetch orders where customer_name matches current user
        let query = supabase.from('orders').select('*, order_items(*, products(name))').eq('customer_name', userName).order('created_at', { ascending: false });
        
        // If in tenant mode, only show orders for this tenant
        if (tenant?.merchant_id) {
          query = query.eq('merchant_id', tenant.merchant_id);
        }

        const { data, error } = await query;
        
        if (error) {
          console.warn("Could not fetch order history (table may not exist):", error);
          if (isMounted) setOrders([]);
          return;
        }
        
        if (isMounted && data) {
          setOrders(data);
        }
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
        <div className="w-8 h-8 border-4 border-slate-300 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900 px-2">Order History</h2>
      
      {orders.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-2xl border border-slate-200 border-dashed">
          <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No past orders found.</p>
          <p className="text-xs text-slate-400 mt-1">When you place an order, it will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <Card key={order.id} className="border-0 shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-xs font-semibold px-2 py-1 rounded bg-slate-100 text-slate-600 mb-2 inline-block">
                      Order #{order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <div className="flex items-center gap-1 text-slate-500 text-xs">
                      <Clock size={12} />
                      <span>{new Date(order.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">₹{order.total_amount}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${order.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {order.order_items && order.order_items.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <div className="flex gap-2">
                        <span className="text-slate-500">{item.quantity}x</span>
                        <span className="font-medium text-slate-700">{item.products?.name || 'Unknown Product'}</span>
                      </div>
                      <span className="text-slate-600">₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                  
                  {(!order.order_items || order.order_items.length === 0) && (
                    <p className="text-xs text-slate-400 italic">No items details available.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
