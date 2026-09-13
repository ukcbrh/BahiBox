with open('src/pages/PublicApp.tsx', 'r') as f:
    content = f.read()

idx1 = content.find("        const tenantIds = [...new Set(branchesData.map((b: any) => b.tenant_id))];")
if idx1 != -1:
    end1 = content.find("        if (!tenantsData || tenantsData.length === 0) {", idx1)
    if end1 != -1:
        end1 = content.find("           return;\n        }", end1) + len("           return;\n        }")
        print("```tsx\n" + content[idx1:end1] + "\n```")
