import fs from 'fs';
let dashCode = fs.readFileSync('src/pages/MerchantDashboard.tsx', 'utf8');
dashCode = dashCode.replace(/activeTab === 'online-store'/g, '(globalThis as any).activeTab === "online-store"');
dashCode = dashCode.replace(/activeTab === 'staff-roles'/g, '(globalThis as any).activeTab === "staff-roles"');
dashCode = dashCode.replace(/activeTab === 'profile'/g, '(globalThis as any).activeTab === "profile"');
dashCode = dashCode.replace(/activeTab === 'reports'/g, '(globalThis as any).activeTab === "reports"');
dashCode = dashCode.replace(/activeTab === 'promotions'/g, '(globalThis as any).activeTab === "promotions"');
dashCode = dashCode.replace(/activeTab === 'subscriptions'/g, '(globalThis as any).activeTab === "subscriptions"');
dashCode = dashCode.replace(/activeTab === 'support'/g, '(globalThis as any).activeTab === "support"');

// these were the problem ones:
dashCode = dashCode.replace(/console\.log\('DEBUG10: RENDER activeTab=', JSON\.stringify\(activeTab\)/g, "console.log('DEBUG10: RENDER activeTab=', JSON.stringify((globalThis as any).activeTab)");
dashCode = dashCode.replace(/activeTab === 'dashboard'/g, '(globalThis as any).activeTab === "dashboard"');
dashCode = dashCode.replace(/activeTab === 'settings'/g, '(globalThis as any).activeTab === "settings"');
dashCode = dashCode.replace(/activeTab === 'pos'/g, '(globalThis as any).activeTab === "pos"');
dashCode = dashCode.replace(/activeTab === 'inventory'/g, '(globalThis as any).activeTab === "inventory"');
dashCode = dashCode.replace(/activeTab === 'billing'/g, '(globalThis as any).activeTab === "billing"');
dashCode = dashCode.replace(/activeTab === 'marketing'/g, '(globalThis as any).activeTab === "marketing"');

// Fix InvoiceHistory
let historyCode = fs.readFileSync('src/components/retail/InvoiceHistory.tsx', 'utf8');
historyCode = historyCode.replace(/item\.channel === 'instore'/g, "(item as any).channel === 'instore'");
historyCode = historyCode.replace(/\(item\.channel as any\) === 'instore'/g, "(item as any).channel === 'instore'");
fs.writeFileSync('src/components/retail/InvoiceHistory.tsx', historyCode);

fs.writeFileSync('src/pages/MerchantDashboard.tsx', dashCode);
