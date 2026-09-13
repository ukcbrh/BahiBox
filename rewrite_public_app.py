import re

with open("src/pages/PublicApp.tsx", "r") as f:
    text = f.read()

# 1. Add ShoppingCart import
text = text.replace("ShoppingBag, Wallet,", "ShoppingBag, Wallet, ShoppingCart,")

# 2. Add cart state
old_state = "const [products, setProducts] = useState<Product[]>([]);"
new_state = "const [products, setProducts] = useState<Product[]>([]);\n  const [cart, setCart] = useState<{product: Product, quantity: number}[]>([]);"
text = text.replace(old_state, new_state)

# 3. Update fetchProducts
old_fetch = """    const fetchProducts = async () => {
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
    fetchProducts();"""
new_fetch = """    const fetchTenantData = async () => {
      if (tenant?.merchant_id) {
        try {
          const supabase = getSupabaseClient();
          if (!supabase) return;
          
          const { data: roles } = await supabase
            .from('user_tenant_roles')
            .select('tenant_id')
            .eq('user_id', tenant.merchant_id)
            .limit(1);
            
          const tId = roles?.[0]?.tenant_id || tenant.merchant_id;
          
          const { data } = await supabase.from('products').select('*').eq('tenant_id', tId);
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
    fetchTenantData();"""
text = text.replace(old_fetch, new_fetch)

# 4. Add addToCart function
add_to_cart_fn = """  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate auth success
    alert('Signed up successfully!');
    setShowAuthGuard(false);
  };
  
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleCheckout = async () => {
    if (!handleGuardedAction()) return;
    if (cart.length === 0) return;
    
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      
      const total = cart.reduce((sum, item) => sum + ((item.product.selling_price || 0) * item.quantity), 0);
      
      const { data: order, error: orderError } = await supabase.from('orders').insert({
        merchant_id: tenant?.merchant_id,
        customer_name: userName,
        total: total,
        status: 'completed'
      }).select().single();
      
      if (orderError || !order) throw orderError || new Error("Failed to create order");
      
      const orderItems = cart.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price: item.product.selling_price || 0
      }));
      
      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;
      
      setCart([]);
      setActiveTab('orders');
    } catch (err) {
      console.error("Checkout failed:", err);
      alert("Checkout failed. Please try again.");
    }
  };"""
text = text.replace("""  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate auth success
    alert('Signed up successfully!');
    setShowAuthGuard(false);
  };""", add_to_cart_fn)

# 5. Update Add to Cart Button
old_btn = """                              onClick={() => {
                                if (handleGuardedAction()) {
                                  alert('Added to cart!');
                                }
                              }}"""
new_btn = """                              onClick={() => addToCart(product)}"""
text = text.replace(old_btn, new_btn)

# 6. Replace Wallet tab with Cart tab in Nav
old_nav = """<NavItem icon={Wallet} label="Wallet" active={activeTab === 'wallet'} onClick={() => { if (handleGuardedAction()) setActiveTab('wallet'); }} tenantColor={tenant?.primary_color} />"""
new_nav = """<NavItem icon={ShoppingCart} label="Cart" active={activeTab === 'cart'} onClick={() => setActiveTab('cart')} tenantColor={tenant?.primary_color} />"""
text = text.replace(old_nav, new_nav)

# 7. Render Cart View
old_orders_view = "{activeTab === 'orders' && <OrderHistoryView userName={userName} tenant={tenant} />}"
cart_view = """{activeTab === 'orders' && <OrderHistoryView userName={userName} tenant={tenant} />}
          {activeTab === 'cart' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-slate-900">Your Cart</h2>
              {cart.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-2xl border border-slate-200 border-dashed">
                  <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">Your cart is empty.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item, index) => (
                    <div key={index} className="bg-white p-4 rounded-xl border flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900">{item.product.product_name}</p>
                        <p className="text-sm text-slate-500">₹{item.product.selling_price} x {item.quantity}</p>
                      </div>
                      <div className="font-bold">
                        ₹{(item.product.selling_price || 0) * item.quantity}
                      </div>
                    </div>
                  ))}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center font-bold text-lg">
                    <span>Total</span>
                    <span>₹{cart.reduce((sum, item) => sum + ((item.product.selling_price || 0) * item.quantity), 0)}</span>
                  </div>
                  <Button 
                    onClick={handleCheckout}
                    className="w-full h-12 text-lg font-bold rounded-xl"
                    style={{ backgroundColor: tenant?.primary_color || '#0f172a' }}
                  >
                    Checkout Now
                  </Button>
                </div>
              )}
            </div>
          )}"""
text = text.replace(old_orders_view, cart_view)

# Fix product.name to product.product_name in Orders component as well if needed?
# Wait, product_name is the field in products table. Let's make sure.
# In original PublicApp: <h3 className="font-bold text-sm text-slate-900 line-clamp-1">{product.name || 'Unnamed Product'}</h3>
# Let's fix that.
text = text.replace("product.name || 'Unnamed Product'", "product.product_name || product.name || 'Unnamed Product'")

with open("src/pages/PublicApp.tsx", "w") as f:
    f.write(text)

print("patched public app")
