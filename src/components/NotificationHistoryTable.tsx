import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { RefreshCw, Search, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Input } from '@/src/components/ui/input';

export function NotificationHistoryTable() {
  const [logs] = useState([
    { id: '1', to: '+919876543210', event: 'Payment Success', channel: 'whatsapp', status: 'delivered', time: '10 mins ago' },
    { id: '2', to: '+919876543210', event: 'Payment Success', channel: 'sms', status: 'delivered', time: '10 mins ago' },
    { id: '3', to: '+919988776655', event: 'EMI Reminder', channel: 'whatsapp', status: 'failed', time: '1 hour ago' },
    { id: '4', to: '+918877665544', event: 'Order Confirmation', channel: 'sms', status: 'sent', time: '2 hours ago' },
    { id: '5', to: '+917766554433', event: 'OTP', channel: 'sms', status: 'queued', time: 'Just now' },
  ]);

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'delivered': return <CheckCircle2 size={16} className="text-green-500" />;
      case 'failed': return <XCircle size={16} className="text-red-500" />;
      case 'queued': case 'sending': return <RefreshCw size={16} className="text-blue-500 animate-spin" />;
      default: return <CheckCircle2 size={16} className="text-slate-400" />;
    }
  };

  return (
    <Card className="shadow-sm border-none">
      <CardHeader className="border-b pb-4">
        <div className="flex items-center justify-between">
          <CardTitle>Delivery Logs</CardTitle>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input placeholder="Search number..." className="pl-9 w-64" />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="queued">Queued</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50">
              <tr>
                <th className="px-6 py-3">Recipient</th>
                <th className="px-6 py-3">Event / Template</th>
                <th className="px-6 py-3">Channel</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Time</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium">{log.to}</td>
                  <td className="px-6 py-4">{log.event}</td>
                  <td className="px-6 py-4">
                    <span className="uppercase text-xs font-semibold px-2 py-1 rounded-full bg-slate-100">
                      {log.channel}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(log.status)}
                      <span className="capitalize">{log.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{log.time}</td>
                  <td className="px-6 py-4 text-right">
                    {log.status === 'failed' && (
                      <Button variant="outline" size="sm" className="h-8">Retry</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
