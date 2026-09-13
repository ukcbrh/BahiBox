import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { getSupabaseClient } from '@/src/lib/supabase';
import { toast } from 'sonner';

export default function UsageRateCardEditor() {
  const [rates, setRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data, error } = await supabase.from('usage_rate_card').select('*').order('usage_type');
    if (error) toast.error('Failed to load rate card: ' + error.message);
    setRates(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateRateLocal = (id: string, value: string) => {
    setRates(prev => prev.map(r => r.id === id ? { ...r, rate_amount: value } : r));
  };

  const saveRate = async (row: any) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from('usage_rate_card').update({ rate_amount: parseFloat(row.rate_amount) || 0, updated_at: new Date().toISOString() }).eq('id', row.id);
    if (error) {
      toast.error('Failed to save: ' + error.message);
    } else {
      toast.success(`${row.display_label} rate updated.`);
    }
  };

  if (loading) return <div className="p-6 text-center text-slate-500">Loading...</div>;

  return (
    <div className="border rounded-xl bg-white dark:bg-slate-950 overflow-hidden">
      <div className="p-4 border-b">
        <h3 className="font-bold text-slate-800 dark:text-slate-200">Usage Rate Card</h3>
        <p className="text-xs text-slate-500 mt-1">Set the ₹ rate charged to merchants for each usage type. This is charged on top of their fixed subscription, deducted from their Platform Usage Wallet.</p>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-900">
          <tr>
            <th className="text-left p-3 font-semibold text-slate-600 dark:text-slate-400">Usage Type</th>
            <th className="text-left p-3 font-semibold text-slate-600 dark:text-slate-400">Rate</th>
            <th className="text-left p-3 font-semibold text-slate-600 dark:text-slate-400"></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rates.map(r => (
            <tr key={r.id}>
              <td className="p-3">
                <div className="font-medium">{r.display_label}</div>
                <div className="text-xs text-slate-400">{r.unit_label}</div>
              </td>
              <td className="p-3">
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">₹</span>
                  <Input
                    type="number"
                    step="0.0001"
                    className="w-28 h-8"
                    value={r.rate_amount}
                    onChange={e => updateRateLocal(r.id, e.target.value)}
                  />
                </div>
              </td>
              <td className="p-3">
                <Button size="sm" variant="outline" className="gap-1" onClick={() => saveRate(r)}>
                  <Save size={14} /> Save
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
