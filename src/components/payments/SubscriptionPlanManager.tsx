import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Plus, Edit, Check, Settings, X, Tag } from 'lucide-react';

export function SubscriptionPlanManager() {
  const [plans] = useState([
    {
      id: 1,
      tier: 'Free',
      name: 'Starter Plan',
      priceMonthly: 0,
      priceYearly: 0,
      commission: 5.0,
      modules: ['Retail POS'],
      isActive: true,
      whiteLabel: false
    },
    {
      id: 2,
      tier: 'Premium',
      name: 'Growth Plan',
      priceMonthly: 999,
      priceYearly: 9999,
      commission: 2.0,
      modules: ['Retail POS', 'Inventory', 'CRM'],
      isActive: true,
      whiteLabel: false
    },
    {
      id: 3,
      tier: 'Enterprise',
      name: 'White-Label Pro',
      priceMonthly: 4999,
      priceYearly: 49999,
      commission: 1.0,
      modules: ['All Modules'],
      isActive: true,
      whiteLabel: true
    }
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold dark:text-white">Subscription Plan Manager</h2>
          <p className="text-sm text-slate-500">Configure billing tiers and commissions for merchants.</p>
        </div>
        <Button className="gap-2"><Plus size={16}/> Add New Plan</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map(plan => (
          <Card key={plan.id} className="border-none shadow-md hover:shadow-lg transition-shadow dark:bg-slate-900 relative overflow-hidden">
            {!plan.isActive && (
              <div className="absolute top-4 right-4 text-xs font-semibold px-2 py-1 bg-red-100 text-red-700 rounded-full">Inactive</div>
            )}
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Tag size={18} className="text-primary" />
                <span className="text-sm font-semibold uppercase tracking-wider text-slate-500">{plan.tier}</span>
              </div>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-3xl font-extrabold">₹{plan.priceMonthly.toLocaleString()}</span>
                <span className="text-slate-500 text-sm">/ mo</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Platform Commission</span>
                  <span className="font-semibold">{plan.commission}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">White-Label BYO Keys</span>
                  <span className="font-semibold flex items-center gap-1">
                    {plan.whiteLabel ? <Check size={14} className="text-green-600"/> : <X size={14} className="text-red-500"/>}
                    {plan.whiteLabel ? 'Allowed' : 'Not Allowed'}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t dark:border-slate-800">
                <p className="text-sm font-semibold mb-2">Included Modules:</p>
                <ul className="space-y-2">
                  {plan.modules.map((mod, idx) => (
                    <li key={idx} className="text-sm flex items-center gap-2">
                      <Check size={14} className="text-primary" />
                      {mod}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4 mt-auto">
                <Button variant="outline" className="w-full gap-2"><Edit size={16}/> Edit Plan</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
