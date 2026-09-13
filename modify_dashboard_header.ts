import fs from 'fs';
let content = fs.readFileSync('src/pages/MerchantDashboard.tsx', 'utf-8');

const importStr = "import { NotificationBell } from '../components/NotificationBell';\n";
if (!content.includes('NotificationBell')) {
  const lastImportIndex = content.lastIndexOf('import ');
  const insertIndex = content.indexOf('\n', lastImportIndex) + 1;
  content = content.slice(0, insertIndex) + importStr + content.slice(insertIndex);
}

const headerTarget = `            <button 
              onClick={() => document.documentElement.classList.toggle('dark')}`;
const headerNew = `            <NotificationBell />
            <button 
              onClick={() => document.documentElement.classList.toggle('dark')}`;

if (content.includes(headerTarget) && !content.includes('<NotificationBell />')) {
  content = content.replace(headerTarget, headerNew);
  console.log('Added NotificationBell to header');
} else {
  console.log('NotificationBell already added or headerTarget not found');
}

fs.writeFileSync('src/pages/MerchantDashboard.tsx', content);
