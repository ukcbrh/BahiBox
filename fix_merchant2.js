import fs from 'fs';
let code = fs.readFileSync('src/pages/MerchantDashboard.tsx', 'utf8');
code = code.replace(/DEBUG10: RENDER activeTab=', JSON\.stringify\(activeTab\)/g, "DEBUG10: RENDER activeTab=', JSON.stringify((globalThis as any).activeTab)");
code = code.replace(/activeTab === 'dashboard'/g, '(globalThis as any).activeTab === "dashboard"');
code = code.replace(/activeTab === 'settings'/g, '(globalThis as any).activeTab === "settings"');
fs.writeFileSync('src/pages/MerchantDashboard.tsx', code);
