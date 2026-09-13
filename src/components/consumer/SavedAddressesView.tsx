import React, { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { toast } from 'sonner';
import { MapPin, Plus, Edit2, Trash2, Home, Briefcase, Star, Loader2, Navigation } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

interface SavedAddressesViewProps {
  tenantColor?: string;
  onSelectAddress?: (address: any) => void;
  isSelectionMode?: boolean;
}

export function SavedAddressesView({ tenantColor, onSelectAddress, isSelectionMode = false }: SavedAddressesViewProps) {
  const { user } = useAuth();
  const supabase = getSupabaseClient();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState('Home');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      if (!showForm) {
        fetchAddresses();
      }
    }
  }, [user, showForm]);

  const fetchAddresses = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('consumer_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setAddresses(data || []);
    } catch (error: any) {
      console.error('Error fetching addresses:', error);
      toast.error('Failed to load saved addresses');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setLabel('Home');
    setContactName(user?.user_metadata?.full_name || '');
    setContactPhone(user?.phone || '');
    setAddressLine('');
    setCity('');
    setState('');
    setPincode('');
    setIsDefault(addresses.length === 0);
  };

  const handleOpenNew = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (addr: any) => {
    setEditingId(addr.id);
    setLabel(addr.label);
    setContactName(addr.contact_name);
    setContactPhone(addr.contact_phone);
    setAddressLine(addr.address_line);
    setCity(addr.city);
    setState(addr.state);
    setPincode(addr.pincode);
    setIsDefault(addr.is_default);
    setLatitude(addr.latitude || null);
    setLongitude(addr.longitude || null);
    setShowForm(true);
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Delete this address?')) return;
    try {
      const { error } = await supabase.from('consumer_addresses').delete().eq('id', id);
      if (error) throw error;
      toast.success('Address deleted');
      fetchAddresses();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const handleSetDefault = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      // 1. Unset all defaults
      await supabase.from('consumer_addresses').update({ is_default: false }).eq('user_id', user!.id);
      // 2. Set this one
      const { error } = await supabase.from('consumer_addresses').update({ is_default: true }).eq('id', id);
      if (error) throw error;
      toast.success('Default address updated');
      fetchAddresses();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update default address');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    
    try {
      if (isDefault) {
        // Unset existing defaults first if we are setting a new default
        await supabase.from('consumer_addresses').update({ is_default: false }).eq('user_id', user.id);
      }

      const payload = {
        user_id: user.id,
        label,
        contact_name: contactName,
        contact_phone: contactPhone,
        address_line: addressLine,
        city,
        state,
        pincode,
        is_default: isDefault,
        latitude,
        longitude
      };

      if (editingId) {
        const { error } = await supabase.from('consumer_addresses').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Address updated');
      } else {
        const { error } = await supabase.from('consumer_addresses').insert([payload]);
        if (error) throw error;
        toast.success('Address saved');
      }
      
      setShowForm(false);
    } catch (error: any) {
      console.error('Error saving address:', error);
      toast.error(error.message || 'Failed to save address');
    } finally {
      setSaving(false);
    }
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      if (!(window as any).google) return;
      const geocoder = new (window as any).google.maps.Geocoder();
      const response = await geocoder.geocode({ location: { lat, lng } });
      if (response.results && response.results[0]) {
        const addressComponents = response.results[0].address_components;
        let pCity = '';
        let pState = '';
        let pPincode = '';
        for (const comp of addressComponents) {
          if (comp.types.includes('locality')) pCity = comp.long_name;
          if (comp.types.includes('administrative_area_level_1')) pState = comp.long_name;
          if (comp.types.includes('postal_code')) pPincode = comp.long_name;
        }
        
        // Don't overwrite contact name/phone
        setAddressLine(response.results[0].formatted_address);
        if (pCity) setCity(pCity);
        if (pState) setState(pState);
        if (pPincode) setPincode(pPincode);
      }
    } catch (err) {
      console.warn("Reverse geocoding failed", err);
    }
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      toast.info("Fetching your location...");
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLatitude(lat);
          setLongitude(lng);
          toast.success("Location found!");
          await reverseGeocode(lat, lng);
        },
        (err) => {
          console.error(err);
          toast.error("Failed to get location.");
        },
        { enableHighAccuracy: true }
      );
    }
  };

  if (showForm) {
    return (
      <div className="bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{editingId ? 'Edit Address' : 'Add New Address'}</h2>
          <button onClick={() => setShowForm(false)} className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
            Cancel
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Save As</label>
            <div className="flex gap-3">
              {['Home', 'Work', 'Other'].map(l => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLabel(l)}
                  className={`flex-1 py-2.5 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-colors
                    ${label === l ? 'border-transparent text-white shadow-md' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}
                  `}
                  style={label === l ? { backgroundColor: tenantColor || '#0f172a' } : {}}
                >
                  {l === 'Home' ? <Home size={16} /> : l === 'Work' ? <Briefcase size={16} /> : <MapPin size={16} />}
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Contact Name</label>
              <Input required value={contactName} onChange={(e) => setContactName(e.target.value)} className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Phone Number</label>
              <Input required value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800" />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Complete Address</label>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                className="text-xs font-bold flex items-center hover:underline"
                style={{ color: tenantColor || '#3b82f6' }}
              >
                <Navigation className="w-3 h-3 mr-1" /> Use current location
              </button>
            </div>
            <textarea
              required
              rows={3}
              value={addressLine}
              onChange={(e) => setAddressLine(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
              placeholder="House/Flat No., Building Name, Street, Landmark"
            />
          </div>
          
          <div className="w-full h-48 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 relative bg-slate-100 dark:bg-slate-900">
            <Map 
              defaultCenter={latitude && longitude ? { lat: latitude, lng: longitude } : { lat: 20.5937, lng: 78.9629 }} 
              defaultZoom={latitude && longitude ? 15 : 4} 
              mapId="CUSTOMER_ADDRESS_MAP"
              onClick={(e: any) => {
                if (e.detail.latLng) {
                  setLatitude(e.detail.latLng.lat);
                  setLongitude(e.detail.latLng.lng);
                  reverseGeocode(e.detail.latLng.lat, e.detail.latLng.lng);
                }
              }}
            >
              {latitude && longitude && (
                <AdvancedMarker 
                  position={{ lat: latitude, lng: longitude }}
                  draggable={true}
                  onDragEnd={(e: any) => {
                    if (e.latLng) {
                      const newLat = e.latLng.lat();
                      const newLng = e.latLng.lng();
                      setLatitude(newLat);
                      setLongitude(newLng);
                      reverseGeocode(newLat, newLng);
                    }
                  }}
                >
                  <Pin background="#3b82f6" borderColor="#1d4ed8" glyphColor="#fff" />
                </AdvancedMarker>
              )}
            </Map>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">City</label>
              <Input required value={city} onChange={(e) => setCity(e.target.value)} className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">State</label>
              <Input required value={state} onChange={(e) => setState(e.target.value)} className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Pincode</label>
            <Input required value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))} className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-w-[50%]" />
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
              />
              <span className="font-bold text-sm text-slate-700 dark:text-slate-300">Set as default delivery address</span>
            </label>
          </div>

          <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
            <Button 
              type="submit"
              disabled={saving}
              className="w-full h-12 text-base font-bold rounded-xl text-white"
              style={{ backgroundColor: tenantColor || '#0f172a' }}
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Save Address'}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  if (loading) {
    return <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="space-y-4">
      {addresses.length === 0 ? (
        <div className="bg-white dark:bg-slate-950 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg mb-1">No saved addresses</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Add an address to checkout faster</p>
          <Button onClick={handleOpenNew} style={{ backgroundColor: tenantColor || '#0f172a' }} className="rounded-full text-white font-bold px-6">
            <Plus className="w-4 h-4 mr-2" /> Add New Address
          </Button>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center px-1">
            <h2 className="font-bold text-slate-800 dark:text-slate-200 text-lg">{isSelectionMode ? 'Select Delivery Address' : 'Saved Addresses'}</h2>
            <button onClick={handleOpenNew} className="text-sm font-bold flex items-center gap-1 hover:underline" style={{ color: tenantColor || '#3b82f6' }}>
              <Plus className="w-4 h-4" /> Add New
            </button>
          </div>
          
          <div className="grid gap-4">
            {addresses.map((addr) => (
              <div 
                key={addr.id}
                onClick={() => isSelectionMode && onSelectAddress && onSelectAddress(addr)}
                className={`bg-white dark:bg-slate-950 p-5 rounded-2xl border ${isSelectionMode ? 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-700' : ''} shadow-sm transition-all ${addr.is_default && !isSelectionMode ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200 dark:border-slate-800'}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg text-slate-600 dark:text-slate-400">
                      {addr.label === 'Home' ? <Home size={16} /> : addr.label === 'Work' ? <Briefcase size={16} /> : <MapPin size={16} />}
                    </div>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{addr.label}</span>
                    {addr.is_default && (
                      <span className="text-[10px] uppercase tracking-wider font-bold bg-slate-800 text-white px-2 py-0.5 rounded-full ml-2">Default</span>
                    )}
                  </div>
                  {!isSelectionMode && (
                    <div className="flex gap-2">
                      <button onClick={(e) => { e.stopPropagation(); handleEdit(addr); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"><Edit2 size={16} /></button>
                      <button onClick={(e) => handleDelete(addr.id, e)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"><Trash2 size={16} /></button>
                    </div>
                  )}
                </div>
                
                <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  <p className="font-bold text-slate-800 dark:text-slate-200">{addr.contact_name} <span className="font-normal text-slate-500 dark:text-slate-400 mx-2">•</span> {addr.contact_phone}</p>
                  <p className="leading-relaxed">{addr.address_line}</p>
                  <p>{addr.city}, {addr.state} - {addr.pincode}</p>
                </div>
                
                {!isSelectionMode && !addr.is_default && (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button 
                      onClick={(e) => handleSetDefault(addr.id, e)}
                      className="text-sm font-bold flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                    >
                      <Star size={16} /> Set as Default
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
