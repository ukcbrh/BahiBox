import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Search, Plus, Upload } from 'lucide-react';

export function HSNMasterView() {
  const [codes] = useState([
    { id: 1, type: 'HSN', code: '1006', desc: 'Rice', rate: 5.00 },
    { id: 2, type: 'HSN', code: '8517', desc: 'Mobile Phones', rate: 18.00 },
    { id: 3, type: 'SAC', code: '998314', desc: 'Information Technology Services', rate: 18.00 },
    { id: 4, type: 'HSN', code: '6109', desc: 'T-Shirts', rate: 5.00 },
  ]);

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
        <div>
          <CardTitle>HSN / SAC Master</CardTitle>
          <CardDescription>Manage goods and services tax codes.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2"><Upload size={16}/> Bulk Import</Button>
          <Button className="gap-2"><Plus size={16}/> Add New</Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-4 border-b bg-slate-50">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input placeholder="Search code or description..." className="pl-9" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Code</th>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3 text-right">GST Rate (%)</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {codes.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${c.type === 'HSN' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                      {c.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono font-medium">{c.code}</td>
                  <td className="px-6 py-4">{c.desc}</td>
                  <td className="px-6 py-4 text-right font-medium">{c.rate.toFixed(2)}%</td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm">Edit</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
