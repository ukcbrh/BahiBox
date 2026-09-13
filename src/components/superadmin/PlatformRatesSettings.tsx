import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/src/lib/supabase';
import { Database } from '@/src/db/database.types';

type PlatformSetting = Database['public']['Tables']['platform_settings']['Row'];

export function PlatformRatesSettings() {
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const supabase = getSupabaseClient();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*')
      .order('setting_key');
    
    if (error) {
      toast.error('Failed to load platform settings');
      console.error(error);
    } else if (data) {
      setSettings(data);
      const initialValues: Record<string, string> = {};
      data.forEach((s: PlatformSetting) => {
        initialValues[s.setting_key] = s.setting_value;
      });
      setEditValues(initialValues);
    }
    setLoading(false);
  };

  const handleSave = async (key: string) => {
    if (!supabase) return;
    setSaving(prev => ({ ...prev, [key]: true }));
    
    const { error } = await supabase
      .from('platform_settings')
      .update({ setting_value: editValues[key] })
      .eq('setting_key', key);
      
    if (error) {
      toast.error('Failed to update setting');
      console.error(error);
    } else {
      toast.success('Setting updated successfully');
      fetchSettings(); // Refresh from DB
    }
    
    setSaving(prev => ({ ...prev, [key]: false }));
  };

  const renderSettingRow = (key: string, label: string) => {
    const setting = settings.find(s => s.setting_key === key);
    if (!setting) return null;
    
    return (
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
        <div className="flex-1">
          <p className="font-semibold text-sm text-slate-900 dark:text-white">{label}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">{setting.description}</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Input 
            value={editValues[key] || ''}
            onChange={(e) => setEditValues(prev => ({ ...prev, [key]: e.target.value }))}
            className="w-24 text-right font-mono font-bold"
            type="number"
          />
          <Button 
            size="sm" 
            onClick={() => handleSave(key)}
            disabled={saving[key] || editValues[key] === setting.setting_value}
          >
            {saving[key] ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="h-40 flex items-center justify-center">Loading settings...</div>;
  }

  return (
    <Card className="dark:bg-slate-900 dark:border-slate-800 border-none shadow-sm">
      <CardHeader>
        <CardTitle className="dark:text-white">Platform Rates & Fees</CardTitle>
        <CardDescription>Configure base fares, per-km rates, and platform commissions globally.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Package Delivery (Move)</h3>
          <div className="space-y-2">
            {renderSettingRow('delivery_base_fee', 'Base Fee (₹)')}
            {renderSettingRow('delivery_per_km_rate', 'Per KM Rate (₹)')}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Ride Booking (Move)</h3>
          <div className="space-y-2">
            {renderSettingRow('ride_base_fare', 'Base Fare (₹)')}
            {renderSettingRow('ride_per_km_rate', 'Per KM Rate (₹)')}
            {renderSettingRow('ride_platform_commission_percent', 'Platform Commission (%)')}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Vehicle-wise Ride Rates</h3>
          <div className="space-y-2">
            <p className="text-xs text-slate-500 dark:text-slate-400 px-1">Bike</p>
            {renderSettingRow('ride_bike_base_fare', 'Bike Base Fare (₹)')}
            {renderSettingRow('ride_bike_per_km_rate', 'Bike Per KM Rate (₹)')}
            <p className="text-xs text-slate-500 dark:text-slate-400 px-1 pt-2">Auto</p>
            {renderSettingRow('ride_auto_base_fare', 'Auto Base Fare (₹)')}
            {renderSettingRow('ride_auto_per_km_rate', 'Auto Per KM Rate (₹)')}
            <p className="text-xs text-slate-500 dark:text-slate-400 px-1 pt-2">Car</p>
            {renderSettingRow('ride_car_base_fare', 'Car Base Fare (₹)')}
            {renderSettingRow('ride_car_per_km_rate', 'Car Per KM Rate (₹)')}
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Withdrawal Settings</h3>
          <div className="space-y-2">
            {renderSettingRow('withdrawal_min_amount', 'Min Amount (₹)')}
            {renderSettingRow('withdrawal_max_amount', 'Max Amount (₹)')}
            {renderSettingRow('withdrawal_settlement_days', 'Settlement Days')}
            {renderSettingRow('withdrawal_charge_percent', 'Platform Charge (%)')}
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
