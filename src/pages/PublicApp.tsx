import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Home, ShoppingBag, Wallet, ShoppingCart, User as UserIcon, Search, Stethoscope, GraduationCap, Truck, ArrowLeft, Store, Package, Clock, Utensils, LayoutDashboard, Sprout, Settings, X, Check, Navigation, ScanLine, Bed, ChefHat, Bus, Building2, Recycle, Briefcase, Wrench, Zap, FileText, Tag, Shield, MapPin, ChevronDown, Bell, Calendar, CreditCard, Star } from 'lucide-react';
import { PaymentBottomSheet } from '../components/PaymentComponents';
import { Card, CardContent } from '@/src/components/ui/card';
import { Input } from '@/src/components/ui/input';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { Button } from '@/src/components/ui/button';
import { Product } from '@/src/types';
import { getSupabaseClient } from '../lib/supabase';
import { ConsumerAuthModal } from '../components/consumer/ConsumerAuthModal';
import { CompleteProfileModal } from '../components/consumer/CompleteProfileModal';
import { ConsumerProfileView } from '../components/consumer/ConsumerProfileView';
import { NotificationBell } from '../components/NotificationBell';
import { SavedAddressesView } from '../components/consumer/SavedAddressesView';
import { OrderHistoryView } from '../components/consumer/OrderHistoryView';
import { MoveView } from '../components/consumer/MoveView';
import { MartHome } from '../components/mart/MartHome';
import { CategoryQuickNav } from '../components/mart/CategoryQuickNav';
import { HospitalityFoodApp, FoodCategoryQuickNav, FoodCartCheckout } from '../components/hospitality/HospitalityComponents';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

