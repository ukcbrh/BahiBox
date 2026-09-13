import React, { useEffect, useState } from 'react';
import { X, Building2, User, CreditCard, Clock, Wallet, KeyRound } from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabase';

export default function MerchantProfileModal({ tenantId, onClose }: { tenantId: string; onClose: () => void }) {
  const [profile, setProfile] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [settingPassword, setSettingPassword] = useState(false);

  const handleSetPassword = async () => {
    if (!profile?.owner?.id) return;
    if (!confirm(`Generate a new temporary password for ${profile.owner.full_name || profile.owner.email}?`)) return;
    setSettingPassword(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/admin-set-temp-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({ target_user_id: profile.owner.id })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      alert(`New password for ${profile.owner.full_name || profile.owner.email}: ${result.tempPassword}\n\nPlease share this securely with the merchant.`);
    } catch (err) {
      alert(err.message || 'Failed to generate password');
    } finally {
      setSettingPassword(false);
    }
  };

  const fetchActivity = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data: activityData, error: activityErr } = await supabase.rpc('get_tenant_activity_log', {
      p_tenant_id: tenantId,
      p_limit: 100,
      p_offset: 0,
      p_from: fromDate ? new Date(fromDate).toISOString() : null,
      p_to: toDate ? new Date(toDate).toISOString() : null
    });
    if (activityErr) console.error(activityErr);
    setActivity(activityData || []);
  };

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data: profileData, error: profileErr } = await supabase.rpc('get_merchant_profile', { p_tenant_id: tenantId });
      if (profileErr) console.error(profileErr);
      setProfile(profileData);
      await fetchActivity();
      setLoading(false);
    };
    load();
  }, [tenantId]);

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-950 rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-bold">Merchant Profile</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : !profile ? (
          <div className="p-8 text-center text-red-500">Failed to load profile.</div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-xl">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 mb-2"><Building2 size={16} /> Business</div>
                <div className="font-bold">{profile.tenant?.business_name}</div>
                <div className="text-sm text-slate-500">{profile.tenant?.business_type}</div>
                <div className="text-xs text-slate-400 mt-1">Created: {profile.tenant?.created_at ? new Date(profile.tenant.created_at).toLocaleDateString() : '-'}</div>
              </div>
              <div className="p-4 border rounded-xl">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 mb-2"><User size={16} /> Owner</div>
                <div className="font-bold">{profile.owner?.full_name || '-'}</div>
                <div className="text-sm text-slate-500">{profile.owner?.email || '-'}</div>
                <div className="text-sm text-slate-500">{profile.owner?.phone || '-'}</div>
                <button
                  onClick={handleSetPassword}
                  disabled={settingPassword || !profile.owner?.id}
                  className="mt-2 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 disabled:opacity-50"
                >
                  <KeyRound size={12} /> {settingPassword ? 'Generating...' : 'Set New Password'}
                </button>
              </div>
              <div className="p-4 border rounded-xl">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 mb-2"><CreditCard size={16} /> Subscriptions</div>
                {(profile.subscriptions || []).length === 0 ? (
                  <div className="text-sm text-slate-400">No subscriptions yet</div>
                ) : (
                  profile.subscriptions.map((s: any, i: number) => (
                    <div key={i} className="text-sm mb-1">
                      <span className="font-medium">{s.module_name}</span> — {s.plan_name} ({s.billing_cycle}) — <span className={s.status === 'active' ? 'text-emerald-600' : 'text-red-600'}>{s.status}</span>
                      <div className="text-xs text-slate-400">Since {new Date(s.created_at).toLocaleDateString()}, till {s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : '-'}</div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-4 border rounded-xl">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 mb-2"><Wallet size={16} /> Wallet & Staff</div>
                <div className="text-sm">Wallet Balance: ₹{Number(profile.wallet_balance || 0).toFixed(2)}</div>
                <div className="text-sm">Active Staff: {profile.staff_count}</div>
                <div className="text-sm">Branches: {(profile.branches || []).length}</div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-500"><Clock size={16} /> Activity Timeline</div>
                <div className="flex items-center gap-2 text-sm">
                  <label className="text-xs text-slate-500">From</label>
                  <input type="datetime-local" className="border rounded px-2 py-1 text-xs bg-white dark:bg-slate-950" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                  <label className="text-xs text-slate-500">To</label>
                  <input type="datetime-local" className="border rounded px-2 py-1 text-xs bg-white dark:bg-slate-950" value={toDate} onChange={e => setToDate(e.target.value)} />
                  <button onClick={fetchActivity} className="px-3 py-1 text-xs bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded">Apply</button>
                  {(fromDate || toDate) && (
                    <button onClick={() => { setFromDate(''); setToDate(''); setTimeout(fetchActivity, 0); }} className="px-3 py-1 text-xs border rounded">Clear</button>
                  )}
                </div>
              </div>
              <div className="border rounded-xl divide-y max-h-80 overflow-y-auto">
                {activity.length === 0 ? (
                  <div className="p-4 text-sm text-slate-400 text-center">No activity recorded yet.</div>
                ) : (
                  activity.map((a) => (
                    <div key={a.id} className="p-3 flex justify-between items-center text-sm">
                      <div>
                        <div className="font-medium">{a.summary}</div>
                        <div className="text-xs text-slate-400">{a.actor_name || 'System'}</div>
                      </div>
                      <div className="text-xs text-slate-400">{new Date(a.created_at).toLocaleString()}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
