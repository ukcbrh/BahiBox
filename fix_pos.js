import fs from 'fs';
let code = fs.readFileSync('src/components/retail/RetailPOSFullScreen.tsx', 'utf8');

code = code.replace(/item\./g, '(item as any).');
code = code.replace(/\{ product_id: string | null; item_name: string; quantity: string; remarks: string; \}/g, 'any');

fs.writeFileSync('src/components/retail/RetailPOSFullScreen.tsx', code);
