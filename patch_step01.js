import fs from 'fs';

// Step 0
fs.writeFileSync('src/lib/tenantStorage.ts', `export function tenantScopedKey(baseKey: string, tenantId: string | null | undefined): string {
  return tenantId ? \`\${baseKey}__\${tenantId}\` : baseKey;
}\n`);
console.log('[SUCCESS] Step 0 applied: src/lib/tenantStorage.ts created');

// Step 1
let content1 = fs.readFileSync('src/contexts/AuthContext.tsx', 'utf8');
content1 = `import { tenantScopedKey } from '@/src/lib/tenantStorage';\n` + content1;
content1 = content1.replace(
`  const [activeBranchId, setActiveBranchIdState] = useState<string | null>(() => {
    return localStorage.getItem('bahi_active_branch_id') || null;
  });

  const setActiveBranchId = (branchId: string | null) => {
    setActiveBranchIdState(branchId);
    if (branchId) {
      localStorage.setItem('bahi_active_branch_id', branchId);
    } else {
      localStorage.removeItem('bahi_active_branch_id');
    }
  };`,
`  const [activeBranchId, setActiveBranchIdState] = useState<string | null>(null);

  // activeBranchId must be loaded AFTER currentTenantId is known (it's 
  // not available yet at initial mount), and re-loaded whenever the 
  // logged-in tenant changes — this prevents one tenant's last-selected 
  // branch from leaking into a different tenant's session on the same 
  // browser/device.
  useEffect(() => {
    if (currentTenantId) {
      const stored = localStorage.getItem(tenantScopedKey('bahi_active_branch_id', currentTenantId));
      setActiveBranchIdState(stored || null);
    } else {
      setActiveBranchIdState(null);
    }
  }, [currentTenantId]);

  const setActiveBranchId = (branchId: string | null) => {
    setActiveBranchIdState(branchId);
    const key = tenantScopedKey('bahi_active_branch_id', currentTenantId);
    if (branchId) {
      localStorage.setItem(key, branchId);
    } else {
      localStorage.removeItem(key);
    }
  };`
);
fs.writeFileSync('src/contexts/AuthContext.tsx', content1);
console.log('[SUCCESS] Step 1 applied: src/contexts/AuthContext.tsx modified');
