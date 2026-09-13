import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');
const search = "payment_qr_image_url: rzpData.image_url";
console.log("Found:", content.includes(search));
