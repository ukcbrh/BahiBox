import fs from 'fs';
let code = fs.readFileSync('src/pages/MerchantDashboard.tsx', 'utf8');
code = code.replace(/const \[modules, setModules\] = useState\(\[\]\);/g, 'const [modules, setModules] = useState<any[]>([]);');
code = code.replace(/const \[selectedModule, setSelectedModule\] = useState\(null\);/g, 'const [selectedModule, setSelectedModule] = useState<any | null>(null);');
code = code.replace(/const \[branches, setBranches\] = useState\(\[\]\);/g, 'const [branches, setBranches] = useState<any[]>([]);');
fs.writeFileSync('src/pages/MerchantDashboard.tsx', code);
