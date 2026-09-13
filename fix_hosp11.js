import fs from 'fs';
let code = fs.readFileSync('src/components/hospitality/HospitalityComponents.tsx', 'utf8');
code = code.replace(/const \[loading, setLoading\] = useState\(false\);\n\n  useEffect/g, '\n  useEffect');
fs.writeFileSync('src/components/hospitality/HospitalityComponents.tsx', code);
