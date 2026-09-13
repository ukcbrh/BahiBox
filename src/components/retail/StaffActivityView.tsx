import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function StaffActivityView() {
  const { currentTenantId } = useAuth();
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchActivity = async () => {
    if (!currentTenantId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data, error } = await supabase.rpc('get_tenant_activity_log', {
      p_tenant_id: currentTenantId,
      p_limit: 200,
      p_offset: 0,
      p_from: fromDate ? new Date(fromDate).toISOString() : null,
      p_to: toDate ? new Date(toDate).toISOString() : null
    });
    if (error) console.error(error);
    setActivity(data || []);
  };

  useEffect(() => {
    if (!currentTenantId) return;
    const load = async () => {
      await fetchActivity();
      setLoading(false);
    };
    load();
  }, [currentTenantId]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Staff Activity</h2>
        <p className="text-slate-500 dark:text-slate-400">Every sale, purchase, product, customer, staff, and discount change made by anyone on your team.</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap bg-white dark:bg-slate-950 border rounded-xl p-3">
        <label className="text-sm text-slate-500">From</label>
        <input type="datetime-local" className="border rounded px-2 py-1 text-sm bg-white dark:bg-slate-950" value={fromDate} onChange={e => setFromDate(e.target.value)} />
        <label className="text-sm text-slate-500">To</label>
        <input type="datetime-local" className="border rounded px-2 py-1 text-sm bg-white dark:bg-slate-950" value={toDate} onChange={e => setToDate(e.target.value)} />
        <button onClick={fetchActivity} className="px-4 py-1.5 text-sm bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-lg">Apply</button>
        {(fromDate || toDate) && (
          <button onClick={() => { setFromDate(''); setToDate(''); setTimeout(fetchActivity, 0); }} className="px-4 py-1.5 text-sm border rounded-lg">Clear</button>
        )}
      </div>

      {loading ? (
        <div className="text-center text-slate-500 py-8">Loading...</div>
      ) : activity.length === 0 ? (
        <div className="text-center text-slate-400 py-8">No activity recorded yet.</div>
      ) : (
        <div className="border rounded-xl divide-y bg-white dark:bg-slate-950">
          {activity.map((a) => (
            <div key={a.id} className="p-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Clock size={16} className="text-slate-500" />
                </div>
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">{a.summary}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">by {a.actor_name || 'System'} ({a.actor_email || '-'})</div>
                </div>
              </div>
              <div className="text-xs text-slate-400">{new Date(a.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
