import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { CheckCircle2, CreditCard, Download, ExternalLink } from 'lucide-react';

export function BillingSubscriptionView() {
  const invoices = [
    { id: 'inv_101', date: '01 Oct 2023', amount: 999, status: 'Paid', download: '#' },
    { id: 'inv_100', date: '01 Sep 2023', amount: 999, status: 'Paid', download: '#' },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-xl font-bold dark:text-white">Billing & Subscription</h2>
        <p className="text-sm text-slate-500">Manage your current plan and billing history.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-primary/20 shadow-sm bg-primary/5">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardDescription className="font-semibold text-primary uppercase tracking-wider mb-1">Current Plan</CardDescription>
                <CardTitle className="text-3xl">Growth Plan</CardTitle>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1">
                <CheckCircle2 size={14} /> Active
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-4xl font-extrabold mb-1">₹999 <span className="text-lg font-medium text-slate-500">/ month</span></p>
              <p className="text-sm text-slate-600">Next renewal on 01 Nov 2023</p>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-semibold">Includes:</p>
              <ul className="text-sm space-y-1 text-slate-600">
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-primary"/> Retail POS, Inventory, CRM</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-primary"/> Unlimited Invoices</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-primary"/> Priority Support</li>
              </ul>
            </div>

            <div className="pt-4 flex gap-3">
              <Button className="w-full">Upgrade Plan</Button>
              <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50">Cancel Subscription</Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard size={18} /> Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between border rounded-lg p-4 bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-8 bg-slate-200 rounded flex items-center justify-center font-bold text-slate-500 text-xs">VISA</div>
                  <div>
                    <p className="font-semibold text-sm">•••• •••• •••• 4242</p>
                    <p className="text-xs text-slate-500">Expires 12/25</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-primary">Update</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Invoice History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {invoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between p-4 hover:bg-slate-50">
                    <div>
                      <p className="font-semibold text-sm">{inv.date}</p>
                      <p className="text-xs text-slate-500">{inv.id}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-medium text-sm">₹{inv.amount}</span>
                      <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded">{inv.status}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500">
                        <Download size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
