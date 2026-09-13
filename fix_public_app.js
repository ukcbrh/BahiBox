import fs from 'fs';
let code = fs.readFileSync('src/pages/PublicApp.tsx', 'utf8');

code = code.replace(/cart\[0\]\.product\?\.store/g, '(cart[0].product as any)?.store');
code = code.replace(/cart\[0\]\.product\.tenant_id/g, '(cart[0].product as any).tenant_id');
code = code.replace(/cart\[0\]\.product\.store\.id/g, '(cart[0].product as any).store.id');
code = code.replace(/item\.product\.tenant_id/g, '(item.product as any).tenant_id');
code = code.replace(/item\.product\.store/g, '(item.product as any).store');
fs.writeFileSync('src/pages/PublicApp.tsx', code);
