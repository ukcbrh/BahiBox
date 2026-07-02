import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Download, TrendingUp, TrendingDown } from 'lucide-react';

export function ProfitAndLossView() {
  const [period, setPeriod] = useState('this_month');
  
  const income = [
    { name: 'Sales Revenue', amount: 450000 },
    { name: 'Service Income', amount: 125000 },
    { name: 'Interest Received', amount: 5000 },
  ];
  
  const expense = [
    { name: 'Cost of Goods Sold', amount: 210000 },
    { name: 'Rent', amount: 45000 },
    { name: 'Salaries', amount: 120000 },
    { name: 'Utilities', amount: 15000 },
    { name: 'Marketing', amount: 25000 },
  ];

  const totalIncome = income.reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = expense.reduce((acc, curr) => acc + curr.amount, 0);
  const netProfit = totalIncome - totalExpense;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold">Profit & Loss Statement</h2>
          <p className="text-sm text-slate-500">Income vs Expense analysis for your business.</p>
        </div>
        <div className="flex gap-2">
          <select 
            className="border rounded-md px-3 py-2 text-sm bg-white"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="this_quarter">This Quarter</option>
            <option value="this_fy">This Financial Year</option>
          </select>
          <Button variant="outline" className="gap-2"><Download size={16}/> PDF Export</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Income Column */}
        <Card className="border-none shadow-sm h-fit">
          <CardHeader className="bg-green-50/50 border-b pb-4">
            <CardTitle className="text-green-800 flex items-center gap-2">
              <TrendingUp size={18} /> Income
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {income.map((item, idx) => (
                <div key={idx} className="flex justify-between p-4 hover:bg-slate-50">
                  <span className="font-medium text-slate-700">{item.name}</span>
                  <span>₹ {item.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="bg-slate-50 p-4 border-t flex justify-between font-bold text-lg">
              <span>Total Income</span>
              <span className="text-green-700">₹ {totalIncome.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Expense Column */}
        <Card className="border-none shadow-sm h-fit">
          <CardHeader className="bg-red-50/50 border-b pb-4">
            <CardTitle className="text-red-800 flex items-center gap-2">
              <TrendingDown size={18} /> Expenses
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {expense.map((item, idx) => (
                <div key={idx} className="flex justify-between p-4 hover:bg-slate-50">
                  <span className="font-medium text-slate-700">{item.name}</span>
                  <span>₹ {item.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="bg-slate-50 p-4 border-t flex justify-between font-bold text-lg">
              <span>Total Expenses</span>
              <span className="text-red-700">₹ {totalExpense.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Net Profit Banner */}
      <Card className={`border-2 ${netProfit >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
        <CardContent className="p-6 flex flex-col items-center justify-center text-center">
          <h3 className="text-lg font-medium text-slate-600 mb-2">Net {netProfit >= 0 ? 'Profit' : 'Loss'}</h3>
          <p className={`text-4xl font-bold ${netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            ₹ {Math.abs(netProfit).toLocaleString()}
          </p>
          <p className="text-sm text-slate-500 mt-2">For the selected period ({period.replace('_', ' ')})</p>
        </CardContent>
      </Card>
    </div>
  );
}
