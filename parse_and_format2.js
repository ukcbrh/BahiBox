import fs from 'fs';
const content = fs.readFileSync('build_clean.txt', 'utf8');
const lines = content.replace(/\\x1B\\[[0-9;]*[a-zA-Z]/g, '').split('\n');

const last30 = lines.slice(Math.max(lines.length - 30, 0));
fs.writeFileSync('out_final2.txt', last30.join('\n'));
