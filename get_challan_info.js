import fs from 'fs';

const content = fs.readFileSync('src/components/retail/RetailPOSFullScreen.tsx', 'utf8');
const lines = content.split('\n');

function extractFunction(startKeyword, endBraceCount, startLineIdx) {
  let funcText = [];
  let braces = 0;
  let started = false;
  
  for (let i = startLineIdx; i < lines.length; i++) {
    funcText.push(lines[i]);
    if (lines[i].includes('{')) braces += (lines[i].match(/\{/g) || []).length;
    if (lines[i].includes('}')) braces -= (lines[i].match(/\}/g) || []).length;
    
    if (!started && lines[i].includes('{')) started = true;
    
    if (started && braces === 0) {
      break;
    }
  }
  return funcText.join('\n');
}

let inwardAddProduct = -1;
let outwardAddProduct = -1;
let inwardFetch = -1;
let outwardFetch = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const DeliveryChallanInwardPage')) {
    // found inward page, now find addProductItem and fetch
    for (let j = i; j < lines.length; j++) {
      if (lines[j].includes('const addProductItem =')) inwardAddProduct = j;
      if (lines[j].includes('from(\'products\')') && lines[j].includes('select')) inwardFetch = j;
      if (lines[j].includes('const DeliveryChallanOutwardPage')) break;
    }
  }
  if (lines[i].includes('const DeliveryChallanOutwardPage')) {
    // found outward page
    for (let j = i; j < lines.length; j++) {
      if (lines[j].includes('const addProductItem =')) outwardAddProduct = j;
      if (lines[j].includes('from(\'products\')') && lines[j].includes('select')) outwardFetch = j;
      if (lines[j].includes('const RetailPOSFullScreen =')) break;
    }
  }
}

console.log("=== INWARD addProductItem ===");
if (inwardAddProduct !== -1) console.log(extractFunction('const addProductItem', 0, inwardAddProduct));
console.log("=== INWARD fetch ===");
if (inwardFetch !== -1) console.log(lines[inwardFetch]);

console.log("\n=== OUTWARD addProductItem ===");
if (outwardAddProduct !== -1) console.log(extractFunction('const addProductItem', 0, outwardAddProduct));
console.log("=== OUTWARD fetch ===");
if (outwardFetch !== -1) console.log(lines[outwardFetch]);

