import fs from 'fs';
['src/components/retail/CreatePurchaseInvoice.tsx', 'src/components/retail/CreateDeliveryChallanInward.tsx', 'src/components/retail/PurchaseOrderForm.tsx'].forEach(file => {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(/printBillForChannel\(supabase, currentTenantId, '([^']+)', billData, '([^']+)'\);/g, "printBillForChannel(supabase, currentTenantId as any, '$1', billData, '$2');");
  fs.writeFileSync(file, code);
});
let historyCode = fs.readFileSync('src/components/retail/InvoiceHistory.tsx', 'utf8');
historyCode = historyCode.replace(/item\.channel === 'instore'/g, "item.channel === ('instore' as any)");
fs.writeFileSync('src/components/retail/InvoiceHistory.tsx', historyCode);
