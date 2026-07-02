import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { Switch } from '@/src/components/ui/switch';
import { MessageSquare, Smartphone, Bell, Key, Plus, Eye } from 'lucide-react';
import { toast } from 'sonner';

export function NotificationSettingsPanel() {
  const [channels, setChannels] = useState({
    sms: { enabled: true, customProvider: false, provider: 'msg91' },
    whatsapp: { enabled: true, customProvider: true, provider: 'interakt' },
    push: { enabled: true, customProvider: false, provider: 'fcm' }
  });

  const handleSave = () => {
    toast.success('Notification settings saved successfully');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Communication Channels</CardTitle>
          <CardDescription>Configure how you communicate with your customers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* SMS Settings */}
          <div className="flex items-start justify-between p-4 border rounded-lg bg-slate-50">
            <div className="flex gap-4">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg h-fit">
                <Smartphone size={24} />
              </div>
              <div>
                <h3 className="font-medium text-slate-900">SMS Notifications</h3>
                <p className="text-sm text-slate-500">OTP, payment links, and critical alerts</p>
                
                {channels.sms.enabled && (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={channels.sms.customProvider}
                        onCheckedChange={(c) => setChannels({...channels, sms: {...channels.sms, customProvider: c}})}
                      />
                      <span className="text-sm">Use custom provider (BYO Gateway)</span>
                    </div>
                    
                    {channels.sms.customProvider && (
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        <Select defaultValue={channels.sms.provider}>
                          <SelectTrigger><SelectValue placeholder="Select Provider" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="msg91">MSG91</SelectItem>
                            <SelectItem value="twilio">Twilio</SelectItem>
                            <SelectItem value="textlocal">TextLocal</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input type="password" placeholder="API Key / Auth Token" />
                        <Input placeholder="Sender ID (e.g. BAHIBX)" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <Switch 
              checked={channels.sms.enabled} 
              onCheckedChange={(c) => setChannels({...channels, sms: {...channels.sms, enabled: c}})}
            />
          </div>

          {/* WhatsApp Settings */}
          <div className="flex items-start justify-between p-4 border rounded-lg bg-slate-50">
            <div className="flex gap-4">
              <div className="p-2 bg-green-100 text-green-600 rounded-lg h-fit">
                <MessageSquare size={24} />
              </div>
              <div>
                <h3 className="font-medium text-slate-900">WhatsApp Business</h3>
                <p className="text-sm text-slate-500">Invoices, order tracking, and rich media</p>
                
                {channels.whatsapp.enabled && (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={channels.whatsapp.customProvider}
                        onCheckedChange={(c) => setChannels({...channels, whatsapp: {...channels.whatsapp, customProvider: c}})}
                      />
                      <span className="text-sm">Use custom provider (BYO Gateway)</span>
                    </div>
                    
                    {channels.whatsapp.customProvider && (
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        <Select defaultValue={channels.whatsapp.provider}>
                          <SelectTrigger><SelectValue placeholder="Select Provider" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="interakt">Interakt</SelectItem>
                            <SelectItem value="gupshup">Gupshup</SelectItem>
                            <SelectItem value="whatsapp_cloud_api">WhatsApp Cloud API</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input type="password" placeholder="API Key / Token" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <Switch 
              checked={channels.whatsapp.enabled} 
              onCheckedChange={(c) => setChannels({...channels, whatsapp: {...channels.whatsapp, enabled: c}})}
            />
          </div>

        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Message Templates</CardTitle>
            <CardDescription>Manage automated message content</CardDescription>
          </div>
          <Button variant="outline" size="sm" className="gap-2"><Plus size={16}/> New Template</Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {['Order Confirmation', 'Payment Success', 'EMI Reminder'].map((tpl, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-md">
                <div>
                  <div className="font-medium">{tpl}</div>
                  <div className="text-sm text-slate-500 flex gap-2">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-xs">WhatsApp</span>
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-xs">SMS</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm"><Eye size={16} className="text-slate-500"/></Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave}>Save Configuration</Button>
      </div>
    </div>
  );
}
