import re

code = """
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Plus, Edit2, RotateCcw, Save, Printer, ArrowLeft, Trash2, Settings, MoreVertical, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getSupabaseClient } from '../../lib/supabase';
import { toast } from 'sonner';

interface CreatePurchaseInvoiceProps {
  onBack: () => void;
}

export function CreatePurchaseInvoice({ onBack }: CreatePurchaseInvoiceProps) {
  const { currentTenantId, user } = useAuth();
  
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplierId, setSupplierId] = useState('');
  
  const [items, setItems] = useState<any[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentTenantId) {
      const supabase = getSupabaseClient();
      if (supabase) {
        supabase.from('suppliers').select('*').eq('tenant_id', currentTenantId).then(({data}: any) => {
          if (data) setSuppliers(data);
        });
        supabase.from('products').select('*').eq('tenant_id', currentTenantId).then(({data}: any) => {
          if (data) setProducts(data);
        });
      }
    }
  }, [currentTenantId]);

  const handleAddItem = (prod: any) => {
    setItems([...items, { 
      id: Math.random().toString(), 
      product_id: prod.id, 
      name: prod.product_name, 
      qty: 1, 
      price: prod.purchase_price || 0,
      tax_rate: prod.igst ? parseFloat(prod.igst) : 0
    }]);
    setSearchTerm('');
  };

  const updateItem = (id: string, field: string, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };
  
  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const subtotal = items.reduce((acc, curr) => acc + (curr.qty * curr.price), 0);
  const taxAmount = items.reduce((acc, curr) => acc + (curr.qty * curr.price * (curr.tax_rate / 100)), 0);
  const grandTotal = subtotal + taxAmount;

  const handleSave = async () => {
    if (!supplierId || !invoiceNo || items.length === 0) {
      toast.error('Please fill supplier, invoice number and add at least one item');
      return;
    }
    
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) return;
    
    try {
      const { data: branches } = await supabase.from('branches').select('id').eq('tenant_id', currentTenantId).limit(1);
      const branchId = branches?.[0]?.id || currentTenantId;

      const { data: po, error: poErr } = await supabase.from('purchase_orders').insert({
        tenant_id: currentTenantId,
        branch_id: branchId,
        supplier_id: supplierId,
        po_number: invoiceNo,
        status: 'ordered',
        total_amount: grandTotal,
        created_by: user?.id
      }).select().single();
      
      if (poErr) throw poErr;

      const poItems = items.map((item: any) => ({
        purchase_order_id: po.id,
        product_id: item.product_id,
        item_name: item.name,
        ordered_quantity: item.qty,
        unit_price: item.price,
        total_price: item.qty * item.price,
        received_quantity: item.qty // we receive all immediately for invoice
      }));

      const { data: insertedItems, error: itemsErr } = await supabase.from('purchase_order_items').insert(poItems).select();
      if (itemsErr) throw itemsErr;

      const receipts = insertedItems.map((item: any) => ({ po_item_id: item.id, received_now: item.ordered_quantity }));
      const { error: receiveErr } = await supabase.rpc('receive_purchase_order_partial', {
        p_purchase_order_id: po.id,
        p_receipts: receipts,
        p_received_by: user?.id
      });
      
      if (receiveErr) throw receiveErr;
      
      toast.success('Purchase Invoice saved successfully');
      onBack();
      
    } catch (err: any) {
      toast.error(err.message || 'Failed to save purchase invoice');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => p.product_name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto animate-in fade-in duration-300 pb-12">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-slate-700">
          <Edit2 className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Create Purchase Invoice</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Supplier Information */}
        <Card className="shadow-sm border-slate-200 h-full">
          <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50/50">
            <CardTitle className="text-sm font-semibold text-slate-700">Supplier Information</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-[120px_1fr] items-center gap-4">
              <label className="text-sm text-slate-600">M/S.<span className="text-red-500">*</span></label>
              <select 
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
                value={supplierId}
                onChange={e => setSupplierId(e.target.value)}
              >
                <option value="">Select Supplier</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Detail */}
        <Card className="shadow-sm border-slate-200 h-full">
          <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50/50">
            <CardTitle className="text-sm font-semibold text-slate-700">Invoice Detail</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <label className="text-sm text-slate-600 whitespace-nowrap">Invoice No.<span className="text-red-500">*</span></label>
              <Input 
                className="h-9 w-full" 
                placeholder="Enter Invoice Number" 
                value={invoiceNo}
                onChange={e => setInvoiceNo(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <label className="text-sm text-slate-600">Date<span className="text-red-500">*</span></label>
              <Input 
                type="date" 
                className="h-9 w-full" 
                value={invoiceDate}
                onChange={e => setInvoiceDate(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Item Details Table */}
      <Card className="shadow-sm border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-4 py-2 font-medium text-left">Item Name</th>
                <th className="px-4 py-2 font-medium text-right w-24">Qty</th>
                <th className="px-4 py-2 font-medium text-right w-32">Price</th>
                <th className="px-4 py-2 font-medium text-right w-24">Tax %</th>
                <th className="px-4 py-2 font-medium text-right w-32">Amount</th>
                <th className="px-4 py-2 font-medium w-12 text-center"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2">{item.name}</td>
                  <td className="px-4 py-2 text-right">
                    <Input 
                      type="number" 
                      className="h-8 text-right w-full" 
                      value={item.qty}
                      onChange={e => updateItem(item.id, 'qty', parseFloat(e.target.value) || 0)}
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Input 
                      type="number" 
                      className="h-8 text-right w-full" 
                      value={item.price}
                      onChange={e => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                    />
                  </td>
                  <td className="px-4 py-2 text-right text-slate-600">{item.tax_rate}%</td>
                  <td className="px-4 py-2 text-right font-medium">₹ {(item.qty * item.price).toFixed(2)}</td>
                  <td className="px-4 py-2 text-center">
                    <button onClick={() => removeItem(item.id)} className="text-slate-400 hover:text-red-500">
                      <X className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              <tr>
                <td className="px-4 py-2 relative" colSpan={6}>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Type to search and select item..." 
                      className="h-9 w-full max-w-md"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                  {searchTerm && (
                    <div className="absolute z-10 w-full max-w-md bg-white border border-slate-200 rounded-md shadow-lg max-h-[200px] overflow-y-auto mt-1">
                      {filteredProducts.length > 0 ? (
                        filteredProducts.map(p => (
                          <div 
                            key={p.id} 
                            className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex justify-between items-center"
                            onClick={() => handleAddItem(p)}
                          >
                            <span>{p.product_name}</span>
                            <span className="text-slate-500 text-xs">₹{p.purchase_price}</span>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-slate-500 text-sm">No items found</div>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
      
      {/* Right Bottom Section (Totals & Actions) */}
      <div className="flex justify-end pt-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-600">Taxable Amount</span>
              <span className="font-semibold text-slate-800">₹ {subtotal.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-600">Total Tax</span>
              <span className="font-semibold text-slate-800">₹ {taxAmount.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center py-3 bg-yellow-100/50 px-2 -mx-2">
              <span className="font-bold text-slate-800">Grand Total</span>
              <span className="font-bold text-slate-800">₹ {grandTotal.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between pt-6 gap-2">
              <div className="flex gap-2">
                <Button variant="outline" className="h-9 bg-slate-50 hover:bg-slate-100 text-slate-600" onClick={onBack}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
              </div>
              <div className="flex gap-2">
                <Button 
                  className="h-9 bg-[#00b884] hover:bg-[#00a375] text-white px-6"
                  onClick={handleSave}
                  disabled={loading}
                >
                  <Save className="mr-2 h-4 w-4" /> {loading ? 'Saving...' : 'Save Invoice'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
"""

with open("src/components/retail/CreatePurchaseInvoice.tsx", "w") as f:
    f.write(code)

