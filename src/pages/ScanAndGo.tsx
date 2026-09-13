import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Search, ShoppingBag, Plus, Minus, CheckCircle2 } from 'lucide-react';
import { getSupabaseClient } from '../lib/supabase';
import { toast } from 'sonner';

interface Product {
  id: string;
  product_name: string;
  barcode: string;
  selling_price: number;
}

export default function ScanAndGo() {
  const [searchParams] = useSearchParams();
  const tenantId = searchParams.get('tenant_id');
  const branchId = searchParams.get('branch_id');

  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<any>(null);

  useEffect(() => {
    let interval: any;
    if (isPolling && pendingOrder?.sales_invoice_id) {
      interval = setInterval(async () => {
        const supabase = getSupabaseClient();
        if (!supabase) return;
        const { data } = await supabase
          .from('sales_invoices')
          .select('status')
          .eq('id', pendingOrder.sales_invoice_id)
          .single();
          
        if (data && data.status === 'paid') {
          setIsPolling(false);
          setLoading(false);
          setSuccess(true);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isPolling, pendingOrder]);

  useEffect(() => {
    if (!tenantId) return;
    const fetchProducts = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data } = await supabase.from('products').select('*').eq('tenant_id', tenantId);
      if (data) setProducts(data);
    };
    fetchProducts();
  }, [tenantId]);

  if (!tenantId) {
    return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Store link is invalid. Missing tenant_id.</div>;
  }

  if (isPolling) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center border-none shadow-xl">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Processing Payment...</h2>
          <p className="text-slate-500 dark:text-slate-400">Please wait while we confirm your order.</p>
        </Card>
      </div>
    );
  }

  if (success) {
    const paidTotal = cart.reduce((sum, item) => sum + (item.selling_price * item.quantity), 0);
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center border-none shadow-xl">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Payment Successful!</h2>
          
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 my-6 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Invoice Number:</span>
              <span className="font-semibold">{pendingOrder?.invoice_number || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Total Items:</span>
              <span className="font-semibold">{cart.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Amount Paid:</span>
              <span className="font-semibold">₹{paidTotal.toFixed(2)}</span>
            </div>
          </div>
          
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-8">Receipt sent to your phone</p>
          <Button className="w-full h-12 text-lg" onClick={() => { setSuccess(false); setCart([]); setPendingOrder(null); }}>Start New Order</Button>
        </Card>
      </div>
    );
  }

  const addToCart = (product: Product) => {
    setPendingOrder(null); // Reset pending order if cart is modified
    setCart(prev => {
      const existing = prev.find(p => p.product_id === product.id);
      if (existing) {
        return prev.map(p => p.product_id === product.id ? { ...p, quantity: p.quantity + 1 } : p);
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

  const filteredProducts = products.filter(p => 
    p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.barcode && p.barcode.includes(searchTerm))
  );

  const total = cart.reduce((sum, item) => sum + (item.selling_price * item.quantity), 0);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCheckout = async () => {
    if (!tenantId || cart.length === 0) return;
    setLoading(true);
    
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Database connection not found");

      let orderData = pendingOrder;

      // 1. Create Scan and Go Order (only if not already created)
      if (!orderData) {
        const { data, error: orderError } = await supabase.rpc('create_scan_and_go_order', {
          p_tenant_id: tenantId,
          p_branch_id: branchId || null,
          p_consumer_id: null,
          p_seller_state_code: '27',
          p_buyer_state_code: '27',
          p_items: cart
        });

        if (orderError) throw orderError;
        orderData = data;
        setPendingOrder(data);
      }

      // 2. Load Razorpay Script
      const res = await loadRazorpayScript();
      if (!res) {
        throw new Error('Razorpay SDK failed to load. Are you online?');
      }

      // Simulate getting Razorpay order ID since edge function might not be deployed locally
      // In production, we would call the edge function here
      // const { data: rzpData } = await supabase.functions.invoke('create_razorpay_order', { body: { payment_order_id: orderData.payment_order_id } });
      const mockRazorpayOrderId = 'order_' + Math.random().toString(36).substring(7);

      const options = {
        key: 'rzp_test_mock_key', // Replace with real key or fetch from tenant settings
        amount: Math.round(orderData.amount * 100),
        currency: 'INR',
        name: 'BahiBox Scan & Go',
        description: `Order ${orderData.invoice_number}`,
        order_id: mockRazorpayOrderId,
        handler: async function (response: any) {
          toast.success("Payment authorized, finalizing order...");
          setIsPolling(true);
          
          // Call the edge function or simulate the webhook
          // Since this is client-side testing, simulate the webhook capturing the payment
          try {
            await supabase.rpc('sync_invoice_on_payment_capture', {
              p_payment_order_id: orderData.payment_order_id
            });
          } catch (e) {
            console.error("Sync error:", e);
          }
        },
        prefill: {
          name: 'Walk-in Customer',
          email: '',
          contact: ''
        },
        theme: {
          color: '#0f172a'
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
            toast.error("Payment cancelled. You can retry.");
          }
        }
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();

    } catch (err: any) {
      toast.error(err.message || 'Failed to initialize checkout');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col max-w-md mx-auto relative shadow-xl">
      <header className="bg-white dark:bg-slate-950 p-4 border-b sticky top-0 z-10">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 text-center">Scan & Go Storefront</h1>
      </header>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto pb-32">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search or scan barcode..." 
            className="pl-9 bg-white dark:bg-slate-950"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {filteredProducts.map(p => (
            <Card key={p.id} className="cursor-pointer hover:border-primary border-none shadow-sm" onClick={() => addToCart(p)}>
              <CardContent className="p-4 text-center space-y-2">
                <p className="font-medium text-sm line-clamp-2 h-10">{p.product_name}</p>
                <p className="text-primary font-bold">₹{p.selling_price}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-0 w-full max-w-md bg-white dark:bg-slate-950 border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-4 space-y-4 z-20">
          <div className="flex justify-between items-center font-bold text-lg">
            <span>{cart.length} Items</span>
            <span>₹{total.toFixed(2)}</span>
          </div>
          <Button className="w-full bg-slate-900 hover:bg-slate-800 h-12 text-lg" onClick={handleCheckout} disabled={loading}>
            {loading ? 'Processing...' : `Pay ₹${total.toFixed(2)}`}
          </Button>
        </div>
      )}
    </div>
  );
}
