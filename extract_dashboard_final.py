with open('src/pages/MerchantDashboard.tsx', 'r') as f:
    content = f.read()

# 1. fetchMenu useEffect
idx1 = content.find("useEffect(() => {\n    let isMounted = true;\n    const fetchMenu = async () => {\n      const supabase = getSupabaseClient();")
if idx1 != -1:
    end1 = content.find("}, [user, currentTenantId, currentPermissions, activeModuleState, moduleMaster]);", idx1)
    if end1 != -1:
        end1 += len("}, [user, currentTenantId, currentPermissions, activeModuleState, moduleMaster]);")
        print("--- fetchMenu useEffect ---")
        print(content[idx1:end1])

# 2. Location of refreshSubscriptions()
idx2 = content.find("refreshSubscriptions();")
if idx2 != -1:
    start2 = content.rfind("const handleActivateFreePlan", 0, idx2)
    end2 = content.find("}, 2000);", idx2) + 9
    print("\n--- refreshSubscriptions call context ---")
    print(content[idx2-300:end2])

