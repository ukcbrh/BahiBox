import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Plus, Search, Eye, Printer, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { printBillForChannel, BillData } from '@/src/lib/billRenderer';
import { CreateDeliveryChallanInward } from './CreateDeliveryChallanInward';

export function DeliveryChallanInwardList({ onBack }: { onBack?: () => void } = {}) {
  const { currentTenantId, user, activeBranchId } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [challans, setChallans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewChallan, setViewChallan] = useState<any>(null);

  const fetchChallans = async () => {
    if (!currentTenantId) return;
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) { setLoading(false); return; }
    let query = supabase
      .from('delivery_challans_inward')
      .select('*, delivery_challan_inward_items(*)')
      .eq('tenant_id', currentTenantId);
    if (activeBranchId) {
      query = query.eq('branch_id', activeBranchId);
    }
    const { data } = await query.order('created_at', { ascending: false });
    setChallans(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchChallans(); }, [currentTenantId, activeBranchId]);
  useEffect(() => { fetchChallans(); }, [currentTenantId]);

  const reverseStockForChallan = async (challan: any) => {
    const supabase = getSupabaseClient();
    if (!supabase || !user) return;
    for (const item of challan.delivery_challan_inward_items || []) {
      if (item.product_id && item.quantity > 0) {
        await supabase.rpc('adjust_stock', {
          p_product_id: item.product_id,
          p_branch_id: challan.branch_id,
          p_movement_type: 'adjustment_out',
          p_quantity: item.quantity,
          p_reference_type: 'delivery_challan_inward_reversal',
          p_reference_id: challan.id,
          p_notes: 'Delivery challan deleted/edited - stock reversed',
          p_created_by: user.id
        });
      }
    }
  };

  const handleDelete = async (challan: any) => {
    if (challan.converted_to_purchase_order_id) {
      toast.error('This challan has already been converted to a Purchase Invoice. Edit/delete the Purchase Invoice instead.');
      return;
    }
    if (!confirm('Are you sure you want to delete this delivery challan? This will remove the received stock.')) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setLoading(true);
    try {
      await reverseStockForChallan(challan);
      await supabase.from('delivery_challan_inward_items').delete().eq('challan_id', challan.id);
      await supabase.from('delivery_challans_inward').delete().eq('id', challan.id);
      toast.success('Delivery challan deleted');
      fetchChallans();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (challan: any) => {
    if (challan.converted_to_purchase_order_id) {
      toast.error('This challan has already been converted to a Purchase Invoice. Edit the Purchase Invoice instead.');
      return;
    }
    if (!confirm('This will delete the current challan, return items to stock, and load them for editing. Continue?')) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setLoading(true);
    try {
      await reverseStockForChallan(challan);
      const editPayload = {
        supplierId: challan.supplier_id || '',
        selectedSupplier: challan.supplier_id ? { id: challan.supplier_id, supplier_name: challan.from_party_name, gstin: challan.from_party_gstin } : null,
        invoiceNo: challan.challan_number,
        items: (challan.delivery_challan_inward_items || []).map((item: any) => ({
          id: Math.random().toString(),
          product_id: item.product_id,
          name: item.item_name,
          qty: Number(item.quantity) || 1,
          price: Number(item.unit_cost) || 0,
          tax_rate: (Number(item.cgst) || 0) + (Number(item.sgst) || 0) + (Number(item.igst) || 0),
          p_tax: false,
          batch: item.batch_number || '',
          mrp: Number(item.mrp) || 0,
          discount: Number(item.discount) || 0,
          exp_date: item.expiry_date || '',
          mfg_date: item.mfg_date || '',
          size: item.size || '',
          colour: item.colour || '',
          sku: item.sku || '',
          barcode: item.barcode || '',
          selling_price: 0,
          w_sale_price: Number(item.w_sale_price) || 0,
          imei1: item.imei1 || '',
          imei2: item.imei2 || '',
          kitchen: item.kitchen || '',
          description: item.description || '',
          sales_unit: item.sales_unit || '',
          sales_alt_unit: item.sales_alt_unit || '',
          conv: item.conv || '',
          min_stock: Number(item.min_stock) || 0,
          status: item.status || '',
          g_down: item.g_down || '',
          rack: item.rack || '',
          def_qty: Number(item.def_qty) || 0,
          part_no: item.part_no || '',
          hsn_code: item.hsn_code || '',
          cmb_gst: item.cmb_gst || ''
        }))
      };
      await supabase.from('delivery_challan_inward_items').delete().eq('challan_id', challan.id);
      await supabase.from('delivery_challans_inward').delete().eq('id', challan.id);
      setEditData(editPayload);
      setIsCreating(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load for editing');
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToInvoice = async (challan: any) => {
    if (!challan.supplier_id) {
      toast.error('This challan has no linked supplier. Please edit it to select a supplier first.');
      return;
    }
    const invoiceNumber = prompt('Enter the Invoice Number from the supplier\'s Tax Invoice:');
    if (!invoiceNumber) return;
    const supabase = getSupabaseClient();
    if (!supabase || !user) return;
    const { error } = await supabase.rpc('convert_delivery_challan_to_purchase_invoice', {
      p_challan_id: challan.id,
      p_supplier_id: challan.supplier_id,
      p_invoice_number: invoiceNumber,
      p_created_by: user.id
    });
    if (error) {
      toast.error('Conversion failed: ' + error.message);
      return;
    }
    toast.success('Converted to Purchase Invoice successfully.');
    fetchChallans();
  };

  const handlePrint = async (challan: any) => {
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) return;
    const { data: branchInfo } = challan.branch_id
      ? await supabase.from('branches').select('branch_name, address').eq('id', challan.branch_id).maybeSingle()
      : { data: null };
    const { data: brandingInfo } = await supabase.from('print_branding_settings').select('*').eq('tenant_id', currentTenantId).maybeSingle();
    const { data: tenantData } = await supabase.from('tenants').select('business_name').eq('id', currentTenantId).maybeSingle();

    const billData: BillData = {
      business: {
        name: tenantData?.business_name || 'Your Business',
        branch_name: branchInfo?.branch_name,
        address: branchInfo?.address,
        show_branch_name: brandingInfo?.show_branch_name !== false,
        show_branch_address: brandingInfo?.show_branch_address !== false,
        stamp_url: brandingInfo?.stamp_url
      },
      customer: { name: challan.from_party_name, gstin: challan.from_party_gstin || undefined },
      customer_info_label: 'From',
      meta: {
        label: 'Delivery Challan (Inward)',
        number: challan.challan_number,
        date: new Date(challan.created_at).toLocaleDateString(),
        extra: [
          ...(challan.vehicle_number ? [{ label: 'Vehicle No', value: challan.vehicle_number }] : []),
          ...(challan.purpose ? [{ label: 'Purpose', value: challan.purpose }] : [])
        ]
      },
      items: (challan.delivery_challan_inward_items || []).map((it: any) => ({
        name: it.item_name + (it.remarks ? ` (${it.remarks})` : ''),
        hsn: it.hsn_code || undefined,
        qty: it.quantity,
        rate: it.unit_cost || undefined,
        amount: (it.quantity || 1) * (it.unit_cost || 0)
      })),
      totals: {
        grand_total: (challan.delivery_challan_inward_items || []).reduce((sum: number, it: any) => sum + (it.quantity || 1) * (it.unit_cost || 0), 0)
      },
      footer: { stamp_url: brandingInfo?.stamp_url },
      bill_number_code_type: brandingInfo?.bill_number_code_type || 'none'
    };
    await printBillForChannel(supabase, currentTenantId, 'delivery_challan_in', billData, 'A4');
  };

  if (isCreating) {
    return <CreateDeliveryChallanInward onBack={() => { setIsCreating(false); setEditData(null); fetchChallans(); }} editData={editData} />;
  }

  const filtered = challans.filter((c: any) =>
    c.challan_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.from_party_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {onBack && (
        <Button variant="ghost" onClick={onBack} className="gap-2">← Back to Documents</Button>
      )}
      <Card className="shadow-sm border-none">
        <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="text-lg font-semibold text-slate-800 dark:text-slate-200">Delivery Challan (Inward)</div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input placeholder="Search challans..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-9" />
            </div>
            <Button className="h-9" onClick={() => { setEditData(null); setIsCreating(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Add New
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-10">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">No delivery challans yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 text-left">
                <tr>
                  <th className="py-3 px-6">Challan #</th>
                  <th className="py-3 px-6">From Party</th>
                  <th className="py-3 px-6">Date</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c: any) => (
                  <tr key={c.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-4 px-6 font-medium">{c.challan_number}</td>
                    <td className="py-4 px-6">{c.from_party_name}</td>
                    <td className="py-4 px-6">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="py-4 px-6">
                      {c.converted_to_purchase_order_id ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Converted</span>
                      ) : (
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">Pending</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        <Button variant="outline" size="sm" onClick={() => setViewChallan(c)} className="h-8 shadow-sm text-slate-600 hover:text-slate-700">
                          <Eye size={14} className="mr-1" /> View
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handlePrint(c)} className="h-8 shadow-sm text-blue-600 hover:text-blue-700">
                          <Printer size={14} className="mr-1" /> Print
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(c)} className="h-8 shadow-sm text-amber-600 hover:text-amber-700">
                          <Edit size={14} className="mr-1" /> Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(c)} className="h-8 shadow-sm text-red-600 hover:text-red-700">
                          <Trash2 size={14} className="mr-1" /> Delete
                        </Button>
                        {!c.converted_to_purchase_order_id && (
                          <Button size="sm" variant="outline" className="h-8 shadow-sm text-green-600 hover:text-green-700" onClick={() => handleConvertToInvoice(c)}>
                            Convert to Invoice
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {viewChallan && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setViewChallan(null)}>
          <div className="bg-white dark:bg-slate-950 rounded-xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-2">{viewChallan.challan_number}</h3>
            <p className="text-sm text-slate-500 mb-4">From: {viewChallan.from_party_name} · {new Date(viewChallan.created_at).toLocaleDateString()}</p>
            <div className="space-y-1 mb-4">
              {(viewChallan.delivery_challan_inward_items || []).map((it: any) => (
                <p key={it.id} className="text-sm">{it.item_name} — Qty: {it.quantity} {it.unit_cost ? `@ ₹${it.unit_cost}` : ''}</p>
              ))}
            </div>
            <Button variant="outline" onClick={() => setViewChallan(null)} className="w-full">Close</Button>
          </div>
        </div>
      )}
    </div>
  );
}
