import fs from 'fs';

function applyPatch(file, target, replacement, description) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(file, content, 'utf8');
    console.log(`[SUCCESS] Patched: ${description}`);
  } else {
    console.error(`[ERROR] Target not found for: ${description}`);
  }
}

// 1. DeliveryChallanInwardPage - select query
applyPatch('src/components/retail/RetailPOSFullScreen.tsx',
`    const { data: prodData } = await supabase.from('products').select('id, product_name').eq('tenant_id', currentTenantId).eq('is_active', true).order('product_name');`,
`    const { data: prodData } = await supabase.from('products').select('id, product_name, purchase_price').eq('tenant_id', currentTenantId).eq('is_active', true).order('product_name');`,
'DeliveryChallanInwardPage select query');

// 2. DeliveryChallanInwardPage - addProductItem
applyPatch('src/components/retail/RetailPOSFullScreen.tsx',
`  const addProductItem = (p: any) => {
    setItems(prev => [...prev, { product_id: p.id, item_name: p.product_name, quantity: '1', remarks: '', unit_cost: '', batch_number: '', expiry_date: '', mfg_date: '', size: '', colour: '', hsn_code: '', mrp: '', discount: '' } as any]);
    setProductSearch('');
  };`,
`  const addProductItem = (p: any) => {
    setItems(prev => [...prev, { product_id: p.id, item_name: p.product_name, quantity: '1', remarks: '', unit_cost: p.purchase_price || '', batch_number: '', expiry_date: '', mfg_date: '', size: '', colour: '', hsn_code: '', mrp: '', discount: '' } as any]);
    setProductSearch('');
  };`,
'DeliveryChallanInwardPage addProductItem');

// 3. billRenderer.ts - amount header bug
applyPatch('src/lib/billRenderer.ts',
`  const showHsn = config.show_hsn;
  const striped = config.striped;
  const cols = ['#', 'Item', showHsn ? 'HSN' : null, 'Qty', it_has_rate(items) ? 'Rate' : null, config.show_batch ? 'Batch' : null, it_has_rate(items) ? 'Amount' : null].filter(Boolean);

  function it_has_rate(arr: BillItem[]) { return arr.some(i => i.rate !== undefined); }`,
`  const showHsn = config.show_hsn;
  const striped = config.striped;
  const cols = ['#', 'Item', showHsn ? 'HSN' : null, 'Qty', it_has_rate(items) ? 'Rate' : null, config.show_batch ? 'Batch' : null, it_has_amount(items) ? 'Amount' : null].filter(Boolean);

  function it_has_rate(arr: BillItem[]) { return arr.some(i => i.rate !== undefined); }
  function it_has_amount(arr: BillItem[]) { return arr.some(i => i.amount !== undefined); }`,
'billRenderer amount header bug');

