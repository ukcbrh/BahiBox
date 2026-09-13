import fs from 'fs';
const lines = fs.readFileSync('src/components/retail/RetailPOSFullScreen.tsx', 'utf-8').split('\n');

function getBlock(startText, openChar, closeChar, startIndex) {
    let idx = lines.findIndex((l, i) => i >= startIndex && l.includes(startText));
    if (idx === -1) return "NOT FOUND";
    let result = [];
    let depth = 0;
    let started = false;
    for (let i = idx; i < lines.length; i++) {
        result.push(lines[i]);
        for (let char of lines[i]) {
            if (char === openChar) { depth++; started = true; }
            if (char === closeChar) { depth--; }
        }
        if (started && depth === 0) break;
    }
    return result.join('\n');
}

let inwIdx = lines.findIndex(l => l.includes('const DeliveryChallanInwardPage'));
let outIdx = lines.findIndex(l => l.includes('const DeliveryChallanOutwardPage'));

console.log("--- INWARD addProductItem ---");
console.log(getBlock('const addProductItem =', '{', '}', inwIdx));

console.log("\n--- INWARD p_items mapping ---");
console.log(getBlock('p_items: items.map', '(', ')', inwIdx));

console.log("\n--- OUTWARD addProductItem ---");
console.log(getBlock('const addProductItem =', '{', '}', outIdx));

console.log("\n--- OUTWARD p_items mapping ---");
console.log(getBlock('p_items: items.map', '(', ')', outIdx));
