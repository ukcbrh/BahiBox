import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Plus, Users } from 'lucide-react';

export function RetailCustomers() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Customers</h2>
          <p className="text-slate-500">Manage retail customers, loyalty wallets, and credit accounts.</p>
        </div>
        <Button><Plus size={16} className="mr-2" /> Add Customer</Button>
      </div>

      <Card className="border-none shadow-sm bg-white p-12 text-center">
        <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900">No Customers Yet</h3>
        <p className="text-slate-500 mt-2 max-w-md mx-auto">Customers will appear here when they are added during billing or created manually.</p>
        <Button className="mt-6"><Plus size={16} className="mr-2" /> Add Customer</Button>
      </Card>
    </div>
  );
}
