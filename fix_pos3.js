import fs from 'fs';
let code = fs.readFileSync('src/components/retail/RetailPOSFullScreen.tsx', 'utf8');
code = code.replace(/};\n\n\nexport const DeliveryChallanOutwardPage/g, '}\n\n\nexport const DeliveryChallanOutwardPage');
fs.writeFileSync('src/components/retail/RetailPOSFullScreen.tsx', code);
