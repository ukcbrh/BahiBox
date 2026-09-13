import React, { useState, useEffect, useRef } from 'react';
import { getSupabaseClient } from '@/src/lib/supabase';
import { Map, AdvancedMarker, Pin, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Bike, MapPin, ArrowLeft, CheckCircle, Car, Star, Check, Minus, Plus } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent } from '@/src/components/ui/card';
import { Input } from '@/src/components/ui/input';
import { LiveTrackingMap } from './LiveTrackingMap';
import { RideHistoryView } from './RideHistoryView';

const GOOGLE_MAP_ID = import.meta.env.VITE_GOOGLE_MAP_ID || '';

const VEHICLE_ICON_SRC: Record<string, string> = {
  bike: '/vehicles/bike.png',
  auto: '/vehicles/auto.png',
  car: '/vehicles/car.png',
};

export function MoveView({ user, walletBalance, tenant }: { user: any, walletBalance: number | null, tenant?: any }) {
  const [moveView, setMoveView] = useState<'home'|'booking'|'finding'|'tracking'|'completed'|'history'>('home');
  const [currentRideId, setCurrentRideId] = useState<string | null>(null);
  const [localWalletBalance, setLocalWalletBalance] = useState<number | null>(walletBalance);
  
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (walletBalance !== null) {
      setLocalWalletBalance(walletBalance);
      return;
    }
    if (!user || !supabase) return;
    const fetchWallet = async () => {
      const { data } = await supabase.rpc('get_or_create_platform_wallet', { p_user_id: user.id });
      if (data) {
        const { data: wData } = await supabase.from('wallet_accounts').select('current_balance').eq('id', data).single();
        if (wData) setLocalWalletBalance(wData.current_balance);
      }
    };
    fetchWallet();
  }, [user, walletBalance, supabase]);

  useEffect(() => {
    let isMounted = true;
    const checkActiveRide = async () => {
      if (!supabase || !user) return;
      const { data } = await supabase
        .from('ride_requests')
        .select('*')
        .eq('consumer_id', user.id)
        .in('status', ['requested', 'assigned', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && isMounted) {
        setCurrentRideId(data.id);
        if (data.status === 'requested') {
          setMoveView('finding');
        } else {
          setMoveView('tracking');
        }
      }
    };
    checkActiveRide();
    return () => { isMounted = false; };
  }, [supabase, user]);

  if (moveView === 'history') {
    return <RideHistoryView onBack={() => setMoveView('home')} user={user} />;
  }

  return (
    <div className="w-full h-[calc(100vh-140px)] min-h-[500px] flex flex-col relative bg-slate-50 dark:bg-slate-950 rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800">
      {moveView === 'home' && <MoveHomeView user={user} onBook={() => setMoveView('booking')} onHistory={() => setMoveView('history')} />}
      {moveView === 'booking' && <MoveBookingView user={user} walletBalance={localWalletBalance} onBack={() => setMoveView('home')} onBooked={(rideId) => { setCurrentRideId(rideId); setMoveView('finding'); }} />}
      {moveView === 'finding' && <MoveFindingView rideId={currentRideId} onBack={() => { setMoveView('home'); setCurrentRideId(null); }} onAssigned={() => setMoveView('tracking')} />}
      {moveView === 'tracking' && <MoveTrackingView rideId={currentRideId} onCompleted={() => setMoveView('completed')} onCancelled={() => { setMoveView('home'); setCurrentRideId(null); }} />}
      {moveView === 'completed' && <MoveCompletedView rideId={currentRideId} onDone={() => { setMoveView('home'); setCurrentRideId(null); }} />}
    </div>
  );
}

