import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { getSupabaseClient } from '../lib/supabase';

export function BusinessProfileSettings() {
  const { user, currentTenantId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    businessName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    branchId: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentTenantId || !user) return;
      const supabase = getSupabaseClient();
      if (!supabase) return;

      try {
        // Fetch Tenant info (Business Name)
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('business_name')
          .eq('id', currentTenantId)
          .maybeSingle();

        // Fetch User info (Email, Phone)
        const { data: userData } = await supabase
          .from('users')
          .select('email, phone')
          .eq('id', user.id)
          .maybeSingle();

        // Fetch Branch info (Address, etc.)
        const { data: branchData } = await supabase
          .from('branches')
          .select('id, address, city, state, pincode')
          .eq('tenant_id', currentTenantId)
          .order('is_main_branch', { ascending: false })
          .limit(1)
          .maybeSingle();

        setProfile({
          businessName: tenantData?.business_name || '',
          email: userData?.email || user.email || '',
          phone: userData?.phone || user.phone || '',
          address: branchData?.address || '',
          city: branchData?.city || '',
          state: branchData?.state || '',
          pincode: branchData?.pincode || '',
          branchId: branchData?.id || ''
        });
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchProfile();
  }, [currentTenantId, user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSave = async () => {
    if (!currentTenantId || !user) return;
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      // 1. Update Tenant (Business Name)
      const { error: tenantErr } = await supabase
        .from('tenants')
        .update({ business_name: profile.businessName })
        .eq('id', currentTenantId);
      if (tenantErr) throw tenantErr;

      // 2. Update User (Email, Phone)
      const { error: userErr } = await supabase.from('users').update({ email: profile.email, phone: profile.phone }).eq('id', user.id);
      if (userErr) throw userErr;

      // 3. Update Branch (Address details)
      if (profile.branchId) {
        const { error: branchErr } = await supabase
          .from('branches')
          .update({
            address: profile.address,
            city: profile.city,
            state: profile.state,
            pincode: profile.pincode
          })
          .eq('id', profile.branchId);
        if (branchErr) throw branchErr;
      } else {
        // If no branch exists, create one
        const { error: insertBranchErr } = await supabase
          .from('branches')
          .insert({
            tenant_id: currentTenantId,
            branch_name: 'Main Branch',
            is_main_branch: true,
            address: profile.address,
            city: profile.city,
            state: profile.state,
            pincode: profile.pincode
          });
        if (insertBranchErr) throw insertBranchErr;
      }

      toast.success('Business profile updated successfully');
    } catch (error: any) {
      console.error('Error updating profile (details):', error);
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="animate-in fade-in duration-300">
      <CardHeader>
        <CardTitle>Billing Profile Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Business Name</label>
              <Input 
                name="businessName"
                value={profile.businessName}
                onChange={handleChange}
                placeholder="Enter your business name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <Input 
                name="email"
                type="email"
                value={profile.email}
                onChange={handleChange}
                placeholder="Business email"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Mobile Number</label>
              <Input 
                name="phone"
                value={profile.phone}
                onChange={handleChange}
                placeholder="Business mobile number"
              />
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <h3 className="text-sm font-semibold mb-4">Location Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Address</label>
                <Input 
                  name="address"
                  value={profile.address}
                  onChange={handleChange}
                  placeholder="Street address, building, etc."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">City</label>
                <Input 
                  name="city"
                  value={profile.city}
                  onChange={handleChange}
                  placeholder="City"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">State</label>
                <Input 
                  name="state"
                  value={profile.state}
                  onChange={handleChange}
                  placeholder="State"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">PIN Code</label>
                <Input 
                  name="pincode"
                  value={profile.pincode}
                  onChange={handleChange}
                  placeholder="PIN or ZIP code"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
