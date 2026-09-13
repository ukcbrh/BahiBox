import { loadRazorpayScript } from '@/src/lib/utils';
import RetailStoreSettings from "../components/retail/RetailStoreSettings";
import StaffActivityView from '../components/retail/StaffActivityView';
import PlatformUsageWalletView from '../components/retail/PlatformUsageWalletView';
import { APIProvider } from '@vis.gl/react-google-maps';
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast, Toaster } from 'sonner';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  LogOut,
  Plus,
  Trash2,
  Users,
  FileText,
  Calculator,
  Wallet,
  Clock,
  QrCode,
  Scan,
  CreditCard,
  Banknote,
  Search,
  CheckCircle2,
  X,
  Printer,
  Cloud,
  CheckCircle,
  Menu,
  Download,
  Upload,
  ScanLine,
  Settings,
  RotateCcw,
  FolderPlus,
  Image as ImageIcon,
  Edit,
  Tags,
  FileDown,
  Grip,
  Truck,
  Bed,
  Pill,
  Factory,
  Utensils,
  Clipboard,
  Map,
  Calendar,
  Sprout,
  AlertTriangle,
  Lock,
  Store,
  BarChart3,
  ShieldCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { Product, CartItem, ModuleMaster, MerchantSubscription, ModuleType } from '@/src/types';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { getSupabaseClient } from '../lib/supabase';
import { LiveTrackingMap } from '../components/consumer/LiveTrackingMap';
import { useModules } from '../hooks/useModules';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getOfficialModuleName } from '../data';
import * as LucideIcons from 'lucide-react';
import { TenantMenuResult } from '../db/database.types';

import { StaffRolesView } from '../components/StaffRolesView';
import { PermissionGate } from '../components/PermissionGate';
import { WalletBalanceCard, LedgerHistoryTable, WithdrawalHistoryList } from '../components/WalletComponents';
import { FinanceDashboard } from '../components/FinanceComponents';
import { SettingsView } from '../components/SettingsView';
import { ReportsHub } from '../components/reports/ReportsHub';
import { SaleInvoices } from '../components/retail/SaleInvoices';
import { RetailPOSFullScreen, RetailOnlineOrdersPage, RetailScanGoOrdersPage, InwardPaymentPage, OutwardPaymentPage, DailyExpensePage, OtherIncomePage, QuotationPage, ProformaInvoicePage, DeliveryChallanInwardPage, DeliveryChallanOutwardPage, PickingQueuePage, SaleOrderPage, CreditNotePage, DebitNotePage } from '../components/retail/RetailPOSFullScreen';
import { RetailPurchases } from '../components/retail/RetailPurchases';
import { InwardPaymentList } from '@/src/components/retail/InwardPaymentList';
import { OutwardPaymentList } from '@/src/components/retail/OutwardPaymentList';
import { DocumentsHub } from '../components/documents/DocumentsHub';
import { RetailProductsInventory } from '../components/retail/RetailProductsInventory';
import { PurchaseInvoices } from '../components/retail/PurchaseInvoices';
import { RetailCustomerSupplier } from '../components/retail/RetailCustomerSupplier';
import { RetailDiscountsOffers } from '../components/retail/RetailDiscountsOffers';
import { RetailDashboard } from '../components/retail/RetailDashboard';
import InvoiceHistory from '../components/retail/InvoiceHistory';

// Hospitality Components
import {
  HospitalityDashboard,
  HospitalityFrontDesk,
  HospitalityMenuManagement,
  HospitalityRestaurant,
  HospitalityKDS,
  HospitalityPOS,
  HospitalityHousekeeping,
  HospitalityCloudKitchen,
  HospitalityPurchase,
  HospitalityPayroll,
  HospitalityFinance,
  HospitalitySettings,
  BarcodeScannerModal
} from '../components/hospitality/HospitalityComponents';

// Transport & Logistics Components
import { TransportPlaceholder } from '../components/transport/TransportPlaceholder';
import { TransportOperatorTypeSelector } from '../components/transport/TransportOperatorTypeSelector';
import { IndividualDriverWorkTypeSelector } from '../components/transport/IndividualDriverWorkTypeSelector';
import { DeliveryMoveGateway } from '../components/transport/DeliveryMoveGateway';
import { ComingSoonWorkType } from '../components/transport/ComingSoonWorkType';

// Manufacturing Components
import { ManufacturingPlaceholder } from '../components/manufacturing/ManufacturingPlaceholder';

// Healthcare Components
import { HealthcarePlaceholder } from '../components/healthcare/HealthcarePlaceholder';

// Education Components
import { EducationPlaceholder } from '../components/education/EducationPlaceholder';

// Services Components
import { ServicesPlaceholder } from '../components/services/ServicesPlaceholder';
import { ServicesAdminSettings } from '../components/services/ServicesAdminSettings';
import { StaffTeamView } from '../components/services/StaffTeamView';

// Agriculture Components
import { AgriculturePlaceholder } from '../components/agriculture/AgriculturePlaceholder';
import { NotificationBell } from '../components/NotificationBell';
import { tenantScopedKey } from '@/src/lib/tenantStorage';

// Helper to render dynamic icon
const DynamicIcon = ({ name, className, size = 20 }: { name: string, className?: string, size?: number }) => {
  const IconComponent = (LucideIcons as any)[name] || LucideIcons.HelpCircle;
  return <IconComponent className={className} size={size} />;
};

export interface OnlineOrder {
  id: string;
  customer_name: string;
  address: string;
  items: any;
  total_amount: number;
  status: 'New' | 'Ready to Pack' | 'Dispatch';
  created_at?: string;
}



