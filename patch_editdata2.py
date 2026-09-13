import base64

def patch_file(filepath, target_b64, repl_b64):
    target = base64.b64decode(target_b64).decode('utf-8')
    repl = base64.b64decode(repl_b64).decode('utf-8')
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    if target not in content:
        print(f"FAILED to find target in {filepath}")
        return False
        
    new_content = content.replace(target, repl)
    with open(filepath, 'w') as f:
        f.write(new_content)
    print(f"SUCCESS: Patched {filepath}")
    return True

target_b64 = base64.b64encode("""  useEffect(() => {
    if (editData) {
      if (editData.invoiceNo) setInvoiceNo(editData.invoiceNo);
      if (editData.selectedCustomer) setSelectedCustomer(editData.selectedCustomer);
      if (editData.items && editData.items.length > 0) setItems(editData.items);
      
      if (editData.challanNo) setChallanNo(editData.challanNo);
      if (editData.challanDate) setChallanDate(editData.challanDate);
      if (editData.poNo) setPoNo(editData.poNo);
      if (editData.poDate) setPoDate(editData.poDate);
      if (editData.lrNo) setLrNo(editData.lrNo);
      if (editData.ewayNo) setEwayNo(editData.ewayNo);
      if (editData.deliveryMode) setDeliveryMode(editData.deliveryMode);
    }
  }, [editData]);""".encode('utf-8')).decode('utf-8')

repl_b64 = base64.b64encode("""  useEffect(() => {
    if (editData) {
      if (editData.invoiceNo) {
        // If it's a single string like "CHAL-001", we can optionally split it, or just set it to the part.
        // For simplicity, we can set the prefix/part explicitly since invoiceNo is a derived variable.
        setInvoicePrefix('');
        setInvoiceNumberPart(editData.invoiceNo);
        setInvoiceSuffix('');
      }
      if (editData.selectedCustomer) setSelectedCustomer(editData.selectedCustomer);
      if (editData.items && editData.items.length > 0) setItems(editData.items);
      
      if (editData.challanNo) setChallanNo(editData.challanNo);
      if (editData.challanDate) setChallanDate(editData.challanDate);
      if (editData.poNo) setPoNo(editData.poNo);
      if (editData.poDate) setPoDate(editData.poDate);
      if (editData.lrNo) setLrNo(editData.lrNo);
      if (editData.ewayNo) setEwayNo(editData.ewayNo);
      if (editData.deliveryMode) setDeliveryMode(editData.deliveryMode);
    }
  }, [editData]);""".encode('utf-8')).decode('utf-8')

patch_file('src/components/retail/CreateDeliveryChallanOutward.tsx', target_b64, repl_b64)
