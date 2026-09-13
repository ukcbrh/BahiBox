import React, { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/src/lib/supabase';
import { Card, CardContent } from '@/src/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/src/components/ui/button';

export function RideHistoryView({ onBack, user }: { onBack: () => void, user: any }) {
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchHistory = async () => {
      const supabase = getSupabaseClient();
      if (!supabase || !user) return;
      const { data, error } = await supabase
        .from('ride_requests')
        .select('*')
        .eq('consumer_id', user.id)
        .order('created_at', { ascending: false });
      
      if (data && isMounted) {
        setRides(data);
      }
      if (isMounted) setLoading(false);
    };
    fetchHistory();
    return () => { isMounted = false; };
  }, [user]);

  if (loading) return <div className="p-8 text-center text-slate-500">Loading your rides...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button onClick={onBack} variant="outline" className="h-8 w-8 p-0 rounded-full">
          <ArrowLeft size={16} />
        </Button>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">My Rides</h2>
      </div>

      {rides.length === 0 ? (
        <div className="text-center py-10 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed">
          <p className="text-slate-500 dark:text-slate-400 font-medium">No rides found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rides.map(ride => (
            <Card key={ride.id} className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="text-sm font-medium text-slate-500">
                    {new Date(ride.created_at).toLocaleDateString()} {new Date(ride.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    ride.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                    ride.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {ride.status.toUpperCase()}
                  </span>
                </div>
                
                <div className="space-y-2 mb-3 relative before:absolute before:left-[9px] before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                  <div className="flex gap-3 relative z-10 items-center">
                    <div className="w-5 h-5 rounded-full border-4 border-emerald-500 bg-white dark:bg-slate-950 flex-shrink-0"></div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{ride.pickup_address}</p>
                  </div>
                  <div className="flex gap-3 relative z-10 items-center">
                    <div className="w-5 h-5 rounded-full border-4 border-red-500 bg-white dark:bg-slate-950 flex-shrink-0"></div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{ride.drop_address}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-sm text-slate-500 font-medium">Fare Paid / Estimate</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">₹{ride.fare_amount || 0}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
