import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Activity, RefreshCcw, AlertTriangle } from 'lucide-react';

export function NotificationQueueMonitor() {
  const stats = [
    { label: 'Queued', value: '1,204', color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Sending', value: '45', color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Failed (Retrying)', value: '12', color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Sent (Last 1hr)', value: '8,439', color: 'text-green-600', bg: 'bg-green-50' },
  ];

  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="text-indigo-500" size={20} />
              Live Queue Monitor
            </CardTitle>
            <CardDescription>Real-time status of the notification dispatcher engine.</CardDescription>
          </div>
          <Button variant="outline" size="sm" className="gap-2"><RefreshCcw size={14}/> Refresh</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {stats.map((s, i) => (
            <div key={i} className={`p-4 rounded-lg border ${s.bg}`}>
              <div className="text-sm font-medium text-slate-600 mb-1">{s.label}</div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="rounded-lg border overflow-hidden">
          <div className="bg-slate-50 p-3 border-b flex items-center justify-between">
            <h4 className="font-medium text-sm">Failed Queue Needs Attention</h4>
            <Button size="sm" variant="destructive" className="h-8 gap-2"><AlertTriangle size={14}/> Force Retry All</Button>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-2">Tenant ID</th>
                <th className="px-4 py-2">Channel</th>
                <th className="px-4 py-2">Error</th>
                <th className="px-4 py-2">Attempts</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs">t-1234-5678</td>
                <td className="px-4 py-3">whatsapp</td>
                <td className="px-4 py-3 text-red-600">Template ID mismatch</td>
                <td className="px-4 py-3">3 / 3 (Locked)</td>
              </tr>
              <tr className="border-t hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs">t-9876-5432</td>
                <td className="px-4 py-3">sms</td>
                <td className="px-4 py-3 text-red-600">Provider Timeout (Msg91)</td>
                <td className="px-4 py-3">1 / 3 (Retrying in 2m)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
