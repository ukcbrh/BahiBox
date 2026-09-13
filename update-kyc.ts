import fs from 'fs';

let content = fs.readFileSync('src/components/ServiceProviderKYCView.tsx', 'utf8');

// replace state logic
content = content.replace(
  'const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});',
  `const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [historyProviders, setHistoryProviders] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);`
);

// update fetch functions
content = content.replace(
  '  useEffect(() => {\n    fetchPendingKYC();\n  }, []);',
  `  useEffect(() => {
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
      const providerIds = providersData.map(p => p.id);
      let auditLogsMap = {};
      if (providerIds.length > 0) {
        const { data: auditLogs } = await supabase
          .from('audit_logs')
          .select('target_id, actor_user_id, action_type, created_at, users:actor_user_id(full_name, email)')
          .eq('target_table', 'service_providers')
          .in('target_id', providerIds)
          .in('action_type', ['approve_kyc', 'reject_kyc_document'])
          .order('created_at', { ascending: false });

        if (auditLogs) {
           auditLogs.forEach(log => {
             // Keep the most recent relevant log
             if (!auditLogsMap[log.target_id]) {
               auditLogsMap[log.target_id] = log;
             }
           });
        }
      }

      setHistoryProviders(providersData.map(p => ({ ...p, audit_log: auditLogsMap[p.id] })));
    }
    setHistoryLoading(false);
  };`
);

// update UI
const newUiContent = `
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Service Provider KYC</h2>
          <p className="text-slate-500">Review and verify KYC documents for service providers.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg self-start md:self-auto">
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
      </div>

      {activeTab === 'pending' && (
        <>
          {loading ? (
            <div className="p-6">Loading pending KYC applications...</div>
          ) : providers.length === 0 ? (
            <Card className="bg-slate-50 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-slate-500 font-medium">No pending KYC applications found.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {providers.map(p => (
                <Card key={p.id}>
                  <CardHeader className="bg-slate-50 border-b">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-xl">{p.full_name}</CardTitle>
                        <p className="text-sm text-slate-500">
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
                        <div key={doc.id} className="border rounded-lg p-4 space-y-4 bg-white">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold">{doc.document_type.replace('_', ' ').toUpperCase()}</h4>
                            <span className={\`text-xs px-2 py-0.5 rounded font-medium \${
                              doc.status === 'verified' ? 'bg-emerald-100 text-emerald-800' :
                              doc.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-amber-100 text-amber-800'
                            }\`}>
                              {doc.status.toUpperCase()}
                            </span>
                          </div>
                          
                          {doc.document_url ? (
                            <div className="bg-slate-100 p-2 rounded flex items-center justify-center min-h-[150px]">
                              <button type="button" onClick={() => viewDocument(doc.document_url)} className="text-blue-600 font-medium text-sm hover:underline">
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
                                className="flex-1 text-sm"
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
                            <p className="text-sm text-red-600 mt-2">Rejected: {doc.rejection_reason}</p>
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
            <div className="p-6">Loading KYC history...</div>
          ) : historyProviders.length === 0 ? (
            <Card className="bg-slate-50 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-slate-500 font-medium">No KYC history found.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {historyProviders.map(p => {
                const actorName = p.audit_log?.users?.[0]?.full_name || p.audit_log?.users?.full_name || p.audit_log?.users?.[0]?.email || 'Unknown User';
                const actionTime = p.audit_log?.created_at ? new Date(p.audit_log.created_at).toLocaleString() : (p.kyc_verified_at ? new Date(p.kyc_verified_at).toLocaleString() : 'Unknown Time');
                return (
                  <Card key={p.id}>
                    <CardHeader className="bg-slate-50 border-b">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-xl">{p.full_name}</CardTitle>
                            <span className={\`text-xs px-2 py-0.5 rounded font-medium \${
                              p.kyc_status === 'verified' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }\`}>
                              {p.kyc_status.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500 mt-1">
                            {p.provider_type} • {p.tenants?.business_name || 'Unknown Business'} • {p.phone}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {p.kyc_status === 'verified' ? 'Approved by ' : 'Rejected by '}{actorName} on {actionTime}
                          </p>
                          {p.kyc_rejection_reason && (
                             <p className="text-xs text-red-600 mt-1">Reason: {p.kyc_rejection_reason}</p>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {p.service_provider_documents?.map((doc: any) => (
                          <div key={doc.id} className="border rounded-lg p-4 space-y-4 bg-white">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold">{doc.document_type.replace('_', ' ').toUpperCase()}</h4>
                              <span className={\`text-xs px-2 py-0.5 rounded font-medium \${
                                doc.status === 'verified' ? 'bg-emerald-100 text-emerald-800' :
                                doc.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                'bg-amber-100 text-amber-800'
                              }\`}>
                                {doc.status.toUpperCase()}
                              </span>
                            </div>
                            
                            {doc.document_url ? (
                              <div className="bg-slate-100 p-2 rounded flex items-center justify-center min-h-[150px]">
                                <button type="button" onClick={() => viewDocument(doc.document_url)} className="text-blue-600 font-medium text-sm hover:underline">
                                  Open Document in New Tab
                                </button>
                              </div>
                            ) : (
                              <p className="text-sm text-slate-500 italic">No file uploaded</p>
                            )}

                            {doc.rejection_reason && (
                              <p className="text-sm text-red-600 mt-2">Rejected: {doc.rejection_reason}</p>
                            )}
                          </div>
                        ))}
                        {(!p.service_provider_documents || p.service_provider_documents.length === 0) && (
                          <p className="text-sm text-slate-500">No documents found for this provider.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}`;

const replacementRegex = /<div className="mb-6">\s*<h2 className="text-2xl font-bold">Service Provider KYC<\/h2>\s*<p className="text-slate-500">Review and verify KYC documents for service providers\.<\/p>\s*<\/div>[\s\S]*?(?=<\/div>\s*<\/div>\s*\);)/;
// Wait we can just remove `if (loading) return <div className="p-6">Loading pending KYC applications...</div>;`

content = content.replace('if (loading) return <div className="p-6">Loading pending KYC applications...</div>;', '');
content = content.replace(/<div className="mb-6">[\s\S]*?(?=<\/div>\s*<\/div>\s*\);)/, newUiContent);

fs.writeFileSync('src/components/ServiceProviderKYCView.tsx', content);
