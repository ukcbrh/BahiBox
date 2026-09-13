const fs = require('fs');
const glob = require('glob');
const cp = require('child_process');

try {
  const result = cp.execSync('grep -rn "printBillForChannel(" src/').toString();
  const lines = result.split('\n').filter(l => l.trim());
  
  for (const line of lines) {
    const match = line.match(/^(src\/[^:]+):(\d+):(.*)$/);
    if (!match) continue;
    const file = match[1];
    const lineNum = parseInt(match[2], 10);
    
    // read file
    const content = fs.readFileSync(file, 'utf8');
    const fileLines = content.split('\n');
    
    // search backwards from lineNum to find "};"
    let closingBraceLine = -1;
    for (let i = lineNum - 1; i >= 0; i--) {
      if (fileLines[i].match(/^\s*};\s*$/) || fileLines[i].match(/^\s*}\s*;\s*\/\//) || fileLines[i].includes('};')) {
        closingBraceLine = i;
        break;
      }
    }
    
    console.log(`\n--- File: ${file}:${lineNum} ---`);
    if (closingBraceLine !== -1) {
      console.log(fileLines.slice(Math.max(0, closingBraceLine - 3), closingBraceLine + 1).join('\n'));
    } else {
      console.log("Could not find closing }; nearby.");
      // Just print the lines before it
      console.log(fileLines.slice(Math.max(0, lineNum - 10), lineNum).join('\n'));
    }
  }
} catch (e) {
  console.error("Error:", e.message);
}
