import React, { useState, useEffect } from 'react';
import { getSupabaseClient } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { Check, X, Search, FileText } from 'lucide-react';

export const ServiceProviderKYCView = () => {
  const { user } = useAuth();
  const supabase = getSupabaseClient();
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [historyProviders, setHistoryProviders] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'pending') fetchPendingKYC();
    else fetchHistoryKYC();
  }, [activeTab]);

  const fetchHistoryKYC = async () => {
    if (!supabase) return;
    setHistoryLoading(true);
    // Fetch providers with verified or rejected KYC
    const { data: providersData, error } = await supabase
      .from('service_providers')
      .select('*, tenants(business_name), service_provider_documents(*)')
      .in('kyc_status', ['verified', 'rejected'])
      .order('kyc_verified_at', { ascending: false, nullsFirst: false }); // Note: we could also order by updated_at or kyc_submitted_at if kyc_verified_at is null

    if (!error && providersData) {
      // Fetch audit logs for these providers to know who approved/rejected
      const providerIds = providersData.map((p: any) => p.id);
      let auditLogsMap: Record<string, any> = {};
      if (providerIds.length > 0) {
        const { data: auditLogs } = await supabase
          .from('audit_logs')
          .select('target_id, actor_user_id, action_type, created_at, users:actor_user_id(full_name, email)')
          .eq('target_table', 'service_providers')
          .in('target_id', providerIds)
          .in('action_type', ['approve_kyc', 'reject_kyc_document'])
          .order('created_at', { ascending: false });

        if (auditLogs) {
           auditLogs.forEach((log: any) => {
             // Keep the most recent relevant log
             if (!auditLogsMap[log.target_id]) {
               auditLogsMap[log.target_id] = log;
             }
           });
        }
      }

      setHistoryProviders(providersData.map((p: any) => ({ ...p, audit_log: auditLogsMap[p.id] })));
    }
    setHistoryLoading(false);
  };

  const fetchPendingKYC = async () => {
    if (!supabase) return;
    setLoading(true);
    // Fetch providers with submitted KYC and their documents and tenant details
    const { data: providersData, error } = await supabase
      .from('service_providers')
      .select('*, tenants(business_name), service_provider_documents(*)')
      .eq('kyc_status', 'submitted')
      .order('kyc_submitted_at', { ascending: false });

    if (!error && providersData) {
      setProviders(providersData);
    }
    setLoading(false);
  };

  const viewDocument = async (path: string) => {
    if (!supabase) return;
    if (path.startsWith('http')) {
      window.open(path, '_blank');
      return;
    }
    const { data, error } = await supabase.storage.from('provider-documents').createSignedUrl(path, 3600);
    if (error) {
      toast.error("Could not load document: " + error.message);
    } else if (data) {
      window.open(data.signedUrl, '_blank');
    }
  };

  const handleApprove = async (providerId: string) => {
    if (!supabase || !user) return;
    setSubmitting(true);
    
    // 1. Update overall status
    const { error: providerError } = await supabase
      .from('service_providers')
      .update({ kyc_status: 'verified', kyc_verified_at: new Date().toISOString() })
      .eq('id', providerId);

    if (providerError) {
      toast.error(providerError.message);
      setSubmitting(false);
      return;
    }

    // 2. Update all documents
    await supabase
      .from('service_provider_documents')
      .update({ status: 'verified', rejection_reason: null })
      .eq('service_provider_id', providerId);

    // 3. Log audit
    await supabase.from('audit_logs').insert({
      actor_user_id: user.id,
      action_type: 'approve_kyc',
      target_table: 'service_providers',
      target_id: providerId,
      details: { timestamp: new Date().toISOString() }
    });

    toast.success("KYC Approved");
    fetchPendingKYC();
    setSubmitting(false);
  };

  const handleRejectDocument = async (providerId: string, docId: string) => {
    if (!supabase || !user) return;
    
    const reason = rejectionReasons[docId];
    if (!reason) {
      toast.error("Please provide a rejection reason for this document.");
      return;
    }

    setSubmitting(true);
    
    // 1. Update the document status
    await supabase
      .from('service_provider_documents')
      .update({ status: 'rejected', rejection_reason: reason })
      .eq('id', docId);

    // 2. Update the provider status to rejected (if not already)
    await supabase
      .from('service_providers')
      .update({ kyc_status: 'rejected', kyc_rejection_reason: 'One or more documents were rejected. Please review and re-upload.' })
      .eq('id', providerId);

    // 3. Log audit
    await supabase.from('audit_logs').insert({
      actor_user_id: user.id,
      action_type: 'reject_kyc_document',
      target_table: 'service_providers',
      target_id: providerId,
      details: { document_id: docId, reason }
    });

    toast.success("Document rejected");
    fetchPendingKYC();
    setSubmitting(false);
  };

  

  const filteredPending = providers.filter(p => 
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.tenants?.business_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredHistory = historyProviders.filter(p =>
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.tenants?.business_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold dark:text-white">Service Provider KYC</h2>
          <p className="text-slate-500 dark:text-slate-400">Review and verify KYC documents for service providers.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <Button 
              variant={activeTab === 'pending' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setActiveTab('pending')}
            >
              Pending
            </Button>
            <Button 
              variant={activeTab === 'history' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setActiveTab('history')}
            >
              History
            </Button>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <Input 
              placeholder="Search providers..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 dark:bg-slate-900"
            />
          </div>
        </div>
      </div>

      {activeTab === 'pending' && (
        <>
          {loading ? (
             <div className="p-6 text-center text-slate-500">Loading pending KYC...</div>
          ) : filteredPending.length === 0 ? (
            <Card className="bg-slate-50 dark:bg-slate-900/50 border-dashed mt-6">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
                <h3 className="text-lg font-medium dark:text-white">No pending applications</h3>
                <p className="text-slate-500 dark:text-slate-400 text-center max-w-sm mt-2">
                  All caught up! There are no KYC applications waiting for approval right now.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6 mt-6">
              {filteredPending.map(p => (
                <Card key={p.id} className="dark:bg-slate-900 overflow-hidden border-none shadow-sm">
                  <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-xl dark:text-white">{p.full_name}</CardTitle>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                          {p.provider_type} • {p.tenants?.business_name || 'Unknown Business'} • {p.phone}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">Submitted: {new Date(p.kyc_submitted_at).toLocaleString()}</p>
                      </div>
                      <Button onClick={() => handleApprove(p.id)} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
                        Approve All & Verify
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {p.service_provider_documents?.map((doc: any) => (
                        <div key={doc.id} className="border dark:border-slate-800 rounded-lg p-4 space-y-4 bg-white dark:bg-slate-950">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold dark:text-white">{doc.document_type.replace('_', ' ').toUpperCase()}</h4>
                            <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                              doc.status === 'verified' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                              doc.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                              'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                            }`}>
                              {doc.status.toUpperCase()}
                            </span>
                          </div>
                          
                          {doc.document_url ? (
                            <div className="bg-slate-100 dark:bg-slate-900 p-2 rounded flex items-center justify-center min-h-[150px]">
                              <button type="button" onClick={() => viewDocument(doc.document_url)} className="text-blue-600 dark:text-blue-400 font-medium text-sm hover:underline">
                                Open Document in New Tab
                              </button>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500 italic">No file uploaded</p>
                          )}

                          {doc.status !== 'rejected' && doc.status !== 'verified' && (
                            <div className="flex items-center gap-2 mt-2">
                              <Input 
                                placeholder="Rejection reason..." 
                                className="flex-1 text-sm dark:bg-slate-900"
                                value={rejectionReasons[doc.id] || ''}
                                onChange={e => setRejectionReasons({...rejectionReasons, [doc.id]: e.target.value})}
                              />
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                disabled={submitting}
                                onClick={() => handleRejectDocument(p.id, doc.id)}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                          {doc.rejection_reason && (
                            <p className="text-sm text-red-600 dark:text-red-400 mt-2">Rejected: {doc.rejection_reason}</p>
                          )}
                        </div>
                      ))}
                      {(!p.service_provider_documents || p.service_provider_documents.length === 0) && (
                        <p className="text-sm text-slate-500">No documents found for this provider.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'history' && (
        <>
          {historyLoading ? (
            <div className="p-6 text-center text-slate-500">Loading history...</div>
          ) : filteredHistory.length === 0 ? (
            <Card className="bg-slate-50 dark:bg-slate-900/50 border-dashed mt-6">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
                <h3 className="text-lg font-medium dark:text-white">No history found</h3>
                <p className="text-slate-500 dark:text-slate-400 text-center max-w-sm mt-2">
                  There are no verified or rejected applications matching your search.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4 mt-6">
              {filteredHistory.map((p) => {
                const actorName = p.audit_log?.users?.[0]?.full_name || p.audit_log?.users?.full_name || p.audit_log?.users?.[0]?.email || 'Unknown User';
                const actionTime = p.audit_log?.created_at ? new Date(p.audit_log.created_at).toLocaleString() : (p.kyc_verified_at ? new Date(p.kyc_verified_at).toLocaleString() : 'Unknown Time');
                return (
                  <Card key={p.id} className="overflow-hidden border-none shadow-sm dark:bg-slate-900">
                    <div className="flex flex-col md:flex-row">
                      <div className="p-6 flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-5 w-5 text-slate-500" />
                          <h3 className="font-semibold text-lg dark:text-white">{p.full_name}</h3>
                          <span className={`ml-2 text-xs px-2 py-0.5 rounded font-medium ${
                            p.kyc_status === 'verified' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {p.kyc_status.toUpperCase()}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-y-2 text-sm text-slate-500 dark:text-slate-400 mt-4">
                          <div>
                            <span className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Business</span>
                            <span className="font-medium text-slate-900 dark:text-slate-200">{p.tenants?.business_name || 'Unknown'}</span>
                          </div>
                          <div>
                            <span className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Type</span>
                            <span className="font-medium text-slate-900 dark:text-slate-200">{p.provider_type}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Action</span>
                            <span className="text-slate-900 dark:text-slate-200">
                              {p.kyc_status === 'verified' ? 'Approved by ' : 'Rejected by '}{actorName} on {actionTime}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};
