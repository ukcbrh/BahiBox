import React, { useState, useEffect } from 'react';
import { X, Package, Car, Wallet, Shield } from 'lucide-react';
import { getSupabaseClient } from '../lib/supabase';

export function UserActivityTimelineModal({ userId, displayName, onClose }: { userId: string, displayName: string, onClose: () => void }) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTimeline = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data, error } = await supabase.rpc('get_user_activity_timeline', { p_user_id: userId });
      if (!error && data) setEvents(data);
      setLoading(false);
    };
    fetchTimeline();
  }, [userId]);

  const iconFor = (type: string) => {
    if (type === 'order') return <Package size={16} className="text-blue-600" />;
    if (type === 'ride') return <Car size={16} className="text-purple-600" />;
    if (type === 'wallet') return <Wallet size={16} className="text-emerald-600" />;
    return <Shield size={16} className="text-amber-600" />;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-950 rounded-2xl w-full max-w-2xl max-h-[80vh] shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Activity Timeline</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{displayName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-5">
          {loading ? (
            <p className="text-center text-slate-400 py-8">Loading timeline...</p>
          ) : events.length === 0 ? (
            <p className="text-center text-slate-400 py-8">No activity found yet.</p>
          ) : (
            <div className="space-y-3">
              {events.map((ev, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <div className="mt-0.5">{iconFor(ev.event_type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <p className="font-semibold text-sm text-slate-900 dark:text-white">{ev.event_title}</p>
                      {ev.amount !== null && (
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">₹{Number(ev.amount).toFixed(2)}</span>
                      )}
                    </div>
                    {ev.event_detail && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{ev.event_detail}</p>}
                    <p className="text-xs text-slate-400 mt-1">{new Date(ev.event_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
