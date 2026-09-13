import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Package, Construction, Loader2, ArrowRight } from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabase';
import { toast } from 'sonner';

interface IndividualDriverWorkTypeSelectorProps {
  tenantId: string;
  onChoose: (type: 'delivery_move' | 'other') => void;
}

export function IndividualDriverWorkTypeSelector({ tenantId, onChoose }: IndividualDriverWorkTypeSelectorProps) {
  const [saving, setSaving] = useState<string | null>(null);

  const handleChoose = async (type: 'delivery_move' | 'other') => {
    setSaving(type);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase not connected');
      const { error } = await supabase
        .from('tenants')
        .update({ transport_individual_work_type: type })
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
          What kind of work do you do?
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          This helps us show you the right tools.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card
          className="cursor-pointer border-2 border-slate-200 dark:border-slate-800 hover:border-primary transition-colors"
          onClick={() => !saving && handleChoose('delivery_move')}
        >
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Package className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Delivery & Ride (Move)</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Pick up delivery or ride jobs from nearby customers using the job pool.
            </p>
            <Button className="w-full" disabled={!!saving}>
              {saving === 'delivery_move' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              This is my work
            </Button>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer border-2 border-slate-200 dark:border-slate-800 hover:border-primary transition-colors"
          onClick={() => !saving && handleChoose('other')}
        >
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Construction className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Something Else</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Long-distance trips, truck-load work, or other individual driving work.
            </p>
            <Button className="w-full" variant="outline" disabled={!!saving}>
              {saving === 'other' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              This is my work
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