function MoveHomeView({ user, onBook, onHistory }: { user: any, onBook: () => void, onHistory: () => void }) {
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [riders, setRiders] = useState<any[]>([]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn(err)
      );
    }
  }, []);

  useEffect(() => {
    let interval: any;
    const fetchRiders = async () => {
      if (!location) return;
      const supabase = getSupabaseClient();

      if (!supabase) return;
      const { data } = await supabase.rpc('get_nearby_online_riders', {
        p_lat: location.lat,
        p_lng: location.lng,
        p_radius_km: 5
      });
      if (data) setRiders(data);
    };

    if (location) {
      fetchRiders();
      interval = setInterval(fetchRiders, 15000);
    }
    return () => clearInterval(interval);
  }, [location]);

  return (
    <div className="flex-1 relative flex flex-col h-full">
      <div className="absolute top-4 right-4 z-10 bg-white dark:bg-slate-900 rounded-full shadow-md px-4 py-2 cursor-pointer font-bold text-sm text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800" onClick={onHistory}>
        My Rides
      </div>
      <div className="flex-1">
        {location ? (
          <Map defaultCenter={location} defaultZoom={14} disableDefaultUI={true} mapId={GOOGLE_MAP_ID}>
            <AdvancedMarker position={location}>
              <div className="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg animate-pulse" />
            </AdvancedMarker>
            {riders.map(r => {
              const vt = (r.vehicle_type || '').toLowerCase();
              return (
                <AdvancedMarker key={r.id} position={{ lat: r.current_lat, lng: r.current_lng }}>
                  <div className="bg-white dark:bg-slate-800 p-1.5 rounded-full shadow-md border border-slate-200 dark:border-slate-700">
                    <img src={VEHICLE_ICON_SRC[vt] || VEHICLE_ICON_SRC.bike} alt="" className="w-6 h-6 object-contain" />
                  </div>
                </AdvancedMarker>
              );
            })}
          </Map>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-500 font-medium">
            Locating you...
          </div>
        )}
      </div>
      <div className="p-4 bg-white dark:bg-slate-950 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-10 border-t border-slate-100 dark:border-slate-800">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">Where to?</h2>
        <Button className="w-full h-14 text-lg font-bold rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white" onClick={onBook}>
          Book a Ride
        </Button>
      </div>
    </div>
  );
}

