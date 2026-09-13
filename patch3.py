import sys

with open("src/components/retail/CreateInwardPayment.tsx", "r") as f:
    content = f.read()

import_target = "import { toast } from 'sonner';"
import_replacement = """import { toast } from 'sonner';
import { printBillForChannel, BillData } from '@/src/lib/billRenderer';
import { tenantScopedKey } from '@/src/lib/tenantStorage';"""

target = """  const handleSubmit = async () => {
    if (!selectedCustomer || !currentTenantId || !user || totalToRecord <= 0) return;
    setSaving(true);
    const supabase = getSupabaseClient();
    if (!supabase) { setSaving(false); return; }

    let note = referenceNote;
    if (paymentMethod === 'cheque') note = ('Cheque #' + chequeNumber + ', ' + bankName + '. ' + referenceNote).trim();
    if (paymentMethod === 'upi') note = ('UPI Ref: ' + upiRef + '. ' + referenceNote).trim();

    try {
      const billsToPay = pendingBills.filter(b => b.checked && parseFloat(b.payAmount) > 0);
      for (const bill of billsToPay) {
        const { error } = await supabase.rpc('record_customer_payment', {
          p_tenant_id: currentTenantId,
          p_customer_id: selectedCustomer.id,
          p_sales_invoice_id: bill.type === 'invoice' ? bill.id : null,
          p_amount: parseFloat(bill.payAmount),
          p_payment_method: paymentMethod,
          p_payment_date: paymentDate,
          p_reference_note: note || null,
          p_created_by: user.id,
          p_delivery_challan_outward_id: bill.type === 'challan' ? bill.id : null
        });
        if (error) throw error;
      }

      const onAccount = parseFloat(onAccountAmount) || 0;
      if (onAccount > 0) {
        const { error } = await supabase.rpc('record_customer_payment', {
          p_tenant_id: currentTenantId,
          p_customer_id: selectedCustomer.id,
          p_sales_invoice_id: null,
          p_amount: onAccount,
          p_payment_method: paymentMethod,
          p_payment_date: paymentDate,
          p_reference_note: note || null,
          p_created_by: user.id,
          p_delivery_challan_outward_id: null
        });
        if (error) throw error;
      }

      toast.success('Payment recorded successfully');
      onBack();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };"""

replacement = """  const handleSubmit = async () => {
    if (!selectedCustomer || !currentTenantId || !user || totalToRecord <= 0) return;
    setSaving(true);
    const supabase = getSupabaseClient();
    if (!supabase) { setSaving(false); return; }

    let note = referenceNote;
    if (paymentMethod === 'cheque') note = ('Cheque #' + chequeNumber + ', ' + bankName + '. ' + referenceNote).trim();
    if (paymentMethod === 'upi') note = ('UPI Ref: ' + upiRef + '. ' + referenceNote).trim();

    try {
      const billsToPay = pendingBills.filter(b => b.checked && parseFloat(b.payAmount) > 0);
      for (const bill of billsToPay) {
        const { error } = await supabase.rpc('record_customer_payment', {
          p_tenant_id: currentTenantId,
          p_customer_id: selectedCustomer.id,
          p_sales_invoice_id: bill.type === 'invoice' ? bill.id : null,
          p_amount: parseFloat(bill.payAmount),
          p_payment_method: paymentMethod,
          p_payment_date: paymentDate,
          p_reference_note: note || null,
          p_created_by: user.id,
          p_delivery_challan_outward_id: bill.type === 'challan' ? bill.id : null
        });
        if (error) throw error;
      }

      const onAccount = parseFloat(onAccountAmount) || 0;
      if (onAccount > 0) {
        const { error } = await supabase.rpc('record_customer_payment', {
          p_tenant_id: currentTenantId,
          p_customer_id: selectedCustomer.id,
          p_sales_invoice_id: null,
          p_amount: onAccount,
          p_payment_method: paymentMethod,
          p_payment_date: paymentDate,
          p_reference_note: note || null,
          p_created_by: user.id,
          p_delivery_challan_outward_id: null
        });
        if (error) throw error;
      }

      // Print a payment receipt.
      try {
        const savedSettingsStr = localStorage.getItem(tenantScopedKey('posSettings', currentTenantId));
        const savedSettings = savedSettingsStr ? JSON.parse(savedSettingsStr) : null;
        const prefix = savedSettings?.['inward_payment']?.prefix || 'RCPT-IN-';
        const printerSize = savedSettings?.['inward_payment']?.printerSize || '80mm';
        const receiptNumber = prefix + Date.now().toString().slice(-8);

        const { data: branchInfo } = activeBranchId
          ? await supabase.from('branches').select('branch_name, address').eq('id', activeBranchId).maybeSingle()
          : { data: null };
        const { data: tenantData } = await supabase.from('tenants').select('business_name').eq('id', currentTenantId).maybeSingle();
        const { data: brandingInfo } = await supabase.from('print_branding_settings').select('*').eq('tenant_id', currentTenantId).maybeSingle();

        const receiptItems = [
          ...billsToPay.map(b => ({
            name: `Applied to ${b.type === 'invoice' ? 'Invoice' : 'Delivery Challan'} ${b.number}`,
            qty: 1,
            rate: parseFloat(b.payAmount),
            amount: parseFloat(b.payAmount)
          })),
          ...(onAccount > 0 ? [{ name: 'On Account / Advance', qty: 1, rate: onAccount, amount: onAccount }] : [])
        ];

        const billData: BillData = {
          business: {
            name: tenantData?.business_name || 'Your Business',
            branch_name: branchInfo?.branch_name,
            address: branchInfo?.address,
            show_branch_name: brandingInfo?.show_branch_name !== false,
            show_branch_address: brandingInfo?.show_branch_address !== false,
            stamp_url: brandingInfo?.stamp_url
          },
          customer: { name: selectedCustomer.customer_name, phone: selectedCustomer.phone, address: selectedCustomer.address },
          customer_info_label: 'Received From',
          meta: { label: 'Payment Receipt', number: receiptNumber, date: new Date(paymentDate).toLocaleDateString() },
          items: receiptItems,
          totals: { grand_total: totalToRecord },
          footer: { stamp_url: brandingInfo?.stamp_url },
          bill_number_code_type: brandingInfo?.bill_number_code_type || 'none'
        };

        await printBillForChannel(supabase, currentTenantId, 'inward_payment', billData, printerSize);
      } catch (printErr: any) {
        console.error('Failed to print receipt:', printErr.message);
      }

      toast.success('Payment recorded successfully');
      onBack();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };"""

if target in content and import_target in content:
    content = content.replace(import_target, import_replacement)
    content = content.replace(target, replacement)
    with open("src/components/retail/CreateInwardPayment.tsx", "w") as f:
        f.write(content)
    print("Patched successfully")
else:
    print("Target not found")
