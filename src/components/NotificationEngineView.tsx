import React, { useState } from 'react';
import { PlatformProviderConfig } from './PlatformProviderConfig';
import { BroadcastComposer } from './BroadcastComposer';
import { NotificationQueueMonitor } from './NotificationQueueMonitor';
import { Card, CardContent } from '@/src/components/ui/card';
import { Megaphone, ShieldAlert, Activity } from 'lucide-react';

export function NotificationEngineView() {
  const [activeSubTab, setActiveSubTab] = useState('monitor');

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold dark:text-white">Notification Engine</h1>
        <p className="text-slate-500 dark:text-slate-400">Configure global gateways, monitor queues, and send broadcasts.</p>
      </div>

      <div className="flex border-b">
        <button 
          onClick={() => setActiveSubTab('monitor')}
          className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeSubTab === 'monitor' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity size={16} /> Live Monitor
        </button>
        <button 
          onClick={() => setActiveSubTab('gateways')}
          className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeSubTab === 'gateways' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldAlert size={16} /> Platform Gateways
        </button>
        <button 
          onClick={() => setActiveSubTab('broadcast')}
          className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeSubTab === 'broadcast' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Megaphone size={16} /> Broadcasts
        </button>
      </div>

      <div className="pt-4 max-w-5xl">
        {activeSubTab === 'monitor' && <NotificationQueueMonitor />}
        {activeSubTab === 'gateways' && <PlatformProviderConfig />}
        {activeSubTab === 'broadcast' && <BroadcastComposer />}
      </div>
    </div>
  );
}
