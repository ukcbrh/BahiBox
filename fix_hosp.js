import fs from 'fs';
let code = fs.readFileSync('src/components/hospitality/HospitalityComponents.tsx', 'utf8');
code = code.replace(/import \{ \n  Building2, \n  Search/g, 'import { \n  Truck, \n  Building2, \n  Search');
fs.writeFileSync('src/components/hospitality/HospitalityComponents.tsx', code);
