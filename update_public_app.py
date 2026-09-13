with open('src/pages/PublicApp.tsx', 'r') as f:
    content = f.read()

target = """        const tenantIds = [...new Set(branchesData.map((b: any) => b.tenant_id))];
        
        const { data: tenantsData, error: tenantsError } = await supabase
          .from('tenants')
          .select('id, business_name, business_type')
          .in('id', tenantIds)
          .eq('business_type', 'retail');
          
        if (tenantsError) console.error("Tenants fetch error:", tenantsError);
          
        if (!tenantsData || tenantsData.length === 0) {
           if (isMounted) { setMarketplaceStores([]); setMarketplaceProducts([]); setMarketplaceLoading(false); }
           return;
        }"""

repl = """        const tenantIds = [...new Set(branchesData.map((b: any) => b.tenant_id))];

        const { data: retailSubsData } = await supabase
          .from('merchant_subscriptions')
          .select('tenant_id, subscription_plans!inner(module_key)')
          .in('tenant_id', tenantIds)
          .eq('status', 'active')
          .eq('subscription_plans.module_key', 'retail');

        const retailEligibleIds = [...new Set((retailSubsData || []).map((s: any) => s.tenant_id))];

        const { data: tenantsData, error: tenantsError } = await supabase
          .from('tenants')
          .select('id, business_name, business_type')
          .in('id', retailEligibleIds.length > 0 ? retailEligibleIds : ['00000000-0000-0000-0000-000000000000']);
          
        if (tenantsError) console.error("Tenants fetch error:", tenantsError);
          
        if (!tenantsData || tenantsData.length === 0) {
           if (isMounted) { setMarketplaceStores([]); setMarketplaceProducts([]); setMarketplaceLoading(false); }
           return;
        }"""

if target in content:
    content = content.replace(target, repl)
    with open('src/pages/PublicApp.tsx', 'w') as f:
        f.write(content)
    print("Updated successfully")
else:
    print("Could not find exact target, trying regex or alternative approach...")
