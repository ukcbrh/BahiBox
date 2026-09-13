import sys

def process_file(filename):
    with open(filename, 'r') as f:
        content = f.read()

    target_fetch = """  const fetchRequests = async () => {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select(`
          id, amount, account_holder_name, bank_account_number, bank_ifsc,
          status, requester_type, requested_by, created_at,
          users ( full_name, email ),
          tenants ( name )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setRequests(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load pending requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select(`
          id, amount, account_holder_name, bank_account_number, bank_ifsc,
          status, requester_type, requested_by, created_at, processed_at, transaction_reference, admin_notes,
          users ( full_name, email ),
          tenants ( name )
        `)
        .in('status', ['completed', 'rejected'])
        .order('processed_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setHistoryRequests(data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };"""

    replacement_fetch = """  const fetchRequests = async () => {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('id, amount, account_holder_name, bank_account_number, bank_ifsc, status, requester_type, requested_by, created_at, transaction_reference, admin_notes')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const requestsData = data || [];
      const merchantIds = requestsData.filter(r => r.requester_type === 'merchant' && r.requested_by).map(r => r.requested_by);
      const consumerIds = requestsData.filter(r => r.requester_type === 'consumer' && r.requested_by).map(r => r.requested_by);

      let tenantsData: any[] = [];
      let usersData: any[] = [];

      if (merchantIds.length > 0) {
          const { data: tData } = await supabase.from('tenants').select('id, name').in('id', merchantIds);
          tenantsData = tData || [];
      }
      if (consumerIds.length > 0) {
          const { data: uData } = await supabase.from('users').select('id, full_name, email').in('id', consumerIds);
          usersData = uData || [];
      }

      const merged = requestsData.map(req => {
          if (req.requester_type === 'merchant') {
              const t = tenantsData.find(x => x.id === req.requested_by);
              return { ...req, tenants: t || null };
          } else {
              const u = usersData.find(x => x.id === req.requested_by);
              return { ...req, users: u || null };
          }
      });

      setRequests(merged);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load pending requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('id, amount, account_holder_name, bank_account_number, bank_ifsc, status, requester_type, requested_by, created_at, processed_at, transaction_reference, admin_notes')
        .in('status', ['completed', 'rejected'])
        .order('processed_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      const requestsData = data || [];
      const merchantIds = requestsData.filter(r => r.requester_type === 'merchant' && r.requested_by).map(r => r.requested_by);
      const consumerIds = requestsData.filter(r => r.requester_type === 'consumer' && r.requested_by).map(r => r.requested_by);

      let tenantsData: any[] = [];
      let usersData: any[] = [];

      if (merchantIds.length > 0) {
          const { data: tData } = await supabase.from('tenants').select('id, name').in('id', merchantIds);
          tenantsData = tData || [];
      }
      if (consumerIds.length > 0) {
          const { data: uData } = await supabase.from('users').select('id, full_name, email').in('id', consumerIds);
          usersData = uData || [];
      }

      const merged = requestsData.map(req => {
          if (req.requester_type === 'merchant') {
              const t = tenantsData.find(x => x.id === req.requested_by);
              return { ...req, tenants: t || null };
          } else {
              const u = usersData.find(x => x.id === req.requested_by);
              return { ...req, users: u || null };
          }
      });

      setHistoryRequests(merged);
    } catch (err: any) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };"""

    if target_fetch in content:
        content = content.replace(target_fetch, replacement_fetch)
        with open(filename, 'w') as f:
            f.write(content)
        print("Patched " + filename)
    else:
        print("Target not found")

process_file('src/components/superadmin/WithdrawalRequestsView.tsx')
