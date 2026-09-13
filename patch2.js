const fs = require('fs');

function patchInward() {
  const file = 'src/components/retail/DeliveryChallanInwardList.tsx';
  let content = fs.readFileSync(file, 'utf8');
  
  const search = `  const fetchChallans = async () => {
    if (!currentTenantId) return;
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) { setLoading(false); return; }
    const { data } = await supabase
      .from('delivery_challans_inward')
      .select('*, delivery_challan_inward_items(*)')
      .eq('tenant_id', currentTenantId)
      .order('created_at', { ascending: false });
    setChallans(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchChallans(); }, [currentTenantId]);`;
  
  const replace = `  const fetchChallans = async () => {
    if (!currentTenantId) return;
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) { setLoading(false); return; }
    let query = supabase
      .from('delivery_challans_inward')
      .select('*, delivery_challan_inward_items(*)')
      .eq('tenant_id', currentTenantId);
    if (activeBranchId) {
      query = query.eq('branch_id', activeBranchId);
    }
    const { data } = await query.order('created_at', { ascending: false });
    setChallans(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchChallans(); }, [currentTenantId, activeBranchId]);`;

  if (content.includes(search)) {
    content = content.replace(search, replace);
    fs.writeFileSync(file, content);
  } else {
    console.log("Inward patch target not found. Current block around fetchChallans:");
    console.log(content.substring(content.indexOf('fetchChallans'), content.indexOf('fetchChallans') + 500));
  }
}

function patchOutward() {
  const file = 'src/components/retail/DeliveryChallanOutwardList.tsx';
  let content = fs.readFileSync(file, 'utf8');
  
  const search1 = `  const { currentTenantId, user } = useAuth();`;
  const replace1 = `  const { currentTenantId, user, activeBranchId } = useAuth();`;

  if (content.includes(search1)) {
    content = content.replace(search1, replace1);
  }

  const search2 = `  const fetchChallans = async () => {
    if (!currentTenantId) return;
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) { setLoading(false); return; }
    const { data } = await supabase
      .from('delivery_challans_outward')
      .select('*, delivery_challan_outward_items(*)')
      .eq('tenant_id', currentTenantId)
      .order('created_at', { ascending: false });
    setChallans(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchChallans(); }, [currentTenantId]);`;
  
  const replace2 = `  const fetchChallans = async () => {
    if (!currentTenantId) return;
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) { setLoading(false); return; }
    let query = supabase
      .from('delivery_challans_outward')
      .select('*, delivery_challan_outward_items(*)')
      .eq('tenant_id', currentTenantId);
    if (activeBranchId) {
      query = query.eq('branch_id', activeBranchId);
    }
    const { data } = await query.order('created_at', { ascending: false });
    setChallans(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchChallans(); }, [currentTenantId, activeBranchId]);`;

  if (content.includes(search2)) {
    content = content.replace(search2, replace2);
    fs.writeFileSync(file, content);
  } else {
     console.log("Outward patch target not found. Current block around fetchChallans:");
     console.log(content.substring(content.indexOf('fetchChallans'), content.indexOf('fetchChallans') + 500));
  }
}

patchInward();
patchOutward();
console.log("Patched successfully");
