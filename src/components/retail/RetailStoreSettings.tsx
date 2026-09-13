import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getSupabaseClient } from '../../lib/supabase';
import { Store, Globe, ScanLine, MapPin, Settings as SettingsIcon, FileText, ToggleRight } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { SettingsGeneral } from '../SettingsGeneral';

export default function RetailStoreSettings({ onConfigChange }: { onConfigChange: () => void }) {
  const { currentTenantId, user } = useAuth();
  const [branch, setBranch] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBranchConfig();
  }, [currentTenantId]);

  const fetchBranchConfig = async () => {
    try {
      const supabase = getSupabaseClient();
      if (!supabase || !currentTenantId) return;

      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('tenant_id', currentTenantId)
        .eq('module_key', 'retail')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();
        
      if (data && !error) {
        setBranch(data);
      }
    } catch (err) {
      console.error('Error fetching branch:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key: 'is_online_store_active' | 'is_scan_and_go_active') => {
    if (!branch) return;

    const newValue = !branch[key];
    const prevBranch = { ...branch };
    
    // Optimistic update
    setBranch({ ...branch, [key]: newValue });
    
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase not initialized');

      const { error } = await supabase
        .from('branches')
        .update({ [key]: newValue })
        .eq('id', branch.id);

      if (error) {
        throw error;
      }

      toast.success(`${key === 'is_online_store_active' ? 'Online Store' : 'Scan & Go'} ${newValue ? 'enabled' : 'disabled'}`);
      
      // Notify parent to refetch
      if (onConfigChange) onConfigChange();
      
    } catch (err: any) {
      console.error(`Error toggling ${key}:`, err);
      // Revert on error
      setBranch(prevBranch);
      toast.error(`Failed to update settings: ${err.message}`);
    }
  };


  const [activeSubTab, setActiveSubTab] = useState('features');

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 dark:border-slate-800 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!branch) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        <p>No branch configuration found for this store.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto flex flex-col md:flex-row gap-6 animate-in fade-in duration-300">
      {/* Sidebar Nav */}
      <div className="w-full md:w-64 shrink-0 space-y-1">
        <h2 className="text-xl font-bold mb-4 px-3">Retail POS Settings</h2>
        
        <button 
          onClick={() => setActiveSubTab('features')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeSubTab === 'features' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
          }`}
        >
          <ToggleRight size={18} /> Store Features
        </button>


        <button 
          onClick={() => setActiveSubTab('general')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeSubTab === 'general' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
          }`}
        >
          <SettingsIcon size={18} /> Print Formats
        </button>

      </div>

      {/* Main Content Area */}
      <div className="flex-1 max-w-4xl">
        {activeSubTab === 'features' && (
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Store size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Store Features</h2>
                <p className="text-slate-500 dark:text-slate-400">Manage your online and in-store capabilities for {branch.branch_name}</p>
              </div>
            </div>

            <div className="grid gap-6">
              <div className="bg-white dark:bg-slate-950 border rounded-2xl p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Globe size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Online Store</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Let customers browse and order your products from the BahiBox public app.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle('is_online_store_active')}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${branch.is_online_store_active ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
                    role="switch"
                    aria-checked={branch.is_online_store_active}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-slate-950 shadow ring-0 transition duration-200 ease-in-out ${branch.is_online_store_active ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-950 border rounded-2xl p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <ScanLine size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Scan &amp; Go</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Let customers scan barcodes in-store and self-checkout with their phone.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle('is_scan_and_go_active')}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${branch.is_scan_and_go_active ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
                    role="switch"
                    aria-checked={branch.is_scan_and_go_active}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-slate-950 shadow ring-0 transition duration-200 ease-in-out ${branch.is_scan_and_go_active ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        
        {activeSubTab === 'general' && (
          <SettingsGeneral />
        )}
      </div>
    </div>
  );
}
