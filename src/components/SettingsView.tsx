import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSupabaseClient } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { NotificationSettingsPanel } from './NotificationSettingsPanel';
import { NotificationHistoryTable } from './NotificationHistoryTable';
import { BillingSubscriptionView } from './payments/BillingSubscriptionView';
import { PaymentSettingsView } from './payments/PaymentSettingsView';
import { BrandingWhiteLabelSettings } from './BrandingWhiteLabelSettings';
import { BusinessProfileSettings } from './BusinessProfileSettings';
import { ChangePasswordCard } from './ChangePasswordCard';
import { BranchSettings } from './BranchSettings';
import { StaffRolesView } from './StaffRolesView';
import { Settings, Bell, Shield, Store, CreditCard, Banknote, Palette, FileText, UserCircle, MapPin, Users } from 'lucide-react';

interface SettingsViewProps {
  activeModule?: string;
}

export function SettingsView({ activeModule = 'Retail POS' }: SettingsViewProps) {
  const [activeSubTab, setActiveSubTab] = useState('profile');
  const [purchasedModules, setPurchasedModules] = useState<{ module_name: string; module_key: string }[]>([]);
  const [selectedBranchModuleKey, setSelectedBranchModuleKey] = useState<string | null>(null);
  const { currentTenantId } = useAuth();

  useEffect(() => {
    const fetchPurchasedModules = async () => {
      const supabase = getSupabaseClient();
      if (!supabase || !currentTenantId) return;
      const { data } = await supabase
        .from('merchant_subscriptions')
        .select('status, subscription_plans(module_name, module_key)')
        .eq('tenant_id', currentTenantId)
        .eq('status', 'active');
      if (data) {
        const uniqueModules = Array.from(
          new globalThis.Map(
            data
              .filter((d: any) => d.subscription_plans)
              .map((d: any) => [d.subscription_plans.module_key, { module_name: d.subscription_plans.module_name, module_key: d.subscription_plans.module_key }])
          ).values()
        );
        setPurchasedModules(uniqueModules as any);
      }
    };
    fetchPurchasedModules();
  }, [currentTenantId]);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto flex flex-col md:flex-row gap-6">
      
      {/* Sidebar Nav */}
      <div className="w-full md:w-64 shrink-0 space-y-1">
        <h2 className="text-xl font-bold mb-4 px-3">Settings</h2>
        
        <button 
          onClick={() => setActiveSubTab('profile')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeSubTab === 'profile' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
          }`}
        >
          <UserCircle size={18} /> Billing Profile
        </button>
                
        
        <button 
          onClick={() => setActiveSubTab('branding')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeSubTab === 'branding' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
          }`}
        >
          <Palette size={18} /> Branding & White-Label
        </button>
        
        <button 
          onClick={() => setActiveSubTab('notifications')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeSubTab === 'notifications' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
          }`}
        >
          <Bell size={18} /> Notifications
        </button>
        <button 
          onClick={() => setActiveSubTab('billing')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeSubTab === 'billing' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
          }`}
        >
          <CreditCard size={18} /> Billing & Plan
        </button>
        <button 
          onClick={() => setActiveSubTab('payment_gateway')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeSubTab === 'payment_gateway' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
          }`}
        >
          <Banknote size={18} /> Payment Gateway
        </button>
        <button 
          onClick={() => setActiveSubTab('security')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeSubTab === 'security' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
          }`}
        >
          <Shield size={18} /> Security
        </button>
        <button 
          onClick={() => setActiveSubTab('branches')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeSubTab === 'branches' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
          }`}
        >
          <Store size={18} /> Branches
        </button>
        <button 
          onClick={() => setActiveSubTab('hr_payroll')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeSubTab === 'hr_payroll' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
          }`}
        >
          <Users size={18} /> HR & Payroll
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1">
        {activeSubTab === 'profile' && (
          <BusinessProfileSettings />
        )}
        
        

        
        {activeSubTab === 'branding' && (
          <div className="animate-in fade-in duration-300">
            <BrandingWhiteLabelSettings />
          </div>
        )}

        {activeSubTab === 'notifications' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <NotificationSettingsPanel />
            <NotificationHistoryTable />
          </div>
        )}

        {activeSubTab === 'billing' && (
          <div className="animate-in fade-in duration-300">
            <BillingSubscriptionView activeModule={activeModule} />
          </div>
        )}

        {activeSubTab === 'payment_gateway' && (
          <div className="animate-in fade-in duration-300">
            <PaymentSettingsView />
          </div>
        )}

        {activeSubTab === 'security' && (
          <div className="animate-in fade-in duration-300">
            <ChangePasswordCard />
          </div>
        )}
        {activeSubTab === 'branches' && (
          <div className="animate-in fade-in duration-300 space-y-4">
            {!selectedBranchModuleKey ? (
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Select Module to Manage Branches</h3>
                {purchasedModules.length === 0 ? (
                  <p className="text-sm text-slate-400">No active modules found.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {purchasedModules.map((mod) => (
                      <button
                        key={mod.module_key}
                        onClick={() => setSelectedBranchModuleKey(mod.module_key)}
                        className="text-left bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:shadow-md transition-shadow"
                      >
                        <p className="font-bold text-slate-900 dark:text-slate-100">{mod.module_name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Manage branches for this module</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <button onClick={() => setSelectedBranchModuleKey(null)} className="text-sm font-semibold text-primary mb-4">← Back to Module Selection</button>
                <BranchSettings moduleKey={selectedBranchModuleKey} />
              </div>
            )}
          </div>
        )}
          {activeSubTab === 'hr_payroll' && (
          <div className="animate-in fade-in duration-300">
            <StaffRolesView />
          </div>
        )}
    </div>

    </div>
  );
}
