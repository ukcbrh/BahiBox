const fs = require('fs');

function addImport(content, importStr) {
  if (content.includes(importStr)) return content;
  // Find the last import
  const lines = content.split('\n');
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ')) {
      lastImportIdx = i;
    }
  }
  if (lastImportIdx !== -1) {
    lines.splice(lastImportIdx + 1, 0, importStr);
    return lines.join('\n');
  } else {
    return importStr + '\n' + content;
  }
}

const tenantImport = "import { tenantScopedKey } from '@/src/lib/tenantStorage';";

// Step 2: MerchantDashboard.tsx
let f2 = 'src/pages/MerchantDashboard.tsx';
let c2 = fs.readFileSync(f2, 'utf8');
c2 = addImport(c2, tenantImport);
const find2 = "  const [activeModuleState, setActiveModuleState] = useState<ModuleType>(() => {\n" +
"    return (localStorage.getItem('bahi_active_module') as ModuleType) || (initialModule as ModuleType);\n" +
"  });\n\n" +
"  useEffect(() => {\n" +
"    if (activeModuleState) {\n" +
"      localStorage.setItem('bahi_active_module', activeModuleState);\n" +
"    }\n" +
"  }, [activeModuleState]);";
const rep2 = "  const [activeModuleState, setActiveModuleState] = useState<ModuleType>(initialModule as ModuleType);\n\n" +
"  // currentTenantId isn't known yet at the moment this component first \n" +
"  // mounts, so we can't read the tenant-scoped localStorage value in \n" +
"  // the lazy-initializer above. Once the tenant becomes known, load \n" +
"  // THAT tenant's last-active-module instead — this also correctly \n" +
"  // re-loads the right value if the user switches to a different \n" +
"  // tenant/business within the same browser session.\n" +
"  useEffect(() => {\n" +
"    if (currentTenantId) {\n" +
"      const stored = localStorage.getItem(tenantScopedKey('bahi_active_module', currentTenantId));\n" +
"      if (stored) {\n" +
"        setActiveModuleState(stored as ModuleType);\n" +
"      }\n" +
"    }\n" +
"  }, [currentTenantId]);\n\n" +
"  useEffect(() => {\n" +
"    if (activeModuleState && currentTenantId) {\n" +
"      localStorage.setItem(tenantScopedKey('bahi_active_module', currentTenantId), activeModuleState);\n" +
"    }\n" +
"  }, [activeModuleState, currentTenantId]);";
c2 = c2.replace(find2, rep2);
fs.writeFileSync(f2, c2);

// Step 3: SettingsGeneral.tsx
let f3 = 'src/components/SettingsGeneral.tsx';
let c3 = fs.readFileSync(f3, 'utf8');
c3 = addImport(c3, tenantImport);
c3 = c3.replace("const saved = localStorage.getItem('barcodeLabelSettings');", "const saved = localStorage.getItem(tenantScopedKey('barcodeLabelSettings', currentTenantId));");
c3 = c3.replace("localStorage.setItem('barcodeLabelSettings', JSON.stringify(labelSettings));", "localStorage.setItem(tenantScopedKey('barcodeLabelSettings', currentTenantId), JSON.stringify(labelSettings));");
// Replace all 2 reads for posSettings
c3 = c3.split("const saved = localStorage.getItem('posSettings');").join("const saved = localStorage.getItem(tenantScopedKey('posSettings', currentTenantId));");
c3 = c3.replace("localStorage.setItem('posSettings', JSON.stringify(settings));", "localStorage.setItem(tenantScopedKey('posSettings', currentTenantId), JSON.stringify(settings));");
fs.writeFileSync(f3, c3);

// Step 4: RetailPOSFullScreen.tsx
let f4 = 'src/components/retail/RetailPOSFullScreen.tsx';
let c4 = fs.readFileSync(f4, 'utf8');
c4 = addImport(c4, tenantImport);
// 4A
c4 = c4.replace("const saved = localStorage.getItem('delivery_challan_inward_columns');", "const saved = localStorage.getItem(tenantScopedKey('delivery_challan_inward_columns', currentTenantId));");
c4 = c4.replace("localStorage.setItem('delivery_challan_inward_columns', JSON.stringify(visibleColumns));", "localStorage.setItem(tenantScopedKey('delivery_challan_inward_columns', currentTenantId), JSON.stringify(visibleColumns));");
// 4B
c4 = c4.replace("const saved = localStorage.getItem('delivery_challan_outward_columns');", "const saved = localStorage.getItem(tenantScopedKey('delivery_challan_outward_columns', currentTenantId));");
c4 = c4.replace("localStorage.setItem('delivery_challan_outward_columns', JSON.stringify(visibleColumns));", "localStorage.setItem(tenantScopedKey('delivery_challan_outward_columns', currentTenantId), JSON.stringify(visibleColumns));");
// 4C - Only fix the first one (which is around line 841, in RetailPOSFullScreen)
c4 = c4.replace("const saved = localStorage.getItem('posSettings');", "const saved = localStorage.getItem(tenantScopedKey('posSettings', currentTenantId));");

