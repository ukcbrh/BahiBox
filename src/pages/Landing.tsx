import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Factory, GraduationCap, Stethoscope, Utensils, Truck, Wrench, Sprout, Check, Facebook, Twitter, Linkedin, Smartphone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Textarea } from '@/src/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { modulesData, publicAppFeature, fallbackModules, getOfficialModuleName } from '../data';
import { getSupabaseClient } from '../lib/supabase';
import { ModuleMaster } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function Landing() {
  useDocumentTitle('BahiBox');
  const navigate = useNavigate();
  const { user, loading, isSuperAdmin } = useAuth();
  const [selectedModule, setSelectedModule] = useState('retail');
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', inquiryType: '', message: '' });
  const [contactSuccess, setContactSuccess] = useState(false);
  const [modulesList, setModulesList] = useState<ModuleMaster[]>([]);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [activeSubscriptions, setActiveSubscriptions] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Don't redirect away if the user just arrived here to complete a
    // password reset — let ResetPasswordModal handle this instead.
    const params = new URLSearchParams(window.location.search);
    const isPasswordReset = params.get('reset_password') === 'true' || params.get('type') === 'recovery';
    if (!loading && user && !isPasswordReset) {
      if (isSuperAdmin) {
        navigate('/superadmin');
      } else {
        navigate('/merchant-dashboard');
      }
    }
  }, [user, loading, isSuperAdmin, navigate]);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      if (user) {
        const supabase = getSupabaseClient();
        if (supabase) {
          const { data } = await supabase.from('merchant_subscriptions')
            .select('module_id')
            .eq('merchant_id', user.id)
            .eq('status', 'Active');
          if (data) {
            setActiveSubscriptions(new Set(data.map((s: any) => s.module_id)));
          }
        }
      }
    };
    fetchSubscriptions();
  }, [user]);

  const hasActiveSubscription = activeSubscriptions.has(selectedModule);

  const handleCheckoutClick = (plan: string, cycle: string) => {
    if (hasActiveSubscription) {
      alert("You already have an active subscription for this module.");
      return;
    }
    navigate(`/checkout?module=${encodeURIComponent(selectedModule)}&plan=${plan}&cycle=${encodeURIComponent(cycle)}`);
  };

  useEffect(() => {
    const fetchModules = async () => {
      let loadedModules = fallbackModules;

      try {
        const supabase = getSupabaseClient();
        if (supabase) {
          const { data, error } = await supabase.from('modules_master').select('*').order('name');
          if (error && error.code !== 'PGRST205' && error.code !== '42P01') {
             console.warn("Error fetching modules_master:", error);
          }
          if (data && data.length > 0) {
            if (data.length < 8) {
               const existingIds = new Set(data.map((m: any) => m.id));
               const missingModules = fallbackModules.filter((m: any) => !existingIds.has(m.id));
               loadedModules = [...data, ...missingModules].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            } else {
               loadedModules = data;
            }
          }
        }
      } catch (e) {
        console.warn("Exception in fetchModules:", e);
      }
      
      setModulesList(loadedModules as any[]);
      
      const prices: Record<string, number> = {};
      loadedModules.forEach((m: any) => {
        prices[m.id] = Number(m.price);
      });
      setLivePrices(prices);
    };
    fetchModules();
  }, []);

  const officialNameForSelected = getOfficialModuleName(selectedModule);
  const selectedModuleData = modulesList.find((m: any) => m.id === selectedModule || m.name === officialNameForSelected) || fallbackModules.find((m: any) => m.id === selectedModule || m.name === officialNameForSelected);

  const [adminPlans, setAdminPlans] = useState<any[]>([]);
  const [planCycles, setPlanCycles] = useState<Record<string, string>>({});

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

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from('contact_messages').insert({
        name: contactForm.name,
        email: contactForm.email,
        phone: contactForm.phone,
        inquiry_type: contactForm.inquiryType,
        message: contactForm.message
      });
    }
    setContactSuccess(true);
    setContactForm({ name: '', email: '', phone: '', inquiryType: '', message: '' });
    setTimeout(() => setContactSuccess(false), 5000);
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-200">
      {/* Sticky Header */}
      <header className="h-28 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 flex items-center justify-between sticky top-0 z-50 shadow-sm transition-all">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => scrollToSection('home')}>
          <img src="/logolight.png" alt="BahiBox Logo" className="h-24 md:h-28 dark:hidden object-contain py-2" />
          <img src="/logodark.png" alt="BahiBox Logo" className="h-24 md:h-28 hidden dark:block object-contain py-2" />
        </div>
        
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
          <button onClick={() => scrollToSection('home')} className="hover:text-primary transition-colors">Home</button>
          <button onClick={() => scrollToSection('about')} className="hover:text-primary transition-colors">About Us</button>
          <button onClick={() => scrollToSection('modules')} className="hover:text-primary transition-colors">Modules</button>
          <button onClick={() => scrollToSection('pricing')} className="hover:text-primary transition-colors">Pricing</button>
          <button onClick={() => scrollToSection('contact')} className="hover:text-primary transition-colors">Contact</button>
        </nav>

        <div className="flex gap-4">
          <Button onClick={() => navigate('/login')} className="shadow-md hover:shadow-lg transition-all">Login / Sign Up</Button>
        </div>
      </header>

      {/* Hero Section */}
      <section id="home" className="relative pt-20 pb-32 overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="absolute inset-0 bg-grid-slate-100/[0.04] bg-[bottom_1px_center] pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col items-center text-center">
          <div className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium text-primary bg-primary/10 mb-8">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
            B2B + B2C Super-App Ecosystem
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 dark:text-slate-100 mb-6 tracking-tight leading-tight max-w-4xl">
            One App, Endless Possibilities - Simplify your business and life with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500">BahiBox</span>.
          </h1>
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            Bringing every small and large merchant, school, hospital, farmer, and service provider in India under one digital umbrella.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="lg" onClick={() => scrollToSection('modules')} className="text-lg px-8 h-14 rounded-full shadow-lg hover:shadow-xl transition-all">
              Explore All Modules
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/public')} className="text-lg px-8 h-14 rounded-full border-2">
              Explore Public App
            </Button>
          </div>
        </div>
        
        {/* Abstract shapes for visual interest */}
        <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute top-1/2 right-0 translate-x-1/3 -translate-y-1/2 w-96 h-96 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">Our Vision</h2>
            <div className="w-24 h-1 bg-primary mx-auto rounded-full"></div>
          </div>
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-xl text-slate-700 dark:text-slate-300 leading-relaxed">
              The vision of BahiBox is to bring every small and large merchant, school, hospital, farmer, and service provider in India under one digital umbrella. It is not just a software, but a self-driven ecosystem where businesses (B2B) can easily manage all their operations, and the general public (B2C) can directly connect with those businesses to shop, book, or avail services via the public app.
            </p>
          </div>
        </div>
      </section>

      {/* Modules Showcase */}
      <section id="modules" className="py-24 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">8 Powerful Modules + 1 Public App</h2>
            <div className="w-24 h-1 bg-primary mx-auto rounded-full mb-6"></div>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Choose a module according to your needs and make your business smart.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {modulesData.map((mod) => (
              <Card 
                key={mod.id} 
                className="hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-2 border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-950/50 backdrop-blur-sm group"
                onClick={() => {
                  const officialId = getOfficialModuleName(mod.id);
                  const matchingModule = modulesList.find((m: any) => m.id === officialId || m.name === officialId);
                  setSelectedModule(matchingModule ? matchingModule.id : officialId);
                  scrollToSection('pricing');
                }}
              >
                <CardContent className="p-6">
                  <div className={`w-14 h-14 ${mod.bg} ${mod.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <mod.icon size={28} strokeWidth={1.5} />
                  </div>
                  <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100 mb-3">{mod.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{mod.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Public App Banner */}
          <div className="mt-12">
            <Card className="bg-gradient-to-r from-primary/10 to-purple-500/10 border-none shadow-lg">
              <CardContent className="p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                <div className={`w-20 h-20 shrink-0 ${publicAppFeature.bg} ${publicAppFeature.color} rounded-full flex items-center justify-center`}>
                  <publicAppFeature.icon size={40} strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-2xl text-slate-900 dark:text-slate-100 mb-3">{publicAppFeature.title}</h3>
                  <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed mb-6">{publicAppFeature.description}</p>
                  <Button size="lg" onClick={() => navigate('/public')} className="rounded-full">
                    Experience Public App
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Dynamic Pricing */}
      <section id="pricing" className="py-24 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">Dynamic Pricing</h2>
            <div className="w-24 h-1 bg-primary mx-auto rounded-full mb-6"></div>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-8">
              View pricing according to your business module
            </p>
            
            <div className="max-w-xs mx-auto">
              <Select value={selectedModule} onValueChange={setSelectedModule}>
                <SelectTrigger className="w-full h-12 text-lg font-medium bg-white dark:bg-slate-950">
                  <SelectValue placeholder="Select Module" />
                </SelectTrigger>
                <SelectContent>
                  {modulesList.map(mod => (
                    <SelectItem key={mod.id} value={mod.id}>{getOfficialModuleName(mod.id, mod.name || (mod as any).title)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {(() => {
            const modName = getOfficialModuleName(selectedModule, selectedModuleData?.name || (selectedModuleData as any)?.title);
            const dynamicPlansForModule = adminPlans.filter((p: any) => p.moduleName === modName && p.isActive !== false).sort((a, b) => (a.priceMonthly || 0) - (b.priceMonthly || 0));
            
            if (dynamicPlansForModule.length > 0) {
              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {dynamicPlansForModule.map((plan, idx) => {
                    const isPopular = plan.tier.toLowerCase() === 'premium' || plan.tier.toLowerCase() === 'growth plan' || idx === 1;
                    const cycle = planCycles[plan.id] || 'Month';
                    const displayPrice = cycle === 'Two Years' ? (plan.priceYearly || 0) * 2 : (cycle === 'One Year' ? (plan.priceYearly || 0) : (plan.priceMonthly || 0));
                    return (
                      <Card key={plan.id} className={`flex flex-col border-${isPopular ? 'primary shadow-xl relative scale-105 z-10' : 'slate-200 hover:shadow-lg transition-shadow'} bg-white dark:bg-slate-950`}>
                        {isPopular && (
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
                            Recommended
                          </div>
                        )}
                        <CardHeader className={`text-center pb-8 pt-${isPopular ? '10' : '8'} border-b border-slate-100 dark:border-slate-800`}>
                          <p className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">{plan.tier}</p>
                          <CardTitle className={`text-2xl ${isPopular ? 'text-primary' : 'text-slate-800 dark:text-slate-200'}`}>{plan.name}</CardTitle>
                          <div className="mt-4 flex justify-center items-baseline text-4xl font-extrabold text-slate-900 dark:text-slate-100">
                            ₹{displayPrice}
                            <div className="inline-block ml-2 w-28">
                              <Select value={cycle} onValueChange={(val) => setPlanCycles({...planCycles, [plan.id]: val})}>
                                <SelectTrigger className="h-8 text-sm font-medium bg-slate-50 dark:bg-slate-900 border-0 focus:ring-0 text-slate-600 dark:text-slate-400">
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
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col pt-8">
                          <ul className="space-y-4 flex-1 mb-8">
                            {plan.features?.map((feature: string, i: number) => (
                              <li key={i} className="flex items-start">
                                <Check className={`h-5 w-5 ${isPopular ? 'text-primary' : 'text-emerald-500'} mr-3 shrink-0`} />
                                <span className={isPopular ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-600 dark:text-slate-400'}>{feature}</span>
                              </li>
                            ))}
                            {(!plan.features || plan.features.length === 0) && (
                               <li className="text-slate-400 italic text-sm">No features listed</li>
                            )}
                          </ul>
                          <Button 
                            variant={isPopular ? 'default' : (idx === 0 ? 'outline' : 'secondary')}
                            className={`w-full h-12 text-lg ${isPopular ? 'shadow-md hover:shadow-lg transition-all' : (idx === 0 ? 'border-2 hover:bg-slate-50 dark:hover:bg-slate-900' : 'hover:bg-slate-200 dark:bg-slate-700')}`} 
                            onClick={() => handleCheckoutClick(plan.name, cycle)} 
                            disabled={hasActiveSubscription}
                          >
                            {hasActiveSubscription ? 'Already Subscribed' : `Select ${plan.name}`}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              );
            }

            return (
              <div className="text-center text-slate-500 dark:text-slate-400 mt-12 py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg max-w-2xl mx-auto">
                No active plans currently available for this module.
              </div>
            );
          })()}
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-white dark:bg-slate-950 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-slate-50 dark:bg-slate-900 -skew-x-12 translate-x-32 hidden lg:block"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">Contact Us</h2>
              <div className="w-24 h-1 bg-primary rounded-full mb-6"></div>
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
                Do you have any questions or want to know about custom plans? 
                Fill out the form below and our team will contact you.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                    <Smartphone size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">Call Us</h4>
                    <p className="text-slate-600 dark:text-slate-400">+91 1800-XXX-XXXX</p>
                  </div>
                </div>
              </div>
            </div>

            <Card className="shadow-xl border-0">
              <CardContent className="p-8">
                {contactSuccess ? (
                  <div className="bg-green-50 text-green-700 p-6 rounded-lg text-center space-y-4 animate-in fade-in zoom-in duration-300">
                    <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold">Message Sent!</h3>
                    <p className="text-sm">Thank you for your interest. Our team will get back to you shortly.</p>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Your Name</label>
                      <Input required placeholder="Ex. Rahul Sharma" value={contactForm.name} onChange={e => setContactForm({...contactForm, name: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email ID</label>
                      <Input required type="email" placeholder="rahul@example.com" value={contactForm.email} onChange={e => setContactForm({...contactForm, email: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone Number</label>
                      <Input required placeholder="+91 XXXXX XXXXX" value={contactForm.phone} onChange={e => setContactForm({...contactForm, phone: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Inquiry Type (Business Type)</label>
                      <Select required value={contactForm.inquiryType} onValueChange={val => setContactForm({...contactForm, inquiryType: val})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your business" />
                        </SelectTrigger>
                        <SelectContent>
                          {modulesData.map(mod => (
                            <SelectItem key={mod.id} value={mod.id}>{mod.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Message</label>
                      <Textarea 
                        required
                        placeholder="How can we help you?" 
                        value={contactForm.message} 
                        onChange={e => setContactForm({...contactForm, message: e.target.value})}
                        className="min-h-[100px]"
                      />
                    </div>
                    <Button type="submit" className="w-full h-12 text-lg">Send Message</Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-300 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <img src="/logodark.png" alt="BahiBox Logo" className="h-36 object-contain" />
              </div>
              <p className="text-slate-400 mb-6">
                The Ultimate B2B + B2C Super-App Ecosystem for modern India.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary transition-colors text-white">
                  <Facebook size={20} />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary transition-colors text-white">
                  <Twitter size={20} />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary transition-colors text-white">
                  <Linkedin size={20} />
                </a>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-6">Company</h4>
              <ul className="space-y-4">
                <li><button onClick={() => scrollToSection('about')} className="hover:text-primary transition-colors">About Us</button></li>
                <li><a href="#" className="hover:text-primary transition-colors">Careers (Jobs & Connect)</a></li>
                <li><button onClick={() => scrollToSection('contact')} className="hover:text-primary transition-colors">Contact Support</button></li>
                <li><button onClick={() => navigate('/superadmin')} className="hover:text-primary transition-colors text-xs opacity-50">Admin Portal</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-6">Legal & Security</h4>
              <ul className="space-y-4">
                <li><a href="/customer-policy" className="hover:text-primary transition-colors">Customer Terms & Conditions</a></li>
                <li><a href="/merchant-policy" className="hover:text-primary transition-colors">Merchant Terms & Conditions</a></li>
                <li><a href="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-6">Download Public App</h4>
              <p className="text-slate-400 mb-4">Get the BahiBox app for your daily needs.</p>
              <Button variant="outline" className="w-full border-slate-700 hover:bg-slate-800 text-slate-800 dark:text-slate-200 hover:text-white" onClick={() => navigate('/public')}>
                Open Web App
              </Button>
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-800 text-center text-slate-500 dark:text-slate-400 text-sm">
            <p>&copy; {new Date().getFullYear()} BahiBox Ecosystem. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

