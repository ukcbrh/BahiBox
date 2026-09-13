import fs from 'fs';
let code = fs.readFileSync('src/components/retail/RetailPOSFullScreen.tsx', 'utf8');
code = code.replace(/\(payload\)/g, '(payload: any)');
code = code.replace(/err\?\.message/g, '(err as any)?.message');
fs.writeFileSync('src/components/retail/RetailPOSFullScreen.tsx', code);