// 4D
const find4D = "        const localStr = localStorage.getItem('local_sales_invoices');\n" +
"        let allLocal = localStr ? JSON.parse(localStr) : [];\n" +
"        allLocal = [newInvoice, ...allLocal];\n" +
"        localStorage.setItem('local_sales_invoices', JSON.stringify(allLocal));";
const rep4D = "        const localKey = tenantScopedKey('local_sales_invoices', currentTenantId);\n" +
"        const localStr = localStorage.getItem(localKey);\n" +
"        let allLocal = localStr ? JSON.parse(localStr) : [];\n" +
"        allLocal = [newInvoice, ...allLocal];\n" +
"        localStorage.setItem(localKey, JSON.stringify(allLocal));";
c4 = c4.replace(find4D, rep4D);
fs.writeFileSync(f4, c4);

// Step 5: InvoiceHistory.tsx
let f5 = 'src/components/retail/InvoiceHistory.tsx';
let c5 = fs.readFileSync(f5, 'utf8');
c5 = addImport(c5, tenantImport);
c5 = c5.split("localStorage.getItem('local_sales_invoices')").join("localStorage.getItem(tenantScopedKey('local_sales_invoices', currentTenantId))");
c5 = c5.split("localStorage.setItem('local_sales_invoices', ").join("localStorage.setItem(tenantScopedKey('local_sales_invoices', currentTenantId), ");
fs.writeFileSync(f5, c5);

// Step 6: RetailDashboard.tsx
let f6 = 'src/components/retail/RetailDashboard.tsx';
let c6 = fs.readFileSync(f6, 'utf8');
c6 = addImport(c6, tenantImport);
c6 = c6.replace("const { user } = useAuth();", "const { user, currentTenantId } = useAuth();");
c6 = c6.replace("const localData = localStorage.getItem('local_sales_invoices');", "const localData = localStorage.getItem(tenantScopedKey('local_sales_invoices', currentTenantId));");
fs.writeFileSync(f6, c6);

// Step 7: RetailBillingPOS.tsx
let f7 = 'src/components/retail/RetailBillingPOS.tsx';
let c7 = fs.readFileSync(f7, 'utf8');
c7 = addImport(c7, tenantImport);
c7 = c7.replace("const saved = localStorage.getItem('posSettings');", "const saved = localStorage.getItem(tenantScopedKey('posSettings', currentTenantId));");
fs.writeFileSync(f7, c7);

// Step 8: CreatePurchaseInvoice.tsx
let f8 = 'src/components/retail/CreatePurchaseInvoice.tsx';
let c8 = fs.readFileSync(f8, 'utf8');
c8 = addImport(c8, tenantImport);
c8 = c8.replace("const saved = localStorage.getItem('retail_inventory_columns');", "const saved = localStorage.getItem(tenantScopedKey('retail_inventory_columns', currentTenantId));");
c8 = c8.replace("localStorage.setItem('retail_inventory_columns', JSON.stringify(visibleColumns));", "localStorage.setItem(tenantScopedKey('retail_inventory_columns', currentTenantId), JSON.stringify(visibleColumns));");
fs.writeFileSync(f8, c8);

// Step 9: RetailProductsInventory.tsx
let f9 = 'src/components/retail/RetailProductsInventory.tsx';
let c9 = fs.readFileSync(f9, 'utf8');
c9 = addImport(c9, tenantImport);
c9 = c9.replace("const saved = localStorage.getItem('retail_inventory_columns');", "const saved = localStorage.getItem(tenantScopedKey('retail_inventory_columns', currentTenantId));");
c9 = c9.replace("localStorage.setItem('retail_inventory_columns', JSON.stringify(visibleColumns));", "localStorage.setItem(tenantScopedKey('retail_inventory_columns', currentTenantId), JSON.stringify(visibleColumns));");
fs.writeFileSync(f9, c9);

// Step 10: CreateSaleInvoice.tsx
let f10 = 'src/components/retail/CreateSaleInvoice.tsx';
let c10 = fs.readFileSync(f10, 'utf8');
c10 = addImport(c10, tenantImport);
c10 = c10.replace("const saved = localStorage.getItem('sale_invoice_columns');", "const saved = localStorage.getItem(tenantScopedKey('sale_invoice_columns', currentTenantId));");
c10 = c10.replace("localStorage.setItem('sale_invoice_columns', JSON.stringify(visibleColumns));", "localStorage.setItem(tenantScopedKey('sale_invoice_columns', currentTenantId), JSON.stringify(visibleColumns));");
fs.writeFileSync(f10, c10);

console.log("All patches applied.");

// Report lines
function reportLines(file, searchStr) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const res = [];
  lines.forEach((l, i) => {
    if (l.includes(searchStr)) res.push(i + 1);
  });
  console.log(file + ": tenantScopedKey found on lines: " + res.join(', '));
}

reportLines(f2, "tenantScopedKey");
reportLines(f3, "tenantScopedKey");
reportLines(f4, "tenantScopedKey");
reportLines(f5, "tenantScopedKey");
reportLines(f6, "tenantScopedKey");
reportLines(f7, "tenantScopedKey");
reportLines(f8, "tenantScopedKey");
reportLines(f9, "tenantScopedKey");
reportLines(f10, "tenantScopedKey");
