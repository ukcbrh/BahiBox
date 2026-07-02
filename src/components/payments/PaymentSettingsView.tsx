import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { CheckCircle2, ShieldCheck, AlertCircle, Building, Wallet } from 'lucide-react';
import { Switch } from '@/src/components/ui/switch';

export function PaymentSettingsView() {
  const [kycStatus] = useState<'pending' | 'submitted' | 'active'>('active');
  const [useOwnGateway, setUseOwnGateway] = useState(false);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold dark:text-white">Payment Settings & KYC</h2>
        <p className="text-sm text-slate-500">Onboard your bank account to receive payments directly via Razorpay Route.</p>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <div className={`h-2 w-full ${kycStatus === 'active' ? 'bg-green-500' : kycStatus === 'submitted' ? 'bg-blue-500' : 'bg-amber-500'}`} />
        <CardHeader className="border-b bg-slate-50/50 pb-4">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className={kycStatus === 'active' ? 'text-green-600' : 'text-slate-400'} /> 
                Account Verification (KYC)
              </CardTitle>
              <CardDescription className="mt-1">
                Required for auto-settlement of consumer payments to your bank account.
              </CardDescription>
            </div>
            {kycStatus === 'active' && (
              <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full flex items-center gap-1 border border-green-200">
                <CheckCircle2 size={14} /> KYC Verified & Active
              </span>
            )}
            {kycStatus === 'pending' && (
              <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full flex items-center gap-1 border border-amber-200">
                <AlertCircle size={14} /> Pending KYC
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 border-b pb-2">
                <Building size={16} /> Business Details
              </h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500">Legal Business Name</label>
                  <Input value="Sharma General Store" disabled={kycStatus !== 'pending'} className="bg-slate-50" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500">Business PAN</label>
                  <Input value="ABCDE1234F" disabled={kycStatus !== 'pending'} className="bg-slate-50 font-mono" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 border-b pb-2">
                <Wallet size={16} /> Settlement Bank Account
              </h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500">Account Number</label>
                  <Input value={kycStatus === 'active' ? "•••• •••• 9876" : ""} disabled={kycStatus !== 'pending'} className="bg-slate-50 font-mono" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500">IFSC Code</label>
                  <Input value={kycStatus === 'active' ? "SBIN0001234" : ""} disabled={kycStatus !== 'pending'} className="bg-slate-50 font-mono" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500">Account Holder Name</label>
                  <Input value="Sharma General Store" disabled={kycStatus !== 'pending'} className="bg-slate-50" />
                </div>
              </div>
            </div>
          </div>

          {kycStatus === 'active' && (
            <div className="mt-6 pt-6 border-t flex items-center justify-between">
              <div>
                <h4 className="font-semibold">Auto-Settlement</h4>
                <p className="text-sm text-slate-500">Automatically transfer funds to your bank account daily.</p>
              </div>
              <Switch checked={true} onCheckedChange={() => {}} />
            </div>
          )}

          {kycStatus === 'pending' && (
            <div className="pt-4 flex justify-end">
              <Button className="px-8">Submit for KYC Verification</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* White-Label Settings (Conditional on Plan, mock showing it) */}
      <Card className="border-none shadow-sm">
        <CardHeader className="border-b pb-4">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>White-Label Gateway</CardTitle>
              <CardDescription>Use your own Razorpay credentials instead of BahiBox Route.</CardDescription>
            </div>
            <Switch checked={useOwnGateway} onCheckedChange={setUseOwnGateway} />
          </div>
        </CardHeader>
        {useOwnGateway && (
          <CardContent className="p-6 space-y-4 bg-slate-50/50">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Razorpay Key ID</label>
              <Input type="password" placeholder="rzp_live_..." defaultValue="rzp_live_xxxxxxxxxx" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Razorpay Key Secret</label>
              <Input type="password" placeholder="Secret Key" defaultValue="xxxxxxxxxxxxxxxxxxxx" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Webhook Secret</label>
              <Input type="password" placeholder="Webhook Secret" defaultValue="xxxxxxxxxxxxxxxxxxxx" />
            </div>
            <Button className="mt-2">Save Credentials</Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
