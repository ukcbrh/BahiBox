import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { AlertTriangle, Lock } from 'lucide-react';

export function GSTR3BView() {
  const [period, setPeriod] = useState('2023-10');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
        <div>
          <h2 className="text-xl font-bold">GSTR-3B Return</h2>
          <p className="text-sm text-slate-500">Monthly summary of outward liability and ITC.</p>
        </div>
        <div className="flex items-center gap-3">
          <input 
            type="month" 
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          />
          <Button className="gap-2 bg-green-600 hover:bg-green-700 text-white"><Lock size={16}/> Save & Lock</Button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg flex items-start gap-3">
        <AlertTriangle className="shrink-0 mt-0.5 text-amber-600" size={18} />
        <div className="text-sm">
          <strong>ITC figures may be understated.</strong> Ensure all purchase invoices for this period are recorded before filing to claim maximum Input Tax Credit.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm bg-slate-50">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-slate-500 mb-1">Total Outward Tax Liability</h3>
            <div className="text-3xl font-bold text-slate-800 mb-4">₹ 12,450.00</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>IGST:</span> <span>₹ 2,450.00</span></div>
              <div className="flex justify-between"><span>CGST:</span> <span>₹ 5,000.00</span></div>
              <div className="flex justify-between"><span>SGST:</span> <span>₹ 5,000.00</span></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-blue-50/50">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-blue-600 mb-1">Total Eligible ITC</h3>
            <div className="text-3xl font-bold text-blue-800 mb-4">₹ 8,200.00</div>
            <div className="space-y-1 text-sm text-blue-900/70">
              <div className="flex justify-between"><span>IGST:</span> <span>₹ 1,200.00</span></div>
              <div className="flex justify-between"><span>CGST:</span> <span>₹ 3,500.00</span></div>
              <div className="flex justify-between"><span>SGST:</span> <span>₹ 3,500.00</span></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-green-50">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-green-700 mb-1">Net Tax Payable</h3>
            <div className="text-3xl font-bold text-green-800 mb-4">₹ 4,250.00</div>
            <div className="space-y-1 text-sm text-green-900/70">
              <div className="flex justify-between"><span>IGST:</span> <span>₹ 1,250.00</span></div>
              <div className="flex justify-between"><span>CGST:</span> <span>₹ 1,500.00</span></div>
              <div className="flex justify-between"><span>SGST:</span> <span>₹ 1,500.00</span></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
