with open('src/pages/MerchantDashboard.tsx', 'r') as f:
    content = f.read()

target1 = """  useEffect(() => {
    let isMounted = true;
    const fetchMenu = async () => {
      const supabase = getSupabaseClient();
      if (supabase && user) {
        try {
          let finalMenu: any[] = [];
          
          if (currentTenantId) {
            const { data, error } = await supabase.rpc('get_tenant_menu', {
              checking_tenant_id: currentTenantId,
              checking_user_id: user.id
            });"""

repl1 = """  useEffect(() => {
    let isMounted = true;
    const fetchMenu = async () => {
      const supabase = getSupabaseClient();
      if (supabase && user) {
        try {
          let finalMenu: any[] = [];
          
          if (currentTenantId) {
            const resolvedModuleKey = activeModuleState 
              ? moduleMaster.find(m => m.name === activeModuleState)?.module_key 
              : undefined;
            const { data, error } = await supabase.rpc('get_tenant_menu', {
              checking_tenant_id: currentTenantId,
              checking_user_id: user.id,
              checking_module_key: resolvedModuleKey || null
            });"""

if target1 in content:
    content = content.replace(target1, repl1)
else:
    print("Could not find target1")

target2 = "  }, [user, currentTenantId, currentPermissions]);"
repl2 = "  }, [user, currentTenantId, currentPermissions, activeModuleState, moduleMaster]);"
if target2 in content:
    content = content.replace(target2, repl2)
else:
    print("Could not find target2")

target3 = """  const fetchMerchantSubscriptions = async (merchantId: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase.from('merchant_subscriptions').select('*').eq('tenant_id', merchantId);
    // Since we don't know exactly what this did, we just fetch to trigger any reactive states or let it be.
  };
"""
repl3 = ""
if target3 in content:
    content = content.replace(target3, repl3)
else:
    print("Could not find target3")

target4 = "fetchMerchantSubscriptions(currentTenantId || merchantDetails.id);"
repl4 = "refreshSubscriptions();"
if target4 in content:
    content = content.replace(target4, repl4)
else:
    print("Could not find target4")

with open('src/pages/MerchantDashboard.tsx', 'w') as f:
    f.write(content)
print("Updated successfully")
