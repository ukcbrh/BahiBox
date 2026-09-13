import React, { useState } from 'react';
import { Card, CardContent } from '@/src/components/ui/card';
import { FileText, FileCheck, PackageCheck, PackageMinus, ClipboardList, ClipboardCheck, FileMinus, FilePlus } from 'lucide-react';
import { ProformaInvoicePage } from '../retail/RetailPOSFullScreen';
import { QuotationList } from '../retail/QuotationList';
import { SaleOrderList } from '../retail/SaleOrderList';
import { DeliveryChallanOutwardList } from '../retail/DeliveryChallanOutwardList';
import { DeliveryChallanInwardList } from '../retail/DeliveryChallanInwardList';
import { RetailPurchases } from '../retail/RetailPurchases';
import { PurchaseOrderList } from '../retail/PurchaseOrderList';
import { CreditNoteList } from '../retail/CreditNoteList';
import { DebitNoteList } from '../retail/DebitNoteList';

export function DocumentsHub() {
  const [activeDoc, setActiveDoc] = useState<string | null>(null);
  
  const docs = [
    { id: 'quotation', title: 'Quotation', desc: 'Send price estimates to customers before invoicing.', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100' },
    { id: 'proforma', title: 'Proforma Invoice', desc: 'Draft invoice sent before final billing.', icon: FileCheck, color: 'text-cyan-600', bg: 'bg-cyan-100' },
    { id: 'sale_order', title: 'Sale Order', desc: 'Confirmed customer orders before final invoicing.', icon: ClipboardList, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { id: 'purchase_order', title: 'Purchase Order', desc: 'A record of goods ordered from a supplier, before receiving or invoicing.', icon: ClipboardCheck, color: 'text-purple-600', bg: 'bg-purple-100' },
    { id: 'purchase_receiving', title: 'Purchase Receiving & Payables', desc: 'Receive goods against orders and track supplier payables.', icon: ClipboardCheck, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { id: 'delivery_challan_inward', title: 'Delivery Challan (In)', desc: 'Record goods received without an invoice.', icon: PackageCheck, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { id: 'delivery_challan_outward', title: 'Delivery Challan (Out)', desc: 'Record goods sent out without an invoice.', icon: PackageMinus, color: 'text-amber-600', bg: 'bg-amber-100' },
    { id: 'credit_note', title: 'Credit Note', desc: 'Record a sales return, reducing customer’s due.', icon: FileMinus, color: 'text-red-600', bg: 'bg-red-100' },
    { id: 'debit_note', title: 'Debit Note', desc: 'Record a purchase return, reducing your payable.', icon: FilePlus, color: 'text-orange-600', bg: 'bg-orange-100' },
  ];
  
  if (activeDoc === 'quotation') return <QuotationList onBack={() => setActiveDoc(null)} />;
  if (activeDoc === 'proforma') return <ProformaInvoicePage onBack={() => setActiveDoc(null)} />;
  if (activeDoc === 'sale_order') return <SaleOrderList onBack={() => setActiveDoc(null)} />;
  if (activeDoc === 'purchase_order') return <PurchaseOrderList onBack={() => setActiveDoc(null)} />;
  if (activeDoc === 'purchase_receiving') return <RetailPurchases onBack={() => setActiveDoc(null)} />;
  if (activeDoc === 'delivery_challan_inward') return <DeliveryChallanInwardList onBack={() => setActiveDoc(null)} />;
  if (activeDoc === 'delivery_challan_outward') return <DeliveryChallanOutwardList onBack={() => setActiveDoc(null)} />;
  if (activeDoc === 'credit_note') return <CreditNoteList onBack={() => setActiveDoc(null)} />;
  if (activeDoc === 'debit_note') return <DebitNoteList onBack={() => setActiveDoc(null)} />;
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold dark:text-white">Documents</h1>
        <p className="text-slate-500 dark:text-slate-400">Create and manage quotations, orders, challans, and notes.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
        {docs.map((d) => {
          const Icon = d.icon;
          return (
            <Card
              key={d.id}
              className="border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => setActiveDoc(d.id)}
            >
              <CardContent className="p-6">
                <div className={`p-3 rounded-xl w-fit mb-4 transition-colors group-hover:bg-primary/10 ${d.bg} ${d.color}`}>
                  <Icon size={24} className={d.color} />
                </div>
                <h3 className="text-lg font-semibold mb-1 group-hover:text-primary transition-colors">{d.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{d.desc}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
