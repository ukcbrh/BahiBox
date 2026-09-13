import re

with open('src/pages/PublicApp.tsx', 'r') as f:
    content = f.read()

# Step 1: Add state
state_target = r"(const \[marketplaceProducts, setMarketplaceProducts\] = useState<any\[\]>\(\[\]\);)"
if re.search(state_target, content):
    content = re.sub(state_target, r"\1\n  const [martCategories, setMartCategories] = useState<any[]>([]);", content)
else:
    print("Failed Step 1")

# Step 2: replace fetchMarketplace block
fetch_market_re = r"(\s+useEffect\(\(\) => \{\n\s+let isMounted = true;\n\s+const fetchMarketplace = async \(\) => \{[\s\S]*?fetchMarketplace\(\);\n\s+return \(\) => \{ isMounted = false; \};\n\s+\}, \[selectedCategory\]\);)"

new_fetch_market = """
  useEffect(() => {
    let isMounted = true;
    const fetchMarketplace = async () => {
      if (selectedCategory !== 'Mart') return;
      setMarketplaceLoading(true);
      
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
          if (isMounted) setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        }, () => {
          console.warn("Location permission denied or unavailable");
        });
      }
      
      try {
        const supabase = getSupabaseClient();
        if (!supabase) return;

        const { data: martCategoriesData } = await supabase
          .from('mart_categories')
          .select('*')
          .eq('is_active', true)
          .order('display_order');
        if (isMounted) setMartCategories(martCategoriesData || []);

        const { data: branchesData, error: branchesError } = await supabase
          .from('branches')
          .select('*')
          .eq('is_online_store_active', true);
          
        if (branchesError) console.error("Branches fetch error:", branchesError);
        
        if (!branchesData || branchesData.length === 0) {
          if (isMounted) { setMarketplaceStores([]); setMarketplaceProducts([]); setMarketplaceLoading(false); }
          return;
        }

        const tenantIds = [...new Set(branchesData.map((b: any) => b.tenant_id))];
        
        const { data: tenantsData, error: tenantsError } = await supabase
          .from('tenants')
          .select('id, business_name, business_type')
          .in('id', tenantIds)
          .eq('business_type', 'retail');
          
        if (tenantsError) console.error("Tenants fetch error:", tenantsError);
          
        if (!tenantsData || tenantsData.length === 0) {
           if (isMounted) { setMarketplaceStores([]); setMarketplaceProducts([]); setMarketplaceLoading(false); }
           return;
        }
        
        const retailTenantIds = tenantsData.map((t: any) => t.id);
        const retailBranches = branchesData.filter((b: any) => retailTenantIds.includes(b.tenant_id));
        const retailBranchIds = retailBranches.map((b: any) => b.id);
        
        const { data: brandingData } = await supabase
          .from('merchant_branding')
          .select('*')
          .in('tenant_id', retailTenantIds);
          
        const tenantsMap = new globalThis.Map(tenantsData.map((t: any) => [t.id, t]));
        const brandingMap = new globalThis.Map(brandingData?.map((b: any) => [b.tenant_id, b]));
        
        const stores = retailBranches.map((branch: any) => {
          const brand = brandingMap.get(branch.tenant_id) as any;
          return {
             ...branch,
             branch_name: (tenantsMap.get(branch.tenant_id) as any)?.business_name || 'Unknown Store',
             brand_name: brand?.brand_name || (tenantsMap.get(branch.tenant_id) as any)?.business_name || 'Unknown Store',
             logo_url: brand?.logo_url || '',
             primary_color: brand?.primary_color || '#3b82f6',
             distance: null
          };
        });
        
        if (isMounted) setMarketplaceStores(stores);
        
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .in('tenant_id', retailTenantIds)
          .eq('is_active', true);
          
        if (productsError) console.error("Products fetch error:", productsError);
          
        if (!productsData) {
           if (isMounted) setMarketplaceProducts([]);
           return;
        }

        const { data: unitsData } = await supabase
          .from('units')
          .select('id, unit_name, unit_symbol')
          .or(`tenant_id.is.null,tenant_id.in.(${retailTenantIds.join(',')})`);
        const unitsMap = new globalThis.Map((unitsData || []).map((u: any) => [u.id, u.unit_symbol || u.unit_name]));
        
        const { data: stockData } = await supabase
          .from('product_stock')
          .select('product_id, branch_id, current_quantity')
          .in('branch_id', retailBranchIds);
          
        let stockMap: Record<string, any> = {}; 
        if (stockData) {
          stockData.forEach((s: any) => {
            if (!stockMap[s.product_id]) stockMap[s.product_id] = {};
            stockMap[s.product_id][s.branch_id] = s.current_quantity;
          });
        }
        
        const combinedProducts: any[] = [];
        productsData.forEach((p: any) => {
           const pBranches = stores.filter((s: any) => s.tenant_id === p.tenant_id);
           pBranches.forEach((b: any) => {
              const stock = stockMap[p.id]?.[b.id] || 0;
              combinedProducts.push({
                 ...p,
                 name: p.product_name || p.name || 'Unknown Product',
                 price: p.selling_price || p.price,
                 mrp: p.mrp,
                 unit_display: unitsMap.get(p.unit_id) || '',
                 stock,
                 store: b,
                 uniqueKey: `${p.id}-${b.id}`
              });
           });
        });
        
        if (isMounted) setMarketplaceProducts(combinedProducts);

      } catch (err) {
        console.warn("Failed to fetch marketplace data:", err);
      } finally {
        if (isMounted) setMarketplaceLoading(false);
      }
    };
    fetchMarketplace();
    return () => { isMounted = false; };
  }, [selectedCategory]);"""

