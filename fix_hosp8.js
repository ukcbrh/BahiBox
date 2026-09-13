import fs from 'fs';
let code = fs.readFileSync('src/components/hospitality/HospitalityComponents.tsx', 'utf8');
code = code.replace(/onCreateOrder=\{handleCreateFoodOrder\}/g, 'onCreateOrder={handleCreateFoodOrder as any}');
code = code.replace(/onPaymentConfirmed=\{handleFoodOrderConfirmed\}/g, 'onPaymentConfirmed={handleFoodOrderConfirmed as any}');
code = code.replace(/onCreateOrder=\{handlePlaceOrder\}/g, 'onCreateOrder={handlePlaceOrder as any}');
fs.writeFileSync('src/components/hospitality/HospitalityComponents.tsx', code);
