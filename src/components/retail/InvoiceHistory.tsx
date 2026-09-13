import React, { useState, useEffect } from 'react';
import { getSupabaseClient } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { printBillForChannel, BillData } from '../../lib/billRenderer';
import { Printer, Search, Calendar, FileText, Trash2, Edit } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import { tenantScopedKey } from '@/src/lib/tenantStorage';

export default function InvoiceHistory(props: { onEditInvoice?: (invoice: any) => void }) {
  const { currentTenantId, activeBranchId } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'retail' | 'scan_go' | 'online'>('all');

  useEffect(() => {
    
    const fetchInvoices = async () => {
      if (!currentTenantId) return;
      setLoading(true);
      
      let allInvoices: any[] = [];
      
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase
          .from('sales_invoices')
          .select('*')
          .eq('tenant_id', currentTenantId)
          .order('created_at', { ascending: false });
        
        if (data && data.length > 0) {
          // Fetch items separately to avoid relationship errors
          const invoiceIds = data.map((i: any) => i.id);
          const customerIds = [...new Set(data.map((i: any) => i.customer_id).filter(Boolean))];

          const [{ data: itemsData }, { data: customersData }] = await Promise.all([
            supabase.from('sales_invoice_items').select('*').in('sales_invoice_id', invoiceIds),
            customerIds.length > 0 ? supabase.from('retail_customers').select('id, customer_name, phone, address').in('id', customerIds) : Promise.resolve({ data: [] })
          ]);
            
          if (itemsData) {
            data.forEach((inv: any) => {
              inv.sales_invoice_items = itemsData.filter((item: any) => item.sales_invoice_id === inv.id);
            });
          }
          if (customersData) {
            data.forEach((inv: any) => {
              const cust = customersData.find((c: any) => c.id === inv.customer_id);
              if (cust) {
                inv.retail_customers = { customer_name: cust.customer_name, phone: cust.phone, address: cust.address };
              }
            });
          }
          
          allInvoices = data;
        }
          
        if (error) console.error('fetchInvoices error:', error);
      }
      
      setInvoices(allInvoices.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setLoading(false);
    };


    fetchInvoices();
  }, [currentTenantId]);

  const handlePrintShippingLabel = async (invoice: any) => {
    const supabase = getSupabaseClient();
    if (!supabase || !invoice.reference_id) {
      alert('Shipping address not available for this invoice.');
      return;
    }
    const { data: orderData } = await supabase
      .from('orders')
      .select('delivery_address, customer_phone, customer_name')
      .eq('id', invoice.reference_id)
      .single();

    if (!orderData) {
      alert('Could not find the linked order for this invoice.');
      return;
    }

    const shortId = (invoice.invoice_number || invoice.id).toString();

    const labelHtml = `
      <html>
        <head>
          <title>Shipping Label - ${shortId}</title>
          <style>
            body { font-family: sans-serif; padding: 24px; max-width: 380px; margin: 0 auto; }
            .box { border: 2px solid #000; padding: 16px; border-radius: 6px; }
            .label-title { font-size: 11px; letter-spacing: 1px; color: #555; text-transform: uppercase; margin-bottom: 4px; }
            .name { font-size: 20px; font-weight: bold; margin-bottom: 6px; }
            .address { font-size: 15px; line-height: 1.5; margin-bottom: 14px; }
            .phone { font-size: 14px; margin-bottom: 14px; }
            .order-id { font-size: 12px; color: #666; border-top: 1px dashed #999; padding-top: 10px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="box">
            <div class="label-title">Ship To</div>
            <div class="name">${orderData.customer_name || invoice.retail_customers?.customer_name || 'N/A'}</div>
            <div class="address">${orderData.delivery_address || 'No address on file'}</div>
            <div class="phone">Phone: ${orderData.customer_phone || 'N/A'}</div>
            <div class="order-id">Invoice #${shortId}</div>
          </div>
        </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    const win = iframe.contentWindow;
    if (win) {
      win.document.write(labelHtml);
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
        setTimeout(() => document.body.removeChild(iframe), 500);
      }, 200);
    }
  };

  const handlePrint = async (invoice: any) => {
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) return;

    const { data: branchInfo } = activeBranchId
      ? await supabase.from('branches').select('branch_name, address, upi_id').eq('id', activeBranchId).maybeSingle()
      : { data: null };
    const { data: brandingInfo } = await supabase.from('print_branding_settings').select('*').eq('tenant_id', currentTenantId).maybeSingle();
    const { data: tenantData } = await supabase.from('tenants').select('business_name').eq('id', currentTenantId).maybeSingle();

    const printInv = invoice.invoice_number || `INV-${invoice.id}`;

    const billData: BillData = {
      business: {
        name: tenantData?.business_name || 'Your Business',
        branch_name: branchInfo?.branch_name,
        address: branchInfo?.address,
        show_branch_name: brandingInfo?.show_branch_name !== false,
        show_branch_address: brandingInfo?.show_branch_address !== false,
        stamp_url: brandingInfo?.stamp_url
      },
      customer: invoice.retail_customers?.customer_name ? { name: invoice.retail_customers.customer_name, phone: invoice.retail_customers.phone, address: invoice.retail_customers.address } : undefined,
      meta: { label: 'Tax Invoice (Sale)', number: printInv, date: new Date(invoice.created_at).toLocaleDateString() },
      items: (invoice.sales_invoice_items || []).map((item: any) => ({
        name: item.item_name || item.product_name,
        hsn: item.hsn_code,
        qty: item.quantity,
        rate: item.price || item.selling_price,
        amount: (item.quantity * (item.price || item.selling_price)) - (item.discount_value || 0)
      })),
      totals: {
        subtotal: (invoice.sales_invoice_items || []).reduce((s: number, item: any) => s + (item.quantity * (item.price || item.selling_price)), 0),
        grand_total: Number(invoice.total_amount)
      },
      footer: {
        stamp_url: brandingInfo?.stamp_url
      },
      bill_number_code_type: brandingInfo?.bill_number_code_type || 'none',
      upi_payment: (invoice.status === 'issued' && brandingInfo?.show_upi_qr_on_credit)
        ? ((brandingInfo?.credit_qr_provider || 'razorpay') === 'razorpay'
            ? (invoice.payment_qr_image_url ? { qr_image_url: invoice.payment_qr_image_url, amount: Number(invoice.total_amount) } : undefined)
            : (branchInfo?.upi_id ? { upi_id: branchInfo.upi_id, payee_name: tenantData?.business_name || 'Merchant', amount: Number(invoice.total_amount) } : undefined))
        : undefined
    };

    await printBillForChannel(supabase, currentTenantId, 'sale_invoice', billData, 'A4');
  };
  
  const handleDelete = async (invoice: any) => {
    if (!confirm('Are you sure you want to delete this invoice? This will return items to stock.')) return;
    
    const supabase = getSupabaseClient();
    if (!supabase) return;
    
    setLoading(true);
    
    try {
      // Restore stock
      if (invoice.sales_invoice_items && invoice.sales_invoice_items.length > 0) {
        for (const item of invoice.sales_invoice_items) {
          const { data: stock } = await supabase.from('product_stock')
            .select('id, current_quantity')
            .eq('product_id', item.product_id)
            .limit(1);
          if (stock && stock.length > 0) {
            await supabase.from('product_stock')
              .update({ current_quantity: stock[0].current_quantity + item.quantity })
              .eq('id', stock[0].id);
          }
        }
      }
      
      // Delete invoice (child records first, per Deletion Safety Rule)
      const { error: paymentsDeleteError } = await supabase.from('customer_payments').delete().eq('sales_invoice_id', invoice.id);
      if (paymentsDeleteError) throw new Error('Failed to delete related payments: ' + paymentsDeleteError.message);
      const { error: itemsDeleteError } = await supabase.from('sales_invoice_items').delete().eq('sales_invoice_id', invoice.id);
      if (itemsDeleteError) throw new Error('Failed to delete invoice items: ' + itemsDeleteError.message);
      const { error: invoiceDeleteError } = await supabase.from('sales_invoices').delete().eq('id', invoice.id);
      if (invoiceDeleteError) throw new Error('Failed to delete invoice: ' + invoiceDeleteError.message);

      // Delete from local storage
      try {
        const existingInvoicesStr = localStorage.getItem(tenantScopedKey('local_sales_invoices', currentTenantId));
        if (existingInvoicesStr) {
          const existingInvoices = JSON.parse(existingInvoicesStr);
          const newInvoices = existingInvoices.filter((i: any) => i.id !== invoice.id);
          localStorage.setItem(tenantScopedKey('local_sales_invoices', currentTenantId), JSON.stringify(newInvoices));
        }
      } catch (e) {
        console.error('Failed to update local storage', e);
      }

      
      
      
      toast.success('Invoice deleted and stock restored');
      setInvoices(invoices.filter((inv: any) => inv.id !== invoice.id));
    } catch (error: any) {
      toast.error('Error deleting invoice: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  
  const handleEdit = async (invoice: any) => {
    if (!confirm('This will delete the current invoice, return items to stock, and load them into the POS for editing. Continue?')) return;
    
    const supabase = getSupabaseClient();
    if (!supabase) return;
    
    setLoading(true);
    
    try {
      // Restore stock
      if (invoice.sales_invoice_items && invoice.sales_invoice_items.length > 0) {
        for (const item of invoice.sales_invoice_items) {
          const { data: stock } = await supabase.from('product_stock')
            .select('id, current_quantity')
            .eq('product_id', item.product_id)
            .limit(1);
          if (stock && stock.length > 0) {
            await supabase.from('product_stock')
              .update({ current_quantity: stock[0].current_quantity + item.quantity })
              .eq('id', stock[0].id);
          }
        }
      }
      
      // Delete invoice
      await supabase.from('sales_invoice_items').delete().eq('sales_invoice_id', invoice.id);
      await supabase.from('sales_invoices').delete().eq('id', invoice.id);

      // Delete from local storage
      try {
        const existingInvoicesStr = localStorage.getItem(tenantScopedKey('local_sales_invoices', currentTenantId));
        if (existingInvoicesStr) {
          const existingInvoices = JSON.parse(existingInvoicesStr);
          const newInvoices = existingInvoices.filter((i: any) => i.id !== invoice.id);
          localStorage.setItem(tenantScopedKey('local_sales_invoices', currentTenantId), JSON.stringify(newInvoices));
        }
      } catch (e) {
        console.error('Failed to update local storage', e);
      }

      
      
      
      setInvoices(invoices.filter((inv: any) => inv.id !== invoice.id));
      
      if (props.onEditInvoice) {
        props.onEditInvoice(invoice);
      }
      
    } catch (error: any) {
      toast.error('Error preparing invoice for edit: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter((inv: any) => {
    const term = searchTerm.toLowerCase();
    let matchesTab = true;
    if (activeTab === 'retail') {
      matchesTab = inv.order_source === 'in_store' || !inv.order_source;
    } else if (activeTab === 'scan_go') {
      matchesTab = inv.order_source === 'scan_go';
    } else if (activeTab === 'online') {
      matchesTab = inv.module_code === 'online';
    }
    const matchesSearch = (inv.invoice_number && inv.invoice_number.toLowerCase().includes(term)) ||
      (inv.retail_customers?.customer_name && inv.retail_customers.customer_name.toLowerCase().includes(term)) ||
      (inv.status && inv.status.toLowerCase().includes(term));
    return matchesTab && matchesSearch;
  });

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <div className="p-4 md:p-6 bg-white dark:bg-slate-950 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm z-10">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <FileText className="text-blue-600" /> Invoice History
          </h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">View and print past sales invoices</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input 
            placeholder="Search invoice # or customer..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10 border-slate-300 dark:border-slate-700"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-950 border-b px-4 md:px-6 flex gap-4 overflow-x-auto whitespace-nowrap hide-scrollbar">
        <button 
          onClick={() => setActiveTab('retail')}
          className={`py-3 px-4 font-bold text-sm border-b-2 transition-colors ${activeTab === 'retail' ? 'border-slate-900 dark:border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-100' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
        >
          In-Store
        </button>
        <button 
          onClick={() => setActiveTab('scan_go')}
          className={`py-3 px-4 font-bold text-sm border-b-2 transition-colors ${activeTab === 'scan_go' ? 'border-slate-900 dark:border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-100' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
        >
          Scan & Go
        </button>
        <button 
          onClick={() => setActiveTab('online')}
          className={`py-3 px-4 font-bold text-sm border-b-2 transition-colors ${activeTab === 'online' ? 'border-slate-900 dark:border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-100' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
        >
          Online Orders
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-400">
            <FileText size={48} className="text-slate-300 mb-4" />
            <p className="font-bold text-lg text-slate-700 dark:text-slate-300">No invoices found</p>
            <p className="text-sm">Invoices generated from sales will appear here.</p>
          </div>
        ) : (
          <div className="border rounded-xl shadow-sm bg-white dark:bg-slate-950 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Invoice Details</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Customer</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Amount</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">{inv.invoice_number || 'N/A'}</div>
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                        <Calendar size={12} /> {new Date(inv.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{inv.retail_customers?.customer_name || 'Walk-in Customer'}</div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                        inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                        inv.status === 'pending' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                        'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                      }`}>
                        {inv.status || 'Paid'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="text-sm font-black text-slate-900 dark:text-slate-100">₹{Number(inv.total_amount).toFixed(2)}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{inv.sales_invoice_items?.length || 0} items</div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex justify-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handlePrint(inv)} className="h-8 shadow-sm text-blue-600 hover:text-blue-700">
                          <Printer size={14} className="mr-1" /> Print
                        </Button>
                        {inv.module_code === 'online' && (
                          <Button variant="outline" size="sm" onClick={() => handlePrintShippingLabel(inv)} className="h-8 shadow-sm text-purple-600 hover:text-purple-700">
                            <Printer size={14} className="mr-1" /> Print Label
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => handleEdit(inv)} className="h-8 shadow-sm text-amber-600 hover:text-amber-700">
                          <Edit size={14} className="mr-1" /> Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(inv)} className="h-8 shadow-sm text-red-600 hover:text-red-700">
                          <Trash2 size={14} className="mr-1" /> Delete
                        </Button>
                      </div>
</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