if re.search(fetch_market_re, content):
    content = re.sub(fetch_market_re, new_fetch_market, content)
else:
    print("Failed Step 2")

# Step 3: fetchProductsData block
fetch_products_re = r"(\s+useEffect\(\(\) => \{\n\s+let isMounted = true;\n\s+const fetchProductsData = async \(\) => \{[\s\S]*?fetchProductsData\(\);\n\s+return \(\) => \{ isMounted = false; \};\n\s+\}, \[tenant, selectedStore\]\);)"

new_fetch_products = """
  useEffect(() => {
    let isMounted = true;
    const fetchProductsData = async () => {
      const activeTenantId = selectedStore?.tenant_id || tenant?.merchant_id;
      const activeBranchId = selectedStore?.branch_id;
      
      if (activeTenantId) {
        try {
          const supabase = getSupabaseClient();
          if (!supabase) return;
          
          let tId = activeTenantId;
          if (tenant?.merchant_id && !selectedStore) {
            const { data: roles } = await supabase
              .from('user_tenant_roles')
              .select('tenant_id')
              .eq('user_id', tenant.merchant_id)
              .limit(1);
            if (roles?.[0]?.tenant_id) tId = roles[0].tenant_id;
          }
          
          const { data: productsData } = await supabase
            .from('products')
            .select('*')
            .eq('tenant_id', tId)
            .eq('is_active', true);
            
          if (!productsData) {
             if (isMounted) setProducts([]);
             return;
          }

          const { data: unitsData } = await supabase
            .from('units')
            .select('id, unit_name, unit_symbol')
            .or(`tenant_id.is.null,tenant_id.eq.${tId}`);
          const unitsMap = new globalThis.Map((unitsData || []).map((u: any) => [u.id, u.unit_symbol || u.unit_name]));
          
          let stockMap: Record<string, number> = {};
          if (activeBranchId) {
             const { data: stockData } = await supabase
               .from('product_stock')
               .select('product_id, current_quantity')
               .eq('branch_id', activeBranchId);
             
             if (stockData) {
               stockData.forEach((s: any) => { stockMap[s.product_id] = s.current_quantity; });
             }
          }
          
          if (isMounted) {
            setProducts(productsData.map((p: any) => ({
              ...p,
              name: p.product_name,
              price: p.selling_price,
              mrp: p.mrp,
              unit_display: unitsMap.get(p.unit_id) || '',
              stock: activeBranchId ? (stockMap[p.id] || 0) : 100 // Default to in-stock if no branch specified
            })));
          }
        } catch (err) {
          console.warn("Failed to fetch products:", err);
        }
      } else {
        if (isMounted) setProducts([]);
      }
    };
    fetchProductsData();
    return () => { isMounted = false; };
  }, [tenant, selectedStore]);"""

