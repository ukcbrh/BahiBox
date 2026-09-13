with open('src/pages/PublicApp.tsx', 'r') as f:
    content = f.read()

target1 = "import { MoveView } from '../components/consumer/MoveView';"
repl1 = "import { MoveView } from '../components/consumer/MoveView';\nimport { MartHome } from '../components/mart/MartHome';"
if target1 in content:
    content = content.replace(target1, repl1)
else:
    print("target1 not found")

target2 = """                    <StoreProductGrid 
                      products={products} 
                      addToCart={(p) => addToCart(p, 1)} 
                      onProductClick={setSelectedProduct}
                      tenantColor={selectedStore.color} 
                      onBack={() => setSelectedStore(null)}
                      storeName={selectedStore.name}
                    />
                  )
                ) : selectedCategory === 'Mart' ? ("""
repl2 = """                    <StoreProductGrid 
                      products={products} 
                      addToCart={(p) => addToCart(p, 1)} 
                      onProductClick={setSelectedProduct}
                      tenantColor={selectedStore.color} 
                      onBack={() => setSelectedStore(null)}
                      storeName={selectedStore.name}
                    />
                  )
                ) : selectedProduct ? (
                  <ProductDetailView
                    product={selectedProduct}
                    tenantColor={selectedProduct.store?.primary_color || '#3b82f6'}
                    onBack={() => setSelectedProduct(null)}
                    addToCart={(p, q) => {
                      addToCart(p, q);
                      alert(`${q}x ${p.name} added to cart`);
                    }}
                    onBuyNow={(p, q) => {
                      addToCart(p, q);
                      setActiveTab('cart');
                      setCheckoutStep('cart');
                      setSelectedProduct(null);
                    }}
                  />
                ) : selectedCategory === 'Mart' ? ("""
if target2 in content:
    content = content.replace(target2, repl2)
else:
    print("target2 not found")

target3 = """                      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <ShoppingBag className="text-blue-500" size={20} /> Mart Marketplace
                      </h2>
                    </div>
                    
                    <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex mb-6">"""
repl3 = """                      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <ShoppingBag className="text-blue-500" size={20} /> Mart Marketplace
                      </h2>
                    </div>

                    <MartHome
                      marketplaceProducts={marketplaceProducts}
                      onProductClick={setSelectedProduct}
                      onSellerClick={(store: any) => setSelectedStore({ tenant_id: store.tenant_id, branch_id: store.id, name: store.brand_name || store.branch_name, logo: store.logo_url, color: store.primary_color })}
                      addToCart={(p: any) => addToCart(p, 1)}
                    />

                    <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">Browse Full Catalog</h3>
                    </div>
                    
                    <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex mb-6">"""
if target3 in content:
    content = content.replace(target3, repl3)
else:
    print("target3 not found")

target4 = """                                  onClick={() => {
                                      // Optional: Could support product details here, but for now just add to cart or switch to store
                                      setSelectedStore({ tenant_id: product.store.tenant_id, branch_id: product.store.id, name: product.store.brand_name || product.store.branch_name, logo: product.store.logo_url, color: product.store.primary_color });
                                      setSelectedProduct(product);
                                  }}"""
repl4 = """                                  onClick={() => {
                                      setSelectedProduct(product);
                                  }}"""
if target4 in content:
    content = content.replace(target4, repl4)
else:
    print("target4 not found")

with open('src/pages/PublicApp.tsx', 'w') as f:
    f.write(content)
print("Updated successfully")
