import fs from 'fs';
let code = fs.readFileSync('src/components/hospitality/HospitalityComponents.tsx', 'utf8');
code = code.replace(/import \{ Truck,  /g, 'import { ');
fs.writeFileSync('src/components/hospitality/HospitalityComponents.tsx', code);
