import fs from 'fs';
import { execSync } from 'child_process';

const output = execSync('grep -rn "localStorage" src/', { encoding: 'utf-8' });
const lines = output.split('\n').filter(Boolean);

const results = {};
const others = [];

lines.forEach(line => {
  const match = line.match(/^(src\/[^:]+):(\d+):(.*)$/);
  if (!match) return;
  const [_, file, lineNum, content] = match;
  
  const keyMatches = [...content.matchAll(/localStorage\.(?:get|set|remove)Item\s*\(\s*(['"`])(.*?)\1/g)];
  
  if (keyMatches.length > 0) {
    keyMatches.forEach(km => {
      const key = km[2];
      if (!results[key]) results[key] = [];
      results[key].push({ file, lineNum, content: content.trim() });
    });
  } else if (content.includes('localStorage.getItem') || content.includes('localStorage.setItem') || content.includes('localStorage.removeItem')) {
     others.push({ file, lineNum, content: content.trim() });
  }
});

for (const key of Object.keys(results).sort()) {
  console.log(`\n=== Key: '${key}' ===`);
  results[key].forEach(r => {
    console.log(`${r.file}:${r.lineNum}  ${r.content}`);
  });
}

if (others.length > 0) {
  console.log(`\n=== Dynamic / Variable Keys ===`);
  others.forEach(r => {
    console.log(`${r.file}:${r.lineNum}  ${r.content}`);
  });
}