if re.search(fetch_products_re, content):
    content = re.sub(fetch_products_re, new_fetch_products, content)
else:
    print("Failed Step 3")


# Step 4: StoreProductGrid
store_grid_re = r"(function StoreProductGrid\(\{.*?\}\) \{[\s\S]*?\}\n\s*\n)"

new_store_grid = """function StoreProductGrid({ products, addToCart, onProductClick, tenantColor, onBack, storeName }: { products: Product[], addToCart: (p: Product) => void, onProductClick: (p: Product) => void, tenantColor: string, onBack?: () => void, storeName?: string }) {

  return (
    <div className="space-y-6">
      {onBack && (
        <Button onClick={onBack} variant="outline" className="mb-2 flex items-center gap-2 border-slate-200 dark:border-slate-800">
          <ArrowLeft size={16} /> Back to Stores
        </Button>
      )}
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 px-2">{storeName || 'Featured Products'}</h2>
        {products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {products.map(product => {
              const isOutOfStock = product.stock === 0;
              return (
                <Card 
                  key={product.id} 
                  className={`border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden rounded-2xl flex flex-col h-full cursor-pointer hover:shadow-md transition-shadow ${isOutOfStock ? 'opacity-60 grayscale-[0.5]' : ''}`}
                  onClick={() => onProductClick(product)}
                >
                  <div className="h-32 bg-slate-50 dark:bg-slate-900 flex items-center justify-center border-b border-slate-100 dark:border-slate-800 relative">
                    {(product as any).photo ? (
                      <img src={(product as any).photo} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package size={32} className="text-slate-300" />
                    )}
                    {isOutOfStock && <span className="absolute top-2 left-2 bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full z-10">Out of Stock</span>}
                  </div>
                  <CardContent className="p-4 flex flex-col flex-1 relative">
                    <h3 className="font-semibold text-sm line-clamp-2 leading-tight flex-1 text-slate-800 dark:text-slate-200">{product.name}</h3>
                    
                    <div className="mt-3 flex flex-col gap-1">
                       <div className="flex items-end gap-2">
                         <span className="font-extrabold text-base leading-none" style={isOutOfStock ? {} : { color: tenantColor }}>₹{product.price}</span>
                         {product.mrp && product.mrp > product.price && (
                           <span className="text-xs text-slate-400 line-through leading-none">₹{product.mrp}</span>
                         )}
                         {(product as any).unit_display && (
                           <span className="text-[10px] text-slate-400">/ {(product as any).unit_display}</span>
                         )}
                       </div>
                       <span className="text-[10px] text-emerald-600 font-medium">
                         {isOutOfStock ? 'Currently unavailable' : 'In stock'}
                       </span>
                    </div>
                    
                    <Button 
                      onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                      disabled={isOutOfStock}
                      className="w-full mt-4 h-9 text-xs font-bold rounded-xl transition-transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-white shadow-sm" 
                      style={isOutOfStock ? { backgroundColor: '#94a3b8' } : { backgroundColor: tenantColor }}
                    >
                      {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed">
            <Store className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">No products found for this merchant.</p>
          </div>
        )}
      </div>
    </div>
  );
}
\n"""

# Need a careful replacement for StoreProductGrid, might use string splitting.
idx1 = content.find("function StoreProductGrid(")
if idx1 != -1:
    idx2 = content.find("function ProductDetailView(", idx1)
    if idx2 != -1:
        content = content[:idx1] + new_store_grid + content[idx2:]
    else:
        print("Failed to find end of StoreProductGrid")
else:
    print("Failed Step 4")

