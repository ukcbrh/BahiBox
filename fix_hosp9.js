import fs from 'fs';
let code = fs.readFileSync('src/components/hospitality/HospitalityComponents.tsx', 'utf8');
code = code.replace(/const occSet = new Set\(\(activeBookings \|\| \[\]\)\.map\(\(b: any\) => b\.room_id\)\);/g, 'const occSet = new Set<string>((activeBookings || []).map((b: any) => String(b.room_id)));');
fs.writeFileSync('src/components/hospitality/HospitalityComponents.tsx', code);
