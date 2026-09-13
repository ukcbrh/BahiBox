import React, { useEffect, useState } from 'react';
import { Wallet, RefreshCw } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { getSupabaseClient } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { toast } from 'sonner';

declare global {
  interface Window { Razorpay: any; }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PlatformUsageWalletView() {
  const { currentTenantId, user } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recharging, setRecharging] = useState(false);

  const loadSummary = async () => {
    if (!currentTenantId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data, error } = await supabase.rpc('get_tenant_usage_summary', { p_tenant_id: currentTenantId, p_limit: 50 });
    if (error) {
      console.error(error);
      toast.error('Failed to load usage summary: ' + error.message);
    }
    setSummary(data);
    setLoading(false);
  };

  useEffect(() => {
    loadSummary();
  }, [currentTenantId]);

  const handleRecharge = async () => {
    if (!currentTenantId || !user) return;
    const amountStr = prompt('Enter amount to recharge Platform Usage Wallet (₹):', '500');
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) return;

    setRecharging(true);
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/create-wallet-recharge-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({
          amount,
          wallet_owner_context: 'platform_usage',
          tenant_id: currentTenantId
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to create Razorpay order');
      }

      const orderData = await response.json();

      const options = {
        key: orderData.razorpay_key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'BahiBox',
        description: 'Platform Usage Wallet Recharge',
        order_id: orderData.razorpay_order_id,
        handler: async function (response: any) {
          const { error } = await supabase.rpc('capture_payment', {
            p_payment_order_id: orderData.payment_order_id,
            p_razorpay_payment_id: response.razorpay_payment_id,
            p_method: 'razorpay',
            p_gateway_fee: 0,
            p_raw_response: response
          });
          if (error) {
            toast.error(error.message || 'Payment capture failed');
          } else {
            toast.success(`Successfully recharged ₹${amount}`);
            loadSummary();
          }
        },
        prefill: {
          name: user.full_name || '',
          email: user.email || '',
          contact: user.phone || ''
        },
        theme: { color: '#3b82f6' }
      };

      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        toast.error('Failed to load payment gateway');
        return;
      }
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        toast.error(response.error.description || 'Payment failed');
      });
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || 'Recharge failed');
    } finally {
      setRecharging(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-slate-500">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Platform Usage Wallet</h2>
          <p className="text-slate-500 dark:text-slate-400">Pay-as-you-go charges for payment processing and other platform services — separate from your Business Wallet.</p>
        </div>
        <Button variant="outline" size="icon" onClick={loadSummary}><RefreshCw size={16} /></Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 border rounded-xl bg-white dark:bg-slate-950 flex flex-col items-center justify-center gap-3">
          <Wallet size={28} className="text-blue-500" />
          <div className="text-3xl font-bold">₹{Number(summary?.wallet_balance || 0).toFixed(2)}</div>
          <div className="text-sm text-slate-500">Current Balance</div>
          <Button onClick={handleRecharge} disabled={recharging} className="mt-2">
            {recharging ? 'Processing...' : 'Recharge Wallet'}
          </Button>
        </div>

        <div className="p-6 border rounded-xl bg-white dark:bg-slate-950">
          <h3 className="font-semibold mb-3">Usage Breakdown (All Time)</h3>
          {(summary?.by_type || []).length === 0 ? (
            <div className="text-sm text-slate-400">No usage recorded yet.</div>
          ) : (
            <div className="space-y-2">
              {summary.by_type.map((t: any) => (
                <div key={t.usage_type} className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">{t.usage_type}</span>
                  <span className="font-medium">₹{Number(t.total_cost).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border rounded-xl bg-white dark:bg-slate-950 overflow-hidden">
        <div className="p-4 border-b font-semibold">Recent Charges</div>
        <div className="divide-y max-h-96 overflow-y-auto">
          {(summary?.recent_events || []).length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-sm">No charges yet.</div>
          ) : (
            summary.recent_events.map((e: any) => (
              <div key={e.id} className="p-3 flex justify-between items-center text-sm">
                <div>
                  <div className="font-medium">{e.description || e.usage_type}</div>
                  <div className="text-xs text-slate-400">{new Date(e.created_at).toLocaleString()}</div>
                </div>
                <div className="font-medium text-red-600">-₹{Number(e.cost_amount).toFixed(2)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
