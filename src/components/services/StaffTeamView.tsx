import React, { useState, useEffect } from 'react';
import { getSupabaseClient } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { toast } from 'sonner';

const PROVIDER_TYPES = ['Barber', 'Plumber', 'Electrician', 'Carpenter', 'Advocate', 'Mechanic', 'Painter', 'Other'];

export interface ServiceProvider {
  id: string;
  tenant_id: string;
  user_id: string | null;
  provider_type: string;
  full_name: string;
  phone: string;
  vehicle_type: string | null;
  vehicle_category: string | null;
  vehicle_model: string | null;
  vehicle_number: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  bank_account_holder_name: string | null;
  kyc_status: string;
  kyc_rejection_reason: string | null;
  is_online: boolean;
  current_lat: number | null;
  current_lng: number | null;
  last_location_updated_at: string | null;
  status: string;
  rating: number | null;
  is_active: boolean;
}

export interface ProviderDocument {
  id: string;
  service_provider_id: string;
  document_type: string;
  document_url: string;
  document_number: string | null;
  expiry_date: string | null;
  status: string;
  rejection_reason: string | null;
}

export function StaffTeamView() {
  const { currentTenantId, user } = useAuth();
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [serviceMode, setServiceMode] = useState<string | null>(null);
  const [modeLoading, setModeLoading] = useState(true);

  // Business Mode state
  const [showAddForm, setShowAddForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [providerType, setProviderType] = useState('Rider');
  const [customType, setCustomType] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Individual Mode state
  const [myProfile, setMyProfile] = useState<ServiceProvider | null>(null);
  const [documents, setDocuments] = useState<ProviderDocument[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  const [mapCenter, setMapCenter] = useState({ lat: 28.6139, lng: 77.2090 });
  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  const supabase = getSupabaseClient();

  useEffect(() => {
    if (!supabase || !currentTenantId) return;

    const fetchModeAndData = async () => {
      setModeLoading(true);
      const { data: tenant } = await supabase.from('tenants').select('service_mode').eq('id', currentTenantId).single();
      if (tenant) {
        setServiceMode(tenant.service_mode);
      }
      setModeLoading(false);
    };

    fetchModeAndData();
  }, [currentTenantId]);

  useEffect(() => {
    if (serviceMode) {
      fetchProviders();
    }
  }, [currentTenantId, serviceMode]);

  const fetchProviders = async () => {
    if (!supabase || !currentTenantId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('service_providers')
      .select('*')
      .eq('tenant_id', currentTenantId);

    if (!error && data) {
      setProviders(data);
      
      if (serviceMode === 'individual') {
        let myData = data.find((p: any) => p.user_id === user?.id) || data[0]; // fallback to first if test mode
        if (myData) {
          // FIX: Explicitly set provider_type if null so it matches the dropdown fallback
          if (!myData.provider_type) myData.provider_type = 'Rider';
        }
        setMyProfile(myData || null);
        if (myData) {
        }
      }
    }
    setLoading(false);
  };

  const fetchDocuments = async (providerId: string) => {
    if (!supabase) return;
    const { data } = await supabase
      .from('service_provider_documents')
      .select('*')
      .eq('service_provider_id', providerId);
    if (data) {
      setDocuments(data);
    }
  };

  // ... business mode add handler
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !currentTenantId) return;
    setSubmitting(true);
    const finalType = providerType === 'Other' ? customType : providerType;
    
    const { error } = await supabase.from('service_providers').insert({
      tenant_id: currentTenantId,
      full_name: fullName,
      phone: phone,
      provider_type: finalType,
      vehicle_type: vehicleType || null,
      status: 'offline',
      is_active: true
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Staff added!");
      setFullName('');
      setPhone('');
      setCustomType('');
      setVehicleType('');
      setShowAddForm(false);
      fetchProviders();
    }
    setSubmitting(false);
  };

  // ... individual profile save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !currentTenantId || !myProfile) return;
    
    setSavingProfile(true);
    const updateData = {
      full_name: myProfile.full_name,
      provider_type: myProfile.provider_type,
      vehicle_category: myProfile.vehicle_category,
      vehicle_type: myProfile.vehicle_type,
      vehicle_model: myProfile.vehicle_model,
      vehicle_number: myProfile.vehicle_number,
      bank_account_number: myProfile.bank_account_number,
      bank_ifsc: myProfile.bank_ifsc,
      bank_account_holder_name: myProfile.bank_account_holder_name
    };

    let error;
    if (myProfile?.id) {
       const res = await supabase.from('service_providers').update(updateData).eq('id', myProfile.id);
       error = res.error;
    } else {
       const res = await supabase.from('service_providers').insert({
         ...updateData,
         tenant_id: currentTenantId,
         user_id: user?.id,
         status: 'offline',
         is_active: true,
         kyc_status: 'pending'
       });
       error = res.error;
    }

    if (error) {
       toast.error("Failed to save profile: " + error.message);
    } else {
       toast.success("Profile saved!");
       fetchProviders();
    }
    setSavingProfile(false);
  };

  const viewDocument = async (path: string) => {
    if (!supabase) return;
    if (path.startsWith('http')) {
      window.open(path, '_blank');
      return;
    }
    const { data, error } = await supabase.storage.from('provider-documents').createSignedUrl(path, 3600);
    if (error) {
      toast.error("Could not load document: " + error.message);
    } else if (data) {
      window.open(data.signedUrl, '_blank');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    if (!e.target.files || !e.target.files[0] || !myProfile?.id || !supabase || !user) return;
    const file = e.target.files[0];
    
    setUploadingDoc(docType);
    try {
      const fileName = `${user.id}/${docType}-${Date.now()}`;
      const { error: uploadError } = await supabase.storage
        .from('provider-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const docUrl = fileName;

      // Check if doc exists
      const existingDoc = documents.find(d => d.document_type === docType);
      
      let dbError;
      if (existingDoc) {
        const res = await supabase.from('service_provider_documents').update({
          document_url: docUrl,
          status: 'pending'
        }).eq('id', existingDoc.id);
        dbError = res.error;
      } else {
        const res = await supabase.from('service_provider_documents').insert({
          service_provider_id: myProfile.id,
          document_type: docType,
          document_url: docUrl,
          status: 'pending'
        });
        dbError = res.error;
      }

      if (dbError) throw dbError;

      toast.success(`${docType.replace('_', ' ')} uploaded!`);
      fetchDocuments(myProfile.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to upload document");
    } finally {
      setUploadingDoc(null);
    }
  };

  const submitKyc = async () => {
    if (!supabase || !myProfile) return;
    
    const requiredDocs = ['driving_license', 'rc', 'insurance', 'pollution_cert'];
    const hasAll = requiredDocs.every(t => documents.some(d => d.document_type === t && d.document_url));
    if (!hasAll) {
      toast.error("Please upload all required documents first.");
      return;
    }

    const { error } = await supabase.from('service_providers').update({
      kyc_status: 'submitted',
      kyc_submitted_at: new Date().toISOString()
    }).eq('id', myProfile.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Submitted for verification!");
      fetchProviders();
    }
  };

  const toggleOnline = async () => {
    if (!supabase || !myProfile) return;
    await supabase.from('service_providers').update({ is_online: !myProfile.is_online }).eq('id', myProfile.id);
    fetchProviders();
  };

  const toggleStatus = async (id: string, currentStatus: boolean, field: 'is_active' | 'is_online' = 'is_active') => {
    if (!supabase) return;
    await supabase.from('service_providers').update({ [field]: !currentStatus }).eq('id', id);
    fetchProviders();
  };

  const simulateLocation = async (id: string, lat: number, lng: number) => { 
    if (!supabase) return;
    const newLat = lat + (Math.random() - 0.5) * 0.01;
    const newLng = lng + (Math.random() - 0.5) * 0.01;
    await supabase.from('service_providers').update({
      current_lat: newLat,
      current_lng: newLng,
      is_online: true,
      last_location_updated_at: new Date().toISOString()
    }).eq('id', id);
    fetchProviders();
  };

  if (modeLoading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!serviceMode) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 w-full text-center">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">Provider Mode Not Set</h2>
        <p className="text-slate-500 mb-4">Please set your Provider Mode in Admin Settings first.</p>
      </div>
    );
  }

  const onlineRiders = providers.filter(p => p.is_active && p.is_online && p.provider_type.toLowerCase() === 'rider');

  return (
    <div className="flex-1 p-6 h-full overflow-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
            {serviceMode === 'individual' ? 'My Provider Profile' : 'Staff & Team Management'}
        </h1>
        {serviceMode === 'business' && (
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? 'Cancel' : 'Add Staff Member'}
          </Button>
        )}
      </div>

      {serviceMode === 'individual' && (
        <div className="space-y-6 max-w-4xl">
          <div className="p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Your individual-provider profile (Personal Info, Bank Details, Vehicle, Documents) is now managed from <strong>Admin Settings</strong>.
            </p>
            {myProfile && (
              <Button type="button" variant={myProfile.is_online ? 'default' : 'outline'} onClick={toggleOnline} className="mt-3">
                {myProfile.is_online ? 'Go Offline' : 'Go Online'}
              </Button>
            )}
          </div>
        </div>
      )}

      {serviceMode === 'business' && showAddForm && (
        <Card className="bg-slate-50 dark:bg-slate-900/50">
          <CardHeader>
            <CardTitle>Add New Staff Member</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="flex flex-col gap-4 max-w-xl">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <Input required value={fullName} onChange={e => setFullName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <Input required value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Provider Type</label>
                <select 
                  className="w-full flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={providerType} 
                  onChange={e => setProviderType(e.target.value)}
                >
                  {PROVIDER_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              
              {providerType === 'Other' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Custom Type</label>
                  <Input required value={customType} onChange={e => setCustomType(e.target.value)} />
                </div>
              )}
              {providerType.toLowerCase() === 'rider' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Vehicle Type (e.g. Bike, Scooty)</label>
                  <Input required value={vehicleType} onChange={e => setVehicleType(e.target.value)} />
                </div>
              )}
              <Button type="submit" disabled={submitting} className="w-fit">Save Staff Member</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {GOOGLE_MAPS_API_KEY && serviceMode === 'business' ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              {serviceMode === 'individual' ? 'My Live Location' : 'Rider Map (Live Locations)'}
            </CardTitle>
            {serviceMode === 'individual' && myProfile && (
              <Button variant="secondary" size="sm" onClick={() => simulateLocation(myProfile.id, mapCenter.lat, mapCenter.lng)}>
                Simulate Location (Test)
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full rounded-xl overflow-hidden border">
              <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
                <Map
                  defaultCenter={mapCenter}
                  defaultZoom={12}
                  mapId="RIDER_MAP_ID"
                >
                  {serviceMode === 'business' ? (
                    onlineRiders.map(rider => (
                      <AdvancedMarker 
                        key={rider.id}
                        position={{ lat: rider.current_lat!, lng: rider.current_lng! }}
                        title={rider.full_name}
                      >
                        <Pin background={rider.status === 'on-delivery' ? '#f59e0b' : '#10b981'} borderColor="#fff" glyphColor="#fff" />
                      </AdvancedMarker>
                    ))
                  ) : (
                     myProfile && myProfile.current_lat && myProfile.current_lng ? (
                       <AdvancedMarker 
                        key={myProfile.id}
                        position={{ lat: myProfile.current_lat, lng: myProfile.current_lng }}
                        title="Me"
                      >
                        <Pin background="#10b981" borderColor="#fff" glyphColor="#fff" />
                      </AdvancedMarker>
                     ) : null
                  )}
                </Map>
              </APIProvider>
            </div>
            <p className="text-xs text-slate-500 mt-2">Green = Available, Orange = On Delivery</p>
          </CardContent>
        </Card>
      ) : (
        !GOOGLE_MAPS_API_KEY && (
          <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg text-sm border border-yellow-200">
            Google Maps API Key not configured. Map view is disabled.
          </div>
        )
      )}

      {serviceMode === 'business' && (
        <Card>
          <CardHeader>
            <CardTitle>All Staff & Providers</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading...</p>
            ) : providers.length === 0 ? (
              <p className="text-slate-500 text-sm">No staff members found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b">
                    <tr>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Role</th>
                      <th className="px-4 py-3 font-medium">Phone</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {providers.map(p => (
                      <tr key={p.id} className={!p.is_active ? 'opacity-50' : ''}>
                        <td className="px-4 py-3 font-bold">{p.full_name}</td>
                        <td className="px-4 py-3">
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-xs font-bold border border-blue-100">
                            {p.provider_type}
                          </span>
                          {p.vehicle_type && <span className="ml-2 text-xs text-slate-500">{p.vehicle_type}</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{p.phone}</td>
                        <td className="px-4 py-3">
                          {p.is_active ? (
                            p.is_online ? (
                              <span className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Online</span>
                            ) : (
                              <span className="text-slate-500 text-xs font-bold">Offline</span>
                            )
                          ) : (
                            <span className="text-red-500 text-xs font-bold">Deactivated</span>
                          )}
                        </td>
                        <td className="px-4 py-3 flex gap-2 items-center">
                          <Button variant="outline" size="sm" onClick={() => toggleStatus(p.id, p.is_active, 'is_active')}>
                            {p.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                          {p.provider_type.toLowerCase() === 'rider' && p.is_active && (
                            <Button variant="secondary" size="sm" onClick={() => simulateLocation(p.id, mapCenter.lat, mapCenter.lng)}>
                              Simulate Location (Test)
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
