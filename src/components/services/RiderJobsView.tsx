import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { MapPin, Package, Clock, CheckCircle, Car } from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabase';

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
            Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c; 
}

interface RiderJobsViewProps {
  riderId: string;
}

export function RiderJobsView({ riderId }: RiderJobsViewProps) {
  const [availableJobs, setAvailableJobs] = useState<any[]>([]);
  const [myDeliveries, setMyDeliveries] = useState<any[]>([]);
  const [deliveryHistory, setDeliveryHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rates, setRates] = useState<{base: number, perKm: number}>({ base: 15, perKm: 5 });
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (riderId && supabase) {
      fetchJobs();
      fetchRates();
      
      const sub = supabase.channel('delivery_assignments_rider')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_assignments' }, () => {
          fetchJobs();
        })
        .subscribe();

      const rideSub = supabase.channel('ride_requests_rider')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ride_requests' }, () => {
          fetchJobs();
        })
        .subscribe();
        
      return () => { supabase.removeChannel(sub); supabase.removeChannel(rideSub); };
    }
  }, [riderId, supabase]);

  const fetchRates = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('platform_settings').select('*').in('setting_key', ['delivery_base_fee', 'delivery_per_km_rate']);
    if (data) {
       const base = parseFloat(data.find((d: any) => d.setting_key === 'delivery_base_fee')?.setting_value || '15');
       const perKm = parseFloat(data.find((d: any) => d.setting_key === 'delivery_per_km_rate')?.setting_value || '5');
       setRates({ base, perKm });
    }
  };

  const fetchJobs = async () => {
    if (!supabase) return;

    const { data: myProfileData } = await supabase
      .from('service_providers')
      .select('online_work_mode')
      .eq('id', riderId)
      .maybeSingle();
    const workMode = myProfileData?.online_work_mode || 'both';

    const { data: unassignedData } = await supabase
      .from('delivery_assignments')
      .select('*, orders(total, tenants(business_name))')
      .eq('status', 'unassigned');

    const { data: requestedRides } = await supabase
      .from('ride_requests')
      .select('*')
      .eq('status', 'requested');

    const taggedUnassigned = (workMode === 'delivery' || workMode === 'both')
      ? (unassignedData || []).map((d: any) => ({ ...d, job_type: 'delivery' }))
      : [];
    const taggedRequestedRides = (workMode === 'move' || workMode === 'both')
      ? (requestedRides || []).map((r: any) => ({ ...r, job_type: 'ride' }))
      : [];

    setAvailableJobs(
      [...taggedUnassigned, ...taggedRequestedRides].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    );
    const { data: myData } = await supabase
      .from('delivery_assignments')
      .select('*, orders(total, tenants(business_name))')
      .eq('service_provider_id', riderId)
      .neq('status', 'delivered');

    const { data: myRides } = await supabase
      .from('ride_requests')
      .select('*')
      .eq('rider_id', riderId)
      .in('status', ['assigned', 'in_progress']);

    const taggedMyDeliveries = (myData || []).map((d: any) => ({ ...d, job_type: 'delivery' }));
    const taggedMyRides = (myRides || []).map((r: any) => ({ ...r, job_type: 'ride' }));
    setMyDeliveries(
      [...taggedMyDeliveries, ...taggedMyRides].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    );
    
    const { data: historyData } = await supabase
      .from('delivery_assignments')
      .select('*, orders(total, tenants(business_name))')
      .eq('service_provider_id', riderId)
      .eq('status', 'delivered')
      .order('delivered_at', { ascending: false })
      .limit(30);

    const { data: rideHistory } = await supabase
      .from('ride_requests')
      .select('*')
      .eq('rider_id', riderId)
      .in('status', ['completed', 'cancelled'])
      .order('completed_at', { ascending: false })
      .limit(30);

    const taggedHistory = (historyData || []).map((d: any) => ({ ...d, job_type: 'delivery' }));
    const taggedRideHistory = (rideHistory || []).map((r: any) => ({ ...r, job_type: 'ride' }));
    setDeliveryHistory(
      [...taggedHistory, ...taggedRideHistory].sort((a, b) => {
        const aTime = a.job_type === 'ride' ? (a.completed_at || a.cancelled_at || a.created_at) : a.delivered_at;
        const bTime = b.job_type === 'ride' ? (b.completed_at || b.cancelled_at || b.created_at) : b.delivered_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      })
    );
    
    setLoading(false);
  };

  const acceptJob = async (job: any) => {
    if (!supabase) return;

    if (job.job_type === 'ride') {
      const { error } = await supabase.rpc('accept_ride_request', { p_ride_id: job.id });
      if (error) {
        alert(error.message || "This ride was just taken by another rider!");
      } else {
        fetchJobs();
      }
      return;
    }
    
    const { data, error } = await supabase
      .from('delivery_assignments')
      .update({
        service_provider_id: riderId,
        status: 'assigned',
        assigned_at: new Date().toISOString()
      })
      .eq('id', job.id)
      .eq('status', 'unassigned')
      .select();
      
    if (error) {
      alert("Error accepting job");
      return;
    }
    
    if (data && data.length === 0) {
      alert("This job was just taken by another rider!");
    } else {
      fetchJobs();
    }
  };
  
  const updateStatus = async (job: any, newStatus: string) => {
    if (!supabase) return;

    if (job.job_type === 'ride') {
      const { error } = await supabase.rpc('update_ride_status', {
        p_ride_id: job.id,
        p_new_status: newStatus
      });
      if (error) {
        alert(error.message);
        return;
      }
      fetchJobs();
      return;
    }
    
    const { error } = await supabase.rpc('mark_delivery_status', {
      p_assignment_id: job.id,
      p_new_status: newStatus
    });
    
    if (error) {
      alert(error.message);
      return;
    }
    
    fetchJobs();
  };

  if (loading) return <div>Loading jobs...</div>;

  return (
    <div className="space-y-8 mt-8 border-t pt-8">
      <div>
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Package className="text-blue-500"/> My Active Jobs</h3>
        {myDeliveries.length === 0 ? (
          <p className="text-slate-500">No active deliveries or rides.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {myDeliveries.map(job => (
              <Card key={job.id} className={job.job_type === 'ride' ? "border-purple-200 bg-purple-50/50" : "border-blue-200 bg-blue-50/50"}>
                <CardContent className="p-4 flex flex-col gap-3">
                  <div className="flex justify-between font-bold">
                    <span className="flex items-center gap-1">
                      {job.job_type === 'ride' ? <Car size={16} className="text-purple-600" /> : null}
                      {job.job_type === 'ride' ? (job.payment_method === 'cash' ? 'Cash Ride' : 'Wallet Ride') : (job.orders?.tenants?.business_name || 'Merchant')}
                    </span>
                    <span>₹{job.job_type === 'ride' ? (job.fare_amount || 0) : (job.orders?.total || 0)}</span>
                  </div>
                  <div className="text-sm">
                    <p className="flex items-start gap-1 text-slate-600"><MapPin size={16} className="mt-0.5 flex-shrink-0 text-emerald-600"/> <span className="font-semibold">Pickup:</span> {job.pickup_address}</p>
                    <p className="flex items-start gap-1 text-slate-600 mt-2"><MapPin size={16} className="mt-0.5 flex-shrink-0 text-red-500"/> <span className="font-semibold">Drop:</span> {job.drop_address}</p>
                  </div>
                  <div className="mt-2 flex gap-2">
                    {job.job_type === 'delivery' && job.status === 'assigned' && (
                      <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => updateStatus(job, 'picked_up')}>Mark Picked Up</Button>
                    )}
                    {job.job_type === 'delivery' && job.status === 'picked_up' && (
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => updateStatus(job, 'delivered')}>Mark Delivered</Button>
                    )}
                    {job.job_type === 'ride' && job.status === 'assigned' && (
                      <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => updateStatus(job, 'in_progress')}>Start Ride</Button>
                    )}
                    {job.job_type === 'ride' && job.status === 'in_progress' && (
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => updateStatus(job, 'completed')}>Complete Ride</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      <div>
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Clock className="text-amber-500"/> Available Jobs</h3>
        {availableJobs.length === 0 ? (
          <p className="text-slate-500">No available jobs nearby.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {availableJobs.map(job => {
              if (job.job_type === 'ride') {
                return (
                  <Card key={job.id} className="border-purple-200 hover:border-purple-400 transition-colors">
                    <CardContent className="p-4 flex flex-col gap-3">
                      <div className="flex justify-between font-bold">
                        <span className="flex items-center gap-1"><Car size={16} className="text-purple-600" /> {job.payment_method === 'cash' ? 'Cash Ride' : 'Wallet Ride'}</span>
                        <div className="text-right">
                          <p className="text-emerald-600">You'll earn ~₹{Math.round((job.fare_amount || 0) - (job.commission_amount || 0))}</p>
                          <p className="text-xs text-slate-400 font-normal">Fare: ₹{job.fare_amount || 0}</p>
                        </div>
                      </div>
                      <div className="text-sm">
                        <p className="flex flex-col gap-0.5 text-slate-600"><span className="text-xs uppercase font-bold tracking-wider text-slate-400">Pickup</span> {job.pickup_address}</p>
                        <p className="flex flex-col gap-0.5 text-slate-600 mt-2"><span className="text-xs uppercase font-bold tracking-wider text-slate-400">Drop</span> {(job.drop_address || '').substring(0, 30)}...</p>
                      </div>
                      <Button className="w-full mt-2 bg-purple-600 hover:bg-purple-700" onClick={() => acceptJob(job)}>Accept Ride</Button>
                    </CardContent>
                  </Card>
                );
              }

              let estimatedEarning = rates.base;
              if (job.pickup_lat && job.pickup_lng && job.drop_lat && job.drop_lng) {
                 const dist = calculateDistance(job.pickup_lat, job.pickup_lng, job.drop_lat, job.drop_lng);
                 estimatedEarning += (dist * rates.perKm);
              }
              
              return (
              <Card key={job.id} className="border-slate-200 hover:border-blue-300 transition-colors">
                <CardContent className="p-4 flex flex-col gap-3">
                  <div className="flex justify-between font-bold">
                    <span>{job.orders?.tenants?.business_name || 'Merchant'}</span>
                    <div className="text-right">
                       <p className="text-emerald-600">You'll earn ~₹{Math.round(estimatedEarning)}</p>
                       <p className="text-xs text-slate-400 font-normal">Order: ₹{job.orders?.total || 0}</p>
                    </div>
                  </div>
                  <div className="text-sm">
                    <p className="flex flex-col gap-0.5 text-slate-600"><span className="text-xs uppercase font-bold tracking-wider text-slate-400">Pickup Area</span> {job.pickup_address}</p>
                    <p className="flex flex-col gap-0.5 text-slate-600 mt-2"><span className="text-xs uppercase font-bold tracking-wider text-slate-400">Drop Area</span> {(job.drop_address || '').substring(0, 30)}...</p>
                  </div>
                  <Button className="w-full mt-2" onClick={() => acceptJob(job)}>Accept Job</Button>
                </CardContent>
              </Card>
            );})}
          </div>
        )}
      </div>
      
      <div className="mt-8 border-t pt-8">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><CheckCircle className="text-emerald-500"/> History</h3>
        {deliveryHistory.length === 0 ? (
          <p className="text-slate-500">No completed jobs yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {deliveryHistory.map(job => (
              <Card key={job.id} className="border-slate-200 bg-slate-50/50">
                <CardContent className="p-4 flex flex-col gap-2">
                  <div className="flex justify-between font-bold">
                    <span className="flex items-center gap-1">
                      {job.job_type === 'ride' ? <Car size={14} className="text-purple-600" /> : null}
                      {job.job_type === 'ride' ? (job.payment_method === 'cash' ? 'Cash Ride' : 'Wallet Ride') : (job.orders?.tenants?.business_name || 'Merchant')}
                    </span>
                    <span className="text-slate-600">₹{job.job_type === 'ride' ? (job.fare_amount || 0) : (job.orders?.total || 0)}</span>
                  </div>
                  <div className="text-xs text-slate-500 space-y-1 mt-1">
                    <p><span className="font-semibold text-slate-600">Drop:</span> {(job.drop_address || '').length > 40 ? job.drop_address.substring(0, 40) + '...' : job.drop_address}</p>
                    {job.job_type === 'ride' ? (
                      <p><span className="font-semibold text-slate-600">Status:</span> {job.status === 'cancelled' ? 'Cancelled' : (job.completed_at ? new Date(job.completed_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Unknown')}</p>
                    ) : (
                      <p><span className="font-semibold text-slate-600">Delivered:</span> {job.delivered_at ? new Date(job.delivered_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Unknown'}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
