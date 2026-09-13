import React, { useState, useEffect } from 'react';
import { getSupabaseClient } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { toast } from 'sonner';

export function WithdrawalRequestsView() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // For approval modal/inline
  const [approveRef, setApproveRef] = useState<Record<string, string>>({});
  // For reject reason
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [historyRequests, setHistoryRequests] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchRequests = async () => {
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
      const merchantIds = requestsData.filter((r: any) => r.requester_type === 'merchant' && r.requested_by).map((r: any) => r.requested_by);
      const consumerIds = requestsData.filter((r: any) => r.requester_type === 'consumer' && r.requested_by).map((r: any) => r.requested_by);

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

      const merged = requestsData.map((req: any) => {
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
      const merchantIds = requestsData.filter((r: any) => r.requester_type === 'merchant' && r.requested_by).map((r: any) => r.requested_by);
      const consumerIds = requestsData.filter((r: any) => r.requester_type === 'consumer' && r.requested_by).map((r: any) => r.requested_by);

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

      const merged = requestsData.map((req: any) => {
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
  };

  useEffect(() => {
    if (activeTab === 'pending') {
      fetchRequests();
    } else {
      fetchHistory();
    }
  }, [activeTab]);

  const handleProcess = async (id: string, isApprove: boolean) => {
    const supabase = getSupabaseClient();
    if (!supabase || !user) return;
    
    if (isApprove) {
        if (!approveRef[id]) {
            return toast.error("Transaction reference is required for approval");
        }
    } else {
        if (!rejectReason[id]) {
            return toast.error("Rejection reason is required");
        }
    }

    setProcessingId(id);
    try {
      const { error } = await supabase.rpc('process_withdrawal_request', {
        p_request_id: id,
        p_approve: isApprove,
        p_transaction_reference: isApprove ? approveRef[id] : null,
        p_admin_notes: isApprove ? null : rejectReason[id]
      });

      if (error) throw error;

      toast.success(`Request ${isApprove ? 'approved' : 'rejected'} successfully`);
      
      // Cleanup inputs
      setApproveRef(prev => { const n = {...prev}; delete n[id]; return n; });
      setRejectReason(prev => { const n = {...prev}; delete n[id]; return n; });
      
      fetchRequests();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to process request');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Withdrawal Requests</h2>
          <p className="text-slate-500">Manage merchant and consumer payout requests</p>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 sm:w-32 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'pending' ? 'bg-white dark:bg-slate-900 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
          >
            Pending
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 sm:w-32 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'history' ? 'bg-white dark:bg-slate-900 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
          >
            History
          </button>
        </div>
      </div>

      {activeTab === 'pending' && (
        <Card className="shadow-sm border-none bg-white dark:bg-slate-950">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-lg flex justify-between items-center">
              Pending Requests
              <Button variant="outline" size="sm" onClick={fetchRequests} disabled={loading}>
                Refresh
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-slate-500">Loading pending requests...</div>
            ) : requests.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <div className="bg-slate-50 dark:bg-slate-900 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl">✅</span>
                </div>
                <p>No pending withdrawal requests</p>
              </div>
            ) : (
              <div className="divide-y">
                {requests.map((req: any) => (
                  <div key={req.id} className="p-6 flex flex-col lg:flex-row gap-6">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${req.requester_type === 'merchant' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {req.requester_type.toUpperCase()}
                        </span>
                        <h4 className="font-bold text-slate-800 dark:text-slate-200">
                          {req.requester_type === 'merchant' ? req.tenants?.name || 'Unknown Merchant' : req.users?.full_name || req.users?.email || 'Unknown Consumer'}
                        </h4>
                        <span className="text-sm text-slate-500">
                          Requested {new Date(req.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Amount</span>
                          <span className="font-bold text-lg text-slate-800 dark:text-slate-200">₹{req.amount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Account Holder</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{req.account_holder_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Account Number</span>
                          <span className="font-mono text-slate-800 dark:text-slate-200">{req.bank_account_number}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">IFSC Code</span>
                          <span className="font-mono text-slate-800 dark:text-slate-200">{req.bank_ifsc}</span>
                        </div>
                      </div>
                    </div>
                    <div className="lg:w-80 space-y-4">
                      <div className="space-y-2 p-4 border rounded-lg bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900">
                        <Input 
                          placeholder="Transaction Ref (UTR)" 
                          value={approveRef[req.id] || ''} 
                          onChange={e => setApproveRef({...approveRef, [req.id]: e.target.value})}
                          className="bg-white dark:bg-slate-950"
                        />
                        <Button 
                          className="w-full bg-emerald-600 hover:bg-emerald-700" 
                          onClick={() => handleProcess(req.id, true)}
                          disabled={processingId === req.id}
                        >
                          Approve Transfer
                        </Button>
                      </div>
                      <div className="space-y-2 p-4 border rounded-lg bg-red-50/30 dark:bg-red-950/20 border-red-100 dark:border-red-900">
                        <Input 
                          placeholder="Reason for rejection" 
                          value={rejectReason[req.id] || ''} 
                          onChange={e => setRejectReason({...rejectReason, [req.id]: e.target.value})}
                          className="bg-white dark:bg-slate-950"
                        />
                        <Button 
                          variant="destructive"
                          className="w-full"
                          onClick={() => handleProcess(req.id, false)}
                          disabled={processingId === req.id}
                        >
                          Reject & Refund Wallet
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'history' && (
        <Card className="shadow-sm border-none bg-white dark:bg-slate-950">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-lg">Processed Requests</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             {historyLoading ? (
              <div className="p-8 text-center text-slate-500">Loading history...</div>
            ) : historyRequests.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No processed requests found.</div>
            ) : (
              <div className="divide-y">
                {historyRequests.map((req: any) => (
                  <div key={req.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${req.requester_type === 'merchant' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {req.requester_type.toUpperCase()}
                        </span>
                        <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                          {req.requester_type === 'merchant' ? req.tenants?.name || 'Unknown Merchant' : req.users?.full_name || req.users?.email || 'Unknown Consumer'}
                        </h4>
                      </div>
                      <p className="text-sm text-slate-500">
                        ₹{req.amount} • {req.bank_account_number?.slice(-4)} ({req.bank_ifsc})
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Requested: {new Date(req.created_at).toLocaleDateString()} • Processed: {req.processed_at ? new Date(req.processed_at).toLocaleDateString() : 'Unknown'}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                        req.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {req.status.toUpperCase()}
                      </span>
                      {req.status === 'completed' && req.transaction_reference && (
                        <span className="text-xs font-mono text-slate-500 mt-1 flex items-center gap-1">
                          Ref: {req.transaction_reference}
                        </span>
                      )}
                      {req.status === 'rejected' && req.admin_notes && (
                        <span className="text-xs text-red-500 mt-1 max-w-[200px] truncate" title={req.admin_notes}>
                          Reason: {req.admin_notes}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
