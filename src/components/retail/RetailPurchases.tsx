import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Plus, ShoppingCart } from 'lucide-react';

export function RetailPurchases() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Purchases</h2>
          <p className="text-slate-500">Manage purchase orders and receive stock.</p>
        </div>
        <Button><Plus size={16} className="mr-2" /> New Purchase Order</Button>
      </div>

      <Card className="border-none shadow-sm bg-white p-12 text-center">
        <ShoppingCart className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900">No Purchase Orders</h3>
        <p className="text-slate-500 mt-2 max-w-md mx-auto">Create your first purchase order to restock inventory. Once received, stock levels will update automatically.</p>
        <Button className="mt-6"><Plus size={16} className="mr-2" /> Create PO</Button>
      </Card>
    </div>
  );
}
