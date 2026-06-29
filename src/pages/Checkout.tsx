import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { getSupabaseClient } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function Checkout() {
  useDocumentTitle('BahiBox | Checkout');
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const moduleName = searchParams.get('module') || 'General';
  const plan = searchParams.get('plan') || 'Free';

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

  useEffect(() => {
    if (user) {
        setIsExistingMerchant(true);
        setExistingMerchantId(user.id);
        setFormData(prev => ({
            ...prev,
            email: user.email || prev.email,
        }));
    }
  }, [user]);

  const handleEmailBlur = async () => {
      if (!formData.email || user) return;
      setIsCheckingEmail(true);
      setDuplicateWarning('');
      const supabase = getSupabaseClient();
      if (supabase) {
          const { data, error } = await supabase.from('merchants').select('id, name, phone, business_name, address').eq('email', formData.email.toLowerCase()).single();
          if (data && !error) {
              setIsExistingMerchant(true);
              setExistingMerchantId(data.id);
              // Auto fill form data
              setFormData(prev => ({
                 ...prev,
                 name: data.name || prev.name,
                 phone: data.phone || prev.phone,
                 businessName: data.business_name || prev.businessName,
                 address: data.address || prev.address
              }));

              // Check for duplicate subscription
              const { data: subData } = await supabase.from('merchant_subscriptions')
                .select('status')
                .eq('merchant_id', data.id)
                .eq('module_id', moduleName)
                .eq('status', 'Active')
                .single();
              
              if (subData) {
                  setDuplicateWarning('This plan is already active for this Email ID.');
                  setHasActiveSubscription(true);
              } else {
                  setHasActiveSubscription(false);
              }
          } else {
              setIsExistingMerchant(false);
              setExistingMerchantId(null);
              // Let checkDuplicateAndPricing reset hasActiveSubscription if it was true before? 
              // checkDuplicateAndPricing doesn't run on email blur. We just set it to false for new users.
              setHasActiveSubscription(false);
          }
      }
      setIsCheckingEmail(false);
  };

  useEffect(() => {
    const checkDuplicateAndPricing = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      if (user) {
         const { data: subData } = await supabase.from('merchant_subscriptions')
           .select('status')
           .eq('merchant_id', user.id)
           .eq('module_id', moduleName)
           .eq('status', 'Active')
           .single();
         if (subData) {
            setHasActiveSubscription(true);
         }
      }

      const { data, error } = await supabase.from('modules_master').select('*').eq('id', moduleName).single();
      
      let basePrice = 0;
      if (data && !error) {
        if (plan === 'Free') {
          basePrice = data.test_mode_free ? 1 : 0;
        } else if (plan === 'Pro') {
          basePrice = data.test_mode_pro ? 1 : Number(data.price || 999);
        } else if (plan === 'Custom') {
          basePrice = data.test_mode_custom ? 1 : 0;
        }
      } else {
        // Fallbacks
        if (plan === 'Free') basePrice = 0;
        else if (plan === 'Pro') basePrice = 999;
        else if (plan === 'Custom') basePrice = 0;
      }
      setActualPrice(basePrice);
    };

    checkDuplicateAndPricing();
  }, [moduleName, plan, user]);

  const applyPromo = async () => {
    if (!promoCode) return;
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.from('promo_codes').select('*').eq('code', promoCode.toUpperCase()).eq('is_active', true).single();
      if (data && !error) {
        if (data.fixed_discount) {
           setPromoDiscount(Number(data.fixed_discount));
        } else if (data.discount_percentage) {
           setPromoDiscount((actualPrice * Number(data.discount_percentage)) / 100);
        }
        alert("Promo code applied!");
      } else {
        alert("Invalid or inactive promo code.");
        setPromoDiscount(0);
      }
    }
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

    if (!user && !isExistingMerchant && formData.password !== formData.confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    setIsProcessing(true);
    
    try {
      const finalAmount = getPrice();
      const supabase = getSupabaseClient();
      let currentUserId = user?.id || existingMerchantId;
      
      let isNewUser = false;
      if (supabase && !currentUserId && !isExistingMerchant && formData.password) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.name,
              role: 'merchant'
            }
          }
        });
        
        let finalAuthError = authError;
        if (authError && authError.message.includes('registered')) {
           const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
               email: formData.email,
               password: formData.password
           });
           if (!signInError && signInData.user) {
               currentUserId = signInData.user.id;
               finalAuthError = null;
               isNewUser = false;
           } else {
               finalAuthError = signInError || { message: "Account already exists but could not log in.", name: "AuthError" } as any;
           }
        } else if (!authError) {
           currentUserId = authData?.user?.id;
           isNewUser = true;
        }
        
        if (finalAuthError) {
          alert("Could not complete checkout: " + finalAuthError.message);
          setIsProcessing(false);
          return;
        }
        
        if (currentUserId && isNewUser) {
            const { error: merchantError } = await supabase.from('merchants').insert({
                id: currentUserId,
                name: formData.name,
                business_name: formData.businessName,
                phone: formData.phone,
                email: formData.email,
                address: formData.address,
                role: 'merchant',
                module: moduleName,
                status: 'Active',
                plan: plan
            });
            if (merchantError) {
                console.warn("Could not insert into merchants table", merchantError);
            }
            const { error: userError } = await supabase.from('users').insert({
                id: currentUserId,
                name: formData.name,
                phone: formData.phone,
                email: formData.email,
                role: 'merchant',
                type: moduleName,
                status: 'Active',
                plan: plan
            });
            if (userError) {
                console.warn("Could not insert into users table", userError);
            }
        }
      }
      
      if (supabase) {
         if (!currentUserId) {
            alert("Please create a password or login to activate this module.");
            setIsProcessing(false);
            return;
         }
         
         if (finalAmount === 0 || plan === 'Free') {
            const { error } = await supabase.from('merchant_subscriptions').upsert({
               merchant_id: currentUserId,
               module_id: moduleName,
               status: 'Active',
               plan_type: 'Free',
               created_at: new Date().toISOString()
            }, { onConflict: 'merchant_id, module_id' });
   
            if (error) {
               console.warn("Could not insert into merchant_subscriptions", error);
            }
            alert('Subscription Activated Successfully!');
            navigate('/merchant');
            return;
         }
         
         // Step 2.1: Fallback Assignment (Free Plan)
         await supabase.from('merchant_subscriptions').upsert({
            merchant_id: currentUserId,
            module_id: moduleName,
            status: 'Active',
            plan_type: 'Free',
            created_at: new Date().toISOString()
         }, { onConflict: 'merchant_id, module_id' });

         // Step 2.2 & 2.3: Route to Merchant Dashboard immediately with payment trigger state
         navigate('/merchant', { 
            state: { 
                showPaymentModal: true, 
                module: moduleName, 
                plan: plan, 
                amount: finalAmount * 1.18 
            } 
         });
         return;
      }
      
    } catch (error: any) {
      console.warn("Error during checkout process:", error);
      alert("There was an error processing your request. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-4xl flex items-center gap-3 mb-8 cursor-pointer" onClick={() => navigate('/')}>
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl">B</div>
        <span className="text-2xl font-extrabold tracking-tight text-slate-900">BahiBox Checkout</span>
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
                  {isCheckingEmail && <span className="absolute right-3 top-2.5 text-xs text-slate-500">Checking...</span>}
                </div>
                {duplicateWarning && (
                  <p className="text-sm text-red-600 mt-1 font-medium">{duplicateWarning}</p>
                )}
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
                <label className="text-sm font-medium">Address</label>
                <Input 
                  required 
                  placeholder="123 Main Street" 
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  disabled={isExistingMerchant}
                />
              </div>

              {!user && !isExistingMerchant && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Create Password</label>
                    <Input 
                      required 
                      type="password"
                      minLength={6}
                      placeholder="Create a password for your account" 
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                    />
                    <p className="text-xs text-slate-500">This will allow you to login later.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Confirm Password</label>
                    <Input 
                      required 
                      type="password"
                      minLength={6}
                      placeholder="Confirm your password" 
                      value={formData.confirmPassword}
                      onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                    />
                  </div>
                </>
              )}

              {plan !== 'Custom' && getPrice() > 0 && (
                <div className="pt-4 border-t mt-6">
                  <h3 className="text-sm font-medium mb-3">Payment Method</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Button type="button" variant="outline" className="justify-center border-primary bg-primary/5">
                      UPI
                    </Button>
                    <Button type="button" variant="outline" className="justify-center">
                      Card
                    </Button>
                  </div>
                </div>
              )}

              {hasActiveSubscription && (
                 <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-md text-sm border border-red-200">
                    You already have an active subscription for this module.
                 </div>
              )}

              <Button type="submit" className="w-full mt-6 h-12 text-lg" disabled={isProcessing || hasActiveSubscription}>
                {isProcessing ? 'Processing...' : hasActiveSubscription ? 'Already Subscribed' : (plan === 'Custom' ? 'Submit Request' : (getPrice() === 0 ? `Activate ${plan} Plan` : `Pay ₹${getPrice()} Now`))}
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
                  <p className="text-sm text-white/60">{plan} Plan</p>
                </div>
                <p className="font-bold">₹{getPrice()}</p>
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
                <div className="mt-6 p-4 bg-white/10 rounded-lg text-sm text-white/80">
                  <p><strong>Note:</strong> A nominal fee of ₹1 is charged to verify your payment method. This helps us prevent spam and abuse.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
