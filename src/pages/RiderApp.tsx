import { UniversalMerchantWalletView } from './MerchantDashboard';
import { ProviderProfileForm } from '../components/services/ProviderProfileForm';
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSupabaseClient } from '../lib/supabase';
import { RiderLoginScreen } from './RiderLoginScreen';
import { useNavigate } from 'react-router-dom';
import { MapPin, Package, Clock, CheckCircle, User, Activity, Navigation, Compass, Phone, Wallet, Car, Lock } from 'lucide-react';
import { RiderJobsView } from '../components/services/RiderJobsView';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { APIProvider, Map, AdvancedMarker, Pin, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
            Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c; 
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const DirectionsComponent = ({ origin, destination, orderId, isHeadingToPickup }: { origin: any, destination: any, orderId?: string, isHeadingToPickup?: boolean }) => {
  const map = useMap();
  const routesLibrary = useMapsLibrary('routes');
  const [directionsService, setDirectionsService] = useState<any>();
  const [directionsRenderer, setDirectionsRenderer] = useState<any>();

  useEffect(() => {
    if (!routesLibrary || !map) return;
    setDirectionsService(new routesLibrary.DirectionsService());
    setDirectionsRenderer(new routesLibrary.DirectionsRenderer({ 
      map,
      suppressMarkers: false,
      polylineOptions: {
        strokeColor: '#3b82f6',
        strokeWeight: 5,
      }
    }));
  }, [routesLibrary, map]);

  useEffect(() => {
    if (!directionsService || !directionsRenderer || !origin || !destination) return;
    
    directionsService
      .route({
        origin: origin,
        destination: destination,
        travelMode: "DRIVING",
      })
      .then((response: any) => {
        directionsRenderer.setDirections(response);
      })
      .catch((e: any) => {
        console.error("Directions request failed", e);
      });
      
    return () => {
      // Don't set map to null here as it removes the renderer entirely on every re-render
    }
  }, [directionsService, directionsRenderer, origin, destination]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (directionsRenderer) directionsRenderer.setMap(null);
    }
  }, [directionsRenderer]);

  return null;
};

