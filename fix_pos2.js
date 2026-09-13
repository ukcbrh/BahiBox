import fs from 'fs';
let code = fs.readFileSync('src/components/retail/RetailPOSFullScreen.tsx', 'utf8');

code = code.replace(/const \[items, setItems\] = useState<any\| null; item_name: string; quantity: string; remarks: string }\[\]>\(\[\]\);/g, 'const [items, setItems] = useState<any[]>([]);');
fs.writeFileSync('src/components/retail/RetailPOSFullScreen.tsx', code);
