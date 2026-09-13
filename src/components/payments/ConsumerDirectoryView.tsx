import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Lock, Unlock, History , KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseClient } from '../../lib/supabase';
import { UserActivityTimelineModal } from '../UserActivityTimelineModal';

export function ConsumerDirectoryView() {
  const [consumers, setConsumers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timelineFor, setTimelineFor] = useState<{ id: string, name: string } | null>(null);

  useEffect(() => {
    fetchConsumers();
  }, []);

  const fetchConsumers = async () => {
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data, error } = await supabase.rpc('get_consumer_directory');
    if (!error && data) setConsumers(data);
    setLoading(false);
  };

  const handleToggleBan = async (consumer: any) => {
    const isBanning = !consumer.is_banned;
    if (isBanning) {
      const confirmed = window.confirm(`Ban ${consumer.full_name}? They will be unable to log in.`);
      if (!confirmed) return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.rpc('toggle_consumer_ban', {
      p_user_id: consumer.user_id,
      p_ban: isBanning,
      p_reason: isBanning ? 'Banned by Super Admin' : null
    });
    if (error) {
      toast.error(`Failed: ${error.message}`);
      return;
    }
    toast.success(isBanning ? 'Consumer banned' : 'Consumer unbanned');
    setConsumers(prev => prev.map(c => c.user_id === consumer.user_id ? { ...c, is_banned: isBanning } : c));
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading consumer directory...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold dark:text-white">Consumer Directory</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">All registered public app users — activity, wallet, and account status.</p>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-medium">
              <tr>
                <th className="px-6 py-4">Name & Contact</th>
                <th className="px-6 py-4">Joined</th>
                <th className="px-6 py-4 text-right">Orders</th>
                <th className="px-6 py-4 text-right">Rides</th>
                <th className="px-6 py-4 text-right">Wallet Balance</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 dark:bg-slate-900">
              {consumers.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400">No consumers found</td></tr>
              ) : consumers.map((c) => (
                <tr key={c.user_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900 dark:text-white">{c.full_name || 'Unknown User'}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{c.phone || 'No phone'} • {c.email || 'No email'}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                    {new Date(c.joined_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 text-right">{c.total_orders}</td>
                  <td className="px-6 py-4 text-right">{c.total_rides}</td>
                  <td className="px-6 py-4 text-right font-semibold">₹{Number(c.wallet_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${c.is_banned ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'}`}>
                      {c.is_banned ? 'Banned' : 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" title="Activity History" onClick={() => setTimelineFor({ id: c.user_id, name: c.full_name || 'Unknown User' })} className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30">
                        <History size={18} />
                      </Button>
                      <Button variant="ghost" size="icon" title={c.is_banned ? 'Unban' : 'Ban'} onClick={() => handleToggleBan(c)} className={c.is_banned ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30' : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30'}>
                        {c.is_banned ? <Unlock size={18} /> : <Lock size={18} />}
                      </Button>
                      <Button variant="ghost" size="icon" title="Generate Temp Password" onClick={async () => {
                        const supabase = getSupabaseClient();
                        if (!supabase) return;
                        const { data: { session } } = await supabase.auth.getSession();
                        const response = await fetch('/api/admin-set-temp-password', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
                          body: JSON.stringify({ target_user_id: c.user_id })
                        });
                        const result = await response.json();
                        if (!response.ok) { toast.error(result.error || 'Failed to generate temporary password'); return; }
                        window.prompt(`Temporary password for ${c.full_name || 'this consumer'} (share this securely):`, result.temp_password);
                      }} className="text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/30">
                        <KeyRound size={18} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {timelineFor && (
        <UserActivityTimelineModal
          userId={timelineFor.id}
          displayName={timelineFor.name}
          onClose={() => setTimelineFor(null)}
        />
      )}
    </div>
  );
}
