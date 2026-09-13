with open('src/pages/MerchantDashboard.tsx', 'r') as f:
    content = f.read()

print("```tsx")
idx1 = content.find("useEffect(() => {\n    let isMounted = true;\n    const fetchMenu = async () => {")
if idx1 != -1:
    end1 = content.find("}, [user, currentTenantId, currentPermissions, activeModuleState, moduleMaster]);", idx1)
    if end1 != -1:
        end1 += len("}, [user, currentTenantId, currentPermissions, activeModuleState, moduleMaster]);")
        print(content[idx1:end1])

print("```\n\n```tsx")
idx2 = content.find("refreshSubscriptions();")
if idx2 != -1:
    start2 = content.rfind("              // Refresh subscriptions", 0, idx2)
    end2 = content.find("            } else if", idx2)
    print(content[start2:end2])

print("```")
