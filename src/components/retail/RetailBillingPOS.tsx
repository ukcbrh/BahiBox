import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Search, Plus, Minus, Trash2, Printer, CheckCircle2, PauseCircle, Phone } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import { getSupabaseClient } from '../../lib/supabase';
import { toast } from 'sonner';

interface Product {
  id: string;
  product_name: string;
  barcode: string;
  selling_price: number;
  hsn_sac_id?: string;
  unit_id?: string;
}

interface CartItem {
  product_id: string;
  product_name: string;
  quantity: number;
  selling_price: number;
  discount_type: 'percent' | 'fixed' | 'none';
  discount_value: number;
}

export function RetailBillingPOS() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash'|'razorpay'|'wallet'>('cash');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tenant) return;
    const fetchProducts = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data } = await supabase.from('products').select('*').eq('tenant_id', tenant.id).eq('is_active', true);
      if (data) setProducts(data);
    };
    fetchProducts();
  }, [tenant]);

  const addToCart = (product: Product) => {
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

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(p => {
      if (p.product_id === productId) {
        const newQ = p.quantity + delta;
        return newQ > 0 ? { ...p, quantity: newQ } : p;
      }
      return p;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(p => p.product_id !== productId));
  };

  const filteredProducts = products.filter(p => 
    p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.barcode && p.barcode.includes(searchTerm))
  );

  const subtotal = cart.reduce((sum, item) => sum + (item.selling_price * item.quantity), 0);
  const totalDiscount = cart.reduce((sum, item) => {
    if (item.discount_type === 'percent') return sum + (item.selling_price * item.quantity * item.discount_value / 100);
    if (item.discount_type === 'fixed') return sum + item.discount_value;
    return sum;
  }, 0);
  const taxable = subtotal - totalDiscount;
  // Assume generic 18% GST for display if not fetching exact splits
  const estimatedGst = taxable * 0.18;
  const grandTotal = taxable + estimatedGst;

  const handleCharge = async () => {
    if (cart.length === 0) return toast.error("Cart is empty");
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase || !tenant || !user) { setLoading(false); return; }

    try {
      // Find default branch
      const { data: branches } = await supabase.from('branches').select('id').eq('tenant_id', tenant.id).limit(1);
      const branchId = branches?.[0]?.id;
      if (!branchId) throw new Error("No branch found for tenant");

      // For POC, using direct insert or calling RPC
      const { data: invoiceId, error } = await supabase.rpc('create_pos_sale', {
        p_tenant_id: tenant.id,
        p_branch_id: branchId,
        p_cashier_id: user.id,
        p_customer_id: null,
        p_seller_state_code: '27', // Maharashtra dummy
        p_buyer_state_code: '27',
        p_items: cart,
        p_payment_method: paymentMethod,
        p_pos_shift_id: null
      });

      if (error) throw error;
      toast.success("Sale completed successfully!");
      setCart([]);
    } catch (e: any) {
      toast.error(e.message || "Failed to complete sale");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6">
      {/* Left side: Products */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search by product name or scan barcode..." 
            className="pl-9 h-12 bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex-1 overflow-y-auto pr-2">
          <div className="grid grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(p => (
              <Card key={p.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => addToCart(p)}>
                <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2 h-32">
                  <span className="font-medium line-clamp-2">{p.product_name}</span>
                  <span className="text-primary font-bold">₹{p.selling_price}</span>
                </CardContent>
              </Card>
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-500">No products found</div>
            )}
          </div>
        </div>
      </div>

      {/* Right side: Cart */}
      <Card className="w-96 flex flex-col shadow-sm border-none bg-white overflow-hidden">
        <CardHeader className="bg-slate-50 border-b py-4">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Current Sale</span>
            <span className="bg-primary/10 text-primary text-sm px-2 py-1 rounded-full">{cart.length} items</span>
          </CardTitle>
        </CardHeader>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
              <Search className="h-8 w-8 opacity-20" />
              <p>Scan or select items</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product_id} className="flex flex-col gap-2 p-3 border rounded-xl bg-slate-50">
                <div className="flex justify-between items-start">
                  <span className="font-medium text-slate-900">{item.product_name}</span>
                  <span className="font-medium text-slate-900">₹{(item.selling_price * item.quantity).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 bg-white border rounded-lg overflow-hidden">
                    <button onClick={() => updateQuantity(item.product_id, -1)} className="px-3 py-1 hover:bg-slate-100"><Minus size={14}/></button>
                    <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product_id, 1)} className="px-3 py-1 hover:bg-slate-100"><Plus size={14}/></button>
                  </div>
                  <button onClick={() => removeFromCart(item.product_id)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals & Actions */}
        <div className="border-t bg-white p-4 space-y-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-₹{totalDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-500">
              <span>Estimated GST (18%)</span>
              <span>₹{estimatedGst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-xl text-slate-900 pt-2 border-t">
              <span>Grand Total</span>
              <span>₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(['cash', 'razorpay', 'wallet'] as const).map(method => (
              <Button 
                key={method} 
                variant={paymentMethod === method ? 'default' : 'outline'}
                onClick={() => setPaymentMethod(method)}
                className={`capitalize ${paymentMethod === method ? 'bg-primary' : ''}`}
              >
                {method}
              </Button>
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setCart([])}>
              <PauseCircle className="h-4 w-4 mr-2" /> Hold
            </Button>
            <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleCharge} disabled={loading || cart.length === 0}>
              <CheckCircle2 className="h-4 w-4 mr-2" /> Charge
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
