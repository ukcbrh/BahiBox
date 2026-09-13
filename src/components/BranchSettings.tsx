import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';

import { toast } from 'sonner';
import { MapPin, Plus, Trash2, Edit2, CheckCircle2, Navigation } from 'lucide-react';
import { Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { useAuth } from '../contexts/AuthContext';
import { getSupabaseClient } from '../lib/supabase';

export function BranchSettings({ moduleKey }: { moduleKey?: string } = {}) {
  const { currentTenantId } = useAuth();
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBranch, setEditingBranch] = useState<any | null>(null);
  
  const [formData, setFormData] = useState({
    branch_name: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    status: 'active',
      latitude: null as number | null,
    longitude: null as number | null,
    upi_id: ''
  });

  const fetchBranches = async () => {
    if (!currentTenantId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    
    try {
      setLoading(true);
      let query = supabase
        .from('branches')
        .select('*')
        .eq('tenant_id', currentTenantId);
      if (moduleKey) query = query.eq('module_key', moduleKey);
      const { data, error } = await query
        .order('is_main_branch', { ascending: false })
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
      toast.error('Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, [currentTenantId]);

  const handleEdit = (branch: any) => {
    setEditingBranch(branch.id);
    setFormData({
      branch_name: branch.branch_name || '',
      address: branch.address || '',
      city: branch.city || '',
      state: branch.state || '',
      pincode: branch.pincode || '',
      upi_id: branch.upi_id || '',
      status: branch.status || 'active',
      latitude: branch.latitude || null,
      longitude: branch.longitude || null
    });
  };

  const handleCancelEdit = () => {
    setEditingBranch(null);
    setFormData({
      branch_name: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      status: 'active',
      latitude: null as number | null,
      longitude: null,
upi_id: ""
    });
  };

  const handleSave = async () => {
    if (!currentTenantId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    
    if (!formData.branch_name) {
      toast.error('Branch name is required');
      return;
    }
    
    try {
      if (editingBranch === 'new') {
        const { error } = await supabase
          .from('branches')
          .insert({
            tenant_id: currentTenantId,
            branch_name: formData.branch_name,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
            upi_id: formData.upi_id,
            status: formData.status,
            latitude: formData.latitude,
            longitude: formData.longitude,
            module_key: moduleKey || null,
            is_main_branch: false // Main-branch status is set explicitly via the "Make Main" button, never automatically — avoids ever creating a second main branch for the tenant
          });
          
        if (error) throw error;
        toast.success('Branch created successfully');
      } else {
        const { error } = await supabase
          .from('branches')
          .update({
            branch_name: formData.branch_name,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
            upi_id: formData.upi_id,
            status: formData.status,
            latitude: formData.latitude,
            longitude: formData.longitude
          })
          .eq('id', editingBranch);
          
        if (error) throw error;
        toast.success('Branch updated successfully');
      }
      
      handleCancelEdit();
      fetchBranches();
    } catch (error: any) {
      console.error('Error saving branch:', error);
      toast.error(error.message || 'Failed to save branch');
    }
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      toast.info("Fetching your location...");
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
          toast.success("Location updated. You can drag the pin to adjust.");
        },
        (err) => {
          console.error(err);
          toast.error("Failed to get location. Please check browser permissions.");
        },
        { enableHighAccuracy: true }
      );
    } else {
      toast.error("Geolocation is not supported by your browser");
    }
  };

  const handleDragEnd = (e: any) => {
    if (e.latLng) {
      setFormData(prev => ({ 
        ...prev, 
        latitude: e.latLng.lat(), 
        longitude: e.latLng.lng() 
      }));
    }
  };

  const handleDelete = async (id: string, isMain: boolean) => {
    if (isMain) {
      toast.error('Cannot delete the main branch. Please set another branch as main first.');
      return;
    }
    
    if (!window.confirm('Are you sure you want to delete this branch?')) return;
    
    const supabase = getSupabaseClient();
    if (!supabase) return;
    
    try {
      const { error } = await supabase
        .from('branches')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      toast.success('Branch deleted successfully');
      fetchBranches();
    } catch (error: any) {
      console.error('Error deleting branch:', error);
      toast.error('Failed to delete branch');
    }
  };

  const handleSetMain = async (id: string) => {
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) return;
    
    try {
      // First set all branches (in this module only) to not main
      let unsetQuery = supabase
        .from('branches')
        .update({ is_main_branch: false })
        .eq('tenant_id', currentTenantId);
      if (moduleKey) unsetQuery = unsetQuery.eq('module_key', moduleKey);
      await unsetQuery;
        
      // Then set the selected to main
      const { error } = await supabase
        .from('branches')
        .update({ is_main_branch: true })
        .eq('id', id);
        
      if (error) throw error;
      toast.success('Main branch updated successfully');
      fetchBranches();
    } catch (error) {
      console.error('Error setting main branch:', error);
      toast.error('Failed to update main branch');
    }
  };

  const handleGetBranchQr = async (branch: any) => {
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) return;
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const response = await fetch('/api/create-branch-qr-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ tenant_id: currentTenantId, branch_id: branch.id })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to get QR code');
      }
      const result = await response.json();
      if (result.image_url) {
        window.open(result.image_url, '_blank');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to get QR code');
    }
  };

  return (
    <Card className="animate-in fade-in duration-300">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Branch Management</CardTitle>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your store locations and branches</p>
        </div>
        {!editingBranch && (
          <Button onClick={() => setEditingBranch('new')} className="gap-2">
            <Plus size={16} /> Add Branch
          </Button>
        )}
      </CardHeader>
      
      <CardContent>
        {editingBranch && (
          <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 mb-6 space-y-4">
            <h3 className="font-medium text-slate-900 dark:text-slate-100">
              {editingBranch === 'new' ? 'Create New Branch' : 'Edit Branch'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Branch Name *</label>
                <Input 
                  value={formData.branch_name}
                  onChange={(e) => setFormData({...formData, branch_name: e.target.value})}
                  placeholder="e.g. Downtown Store"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Address</label>
                <Input 
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="Street address"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">City</label>
                <Input 
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  placeholder="City"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">State</label>
                <Input 
                  value={formData.state}
                  onChange={(e) => setFormData({...formData, state: e.target.value})}
                  placeholder="State"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">PIN Code</label>
                <Input 
                  value={formData.pincode}
                  onChange={(e) => setFormData({...formData, pincode: e.target.value})}
                  placeholder="PIN / ZIP code"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">UPI ID (for bill payments)</label>
                <Input 
                  value={formData.upi_id}
                  onChange={(e) => setFormData({...formData, upi_id: e.target.value})}
                  placeholder="yourname@bank"
                />
              </div>
            </div>
            
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Pin Location (Optional but recommended)</label>
                <Button type="button" variant="outline" size="sm" onClick={handleUseCurrentLocation} className="text-xs">
                  <Navigation className="w-3 h-3 mr-1" /> Use My Location
                </Button>
              </div>
              <div className="w-full h-64 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 relative bg-slate-100 dark:bg-slate-900">
                <Map 
                  defaultCenter={formData.latitude && formData.longitude ? { lat: formData.latitude, lng: formData.longitude } : { lat: 20.5937, lng: 78.9629 }} 
                  defaultZoom={formData.latitude && formData.longitude ? 15 : 4} 
                  mapId="BRANCH_MAP"
                  onClick={(e: any) => {
                    if (e.detail.latLng) {
                      setFormData(prev => ({ ...prev, latitude: e.detail.latLng.lat, longitude: e.detail.latLng.lng }));
                    }
                  }}
                >
                  {formData.latitude && formData.longitude && (
                    <AdvancedMarker 
                      position={{ lat: formData.latitude, lng: formData.longitude }}
                      draggable={true}
                      onDragEnd={handleDragEnd}
                    >
                      <Pin background="#3b82f6" borderColor="#1d4ed8" glyphColor="#fff" />
                    </AdvancedMarker>
                  )}
                </Map>
              </div>
              <p className="text-xs text-slate-500 mt-2">Click on the map or drag the pin to set precise location for deliveries.</p>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button variant="outline" onClick={handleCancelEdit}>Cancel</Button>
              <Button onClick={handleSave}>Save Branch</Button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {loading && !branches.length ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">Loading branches...</div>
          ) : branches.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
              No branches found. Create your first branch to get started.
            </div>
          ) : (
            branches.map((branch) => (
              <div key={branch.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors bg-white dark:bg-slate-950 gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0 mt-1">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100">{branch.branch_name}</h4>
                      {branch.is_main_branch && (
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-100">Main Branch</span>
                      )}
                      {branch.status === 'inactive' && (
                        <span className="text-xs px-2 py-1 rounded-full border text-slate-500 dark:text-slate-400">Inactive</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {[branch.address, branch.city, branch.state, branch.pincode].filter(Boolean).join(', ') || 'No address provided'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  {!branch.is_main_branch && branch.status === 'active' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleSetMain(branch.id)}
                      title="Set as Main Branch"
                    >
                      <CheckCircle2 size={16} className="mr-1.5" />
                      Make Main
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => handleGetBranchQr(branch)}>
                    Download Payment QR
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleEdit(branch)}
                    className="text-slate-500 dark:text-slate-400 hover:text-blue-600"
                  >
                    <Edit2 size={16} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDelete(branch.id, branch.is_main_branch)}
                    className="text-slate-500 dark:text-slate-400 hover:text-red-600"
                    disabled={branch.is_main_branch}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
