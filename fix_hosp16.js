import fs from 'fs';
let code = fs.readFileSync('src/components/hospitality/HospitalityComponents.tsx', 'utf8');
code = code.replace(/const \[\(globalThis as any\)\.numGuests, setNumGuests\] = useState\(1\);/g, 'const [numGuests, setNumGuests] = useState(1);');
fs.writeFileSync('src/components/hospitality/HospitalityComponents.tsx', code);
