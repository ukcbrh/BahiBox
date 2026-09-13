import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Check } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePlans } from '../hooks/usePlans';

import { useAuth } from '../contexts/AuthContext';
import { useModules } from '../hooks/useModules';
import { CheckCircle2 } from 'lucide-react';


export default function Pricing() {
  useDocumentTitle('BahiBox | Pricing');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { plans, loading } = usePlans();
  const { currentTenantId } = useAuth();
  const { subscriptions } = useModules(currentTenantId || undefined);
  
  const availableModules = Array.from(new Set(plans.map(p => p.moduleName)));
  const defaultModuleKey = (plans.find((p: any) => p.moduleName === 'Retail POS') as any)?.moduleKey || (plans[0] as any)?.moduleKey || 'retail';
  const rawModuleKey = (searchParams.get('module') || defaultModuleKey) as string;
  const moduleName = (plans.find((p: any) => p.moduleKey === rawModuleKey) as any)?.moduleName || rawModuleKey;
  
  const [planCycles, setPlanCycles] = useState<Record<string, string>>({});

  const handleSelectPlan = (plan: string, cycle: string) => {
    // Convert 'One Year' to 'yearly', 'Two Years' to 'two_years', 'Month' to 'monthly'
    let mappedCycle = 'monthly';
    if (cycle === 'One Year') mappedCycle = 'yearly';
    else if (cycle === 'Two Years') mappedCycle = 'two_years';
    
    navigate(`/checkout?module=${encodeURIComponent(moduleName)}&plan=${encodeURIComponent(plan)}&cycle=${mappedCycle}`);
  };

  const modulePlans = plans.filter(p => p.moduleName === moduleName && p.isActive !== false).sort((a, b) => (a.priceMonthly || 0) - (b.priceMonthly || 0));

  if (loading) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">Loading plans...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-200 flex flex-col">
      <header className="h-28 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-8 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <img src="/logolight.png" alt="BahiBox Logo" className="h-24 md:h-28 dark:hidden object-contain py-2" />
          <img src="/logodark.png" alt="BahiBox Logo" className="h-24 md:h-28 hidden dark:block object-contain py-2" />
        </div>
      </header>
      
      <main className="flex-1 w-full pb-24">
        <section id="pricing" className="py-24 bg-slate-50 dark:bg-slate-900">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">Dynamic Pricing</h2>
              <div className="w-24 h-1 bg-primary mx-auto rounded-full mb-6"></div>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-8">
                View pricing according to your business module
              </p>
              
              <div className="max-w-xs mx-auto">
                <Select value={rawModuleKey} onValueChange={(val) => setSearchParams({ module: val })}>
                  <SelectTrigger className="w-full h-12 text-lg font-medium bg-white dark:bg-slate-950">
                    <SelectValue placeholder="Select Module" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModules.map(mod => {
                      const key = (plans.find((p: any) => p.moduleName === mod) as any)?.moduleKey || mod;
                      return <SelectItem key={key} value={key}>{mod}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {modulePlans.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {modulePlans.map((plan, idx) => {
                  const isPopular = plan.tier.toLowerCase() === 'premium' || plan.tier.toLowerCase() === 'growth plan' || idx === 1;
                  const cycle = planCycles[plan.id] || 'Month';
                  const isCurrentPlan = subscriptions?.some(s => s.plan_id === plan.id && (s.status === 'Active' || s.status === 'active'));
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
                          <div className="inline-block ml-2 w-28 text-left">
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
                        {isCurrentPlan ? (
                          <div className="w-full h-12 flex items-center justify-center gap-2 bg-green-100 text-green-700 font-bold rounded-md">
                            <CheckCircle2 size={20} /> Current Plan
                          </div>
                        ) : (
                          <Button 
                            variant={isPopular ? 'default' : (idx === 0 ? 'outline' : 'secondary')}
                            className={`w-full h-12 text-lg ${isPopular ? 'shadow-md hover:shadow-lg transition-all' : (idx === 0 ? 'border-2 hover:bg-slate-50 dark:hover:bg-slate-900' : 'hover:bg-slate-200 dark:bg-slate-700')}`} 
                            onClick={() => handleSelectPlan(plan.name, cycle)} 
                          >
                            Select {plan.name}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-slate-500 dark:text-slate-400 mt-12 py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg max-w-2xl mx-auto">
                No active plans currently available for this module.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}