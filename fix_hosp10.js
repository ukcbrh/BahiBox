import fs from 'fs';
let code = fs.readFileSync('src/components/hospitality/HospitalityComponents.tsx', 'utf8');
code = code.replace(/is_available: true, gst_rate_percent: "0",\n    gst_rate_percent: "5",/g, 'is_available: true, gst_rate_percent: "5",');
fs.writeFileSync('src/components/hospitality/HospitalityComponents.tsx', code);
