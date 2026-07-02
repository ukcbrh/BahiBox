import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { ShieldAlert, Save } from 'lucide-react';
import { toast } from 'sonner';

export function PlatformProviderConfig() {
  const handleSave = () => {
    toast.success('Platform default providers updated.');
  };

  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="text-orange-500" size={20} />
          Platform Default Providers
        </CardTitle>
        <CardDescription>
          These gateways are used for tenants who have NOT configured their own API keys (BYO). 
          OTP and system-critical alerts always use these.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SMS Default */}
          <div className="space-y-3 p-4 border rounded-lg bg-slate-50">
            <h3 className="font-semibold text-sm text-slate-700 uppercase tracking-wider">SMS Default Gateway</h3>
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-500">Provider</label>
              <Select defaultValue="msg91">
                <SelectTrigger><SelectValue placeholder="Select Provider" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="msg91">MSG91</SelectItem>
                  <SelectItem value="twilio">Twilio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-500">API Key / Auth Token</label>
              <Input type="password" value="************************" readOnly={false} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-500">Sender ID (DLT Approved)</label>
              <Input value="BAHIBX" />
            </div>
          </div>

          {/* WhatsApp Default */}
          <div className="space-y-3 p-4 border rounded-lg bg-slate-50">
            <h3 className="font-semibold text-sm text-slate-700 uppercase tracking-wider">WhatsApp Default Gateway</h3>
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-500">Provider</label>
              <Select defaultValue="interakt">
                <SelectTrigger><SelectValue placeholder="Select Provider" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="interakt">Interakt</SelectItem>
                  <SelectItem value="whatsapp_cloud_api">WhatsApp Cloud API</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-500">API Key / Token</label>
              <Input type="password" value="************************" readOnly={false} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-500">WABA Account ID</label>
              <Input value="1234567890" />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} className="gap-2"><Save size={16}/> Save Platform Defaults</Button>
        </div>

      </CardContent>
    </Card>
  );
}
