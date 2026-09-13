import React, { useState, useEffect } from 'react';
import { X, Info, Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { getSupabaseClient } from '../../lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { WalletBalanceCard, LedgerHistoryTable } from '../WalletComponents';

interface CustomerSupplierFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
  isViewMode?: boolean;
}

export function CustomerSupplierForm({ isOpen, onClose, onSuccess, initialData, isViewMode = false }: CustomerSupplierFormProps) {
  const { currentTenantId } = useAuth();
  const [formData, setFormData] = useState({
    companyType: 'Customer',
    gstin: '',
    companyName: '',
    contactPerson: '',
    contactNo: '',
    email: '',
    registrationType: 'Unregistered',
    pan: '',
    address: '',
    landmark: '',
    city: '',
    country: 'India',
    state: '',
    pincode: '',
    distance: '',
    group: '',
    openingBalance: '0',
    balanceType: 'Credit',
    licenseNo: '',
    customField1: '',
    customField2: '',
    faxNo: '',
    website: '',
    creditLimit: '',
    dueDays: '',
    note: '',
    enable: true
  });
  const [loading, setLoading] = useState(false);
  const [shippingAddresses, setShippingAddresses] = useState<any[]>([]);
  const [showGroupInput, setShowGroupInput] = useState(false);
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);

  useEffect(() => {
    if (!currentTenantId) return;
    const fetchGroups = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data: custData } = await supabase.from('retail_customers').select('customer_group').eq('tenant_id', currentTenantId).not('customer_group', 'is', null);
      const { data: suppData } = await supabase.from('suppliers').select('supplier_group').eq('tenant_id', currentTenantId).not('supplier_group', 'is', null);
      const gSet = new Set<string>();
      custData?.forEach((d: any) => { if (d.customer_group) gSet.add(d.customer_group); });
      suppData?.forEach((d: any) => { if (d.supplier_group) gSet.add(d.supplier_group); });
      setAvailableGroups(Array.from(gSet));
    };
    fetchGroups();
  }, [currentTenantId, isOpen]);

  useEffect(() => {
    if (initialData) {
      let loadedShippingAddresses = [];
      try {
        if (initialData.customField1) {
          loadedShippingAddresses = JSON.parse(initialData.customField1);
        }
      } catch (e) {
        // ignore
      }
      setShippingAddresses(loadedShippingAddresses);

            setFormData({
        companyType: initialData.type === 'Customer/Supplier' ? 'Both' : initialData.type || 'Customer',
        companyName: initialData.name || '',
        contactPerson: initialData.contactPerson || '',
        contactNo: initialData.phone || '',
        city: initialData.city || '',
        state: initialData.state || '',
        gstin: initialData.gstin || '',
        email: initialData.email || '',
        registrationType: initialData.registrationType || 'Unregistered',
        pan: initialData.pan || '',
        address: initialData.address || '',
        landmark: initialData.landmark || '',
        country: initialData.country || 'India',
        pincode: initialData.pincode || '',
        distance: initialData.distance || '',
        group: initialData.group || '',
        openingBalance: initialData.outstanding ? initialData.outstanding.toString() : '0',
        balanceType: initialData.balanceType || 'Credit',
        licenseNo: initialData.licenseNo || '',
        customField1: initialData.customField1 || '',
        customField2: initialData.customField2 || '',
        faxNo: initialData.faxNo || '',
        website: initialData.website || '',
        creditLimit: initialData.creditLimit ? initialData.creditLimit.toString() : '',
        dueDays: initialData.dueDays ? initialData.dueDays.toString() : '',
        note: initialData.note || '',
        enable: initialData.enable !== false
      });
    } else {
      setShippingAddresses([]);
      setFormData({
        companyType: 'Customer', gstin: '', companyName: '', contactPerson: '', contactNo: '', email: '', registrationType: 'Unregistered',
        pan: '', address: '', landmark: '', city: '', country: 'India', state: '', pincode: '', distance: '', group: '',
        openingBalance: '0', balanceType: 'Credit', licenseNo: '', customField1: '', customField2: '', faxNo: '', website: '',
        creditLimit: '', dueDays: '', note: '', enable: true
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.companyName) {
      toast.error('Company Name is required');
      return;
    }
    if (!currentTenantId) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    setLoading(true);
    try {
      if (formData.companyType === 'Customer' || formData.companyType === 'Both') {
        const customerPayload = {
          tenant_id: currentTenantId,
          customer_name: formData.companyName,
          phone: formData.contactNo,
          email: formData.email,
          gstin: formData.gstin,
          contact_person: formData.contactPerson,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          registration_type: formData.registrationType,
          pan: formData.pan,
          landmark: formData.landmark,
          country: formData.country,
          distance: formData.distance,
          customer_group: formData.group,
          opening_balance: parseFloat(formData.openingBalance) || 0,
          balance_type: formData.balanceType,
          license_no: formData.licenseNo,
          custom_field_1: JSON.stringify(shippingAddresses),
          custom_field_2: formData.customField2,
          fax_no: formData.faxNo,
          website: formData.website,
          credit_limit: parseFloat(formData.creditLimit) || null,
          due_days: parseInt(formData.dueDays) || null,
          note: formData.note,
          enable: formData.enable,
        };
        
        let finalCustomerId = null;
        if (initialData && (initialData.isCustomer || initialData.type === 'Customer' || initialData.type === 'Customer/Supplier')) {
          const { error } = await supabase.from('retail_customers').update(customerPayload).eq('id', initialData.originalId);
          if (error) throw error;
          finalCustomerId = initialData.originalId;
        } else {
          let existingId = null;
          if (formData.contactNo) {
            const { data: existing } = await supabase.from('retail_customers')
              .select('id')
              .eq('tenant_id', currentTenantId)
              .eq('phone', formData.contactNo)
              .single();
            if (existing) existingId = existing.id;
          }
          
          if (existingId) {
            const { error } = await supabase.from('retail_customers').update(customerPayload).eq('id', existingId);
            if (error) throw error;
            finalCustomerId = existingId;
          } else {
            const { data: inserted, error } = await supabase.from('retail_customers').insert([customerPayload]).select('id').single();
            if (error) throw error;
            finalCustomerId = inserted.id;
          }
        }

        const creditLimitValue = parseFloat(formData.creditLimit) || 0;
        if (creditLimitValue > 0 && finalCustomerId) {
          const { data: existingCreditLimit } = await supabase
            .from('credit_limits')
            .select('id')
            .eq('tenant_id', currentTenantId)
            .eq('party_type', 'customer')
            .eq('party_id', finalCustomerId)
            .maybeSingle();

          const creditLimitPayload = {
            tenant_id: currentTenantId,
            party_type: 'customer',
            party_id: finalCustomerId,
            credit_limit_amount: creditLimitValue,
            credit_period_days: parseInt(formData.dueDays) || 30
          };

          if (existingCreditLimit) {
            const { error: clError } = await supabase.from('credit_limits').update(creditLimitPayload).eq('id', existingCreditLimit.id);
            if (clError) {
              console.error('Failed to update credit limit:', clError.message);
              toast.error('Customer saved, but credit limit failed to save: ' + clError.message);
            }
          } else {
            const { error: clError } = await supabase.from('credit_limits').insert(creditLimitPayload);
            if (clError) {
              console.error('Failed to save credit limit:', clError.message);
              toast.error('Customer saved, but credit limit failed to save: ' + clError.message);
            }
          }
        }
      }

      if (formData.companyType === 'Supplier' || formData.companyType === 'Both') {
        const supplierPayload = {
          tenant_id: currentTenantId,
          supplier_name: formData.companyName,
          contact_phone: formData.contactNo,
          contact_email: formData.email,
          gstin: formData.gstin,
          contact_person: formData.contactPerson,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          registration_type: formData.registrationType,
          pan: formData.pan,
          landmark: formData.landmark,
          country: formData.country,
          distance: formData.distance,
          supplier_group: formData.group,
          opening_balance: parseFloat(formData.openingBalance) || 0,
          balance_type: formData.balanceType,
          license_no: formData.licenseNo,
          custom_field_1: JSON.stringify(shippingAddresses),
          custom_field_2: formData.customField2,
          fax_no: formData.faxNo,
          website: formData.website,
          credit_limit: parseFloat(formData.creditLimit) || null,
          due_days: parseInt(formData.dueDays) || null,
          note: formData.note,
          enable: formData.enable,
        };
        
        const suppId = initialData?.originalSupplierId || (initialData?.isSupplier || initialData?.isVendor ? initialData.originalId : null);
        if (suppId) {
          const { error } = await supabase.from('suppliers').update(supplierPayload).eq('id', suppId);
          if (error) throw error;
        } else {
          let existingId = null;
          if (formData.contactNo) {
            const { data: existing } = await supabase.from('suppliers')
              .select('id')
              .eq('tenant_id', currentTenantId)
              .eq('contact_phone', formData.contactNo)
              .single();
            if (existing) existingId = existing.id;
          }

          if (existingId) {
            const { error } = await supabase.from('suppliers').update(supplierPayload).eq('id', existingId);
            if (error) throw error;
          } else {
            const { error } = await supabase.from('suppliers').insert([supplierPayload]);
            if (error) throw error;
          }
        }
      }

      toast.success('Saved successfully');
      onSuccess();
    } catch (error: any) {
      if (error.message?.includes('retail_customers_tenant_id_phone_key') || error.code === '23505' && error.message?.includes('phone')) {
        toast.error('A customer with this phone number already exists.');
      } else if (error.message?.includes('suppliers_tenant_id_contact_phone_key') || error.code === '23505' && error.message?.includes('contact_phone')) {
        toast.error('A supplier with this phone number already exists.');
      } else {
        toast.error(error.message || 'Error saving data');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[100]" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full sm:w-[550px] bg-white dark:bg-slate-950 z-[110] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
              {isViewMode ? 'View Customer / Supplier' : (initialData ? 'Edit Customer / Supplier' : 'Add Customer / Supplier')}
            </h2>
            <div className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              <Plus className="h-4 w-4" />
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

                {isViewMode && (
          <style>{`
            @media print {
              body * {
                visibility: hidden;
              }
              #customer-supplier-form-content, #customer-supplier-form-content * {
                visibility: visible;
              }
              #customer-supplier-form-content {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                overflow: visible !important;
                height: auto !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}</style>
        )}
        <div id="customer-supplier-form-content" className="flex-1 overflow-y-auto p-6">
          <div className="space-y-8">
            {/* Detail Section */}
            <section>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 pb-2 border-b">
                <span className="p-1 rounded bg-slate-100 dark:bg-slate-800"><Info className="h-3.5 w-3.5" /></span>
                Customer / Supplier Detail
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-[140px_1fr] items-center gap-4">
                  <label className="text-sm text-slate-600 dark:text-slate-400">Company Type</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" disabled={isViewMode} name="companyType" checked={formData.companyType === 'Customer'} onChange={() => handleChange('companyType', 'Customer')} className="text-[#00b884] focus:ring-[#00b884]" /> Customer
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" disabled={isViewMode} name="companyType" checked={formData.companyType === 'Supplier'} onChange={() => handleChange('companyType', 'Supplier')} className="text-[#00b884] focus:ring-[#00b884]" /> Supplier
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" disabled={isViewMode} name="companyType" checked={formData.companyType === 'Both'} onChange={() => handleChange('companyType', 'Both')} className="text-[#00b884] focus:ring-[#00b884]" /> Customer / Supplier
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-[140px_1fr] items-center gap-4">
                  <label className="text-sm text-slate-600 dark:text-slate-400">GSTIN</label>
                  <div className="relative">
                    <Input readOnly={isViewMode} value={formData.gstin} onChange={e => handleChange('gstin', e.target.value)} className="pr-20" />
                    <button className="absolute right-1 top-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 px-2.5 py-1.5 rounded transition-colors text-slate-600 dark:text-slate-400">
                      Auto Fill
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-[140px_1fr] items-center gap-4">
                  <label className="text-sm text-slate-600 dark:text-slate-400">Company Name <span className="text-red-500">*</span></label>
                  <Input readOnly={isViewMode} value={formData.companyName} onChange={e => handleChange('companyName', e.target.value)} />
                </div>

                <div className="grid grid-cols-[140px_1fr] items-center gap-4">
                  <label className="text-sm text-slate-600 dark:text-slate-400">Contact Person</label>
                  <Input readOnly={isViewMode} value={formData.contactPerson} onChange={e => handleChange('contactPerson', e.target.value)} />
                </div>

                <div className="grid grid-cols-[140px_1fr] items-center gap-4">
                  <label className="text-sm text-slate-600 dark:text-slate-400">Contact No</label>
                  <div className="relative">
                    <Input readOnly={isViewMode} value={formData.contactNo} onChange={e => handleChange('contactNo', e.target.value)} />
                    <Info className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                <div className="grid grid-cols-[140px_1fr] items-center gap-4">
                  <label className="text-sm text-slate-600 dark:text-slate-400">Email</label>
                  <div className="relative">
                    <Input readOnly={isViewMode} type="email" value={formData.email} onChange={e => handleChange('email', e.target.value)} />
                    <Info className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                <div className="grid grid-cols-[140px_1fr] items-center gap-4">
                  <label className="text-sm text-slate-600 dark:text-slate-400">Registration Type</label>
                  <select disabled={isViewMode} 
                    value={formData.registrationType} 
                    onChange={e => handleChange('registrationType', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:border-transparent"
                  >
                    <option value="Unregistered">Unregistered</option>
                    <option value="Regular">Regular</option>
                    <option value="Composition">Composition</option>
                  </select>
                </div>

                <div className="grid grid-cols-[140px_1fr] items-center gap-4">
                  <label className="text-sm text-slate-600 dark:text-slate-400">PAN</label>
                  <Input readOnly={isViewMode} value={formData.pan} onChange={e => handleChange('pan', e.target.value)} />
                </div>
              </div>
            </section>

            {/* Address Section */}
            <section>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 pb-2 border-b">
                <span className="p-1 rounded bg-slate-100 dark:bg-slate-800"><Info className="h-3.5 w-3.5" /></span>
                Billing Address
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-[140px_1fr] items-start gap-4">
                  <label className="text-sm text-slate-600 dark:text-slate-400 mt-2">Address</label>
                  <div className="space-y-2">
                    <Input readOnly={isViewMode} value={formData.address} onChange={e => handleChange('address', e.target.value)} />
                    <Input readOnly={isViewMode} />
                  </div>
                </div>

                <div className="grid grid-cols-[140px_1fr] items-center gap-4">
                  <label className="text-sm text-slate-600 dark:text-slate-400">Landmark</label>
                  <Input readOnly={isViewMode} value={formData.landmark} onChange={e => handleChange('landmark', e.target.value)} />
                </div>

                <div className="grid grid-cols-[140px_1fr] items-center gap-4">
                  <label className="text-sm text-slate-600 dark:text-slate-400">City <span className="text-red-500">*</span></label>
                  <Input readOnly={isViewMode} value={formData.city} onChange={e => handleChange('city', e.target.value)} />
                </div>

                <div className="grid grid-cols-[140px_1fr] items-center gap-4">
                  <label className="text-sm text-slate-600 dark:text-slate-400">Country <span className="text-red-500">*</span></label>
                  <select disabled={isViewMode} 
                    value={formData.country} 
                    onChange={e => handleChange('country', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:border-transparent"
                  >
                    <option value="India">India</option>
                  </select>
                </div>

                <div className="grid grid-cols-[140px_1fr] items-center gap-4">
                  <label className="text-sm text-slate-600 dark:text-slate-400">State <span className="text-red-500">*</span></label>
                  <select disabled={isViewMode} 
                    value={formData.state} 
                    onChange={e => handleChange('state', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:border-transparent"
                  >
                    <option value="">Select State</option>
                    <option value="Andaman and Nicobar Islands">Andaman and Nicobar Islands</option>
                    <option value="Andhra Pradesh">Andhra Pradesh</option>
                    <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                    <option value="Assam">Assam</option>
                    <option value="Bihar">Bihar</option>
                    <option value="Chandigarh">Chandigarh</option>
                    <option value="Chhattisgarh">Chhattisgarh</option>
                    <option value="Dadra and Nagar Haveli and Daman and Diu">Dadra and Nagar Haveli and Daman and Diu</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Goa">Goa</option>
                    <option value="Gujarat">Gujarat</option>
                    <option value="Haryana">Haryana</option>
                    <option value="Himachal Pradesh">Himachal Pradesh</option>
                    <option value="Jammu and Kashmir">Jammu and Kashmir</option>
                    <option value="Jharkhand">Jharkhand</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Kerala">Kerala</option>
                    <option value="Ladakh">Ladakh</option>
                    <option value="Lakshadweep">Lakshadweep</option>
                    <option value="Madhya Pradesh">Madhya Pradesh</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Manipur">Manipur</option>
                    <option value="Meghalaya">Meghalaya</option>
                    <option value="Mizoram">Mizoram</option>
                    <option value="Nagaland">Nagaland</option>
                    <option value="Odisha">Odisha</option>
                    <option value="Puducherry">Puducherry</option>
                    <option value="Punjab">Punjab</option>
                    <option value="Rajasthan">Rajasthan</option>
                    <option value="Sikkim">Sikkim</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Telangana">Telangana</option>
                    <option value="Tripura">Tripura</option>
                    <option value="Uttar Pradesh">Uttar Pradesh</option>
                    <option value="Uttarakhand">Uttarakhand</option>
                    <option value="West Bengal">West Bengal</option>
                  </select>
                </div>

                <div className="grid grid-cols-[140px_1fr] items-center gap-4">
                  <label className="text-sm text-slate-600 dark:text-slate-400">Pincode</label>
                  <Input readOnly={isViewMode} value={formData.pincode} onChange={e => handleChange('pincode', e.target.value)} />
                </div>

                <div className="grid grid-cols-[140px_1fr] items-center gap-4">
                  <label className="text-sm text-slate-600 dark:text-slate-400">Distance for<br/>E-Way Bill (in Km)</label>
                  <div className="relative">
                    <Input readOnly={isViewMode} value={formData.distance} onChange={e => handleChange('distance', e.target.value)} className="pr-20" />
                    <button className="absolute right-1 top-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 px-2.5 py-1.5 rounded transition-colors text-slate-600 dark:text-slate-400">
                      Auto Fill
                    </button>
                  </div>
                </div>
              </div>
            </section>
            
            <div className="flex justify-between items-center border-t border-b py-3">
               <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                 <span className="p-1 rounded bg-slate-100 dark:bg-slate-800"><Info className="h-3.5 w-3.5" /></span> Shipping Address
               </div>
               <Button type="button" size="sm" className="bg-[#00b884] hover:bg-[#00a375] h-8" onClick={() => setShippingAddresses([...shippingAddresses, { address: '', city: '', state: '', pincode: '', country: 'India' }])}>
                 <Plus className="h-3.5 w-3.5 mr-1" /> Add
               </Button>
            </div>
            {shippingAddresses.length > 0 && (
              <div className="space-y-4 py-4">
                {shippingAddresses.map((sa, idx) => (
                  <div key={idx} className="p-4 border rounded relative bg-slate-50 dark:bg-slate-900/50">
                    <button className="absolute top-2 right-2 text-slate-400 hover:text-red-500" onClick={() => {
                      const newAddrs = [...shippingAddresses];
                      newAddrs.splice(idx, 1);
                      setShippingAddresses(newAddrs);
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <label className="text-sm text-slate-600 dark:text-slate-400">Address</label>
                        <Input readOnly={isViewMode} value={sa.address} onChange={e => {
                          const newAddrs = [...shippingAddresses];
                          newAddrs[idx].address = e.target.value;
                          setShippingAddresses(newAddrs);
                        }} />
                      </div>
                      <div className="grid gap-2">
                        <label className="text-sm text-slate-600 dark:text-slate-400">City</label>
                        <Input readOnly={isViewMode} value={sa.city} onChange={e => {
                          const newAddrs = [...shippingAddresses];
                          newAddrs[idx].city = e.target.value;
                          setShippingAddresses(newAddrs);
                        }} />
                      </div>
                      <div className="grid gap-2">
                        <label className="text-sm text-slate-600 dark:text-slate-400">State</label>
                        <Input readOnly={isViewMode} value={sa.state} onChange={e => {
                          const newAddrs = [...shippingAddresses];
                          newAddrs[idx].state = e.target.value;
                          setShippingAddresses(newAddrs);
                        }} />
                      </div>
                      <div className="grid gap-2">
                        <label className="text-sm text-slate-600 dark:text-slate-400">Pincode</label>
                        <Input readOnly={isViewMode} value={sa.pincode} onChange={e => {
                          const newAddrs = [...shippingAddresses];
                          newAddrs[idx].pincode = e.target.value;
                          setShippingAddresses(newAddrs);
                        }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex justify-between items-center border-b pb-3 pt-3">
               <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                 <span className="p-1 rounded bg-slate-100 dark:bg-slate-800"><Info className="h-3.5 w-3.5" /></span> Customer / Supplier Group
               </div>
               <Button type="button" size="sm" className="bg-[#00b884] hover:bg-[#00a375] h-8" onClick={() => setShowGroupInput(!showGroupInput)}>
                 <Plus className="h-3.5 w-3.5 mr-1" /> {showGroupInput ? 'Hide Group Input' : 'Add Group'}
               </Button>
            </div>
            
            {showGroupInput && (
              <div className="py-4">
                <div className="grid grid-cols-[140px_1fr] items-center gap-4">
                  <label className="text-sm text-slate-600 dark:text-slate-400">Group Name</label>
                  <div className="flex gap-2">
                    <select disabled={isViewMode} 
                      className="flex h-10 w-1/2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:border-transparent"
                      value={formData.group}
                      onChange={e => handleChange('group', e.target.value)}
                    >
                      <option value="">Select Existing Group</option>
                      {availableGroups.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <Input readOnly={isViewMode} className="w-1/2" value={formData.group} onChange={e => handleChange('group', e.target.value)} placeholder="Or create new group" />
                  </div>
                </div>
              </div>
            )}

            {/* Opening Balance */}
            <section>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 pb-2 border-b">
                <span className="p-1 rounded bg-slate-100 dark:bg-slate-800"><Info className="h-3.5 w-3.5" /></span>
                Opening Balance
              </h3>
              <div className="grid grid-cols-[140px_1fr] items-start gap-4">
                <label className="text-sm text-slate-600 dark:text-slate-400 mt-2">Customer Balance</label>
                <div>
                  <div className="flex">
                    <Input readOnly={isViewMode} type="number" value={formData.openingBalance} onChange={e => handleChange('openingBalance', e.target.value)} className="rounded-r-none focus-visible:z-10" />
                    <select disabled={isViewMode} 
                      value={formData.balanceType} 
                      onChange={e => handleChange('balanceType', e.target.value)}
                      className="flex h-10 w-28 rounded-r-md border border-l-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
                    >
                      <option value="Credit">Credit</option>
                      <option value="Debit">Debit</option>
                    </select>
                  </div>
                  <p className="text-xs text-red-500 mt-1">₹ 0 You pay the customer</p>
                </div>
              </div>
              
              {(formData.companyType === 'Customer' || formData.companyType === 'Both') && (
                <>
                  <div className="grid grid-cols-[140px_1fr] items-center gap-4 mt-4">
                    <label className="text-sm text-slate-600 dark:text-slate-400">Credit Limit (₹)</label>
                    <Input readOnly={isViewMode} type="number" placeholder="e.g. 50000" value={formData.creditLimit} onChange={e => handleChange('creditLimit', e.target.value)} />
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-center gap-4 mt-4">
                    <label className="text-sm text-slate-600 dark:text-slate-400">Due Days</label>
                    <Input readOnly={isViewMode} type="number" placeholder="e.g. 30" value={formData.dueDays} onChange={e => handleChange('dueDays', e.target.value)} />
                  </div>
                </>
              )}
            </section>
            
            {initialData?.walletId && (
              <section className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 space-y-6">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Wallet & Ledger</h3>
                <WalletBalanceCard walletId={initialData.walletId} />
                <LedgerHistoryTable walletId={initialData.walletId} />
              </section>
            )}
          </div>
        </div>

        <div className="p-4 border-t shrink-0 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
          <Button variant="outline" onClick={onClose} className="bg-slate-200 dark:bg-slate-700/50 hover:bg-slate-200 dark:bg-slate-700 border-none text-slate-700 dark:text-slate-300">
            <X className="mr-2 h-4 w-4" /> Close
          </Button>
          {isViewMode ? (
            <Button onClick={() => window.print()} className="bg-slate-800 hover:bg-slate-700 text-white px-6">
              Print Preview
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={loading} className="bg-[#00b884] hover:bg-[#00a375] text-white px-6">
              {loading ? 'Saving...' : 'Save'}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
