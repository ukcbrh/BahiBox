#!/bin/bash

# Inward
sed -i 's/const fetchChallans = async () => {/const fetchChallans = async () => {/g' src/components/retail/DeliveryChallanInwardList.tsx

# Replace Inward
awk '/const fetchChallans = async \(\) => \{/{p=1;print;next} /useEffect\(\(\) => \{ fetchChallans\(\); \}, \[currentTenantId\]\);/{p=0} p{next} 1' src/components/retail/DeliveryChallanInwardList.tsx > tmp.tsx
sed -i '/const fetchChallans = async () => {/r /dev/stdin' tmp.tsx << 'REPLACEMENT'
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

  useEffect(() => { fetchChallans(); }, [currentTenantId, activeBranchId]);
REPLACEMENT
mv tmp.tsx src/components/retail/DeliveryChallanInwardList.tsx


# Replace Outward UseAuth
sed -i 's/const { currentTenantId, user } = useAuth();/const { currentTenantId, user, activeBranchId } = useAuth();/' src/components/retail/DeliveryChallanOutwardList.tsx


# Replace Outward
awk '/const fetchChallans = async \(\) => \{/{p=1;print;next} /useEffect\(\(\) => \{ fetchChallans\(\); \}, \[currentTenantId\]\);/{p=0} p{next} 1' src/components/retail/DeliveryChallanOutwardList.tsx > tmp.tsx
sed -i '/const fetchChallans = async () => {/r /dev/stdin' tmp.tsx << 'REPLACEMENT'
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

  useEffect(() => { fetchChallans(); }, [currentTenantId, activeBranchId]);
REPLACEMENT
mv tmp.tsx src/components/retail/DeliveryChallanOutwardList.tsx

