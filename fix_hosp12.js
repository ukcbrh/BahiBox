import fs from 'fs';
let code = fs.readFileSync('src/components/hospitality/HospitalityComponents.tsx', 'utf8');
code = code.replace(/setCart\(\(prev\) =>/g, 'setCart((prev: any[]) =>');
code = code.replace(/prev\.find\(\(c\)/g, 'prev.find((c: any)');
code = code.replace(/prev\.map\(\(c\)/g, 'prev.map((c: any)');
fs.writeFileSync('src/components/hospitality/HospitalityComponents.tsx', code);
