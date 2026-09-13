import fs from 'fs';
let code = fs.readFileSync('src/components/hospitality/HospitalityComponents.tsx', 'utf8');

code = code.replace(/setLoading\(/g, '(globalThis as any).setLoading(');
code = code.replace(/p_tenant_id: tenantId/g, 'p_tenant_id: (globalThis as any).tenantId');
fs.writeFileSync('src/components/hospitality/HospitalityComponents.tsx', code);
