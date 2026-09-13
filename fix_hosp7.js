import fs from 'fs';
let code = fs.readFileSync('src/components/hospitality/HospitalityComponents.tsx', 'utf8');
code = code.replace(/const \[authLoading, setAuthLoading\] = useState\(false\);/g, 'const [authLoading, setAuthLoading] = useState(false);\n  const [loading, setLoading] = useState(false);');
code = code.replace(/setAuthLoading\(false\)/g, 'setLoading(false)');
code = code.replace(/setAuthLoading\(true\)/g, 'setLoading(true)');
fs.writeFileSync('src/components/hospitality/HospitalityComponents.tsx', code);
