import fs from 'fs';

const targets = [
  { file: 'src/components/retail/RetailPOSFullScreen.tsx', func: 'printOrderBillAndLabel' },
  { file: 'src/pages/MerchantDashboard.tsx', func: 'printOrderBillAndLabel' }
];

for (const t of targets) {
  const content = fs.readFileSync(t.file, 'utf8');
  const lines = content.split('\n');
  
  let funcLine = -1;
  for(let i=0; i<lines.length; i++) {
      if(lines[i].includes(t.func)) {
          funcLine = i;
          break;
      }
  }

  if (funcLine !== -1) {
      let foundBillData = false;
      for (let i = funcLine; i < funcLine + 300; i++) {
          if (lines[i] && lines[i].includes('const billData')) {
              foundBillData = true;
              let braceCount = 0;
              let closingLineIdx = -1;
              for(let j=i; j < i + 300; j++) {
                  if (lines[j].includes('};')) {
                      closingLineIdx = j;
                      break;
                  }
              }
              if(closingLineIdx !== -1) {
                  console.log(`\n--- ${t.file}:${closingLineIdx} (inside printOrderBillAndLabel) ---`);
                  console.log(lines.slice(Math.max(0, closingLineIdx - 3), closingLineIdx + 1).join('\n'));
              } else {
                  console.log(`Could not find closing brace for billData in ${t.file} starting at ${i}`);
              }
              break;
          }
      }
      if (!foundBillData) {
          console.log(`\n--- ${t.file} (inside printOrderBillAndLabel) ---`);
          console.log("Could not find 'const billData'");
      }
  }
}
