import fs from 'fs';
const file = 'src/components/reports/BatchReportView.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetB = "  const statusLabels: Record<string, string> = {    expired: 'Expired',    expiring_soon: 'Expiring Soon',    ok: 'OK',    none: 'No Expiry'  };";
const repB = `  const statusLabels: Record<string, string> = {    expired: 'Expired',    expiring_soon: 'Expiring Soon',    ok: 'OK',    none: 'No Expiry'  };

  const reportRows = filteredBatches.map((b: any) => ({
    'Product': b.products?.product_name || 'Unknown',
    'Batch #': b.batch_number || '-',
    'Expiry Date': b.expiry_date || '-',
    'Status': statusLabels[getExpiryStatus(b.expiry_date)],
    'Qty Remaining': b.quantity_remaining,
    'Value': Number(b.quantity_remaining * (b.purchase_price || 0))
  }));

  const reportColumns = [
    { key: 'Product', label: 'Product' },
    { key: 'Batch #', label: 'Batch #' },
    { key: 'Expiry Date', label: 'Expiry Date' },
    { key: 'Status', label: 'Status' },
    { key: 'Qty Remaining', label: 'Qty Remaining', align: 'right' as const },
    { key: 'Value', label: 'Value', align: 'right' as const }
  ];`;

if (content.includes(targetB)) {
  content = content.replace(targetB, repB);
} else {
  // If we can't find it exactly as formatted above, let's try a generic replace right before return
  content = content.replace(/  return \(/, repB + '\n\n  return (');
}

fs.writeFileSync(file, content);
