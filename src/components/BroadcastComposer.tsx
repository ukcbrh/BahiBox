import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Textarea } from '@/src/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { Megaphone, Send } from 'lucide-react';
import { toast } from 'sonner';

export function BroadcastComposer() {
  const [audience, setAudience] = useState('all_merchants');

  const handleSend = () => {
    toast.success('Broadcast queued successfully. Check monitor for status.');
  };

  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="text-blue-500" size={20} />
          New Platform Broadcast
        </CardTitle>
        <CardDescription>Send announcements, downtime alerts, or feature updates.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Audience</label>
            <Select value={audience} onValueChange={setAudience}>
              <SelectTrigger><SelectValue placeholder="Select Audience" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all_merchants">All Merchants (Admins)</SelectItem>
                <SelectItem value="all_consumers">All App Consumers</SelectItem>
                <SelectItem value="specific_module">Tenants using specific Module</SelectItem>
                <SelectItem value="specific_tenant_list">Specific Tenant IDs</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Channels</label>
            <div className="flex gap-4 pt-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded" defaultChecked /> In-App
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded" /> Email
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded" /> Push (FCM)
              </label>
            </div>
          </div>
        </div>

        {audience === 'specific_module' && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Target Module</label>
            <Select defaultValue="retail">
              <SelectTrigger><SelectValue placeholder="Select Module" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="retail">Retail POS</SelectItem>
                <SelectItem value="hospitality">Hospitality</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Message Title</label>
          <Input placeholder="e.g. Scheduled Maintenance Alert" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Message Body</label>
          <Textarea 
            placeholder="Type your broadcast message here..." 
            className="min-h-[120px]"
          />
          <p className="text-xs text-slate-500">Supports Markdown. Keep it concise.</p>
        </div>

      </CardContent>
      <div className="flex items-center p-6 pt-0 justify-end border-t mt-4">
        <Button onClick={handleSend} className="gap-2 mt-4"><Send size={16}/> Dispatch Broadcast</Button>
      </div>
    </Card>
  );
}
