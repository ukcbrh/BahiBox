import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Factory, GraduationCap, Stethoscope, Utensils, Truck, Wrench, Sprout, Check, Facebook, Twitter, Linkedin, Smartphone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Textarea } from '@/src/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { modulesData, publicAppFeature, pricingData } from '../data';
import { getSupabaseClient } from '../lib/supabase';
import { ModuleMaster } from '../types';
import { useAuth } from '../contexts/AuthContext';

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedModule, setSelectedModule] = useState('retail');
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', inquiryType: '' });
  const [modulesList, setModulesList] = useState<ModuleMaster[]>([]);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [activeSubscriptions, setActiveSubscriptions] = useState<Set<string>>(new Set());

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
            setActiveSubscriptions(new Set(data.map(s => s.module_id)));
          }
        }
      }
    };
    fetchSubscriptions();
  }, [user]);

  const hasActiveSubscription = activeSubscriptions.has(selectedModule);

  const handleCheckoutClick = (plan: string) => {
    if (hasActiveSubscription) {
      alert("You already have an active subscription for this module.");
      return;
    }
    navigate(`/checkout?module=${encodeURIComponent(selectedModule)}&plan=${plan}`);
  };

  useEffect(() => {
    const fetchModules = async () => {
      const fallbackModules = [
        { id: 'retail', name: 'Retail POS', description: 'Point of sale and inventory', icon: 'ShoppingCart', price: 49.00 },
        { id: 'manufacturing', name: 'Manufacturing', description: 'Production and tracking', icon: 'Factory', price: 199.00 },
        { id: 'education', name: 'Education', description: 'School management', icon: 'GraduationCap', price: 149.00 },
        { id: 'healthcare', name: 'Healthcare', description: 'Clinic and patient management', icon: 'Stethoscope', price: 299.00 },
        { id: 'hospitality', name: 'Hospitality', description: 'Hotel and restaurant', icon: 'Hotel', price: 99.00 },
        { id: 'transport', name: 'Transport', description: 'Fleet and logistics', icon: 'Truck', price: 149.00 },
        { id: 'services', name: 'Services', description: 'Service and booking', icon: 'Wrench', price: 49.00 },
        { id: 'agriculture', name: 'Agriculture', description: 'Farm and crop management', icon: 'Tractor', price: 79.00 }
      ];

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
               const existingIds = new Set(data.map(m => m.id));
               const missingModules = fallbackModules.filter(m => !existingIds.has(m.id));
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
      loadedModules.forEach(m => {
        prices[m.id] = Number(m.price);
      });
      setLivePrices(prices);
    };
    fetchModules();
  }, []);

  const currentPricing = pricingData[selectedModule];
  const livePriceForModule = livePrices[selectedModule] || 999;
  
  const selectedModuleData = modulesList.find(m => m.id === selectedModule);
  const testModeFree = selectedModuleData?.test_mode_free ?? false;
  const testModePro = selectedModuleData?.test_mode_pro ?? false;
  const testModeCustom = selectedModuleData?.test_mode_custom ?? false;

  const displayPriceFree = testModeFree ? '₹1' : '₹0';
  const displayPricePro = testModePro ? '₹1' : `₹${livePriceForModule}`;
  const displayPriceCustom = testModeCustom ? '₹1' : 'Custom';

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Your request has been submitted! We will contact you shortly.');
    setContactForm({ name: '', email: '', phone: '', inquiryType: '' });
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Sticky Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-50 shadow-sm transition-all">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => scrollToSection('home')}>
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl">B</div>
          <span className="text-2xl font-extrabold tracking-tight text-slate-900">BahiBox</span>
        </div>
        
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
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
          <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 mb-6 tracking-tight leading-tight max-w-4xl">
            One App, Endless Possibilities - Simplify your business and life with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500">BahiBox</span>.
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed">
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
      <section id="about" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Our Vision</h2>
            <div className="w-24 h-1 bg-primary mx-auto rounded-full"></div>
          </div>
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-xl text-slate-700 leading-relaxed">
              The vision of BahiBox is to bring every small and large merchant, school, hospital, farmer, and service provider in India under one digital umbrella. It is not just a software, but a self-driven ecosystem where businesses (B2B) can easily manage all their operations, and the general public (B2C) can directly connect with those businesses to shop, book, or avail services via the public app.
            </p>
          </div>
        </div>
      </section>

      {/* Modules Showcase */}
      <section id="modules" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">8 Powerful Modules + 1 Public App</h2>
            <div className="w-24 h-1 bg-primary mx-auto rounded-full mb-6"></div>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Choose a module according to your needs and make your business smart.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {modulesData.map((mod) => (
              <Card 
                key={mod.id} 
                className="hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-2 border-slate-200/60 bg-white/50 backdrop-blur-sm group"
                onClick={() => {
                  setSelectedModule(mod.id);
                  scrollToSection('pricing');
                }}
              >
                <CardContent className="p-6">
                  <div className={`w-14 h-14 ${mod.bg} ${mod.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <mod.icon size={28} strokeWidth={1.5} />
                  </div>
                  <h3 className="font-bold text-xl text-slate-900 mb-3">{mod.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{mod.description}</p>
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
                  <h3 className="font-bold text-2xl text-slate-900 mb-3">{publicAppFeature.title}</h3>
                  <p className="text-lg text-slate-700 leading-relaxed mb-6">{publicAppFeature.description}</p>
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
      <section id="pricing" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Dynamic Pricing</h2>
            <div className="w-24 h-1 bg-primary mx-auto rounded-full mb-6"></div>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
              View pricing according to your business module
            </p>
            
            <div className="max-w-xs mx-auto">
              <Select value={selectedModule} onValueChange={setSelectedModule}>
                <SelectTrigger className="w-full h-12 text-lg font-medium bg-white">
                  <SelectValue placeholder="Select Module" />
                </SelectTrigger>
                <SelectContent>
                  {modulesList.map(mod => (
                    <SelectItem key={mod.id} value={mod.id}>{mod.name || (mod as any).title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {currentPricing && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Free Plan */}
              <Card className="flex flex-col border-slate-200 hover:shadow-lg transition-shadow bg-white">
                <CardHeader className="text-center pb-8 pt-8 border-b border-slate-100">
                  <CardTitle className="text-2xl text-slate-800">Free Plan</CardTitle>
                  <div className="mt-4 flex justify-center items-baseline text-4xl font-extrabold text-slate-900">
                    {displayPriceFree}<span className="text-base font-medium text-slate-500 ml-1">/ setup</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-2">For Single User</p>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col pt-8">
                  <ul className="space-y-4 flex-1 mb-8">
                    {currentPricing.free.map((feature, i) => (
                      <li key={i} className="flex items-start">
                        <Check className="h-5 w-5 text-emerald-500 mr-3 shrink-0" />
                        <span className="text-slate-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button variant="outline" className="w-full h-12 text-lg border-2 hover:bg-slate-50" onClick={() => handleCheckoutClick('Free')} disabled={hasActiveSubscription}>
                    {hasActiveSubscription ? 'Already Subscribed' : 'Get Started Free'}
                  </Button>
                </CardContent>
              </Card>

              {/* Pro Plan */}
              <Card className="flex flex-col border-primary shadow-xl relative scale-105 z-10 bg-white">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
                  Most Popular
                </div>
                <CardHeader className="text-center pb-8 pt-10 border-b border-slate-100">
                  <CardTitle className="text-2xl text-primary">Pro Plan</CardTitle>
                  <div className="mt-4 flex justify-center items-baseline text-4xl font-extrabold text-slate-900">
                    {displayPricePro}<span className="text-base font-medium text-slate-500 ml-1">/ month</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-2">Advanced Features & Multi-User</p>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col pt-8">
                  <ul className="space-y-4 flex-1 mb-8">
                    {currentPricing.pro.map((feature, i) => (
                      <li key={i} className="flex items-start">
                        <Check className="h-5 w-5 text-primary mr-3 shrink-0" />
                        <span className="text-slate-700 font-medium">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full h-12 text-lg shadow-md hover:shadow-lg transition-all" onClick={() => handleCheckoutClick('Pro')} disabled={hasActiveSubscription}>
                    {hasActiveSubscription ? 'Already Subscribed' : 'Select Pro'}
                  </Button>
                </CardContent>
              </Card>

              {/* Custom Plan */}
              <Card className="flex flex-col border-slate-200 hover:shadow-lg transition-shadow bg-white">
                <CardHeader className="text-center pb-8 pt-8 border-b border-slate-100">
                  <CardTitle className="text-2xl text-slate-800">Enterprise</CardTitle>
                  <div className="mt-4 flex justify-center items-baseline text-4xl font-extrabold text-slate-900">
                    {displayPriceCustom}
                  </div>
                  <p className="text-sm text-slate-500 mt-2">For Large Enterprises</p>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col pt-8">
                  <ul className="space-y-4 flex-1 mb-8">
                    {currentPricing.custom.map((feature, i) => (
                      <li key={i} className="flex items-start">
                        <Check className="h-5 w-5 text-slate-700 mr-3 shrink-0" />
                        <span className="text-slate-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button variant="secondary" className="w-full h-12 text-lg hover:bg-slate-200" onClick={() => handleCheckoutClick('Custom')} disabled={hasActiveSubscription}>
                    {hasActiveSubscription ? 'Already Subscribed' : 'Contact Sales'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-slate-50 -skew-x-12 translate-x-32 hidden lg:block"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Contact Us</h2>
              <div className="w-24 h-1 bg-primary rounded-full mb-6"></div>
              <p className="text-lg text-slate-600 mb-8">
                Do you have any questions or want to know about custom plans? 
                Fill out the form below and our team will contact you.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                    <Smartphone size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Call Us</h4>
                    <p className="text-slate-600">+91 1800-XXX-XXXX</p>
                  </div>
                </div>
              </div>
            </div>

            <Card className="shadow-xl border-0">
              <CardContent className="p-8">
                <form onSubmit={handleContactSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Your Name</label>
                    <Input required placeholder="Ex. Rahul Sharma" value={contactForm.name} onChange={e => setContactForm({...contactForm, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Email ID</label>
                    <Input required type="email" placeholder="rahul@example.com" value={contactForm.email} onChange={e => setContactForm({...contactForm, email: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Phone Number</label>
                    <Input required placeholder="+91 XXXXX XXXXX" value={contactForm.phone} onChange={e => setContactForm({...contactForm, phone: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Inquiry Type (Business Type)</label>
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
                  <Button type="submit" className="w-full h-12 text-lg">Send Message</Button>
                </form>
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
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl">B</div>
                <span className="text-2xl font-extrabold tracking-tight text-white">BahiBox</span>
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
                <li><a href="#" className="hover:text-primary transition-colors">Terms & Conditions</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Disclaimer</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-6">Download Public App</h4>
              <p className="text-slate-400 mb-4">Get the BahiBox app for your daily needs.</p>
              <Button variant="outline" className="w-full border-slate-700 hover:bg-slate-800 text-slate-800 hover:text-white" onClick={() => navigate('/public')}>
                Open Web App
              </Button>
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-800 text-center text-slate-500 text-sm">
            <p>&copy; {new Date().getFullYear()} BahiBox Ecosystem. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