function MoveBookingView({ user, walletBalance, onBack, onBooked }: { user: any, walletBalance: number|null, onBack: () => void, onBooked: (id: string) => void }) {
  const [pickupAddr, setPickupAddr] = useState('');
  const [pickupLat, setPickupLat] = useState<number|null>(null);
  const [pickupLng, setPickupLng] = useState<number|null>(null);
  
  const [dropAddr, setDropAddr] = useState('');
  const [dropLat, setDropLat] = useState<number|null>(null);
  const [dropLng, setDropLng] = useState<number|null>(null);
  
  const [showMapPin, setShowMapPin] = useState<'pickup' | 'drop' | null>(null);
  const [estimates, setEstimates] = useState<{ bike: any, auto: any, car: any }>({ bike: null, auto: null, car: null });
  const [selectedVehicleType, setSelectedVehicleType] = useState<'bike' | 'auto' | 'car'>('bike');
  const [passengerCount, setPassengerCount] = useState(1);
  const [luggageWeight, setLuggageWeight] = useState('');
  const [luggageSize, setLuggageSize] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'wallet'>('cash');
  const [placing, setPlacing] = useState(false);
  
  const placesLib = useMapsLibrary('places');
  const pickupRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLInputElement>(null);

  const MAX_PASSENGERS: Record<string, number> = { bike: 1, auto: 3, car: 4 };
  const currentEstimate = estimates[selectedVehicleType];

  useEffect(() => {
    if (navigator.geolocation && !pickupLat) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPickupLat(lat);
        setPickupLng(lng);
        if ((window as any).google) {
          const geocoder = new (window as any).google.maps.Geocoder();
          try {
            const resp = await geocoder.geocode({ location: { lat, lng } });
            if (resp.results?.[0]) setPickupAddr(resp.results[0].formatted_address);
          } catch(e) {}
        }
      });
    }
  }, []);

  useEffect(() => {
    if (!placesLib || !pickupRef.current) return;
    const ac = new placesLib.Autocomplete(pickupRef.current, { fields: ['formatted_address', 'geometry'] });
    const listener = ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      if (place.geometry?.location) {
        setPickupAddr(place.formatted_address || '');
        setPickupLat(place.geometry.location.lat());
        setPickupLng(place.geometry.location.lng());
      }
    });
    return () => { (window as any).google.maps.event.removeListener(listener); };
  }, [placesLib]);

  useEffect(() => {
    if (!placesLib || !dropRef.current) return;
    const ac = new placesLib.Autocomplete(dropRef.current, { fields: ['formatted_address', 'geometry'] });
    const listener = ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      if (place.geometry?.location) {
        setDropAddr(place.formatted_address || '');
        setDropLat(place.geometry.location.lat());
        setDropLng(place.geometry.location.lng());
      }
    });
    return () => { (window as any).google.maps.event.removeListener(listener); };
  }, [placesLib]);

  useEffect(() => {
    if (pickupLat && pickupLng && dropLat && dropLng) {
      const getEstimates = async () => {
        const supabase = getSupabaseClient();
        if (!supabase) return;
        const types: Array<'bike'|'auto'|'car'> = ['bike', 'auto', 'car'];
        const results = await Promise.all(types.map(t =>
          supabase.rpc('estimate_ride_fare', {
            p_pickup_lat: pickupLat, p_pickup_lng: pickupLng,
            p_drop_lat: dropLat, p_drop_lng: dropLng,
            p_vehicle_type: t
          })
        ));
        const newEstimates: any = { bike: null, auto: null, car: null };
        types.forEach((t, i) => {
          const { data } = results[i];
          if (data && data.length > 0) newEstimates[t] = data[0];
        });
        setEstimates(newEstimates);
      };
      getEstimates();
    }
  }, [pickupLat, pickupLng, dropLat, dropLng]);

  useEffect(() => {
    const max = MAX_PASSENGERS[selectedVehicleType] || 4;
    setPassengerCount(prev => Math.min(prev, max));
  }, [selectedVehicleType]);

  const handleBook = async () => {
    if (!pickupLat || !dropLat || !currentEstimate) return;
    setPlacing(true);
    try {
      const supabase = getSupabaseClient();
      if(!supabase) throw new Error("Client not found");
      const { data, error } = await supabase.rpc('request_ride', {
        p_pickup_address: pickupAddr, p_pickup_lat: pickupLat, p_pickup_lng: pickupLng,
        p_drop_address: dropAddr, p_drop_lat: dropLat, p_drop_lng: dropLng,
        p_payment_method: paymentMethod,
        p_vehicle_type: selectedVehicleType,
        p_passenger_count: passengerCount,
        p_luggage_weight_kg: luggageWeight ? Number(luggageWeight) : null,
        p_luggage_size: luggageSize || null
      });
      if (error) throw new Error(error.message);
      if (data) {
        const rideId = Array.isArray(data) ? data[0].id : (data.id || data);
        onBooked(rideId);
      }
    } catch(err: any) {
      alert(err.message || "Failed to book ride");
    } finally {
      setPlacing(false);
    }
  };

  if (showMapPin) {
    const isPickup = showMapPin === 'pickup';
    const initLat = (isPickup ? pickupLat : dropLat) || pickupLat || 0;
    const initLng = (isPickup ? pickupLng : dropLng) || pickupLng || 0;
    
    return (
      <div className="flex-1 flex flex-col h-full relative">
        <div className="absolute top-4 left-4 z-10 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-full p-2 shadow cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => setShowMapPin(null)}>
          <ArrowLeft size={20} />
        </div>
        <div className="absolute top-4 right-4 left-16 z-10 bg-white dark:bg-slate-900 rounded-xl p-3 shadow text-sm font-medium text-slate-800 dark:text-slate-200 truncate border border-slate-200 dark:border-slate-800">
          {isPickup ? pickupAddr || "Drag map to select pickup" : dropAddr || "Drag map to select drop"}
        </div>
        <div className="flex-1">
          <Map 
            defaultCenter={{ lat: initLat, lng: initLng }} 
            defaultZoom={15} 
            disableDefaultUI={true}
            mapId={GOOGLE_MAP_ID}
          >
             <AdvancedMarker 
                position={{ lat: initLat, lng: initLng }}
                draggable={true}
                onDragEnd={(e: any) => {
                  if (e.latLng) {
                     const nLat = e.latLng.lat();
                     const nLng = e.latLng.lng();
                     if (isPickup) { setPickupLat(nLat); setPickupLng(nLng); }
                     else { setDropLat(nLat); setDropLng(nLng); }
                     
                     if ((window as any).google) {
                       const geocoder = new (window as any).google.maps.Geocoder();
                       geocoder.geocode({ location: { lat: nLat, lng: nLng } }).then((resp: any) => {
                         if (resp.results?.[0]) {
                           const addr = resp.results[0].formatted_address;
                           if (isPickup) setPickupAddr(addr);
                           else setDropAddr(addr);
                         }
                       }).catch(()=>{});
                     }
                  }
                }}
             >
                <Pin background={isPickup ? "#10b981" : "#ef4444"} glyphColor={"#fff"} borderColor={"#fff"} />
             </AdvancedMarker>
          </Map>
        </div>
        <div className="p-4 bg-white dark:bg-slate-950 z-10 border-t border-slate-200 dark:border-slate-800">
          <Button className="w-full h-12 rounded-xl font-bold bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900" onClick={() => setShowMapPin(null)}>
            Confirm Location
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 space-y-6 max-w-lg mx-auto w-full h-full overflow-y-auto">
      <div className="flex items-center gap-4">
        <Button onClick={onBack} variant="outline" className="h-8 w-8 p-0 rounded-full border-slate-200 dark:border-slate-800">
          <ArrowLeft size={16} />
        </Button>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Plan your ride</h2>
      </div>

      <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex gap-3">
          <div className="w-4 h-4 rounded-full border-4 border-emerald-500 bg-white dark:bg-slate-950 flex-shrink-0 mt-3" />
          <div className="flex-1 space-y-1">
             <label className="text-xs font-bold text-slate-400 uppercase">Pickup Location</label>
             <div className="flex gap-2">
               <Input ref={pickupRef} value={pickupAddr} onChange={e => setPickupAddr(e.target.value)} placeholder="Search pickup location" className="flex-1 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800" />
               <Button variant="outline" size="icon" className="border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400" onClick={() => setShowMapPin('pickup')}><MapPin size={16}/></Button>
             </div>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="w-4 h-4 rounded-full border-4 border-red-500 bg-white dark:bg-slate-950 flex-shrink-0 mt-3" />
          <div className="flex-1 space-y-1">
             <label className="text-xs font-bold text-slate-400 uppercase">Drop Location</label>
             <div className="flex gap-2">
               <Input ref={dropRef} value={dropAddr} onChange={e => setDropAddr(e.target.value)} placeholder="Search drop location" className="flex-1 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800" />
               <Button variant="outline" size="icon" className="border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400" onClick={() => setShowMapPin('drop')}><MapPin size={16}/></Button>
             </div>
          </div>
        </div>
      </div>

      {(estimates.bike || estimates.auto || estimates.car) && (
        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg border-b border-slate-100 dark:border-slate-800 pb-2">Choose a ride</h3>
          <div className="grid grid-cols-3 gap-3">
            {(['bike','auto','car'] as const).map((type) => {
              const est = (estimates as any)[type];
              const isSelected = selectedVehicleType === type;
              const label = type === 'bike' ? 'Bike' : type === 'auto' ? 'Auto' : 'Car';
              return (
                <button
                  key={type}
                  type="button"
                  disabled={!est}
                  onClick={() => setSelectedVehicleType(type)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-colors ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900'} ${!est ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:border-blue-300'}`}
                >
                  <img src={VEHICLE_ICON_SRC[type]} alt={label} className="w-10 h-10 object-contain" />
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{label}</span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{est ? `₹${est.fare_amount}` : '...'}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {currentEstimate && (
        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-bold text-slate-500">Estimated Fare</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">₹{currentEstimate.fare_amount}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-slate-500">Distance</p>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{Number(currentEstimate.distance_km).toFixed(1)} km</p>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex justify-between items-center">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Passengers</span>
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setPassengerCount(p => Math.max(1, p - 1))} disabled={passengerCount <= 1}>
                <Minus size={14} />
              </Button>
              <span className="font-bold text-slate-900 dark:text-white w-4 text-center">{passengerCount}</span>
              <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setPassengerCount(p => Math.min(MAX_PASSENGERS[selectedVehicleType] || 4, p + 1))} disabled={passengerCount >= (MAX_PASSENGERS[selectedVehicleType] || 4)}>
                <Plus size={14} />
              </Button>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Luggage (optional)</p>
            <Input
              type="number"
              min="0"
              placeholder="Weight in kg"
              value={luggageWeight}
              onChange={e => setLuggageWeight(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            />
            <div className="grid grid-cols-3 gap-2">
              {(['Small','Medium','Large'] as const).map(size => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setLuggageSize(prev => prev === size ? '' : size)}
                  className={`py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${luggageSize === size ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400'}`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg border-b border-slate-100 dark:border-slate-800 pb-2">Payment Method</h3>
        <div className="grid grid-cols-2 gap-3">
          <div 
            onClick={() => setPaymentMethod('cash')}
            className={`border-2 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer relative overflow-hidden ${paymentMethod === 'cash' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-emerald-300'}`}
          >
            {paymentMethod === 'cash' && <Check size={16} className="absolute top-2 right-2 text-emerald-500" />}
            <span className="font-bold text-sm">Cash on Trip</span>
          </div>
          <div 
            onClick={() => {
              if (walletBalance !== null && currentEstimate && walletBalance >= currentEstimate.fare_amount) {
                setPaymentMethod('wallet');
              }
            }}
            className={`border-2 rounded-xl p-3 flex flex-col items-center justify-center relative overflow-hidden ${paymentMethod === 'wallet' ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400'} ${walletBalance !== null && currentEstimate && walletBalance < currentEstimate.fare_amount ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-300'}`}
          >
            {paymentMethod === 'wallet' && <Check size={16} className="absolute top-2 right-2 text-blue-500" />}
            <span className="font-bold text-sm">Wallet</span>
            {walletBalance !== null && currentEstimate && (
              <span className="text-[10px] mt-1 text-center font-medium">
                {walletBalance < currentEstimate.fare_amount 
                  ? `Insufficient (₹${walletBalance}) - Recharge in My Wallet` 
                  : `Balance: ₹${walletBalance}`}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="pt-4 mt-auto pb-4">
        <Button 
           className="w-full h-14 text-lg font-bold rounded-2xl bg-blue-600 hover:bg-blue-700 text-white" 
           disabled={!currentEstimate || placing} 
           onClick={handleBook}
        >
          {placing ? "Booking..." : "Confirm Booking"}
        </Button>
      </div>
    </div>
  );
}



function MoveFindingView({ rideId, onBack, onAssigned }: { rideId: string | null, onBack: () => void, onAssigned: () => void }) {
  useEffect(() => {
    if (!rideId) return;
    const supabase = getSupabaseClient();

    if (!supabase) return;

    const sub = supabase.channel(`ride_${rideId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'ride_requests', filter: `id=eq.${rideId}`
      }, (payload: any) => {
        if (payload.new.status === 'assigned') {
          onAssigned();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [rideId]);

  const handleCancel = async () => {
    if (!rideId) return;
    if (!confirm("Are you sure you want to cancel this ride request?")) return;
    const supabase = getSupabaseClient();

    if (!supabase) return;
    await supabase.rpc('cancel_ride_request', { p_ride_id: rideId, p_reason: 'Cancelled by consumer' });
    onBack();
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-900 text-white relative h-full">
       <div className="absolute top-6 left-6 z-20">
         <Button variant="ghost" onClick={handleCancel} className="text-white hover:bg-white/20 border border-white/20">Cancel</Button>
       </div>
       <div className="relative flex items-center justify-center mb-12">
          <div className="absolute w-40 h-40 bg-blue-500/20 rounded-full animate-ping" />
          <div className="absolute w-24 h-24 bg-blue-500/40 rounded-full animate-ping" style={{ animationDelay: '200ms' }} />
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center z-10 shadow-[0_0_40px_rgba(37,99,235,0.8)]">
            <Car size={32} />
          </div>
       </div>
       <h2 className="text-2xl font-bold mb-2">Finding you a rider...</h2>
       <p className="text-slate-400 text-center max-w-xs">We are contacting riders nearby. Please hold on for a moment.</p>
    </div>
  );
}

function MoveTrackingView({ rideId, onCompleted, onCancelled }: { rideId: string | null, onCompleted: () => void, onCancelled: () => void }) {
  const [rideData, setRideData] = useState<any>(null);
  const [riderData, setRiderData] = useState<any>(null);
  
  const fetchRide = async () => {
    if (!rideId) return;
    const supabase = getSupabaseClient();

    if (!supabase) return;
    const { data: ride } = await supabase.from('ride_requests').select('*').eq('id', rideId).single();
    if (ride) {
       setRideData(ride);
       if (ride.rider_id && !riderData) {
          const { data: rider } = await supabase.from('service_providers').select('id, full_name, vehicle_type, vehicle_number, rating, current_lat, current_lng').eq('id', ride.rider_id).single();
          if (rider) setRiderData(rider);
       }
    }
  };

  useEffect(() => {
    fetchRide();
  }, [rideId]);

  useEffect(() => {
    if (!rideId) return;
    const supabase = getSupabaseClient();

    if (!supabase) return;

    const sub = supabase.channel(`ride_${rideId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'ride_requests', filter: `id=eq.${rideId}`
      }, (payload: any) => {
        if (payload.new.status === 'completed') onCompleted();
        else if (payload.new.status === 'cancelled') onCancelled();
        else {
           setRideData((prev: any) => ({ ...prev, ...payload.new }));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [rideId]);

  const handleCancel = async () => {
    if (!rideId) return;
    if (!confirm("Cancel this ride? A cancellation fee may apply.")) return;
    const supabase = getSupabaseClient();

    if (!supabase) return;
    await supabase.rpc('cancel_ride_request', { p_ride_id: rideId, p_reason: 'Cancelled by consumer after assignment' });
    onCancelled();
  };

  if (!rideData || !riderData) {
     return <div className="p-8 text-center text-slate-500 font-medium">Loading live tracking...</div>;
  }

  // Adapter object for LiveTrackingMap
  const adapterObject = {
    service_provider_id: rideData.rider_id,
    service_providers: {
       current_lat: riderData.current_lat,
       current_lng: riderData.current_lng,
       full_name: riderData.full_name
    },
    status: rideData.status,
    job_type: 'ride',
    fare_amount: rideData.fare_amount,
    pickup_lat: rideData.pickup_lat,
    pickup_lng: rideData.pickup_lng,
    pickup_address: rideData.pickup_address,
    drop_lat: rideData.drop_lat,
    drop_lng: rideData.drop_lng
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950">
       <div className="bg-white dark:bg-slate-900 p-4 shadow-[0_10px_20px_rgba(0,0,0,0.05)] z-20 flex flex-col gap-4 border-b border-slate-100 dark:border-slate-800">
         <div className="flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-300">
                 {riderData.vehicle_type?.toLowerCase() === 'bike' ? <Bike size={24} /> : <Car size={24} />}
              </div>
              <div>
                 <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">{riderData.full_name || 'Rider'}</h3>
                 <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <span className="font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">{riderData.vehicle_number || 'ON TRIP'}</span>
                    <span className="flex items-center gap-1"><Star size={14} className="text-amber-500 fill-amber-500" /> {riderData.rating || '4.9'}</span>
                 </div>
              </div>
           </div>
           <div className="text-right">
              <p className="text-xl font-bold text-slate-900 dark:text-white">₹{rideData.fare_amount}</p>
              <p className="text-xs font-bold text-slate-400 uppercase">{rideData.payment_method === 'cash' ? 'Cash' : 'Wallet'}</p>
           </div>
         </div>
         {rideData.status === 'assigned' && rideData.pickup_otp && (
           <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 flex items-center justify-between">
             <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Share this code with your rider</span>
             <span className="text-2xl font-extrabold text-amber-800 dark:text-amber-300 tracking-widest">{rideData.pickup_otp}</span>
           </div>
         )}
         {rideData.status === 'assigned' && (
           <Button variant="outline" className="w-full text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={handleCancel}>
             Cancel Ride
           </Button>
         )}
       </div>
       
       <div className="flex-1 relative">
         <LiveTrackingMap deliveryAssignment={adapterObject} destinationAddress={rideData.drop_address} compact={false} />
       </div>
    </div>
  );
}

function MoveCompletedView({ rideId, onDone }: { rideId: string | null, onDone: () => void }) {
  const [rideData, setRideData] = useState<any>(null);
  
  useEffect(() => {
    if (!rideId) return;
    const fetchRide = async () => {
      const supabase = getSupabaseClient();

      if (!supabase) return;
      const { data } = await supabase.from('ride_requests').select('*').eq('id', rideId).single();
      if (data) setRideData(data);
    };
    fetchRide();
  }, [rideId]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-emerald-50 dark:bg-emerald-950/20 text-center h-full">
       <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-emerald-200 dark:border-emerald-800">
         <CheckCircle size={40} className="text-emerald-600 dark:text-emerald-400" />
       </div>
       <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Ride Completed!</h2>
       <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">You have reached your destination securely.</p>
       
       {rideData && (
         <Card className="w-full max-w-sm mb-8 border-slate-200 dark:border-slate-800 shadow-md">
           <CardContent className="p-6">
              <div className="text-sm font-bold text-slate-400 mb-1 uppercase tracking-wide">Fare Paid</div>
              <div className="text-4xl font-bold text-slate-900 dark:text-white mb-8">₹{rideData.fare_amount}</div>
              
              <div className="space-y-4 text-left relative before:absolute before:left-[11px] before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                <div className="flex gap-4 relative z-10 items-center">
                  <div className="w-6 h-6 rounded-full border-4 border-emerald-500 bg-white dark:bg-slate-950 flex-shrink-0" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate pr-4">{rideData.pickup_address}</p>
                </div>
                <div className="flex gap-4 relative z-10 items-center">
                  <div className="w-6 h-6 rounded-full border-4 border-red-500 bg-white dark:bg-slate-950 flex-shrink-0" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate pr-4">{rideData.drop_address}</p>
                </div>
              </div>
           </CardContent>
         </Card>
       )}
       
       <Button className="w-full max-w-sm h-14 text-lg font-bold rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg" onClick={onDone}>
         Done
       </Button>
    </div>
  );
}
