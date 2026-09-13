import sys

with open("src/components/retail/CreateOutwardPayment.tsx", "r") as f:
    content = f.read()

target1 = """    try {
      const billsToPay = pendingBills.filter(b => b.checked && parseFloat(b.payAmount) > 0);
      for (const bill of billsToPay) {
        const { error } = await supabase.rpc('record_supplier_payment', {
          p_tenant_id: currentTenantId,
          p_branch_id: activeBranchId,
          p_supplier_id: selectedSupplier.id,
          p_purchase_invoice_id: bill.type === 'invoice' ? bill.id : null,
          p_amount: parseFloat(bill.payAmount),
          p_payment_method: paymentMethod,
          p_reference_note: note || null,
          p_created_by: user.id,
          p_delivery_challan_inward_id: bill.type === 'challan' ? bill.id : null
        });
        if (error) throw error;
      }

      const onAccount = parseFloat(onAccountAmount) || 0;
      if (onAccount > 0) {
        const { error } = await supabase.rpc('record_supplier_payment', {
          p_tenant_id: currentTenantId,
          p_branch_id: activeBranchId,
          p_supplier_id: selectedSupplier.id,
          p_purchase_invoice_id: null,
          p_amount: onAccount,
          p_payment_method: paymentMethod,
          p_reference_note: note || null,
          p_created_by: user.id,
          p_delivery_challan_inward_id: null
        });
        if (error) throw error;
      }"""

replacement1 = """    try {
      const savedSettingsStrEarly = localStorage.getItem(tenantScopedKey('posSettings', currentTenantId));
      const savedSettingsEarly = savedSettingsStrEarly ? JSON.parse(savedSettingsStrEarly) : null;
      const receiptPrefix = savedSettingsEarly?.['outward_payment']?.prefix || 'RCPT-OUT-';
      const receiptNumber = receiptPrefix + Date.now().toString().slice(-8);

      const billsToPay = pendingBills.filter(b => b.checked && parseFloat(b.payAmount) > 0);
      for (const bill of billsToPay) {
        const { error } = await supabase.rpc('record_supplier_payment', {
          p_tenant_id: currentTenantId,
          p_branch_id: activeBranchId,
          p_supplier_id: selectedSupplier.id,
          p_purchase_invoice_id: bill.type === 'invoice' ? bill.id : null,
          p_amount: parseFloat(bill.payAmount),
          p_payment_method: paymentMethod,
          p_reference_note: note || null,
          p_created_by: user.id,
          p_delivery_challan_inward_id: bill.type === 'challan' ? bill.id : null,
          p_receipt_number: receiptNumber
        });
        if (error) throw error;
      }

      const onAccount = parseFloat(onAccountAmount) || 0;
      if (onAccount > 0) {
        const { error } = await supabase.rpc('record_supplier_payment', {
          p_tenant_id: currentTenantId,
          p_branch_id: activeBranchId,
          p_supplier_id: selectedSupplier.id,
          p_purchase_invoice_id: null,
          p_amount: onAccount,
          p_payment_method: paymentMethod,
          p_reference_note: note || null,
          p_created_by: user.id,
          p_delivery_challan_inward_id: null,
          p_receipt_number: receiptNumber
        });
        if (error) throw error;
      }"""

target2 = """      try {
        const savedSettingsStr = localStorage.getItem(tenantScopedKey('posSettings', currentTenantId));
        const savedSettings = savedSettingsStr ? JSON.parse(savedSettingsStr) : null;
        const prefix = savedSettings?.['outward_payment']?.prefix || 'RCPT-OUT-';
        const printerSize = savedSettings?.['outward_payment']?.printerSize || '80mm';
        const receiptNumber = prefix + Date.now().toString().slice(-8);"""

replacement2 = """      try {
        const savedSettingsStr = localStorage.getItem(tenantScopedKey('posSettings', currentTenantId));
        const savedSettings = savedSettingsStr ? JSON.parse(savedSettingsStr) : null;
        const printerSize = savedSettings?.['outward_payment']?.printerSize || '80mm';
        // NOTE: reusing the SAME receiptNumber generated earlier (before 
        // the RPC calls), so the printed receipt matches what was saved."""

if target1 in content and target2 in content:
    content = content.replace(target1, replacement1)
    content = content.replace(target2, replacement2)
    with open("src/components/retail/CreateOutwardPayment.tsx", "w") as f:
        f.write(content)
    print("Patched successfully")
else:
    print("Target not found")
    if target1 not in content: print("target1 missing")
    if target2 not in content: print("target2 missing")
