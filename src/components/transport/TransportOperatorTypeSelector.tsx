import React, { useState } from 'react';
import { Card, CardContent } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { User, Truck, Loader2 } from 'lucide-react';
import { getSupabaseClient } from '@/src/lib/supabase';
import { toast } from 'sonner';

interface TransportOperatorTypeSelectorProps {
  tenantId: string;
  onChoose: (type: 'individual_driver' | 'fleet_business') => void;
}

export function TransportOperatorTypeSelector({ tenantId, onChoose }: TransportOperatorTypeSelectorProps) {
  const [saving, setSaving] = useState<string | null>(null);

  const handleChoose = async (type: 'individual_driver' | 'fleet_business') => {
    setSaving(type);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase not connected');
      const { error } = await supabase
        .from('tenants')
        .update({ transport_operator_type: type })
        .eq('id', tenantId);
      if (error) throw error;
      onChoose(type);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save your choice. Please try again.');
      setSaving(null);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto py-12 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Welcome to the Transport Module!
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          To set up your account correctly, please tell us which best describes you.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card
          className="cursor-pointer border-2 border-slate-200 dark:border-slate-800 hover:border-primary transition-colors"
          onClick={() => !saving && handleChoose('individual_driver')}
        >
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <User className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Individual Driver</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              I drive my own vehicle (bike, auto, car, truck, bus, or taxi) and want to find delivery or ride jobs.
            </p>
            <Button className="w-full" disabled={!!saving}>
              {saving === 'individual_driver' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              I'm an Individual Driver
            </Button>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer border-2 border-slate-200 dark:border-slate-800 hover:border-primary transition-colors"
          onClick={() => !saving && handleChoose('fleet_business')}
        >
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Truck className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Transport Business</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              I own one or more vehicles, may employ drivers, and need full billing, GST, and fleet management.
            </p>
            <Button className="w-full" disabled={!!saving}>
              {saving === 'fleet_business' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              I'm a Transport Business
            </Button>
          </CardContent>
        </Card>
      </div>

      <p className="text-center text-xs text-slate-400">
        Don't worry — you can change this later in Settings.
      </p>
    </div>
  );
}
