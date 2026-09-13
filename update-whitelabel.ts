import fs from 'fs';

let content = fs.readFileSync('src/components/WhiteLabelRequestsView.tsx', 'utf8');

const returnStatementIndex = content.indexOf('  return (');
if (returnStatementIndex !== -1) {
  content = content.substring(0, returnStatementIndex);
}

const newUiContent = `  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">White-Label Requests</h1>
          <p className="text-slate-500 dark:text-slate-400">Approve or reject custom domain requests from merchants.</p>
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
              placeholder="Search domains or brands..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 dark:bg-slate-900"
            />
          </div>
        </div>
      </div>

      <Card className="border-none shadow-sm dark:bg-slate-900 mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-medium">
              <tr>
                <th className="px-6 py-4">Brand</th>
                <th className="px-6 py-4">Requested Domain</th>
                <th className="px-6 py-4">Theme Colors</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {activeTab === 'pending' && loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">Loading requests...</td>
                </tr>
              )}
              {activeTab === 'pending' && !loading && filteredRequests.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    <Globe className="mx-auto mb-3 text-slate-300 dark:text-slate-700 dark:text-slate-300" size={32} />
                    <p>No pending requests</p>
                  </td>
                </tr>
              )}
              {activeTab === 'pending' && !loading && filteredRequests.map((req) => (
                <tr key={req.merchant_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {req.logo_url ? (
                          <img src={req.logo_url} alt="Logo" className="w-8 h-8 rounded object-contain bg-white dark:bg-slate-950 border" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-400 font-medium border">Logo</div>
                        )}
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{req.brand_name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">ID: {req.merchant_id.substring(0,8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono font-medium dark:text-slate-300">
                      {req.custom_domain}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        <div className="w-5 h-5 rounded-sm border shadow-sm" style={{ backgroundColor: req.primary_color || '#000' }} title={\`Primary: \${req.primary_color}\`} />
                        <div className="w-5 h-5 rounded-sm border shadow-sm" style={{ backgroundColor: req.secondary_color || '#000' }} title={\`Secondary: \${req.secondary_color}\`} />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        Pending
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col gap-2 items-end">
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800/50"
                            onClick={() => handleApprove(req.merchant_id, req.custom_domain)}
                            disabled={processingId === req.merchant_id}
                          >
                            <Check size={16} className="mr-1" /> Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-700 dark:bg-red-900/20 dark:border-red-800/50"
                            onClick={() => handleReject(req.merchant_id, req.custom_domain)}
                            disabled={processingId === req.merchant_id}
                          >
                            <X size={16} className="mr-1" /> Reject
                          </Button>
                        </div>
                        <Input
                          placeholder="Rejection reason (optional)"
                          className="h-7 text-xs w-48"
                          value={rejectReason[req.merchant_id] || ''}
                          onChange={(e) => setRejectReason(prev => ({ ...prev, [req.merchant_id]: e.target.value }))}
                        />
                      </div>
                    </td>
                </tr>
              ))}

              {activeTab === 'history' && historyLoading && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">Loading history...</td>
                </tr>
              )}
              {activeTab === 'history' && !historyLoading && historyRequests.filter(req => 
                  req.brand_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  req.custom_domain?.toLowerCase().includes(searchTerm.toLowerCase())
                ).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    <Globe className="mx-auto mb-3 text-slate-300 dark:text-slate-700 dark:text-slate-300" size={32} />
                    <p>No history found</p>
                  </td>
                </tr>
              )}
              {activeTab === 'history' && !historyLoading && historyRequests.filter(req => 
                  req.brand_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  req.custom_domain?.toLowerCase().includes(searchTerm.toLowerCase())
                ).map((req) => {
                const actorName = req.audit_log?.users?.[0]?.full_name || req.audit_log?.users?.full_name || req.audit_log?.users?.[0]?.email || 'Unknown User';
                const actionTime = req.audit_log?.created_at ? new Date(req.audit_log.created_at).toLocaleString() : (req.updated_at ? new Date(req.updated_at).toLocaleString() : 'Unknown Time');
                return (
                  <tr key={req.merchant_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {req.logo_url ? (
                          <img src={req.logo_url} alt="Logo" className="w-8 h-8 rounded object-contain bg-white dark:bg-slate-950 border" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-400 font-medium border">Logo</div>
                        )}
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{req.brand_name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">ID: {req.merchant_id.substring(0,8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono font-medium dark:text-slate-300">
                      {req.custom_domain}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        <div className="w-5 h-5 rounded-sm border shadow-sm" style={{ backgroundColor: req.primary_color || '#000' }} title={\`Primary: \${req.primary_color}\`} />
                        <div className="w-5 h-5 rounded-sm border shadow-sm" style={{ backgroundColor: req.secondary_color || '#000' }} title={\`Secondary: \${req.secondary_color}\`} />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={\`px-2 py-1 rounded text-xs font-semibold \${
                        req.domain_verification_status === 'verified' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }\`}>
                        {req.domain_verification_status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {req.domain_verification_status === 'verified' ? 'Approved by ' : 'Rejected by '}<br/>
                        <span className="font-medium text-slate-700 dark:text-slate-300">{actorName}</span><br/>
                        {actionTime}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
`;

fs.writeFileSync('src/components/WhiteLabelRequestsView.tsx', content + newUiContent);