function SwitchBusinessModal({ currentTenantId, onClose, onSelectBranch }: { currentTenantId: string; onClose: () => void; onSelectBranch: (moduleKey: string, moduleName: string, branchId: string) => void }) {
  const [step, setStep] = useState('module');
  const [modules, setModules] = useState<any[]>([]);
  const [selectedModule, setSelectedModule] = useState<any | null>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchModules = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data } = await supabase
        .from('merchant_subscriptions')
        .select('status, subscription_plans(module_name, module_key)')
        .eq('tenant_id', currentTenantId)
        .eq('status', 'active');
      if (data) {
        const uniqueModules = Array.from(
          new globalThis.Map(
            data
              .filter((d: any) => d.subscription_plans)
              .map((d: any) => [d.subscription_plans.module_key, { module_name: d.subscription_plans.module_name, module_key: d.subscription_plans.module_key }])
          ).values()
        );
        setModules(uniqueModules as any);
      }
      setLoading(false);
    };
    fetchModules();
  }, [currentTenantId]);

  const handleSelectModule = async (mod: any) => {
    setSelectedModule(mod);
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) { setLoading(false); return; }
    const { data } = await supabase
      .from('branches')
      .select('*')
      .eq('tenant_id', currentTenantId)
      .eq('module_key', mod.module_key)
      .order('is_main_branch', { ascending: false });
    if (data) setBranches(data);
    setLoading(false);
    setStep('branch');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {step === 'module' ? 'Select Module' : ('Select Branch — ' + (selectedModule ? selectedModule.module_name : ''))}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><LucideIcons.X size={20} /></button>
        </div>
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : step === 'module' ? (
            modules.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No active modules found.</p>
            ) : (
              modules.map((mod) => (
                <button
                  key={mod.module_key}
                  onClick={() => handleSelectModule(mod)}
                  className="w-full text-left bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:shadow-md transition-shadow"
                >
                  <p className="font-bold text-slate-900 dark:text-slate-100">{mod.module_name}</p>
                </button>
              ))
            )
          ) : (
            <>
              <button onClick={() => { setStep('module'); setSelectedModule(null); }} className="text-sm font-semibold text-primary mb-2">Back to Modules</button>
              {branches.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No branches found for this module.</p>
              ) : (
                branches.map((branch) => (
                  <button
                    key={branch.id}
                    onClick={() => onSelectBranch(selectedModule.module_key, selectedModule.module_name, branch.id)}
                    className="w-full text-left bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:shadow-md transition-shadow flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100">{branch.branch_name}</p>
                      {branch.is_main_branch && <span className="text-xs text-blue-600 font-semibold">Main Branch</span>}
                    </div>
                  </button>
                ))
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
export default function MerchantDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, currentTenantId, currentRole, activeModule: initialActiveModule, logout, loading, hasPermission, clearRole, availableRoles, isSuperAdmin, activeBranchId, setActiveBranchId } = useAuth();
  const { tenant } = useTenant();
  
  const role = location.state?.role || currentRole || 'admin';
  const initialModule = getOfficialModuleName(location.state?.module || initialActiveModule || 'Retail POS', 'Retail POS');
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<OnlineOrder[]>([]);
  
  const [activeModuleState, setActiveModuleState] = useState<ModuleType>(initialModule as ModuleType);

  // currentTenantId isn't known yet at the moment this component first 
  // mounts, so we can't read the tenant-scoped localStorage value in 
  // the lazy-initializer above. Once the tenant becomes known, load 
  // THAT tenant's last-active-module instead — this also correctly 
  // re-loads the right value if the user switches to a different 
  // tenant/business within the same browser session.
  useEffect(() => {
    if (currentTenantId) {
      const stored = localStorage.getItem(tenantScopedKey('bahi_active_module', currentTenantId));
      if (stored) {
        setActiveModuleState(stored as ModuleType);
      }
    }
  }, [currentTenantId]);

  useEffect(() => {
    if (activeModuleState && currentTenantId) {
      localStorage.setItem(tenantScopedKey('bahi_active_module', currentTenantId), activeModuleState);
    }
  }, [activeModuleState, currentTenantId]);

  const [showSwitchBusinessModal, setShowSwitchBusinessModal] = useState(false);

  const [transportOperatorType, setTransportOperatorType] = useState<string | null | undefined>(undefined);
  const [transportIndividualWorkType, setTransportIndividualWorkType] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const activeStrEarly = String(activeModuleState || '').toLowerCase();
    const isTransportEarly = activeStrEarly.includes('transport') || activeStrEarly.includes('logistic') || activeStrEarly.includes('fleet');
    if (!isTransportEarly || !currentTenantId) return;
    let isMounted = true;
    (async () => {
      const { getSupabaseClient } = await import('../lib/supabase');
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data } = await supabase.from('tenants').select('transport_operator_type, transport_individual_work_type').eq('id', currentTenantId).maybeSingle();
      if (isMounted) {
        setTransportOperatorType(data?.transport_operator_type ?? null);
        setTransportIndividualWorkType(data?.transport_individual_work_type ?? null);
      }
    })();
    return () => { isMounted = false; };
  }, [activeModuleState, currentTenantId]);

  useDocumentTitle(`BahiBox | ${activeModuleState}`);
  const { modules: moduleMaster, subscriptions: merchantSubscriptions, loading: modulesLoading, refreshSubscriptions } = useModules(currentTenantId || undefined);

  const [isDataInitialized, setIsDataInitialized] = useState(false);
  const [dynamicMenu, setDynamicMenu] = useState<TenantMenuResult[]>([]);
  const [branchConfig, setBranchConfig] = useState<any>(null);
  const [configRefreshCounter, setConfigRefreshCounter] = useState(0);
  const { currentPermissions } = useAuth();

  const [showPaymentModal, setShowPaymentModal] = useState(location.state?.showPaymentModal || false);
  const [paymentAmount, setPaymentAmount] = useState(location.state?.amount || 0);
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [paymentPlan, setPaymentPlan] = useState(location.state?.plan || 'Pro');
  const [paymentModule, setPaymentModule] = useState(location.state?.module || initialModule);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const [showActivationModal, setShowActivationModal] = useState(false);
  const [planCycles, setPlanCycles] = useState<Record<string, string>>({});
  const [selectedModuleToActivate, setSelectedModuleToActivate] = useState<ModuleMaster | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [merchantDetails, setMerchantDetails] = useState<any>(null);
  
  const [adminPlans, setAdminPlans] = useState<any[]>([]);

  useEffect(() => {
    return () => {
      document.documentElement.classList.remove('dark');
    };
  }, []);


  useEffect(() => {
    if (loading || !user) return;

    if (!currentRole) {
      navigate('/login');
      return;
    }

    // Consumer-accounts ko Merchant-Dashboard se strictly block karo, 
    // Super-Admin ko chhodkar — chahe unke paas kisi tarah tenant-role 
    // bhi ban gaya ho
    if (!isSuperAdmin) {
      const checkNotConsumer = async () => {
        const supabase = getSupabaseClient();
        if (!supabase) return;
        const { data: consumerRole } = await supabase.from('consumer_profiles').select('*').eq('user_id', user.id).maybeSingle();
        if (consumerRole) {
          await logout();
          toast.error("This account is registered as a customer account. Please use a different account to access the Merchant Dashboard.");
          navigate('/login');
        }
      };
      checkNotConsumer();
    }
  }, [user, loading, currentRole, isSuperAdmin, navigate]);

  useEffect(() => {
    const fetchBranchConfig = async () => {
      const supabase = getSupabaseClient();
      if (!supabase || !currentTenantId) return;
      const activeStr = (activeModuleState || '').toLowerCase();
      const isHotelModeCheck = activeStr.includes('hotel') || activeStr.includes('hospitality') || activeStr.includes('restaurant');
      const isServicesModeCheck = activeStr.includes('service') || activeStr.includes('repair') || activeStr.includes('salon') || activeStr.includes('lawyer') || activeStr.includes('event') || activeStr.includes('daily');
      const currentModuleKey = isHotelModeCheck ? 'hospitality' : isServicesModeCheck ? 'services' : 'retail';
      let query;
      if (activeBranchId) {
        // A specific branch was explicitly selected via "Switch Business" — use it.
        query = supabase.from('branches').select('*').eq('id', activeBranchId).eq('tenant_id', currentTenantId).single();
      } else {
        // No explicit selection yet — fall back to the first branch of this module.
        query = supabase.from('branches').select('*').eq('tenant_id', currentTenantId).eq('module_key', currentModuleKey).limit(1).single();
      }

      let { data } = await query;
      if (data) setBranchConfig(data);
    };
    fetchBranchConfig();
  }, [currentTenantId, configRefreshCounter, activeModuleState, activeBranchId]);

  useEffect(() => {
    const fetchAdminPlans = async () => {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase.from('subscription_plans').select('*');
        if (data && !error && data.length > 0) {
          const mappedPlans = data.map((p: any) => ({
            id: p.id,
            moduleName: p.module_name,
            tier: p.tier,
            name: p.name,
            priceMonthly: p.price_monthly,
            priceYearly: p.price_yearly,
            commission: p.commission,
            features: p.features || [],
            isActive: p.is_active,
            whiteLabel: p.white_label
          }));
          setAdminPlans(mappedPlans);
          return; // Successfully fetched from DB, skip local storage
        }
      }
      
      // Fallback to local storage
      const savedPlans = localStorage.getItem('admin_subscription_plans_v2');
      if (savedPlans) {
        try {
          setAdminPlans(JSON.parse(savedPlans));
        } catch (e) {}
      }
    };
    fetchAdminPlans();
  }, []);

  useEffect(() => {
    if (showActivationModal && user) {
       const fetchMerchantDetails = async () => {
          const supabase = getSupabaseClient();
          if (!supabase) return;
          const { data } = await supabase.from('merchants').select('*').eq('id', user.id).single();
          if (data) {
             setMerchantDetails(data);
          } else {
             // Fallback to user if merchant not found
             const { data: userData } = await supabase.from('users').select('*').eq('id', user.id).single();
             if (userData) {
                setMerchantDetails({
                   name: userData.name,
                   email: userData.email,
                   phone: userData.phone,
                   business_name: userData.business_name || '',
                   address: userData.address || ''
                });
             }
          }
       };
       fetchMerchantDetails();
    }
  }, [showActivationModal, user]);

  const handleApplyPromo = async () => {
    let couponApplied = false;
    const basePrice = paymentAmount / 1.18; // Reverse engineer the price without GST to apply discount
    
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data: couponsData } = await supabase.from('promo_codes').select('*');
      if (couponsData && couponsData.length > 0) {
        const coupons = couponsData.map((c: any) => ({
          code: c.code,
          discountType: c.discount_type || (c.discount_percentage ? 'percentage' : 'fixed'),
          discountValue: c.discount_value || c.discount_percentage || c.fixed_discount || 0,
          applicableModule: c.applicable_module || 'All',
          applicablePlan: c.applicable_plan || 'All',
          isActive: c.is_active
        }));
        
        const code = promoCode.toUpperCase();
        const matchedCoupon = coupons.find((c: any) => c.code.toUpperCase() === code && c.isActive);
        
        if (matchedCoupon) {
          const modName = getOfficialModuleName(paymentModule, paymentModule);
          const moduleMatch = matchedCoupon.applicableModule === 'All' || matchedCoupon.applicableModule === modName || matchedCoupon.applicableModule === paymentModule;
          const planMatch = matchedCoupon.applicablePlan === 'All' || matchedCoupon.applicablePlan === paymentPlan;
          
          if (moduleMatch && planMatch) {
            let discountAmount = 0;
            if (matchedCoupon.discountType === 'fixed') {
              discountAmount = Number(matchedCoupon.discountValue);
            } else if (matchedCoupon.discountType === 'percentage') {
              discountAmount = (basePrice * Number(matchedCoupon.discountValue)) / 100;
            }
            setPromoDiscount(discountAmount * 1.18); // Applying GST to discount for final match
            alert("Promo code applied!");
            couponApplied = true;
          } else {
            alert("This promo code is not applicable to the selected plan or module.");
            setPromoDiscount(0);
            return;
          }
        }
      }
    }
    
    if (couponApplied) return;
    
    // Fallback local storage
    try {
      const savedCoupons = localStorage.getItem('admin_subscription_coupons');
      if (savedCoupons) {
        const coupons = JSON.parse(savedCoupons);
        const code = promoCode.toUpperCase();
        const matchedCoupon = coupons.find((c: any) => c.code.toUpperCase() === code && c.isActive);
        
        if (matchedCoupon) {
          const modName = getOfficialModuleName(paymentModule, paymentModule);
          const moduleMatch = matchedCoupon.applicableModule === 'All' || matchedCoupon.applicableModule === modName || matchedCoupon.applicableModule === paymentModule;
          const planMatch = matchedCoupon.applicablePlan === 'All' || matchedCoupon.applicablePlan === paymentPlan;
          
          if (moduleMatch && planMatch) {
            let discountAmount = 0;
            if (matchedCoupon.discountType === 'fixed') {
              discountAmount = Number(matchedCoupon.discountValue);
            } else if (matchedCoupon.discountType === 'percentage') {
              discountAmount = (basePrice * Number(matchedCoupon.discountValue)) / 100;
            }
            setPromoDiscount(discountAmount * 1.18);
            alert("Promo code applied!");
            couponApplied = true;
          } else {
            alert("This promo code is not applicable to the selected plan or module.");
            setPromoDiscount(0);
            return;
          }
        }
      }
    } catch (e) {}
    
    if (!couponApplied) {
      alert("Invalid or inactive promo code.");
      setPromoDiscount(0);
    }
  };

  
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };


  
  

  const handleActivateFreePlan = async (moduleMaster: any) => {
    const supabase = getSupabaseClient();
    if (!supabase || !user) return;
    setIsActivating(true);
    try {
      await supabase.from('merchant_subscriptions').upsert({
        tenant_id: currentTenantId,
        plan_id: moduleMaster.id,
        status: 'active'
      });
      toast.success('Free plan activated successfully!');
      setShowPaymentModal(false);
      // Fetch fresh data if needed
    } catch (e) {
      toast.error('Failed to activate free plan');
    } finally {
      setIsActivating(false);
    }
  };

  const handlePaymentSuccess = async () => {
    setIsProcessingPayment(true);
    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        toast.error('Failed to load payment gateway. Please check your connection.');
        setIsProcessingPayment(false);
        return;
      }

      if (!selectedPlanId || !merchantDetails) {
        toast.error('Missing plan or merchant details');
        setIsProcessingPayment(false);
        return;
      }

      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabase client missing");
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/create-razorpay-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          plan_id: selectedPlanId,
          billing_cycle: planCycles[paymentModule] || 'monthly',
          tenant_id: currentTenantId,
          branch_id: merchantDetails.branches?.[0]?.id
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to create order');
      }

      const orderData = await response.json();

      const options = {
        key: orderData.razorpay_key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'BahiBox',
        description: `Subscription for ${paymentPlan}`,
        order_id: orderData.razorpay_order_id,
        handler: async function (response: any) {
          toast.success('Payment received, activating your plan...');
          
          // Poll for subscription active status
          let attempts = 0;
          const pollInterval = setInterval(async () => {
            attempts++;
            const { data } = await supabase
              .from('merchant_subscriptions')
              .select('status')
              .eq('tenant_id', currentTenantId)
              .eq('plan_id', selectedPlanId)
              .single();
              
            if (data?.status === 'active') {
              clearInterval(pollInterval);
              toast.success('Payment successful! Your plan has been upgraded.');
              setShowPaymentModal(false);
              
              // Switch to the newly activated module
              const activatedModule = moduleMaster.find(m => m.id === paymentModule);
              if (activatedModule) {
                 setActiveModuleState(activatedModule.name as ModuleType);
                 setActiveTab('dashboard');
              }
              // Refresh subscriptions
              if (currentTenantId || merchantDetails?.id) {
                refreshSubscriptions();
              }
            } else if (attempts >= 15) { // 30 seconds timeout
              clearInterval(pollInterval);
              toast.error('Activation is taking longer than expected. Please check back soon.');
              setShowPaymentModal(false);
            }
          }, 2000);
        },
        prefill: {
          name: user?.user_metadata?.full_name || '',
          email: user?.email || '',
        },
        theme: {
          color: '#3b82f6'
        }
      };

      const isLoaded2 = await loadRazorpayScript();
      if (!isLoaded2) {
        toast.error('Failed to load payment gateway');
        return;
      }
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', async function (response: any) {
        toast.error('Payment was not completed: ' + response.error.description);
        // Payment fail hone par is-module ke liye Free/Starter-plan par 
        // automatically activate kar do, taaki koi bhi paid-access na 
        // mile bina-payment-ke, lekin Free-tier-access mil jaye
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const { data: starterPlan } = await supabase
            .from('subscription_plans')
            .select('id')
            .eq('module_name', paymentModule)
            .eq('name', 'Starter Plan')
            .single();
          if (starterPlan) {
            await fetch('/api/activate-free-plan', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token || ''}`
              },
              body: JSON.stringify({
                plan_id: starterPlan.id,
                tenant_id: currentTenantId
              })
            });
            toast.info('Activated on Starter (Free) plan instead.');
          }
        } catch (fallbackErr) {
          console.warn('Free-plan fallback failed:', fallbackErr);
        }
      });
      rzp.open();
    } catch (err: any) {
      toast.error('Payment error: ' + err.message);
    } finally {
      setIsProcessingPayment(false);
    }
  };


  

  useEffect(() => {
    let isMounted = true;
    const fetchMenu = async () => {
      const supabase = getSupabaseClient();
      if (supabase && user) {
        try {
          let finalMenu: any[] = [];
          
          if (currentTenantId) {
            const resolvedModuleKey = activeModuleState 
              ? (moduleMaster.find(m => m.name === activeModuleState) as any)?.module_key 
              : undefined;
            const { data, error } = await supabase.rpc('get_tenant_menu', {
              checking_tenant_id: currentTenantId,
              checking_user_id: user.id,
              checking_module_key: resolvedModuleKey || null
            });
            if (error) {
              // console.warn("Failed to fetch dynamic menu, using fallback.", error);
            } else if (data) {
              finalMenu = data;
            }
          }

          if (isMounted) {
            // Ensure Dashboard is always the first menu item
            if (!finalMenu.some(m => m.item_key.endsWith('.dashboard') || m.item_key === 'dashboard')) {
              finalMenu.unshift({
                module_id: finalMenu[0]?.module_id || '1',
                module_key: finalMenu[0]?.module_key || 'retail',
                module_name: finalMenu[0]?.module_name || 'Retail POS',
                module_icon: finalMenu[0]?.module_icon || 'Store',
                module_order: 10,
                item_id: '99',
                item_key: (finalMenu[0]?.module_key || 'retail') + '.dashboard',
                item_label: 'Dashboard',
                item_icon: 'LayoutDashboard',
                route_path: '/merchant-dashboard',
                parent_item_id: null,
                item_order: 1
              });
            }

            // Force inject missing Customers and Suppliers menu items for retail module
            const hasRetailPos = finalMenu.some(m => m.item_key === 'retail.pos' || m.item_key === 'retail.inventory' || m.item_key === 'retail.fullpos' || (m.module_name && m.module_name.includes('Retail')));
            if (hasRetailPos) {
              if (!finalMenu.some(m => m.item_key === 'retail.store_settings')) {
                finalMenu.push({ module_id: '1', module_key: 'retail', module_name: 'Retail POS', module_icon: 'Store', module_order: 10, item_id: '110', item_key: 'retail.store_settings', item_label: 'Settings', item_icon: 'Settings', route_path: '/merchant-dashboard/store-settings', parent_item_id: null, item_order: 85 });
              }
              if (branchConfig?.is_online_store_active) {
                if (!finalMenu.some(m => m.item_key === 'retail.online_orders')) {
                  finalMenu.push({ module_id: '1', module_key: 'retail', module_name: 'Retail POS', module_icon: 'Store', module_order: 10, item_id: '111', item_key: 'retail.online_orders', item_label: 'Online Orders', item_icon: 'Globe', route_path: '/merchant-dashboard/online-orders', parent_item_id: null, item_order: 15 });
                }
              }
              if (branchConfig?.is_scan_and_go_active) {
                if (!finalMenu.some(m => m.item_key === 'retail.scan_and_go_orders')) {
                  finalMenu.push({ module_id: '1', module_key: 'retail', module_name: 'Retail POS', module_icon: 'Store', module_order: 10, item_id: '112', item_key: 'retail.scan_and_go_orders', item_label: 'Scan & Go Orders', item_icon: 'ScanLine', route_path: '/merchant-dashboard/scan-and-go-orders', parent_item_id: null, item_order: 16 });
                }
              }
              if (!finalMenu.some(m => m.item_key === 'retail.fullpos')) {
                finalMenu.push({ module_id: '1', module_key: 'retail', module_name: 'Retail POS', module_icon: 'Store', module_order: 10, item_id: '100', item_key: 'retail.fullpos', item_label: 'Retail POS', item_icon: 'Monitor', route_path: '/merchant-dashboard/fullpos', parent_item_id: null, item_order: 5 });
              }
              if (!finalMenu.some(m => m.item_key === 'retail.parties')) {
                finalMenu.push({ module_id: '1', module_key: 'retail', module_name: 'Retail POS', module_icon: 'Store', module_order: 10, item_id: '104', item_key: 'retail.parties', item_label: 'Customer/Supplier', item_icon: 'Users', route_path: '/merchant-dashboard/parties', parent_item_id: null, item_order: 45 });
              }
              if (!finalMenu.some(m => m.item_key === 'retail.discounts')) {
                finalMenu.push({ module_id: '1', module_key: 'retail', module_name: 'Retail POS', module_icon: 'Store', module_order: 10, item_id: '106', item_key: 'retail.discounts', item_label: 'Discounts', item_icon: 'Tags', route_path: '/merchant-dashboard/discounts', parent_item_id: null, item_order: 65 });
              }
              // GST Reports intentionally excluded from fallback — 
              // it is a duplicate of the main "Reports" menu item and 
              // has been disabled in the menu_items table (is_active=false)
            }


            // Fallback if RPC returns empty or no tenant is active
            if (finalMenu.length === 0) {
               // console.warn("No dynamic menu or no tenant, using fallback menu items.");
               finalMenu = [
                 { module_id: '1', module_key: 'retail', module_name: 'Retail POS', module_icon: 'Store', module_order: 10, item_id: '99', item_key: 'retail.dashboard', item_label: 'Dashboard', item_icon: 'LayoutDashboard', route_path: '/merchant-dashboard', parent_item_id: null, item_order: 1 },
                 { module_id: '1', module_key: 'retail', module_name: 'Retail POS', module_icon: 'Store', module_order: 10, item_id: '100', item_key: 'retail.fullpos', item_label: 'Retail POS', item_icon: 'Monitor', route_path: '/merchant-dashboard/fullpos', parent_item_id: null, item_order: 5 },
                 { module_id: '1', module_key: 'retail', module_name: 'Retail POS', module_icon: 'Store', module_order: 10, item_id: '101', item_key: 'retail.pos', item_label: 'Billing', item_icon: 'ShoppingCart', route_path: '/merchant-dashboard/pos', parent_item_id: null, item_order: 10 },
                 { module_id: '1', module_key: 'retail', module_name: 'Retail POS', module_icon: 'Store', module_order: 10, item_id: '102', item_key: 'retail.inventory', item_label: 'Inventory', item_icon: 'Package', route_path: '/merchant-dashboard/inventory', parent_item_id: null, item_order: 20 },
                 { module_id: '1', module_key: 'retail', module_name: 'Retail POS', module_icon: 'Store', module_order: 10, item_id: '103', item_key: 'retail.purchases', item_label: 'Purchases', item_icon: 'ShoppingBag', route_path: '/merchant-dashboard/purchases', parent_item_id: null, item_order: 30 },
                 { module_id: '1', module_key: 'retail', module_name: 'Retail POS', module_icon: 'Store', module_order: 10, item_id: '104', item_key: 'retail.parties', item_label: 'Customer/Supplier', item_icon: 'Users', route_path: '/merchant-dashboard/parties', parent_item_id: null, item_order: 40 },
                 { module_id: '1', module_key: 'retail', module_name: 'Retail POS', module_icon: 'Store', module_order: 10, item_id: '106', item_key: 'retail.discounts', item_label: 'Discounts', item_icon: 'Tags', route_path: '/merchant-dashboard/discounts', parent_item_id: null, item_order: 60 },
                 { module_id: '1', module_key: 'retail', module_name: 'Retail POS', module_icon: 'Store', module_order: 10, item_id: '108', item_key: 'retail.ledger', item_label: 'Cash & Bank', item_icon: 'Landmark', route_path: '/merchant-dashboard/ledger', parent_item_id: null, item_order: 80 },
                 { module_id: '1', module_key: 'retail', module_name: 'Retail POS', module_icon: 'Store', module_order: 10, item_id: '109', item_key: 'retail.reports', item_label: 'Reports', item_icon: 'BarChart3', route_path: '/merchant-dashboard/reports', parent_item_id: null, item_order: 90 }
               ];
            }


            setDynamicMenu(finalMenu.sort((a, b) => (a.item_order || 0) - (b.item_order || 0)));
            if (finalMenu.length > 0) {
              const currentTabExists = finalMenu.some((m: any) => (m.item_key.split('.').pop() || m.item_key) === activeTab);
              if (!currentTabExists && activeTab !== 'dashboard' && activeTab !== 'wallet' && activeTab !== 'settings') {
                setActiveTab(finalMenu[0].item_key.split('.').pop() || finalMenu[0].item_key);
              }
            }
          }
        } catch (e) {
          // console.warn("Error fetching dynamic menu, using fallback.", e);
        }
      }
      if (isMounted) setIsDataInitialized(true);
    };
    fetchMenu();
    return () => { isMounted = false; };
  }, [user, currentTenantId, currentPermissions, activeModuleState, moduleMaster]); // Re-fetch if permissions change

  if (loading || modulesLoading || !isDataInitialized) {
    return <div className="h-screen flex flex-col items-center justify-center">
      <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">
        {!isDataInitialized ? 'Initializing Data...' : `Loading ${tenant ? tenant.brand_name : 'BahiBox'}...`}
      </p>
    </div>;
  }

  if (!user) return null;

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.warn(err);
    }
  };

  const activeModule = moduleMaster.find(m => m.name === activeModuleState);
  const activeSubscription = activeModule ? merchantSubscriptions.find(s => (s as any).subscription_plans?.module_name === activeModule.name && s.status === 'active') : null;
  
  let daysUntilExpiry: number | null = null;
  if (activeSubscription?.end_date) {
    const endDate = new Date(activeSubscription.end_date);
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry >= 0;
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;
  
  const currentRoleInfo = availableRoles.find(r => r.tenant_id === currentTenantId);
  if (currentRoleInfo?.status === 'suspended' || currentRoleInfo?.status === 'deleted') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-slate-200 dark:border-slate-800">
          <CardHeader className="text-center">
            <div className="mx-auto bg-red-100 p-4 rounded-full mb-4 w-16 h-16 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Account Suspended</CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400 mt-2">
              This business has been suspended. Please contact BahiBox support for more information.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
             <Button onClick={() => { clearRole(); navigate('/login'); }} className="w-full">
               Switch Business
             </Button>
             <Button variant="outline" onClick={handleLogout} className="w-full">
               Logout
             </Button>
          </CardContent>
        </Card>
      </div>
    );
  }


  const activeStr = String(activeModuleState || '').toLowerCase();
  const isHotelMode = activeStr.includes('hotel') || activeStr.includes('hospitality') || activeStr.includes('restaurant');
  const isTransportMode = activeStr.includes('transport') || activeStr.includes('logistic') || activeStr.includes('fleet');
  const isManufacturingMode = activeStr.includes('manufacturing') || activeStr.includes('factory') || activeStr.includes('production');
  const isHealthcareMode = activeStr.includes('health') || activeStr.includes('clinic') || activeStr.includes('hospital') || activeStr.includes('care');
  const isEducationMode = activeStr.includes('education') || activeStr.includes('school') || activeStr.includes('college') || activeStr.includes('university') || activeStr.includes('institute');
  const isServicesMode = activeStr.includes('service') || activeStr.includes('repair') || activeStr.includes('salon') || activeStr.includes('lawyer') || activeStr.includes('event') || activeStr.includes('daily');
  const isAgricultureMode = activeStr.includes('agriculture') || activeStr.includes('agri') || activeStr.includes('farm') || activeStr.includes('crop') || activeStr.includes('kisan') || activeStr.includes('dairy');

  const AppContent = (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100">
      {/* Navigation Drawer Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMenuOpen(false)}
          ></div>
          
          {/* Menu Drawer */}
          <div className="relative flex flex-col w-4/5 max-w-sm bg-white dark:bg-slate-900 h-full shadow-2xl p-6 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                {tenant ? (
                  <>
                    <div className="w-9 h-9 rounded-xl overflow-hidden">
                      <img src={tenant.logo_url} alt="Logo" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white" style={{ color: tenant.primary_color }}>{tenant.brand_name}</span>
                  </>
                ) : (
                  <>
                    <img src="/logolight.png" alt="BahiBox Logo" className="h-24 dark:hidden object-contain" />
                    <img src="/logodark.png" alt="BahiBox Logo" className="h-24 hidden dark:block object-contain" />
                  </>
                )}
              </div>
              <button 
                onClick={() => setIsMenuOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 -mx-6 px-6">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Business Module</p>
              <p className="font-bold text-slate-800 dark:text-slate-200 text-sm capitalize">{activeModuleState || tenant?.business_type || 'Retail'}{branchConfig?.branch_name ? ` (${branchConfig.branch_name})` : ''}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1">{user?.email || 'User'}</p>
            </div>

            <nav className="flex-1 py-4 space-y-4 overflow-y-auto">
              {/* Group items by module */}
              {(() => {
                const effectiveModule = activeModuleState || tenant?.business_type || 'Retail POS';
                let activeMenuToRender = dynamicMenu.filter(m => m.module_name === effectiveModule || (effectiveModule === 'Retail POS' && m.module_name === 'Retail'));
                console.log('DEBUG9:', JSON.stringify({effectiveModule, dynamicMenuLength: dynamicMenu.length, activeMenuToRenderLength: activeMenuToRender.length, dynamicMenuNames: dynamicMenu.map((m:any) => m.module_name)}));
                
                if (activeMenuToRender.length === 0) {
                  const em = effectiveModule as string;
                  if (em === 'Retail POS' || em === 'Retail' || em === 'retail') {
                    activeMenuToRender = [
                     { module_id: '1', module_key: 'retail', module_name: 'Retail POS', module_icon: 'Store', module_order: 10, item_id: '99', item_key: 'retail.dashboard', item_label: 'Dashboard', item_icon: 'LayoutDashboard', route_path: '/merchant-dashboard', parent_item_id: null, item_order: 1 },
                     { module_id: '1', module_key: 'retail', module_name: 'Retail POS', module_icon: 'Store', module_order: 10, item_id: '100', item_key: 'retail.fullpos', item_label: 'Retail POS', item_icon: 'Monitor', route_path: '/merchant-dashboard/fullpos', parent_item_id: null, item_order: 5 },
                     { module_id: '1', module_key: 'retail', module_name: 'Retail POS', module_icon: 'Store', module_order: 10, item_id: '111', item_key: 'retail.recent_sales', item_label: 'Recent Sales', item_icon: 'Printer', route_path: '/merchant-dashboard/recent_sales', parent_item_id: null, item_order: 6 },
                     { module_id: '1', module_key: 'retail', module_name: 'Retail POS', module_icon: 'Store', module_order: 10, item_id: '101', item_key: 'retail.pos', item_label: 'Billing', item_icon: 'ShoppingCart', route_path: '/merchant-dashboard/pos', parent_item_id: null, item_order: 10 },
                     { module_id: '1', module_key: 'retail', module_name: 'Retail POS', module_icon: 'Store', module_order: 10, item_id: '102', item_key: 'retail.inventory', item_label: 'Inventory', item_icon: 'Package', route_path: '/merchant-dashboard/inventory', parent_item_id: null, item_order: 20 },
                     { module_id: '1', module_key: 'retail', module_name: 'Retail POS', module_icon: 'Store', module_order: 10, item_id: '103', item_key: 'retail.purchases', item_label: 'Purchases', item_icon: 'ShoppingBag', route_path: '/merchant-dashboard/purchases', parent_item_id: null, item_order: 30 },
                     { module_id: '1', module_key: 'retail', module_name: 'Retail POS', module_icon: 'Store', module_order: 10, item_id: '104', item_key: 'retail.parties', item_label: 'Customer/Supplier', item_icon: 'Users', route_path: '/merchant-dashboard/parties', parent_item_id: null, item_order: 40 },
                     { module_id: '1', module_key: 'retail', module_name: 'Retail POS', module_icon: 'Store', module_order: 10, item_id: '106', item_key: 'retail.discounts', item_label: 'Discounts', item_icon: 'Tags', route_path: '/merchant-dashboard/discounts', parent_item_id: null, item_order: 60 },
                     { module_id: '1', module_key: 'retail', module_name: 'Retail POS', module_icon: 'Store', module_order: 10, item_id: '108', item_key: 'retail.ledger', item_label: 'Cash & Bank', item_icon: 'Landmark', route_path: '/merchant-dashboard/ledger', parent_item_id: null, item_order: 80 },
                     { module_id: '1', module_key: 'retail', module_name: 'Retail POS', module_icon: 'Store', module_order: 10, item_id: '110', item_key: 'retail.store_settings', item_label: 'Settings', item_icon: 'Settings', route_path: '/merchant-dashboard/store-settings', parent_item_id: null, item_order: 85 },
                     { module_id: '1', module_key: 'retail', module_name: 'Retail POS', module_icon: 'Store', module_order: 10, item_id: '112', item_key: 'retail.staff_activity', item_label: 'Staff Activity', item_icon: 'History', route_path: '/merchant-dashboard/staff_activity', parent_item_id: null, item_order: 87 },
                     { module_id: '1', module_key: 'retail', module_name: 'Retail POS', module_icon: 'Store', module_order: 10, item_id: '113', item_key: 'retail.usage_wallet', item_label: 'Platform Usage Wallet', item_icon: 'Wallet', route_path: '/merchant-dashboard/usage_wallet', parent_item_id: null, item_order: 88 },
                     { module_id: '1', module_key: 'retail', module_name: 'Retail POS', module_icon: 'Store', module_order: 10, item_id: '113', item_key: 'retail.usage_wallet', item_label: 'Platform Usage Wallet', item_icon: 'Wallet', route_path: '/merchant-dashboard/usage_wallet', parent_item_id: null, item_order: 88 },
                     { module_id: '1', module_key: 'retail', module_name: 'Retail POS', module_icon: 'Store', module_order: 10, item_id: '109', item_key: 'retail.reports', item_label: 'Reports', item_icon: 'BarChart3', route_path: '/merchant-dashboard/reports', parent_item_id: null, item_order: 90 }
                    ];
                    
                    console.log('DEBUG menu-push check:', JSON.stringify({branchConfigExists: !!branchConfig, isOnlineActive: branchConfig?.is_online_store_active, branchName: branchConfig?.branch_name}));
                    if (branchConfig?.is_online_store_active) {
                        activeMenuToRender.push({ module_id: '1', module_key: 'retail', module_name: 'Retail POS', module_icon: 'Store', module_order: 10, item_id: '111', item_key: 'retail.online_orders', item_label: 'Online Orders', item_icon: 'Globe', route_path: '/merchant-dashboard/online-orders', parent_item_id: null, item_order: 15 });
                    }
                    if (branchConfig?.is_scan_and_go_active) {
                        activeMenuToRender.push({ module_id: '1', module_key: 'retail', module_name: 'Retail POS', module_icon: 'Store', module_order: 10, item_id: '112', item_key: 'retail.scan_and_go_orders', item_label: 'Scan & Go Orders', item_icon: 'ScanLine', route_path: '/merchant-dashboard/scan-and-go-orders', parent_item_id: null, item_order: 16 });
                    }
                    console.log('DEBUG8: reached picking-queue check, hasPermission exists=', typeof hasPermission);
                if (hasPermission('retail.picking.view')) {
                        activeMenuToRender.push({ module_id: '1', module_key: 'retail', module_name: 'Retail POS', module_icon: 'Store', module_order: 10, item_id: '113', item_key: 'retail.picking_queue', item_label: 'Picking Queue', item_icon: 'PackageSearch', route_path: '/merchant-dashboard/picking-queue', parent_item_id: null, item_order: 17 });
                    }
                    activeMenuToRender.sort((a, b) => (a.item_order || 0) - (b.item_order || 0));
                  } else if (isHotelMode) {
                    activeMenuToRender = [
                     { module_id: '2', module_key: 'hospitality', module_name: activeModuleState || tenant?.business_type || 'Hospitality', module_icon: 'Hotel', module_order: 20, item_id: '201', item_key: 'hospitality.dashboard', item_label: 'Dashboard [HOME]', item_icon: 'LayoutDashboard', route_path: '/merchant-dashboard/hospitality', parent_item_id: null, item_order: 1, permission_key: 'hospitality.dashboard.view' },
                     { module_id: '2', module_key: 'hospitality', module_name: activeModuleState || tenant?.business_type || 'Hospitality', module_icon: 'Hotel', module_order: 20, item_id: '202', item_key: 'hospitality.frontdesk', item_label: 'Front Desk & Guest', item_icon: 'ConciergeBell', route_path: '/merchant-dashboard/hospitality/frontdesk', parent_item_id: null, item_order: 2, permission_key: 'hospitality.frontdesk.view' },
                     { module_id: '2', module_key: 'hospitality', module_name: activeModuleState || tenant?.business_type || 'Hospitality', module_icon: 'Hotel', module_order: 20, item_id: '212', item_key: 'hospitality.menu', item_label: 'Menu Management', item_icon: 'UtensilsCrossed', route_path: '/merchant-dashboard/hospitality/menu', parent_item_id: null, item_order: 2, permission_key: 'hospitality.menu.manage' },
                     { module_id: '2', module_key: 'hospitality', module_name: activeModuleState || tenant?.business_type || 'Hospitality', module_icon: 'Hotel', module_order: 20, item_id: '203', item_key: 'hospitality.restaurant', item_label: 'Restaurant & Ordering', item_icon: 'Utensils', route_path: '/merchant-dashboard/hospitality/restaurant', parent_item_id: null, item_order: 3, permission_key: 'hospitality.restaurant.view' },
                     { module_id: '2', module_key: 'hospitality', module_name: activeModuleState || tenant?.business_type || 'Hospitality', module_icon: 'Hotel', module_order: 20, item_id: '204', item_key: 'hospitality.kds', item_label: 'KDS & Kitchen', item_icon: 'ChefHat', route_path: '/merchant-dashboard/hospitality/kds', parent_item_id: null, item_order: 4, permission_key: 'hospitality.kds.view' },
                     { module_id: '2', module_key: 'hospitality', module_name: activeModuleState || tenant?.business_type || 'Hospitality', module_icon: 'Hotel', module_order: 20, item_id: '205', item_key: 'hospitality.pos', item_label: 'Smart POS & Billing', item_icon: 'Receipt', route_path: '/merchant-dashboard/hospitality/pos', parent_item_id: null, item_order: 5, permission_key: 'hospitality.billing.view' },
                     { module_id: '2', module_key: 'hospitality', module_name: activeModuleState || tenant?.business_type || 'Hospitality', module_icon: 'Hotel', module_order: 20, item_id: '206', item_key: 'hospitality.housekeeping', item_label: 'Housekeeping & Laundry', item_icon: 'Sparkles', route_path: '/merchant-dashboard/hospitality/housekeeping', parent_item_id: null, item_order: 6, permission_key: 'hospitality.housekeeping.view' },
                     { module_id: '2', module_key: 'hospitality', module_name: activeModuleState || tenant?.business_type || 'Hospitality', module_icon: 'Hotel', module_order: 20, item_id: '207', item_key: 'hospitality.cloudkitchen', item_label: 'Cloud Kitchen & Delivery', item_icon: 'Cloud', route_path: '/merchant-dashboard/hospitality/cloudkitchen', parent_item_id: null, item_order: 7, permission_key: 'hospitality.cloudkitchen.view' },
                     { module_id: '2', module_key: 'hospitality', module_name: activeModuleState || tenant?.business_type || 'Hospitality', module_icon: 'Hotel', module_order: 20, item_id: '208', item_key: 'hospitality.purchase', item_label: 'Purchase & Inventory', item_icon: 'Package', route_path: '/merchant-dashboard/hospitality/purchase', parent_item_id: null, item_order: 8, permission_key: 'hospitality.purchase.view' },
                     { module_id: '2', module_key: 'hospitality', module_name: activeModuleState || tenant?.business_type || 'Hospitality', module_icon: 'Hotel', module_order: 20, item_id: '209', item_key: 'hospitality.payroll', item_label: 'Payroll & Duty', item_icon: 'Users', route_path: '/merchant-dashboard/hospitality/payroll', parent_item_id: null, item_order: 9, permission_key: 'hospitality.payroll.view' },
                     { module_id: '2', module_key: 'hospitality', module_name: activeModuleState || tenant?.business_type || 'Hospitality', module_icon: 'Hotel', module_order: 20, item_id: '210', item_key: 'hospitality.finance', item_label: 'Finance & Audit', item_icon: 'PieChart', route_path: '/merchant-dashboard/hospitality/finance', parent_item_id: null, item_order: 10, permission_key: 'hospitality.finance.view' },
                     { module_id: '2', module_key: 'hospitality', module_name: activeModuleState || tenant?.business_type || 'Hospitality', module_icon: 'Hotel', module_order: 20, item_id: '213', item_key: 'hospitality.staff', item_label: 'Staff & Roles', item_icon: 'Users', route_path: '/merchant-dashboard/hospitality/staff', parent_item_id: null, item_order: 10, permission_key: 'hospitality.staff.manage' },
                     { module_id: '2', module_key: 'hospitality', module_name: activeModuleState || tenant?.business_type || 'Hospitality', module_icon: 'Hotel', module_order: 20, item_id: '211', item_key: 'hospitality.hospitality_settings', item_label: 'Settings & Admin', item_icon: 'Settings', route_path: '/merchant-dashboard/hospitality/settings', parent_item_id: null, item_order: 11, permission_key: 'hospitality.settings.view' }
                    ].filter(item => hasPermission(item.permission_key));
                  } else if (isTransportMode || effectiveModule.toLowerCase().includes('transport') || effectiveModule.toLowerCase().includes('logistic')) {
                    activeMenuToRender = [
                     { module_id: '3', module_key: 'transport', module_name: activeModuleState || tenant?.business_type || 'Transport & Logistics', module_icon: 'Truck', module_order: 30, item_id: '301', item_key: 'transport.dashboard', item_label: 'Dashboard [HOME]', item_icon: 'LayoutDashboard', route_path: '/merchant-dashboard/transport', parent_item_id: null, item_order: 1 },
                     { module_id: '3', module_key: 'transport', module_name: activeModuleState || tenant?.business_type || 'Transport & Logistics', module_icon: 'Truck', module_order: 30, item_id: '302', item_key: 'transport.fleet', item_label: 'Fleet & Master', item_icon: 'Truck', route_path: '/merchant-dashboard/transport/fleet', parent_item_id: null, item_order: 2 },
                     { module_id: '3', module_key: 'transport', module_name: activeModuleState || tenant?.business_type || 'Transport & Logistics', module_icon: 'Truck', module_order: 30, item_id: '303', item_key: 'transport.b2b', item_label: 'B2B Logistics', item_icon: 'Factory', route_path: '/merchant-dashboard/transport/b2b', parent_item_id: null, item_order: 3 },
                     { module_id: '3', module_key: 'transport', module_name: activeModuleState || tenant?.business_type || 'Transport & Logistics', module_icon: 'Truck', module_order: 30, item_id: '304', item_key: 'transport.b2c', item_label: 'B2C Hyper-Local', item_icon: 'Bike', route_path: '/merchant-dashboard/transport/b2c', parent_item_id: null, item_order: 4 },
                     { module_id: '3', module_key: 'transport', module_name: activeModuleState || tenant?.business_type || 'Transport & Logistics', module_icon: 'Truck', module_order: 30, item_id: '305', item_key: 'transport.operations', item_label: 'Operations & Expense', item_icon: 'Wrench', route_path: '/merchant-dashboard/transport/operations', parent_item_id: null, item_order: 5 },
                     { module_id: '3', module_key: 'transport', module_name: activeModuleState || tenant?.business_type || 'Transport & Logistics', module_icon: 'Truck', module_order: 30, item_id: '306', item_key: 'transport.finance', item_label: 'Finance & Commission', item_icon: 'Wallet', route_path: '/merchant-dashboard/transport/finance', parent_item_id: null, item_order: 6 },
                     { module_id: '3', module_key: 'transport', module_name: activeModuleState || tenant?.business_type || 'Transport & Logistics', module_icon: 'Truck', module_order: 30, item_id: '307', item_key: 'transport.reports', item_label: 'Reports & Analytics', item_icon: 'LineChart', route_path: '/merchant-dashboard/transport/reports', parent_item_id: null, item_order: 7 },
                     { module_id: '3', module_key: 'transport', module_name: activeModuleState || tenant?.business_type || 'Transport & Logistics', module_icon: 'Truck', module_order: 30, item_id: '308', item_key: 'transport.transport_settings', item_label: 'Admin Settings', item_icon: 'Settings', route_path: '/merchant-dashboard/transport/settings', parent_item_id: null, item_order: 8 }
                    ];
                  } else if (isManufacturingMode) {
                    activeMenuToRender = [
                     { module_id: '4', module_key: 'manufacturing', module_name: activeModuleState || tenant?.business_type || 'Manufacturing & Production', module_icon: 'Factory', module_order: 40, item_id: '401', item_key: 'manufacturing.dashboard', item_label: 'Dashboard [HOME]', item_icon: 'LayoutDashboard', route_path: '/merchant-dashboard/manufacturing', parent_item_id: null, item_order: 1 },
                     { module_id: '4', module_key: 'manufacturing', module_name: activeModuleState || tenant?.business_type || 'Manufacturing & Production', module_icon: 'Factory', module_order: 40, item_id: '402', item_key: 'manufacturing.master', item_label: 'Master Settings', item_icon: 'Settings2', route_path: '/merchant-dashboard/manufacturing/master', parent_item_id: null, item_order: 2 },
                     { module_id: '4', module_key: 'manufacturing', module_name: activeModuleState || tenant?.business_type || 'Manufacturing & Production', module_icon: 'Factory', module_order: 40, item_id: '403', item_key: 'manufacturing.inventory', item_label: 'Inventory & Store', item_icon: 'Package', route_path: '/merchant-dashboard/manufacturing/inventory', parent_item_id: null, item_order: 3 },
                     { module_id: '4', module_key: 'manufacturing', module_name: activeModuleState || tenant?.business_type || 'Manufacturing & Production', module_icon: 'Factory', module_order: 40, item_id: '404', item_key: 'manufacturing.production', item_label: 'Production & Planning', item_icon: 'Factory', route_path: '/merchant-dashboard/manufacturing/production', parent_item_id: null, item_order: 4 },
                     { module_id: '4', module_key: 'manufacturing', module_name: activeModuleState || tenant?.business_type || 'Manufacturing & Production', module_icon: 'Factory', module_order: 40, item_id: '405', item_key: 'manufacturing.hr', item_label: 'HR, Labour & Payroll', item_icon: 'Users', route_path: '/merchant-dashboard/manufacturing/hr', parent_item_id: null, item_order: 5 },
                     { module_id: '4', module_key: 'manufacturing', module_name: activeModuleState || tenant?.business_type || 'Manufacturing & Production', module_icon: 'Factory', module_order: 40, item_id: '406', item_key: 'manufacturing.sales', item_label: 'Sales & Billing', item_icon: 'ShoppingCart', route_path: '/merchant-dashboard/manufacturing/sales', parent_item_id: null, item_order: 6 },
                     { module_id: '4', module_key: 'manufacturing', module_name: activeModuleState || tenant?.business_type || 'Manufacturing & Production', module_icon: 'Factory', module_order: 40, item_id: '407', item_key: 'manufacturing.reports', item_label: 'Reports & Costing', item_icon: 'BarChart3', route_path: '/merchant-dashboard/manufacturing/reports', parent_item_id: null, item_order: 7 },
                     { module_id: '4', module_key: 'manufacturing', module_name: activeModuleState || tenant?.business_type || 'Manufacturing & Production', module_icon: 'Factory', module_order: 40, item_id: '408', item_key: 'manufacturing.manufacturing_settings', item_label: 'Admin Settings', item_icon: 'Settings', route_path: '/merchant-dashboard/manufacturing/settings', parent_item_id: null, item_order: 8 }
                    ];
                  } else if (isHealthcareMode) {
                    activeMenuToRender = [
                     { module_id: '5', module_key: 'healthcare', module_name: activeModuleState || tenant?.business_type || 'Healthcare & Clinic', module_icon: 'Activity', module_order: 50, item_id: '501', item_key: 'healthcare.dashboard', item_label: 'Dashboard [HOME]', item_icon: 'LayoutDashboard', route_path: '/merchant-dashboard/healthcare', parent_item_id: null, item_order: 1 },
                     { module_id: '5', module_key: 'healthcare', module_name: activeModuleState || tenant?.business_type || 'Healthcare & Clinic', module_icon: 'Activity', module_order: 50, item_id: '502', item_key: 'healthcare.master', item_label: 'Master Settings', item_icon: 'Settings2', route_path: '/merchant-dashboard/healthcare/master', parent_item_id: null, item_order: 2 },
                     { module_id: '5', module_key: 'healthcare', module_name: activeModuleState || tenant?.business_type || 'Healthcare & Clinic', module_icon: 'Activity', module_order: 50, item_id: '503', item_key: 'healthcare.frontdesk', item_label: 'Front Desk & Reception', item_icon: 'Users', route_path: '/merchant-dashboard/healthcare/frontdesk', parent_item_id: null, item_order: 3 },
                     { module_id: '5', module_key: 'healthcare', module_name: activeModuleState || tenant?.business_type || 'Healthcare & Clinic', module_icon: 'Activity', module_order: 50, item_id: '504', item_key: 'healthcare.emergency', item_label: 'Emergency & Trauma', item_icon: 'AlertTriangle', route_path: '/merchant-dashboard/healthcare/emergency', parent_item_id: null, item_order: 4 },
                     { module_id: '5', module_key: 'healthcare', module_name: activeModuleState || tenant?.business_type || 'Healthcare & Clinic', module_icon: 'Activity', module_order: 50, item_id: '505', item_key: 'healthcare.ipd', item_label: 'IPD & Ward', item_icon: 'Bed', route_path: '/merchant-dashboard/healthcare/ipd', parent_item_id: null, item_order: 5 },
                     { module_id: '5', module_key: 'healthcare', module_name: activeModuleState || tenant?.business_type || 'Healthcare & Clinic', module_icon: 'Activity', module_order: 50, item_id: '506', item_key: 'healthcare.online', item_label: 'Online Care Hub', item_icon: 'Globe', route_path: '/merchant-dashboard/healthcare/online', parent_item_id: null, item_order: 6 },
                     { module_id: '5', module_key: 'healthcare', module_name: activeModuleState || tenant?.business_type || 'Healthcare & Clinic', module_icon: 'Activity', module_order: 50, item_id: '507', item_key: 'healthcare.pharmacy', item_label: 'Pharmacy & Store', item_icon: 'Pill', route_path: '/merchant-dashboard/healthcare/pharmacy', parent_item_id: null, item_order: 7 },
                     { module_id: '5', module_key: 'healthcare', module_name: activeModuleState || tenant?.business_type || 'Healthcare & Clinic', module_icon: 'Activity', module_order: 50, item_id: '508', item_key: 'healthcare.pathology', item_label: 'Pathology & Radiology', item_icon: 'Microscope', route_path: '/merchant-dashboard/healthcare/pathology', parent_item_id: null, item_order: 8 },
                     { module_id: '5', module_key: 'healthcare', module_name: activeModuleState || tenant?.business_type || 'Healthcare & Clinic', module_icon: 'Activity', module_order: 50, item_id: '509', item_key: 'healthcare.mess', item_label: 'Mess & Canteen', item_icon: 'Utensils', route_path: '/merchant-dashboard/healthcare/mess', parent_item_id: null, item_order: 9 },
                     { module_id: '5', module_key: 'healthcare', module_name: activeModuleState || tenant?.business_type || 'Healthcare & Clinic', module_icon: 'Activity', module_order: 50, item_id: '510', item_key: 'healthcare.billing', item_label: 'Billing & Discount', item_icon: 'Receipt', route_path: '/merchant-dashboard/healthcare/billing', parent_item_id: null, item_order: 10 },
                     { module_id: '5', module_key: 'healthcare', module_name: activeModuleState || tenant?.business_type || 'Healthcare & Clinic', module_icon: 'Activity', module_order: 50, item_id: '511', item_key: 'healthcare.hr', item_label: 'HR & Payroll', item_icon: 'UsersRound', route_path: '/merchant-dashboard/healthcare/hr', parent_item_id: null, item_order: 11 },
                     { module_id: '5', module_key: 'healthcare', module_name: activeModuleState || tenant?.business_type || 'Healthcare & Clinic', module_icon: 'Activity', module_order: 50, item_id: '512', item_key: 'healthcare.reports', item_label: 'Reports & Analytics', item_icon: 'LineChart', route_path: '/merchant-dashboard/healthcare/reports', parent_item_id: null, item_order: 12 },
                     { module_id: '5', module_key: 'healthcare', module_name: activeModuleState || tenant?.business_type || 'Healthcare & Clinic', module_icon: 'Activity', module_order: 50, item_id: '513', item_key: 'healthcare.healthcare_settings', item_label: 'Admin Settings', item_icon: 'Settings', route_path: '/merchant-dashboard/healthcare/settings', parent_item_id: null, item_order: 13 }
                    ];
                  } else if (isEducationMode) {
                    // Education Module Menu Items
                    activeMenuToRender = [
                     { module_id: '6', module_key: 'education', module_name: activeModuleState || tenant?.business_type || 'Education & School', module_icon: 'GraduationCap', module_order: 60, item_id: '601', item_key: 'education.dashboard', item_label: 'Admin Dashboard', item_icon: 'LayoutDashboard', route_path: '/merchant-dashboard/education', parent_item_id: null, item_order: 1 },
                     { module_id: '6', module_key: 'education', module_name: activeModuleState || tenant?.business_type || 'Education & School', module_icon: 'GraduationCap', module_order: 60, item_id: '602', item_key: 'education.office', item_label: 'Office Manager Desk', item_icon: 'Briefcase', route_path: '/merchant-dashboard/education/office', parent_item_id: null, item_order: 2 },
                     { module_id: '6', module_key: 'education', module_name: activeModuleState || tenant?.business_type || 'Education & School', module_icon: 'GraduationCap', module_order: 60, item_id: '603', item_key: 'education.principal', item_label: 'Principal Dashboard', item_icon: 'Eye', route_path: '/merchant-dashboard/education/principal', parent_item_id: null, item_order: 3 },
                     { module_id: '6', module_key: 'education', module_name: activeModuleState || tenant?.business_type || 'Education & School', module_icon: 'GraduationCap', module_order: 60, item_id: '604', item_key: 'education.teacher', item_label: 'Teacher Panel', item_icon: 'Users', route_path: '/merchant-dashboard/education/teacher', parent_item_id: null, item_order: 4 },
                     { module_id: '6', module_key: 'education', module_name: activeModuleState || tenant?.business_type || 'Education & School', module_icon: 'GraduationCap', module_order: 60, item_id: '605', item_key: 'education.security', item_label: 'Gate Security & Visitor', item_icon: 'ShieldCheck', route_path: '/merchant-dashboard/education/security', parent_item_id: null, item_order: 5 },
                     { module_id: '6', module_key: 'education', module_name: activeModuleState || tenant?.business_type || 'Education & School', module_icon: 'GraduationCap', module_order: 60, item_id: '606', item_key: 'education.transport', item_label: 'Bus & Transport', item_icon: 'Bus', route_path: '/merchant-dashboard/education/transport', parent_item_id: null, item_order: 6 },
                     { module_id: '6', module_key: 'education', module_name: activeModuleState || tenant?.business_type || 'Education & School', module_icon: 'GraduationCap', module_order: 60, item_id: '607', item_key: 'education.library', item_label: 'Library Counter', item_icon: 'BookOpen', route_path: '/merchant-dashboard/education/library', parent_item_id: null, item_order: 7 },
                     { module_id: '6', module_key: 'education', module_name: activeModuleState || tenant?.business_type || 'Education & School', module_icon: 'GraduationCap', module_order: 60, item_id: '608', item_key: 'education.hostel', item_label: 'Hostel & Mess', item_icon: 'Home', route_path: '/merchant-dashboard/education/hostel', parent_item_id: null, item_order: 8 },
                     { module_id: '6', module_key: 'education', module_name: activeModuleState || tenant?.business_type || 'Education & School', module_icon: 'GraduationCap', module_order: 60, item_id: '609', item_key: 'education.parents', item_label: 'Parents App Hub', item_icon: 'Smartphone', route_path: '/merchant-dashboard/education/parents', parent_item_id: null, item_order: 9 },
                     { module_id: '6', module_key: 'education', module_name: activeModuleState || tenant?.business_type || 'Education & School', module_icon: 'GraduationCap', module_order: 60, item_id: '610', item_key: 'education.student', item_label: 'Student Learning Hub', item_icon: 'Laptop', route_path: '/merchant-dashboard/education/student', parent_item_id: null, item_order: 10 },
                     { module_id: '6', module_key: 'education', module_name: activeModuleState || tenant?.business_type || 'Education & School', module_icon: 'GraduationCap', module_order: 60, item_id: '611', item_key: 'education.automation', item_label: 'System Automation', item_icon: 'Cpu', route_path: '/merchant-dashboard/education/automation', parent_item_id: null, item_order: 11 },
                     { module_id: '6', module_key: 'education', module_name: activeModuleState || tenant?.business_type || 'Education & School', module_icon: 'GraduationCap', module_order: 60, item_id: '612', item_key: 'education.education_settings', item_label: 'Master Settings', item_icon: 'Settings', route_path: '/merchant-dashboard/education/settings', parent_item_id: null, item_order: 12 }
                    ];
                  } else if (isServicesMode) {
                    activeMenuToRender = [
                     { module_id: '7', module_key: 'services', module_name: activeModuleState || tenant?.business_type || 'Daily Services', module_icon: 'Wrench', module_order: 70, item_id: '701', item_key: 'services.dashboard', item_label: 'Professional Dashboard', item_icon: 'LayoutDashboard', route_path: '/merchant-dashboard/services', parent_item_id: null, item_order: 1 },
                     { module_id: '7', module_key: 'services', module_name: activeModuleState || tenant?.business_type || 'Daily Services', module_icon: 'Wrench', module_order: 70, item_id: '702', item_key: 'services.booking', item_label: 'Booking & Appointments', item_icon: 'Calendar', route_path: '/merchant-dashboard/services/booking', parent_item_id: null, item_order: 2 },
                     { module_id: '7', module_key: 'services', module_name: activeModuleState || tenant?.business_type || 'Daily Services', module_icon: 'Wrench', module_order: 70, item_id: '703', item_key: 'services.catalog', item_label: 'Service Catalog', item_icon: 'BookOpen', route_path: '/merchant-dashboard/services/catalog', parent_item_id: null, item_order: 3 },
                     { module_id: '7', module_key: 'services', module_name: activeModuleState || tenant?.business_type || 'Daily Services', module_icon: 'Wrench', module_order: 70, item_id: '704', item_key: 'services.billing', item_label: 'Smart Billing', item_icon: 'Receipt', route_path: '/merchant-dashboard/services/billing', parent_item_id: null, item_order: 4 },
                     { module_id: '7', module_key: 'services', module_name: activeModuleState || tenant?.business_type || 'Daily Services', module_icon: 'Wrench', module_order: 70, item_id: '705', item_key: 'services.staff', item_label: 'Staff & Team', item_icon: 'Users', route_path: '/merchant-dashboard/services/staff', parent_item_id: null, item_order: 5 },
                     { module_id: '7', module_key: 'services', module_name: activeModuleState || tenant?.business_type || 'Daily Services', module_icon: 'Wrench', module_order: 70, item_id: '706', item_key: 'services.inventory', item_label: 'Inventory Management', item_icon: 'Package', route_path: '/merchant-dashboard/services/inventory', parent_item_id: null, item_order: 6 },
                     { module_id: '7', module_key: 'services', module_name: activeModuleState || tenant?.business_type || 'Daily Services', module_icon: 'Wrench', module_order: 70, item_id: '707', item_key: 'services.reports', item_label: 'Reports & Analytics', item_icon: 'LineChart', route_path: '/merchant-dashboard/services/reports', parent_item_id: null, item_order: 7 },
                     { module_id: '7', module_key: 'services', module_name: activeModuleState || tenant?.business_type || 'Daily Services', module_icon: 'Wrench', module_order: 70, item_id: '708', item_key: 'services.services_settings', item_label: 'Admin Settings', item_icon: 'Settings', route_path: '/merchant-dashboard/services/settings', parent_item_id: null, item_order: 8 }
                    ];
                  } else if (isAgricultureMode) {
                    activeMenuToRender = [
                     { module_id: '8', module_key: 'agriculture', module_name: activeModuleState || tenant?.business_type || 'Agriculture', module_icon: 'Tractor', module_order: 80, item_id: '801', item_key: 'agriculture.dashboard', item_label: 'Dashboard [HOME]', item_icon: 'LayoutDashboard', route_path: '/merchant-dashboard/agriculture', parent_item_id: null, item_order: 1 },
                     { module_id: '8', module_key: 'agriculture', module_name: activeModuleState || tenant?.business_type || 'Agriculture', module_icon: 'Tractor', module_order: 80, item_id: '802', item_key: 'agriculture.farm', item_label: 'Farm & Crop', item_icon: 'Sprout', route_path: '/merchant-dashboard/agriculture/farm', parent_item_id: null, item_order: 2 },
                     { module_id: '8', module_key: 'agriculture', module_name: activeModuleState || tenant?.business_type || 'Agriculture', module_icon: 'Tractor', module_order: 80, item_id: '803', item_key: 'agriculture.inventory', item_label: 'Godown & Inventory', item_icon: 'Warehouse', route_path: '/merchant-dashboard/agriculture/inventory', parent_item_id: null, item_order: 3 },
                     { module_id: '8', module_key: 'agriculture', module_name: activeModuleState || tenant?.business_type || 'Agriculture', module_icon: 'Tractor', module_order: 80, item_id: '804', item_key: 'agriculture.team', item_label: 'Team & Labor Diary', item_icon: 'Users', route_path: '/merchant-dashboard/agriculture/team', parent_item_id: null, item_order: 4 },
                     { module_id: '8', module_key: 'agriculture', module_name: activeModuleState || tenant?.business_type || 'Agriculture', module_icon: 'Tractor', module_order: 80, item_id: '805', item_key: 'agriculture.finance', item_label: 'Bank & Loan Accounts', item_icon: 'Landmark', route_path: '/merchant-dashboard/agriculture/finance', parent_item_id: null, item_order: 5 },
                     { module_id: '8', module_key: 'agriculture', module_name: activeModuleState || tenant?.business_type || 'Agriculture', module_icon: 'Tractor', module_order: 80, item_id: '806', item_key: 'agriculture.billing', item_label: 'Sales & Billing', item_icon: 'Receipt', route_path: '/merchant-dashboard/agriculture/billing', parent_item_id: null, item_order: 6 },
                     { module_id: '8', module_key: 'agriculture', module_name: activeModuleState || tenant?.business_type || 'Agriculture', module_icon: 'Tractor', module_order: 80, item_id: '807', item_key: 'agriculture.reports', item_label: 'Reports & Analytics', item_icon: 'LineChart', route_path: '/merchant-dashboard/agriculture/reports', parent_item_id: null, item_order: 7 },
                     { module_id: '8', module_key: 'agriculture', module_name: activeModuleState || tenant?.business_type || 'Agriculture', module_icon: 'Tractor', module_order: 80, item_id: '808', item_key: 'agriculture.agriculture_settings', item_label: 'Admin Settings', item_icon: 'Settings', route_path: '/merchant-dashboard/agriculture/settings', parent_item_id: null, item_order: 8 }
                    ];
                  } else {
                    // Fallback to transport if all else fails but the name is transport
                    if (effectiveModule.includes('Transport')) {
                      activeMenuToRender = [
                       { module_id: '3', module_key: 'transport', module_name: activeModuleState || tenant?.business_type || 'Transport & Logistics', module_icon: 'Truck', module_order: 30, item_id: '301', item_key: 'transport.dashboard', item_label: 'Dashboard [HOME]', item_icon: 'LayoutDashboard', route_path: '/merchant-dashboard/transport', parent_item_id: null, item_order: 1 },
                       { module_id: '3', module_key: 'transport', module_name: activeModuleState || tenant?.business_type || 'Transport & Logistics', module_icon: 'Truck', module_order: 30, item_id: '302', item_key: 'transport.fleet', item_label: 'Fleet & Master', item_icon: 'Truck', route_path: '/merchant-dashboard/transport/fleet', parent_item_id: null, item_order: 2 },
                       { module_id: '3', module_key: 'transport', module_name: activeModuleState || tenant?.business_type || 'Transport & Logistics', module_icon: 'Truck', module_order: 30, item_id: '303', item_key: 'transport.b2b', item_label: 'B2B Logistics', item_icon: 'Factory', route_path: '/merchant-dashboard/transport/b2b', parent_item_id: null, item_order: 3 },
                       { module_id: '3', module_key: 'transport', module_name: activeModuleState || tenant?.business_type || 'Transport & Logistics', module_icon: 'Truck', module_order: 30, item_id: '304', item_key: 'transport.b2c', item_label: 'B2C Hyper-Local', item_icon: 'Bike', route_path: '/merchant-dashboard/transport/b2c', parent_item_id: null, item_order: 4 },
                       { module_id: '3', module_key: 'transport', module_name: activeModuleState || tenant?.business_type || 'Transport & Logistics', module_icon: 'Truck', module_order: 30, item_id: '305', item_key: 'transport.operations', item_label: 'Operations & Expense', item_icon: 'Wrench', route_path: '/merchant-dashboard/transport/operations', parent_item_id: null, item_order: 5 },
                       { module_id: '3', module_key: 'transport', module_name: activeModuleState || tenant?.business_type || 'Transport & Logistics', module_icon: 'Truck', module_order: 30, item_id: '306', item_key: 'transport.finance', item_label: 'Finance & Commission', item_icon: 'Wallet', route_path: '/merchant-dashboard/transport/finance', parent_item_id: null, item_order: 6 },
                       { module_id: '3', module_key: 'transport', module_name: activeModuleState || tenant?.business_type || 'Transport & Logistics', module_icon: 'Truck', module_order: 30, item_id: '307', item_key: 'transport.reports', item_label: 'Reports & Analytics', item_icon: 'LineChart', route_path: '/merchant-dashboard/transport/reports', parent_item_id: null, item_order: 7 },
                       { module_id: '3', module_key: 'transport', module_name: activeModuleState || tenant?.business_type || 'Transport & Logistics', module_icon: 'Truck', module_order: 30, item_id: '308', item_key: 'transport.transport_settings', item_label: 'Admin Settings', item_icon: 'Settings', route_path: '/merchant-dashboard/transport/settings', parent_item_id: null, item_order: 8 }
                      ];
                    }
                  }
                }

                if (activeMenuToRender.length === 0) {
                  return (
                    <div className="px-3 py-4 text-center text-sm text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                      No menu items found. [Module: {effectiveModule}] [Transport: {isTransportMode ? 'Y' : 'N'}] [Hotel: {isHotelMode ? 'Y' : 'N'}] [Str: {activeStr}] [Edu: {isEducationMode ? 'Y' : 'N'}] [Mfg: {isManufacturingMode ? 'Y' : 'N'}] [Health: {isHealthcareMode ? 'Y' : 'N'}] [Srv: {isServicesMode ? 'Y' : 'N'}] [Agri: {isAgricultureMode ? 'Y' : 'N'}]
                    </div>
                  );
                }

                return Array.from(new Set(activeMenuToRender.map(m => m.module_id))).map(moduleId => {
                  const moduleItems = activeMenuToRender.filter(m => m.module_id === moduleId);
                  const moduleName = moduleItems[0].module_name;

                  return (
                    <div key={moduleId} className="space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold px-3 mb-2">{moduleName}</p>
                      {moduleItems.map((item) => (
                        <button
                          key={item.item_id}
                          onClick={() => {
                            const tabId = item.item_key.split('.').pop() || item.item_key;
                            setActiveTab(tabId);
                            setIsMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-colors ${
                            activeTab === (item.item_key.split('.').pop() || item.item_key)
                              ? 'text-primary' 
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-100'
                          }`}
                          style={activeTab === (item.item_key.split('.').pop() || item.item_key) && tenant ? { backgroundColor: `${tenant.primary_color}1a`, color: tenant.primary_color } : activeTab === (item.item_key.split('.').pop() || item.item_key) ? { backgroundColor: 'var(--primary-10)', color: 'var(--primary)' } : {}}
                        >
                          <DynamicIcon name={item.item_icon} size={18} />
                          {item.item_label}
                        </button>
                      ))}
                    </div>
                  );
                });
              })()}

            </nav>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
              <button 
                onClick={() => {
                  setActiveTab('wallet');
                  setIsMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-colors ${
                  activeTab === 'wallet'
                    ? 'text-primary bg-primary/10' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Wallet size={18} />
                Wallet
              </button>
              <button 
                onClick={() => {
                  setActiveTab('settings');
                  setIsMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-colors ${
                  activeTab === "settings"
                    ? 'text-primary bg-primary/10' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Settings size={18} />
                Settings
              </button>
              <button 
                onClick={() => {
                  setIsMenuOpen(false);
                  setShowSwitchBusinessModal(true);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Store size={18} />
                Switch Business
              </button>
              <button 
                onClick={() => {
                  setIsMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {showSwitchBusinessModal && currentTenantId && (
        <SwitchBusinessModal
          currentTenantId={currentTenantId}
          onClose={() => setShowSwitchBusinessModal(false)}
          onSelectBranch={(moduleKey, moduleName, branchId) => {
            setActiveModuleState(moduleName as ModuleType);
            setActiveBranchId(branchId);
            setActiveTab('dashboard');
            setShowSwitchBusinessModal(false);
          }}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        <header className="h-28 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between" style={tenant ? { borderBottomColor: tenant.primary_color } : {}}>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="p-1.5 -ml-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Menu"
            >
              <Menu size={22} />
            </button>
            {tenant ? (
              <div className="flex items-center gap-2">
                 <img src={tenant.logo_url} alt="Logo" className="w-16 h-16 rounded-full object-cover" />
                 <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">{tenant.brand_name} POS</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <img src="/logolight.png" alt="BahiBox Logo" className="h-24 dark:hidden object-contain" />
                <img src="/logodark.png" alt="BahiBox Logo" className="h-24 hidden dark:block object-contain" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 relative">
            <NotificationBell />
            <button 
              onClick={() => document.documentElement.classList.toggle('dark')}
              className="p-1.5 text-slate-400 dark:text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Toggle Dark Mode"
            >
              <LucideIcons.Sun size={20} className="hidden dark:block" />
              <LucideIcons.Moon size={20} className="dark:hidden block" />
            </button>
            
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-2"></div>
            
            <button 
              onClick={handleLogout}
              className="p-1.5 text-slate-400 dark:text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {(isExpiringSoon || isExpired) && activeSubscription && (
          <div className={`px-6 py-3 flex items-center justify-between text-sm ${isExpired ? 'bg-red-50 text-red-700 border-b border-red-100' : 'bg-amber-50 text-amber-700 border-b border-amber-100'}`}>
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} />
              <p>
                {isExpired ? (
                  <>Your subscription for <strong>{activeModuleState}</strong> has expired.</>
                ) : (
                  <>Your subscription for <strong>{activeModuleState}</strong> expires in <strong>{daysUntilExpiry} {daysUntilExpiry === 1 ? 'day' : 'days'}</strong>.</>
                )}
              </p>
            </div>
            <button 
              onClick={() => navigate(`/pricing?module=${encodeURIComponent(activeModuleState)}`)}
              className={`px-4 py-1.5 font-semibold rounded-full transition-colors text-xs ${isExpired ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-amber-600 hover:bg-amber-700 text-white'}`}
            >
              Renew Now
            </button>
          </div>
        )}

        <div className={`flex-1 overflow-auto bg-slate-50 dark:bg-slate-900 ${activeTab === 'fullpos' ? '' : 'p-4 md:p-6 lg:p-8'}`}>
          {/* RETAIL POS */}
          {activeTab === "dashboard" && activeModuleState === 'Retail POS' && <RetailDashboard setActiveTab={setActiveTab} />}
        {activeTab === 'fullpos' && activeModuleState === 'Retail POS' && <RetailPOSFullScreen branchConfig={branchConfig} hideTabBar={true} />}
        {activeTab === 'recent_sales' && activeModuleState === 'Retail POS' && <InvoiceHistory />}
        {activeTab === 'staff_activity' && activeModuleState === 'Retail POS' && <StaffActivityView />}
          {activeTab === 'usage_wallet' && activeModuleState === 'Retail POS' && <PlatformUsageWalletView />}
        {activeTab === "online_orders" && activeModuleState === 'Retail POS' && <RetailOnlineOrdersPage />}
        {activeTab === 'gate_keeper' && activeModuleState === 'Retail POS' && <GateKeeperView />}
        {activeTab === 'inward_payment' && activeModuleState === 'Retail POS' && <InwardPaymentList />}
        {activeTab === 'outward_payment' && activeModuleState === 'Retail POS' && <OutwardPaymentList />}
        {activeTab === 'daily_expense' && activeModuleState === 'Retail POS' && <DailyExpensePage />}
        {activeTab === 'other_income' && activeModuleState === 'Retail POS' && <OtherIncomePage />}
        {activeTab === 'documents' && activeModuleState === 'Retail POS' && <DocumentsHub />}
        {activeTab === 'picking_queue' && activeModuleState === 'Retail POS' && <PickingQueuePage />}
        {activeTab === 'purchase_order' && activeModuleState === 'Retail POS' && <RetailPurchases />}
        {activeTab === "scan_and_go_orders" && activeModuleState === 'Retail POS' && <RetailScanGoOrdersPage />}
          {activeTab === "pos" && activeModuleState === 'Retail POS' && <SaleInvoices />}
          {activeTab === "inventory" && activeModuleState === 'Retail POS' && <RetailProductsInventory />}          
          {(activeTab === 'purchases' || activeTab === 'purchase') && activeModuleState === 'Retail POS' && <PurchaseInvoices />}
          {(activeTab === 'parties' || activeTab === 'customers' || activeTab === 'suppliers') && activeModuleState === 'Retail POS' && <RetailCustomerSupplier />}
          {activeTab === 'discounts' && activeModuleState === 'Retail POS' && <RetailDiscountsOffers />}
          {activeTab === 'ledger' && activeModuleState === 'Retail POS' && <LedgerView />}
          {(activeTab === "store_settings" || activeTab === "store-settings") && activeModuleState === "Retail POS" && <RetailStoreSettings onConfigChange={() => setConfigRefreshCounter(c => c + 1)} />}


          {/* HOSPITALITY */}
          {activeTab === "dashboard" && isHotelMode && <HospitalityDashboard />}
          {activeTab === 'frontdesk' && isHotelMode && <HospitalityFrontDesk />}
          {activeTab === 'menu' && isHotelMode && <HospitalityMenuManagement />}
          {activeTab === 'restaurant' && isHotelMode && <HospitalityRestaurant />}
          {activeTab === 'kds' && isHotelMode && <HospitalityKDS />}
          {activeTab === "pos" && isHotelMode && <HospitalityPOS />}
          {activeTab === 'housekeeping' && isHotelMode && <HospitalityHousekeeping />}
          {activeTab === 'cloudkitchen' && isHotelMode && <HospitalityCloudKitchen />}
          {activeTab === 'purchase' && isHotelMode && <HospitalityPurchase />}
          {activeTab === 'payroll' && isHotelMode && <HospitalityPayroll />}
          {activeTab === 'finance' && isHotelMode && <HospitalityFinance />}
          {activeTab === 'hospitality_settings' && isHotelMode && <HospitalitySettings />}

          {/* TRANSPORT & LOGISTICS */}
          {activeTab === "dashboard" && isTransportMode && <TransportPlaceholder title="Transport Dashboard" />}
          {activeTab === 'fleet' && isTransportMode && <TransportPlaceholder title="Fleet & Master Settings" />}
          {activeTab === 'b2b' && isTransportMode && <TransportPlaceholder title="B2B Logistics" />}
          {activeTab === 'b2c' && isTransportMode && <TransportPlaceholder title="B2C Hyper-Local Delivery" />}
          {activeTab === 'operations' && isTransportMode && <TransportPlaceholder title="Company Operations & Expense" />}
          {activeTab === 'finance' && isTransportMode && <TransportPlaceholder title="Finance, Commission & Billing" />}
          {activeTab === "reports" && isTransportMode && <TransportPlaceholder title="Reports & Analytics" />}
          {activeTab === 'transport_settings' && isTransportMode && <TransportPlaceholder title="Admin & Integration Settings" />}

          {/* MANUFACTURING & PRODUCTION */}
          {activeTab === "dashboard" && isManufacturingMode && <ManufacturingPlaceholder title="Factory Dashboard" />}
          {activeTab === 'master' && isManufacturingMode && <ManufacturingPlaceholder title="Master Settings" />}
          {activeTab === "inventory" && isManufacturingMode && <ManufacturingPlaceholder title="Inventory & Store" />}
          {activeTab === 'production' && isManufacturingMode && <ManufacturingPlaceholder title="Production & Planning" />}
          {activeTab === 'hr' && isManufacturingMode && <ManufacturingPlaceholder title="HR, Labour & Payroll" />}
          {activeTab === 'sales' && isManufacturingMode && <ManufacturingPlaceholder title="Sales & Billing" />}
          {activeTab === "reports" && isManufacturingMode && <ManufacturingPlaceholder title="Reports & Costing" />}
          {activeTab === 'manufacturing_settings' && isManufacturingMode && <ManufacturingPlaceholder title="Admin Settings" />}

          {/* HEALTHCARE & CLINIC */}
          {activeTab === "dashboard" && isHealthcareMode && <HealthcarePlaceholder title="Hospital Dashboard" />}
          {activeTab === 'master' && isHealthcareMode && <HealthcarePlaceholder title="Master Settings" />}
          {activeTab === 'frontdesk' && isHealthcareMode && <HealthcarePlaceholder title="Front Desk & Reception" />}
          {activeTab === 'emergency' && isHealthcareMode && <HealthcarePlaceholder title="Emergency & Trauma" />}
          {activeTab === 'ipd' && isHealthcareMode && <HealthcarePlaceholder title="IPD & Ward" />}
          {activeTab === 'online' && isHealthcareMode && <HealthcarePlaceholder title="Online Care Hub" />}
          {activeTab === 'pharmacy' && isHealthcareMode && <HealthcarePlaceholder title="Pharmacy & Medical Store" />}
          {activeTab === 'pathology' && isHealthcareMode && <HealthcarePlaceholder title="Pathology & Radiology" />}
          {activeTab === 'mess' && isHealthcareMode && <HealthcarePlaceholder title="Mess & Canteen" />}
          {activeTab === "billing" && isHealthcareMode && <HealthcarePlaceholder title="Smart Billing & Discount" />}
          {activeTab === 'hr' && isHealthcareMode && <HealthcarePlaceholder title="HR & Payroll" />}
          {activeTab === "reports" && isHealthcareMode && <HealthcarePlaceholder title="Reports & Analytics" />}
          {activeTab === 'healthcare_settings' && isHealthcareMode && <HealthcarePlaceholder title="Admin Settings" />}

          {/* EDUCATION & SCHOOL */}
          {activeTab === "dashboard" && isEducationMode && <EducationPlaceholder title="Admin Dashboard" />}
          {activeTab === 'office' && isEducationMode && <EducationPlaceholder title="Office Manager Desk" />}
          {activeTab === 'principal' && isEducationMode && <EducationPlaceholder title="Principal Dashboard" />}
          {activeTab === 'teacher' && isEducationMode && <EducationPlaceholder title="Teacher Panel" />}
          {activeTab === 'security' && isEducationMode && <EducationPlaceholder title="Gate Security & Visitor" />}
          {activeTab === 'transport' && isEducationMode && <EducationPlaceholder title="Bus & Transport" />}
          {activeTab === 'library' && isEducationMode && <EducationPlaceholder title="Library Counter" />}
          {activeTab === 'hostel' && isEducationMode && <EducationPlaceholder title="Hostel & Mess" />}
          {activeTab === 'parents' && isEducationMode && <EducationPlaceholder title="Parents App Hub" />}
          {activeTab === 'student' && isEducationMode && <EducationPlaceholder title="Student Learning Hub" />}
          {activeTab === 'automation' && isEducationMode && <EducationPlaceholder title="System Automation" />}
          {activeTab === 'education_settings' && isEducationMode && <EducationPlaceholder title="Master Settings" />}

          {/* DAILY SERVICES */}
          {activeTab === "dashboard" && isServicesMode && <ServicesPlaceholder title="Service Professional Dashboard" />}
          {activeTab === 'booking' && isServicesMode && <ServicesPlaceholder title="Booking & Appointments" />}
          {activeTab === 'catalog' && isServicesMode && <ServicesPlaceholder title="Service Catalog & Rate Card" />}
          {activeTab === "billing" && isServicesMode && <ServicesPlaceholder title="Smart Billing & Payment" />}
          {activeTab === 'staff' && isServicesMode && <StaffTeamView />}
          {activeTab === "inventory" && isServicesMode && <ServicesPlaceholder title="Inventory & Material Management" />}
          {activeTab === "reports" && isServicesMode && <ServicesPlaceholder title="Reports & Analytics" />}
          {activeTab === 'services_settings' && isServicesMode && <ServicesAdminSettings />}

          {/* AGRICULTURE / FARMING */}
          {activeTab === "dashboard" && isAgricultureMode && <AgriculturePlaceholder title="Farm Dashboard" />}
          {activeTab === 'farm' && isAgricultureMode && <AgriculturePlaceholder title="My Farm & Crop" />}
          {activeTab === "inventory" && isAgricultureMode && <AgriculturePlaceholder title="Godown & Inventory" />}
          {activeTab === 'team' && isAgricultureMode && <AgriculturePlaceholder title="Team & Labor Diary" />}
          {activeTab === 'finance' && isAgricultureMode && <AgriculturePlaceholder title="Bank & Loan Accounts" />}
          {activeTab === "billing" && isAgricultureMode && <AgriculturePlaceholder title="Sales & Billing" />}
          {activeTab === "reports" && isAgricultureMode && <AgriculturePlaceholder title="Reports & Analytics" />}
          {activeTab === 'agriculture_settings' && isAgricultureMode && <AgriculturePlaceholder title="Admin Settings" />}

          {/* HYBRID POS FALLBACK */}
          {activeTab === "pos" && activeModuleState !== 'Retail POS' && !isHotelMode && !isTransportMode && !isManufacturingMode && !isHealthcareMode && !isEducationMode && !isServicesMode && !isAgricultureMode && (
            <HybridPOSView 
              products={products} 
              setProducts={setProducts} 
              orders={orders} 
              setOrders={setOrders} 
              branchConfig={branchConfig}
            />
          )}

          {/* SHARED / OTHER MODULES */}
          {activeTab === "dashboard" && activeModuleState !== 'Retail POS' && !isHotelMode && !isTransportMode && !isManufacturingMode && !isHealthcareMode && !isEducationMode && !isServicesMode && !isAgricultureMode && <RetailDashboard setActiveTab={setActiveTab} />}
          {(activeTab === 'gst' || activeTab === "reports") && !isTransportMode && !isManufacturingMode && !isHealthcareMode && !isEducationMode && !isServicesMode && !isAgricultureMode && <ReportsHub />}
          {activeTab === 'crm' && <CRMView />}
          {activeTab === 'finance' && !isHotelMode && !isTransportMode && !isManufacturingMode && !isHealthcareMode && !isEducationMode && !isServicesMode && !isAgricultureMode && <FinanceDashboard />}
          {activeTab === 'staff' && !isServicesMode && !isAgricultureMode && <StaffRolesView />}
          {activeTab === "settings" && <SettingsView activeModule={activeModuleState} />}
          {activeTab === 'wallet' && <UniversalMerchantWalletView />}
        </div>
      </main>

      {/* Module Activation Modal */}
      {showActivationModal && selectedModuleToActivate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 flex flex-col md:flex-row">
             {/* Left Column: Pricing Tiers */}
             <div className="flex-1 p-8 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                <div className="flex justify-between items-start mb-6">
                   <div>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">Activate {selectedModuleToActivate.name}</h2>
                      <p className="text-slate-500 dark:text-slate-400 text-sm">Choose a plan to unlock this module.</p>
                   </div>
                   <button onClick={() => setShowActivationModal(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-400 hover:bg-slate-200 dark:bg-slate-700 rounded-full md:hidden">
                      <X size={20} />
                   </button>
                </div>
                
                <div className="space-y-4">
                  {(() => {
                    const modName = getOfficialModuleName(selectedModuleToActivate.id, selectedModuleToActivate.name || (selectedModuleToActivate as any).title);
                    const dynamicPlansForModule = adminPlans.filter((p: any) => p.moduleName === modName && p.isActive !== false).sort((a, b) => (a.priceMonthly || 0) - (b.priceMonthly || 0));
                    
                    if (dynamicPlansForModule.length > 0) {
                      return dynamicPlansForModule.map((plan, idx) => {
                        const isPopular = plan.tier.toLowerCase() === 'premium' || plan.tier.toLowerCase() === 'growth plan' || idx === 1;
                        const cycle = planCycles[plan.id] || 'Month';
                        const displayPrice = cycle === 'Two Years' ? (plan.priceYearly || 0) * 2 : (cycle === 'One Year' ? (plan.priceYearly || 0) : (plan.priceMonthly || 0));
                        return (
                           <div key={plan.id} className={`bg-white dark:bg-slate-950 border-${isPopular ? '2 border-primary shadow-sm' : 'border border-slate-200 dark:border-slate-800 hover:border-primary/50 cursor-pointer'} rounded-xl p-5 relative overflow-hidden group transition-colors`}>
                              {isPopular && (
                                 <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg uppercase tracking-wider">Recommended</div>
                              )}
                              <div className="flex justify-between items-center mb-2 mt-1">
                                 <div>
                                   <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">{plan.tier}</p>
                                   <h3 className={`font-bold text-lg ${isPopular ? 'text-primary' : 'text-slate-900 dark:text-slate-100'}`}>{plan.name}</h3>
                                 </div>
                                 <div className="flex items-center gap-2">
                                     <span className={`text-xl font-black ${isPopular ? 'text-primary' : 'text-slate-900 dark:text-slate-100'}`}>₹{displayPrice}</span>
                                     <div className="w-24">
                                       <Select value={cycle} onValueChange={(val) => setPlanCycles({...planCycles, [plan.id]: val})}>
                                         <SelectTrigger className="h-6 text-xs font-medium bg-slate-50 dark:bg-slate-900 border-0 focus:ring-0 text-slate-600 dark:text-slate-400 px-2 py-0">
                                           <SelectValue />
                                         </SelectTrigger>
                                         <SelectContent>
                                           <SelectItem value="Month">Month</SelectItem>
                                           <SelectItem value="One Year">One Year</SelectItem>
                                           <SelectItem value="Two Years">Two Years</SelectItem>
                                         </SelectContent>
                                       </Select>
                                     </div>
                                 </div>
                              </div>
                              <div className="text-sm text-slate-500 dark:text-slate-400 mb-4 space-y-1">
                                {plan.features?.map((feature: any, i: any) => (
                                   <div key={i} className="flex items-center gap-2">
                                      <CheckCircle2 size={14} className={isPopular ? 'text-primary' : 'text-emerald-500'} />
                                      <span className={isPopular ? 'font-medium text-slate-700 dark:text-slate-300' : ''}>{feature}</span>
                                   </div>
                                ))}
                                {(!plan.features || plan.features.length === 0) && (
                                  <p className="italic text-slate-400">No features listed</p>
                                )}
                              </div>
                              <button 
                                 onClick={() => {
                                   if (plan.priceMonthly === 0) {
                                      handleActivateFreePlan(selectedModuleToActivate);
                                   } else {
                                      setPaymentModule(selectedModuleToActivate.id);
                                      setPaymentPlan(plan.name);
                                      setPaymentAmount(displayPrice * 1.18);
                                      setShowActivationModal(false);
                                      setShowPaymentModal(true);
                                   }
                                 }}
                                 disabled={isActivating}
                                 className={`w-full py-2.5 rounded-lg font-bold transition-colors ${isPopular ? 'bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20' : 'border-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-primary hover:text-primary'} disabled:opacity-50`}
                              >
                                 {isActivating && plan.priceMonthly === 0 ? 'Activating...' : (plan.priceMonthly === 0 ? `Activate ${plan.name}` : `Select ${plan.name}`)}
                              </button>
                           </div>
                        );
                      });
                    }

                    return (
                      <>
                         {/* Free Tier */}
                         <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-primary/50 transition-colors cursor-pointer relative overflow-hidden group">
                            {selectedModuleToActivate.test_mode_free && (
                               <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-1 rounded-bl-lg">TEST MODE</div>
                            )}
                            <div className="flex justify-between items-center mb-2">
                               <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">Free Plan</h3>
                               <span className="text-xl font-black text-slate-900 dark:text-slate-100">₹{selectedModuleToActivate.test_mode_free ? '1' : '0'}</span>
                            </div>
                            <div className="text-sm text-slate-500 dark:text-slate-400 mb-4 space-y-1">
                              {selectedModuleToActivate.features_free?.map((feature: any, i: any) => (
                                 <div key={i} className="flex items-center gap-2">
                                    <CheckCircle2 size={14} className="text-emerald-500" />
                                    <span>{feature}</span>
                                 </div>
                              ))}
                              {(!selectedModuleToActivate.features_free || selectedModuleToActivate.features_free.length === 0) && (
                                <p>Basic features to get you started.</p>
                              )}
                            </div>
                            <button 
                               onClick={() => handleActivateFreePlan(selectedModuleToActivate)}
                               disabled={isActivating}
                               className="w-full py-2.5 rounded-lg border-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                            >
                               {isActivating ? 'Activating...' : 'Activate Free Plan'}
                            </button>
                         </div>

                         {/* Pro Tier */}
                         <div className="bg-white dark:bg-slate-950 border-2 border-primary rounded-xl p-5 relative overflow-hidden shadow-sm">
                            <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg uppercase tracking-wider">Recommended</div>
                            <div className="flex justify-between items-center mb-2 mt-1">
                               <h3 className="font-bold text-lg text-primary">Pro Plan</h3>
                               <span className="text-xl font-black text-primary">₹{selectedModuleToActivate.test_mode_pro ? '1' : selectedModuleToActivate.price || 999}<span className="text-sm text-slate-500 dark:text-slate-400 font-normal">/mo</span></span>
                            </div>
                            <div className="text-sm text-slate-500 dark:text-slate-400 mb-4 space-y-1">
                              {selectedModuleToActivate.features_pro?.map((feature: any, i: any) => (
                                 <div key={i} className="flex items-center gap-2">
                                    <CheckCircle2 size={14} className="text-primary" />
                                    <span className="font-medium">{feature}</span>
                                 </div>
                              ))}
                              {(!selectedModuleToActivate.features_pro || selectedModuleToActivate.features_pro.length === 0) && (
                                <p>Advanced features for growing businesses.</p>
                              )}
                            </div>
                            <button 
                               onClick={() => {
                                 setPaymentModule(selectedModuleToActivate.id);
                                 setPaymentPlan('Pro');
                                 const price = selectedModuleToActivate.test_mode_pro ? 1 : Number(selectedModuleToActivate.price || 999);
                                 setPaymentAmount(price * 1.18); // Including GST
                                 setShowActivationModal(false);
                                 setShowPaymentModal(true);
                               }}
                               className="w-full py-2.5 rounded-lg bg-primary text-white font-bold hover:bg-primary/90 transition-colors shadow-md shadow-primary/20"
                            >
                               Upgrade to Pro
                            </button>
                         </div>

                         {/* Custom Tier */}
                         <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-primary/50 transition-colors cursor-pointer relative overflow-hidden group">
                            {selectedModuleToActivate.test_mode_custom && (
                               <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-1 rounded-bl-lg">TEST MODE</div>
                            )}
                            <div className="flex justify-between items-center mb-2">
                               <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">Custom</h3>
                               <span className="text-xl font-black text-slate-900 dark:text-slate-100">Contact Us</span>
                            </div>
                            <div className="text-sm text-slate-500 dark:text-slate-400 mb-4 space-y-1">
                              {selectedModuleToActivate.features_custom?.map((feature: any, i: any) => (
                                 <div key={i} className="flex items-center gap-2">
                                    <CheckCircle2 size={14} className="text-slate-400" />
                                    <span>{feature}</span>
                                 </div>
                              ))}
                              {(!selectedModuleToActivate.features_custom || selectedModuleToActivate.features_custom.length === 0) && (
                                <p>Enterprise-grade solutions tailored for you.</p>
                              )}
                            </div>
                            <button 
                               onClick={() => {
                                 if (selectedModuleToActivate.test_mode_custom) {
                                    setPaymentModule(selectedModuleToActivate.id);
                                    setPaymentPlan('Custom');
                                    setPaymentAmount(1 * 1.18); // Including GST
                                    setShowActivationModal(false);
                                    setShowPaymentModal(true);
                                 } else {
                                    alert('Please contact sales for custom pricing.');
                                 }
                               }}
                               className="w-full py-2.5 rounded-lg border-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:border-primary hover:text-primary transition-colors"
                            >
                               {selectedModuleToActivate.test_mode_custom ? 'Test Custom Plan' : 'Contact Sales'}
                            </button>
                         </div>
                      </>
                    );
                  })()}
                </div>
             </div>
             
             {/* Right Column: Billing Summary */}
             <div className="w-full md:w-96 p-8 bg-white dark:bg-slate-950 relative">
                <button onClick={() => setShowActivationModal(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full hidden md:block transition-colors">
                   <X size={20} />
                </button>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
                   <CheckCircle2 className="text-emerald-500" size={20} />
                   Billing Details
                </h3>
                
                <div className="space-y-4">
                   <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Full Name</label>
                      <Input value={merchantDetails?.name || user?.name || ''} disabled className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300" />
                   </div>
                   <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Email Address</label>
                      <Input value={merchantDetails?.email || user?.email || ''} disabled className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300" />
                   </div>
                   <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Phone Number</label>
                      <Input value={merchantDetails?.phone || ''} disabled className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300" />
                   </div>
                   <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Business Name</label>
                      <Input value={merchantDetails?.business_name || ''} disabled className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300" />
                   </div>
                   <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Address</label>
                      <Input value={merchantDetails?.address || ''} disabled className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300" />
                   </div>
                </div>
                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                   <p className="text-xs text-slate-400 text-center">These details are auto-fetched from your account profile for a seamless checkout experience.</p>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Payment Gateway Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-2xl p-8 max-w-md w-full animate-in zoom-in-95 duration-200">
             <div className="text-center mb-6">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                   <CheckCircle size={32} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Complete Payment</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-2">You are upgrading {moduleMaster.find(m => m.id === paymentModule)?.name || paymentModule} to {paymentPlan} plan.</p>
             </div>

             <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl mb-6">
                <div className="flex justify-between items-center mb-2">
                   <span className="text-slate-600 dark:text-slate-400 font-medium">Original Amount</span>
                   <span className="text-lg font-bold text-slate-500 dark:text-slate-400 line-through">₹{paymentAmount.toFixed(2)}</span>
                </div>
                {promoDiscount > 0 && (
                  <div className="flex justify-between items-center mb-2 text-emerald-600">
                     <span className="font-medium">Promo Discount</span>
                     <span className="font-bold">-₹{promoDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center mb-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                   <span className="text-slate-800 dark:text-slate-200 font-bold">Total Due</span>
                   <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">₹{Math.max(0, paymentAmount - promoDiscount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-slate-500 dark:text-slate-400">
                   <span>Includes 18% GST</span>
                </div>
             </div>
             
             <div className="mb-6 flex gap-2">
                <Input 
                   placeholder="Enter Promo Code" 
                   className="uppercase flex-1"
                   value={promoCode}
                   onChange={e => setPromoCode(e.target.value)}
                />
                <Button onClick={handleApplyPromo} className="bg-slate-800 hover:bg-slate-900" disabled={!promoCode}>
                   Apply
                </Button>
             </div>

             <div className="space-y-3">
               <button 
                  onClick={handlePaymentSuccess}
                  disabled={isProcessingPayment}
                  className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
               >
                  {isProcessingPayment ? 'Processing...' : 'Pay Now'}
               </button>
               <button 
                  onClick={() => setShowPaymentModal(false)}
                  className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold py-3.5 rounded-xl hover:bg-slate-200 dark:bg-slate-700 transition-colors"
               >
                  Cancel & Continue on Free Plan
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isTransportMode && transportOperatorType === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <TransportOperatorTypeSelector tenantId={currentTenantId!} onChoose={(type) => setTransportOperatorType(type)} />
      </div>
    );
  }

  if (isTransportMode && transportOperatorType === 'individual_driver' && transportIndividualWorkType === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <IndividualDriverWorkTypeSelector tenantId={currentTenantId!} onChoose={(type) => setTransportIndividualWorkType(type)} />
      </div>
    );
  }

  if (isTransportMode && transportOperatorType === 'individual_driver' && transportIndividualWorkType === 'delivery_move') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <DeliveryMoveGateway />
      </div>
    );
  }

  if (isTransportMode && transportOperatorType === 'individual_driver' && transportIndividualWorkType === 'other') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <ComingSoonWorkType />
      </div>
    );
  }

  if (!GOOGLE_MAPS_API_KEY) return AppContent;
  return <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>{AppContent}</APIProvider>;
}

function GenericDashboardView({ moduleName }: { moduleName: string }) {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">{moduleName} Dashboard</h1>
      <p className="text-slate-600 dark:text-slate-400 mb-8">Overview and key metrics for your {moduleName} operations.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
           <CardHeader><CardTitle className="text-lg">Total Records</CardTitle></CardHeader>
           <CardContent><p className="text-4xl font-bold text-slate-800 dark:text-slate-200">0</p></CardContent>
        </Card>
        <Card>
           <CardHeader><CardTitle className="text-lg">Active Sessions</CardTitle></CardHeader>
           <CardContent><p className="text-4xl font-bold text-emerald-600">0</p></CardContent>
        </Card>
        <Card>
           <CardHeader><CardTitle className="text-lg">Revenue Today</CardTitle></CardHeader>
           <CardContent><p className="text-4xl font-bold text-primary">₹0.00</p></CardContent>
        </Card>
      </div>
    </div>
  );
}

function GateKeeperView() {
  const { currentTenantId } = useAuth();
  const [showScanner, setShowScanner] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const handleQrDetected = async (rawValue: string) => {
    setShowScanner(false);
    setError('');
    setInvoiceData(null);
    const invoiceId = rawValue.replace('bahibox-gatepass:', '');
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { data: invoice, error: invErr } = await supabase
      .from('sales_invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('tenant_id', currentTenantId)
      .maybeSingle();

    if (invErr || !invoice) {
      setError('Invalid Gate Pass QR code.');
      return;
    }
    if (invoice.status !== 'paid') {
      setError('This order has not been paid.');
      return;
    }

    const { data: items } = await supabase.from('sales_invoice_items').select('*').eq('sales_invoice_id', invoiceId);
    setInvoiceItems(items || []);
    setInvoiceData(invoice);
  };

  const handleConfirmExit = async () => {
    if (!invoiceData) return;
    setVerifying(true);
    const supabase = getSupabaseClient();
    if (!supabase) { setVerifying(false); return; }
    const { error } = await supabase.from('sales_invoices').update({ gate_pass_verified: true }).eq('id', invoiceData.id);
    setVerifying(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Customer cleared for exit!');
    setInvoiceData(null);
    setInvoiceItems([]);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <ShieldCheck size={24} /> Gate Keeper
        </h2>
        <p className="text-slate-500 dark:text-slate-400">Scan customer Gate Pass QR to verify payment before exit.</p>
      </div>

      <Button className="w-full h-14 text-base" onClick={() => { setShowScanner(true); setError(''); setInvoiceData(null); }}>
        <ScanLine className="mr-2" size={20} /> Scan Gate Pass
      </Button>

      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-600" />
            <p className="text-sm font-semibold text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {invoiceData && (
        <Card className="border-emerald-200">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">
                {invoiceData.gate_pass_verified ? 'Already Verified' : 'Payment Confirmed'}
              </span>
              <span className="text-xs text-slate-400">{invoiceData.invoice_number}</span>
            </div>
            <p className="font-bold text-slate-900 dark:text-slate-100">{invoiceData.customer_name || 'Guest Customer'}</p>
            <div className="space-y-1 border-t border-slate-100 dark:border-slate-800 pt-3">
              {invoiceItems.map((it) => (
                <div key={it.id} className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">{it.item_name} x{it.quantity}</span>
                  <span className="text-slate-500">Rs {it.line_total}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800 pt-3">
              <span className="font-bold text-slate-900 dark:text-slate-100">Total Paid</span>
              <span className="font-extrabold text-lg text-primary">Rs {invoiceData.total_amount}</span>
            </div>
            {!invoiceData.gate_pass_verified && (
              <Button className="w-full h-12" onClick={handleConfirmExit} disabled={verifying}>
                {verifying ? 'Confirming...' : 'Confirm & Let Through'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {showScanner && <BarcodeScannerModal onDetect={handleQrDetected} onClose={() => setShowScanner(false)} />}
    </div>
  );
}

function ModulePlaceholder({ tabId, menuItem }: { tabId: string, menuItem?: TenantMenuResult }) {
  const moduleName = menuItem?.item_label || tabId.replace('-', ' ');
  return (
    <div className="p-8 h-full overflow-y-auto animate-in fade-in duration-300">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 bg-white dark:bg-slate-950 rounded-xl flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-800">
          {menuItem?.item_icon ? (
            <DynamicIcon name={menuItem.item_icon} className="text-slate-600 dark:text-slate-400" size={32} />
          ) : (
            <Settings className="text-slate-600 dark:text-slate-400" size={32} />
          )}
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 capitalize">{moduleName}</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage and oversee your {moduleName} operations.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950">
           <CardHeader className="pb-2">
             <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Records</CardTitle>
           </CardHeader>
           <CardContent>
             <p className="text-3xl font-bold text-slate-800 dark:text-slate-200">0</p>
           </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950">
           <CardHeader className="pb-2">
             <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pending Actions</CardTitle>
           </CardHeader>
           <CardContent>
             <p className="text-3xl font-bold text-amber-600">0</p>
           </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950">
           <CardHeader className="pb-2">
             <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">System Status</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
               <p className="text-xl font-bold text-slate-800 dark:text-slate-200">Online</p>
             </div>
           </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 dark:border-slate-800 shadow-sm min-h-[400px] flex items-center justify-center bg-white dark:bg-slate-950">
        <div className="text-center">
          <BarChart3 className="mx-auto text-slate-200 mb-4" size={64} strokeWidth={1} />
          <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">No Data Available</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">Activity and insights will appear here once you start using the {moduleName} module.</p>
        </div>
      </Card>
    </div>
  );
}

// ==========================================
// 1. Hybrid POS View (3 Tabs: In-Store, Scan & Go, Online)
// ==========================================
interface HybridPOSViewProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  orders: OnlineOrder[];
  setOrders: React.Dispatch<React.SetStateAction<OnlineOrder[]>>;
  branchConfig?: any;
}



function HybridPOSView({ products, setProducts, orders, setOrders, branchConfig }: HybridPOSViewProps) {
  const { currentTenantId } = useAuth();
  const supabase = getSupabaseClient();
  const [onlineRiders, setOnlineRiders] = useState<any[]>([]);
  const [deliveryAssignments, setDeliveryAssignments] = useState<any[]>([]);
  const [selectedRiderMap, setSelectedRiderMap] = useState<Record<string, string>>({});
  const [selectedVehicleType, setSelectedVehicleType] = useState<Record<string, string>>({});
  const [assignmentRefreshCount, setAssignmentRefreshCount] = useState(0);

  useEffect(() => {
    if (!currentTenantId || !supabase) return;
    
    // Fetch available riders
    supabase.from('service_providers')
      .select('*')
      .eq('tenant_id', currentTenantId)
      .eq('is_active', true)
      .eq('is_online', true)
      .ilike('provider_type', 'rider')
      .then(({ data }: { data: any }) => {
        if (data) setOnlineRiders(data);
      });

    // Fetch assignments for current dispatch orders
    fetchAssignments();
  }, [currentTenantId, orders, assignmentRefreshCount]);

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase.channel('hybridpos_assignments_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_assignments' }, () => {
         setAssignmentRefreshCount(c => c + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchAssignments = async () => {
    if (!supabase || !currentTenantId) return;
    const dispatchOrderIds = orders.filter(o => o.status === 'Dispatch').map(o => o.id);
    if (dispatchOrderIds.length === 0) return;
    
    const { data } = await supabase.from('delivery_assignments').select('*, service_providers(full_name, phone, current_lat, current_lng)').in('order_id', dispatchOrderIds);
    if (data) setDeliveryAssignments(data);
  };

  const assignRider = async (orderId: string, riderId: string) => {
    if (!supabase || !currentTenantId) return;
    
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    const { error } = await supabase.from('delivery_assignments').insert({
      order_id: orderId,
      service_provider_id: riderId,
      status: 'assigned',
      pickup_address: branchConfig?.address || 'Store Location',
      drop_address: order.address || 'Delivery Address',
      assigned_at: new Date().toISOString()
    });
    
    if (!error) {
      alert('Rider Assigned!');
      fetchAssignments();
    } else {
      alert('Error assigning rider');
    }
  };

  const updateAssignmentStatus = async (assignmentId: string, status: string) => {
    if (!supabase) return;
    const updateData: any = { status };
    if (status === 'picked_up') updateData.picked_up_at = new Date().toISOString();
    if (status === 'delivered') updateData.delivered_at = new Date().toISOString();
    
    await supabase.from('delivery_assignments').update(updateData).eq('id', assignmentId);
    fetchAssignments();
    if (status === 'delivered') {
        alert('Order marked as delivered!');
    }
  };

  const { tenant } = useTenant();
  const { user } = useAuth();
  const initialPosTab = location.pathname.includes('/online-orders') ? 'online' : location.pathname.includes('/scan-go') ? 'scan-go' : 'in-store';
  const [posTab, setPosTab] = useState<'in-store' | 'scan-go' | 'online'>(initialPosTab);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    if (posTab === 'scan-go' && !branchConfig?.is_scan_and_go_active) setPosTab('in-store');
    if (posTab === 'online' && !branchConfig?.is_online_store_active) setPosTab('in-store');
  }, [branchConfig, posTab]);

  useEffect(() => {
    if (posTab === 'online' && currentTenantId) {
      const fetchOrders = async () => {
         const supabase = getSupabaseClient();
         if (!supabase) return;
         const { data: ordersData } = await supabase.from('orders')
           .select('*')
           .eq('tenant_id', currentTenantId)
           .order('created_at', { ascending: false })
           .limit(50);
           
         if (ordersData && ordersData.length > 0) {
           const orderIds = ordersData.map((o: any) => o.id);
           const { data: itemsData } = await supabase.from('order_items').select('*').in('order_id', orderIds);
           
           let productsData: any[] = [];
           if (itemsData && itemsData.length > 0) {
               const productIds = [...new Set(itemsData.map((i: any) => i.product_id))];
               const { data: pData } = await supabase.from('products').select('id, product_name').in('id', productIds);
               productsData = pData || [];
           }
           
           const pMap = new globalThis.Map(productsData.map(p => [p.id, p.product_name]));
           
           const mergedOrders = ordersData.map((o: any) => {
              const oItems = itemsData ? itemsData.filter((i: any) => i.order_id === o.id) : [];
              return {
                 ...o,
                 id: o.id,
                 total_amount: o.total,
                 address: o.delivery_address || 'No Address Provided',
                 items: oItems.map((i: any) => ({
                    name: pMap.get(i.product_id) || 'Unknown Product',
                    quantity: i.quantity,
                    price: i.price
                 }))
              };
           });
           setOrders(mergedOrders);
         } else {
           setOrders([]);
         }
      };
      fetchOrders();
    }
  }, [posTab, currentTenantId, setOrders]);

  // In-Store POS State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [heldCarts, setHeldCarts] = useState<CartItem[][]>([]);
  const [splitPayment, setSplitPayment] = useState(false);
  const [cashAmount, setCashAmount] = useState<number>(0);

  const categories = ['All', 'Grocery', 'Snacks', 'Cleaning'];
  const filteredProducts = selectedCategory === 'All' 
    ? products 
    : products.filter((p: any) => p.category === selectedCategory);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1, discountType: 'percentage', discountValue: 0 }];
    });
  };

  const updateDiscount = (id: string, type: 'percentage' | 'fixed', value: number) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, discountType: type, discountValue: value } : item));
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => {
      const basePrice = item.price * item.quantity;
      const discount = item.discountType === 'percentage' 
        ? basePrice * (item.discountValue / 100)
        : item.discountValue;
      return total + (basePrice - discount);
    }, 0);
  };

  const [receiptData, setReceiptData] = useState<{items: CartItem[], total: number, date: string, cash: number, upi: number, orderId?: string} | null>(null);

  const totalAmount = calculateTotal();
  const upiAmount = Math.max(0, totalAmount - cashAmount);

  const handleHoldCart = () => {
    if (cart.length > 0) {
      setHeldCarts([...heldCarts, cart]);
      setCart([]);
    }
  };

  const restoreHeldCart = (index: number) => {
    setCart(heldCarts[index]);
    setHeldCarts(heldCarts.filter((_, i) => i !== index));
  };

  const handleCheckout = async () => {
    // 1. Prepare payment info
    const paymentMethod = splitPayment ? 'Split' : (cashAmount >= totalAmount ? 'Cash' : 'UPI');
    const newOrderId = 'ORD-' + Math.floor(1000 + Math.random() * 9000);

    const supabase = getSupabaseClient();
    if (supabase && tenant?.merchant_id) {
      try {
        // Create Order
        const { error: orderError } = await supabase.from('orders').insert({
          id: newOrderId,
          merchant_id: tenant.merchant_id,
          customer_name: 'Walk-in Customer',
          total_amount: totalAmount,
          payment_method: paymentMethod,
          status: 'Completed'
        });

        if (orderError) console.warn("Order creation failed", orderError);

        // Create Order Items & Update Stock
        for (const item of cart) {
          await supabase.from('order_items').insert({
            order_id: newOrderId,
            product_id: item.id,
            quantity: item.quantity,
            price: item.price
          });

          // Decrement stock in DB
          const product = products.find((p: any) => p.id === item.id);
          if (product) {
            await supabase.from('products').update({
              stock: Math.max(0, product.stock - item.quantity)
            }).eq('id', product.id);
          }
        }
      } catch (err) {
        console.warn("Failed to process checkout to DB", err);
      }
    }

    // 2. Decrement products locally
    setProducts(prevProducts => {
      return prevProducts.map((p: any) => {
        const cartItem = cart.find((c: any) => c.id === p.id);
        if (cartItem) {
          return { ...p, stock: Math.max(0, p.stock - cartItem.quantity) };
        }
        return p;
      });
    });

    // 4. Open Receipt / Print Preview
    setReceiptData({
      items: [...cart],
      total: totalAmount,
      date: new Date().toLocaleString(),
      cash: cashAmount,
      upi: splitPayment ? upiAmount : totalAmount,
      orderId: newOrderId
    });

    setCart([]);
    setCashAmount(0);
    setSplitPayment(false);
    
    // Auto-trigger print after setting receipt data
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
       const supabase = getSupabaseClient();
       if (!supabase) return;
       
       if (newStatus === 'Dispatch') {
         const vehicleType = selectedVehicleType[orderId] || 'bike';
         const { error } = await supabase.rpc('create_delivery_job', { p_order_id: orderId, p_vehicle_type: vehicleType });
         if (error) throw error;
         setOrders(prev => prev.map((o: any) => o.id === orderId ? { ...o, status: newStatus } : o));
         // also refetch assignments
         fetchAssignments();
       } else {
         const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
         if (error) throw error;
         setOrders(prev => prev.map((o: any) => o.id === orderId ? { ...o, status: newStatus } : o));
       }
    } catch(err) {
       console.error("Failed to update order status:", err);
       alert("Failed to update order status");
    }
  };

  const printOrderBillAndLabel = (order: any) => {
    const itemsList = Array.isArray(order.items) ? order.items : [];
    const orderTotal = itemsList.reduce((sum: number, it: any) => sum + (it.price * it.quantity), 0);
    const shortId = order.id.substring(0, 8).toUpperCase();

    const combinedHtml = `
      <html>
        <head>
          <title>Bill and Label - ${shortId}</title>
          <style>
            @page { margin: 10mm; }
            body { font-family: sans-serif; margin: 0; }
            .page { page-break-after: always; padding: 10px; }
            .page:last-child { page-break-after: auto; }
            .bill-body { font-family: monospace; max-width: 320px; margin: 0 auto; font-size: 13px; }
            .header { text-align: center; margin-bottom: 15px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .total { font-weight: bold; border-top: 1px dashed #000; margin-top: 10px; padding-top: 10px; font-size: 1.15em; display: flex; justify-content: space-between; }
            hr { border: 1px dashed #000; }
            .label-box { border: 2px solid #000; padding: 16px; border-radius: 6px; max-width: 380px; margin: 40px auto; }
            .label-title { font-size: 11px; letter-spacing: 1px; color: #555; text-transform: uppercase; margin-bottom: 4px; }
            .name { font-size: 20px; font-weight: bold; margin-bottom: 6px; }
            .address { font-size: 15px; line-height: 1.5; margin-bottom: 14px; }
            .phone { font-size: 14px; margin-bottom: 14px; }
            .order-id { font-size: 12px; color: #666; border-top: 1px dashed #999; padding-top: 10px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="bill-body">
              <div class="header">
                <h3 style="margin:0;">TAX INVOICE</h3>
                <p style="margin:4px 0;">Order #${shortId}</p>
                <p style="margin:0;">${new Date(order.created_at).toLocaleString()}</p>
              </div>
              <hr />
              <div class="row"><span>Customer:</span><span>${order.customer_name || 'N/A'}</span></div>
              <div class="row"><span>Phone:</span><span>${order.customer_phone || 'N/A'}</span></div>
              <hr />
              ${itemsList.map((it: any) => `
                <div class="item">
                  <span>${it.name} x ${it.quantity}</span>
                  <span>Rs ${(it.price * it.quantity).toFixed(2)}</span>
                </div>
              `).join('')}
              <div class="total"><span>TOTAL</span><span>Rs ${orderTotal.toFixed(2)}</span></div>
              <p style="text-align:center; margin-top:20px; font-size:0.85em;">Thank you for shopping with us!</p>
            </div>
          </div>
          <div class="page">
            <div class="label-box">
              <div class="label-title">Ship To</div>
              <div class="name">${order.customer_name || 'N/A'}</div>
              <div class="address">${order.address || 'No address provided'}</div>
              <div class="phone">Phone: ${order.customer_phone || 'N/A'}</div>
              <div class="order-id">Order #${shortId}</div>
            </div>
          </div>
        </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    const win = iframe.contentWindow;
    if (win) {
      win.document.write(combinedHtml);
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
        setTimeout(() => document.body.removeChild(iframe), 500);
      }, 200);
    }
  };

  const newOrdersList = orders.filter(o => o.status === 'New');
  const packingOrdersList = orders.filter(o => o.status === 'Ready to Pack');
  const dispatchOrdersList = orders.filter(o => o.status === 'Dispatch');

  return (
    <div className="h-full flex flex-col bg-slate-100 dark:bg-slate-800">
      {/* Top 3 Major Tabs */}
      <div className="flex bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 p-4 gap-4 shrink-0 shadow-sm z-20 relative">
        <button 
          onClick={() => setPosTab('in-store')}
          className={`flex-1 py-4 px-4 rounded-xl text-lg font-bold flex items-center justify-center gap-3 transition-all ${posTab === 'in-store' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100'}`}
        >
          <ShoppingCart size={24} /> 🛒 In-Store POS
        </button>
        {branchConfig?.is_scan_and_go_active && (
          <button 
            onClick={() => setPosTab('scan-go')}
            className={`flex-1 py-4 px-4 rounded-xl text-lg font-bold flex items-center justify-center gap-3 transition-all relative ${posTab === 'scan-go' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100'}`}
          >
            <Scan size={24} /> 📱 Scan & Go
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2.5 py-1 rounded-full font-bold shadow-sm animate-pulse">3</span>
          </button>
        )}
        {branchConfig?.is_online_store_active && (
          <button 
            onClick={() => setPosTab('online')}
            className={`flex-1 py-4 px-4 rounded-xl text-lg font-bold flex items-center justify-center gap-3 transition-all relative ${posTab === 'online' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100'}`}
          >
            <Package size={24} /> 📦 Online Orders
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2.5 py-1 rounded-full font-bold shadow-sm">
              {newOrdersList.length}
            </span>
          </button>
        )}
      </div>

      {/* Tab Content Area */}
      {(() => { console.log('DEBUG10: RENDER activeTab=', JSON.stringify(activeTab), 'posTab=', JSON.stringify(posTab), 'branchConfig=', JSON.stringify(branchConfig?.branch_name), 'isOnlineActive=', branchConfig?.is_online_store_active); return null; })()}
      <div className="flex-1 overflow-hidden relative">
        
        {/* ======================= TAB 1: IN-STORE POS ======================= */}
        {posTab === 'in-store' && (
          <div className="absolute inset-0 flex flex-col lg:flex-row">
            {/* LEFT PANEL: Cart & Billing */}
            <div className="w-full lg:w-[450px] xl:w-[500px] border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-950 z-10 shadow-xl">
              {/* Top Search & Controls */}
              <div className="p-4 border-b bg-slate-50 dark:bg-slate-900 flex gap-2">
                <div className="relative flex-1">
                  <Scan className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <Input 
                    placeholder="Scan Barcode or Search..." 
                    className="pl-10 h-12 text-lg font-medium border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                  />
                </div>
                <Button variant="outline" className="h-12 w-12 p-0 bg-white dark:bg-slate-950"><QrCode size={20}/></Button>
              </div>

              {/* Quick Add Products (If searching) */}
              {searchTerm && (
                 <div className="p-4 grid grid-cols-2 gap-2 border-b max-h-48 overflow-auto bg-slate-50 dark:bg-slate-900 z-10 shadow-inner">
                   {products.filter((p: any) => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(product => (
                     <div key={product.id} onClick={() => {addToCart(product); setSearchTerm('');}} className="p-3 border bg-white dark:bg-slate-950 rounded-lg cursor-pointer hover:border-slate-800 transition-colors shadow-sm">
                       <p className="font-semibold text-sm truncate text-slate-800 dark:text-slate-200">{product.name}</p>
                       <p className="text-slate-600 dark:text-slate-400 text-xs font-bold mt-1">₹{product.price}</p>
                     </div>
                   ))}
                 </div>
              )}

              {/* Billing Grid */}
              <div className="flex-1 overflow-auto p-0 bg-white dark:bg-slate-950">
                <table className="w-full text-sm text-left">
                   <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-0 text-slate-600 dark:text-slate-400 border-b">
                     <tr>
                       <th className="px-4 py-3 font-semibold">Item</th>
                       <th className="px-4 py-3 font-semibold w-24">Qty</th>
                       <th className="px-4 py-3 font-semibold w-28">Discount</th>
                       <th className="px-4 py-3 font-semibold text-right w-24">Total</th>
                       <th className="px-2 py-3 w-8"></th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {cart.map(item => (
                       <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900 group">
                         <td className="px-4 py-4">
                           <p className="font-bold text-slate-800 dark:text-slate-200">{item.name}</p>
                           <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">₹{item.price} / {item.unit}</p>
                         </td>
                         <td className="px-4 py-4">
                           <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-800 rounded-md w-max p-0.5 bg-white dark:bg-slate-950">
                             <button onClick={() => {
                               if(item.quantity > 1) {
                                 setCart(prev => prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i));
                               }
                             }} className="w-6 h-6 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">-</button>
                             <span className="w-6 text-center text-sm font-bold text-slate-800 dark:text-slate-200">{item.quantity}</span>
                             <button onClick={() => {
                               setCart(prev => prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
                             }} className="w-6 h-6 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">+</button>
                           </div>
                         </td>
                         <td className="px-4 py-4">
                           <div className="flex items-center gap-1">
                             <select 
                                 className="h-8 w-12 text-xs rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-1 font-medium focus:ring-1 outline-none"
                                 value={item.discountType}
                                 onChange={(e) => updateDiscount(item.id, e.target.value as 'percentage'|'fixed', item.discountValue)}
                               >
                                 <option value="percentage">%</option>
                                 <option value="fixed">₹</option>
                               </select>
                               <Input 
                                 type="number" 
                                 className="h-8 text-xs w-14 px-2 bg-white dark:bg-slate-950" 
                                 placeholder="0"
                                 value={item.discountValue || ''}
                                 onChange={(e) => updateDiscount(item.id, item.discountType, Number(e.target.value))}
                               />
                           </div>
                         </td>
                         <td className="px-4 py-4 text-right font-bold text-slate-900 dark:text-slate-100 text-base">
                           ₹{((item.price * item.quantity) - (item.discountType === 'percentage' ? (item.price * item.quantity * item.discountValue / 100) : item.discountValue)).toFixed(2)}
                         </td>
                         <td className="px-2 py-4 text-right">
                           <button onClick={() => setCart(cart.filter((c: any) => c.id !== item.id))} className="text-slate-300 hover:text-red-500 p-1 transition-colors"><Trash2 size={18}/></button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                </table>
                {cart.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 pb-20">
                    <div className="w-24 h-24 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-4">
                        <ShoppingCart size={40} className="text-slate-300" />
                    </div>
                    <p className="font-medium text-slate-500 dark:text-slate-400">Cart is empty</p>
                    <p className="text-sm">Scan or tap products to add</p>
                  </div>
                )}
              </div>

              {/* Action Bottom Bar */}
              <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
                <div className="flex gap-3 mb-6">
                   <Button variant="outline" className="flex-1 h-12 font-bold border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900" onClick={handleHoldCart} disabled={cart.length === 0}>
                     <Clock size={18} className="mr-2"/> Hold Bill
                   </Button>
                   {heldCarts.length > 0 && (
                     <Button variant="outline" className="flex-1 h-12 font-bold border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300" onClick={() => restoreHeldCart(0)}>
                       Resume ({heldCarts.length})
                     </Button>
                   )}
                   <Button variant="outline" className={`flex-1 h-12 font-bold transition-colors ${splitPayment ? 'bg-slate-900 text-white hover:bg-slate-800' : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900'}`} onClick={() => setSplitPayment(!splitPayment)}>
                     Split Payment
                   </Button>
                </div>
                
                {splitPayment && (
                  <div className="flex gap-4 p-5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 mb-6 animate-in fade-in slide-in-from-bottom-2">
                     <div className="flex-1 space-y-2">
                       <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1"><Banknote size={14}/> Cash Received</label>
                       <Input type="number" value={cashAmount || ''} onChange={e => setCashAmount(Number(e.target.value))} className="h-12 text-xl font-bold bg-white dark:bg-slate-950" placeholder="0" />
                     </div>
                     <div className="flex-1 space-y-2">
                       <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1"><QrCode size={14}/> UPI / Card</label>
                       <div className="h-12 flex items-center px-4 bg-white dark:bg-slate-950 rounded-md border border-slate-200 dark:border-slate-800 text-xl font-bold text-slate-800 dark:text-slate-200">₹ {upiAmount.toFixed(2)}</div>
                     </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                     <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Grand Total</p>
                     <p className="text-5xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tighter leading-none">₹{totalAmount.toFixed(2)}</p>
                  </div>
                  <Button className="h-16 px-12 text-xl font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-lg hover:shadow-xl transition-all" disabled={cart.length === 0} onClick={handleCheckout}>
                    Pay & Print <Printer size={24} className="ml-3"/>
                  </Button>
                </div>
              </div>
            </div>

            {/* RIGHT PANEL: Visual Product Catalog */}
            <div className="flex-1 bg-slate-50 dark:bg-slate-900 flex flex-col overflow-hidden">
               <div className="p-6 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex gap-3 overflow-x-auto shrink-0">
                 {categories.map(cat => (
                   <Button 
                     key={cat} 
                     variant={selectedCategory === cat ? 'default' : 'outline'} 
                     className={`rounded-full px-6 font-bold ${selectedCategory === cat ? 'bg-slate-900 text-white' : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                     onClick={() => setSelectedCategory(cat)}
                   >
                     {cat}
                   </Button>
                 ))}
               </div>
               <div className="p-6 flex-1 overflow-auto">
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {filteredProducts.map((p: any) => (
                      <Card key={p.id} className="cursor-pointer border-slate-200 dark:border-slate-800 hover:border-slate-800 hover:shadow-xl transition-all overflow-hidden group bg-white dark:bg-slate-950" onClick={() => addToCart(p)}>
                        <div className="h-40 bg-slate-100 dark:bg-slate-800 flex items-center justify-center relative overflow-hidden">
                           <Package size={56} className="text-slate-300 group-hover:scale-110 transition-transform duration-300" />
                           <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                              <div className="w-12 h-12 bg-white dark:bg-slate-950 rounded-full flex items-center justify-center shadow-lg">
                                <Plus size={24} className="text-slate-900 dark:text-slate-100" />
                              </div>
                           </div>
                        </div>
                        <CardContent className="p-4 text-center">
                           <p className="font-bold text-sm text-slate-800 dark:text-slate-200 line-clamp-2 leading-tight">{p.name}</p>
                           <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 mb-2">{p.unit} • Stock: {p.stock}</p>
                           <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">₹{p.price}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* ======================= TAB 2: SCAN & GO ======================= */}
        {(posTab === 'scan-go' || activeTab === "scan_and_go_orders") && branchConfig?.is_scan_and_go_active && (
           <div className="absolute inset-0 bg-slate-50 dark:bg-slate-900 p-8 overflow-auto">
              <div className="mb-8 flex justify-between items-center bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                 <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">Live Scan & Go</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Monitor self-checkout customers in real-time.</p>
                 </div>
                 <div className="flex gap-4">
                    <span className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2 rounded-xl text-sm font-bold shadow-sm">
                       <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span> 3 Active Shoppers
                    </span>
                 </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                 {/* Card 1: Payment Cleared */}
                 <Card className="border-blue-200 shadow-lg relative overflow-hidden bg-white dark:bg-slate-950 hover:-translate-y-1 transition-transform">
                   <div className="absolute top-0 right-0 w-2 h-full bg-blue-500"></div>
                   <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                           <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-xl border border-blue-100">AK</div>
                           <div>
                             <p className="font-extrabold text-xl text-slate-900 dark:text-slate-100">Amit Kumar</p>
                             <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">ID: SG-8920 • 12 items</p>
                           </div>
                        </div>
                        <span className="text-sm font-bold text-white bg-blue-600 px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1">
                          <CheckCircle2 size={16}/> Payment Cleared
                        </span>
                      </div>
                      <div className="flex justify-between items-end mt-8 border-t border-slate-100 dark:border-slate-800 pt-6">
                        <div>
                          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Total Paid</p>
                          <p className="text-4xl font-extrabold text-slate-900 dark:text-slate-100">₹ 1,450.00</p>
                        </div>
                        <Button className="bg-blue-600 hover:bg-blue-700 font-bold px-8 h-12 text-lg rounded-xl shadow-md">Clear Exit</Button>
                      </div>
                   </CardContent>
                 </Card>
                 
                 {/* Card 2: Shopping */}
                 <Card className="border-emerald-200 shadow-sm relative overflow-hidden bg-white dark:bg-slate-950 hover:-translate-y-1 transition-transform">
                   <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500"></div>
                   <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                           <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center font-bold text-xl border border-emerald-100">RJ</div>
                           <div>
                             <p className="font-extrabold text-xl text-slate-900 dark:text-slate-100">Rahul Jain</p>
                             <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">ID: SG-8921 • Aisle 4</p>
                           </div>
                        </div>
                        <span className="text-sm font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg">Shopping...</span>
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400 space-y-3 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                        <p className="flex items-center gap-3 font-medium"><CheckCircle2 size={18} className="text-emerald-500"/> Fortune Oil 1L <span className="text-slate-400 text-xs ml-auto">1m ago</span></p>
                        <p className="flex items-center gap-3 font-medium"><CheckCircle2 size={18} className="text-emerald-500"/> Maggi Noodles x4 <span className="text-slate-400 text-xs ml-auto">3m ago</span></p>
                      </div>
                   </CardContent>
                 </Card>
              </div>
           </div>
        )}

        {/* ======================= TAB 3: ONLINE ORDERS ======================= */}
        {(() => { console.log('DEBUG5: Online tab rendering, orders count:', typeof orders, orders?.length); return null; })()}
        {(posTab === 'online' || activeTab === "online_orders") && branchConfig?.is_online_store_active && (
           <div className="absolute inset-0 bg-slate-50 dark:bg-slate-900 p-8 overflow-hidden flex flex-col">
              <div className="mb-8 flex justify-between items-center bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                 <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">Online Orders Hub</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Manage deliveries, picking, and dispatch kanban.</p>
                 </div>
              </div>
              <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
                 {/* Kanban Column 1: New Orders */}
                 <div className="w-96 flex-shrink-0 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col h-full shadow-sm">
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mb-6 flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                      New Orders <span className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-sm font-bold">{newOrdersList.length}</span>
                    </h3>
                    <div className="flex-1 overflow-auto space-y-4">
                       {newOrdersList.map(order => (
                         <Card key={order.id} className="shadow-sm border-2 border-orange-200 bg-orange-50/30">
                           <CardContent className="p-5">
                              <div className="flex justify-between items-start mb-4">
                                <span className="bg-orange-100 text-orange-700 text-xs px-2.5 py-1 rounded-md font-bold uppercase tracking-wider">New</span>
                                <span className="text-sm font-bold text-slate-400 font-mono">#{order.id.substring(0,6)}</span>
                              </div>
                              <p className="font-extrabold text-lg text-slate-900 dark:text-slate-100 mb-1">{order.customer_name}</p>
                              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 truncate">{order.address}</p>
                              
                              <div className="mb-4 bg-white dark:bg-slate-950/50 p-3 rounded-lg border text-xs text-slate-600 dark:text-slate-400 space-y-1">
                                {Array.isArray(order.items) && order.items.map((it: any, i: number) => (
                                  <div key={i} className="flex justify-between">
                                    <span>{it.name} x{it.quantity}</span>
                                    <span className="font-bold">₹{it.price * it.quantity}</span>
                                  </div>
                                ))}
                              </div>

                              <div className="flex justify-between items-center">
                                <p className="text-lg font-extrabold text-slate-900 dark:text-slate-100">₹ {order.total_amount}.00 <span className="text-emerald-600 text-xs ml-1 bg-emerald-50 px-2 py-0.5 rounded">Paid</span></p>
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => { printOrderBillAndLabel(order); updateOrderStatus(order.id, 'Ready to Pack'); }} className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-10 px-4 rounded-lg">Accept Order</Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={async () => {
                                      const reason = window.prompt('Reason for rejecting this order (optional):');
                                      if (reason === null) return;
                                      const supabase = getSupabaseClient();
                                      if (!supabase) return;
                                      const { error } = await supabase.rpc('reject_online_order', { p_order_id: order.id, p_reason: reason || null });
                                      if (error) { alert(error.message); return; }
                                      setOrders(prev => prev.filter((o: any) => o.id !== order.id));
                                    }}
                                    className="border-red-300 text-red-600 hover:bg-red-50 font-bold h-10 px-4 rounded-lg"
                                  >
                                    Reject
                                  </Button>
                                </div>
                              </div>
                           </CardContent>
                         </Card>
                       ))}
                       {newOrdersList.length === 0 && (
                         <p className="text-sm text-slate-400 text-center py-8">No new online orders</p>
                       )}
                    </div>
                 </div>

                 {/* Kanban Column 2: Ready to Pack */}
                 <div className="w-96 flex-shrink-0 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col h-full shadow-sm">
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mb-6 flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                      Ready to Pack <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm font-bold">{packingOrdersList.length}</span>
                    </h3>
                    <div className="flex-1 overflow-auto space-y-4">
                       {packingOrdersList.map(order => (
                         <Card key={order.id} className="shadow-sm border border-slate-200 dark:border-slate-800">
                           <CardContent className="p-5">
                              <div className="flex justify-between items-start mb-4">
                                <span className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-md font-bold uppercase tracking-wider border border-blue-100">Packing</span>
                                <span className="text-sm font-bold text-slate-400 font-mono">#{order.id.substring(0,6)}</span>
                              </div>
                              <p className="font-extrabold text-lg text-slate-900 dark:text-slate-100 mb-1">{order.customer_name}</p>
                              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">{order.address}</p>
                              
                              <div className="mb-4 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border text-xs text-slate-600 dark:text-slate-400 space-y-1">
                                {Array.isArray(order.items) && order.items.map((it: any, i: number) => (
                                  <div key={i} className="flex justify-between">
                                    <span>{it.name} x{it.quantity}</span>
                                    <span className="font-bold">₹{it.price * it.quantity}</span>
                                  </div>
                                ))}
                              </div>

                              <div className="mb-3">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-1.5">Delivery Vehicle Required</p>
                                <div className="grid grid-cols-3 gap-2">
                                  {(['bike', 'auto', 'car'] as const).map(vt => (
                                    <button
                                      key={vt}
                                      type="button"
                                      onClick={() => setSelectedVehicleType(prev => ({ ...prev, [order.id]: vt }))}
                                      className={`py-1.5 rounded-lg text-xs font-bold uppercase border-2 transition-colors ${(selectedVehicleType[order.id] || 'bike') === vt ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'}`}
                                    >
                                      {vt}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <Button variant="outline" className="flex-1 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 font-bold h-10 rounded-lg text-xs" onClick={() => printOrderBillAndLabel(order)}>
                                   <Printer size={14} className="mr-1"/> Print Bill + Label
                                </Button>
                                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 rounded-lg text-xs" onClick={() => updateOrderStatus(order.id, 'Dispatch')}>
                                   <CheckCircle size={14} className="mr-1"/> Pack & Ship
                                </Button>
                                <Button 
                                  variant="outline"
                                  onClick={async () => {
                                    const reason = window.prompt('Reason for rejecting this order (optional):');
                                    if (reason === null) return;
                                    const supabase = getSupabaseClient();
                                    if (!supabase) return;
                                    const { error } = await supabase.rpc('reject_online_order', { p_order_id: order.id, p_reason: reason || null });
                                    if (error) { alert(error.message); return; }
                                    setOrders(prev => prev.filter((o: any) => o.id !== order.id));
                                  }}
                                  className="border-red-300 text-red-600 hover:bg-red-50 font-bold h-10 rounded-lg text-xs"
                                >
                                  Reject
                                </Button>
                              </div>
                           </CardContent>
                         </Card>
                       ))}
                       {packingOrdersList.length === 0 && (
                         <p className="text-sm text-slate-400 text-center py-8">No orders to pack</p>
                       )}
                    </div>
                 </div>

                 {/* Kanban Column 3: Dispatch */}
                 <div className="w-96 flex-shrink-0 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col h-full shadow-sm">
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mb-6 flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                      Dispatch <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-sm font-bold">{dispatchOrdersList.length}</span>
                    </h3>
                    <div className="flex-1 overflow-auto space-y-4">
                       {dispatchOrdersList.map(order => {
                         return (
                         <Card key={order.id} className="shadow-sm border border-emerald-100 bg-emerald-50/10">
                           <CardContent className="p-5">
                              <div className="flex justify-between items-start mb-4">
                                <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-md font-bold uppercase tracking-wider">Shipped</span>
                                <span className="text-sm font-bold text-slate-400 font-mono">#{order.id.substring(0,6)}</span>
                              </div>
                              <p className="font-extrabold text-lg text-slate-900 dark:text-slate-100 mb-1">{order.customer_name}</p>
                              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">{order.address}</p>
                              <p className="text-lg font-bold text-slate-800 dark:text-slate-200">₹ {order.total_amount}.00</p>
                              
                              {/* Rider Assignment UI */}
                              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                {(() => {
                                  const assignment = deliveryAssignments.find((a: any) => a.order_id === order.id);
                                  if (assignment) {
                                    let badgeColor = 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300';
                                    let statusText = 'ASSIGNED';
                                    let descText = 'Assigned to: ' + (assignment.service_providers?.full_name || 'Unknown');
                                    
                                    if (assignment.status === 'unassigned') {
                                      badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300';
                                      statusText = 'AWAITING RIDER';
                                      descText = 'Awaiting rider...';
                                    } else if (assignment.status === 'assigned') {
                                      badgeColor = 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300';
                                      statusText = 'ASSIGNED';
                                      descText = 'Assigned to ' + (assignment.service_providers?.full_name || 'Unknown');
                                    } else if (assignment.status === 'picked_up') {
                                      badgeColor = 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300';
                                      statusText = 'IN TRANSIT';
                                      descText = 'Picked up by ' + (assignment.service_providers?.full_name || 'Unknown') + ' — in transit';
                                    } else if (assignment.status === 'delivered') {
                                      badgeColor = 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300';
                                      statusText = 'DELIVERED';
                                      descText = 'Delivered ✓';
                                    }
                                    
                                    return (
<>
                                      <div className="flex flex-col gap-1 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800 mt-1">
                                        <div className="flex justify-between items-center mb-1">
                                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Delivery</span>
                                          <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${badgeColor}`}>{statusText}</span>
                                        </div>
                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{descText}</p>
                                        {assignment.service_providers?.phone && assignment.status !== 'unassigned' && assignment.status !== 'delivered' && (
                                          <a href={`tel:${assignment.service_providers.phone}`} className="text-xs text-blue-600 dark:text-blue-400 font-semibold underline flex items-center gap-1 w-fit">
                                            📞 {assignment.service_providers.phone}
                                          </a>
                                        )}
                                        {assignment.status === 'assigned' && assignment.pickup_otp && (
                                          <div className="mt-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 flex items-center justify-between">
                                            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Give Rider this Pickup Code</span>
                                            <span className="text-lg font-extrabold text-amber-800 dark:text-amber-300 tracking-widest">{assignment.pickup_otp}</span>
                                          </div>
                                        )}
                                      </div>
                                      
                                      {(assignment.status === 'assigned' || assignment.status === 'picked_up') && (
                                        <div className="mt-4 -mx-5 -mb-5 border-t border-slate-100 dark:border-slate-800">
                                          <LiveTrackingMap 
                                            deliveryAssignment={assignment}
                                            destinationAddress={assignment.status === 'assigned' ? assignment.pickup_address : assignment.drop_address}
                                            statusText={assignment.status === 'assigned' ? `${(assignment.service_providers?.full_name || 'Rider').split(' ')[0]} is heading to pick up this order` : `${(assignment.service_providers?.full_name || 'Rider').split(' ')[0]} is on the way to deliver`}
                                            compact={true}
                                          />
                                        </div>
                                      )}
                                      </>
                                    );
                                  } else {
                                    return (
                                      <div className="flex flex-col gap-2">
                                        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg">
                                          <p className="text-sm font-medium text-slate-500 text-center">Creating delivery job...</p>
                                        </div>
                                      </div>
                                    );
                                  }
                                })()}
                              </div>
                           </CardContent>
                         </Card>
                       );})}
                       {dispatchOrdersList.length === 0 && (
                         <div className="h-40 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-900">
                           <Package size={32} className="mb-2 text-slate-300" />
                           <p className="font-medium text-sm">No orders to dispatch</p>
                         </div>
                       )}
                    </div>
                 </div>
              </div>
           </div>
        )}
      </div>

      {/* Receipt Modal */}
      <AnimatePresence>
        {receiptData && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" 
              onClick={() => setReceiptData(null)}
            ></motion.div>
            <motion.div 
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white dark:bg-slate-950 p-8 rounded-2xl shadow-2xl relative z-10 w-[600px] flex flex-col max-h-[90vh]"
            >
              <div className="flex justify-between items-start mb-6 print:hidden">
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Checkout Success</h2>
              <button onClick={() => setReceiptData(null)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"><X size={20}/></button>
            </div>
            
            <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 mb-6 font-mono text-sm text-slate-800 dark:text-slate-200 print:hidden">
              <div className="text-center mb-6">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h1 className="text-xl font-black uppercase tracking-widest border-b-2 border-slate-800 pb-2 mb-2 inline-block">Order Placed</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">Order ID: {receiptData.orderId || 'N/A'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total: ₹{receiptData.total.toFixed(2)}</p>
              </div>
            </div>

            {/* Hidden Printable Areas - Only shown on print */}
            <div className="hidden print:block printable-area absolute left-0 top-0">
               {/* A4 Tax Invoice (B2B) */}
               <div id="print-a4" className="hidden print:block w-[210mm] min-h-[297mm] bg-white dark:bg-slate-950 p-10 font-sans mx-auto text-black dark:text-white print:text-black">
                 <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-6">
                   <div>
                     <h1 className="text-3xl font-black uppercase tracking-widest">{tenant?.brand_name || 'BAHIBOX STORE'}</h1>
                     <p className="text-sm mt-1">Tax Invoice / Bill of Supply</p>
                     <p className="text-sm">GSTIN: 27AAAAA0000A1Z5</p>
                   </div>
                   <div className="text-right">
                     <p className="font-bold text-lg">INVOICE</p>
                     <p className="text-sm">Order ID: {receiptData.orderId}</p>
                     <p className="text-sm">Date: {receiptData.date}</p>
                   </div>
                 </div>

                 <div className="flex justify-between mb-8">
                   <div>
                     <p className="font-bold border-b border-slate-300 dark:border-slate-700 pb-1 mb-2 inline-block">Billed To</p>
                     <p className="text-sm font-semibold">Walk-in Customer</p>
                     <p className="text-sm">Cash Sales</p>
                   </div>
                 </div>

                 <table className="w-full text-left mb-8 border-collapse">
                   <thead>
                     <tr className="bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-800">
                       <th className="p-2 font-bold uppercase text-xs">S.No</th>
                       <th className="p-2 font-bold uppercase text-xs">Description of Goods</th>
                       <th className="p-2 font-bold uppercase text-xs">HSN/SAC</th>
                       <th className="p-2 font-bold uppercase text-xs text-center">Qty</th>
                       <th className="p-2 font-bold uppercase text-xs text-right">Rate</th>
                       <th className="p-2 font-bold uppercase text-xs text-right">Amount</th>
                     </tr>
                   </thead>
                   <tbody className="border-b-2 border-slate-800">
                     {receiptData.items.map((item, idx) => (
                       <tr key={idx} className="border-b border-slate-200 dark:border-slate-800">
                         <td className="p-2 text-sm">{idx + 1}</td>
                         <td className="p-2 text-sm font-semibold">{item.name}</td>
                         <td className="p-2 text-sm">8517</td>
                         <td className="p-2 text-sm text-center">{item.quantity} {item.unit || 'Pc'}</td>
                         <td className="p-2 text-sm text-right">₹{item.price ? Number(item.price).toFixed(2) : '0.00'}</td>
                         <td className="p-2 text-sm text-right font-semibold">₹{(((item.price || 0) * item.quantity) - item.discountValue).toFixed(2)}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>

                 <div className="flex justify-end mb-12">
                   <div className="w-64">
                     <div className="flex justify-between py-1 text-sm border-b border-slate-200 dark:border-slate-800">
                       <span>Subtotal</span>
                       <span className="font-semibold">₹{receiptData.total.toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between py-1 text-sm border-b border-slate-200 dark:border-slate-800">
                       <span>CGST (9%)</span>
                       <span className="font-semibold">₹{(receiptData.total * 0.09).toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between py-1 text-sm border-b-2 border-slate-800">
                       <span>SGST (9%)</span>
                       <span className="font-semibold">₹{(receiptData.total * 0.09).toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between py-2 text-xl font-black">
                       <span>TOTAL</span>
                       <span>₹{receiptData.total.toFixed(2)}</span>
                     </div>
                   </div>
                 </div>

                 <div className="flex justify-between items-end mt-16 pt-8 border-t border-slate-300 dark:border-slate-700">
                   <div className="text-xs text-slate-500 dark:text-slate-400">
                     <p>Terms & Conditions:</p>
                     <p>1. Goods once sold will not be taken back.</p>
                     <p>2. Subject to local jurisdiction.</p>
                   </div>
                   <div className="text-center">
                     <div className="w-40 border-b-2 border-slate-800 mb-2"></div>
                     <p className="text-sm font-bold">Authorized Signatory</p>
                   </div>
                 </div>
               </div>

               {/* Thermal Receipt (B2C) - 3-inch (80mm) layout */}
               <div id="print-thermal" className="hidden w-[80mm] bg-white dark:bg-slate-950 p-4 font-mono text-xs mx-auto text-black dark:text-white print:text-black">
                  <div className="text-center mb-4">
                    {tenant?.logo_url && <img src={tenant.logo_url} alt="Logo" className="h-10 mx-auto mb-2 grayscale" />}
                    <h1 className="text-lg font-black uppercase tracking-widest">{tenant?.brand_name || 'BAHIBOX STORE'}</h1>
                    <p className="text-[10px]">Order: {receiptData.orderId}</p>
                    <p className="text-[10px]">{receiptData.date}</p>
                  </div>
                  
                  <div className="border-t border-b border-dashed border-black py-2 mb-2">
                    <table className="w-full text-left">
                      <thead>
                        <tr>
                          <th className="pb-1 uppercase text-[10px] w-full">Item</th>
                          <th className="pb-1 uppercase text-[10px] text-center px-2">Qty</th>
                          <th className="pb-1 uppercase text-[10px] text-right">Amt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {receiptData.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="py-1 align-top pr-1">{item.name}</td>
                            <td className="py-1 align-top text-center">{item.quantity}</td>
                            <td className="py-1 align-top text-right">{(item.price * item.quantity).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="space-y-1 py-2">
                    <div className="flex justify-between font-bold text-sm">
                      <span>TOTAL</span>
                      <span>₹{receiptData.total.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="mt-6 text-center text-[10px]">
                    <div className="mx-auto w-24 h-24 bg-slate-200 dark:bg-slate-700 mb-2 border border-black flex items-center justify-center">QR CODE</div>
                    <p className="font-bold uppercase tracking-widest mt-2">Thank You!</p>
                  </div>
               </div>
            </div>
            
            <div className="flex gap-4 print:hidden">
              <Button variant="outline" className="flex-1 h-12 font-bold" onClick={() => setReceiptData(null)}>Close</Button>
              <Button className="flex-1 h-12 font-bold bg-slate-900 text-white" onClick={() => {
                  document.documentElement.style.setProperty('--print-display-a4', 'none');
                  document.documentElement.style.setProperty('--print-display-thermal', 'block');
                  document.getElementById('print-a4')?.classList.add('hidden');
                  document.getElementById('print-a4')?.classList.remove('print:block');
                  document.getElementById('print-thermal')?.classList.remove('hidden');
                  document.getElementById('print-thermal')?.classList.add('print:block');
                  window.print();
              }}>
                <Printer size={18} className="mr-2"/> Print Thermal (3")
              </Button>
              <Button className="flex-1 h-12 font-bold bg-blue-900 text-white hover:bg-blue-800" onClick={() => {
                  document.documentElement.style.setProperty('--print-display-a4', 'block');
                  document.documentElement.style.setProperty('--print-display-thermal', 'none');
                  document.getElementById('print-thermal')?.classList.add('hidden');
                  document.getElementById('print-thermal')?.classList.remove('print:block');
                  document.getElementById('print-a4')?.classList.remove('hidden');
                  document.getElementById('print-a4')?.classList.add('print:block');
                  window.print();
              }}>
                <FileText size={18} className="mr-2"/> Print Invoice (A4)
              </Button>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
    </div>
  );
}


// ==========================================
// 2. Master & Inventory Management
// ==========================================
interface InventoryViewProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  onRefresh: () => Promise<void>;
}

function InventoryView({ products, setProducts, onRefresh }: InventoryViewProps) {
  const { tenant } = useTenant();
  const { user, currentTenantId } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddRow, setShowAddRow] = useState(false);
  
  // Settings Dropdown State
  const [showSettings, setShowSettings] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<Record<string, boolean>>({
    'Product Name': true,
    'Unit': true,
    'Purchase Price': true,
    'CESS %': true,
    'Opening Stock': true,
    'Barcode': true,
    'MRP': true,
    'Sale Price': true,
    Category: false,
    Subcategory: false,
    Batch: false,
    Mfgdate: false,
    'Exp Date': false,
    Size: false,
    Colour: false,
    WSalePrice: false,
    IMEI1: false,
    IMEI2: false,
    Kitchen: false,
    Description: false,
    Discount: false,
    'Sales Unit': false,
    'Sales Alt Unit': false,
    Conv: false,
    'Min Stock': false,
    Status: false,
    'S Tax': false,
    'P Tax': false,
    'G Down': false,
    Rack: false,
    'Def Qty': false,
    'Part No': false,
    HSNCode: false,
    Category_plus: false,
    Subcategory_plus: false,
    Gst_plus: false,
    CGST: false,
    SGST: false,
    IGST: false,
    UpdateButtonColumn: false,
    'Delete ButtonColumn': false,
    'Print BandaButton': false
  });

  const toggleColumn = (col: string) => {
    setSelectedColumns(prev => ({ ...prev, [col]: !prev[col] }));
  };
  
  // New Product Form State
  const [newName, setNewName] = useState('');
  const [newPurchasePrice, setNewPurchasePrice] = useState<number>(0);
  const [newCess, setNewCess] = useState<number>(0);
  const [newStock, setNewStock] = useState<number>(0);
  const [newUnit, setNewUnit] = useState<string>('');
  const [newBarcode, setNewBarcode] = useState('');
  const [newMrp, setNewMrp] = useState<number>(0);
  const [newPrice, setNewPrice] = useState<number>(0); // Retail Sale Price

  const [newCategory, setNewCategory] = useState('General');
  const [newSubcategory, setNewSubcategory] = useState('');
  const [newWSalePrice, setNewWSalePrice] = useState<number>(0);
  const [newBatch, setNewBatch] = useState('');
  const [newMfgDate, setNewMfgDate] = useState('');
  const [newExpDate, setNewExpDate] = useState('');
  const [newSize, setNewSize] = useState('');
  const [newColour, setNewColour] = useState('');
  
  const [newImei1, setNewImei1] = useState('');
  const [newImei2, setNewImei2] = useState('');
  const [newKitchen, setNewKitchen] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDiscount, setNewDiscount] = useState<number>(0);
  const [newSalesUnit, setNewSalesUnit] = useState('');
  const [newSalesAltUnit, setNewSalesAltUnit] = useState('');
  const [newConv, setNewConv] = useState<number>(0);
  const [newMinStock, setNewMinStock] = useState<number>(0);
  const [newStatus, setNewStatus] = useState('');
  const [newSTax, setNewSTax] = useState<number>(0);
  const [newPTax, setNewPTax] = useState<number>(0);
  const [newGDown, setNewGDown] = useState('');
  const [newRack, setNewRack] = useState('');
  const [newDefQty, setNewDefQty] = useState<number>(0);
  const [newPartNo, setNewPartNo] = useState('');
  const [newHsnCode, setNewHsnCode] = useState('');
  const [newGstPlus, setNewGstPlus] = useState<number>(0);
  const [newCGST, setNewCGST] = useState<number>(0);
  const [newSGST, setNewSGST] = useState<number>(0);
  const [newIGST, setNewIGST] = useState<number>(0);

  const [availableCategories, setAvailableCategories] = useState<string[]>(['Grocery', 'Snacks', 'Cleaning']);
  const [subcategoriesMap, setSubcategoriesMap] = useState<Record<string, string[]>>({});
  const [availableUnits, setAvailableUnits] = useState<string[]>(['Piece', 'Kg', 'Ltr', 'Box']);

  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const handleDeleteCategory = (catName: string) => {
    // Child-Before-Parent Protection Rule
    const hasChildren = products.some((p: any) => p.category === catName);
    if (hasChildren) {
      alert("First delete all items/products/resumes inside this list.");
      return;
    }
    setAvailableCategories(prev => prev.filter((c: any) => c !== catName));
  };
  const [showAddSubcatModal, setShowAddSubcatModal] = useState(false);
  const [newSubcatParent, setNewSubcatParent] = useState('');
  const [newSubcatName, setNewSubcatName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const purchasePriceInputRef = useRef<HTMLInputElement>(null);
  const cessInputRef = useRef<HTMLInputElement>(null);
  const stockInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const mrpInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);

  const downloadProforma = () => {
    const ws = XLSX.utils.json_to_sheet([
      { name: 'Example Product', category: 'Grocery', price: 100, purchasePrice: 80, stock: 50, unit: 'Piece', barcode: '123456789' }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Proforma");
    XLSX.writeFile(wb, "Inventory_Proforma.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const newProducts: Product[] = data.map(row => ({
          id: 'P-' + Math.floor(100 + Math.random() * 900) + Date.now(),
          name: row.name || 'Unnamed',
          category: row.category || 'General',
          price: Number(row.price) || 0,
          purchasePrice: Number(row.purchasePrice) || 0,
          stock: Number(row.stock) || 0,
          unit: row.unit || 'Piece',
          barcode: row.barcode || String(Math.floor(8900000000000 + Math.random() * 99999999999)),
          merchant_id: tenant?.merchant_id
        }));

        setProducts(prev => [...newProducts, ...prev]);
        alert(`${newProducts.length} products added successfully!`);
      } catch (error) {
        alert("Error parsing Excel file");
      }
      if(fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const filteredProducts = products.filter((p: any) => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.barcode && p.barcode.includes(searchTerm))
  );

  const handleAddProduct = async () => {
    let finalName = newName;
    if (!finalName && newBarcode) {
      finalName = `Scanned Item ${newBarcode.slice(-4)}`;
    }

    if (!finalName) {
      alert("Please enter a valid name or scan a barcode!");
      return;
    }

    if (!newUnit) {
      alert("Unit is mandatory. Please select a unit (e.g., Kg, Ltr, Pcs).");
      return;
    }

    const newId = 'P-' + Math.floor(100 + Math.random() * 900);
    const barcodeVal = newBarcode || String(Math.floor(8900000000000 + Math.random() * 99999999999));

    const newProduct: Product = {
      id: newId,
      name: finalName,
      category: newCategory || 'General',
      subcategory: newSubcategory || undefined,
      wSalePrice: newWSalePrice || undefined,
      batch: newBatch || undefined,
      mfgDate: newMfgDate || undefined,
      expDate: newExpDate || undefined,
      size: newSize || undefined,
      colour: newColour || undefined,
      imei1: newImei1 || undefined,
      imei2: newImei2 || undefined,
      kitchen: newKitchen || undefined,
      description: newDescription || undefined,
      discount: newDiscount || undefined,
      salesUnit: newSalesUnit || undefined,
      salesAltUnit: newSalesAltUnit || undefined,
      conv: newConv || undefined,
      minStock: newMinStock || undefined,
      status: newStatus || undefined,
      sTax: newSTax || undefined,
      pTax: newPTax || undefined,
      gDown: newGDown || undefined,
      rack: newRack || undefined,
      defQty: newDefQty || undefined,
      partNo: newPartNo || undefined,
      hsnCode: newHsnCode || undefined,
      gst_plus: newGstPlus || undefined,
      cgst: newCGST || undefined,
      sgst: newSGST || undefined,
      igst: newIGST || undefined,
      price: newPrice || 0,
      purchasePrice: newPurchasePrice || 0,
      mrp: newMrp || 0,
      cess: newCess || 0,
      stock: newStock || 0,
      unit: newUnit || 'Piece',
      barcode: barcodeVal,
      merchant_id: tenant?.merchant_id
    };

    // Update local state
    setProducts(prev => [newProduct, ...prev]);

    // Reset Form for next entry
    setNewName('');
    setNewPrice(0);
    setNewPurchasePrice(0);
    setNewStock(0);
    setNewUnit('');
    setNewBarcode('');
    setNewMrp(0);
    setNewCess(0);

    setNewCategory('General');
    setNewSubcategory('');
    setNewWSalePrice(0);
    setNewBatch('');
    setNewMfgDate('');
    setNewExpDate('');
    setNewSize('');
    setNewColour('');
    setNewImei1('');
    setNewImei2('');
    setNewKitchen('');
    setNewDescription('');
    setNewDiscount(0);
    setNewSalesUnit('');
    setNewSalesAltUnit('');
    setNewConv(0);
    setNewMinStock(0);
    setNewStatus('');
    setNewSTax(0);
    setNewPTax(0);
    setNewGDown('');
    setNewRack('');
    setNewDefQty(0);
    setNewPartNo('');
    setNewHsnCode('');
    setNewGstPlus(0);
    setNewCGST(0);
    setNewSGST(0);
    setNewIGST(0);

    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  };

  const handleAddCategory = () => {
    setShowAddCatModal(true);
  };

  const handleAddSubcategory = () => {
    setShowAddSubcatModal(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, nextRef?: any) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextRef && nextRef.current) {
        nextRef.current.focus();
      } else {
        handleAddProduct();
      }
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product? (Child-before-Parent constraint checked)")) {
      return;
    }

    // Update local state
    setProducts(prev => prev.filter((p: any) => p.id !== id));
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-full mx-auto relative">
      {/* Add/Manage Category Modal */}
      {showAddCatModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Manage Categories</h3>
              <button onClick={() => setShowAddCatModal(false)}><X size={20} className="text-slate-400" /></button>
            </div>
            
            <div className="mb-6 max-h-48 overflow-y-auto space-y-2 border border-slate-100 dark:border-slate-800 p-2 rounded-lg bg-slate-50 dark:bg-slate-900">
              {availableCategories.map(cat => (
                <div key={cat} className="flex justify-between items-center bg-white dark:bg-slate-950 p-2 rounded-md shadow-sm border border-slate-200 dark:border-slate-800">
                  <span className="text-sm font-semibold">{cat}</span>
                  <button 
                    onClick={() => handleDeleteCategory(cat)}
                    className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                    title="Delete Category"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {availableCategories.length === 0 && <p className="text-xs text-slate-400 text-center py-2">No categories.</p>}
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">New Category Name</label>
                <Input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Enter category name..." />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setShowAddCatModal(false)}>Close</Button>
                <Button onClick={() => {
                  if (newCatName && !availableCategories.includes(newCatName)) {
                    setAvailableCategories(prev => [...prev, newCatName]);
                    setNewCatName('');
                  }
                }}>Add Category</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Subcategory Modal */}
      {showAddSubcatModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Add Subcategory</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Category</label>
                <Select value={newSubcatParent} onValueChange={setNewSubcatParent}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategories.map((c: any) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Subcategory Name</label>
                <Input value={newSubcatName} onChange={e => setNewSubcatName(e.target.value)} placeholder="Enter subcategory name..." />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setShowAddSubcatModal(false)}>Cancel</Button>
                <Button onClick={() => {
                  if (newSubcatParent && newSubcatName) {
                    setSubcategoriesMap(prev => ({...prev, [newSubcatParent]: [...(prev[newSubcatParent] || []), newSubcatName]}));
                    setShowAddSubcatModal(false);
                    setNewSubcatName('');
                  }
                }}>Save</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Inventory & Product Master</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Manage product pricing, real-time barcodes, stock levels, and mandatory units.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={downloadProforma} className="bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 h-9 text-xs font-bold">
            <Edit size={14} className="mr-1.5 text-blue-600" /> Product Bulk Edit
          </Button>
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} className="bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 h-9 text-xs font-bold">
            <FileDown size={14} className="mr-1.5 text-emerald-600" /> Export
          </Button>
          <Button size="sm" variant="outline" onClick={() => { if(confirm("Reset all form entries?")) { setShowAddRow(false); setNewName(''); } }} className="bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 h-9 text-xs font-bold">
            <RotateCcw size={14} className="mr-1.5 text-slate-500 dark:text-slate-400" /> Reset
          </Button>
          <div className="relative">
            <Button size="sm" variant="outline" onClick={() => setShowSettings(!showSettings)} className="bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 h-9 text-xs font-bold">
              <Settings size={14} className="mr-1.5 text-slate-500 dark:text-slate-400" /> Settings
            </Button>
            {showSettings && (
              <div className="absolute right-0 top-10 w-48 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xl rounded-lg p-2 z-50 flex flex-col gap-1 max-h-64 overflow-y-auto">
                <div className="text-xs font-bold text-slate-400 mb-1 px-1 uppercase tracking-wider">Visible Columns</div>
                {Object.keys(selectedColumns).map(col => (
                  <label key={col} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 rounded cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <input type="checkbox" checked={selectedColumns[col]} onChange={() => toggleColumn(col)} className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 dark:border-slate-700 focus:ring-blue-500" />
                    {col}
                  </label>
                ))}
              </div>
            )}
          </div>
          <Button size="sm" variant="outline" className="bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 h-9 text-xs font-bold">
            <CheckCircle size={14} className="mr-1.5 text-blue-500" /> Set Default
          </Button>
        </div>
      </div>

      {/* Toolbar & Actions */}
      <div className="flex flex-col xl:flex-row justify-between gap-4">
        {/* Left Side Controls */}
        <div className="flex flex-col gap-3 flex-1 bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 max-w-lg">
            <Select defaultValue="all">
              <SelectTrigger className="w-[120px] h-9 text-xs font-semibold">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="grocery">Grocery</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <Input 
                placeholder="Search..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 h-9 text-xs" 
              />
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span>TOP:</span>
              <Input type="number" defaultValue={5} className="w-16 h-7 text-xs bg-white dark:bg-slate-950 text-center font-mono" />
              <span>RECORDS</span>
            </div>
            <div className="flex items-center gap-2">
              <span>SELECT ALL:</span>
              <input type="checkbox" className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-2">
              <span>BARCODE No. of Copies:</span>
              <Input type="number" defaultValue={1} className="w-12 h-7 text-xs bg-white dark:bg-slate-950 text-center font-mono" />
            </div>
          </div>
        </div>

        {/* Right Side Buttons */}
        <div className="flex flex-wrap items-stretch justify-end gap-2 xl:min-w-[450px]">
          <div className="grid grid-cols-2 gap-2 flex-1">
             <Button variant="outline" onClick={handleAddCategory} className="h-full bg-green-50 hover:bg-green-100 border-green-200 text-green-700 text-xs font-bold justify-start">
               <FolderPlus size={16} className="mr-2 text-green-500" /> Manage Categories
             </Button>
             <Button variant="outline" onClick={handleAddSubcategory} className="h-full bg-green-50 hover:bg-green-100 border-green-200 text-green-700 text-xs font-bold justify-start">
               <Tags size={16} className="mr-2 text-green-500" /> Add Subcategory
             </Button>
             <Button variant="outline" className="h-full bg-teal-50 hover:bg-teal-100 border-teal-200 text-teal-700 text-xs font-bold justify-start">
               <Search size={16} className="mr-2 text-teal-500" /> Show All
             </Button>
             <Button variant="outline" className="h-full bg-teal-50 hover:bg-teal-100 border-teal-200 text-teal-700 text-xs font-bold justify-start">
               <ImageIcon size={16} className="mr-2 text-teal-500" /> Bulk Image Update
             </Button>
          </div>
          <Button onClick={() => setShowAddRow(prev => !prev)} className="h-full px-6 bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm flex flex-col items-center justify-center shadow-sm rounded-xl">
            {showAddRow ? <RotateCcw size={20} className="mb-0.5 text-red-200" /> : <Plus size={20} className="mb-0.5 text-red-200" />}
            {showAddRow ? <>CLOSE<br/>ENTRY</> : <>NEW<br/>RECORD</>}
          </Button>
        </div>
      </div>

      {/* Products Table Card */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-950 rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-[11px] text-slate-700 dark:text-slate-300 bg-lime-100/50 uppercase border-b border-lime-200 font-extrabold tracking-wider">
              <tr>
                <th className="px-3 py-2 w-20">P-Code</th>
                {selectedColumns['Product Name'] && <th className="px-3 py-2 min-w-[200px] text-red-600 bg-red-100/50 text-center">Product Name</th>}
                {selectedColumns['Unit'] && <th className="px-3 py-2 min-w-[100px] text-red-600 bg-red-100/50 text-center">Unit</th>}
                {selectedColumns['Category'] && <th className="px-3 py-2 min-w-[120px]">Category</th>}
                {selectedColumns['Subcategory'] && <th className="px-3 py-2 min-w-[120px]">Subcategory</th>}
                {selectedColumns['WSalePrice'] && <th className="px-3 py-2 min-w-[100px]">WSalePrice</th>}
                {selectedColumns['Purchase Price'] && <th className="px-3 py-2 min-w-[120px] text-red-600 bg-red-100/50 text-center">Purchase Price</th>}
                {selectedColumns['Batch'] && <th className="px-3 py-2 min-w-[100px]">Batch</th>}
                {selectedColumns['Mfgdate'] && <th className="px-3 py-2 min-w-[100px]">MfgDate</th>}
                {selectedColumns['Exp Date'] && <th className="px-3 py-2 min-w-[100px]">ExpDate</th>}
                {selectedColumns['Size'] && <th className="px-3 py-2 min-w-[80px]">Size</th>}
                {selectedColumns['Colour'] && <th className="px-3 py-2 min-w-[80px]">Colour</th>}
                {selectedColumns['IMEI1'] && <th className="px-3 py-2 min-w-[100px]">IMEI1</th>}
                {selectedColumns['IMEI2'] && <th className="px-3 py-2 min-w-[100px]">IMEI2</th>}
                {selectedColumns['Kitchen'] && <th className="px-3 py-2 min-w-[100px]">Kitchen</th>}
                {selectedColumns['Description'] && <th className="px-3 py-2 min-w-[120px]">Description</th>}
                {selectedColumns['Discount'] && <th className="px-3 py-2 min-w-[80px]">Discount</th>}
                {selectedColumns['Sales Unit'] && <th className="px-3 py-2 min-w-[80px]">S.Unit</th>}
                {selectedColumns['Sales Alt Unit'] && <th className="px-3 py-2 min-w-[80px]">S.AltUnit</th>}
                {selectedColumns['Conv'] && <th className="px-3 py-2 min-w-[80px]">Conv</th>}
                {selectedColumns['Min Stock'] && <th className="px-3 py-2 min-w-[80px]">MinStock</th>}
                {selectedColumns['Status'] && <th className="px-3 py-2 min-w-[80px]">Status</th>}
                {selectedColumns['S Tax'] && <th className="px-3 py-2 min-w-[80px]">S.Tax</th>}
                {selectedColumns['P Tax'] && <th className="px-3 py-2 min-w-[80px]">P.Tax</th>}
                {selectedColumns['G Down'] && <th className="px-3 py-2 min-w-[100px]">G.Down</th>}
                {selectedColumns['Rack'] && <th className="px-3 py-2 min-w-[80px]">Rack</th>}
                {selectedColumns['Def Qty'] && <th className="px-3 py-2 min-w-[80px]">DefQty</th>}
                {selectedColumns['Part No'] && <th className="px-3 py-2 min-w-[100px]">PartNo</th>}
                {selectedColumns['HSNCode'] && <th className="px-3 py-2 min-w-[100px]">HSNCode</th>}
                {selectedColumns['Category_plus'] && <th className="px-3 py-2 min-w-[100px]">Cat+</th>}
                {selectedColumns['Subcategory_plus'] && <th className="px-3 py-2 min-w-[100px]">SubCat+</th>}
                {selectedColumns['Gst_plus'] && <th className="px-3 py-2 min-w-[80px]">GST+</th>}
                {selectedColumns['CGST'] && <th className="px-3 py-2 min-w-[80px]">CGST</th>}
                {selectedColumns['SGST'] && <th className="px-3 py-2 min-w-[80px]">SGST</th>}
                {selectedColumns['IGST'] && <th className="px-3 py-2 min-w-[80px]">IGST</th>}
                {selectedColumns['CESS %'] && <th className="px-3 py-2 w-20">CESS %</th>}
                {selectedColumns['Opening Stock'] && <th className="px-3 py-2 w-24">Opening Stock</th>}
                {selectedColumns['Barcode'] && <th className="px-3 py-2 min-w-[120px] text-red-600 bg-red-100/50 text-center">Barcode</th>}
                {selectedColumns['MRP'] && <th className="px-3 py-2 w-24">MRP</th>}
                {selectedColumns['Sale Price'] && <th className="px-3 py-2 w-32">Sale Price</th>}
                <th className="px-3 py-2 text-center w-16">Insert</th>
                {selectedColumns['UpdateButtonColumn'] && <th className="px-3 py-2 text-center w-16">Update</th>}
                {selectedColumns['Delete ButtonColumn'] && <th className="px-3 py-2 text-center w-16">Delete</th>}
                <th className="px-3 py-2 text-center w-16">Print</th>
                {selectedColumns['Print BandaButton'] && <th className="px-3 py-2 text-center w-16">Barcode Print</th>}
                <th className="px-3 py-2 text-center w-16">Variant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors group">
                  <td className="px-3 py-1.5 text-[11px] font-mono font-medium border-l-4 border-l-purple-600 bg-slate-50 dark:bg-slate-900">{product.id}</td>
                  {selectedColumns['Product Name'] && <td className="px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">{product.name}</td>}
                  {selectedColumns['Unit'] && <td className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">{product.unit || 'Piece'}</td>}
                  {selectedColumns['Category'] && <td className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">{product.category}</td>}
                  {selectedColumns['Subcategory'] && <td className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">{product.subcategory || '-'}</td>}
                  {selectedColumns['WSalePrice'] && <td className="px-3 py-1.5 text-xs font-mono text-slate-600 dark:text-slate-400 text-right">{product.wSalePrice ? Number(product.wSalePrice).toFixed(2) : '-'}</td>}
                  {selectedColumns['Purchase Price'] && <td className="px-3 py-1.5 text-xs font-mono text-slate-600 dark:text-slate-400 text-right">{product.purchasePrice ? Number(product.purchasePrice).toFixed(2) : '0.00'}</td>}
                  {selectedColumns['Batch'] && <td className="px-3 py-1.5 text-xs font-mono text-slate-600 dark:text-slate-400">{product.batch || '-'}</td>}
                  {selectedColumns['Mfgdate'] && <td className="px-3 py-1.5 text-xs font-mono text-slate-600 dark:text-slate-400">{product.mfgDate || '-'}</td>}
                  {selectedColumns['Exp Date'] && <td className="px-3 py-1.5 text-xs font-mono text-slate-600 dark:text-slate-400">{product.expDate || '-'}</td>}
                  {selectedColumns['Size'] && <td className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">{product.size || '-'}</td>}
                  {selectedColumns['Colour'] && <td className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">{product.colour || '-'}</td>}
                  {selectedColumns['IMEI1'] && <td className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">{product.imei1 || '-'}</td>}
                  {selectedColumns['IMEI2'] && <td className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">{product.imei2 || '-'}</td>}
                  {selectedColumns['Kitchen'] && <td className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">{product.kitchen || '-'}</td>}
                  {selectedColumns['Description'] && <td className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[120px]" title={product.description}>{product.description || '-'}</td>}
                  {selectedColumns['Discount'] && <td className="px-3 py-1.5 text-xs font-mono text-slate-600 dark:text-slate-400 text-right">{product.discount || '-'}</td>}
                  {selectedColumns['Sales Unit'] && <td className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">{product.salesUnit || '-'}</td>}
                  {selectedColumns['Sales Alt Unit'] && <td className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">{product.salesAltUnit || '-'}</td>}
                  {selectedColumns['Conv'] && <td className="px-3 py-1.5 text-xs font-mono text-slate-600 dark:text-slate-400 text-right">{product.conv || '-'}</td>}
                  {selectedColumns['Min Stock'] && <td className="px-3 py-1.5 text-xs font-mono text-slate-600 dark:text-slate-400 text-right">{product.minStock || '-'}</td>}
                  {selectedColumns['Status'] && <td className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">{product.status || '-'}</td>}
                  {selectedColumns['S Tax'] && <td className="px-3 py-1.5 text-xs font-mono text-slate-600 dark:text-slate-400 text-right">{product.sTax || '-'}</td>}
                  {selectedColumns['P Tax'] && <td className="px-3 py-1.5 text-xs font-mono text-slate-600 dark:text-slate-400 text-right">{product.pTax || '-'}</td>}
                  {selectedColumns['G Down'] && <td className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">{product.gDown || '-'}</td>}
                  {selectedColumns['Rack'] && <td className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">{product.rack || '-'}</td>}
                  {selectedColumns['Def Qty'] && <td className="px-3 py-1.5 text-xs font-mono text-slate-600 dark:text-slate-400 text-right">{product.defQty || '-'}</td>}
                  {selectedColumns['Part No'] && <td className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">{product.partNo || '-'}</td>}
                  {selectedColumns['HSNCode'] && <td className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">{product.hsnCode || '-'}</td>}
                  {selectedColumns['Category_plus'] && <td className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">{product.category || '-'}</td>}
                  {selectedColumns['Subcategory_plus'] && <td className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">{product.subcategory || '-'}</td>}
                  {selectedColumns['Gst_plus'] && <td className="px-3 py-1.5 text-xs font-mono text-slate-600 dark:text-slate-400 text-right">{product.gst_plus || '-'}</td>}
                  {selectedColumns['CGST'] && <td className="px-3 py-1.5 text-xs font-mono text-slate-600 dark:text-slate-400 text-right">{product.cgst || '-'}</td>}
                  {selectedColumns['SGST'] && <td className="px-3 py-1.5 text-xs font-mono text-slate-600 dark:text-slate-400 text-right">{product.sgst || '-'}</td>}
                  {selectedColumns['IGST'] && <td className="px-3 py-1.5 text-xs font-mono text-slate-600 dark:text-slate-400 text-right">{product.igst || '-'}</td>}
                  {selectedColumns['CESS %'] && <td className="px-3 py-1.5 text-xs font-mono text-slate-600 dark:text-slate-400 text-right">{product.cess ? Number(product.cess).toFixed(2) : '0.00'}</td>}
                  {selectedColumns['Opening Stock'] && <td className="px-3 py-1.5 text-xs font-mono text-slate-600 dark:text-slate-400 text-right">{product.stock ? Number(product.stock).toFixed(3) : '0.000'}</td>}
                  {selectedColumns['Barcode'] && <td className="px-3 py-1.5 text-xs font-mono text-slate-700 dark:text-slate-300">{product.barcode || 'N/A'}</td>}
                  {selectedColumns['MRP'] && <td className="px-3 py-1.5 text-xs font-mono text-slate-600 dark:text-slate-400 text-right">{product.mrp ? Number(product.mrp).toFixed(2) : '0.00'}</td>}
                  {selectedColumns['Sale Price'] && <td className="px-3 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 text-right">{product.price ? Number(product.price).toFixed(2) : '0.00'}</td>}
                  <td className="px-1 py-1.5 text-center">
                    <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 font-bold border-slate-300 dark:border-slate-700">
                      Insert
                    </Button>
                  </td>
                  {selectedColumns['UpdateButtonColumn'] && <td className="px-1 py-1.5 text-center">
                    <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 font-bold border-slate-300 dark:border-slate-700">
                      Update
                    </Button>
                  </td>}
                  {selectedColumns['Delete ButtonColumn'] && <td className="px-1 py-1.5 text-center">
                    <PermissionGate permission="inventory.product.delete" fallback={
                      <Button disabled variant="outline" size="sm" className="h-6 text-[10px] px-2 bg-slate-100 dark:bg-slate-800 text-slate-300 font-bold border-slate-200 dark:border-slate-800 cursor-not-allowed" title="No permission">
                        Delete
                      </Button>
                    }>
                      <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 text-red-600 font-bold border-slate-300 dark:border-slate-700">
                        Delete
                      </Button>
                    </PermissionGate>
                  </td>}
                  <td className="px-1 py-1.5 text-center">
                    <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 font-bold border-slate-300 dark:border-slate-700">
                      Barcode
                    </Button>
                  </td>
                  {selectedColumns['Print BandaButton'] && <td className="px-1 py-1.5 text-center">
                    <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 font-bold border-slate-300 dark:border-slate-700">
                      Print
                    </Button>
                  </td>}
                  <td className="px-1 py-1.5 text-center pr-3">
                    <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 font-bold border-slate-300 dark:border-slate-700">
                      Variant
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-slate-400 font-medium text-sm">
                    No products found in inventory master
                  </td>
                </tr>
              )}
              {/* Fast Add Row at bottom */}
              {showAddRow && (
              <tr className="bg-amber-50/40 border-b-2 border-amber-200">
                <td className="px-2 py-1 align-middle text-center border-l-4 border-l-amber-400">
                  <span className="text-[10px] font-bold text-amber-600 uppercase">Auto</span>
                </td>
                {selectedColumns['Product Name'] && <td className="px-2 py-1 align-middle">
                  <Input ref={nameInputRef} placeholder="Type Name..." value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => handleKeyDown(e, purchasePriceInputRef)} className="h-7 text-xs bg-white dark:bg-slate-950 border-amber-200 focus:border-amber-400 focus:ring-amber-400 rounded-sm" />
                </td>}
                {selectedColumns['Unit'] && <td className="px-2 py-1 align-middle">
                  <select 
                    value={newUnit} 
                    onChange={e => setNewUnit(e.target.value)}
                    className={`h-7 w-full text-xs bg-white dark:bg-slate-950 border ${newUnit ? 'border-amber-200' : 'border-red-400'} focus:border-amber-400 rounded-sm outline-none px-1`}
                    required
                  >
                    <option value="" disabled>Select Unit</option>
                    {availableUnits.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </td>}
                {selectedColumns['Category'] && <td className="px-2 py-1 align-middle">
                  <Input placeholder="Category" value={newCategory} onChange={e => setNewCategory(e.target.value)} className="h-7 text-xs bg-white dark:bg-slate-950 border-amber-200 focus:border-amber-400 rounded-sm" />
                </td>}
                {selectedColumns['Subcategory'] && <td className="px-2 py-1 align-middle">
                  <Input placeholder="Subcategory" value={newSubcategory} onChange={e => setNewSubcategory(e.target.value)} className="h-7 text-xs bg-white dark:bg-slate-950 border-amber-200 focus:border-amber-400 rounded-sm" />
                </td>}
                {selectedColumns['WSalePrice'] && <td className="px-2 py-1 align-middle">
                  <Input type="number" placeholder="0.00" value={newWSalePrice || ''} onChange={e => setNewWSalePrice(Number(e.target.value))} className="h-7 text-xs bg-white dark:bg-slate-950 border-amber-200 focus:border-amber-400 rounded-sm text-right" />
                </td>}
                {selectedColumns['Purchase Price'] && <td className="px-2 py-1 align-middle">
                  <Input ref={purchasePriceInputRef} type="number" placeholder="0.00" value={newPurchasePrice || ''} onChange={e => setNewPurchasePrice(Number(e.target.value))} onKeyDown={e => handleKeyDown(e, cessInputRef)} className="h-7 text-xs bg-white dark:bg-slate-950 border-amber-200 focus:border-amber-400 focus:ring-amber-400 rounded-sm text-right font-mono" />
                </td>}
                {selectedColumns['Batch'] && <td className="px-2 py-1 align-middle">
                  <Input placeholder="Batch" value={newBatch} onChange={e => setNewBatch(e.target.value)} className="h-7 text-xs bg-white dark:bg-slate-950 border-amber-200 focus:border-amber-400 rounded-sm" />
                </td>}
                {selectedColumns['Mfgdate'] && <td className="px-2 py-1 align-middle">
                  <Input type="date" value={newMfgDate} onChange={e => setNewMfgDate(e.target.value)} className="h-7 text-xs bg-white dark:bg-slate-950 border-amber-200 focus:border-amber-400 rounded-sm" />
                </td>}
                {selectedColumns['Exp Date'] && <td className="px-2 py-1 align-middle">
                  <Input type="date" value={newExpDate} onChange={e => setNewExpDate(e.target.value)} className="h-7 text-xs bg-white dark:bg-slate-950 border-amber-200 focus:border-amber-400 rounded-sm" />
                </td>}
                {selectedColumns['Size'] && <td className="px-2 py-1 align-middle">
                  <Input placeholder="Size" value={newSize} onChange={e => setNewSize(e.target.value)} className="h-7 text-xs bg-white dark:bg-slate-950 border-amber-200 focus:border-amber-400 rounded-sm" />
                </td>}
                {selectedColumns['Colour'] && <td className="px-2 py-1 align-middle">
                  <Input placeholder="Colour" value={newColour} onChange={e => setNewColour(e.target.value)} className="h-7 text-xs bg-white dark:bg-slate-950 border-amber-200 focus:border-amber-400 rounded-sm" />
                </td>}
                {selectedColumns['IMEI1'] && <td className="px-2 py-1 align-middle">
                  <Input placeholder="IMEI1" value={newImei1} onChange={e => setNewImei1(e.target.value)} className="h-7 text-xs bg-white dark:bg-slate-950 border-amber-200 focus:border-amber-400 rounded-sm" />
                </td>}
                {selectedColumns['IMEI2'] && <td className="px-2 py-1 align-middle">
                  <Input placeholder="IMEI2" value={newImei2} onChange={e => setNewImei2(e.target.value)} className="h-7 text-xs bg-white dark:bg-slate-950 border-amber-200 focus:border-amber-400 rounded-sm" />
                </td>}
                {selectedColumns['Kitchen'] && <td className="px-2 py-1 align-middle">
                  <Input placeholder="Kitchen" value={newKitchen} onChange={e => setNewKitchen(e.target.value)} className="h-7 text-xs bg-white dark:bg-slate-950 border-amber-200 focus:border-amber-400 rounded-sm" />
                </td>}
                {selectedColumns['Description'] && <td className="px-2 py-1 align-middle">
                  <Input placeholder="Description" value={newDescription} onChange={e => setNewDescription(e.target.value)} className="h-7 text-xs bg-white dark:bg-slate-950 border-amber-200 focus:border-amber-400 rounded-sm" />
                </td>}
                {selectedColumns['Discount'] && <td className="px-2 py-1 align-middle">
                  <Input type="number" placeholder="0" value={newDiscount || ''} onChange={e => setNewDiscount(Number(e.target.value))} className="h-7 text-xs bg-white dark:bg-slate-950 border-amber-200 focus:border-amber-400 rounded-sm text-right" />
                </td>}
                {selectedColumns['Sales Unit'] && <td className="px-2 py-1 align-middle">
                  <Input placeholder="Unit" value={newSalesUnit} onChange={e => setNewSalesUnit(e.target.value)} className="h-7 text-xs bg-white dark:bg-slate-950 border-amber-200 focus:border-amber-400 rounded-sm" />
                </td>}
                {selectedColumns['Sales Alt Unit'] && <td className="px-2 py-1 align-middle">
                  <Input placeholder="Alt Unit" value={newSalesAltUnit} onChange={e => setNewSalesAltUnit(e.target.value)} className="h-7 text-xs bg-white dark:bg-slate-950 border-amber-200 focus:border-amber-400 rounded-sm" />
                </td>}
                {selectedColumns['Conv'] && <td className="px-2 py-1 align-middle">
                  <Input type="number" placeholder="0" value={newConv || ''} onChange={e => setNewConv(Number(e.target.value))} className="h-7 text-xs bg-white dark:bg-slate-950 border-amber-200 focus:border-amber-400 rounded-sm text-right" />
                </td>}
                {selectedColumns['Min Stock'] && <td className="px-2 py-1 align-middle">
                  <Input type="number" placeholder="0" value={newMinStock || ''} onChange={e => setNewMinStock(Number(e.target.value))} className="h-7 text-xs bg-white dark:bg-slate-950 border-amber-200 focus:border-amber-400 rounded-sm text-right" />
                </td>}
                {selectedColumns['Status'] && <td className="px-2 py-1 align-middle">
                  <Input placeholder="Status" value={newStatus} onChange={e => setNewStatus(e.target.value)} className="h-7 text-xs bg-white dark:bg-slate-950 border-amber-200 focus:border-amber-400 rounded-sm" />
                </td>}
                {selectedColumns['S Tax'] && <td className="px-2 py-1 align-middle">
                  <Input type="number" placeholder="0" value={newSTax || ''} onChange={e => setNewSTax(Number(e.target.value))} className="h-7 text-xs bg-white dark:bg-slate-950 border-amber-200 focus:border-amber-400 rounded-sm text-right" />
                </td>}
                {selectedColumns['P Tax'] && <td className="px-2 py-1 align-middle">
                  <Input type="number" placeholder="0" value={newPTax || ''} onChange={e => setNewPTax(Number(e.target.value))} className="h-7 text-xs bg-white dark:bg-slate-950 border-amber-200 focus:border-amber-400 rounded-sm text-right" />
                </td>}
                {selectedColumns['G Down'] && <td className="px-2 py-1 align-middle">
                  <Input placeholder="GDown" value={newGDown} onChange={e => setNewGDown(e.target.value)} className="h-7 text-xs bg-white dark:bg-slate-950 border-amber-200 focus:border-amber-400 rounded-sm" />
                </td>}
                {selectedColumns['Rack'] && <td className="px-2 py-1 align-middle">
                  <Input placeholder="Rack" value={newRack} onChange={e => setNewRack(e.target.value)} className="h-7 text-xs bg-white dark:bg-slate-950 border-amber-200 focus:border-amber-400 rounded-sm" />
                </td>}
                {selectedColumns['Def Qty'] && <td className="px-2 py-1 align-middle">
                  <Input type="number" placeholder="0" value={newDefQty || ''} onChange={e => setNewDefQty(Number(e.target.value))} className="h-7 text-xs bg-white dark:bg-slate-950 border-amber-200 focus:border-amber-400 rounded-sm text-right" />
                </td>}
                {selectedColumns['Part No'] && <td className="px-2 py-1 align-middle">
                  <Input placeholder="PartNo" value={newPartNo} onChange={e => setNewPartNo(e.target.value)} className="h-7 text-xs bg-white dark:bg-slate-950 border-amber-200 focus:border-amber-400 rounded-sm" />
                </td>}
                {selectedColumns['HSNCode'] && <td className="px-2 py-1 align-middle">
                  <Input placeholder="HSNCode" value={newHsnCode} onChange={e => setNewHsnCode(e.target.value)} className="h-7 text-xs bg-white dark:bg-slate-950 border-amber-200 focus:border-amber-400 rounded-sm" />
                </td>}
                {selectedColumns['Category_plus'] && <td className="px-2 py-1 align-middle">
                  <Input placeholder="Cat+" value={newCategory} onChange={e => setNewCategory(e.target.value)} className="h-7 text-xs bg-white dark:bg-slate-950 border-amber-200 focus:border-amber-400 rounded-sm" />
                </td>}
                {selectedColumns['Subcategory_plus'] && <td className="px-2 py-1 align-middle">
                  <Input placeholder="SubCat+" value={newSubcategory} onChange={e => setNewSubcategory(e.target.value)} className="h-7 text-xs bg-white dark:bg-slate-950 border-amber-200 focus:border-amber-400 rounded-sm" />
                </td>}
                {selectedColumns['Gst_plus'] && <td className="px-2 py-1 align-middle">
                  <Input type="number" placeholder="0" value={newGstPlus || ''} onChange={e => setNewGstPlus(Number(e.target.value))} className="h-7 text-xs bg-white dark:bg-slate-950 border-amber-200 focus:border-amber-400 rounded-sm text-right" />
                </td>}
                {selectedColumns['CGST'] && <td className="px-2 py-1 align-middle">
                  <Input type="number" placeholder="0" value={newCGST || ''} onChange={e => setNewCGST(Number(e.target.value))} className="h-7 text-xs bg-white dark:bg-slate-950 border-amber-200 focus:border-amber-400 rounded-sm text-right" />
                </td>}
                {selectedColumns['SGST'] && <td className="px-2 py-1 align-middle">
                  <Input type="number" placeholder="0" value={newSGST || ''} onChange={e => setNewSGST(Number(e.target.value))} className="h-7 text-xs bg-white dark:bg-slate-950 border-amber-200 focus:border-amber-400 rounded-sm text-right" />
                </td>}
                {selectedColumns['IGST'] && <td className="px-2 py-1 align-middle">
                  <Input type="number" placeholder="0" value={newIGST || ''} onChange={e => setNewIGST(Number(e.target.value))} className="h-7 text-xs bg-white dark:bg-slate-950 border-amber-200 focus:border-amber-400 rounded-sm text-right" />
                </td>}
                {selectedColumns['CESS %'] && <td className="px-2 py-1 align-middle">
                  <Input ref={cessInputRef} type="number" placeholder="0.00" value={newCess || ''} onChange={e => setNewCess(Number(e.target.value))} onKeyDown={e => handleKeyDown(e, stockInputRef)} className="h-7 text-xs bg-white dark:bg-slate-950 border-amber-200 focus:border-amber-400 focus:ring-amber-400 rounded-sm text-right font-mono" />
                </td>}
                {selectedColumns['Opening Stock'] && <td className="px-2 py-1 align-middle">
                  <Input ref={stockInputRef} type="number" placeholder="0" value={newStock || ''} onChange={e => setNewStock(Number(e.target.value))} onKeyDown={e => handleKeyDown(e, barcodeInputRef)} className="h-7 text-xs bg-white dark:bg-slate-950 border-amber-200 focus:border-amber-400 focus:ring-amber-400 rounded-sm text-right font-mono" />
                </td>}
                {selectedColumns['Barcode'] && <td className="px-2 py-1 align-middle">
                  <div className="relative">
                     <Input ref={barcodeInputRef} placeholder="Scan Barcode..." value={newBarcode} onChange={e => setNewBarcode(e.target.value)} onKeyDown={e => handleKeyDown(e, mrpInputRef)} className="h-7 text-xs pl-7 bg-white dark:bg-slate-950 border-amber-200 focus:border-amber-400 focus:ring-amber-400 rounded-sm font-mono" />
                     <ScanLine size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </td>}
                {selectedColumns['MRP'] && <td className="px-2 py-1 align-middle">
                  <Input ref={mrpInputRef} type="number" placeholder="0.00" value={newMrp || ''} onChange={e => setNewMrp(Number(e.target.value))} onKeyDown={e => handleKeyDown(e, priceInputRef)} className="h-7 text-xs bg-white dark:bg-slate-950 border-amber-200 focus:border-amber-400 focus:ring-amber-400 rounded-sm text-right font-mono" />
                </td>}
                {selectedColumns['Sale Price'] && <td className="px-2 py-1 align-middle">
                  <Input ref={priceInputRef} type="number" placeholder="0.00" value={newPrice || ''} onChange={e => setNewPrice(Number(e.target.value))} onKeyDown={e => handleKeyDown(e)} className="h-7 text-xs bg-white dark:bg-slate-950 border-amber-200 focus:border-amber-400 focus:ring-amber-400 rounded-sm text-right font-mono" />
                </td>}
                <td className="px-1 py-1.5 text-center">
                  <Button variant="outline" size="sm" onClick={handleAddProduct} className="h-6 text-[10px] px-2 bg-amber-100 hover:bg-amber-200 text-amber-700 font-bold border-amber-300">
                    Insert
                  </Button>
                </td>
                {selectedColumns['UpdateButtonColumn'] && <td className="px-1 py-1.5 text-center">
                  <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 bg-slate-100 dark:bg-slate-800 text-slate-400 font-bold border-slate-200 dark:border-slate-800 cursor-not-allowed">
                    Update
                  </Button>
                </td>}
                {selectedColumns['Delete ButtonColumn'] && <td className="px-1 py-1.5 text-center">
                  <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 bg-slate-100 dark:bg-slate-800 text-slate-400 font-bold border-slate-200 dark:border-slate-800 cursor-not-allowed">
                    Delete
                  </Button>
                </td>}
                <td className="px-1 py-1.5 text-center">
                  <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 text-slate-400 font-bold border-slate-200 dark:border-slate-800 cursor-not-allowed">
                    Barcode
                  </Button>
                </td>
                {selectedColumns['Print BandaButton'] && <td className="px-1 py-1.5 text-center">
                  <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 bg-slate-100 dark:bg-slate-800 text-slate-400 font-bold border-slate-200 dark:border-slate-800 cursor-not-allowed">
                    Print
                  </Button>
                </td>}
                <td className="px-1 py-1.5 text-center pr-3">
                  <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 text-slate-400 font-bold border-slate-200 dark:border-slate-800 cursor-not-allowed">
                    Variant
                  </Button>
                </td>
              </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ==========================================
// 4. Purchase & Ledger
// ==========================================
function LedgerView() {
  const { currentTenantId, user } = useAuth();
  const [walletId, setWalletId] = useState<string | null>(null);
  const [deliveryFundWalletId, setDeliveryFundWalletId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'cash' | 'delivery'>('cash');
  const [loading, setLoading] = useState(false);
  
  // Test Form State
  const [amount, setAmount] = useState('1000');
  const [txType, setTxType] = useState('credit');
  const [description, setDescription] = useState('Manual Entry');
  
  const [refreshKey, setRefreshKey] = useState(0);
  // Verification state
  const [verifyResult, setVerifyResult] = useState<any>(null);

  useEffect(() => {
    const initTestWallet = async () => {
      const supabase = getSupabaseClient();
      if (!supabase || !currentTenantId || !user) return;
      
      // Try to find existing test wallet
      const { data: existing } = await supabase
        .from('wallet_accounts')
        .select('id')
        .eq('tenant_id', currentTenantId)
        .eq('owner_type', 'tenant_cash')
        .limit(1)
        .single();
        
      if (existing) {
        setWalletId(existing.id);
      } else {
        // Create one for testing
        const { data: newWallet, error } = await supabase
          .from('wallet_accounts')
          .insert({
            tenant_id: currentTenantId,
            owner_type: 'tenant_cash',
            owner_id: currentTenantId,
            account_label: 'Main Cash Book (Test)'
          })
          .select('id')
          .single();
          
        if (newWallet) {
          setWalletId(newWallet.id);
        } else {
           console.error("Failed to create test wallet", error);
        }
      }
      
      // Fetch or create delivery fund wallet
      const { data: dfId } = await supabase.rpc('get_or_create_delivery_fund', { p_tenant_id: currentTenantId });
      if (dfId) {
         setDeliveryFundWalletId(dfId);
      }
    };
    initTestWallet();
  }, [currentTenantId, user]);

  const handleRechargeDeliveryFund = async () => {
    if (!deliveryFundWalletId || !user || !currentTenantId) return;
    const amountToRecharge = prompt("Enter amount to recharge Delivery Fund from Cash Wallet (₹):", "500");
    if (!amountToRecharge || isNaN(Number(amountToRecharge))) return;
    
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { data, error } = await supabase.rpc('recharge_delivery_fund', {
        p_tenant_id: currentTenantId,
        p_amount: parseFloat(amountToRecharge),
        p_created_by: user.id
      });
      if (error) throw error;
      toast.success(`Successfully recharged delivery fund with ₹${amountToRecharge}`);
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      toast.error(err.message || 'Recharge failed');
    } finally {
      setLoading(false);
    }
  };

  const handleTransaction = async () => {
    if (!walletId) return;
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { data, error } = await supabase.rpc('post_ledger_transaction', {
        p_wallet_account_id: walletId,
        p_type: txType,
        p_amount: parseFloat(amount),
        p_reference_type: 'manual_adjustment',
        p_reference_id: null,
        p_description: description,
        p_created_by: user?.id
      });
      if (error) throw error;
      toast.success(`Transaction successful`);
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      toast.error(err.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  const verifyBalance = async () => {
    if (!walletId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    
    try {
      const { data, error } = await supabase.rpc('verify_wallet_balance', {
        p_wallet_account_id: walletId
      });
      if (error) throw error;
      setVerifyResult(data);
      if (data.is_match) {
        toast.success("Balance matches ledger correctly!");
      } else {
        toast.error("Balance mismatch detected!");
      }
    } catch (err: any) {
      toast.error(err.message || 'Verification failed');
    }
  };

  if (!walletId) {
    return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Initializing test wallet... Please ensure schema is applied in Supabase.</div>;
  }

  return (
    <div key={refreshKey} className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Cash & Bank Ledger</h2>
        <p className="text-slate-500 dark:text-slate-400">Central Wallet & Ledger Engine</p>
      </div>

      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'cash' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('cash')}
        >
          Main Cash Book
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'delivery' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('delivery')}
        >
          Rider Delivery Fund
        </button>
      </div>

      {activeTab === 'cash' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
        <div className="lg:col-span-1 space-y-6">
          <WalletBalanceCard walletId={walletId} onRefresh={() => setRefreshKey(k=>k+1)} />
          
          <Card className="shadow-sm border-none bg-white dark:bg-slate-950">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-lg">Add Manual Entry</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select value={txType} onValueChange={setTxType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Credit (Add Funds)</SelectItem>
                    <SelectItem value="debit">Debit (Remove Funds)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount</label>
                <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} min="1" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input value={description} onChange={e => setDescription(e.target.value)} />
              </div>
              <Button className="w-full" onClick={handleTransaction} disabled={loading}>
                {loading ? 'Processing...' : 'Post Transaction'}
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-none bg-white dark:bg-slate-950">
             <CardHeader className="border-b pb-4">
                <CardTitle className="text-lg">Engine Tests</CardTitle>
             </CardHeader>
             <CardContent className="p-6 space-y-4">
                <Button variant="outline" className="w-full" onClick={verifyBalance}>
                  Run Balance Verification (RPC)
                </Button>
                {verifyResult && (
                  <div className={`p-4 rounded-lg text-sm font-mono ${verifyResult.is_match ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                    <p>Stored: {verifyResult.stored_balance}</p>
                    <p>Calculated: {verifyResult.calculated_balance}</p>
                    <p>Match: {verifyResult.is_match ? 'Yes' : 'NO'}</p>
                  </div>
                )}
             </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-2">
          <WithdrawalHistoryList walletId={walletId} />
          <LedgerHistoryTable walletId={walletId} />
        </div>
      </div>
      )}

      {activeTab === 'delivery' && deliveryFundWalletId && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
        <div className="lg:col-span-1 space-y-6">
          <WalletBalanceCard walletId={deliveryFundWalletId} onRefresh={() => setRefreshKey(k=>k+1)} />
          <Card className="shadow-sm border-none bg-white dark:bg-slate-950">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-lg">Recharge Fund</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <p className="text-sm text-slate-500">
                Move funds from your Main Cash Book to your Rider Delivery Fund. This fund is used to automatically pay delivery riders when they complete jobs for your store.
              </p>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={handleRechargeDeliveryFund} disabled={loading}>
                {loading ? 'Processing...' : 'Recharge from Cash Wallet'}
              </Button>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <LedgerHistoryTable walletId={deliveryFundWalletId} />
        </div>
      </div>
      )}

      {activeTab === 'delivery' && !deliveryFundWalletId && (
         <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading delivery fund details...</div>
      )}
    </div>
  );
}

// ==========================================
// 5. CRM & Payroll
// ==========================================
function CRMView() {
  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">CRM & Payroll (HR)</h2>
        <p className="text-slate-500 dark:text-slate-400">Manage customer loyalty and staff attendance.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border-none">
          <CardHeader className="border-b">
             <CardTitle>Customer Loyalty Engine</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
             <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
               <div>
                 <p className="font-bold text-slate-800 dark:text-slate-200">1 Point per ₹100 spent</p>
                 <p className="text-sm text-slate-500 dark:text-slate-400">Global rule active</p>
               </div>
               <Button variant="outline">Edit Rule</Button>
             </div>
             <div className="flex items-center justify-between p-4 border rounded-lg border-primary/20 bg-primary/5">
               <div>
                 <p className="font-bold text-primary">Buy 2 Get 1 Free (Snacks)</p>
                 <p className="text-sm text-slate-600 dark:text-slate-400">Active until Weekend</p>
               </div>
               <Button variant="default" className="bg-primary">Manage</Button>
             </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-none">
          <CardHeader className="border-b">
             <CardTitle>Staff Attendance & Payroll</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             <div className="p-4 border-b bg-slate-50 dark:bg-slate-900">
               <Button className="w-full bg-slate-800 hover:bg-slate-900"><Scan size={16} className="mr-2"/> Scan Staff QR for Attendance</Button>
              </div>
           </CardContent>
         </Card>
       </div>
     </div>
   );
}





export function UniversalMerchantWalletView() {
  const { currentTenantId, user } = useAuth();
  const [walletId, setWalletId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const [activeWalletTab, setActiveWalletTab] = useState<'recharge' | 'withdraw' | 'send'>('recharge');
  const [sendForm, setSendForm] = useState({ phone: '', amount: '', note: '' });
  const [sendLoading, setSendLoading] = useState(false);
  const [recipientIdentifier, setRecipientIdentifier] = useState('');
  const [verifiedRecipient, setVerifiedRecipient] = useState<{full_name: string, phone: string, is_business: boolean, business_name: string | null} | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', name: '', account: '', ifsc: '' });
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [platformSettings, setPlatformSettings] = useState<any>(null);

  const handleSendMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletId || !user) return;
    const amount = parseFloat(sendForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Invalid amount");
      return;
    }
    if (!sendForm.phone) {
      toast.error("Please enter a phone number");
      return;
    }
    setSendLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
       const { data, error } = await supabase.rpc('transfer_wallet_to_phone', {
           p_from_wallet_id: walletId,
           p_amount: amount,
           p_to_phone: sendForm.phone,
           p_description: sendForm.note || 'Wallet Transfer'
       });
       if (error) throw error;
       toast.success(`Successfully sent ₹${amount} to ${data.recipient_name || 'recipient'}`);
       setSendForm({ phone: '', amount: '', note: '' });
       setVerifiedRecipient(null);
       setRecipientIdentifier('');
       setRefreshKey(k => k + 1);
    } catch (err: any) {
       toast.error(err.message || 'Transfer failed');
    } finally {
       setSendLoading(false);
    }
  };
  const handleVerifyRecipient = async () => {
    if (!recipientIdentifier.trim()) {
      toast.error('Enter phone or email');
      return;
    }
    setVerifyLoading(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data, error } = await supabase.rpc('lookup_wallet_recipient', {
        p_identifier: recipientIdentifier.trim()
      });
      if (error) throw error;
      const recipient = Array.isArray(data) ? data[0] : data;
      if (!recipient) throw new Error('Recipient not found');
      setVerifiedRecipient(recipient);
      setSendForm(prev => ({ ...prev, phone: recipient.phone }));
    } catch (err: any) {
      toast.error(err.message || 'Could not verify recipient');
      setVerifiedRecipient(null);
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleChangeRecipient = () => {
    setVerifiedRecipient(null);
    setRecipientIdentifier('');
    setSendForm(prev => ({ ...prev, phone: '' }));
  };


  const handleWithdrawRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletId || !user || !currentTenantId) return;
    const amount = parseFloat(withdrawForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Invalid amount");
      return;
    }
    if (!withdrawForm.name || !withdrawForm.account || !withdrawForm.ifsc) {
      toast.error("Please fill all bank details");
      return;
    }

    setWithdrawLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
       const { error } = await supabase.rpc('request_withdrawal', {
           p_wallet_id: walletId,
           p_amount: amount,
           p_account_holder_name: withdrawForm.name,
           p_bank_account_number: withdrawForm.account,
           p_bank_ifsc: withdrawForm.ifsc,
           p_requester_type: 'merchant'
       });
       if (error) throw error;
       toast.success("Withdrawal request submitted successfully");
       setActiveWalletTab('recharge');
       setWithdrawForm({ amount: '', name: '', account: '', ifsc: '' });
       setRefreshKey(k => k + 1);
    } catch(err: any) {
       toast.error(err.message || 'Withdrawal request failed');
    } finally {
       setWithdrawLoading(false);
    }
  };
  
  useEffect(() => {
    const fetchSettings = async () => {
        const supabase = getSupabaseClient();
        if(!supabase) return;
        const { data } = await supabase.from('platform_settings').select('*');
        if(data) {
            const settingsMap = data.reduce((acc: any, curr: any) => {
                acc[curr.setting_key] = curr.setting_value;
                return acc;
            }, {});
            setPlatformSettings(settingsMap);
        }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    const initWallet = async () => {
      const supabase = getSupabaseClient();
      if (!supabase || !currentTenantId || !user) return;
      
      try {
        let { data: tbId, error: tbError } = await supabase.rpc('get_or_create_tenant_bank_wallet', { p_tenant_id: currentTenantId });
        if (tbError) {
          const { data: existing } = await supabase.from('wallet_accounts').select('id').eq('tenant_id', currentTenantId).eq('owner_type', 'tenant_bank').single();
          if (existing) {
             tbId = existing.id;
          } else {
             const { data: newWallet, error: insertErr } = await supabase.from('wallet_accounts').insert({
               tenant_id: currentTenantId, owner_type: 'tenant_bank', owner_id: currentTenantId, account_label: 'Business Wallet'
             }).select('id').single();
             if (insertErr) throw new Error(insertErr.message);
             tbId = newWallet.id;
          }
        }
        if (tbId) setWalletId(tbId);
      } catch (err: any) {
        console.error("Failed to init merchant wallet", err);
      }
    };
    initWallet();
  }, [currentTenantId, user]);

  const handleRecharge = async () => {
    if (!walletId || !user || !currentTenantId) return;
    const amountStr = prompt("Enter amount to recharge Business Wallet (₹):", "1000");
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) return;
    
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/create-wallet-recharge-order', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token || ''}`
          },
          body: JSON.stringify({
              amount: amount,
              wallet_owner_context: 'merchant',
              tenant_id: currentTenantId
          })
      });

      if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to create Razorpay order');
      }
      
      const orderData = await response.json();
      
      const options = {
          key: orderData.razorpay_key_id,
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'BahiBox',
          description: `Wallet Recharge (Business Wallet)`,
          order_id: orderData.razorpay_order_id,
          handler: async function (response: any) {
              const { error } = await supabase.rpc('capture_payment', {
                  p_payment_order_id: orderData.payment_order_id,
                  p_razorpay_payment_id: response.razorpay_payment_id,
                  p_method: 'razorpay',
                  p_gateway_fee: 0,
                  p_raw_response: response
              });
              
              if (error) {
                  toast.error(error.message || 'Payment capture failed');
              } else {
                  toast.success(`Successfully recharged ₹${amount}`);
                  setRefreshKey(k => k + 1);
              }
          },
          prefill: {
              name: user.full_name || '',
              email: user.email || '',
              contact: user.phone || ''
          },
          theme: {
              color: '#3b82f6'
          }
      };

      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        toast.error('Failed to load payment gateway');
        return;
      }
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
          toast.error(response.error.description || 'Payment failed');
      });
      rzp.open();

    } catch (err: any) {
      toast.error(err.message || 'Recharge failed');
    } finally {
      setLoading(false);
    }
  };

  if (!walletId) {
    return <div className="p-8 text-center text-slate-500">Loading wallet...</div>;
  }

  return (
    <div key={refreshKey} className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Universal Business Wallet</h2>
        <p className="text-slate-500 dark:text-slate-400">Manage your central BahiBox business balance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <WalletBalanceCard walletId={walletId} onRefresh={() => setRefreshKey(k=>k+1)} />
          
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full max-w-sm mx-auto lg:max-w-none">
            <button
              onClick={() => setActiveWalletTab('recharge')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${activeWalletTab === 'recharge' ? 'bg-white dark:bg-slate-900 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
            >
              Recharge
            </button>
            <button
              onClick={() => setActiveWalletTab('withdraw')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${activeWalletTab === 'withdraw' ? 'bg-white dark:bg-slate-900 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
            >
              Withdraw
            </button>
            <button
              onClick={() => setActiveWalletTab('send')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${activeWalletTab === 'send' ? 'bg-white dark:bg-slate-900 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
            >
              Send Money
            </button>
          </div>

          {activeWalletTab === 'recharge' && (
            <Card className="shadow-sm border-none bg-white dark:bg-slate-950">
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-lg">Recharge Wallet</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <p className="text-sm text-slate-500">
                  Add funds to your business wallet using Razorpay. These funds can be used for platform services, delivery funds, or external payouts.
                </p>
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={handleRecharge} disabled={loading}>
                  {loading ? 'Processing...' : 'Add Amount'}
                </Button>
              </CardContent>
            </Card>
          )}
          {activeWalletTab === 'withdraw' && (
            <Card className="shadow-sm border-none bg-white dark:bg-slate-950">
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-lg">Withdraw Funds</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleWithdrawRequest} className="space-y-4">
                  <div>
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Amount (₹)</label>
                    <Input type="number" required min="1" value={withdrawForm.amount} onChange={e => setWithdrawForm({...withdrawForm, amount: e.target.value})} placeholder="e.g. 5000" />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Account Holder Name</label>
                    <Input required value={withdrawForm.name} onChange={e => setWithdrawForm({...withdrawForm, name: e.target.value})} placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Bank Account Number</label>
                    <Input required value={withdrawForm.account} onChange={e => setWithdrawForm({...withdrawForm, account: e.target.value})} placeholder="Account Number" />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Bank IFSC Code</label>
                    <Input required value={withdrawForm.ifsc} onChange={e => setWithdrawForm({...withdrawForm, ifsc: e.target.value})} placeholder="e.g. HDFC0001234" />
                  </div>
                  
                  {platformSettings && (
                    <div className="space-y-2">
                        <p className="text-xs text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                            Withdraw between ₹{platformSettings.withdrawal_min_amount || 100} and ₹{platformSettings.withdrawal_max_amount || 50000}. A {platformSettings.withdrawal_charge_percent || 0}% platform charge applies. Funds typically settle within {platformSettings.withdrawal_settlement_days || 4} working days.
                        </p>
                        {parseFloat(withdrawForm.amount || '0') > 0 && (
                            <div className="text-sm p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                                <div className="flex justify-between text-slate-600 dark:text-slate-400 mb-1">
                                    <span>You'll receive:</span>
                                    <span className="font-medium text-slate-900 dark:text-white">₹{parseFloat(withdrawForm.amount).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-slate-600 dark:text-slate-400 mb-1">
                                    <span>Charge ({platformSettings.withdrawal_charge_percent || 0}%):</span>
                                    <span className="font-medium text-slate-900 dark:text-white">₹{(parseFloat(withdrawForm.amount) * (parseFloat(platformSettings.withdrawal_charge_percent) || 0) / 100).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between font-bold border-t border-slate-200 dark:border-slate-800 pt-1 mt-1">
                                    <span className="text-slate-900 dark:text-white">Total deducted from wallet:</span>
                                    <span className="text-slate-900 dark:text-white">₹{(parseFloat(withdrawForm.amount) * (1 + (parseFloat(platformSettings.withdrawal_charge_percent) || 0) / 100)).toFixed(2)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                  )}
                  <Button type="submit" className="w-full" disabled={withdrawLoading}>
                    {withdrawLoading ? 'Submitting...' : 'Request Withdrawal'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {activeWalletTab === 'send' && (
            <Card className="shadow-sm border-none bg-white dark:bg-slate-950">
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-lg">Send Money</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {!verifiedRecipient ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Recipient Phone or Email</label>
                      <Input
                        value={recipientIdentifier}
                        onChange={e => setRecipientIdentifier(e.target.value)}
                        placeholder="e.g. 9876543210 or name@email.com"
                      />
                    </div>
                    <Button className="w-full" onClick={handleVerifyRecipient} disabled={verifyLoading}>
                      {verifyLoading ? 'Verifying...' : 'Verify Recipient'}
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSendMoney} className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <div>
                        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase">Sending to</p>
                        <p className="font-bold text-slate-900 dark:text-white">
                          {verifiedRecipient.is_business ? verifiedRecipient.business_name : verifiedRecipient.full_name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{verifiedRecipient.phone}</p>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={handleChangeRecipient}>Change</Button>
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Amount (₹)</label>
                      <Input type="number" required min="1" value={sendForm.amount} onChange={e => setSendForm({...sendForm, amount: e.target.value})} placeholder="e.g. 500" />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Note (optional)</label>
                      <Input value={sendForm.note} onChange={e => setSendForm({...sendForm, note: e.target.value})} placeholder="What's this for?" />
                    </div>
                    <Button type="submit" className="w-full" disabled={sendLoading}>
                      {sendLoading ? 'Sending...' : `Send ₹${sendForm.amount || '0'}`}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          )}
        </div>
        
        <div className="lg:col-span-2">
          <WithdrawalHistoryList walletId={walletId} />
          <LedgerHistoryTable walletId={walletId} />
        </div>
      </div>
    </div>
  );
}
