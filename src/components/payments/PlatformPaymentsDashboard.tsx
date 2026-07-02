import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Search, IndianRupee, Activity, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Input } from '@/src/components/ui/input';

export function PlatformPaymentsDashboard() {
  const [transactions] = useState([
    { id: 'txn_101', merchant: 'Sharma General Store', amount: 1500, commission: 30, method: 'UPI', status: 'captured', time: '10 mins ago' },
    { id: 'txn_102', merchant: 'City Hospital', amount: 45000, commission: 450, method: 'Credit Card', status: 'captured', time: '1 hr ago' },
    { id: 'txn_103', merchant: 'Tech Haven', amount: 12000, commission: 240, method: 'Netbanking', status: 'failed', time: '2 hrs ago' },
    { id: 'txn_104', merchant: 'Fresh Foods', amount: 850, commission: 17, method: 'UPI', status: 'captured', time: '3 hrs ago' },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold dark:text-white">Platform Payments Dashboard</h2>
          <p className="text-sm text-slate-500">Live feed of transactions and commission earnings.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm bg-blue-50/50">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-blue-600 flex items-center gap-2 mb-2">
              <Activity size={16} /> Volume Today
            </h3>
            <div className="text-3xl font-bold text-slate-800">₹ 8,42,500</div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm bg-green-50">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-green-700 flex items-center gap-2 mb-2">
              <IndianRupee size={16} /> Commission Earned
            </h3>
            <div className="text-3xl font-bold text-green-800">₹ 12,450</div>
            <p className="text-xs text-green-600 mt-1">Pending Transfer: ₹ 1,200</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-slate-50">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-slate-600 flex items-center gap-2 mb-2">
              <Clock size={16} /> Webhook Health
            </h3>
            <div className="text-3xl font-bold text-slate-800">100%</div>
            <p className="text-xs text-slate-500 mt-1">0 events stuck in queue</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <CardTitle className="text-lg">Recent Transactions Feed</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input placeholder="Search transaction ID..." className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                <tr>
                  <th className="px-6 py-3">Txn ID</th>
                  <th className="px-6 py-3">Merchant</th>
                  <th className="px-6 py-3 text-right">Amount (₹)</th>
                  <th className="px-6 py-3 text-right">Commission (₹)</th>
                  <th className="px-6 py-3">Method</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {transactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono text-xs">{txn.id}</td>
                    <td className="px-6 py-4 font-medium">{txn.merchant}</td>
                    <td className="px-6 py-4 text-right font-semibold">{txn.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-green-600 font-medium">+{txn.commission.toLocaleString()}</td>
                    <td className="px-6 py-4">{txn.method}</td>
                    <td className="px-6 py-4">
                      {txn.status === 'captured' ? (
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full w-fit text-xs font-medium">
                            <CheckCircle2 size={14} /> Captured
                          </span>
                          <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 text-slate-500 hover:text-slate-700" onClick={() => alert(`Issue Refund for ${txn.id}`)}>Refund</Button>
                        </div>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-full w-fit text-xs font-medium">
                          <XCircle size={14} /> Failed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{txn.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
