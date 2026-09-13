import fs from 'fs';
let code = fs.readFileSync('src/components/hospitality/HospitalityComponents.tsx', 'utf8');
code = code.replace(/setOccupiedRoomIds\(occSet\);/g, 'setOccupiedRoomIds(occSet as any);');
fs.writeFileSync('src/components/hospitality/HospitalityComponents.tsx', code);
