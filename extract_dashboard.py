import re

with open('src/pages/MerchantDashboard.tsx', 'r') as f:
    content = f.read()

print("--- BLOCK 1 (fetchMenu useEffect start) ---")
idx1 = content.find("useEffect(() => {\n    let isMounted = true;\n    const fetchMenu = async () => {\n      const supabase = getSupabaseClient();")
if idx1 != -1:
    end1 = content.find("});", idx1) + 3
    print(repr(content[idx1:end1]))

print("--- BLOCK 2 (dependency array) ---")
idx2 = content.find("}, [user, currentTenantId, currentPermissions]);")
if idx2 != -1:
    print(repr(content[idx2:idx2+len("}, [user, currentTenantId, currentPermissions]);")]))

print("--- BLOCK 3 (fetchMerchantSubscriptions function) ---")
idx3 = content.find("  const fetchMerchantSubscriptions = async (merchantId: string) => {")
if idx3 != -1:
    end3 = content.find("  };\n", idx3) + 5
    print(repr(content[idx3:end3]))

print("--- BLOCK 4 (fetchMerchantSubscriptions call) ---")
idx4 = content.find("fetchMerchantSubscriptions(currentTenantId || merchantDetails.id);")
if idx4 != -1:
    print(repr(content[idx4:idx4+len("fetchMerchantSubscriptions(currentTenantId || merchantDetails.id);")]))
