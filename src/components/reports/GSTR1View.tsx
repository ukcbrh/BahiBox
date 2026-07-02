import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Lock, FileSpreadsheet } from 'lucide-react';

export function GSTR1View() {
  const [period, setPeriod] = useState('2023-10');
  const [activeTab, setActiveTab] = useState('b2b');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
        <div>
          <h2 className="text-xl font-bold">GSTR-1 Outward Supplies</h2>
          <p className="text-sm text-slate-500">Summary of all outward sales for the period.</p>
        </div>
        <div className="flex items-center gap-3">
          <input 
            type="month" 
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          />
          <Button variant="outline" className="gap-2"><FileSpreadsheet size={16}/> Export JSON</Button>
          <Button className="gap-2 bg-green-600 hover:bg-green-700 text-white"><Lock size={16}/> Save & Lock</Button>
        </div>
      </div>

      <div className="flex border-b bg-white rounded-t-lg px-2">
        <button 
          onClick={() => setActiveTab('b2b')}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'b2b' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          4A, 4B, 4C, 6B, 6C - B2B Invoices
        </button>
        <button 
          onClick={() => setActiveTab('b2c')}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'b2c' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          7 - B2C (Others)
        </button>
        <button 
          onClick={() => setActiveTab('hsn')}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'hsn' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          12 - HSN Summary
        </button>
      </div>

      <Card className="border-none shadow-sm rounded-t-none">
        <CardContent className="p-0">
          {activeTab === 'b2b' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3">GSTIN/UIN</th>
                    <th className="px-4 py-3">Invoice No.</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Taxable Val</th>
                    <th className="px-4 py-3 text-right">IGST</th>
                    <th className="px-4 py-3 text-right">CGST</th>
                    <th className="px-4 py-3 text-right">SGST</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs">29ABCDE1234F1Z5</td>
                    <td className="px-4 py-3">INV-1002</td>
                    <td className="px-4 py-3">15-Oct-2023</td>
                    <td className="px-4 py-3 text-right">10,000.00</td>
                    <td className="px-4 py-3 text-right">0.00</td>
                    <td className="px-4 py-3 text-right">900.00</td>
                    <td className="px-4 py-3 text-right">900.00</td>
                    <td className="px-4 py-3 text-right font-medium">11,800.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          {activeTab === 'b2c' && (
            <div className="p-8 text-center text-slate-500">
              B2C State-wise summary will appear here.
            </div>
          )}
          {activeTab === 'hsn' && (
            <div className="p-8 text-center text-slate-500">
              HSN-wise outward supply summary will appear here.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
