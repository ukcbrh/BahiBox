const fs = require('fs');
const file = './src/pages/MerchantDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  "const isHotelMode =",
  "const isRetailMode = activeStr.includes('retail') || effectiveModule === 'Retail POS' || !activeModuleState || activeModuleState === 'Retail POS';\n  const isHotelMode ="
);

content = content.replace(
  "if (effectiveModule === 'Retail POS' || activeStr.includes('retail')) {",
  "if (isRetailMode) {"
);

fs.writeFileSync(file, content);
console.log('done');
