import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Calendar, Search, Download } from 'lucide-react';

export function DayBookView() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [entries] = useState([
    { id: 1, time: '09:15 AM', type: 'Journal', ref: 'JE-2023-001', desc: 'Opening Balance', debit: 50000, credit: 0 },
    { id: 2, time: '10:30 AM', type: 'Sales Invoice', ref: 'INV-1001', desc: 'Cash Sale', debit: 2500, credit: 0 },
    { id: 3, time: '11:45 AM', type: 'Purchase', ref: 'PUR-501', desc: 'Office Supplies', debit: 0, credit: 1500 },
    { id: 4, time: '02:00 PM', type: 'Sales Invoice', ref: 'INV-1002', desc: 'Credit Sale - Sharma General Store', debit: 12000, credit: 0 },
  ]);

  const totalDebit = entries.reduce((acc, curr) => acc + curr.debit, 0);
  const totalCredit = entries.reduce((acc, curr) => acc + curr.credit, 0);
  const netBalance = totalDebit - totalCredit;

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-4 border-b">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle className="text-xl">Day Book</CardTitle>
            <p className="text-sm text-slate-500">Chronological transaction log for the day.</p>
          </div>
          <div className="flex items-center gap-2">
            <Input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              className="w-40"
            />
            <Button variant="outline" className="gap-2"><Download size={16}/> Export</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-3">Time</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Reference #</th>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3 text-right">Debit (₹)</th>
                <th className="px-6 py-3 text-right">Credit (₹)</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b last:border-0 hover:bg-slate-50 cursor-pointer">
                  <td className="px-6 py-4 whitespace-nowrap">{entry.time}</td>
                  <td className="px-6 py-4"><span className="px-2 py-1 bg-slate-100 text-xs font-medium rounded">{entry.type}</span></td>
                  <td className="px-6 py-4 font-mono text-xs">{entry.ref}</td>
                  <td className="px-6 py-4">{entry.desc}</td>
                  <td className="px-6 py-4 text-right font-medium text-green-600">
                    {entry.debit > 0 ? entry.debit.toLocaleString() : '-'}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-red-600">
                    {entry.credit > 0 ? entry.credit.toLocaleString() : '-'}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                <td colSpan={4} className="px-6 py-4 text-right">Closing Totals</td>
                <td className="px-6 py-4 text-right text-green-700">₹ {totalDebit.toLocaleString()}</td>
                <td className="px-6 py-4 text-right text-red-700">₹ {totalCredit.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-white flex justify-between items-center border-t">
          <span className="font-semibold text-slate-600">Net Daily Movement:</span>
          <span className={`text-lg font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {netBalance >= 0 ? '+' : ''}₹ {netBalance.toLocaleString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
