const fs = require('fs');
let content = fs.readFileSync('src/pages/Pricing.tsx', 'utf8');

const importReplacement = `import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Check, ChevronDown } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import type { ModuleType } from '../types';

const availableModules: ModuleType[] = [
  'Retail POS',
  'Manufacturing ERP',
  'Education',
  'Health Care',
  'Hotel/Restaurant',
  'Transport Management',
  'Daily Services',
  'Agri Management'
];`;

content = content.replace(/import React.*useDocumentTitle';/s, importReplacement);

const componentStartReplace = `export default function Pricing() {
  useDocumentTitle('BahiBox | Pricing');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const moduleName = searchParams.get('module') || 'Retail POS';

  const handleSelectPlan = (plan: string) => {
    navigate(\`/checkout?module=\${encodeURIComponent(moduleName)}&plan=\${encodeURIComponent(plan)}\`);
  };`;

content = content.replace(/export default function Pricing\(\) \{.*?navigate\(\`\/checkout\?module=\\\$\{\encodeURIComponent\(moduleName\)\}&plan=\\\$\{\encodeURIComponent\(plan\)\}\`\);\s*\};/s, componentStartReplace);

const headingReplace = `<h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
            Pricing for 
            <div className="inline-block relative ml-2">
              <select 
                className="appearance-none bg-transparent border-b-2 border-primary text-primary pr-8 pl-2 py-1 outline-none cursor-pointer hover:bg-slate-100 rounded-t transition-colors"
                value={moduleName}
                onChange={(e) => setSearchParams({ module: e.target.value })}
              >
                {availableModules.map(mod => (
                  <option key={mod} value={mod}>{mod}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 text-primary pointer-events-none" />
            </div>
          </h1>`;

content = content.replace(/<h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">\s*Pricing for \{moduleName\}\s*<\/h1>/s, headingReplace);

fs.writeFileSync('src/pages/Pricing.tsx', content);
