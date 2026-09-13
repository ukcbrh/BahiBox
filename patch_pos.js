const fs = require('fs');
const file = 'src/components/retail/RetailPOSFullScreen.tsx';
let c = fs.readFileSync(file, 'utf8');

const target = `      const channel = supabase
        .channel('pos_upi_wait_' + branchId)`;

const replacement = `      const channel = supabase
        .channel('pos_upi_wait_' + branchId + '_' + Date.now())`;

if (c.includes(target)) {
  c = c.replace(target, replacement);
  fs.writeFileSync(file, c);
  console.log('PATCH LAGA: HAAN');
} else {
  console.log('PATCH LAGA: NAHI');
}