export default function PublicApp() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('home');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<{product: Product, quantity: number}[]>([]);
  const [foodCart, setFoodCart] = useState<{menu_item_id: string, item_name: string, price: number, quantity: number, tenant_id: string, tenant_name: string}[]>([]);
  const [foodCategories, setFoodCategories] = useState<any[]>([]);
  const [selectedFoodCategoryId, setSelectedFoodCategoryId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    supabase.from('food_categories').select('*').eq('is_active', true).order('display_order')
      .then(({ data }: any) => { if (data) setFoodCategories(data); });
  }, []);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'form'>('cart');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [checkoutLat, setCheckoutLat] = useState<number | null>(null);
  const [checkoutLng, setCheckoutLng] = useState<number | null>(null);

  const [district, setDistrict] = useState('');
  const [categorySearchTerm, setCategorySearchTerm] = useState('');

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      toast.info("Fetching your location...");
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCheckoutLat(lat);
          setCheckoutLng(lng);
          toast.success("Location updated. You can drag the pin to adjust.");
          
          try {
            if ((window as any).google) {
              const geocoder = new (window as any).google.maps.Geocoder();
              const response = await geocoder.geocode({ location: { lat, lng } });
              if (response.results && response.results[0]) {
                const addr = response.results[0].formatted_address;
                setDeliveryAddress(addr);
                const components = response.results[0].address_components || [];
                const districtComponent = components.find((c: any) => c.types.includes('administrative_area_level_2'))
                  || components.find((c: any) => c.types.includes('administrative_area_level_3'))
                  || components.find((c: any) => c.types.includes('locality'));
                if (districtComponent) setDistrict(districtComponent.long_name);
              }
            }
          } catch (err) {
            console.warn("Reverse geocode failed", err);
          }
        },
        (err) => {
          console.error(err);
          toast.error("Failed to get location. Please check browser permissions.");
        },
        { enableHighAccuracy: true }
      );
    } else {
      toast.error("Geolocation is not supported by your browser");
    }
  };
  const [checkoutPhone, setCheckoutPhone] = useState('');
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'wallet'>('cod');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [showAddressSelector, setShowAddressSelector] = useState(false);
  const [saveNewAddress, setSaveNewAddress] = useState(true);
  const [checkoutAddressObj, setCheckoutAddressObj] = useState<any>(null);
  const { user, logout } = useAuth();

  useEffect(() => {
    if (!user) return;
    const checkNotMerchant = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data: consumerRole } = await supabase.from('consumer_profiles').select('*').eq('user_id', user.id).maybeSingle();
      if (!consumerRole) {
        const { data: merchantRole } = await supabase.from('user_tenant_roles').select('*').eq('user_id', user.id).eq('is_active', true).limit(1);
        if (merchantRole && merchantRole.length > 0) {
          await logout();
          toast.error("This account is registered as a merchant/partner account. Please use a different account to shop here.");
        }
      }
    };
    checkNotMerchant();
  }, [user, logout]);

  const { tenant, resetTenant } = useTenant();
  useDocumentTitle(tenant ? `${tenant.brand_name}` : 'BahiBox | Public App');
  
  useEffect(() => {
    if (user && checkoutStep === 'form') {
      const fetchWalletBalance = async () => {
        const supabase = getSupabaseClient();
        if(!supabase) return;
        const { data } = await supabase.rpc('get_or_create_platform_wallet', { p_user_id: user.id });
        if(data) {
           const { data: wData } = await supabase.from('wallet_accounts').select('current_balance').eq('id', data).single();
           if(wData) setWalletBalance(wData.current_balance);
        }
      };
      fetchWalletBalance();
    }
    
    if (user && checkoutStep === 'form') {
      const fetchDefaultAddress = async () => {
        const supabase = getSupabaseClient();
        if (!supabase) return;
        const { data } = await supabase
          .from('consumer_addresses')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_default', true)
          .maybeSingle();
          
        if (data && !checkoutAddressObj && !deliveryAddress) {
          setCheckoutAddressObj(data);
          setDeliveryAddress(`${data.address_line}, ${data.city}, ${data.state} - ${data.pincode}`);
          setCheckoutPhone(data.contact_phone);
        } else if (!data && !checkoutAddressObj && !deliveryAddress) {
          // If no default, try to get any address
          const { data: anyData } = await supabase
            .from('consumer_addresses')
            .select('*')
            .eq('user_id', user.id)
            .limit(1)
            .maybeSingle();
          if (anyData) {
            setCheckoutAddressObj(anyData);
            setDeliveryAddress(`${anyData.address_line}, ${anyData.city}, ${anyData.state} - ${anyData.pincode}`);
            setCheckoutPhone(anyData.contact_phone);
          } else {
             // Let them enter manually
             setCheckoutPhone(user.phone || '');
          }
        }
      };
      fetchDefaultAddress();
    }
  }, [user, checkoutStep]);
  
  const userName = user?.user_metadata?.full_name || user?.displayName || user?.email?.split('@')[0] || 'Guest User';
  const userInitials = userName.split(' ').map((n: any) => n[0]).join('').substring(0, 2).toUpperCase();

  const [showAuthGuard, setShowAuthGuard] = useState(false);
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);

  useEffect(() => {
    const checkProfile = async () => {
      if (!user) return;
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data } = await supabase.from('users').select('full_name').eq('id', user.id).maybeSingle();
      if (data && (!data.full_name || data.full_name === 'Unknown User')) {
        setShowCompleteProfile(true);
      }
    };
    checkProfile();
  }, [user]);
  const [selectedStore, setSelectedStore] = useState<{tenant_id: string, branch_id: string, name: string, logo: string, color: string} | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [marketplaceProducts, setMarketplaceProducts] = useState<any[]>([]);
  const [martCategories, setMartCategories] = useState<any[]>([]);
  const [selectedMartCategoryId, setSelectedMartCategoryId] = useState<string | null>(null);
  const [marketplaceStores, setMarketplaceStores] = useState<any[]>([]);
  const [marketplaceLoading, setMarketplaceLoading] = useState(false);
  const [marketplaceViewMode, setMarketplaceViewMode] = useState<'products' | 'shops'>('products');
  const [marketplaceSearch, setMarketplaceSearch] = useState('');
  const [cartViewMode, setCartViewMode] = useState<'products' | 'food'>('products');
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [comingSoonCategory, setComingSoonCategory] = useState<string | null>(null);
  
  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const p = 0.017453292519943295;
    const c = Math.cos;
    const a = 0.5 - c((lat2 - lat1) * p)/2 + 
            c(lat1 * p) * c(lat2 * p) * 
            (1 - c((lon2 - lon1) * p))/2;
    return 12742 * Math.asin(Math.sqrt(a));
  }
    
  const handleGuardedAction = () => {
    if (!user) {
      setShowAuthGuard(true);
      return false;
    }
    return true;
  };

  
  const addToCart = (product: Product, quantity: number = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item);
      }
      return [...prev, { product, quantity }];
    });
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    setCart(prev => {
      if (quantity <= 0) {
        return prev.filter(item => item.product.id !== productId);
      }
      return prev.map(item => item.product.id === productId ? { ...item, quantity } : item);
    });
  };
  
  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const resolveCheckoutStore = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return { tId: null, bId: null };

    const activeTenantId = selectedStore?.tenant_id || tenant?.merchant_id;
    const activeBranchId = selectedStore?.branch_id;

    let tId = activeTenantId;
    let bId = activeBranchId;

    if (tenant?.merchant_id && !selectedStore) {
      const { data: roles } = await supabase
        .from('user_tenant_roles')
        .select('tenant_id')
        .eq('user_id', tenant.merchant_id)
        .limit(1);
      if (roles?.[0]?.tenant_id) tId = roles[0].tenant_id;

      const { data: branchData } = await supabase
        .from('branches')
        .select('id')
        .eq('tenant_id', tId)
        .eq('module_key', 'retail')
        .eq('is_online_store_active', true)
        .limit(1);
      if (branchData?.[0]?.id) bId = branchData[0].id;
    }

    if ((!tId || !bId) && cart.length > 0 && (cart[0].product as any)?.store) {
      tId = tId || (cart[0].product as any).tenant_id;
      bId = bId || (cart[0].product as any).store.id;
    }

    return { tId, bId };
  };

  const handleOpenPaymentSheet = () => {
    if (cart.length === 0) return;
    if (!deliveryAddress.trim() || !checkoutPhone.trim()) {
      alert("Please enter both delivery address and phone number.");
      return;
    }
    setShowPaymentSheet(true);
  };

  const handleCreateOrder = async (selectedPaymentMethod: 'cod' | 'wallet' | 'wallet_plus_online' | 'online') => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Connection error');

    const { tId, bId } = await resolveCheckoutStore();
    if (!tId || !bId) {
      throw new Error("Store information is incomplete. Cannot place order.");
    }
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;
    if (!userId) {
      throw new Error("You must be logged in to place an order.");
    }

    const { data, error } = await supabase.rpc('create_online_order', {
      p_tenant_id: tId,
      p_branch_id: bId,
      p_user_id: userId,
      p_customer_name: userName || 'Guest',
      p_customer_phone: checkoutPhone,
      p_delivery_address: deliveryAddress,
      p_payment_method: selectedPaymentMethod,
      p_items: cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity
      })),
      p_latitude: checkoutAddressObj?.latitude || checkoutLat || null,
      p_longitude: checkoutAddressObj?.longitude || checkoutLng || null
    });
    if (error) {
      throw new Error(error.message);
    }
    return data;
  };

  const handlePaymentConfirmed = (result: any) => {
    setCart([]);
    setCheckoutStep('cart');
    setActiveTab('orders');
    setShowPaymentSheet(false);
    toast.success('Order placed successfully! Total: ₹' + result.total);
  };

  const handleCheckout = () => {
    if (!handleGuardedAction()) return;
    setCheckoutPhone(''); // Pre-filling could be done if we fetched user profile
    setCheckoutStep('form');
  };
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
          .eq('module_key', 'retail')
          .eq('is_online_store_active', true)
          
        if (branchesError) console.error("Branches fetch error:", branchesError);
        
        if (!branchesData || branchesData.length === 0) {
          if (isMounted) { setMarketplaceStores([]); setMarketplaceProducts([]); setMarketplaceLoading(false); }
          return;
        }

        const tenantIds = [...new Set(branchesData.map((b: any) => b.tenant_id))];

        const { data: retailSubsData } = await supabase
          .from('merchant_subscriptions')
          .select('tenant_id, subscription_plans!inner(module_key)')
          .in('tenant_id', tenantIds)
          .eq('status', 'active')
          .eq('subscription_plans.module_key', 'retail');

        const retailEligibleIds = [...new Set((retailSubsData || []).map((s: any) => s.tenant_id))];

        const { data: tenantsData, error: tenantsError } = await supabase
          .from('tenants')
          .select('id, business_name, business_type')
          .in('id', retailEligibleIds.length > 0 ? retailEligibleIds : ['00000000-0000-0000-0000-000000000000']);
          
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
          .in('merchant_id', retailTenantIds);
          
        const tenantsMap = new globalThis.Map(tenantsData.map((t: any) => [t.id, t]));
        const brandingMap = new globalThis.Map(brandingData?.map((b: any) => [b.merchant_id, b]));
        
        const stores = retailBranches.map((branch: any) => {
          const brand = brandingMap.get(branch.tenant_id) as any;
          return {
             ...branch,
             branch_name: branch.branch_name || (tenantsMap.get(branch.tenant_id) as any)?.business_name || 'Unknown Store',
             brand_name: brand?.brand_name || branch.branch_name || (tenantsMap.get(branch.tenant_id) as any)?.business_name || 'Unknown Store',
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
  }, [selectedCategory]);
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
  }, [tenant, selectedStore]);
  


  const AppContent = (
    <div className="min-h-screen bg-[#111A2E] dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200 flex flex-col relative">
        
                                        {/* Header */}
        {!selectedCategory && !selectedProduct && activeTab !== 'cart' && (
        <header className="z-10 sticky top-0 bg-[#111A2E] dark:bg-slate-950 pt-2">
          <div className="bg-white dark:bg-slate-900 px-4 pt-4 pb-4 rounded-t-2xl border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-start justify-between mb-4 mt-2">
              <div className="flex items-start gap-2">
                <div className="text-orange-500 mt-1">
                  <MapPin size={28} className="stroke-[2.5]" />
                </div>
                <div className="flex flex-col">
                  <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">APNA BAHRAICH</h1>
                  <div 
                    className="flex items-center text-blue-700 dark:text-blue-400 font-bold text-sm cursor-pointer mt-0.5"
                    onClick={handleUseCurrentLocation}
                  >
                     {district || 'Set location'} <ChevronDown size={16} className="ml-1 stroke-[3]" />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button className="text-blue-700 dark:text-blue-400 hover:opacity-80">
                  <Bell size={26} className="stroke-[2.5]" />
                </button>
                <div 
                  className="w-10 h-10 border-2 border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center text-orange-500 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer" 
                  onClick={() => {
                    if (user) {
                      setActiveTab('profile');
                    } else {
                      setShowAuthGuard(true);
                    }
                  }}
                >
                  {user ? <span className="font-bold text-slate-800 dark:text-white">{userInitials}</span> : <UserIcon size={24} className="stroke-[2.5]" />}
                </div>
              </div>
            </div>
            
            <div className="relative mb-5">
              <Search className="absolute left-3 top-3.5 h-5 w-5 text-orange-500 stroke-[2.5]" />
              <Input 
                placeholder="Search for services, food, jobs..." 
                value={categorySearchTerm}
                onChange={(e) => setCategorySearchTerm(e.target.value)}
                className="pl-10 pr-12 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 h-12 rounded-xl w-full shadow-sm text-[15px]"
              />
              <div className="absolute right-3 top-3.5 text-blue-500 cursor-pointer">
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
              </div>
            </div>

            <div className="w-full bg-gradient-to-r from-blue-700 to-orange-500 rounded-xl overflow-hidden relative shadow-md">
               <div className="p-4 flex flex-col justify-center relative z-10 w-2/3">
                 <h2 className="text-white font-bold text-xl mb-1 drop-shadow-sm">अब Bahraich में सब कुछ</h2>
                 <p className="text-white/95 text-[11px] font-medium drop-shadow-sm">One App for Ride • Food • Grocery • Jobs & More</p>
               </div>
               <div className="absolute right-0 bottom-0 h-full w-1/3 flex items-end justify-end overflow-hidden opacity-90">
                  <svg viewBox="0 0 100 80" className="w-full h-full" preserveAspectRatio="xMaxYMax meet">
                    <rect x="50" y="30" width="15" height="40" fill="#ffffff" opacity="0.2" rx="2" />
                    <rect x="70" y="20" width="20" height="50" fill="#ffffff" opacity="0.3" rx="2" />
                    <rect x="30" y="40" width="15" height="30" fill="#ffffff" opacity="0.1" rx="2" />
                    <rect x="65" y="55" width="20" height="25" fill="#f97316" rx="2" />
                    <path d="M70 55 v-5 a5 5 0 0 1 10 0 v5" fill="none" stroke="#f97316" strokeWidth="2" />
                    <path d="M30 65 L45 65 L50 55 L55 55 L55 75 L30 75 Z" fill="#2563eb" />
                    <circle cx="35" cy="75" r="5" fill="#1e293b" />
                    <circle cx="50" cy="75" r="5" fill="#1e293b" />
                    <rect x="42" y="48" width="12" height="10" fill="#f97316" />
                  </svg>
               </div>
            </div>
        </div></header>
        )}

        {/* Scrollable Content */}
        <main className="flex-1 bg-white dark:bg-slate-900 overflow-auto pb-24 md:pb-8 pt-6 px-4 md:px-8 mx-auto w-full space-y-6">
          {activeTab === 'profile' && user && (
            <ConsumerProfileView 
              onLogout={async () => {
                const supabase = getSupabaseClient();
                if (supabase) {
                  await supabase.auth.signOut();
                  setActiveTab('home');
                }
              }}
              tenantColor={tenant?.primary_color}
            />
          )}
          
          {activeTab === 'home' && (
            tenant ? (
              // MODE A: TENANT SPECIFIC
              <div className="space-y-6">
                {selectedProduct ? (
                  <ProductDetailView
                    product={selectedProduct}
                    tenantColor={tenant.primary_color || '#3b82f6'}
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
                ) : (
                  <StoreProductGrid 
                    products={products} 
                    addToCart={(p) => addToCart(p, 1)} 
                    onProductClick={setSelectedProduct}
                    tenantColor={tenant.primary_color || '#3b82f6'} 
                  />
                )}
                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                  <Button 
                    onClick={resetTenant}
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2 border-2 text-slate-700 dark:text-slate-300 rounded-xl h-12"
                  >
                    <ArrowLeft size={16} /> Explore BahiBox Ecosystem
                  </Button>
                </div>
              </div>
            ) : (
              // MODE B: BAHIBOX SUPER APP
              <>
                {selectedStore ? (
                  selectedProduct ? (
                    <ProductDetailView
                      product={selectedProduct}
                      tenantColor={selectedStore.color}
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
                  ) : (
                    <StoreProductGrid 
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
                    tenantColor={(selectedProduct as any).store?.primary_color || '#3b82f6'}
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
                ) : selectedCategory === 'Mart' ? (
                  <div className="flex flex-col bg-slate-50 font-sans min-h-full -mt-6 -mx-4 md:-mx-8">
                    {/* Header */}
                    <div className="bg-[#111A2E] px-4 pt-12 pb-6 text-white rounded-b-[24px]">
                      <div className="flex items-center gap-3">
                        <ArrowLeft size={24} className="text-white cursor-pointer" onClick={() => setSelectedCategory(null)} />
                        <h1 className="text-xl font-bold text-white flex items-center gap-2">
                          <ShoppingBag className="text-orange-400" size={20} /> Order Product
                        </h1>
                      </div>
                    </div>

                    {/* Search Bar - Overlapping Header */}
                    <div className="px-4 -mt-5 relative z-10">
                      <div className="relative shadow-sm rounded-xl overflow-hidden bg-white border border-slate-200">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Search className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                          type="text"
                          className="block w-full pl-10 pr-3 py-3.5 border-none focus:ring-0 text-[15px] placeholder-slate-400 bg-white text-slate-900"
                          placeholder={marketplaceViewMode === 'shops' ? "Search for shops, brands..." : "Search for products..."}
                          value={marketplaceSearch}
                          onChange={(e) => setMarketplaceSearch(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Tabs */}
                    <div className="px-4 mt-5 flex gap-2">
                      <button
                        onClick={() => setMarketplaceViewMode('shops')}
                        className={`flex-1 py-2.5 px-2 rounded-full text-[12px] sm:text-[13px] font-bold transition-colors border ${
                          marketplaceViewMode === 'shops'
                            ? 'bg-[#ea580c] text-white border-[#ea580c]'
                            : 'bg-white text-slate-700 border-slate-300'
                        }`}
                      >
                        Search by Shop
                      </button>
                      <button
                        onClick={() => setMarketplaceViewMode('products')}
                        className={`flex-1 py-2.5 px-2 rounded-full text-[12px] sm:text-[13px] font-bold transition-colors border ${
                          marketplaceViewMode === 'products'
                            ? 'bg-[#ea580c] text-white border-[#ea580c]'
                            : 'bg-white text-slate-700 border-slate-300'
                        }`}
                      >
                        Search by Product
                      </button>
                    </div>

                    <div className="pb-20">
                      {marketplaceLoading ? (
                         <div className="flex justify-center items-center h-40">
                           <div className="w-8 h-8 border-4 border-slate-300 dark:border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
                         </div>
                      ) : (
                      <>
                      {(marketplaceSearch.trim() === '' || marketplaceViewMode === 'shops') && (
                        <div className="px-4 mt-6">
                          <div className="flex justify-between items-center mb-4">
                            <h2 className="text-[19px] font-bold text-slate-900">Featured Shops</h2>
                            <span className="text-[#ea580c] font-bold text-[15px] flex items-center cursor-pointer">
                              › See All
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            {marketplaceStores.filter((s: any) => 
                              (s.brand_name || s.branch_name).toLowerCase().includes(marketplaceSearch.toLowerCase()) || 
                              (s.city || '').toLowerCase().includes(marketplaceSearch.toLowerCase())
                            ).map((store: any) => {
                              let distText = '25 min';
                              if (userLocation && store.latitude && store.longitude) {
                                 const dist = calculateDistance(userLocation.lat, userLocation.lng, store.latitude, store.longitude);
                                 distText = dist < 1 ? `${Math.round(dist * 1000)}m away` : `${dist.toFixed(1)}km away`;
                              }
                              return (
                                <div 
                                  key={store.id} 
                                  onClick={() => {
                                    setSelectedStore({ tenant_id: store.tenant_id, branch_id: store.id, name: store.brand_name || store.branch_name, logo: store.logo_url, color: store.primary_color });
                                  }}
                                  className="bg-white p-4 rounded-[16px] border border-slate-200 shadow-sm flex flex-col items-center text-center cursor-pointer hover:shadow-md transition-shadow"
                                >
                                  <div className="w-16 h-16 mb-3 overflow-hidden flex-shrink-0 bg-slate-50 rounded-xl flex items-center justify-center">
                                    {store.logo_url ? (
                                      <img src={store.logo_url} alt={store.brand_name} className="w-full h-full object-contain" />
                                    ) : (
                                      <Store size={32} className="text-slate-300" />
                                    )}
                                  </div>
                                  <h3 className="font-bold text-slate-900 text-[16px] mb-1.5 leading-tight line-clamp-1">{store.brand_name || store.branch_name}</h3>
                                  <div className="flex items-center text-slate-600 text-[13px] mb-2.5 font-medium">
                                    <Star size={13} className="text-slate-500 mr-1" />
                                    <span>4.5</span>
                                    <span className="mx-1.5">•</span>
                                    <span>{distText}</span>
                                  </div>
                                  <div className="bg-[#ecfdf5] text-[#059669] text-[12px] font-bold px-2.5 py-1 rounded-full flex items-center">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] mr-1.5"></span>
                                    Open • Now
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {marketplaceStores.filter((s: any) => 
                            (s.brand_name || s.branch_name).toLowerCase().includes(marketplaceSearch.toLowerCase()) || 
                            (s.city || '').toLowerCase().includes(marketplaceSearch.toLowerCase())
                          ).length === 0 && (
                            <div className="text-center py-12">
                              <Store size={48} className="mx-auto text-slate-300 mb-4" />
                              <h3 className="text-lg font-bold text-slate-900 mb-1">No shops found</h3>
                              <p className="text-slate-500 text-sm">Try adjusting your search.</p>
                            </div>
                          )}
                        </div>
                      )}
                      {(marketplaceSearch.trim() === '' || marketplaceViewMode === 'products') && (
                        <div className="px-4 mt-6">
                          <div className="flex justify-between items-center mb-4">
                            <h2 className="text-[19px] font-bold text-slate-900">Popular Products</h2>
                            <span className="text-[#ea580c] font-bold text-[15px] cursor-pointer">
                              See All
                            </span>
                          </div>
                          
                          <div className="space-y-3">
                            {marketplaceProducts.filter(p => p.name.toLowerCase().includes(marketplaceSearch.toLowerCase())).map(product => {
                              const isOutOfStock = product.stock === 0;
                              return (
                                <div 
                                  key={product.uniqueKey} 
                                  onClick={() => setSelectedProduct(product)}
                                  className={`bg-white p-3 rounded-[16px] border border-slate-200 shadow-sm flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow ${isOutOfStock ? 'opacity-60' : ''}`}
                                >
                                  <div className="w-[60px] h-[60px] rounded-lg overflow-hidden flex-shrink-0 border border-slate-100 p-1 bg-slate-50 flex items-center justify-center">
                                    {product.image ? (
                                      <img src={product.image} alt={product.name} className="w-full h-full object-contain" />
                                    ) : (
                                      <Package size={24} className="text-slate-300" />
                                    )}
                                  </div>
                                  
                                  <div className="flex-1 min-w-0 py-1">
                                    <h3 className="font-bold text-slate-900 text-[16px] mb-1 truncate">{product.name}</h3>
                                    <div className="flex items-center text-slate-500 text-[13px] font-medium">
                                      <span className="text-slate-800 font-bold">₹{product.price}</span>
                                      {product.mrp && product.mrp > product.price && (
                                        <span className="text-xs text-slate-400 line-through ml-1">₹{product.mrp}</span>
                                      )}
                                      <span className="mx-1.5">•</span>
                                      <span className="truncate max-w-[60px]">{(product as any).store.brand_name || (product as any).store.branch_name}</span>
                                      <span className="mx-1.5">•</span>
                                      <Star size={12} className="text-slate-400 mr-1" />
                                      <span>4.2</span>
                                    </div>
                                  </div>
                                  
                                  <button 
                                    disabled={isOutOfStock}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!isOutOfStock) {
                                        addToCart(product, 1);
                                      }
                                    }}
                                    className={`flex-shrink-0 border-[1.5px] font-bold text-[14px] px-4 py-1.5 rounded-lg transition-colors ${
                                      isOutOfStock 
                                        ? 'border-slate-300 text-slate-400 bg-slate-50' 
                                        : 'border-[#ea580c] text-[#ea580c] hover:bg-orange-50'
                                    }`}
                                  >
                                    {isOutOfStock ? 'OUT' : '+ADD'}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                          {marketplaceProducts.filter(p => p.name.toLowerCase().includes(marketplaceSearch.toLowerCase())).length === 0 && (
                            <div className="text-center py-12">
                              <ShoppingBag size={48} className="mx-auto text-slate-300 mb-4" />
                              <h3 className="text-lg font-bold text-slate-900 mb-1">No products found</h3>
                              <p className="text-slate-500 text-sm">Try adjusting your search.</p>
                            </div>
                          )}
                        </div>
                      )}
                      </>
                      )}
                    </div>
                  </div>
                ) : selectedCategory === 'Food' ? (
                  <div className="flex flex-col bg-slate-50 font-sans min-h-full -mt-6 -mx-4 md:-mx-8">
                    <div className="bg-[#111A2E] px-4 pt-12 pb-6 text-white rounded-b-[24px]">
                      <div className="flex items-center gap-3">
                        <ArrowLeft size={24} className="text-white cursor-pointer" onClick={() => setSelectedCategory(null)} />
                        <h1 className="text-xl font-bold text-white flex items-center gap-2">
                          <Utensils className="text-orange-400" size={20} /> Order Food
                        </h1>
                      </div>
                    </div>
                    <HospitalityFoodApp foodCart={foodCart} setFoodCart={setFoodCart} embedded={true} />
                  </div>
                ) : (
                  <div className="space-y-8">
                    
                    {/* BahiBox Super App (Secondary) */}
                    <div>
                      <div className="mx-2 mb-5 rounded-2xl bg-gradient-to-r from-blue-600 to-orange-500 p-4">
                        <p className="font-bold text-lg text-white">Everything, right here!</p>
                        <p className="text-sm text-white/90">One App for Ride • Food • Mart • Jobs & More</p>
                      </div>
                      <div className="flex items-center justify-between px-2 mb-4">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Categories</h2>
                        <button className="text-sm font-semibold text-orange-500">See All &gt;</button>
                      </div>
                      <div className="grid grid-cols-4 gap-y-4 gap-x-2">
                        {(() => {
                          const categoryList = [
                            { icon: ShoppingBag, label: "Mart", color: "bg-blue-100 text-blue-600", onClick: () => setSelectedCategory('Mart') },
                            { icon: ScanLine, label: "Scan & Go", color: "bg-indigo-100 text-indigo-600", onClick: () => navigate('/scan-go') },
                            { icon: Bed, label: "Stay", color: "bg-purple-100 text-purple-600", onClick: () => navigate('/stay') },
                            { icon: Utensils, label: "Food", color: "bg-orange-100 text-orange-600", onClick: () => setSelectedCategory('Food') },
                            { icon: Stethoscope, label: "Care", color: "bg-emerald-100 text-emerald-600", onClick: () => setComingSoonCategory('Care') },
                            { icon: Truck, label: "Move", color: "bg-yellow-100 text-yellow-600", onClick: () => { if (handleGuardedAction()) setActiveTab('move'); } },
                            { icon: LayoutDashboard, label: "Classified", color: "bg-purple-100 text-purple-600", onClick: () => setComingSoonCategory('Classified') },
                            { icon: Sprout, label: "Agri-Tech", color: "bg-green-100 text-green-600", onClick: () => setComingSoonCategory('Agri-Tech') },
                            { icon: UserIcon, label: "MyLife", color: "bg-pink-100 text-pink-600", onClick: () => setComingSoonCategory('MyLife') },
                            { icon: Settings, label: "Utility", color: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400", onClick: () => setComingSoonCategory('Utility') },
                            { icon: ChefHat, label: "Restaurant", color: "bg-red-100 text-red-600", onClick: () => setComingSoonCategory('Restaurant') },
                            { icon: Bus, label: "Bus/Taxi", color: "bg-cyan-100 text-cyan-600", onClick: () => setComingSoonCategory('Bus/Taxi Booking') },
                            { icon: Building2, label: "Property", color: "bg-amber-100 text-amber-600", onClick: () => setComingSoonCategory('Property') },
                            { icon: Recycle, label: "Buy & Sell", color: "bg-lime-100 text-lime-600", onClick: () => setComingSoonCategory('Buy & Sell Old') },
                            { icon: Briefcase, label: "Jobs", color: "bg-violet-100 text-violet-600", onClick: () => setComingSoonCategory('Jobs') },
                            { icon: Wrench, label: "Home Services", color: "bg-teal-100 text-teal-600", onClick: () => setComingSoonCategory('Home Services') },
                          ];
                          const filtered = categorySearchTerm.trim() === ''
                            ? categoryList
                            : categoryList.filter(c => c.label.toLowerCase().includes(categorySearchTerm.trim().toLowerCase()));
                          return filtered.map((c, idx) => (
                            <ServiceIcon key={idx} icon={c.icon} label={c.label} color={c.color} onClick={c.onClick} />
                          ));
                        })()}
                      </div>

                      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3 mt-6 px-2">Quick Services</h2>
                      <div className="grid grid-cols-2 gap-3 px-2">
                        <button onClick={() => setComingSoonCategory('Recharge')} className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-semibold text-sm">
                          <Zap size={18} /> Recharge
                        </button>
                        <button onClick={() => setComingSoonCategory('Bill Payments')} className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-semibold text-sm">
                          <FileText size={18} /> Bill Payments
                        </button>
                        <button onClick={() => setComingSoonCategory('Offers')} className="flex items-center gap-2 p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 font-semibold text-sm">
                          <Tag size={18} /> Offers
                        </button>
                        <button onClick={() => setComingSoonCategory('Insurance')} className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-semibold text-sm">
                          <Shield size={18} /> Insurance
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )
          )}
          
          {activeTab === 'orders' && <OrderHistoryView userName={userName} tenant={tenant} />}
          {activeTab === 'move' && <MoveView user={user} walletBalance={walletBalance} tenant={tenant} />}
          {activeTab === 'cart' && (
            <div className="-mt-6 -mx-4 md:-mx-8 flex flex-col bg-slate-50 dark:bg-slate-950 font-sans min-h-full">
              <div className="bg-[#111A2E] px-4 pt-12 pb-6 text-white rounded-b-[24px]">
                <div className="flex items-center gap-3">
                  <ArrowLeft size={24} className="text-white cursor-pointer" onClick={() => setActiveTab('home')} />
                  <h1 className="text-xl font-bold text-white flex items-center gap-2">
                    <ShoppingCart className="text-orange-400" size={20} /> Cart
                  </h1>
                </div>
              </div>
              <div className="px-4 mt-5 flex gap-2">
                <button
                  onClick={() => setCartViewMode('products')}
                  className={`flex-1 py-2.5 px-2 rounded-full text-[12px] sm:text-[13px] font-bold transition-colors border flex items-center justify-center gap-1.5 ${cartViewMode === 'products' ? 'bg-[#ea580c] text-white border-[#ea580c]' : 'bg-white text-slate-700 border-slate-300'}`}
                >
                  <ShoppingBag size={14} /> Product Cart ({cart.length})
                </button>
                <button
                  onClick={() => setCartViewMode('food')}
                  className={`flex-1 py-2.5 px-2 rounded-full text-[12px] sm:text-[13px] font-bold transition-colors border flex items-center justify-center gap-1.5 ${cartViewMode === 'food' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-300'}`}
                >
                  <Utensils size={14} /> Food Cart ({foodCart.length})
                </button>
              </div>
              <div className="p-4">
              {cartViewMode === 'food' ? (
            <div className="space-y-6">
              <FoodCartCheckout foodCart={foodCart} setFoodCart={setFoodCart} />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                {checkoutStep === 'form' && (
                   <Button onClick={() => setCheckoutStep('cart')} variant="outline" className="h-8 w-8 p-0 rounded-full">
                     <ArrowLeft size={16} />
                   </Button>
                )}
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{checkoutStep === 'form' ? 'Checkout' : 'Your Cart'}</h2>
              </div>
              
              {cart.length === 0 ? (
                <div className="text-center py-10 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed">
                  <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Your cart is empty.</p>
                </div>
              ) : checkoutStep === 'cart' ? (
                <div className="space-y-4">
                  {cart.map((item, index) => {
                    const isOutOfStock = item.product.stock === 0;
                    return (
                    <div key={index} className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-100">{item.product.name}</p>
                          <p className="text-sm font-medium" style={{ color: tenant?.primary_color || '#3b82f6' }}>₹{item.product.price}</p>
                        </div>
                        <div className="font-bold text-lg text-slate-800 dark:text-slate-200">
                          ₹{(item.product.price || 0) * item.quantity}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8 rounded-lg border-slate-200 dark:border-slate-800"
                            onClick={() => updateCartQuantity(item.product.id, Math.max(1, item.quantity - 1))}
                          >
                            -
                          </Button>
                          <Input 
                            value={item.quantity}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '') {
                                updateCartQuantity(item.product.id, 0); // Temporary empty state will be fixed on blur if needed, or better, we parse it
                                return;
                              }
                              const num = parseInt(val, 10);
                              if (!isNaN(num)) {
                                updateCartQuantity(item.product.id, num);
                              }
                            }}
                            onBlur={() => {
                              if (item.quantity < 1) updateCartQuantity(item.product.id, 1);
                              else if (item.quantity > item.product.stock) updateCartQuantity(item.product.id, item.product.stock);
                            }}
                            className="w-16 h-8 text-center font-bold"
                          />
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8 rounded-lg border-slate-200 dark:border-slate-800"
                            onClick={() => updateCartQuantity(item.product.id, Math.min(item.product.stock, item.quantity + 1))}
                          >
                            +
                          </Button>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => removeFromCart(item.product.id)}
                        >
                          Remove
                        </Button>
                      </div>
                      {item.quantity >= item.product.stock && item.product.stock > 0 && (
                        <p className="text-xs text-amber-600 font-medium">Only {item.product.stock} left in stock</p>
                      )}
                    </div>
                  )})}
                  <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center font-bold text-xl mt-6 shadow-sm">
                    <span className="text-slate-700 dark:text-slate-300">Subtotal</span>
                    <span className="text-slate-900 dark:text-slate-100">₹{cart.reduce((sum, item) => sum + ((item.product.price || 0) * item.quantity), 0)}</span>
                  </div>
                  <Button 
                    onClick={handleCheckout}
                    className="w-full h-12 text-lg font-bold rounded-xl mt-4 shadow-md text-white"
                    style={{ backgroundColor: tenant?.primary_color || '#0f172a' }}
                  >
                    Proceed to Checkout
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                      <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg">Delivery Details</h3>
                      {user && (
                        <button 
                          onClick={() => setShowAddressSelector(!showAddressSelector)}
                          className="text-sm font-bold text-blue-600 hover:underline"
                        >
                          {showAddressSelector ? 'Enter Manually' : 'Change Address'}
                        </button>
                      )}
                    </div>
                    
                    {showAddressSelector && user ? (
                       <SavedAddressesView 
                         tenantColor={tenant?.primary_color} 
                         isSelectionMode={true}
                         onSelectAddress={(addr) => {
                           setCheckoutAddressObj(addr);
                           setDeliveryAddress(`${addr.address_line}, ${addr.city}, ${addr.state} - ${addr.pincode}`);
                           setCheckoutPhone(addr.contact_phone);
                           setShowAddressSelector(false);
                         }}
                       />
                    ) : checkoutAddressObj && !showAddressSelector ? (
                      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl relative">
                        <div className="flex justify-between items-start mb-2">
                           <div className="font-bold text-slate-900 dark:text-slate-100">{checkoutAddressObj.contact_name}</div>
                           <div className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider">{checkoutAddressObj.label}</div>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">{checkoutAddressObj.address_line}</p>
                        <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">{checkoutAddressObj.city}, {checkoutAddressObj.state} - {checkoutAddressObj.pincode}</p>
                        <p className="font-medium text-slate-800 dark:text-slate-200 text-sm">{checkoutAddressObj.contact_phone}</p>
                        <button onClick={() => setCheckoutAddressObj(null)} className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-3 hover:text-slate-700 dark:hover:text-slate-300 underline">
                          Enter different address manually
                        </button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Delivery Address</label>
                            <button
                              type="button"
                              onClick={handleUseCurrentLocation}
                              className="text-xs font-bold flex items-center hover:underline text-blue-600 dark:text-blue-400"
                            >
                              <Navigation className="w-3 h-3 mr-1" /> Use current location
                            </button>
                          </div>
                          
                          <div className="w-full h-48 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 relative bg-slate-100 dark:bg-slate-900 mb-3">
                            <Map 
                              defaultCenter={checkoutLat && checkoutLng ? { lat: checkoutLat, lng: checkoutLng } : { lat: 20.5937, lng: 78.9629 }} 
                              defaultZoom={checkoutLat && checkoutLng ? 15 : 4} 
                              mapId="GUEST_CHECKOUT_MAP"
                              onClick={(e: any) => {
                                if (e.detail.latLng) {
                                  const newLat = e.detail.latLng.lat;
                                  const newLng = e.detail.latLng.lng;
                                  setCheckoutLat(newLat);
                                  setCheckoutLng(newLng);
                                  
                                  if ((window as any).google) {
                                    const geocoder = new (window as any).google.maps.Geocoder();
                                    geocoder.geocode({ location: { lat: newLat, lng: newLng } })
                                      .then((response: any) => {
                                        if (response.results && response.results[0]) {
                                          setDeliveryAddress(response.results[0].formatted_address);
                                        }
                                      }).catch((err: any) => console.warn(err));
                                  }
                                }
                              }}
                            >
                              {checkoutLat && checkoutLng && (
                                <AdvancedMarker 
                                  position={{ lat: checkoutLat, lng: checkoutLng }}
                                  draggable={true}
                                  onDragEnd={(e: any) => {
                                    if (e.latLng) {
                                      const newLat = e.latLng.lat();
                                      const newLng = e.latLng.lng();
                                      setCheckoutLat(newLat);
                                      setCheckoutLng(newLng);
                                      
                                      if ((window as any).google) {
                                        const geocoder = new (window as any).google.maps.Geocoder();
                                        geocoder.geocode({ location: { lat: newLat, lng: newLng } })
                                          .then((response: any) => {
                                            if (response.results && response.results[0]) {
                                              setDeliveryAddress(response.results[0].formatted_address);
                                            }
                                          }).catch((err: any) => console.warn(err));
                                      }
                                    }
                                  }}
                                >
                                  <Pin background="#3b82f6" borderColor="#1d4ed8" glyphColor="#fff" />
                                </AdvancedMarker>
                              )}
                            </Map>
                          </div>
                          
                          <textarea
                            className="w-full border border-slate-300 dark:border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none bg-slate-50 dark:bg-slate-900"
                            rows={3}
                            placeholder="Enter your full delivery address"
                            value={deliveryAddress}
                            onChange={(e) => setDeliveryAddress(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                          <Input
                            className="w-full border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900"
                            placeholder="Enter your phone number"
                            value={checkoutPhone}
                            onChange={(e) => setCheckoutPhone(e.target.value)}
                          />
                        </div>
                        {user && (
                          <div className="pt-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={saveNewAddress}
                                onChange={(e) => setSaveNewAddress(e.target.checked)}
                                className="w-5 h-5 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="font-bold text-sm text-slate-700 dark:text-slate-300">Save this address for next time</span>
                            </label>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">Order Summary</h3>
                    {cart.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">{item.quantity}x {item.product.name}</span>
                        <span className="font-medium text-slate-900 dark:text-slate-100">₹{(item.product.price || 0) * item.quantity}</span>
                      </div>
                    ))}
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-2 flex justify-between font-bold text-lg">
                      <span className="text-slate-800 dark:text-slate-200">Total</span>
                      <span style={{ color: tenant?.primary_color || '#0f172a' }}>₹{cart.reduce((sum, item) => sum + ((item.product.price || 0) * item.quantity), 0)}</span>
                    </div>
                  </div>

                  <Button 
                    onClick={handleOpenPaymentSheet}
                    className="w-full h-14 text-lg font-bold rounded-2xl shadow-lg text-white"
                    style={{ backgroundColor: tenant?.primary_color || '#0f172a' }}
                  >
                    {`Place Order (₹${cart.reduce((sum, item) => sum + ((item.product.price || 0) * item.quantity), 0)})`}
                  </Button>
                </div>
              )}
            </div>
          )}
              </div>
            </div>
          )}

        </main>
        <PaymentBottomSheet
          isOpen={showPaymentSheet}
          onClose={() => setShowPaymentSheet(false)}
          amount={cart.reduce((sum, item) => sum + ((item.product.price || 0) * item.quantity), 0)}
          tenantId={selectedStore?.tenant_id || tenant?.merchant_id || (cart[0]?.product as any)?.tenant_id || ''}
          branchId={selectedStore?.branch_id || (cart[0]?.product as any)?.store?.id || null}
          onCreateOrder={handleCreateOrder}
          onPaymentConfirmed={handlePaymentConfirmed}
        />

        {/* Bottom Nav Bar */}
        <nav className="fixed md:hidden bottom-0 w-full bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 px-6 py-4 flex justify-between items-center z-50">
          <NavItem icon={Home} label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} tenantColor={tenant?.primary_color} />
          <NavItem icon={ShoppingBag} label="Bookings" active={activeTab === 'orders'} onClick={() => { if (handleGuardedAction()) setActiveTab('orders'); }} tenantColor={tenant?.primary_color} />
          <NavItem icon={ShoppingCart} label="Cart" active={activeTab === 'cart'} onClick={() => setActiveTab('cart')} tenantColor={tenant?.primary_color} />
          <NavItem icon={CreditCard} label="Payments" active={false} onClick={() => setComingSoonCategory('Payments')} tenantColor={tenant?.primary_color} />
          <NavItem icon={UserIcon} label="Account" active={activeTab === 'profile'} onClick={() => { if (handleGuardedAction()) setActiveTab('profile'); }} tenantColor={tenant?.primary_color} />
        </nav>


      {comingSoonCategory && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setComingSoonCategory(null)}>
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl p-6 shadow-xl text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">{comingSoonCategory} is Coming Soon!</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              We are working hard to bring you the best {comingSoonCategory} experience. Check back soon for updates.
            </p>
            <Button 
              className="w-full rounded-xl h-12 text-md font-bold"
              onClick={() => setComingSoonCategory(null)}
            >
              Got it
            </Button>
          </div>
        </div>
      )}
      
      {showAuthGuard && (
        <ConsumerAuthModal 
          onClose={() => setShowAuthGuard(false)}
          onSuccess={() => {
            setShowAuthGuard(false);
            // If they were trying to checkout, we could auto-proceed here,
            // but for simplicity we just let them click it again or use state
          }}
        />
      )}

      {showCompleteProfile && user && (
        <CompleteProfileModal
          userId={user.id}
          onComplete={() => {
            setShowCompleteProfile(false);
            // auth.updateUser() ke baad onAuthStateChange listener khud 
            // "user" state ko refresh kar dega — reload ki zaroorat nahi
          }}
          onSkip={() => setShowCompleteProfile(false)}
        />
      )}
    </div>
  );

  if (!GOOGLE_MAPS_API_KEY) return AppContent;
  return <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>{AppContent}</APIProvider>;
}

function ServiceIcon({ icon: Icon, label, color, onClick }: { icon: any, label: string, color: string, onClick?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 cursor-pointer hover:scale-105 transition-transform" onClick={onClick}>
      <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center`}>
        <Icon size={24} />
      </div>
      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 text-center">{label}</span>
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




function ProductDetailView({ product, tenantColor, onBack, addToCart, onBuyNow }: { product: Product, tenantColor: string, onBack: () => void, addToCart: (p: Product, q: number) => void, onBuyNow: (p: Product, q: number) => void }) {
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

function StoreProductGrid({ products, addToCart, onProductClick, tenantColor, onBack, storeName }: { products: Product[], addToCart: (p: Product) => void, onProductClick: (p: Product) => void, tenantColor: string, onBack?: () => void, storeName?: string }) {

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
