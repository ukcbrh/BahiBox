import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Download, Search, Plus, Edit, Eye, Trash2, ChevronDown } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import { getSupabaseClient } from '../../lib/supabase';
import { toast } from 'sonner';
import { CustomerSupplierForm } from './CustomerSupplierForm';
import { PartyLedgerModal } from './PartyLedgerModal';

export function RetailCustomerSupplier() {
  const { currentTenantId } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'All' | 'Customer' | 'Supplier' | 'Both'>('All');
  const [parties, setParties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<any>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [partyToDelete, setPartyToDelete] = useState<any>(null);
  const [ledgerParty, setLedgerParty] = useState<any>(null);

  const fetchParties = async () => {

    if (!currentTenantId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    setLoading(true);
    try {
      const { data: customers, error: cErr } = await supabase.from('retail_customers').select('*').eq('tenant_id', currentTenantId);
      const { data: suppliers, error: sErr } = await supabase.from('suppliers').select('*').eq('tenant_id', currentTenantId);
      const { data: payables } = await supabase.rpc('get_supplier_payables', { p_tenant_id: currentTenantId });
      const { data: wallets } = await supabase.from('wallet_accounts').select('id, owner_id, current_balance').eq('tenant_id', currentTenantId);

      if (cErr) {
        console.error('Error fetching customers:', cErr);
        toast.error('Failed to fetch customers');
      }
      if (sErr) {
        console.error('Error fetching suppliers:', sErr);
        toast.error('Failed to fetch suppliers');
      }

      let combined: any[] = [];
      
      if (customers) {
        customers.forEach((c: any) => {
          if (c.customer_name === '@@GROUP_DUMMY@@') return;
          if (c.enable === false) return; // Hide soft-deleted
          combined.push({
            id: `c_${c.id}`,
            originalId: c.id,
            name: c.customer_name,
            contactPerson: c.contact_person || '',
            outstanding: c.opening_balance || 0,
            phone: c.phone || '',
            email: c.email || '',
            gstin: c.gstin || '',
            address: c.address || '',
            type: 'Customer',
            state: c.state || '',
            city: c.city || '',
            pincode: c.pincode || '',
            registrationType: c.registration_type || 'Unregistered',
            pan: c.pan || '',
            walletBalance: wallets?.find((w: any) => w.owner_id === c.id)?.current_balance || 0,
            walletId: wallets?.find((w: any) => w.owner_id === c.id)?.id || null,
            landmark: c.landmark || '',
            country: c.country || 'India',
            distance: c.distance || '',
            group: c.customer_group || '',
            balanceType: c.balance_type || 'Credit',
            licenseNo: c.license_no || '',
            customField1: c.custom_field_1 || '',
            customField2: c.custom_field_2 || '',
            faxNo: c.fax_no || '',
            website: c.website || '',
            creditLimit: c.credit_limit || '',
            dueDays: c.due_days || '',
            note: c.note || '',
            enable: c.enable !== false,
            isCustomer: true,
            isSupplier: false,
          });
        });
      }

      if (suppliers) {
        suppliers.forEach((s: any) => {
          if (s.supplier_name === '@@GROUP_DUMMY@@') return;
          if (s.enable === false) return; // Hide soft-deleted
          const p = payables?.find((pay: any) => pay.supplier_id === s.id);
          const out = p ? p.outstanding : 0;
          
          // Check if this supplier has the same phone as a customer to mark them as 'Customer/Supplier'
          // This is a naive way to detect "Both" based on phone or name if they exist in both.
          // For simplicity, we just add them.
          const existingIdx = combined.findIndex(c => c.phone && c.phone === (s.phone || s.contact_phone) && c.type === 'Customer');
          
          if (existingIdx >= 0) {
            combined[existingIdx].type = 'Customer/Supplier';
            combined[existingIdx].isSupplier = true;
            combined[existingIdx].originalSupplierId = s.id;
            // update outstanding by adding both maybe? 
          } else {
            combined.push({
              id: `s_${s.id}`,
              originalId: s.id,
              name: s.supplier_name,
              contactPerson: s.contact_person || '',
              outstanding: s.opening_balance || out,
              phone: s.phone || s.contact_phone || '',
              email: s.contact_email || '',
              gstin: s.gstin || '',
              address: s.address || '',
              type: 'Supplier',
              state: s.state || '',
              city: s.city || '',
              pincode: s.pincode || '',
              registrationType: s.registration_type || 'Unregistered',
              pan: s.pan || '',
              walletBalance: wallets?.find((w: any) => w.owner_id === s.id)?.current_balance || 0,
              walletId: wallets?.find((w: any) => w.owner_id === s.id)?.id || null,
              landmark: s.landmark || '',
              country: s.country || 'India',
              distance: s.distance || '',
              group: s.supplier_group || '',
              balanceType: s.balance_type || 'Credit',
              licenseNo: s.license_no || '',
              customField1: s.custom_field_1 || '',
              customField2: s.custom_field_2 || '',
              faxNo: s.fax_no || '',
              website: s.website || '',
              creditLimit: s.credit_limit || '',
              dueDays: s.due_days || '',
              note: s.note || '',
              enable: s.enable !== false,
              isCustomer: false,
              isSupplier: true,
            });
          }
        });
      }

      setParties(combined);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParties();
  }, [currentTenantId]);

  const clearWalletBalance = async (party: any) => {
    if (!party.walletId || !party.walletBalance) return;
    if (!window.confirm(`Are you sure you want to clear the wallet balance of ₹${party.walletBalance} for ${party.name}?`)) return;
    
    const supabase = getSupabaseClient();
    if (!supabase) return;
    
    try {
      const { data: userResp } = await supabase.auth.getUser();
      const { error } = await supabase.rpc('post_ledger_transaction', {
        p_wallet_account_id: party.walletId,
        p_type: 'debit',
        p_amount: party.walletBalance,
        p_reference_type: 'manual_adjustment',
        p_reference_id: party.originalId,
        p_description: 'Admin cleared wallet balance',
        p_created_by: userResp.user?.id
      });
      if (error) throw error;
      toast.success('Wallet balance cleared');
      fetchParties();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to clear wallet balance');
    }
  };

  const confirmDelete = async () => {
    if (!partyToDelete) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    
    try {
      // 1. Check for invoices
      let hasInvoices = false;
      if (partyToDelete.isCustomer) {
         const { data: invs } = await supabase.from('sales_invoices').select('id').eq('customer_id', partyToDelete.originalId).limit(1);
         if (invs && invs.length > 0) hasInvoices = true;
      }
      if (partyToDelete.isSupplier) {
         const suppId = partyToDelete.originalSupplierId || partyToDelete.originalId;
         if (suppId) {
             const { data: pos } = await supabase.from('purchase_orders').select('id').eq('supplier_id', suppId).limit(1);
             if (pos && pos.length > 0) hasInvoices = true;
         }
      }

      if (hasInvoices) {
         toast.error('You must first delete all its invoices before deleting this.');
         setPartyToDelete(null);
         return;
      }

      // 2. Perform deletion or soft-delete fallback
      if (partyToDelete.isCustomer) {
        const { error: cErr } = await supabase.from('retail_customers').delete().eq('id', partyToDelete.originalId);
        if (cErr) {
            if (cErr.code === '23503' || (cErr.message && cErr.message.toLowerCase().includes('foreign key'))) {
                // Soft delete fallback since it's referenced by internal tables like wallet_accounts or credit_limits
                const { error: uErr } = await supabase.from('retail_customers').update({ enable: false }).eq('id', partyToDelete.originalId);
                if (uErr) throw uErr;
            } else {
                throw cErr;
            }
        }
      }
      if (partyToDelete.isSupplier) {
        const suppId = partyToDelete.originalSupplierId || partyToDelete.originalId;
        if (suppId) {
          const { error: sErr } = await supabase.from('suppliers').delete().eq('id', suppId);
          if (sErr) {
              if (sErr.code === '23503' || (sErr.message && sErr.message.toLowerCase().includes('foreign key'))) {
                  const { error: uErr } = await supabase.from('suppliers').update({ enable: false }).eq('id', suppId);
                  if (uErr) throw uErr;
              } else {
                  throw sErr;
              }
          }
        }
      }
      
      toast.success('Deleted successfully');
      fetchParties();
    } catch (err: any) {
      console.error("Delete error:", err);
      toast.error(err.message || 'Error deleting');
    } finally {
      setPartyToDelete(null);
    }
  };

  const filteredParties = parties.filter(p => {
    if (activeTab === 'Customer' && p.type !== 'Customer') return false;
    if (activeTab === 'Supplier' && p.type !== 'Supplier') return false;
    if (activeTab === 'Both' && p.type !== 'Customer/Supplier') return false;
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return p.name?.toLowerCase().includes(search) || p.phone?.includes(search);
    }
    return true;
  });

  const allCount = parties.length;
  const customerCount = parties.filter(p => p.type === 'Customer').length;
  const vendorCount = parties.filter(p => p.type === 'Supplier').length;
  const bothCount = parties.filter(p => p.type === 'Customer/Supplier').length;

  return (
    <>
    <div className="space-y-6">
      <Card className="shadow-sm border-none">
        <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            Customer / Supplier
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-950">
              <Download className="mr-2 h-4 w-4" /> Import
            </Button>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search"
                className="pl-9 w-64 bg-slate-50 dark:bg-slate-900"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button 
              variant="outline"
              className="text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-950"
              onClick={() => setIsGroupModalOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> Create Group
            </Button>
            <Button 
              className="bg-[#00b884] hover:bg-[#00a375] text-white border-none shadow-sm"
              onClick={() => { setEditingParty(null); setIsViewMode(false); setIsFormOpen(true); }}
            >
              <Plus className="mr-2 h-4 w-4" /> Add New
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-none overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-center gap-6 px-6 pt-4 border-b">
            <button 
              className={`pb-4 px-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'All' ? 'border-[#00b884] text-slate-900 dark:text-slate-100' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
              onClick={() => setActiveTab('All')}
            >
              All <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'All' ? 'bg-[#00b884] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>{allCount}</span>
            </button>
            <button 
              className={`pb-4 px-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'Customer' ? 'border-[#00b884] text-slate-900 dark:text-slate-100' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
              onClick={() => setActiveTab('Customer')}
            >
              Customer <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'Customer' ? 'bg-[#00b884] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>{customerCount}</span>
            </button>
            <button 
              className={`pb-4 px-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'Supplier' ? 'border-[#00b884] text-slate-900 dark:text-slate-100' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
              onClick={() => setActiveTab('Supplier')}
            >
              Supplier <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'Supplier' ? 'bg-[#00b884] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>{vendorCount}</span>
            </button>
            <button 
              className={`pb-4 px-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'Both' ? 'border-[#00b884] text-slate-900 dark:text-slate-100' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
              onClick={() => setActiveTab('Both')}
            >
              Customer/Supplier <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'Both' ? 'bg-[#00b884] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>{bothCount}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white dark:bg-slate-950 border-b">
                <tr>
                  <th className="p-4 font-semibold text-slate-600 dark:text-slate-400 w-12">
                    <input type="checkbox" className="rounded border-slate-300 dark:border-slate-700" />
                  </th>
                  <th className="p-4 font-semibold text-slate-600 dark:text-slate-400">Name</th>
                  <th className="p-4 font-semibold text-slate-600 dark:text-slate-400">Contact Person</th>
                  <th className="p-4 font-semibold text-slate-600 dark:text-slate-400">Get Outstanding</th>
                  <th className="p-4 font-semibold text-slate-600 dark:text-slate-400">Phone</th>
                  <th className="p-4 font-semibold text-slate-600 dark:text-slate-400">Type</th>
                  <th className="p-4 font-semibold text-slate-600 dark:text-slate-400">State</th>
                  <th className="p-4 font-semibold text-slate-600 dark:text-slate-400">City</th>
                  <th className="p-4 font-semibold text-slate-600 dark:text-slate-400 text-right">Wallet Bal.</th>
                  <th className="p-4 font-semibold text-slate-600 dark:text-slate-400 text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500 dark:text-slate-400">Loading data...</td>
                  </tr>
                ) : filteredParties.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500 dark:text-slate-400">No records found.</td>
                  </tr>
                ) : (
                  filteredParties.map((p, i) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 group">
                      <td className="p-4">
                        <input type="checkbox" className="rounded border-slate-300 dark:border-slate-700" />
                      </td>
                      <td className="p-4 font-medium text-slate-900 dark:text-slate-100">
                        <span className="cursor-pointer hover:underline hover:text-primary" onClick={() => setLedgerParty(p)}>{p.name}</span>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">
                        {p.contactPerson || '-'}
                      </td>
                      <td className="p-4">
                        <span className="text-[#00b884] font-medium cursor-pointer hover:underline" onClick={() => setLedgerParty(p)}>
                          Get Outstanding
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">
                        {p.phone || '-'}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">
                        {p.type}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">
                        {p.state || '-'}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">
                        {p.city || '-'}
                      </td>
                      <td className="p-4 text-right font-medium text-slate-900 dark:text-slate-100">
                        {p.walletBalance ? `₹${Number(p.walletBalance).toFixed(2)}` : '-'}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1 transition-opacity">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 bg-white dark:bg-slate-950"
                            onClick={() => { setEditingParty(p); setIsViewMode(false); setIsFormOpen(true); }}
                          >
                            <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 bg-white dark:bg-slate-950 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setPartyToDelete(p)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                          </Button>
                          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-md">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 px-2.5 bg-slate-200 dark:bg-slate-700/50 hover:bg-slate-300/50 rounded-r-none"
                              onClick={() => { setEditingParty(p); setIsViewMode(true); setIsFormOpen(true); }}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1.5" /> View
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 px-1.5 bg-slate-200 dark:bg-slate-700/50 hover:bg-slate-300/50 rounded-l-none border-l border-slate-300 dark:border-slate-700/50" title="Options">
                              <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          {p.walletBalance > 0 && (
                            <Button
                               variant="outline"
                               size="sm"
                               className="h-8 bg-white dark:bg-slate-950 text-orange-600 hover:text-orange-700 hover:bg-orange-50 ml-1"
                               onClick={() => clearWalletBalance(p)}
                               title="Clear Wallet Balance"
                            >
                               Clear Wallet
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      <CustomerSupplierForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        onSuccess={() => { setIsFormOpen(false); fetchParties(); }} 
        initialData={editingParty}
        isViewMode={isViewMode}
      />
    </div>

      {ledgerParty && (
        <PartyLedgerModal party={ledgerParty} onClose={() => setLedgerParty(null)} />
      )}
                  {partyToDelete && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center" onClick={() => setPartyToDelete(null)}>
          <div className="bg-white dark:bg-slate-950 rounded-lg shadow-xl w-full max-w-sm mx-4 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">Delete</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">Are you sure you want to delete {partyToDelete.name}?</p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => setPartyToDelete(null)} className="flex-1">Cancel</Button>
                <Button onClick={confirmDelete} className="flex-1 bg-red-600 hover:bg-red-700 text-white">Delete</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isGroupModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center" onClick={() => setIsGroupModalOpen(false)}>
          <div className="bg-white dark:bg-slate-950 rounded-lg shadow-xl w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Create New Group</h2>
            </div>
            <div className="p-6">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">Group Name</label>
              <Input 
                value={newGroupName} 
                onChange={e => setNewGroupName(e.target.value)} 
                placeholder="e.g. Wholesale, VIP"
                autoFocus
              />
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-2 bg-slate-50 dark:bg-slate-900 rounded-b-lg">
              <Button variant="outline" onClick={() => setIsGroupModalOpen(false)}>Cancel</Button>
              <Button className="bg-[#00b884] hover:bg-[#00a375] text-white" onClick={async () => {
                if (!newGroupName.trim() || !currentTenantId) return;
                const supabase = getSupabaseClient();
                if (!supabase) return;
                const { error } = await supabase.from('retail_customers').insert({
                  tenant_id: currentTenantId,
                  customer_name: '@@GROUP_DUMMY@@',
                  customer_group: newGroupName.trim(),
                  enable: false
                });
                if (error) {
                  toast.error('Failed to create group');
                  console.error(error);
                } else {
                  toast.success('Group created successfully');
                  setIsGroupModalOpen(false);
                  setNewGroupName('');
                  fetchParties();
                }
              }}>Create Group</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
