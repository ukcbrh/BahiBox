import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { getSupabaseClient } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Upload, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

export function BrandingWhiteLabelSettings() {
  const { currentTenantId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    brand_name: '',
    logo_url: '',
    primary_color: '#0f172a',
    secondary_color: '#334155',
    custom_domain: ''
  });

  const [verificationStatus, setVerificationStatus] = useState('none');
  const [isWhiteLabelActive, setIsWhiteLabelActive] = useState(false);
  const [originalDomain, setOriginalDomain] = useState('');
  const [planType, setPlanType] = useState('free');

  useEffect(() => {
    if (!currentTenantId) return;

    const fetchData = async () => {
      try {
        const supabase = getSupabaseClient();
        if (!supabase) return;

        // Fetch plan
        const { data: tenant } = await supabase.from('tenants').select('plan_type').eq('id', currentTenantId).maybeSingle();
        if (tenant) {
          setPlanType(tenant.plan_type || 'free');
        }

        // Fetch branding
        const { data: branding, error } = await supabase.from('merchant_branding').select('*').eq('merchant_id', currentTenantId).maybeSingle();
        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (branding) {
          setFormData({
            brand_name: branding.brand_name || '',
            logo_url: branding.logo_url || '',
            primary_color: branding.primary_color || '#0f172a',
            secondary_color: branding.secondary_color || '#334155',
            custom_domain: branding.custom_domain || ''
          });
          setOriginalDomain(branding.custom_domain || '');
          // If domain_verification_status does not exist yet (before migration), default to none
          setVerificationStatus(branding.domain_verification_status || 'none');
          setIsWhiteLabelActive(branding.is_whitelabel_active || false);
        }
      } catch (err: any) {
        console.error("Error fetching branding:", err);
        // Suppress missing column error from UI if patch isn't applied yet
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentTenantId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentTenantId) return;

    setUploading(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabase client not initialized");

      const fileExt = file.name.split('.').pop();
      const fileName = `${currentTenantId}/logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('branding-assets')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('branding-assets')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, logo_url: publicUrlData.publicUrl }));
      toast.success("Logo uploaded successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload logo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async () => {
    if (!currentTenantId) return;
    setSaving(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabase client not initialized");

      let nextStatus = verificationStatus;
      let nextActive = isWhiteLabelActive;

      if (formData.custom_domain && formData.custom_domain !== originalDomain) {
        nextStatus = 'pending';
        nextActive = false; // Require re-verification
      }

      const payload = {
        merchant_id: currentTenantId,
        brand_name: formData.brand_name,
        logo_url: formData.logo_url,
        primary_color: formData.primary_color,
        secondary_color: formData.secondary_color,
        custom_domain: formData.custom_domain || null,
        domain_verification_status: nextStatus,
        is_whitelabel_active: nextActive,
      };

      const { error } = await supabase.from('merchant_branding').upsert(payload, { onConflict: 'merchant_id' });
      if (error) throw error;

      setOriginalDomain(formData.custom_domain);
      setVerificationStatus(nextStatus);
      setIsWhiteLabelActive(nextActive);

      toast.success("Branding settings saved successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to save branding settings");
    } finally {
      setSaving(false);
    }
  };

  const isPremium = planType === 'premium' || planType === 'pro' || planType === 'white_label' || planType === 'branded';

  if (loading) {
    return <div className="p-8 text-center animate-pulse">Loading branding settings...</div>;
  }

  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle>Branding & White-Label</CardTitle>
        <CardDescription>Customize the appearance of your storefront and consumer app.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Brand Name</label>
            <Input 
              value={formData.brand_name}
              onChange={(e) => setFormData(prev => ({ ...prev, brand_name: e.target.value }))}
              placeholder="e.g. My Awesome Store"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Logo</label>
            <div className="flex items-center gap-4">
              {formData.logo_url ? (
                <div className="h-16 w-16 rounded-md border bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden shrink-0">
                  <img src={formData.logo_url} alt="Logo" className="max-h-full max-w-full object-contain" />
                </div>
              ) : (
                <div className="h-16 w-16 rounded-md border border-dashed bg-slate-50 dark:bg-slate-900 flex items-center justify-center shrink-0">
                  <span className="text-xs text-slate-400">No logo</span>
                </div>
              )}
              <div className="flex-1 space-y-1">
                <Input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload size={16} className="mr-2" />
                  {uploading ? 'Uploading...' : 'Upload New Logo'}
                </Button>
                <p className="text-xs text-slate-500 dark:text-slate-400">Recommended: Square PNG or JPG, max 2MB.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Primary Color</label>
              <div className="flex gap-2">
                <input 
                  type="color" 
                  className="h-10 w-10 p-1 rounded border cursor-pointer shrink-0" 
                  value={formData.primary_color}
                  onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                />
                <Input 
                  value={formData.primary_color}
                  onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                  className="font-mono uppercase"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Secondary Color</label>
              <div className="flex gap-2">
                <input 
                  type="color" 
                  className="h-10 w-10 p-1 rounded border cursor-pointer shrink-0" 
                  value={formData.secondary_color}
                  onChange={(e) => setFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
                />
                <Input 
                  value={formData.secondary_color}
                  onChange={(e) => setFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
                  className="font-mono uppercase"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center justify-between">
              Custom Domain
              {verificationStatus === 'verified' && (
                <span className="flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                  <CheckCircle2 size={12} className="mr-1" /> Active
                </span>
              )}
              {verificationStatus === 'pending' && (
                <span className="flex items-center text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                  <Clock size={12} className="mr-1" /> Pending Approval
                </span>
              )}
              {verificationStatus === 'rejected' && (
                <span className="flex items-center text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-full">
                  <AlertCircle size={12} className="mr-1" /> Rejected
                </span>
              )}
            </label>
            
            <Input 
              value={formData.custom_domain}
              onChange={(e) => setFormData(prev => ({ ...prev, custom_domain: e.target.value }))}
              placeholder="e.g. store.mybusiness.com"
              disabled={!isPremium && formData.custom_domain === ''}
            />
            
            {!isPremium && formData.custom_domain === '' ? (
              <p className="text-sm text-amber-600 font-medium">
                Upgrade to a Premium plan to unlock custom domains.
              </p>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Point a CNAME record for your domain to <strong>bahibox.app</strong>, then enter it here. Domain changes require Super Admin approval.
              </p>
            )}
          </div>
        </div>

        <div className="pt-6 flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Branding'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
