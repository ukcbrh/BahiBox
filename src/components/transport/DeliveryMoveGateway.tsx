import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Package, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getSupabaseClient } from '../../lib/supabase';
import { toast } from 'sonner';

export function DeliveryMoveGateway() {
  const navigate = useNavigate();
  const { user, currentTenantId } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleOpenRiderApp = async () => {
    if (!user || !currentTenantId) return;
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase not connected');

      const { data: existing } = await supabase
        .from('service_providers')
        .select('id, provider_type')
        .eq('tenant_id', currentTenantId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existing) {
        const { data: userRow } = await supabase
          .from('users')
          .select('full_name, phone')
          .eq('id', user.id)
          .maybeSingle();

        const { error: insertError } = await supabase.from('service_providers').insert({
          tenant_id: currentTenantId,
          user_id: user.id,
          provider_type: 'Rider',
          full_name: userRow?.full_name || 'Driver',
          phone: userRow?.phone || ''
        });

        if (insertError) throw insertError;
      } else if (existing.provider_type?.toLowerCase() !== 'rider') {
        const { error: updateError } = await supabase
          .from('service_providers')
          .update({ provider_type: 'Rider' })
          .eq('id', existing.id);
        if (updateError) throw updateError;
      }

      navigate('/rider-app');
    } catch (err: any) {
      toast.error(err.message || 'Failed to set up your rider profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto py-16 text-center space-y-6">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
        <Package className="w-10 h-10 text-primary" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Ready to find jobs?</h1>
      <p className="text-slate-500 dark:text-slate-400">
        Delivery and ride jobs are managed in the Rider App, where you can go online, see nearby jobs, and track your earnings.
      </p>
      <Button size="lg" onClick={handleOpenRiderApp} disabled={loading}>
        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
        Open Rider App <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}