export function RiderApp() {
  const { user, currentTenantId, logout } = useAuth();
  const navigate = useNavigate();
  const supabase = getSupabaseClient();
  
  const [myProfile, setMyProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'deliveries' | 'wallet' | 'profile'>('home');
  const [loading, setLoading] = useState(true);
  
  // Realtime state
  const [incomingJob, setIncomingJob] = useState<any>(null);
  const [activeJobs, setActiveJobs] = useState<any[]>([]); // assigned or picked_up jobs
  const [rates, setRates] = useState<{base: number, perKm: number}>({ base: 15, perKm: 5 });

  // Profile forms
  const [documents, setDocuments] = useState<any[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (user && supabase) {
      const init = async () => {
        try {
          await supabase.rpc('claim_service_provider_profile');
        } catch (e) {
          console.warn('Profile claim skipped/failed', e);
        }
        fetchProfile();
        fetchActiveJobs();
        fetchRates();
      };
      init();
    } else if (!user) {
      setMyProfile(null);
      setActiveJobs([]);
      setIncomingJob(null);
      setLoading(false);
    }
  }, [user, supabase]);

  const fetchRates = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('platform_settings').select('*').in('setting_key', ['delivery_base_fee', 'delivery_per_km_rate']);
    if (data) {
       const base = parseFloat(data.find((d: any) => d.setting_key === 'delivery_base_fee')?.setting_value || '15');
       const perKm = parseFloat(data.find((d: any) => d.setting_key === 'delivery_per_km_rate')?.setting_value || '5');
       setRates({ base, perKm });
    }
  };

  const fetchProfile = async () => {
    if (!supabase || !user) return;
    const { data } = await supabase
      .from('service_providers')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
      
    if (data) {
      if (!data.provider_type) data.provider_type = 'Rider';
      setMyProfile(data);
      const { data: docData } = await supabase
        .from('service_provider_documents')
        .select('*')
        .eq('service_provider_id', data.id);
      if (docData) setDocuments(docData);
    }
    setLoading(false);
  };
  
  const fetchActiveJobs = async () => {
    if (!supabase || !user) return;
    // Get rider profile ID first if we don't have it
    let providerId = myProfile?.id;
    if (!providerId) {
       const { data } = await supabase
        .from('service_providers')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
       if (data) providerId = data.id;
    }
    
    if (!providerId) return;

    const { data: deliveryData } = await supabase
      .from('delivery_assignments')
      .select('*, orders(total, tenants(business_name))')
      .eq('service_provider_id', providerId)
      .in('status', ['assigned', 'picked_up'])
      .order('created_at', { ascending: true });

    const { data: rideData } = await supabase
      .from('ride_requests')
      .select('*')
      .eq('rider_id', providerId)
      .in('status', ['assigned', 'in_progress'])
      .order('created_at', { ascending: true });

    const taggedDeliveries = (deliveryData || []).map((d: any) => ({ ...d, job_type: 'delivery' }));
    const taggedRides = (rideData || []).map((r: any) => ({ ...r, job_type: 'ride' }));
    const merged = [...taggedDeliveries, ...taggedRides].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    setActiveJobs(merged);
  };

  // Realtime subscription for incoming jobs
  useEffect(() => {
    if (!supabase || !myProfile?.id || !myProfile?.is_online) return;
    
    // 1. Initial fetch for already available jobs
    const fetchInitialJob = async () => {
      const { data: deliveryData } = await supabase
        .from('delivery_assignments')
        .select('*, orders(total, tenants(business_name, business_phone))')
        .eq('status', 'unassigned')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      const { data: rideData } = await supabase
        .from('ride_requests')
        .select('*')
        .eq('status', 'requested')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      const taggedDelivery = deliveryData ? { ...deliveryData, job_type: 'delivery' } : null;
      const taggedRide = rideData ? { ...rideData, job_type: 'ride' } : null;

      let earliest: any = null;
      if (taggedDelivery && taggedRide) {
        earliest = new Date(taggedDelivery.created_at) <= new Date(taggedRide.created_at) ? taggedDelivery : taggedRide;
      } else {
        earliest = taggedDelivery || taggedRide;
      }

      if (earliest) {
        setIncomingJob((prev: any) => prev ? prev : earliest);
        setTimeout(() => {
          setIncomingJob((prev: any) => prev?.id === earliest.id ? null : prev);
        }, 30000);
      }
    };
    fetchInitialJob();

    const sub = supabase.channel('rider_incoming_jobs')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'delivery_assignments'
      }, async (payload: any) => {
        const isUnassignedBroadcast = payload.new.status === 'unassigned';
        const isDirectAssignToMe = payload.new.status === 'assigned' && payload.new.service_provider_id === myProfile?.id;
        if (isUnassignedBroadcast || isDirectAssignToMe) {
           // Fetch full details with joined orders
           const { data } = await supabase
             .from('delivery_assignments')
             .select('*, orders(total, tenants(business_name, business_phone))')
             .eq('id', payload.new.id)
             .single();
           if (data) {
             setIncomingJob((prev: any) => {
               if (prev && prev.id === data.id) return prev; // deduplicate
               return data;
             });
             // Auto-dismiss after 30 seconds
             setTimeout(() => {
               setIncomingJob((prev: any) => prev?.id === data.id ? null : prev);
             }, 30000);
           }
        }
      })
      .subscribe();

    const rideSub = supabase.channel('rider_incoming_rides')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ride_requests'
      }, async (payload: any) => {
        if (payload.new.status === 'requested') {
          const { data } = await supabase
            .from('ride_requests')
            .select('*')
            .eq('id', payload.new.id)
            .single();
          if (data) {
            const tagged = { ...data, job_type: 'ride' };
            setIncomingJob((prev: any) => {
              if (prev && prev.id === tagged.id) return prev;
              return tagged;
            });
            setTimeout(() => {
              setIncomingJob((prev: any) => prev?.id === tagged.id ? null : prev);
            }, 30000);
          }
        }
      })
      .subscribe();
      
    return () => { supabase.removeChannel(sub); supabase.removeChannel(rideSub); };
  }, [supabase, myProfile?.id, myProfile?.is_online]);
  
  // Also poll active job in case status changes externally, though they mostly drive it
  useEffect(() => {
     if (!supabase || !myProfile?.id) return;
     const sub = supabase.channel('my_active_job')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'delivery_assignments',
        filter: `service_provider_id=eq.${myProfile.id}`
      }, () => {
        fetchActiveJobs();
      })
      .subscribe();
      return () => { supabase.removeChannel(sub); };
  }, [supabase, myProfile?.id]);

  useEffect(() => {
     if (!supabase || !myProfile?.id) return;
     const sub = supabase.channel('my_active_ride')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'ride_requests',
        filter: `rider_id=eq.${myProfile.id}`
      }, () => {
        fetchActiveJobs();
      })
      .subscribe();
      return () => { supabase.removeChannel(sub); };
  }, [supabase, myProfile?.id]);

  const [showWorkModeModal, setShowWorkModeModal] = useState(false);

  const toggleOnline = async () => {
    if (!supabase || !myProfile) return;

    if (!myProfile.id) {
      alert("Please complete and save your profile first");
      setActiveTab('profile');
      return;
    }

    if (myProfile.is_online) {
      await supabase.from('service_providers').update({ 
        is_online: false,
        last_location_updated_at: new Date().toISOString()
      }).eq('id', myProfile.id);
      setMyProfile({ ...myProfile, is_online: false });
    } else {
      setShowWorkModeModal(true);
    }
  };

  const confirmGoOnline = (mode: 'move' | 'delivery' | 'both') => {
    setShowWorkModeModal(false);
    if (!supabase || !myProfile) return;

    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        await supabase.from('service_providers').update({ 
          is_online: true,
          online_work_mode: mode,
          current_lat: lat,
          current_lng: lng,
          last_location_updated_at: new Date().toISOString()
        }).eq('id', myProfile.id);
        setMyProfile({ ...myProfile, is_online: true, online_work_mode: mode, current_lat: lat, current_lng: lng });
      },
      (error) => {
        alert("Location access is required to go online and receive delivery jobs. Please enable location services in your browser.");
      },
      { enableHighAccuracy: true }
    );
  };
  
  // Real-time GPS Tracking
  useEffect(() => {
    if (!supabase || !myProfile?.id || !myProfile?.is_online || !navigator.geolocation) return;
    
    let watchId: number;
    let lastUpdateTime = 0;
    
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        // Throttle database updates to max once every 10 seconds
        if (now - lastUpdateTime > 10000) {
          lastUpdateTime = now;
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          supabase.from('service_providers').update({ 
            current_lat: lat,
            current_lng: lng,
            last_location_updated_at: new Date().toISOString()
          }).eq('id', myProfile.id).then(() => {
             setMyProfile((prev: any) => prev ? { ...prev, current_lat: lat, current_lng: lng } : prev);
          });
        }
      },
      (error) => {
        console.warn("Watch position error:", error);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );
    
    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [myProfile?.is_online, myProfile?.id, supabase]);
  
  const playIncomingJobAlert = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      [0, 300, 600].forEach((delay) => {
        setTimeout(() => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 880;
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          osc.start();
          osc.stop(ctx.currentTime + 0.15);
        }, delay);
      });
    } catch (e) { console.error('Audio alert failed', e); }
  };

  useEffect(() => {
    if (incomingJob && incomingJob.id) {
      playIncomingJobAlert();
    }
  }, [incomingJob?.id]);

  const acceptIncomingJob = async () => {
    if (!supabase || !myProfile || !incomingJob) return;

    if (incomingJob.job_type === 'ride') {
      const { error } = await supabase.rpc('accept_ride_request', { p_ride_id: incomingJob.id });
      if (error) {
        alert(error.message || "This ride was already accepted by another rider!");
      } else {
        fetchActiveJobs();
        setActiveTab('home');
      }
      setIncomingJob(null);
      return;
    }

    const { data, error } = await supabase
      .from('delivery_assignments')
      .update({
        service_provider_id: myProfile.id,
        status: 'assigned',
        assigned_at: new Date().toISOString()
      })
      .eq('id', incomingJob.id)
      .eq('status', 'unassigned')
      .select('*, orders(total, tenants(business_name))');
      
    if (error) {
      alert("Error accepting job");
      setIncomingJob(null);
      return;
    }
    
    if (data && data.length === 0) {
      alert("This job was just taken by another rider!");
    } else {
      fetchActiveJobs();
      setActiveTab('home');
    }
    setIncomingJob(null);
  };
  
  const updateJobStatus = async (job: any, newStatus: string) => {
    if (!supabase) return;

    // OTP-checkpoints: ride ke liye sirf 'in_progress' (pickup), 
    // delivery ke liye 'picked_up' (merchant-OTP) aur 'delivered' (customer-OTP)
    const needsOtp = newStatus === 'picked_up' || newStatus === 'delivered' || newStatus === 'in_progress';
    let otp: string | null = null;

    if (needsOtp) {
      const promptLabel = newStatus === 'picked_up' 
        ? 'Enter the 4-digit OTP from the merchant/shop:' 
        : newStatus === 'delivered' 
        ? 'Enter the 4-digit OTP from the customer:' 
        : 'Enter the 4-digit OTP from the passenger:';
      otp = window.prompt(promptLabel);
      if (!otp) return; // user cancelled
    }

    if (job.job_type === 'ride') {
      const { error } = await supabase.rpc('update_ride_status', {
        p_ride_id: job.id,
        p_new_status: newStatus,
        p_otp: otp
      });
      if (error) {
        alert(error.message);
        return;
      }
      fetchActiveJobs();
      if (newStatus === 'completed') {
        setTimeout(() => alert("Ride completed! Great job."), 100);
      }
      return;
    }

    const { error } = await supabase.rpc('mark_delivery_status', {
      p_assignment_id: job.id,
      p_new_status: newStatus,
      p_otp: otp
    });
    if (error) {
      alert(error.message);
      return;
    }
    
    fetchActiveJobs();
    if (newStatus === 'delivered') {
      // Give feedback
      setTimeout(() => alert("Delivery completed! Great job."), 100);
    }
  };

  

  if (!user) {
    return <RiderLoginScreen />;
  }

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;

  if (!myProfile || myProfile.provider_type?.toLowerCase() !== 'rider') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-500 mb-6">
            {!myProfile 
              ? "You are not registered as a service provider for this business." 
              : `This app is only for Riders. Your registered role is "${myProfile.provider_type}".`}
          </p>
          <Button onClick={logout} variant="outline" className="w-full">Log Out</Button>
        </div>
      </div>
    );
  }

  // Derive origin and destination for map
  const originLoc = myProfile.current_lat && myProfile.current_lng ? { lat: myProfile.current_lat, lng: myProfile.current_lng } : null;
  
  const focusJob = activeJobs[0] || null;
  const pendingJobs = activeJobs.slice(1);

  let routeDest = null;
  let mapTitle = "Live Map";
  
  let isHeadingToDrop = false;
  
  if (focusJob) {
    isHeadingToDrop = focusJob.job_type === 'ride' 
      ? focusJob.status === 'in_progress' 
      : focusJob.status === 'picked_up';

    if (!isHeadingToDrop && focusJob.status === 'assigned') {
      routeDest = focusJob.pickup_lat && focusJob.pickup_lng 
        ? { lat: Number(focusJob.pickup_lat), lng: Number(focusJob.pickup_lng) } 
        : focusJob.pickup_address;
      mapTitle = "Navigating to Pickup";
    } else if (isHeadingToDrop) {
      routeDest = focusJob.drop_lat && focusJob.drop_lng 
        ? { lat: Number(focusJob.drop_lat), lng: Number(focusJob.drop_lng) } 
        : focusJob.drop_address;
      mapTitle = "Navigating to Drop";
    }
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans">
      {/* Top Header */}
      <header className="bg-white px-4 py-3 flex items-center justify-between shadow-sm z-10 sticky top-0">
        <div className="flex items-center gap-2">
           <img src="/logolight.png" alt="BahiBox" className="h-6" />
           <span className="font-bold text-slate-800 text-lg">Partner</span>
        </div>
        <div className="flex items-center gap-4">
           {activeTab === 'home' && (
             <button 
               onClick={toggleOnline} 
               className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold shadow-sm transition-all ${
                 myProfile.is_online ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-200 text-slate-600 border border-slate-300'
               }`}
             >
               <div className={`w-2.5 h-2.5 rounded-full ${myProfile.is_online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></div>
               {myProfile.is_online ? 'ONLINE' : 'OFFLINE'}
             </button>
           )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-20 relative">
        
        {/* Full-screen Incoming Job Overlay */}
        {incomingJob && (
          <div className="absolute inset-0 z-50 bg-black/80 flex flex-col p-4 animate-in fade-in duration-300">
             <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 animate-bounce ${incomingJob.job_type === 'ride' ? 'bg-purple-500 shadow-[0_0_40px_rgba(168,85,247,0.6)]' : 'bg-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.6)]'}`}>
                   {incomingJob.job_type === 'ride' ? <Car size={48} className="text-white" /> : <Package size={48} className="text-white" />}
                </div>
                <h2 className="text-white text-3xl font-extrabold mb-2">
                  {incomingJob.job_type === 'ride' ? 'New Ride Request!' : 'New Delivery!'}
                </h2>
                {incomingJob.job_type === 'ride' ? (
                  <p className="text-emerald-300 text-xl font-medium mb-8">
                    You'll earn ~₹{Math.round((incomingJob.fare_amount || 0) - (incomingJob.commission_amount || 0))}
                  </p>
                ) : (() => {
                  let estimatedEarning = rates.base;
                  if (incomingJob.pickup_lat && incomingJob.pickup_lng && incomingJob.drop_lat && incomingJob.drop_lng) {
                     const dist = calculateDistance(incomingJob.pickup_lat, incomingJob.pickup_lng, incomingJob.drop_lat, incomingJob.drop_lng);
                     estimatedEarning += (dist * rates.perKm);
                  }
                  return <p className="text-emerald-300 text-xl font-medium mb-8">You'll earn ~₹{Math.round(estimatedEarning)}</p>;
                })()}
                
                <div className="bg-white w-full max-w-sm rounded-3xl p-6 text-left shadow-2xl space-y-4">
                   <div>
                     <div className="flex items-center justify-between mb-1">
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pickup</p>
                       {myProfile?.current_lat && myProfile?.current_lng && incomingJob.pickup_lat && incomingJob.pickup_lng && (
                         <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                           {calculateDistance(myProfile.current_lat, myProfile.current_lng, incomingJob.pickup_lat, incomingJob.pickup_lng).toFixed(1)} km away
                         </span>
                       )}
                     </div>
                     <p className="text-slate-900 font-bold text-lg leading-tight">
                       {incomingJob.job_type === 'ride' ? (incomingJob.payment_method === 'cash' ? 'Cash Payment' : 'Wallet Payment') : incomingJob.orders?.tenants?.business_name}
                     </p>
                     <p className="text-slate-600 text-sm mt-1">{incomingJob.pickup_address}</p>
                   </div>
                   <div className="border-t border-slate-100 pt-4">
                     <div className="flex items-center justify-between mb-1">
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Drop</p>
                       {incomingJob.pickup_lat && incomingJob.pickup_lng && incomingJob.drop_lat && incomingJob.drop_lng && (
                         <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                           {calculateDistance(incomingJob.pickup_lat, incomingJob.pickup_lng, incomingJob.drop_lat, incomingJob.drop_lng).toFixed(1)} km trip
                         </span>
                       )}
                     </div>
                     <p className="text-slate-900 font-bold leading-tight">{incomingJob.drop_address}</p>
                   </div>
                   {incomingJob.job_type === 'ride' && (
                     <div className="border-t border-slate-100 pt-4 flex flex-wrap gap-2">
                       <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-full capitalize">
                         {incomingJob.requested_vehicle_type || 'Bike'}
                       </span>
                       <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-full">
                         {incomingJob.passenger_count || 1} Passenger{(incomingJob.passenger_count || 1) > 1 ? 's' : ''}
                       </span>
                       {incomingJob.luggage_weight_kg && (
                         <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-full">
                           {incomingJob.luggage_weight_kg}kg Luggage{incomingJob.luggage_size ? ` (${incomingJob.luggage_size})` : ''}
                         </span>
                       )}
                     </div>
                   )}
                </div>
             </div>
             <div className="grid grid-cols-2 gap-4 pb-8 max-w-sm mx-auto w-full">
                <Button variant="outline" className="h-16 text-lg font-bold bg-transparent text-white border-white/30 hover:bg-white/10" onClick={() => setIncomingJob(null)}>Decline</Button>
                <Button className="h-16 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30" onClick={acceptIncomingJob}>Accept</Button>
             </div>
          </div>
        )}

        {/* HOME TAB */}
        {activeTab === 'home' && (
          <div className="h-full flex flex-col">
            {/* Map Area */}
            <div className="flex-1 relative bg-slate-200">
               {GOOGLE_MAPS_API_KEY ? (
                 <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
                   <Map
                     defaultCenter={originLoc || { lat: 28.6139, lng: 77.2090 }}
                     defaultZoom={14}
                     mapId="RIDER_APP_MAP_ID"
                     disableDefaultUI={true}
                   >
                     {originLoc && (
                       <AdvancedMarker position={originLoc} title="Me">
                         <div className="w-10 h-10 bg-blue-600 rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                           <Navigation className="text-white w-5 h-5 fill-current" />
                         </div>
                       </AdvancedMarker>
                     )}
                     
                     {/* Directions */}
                     {originLoc && routeDest && (
                       <DirectionsComponent origin={originLoc} destination={routeDest} orderId={focusJob.order_id} isHeadingToPickup={!isHeadingToDrop} />
                     )}
                   </Map>
                   <div className="absolute top-4 left-4 right-4 pointer-events-none">
                     <div className="bg-white/90 backdrop-blur shadow-sm rounded-full py-2 px-4 inline-flex items-center gap-2 pointer-events-auto">
                        <Compass className="text-blue-500 w-4 h-4" />
                        <span className="text-sm font-bold text-slate-700">{mapTitle}</span>
                     </div>
                   </div>
                 </APIProvider>
               ) : (
                 <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-100 p-8 text-center">
                   <Navigation size={48} className="mb-4 opacity-20" />
                   <p className="font-semibold">Map unavailable</p>
                   <p className="text-sm mt-1">Google Maps API key is not configured.</p>
                 </div>
               )}
            </div>
            
            {/* Active Job Bottom Sheet / Card */}
            {focusJob ? (
              <div className="bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-6 z-20">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      {focusJob.job_type === 'ride' ? (focusJob.payment_method === 'cash' ? 'Cash Ride' : 'Wallet Ride') : (focusJob.orders?.tenants?.business_name || 'Pickup Point')}
                    </h3>
                    <p className="text-sm font-semibold text-blue-600 mt-1">
                      ₹{focusJob.job_type === 'ride' ? (focusJob.fare_amount || 0) : (focusJob.orders?.total || 0)} {focusJob.job_type === 'ride' ? 'Fare' : 'Expected'}
                    </p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-full">
                    {focusJob.job_type === 'ride' ? <Car className="text-blue-600" /> : <Package className="text-blue-600" />}
                  </div>
                </div>
                
                <div className="space-y-4 mb-6 relative before:absolute before:left-2.5 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-200">
                  <div className="flex gap-4 relative z-10">
                    <div className="w-5 h-5 rounded-full border-4 border-emerald-500 bg-white flex-shrink-0 mt-0.5"></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-400 uppercase">Pickup Location</p>
                        {myProfile?.current_lat && myProfile?.current_lng && focusJob.pickup_lat && focusJob.pickup_lng && (
                          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                            {calculateDistance(myProfile.current_lat, myProfile.current_lng, focusJob.pickup_lat, focusJob.pickup_lng).toFixed(1)} km away
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-slate-800 mt-0.5">{focusJob.pickup_address}</p>
                    </div>
                  </div>
                  <div className="flex gap-4 relative z-10">
                    <div className="w-5 h-5 rounded-full border-4 border-red-500 bg-white flex-shrink-0 mt-0.5"></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-400 uppercase">Drop Location</p>
                        {focusJob.pickup_lat && focusJob.pickup_lng && focusJob.drop_lat && focusJob.drop_lng && (
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            {calculateDistance(focusJob.pickup_lat, focusJob.pickup_lng, focusJob.drop_lat, focusJob.drop_lng).toFixed(1)} km trip
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-slate-800 mt-0.5">{focusJob.drop_address}</p>
                    </div>
                  </div>
                </div>
                
                {focusJob.job_type === 'delivery' && focusJob.status === 'assigned' && (
                  <Button className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-lg" onClick={() => updateJobStatus(focusJob, 'picked_up')}>
                    Mark as Picked Up
                  </Button>
                )}
                {focusJob.job_type === 'delivery' && focusJob.status === 'picked_up' && (
                  <Button className="w-full h-14 text-lg font-bold bg-emerald-600 hover:bg-emerald-700 rounded-2xl shadow-lg" onClick={() => updateJobStatus(focusJob, 'delivered')}>
                    Mark as Delivered
                  </Button>
                )}
                {focusJob.job_type === 'ride' && focusJob.status === 'assigned' && (
                  <Button className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-lg" onClick={() => updateJobStatus(focusJob, 'in_progress')}>
                    Start Ride
                  </Button>
                )}
                {focusJob.job_type === 'ride' && focusJob.status === 'in_progress' && (
                  <Button className="w-full h-14 text-lg font-bold bg-emerald-600 hover:bg-emerald-700 rounded-2xl shadow-lg" onClick={() => updateJobStatus(focusJob, 'completed')}>
                    Complete Ride
                  </Button>
                )}
                
                {pendingJobs.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-3">
                    <p className="text-sm font-bold text-slate-500">Queue ({pendingJobs.length})</p>
                    {pendingJobs.map((pjob: any) => (
                      <div key={pjob.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="font-semibold text-slate-700 truncate">
                          {pjob.job_type === 'ride' ? 'Ride' : (pjob.orders?.tenants?.business_name || 'Pickup Point')}
                        </span>
                        <span className="text-xs font-bold px-2 py-1 bg-slate-200 text-slate-500 rounded-lg whitespace-nowrap">Waiting</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white p-6 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] text-center relative z-20">
                <h3 className="text-lg font-bold text-slate-800">
                  {myProfile.is_online ? "Looking for jobs..." : "You're Offline"}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {myProfile.is_online ? "Stay on this screen. New deliveries will appear as full-screen alerts." : "Go online to start receiving delivery requests."}
                </p>
                {!myProfile.is_online && (
                  <Button className="w-full mt-4 h-12 rounded-xl bg-blue-600 hover:bg-blue-700" onClick={toggleOnline}>Go Online Now</Button>
                )}

                {showWorkModeModal && (
                  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4">
                      <h3 className="text-lg font-bold text-slate-900 text-center">What kind of jobs do you want?</h3>
                      <div className="space-y-2">
                        <Button className="w-full h-12" onClick={() => confirmGoOnline('move')}>Move (Rides)</Button>
                        <Button className="w-full h-12" variant="outline" onClick={() => confirmGoOnline('delivery')}>Delivery (Parcels)</Button>
                        <Button className="w-full h-12" variant="ghost" onClick={() => confirmGoOnline('both')}>Both</Button>
                      </div>
                      <button className="w-full text-center text-sm text-slate-400" onClick={() => setShowWorkModeModal(false)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* DELIVERIES TAB */}
        {activeTab === 'deliveries' && (
          <div className="p-4 max-w-2xl mx-auto">
            <RiderJobsView riderId={myProfile.id} />
          </div>
        )}

                {/* WALLET TAB */}
        {activeTab === 'wallet' && (
          <div className="p-4 max-w-2xl mx-auto space-y-6">
            <UniversalMerchantWalletView />
          </div>
        )}
        
        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="p-4 max-w-2xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
               <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-xl uppercase">
                     {myProfile.full_name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">{myProfile.full_name}</h2>
                    <p className="text-sm text-slate-500">{myProfile.phone}</p>
                  </div>
               </div>
               <Button variant="outline" size="sm" onClick={() => logout()}>Logout</Button>
            </div>
            
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center">
              <Button variant="ghost" onClick={() => navigate('/merchant-dashboard')} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 w-full font-semibold">
                Switch to Business View
              </Button>
              <p className="text-xs text-slate-400 mt-2">Only visible if you have other business roles</p>
            </div>

            
          <ProviderProfileForm 
            profile={myProfile} 
            setProfile={setMyProfile}
            user={user}
            currentTenantId={myProfile?.tenant_id || ''}
            onProfileSaved={fetchProfile}
          />
          </div>
        )}

      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-slate-100 flex justify-around items-center h-20 pb-safe fixed bottom-0 w-full z-10 shadow-[0_-5px_10px_rgba(0,0,0,0.02)] px-2">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center justify-center w-20 h-14 rounded-2xl transition-colors ${activeTab === 'home' ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Activity size={24} className={activeTab === 'home' ? 'mb-1' : 'mb-1'} />
          <span className="text-[10px] font-bold">Home</span>
        </button>
        <button 
          onClick={() => setActiveTab('deliveries')}
          className={`flex flex-col items-center justify-center w-20 h-14 rounded-2xl transition-colors ${activeTab === 'deliveries' ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Package size={24} className="mb-1" />
          <span className="text-[10px] font-bold">Jobs</span>
        </button>
        <button 
          onClick={() => setActiveTab('wallet')}
          className={`flex flex-col items-center justify-center w-20 h-14 rounded-2xl transition-colors ${activeTab === 'wallet' ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Wallet size={24} className="mb-1" />
          <span className="text-[10px] font-bold">Wallet</span>
        </button>
        <button 
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center justify-center w-20 h-14 rounded-2xl transition-colors ${activeTab === 'profile' ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <User size={24} className="mb-1" />
          <span className="text-[10px] font-bold">Profile</span>
        </button>
      </nav>
    </div>
  );
}
