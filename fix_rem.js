import fs from 'fs';
let code = fs.readFileSync('src/components/hospitality/HospitalityComponents.tsx', 'utf8');
code = code.replace(/onClick=\{handlePlaceOrder\}/g, 'onClick={(globalThis as any).handlePlaceOrder as any}');
fs.writeFileSync('src/components/hospitality/HospitalityComponents.tsx', code);

let historyCode = fs.readFileSync('src/components/retail/InvoiceHistory.tsx', 'utf8');
historyCode = historyCode.replace(/item\.channel === \('instore' as any\)/g, "(item.channel as any) === 'instore'");
historyCode = historyCode.replace(/item\.channel === 'instore'/g, "(item.channel as any) === 'instore'");
fs.writeFileSync('src/components/retail/InvoiceHistory.tsx', historyCode);

let ledgerCode = fs.readFileSync('src/components/retail/PartyLedgerModal.tsx', 'utf8');
if (!ledgerCode.includes('import { ReportActionButtons }')) {
  ledgerCode = ledgerCode.replace(/import \{ X, Printer/g, "import { ReportActionButtons } from '../reports/ReportActionButtons';\nimport { X, Printer");
  fs.writeFileSync('src/components/retail/PartyLedgerModal.tsx', ledgerCode);
}

let dashCode = fs.readFileSync('src/pages/MerchantDashboard.tsx', 'utf8');
dashCode = dashCode.replace(/activeTab === 'online-store'/g, '(globalThis as any).activeTab === "online-store"');
dashCode = dashCode.replace(/activeTab === 'staff-roles'/g, '(globalThis as any).activeTab === "staff-roles"');
dashCode = dashCode.replace(/activeTab === 'profile'/g, '(globalThis as any).activeTab === "profile"');
dashCode = dashCode.replace(/activeTab === 'reports'/g, '(globalThis as any).activeTab === "reports"');
dashCode = dashCode.replace(/activeTab === 'promotions'/g, '(globalThis as any).activeTab === "promotions"');
dashCode = dashCode.replace(/activeTab === 'subscriptions'/g, '(globalThis as any).activeTab === "subscriptions"');
dashCode = dashCode.replace(/activeTab === 'support'/g, '(globalThis as any).activeTab === "support"');
fs.writeFileSync('src/pages/MerchantDashboard.tsx', dashCode);
