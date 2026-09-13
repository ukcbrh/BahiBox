import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { getSupabaseClient } from '@/src/lib/supabase';
import { toast } from 'sonner';

interface PlanCol {
  id: string;
  name: string;
  tier: string;
  price_monthly: number;
}

interface ToggleState {
  enabled: boolean;
  limit_value: number | null;
}

interface FeatureRow {
  id: string;
  feature_key: string;
  feature_label: string;
  description: string | null;
  has_limit_option: boolean;
  unit_label: string | null;
  toggles: Record<string, ToggleState>;
}

export default function PlanFeatureMatrix({ moduleName, onFeatureChanged }: { moduleName: string; onFeatureChanged?: () => void }) {
  const [plans, setPlans] = useState<PlanCol[]>([]);
  const [features, setFeatures] = useState<FeatureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadMatrix = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data, error } = await supabase.rpc('get_module_feature_matrix', { p_module_name: moduleName });
    if (error) {
      console.error(error);
      toast.error('Failed to load feature matrix: ' + error.message);
      setLoading(false);
      return;
    }
    setPlans(data?.plans || []);
    setFeatures(data?.features || []);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    loadMatrix();
  }, [moduleName]);

  const handleToggle = async (planId: string, featureId: string, current: ToggleState) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const newEnabled = !current.enabled;
    setFeatures(prev => prev.map(f => f.id === featureId ? { ...f, toggles: { ...f.toggles, [planId]: { enabled: newEnabled, limit_value: current.limit_value } } } : f));
    const { error } = await supabase.rpc('set_plan_feature', { p_plan_id: planId, p_feature_id: featureId, p_enabled: newEnabled, p_limit_value: current.limit_value });
    if (error) {
      toast.error('Failed to update: ' + error.message);
      loadMatrix();
    } else {
      onFeatureChanged?.();
    }
  };

  const handleLimitChange = (planId: string, featureId: string, value: string) => {
    const parsed = value === '' ? null : parseInt(value);
    setFeatures(prev => prev.map(f => f.id === featureId ? { ...f, toggles: { ...f.toggles, [planId]: { ...f.toggles[planId], limit_value: isNaN(parsed as number) ? null : parsed } } } : f));
  };

  const handleLimitBlur = async (planId: string, featureId: string, current: ToggleState) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.rpc('set_plan_feature', { p_plan_id: planId, p_feature_id: featureId, p_enabled: current.enabled, p_limit_value: current.limit_value });
    if (error) {
      toast.error('Failed to update limit: ' + error.message);
      loadMatrix();
    } else {
      onFeatureChanged?.();
    }
  };

  const toggleUnlimited = (planId: string, featureId: string, current: ToggleState) => {
    const newLimit = current.limit_value === null ? 0 : null;
    const newState = { ...current, limit_value: newLimit };
    setFeatures(prev => prev.map(f => f.id === featureId ? { ...f, toggles: { ...f.toggles, [planId]: newState } } : f));
    handleLimitBlur(planId, featureId, newState);
  };

  if (loading) return <div className="p-6 text-center text-slate-500">Loading feature matrix...</div>;

  return (
    <div className="border rounded-xl bg-white dark:bg-slate-950 overflow-hidden">
      <div className="p-4 border-b">
        <h3 className="font-bold text-slate-800 dark:text-slate-200">Feature Matrix — {moduleName}</h3>
        <p className="text-xs text-slate-500 mt-1">New features appear here automatically as they're built — just turn them on/off (and set a limit, where applicable) per plan.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900">
            <tr>
              <th className="text-left p-3 font-semibold text-slate-600 dark:text-slate-400">Feature</th>
              {plans.map(p => (
                <th key={p.id} className="text-center p-3 font-semibold text-slate-600 dark:text-slate-400 min-w-[140px]">
                  {p.tier}
                  <div className="text-xs font-normal text-slate-400">{p.name}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {features.length === 0 ? (
              <tr><td colSpan={plans.length + 1} className="p-6 text-center text-slate-400">No features defined yet for this module.</td></tr>
            ) : (
              features.map(f => (
                <React.Fragment key={f.id}>
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="p-3">
                      <button onClick={() => setExpandedId(expandedId === f.id ? null : f.id)} className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200 text-left">
                        {expandedId === f.id ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
                        {f.feature_label}
                      </button>
                    </td>
                    {plans.map(p => {
                      const state = f.toggles[p.id] || { enabled: false, limit_value: null };
                      return (
                        <td key={p.id} className="p-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <button
                              onClick={() => handleToggle(p.id, f.id, state)}
                              className={`w-14 h-7 rounded-full flex items-center transition-colors ${state.enabled ? 'bg-emerald-500 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'} px-1`}
                            >
                              <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
                                {state.enabled ? <Check size={12} className="text-emerald-600" /> : <X size={12} className="text-slate-400" />}
                              </span>
                            </button>
                            {f.has_limit_option && state.enabled && (
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min={0}
                                    disabled={state.limit_value === null}
                                    placeholder="0"
                                    className="w-20 h-7 text-xs border rounded px-2 bg-white dark:bg-slate-950 disabled:opacity-40 disabled:bg-slate-100 dark:disabled:bg-slate-900"
                                    value={state.limit_value ?? ''}
                                    onChange={e => handleLimitChange(p.id, f.id, e.target.value)}
                                    onBlur={() => handleLimitBlur(p.id, f.id, state)}
                                  />
                                  {f.unit_label && <span className="text-[10px] text-slate-400 whitespace-nowrap">{f.unit_label}</span>}
                                </div>
                                <label className="flex items-center gap-1 text-[10px] text-slate-500">
                                  <input
                                    type="checkbox"
                                    checked={state.limit_value === null}
                                    onChange={() => toggleUnlimited(p.id, f.id, state)}
                                  />
                                  Unlimited
                                </label>
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                  {expandedId === f.id && (
                    <tr className="bg-slate-50 dark:bg-slate-900/50">
                      <td colSpan={plans.length + 1} className="p-4 text-slate-600 dark:text-slate-400 text-sm">
                        {f.description || 'No description added.'}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
