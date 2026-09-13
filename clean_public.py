import sys

with open('src/pages/PublicApp.tsx', 'r') as f:
    content = f.read()

# Remove states
states_target = """  const [stores, setStores] = useState<any[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');"""
content = content.replace(states_target, "")

# Remove fetchStores useEffect
fetch_target = """  useEffect(() => {
    let isMounted = true;
    const fetchStores = async () => {
      if (tenant) return; // Don't fetch directory if in tenant mode
      setLoadingStores(true);
      try {
        const supabase = getSupabaseClient();
        if (!supabase) return;
        
        // 1. Fetch active branches
        const { data: branchesData, error: branchesError } = await supabase
          .from('branches')
          .select('*')
          .eq('is_online_store_active', true);
          
        if (branchesError || !branchesData) throw branchesError;
        if (branchesData.length === 0) {
           if (isMounted) { setStores([]); setLoadingStores(false); }
           return;
        }
        
        const tenantIds = [...new Set(branchesData.map((b: any) => b.tenant_id))];
        
        // 2. Fetch tenants
        const { data: tenantsData } = await supabase
          .from('tenants')
          .select('id, business_name')
          .in('id', tenantIds);
          
        // 3. Fetch branding
        const { data: brandingData } = await supabase
          .from('merchant_branding')
          .select('*')
          .in('tenant_id', tenantIds)
          .eq('is_whitelabel_active', true);
          
        const tenantsMap = new globalThis.Map(tenantsData?.map((t: any) => [t.id, t.business_name]));
        const brandingMap = new globalThis.Map(brandingData?.map((b: any) => [b.tenant_id, b]));
        
        const mergedStores = branchesData.map((branch: any) => {
          const brand = brandingMap.get(branch.tenant_id) as any;
          return {
             ...branch,
             business_name: tenantsMap.get(branch.tenant_id) || 'Unknown Store',
             brand_name: brand?.brand_name || tenantsMap.get(branch.tenant_id) || 'Unknown Store',
             logo_url: brand?.logo_url || '',
             primary_color: brand?.primary_color || '#3b82f6'
          };
        });
        
        if (isMounted) setStores(mergedStores);
      } catch(err) {
        console.error("Failed to fetch stores:", err);
      } finally {
        if (isMounted) setLoadingStores(false);
      }
    };
    fetchStores();
    return () => { isMounted = false; };
  }, [tenant]);"""

if fetch_target in content:
    content = content.replace(fetch_target, "")
    with open('src/pages/PublicApp.tsx', 'w') as f:
        f.write(content)
    print("Cleaned up states and fetchStores!")
else:
    print("Could not find fetchStores to clean!")

