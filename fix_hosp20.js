import fs from 'fs';
let code = fs.readFileSync('src/components/hospitality/HospitalityComponents.tsx', 'utf8');
code = code.replace(/onCreateOrder=\{\(globalThis as any\)\.handlePlaceOrder as any\}/g, '');
fs.writeFileSync('src/components/hospitality/HospitalityComponents.tsx', code);
