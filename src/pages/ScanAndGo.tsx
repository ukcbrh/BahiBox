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

  useEffect(() => {
    if (!tenantId) return;
    const fetchProducts = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data } = await supabase.from('products').select('*').eq('tenant_id', tenantId).eq('is_active', true);
      if (data) setProducts(data);
    };
    fetchProducts();
  }, [tenantId]);

  if (!tenantId) {
    return <div className="p-8 text-center text-slate-500">Store link is invalid. Missing tenant_id.</div>;
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center border-none shadow-xl">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Payment Successful!</h2>
          <p className="text-slate-500 mb-8">Thank you for shopping. Your digital receipt has been sent.</p>
          <Button className="w-full" onClick={() => { setSuccess(false); setCart([]); }}>Start New Order</Button>
        </Card>
      </div>
    );
  }

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

  const filteredProducts = products.filter(p => 
    p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.barcode && p.barcode.includes(searchTerm))
  );

  const total = cart.reduce((sum, item) => sum + (item.selling_price * item.quantity), 0);

  const handleCheckout = async () => {
    setLoading(true);
    // In a real app, this would open Razorpay Checkout
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-md mx-auto relative shadow-xl">
      <header className="bg-white p-4 border-b sticky top-0 z-10">
        <h1 className="text-xl font-bold text-slate-900 text-center">Scan & Go Storefront</h1>
      </header>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto pb-32">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search or scan barcode..." 
            className="pl-9 bg-white"
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
        <div className="fixed bottom-0 w-full max-w-md bg-white border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-4 space-y-4 z-20">
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
