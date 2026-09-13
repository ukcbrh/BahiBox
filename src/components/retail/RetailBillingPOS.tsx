import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Search, Plus, Minus, Trash2, Printer, CheckCircle2, PauseCircle, Phone, User, Wallet, CreditCard, X } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import { getSupabaseClient } from '../../lib/supabase';
import { toast } from 'sonner';
import { tenantScopedKey } from '@/src/lib/tenantStorage';

interface Product {
  id: string;
  product_name: string;
  barcode: string;
  selling_price: number;
  hsn_sac_id?: string;
  unit_id?: string;
}

interface CartItem {
  product_id: string;
  product_name: string;
  quantity: number;
  selling_price: number;
  discount_type: 'percent' | 'fixed' | 'none';
  discount_value: number;
}

export function RetailBillingPOS() {
  const { tenant } = useTenant();
  const { user, currentTenantId } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [paymentMethod, setPaymentMethod] = useState<'cash'|'razorpay'|'wallet'|'credit'>('cash');
  const [loading, setLoading] = useState(false);
  const [receiptData, setReceiptData] = useState<{items: CartItem[], total: number, date: string, invoiceNumber: string, customerName?: string, discount: number, tax: number, subtotal: number, redeemWalletAmount: number} | null>(null);

  // Customer Management
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [redeemWalletAmount, setRedeemWalletAmount] = useState<number>(0);

  useEffect(() => {
    if (!currentTenantId) return;
    const fetchProducts = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data } = await supabase.from('products').select('*').eq('tenant_id', currentTenantId).eq('is_active', true);
      if (data) setProducts(data);
    };
    
    const fetchCustomers = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data } = await supabase.from('retail_customers').select('*, credit_limits(*)').eq('tenant_id', currentTenantId).neq('enable', false);
      if (data) setCustomers(data);
    };

    fetchProducts();
    fetchCustomers();
  }, [currentTenantId]);

  useEffect(() => {
    if (selectedCustomer) {
      const fetchWallet = async () => {
        const supabase = getSupabaseClient();
        if (!supabase || !tenant) return;
        const { data: walletId } = await supabase.rpc('get_or_create_customer_wallet', { 
          p_tenant_id: currentTenantId, 
          p_customer_id: selectedCustomer.id 
        });
        if (walletId) {
          const { data: accs } = await supabase.from('wallet_accounts').select('current_balance').eq('id', walletId).single();
          if (accs) setWalletBalance(Number(accs.current_balance) || 0);
        }
      };
      fetchWallet();
    } else {
      setWalletBalance(0);
      setRedeemWalletAmount(0);
    }
  }, [selectedCustomer]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(p => p.product_id === product.id);
      if (existing) {
        return prev.map(p => p.product_id === product.id ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, {
        product_id: product.id,
        product_name: product.product_name,
        quantity: 1,
        selling_price: product.selling_price,
        discount_type: 'none',
        discount_value: 0
      }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(p => {
      if (p.product_id === productId) {
        const newQ = p.quantity + delta;
        return newQ > 0 ? { ...p, quantity: newQ } : p;
      }
      return p;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(p => p.product_id !== productId));
  };

  const filteredProducts = products.filter(p => 
    p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.barcode && p.barcode.includes(searchTerm))
  );

  const subtotal = cart.reduce((sum, item) => sum + (item.selling_price * item.quantity), 0);
  const totalDiscount = cart.reduce((sum, item) => {
    if (item.discount_type === 'percent') return sum + (item.selling_price * item.quantity * item.discount_value / 100);
    if (item.discount_type === 'fixed') return sum + item.discount_value;
    return sum;
  }, 0);
  
  const taxable = subtotal - totalDiscount;
  const estimatedGst = taxable * 0.18; // 18% generic for display
  const grandTotal = taxable + estimatedGst;

  const handlePrint = (cartToPrint: CartItem[], total: number, invoiceNum?: string) => {
    let printerSize = '80mm';
    let prefix = 'INV-';
    
    try {
      const saved = localStorage.getItem(tenantScopedKey('posSettings', currentTenantId));
      if (saved) {
        const settings = JSON.parse(saved);
        if (settings['instore']) {
          printerSize = settings['instore'].printerSize || '80mm';
          prefix = settings['instore'].prefix || 'INV-';
        }
      }
    } catch (e) {}
    
    let maxWidth = '300px';
    let fontSize = '14px';
    if (printerSize === 'A4') {
      maxWidth = '800px';
      fontSize = '16px';
    } else if (printerSize === '112mm') {
      maxWidth = '400px';
      fontSize = '15px';
    } else if (printerSize === '58mm') {
      maxWidth = '200px';
      fontSize = '12px';
    }
    
    const printInv = invoiceNum ? invoiceNum : `${prefix}${Math.floor(Math.random()*1000000)}`;

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    const printWindow = iframe.contentWindow;
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt</title>
            <style>
              body { font-family: monospace; padding: 20px; max-width: ${maxWidth}; margin: 0 auto; font-size: ${fontSize}; }
              .header { text-align: center; margin-bottom: 20px; }
              .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
              .total { font-weight: bold; border-top: 1px dashed #000; margin-top: 10px; padding-top: 10px; font-size: 1.2em; display: flex; justify-content: space-between; }
              .footer { text-align: center; margin-top: 20px; font-size: 0.9em; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>Retail POS</h2>
              <p>Invoice: ${printInv}</p>
              <p>${new Date().toLocaleString()}</p>
            </div>
            <hr style="border: 1px dashed #000; margin-bottom: 15px;" />
            ${cartToPrint.map(item => `
              <div class="item">
                <span>${item.product_name} x ${item.quantity}</span>
                <span>${(item.quantity * item.selling_price).toFixed(2)}</span>
              </div>
            `).join('')}
            <div class="total">
              <span>TOTAL</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <div class="footer">Thank you for shopping!</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        document.body.removeChild(iframe);
      }, 200);
    }
  };

  const handleCharge = async () => {
    if (cart.length === 0) return toast.error("Cart is empty");
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase || !tenant || !user) { setLoading(false); return; }

    try {
      if (paymentMethod === 'credit' && selectedCustomer) {
        const limit = selectedCustomer.credit_limits?.credit_limit_amount || 0;
        // Simple client-side check, actual logic should be RPC check_credit_limit
        const { data: checkRes, error: checkErr } = await supabase.rpc('check_credit_limit', {
          p_tenant_id: currentTenantId,
          p_party_type: 'customer',
          p_party_id: selectedCustomer.id,
          p_requested_amount: grandTotal
        });
        if (!checkRes?.approved) {
          throw new Error(`Credit limit exceeded. Available: ₹${checkRes?.available_credit}`);
        }
      }

      let { data: branches } = await supabase.from('branches').select('id').eq('tenant_id', currentTenantId).eq('module_key', 'retail').limit(1);
      let branchId = branches?.[0]?.id;
      if (!branchId) {
        // Auto-create a default branch
        const { data: newBranch } = await supabase.from('branches').insert({
          tenant_id: currentTenantId,
          branch_name: 'Main Branch',
          is_main_branch: true,
          status: 'active'
        }).select('id').single();
        if (newBranch) {
          branchId = newBranch.id;
        } else {
          throw new Error("Failed to create default branch. Please contact support.");
        }
      }

                 const rpcPayload = {
        p_tenant_id: currentTenantId,
        p_branch_id: branchId,
        p_cashier_id: user.id,
        p_customer_id: selectedCustomer?.id || null,
        p_pos_shift_id: null,
        p_payment_method: paymentMethod,
        p_seller_state_code: '27',
        p_buyer_state_code: '27',
        p_items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          discount_type: 'amount',
          discount_value: 0
        }))
      };

      const { data, error } = await supabase.rpc('create_pos_sale', rpcPayload);

      if (error) {
         console.error('RPC ERROR: ', JSON.stringify(error, null, 2));
         toast.error(error.message || 'Failed to complete sale');
         setLoading(false);
         return;
      }
      
      // Handle wallet redemption manually if requested and supported
      if (selectedCustomer && redeemWalletAmount > 0) {
        await supabase.rpc('customer_wallet_transaction', {
          p_tenant_id: currentTenantId,
          p_customer_id: selectedCustomer.id,
          p_type: 'debit',
          p_amount: redeemWalletAmount,
          p_description: 'Redeemed during POS sale',
          p_created_by: user.id
        });
      }

      
      let finalInvoiceNumber = 'INV-UNKNOWN';
      let finalInvoiceId = data; // data is the UUID returned by create_pos_sale

      if (data && typeof data === 'string') {
        const { data: invData } = await supabase
          .from('sales_invoices')
          .select('invoice_number')
          .eq('id', data)
          .single();
        if (invData) {
          finalInvoiceNumber = invData.invoice_number;
        }
      } else if (data && data.invoice_number) {
        // Just in case it actually returns an object
        finalInvoiceNumber = data.invoice_number;
        finalInvoiceId = data.sales_invoice_id || data.id;
      }
      
      toast.success('Sale completed successfully!');

      setReceiptData({
        items: [...cart],
        total: Math.max(0, grandTotal - redeemWalletAmount),
        date: new Date().toLocaleString(),
        invoiceNumber: finalInvoiceNumber,
        customerName: selectedCustomer?.customer_name,
        discount: totalDiscount,
        tax: estimatedGst,
        subtotal: subtotal,
        redeemWalletAmount: redeemWalletAmount
      });
      setCart([]);
      setSelectedCustomer(null);
      setRedeemWalletAmount(0);
    } catch (e: any) {
      console.error('Save failed:', e);
      toast.error(`Failed to save: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex gap-6">
      {/* Left side: Products */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search by product name or scan barcode..." 
              className="pl-9 h-12 bg-white dark:bg-slate-950"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && searchTerm) {
                  const match = products.find(p => p.barcode === searchTerm || p.product_name.toLowerCase() === searchTerm.toLowerCase());
                  if (match) {
                    addToCart(match);
                    setSearchTerm('');
                  }
                }
              }}
            />
          </div>
          <div className="relative w-64">
            <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <select
              className="pl-9 h-12 bg-white dark:bg-slate-950 border rounded-md w-full text-sm"
              value={selectedCustomer?.id || ''}
              onChange={e => setSelectedCustomer(customers.find(c => c.id === e.target.value) || null)}
            >
              <option value="">Select Customer (Optional)</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.customer_name} ({c.phone})</option>)}
            </select>
          </div>
        </div>

        {selectedCustomer && (
          <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-medium text-blue-900">{selectedCustomer.customer_name}</span>
              {walletBalance > 0 && (
                <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center gap-1">
                  <Wallet size={12}/> ₹{walletBalance.toFixed(2)}
                </span>
              )}
              {selectedCustomer.credit_limits && (
                <span className="text-sm bg-purple-100 text-purple-800 px-2 py-1 rounded-full flex items-center gap-1">
                  <CreditCard size={12}/> Limit: ₹{selectedCustomer.credit_limits.credit_limit_amount}
                </span>
              )}
            </div>
            {walletBalance > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-blue-700">Redeem:</span>
                <Input 
                  type="number" 
                  className="w-24 h-8 bg-white dark:bg-slate-950" 
                  max={Math.min(walletBalance, grandTotal)} 
                  value={redeemWalletAmount}
                  onChange={e => setRedeemWalletAmount(Math.min(Number(e.target.value), walletBalance, grandTotal))}
                />
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto pr-2">
          <div className="grid grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(p => (
              <Card key={p.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => addToCart(p)}>
                <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2 h-32">
                  <span className="font-medium line-clamp-2">{p.product_name}</span>
                  <span className="text-primary font-bold">₹{p.selling_price}</span>
                </CardContent>
              </Card>
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-500 dark:text-slate-400">No products found</div>
            )}
          </div>
        </div>
      </div>

      {/* Right side: Cart */}
      <Card className="w-96 flex flex-col shadow-sm border-none bg-white dark:bg-slate-950 overflow-hidden shrink-0">
        <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b py-4">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Current Sale</span>
            <span className="bg-primary/10 text-primary text-sm px-2 py-1 rounded-full">{cart.length} items</span>
          </CardTitle>
        </CardHeader>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
              <Search className="h-8 w-8 opacity-20" />
              <p>Scan or select items</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product_id} className="flex flex-col gap-2 p-3 border rounded-xl bg-slate-50 dark:bg-slate-900">
                <div className="flex justify-between items-start">
                  <span className="font-medium text-slate-900 dark:text-slate-100">{item.product_name}</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">₹{(item.selling_price * item.quantity).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-950 border rounded-lg overflow-hidden">
                    <button onClick={() => updateQuantity(item.product_id, -1)} className="px-3 py-1 hover:bg-slate-100 dark:hover:bg-slate-800"><Minus size={14}/></button>
                    <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product_id, 1)} className="px-3 py-1 hover:bg-slate-100 dark:hover:bg-slate-800"><Plus size={14}/></button>
                  </div>
                  <button onClick={() => removeFromCart(item.product_id)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals & Actions */}
        <div className="border-t bg-white dark:bg-slate-950 p-4 space-y-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-₹{totalDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Estimated GST (18%)</span>
              <span>₹{estimatedGst.toFixed(2)}</span>
            </div>
            {redeemWalletAmount > 0 && (
              <div className="flex justify-between text-blue-600 font-medium">
                <span>Wallet Redeemed</span>
                <span>-₹{redeemWalletAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-xl text-slate-900 dark:text-slate-100 pt-2 border-t">
              <span>Net Payable</span>
              <span>₹{Math.max(0, grandTotal - redeemWalletAmount).toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant={paymentMethod === 'cash' ? 'default' : 'outline'} onClick={() => setPaymentMethod('cash')}>Cash</Button>
            <Button variant={paymentMethod === 'razorpay' ? 'default' : 'outline'} onClick={() => setPaymentMethod('razorpay')}>Card/UPI</Button>
            {selectedCustomer && selectedCustomer.credit_limits && (
              <Button variant={paymentMethod === 'credit' ? 'default' : 'outline'} onClick={() => setPaymentMethod('credit')} className="col-span-2">Bill to Credit Account</Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => {setCart([]); setSelectedCustomer(null);}}>
              <PauseCircle className="h-4 w-4 mr-2" /> Cancel
            </Button>
            <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleCharge} disabled={loading || cart.length === 0}>
              <CheckCircle2 className="h-4 w-4 mr-2" /> Charge
            </Button>
          </div>
        </div>
      </Card>

      {/* Receipt Modal */}
      {receiptData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" 
            onClick={() => setReceiptData(null)}
          ></div>
          <div className="bg-white dark:bg-slate-950 p-8 rounded-2xl shadow-2xl relative z-10 w-[600px] flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-start mb-6 print:hidden">
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Checkout Success</h2>
              <button onClick={() => setReceiptData(null)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"><X size={20}/></button>
            </div>

            <div className="flex-1 overflow-y-auto mb-6 px-4 py-6 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 relative print:border-none print:bg-white dark:bg-slate-950 print:p-0">
              <div className="text-center mb-6">
                <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight uppercase mb-1">{tenant?.brand_name || 'Retail POS'}</h1>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Tax Invoice / Receipt</p>
              </div>

              <div className="flex justify-between items-end mb-6 pb-6 border-b border-slate-200 dark:border-slate-800 border-dashed">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Date & Time</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{receiptData.date}</p>
                  {receiptData.customerName && (
                    <>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-3 mb-1">Customer</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{receiptData.customerName}</p>
                    </>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Invoice Number</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{receiptData.invoiceNumber}</p>
                </div>
              </div>

              <div className="mb-6">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-200 dark:border-slate-800">
                      <th className="py-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Item</th>
                      <th className="py-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Qty</th>
                      <th className="py-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Price</th>
                      <th className="py-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {receiptData.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-3 text-sm font-semibold text-slate-800 dark:text-slate-200">{item.product_name}</td>
                        <td className="py-3 text-sm font-medium text-slate-600 dark:text-slate-400 text-center">{item.quantity}</td>
                        <td className="py-3 text-sm font-medium text-slate-600 dark:text-slate-400 text-right">₹{item.selling_price.toFixed(2)}</td>
                        <td className="py-3 text-sm font-bold text-slate-900 dark:text-slate-100 text-right">₹{(item.selling_price * item.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t-2 border-slate-200 dark:border-slate-800 pt-4 space-y-2">
                <div className="flex justify-between text-sm font-medium text-slate-500 dark:text-slate-400">
                  <span>Subtotal</span>
                  <span>₹{receiptData.subtotal.toFixed(2)}</span>
                </div>
                {receiptData.discount > 0 && (
                  <div className="flex justify-between text-sm font-medium text-green-600">
                    <span>Discount</span>
                    <span>-₹{receiptData.discount.toFixed(2)}</span>
                  </div>
                )}
                {receiptData.tax > 0 && (
                  <div className="flex justify-between text-sm font-medium text-slate-500 dark:text-slate-400">
                    <span>GST (Estimated)</span>
                    <span>₹{receiptData.tax.toFixed(2)}</span>
                  </div>
                )}
                {receiptData.redeemWalletAmount > 0 && (
                  <div className="flex justify-between text-sm font-medium text-blue-600">
                    <span>Wallet Redeemed</span>
                    <span>-₹{receiptData.redeemWalletAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-4 mt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-base font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Grand Total</span>
                  <span className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">₹{receiptData.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4 print:hidden mt-auto">
              <Button className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-200" onClick={() => handlePrint(receiptData.items, receiptData.total, receiptData.invoiceNumber)}>
                <Printer size={18} className="mr-2" /> Print Receipt
              </Button>
              <Button variant="outline" className="flex-1 h-12 font-bold" onClick={() => setReceiptData(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
