import fs from 'fs';

let content = fs.readFileSync('src/components/ServiceProviderKYCView.tsx', 'utf8');

// Add lucide-react imports if missing
if (!content.includes('lucide-react')) {
  content = content.replace(
    "import { toast } from 'sonner';",
    "import { toast } from 'sonner';\nimport { Check, X, Search, FileText } from 'lucide-react';"
  );
}

// Add searchTerm state if missing
if (!content.includes('searchTerm')) {
  content = content.replace(
    "const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');",
    "const [searchTerm, setSearchTerm] = useState('');\n  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');"
  );
}

// Prepare the replacement UI
const returnStatementIndex = content.indexOf('  return (');
if (returnStatementIndex !== -1) {
  content = content.substring(0, returnStatementIndex);
}

const newUiContent = `  const filteredPending = providers.filter(p => 
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
                            <span className={\`text-xs px-2 py-0.5 rounded font-medium \${
                              doc.status === 'verified' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                              doc.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                              'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                            }\`}>
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
                          <span className={\`ml-2 text-xs px-2 py-0.5 rounded font-medium \${
                            p.kyc_status === 'verified' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }\`}>
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
`;

fs.writeFileSync('src/components/ServiceProviderKYCView.tsx', content + newUiContent);
