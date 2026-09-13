const fs = require('fs');
let content = fs.readFileSync('src/pages/Login.tsx', 'utf8');
const search = 'export default function Login() {';
const replace = `const debugLog = (msg: string) => {
  try {
    const existing = JSON.parse(sessionStorage.getItem('bahibox_debug_log') || '[]');
    existing.push(new Date().toLocaleTimeString() + ' - ' + msg);
    sessionStorage.setItem('bahibox_debug_log', JSON.stringify(existing));
  } catch (e) {}
};

export default function Login() {`;
if (content.includes(search)) {
  content = content.replace(search, replace);
  fs.writeFileSync('src/pages/Login.tsx', content);
  console.log('Login.tsx helper patched successfully.');
} else {
  console.log('Not found in Login.tsx');
}
