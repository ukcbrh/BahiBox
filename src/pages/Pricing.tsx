import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Check } from 'lucide-react';

export default function Pricing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const moduleName = searchParams.get('module') || 'General';

  const handleSelectPlan = (plan: string) => {
    navigate(`/checkout?module=${encodeURIComponent(moduleName)}&plan=${encodeURIComponent(plan)}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl">B</div>
          <span className="text-2xl font-extrabold tracking-tight text-slate-900">BahiBox</span>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-6 py-12 w-full">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
            Pricing for {moduleName}
          </h1>
          <p className="text-lg text-slate-600">
            Choose the perfect plan for your business needs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Free Plan */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-xl">Free Plan</CardTitle>
              <div className="mt-4 flex items-baseline text-3xl font-bold">
                ₹1
                <span className="text-sm font-medium text-slate-500 ml-1">/ verification</span>
              </div>
              <p className="text-sm text-slate-500 mt-2">Basic features to get you started.</p>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <ul className="space-y-3 flex-1 mb-6">
                {['Single User Access', 'Basic Billing POS', 'Up to 50 Products', 'Standard Support'].map((feature, i) => (
                  <li key={i} className="flex items-start">
                    <Check className="h-5 w-5 text-emerald-500 mr-2 shrink-0" />
                    <span className="text-sm text-slate-600">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full" onClick={() => handleSelectPlan('Free')}>
                Select Free
              </Button>
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className="flex flex-col border-primary shadow-md relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Most Popular
            </div>
            <CardHeader>
              <CardTitle className="text-xl text-primary">Pro Plan</CardTitle>
              <div className="mt-4 flex items-baseline text-3xl font-bold">
                ₹999
                <span className="text-sm font-medium text-slate-500 ml-1">/ month</span>
              </div>
              <p className="text-sm text-slate-500 mt-2">Advanced features for growing businesses.</p>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <ul className="space-y-3 flex-1 mb-6">
                {[
                  'Unlimited Users & Roles',
                  'Advanced Inventory & Alerts',
                  'Job Portal Access',
                  'Public App Listing',
                  'Priority 24/7 Support'
                ].map((feature, i) => (
                  <li key={i} className="flex items-start">
                    <Check className="h-5 w-5 text-primary mr-2 shrink-0" />
                    <span className="text-sm text-slate-600">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button className="w-full" onClick={() => handleSelectPlan('Pro')}>
                Select Pro
              </Button>
            </CardContent>
          </Card>

          {/* Custom Plan */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-xl">Custom</CardTitle>
              <div className="mt-4 flex items-baseline text-3xl font-bold">
                Contact Us
              </div>
              <p className="text-sm text-slate-500 mt-2">Tailored solutions for enterprises.</p>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <ul className="space-y-3 flex-1 mb-6">
                {[
                  'Custom Module Integration',
                  'Dedicated Account Manager',
                  'On-premise Deployment',
                  'Custom Analytics & Reports',
                  'SLA Guarantee'
                ].map((feature, i) => (
                  <li key={i} className="flex items-start">
                    <Check className="h-5 w-5 text-slate-700 mr-2 shrink-0" />
                    <span className="text-sm text-slate-600">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button variant="secondary" className="w-full" onClick={() => handleSelectPlan('Custom')}>
                Contact Sales
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
