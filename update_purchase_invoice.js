const fs = require('fs');
const file = './src/components/retail/CreatePurchaseInvoice.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  /p_supplier_id: supplierId,\s+p_po_number: invoiceNo,/,
  "p_supplier_id: supplierId,\n        p_invoice_number: invoiceNo,\n        p_invoice_date: invoiceDate,\n        p_po_number: invoiceNo,"
);
fs.writeFileSync(file, content);
console.log('done');
