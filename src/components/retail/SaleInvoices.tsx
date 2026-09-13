import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { List, Search, Plus } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { CreateSaleInvoice } from './CreateSaleInvoice';
import InvoiceHistory from './InvoiceHistory';

export function SaleInvoices() {
  const { tenant } = useTenant();
  const [isCreating, setIsCreating] = useState(false);

  if (isCreating) {
    return <CreateSaleInvoice onBack={() => setIsCreating(false)} />;
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="shadow-sm border-none">
        <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            Sale Invoice
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 border-slate-200 dark:border-slate-800">
              <List className="mr-2 h-4 w-4" /> Summary
            </Button>
            <Button variant="outline" className="text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 border-slate-200 dark:border-slate-800">
              <Search className="mr-2 h-4 w-4" /> Search
            </Button>
            <Button 
              className="bg-[#00b884] hover:bg-[#00a375] text-white border-none shadow-sm"
              onClick={() => setIsCreating(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> Add New
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invoice History */}
      <div className="h-[calc(100vh-220px)]">
        <InvoiceHistory />
      </div>
    </div>
  );
}
