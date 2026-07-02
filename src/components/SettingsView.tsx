import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { NotificationSettingsPanel } from './NotificationSettingsPanel';
import { NotificationHistoryTable } from './NotificationHistoryTable';
import { BillingSubscriptionView } from './payments/BillingSubscriptionView';
import { PaymentSettingsView } from './payments/PaymentSettingsView';
import { Settings, Bell, Shield, Store, CreditCard, Banknote } from 'lucide-react';

export function SettingsView() {
  const [activeSubTab, setActiveSubTab] = useState('general');

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto flex flex-col md:flex-row gap-6">
      
      {/* Sidebar Nav */}
      <div className="w-full md:w-64 shrink-0 space-y-1">
        <h2 className="text-xl font-bold mb-4 px-3">Settings</h2>
        
        <button 
          onClick={() => setActiveSubTab('general')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeSubTab === 'general' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Store size={18} /> General
        </button>
        <button 
          onClick={() => setActiveSubTab('notifications')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeSubTab === 'notifications' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Bell size={18} /> Notifications
        </button>
        <button 
          onClick={() => setActiveSubTab('billing')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeSubTab === 'billing' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <CreditCard size={18} /> Billing & Plan
        </button>
        <button 
          onClick={() => setActiveSubTab('payment_gateway')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeSubTab === 'payment_gateway' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Banknote size={18} /> Payment Gateway
        </button>
        <button 
          onClick={() => setActiveSubTab('security')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeSubTab === 'security' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Shield size={18} /> Security
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1">
        {activeSubTab === 'general' && (
          <Card>
            <CardHeader><CardTitle>General Settings</CardTitle></CardHeader>
            <CardContent>
              <p className="text-slate-500 text-sm">Business details, tax config, and regional settings will go here.</p>
            </CardContent>
          </Card>
        )}

        {activeSubTab === 'notifications' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <NotificationSettingsPanel />
            <NotificationHistoryTable />
          </div>
        )}

        {activeSubTab === 'billing' && (
          <div className="animate-in fade-in duration-300">
            <BillingSubscriptionView />
          </div>
        )}

        {activeSubTab === 'payment_gateway' && (
          <div className="animate-in fade-in duration-300">
            <PaymentSettingsView />
          </div>
        )}

        {activeSubTab === 'security' && (
          <Card className="animate-in fade-in duration-300">
            <CardHeader><CardTitle>Security</CardTitle></CardHeader>
            <CardContent>
              <p className="text-slate-500 text-sm">2FA, session management, and API key generation will go here.</p>
            </CardContent>
          </Card>
        )}
      </div>

    </div>
  );
}
