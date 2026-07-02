import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Plus, Truck } from 'lucide-react';

export function RetailSuppliers() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Suppliers</h2>
          <p className="text-slate-500">Manage vendors and track payables.</p>
        </div>
        <Button><Plus size={16} className="mr-2" /> Add Supplier</Button>
      </div>

      <Card className="border-none shadow-sm bg-white p-12 text-center">
        <Truck className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900">No Suppliers</h3>
        <p className="text-slate-500 mt-2 max-w-md mx-auto">Add suppliers to start creating purchase orders and receiving stock.</p>
        <Button className="mt-6"><Plus size={16} className="mr-2" /> Add Supplier</Button>
      </Card>
    </div>
  );
}
