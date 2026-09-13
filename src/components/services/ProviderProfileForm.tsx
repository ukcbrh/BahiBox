import React, { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/src/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Input } from '@/src/components/ui/input';
import { Button } from '@/src/components/ui/button';
import { toast } from 'sonner';
import { FileText, CheckCircle, Upload } from 'lucide-react';


const PROVIDER_TYPES = ['Rider', 'Cleaner', 'Cook', 'Plumber', 'Electrician', 'Other'];

export function ProviderProfileForm({ 
  profile, 
  setProfile, 
  user,
  currentTenantId,
  onProfileSaved,
  toggleOnline 
}: { 
  profile: any, 
  setProfile: (p: any) => void, 
  user: any,
  currentTenantId: string,
  onProfileSaved: () => void,
  toggleOnline?: () => void 
}) {
  const [savingProfile, setSavingProfile] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (profile?.id) {
      fetchDocuments(profile.id);
    }
  }, [profile?.id]);

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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !currentTenantId || !profile) return;
    
    setSavingProfile(true);
    const updateData = {
      full_name: profile.full_name,
      phone: profile.phone,
      provider_type: profile.provider_type || 'Rider', // FIX: ensure fallback on save
      vehicle_category: profile.vehicle_category,
      vehicle_type: profile.vehicle_type,
      vehicle_model: profile.vehicle_model,
      vehicle_number: profile.vehicle_number,
      bank_account_number: profile.bank_account_number,
      bank_ifsc: profile.bank_ifsc,
      bank_account_holder_name: profile.bank_account_holder_name,
      aadhaar_number: profile.aadhaar_number,
      pan_number: profile.pan_number,
      driving_license_number: profile.driving_license_number
    };

    let error;
    if (profile?.id) {
       const res = await supabase.from('service_providers').update(updateData).eq('id', profile.id);
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
       onProfileSaved();
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
    if (!e.target.files || !e.target.files[0] || !profile?.id || !supabase || !user) return;
    const file = e.target.files[0];
    
    setUploadingDoc(docType);
    try {
      const fileName = `${user.id}/${docType}-${Date.now()}`;
      const { error: uploadError } = await supabase.storage
        .from('provider-documents')
        .upload(fileName, file);
      if (uploadError) throw uploadError;

      const docUrl = fileName;
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
          service_provider_id: profile.id,
          document_type: docType,
          document_url: docUrl,
          status: 'pending'
        });
        dbError = res.error;
      }

      if (dbError) throw dbError;
      toast.success(`${docType.replace('_', ' ')} uploaded!`);
      fetchDocuments(profile.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to upload document");
    } finally {
      setUploadingDoc(null);
    }
  };

  const submitKyc = async () => {
    if (!supabase || !profile) return;
    
    const requiredDocs = ['aadhaar_card', 'pan_card', 'driving_license', 'rc', 'insurance', 'pollution_cert'];
    const hasAll = requiredDocs.every(t => documents.some(d => d.document_type === t && d.document_url));

    if (!hasAll) {
      toast.error("Please upload all required documents first.");
      return;
    }

    const { error } = await supabase.from('service_providers').update({
      kyc_status: 'submitted',
      kyc_submitted_at: new Date().toISOString()
    }).eq('id', profile.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Submitted for verification!");
      onProfileSaved();
    }
  };

  return (
    <div className="space-y-6">
      {profile?.kyc_status && (
        <div className={`p-4 rounded-xl border ${
            profile.kyc_status === 'verified' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 
            profile.kyc_status === 'rejected' ? 'bg-red-50 text-red-800 border-red-200' :
            profile.kyc_status === 'submitted' ? 'bg-blue-50 text-blue-800 border-blue-200' :
            'bg-amber-50 text-amber-800 border-amber-200'
        }`}>
          <h3 className="font-bold flex items-center gap-2">
            {profile.kyc_status === 'verified' ? <CheckCircle className="w-5 h-5"/> : <FileText className="w-5 h-5"/>}
            KYC Status: {profile.kyc_status.toUpperCase()}
          </h3>
          <p className="text-sm mt-1">
            {profile.kyc_status === 'verified' && "Verification Verified ✓"}
            {profile.kyc_status === 'rejected' && `Action Needed: ${profile.kyc_rejection_reason || 'See rejected documents below'}`}
            {profile.kyc_status === 'submitted' && "Verification Pending Review"}
            {profile.kyc_status === 'pending' && "KYC Incomplete - Please upload documents and submit for verification"}
          </p>
        </div>
      )}

      <form onSubmit={handleSaveProfile} className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Personal Info</CardTitle>
            {profile && toggleOnline && (
              <Button type="button" variant={profile.is_online ? 'default' : 'outline'} onClick={toggleOnline}>
                {profile.is_online ? 'Go Offline' : 'Go Online'}
              </Button>
            )}
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <Input value={profile?.full_name || ''} onChange={e => setProfile({...profile, full_name: e.target.value})} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <Input 
                value={profile?.phone || ''} 
                onChange={e => setProfile({...profile, phone: e.target.value})} 
                placeholder="Enter your mobile number"
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bank Details</CardTitle>
            <p className="text-sm text-slate-500">Required to receive payouts.</p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Account Holder Name</label>
              <Input value={profile?.bank_account_holder_name || ''} onChange={e => setProfile({...profile, bank_account_holder_name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Account Number</label>
              <Input value={profile?.bank_account_number || ''} onChange={e => setProfile({...profile, bank_account_number: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">IFSC Code</label>
              <Input value={profile?.bank_ifsc || ''} onChange={e => setProfile({...profile, bank_ifsc: e.target.value})} />
            </div>
          </CardContent>
        </Card>

        {profile?.provider_type?.toLowerCase() === 'rider' && (
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select 
                  className="w-full flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={profile?.vehicle_category || ''} 
                  onChange={e => setProfile({...profile, vehicle_category: e.target.value})}
                >
                  <option value="">Select Category</option>
                  <option value="Two Wheeler">Two Wheeler</option>
                  <option value="Three Wheeler">Three Wheeler</option>
                  <option value="Four Wheeler">Four Wheeler</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Vehicle Type</label>
                <Input placeholder="e.g. Scooter, Motorcycle" value={profile?.vehicle_type || ''} onChange={e => setProfile({...profile, vehicle_type: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Model Name</label>
                <Input placeholder="e.g. Honda Activa" value={profile?.vehicle_model || ''} onChange={e => setProfile({...profile, vehicle_model: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Vehicle Number</label>
                <Input placeholder="e.g. DL 1S AB 1234" value={profile?.vehicle_number || ''} onChange={e => setProfile({...profile, vehicle_number: e.target.value})} />
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Identity Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Aadhaar Number</label>
              <Input placeholder="12-digit Aadhaar number" maxLength={12} value={profile?.aadhaar_number || ''} onChange={e => setProfile({...profile, aadhaar_number: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">PAN Number</label>
              <Input placeholder="e.g. ABCDE1234F" value={profile?.pan_number || ''} onChange={e => setProfile({...profile, pan_number: e.target.value.toUpperCase()})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Driving License Number</label>
              <Input placeholder="Commercial driving license number" value={profile?.driving_license_number || ''} onChange={e => setProfile({...profile, driving_license_number: e.target.value})} />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={savingProfile}>
          {savingProfile ? 'Saving...' : 'Save Profile'}
        </Button>
      </form>

      {profile?.id && profile?.provider_type?.toLowerCase() === 'rider' && (
        <Card>
          <CardHeader>
            <CardTitle>Documents & KYC</CardTitle>
            <p className="text-sm text-slate-500">Upload required documents for verification.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {['aadhaar_card', 'pan_card', 'driving_license', 'rc', 'insurance', 'pollution_cert'].map(docType => {
              const existingDoc = documents.find(d => d.document_type === docType);
              const isUploading = uploadingDoc === docType;
              
              return (
                <div key={docType} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg bg-slate-50">
                  <div className="mb-3 sm:mb-0">
                    <h4 className="font-semibold capitalize">{docType.replace('_', ' ')}</h4>
                    {existingDoc ? (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        existingDoc.status === 'verified' ? 'bg-emerald-100 text-emerald-800' :
                        existingDoc.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {existingDoc.status.toUpperCase()}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">Not uploaded</span>
                    )}
                    {existingDoc?.rejection_reason && (
                       <p className="text-xs text-red-600 mt-1">{existingDoc.rejection_reason}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {existingDoc && (
                      <Button variant="outline" size="sm" onClick={() => viewDocument(existingDoc.document_url)}>
                        View
                      </Button>
                    )}
                    <div className="relative">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        disabled={isUploading || existingDoc?.status === 'verified'}
                        className="w-32"
                      >
                        {isUploading ? 'Uploading...' : existingDoc ? 'Replace' : 'Upload'}
                      </Button>
                      <input 
                        type="file" 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileUpload(e, docType)}
                        disabled={isUploading || existingDoc?.status === 'verified'}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            
            <div className="pt-4 border-t border-slate-200 mt-6">
              <Button 
                onClick={submitKyc} 
                className="w-full sm:w-auto"
                disabled={profile.kyc_status === 'submitted' || profile.kyc_status === 'verified'}
              >
                Submit for Verification
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
