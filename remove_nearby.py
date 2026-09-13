import sys

with open('src/pages/PublicApp.tsx', 'r') as f:
    content = f.read()

target = """                  <div className="space-y-8">
                    {/* Store Directory */}
                    <div>
                      <div className="flex justify-between items-center mb-4 px-2">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Nearby Stores</h2>
                      </div>
                      
                      <div className="mb-6">
                        <div className="relative max-w-md">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <Input 
                            placeholder="Search stores or locations..." 
                            className="pl-10 h-10 bg-white dark:bg-slate-950 rounded-xl"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                        </div>
                      </div>
                      
                      {loadingStores ? (
                         <div className="flex justify-center items-center h-40">
                           <div className="w-8 h-8 border-4 border-slate-300 dark:border-slate-700 border-t-primary rounded-full animate-spin"></div>
                         </div>
                      ) : stores.filter(s => 
                          (s.brand_name || s.business_name).toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (s.city || '').toLowerCase().includes(searchQuery.toLowerCase())
                        ).length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {stores.filter(s => 
                            (s.brand_name || s.business_name).toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (s.city || '').toLowerCase().includes(searchQuery.toLowerCase())
                          ).map((store: any) => (
                            <Card 
                              key={store.id} 
                              className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer rounded-2xl overflow-hidden"
                              onClick={() => setSelectedStore({
                                tenant_id: store.tenant_id,
                                branch_id: store.id,
                                name: store.brand_name || store.business_name,
                                logo: store.logo_url,
                                color: store.primary_color
                              })}
                            >
                              <CardContent className="p-4 flex items-center gap-4">
                                <div className="w-16 h-16 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-100 dark:border-slate-800">
                                  {store.logo_url ? (
                                    <img src={store.logo_url} alt={store.brand_name} className="w-full h-full object-cover" />
                                  ) : (
                                    <Store size={28} className="text-slate-400" />
                                  )}
                                </div>
                                <div>
                                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg leading-tight mb-1">{store.brand_name || store.business_name}</h3>
                                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                    <span className="flex items-center gap-1"><Store size={12}/> {store.branch_name}</span>
                                    {store.city && <span>• {store.city}</span>}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed">
                          <Store className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">No online stores yet</h3>
                          <p className="text-slate-500 dark:text-slate-400 text-sm">Check back soon for new stores in your area!</p>
                        </div>
                      )}
                    </div>
                    
                    {/* BahiBox Super App (Secondary) */}"""

replacement = """                  <div className="space-y-8">
                    
                    {/* BahiBox Super App (Secondary) */}"""

if target in content:
    content = content.replace(target, replacement)
    with open('src/pages/PublicApp.tsx', 'w') as f:
        f.write(content)
    print("Fixed nearby stores!")
else:
    print("Target not found!")
