import React, { useState, useEffect } from 'react';
import { getSupabaseClient } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Building2, User } from 'lucide-react';
import { toast } from 'sonner';
import { ProviderProfileForm } from './ProviderProfileForm';

const PROVIDER_TYPES = ['Rider', 'Cleaner', 'Cook', 'Plumber', 'Electrician', 'Other'];

export const ServicesAdminSettings: React.FC = () => {
  const { currentTenantId, user } = useAuth();
  const [serviceMode, setServiceMode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [myProfile, setMyProfile] = useState<any>(null);
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (currentTenantId && supabase) {
      fetchMode();
      fetchMyProfile();
    }
  }, [currentTenantId]);

  const fetchMode = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tenants')
      .select('service_mode')
      .eq('id', currentTenantId)
      .single();
    if (!error && data) {
      setServiceMode(data.service_mode);
    }
    setLoading(false);
  };

  const fetchMyProfile = async () => {
    if (!supabase || !currentTenantId || !user) return;
    const { data, error } = await supabase
      .from('service_providers')
      .select('*')
      .eq('tenant_id', currentTenantId);
    if (!error && data) {
      let myData = data.find((p: any) => p.user_id === user.id) || data[0] || null;
      if (myData && !myData.provider_type) myData.provider_type = 'Rider';
      setMyProfile(myData);
    }
  };

  const handleSelectMode = async (mode: 'individual' | 'business') => {
    if (!supabase || !currentTenantId) return;

    if (serviceMode === 'business' && mode === 'individual') {
       if (!window.confirm("You are switching from Business to Individual mode. This will only show your own profile — existing staff records are kept safe but hidden in the UI. Proceed?")) return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('tenants')
      .update({ service_mode: mode })
      .eq('id', currentTenantId);

    if (error) {
      console.error('service_mode update failed:', error);
      toast.error('Failed to save mode: ' + error.message);
    } else {
      setServiceMode(mode);
      toast.success('Provider mode updated successfully');
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="p-6">Loading settings...</div>;
  }

  return (
    <div className="flex-1 p-6 h-full overflow-auto bg-slate-50 dark:bg-slate-900">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Admin Settings</h1>
        <p className="text-slate-500 dark:text-slate-400">Configure your daily services module preferences.</p>
      </div>

      <div className="max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Provider Type</CardTitle>
            <CardDescription>What type of service do you personally provide?</CardDescription>
          </CardHeader>
          <CardContent>
            <select 
              className="w-full flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={myProfile?.provider_type || 'Rider'} 
              onChange={e => setMyProfile((prev: any) => ({...(prev || {}), provider_type: e.target.value}))}
            >
              {PROVIDER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Provider Mode</CardTitle>
            <CardDescription>
              Choose how you want to manage services. This affects the "Staff & Team" views and capabilities.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${serviceMode === 'individual' ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-primary/50'}`}
                onClick={() => handleSelectMode('individual')}
              >
                <div className="flex items-center gap-3 mb-2">
                  <User className={`w-6 h-6 ${serviceMode === 'individual' ? 'text-primary' : 'text-slate-500'}`} />
                  <h3 className="font-semibold text-lg">Individual</h3>
                </div>
                <p className="text-sm text-slate-500">
                  I work alone. Manage your own profile, vehicle, and documents directly.
                </p>
                {serviceMode === 'individual' && <span className="mt-3 inline-block text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded">Active</span>}
              </div>

              <div 
                className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${serviceMode === 'business' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20' : 'border-slate-200 hover:border-emerald-500/50'}`}
                onClick={() => handleSelectMode('business')}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Building2 className={`w-6 h-6 ${serviceMode === 'business' ? 'text-emerald-600' : 'text-slate-500'}`} />
                  <h3 className="font-semibold text-lg">Business</h3>
                </div>
                <p className="text-sm text-slate-500">
                  I manage a team. Add and track multiple staff members or riders.
                </p>
                {serviceMode === 'business' && <span className="mt-3 inline-block text-xs font-semibold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-1 rounded">Active</span>}
              </div>
            </div>
          </CardContent>
        </Card>

        {serviceMode === 'individual' && (
          <ProviderProfileForm 
            profile={myProfile} 
            setProfile={setMyProfile}
            user={user}
            currentTenantId={currentTenantId || ''}
            onProfileSaved={fetchMyProfile}
          />
        )}
      </div>
    </div>
  );
}
