import fs from 'fs';
let code = fs.readFileSync('src/components/hospitality/HospitalityComponents.tsx', 'utf8');

code = code.replace(/onCreateOrder=\{handleCreateFoodOrder as any\}/g, 'onCreateOrder={(globalThis as any).handleCreateFoodOrder as any}');
code = code.replace(/onPaymentConfirmed=\{handleFoodOrderConfirmed as any\}/g, 'onPaymentConfirmed={(globalThis as any).handleFoodOrderConfirmed as any}');
code = code.replace(/onCreateOrder=\{handlePlaceOrder as any\}/g, 'onCreateOrder={(globalThis as any).handlePlaceOrder as any}');
fs.writeFileSync('src/components/hospitality/HospitalityComponents.tsx', code);
