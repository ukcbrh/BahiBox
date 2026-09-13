import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Plus, ShoppingCart, CheckCircle, PackageSearch, CreditCard, RefreshCw } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import { getSupabaseClient } from '../../lib/supabase';
import { toast } from 'sonner';

export function RetailPurchases({ onBack }: { onBack?: () => void } = {}) {
  const { tenant } = useTenant();
  const { user, currentTenantId } = useAuth();
  const [activeTab, setActiveTab] = useState('pos'); // pos, payables
  const [pos, setPos] = useState<any[]>([]);
  const [payables, setPayables] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [newPoSupplier, setNewPoSupplier] = useState('');
  const [newPoItems, setNewPoItems] = useState<{product_id: string, name: string, qty: number, price: number}[]>([]);
  const [poSearchTerm, setPoSearchTerm] = useState('');


  const fetchPOs = async () => {
    if (!currentTenantId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data }: any = await supabase
      .from('purchase_orders')
      .select(`
        *,
        suppliers(supplier_name),
        purchase_order_items(*, products(product_name))
      `)
      .eq('tenant_id', currentTenantId)
      .order('created_at', { ascending: false });
    if (data) setPos(data);
  };

  const fetchPayables = async () => {
    if (!currentTenantId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data, error } = await supabase.rpc('get_supplier_payables', {
      p_tenant_id: currentTenantId
    });
    if (data) setPayables(data);
  };

  useEffect(() => {
    fetchPOs();
    fetchPayables();
    if (tenant) {
       const supabase = getSupabaseClient();
       if (supabase) {
         supabase.from('suppliers').select('*').eq('tenant_id', currentTenantId).neq('enable', false).then(({data}: any) => {
           if(data) setSuppliers(data);
         });
         supabase.from('products').select('*').eq('tenant_id', currentTenantId).then(({data}: any) => {
           if(data) setProducts(data);
         });
       }
    }
  }, [tenant]);

  const handleAddProductToPo = (prod: any) => {
    if (!newPoItems.find(i => i.product_id === prod.id)) {
      setNewPoItems([...newPoItems, { product_id: prod.id, name: prod.product_name, qty: 1, price: prod.purchase_price || 0 }]);
    }
    setPoSearchTerm('');
  };

  const handleSavePurchaseOrder = async () => {
    if (!newPoSupplier || newPoItems.length === 0 || !user || !currentTenantId) {
      toast.error("Please select a supplier and at least one item.");
      return;
    }
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      const { data: branches } = await supabase.from('branches').select('id').eq('tenant_id', currentTenantId).eq('module_key', 'retail').limit(1);
      const branchId = branches?.[0]?.id || currentTenantId;

      const subtotal = newPoItems.reduce((acc, curr) => acc + (curr.qty * curr.price), 0);
      const estimatedGst = subtotal * 0.18;
      const totalAmount = subtotal + estimatedGst;
      
      const { data: po, error: poErr } = await supabase.from('purchase_orders').insert({
        tenant_id: currentTenantId,
        branch_id: branchId,
        supplier_id: newPoSupplier,
        po_number: `PO-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        status: 'ordered',
        total_amount: totalAmount,
        created_by: user.id
      }).select().single();

      if (poErr) throw poErr;

      const poItems = newPoItems.map((item: any) => ({
        purchase_order_id: po.id,
        product_id: item.product_id,
        ordered_quantity: item.qty,
        unit_cost: item.price,
        line_total: item.qty * item.price,
        received_quantity: 0
      }));

      const { data: insertedItems, error: itemsErr } = await supabase.from('purchase_order_items').insert(poItems).select();
      if (itemsErr) throw itemsErr;

      // Automatically receive the goods to maintain stock
      const receipts = insertedItems.map((item: any) => ({ po_item_id: item.id, received_now: item.ordered_quantity }));
      const { error: receiveErr } = await supabase.rpc('receive_purchase_order_partial', {
        p_purchase_order_id: po.id,
        p_receipts: receipts,
        p_received_by: user.id
      });
      if (receiveErr) console.error("Error receiving goods:", receiveErr);

      toast.success("Purchase order created and stock received successfully.");
      setShowAddModal(false);
      setNewPoSupplier('');
      setNewPoItems([]);
      fetchPOs();
    } catch (err: any) {
      toast.error(err.message || "Failed to create PO");
    } finally {
      setLoading(false);
    }
  };


  const [receiveModalPo, setReceiveModalPo] = useState<any>(null);
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({});
  const [receiveBatchNumbers, setReceiveBatchNumbers] = useState<Record<string, string>>({});
  const [receiveExpiryDates, setReceiveExpiryDates] = useState<Record<string, string>>({});

  const handleReceiveGoods = async () => {
    if (!receiveModalPo || !user) return;
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const receipts = Object.entries(receiveQuantities)
      .filter(([_, qty]: [string, any]) => qty > 0)
      .map(([id, qty]) => ({
        po_item_id: id,
        received_now: qty,
        batch_number: receiveBatchNumbers[id] || null,
        expiry_date: receiveExpiryDates[id] || null
      }));

    if (receipts.length === 0) {
      toast.error('Enter at least one quantity to receive');
      setLoading(false);
      return;
    }

    const { error } = await supabase.rpc('receive_purchase_order_partial', {
      p_purchase_order_id: receiveModalPo.id,
      p_receipts: receipts,
      p_received_by: user.id
    });

    setLoading(false);
    if (error) {
      console.error('Save failed:', error);
      toast.error(`Failed to save: ${error.message}`);
    } else {
      toast.success('Goods received successfully');
      setReceiveModalPo(null);
      fetchPOs();
    }
  };

  const [invoiceModalPo, setInvoiceModalPo] = useState<any>(null);
  const [invNum, setInvNum] = useState('');
  const [invDate, setInvDate] = useState('');
  const [invGst, setInvGst] = useState('18');

  const handleCreateInvoice = async () => {
    if (!invoiceModalPo || !user || !invNum || !invDate) return;
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { error } = await supabase.rpc('create_purchase_invoice_from_po', {
      p_purchase_order_id: invoiceModalPo.id,
      p_supplier_invoice_number: invNum,
      p_supplier_invoice_date: invDate,
      p_gst_rate_percent: parseFloat(invGst),
      p_seller_state_code: '27',
      p_buyer_state_code: '27',
      p_created_by: user.id
    });

    setLoading(false);
    if (error) {
      console.error('Save failed:', error);
      toast.error(`Failed to save: ${error.message}`);
    } else {
      toast.success('Purchase invoice created');
      setInvoiceModalPo(null);
      fetchPOs();
      fetchPayables();
    }
  };

  const [payModalSupplier, setPayModalSupplier] = useState<any>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('bank');
  const [payRef, setPayRef] = useState('');

  const handleRecordPayment = async () => {
    if (!payModalSupplier || !user || !payAmount) return;
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) return;

    // We pass branch_id as null or from a known source, let's use the first branch
    const { data: branches } = await supabase.from('branches').select('id').eq('tenant_id', currentTenantId).eq('module_key', 'retail').limit(1);
    const branchId = branches?.[0]?.id;

    const { error } = await supabase.rpc('record_supplier_payment', {
      p_tenant_id: currentTenantId,
      p_branch_id: branchId,
      p_supplier_id: payModalSupplier.supplier_id,
      p_purchase_invoice_id: null,
      p_amount: parseFloat(payAmount),
      p_payment_method: payMethod,
      p_reference_note: payRef,
      p_created_by: user.id
    });

    setLoading(false);
    if (error) {
      console.error('Save failed:', error);
      toast.error(`Failed to save: ${error.message}`);
    } else {
      toast.success('Payment recorded successfully');
      setPayModalSupplier(null);
      fetchPayables();
    }
  };

  return (
    <div className="space-y-6">
      {onBack && (
        <Button variant="ghost" onClick={onBack} className="gap-2">← Back to Documents</Button>
      )}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Purchases</h2>
          <p className="text-slate-500 dark:text-slate-400">Manage purchase orders and supplier payables.</p>
        </div>
        <div className="flex gap-2">
          <Button variant={activeTab === 'pos' ? 'default' : 'outline'} onClick={() => setActiveTab('pos')}>Purchase Orders</Button>
          <Button variant={activeTab === 'payables' ? 'default' : 'outline'} onClick={() => setActiveTab('payables')}>Supplier Payables</Button>
        </div>
      </div>

      {activeTab === 'pos' && (
        <div className="space-y-4">
          <Button onClick={() => setShowAddModal(true)}><Plus size={16} className="mr-2" /> Add New</Button>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {['draft', 'ordered', 'partially_received', 'received'].map(status => (
              <div key={status} className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 min-h-[500px]">
                <h3 className="font-bold text-slate-700 dark:text-slate-300 capitalize mb-4 flex justify-between">
                  {status.replace('_', ' ')}
                  <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 rounded-full text-sm">{pos.filter(p => p.status === status).length}</span>
                </h3>
                <div className="space-y-3">
                  {pos.filter(p => p.status === status).map(po => (
                    <Card key={po.id} className="border-none shadow-sm cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-sm">{po.po_number}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(po.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400 line-clamp-1">{po.suppliers?.supplier_name}</div>
                        <div className="text-sm font-medium">Total: ₹{po.total_amount}</div>
                        
                        <div className="pt-2 flex flex-col gap-2">
                          {['ordered', 'partially_received'].includes(status) && (
                            <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => {
                              setReceiveQuantities({});
                              setReceiveModalPo(po);
                            }}>
                              <PackageSearch size={14} className="mr-1" /> Receive Goods
                            </Button>
                          )}
                          {['partially_received', 'received'].includes(status) && !po.purchase_invoice_id && (
                            <Button size="sm" className="w-full text-xs" onClick={() => {
                              setInvNum(''); setInvDate(new Date().toISOString().split('T')[0]);
                              setInvoiceModalPo(po);
                            }}>
                              <CheckCircle size={14} className="mr-1" /> Create Invoice
                            </Button>
                          )}
                          {po.purchase_invoice_id && (
                            <span className="text-xs text-green-600 flex items-center bg-green-50 p-1 rounded">
                              <CheckCircle size={12} className="mr-1" /> Invoiced
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'payables' && (
        <div className="space-y-4">
          <Card className="border-none shadow-sm bg-white dark:bg-slate-950 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b">
                  <tr>
                    <th className="p-4 font-medium">Supplier</th>
                    <th className="p-4 font-medium">Total Invoiced</th>
                    <th className="p-4 font-medium">Total Paid</th>
                    <th className="p-4 font-medium">Outstanding</th>
                    <th className="p-4 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {payables.map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                      <td className="p-4 font-medium">{p.supplier_name}</td>
                      <td className="p-4">₹{p.total_invoiced}</td>
                      <td className="p-4">₹{p.total_paid}</td>
                      <td className={`p-4 font-bold ${p.outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        ₹{p.outstanding}
                      </td>
                      <td className="p-4">
                        {p.outstanding > 0 && (
                          <Button size="sm" onClick={() => {
                            setPayAmount(p.outstanding.toString());
                            setPayModalSupplier(p);
                          }}>Record Payment</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {payables.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-500 dark:text-slate-400">No payables data found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Receive Goods Modal */}
      
      {/* Add PO Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-3xl bg-white dark:bg-slate-950 shadow-xl border-none max-h-[90vh] overflow-y-auto">
            <CardHeader className="border-b">
              <CardTitle>Add New Purchase</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Add Products</label>
                <div className="relative">
                  <PackageSearch className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Search products to add..." 
                    className="pl-9"
                    value={poSearchTerm}
                    onChange={e => setPoSearchTerm(e.target.value)}
                  />
                  {poSearchTerm && (
                    <div className="absolute top-10 left-0 w-full bg-white dark:bg-slate-950 border shadow-lg z-50 max-h-48 overflow-y-auto rounded-md">
                      {products.filter(p => p.product_name.toLowerCase().includes(poSearchTerm.toLowerCase())).map(p => (
                        <div key={p.id} className="p-2 border-b cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900" onClick={() => handleAddProductToPo(p)}>
                          {p.product_name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Select Supplier</label>
                <select 
                  className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-md"
                  value={newPoSupplier}
                  onChange={e => setNewPoSupplier(e.target.value)}
                >
                  <option value="">-- Choose Supplier --</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
                </select>
              </div>

              {newPoItems.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900">
                      <tr>
                        <th className="p-2">Item</th>
                        <th className="p-2 w-24">Qty</th>
                        <th className="p-2 w-32">Unit Price (₹)</th>
                        <th className="p-2 w-32 text-right">Total</th>
                        <th className="p-2 w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {newPoItems.map((item, idx) => (
                        <tr key={item.product_id}>
                          <td className="p-2">{item.name}</td>
                          <td className="p-2">
                            <Input 
                              type="number" 
                              min="1" 
                              className="h-8"
                              value={item.qty}
                              onChange={e => {
                                const newItems = [...newPoItems];
                                newItems[idx].qty = parseInt(e.target.value) || 0;
                                setNewPoItems(newItems);
                              }}
                            />
                          </td>
                          <td className="p-2">
                            <Input 
                              type="number" 
                              min="0"
                              step="0.01" 
                              className="h-8"
                              value={item.price}
                              onChange={e => {
                                const newItems = [...newPoItems];
                                newItems[idx].price = parseFloat(e.target.value) || 0;
                                setNewPoItems(newItems);
                              }}
                            />
                          </td>
                          <td className="p-2 text-right font-medium">
                            ₹{(item.qty * item.price).toFixed(2)}
                          </td>
                          <td className="p-2 text-center">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 text-red-500 p-0"
                              onClick={() => setNewPoItems(newPoItems.filter(i => i.product_id !== item.product_id))}
                            >
                              ✕
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="border-t bg-white dark:bg-slate-950 p-4 space-y-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-slate-500 dark:text-slate-400">
                        <span>Subtotal</span>
                        <span>₹{newPoItems.reduce((acc, curr) => acc + (curr.qty * curr.price), 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-500 dark:text-slate-400">
                        <span>Estimated GST (18%)</span>
                        <span>₹{(newPoItems.reduce((acc, curr) => acc + (curr.qty * curr.price), 0) * 0.18).toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between font-bold text-xl text-slate-900 dark:text-slate-100 pt-2 border-t">
                      <span>Total Amount</span>
                      <span>₹{(newPoItems.reduce((acc, curr) => acc + (curr.qty * curr.price), 0) * 1.18).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button onClick={handleSavePurchaseOrder} disabled={loading || !newPoSupplier || newPoItems.length === 0}>
                  {loading ? 'Saving...' : 'Place Purchase Order'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {receiveModalPo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-white dark:bg-slate-950 shadow-xl border-none">
            <CardHeader className="border-b">
              <CardTitle>Receive Goods: {receiveModalPo.po_number}</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900">
                    <tr>
                      <th className="p-2">Item</th>
                      <th className="p-2 text-center">Ordered</th>
                      <th className="p-2 text-center">Received</th>
                      <th className="p-2 text-center">Remaining</th>
                      <th className="p-2 w-28">Receive Now</th>
                      <th className="p-2 w-32">Batch #</th>
                      <th className="p-2 w-32">Expiry Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {receiveModalPo.purchase_order_items.map((item: any) => {
                      const remaining = item.ordered_quantity - item.received_quantity;
                      return (
                        <tr key={item.id}>
                          <td className="p-2 truncate max-w-[150px]">{item.products?.product_name || 'Unknown Product'}</td>
                          <td className="p-2 text-center">{item.ordered_quantity}</td>
                          <td className="p-2 text-center">{item.received_quantity}</td>
                          <td className="p-2 text-center font-bold">{remaining}</td>
                          <td className="p-2">
                            <Input 
                              type="number" 
                              min="0" 
                              max={remaining}
                              disabled={remaining === 0}
                              value={receiveQuantities[item.id] !== undefined ? receiveQuantities[item.id] : (remaining > 0 ? remaining : 0)}
                              onChange={(e) => setReceiveQuantities(prev => ({...prev, [item.id]: parseFloat(e.target.value) || 0}))}
                              className="h-8"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              placeholder="Optional"
                              disabled={remaining === 0}
                              value={receiveBatchNumbers[item.id] || ''}
                              onChange={(e) => setReceiveBatchNumbers(prev => ({...prev, [item.id]: e.target.value}))}
                              className="h-8"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="date"
                              disabled={remaining === 0}
                              value={receiveExpiryDates[item.id] || ''}
                              onChange={(e) => setReceiveExpiryDates(prev => ({...prev, [item.id]: e.target.value}))}
                              className="h-8"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setReceiveModalPo(null)}>Cancel</Button>
                <Button onClick={handleReceiveGoods} disabled={loading}>{loading ? 'Processing...' : 'Confirm Receipt'}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Invoice Modal */}
      {invoiceModalPo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white dark:bg-slate-950 shadow-xl border-none">
            <CardHeader className="border-b">
              <CardTitle>Create Purchase Invoice</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Supplier Invoice Number</label>
                <Input value={invNum} onChange={e => setInvNum(e.target.value)} placeholder="INV-2023-..." />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Invoice Date</label>
                <Input type="date" value={invDate} onChange={e => setInvDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Avg GST Rate (%)</label>
                <Input type="number" value={invGst} onChange={e => setInvGst(e.target.value)} />
              </div>
              <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
                Ensure accounts <strong>PURCHASES</strong>, <strong>GST-INPUT</strong>, and <strong>ACCOUNTS-PAYABLE</strong> exist in Chart of Accounts for auto-journaling.
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setInvoiceModalPo(null)}>Cancel</Button>
                <Button onClick={handleCreateInvoice} disabled={loading || !invNum || !invDate}>Create Invoice</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payment Modal */}
      {payModalSupplier && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white dark:bg-slate-950 shadow-xl border-none">
            <CardHeader className="border-b">
              <CardTitle>Record Payment: {payModalSupplier.supplier_name}</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <span className="text-sm text-slate-500 dark:text-slate-400">Outstanding Balance</span>
                <span className="font-bold text-red-600">₹{payModalSupplier.outstanding}</span>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount to Pay</label>
                <Input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} max={payModalSupplier.outstanding} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Method</label>
                <div className="flex gap-2">
                  {['cash', 'bank', 'razorpay'].map(m => (
                    <Button 
                      key={m} 
                      variant={payMethod === m ? 'default' : 'outline'}
                      onClick={() => setPayMethod(m)}
                      className="flex-1 capitalize"
                    >{m}</Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Reference Note</label>
                <Input value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="Txn ID or remarks..." />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setPayModalSupplier(null)}>Cancel</Button>
                <Button onClick={handleRecordPayment} disabled={loading || !payAmount}>Record Payment</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
