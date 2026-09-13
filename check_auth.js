const fs = require('fs');

const files = [
  'src/contexts/AuthContext.tsx',
  'src/pages/MerchantDashboard.tsx',
  'src/components/SettingsGeneral.tsx',
  'src/components/retail/RetailPOSFullScreen.tsx',
  'src/components/retail/InvoiceHistory.tsx',
  'src/components/retail/RetailDashboard.tsx',
  'src/components/retail/RetailBillingPOS.tsx',
  'src/components/retail/CreatePurchaseInvoice.tsx',
  'src/components/retail/RetailProductsInventory.tsx',
  'src/components/retail/CreateSaleInvoice.tsx'
];

for (const file of files) {
  console.log(`\n=== ${file} ===`);
  try {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, index) => {
      if (file.includes('AuthContext.tsx')) {
         if (line.includes('tenant') || line.includes('Tenant')) {
             if (!line.includes('import') && (line.includes('const') || line.includes('let') || line.includes('state') || line.includes('user'))) {
               // Just logging a few structural tenant references
               if(line.includes('currentTenantId') || line.includes('tenant_id') || line.includes('activeTenant')) {
                   console.log(`${index + 1}: ${line.trim()}`);
               }
             }
         }
         // specific check for AuthContext state
         if(line.includes('currentTenantId') && line.includes('useState')) {
             console.log(`${index + 1}: ${line.trim()}`);
         }
      } else {
        if (line.includes('useAuth')) {
          console.log(`${index + 1}: ${line.trim()}`);
        }
      }
    });
  } catch (e) {
    console.log(`Error reading ${file}`);
  }
}
