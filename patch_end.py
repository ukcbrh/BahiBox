with open("src/components/hospitality/HospitalityComponents.tsx", "r") as f:
    content = f.read()

target = """                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => { setIsAddingItem(false); setEditingItem(null); }}>Cancel</Button>
                  <Button type="submit">{editingItem ? 'Save' : 'Add Item'}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};"""

replacement = """                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => { setIsAddingItem(false); setEditingItem(null); }}>Cancel</Button>
                  <Button type="submit">{editingItem ? 'Save' : 'Add Item'}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

// 13. Public Table-Order Page (QR Dining)
export const HospitalityTableOrder = () => {
  const [searchParams] = useSearchParams();
  const tenantId = searchParams.get('tenant_id');
  const tableId = searchParams.get('table_id');
  const { user } = useAuth();

  const [table, setTable] = useState<any>(null);
  const [businessName, setBusinessName] = useState('');
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [menuCategories, setMenuCategories] = useState<any[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [cart, setCart] = useState<{ menu_item_id: string; item_name: string; price: number; quantity: number }[]>([]);
  const [numGuests, setNumGuests] = useState(1);
  const [step, setStep] = useState<'guests' | 'menu' | 'success'>('guests');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'wallet'>('cod');
  const [placing, setPlacing] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    if (!tenantId || !tableId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const fetchAll = async () => {
      const { data: tableData } = await supabase.from('restaurant_tables').select('*').eq('id', tableId).single();
      if (tableData) setTable(tableData);

      const { data: tenantData } = await supabase.from('tenants').select('business_name').eq('id', tenantId).single();
      if (tenantData) setBusinessName(tenantData.business_name);

      const { data: itemsData } = await supabase.from('restaurant_menu_items').select('*').eq('tenant_id', tenantId).eq('is_active', true).eq('is_available', true);
      if (itemsData) setMenuItems(itemsData);

      const { data: catsData } = await supabase.from('restaurant_menu_categories').select('*').eq('tenant_id', tenantId).eq('is_active', true).order('display_order');
      if (catsData) setMenuCategories(catsData);
    };
    fetchAll();
  }, [tenantId, tableId]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) { setAuthLoading(false); return; }
    if (authMode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
      if (error) { toast.error(error.message); setAuthLoading(false); return; }
    } else {
      const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
      if (error) { toast.error(error.message); setAuthLoading(false); return; }
      toast.success('Account created!');
    }
    setAuthLoading(false);
  };

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(c => c.menu_item_id === item.id);
      if (existing) {
        return prev.map(c => c.menu_item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { menu_item_id: item.id, item_name: item.item_name, price: item.price, quantity: 1 }];
    });
  };

  const updateCartQty = (menuItemId: string, delta: number) => {
    setCart(prev => prev.map(c => c.menu_item_id === menuItemId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c).filter(c => c.quantity > 0));
  };

  const cartTotal = cart.reduce((sum, c) => sum + (c.price * c.quantity), 0);
  const filteredMenuItems = activeCategoryId ? menuItems.filter(m => m.category_id === activeCategoryId) : menuItems;

  const handlePlaceOrder = async () => {
    if (!user || !tenantId || !tableId || cart.length === 0) return;
    setPlacing(true);
    const supabase = getSupabaseClient();
    if (!supabase) { setPlacing(false); return; }

    const branchRes = await supabase.from('branches').select('id').eq('tenant_id', tenantId).limit(1).single();
    const branchId = branchRes.data?.id;
    if (!branchId) { toast.error('Restaurant setup incomplete'); setPlacing(false); return; }

    const { error } = await supabase.rpc('create_food_order', {
      p_tenant_id: tenantId,
      p_branch_id: branchId,
      p_user_id: user.id,
      p_customer_name: user.email || 'Guest',
      p_customer_phone: '',
      p_delivery_address: `Dine-in - Table ${table?.table_number || ''}`,
      p_payment_method: paymentMethod,
      p_items: cart.map(c => ({ menu_item_id: c.menu_item_id, quantity: c.quantity })),
      p_order_type: 'dine_in',
      p_table_id: tableId,
      p_num_guests: numGuests
    });

    if (error) { toast.error(`Failed to place order: ${error.message}`); setPlacing(false); return; }

    toast.success('Order placed!');
    setStep('success');
    setPlacing(false);
  };

  if (!tenantId || !tableId) {
    return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Invalid table link. Please scan the QR code again.</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm shadow-xl">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <Utensils className="mx-auto h-10 w-10 text-primary mb-2" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{businessName || 'Restaurant'}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Table {table?.table_number || ''} — {authMode === 'login' ? 'Log in' : 'Sign up'} to order</p>
            </div>
            <form onSubmit={handleAuth} className="space-y-3">
              <Input required type="email" placeholder="Email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} />
              <Input required type="password" placeholder="Password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} />
              <Button type="submit" className="w-full h-11" disabled={authLoading}>
                {authLoading ? 'Please wait...' : authMode === 'login' ? 'Log In' : 'Sign Up'}
              </Button>
            </form>
            <button
              onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              className="w-full text-center text-sm text-primary font-semibold mt-4"
            >
              {authMode === 'login' ? "New here? Sign up" : "Already have an account? Log in"}
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm shadow-xl text-center">
          <CardContent className="p-8">
            <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500 mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Order Sent!</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">Your order has been sent to the kitchen. Sit back and relax!</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-11" onClick={() => { setStep('menu'); setCart([]); }}>Add More Items</Button>
              <Button className="flex-1 h-11" onClick={() => { setStep('guests'); setCart([]); }}>Done</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'guests') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm shadow-xl">
          <CardContent className="p-6 text-center">
            <Utensils className="mx-auto h-10 w-10 text-primary mb-2" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{businessName}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Table {table?.table_number} · {table?.capacity} seats</p>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">How many guests?</p>
            <div className="flex items-center justify-center gap-4 mb-6">
              <button onClick={() => setNumGuests(Math.max(1, numGuests - 1))} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><Minus size={16} /></button>
              <span className="text-2xl font-extrabold w-10 text-center">{numGuests}</span>
              <button onClick={() => setNumGuests(numGuests + 1)} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><Plus size={16} /></button>
            </div>
            <Button className="w-full h-11" onClick={() => setStep('menu')}>View Menu</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-32">
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 sticky top-0 z-10">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{businessName}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">Table {table?.table_number} · {numGuests} guest{numGuests > 1 ? 's' : ''}</p>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button onClick={() => setActiveCategoryId(null)} className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap flex-shrink-0 ${!activeCategoryId ? 'bg-primary text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>All</button>
          {menuCategories.map(cat => (
            <button key={cat.id} onClick={() => setActiveCategoryId(cat.id)} className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap flex-shrink-0 ${activeCategoryId === cat.id ? 'bg-primary text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>{cat.category_name}</button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredMenuItems.map(item => {
            const inCart = cart.find(c => c.menu_item_id === item.id);
            return (
              <Card key={item.id} className="overflow-hidden">
                <div className="h-28 bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                  {item.photo ? <img src={item.photo} alt={item.item_name} className="w-full h-full object-cover" /> : <Utensils size={28} className="text-slate-300" />}
                </div>
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`inline-block w-2.5 h-2.5 border-2 rounded-sm ${item.is_veg ? 'border-emerald-600' : 'border-red-600'}`} />
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">{item.item_name}</p>
                  </div>
                  <p className="text-sm font-bold text-primary mb-2">₹{item.price}</p>
                  {inCart ? (
                    <div className="flex items-center justify-between">
                      <button onClick={() => updateCartQty(item.id, -1)} className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><Minus size={14} /></button>
                      <span className="font-bold">{inCart.quantity}</span>
                      <button onClick={() => updateCartQty(item.id, 1)} className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><Plus size={14} /></button>
                    </div>
                  ) : (
                    <Button size="sm" className="w-full h-8 text-xs" onClick={() => addToCart(item)}>Add</Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {filteredMenuItems.length === 0 && (
            <p className="col-span-full text-center text-slate-400 py-8 text-sm">No menu items available right now.</p>
          )}
        </div>
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 space-y-3">
          <div className="flex gap-2">
            <button onClick={() => setPaymentMethod('cod')} className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 ${paymentMethod === 'cod' ? 'border-primary text-primary' : 'border-slate-200 dark:border-slate-800 text-slate-500'}`}>Pay at Table</button>
            <button onClick={() => setPaymentMethod('wallet')} className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 ${paymentMethod === 'wallet' ? 'border-primary text-primary' : 'border-slate-200 dark:border-slate-800 text-slate-500'}`}>BahiBox Coin</button>
          </div>
          <Button className="w-full h-12 gap-2" disabled={placing} onClick={handlePlaceOrder}>
            <ShoppingCart size={18} /> {placing ? 'Placing...' : `Place Order · ₹${cartTotal}`}
          </Button>
        </div>
      )}
    </div>
  );
};"""

if target in content:
    content = content.replace(target, replacement)
    with open("src/components/hospitality/HospitalityComponents.tsx", "w") as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
