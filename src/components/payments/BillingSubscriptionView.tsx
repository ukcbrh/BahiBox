import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { CheckCircle2, CreditCard, Download, Layers, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useModules } from '../../hooks/useModules';
import { usePlans } from '../../hooks/usePlans';

export function BillingSubscriptionView({ activeModule = 'Retail POS' }: { activeModule?: string }) {
  const navigate = useNavigate();
  const { currentTenantId } = useAuth();
  const { modules, subscriptions } = useModules(currentTenantId || undefined);
  const { plans, loading: plansLoading } = usePlans();
  const [selectedModule, setSelectedModule] = useState(activeModule);
  const [realInvoices, setRealInvoices] = useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<{type: string, last4: string, expiry: string} | null>(null);

    useEffect(() => {
    if (currentTenantId && supabase) {
      const fetchInvoices = async () => {
        try {
          const { data } = await supabase.from('payment_orders').select('*, payment_transactions(*)').eq('tenant_id', currentTenantId).eq('purpose', 'platform_subscription').eq('status', 'paid').order('created_at', { ascending: false });
          if (data) {
            setRealInvoices(data);
            if (data.length > 0 && data[0].payment_transactions && data[0].payment_transactions.length > 0) {
              const tx = data[0].payment_transactions[0];
              const method = tx.method || 'card';
            let last4 = '****';
            let type = method.toUpperCase();
            if (method.toLowerCase() === 'card' && tx.raw_response?.payment?.entity?.card) {
                last4 = tx.raw_response.payment.entity.card.last4 || '****';
                type = (tx.raw_response.payment.entity.card.network || 'Card').toUpperCase();
            }
            setPaymentMethod({ 
               type, 
               last4, 
               expiry: 'N/A'
            });
            }
          }
        } catch(e) { console.error("Error fetching invoices", e) }
      };
      fetchInvoices();
    }
  }, [currentTenantId]);

  useEffect(() => {
    setSelectedModule(activeModule);
  }, [activeModule]);

  const subscribedModules = Array.from(new Set(
    (subscriptions || [])
      .filter(s => s.status === 'active' || s.status === 'Active')
      .map(s => plans.find(p => p.id === s.plan_id)?.moduleName)
      .filter(Boolean)
  ));

  // Find the user's active subscription for the currently viewed module
  const activeSubscription = subscriptions?.slice()
    .sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())
    .find(s => {
      const matchedPlan = plans.find(p => p.id === s.plan_id);
      return matchedPlan?.moduleName === selectedModule && (s.status === 'Active' || s.status === 'active');
    });

  const activeModuleData = modules.find(m => m.name === selectedModule);

  // Default to Pro plan if none found
  let displayPlan = plans.find(p => p.moduleName === selectedModule && p.tier === 'Premium');
  
  if (activeSubscription) {
    const matchedPlan = plans.find(p => p.id === activeSubscription.plan_id || (p.name === activeSubscription.plan_id && p.moduleName === selectedModule));
    if (matchedPlan) {
        displayPlan = matchedPlan;
    }
  }

  const invoices = realInvoices.length > 0 ? realInvoices.map(inv => {
    const planName = plans.find(p => p.id === inv.reference_id)?.name || inv.reference_id;
    return {

    id: 'INV-' + inv.id.substring(0,6).toUpperCase(),
    date: new Date(inv.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
    amount: inv.amount,
    status: 'Paid',
    download: '#'
  ,
    plan_name: planName
  }}) : [];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold dark:text-white">Billing & Subscription</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Manage your current plan and billing history.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Module:</span>
            <div className="relative">
              <select 
                className="appearance-none bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 pr-8 pl-3 py-1.5 rounded-md outline-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 text-sm font-medium shadow-sm transition-colors"
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
              >
                {subscribedModules.map(mod => (
                  <option key={mod} value={mod as string}>{mod}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card className="border-primary/20 shadow-sm bg-primary/5">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardDescription className="font-semibold text-primary uppercase tracking-wider mb-1">Current Plan</CardDescription>
                  <CardTitle className="text-3xl flex items-center gap-2">
                    {displayPlan ? displayPlan.name : "Growth Plan"} 
                  </CardTitle>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm">
                    <Layers size={14} className="text-primary" />
                    Module: {selectedModule}
                  </div>
                </div>
                {activeSubscription ? (
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1">
                    <CheckCircle2 size={14} /> Active
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                    Not Subscribed
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-4xl font-extrabold mb-1">
                  {activeSubscription && displayPlan ? `₹${displayPlan.priceMonthly}` : '—'}
                  {activeSubscription && <span className="text-lg font-medium text-slate-500 dark:text-slate-400"> / month</span>}
                </p>
                {activeSubscription ? (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Active since {new Date(activeSubscription.current_period_start || activeSubscription.created_at || new Date().toISOString()).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })} &middot; renews {new Date(activeSubscription.next_renewal_date || activeSubscription.current_period_end || new Date().toISOString()).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                ) : (
                  <p className="text-sm text-slate-600 dark:text-slate-400">No active subscription</p>
                )}
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-semibold">Includes:</p>
                <ul className="text-sm space-y-1 text-slate-600 dark:text-slate-400">
                  {displayPlan ? displayPlan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2"><CheckCircle2 size={14} className="text-primary"/> {f}</li>
                  )) : (
                    <>
                      <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-primary"/> Unlimited Users & Roles</li>
                      <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-primary"/> Advanced Inventory & Alerts</li>
                      <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-primary"/> Priority 24/7 Support</li>
                    </>
                  )}
                </ul>
              </div>
              <div className="pt-4 flex gap-3 flex-col sm:flex-row">
                <Button className="flex-1" onClick={() => navigate(`/pricing?module=${encodeURIComponent(selectedModule)}`)}>Upgrade Plan</Button>
                <Button variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50">Cancel Subscription</Button>
              </div>
            </CardContent>
          </Card>

          {/* Option for different module */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-slate-50 dark:bg-slate-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Need features from another module?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                You can explore and select plans for different business modules like Restaurant, Manufacturing ERP, or Education.
              </p>
              <Button variant="outline" onClick={() => navigate(`/pricing?module=${encodeURIComponent(selectedModule)}`)} className="w-full bg-white dark:bg-slate-950">
                Explore Other Modules
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard size={18} /> Last Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {realInvoices.length > 0 ? (
                <div className="flex items-center justify-between border rounded-lg p-4 bg-slate-50 dark:bg-slate-900">
                  <div className="flex items-center gap-4">
                    <div className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 rounded flex items-center justify-center font-bold text-slate-600 dark:text-slate-400 text-xs">
                      {paymentMethod?.type || 'Card'}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">
                        ₹{realInvoices[0].amount} {paymentMethod?.last4 !== '****' ? `• ${paymentMethod?.type === 'CARD' ? 'Card ending ' : ''}${paymentMethod?.last4}` : ''}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Captured on {new Date(realInvoices[0].created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-slate-500 dark:text-slate-400 text-sm border rounded-lg bg-slate-50 dark:bg-slate-900">
                  No payment recorded yet
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Invoice History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {invoices.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                  No invoice history available
                </div>
              ) : (
                <div className="divide-y">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-900">
                      <div>
                        <p className="font-semibold text-sm">{inv.date}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{inv.id}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-medium text-sm">₹{inv.amount}</span>
                        <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded">{inv.status}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 dark:text-slate-400">
                          <Download size={16} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
