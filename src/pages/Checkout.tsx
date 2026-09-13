import { loadRazorpayScript } from '@/src/lib/utils';
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { getSupabaseClient } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getOfficialModuleName } from '../data';
import { usePlans } from '../hooks/usePlans';
import { ChevronDown } from 'lucide-react';



const getBusinessTypeFromModule = (moduleName: string) => {
  const map: Record<string, string> = {
    'Retail POS': 'retail',
    'Manufacturing ERP': 'manufacturing',
    'Hotel/Restaurant': 'hospitality',
    'Health Care': 'healthcare',
    'Education': 'education',
    'Transport Management': 'logistics',
    'Agri Management': 'agri',
    'Daily Services': 'services'
  };
  return map[moduleName] || 'retail';
};

export default function Checkout() {
  useDocumentTitle('BahiBox | Checkout');
  const navigate = useNavigate();
  const { user, currentTenantId } = useAuth();
  const [searchParams] = useSearchParams();
  const moduleName = searchParams.get('module') || 'General';
  const plan = searchParams.get('plan') || 'Free';
  const initialCycle = searchParams.get('cycle') || 'monthly';
  const [selectedCycle, setSelectedCycle] = useState(initialCycle);
  const { plans, loading: plansLoading } = usePlans();
  const matchedPlan = plans.find(p => p.id === plan) || plans.find(p => p.name === plan && p.moduleName === moduleName);
  const displayPlanName = matchedPlan ? matchedPlan.name : plan;

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    businessName: '',
    address: '',
    password: '',
    confirmPassword: ''
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [actualPrice, setActualPrice] = useState(0);
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [isExistingMerchant, setIsExistingMerchant] = useState(false);
  const [existingMerchantId, setExistingMerchantId] = useState<string | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [accountCreatedEmail, setAccountCreatedEmail] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
        setIsExistingMerchant(true);
        setExistingMerchantId(user.id);
        setFormData(prev => ({
            ...prev,
            email: user.email || prev.email,
        }));
        
        
        const fetchMerchantData = async () => {
            const supabase = getSupabaseClient();
            if (supabase) {
                // Fetch user data
                const { data: userData } = await supabase.from('users').select('full_name, phone').eq('id', user.id).single();
                if (userData) {
                    setFormData(prev => ({
                        ...prev,
                        name: userData.full_name || prev.name,
                        phone: userData.phone || prev.phone,
                    }));
                }
                
                // Fetch tenant data if available
                if (currentTenantId) {
                   const { data: tenantData } = await supabase.from('tenants').select('business_name').eq('id', currentTenantId).single();
                   if (tenantData) {
                       setFormData(prev => ({
                           ...prev,
                           businessName: tenantData.business_name || prev.businessName
                       }));
                   }
                   
                   const { data: branchData } = await supabase.from('branches').select('address').eq('tenant_id', currentTenantId).eq('is_main_branch', true).maybeSingle();
                   if (branchData) {
                       setFormData(prev => ({
                           ...prev,
                           address: branchData.address || prev.address
                       }));
                   }
                }
            }
        };

        fetchMerchantData();
    }
  }, [user, currentTenantId]);

  const handleEmailBlur = async () => {
      if (!formData.email || user) return;
      setIsCheckingEmail(true);
      setDuplicateWarning('');
      const supabase = getSupabaseClient();
      if (supabase) {
          const { data: userData, error } = await supabase.from('users').select('id, full_name, phone').eq('email', formData.email.toLowerCase()).maybeSingle();
          if (userData && !error) {
              setIsExistingMerchant(true);
              setExistingMerchantId(userData.id);
              
              setFormData(prev => ({
                 ...prev,
                 name: userData.full_name || prev.name,
                 phone: userData.phone || prev.phone,
              }));

              // try to fetch tenant details
              const { data: roles } = await supabase.from('user_tenant_roles').select('tenant_id').eq('user_id', userData.id).eq('role_name', 'owner');
              if (roles && roles.length > 0) {
                 const tId = roles[0].tenant_id;
                 const { data: tenantData } = await supabase.from('tenants').select('business_name').eq('id', tId).maybeSingle();
                 if (tenantData) {
                    setFormData(prev => ({ ...prev, businessName: tenantData.business_name || prev.businessName }));
                 }
                 const { data: branchData } = await supabase.from('branches').select('address').eq('tenant_id', tId).eq('is_main_branch', true).maybeSingle();
                 if (branchData) {
                    setFormData(prev => ({ ...prev, address: branchData.address || prev.address }));
                 }
                 
                 // Check for duplicate subscription
                 const { data: subData } = await supabase.from('subscriptions')
                    .select('status')
                    .eq('tenant_id', tId)
                    .eq('plan_id', matchedPlan?.id)
                    .eq('status', 'active')
                    .maybeSingle();
                    
                 if (subData) {
                    setDuplicateWarning('This plan is already active for this Email ID.');
                    setHasActiveSubscription(true);
                 } else {
                    setHasActiveSubscription(false);
                 }
              }
          } else {
              setIsExistingMerchant(false);
              setExistingMerchantId(null);
              setHasActiveSubscription(false);
          }
      }
      setIsCheckingEmail(false);
  };

  useEffect(() => {
    const checkDuplicateAndPricing = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      
      let basePrice = 0;
      if (matchedPlan) {
          if (selectedCycle === 'yearly') basePrice = matchedPlan.priceYearly || (matchedPlan.priceMonthly * 12);
          else if (selectedCycle === 'two_years') basePrice = (matchedPlan.priceYearly ? matchedPlan.priceYearly * 2 : matchedPlan.priceMonthly * 24);
          else basePrice = matchedPlan.priceMonthly;
      } else {
          // Fallbacks if not found
          if (plan === 'Free' || displayPlanName === 'Free') basePrice = 0;
          else if (plan === 'Pro' || displayPlanName === 'Pro' || displayPlanName === 'Premium') basePrice = 999;
          else if (displayPlanName === 'Custom') basePrice = 0;
      }
      setActualPrice(basePrice);
      
      if (user) {
         const { data: subData } = await supabase.from('merchant_subscriptions')
           .select('status, plan_id, plan_type')
           .eq('merchant_id', user.id)
           .eq('module_id', moduleName)
           .eq('status', 'Active')
           .single();
         if (subData) {
            if (matchedPlan && subData.plan_id === matchedPlan.id) {
               setHasActiveSubscription(true);
            } else if (!matchedPlan && (subData.plan_id === plan || subData.plan_type === plan)) {
               setHasActiveSubscription(true);
            } else {
               setHasActiveSubscription(false);
            }
         } else {
            setHasActiveSubscription(false);
         }
      }
    };
    checkDuplicateAndPricing();
  }, [moduleName, plan, user, matchedPlan, selectedCycle, displayPlanName]);

  const applyPromo = async () => {
    if (!promoCode) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { data: coupon, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', promoCode.toUpperCase())
      .eq('is_active', true)
      .maybeSingle();

    if (error || !coupon) {
      alert("Invalid or inactive promo code.");
      setPromoDiscount(0);
      return;
    }

    const modName = getOfficialModuleName(moduleName, moduleName);
    const moduleMatch = coupon.applicable_module === 'All' || coupon.applicable_module === modName || coupon.applicable_module === moduleName;
    const planMatch = coupon.applicable_plan === 'All' || coupon.applicable_plan === plan;

    if (!moduleMatch || !planMatch) {
      alert("This promo code is not applicable to the selected plan or module.");
      setPromoDiscount(0);
      return;
    }

    const discountType = coupon.discount_type || (coupon.discount_percentage ? 'percentage' : 'fixed');
    const discountValue = coupon.discount_value ?? coupon.discount_percentage ?? coupon.fixed_discount ?? 0;

    if (discountType === 'fixed') {
      setPromoDiscount(Number(discountValue));
    } else {
      setPromoDiscount((actualPrice * Number(discountValue)) / 100);
    }
    alert("Promo code applied! (Final price is securely re-verified at checkout.)");
  };
  const getPrice = () => {
    return Math.max(0, actualPrice - promoDiscount);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasActiveSubscription) {
      alert("You already have an active subscription for this module.");
      return;
    }

    setIsProcessing(true);
    
    try {
      const finalAmount = getPrice();
      const supabase = getSupabaseClient();
      let currentUserId = user?.id || existingMerchantId;
      
      let isNewUser = false;
      if (!currentUserId && !isExistingMerchant) {
        // FREE plan (or plan explicitly named 'Free'): unchanged behavior —
        // create account immediately, no payment needed.
        if (finalAmount === 0 || plan === 'Free') {
          const inviteResponse = await fetch('/api/invite-merchant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: formData.email,
              full_name: formData.name,
              business_name: formData.businessName,
              phone: formData.phone,
              address: formData.address,
              module_name: moduleName
            })
          });

          const inviteResult = await inviteResponse.json();

          if (!inviteResponse.ok) {
            alert(inviteResult.error || 'Could not complete checkout.');
            setIsProcessing(false);
            if (inviteResult.error?.includes('already')) {
              navigate('/login');
            }
            return;
          }

          setAccountCreatedEmail(formData.email);
          setIsProcessing(false);
          return;
        }

        // PAID plan, new user: open Razorpay FIRST. Account is created
        // only after payment is confirmed, via the webhook.
        const { data: matchedPlans } = await supabase.from('subscription_plans').select('id').eq('module_name', moduleName).eq('name', plan);
        const planId = matchedPlans && matchedPlans.length > 0 ? matchedPlans[0].id : null;

        const isLoaded = await loadRazorpayScript();
        if (!isLoaded) {
          alert('Failed to load Razorpay SDK.');
          setIsProcessing(false);
          return;
        }

        const signupOrderResponse = await fetch('/api/create-signup-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            full_name: formData.name,
            business_name: formData.businessName,
            phone: formData.phone,
            address: formData.address,
            module_name: moduleName,
            plan_id: planId || plan,
            billing_cycle: selectedCycle,
            promo_code: promoDiscount > 0 ? promoCode.toUpperCase() : undefined
          })
        });

        if (!signupOrderResponse.ok) {
          const errData = await signupOrderResponse.json().catch(() => ({}));
          alert(errData.error || 'Could not start payment. Please try again.');
          setIsProcessing(false);
          if (errData.error?.includes('already')) {
            navigate('/login');
          }
          return;
        }

        const signupOrderData = await signupOrderResponse.json();

        const signupOptions = {
          key: signupOrderData.razorpay_key_id,
          amount: signupOrderData.amount,
          currency: signupOrderData.currency,
          name: 'BahiBox',
          description: `Subscription for ${displayPlanName}`,
          order_id: signupOrderData.razorpay_order_id,
          handler: function () {
            setAccountCreatedEmail(formData.email);
            setIsProcessing(false);
          },
          prefill: {
            name: formData.name,
            email: formData.email,
            contact: formData.phone
          },
          theme: {
            color: '#0f172a'
          }
        };

        const signupRzp = new (window as any).Razorpay(signupOptions);
        signupRzp.on('payment.failed', function () {
          alert('Payment failed. Please try again.');
          setIsProcessing(false);
        });
        signupRzp.open();
        setIsProcessing(false);
        return;
      }

      if (currentUserId) {
            await supabase.from('users').update({
                full_name: formData.name,
                phone: formData.phone
            }).eq('id', currentUserId);
            
            const { data: roles } = await supabase.from('user_tenant_roles').select('tenant_id').eq('user_id', currentUserId).eq('role_name', 'owner');
            if (roles && roles.length > 0) {
                const tId = roles[0].tenant_id;
                if (formData.businessName) await supabase.from('tenants').update({ business_name: formData.businessName }).eq('id', tId);
                const { data: branches } = await supabase.from('branches').select('id').eq('tenant_id', tId).eq('is_main_branch', true);
                if (branches && branches.length > 0) {
                    if (formData.address) await supabase.from('branches').update({ address: formData.address }).eq('id', branches[0].id);
                }
            }
        }
      
      let resolvedTenantId = currentTenantId;
      if (!resolvedTenantId && currentUserId) {
        const { data: roles } = await supabase.from('user_tenant_roles').select('tenant_id').eq('user_id', currentUserId).eq('role_name', 'owner');
        if (roles && roles.length > 0) {
            resolvedTenantId = roles[0].tenant_id;
        }
      }
      if (supabase) {
         if (!currentUserId) {
            alert("Please create a password or login to activate this module.");
            setIsProcessing(false);
            return;
         }
         
         // Fetch matching plan ID for razorpay
         const { data: matchedPlans } = await supabase.from('subscription_plans').select('id').eq('module_name', moduleName).eq('name', plan);
         const planId = matchedPlans && matchedPlans.length > 0 ? matchedPlans[0].id : null;

         if (finalAmount === 0 || plan === 'Free') {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('/api/activate-free-plan', {
               method: 'POST',
               headers: {
                 'Content-Type': 'application/json',
                 'Authorization': `Bearer ${session?.access_token || ''}`
               },
               body: JSON.stringify({
                 plan_id: planId || plan,
                 tenant_id: resolvedTenantId,
                 promo_code: promoDiscount > 0 ? promoCode.toUpperCase() : undefined
               })
            });
      
            if (!response.ok) {
               const errData = await response.json().catch(() => ({}));
               console.error("Free-plan activation failed:", errData);
               alert('Failed to activate plan: ' + (errData.error || 'Unknown error. Please try again or contact support.'));
               setIsProcessing(false);
               return;
            }
            alert('Subscription Activated Successfully!');
            navigate('/merchant-dashboard', { state: { module: moduleName } });
            return;
         }
            
         const isLoaded = await loadRazorpayScript();
         if (!isLoaded) {
            alert('Failed to load Razorpay SDK.');
            setIsProcessing(false);
            return;
         }

         const { data: { session } } = await supabase.auth.getSession();
         const response = await fetch('/api/create-razorpay-order', {
             method: 'POST',
             headers: {
                 'Content-Type': 'application/json',
                 'Authorization': `Bearer ${session?.access_token || ''}`
             },
             body: JSON.stringify({
                 plan_id: planId || plan,
                 billing_cycle: selectedCycle,
                 tenant_id: resolvedTenantId,
                 branch_id: null,
                 promo_code: promoDiscount > 0 ? promoCode.toUpperCase() : undefined
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
             description: `Subscription for ${displayPlanName}`,
             order_id: orderData.razorpay_order_id,
             handler: async function (response: any) {
                 // Capture payment via RPC
                 const { error } = await supabase.rpc('capture_payment', {
                     p_payment_order_id: orderData.payment_order_id,
                     p_razorpay_payment_id: response.razorpay_payment_id,
                     p_method: 'razorpay',
                     p_gateway_fee: 0,
                     p_raw_response: response
                 });
                 if (error) {
                     console.warn("Error capturing payment", error);
                 }
                 
                 alert('Payment successful! Your plan has been upgraded.');
                 navigate('/merchant-dashboard', { state: { module: moduleName } });
             },
             prefill: {
                 name: formData.name,
                 email: formData.email,
                 contact: formData.phone
             },
             theme: {
                 color: '#0f172a'
             }
         };
         
         const rzp = new (window as any).Razorpay(options);
         rzp.on('payment.failed', function (response: any) {
             alert('Payment failed. Please try again.');
         });
         rzp.open();
         
         setIsProcessing(false);
         return;
      }
      
    } catch (error: any) {
      console.warn("Error during checkout process:", error);
      alert(error.message || "There was an error processing your request. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    accountCreatedEmail ? (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">Account Created!</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-1">We've sent a link to</p>
          <p className="font-semibold text-slate-900 dark:text-slate-100 mb-4">{accountCreatedEmail}</p>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">Please check your inbox to set your password and log in. Once logged in, come back here to complete your subscription.</p>
          <button
            onClick={() => navigate('/')}
            className="w-full h-11 bg-primary text-white rounded-xl font-bold hover:opacity-90 transition-opacity"
          >
            Go to Home
          </button>
        </div>
      </div>
    ) : (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-200 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-4xl flex items-center gap-3 mb-8 cursor-pointer" onClick={() => navigate('/')}>
        <img src="/logolight.png" alt="BahiBox Logo" className="h-24 md:h-32 dark:hidden object-contain" />
        <img src="/logodark.png" alt="BahiBox Logo" className="h-24 md:h-32 hidden dark:block object-contain" />
        <span className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 ml-2">Checkout</span>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Form Section */}
        <Card>
          <CardHeader>
            <CardTitle>Billing Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCheckout} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Business Name</label>
                <Input 
                  required 
                  placeholder="Sharma General Store" 
                  value={formData.businessName}
                  onChange={e => setFormData({...formData, businessName: e.target.value})}
                  disabled={isExistingMerchant}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name</label>
                <Input 
                  required 
                  placeholder="Rahul Kumar" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  disabled={isExistingMerchant}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone Number</label>
                <Input 
                  required 
                  placeholder="+91 XXXXX XXXXX" 
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  disabled={isExistingMerchant}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Address</label>
                <Input 
                  required 
                  placeholder="123 Main Street" 
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  disabled={isExistingMerchant}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email Address</label>
                <div className="relative">
                  <Input 
                    required 
                    type="email"
                    placeholder="rahul@example.com" 
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    onBlur={handleEmailBlur}
                    disabled={!!user || isCheckingEmail}
                  />
                  {isCheckingEmail && <span className="absolute right-3 top-2.5 text-xs text-slate-500 dark:text-slate-400">Checking...</span>}
                </div>
                {duplicateWarning && (
                  <p className="text-sm text-red-600 mt-1 font-medium">{duplicateWarning}</p>
                )}
              </div>

              {hasActiveSubscription && (
                 <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-md text-sm border border-red-200">
                    You already have an active subscription for this module.
                 </div>
              )}

              <Button type="submit" className="w-full mt-6 h-12 text-lg" disabled={isProcessing || hasActiveSubscription}>
                {isProcessing ? 'Processing...' : hasActiveSubscription ? 'Already Subscribed' : (displayPlanName === 'Custom' ? 'Submit Request' : (getPrice() === 0 ? `Activate ${displayPlanName} Plan` : `Pay ₹${getPrice()} Now`))}
              </Button>
              <Button type="button" variant="outline" className="w-full mt-2" onClick={() => navigate('/')}>
                Back to Home Page
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Order Summary Section */}
        <Card className="h-fit bg-slate-900 text-white border-0">
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-start pb-4 border-b border-white/20">
                <div>
                  <p className="font-semibold text-lg">{moduleName} Module</p>
                  <p className="text-sm text-white/60 mb-2">{displayPlanName.replace(/\s*Plan$/i, '')} Plan</p>
                  <div className="relative inline-block">
                    <select 
                      className="appearance-none bg-white/10 border border-white/20 text-white pr-8 pl-2 py-1 outline-none cursor-pointer hover:bg-white/20 rounded text-sm transition-colors"
                      value={selectedCycle}
                      onChange={(e) => setSelectedCycle(e.target.value)}
                    >
                      <option value="monthly" className="text-slate-900 dark:text-slate-100">Monthly</option>
                      <option value="yearly" className="text-slate-900 dark:text-slate-100">1 Year</option>
                      <option value="two_years" className="text-slate-900 dark:text-slate-100">2 Years</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-white pointer-events-none" />
                  </div>
                </div>
                <p className="font-bold text-xl mt-1">₹{getPrice()}</p>
              </div>

              <div className="flex justify-between items-center text-sm text-white/60">
                <p>Subtotal</p>
                <p>₹{actualPrice}</p>
              </div>
              
              {promoDiscount > 0 && (
                <div className="flex justify-between items-center text-sm text-emerald-400">
                  <p>Promo Discount</p>
                  <p>-₹{promoDiscount.toFixed(2)}</p>
                </div>
              )}

              <div className="flex justify-between items-center text-sm text-white/60">
                <p>Taxes (GST 18%)</p>
                <p>₹{(getPrice() * 0.18).toFixed(2)}</p>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-white/20 text-xl font-bold">
                <p>Total</p>
                <p>₹{(getPrice() * 1.18).toFixed(2)}</p>
              </div>

              <div className="pt-4 mt-2">
                <p className="text-sm text-white/60 mb-2">Have a Promo Code?</p>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Enter code" 
                    value={promoCode} 
                    onChange={(e) => setPromoCode(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 h-10"
                  />
                  <Button type="button" onClick={applyPromo} variant="secondary" className="h-10 px-4">
                    Apply
                  </Button>
                </div>
              </div>

              {plan === 'Free' && getPrice() > 0 && (
                <div className="mt-6 p-4 bg-white dark:bg-slate-950/10 rounded-lg text-sm text-white/80">
                  <p><strong>Note:</strong> A nominal fee of ₹1 is charged to verify your payment method. This helps us prevent spam and abuse.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  ));
}
