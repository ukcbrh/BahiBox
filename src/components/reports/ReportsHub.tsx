import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { FileText, CalendarDays, TrendingUp, TrendingDown, Hash, FileSpreadsheet, FileWarning, Wallet, ShoppingBag, Package, Boxes, Link2, RefreshCw } from 'lucide-react';
import { DayBookView } from './DayBookView';
import { ProfitAndLossView } from './ProfitAndLossView';
import { HSNMasterView } from './HSNMasterView';
import { GSTR1View } from './GSTR1View';
import { GSTR3BView } from './GSTR3BView';
import { SalesByProductReport } from './SalesByProductReport';
import { SaleReportView } from './SaleReportView';
import { SaleOutstandingView } from './SaleOutstandingView';
import { InwardPaymentReportView } from './InwardPaymentReportView';
import { PurchaseReportView } from './PurchaseReportView';
import { PurchaseOutstandingView } from './PurchaseOutstandingView';
import { StockReportView } from './StockReportView';
import { BatchReportView } from './BatchReportView';
import { BankReconciliationView } from './BankReconciliationView';
import { RecurringInvoicesView } from './RecurringInvoicesView';
import { OutwardPaymentReportView } from './OutwardPaymentReportView';
import { CompanyLedgerView } from './CompanyLedgerView';
import { ShiftReport } from './ShiftReport';
import { DeliveryChallanInwardReportView } from './DeliveryChallanInwardReportView';
import { DeliveryChallanOutwardReportView } from './DeliveryChallanOutwardReportView';

export function ReportsHub() {
  const [activeReport, setActiveReport] = useState<string | null>(null);

  const reports = [
    { id: 'sales_product', title: 'Sales by Product', desc: 'Top/bottom sellers and revenue analysis.', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { id: 'sale_report', title: 'Sale Report', desc: 'Complete list of sales invoices for a period.', icon: FileText, color: 'text-cyan-600', bg: 'bg-cyan-100' },
    { id: 'sale_outstanding', title: 'Sale Outstanding', desc: 'Customers with pending balances.', icon: TrendingDown, color: 'text-rose-600', bg: 'bg-rose-100' },
    { id: 'inward_payment_report', title: 'Inward Payment Report', desc: 'All customer payments collected.', icon: Wallet, color: 'text-teal-600', bg: 'bg-teal-100' },
    { id: 'purchase_report', title: 'Purchase Report', desc: 'Complete list of purchase orders for a period.', icon: ShoppingBag, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { id: 'purchase_outstanding', title: 'Purchase Outstanding', desc: 'Suppliers with pending balances.', icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-100' },
    { id: 'stock_report', title: 'Stock Report', desc: 'Current inventory valuation.', icon: Package, color: 'text-lime-600', bg: 'bg-lime-100' },
    { id: 'batch_report', title: 'Batch Report', desc: 'Stock batches with expiry tracking.', icon: Boxes, color: 'text-fuchsia-600', bg: 'bg-fuchsia-100' },
    { id: 'bank_reconciliation', title: 'Bank Reconciliation', desc: 'Match bank statement with system records.', icon: Link2, color: 'text-sky-600', bg: 'bg-sky-100' },
    { id: 'recurring_invoices', title: 'Recurring Invoices', desc: 'Auto-generate invoices on a schedule.', icon: RefreshCw, color: 'text-violet-600', bg: 'bg-violet-100' },
    { id: 'outward_payment_report', title: 'Outward Payment Report', desc: 'All supplier payments made.', icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-100' },
    { id: 'company_ledger', title: 'Company Ledger', desc: 'Account-wise transaction history & running balance.', icon: Hash, color: 'text-gray-600', bg: 'bg-gray-100' },
    { id: 'shift_report', title: 'Shift Report', desc: 'Cashier shift history and cash variance.', icon: CalendarDays, color: 'text-amber-600', bg: 'bg-amber-100' },
    { id: 'dc_inward_report', title: 'Delivery Challan (Inward) Report', desc: 'Goods received via delivery challan.', icon: Boxes, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { id: 'dc_outward_report', title: 'Delivery Challan (Outward) Report', desc: 'Goods dispatched via delivery challan.', icon: Boxes, color: 'text-pink-600', bg: 'bg-pink-100' },
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
  if (activeReport === 'sales_product') return <SalesByProductReport onBack={() => setActiveReport(null)} />;
  if (activeReport === 'sale_report') return <SaleReportView onBack={() => setActiveReport(null)} />;
  if (activeReport === 'sale_outstanding') return <SaleOutstandingView onBack={() => setActiveReport(null)} />;
  if (activeReport === 'inward_payment_report') return <InwardPaymentReportView onBack={() => setActiveReport(null)} />;
  if (activeReport === 'purchase_report') return <PurchaseReportView onBack={() => setActiveReport(null)} />;
  if (activeReport === 'purchase_outstanding') return <PurchaseOutstandingView onBack={() => setActiveReport(null)} />;
  if (activeReport === 'stock_report') return <StockReportView onBack={() => setActiveReport(null)} />;
  if (activeReport === 'batch_report') return <BatchReportView onBack={() => setActiveReport(null)} />;
  if (activeReport === 'bank_reconciliation') return <BankReconciliationView onBack={() => setActiveReport(null)} />;
  if (activeReport === 'recurring_invoices') return <RecurringInvoicesView onBack={() => setActiveReport(null)} />;
  if (activeReport === 'outward_payment_report') return <OutwardPaymentReportView onBack={() => setActiveReport(null)} />;
  if (activeReport === 'company_ledger') return <CompanyLedgerView onBack={() => setActiveReport(null)} />;
  if (activeReport === 'shift_report') return <ShiftReport onBack={() => setActiveReport(null)} />;
  if (activeReport === 'dc_inward_report') return <DeliveryChallanInwardReportView onBack={() => setActiveReport(null)} />;
  if (activeReport === 'dc_outward_report') return <DeliveryChallanOutwardReportView onBack={() => setActiveReport(null)} />;

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
                <p className="text-sm text-slate-500 dark:text-slate-400">{r.desc}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