# Step 5: ProductDetailView
new_product_detail = """function ProductDetailView({ product, tenantColor, onBack, addToCart, onBuyNow }: { product: Product, tenantColor: string, onBack: () => void, addToCart: (p: Product, q: number) => void, onBuyNow: (p: Product, q: number) => void }) {
  const [quantity, setQuantity] = useState<number | string>(1);
  const isOutOfStock = product.stock === 0;

  const handleQuantityChange = (val: string) => {
    if (val === '') {
      setQuantity('');
      return;
    }
    let num = parseInt(val, 10);
    if (isNaN(num)) return;
    setQuantity(num);
  };

  const handleBlur = () => {
    if (quantity === '' || (typeof quantity === 'number' && quantity < 1)) {
      setQuantity(1);
    } else if (typeof quantity === 'number' && quantity > product.stock) {
      setQuantity(product.stock);
    }
  };
  
  const currentQuantity = typeof quantity === 'number' ? quantity : 1;

  return (
    <div className="space-y-6">
      <Button onClick={onBack} variant="outline" className="mb-2 flex items-center gap-2 border-slate-200 dark:border-slate-800">
        <ArrowLeft size={16} /> Back to Products
      </Button>
      
      <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col md:flex-row">
        <div className="md:w-1/2 h-64 md:h-auto bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-8 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800">
          {(product as any).photo ? (
            <img src={(product as any).photo} alt={product.name} className="w-full h-full object-contain" />
          ) : (
            <Package size={80} className="text-slate-300" />
          )}
        </div>
        <div className="p-6 md:w-1/2 flex flex-col">
          {isOutOfStock && <span className="inline-block bg-red-100 text-red-600 text-xs font-bold px-3 py-1 rounded-full w-max mb-3">Out of Stock</span>}
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">{product.name}</h2>
          <div className="flex items-end gap-3 mb-1">
            <span className="text-3xl font-extrabold" style={{ color: tenantColor }}>₹{product.price}</span>
            {product.mrp && product.mrp > product.price && (
              <span className="text-lg text-slate-400 line-through mb-1">₹{product.mrp}</span>
            )}
          </div>
          {(product as any).unit_display && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">per {(product as any).unit_display}</p>
          )}
          {(product as any).description && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{(product as any).description}</p>
          )}
          
          <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 mb-6">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Quantity</p>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-10 w-10 border-slate-200 dark:border-slate-800" 
                onClick={() => setQuantity(Math.max(1, currentQuantity - 1))}
                disabled={isOutOfStock || currentQuantity <= 1}
              >
                -
              </Button>
              <Input 
                value={quantity} 
                onChange={(e) => handleQuantityChange(e.target.value)} 
                onBlur={handleBlur}
                className="w-20 text-center font-bold text-lg h-10" 
                disabled={isOutOfStock}
              />
              <Button 
                variant="outline" 
                size="icon" 
                className="h-10 w-10 border-slate-200 dark:border-slate-800" 
                onClick={() => setQuantity(Math.min(product.stock, currentQuantity + 1))}
                disabled={isOutOfStock || currentQuantity >= product.stock}
              >
                +
              </Button>
            </div>
            {currentQuantity >= product.stock && product.stock > 0 && (
              <p className="text-xs text-amber-600 font-medium mt-2">Only {product.stock} left in stock</p>
            )}
          </div>
          
          <div className="mt-auto space-y-3">
            <Button 
              onClick={() => addToCart(product, currentQuantity)}
              disabled={isOutOfStock}
              className="w-full h-12 text-lg font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800" 
            >
              Add to Cart
            </Button>
            <Button 
              onClick={() => onBuyNow(product, currentQuantity)}
              disabled={isOutOfStock}
              className="w-full h-12 text-lg font-bold rounded-xl text-white" 
              style={isOutOfStock ? { backgroundColor: '#94a3b8' } : { backgroundColor: tenantColor }}
            >
              Buy Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
"""

idx3 = content.find("function ProductDetailView(")
if idx3 != -1:
    idx4 = content.find("export default function PublicApp(", idx3)
    if idx4 != -1:
        content = content[:idx3] + new_product_detail + content[idx4:]
    else:
        print("Failed to find end of ProductDetailView")
else:
    print("Failed Step 5")


with open('src/pages/PublicApp.tsx', 'w') as f:
    f.write(content)
print("Done")
