import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { Search, Trash2, Package, X, Building2, ArrowLeft, Utensils } from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabase';
import { toast } from 'sonner';

interface SponsoredRow {
  id: string;
  product_id: string;
  tenant_id: string;
  placement_type: string;
  display_order: number;
  is_active: boolean;
  product_name?: string;
  photo?: string;
  brand_name?: string;
}

interface Seller {
  tenant_id: string;
  display_name: string;
  email: string;
  phone: string;
}

export function MartSponsoredAdminView() {
  const [sponsoredList, setSponsoredList] = useState<SponsoredRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const [sellersList, setSellersList] = useState<Seller[]>([]);
  const [sellerSearch, setSellerSearch] = useState('');
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [loadingSellers, setLoadingSellers] = useState(false);

  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [placementType, setPlacementType] = useState('homepage_featured');
  const [displayOrder, setDisplayOrder] = useState('1');
  const [searching, setSearching] = useState(false);

  const fetchSponsoredList = async () => {
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('mart_sponsored_placements')
      .select('*, products(product_name, photo, tenant_id)')
      .order('placement_type')
      .order('display_order');
    if (error) { toast.error(error.message); setLoading(false); return; }

    const tenantIds = [...new Set((data || []).map((d: any) => d.products?.tenant_id).filter(Boolean))];
    let brandingMap = new globalThis.Map<any, any>();
    if (tenantIds.length > 0) {
      const { data: brandingData } = await supabase
        .from('merchant_branding')
        .select('merchant_id, brand_name')
        .in('merchant_id', tenantIds);
      brandingMap = new globalThis.Map<any, any>((brandingData || []).map((b: any) => [b.merchant_id, b.brand_name]));
    }

    const rows: SponsoredRow[] = (data || []).map((d: any) => ({
      id: d.id,
      product_id: d.product_id,
      tenant_id: d.tenant_id,
      placement_type: d.placement_type,
      display_order: d.display_order,
      is_active: d.is_active,
      product_name: d.products?.product_name || 'Unknown Product',
      photo: d.products?.photo,
      brand_name: brandingMap.get(d.products?.tenant_id) || 'Unknown Store'
    }));
    setSponsoredList(rows);
    setLoading(false);
  };

  useEffect(() => { fetchSponsoredList(); }, []);

  const fetchSellers = async () => {
    setLoadingSellers(true);
    const supabase = getSupabaseClient();
    if (!supabase) { setLoadingSellers(false); return; }

    const { data: retailSubsData } = await supabase
      .from('merchant_subscriptions')
      .select('tenant_id, subscription_plans!inner(module_key)')
      .eq('status', 'active')
      .eq('subscription_plans.module_key', 'retail');
    const retailTenantIds = [...new Set((retailSubsData || []).map((s: any) => s.tenant_id))];

    if (retailTenantIds.length === 0) { setSellersList([]); setLoadingSellers(false); return; }

    const { data: tenantsData } = await supabase.from('tenants').select('id, business_name').in('id', retailTenantIds);
    const { data: brandingData } = await supabase.from('merchant_branding').select('merchant_id, brand_name').in('merchant_id', retailTenantIds);
    const { data: ownerRoles } = await supabase.from('user_tenant_roles').select('user_id, tenant_id').eq('role_name', 'owner').eq('is_active', true).in('tenant_id', retailTenantIds);
    const ownerUserIds = (ownerRoles || []).map((r: any) => r.user_id);
    const { data: ownerUsers } = ownerUserIds.length > 0
      ? await supabase.from('users').select('id, email, phone').in('id', ownerUserIds)
      : { data: [] as any[] };

    const brandingMap = new globalThis.Map<any, any>((brandingData || []).map((b: any) => [b.merchant_id, b.brand_name]));
    const ownerRoleMap = new globalThis.Map<any, any>((ownerRoles || []).map((r: any) => [r.tenant_id, r.user_id]));
    const userMap = new globalThis.Map<any, any>((ownerUsers || []).map((u: any) => [u.id, u]));

    const sellers: Seller[] = (tenantsData || []).map((t: any) => {
      const ownerUserId = ownerRoleMap.get(t.id);
      const ownerUser = ownerUserId ? userMap.get(ownerUserId) : null;
      return {
        tenant_id: t.id,
        display_name: brandingMap.get(t.id) || t.business_name || 'Unknown Store',
        email: ownerUser?.email || '',
        phone: ownerUser?.phone || ''
      };
    });
    setSellersList(sellers);
    setLoadingSellers(false);
  };

  useEffect(() => {
    if (showAddModal) fetchSellers();
  }, [showAddModal]);

  const filteredSellers = sellersList.filter(s => {
    const term = sellerSearch.trim().toLowerCase();
    if (term === '') return true;
    return s.display_name.toLowerCase().includes(term) || s.email.toLowerCase().includes(term) || s.phone.includes(term);
  }).slice(0, 20);

  const fetchProductsForSeller = async (tenantId: string, term: string) => {
    setSearching(true);
    const supabase = getSupabaseClient();
    if (!supabase) { setSearching(false); return; }
    let query = supabase
      .from('products')
      .select('id, product_name, photo, tenant_id, selling_price')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .limit(20);
    if (term.trim() !== '') {
      query = query.ilike('product_name', `%${term}%`);
    }
    const { data } = await query;
    setProductResults(data || []);
    setSearching(false);
  };

  useEffect(() => {
    if (selectedSeller) fetchProductsForSeller(selectedSeller.tenant_id, '');
  }, [selectedSeller]);

  const searchProducts = (term: string) => {
    setProductSearch(term);
    if (!selectedSeller) return;
    fetchProductsForSeller(selectedSeller.tenant_id, term);
  };

  const resetModal = () => {
    setShowAddModal(false);
    setSelectedSeller(null);
    setSellerSearch('');
    setSelectedProduct(null);
    setProductSearch('');
    setProductResults([]);
    setDisplayOrder('1');
  };

  const handleAddSponsored = async () => {
    if (!selectedProduct) { toast.error('Select a product first'); return; }
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from('mart_sponsored_placements').insert({
      product_id: selectedProduct.id,
      tenant_id: selectedProduct.tenant_id,
      placement_type: placementType,
      display_order: parseInt(displayOrder) || 1,
      is_paid: false,
      payment_status: 'waived',
      is_active: true
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Product added to sponsored list');
    resetModal();
    fetchSponsoredList();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this sponsored placement?')) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from('mart_sponsored_placements').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Removed');
    fetchSponsoredList();
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from('mart_sponsored_placements').update({ is_active: !current }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    fetchSponsoredList();
  };

  const placementLabel = (type: string) => {
    if (type === 'homepage_featured') return 'Homepage Featured Row';
    if (type === 'sponsored_banner') return 'Sponsored Banner (Mid-page)';
    if (type === 'sponsored_rail_slot') return 'Sponsored Rail Slot';
    if (type === 'category_boost') return 'Category Boost';
    return type;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Mart Sponsored Products</h1>
          <p className="text-slate-500 dark:text-slate-400">Control which products appear on the Mart homepage.</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>Add Sponsored Product</Button>
      </div>

      <Card className="dark:bg-slate-900 dark:border-slate-800 border-none shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-medium">
              <tr>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Seller</th>
                <th className="px-6 py-4">Placement</th>
                <th className="px-6 py-4">Order</th>
                <th className="px-6 py-4">Active</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 dark:bg-slate-900">
              {sponsoredList.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {row.photo ? <img src={row.photo} alt="" className="w-full h-full object-cover" /> : <Package size={16} className="text-slate-400" />}
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-white">{row.product_name}</span>
                  </td>
                  <td className="px-6 py-4 dark:text-slate-300">{row.brand_name}</td>
                  <td className="px-6 py-4 dark:text-slate-300">{placementLabel(row.placement_type)}</td>
                  <td className="px-6 py-4 dark:text-slate-300">{row.display_order}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleToggleActive(row.id, row.is_active)} className={`px-2 py-1 rounded-full text-xs font-medium ${row.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                      {row.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:border-slate-700" onClick={() => handleDelete(row.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
              {sponsoredList.length === 0 && !loading && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">No sponsored products yet. Click "Add Sponsored Product" to feature one.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Add Sponsored Product</CardTitle>
              <Button variant="ghost" size="icon" onClick={resetModal}><X size={16} /></Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedSeller ? (
                <div>
                  <label className="text-sm font-medium block mb-2">Search Seller (name, email, or mobile)</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      className="pl-9"
                      placeholder="Type seller name, email, or mobile..."
                      value={sellerSearch}
                      onChange={(e) => setSellerSearch(e.target.value)}
                    />
                  </div>
                  <div className="mt-3 max-h-64 overflow-y-auto space-y-2">
                    {loadingSellers && <p className="text-sm text-slate-400">Loading sellers...</p>}
                    {!loadingSellers && filteredSellers.length === 0 && (
                      <p className="text-sm text-slate-400">No active Retail POS sellers found.</p>
                    )}
                    {filteredSellers.map((s) => (
                      <div
                        key={s.tenant_id}
                        onClick={() => setSelectedSeller(s)}
                        className="flex items-center gap-3 p-2 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900"
                      >
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                          <Building2 size={16} className="text-slate-400" />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-slate-900 dark:text-slate-100">{s.display_name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{s.email || s.phone || 'No contact info'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : !selectedProduct ? (
                <div>
                  <button
                    onClick={() => { setSelectedSeller(null); setProductSearch(''); setProductResults([]); }}
                    className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline mb-3"
                  >
                    <ArrowLeft size={14} /> Change Seller
                  </button>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mb-3">
                    <Building2 size={18} className="text-slate-400" />
                    <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">{selectedSeller.display_name}</span>
                  </div>
                  <label className="text-sm font-medium block mb-2">Search Product</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      className="pl-9"
                      placeholder="Type product name..."
                      value={productSearch}
                      onChange={(e) => searchProducts(e.target.value)}
                    />
                  </div>
                  <div className="mt-3 max-h-64 overflow-y-auto space-y-2">
                    {searching && <p className="text-sm text-slate-400">Searching...</p>}
                    {!searching && productResults.length === 0 && (
                      <p className="text-sm text-slate-400">No products found for this seller.</p>
                    )}
                    {productResults.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => setSelectedProduct(p)}
                        className="flex items-center gap-3 p-2 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900"
                      >
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {p.photo ? <img src={p.photo} alt="" className="w-full h-full object-cover" /> : <Package size={16} className="text-slate-400" />}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-slate-900 dark:text-slate-100">{p.product_name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">₹{p.selling_price}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline mb-1"
                  >
                    <ArrowLeft size={14} /> Change Product
                  </button>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="w-12 h-12 rounded-lg bg-white dark:bg-slate-950 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {selectedProduct.photo ? <img src={selectedProduct.photo} alt="" className="w-full h-full object-cover" /> : <Package size={18} className="text-slate-400" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">{selectedProduct.product_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{selectedSeller.display_name} · ₹{selectedProduct.selling_price}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Placement</label>
                    <Select value={placementType} onValueChange={setPlacementType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="homepage_featured">Homepage Featured Row</SelectItem>
                        <SelectItem value="sponsored_banner">Sponsored Banner (Mid-page)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Display Order</label>
                    <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(e.target.value)} />
                  </div>

                  <Button className="w-full" onClick={handleAddSponsored}>Add to Sponsored List</Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

interface FoodSponsoredRow {
  id: string;
  menu_item_id: string;
  tenant_id: string;
  placement_type: string;
  display_order: number;
  is_active: boolean;
  item_name?: string;
  photo?: string;
  restaurant_name?: string;
}

interface FoodRestaurant {
  tenant_id: string;
  display_name: string;
  email: string;
  phone: string;
}

export function FoodSponsoredAdminView() {
  const [sponsoredList, setSponsoredList] = useState<FoodSponsoredRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [restaurantsList, setRestaurantsList] = useState<FoodRestaurant[]>([]);
  const [restaurantSearch, setRestaurantSearch] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<FoodRestaurant | null>(null);
  const [loadingRestaurants, setLoadingRestaurants] = useState(false);

  const [itemSearch, setItemSearch] = useState('');
  const [itemResults, setItemResults] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const [placementType, setPlacementType] = useState('sponsored_feed');
  const [displayOrder, setDisplayOrder] = useState('1');
  const [searching, setSearching] = useState(false);

  const fetchSponsoredList = async () => {
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) { setLoading(false); return; }

    const { data, error } = await supabase
      .from('food_sponsored_placements')
      .select('*, restaurant_menu_items(item_name, photo, tenant_id)')
      .order('placement_type')
      .order('display_order');

    if (error) { toast.error(error.message); setLoading(false); return; }

    const tenantIds = [...new Set((data || []).map((d: any) => d.restaurant_menu_items?.tenant_id).filter(Boolean))];
    let tenantMap = new globalThis.Map<any, any>();
    if (tenantIds.length > 0) {
      const { data: tenantsData } = await supabase.from('tenants').select('id, business_name').in('id', tenantIds);
      tenantMap = new globalThis.Map<any, any>((tenantsData || []).map((t: any) => [t.id, t.business_name]));
    }

    const rows: FoodSponsoredRow[] = (data || []).map((d: any) => ({
      id: d.id,
      menu_item_id: d.menu_item_id,
      tenant_id: d.tenant_id,
      placement_type: d.placement_type,
      display_order: d.display_order,
      is_active: d.is_active,
      item_name: d.restaurant_menu_items?.item_name || 'Unknown Item',
      photo: d.restaurant_menu_items?.photo,
      restaurant_name: tenantMap.get(d.restaurant_menu_items?.tenant_id) || 'Unknown Restaurant'
    }));
    setSponsoredList(rows);
    setLoading(false);
  };

  useEffect(() => { fetchSponsoredList(); }, []);

  const fetchRestaurants = async () => {
    setLoadingRestaurants(true);
    const supabase = getSupabaseClient();
    if (!supabase) { setLoadingRestaurants(false); return; }

    const { data: hospSubsData } = await supabase
      .from('merchant_subscriptions')
      .select('tenant_id, subscription_plans!inner(module_key)')
      .eq('status', 'active')
      .eq('subscription_plans.module_key', 'hospitality');

    const hospTenantIds = [...new Set((hospSubsData || []).map((s: any) => s.tenant_id))];
    if (hospTenantIds.length === 0) { setRestaurantsList([]); setLoadingRestaurants(false); return; }

    const { data: tenantsData } = await supabase.from('tenants').select('id, business_name').in('id', hospTenantIds);
    const { data: ownerRoles } = await supabase.from('user_tenant_roles').select('user_id, tenant_id').eq('role_name', 'owner').eq('is_active', true).in('tenant_id', hospTenantIds);
    const ownerUserIds = (ownerRoles || []).map((r: any) => r.user_id);
    const { data: ownerUsers } = ownerUserIds.length > 0
      ? await supabase.from('users').select('id, email, phone').in('id', ownerUserIds)
      : { data: [] as any[] };

    const ownerRoleMap = new globalThis.Map<any, any>((ownerRoles || []).map((r: any) => [r.tenant_id, r.user_id]));
    const userMap = new globalThis.Map<any, any>((ownerUsers || []).map((u: any) => [u.id, u]));

    const restaurants: FoodRestaurant[] = (tenantsData || []).map((t: any) => {
      const ownerUserId = ownerRoleMap.get(t.id);
      const ownerUser = ownerUserId ? userMap.get(ownerUserId) : null;
      return {
        tenant_id: t.id,
        display_name: t.business_name || 'Unknown Restaurant',
        email: ownerUser?.email || '',
        phone: ownerUser?.phone || ''
      };
    });
    setRestaurantsList(restaurants);
    setLoadingRestaurants(false);
  };

  useEffect(() => {
    if (showAddModal) fetchRestaurants();
  }, [showAddModal]);

  const filteredRestaurants = restaurantsList.filter(s => {
    const term = restaurantSearch.trim().toLowerCase();
    if (term === '') return true;
    return s.display_name.toLowerCase().includes(term) || s.email.toLowerCase().includes(term) || s.phone.includes(term);
  }).slice(0, 20);

  const fetchItemsForRestaurant = async (tenantId: string, term: string) => {
    setSearching(true);
    const supabase = getSupabaseClient();
    if (!supabase) { setSearching(false); return; }
    let query = supabase
      .from('restaurant_menu_items')
      .select('id, item_name, photo, tenant_id, price')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .limit(20);
    if (term.trim() !== '') {
      query = query.ilike('item_name', `%${term}%`);
    }
    const { data } = await query;
    setItemResults(data || []);
    setSearching(false);
  };

  useEffect(() => {
    if (selectedRestaurant) fetchItemsForRestaurant(selectedRestaurant.tenant_id, '');
  }, [selectedRestaurant]);

  const searchItems = (term: string) => {
    setItemSearch(term);
    if (!selectedRestaurant) return;
    fetchItemsForRestaurant(selectedRestaurant.tenant_id, term);
  };

  const resetModal = () => {
    setShowAddModal(false);
    setSelectedRestaurant(null);
    setRestaurantSearch('');
    setSelectedItem(null);
    setItemSearch('');
    setItemResults([]);
    setDisplayOrder('1');
  };

  const handleAddSponsored = async () => {
    if (!selectedItem) { toast.error('Select an item first'); return; }
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { error } = await supabase.from('food_sponsored_placements').insert({
      menu_item_id: selectedItem.id,
      tenant_id: selectedItem.tenant_id,
      placement_type: placementType,
      display_order: parseInt(displayOrder) || 1,
      is_paid: false,
      payment_status: 'waived',
      is_active: true
    });

    if (error) { toast.error(error.message); return; }
    toast.success('Item added to sponsored list');
    resetModal();
    fetchSponsoredList();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this sponsored placement?')) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from('food_sponsored_placements').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Removed');
    fetchSponsoredList();
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from('food_sponsored_placements').update({ is_active: !current }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    fetchSponsoredList();
  };

  const placementLabel = (type: string) => {
    if (type === 'sponsored_feed') return 'Sponsored Feed Position';
    if (type === 'homepage_featured') return 'Homepage Featured Row';
    return type;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Food Sponsored Items</h1>
          <p className="text-slate-500 dark:text-slate-400">Control which dishes appear on top of the Food feed.</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>Add Sponsored Item</Button>
      </div>

      <Card className="dark:bg-slate-900 dark:border-slate-800 border-none shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-medium">
              <tr>
                <th className="px-6 py-4">Item</th>
                <th className="px-6 py-4">Restaurant</th>
                <th className="px-6 py-4">Placement</th>
                <th className="px-6 py-4">Order</th>
                <th className="px-6 py-4">Active</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 dark:bg-slate-900">
              {sponsoredList.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {row.photo ? <img src={row.photo} alt="" className="w-full h-full object-cover" /> : <Utensils size={16} className="text-slate-400" />}
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-white">{row.item_name}</span>
                  </td>
                  <td className="px-6 py-4 dark:text-slate-300">{row.restaurant_name}</td>
                  <td className="px-6 py-4 dark:text-slate-300">{placementLabel(row.placement_type)}</td>
                  <td className="px-6 py-4 dark:text-slate-300">{row.display_order}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleToggleActive(row.id, row.is_active)} className={`px-2 py-1 rounded-full text-xs font-medium ${row.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                      {row.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:border-slate-700" onClick={() => handleDelete(row.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
              {sponsoredList.length === 0 && !loading && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">No sponsored items yet. Click "Add Sponsored Item" to feature one.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Add Sponsored Item</CardTitle>
              <Button variant="ghost" size="icon" onClick={resetModal}><X size={16} /></Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedRestaurant ? (
                <div>
                  <label className="text-sm font-medium block mb-2">Search Restaurant (name, email, or mobile)</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      className="pl-9"
                      placeholder="Type restaurant name, email, or mobile..."
                      value={restaurantSearch}
                      onChange={(e) => setRestaurantSearch(e.target.value)}
                    />
                  </div>
                  <div className="mt-3 max-h-64 overflow-y-auto space-y-2">
                    {loadingRestaurants && <p className="text-sm text-slate-400">Loading restaurants...</p>}
                    {!loadingRestaurants && filteredRestaurants.length === 0 && (
                      <p className="text-sm text-slate-400">No active Hospitality restaurants found.</p>
                    )}
                    {filteredRestaurants.map((s) => (
                      <div
                        key={s.tenant_id}
                        onClick={() => setSelectedRestaurant(s)}
                        className="flex items-center gap-3 p-2 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900"
                      >
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                          <Building2 size={16} className="text-slate-400" />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-slate-900 dark:text-slate-100">{s.display_name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{s.email || s.phone || 'No contact info'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : !selectedItem ? (
                <div>
                  <button
                    onClick={() => { setSelectedRestaurant(null); setItemSearch(''); setItemResults([]); }}
                    className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline mb-3"
                  >
                    <ArrowLeft size={14} /> Change Restaurant
                  </button>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mb-3">
                    <Building2 size={18} className="text-slate-400" />
                    <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">{selectedRestaurant.display_name}</span>
                  </div>
                  <label className="text-sm font-medium block mb-2">Search Item</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      className="pl-9"
                      placeholder="Type item name..."
                      value={itemSearch}
                      onChange={(e) => searchItems(e.target.value)}
                    />
                  </div>
                  <div className="mt-3 max-h-64 overflow-y-auto space-y-2">
                    {searching && <p className="text-sm text-slate-400">Searching...</p>}
                    {!searching && itemResults.length === 0 && (
                      <p className="text-sm text-slate-400">No items found for this restaurant.</p>
                    )}
                    {itemResults.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => setSelectedItem(p)}
                        className="flex items-center gap-3 p-2 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900"
                      >
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {p.photo ? <img src={p.photo} alt="" className="w-full h-full object-cover" /> : <Utensils size={16} className="text-slate-400" />}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-slate-900 dark:text-slate-100">{p.item_name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">₹{p.price}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline mb-1"
                  >
                    <ArrowLeft size={14} /> Change Item
                  </button>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="w-12 h-12 rounded-lg bg-white dark:bg-slate-950 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {selectedItem.photo ? <img src={selectedItem.photo} alt="" className="w-full h-full object-cover" /> : <Utensils size={18} className="text-slate-400" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">{selectedItem.item_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{selectedRestaurant.display_name} · ₹{selectedItem.price}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Placement</label>
                    <Select value={placementType} onValueChange={setPlacementType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sponsored_feed">Sponsored Feed Position</SelectItem>
                        <SelectItem value="homepage_featured">Homepage Featured Row</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Display Order</label>
                    <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(e.target.value)} />
                  </div>
                  <Button className="w-full" onClick={handleAddSponsored}>Add to Sponsored List</Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
