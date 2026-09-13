const fs = require('fs');

function fixHelper(file) {
    let content = fs.readFileSync(file, 'utf8');
    const search = `const alert = (msg: string) => {
  try {
    const existing = JSON.parse(sessionStorage.getItem('bahibox_debug_log') || '[]');
    existing.push(new Date().toLocaleTimeString() + ' - ' + msg);
    sessionStorage.setItem('bahibox_debug_log', JSON.stringify(existing));
  } catch (e) {}
};`;
    const replace = `const debugLog = (msg: string) => {
  try {
    const existing = JSON.parse(sessionStorage.getItem('bahibox_debug_log') || '[]');
    existing.push(new Date().toLocaleTimeString() + ' - ' + msg);
    sessionStorage.setItem('bahibox_debug_log', JSON.stringify(existing));
  } catch (e) {}
};`;
    if (content.includes(search)) {
        fs.writeFileSync(file, content.replace(search, replace));
        console.log('Fixed helper in', file);
    }
}

fixHelper('src/pages/Login.tsx');
fixHelper('src/pages/MerchantDashboard.tsx');
