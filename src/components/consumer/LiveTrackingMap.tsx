import React, { useEffect, useState, useRef } from 'react';
import { getSupabaseClient } from '@/src/lib/supabase';
import { Navigation } from 'lucide-react';

export function LiveTrackingMap({ deliveryAssignment, destinationAddress, statusText, compact }: { deliveryAssignment: any, destinationAddress: string, statusText?: string, compact?: boolean }) {
  const [riderLocation, setRiderLocation] = useState<{lat: number, lng: number} | null>(null);
  const [dropLocation, setDropLocation] = useState<{lat: number, lng: number} | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [riderMarker, setRiderMarker] = useState<any>(null);
  const [dropMarker, setDropMarker] = useState<any>(null);
  const [directionsService, setDirectionsService] = useState<any>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<any>(null);

  useEffect(() => {
    if (deliveryAssignment?.service_providers?.current_lat && deliveryAssignment?.service_providers?.current_lng) {
      setRiderLocation({
        lat: deliveryAssignment.service_providers.current_lat,
        lng: deliveryAssignment.service_providers.current_lng
      });
    }
  }, [deliveryAssignment]);

  useEffect(() => {
    let isMounted = true;
    
    const resolveLocation = async () => {
      if (!destinationAddress) return;
      
      const isHeadingToPickup = deliveryAssignment && ['unassigned', 'assigned'].includes(deliveryAssignment.status);
      
      // 1. Direct coordinate lookup from delivery assignment
      if (deliveryAssignment) {
        if (isHeadingToPickup) {
           if (deliveryAssignment.pickup_lat && deliveryAssignment.pickup_lng) {
             if (isMounted) setDropLocation({ lat: Number(deliveryAssignment.pickup_lat), lng: Number(deliveryAssignment.pickup_lng) });
             return;
           }
        } else {
           if (deliveryAssignment.drop_lat && deliveryAssignment.drop_lng) {
             if (isMounted) setDropLocation({ lat: Number(deliveryAssignment.drop_lat), lng: Number(deliveryAssignment.drop_lng) });
             return;
           }
        }
      }

      const supabase = getSupabaseClient();
      let targetAddress = destinationAddress;
      
      if (isHeadingToPickup && deliveryAssignment?.pickup_address) {
        targetAddress = deliveryAssignment.pickup_address;
      }
      
      // 1.b Legacy fallback for old data without precise coordinates
      if (supabase) {
        try {
          if (isHeadingToPickup) {
             // Heading to branch
             const { data } = await supabase.from('branches').select('latitude, longitude').eq('address', targetAddress).limit(1);
             if (data && data[0] && data[0].latitude) {
               if (isMounted) setDropLocation({ lat: Number(data[0].latitude), lng: Number(data[0].longitude) });
               return; // Skip geocoding
             }
          } else {
             // Heading to consumer
             // targetAddress might be the combined string: "address_line, city, state - pincode"
             // First try exact match on address_line just in case
             let addrData = null;
             const { data: d1 } = await supabase.from('consumer_addresses').select('latitude, longitude, address_line, city').eq('address_line', targetAddress).limit(1);
             addrData = d1 && d1.length > 0 ? d1[0] : null;
             
             // If not found, try to fetch the order and user to find the matching address
             if (!addrData && deliveryAssignment?.order_id) {
                const { data: orderData } = await supabase.from('orders').select('user_id').eq('id', deliveryAssignment.order_id).limit(1);
                if (orderData && orderData[0]?.user_id) {
                   const { data: userAddrs } = await supabase.from('consumer_addresses').select('latitude, longitude, address_line, city').eq('user_id', orderData[0].user_id);
                   if (userAddrs && userAddrs.length > 0) {
                      // find the one that is a substring of targetAddress
                      const matched = userAddrs.find((a: any) => targetAddress.includes(a.address_line) || targetAddress.startsWith(a.address_line));
                      if (matched) addrData = matched;
                   }
                }
             }

             if (addrData && addrData.latitude) {
               if (isMounted) setDropLocation({ lat: Number(addrData.latitude), lng: Number(addrData.longitude) });
               return; // Skip geocoding
             }
          }
        } catch (err) {
          console.warn("Failed to fetch precise coordinates:", err);
        }
      }
      
      // 2. Fallback to geocoding if precise coordinates missing
      const geocode = async () => {
        try {
          if (!(window as any).google) return;
          const geocoder = new (window as any).google.maps.Geocoder();
          const response = await geocoder.geocode({ address: targetAddress });
          if (response.results && response.results.length > 0) {
            const loc = response.results[0].geometry.location;
            if (isMounted) setDropLocation({ lat: loc.lat(), lng: loc.lng() });
          }
        } catch (err) {
          console.warn("Geocoding failed for address:", err);
        }
      };

      if ((window as any).google) { 
         geocode();
      } else {
         const checkGoogle = setInterval(() => {
            if ((window as any).google) {
               clearInterval(checkGoogle);
               geocode();
            }
         }, 500);
         setTimeout(() => clearInterval(checkGoogle), 10000);
      }
    };
    
    resolveLocation();
    
    return () => { isMounted = false; };
  }, [destinationAddress, deliveryAssignment]);

  useEffect(() => {
    if (!mapRef.current || !(window as any).google || !riderLocation) return;
    if (map) return;
    
    const newMap = new (window as any).google.maps.Map(mapRef.current, {
      center: riderLocation,
      zoom: 15,
      disableDefaultUI: true,
    });
    setMap(newMap);
    
    try {
      const dirService = new (window as any).google.maps.DirectionsService();
      const dirRenderer = new (window as any).google.maps.DirectionsRenderer({
        map: newMap,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#3b82f6',
          strokeWeight: 4,
        }
      });
      setDirectionsService(dirService);
      setDirectionsRenderer(dirRenderer);
    } catch (err) {
      console.warn("Failed to initialize directions", err);
    }
    
    const rMarker = new (window as any).google.maps.Marker({
      position: riderLocation,
      map: newMap,
      icon: {
        path: (window as any).google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#3b82f6',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      },
    });
    setRiderMarker(rMarker);

  }, [riderLocation, map]);

  useEffect(() => {
    if (map && dropLocation && !dropMarker) {
      const dMarker = new (window as any).google.maps.Marker({
        position: dropLocation,
        map: map,
        icon: {
          path: (window as any).google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: '#10b981',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });
      setDropMarker(dMarker);
      
      const bounds = new (window as any).google.maps.LatLngBounds();
      if (riderLocation) bounds.extend(riderLocation);
      bounds.extend(dropLocation);
      map.fitBounds(bounds, { padding: compact ? 16 : 40 });
    }
  }, [map, dropLocation, dropMarker, riderLocation]);

  useEffect(() => {
    if (riderMarker && riderLocation) {
      riderMarker.setPosition(riderLocation);
    }
  }, [riderLocation, riderMarker]);


  useEffect(() => {
    if (!directionsService || !directionsRenderer || !riderLocation || !dropLocation) return;
    
    directionsService.route({
      origin: riderLocation,
      destination: dropLocation,
      travelMode: 'DRIVING',
    })
    .then((response: any) => {
      directionsRenderer.setDirections(response);
    })
    .catch((err: any) => {
      console.warn("Directions request failed:", err);
    });
  }, [riderLocation, dropLocation, directionsService, directionsRenderer]);

  useEffect(() => {
    if (!deliveryAssignment?.service_provider_id) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const uniqueChannelName = `tracking_${deliveryAssignment.service_provider_id}_${Math.random().toString(36).slice(2)}`;
    let isCleanedUp = false;

    const sub = supabase.channel(uniqueChannelName)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'service_providers',
        filter: `id=eq.${deliveryAssignment.service_provider_id}`
      }, (payload: any) => {
        if (isCleanedUp) return;
        if (payload.new.current_lat && payload.new.current_lng) {
          setRiderLocation({
            lat: payload.new.current_lat,
            lng: payload.new.current_lng
          });
        }
      })
      .subscribe();
      
    return () => {
      isCleanedUp = true;
      supabase.removeChannel(sub);
    };
  }, [deliveryAssignment?.service_provider_id]);

  if (!riderLocation) return null;
  
  const firstName = (deliveryAssignment.service_providers?.full_name || 'Your rider').split(' ')[0];
  const isRide = deliveryAssignment.job_type === 'ride' || deliveryAssignment.fare_amount !== undefined;
  
  let derivedStatusLine = '';
  if (isRide) {
    derivedStatusLine = deliveryAssignment.status === 'in_progress'
      ? `${firstName} is on the way to your destination`
      : `${firstName} is heading to your pickup location`;
  } else {
    derivedStatusLine = deliveryAssignment.status === 'picked_up' 
      ? `${firstName} is on the way with your order`
      : `${firstName} is heading to the pickup location`;
  }
  const finalStatusLine = statusText || derivedStatusLine;

  return (
    <div className="border-t border-slate-100 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-900/50">
      <div className="flex items-center gap-2 mb-3">
        <Navigation className="w-4 h-4 text-blue-500 animate-pulse" />
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{finalStatusLine}</span>
      </div>
      <div className={`w-full rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 relative ${compact ? 'h-32' : 'h-48'}`}>
         <div ref={mapRef} className="absolute inset-0" />
      </div>
    </div>
  );
}
