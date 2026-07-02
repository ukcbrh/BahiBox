import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { FileText, CalendarDays, TrendingUp, Hash, FileSpreadsheet, FileWarning } from 'lucide-react';
import { DayBookView } from './DayBookView';
import { ProfitAndLossView } from './ProfitAndLossView';
import { HSNMasterView } from './HSNMasterView';
import { GSTR1View } from './GSTR1View';
import { GSTR3BView } from './GSTR3BView';

export function ReportsHub() {
  const [activeReport, setActiveReport] = useState<string | null>(null);

  const reports = [
    { id: 'daybook', title: 'Day Book', desc: 'Chronological list of all daily transactions.', icon: CalendarDays, color: 'text-blue-600', bg: 'bg-blue-100' },
    { id: 'pnl', title: 'Profit & Loss', desc: 'Income vs Expenses over a selected period.', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100' },
    { id: 'hsn', title: 'HSN / SAC Master', desc: 'Manage tax codes and rates for products.', icon: Hash, color: 'text-purple-600', bg: 'bg-purple-100' },
    { id: 'gstr1', title: 'GSTR-1', desc: 'Outward supplies summary for GST filing.', icon: FileSpreadsheet, color: 'text-orange-600', bg: 'bg-orange-100' },
    { id: 'gstr3b', title: 'GSTR-3B', desc: 'Summary return of liability and ITC claim.', icon: FileWarning, color: 'text-red-600', bg: 'bg-red-100' },
  ];

  if (activeReport === 'daybook') return <DayBookView />;
  if (activeReport === 'pnl') return <ProfitAndLossView />;
  if (activeReport === 'hsn') return <HSNMasterView />;
  if (activeReport === 'gstr1') return <GSTR1View />;
  if (activeReport === 'gstr3b') return <GSTR3BView />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold dark:text-white">Reports & GST Hub</h1>
        <p className="text-slate-500 dark:text-slate-400">Access financial statements and auto-generated GST returns.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
        {reports.map((r) => {
          const Icon = r.icon;
          return (
            <Card 
              key={r.id} 
              className="border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => setActiveReport(r.id)}
            >
              <CardContent className="p-6">
                <div className={`p-3 rounded-xl w-fit mb-4 transition-colors group-hover:bg-primary/10 ${r.bg} ${r.color}`}>
                  <Icon size={24} className={r.color} />
                </div>
                <h3 className="text-lg font-semibold mb-1 group-hover:text-primary transition-colors">{r.title}</h3>
                <p className="text-sm text-slate-500">{r.desc}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
