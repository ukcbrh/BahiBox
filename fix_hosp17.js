import fs from 'fs';
let code = fs.readFileSync('src/components/hospitality/HospitalityComponents.tsx', 'utf8');
code = code.replace(/const \(globalThis as any\)\.effectiveTableId = tableId \|\| selectedKioskTableId;/g, 'const effectiveTableId = tableId || selectedKioskTableId;');
fs.writeFileSync('src/components/hospitality/HospitalityComponents.tsx', code);
