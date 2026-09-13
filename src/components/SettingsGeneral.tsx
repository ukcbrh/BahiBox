import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Plus, Check, Eye, X } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import BillPreview from './retail/BillPreview';
import { BillData } from '@/src/lib/billRenderer';
import { tenantScopedKey } from '@/src/lib/tenantStorage';

const CHANNEL_LABELS: Record<string, string> = {
  instore: 'In-Store POS',
  scan_go: 'Scan & Go',
  online: 'Online Orders',
  sale_invoice: 'Sale Invoice',
  purchase_invoice: 'Purchase Invoice',
  delivery_challan_in: 'Delivery Challan (Inward)',
  delivery_challan_out: 'Delivery Challan (Outward)',
  inward_payment: 'Inward Payment Receipt',
  outward_payment: 'Outward Payment Receipt',
  credit_note: 'Credit Note',
  debit_note: 'Debit Note',
  quotation: 'Quotation',
  sale_order: 'Sale Order',
  purchase_order: 'Purchase Order'
};

export function SettingsGeneral() {
  const { currentTenantId } = useAuth();

  const [settings, setSettings] = useState<Record<string, { prefix: string; printerSize: string }>>({
    instore: { prefix: 'INV-', printerSize: '80mm' },
    scan_go: { prefix: 'SG-', printerSize: '80mm' },
    online: { prefix: 'ORD-', printerSize: 'A4' },
    sale_invoice: { prefix: 'INV-', printerSize: 'A4' },
    purchase_invoice: { prefix: 'PUR-', printerSize: 'A4' },
    delivery_challan_in: { prefix: 'DCI-', printerSize: 'A4' },
    delivery_challan_out: { prefix: 'DCO-', printerSize: 'A4' },
    inward_payment: { prefix: 'RCPT-IN-', printerSize: '80mm' },
    outward_payment: { prefix: 'RCPT-OUT-', printerSize: '80mm' },
    credit_note: { prefix: 'CN-', printerSize: 'A4' },
    debit_note: { prefix: 'DN-', printerSize: 'A4' },
    quotation: { prefix: 'QTN-', printerSize: 'A4' },
    sale_order: { prefix: 'SO-', printerSize: 'A4' },
    purchase_order: { prefix: 'PO-', printerSize: 'A4' }
  });

  const [labelSettings, setLabelSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(tenantScopedKey('barcodeLabelSettings', currentTenantId));
      if (saved) {
        const parsed = JSON.parse(saved);
        return { width: 40, height: 25, unit: 'mm', ...parsed, codeType: parsed.codeType || 'barcode' };
      }
    } catch (e) {}
    return { width: 40, height: 25, unit: 'mm' as 'mm' | 'cm' | 'in', codeType: 'barcode' as 'barcode' | 'qr' | 'both' };
  });

  const [templates, setTemplates] = useState<any[]>([]);
  const [labelTemplates, setLabelTemplates] = useState<any[]>([]);
  const [selectedLabelTemplateId, setSelectedLabelTemplateId] = useState<string | null>(null);
  const [viewingTemplate, setViewingTemplate] = useState<{ template: any; printerSize: string; channel: string } | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [businessInfo, setBusinessInfo] = useState<any>({ businessName: 'Your Business', address: '', phone: '' });

  const [sizePresets, setSizePresets] = useState<any[]>([]);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetWidth, setNewPresetWidth] = useState('40');
  const [newPresetHeight, setNewPresetHeight] = useState('25');
  const [newPresetUnit, setNewPresetUnit] = useState<'mm' | 'cm' | 'in'>('mm');
  const [showAddPreset, setShowAddPreset] = useState(false);

  const [brandingSettings, setBrandingSettings] = useState<any>({ stamp_url: null, show_branch_name: true, show_branch_address: true });
  const stampInputRef = React.useRef<HTMLInputElement>(null);

  const handleSaveLabelSettings = () => {
    localStorage.setItem(tenantScopedKey('barcodeLabelSettings', currentTenantId), JSON.stringify(labelSettings));
    toast.success('Label size saved successfully');
  };

  useEffect(() => {
    const saved = localStorage.getItem(tenantScopedKey('posSettings', currentTenantId));
    if (saved) {
      try {
        setSettings(prev => ({ ...prev, ...JSON.parse(saved) }));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!currentTenantId) return;
      const supabase = getSupabaseClient();
      if (!supabase) return;

      const { data: templatesData } = await supabase.from('bill_templates').select('*').eq('is_default', true);
      setTemplates(templatesData || []);

      const { data: labelTemplatesData } = await supabase.from('bill_templates').select('*').eq('category', 'label').eq('is_default', true);
      setLabelTemplates(labelTemplatesData || []);
      console.log('DEBUG labelTemplatesData:', labelTemplatesData);
      const { data: presetsData } = await supabase.from('label_size_presets').select('*').eq('tenant_id', currentTenantId).order('created_at');
      setSizePresets(presetsData || []);

      const { data: labelSelectionData } = await supabase.from('bill_format_selection').select('template_id').eq('tenant_id', currentTenantId).eq('channel', 'barcode_label').maybeSingle();
      setSelectedLabelTemplateId(labelSelectionData?.template_id || null);

      const { data: selectionsData } = await supabase.from('bill_format_selection').select('channel, template_id').eq('tenant_id', currentTenantId);
      const selMap: Record<string, string> = {};
      (selectionsData || []).forEach((s: any) => { selMap[s.channel] = s.template_id; });
      setSelections(selMap);

      const { data: tenantData } = await supabase.from('tenants').select('business_name').eq('id', currentTenantId).maybeSingle();
      const { data: branchData } = await supabase.from('branches').select('address, city, state').eq('tenant_id', currentTenantId).order('is_main_branch', { ascending: false }).limit(1).maybeSingle();
      setBusinessInfo({
        businessName: tenantData?.business_name || 'Your Business',
        address: [branchData?.address, branchData?.city, branchData?.state].filter(Boolean).join(', '),
        phone: ''
      });

      const { data: brandingData } = await supabase.from('print_branding_settings').select('*').eq('tenant_id', currentTenantId).maybeSingle();
      if (brandingData) setBrandingSettings(brandingData);
    };
    load();
  }, [currentTenantId]);

  const handleSave = () => {
    localStorage.setItem(tenantScopedKey('posSettings', currentTenantId), JSON.stringify(settings));
    toast.success('Settings saved successfully');
  };

  const updateSetting = (channel: string, key: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        [key]: value
      }
    }));
  };

  const handleStampUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentTenantId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    toast.info('Uploading stamp...');
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${currentTenantId}/stamp_${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('product-images').upload(path, file);
      if (uploadErr) {
        toast.error('Upload failed: ' + uploadErr.message);
        return;
      }
      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path);
      const newSettings = { ...brandingSettings, tenant_id: currentTenantId, stamp_url: urlData.publicUrl };
      const { error: saveErr } = await supabase.from('print_branding_settings').upsert(newSettings, { onConflict: 'tenant_id' });
      if (saveErr) {
        toast.error('Failed to save: ' + saveErr.message);
        return;
      }
      setBrandingSettings(newSettings);
      toast.success('Stamp uploaded and saved.');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      if (stampInputRef.current) stampInputRef.current.value = '';
    }
  };

  const handleToggleBranding = async (key: 'show_branch_name' | 'show_branch_address' | 'bill_number_code_type' | 'show_upi_qr_on_credit', value: boolean | string) => {
    if (!currentTenantId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const newSettings = { ...brandingSettings, tenant_id: currentTenantId, [key]: value };
    setBrandingSettings(newSettings);
    const { error } = await supabase.from('print_branding_settings').upsert(newSettings, { onConflict: 'tenant_id' });
    if (error) toast.error('Failed to save: ' + error.message);
  };

  const handleSelectTemplate = async (channel: string, printerSize: string, templateId: string) => {
    setSelections(prev => ({ ...prev, [channel]: templateId }));
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) return;
    const { error } = await supabase.from('bill_format_selection').upsert({
      tenant_id: currentTenantId,
      channel,
      printer_size: printerSize,
      template_id: templateId,
      updated_at: new Date().toISOString()
    }, { onConflict: 'tenant_id,channel' });
    if (error) {
      toast.error('Failed to save template choice: ' + error.message);
    } else {
      toast.success('Template selected');
    }
  };

  const handleSelectLabelTemplate = async (templateId: string) => {
    setSelectedLabelTemplateId(templateId);
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) return;
    const { error } = await supabase.from('bill_format_selection').upsert({
      tenant_id: currentTenantId,
      channel: 'barcode_label',
      printer_size: 'label',
      template_id: templateId,
      updated_at: new Date().toISOString()
    }, { onConflict: 'tenant_id,channel' });
    if (error) toast.error('Failed to save: ' + error.message);
    else toast.success('Label template selected');
  };

  const handleAddPreset = async () => {
    if (!newPresetName.trim() || !currentTenantId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data, error } = await supabase.from('label_size_presets').insert({
      tenant_id: currentTenantId,
      preset_name: newPresetName.trim(),
      width: parseFloat(newPresetWidth) || 40,
      height: parseFloat(newPresetHeight) || 25,
      unit: newPresetUnit,
      is_default: sizePresets.length === 0
    }).select().single();
    if (error) {
      toast.error('Failed to save size: ' + error.message);
      return;
    }
    setSizePresets(prev => [...prev, data]);
    setNewPresetName('');
    setShowAddPreset(false);
    toast.success('Size saved');
  };

  const handleDeletePreset = async (id: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from('label_size_presets').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete: ' + error.message);
      return;
    }
    setSizePresets(prev => prev.filter(p => p.id !== id));
    toast.success('Size removed');
  };

  const handleSetDefaultPreset = async (id: string) => {
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) return;
    await supabase.from('label_size_presets').update({ is_default: false }).eq('tenant_id', currentTenantId);
    await supabase.from('label_size_presets').update({ is_default: true }).eq('id', id);
    setSizePresets(prev => prev.map(p => ({ ...p, is_default: p.id === id })));
    toast.success('Default size updated');
  };

  const sampleLabelData = {
    store_name: businessInfo.businessName,
    product_name: 'Sample Product',
    size: 'M',
    mrp: 199,
    selling_price: 149,
    barcode_value: '00000001'
  };

  const CHANNEL_META: Record<string, { label: string; infoLabel: string; personName: string }> = {
    instore: { label: 'Retail Invoice', infoLabel: 'Bill To', personName: 'Walk-in Customer' },
    scan_go: { label: 'Scan & Go Bill', infoLabel: 'Bill To', personName: 'Sample Customer' },
    online: { label: 'Online Order Invoice', infoLabel: 'Ship To', personName: 'Sample Customer' },
    sale_invoice: { label: 'Tax Invoice (Sale)', infoLabel: 'Bill To', personName: 'Sample Customer' },
    purchase_invoice: { label: 'Purchase Invoice', infoLabel: 'Supplier', personName: 'Sample Supplier' },
    delivery_challan_in: { label: 'Delivery Challan (Inward)', infoLabel: 'From', personName: 'Sample Supplier' },
    delivery_challan_out: { label: 'Delivery Challan (Outward)', infoLabel: 'To', personName: 'Sample Customer' }
  };

  const getSampleBillData = (channel: string): BillData => {
    const meta = CHANNEL_META[channel] || CHANNEL_META['sale_invoice'];
    return {
      business: { name: businessInfo.businessName, address: businessInfo.address, phone: businessInfo.phone },
      customer: { name: meta.personName },
      customer_info_label: meta.infoLabel,
      meta: { label: meta.label, number: 'DOC-0001', date: new Date().toLocaleDateString() },
      items: [
        { name: 'Sample Product A', hsn: '1234', qty: 2, unit: 'Pcs', rate: 100, amount: 200 },
        { name: 'Sample Product B', qty: 1, unit: 'Pcs', rate: 150, amount: 150 }
      ],
      totals: {
        subtotal: 350,
        tax_breakdown: [{ label: 'GST 18%', amount: 63 }],
        grand_total: 413
      },
      footer: {}
    };
  };

  const renderChannelSettings = (channel: string) => {
    const title = CHANNEL_LABELS[channel] || channel;
    const currentSize = settings[channel]?.printerSize || 'A4';
    const sizeTemplates = templates.filter(t => t.printer_size === currentSize);
    const selectedTemplateId = selections[channel];

    return (
      <div className="space-y-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
        <h3 className="font-bold text-slate-800 dark:text-slate-200">{title}</h3>
        <div className="space-y-2">
          <label className="text-sm font-medium">Invoice Number Prefix</label>
          <Input 
            value={settings[channel]?.prefix || ''}
            onChange={e => updateSetting(channel, 'prefix', e.target.value)}
            placeholder="e.g. INV-" 
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Printer Format & Size</label>
          <div className="flex flex-col gap-2">
            {['A4', 'A4-Half', '112mm', '80mm', '58mm'].map(size => (
              <label key={size} className="flex items-center gap-2 text-sm">
                <input 
                  type="radio"
                  name={`printerSize_${channel}`}
                  value={size}
                  checked={currentSize === size}
                  onChange={e => updateSetting(channel, 'printerSize', e.target.value)}
                />
                {size === 'A4' ? 'A4 Size (Standard Document)' : size === 'A4-Half' ? 'A4 Half Size / A5 (Standard Document)' : `${size === '112mm' ? '4 Inch' : size === '80mm' ? '3 Inch' : '2 Inch'} (${size}) Thermal`}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t">
          <label className="text-sm font-medium">Bill Template ({currentSize})</label>
          <div className="grid grid-cols-2 gap-2">
            {sizeTemplates.map(t => (
              <div
                key={t.id}
                className={`relative border-2 rounded-lg overflow-hidden text-left ${selectedTemplateId === t.id ? 'border-blue-500' : 'border-slate-200 dark:border-slate-700'}`}
              >
                <button
                  type="button"
                  onClick={() => handleSelectTemplate(channel, currentSize, t.id)}
                  className="block w-full"
                >
                  <div style={{ height: '120px', overflow: 'hidden', background: '#e2e8f0' }}>
                    <div style={{ transform: 'scale(0.28)', transformOrigin: 'top left', width: '357%' }}>
                      <BillPreview blocks={t.blocks} data={getSampleBillData(channel)} printerSize={currentSize} />
                    </div>
                  </div>
                  <div className="px-2 py-1 text-xs font-medium bg-white dark:bg-slate-950 flex items-center justify-between">
                    {t.style_name}
                    {selectedTemplateId === t.id && <Check size={12} className="text-blue-500" />}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setViewingTemplate({ template: t, printerSize: currentSize, channel }); }}
                  className="absolute top-1 right-1 bg-white dark:bg-slate-900 rounded-full p-1 shadow border border-slate-200 dark:border-slate-700"
                  title="View full size"
                >
                  <Eye size={12} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => toast.info('Custom Template Builder is coming in the next step.')}
              className="border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1 text-xs text-slate-500 h-[145px]"
            >
              <Plus size={18} />
              Create Custom Template
            </button>
          </div>
        </div>
      </div>
    );
  };

  console.log('DEBUG codeType:', labelSettings.codeType, 'filtered count:', labelTemplates.filter(t => t.printer_size === `label-${labelSettings.codeType}`).length);

  return (
    <>
    <Card>
      <CardHeader><CardTitle>Bill Generation Settings</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {renderChannelSettings('instore')}
          {renderChannelSettings('scan_go')}
          {renderChannelSettings('online')}
          {renderChannelSettings('sale_invoice')}
          {renderChannelSettings('purchase_invoice')}
          {renderChannelSettings('delivery_challan_in')}
          {renderChannelSettings('delivery_challan_out')}
          {renderChannelSettings('inward_payment')}
          {renderChannelSettings('outward_payment')}
          {renderChannelSettings('credit_note')}
          {renderChannelSettings('debit_note')}
          {renderChannelSettings('quotation')}
          {renderChannelSettings('sale_order')}
          {renderChannelSettings('purchase_order')}
        </div>
        <Button onClick={handleSave} className="mt-4">Save All Settings</Button>

        <div className="pt-6 mt-6 border-t space-y-4">
          <h3 className="font-bold text-slate-800 dark:text-slate-200">Barcode Label Templates</h3>
          <div className="space-y-5">
            {(['barcode', 'qr', 'both'] as const).map(ct => {
              const groupChannelKey = `barcode_label_${ct}`;
              const groupTemplates = labelTemplates.filter(t => t.printer_size === `label-${ct}`);
              const groupSelectedId = selections[groupChannelKey];
              return (
                <div key={ct}>
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    {ct === 'barcode' ? 'Barcode' : ct === 'qr' ? 'QR Code' : 'Both (Barcode + QR)'}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-w-xl">
                    {groupTemplates.map(t => (
                      <div key={t.id} className={`relative border-2 rounded-lg overflow-hidden ${groupSelectedId === t.id ? 'border-blue-500' : 'border-slate-200 dark:border-slate-700'}`}>
                        <button type="button" onClick={() => handleSelectTemplate(groupChannelKey, `label-${ct}`, t.id)} className="block w-full">
                          <div style={{ height: '90px', overflow: 'hidden', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ transform: 'scale(0.9)' }}>
                              <BillPreview blocks={t.blocks} printerSize="label" labelData={sampleLabelData} labelWidthMm={labelSettings.unit === 'mm' ? labelSettings.width : 40} labelHeightMm={labelSettings.unit === 'mm' ? labelSettings.height : 25} />
                            </div>
                          </div>
                          <div className="px-2 py-1 text-xs font-medium bg-white dark:bg-slate-950 flex items-center justify-between">
                            {t.style_name}
                            {groupSelectedId === t.id && <Check size={12} className="text-blue-500" />}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setViewingTemplate({ template: t, printerSize: 'label', channel: groupChannelKey }); }}
                          className="absolute top-1 right-1 bg-white dark:bg-slate-900 rounded-full p-1 shadow border border-slate-200 dark:border-slate-700"
                          title="View full size"
                        >
                          <Eye size={12} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => toast.info('Custom Template Builder is coming in the next step.')}
                      className="border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1 text-xs text-slate-500 h-[123px]"
                    >
                      <Plus size={18} />
                      Create Custom Template
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <h3 className="font-bold text-slate-800 dark:text-slate-200 pt-2">Barcode Label Roll Size</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Set this to match the label roll loaded in your barcode/label printer.</p>
          <div className="space-y-2 max-w-md">
            {sizePresets.map(preset => (
              <div key={preset.id} className="flex items-center justify-between gap-2 p-2 border rounded-lg bg-white dark:bg-slate-950">
                <div className="text-sm">
                  <span className="font-medium">{preset.preset_name}</span>
                  <span className="text-slate-500 ml-2">{preset.width}x{preset.height}{preset.unit}</span>
                  {preset.is_default && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Default</span>}
                </div>
                <div className="flex gap-1">
                  {!preset.is_default && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleSetDefaultPreset(preset.id)}>Set Default</Button>
                  )}
                  <Button size="sm" variant="outline" className="h-7 text-xs text-red-600" onClick={() => handleDeletePreset(preset.id)}>Delete</Button>
                </div>
              </div>
            ))}

            {showAddPreset ? (
              <div className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-900 space-y-2">
                <Input placeholder="Size name (e.g. Small Roll)" value={newPresetName} onChange={e => setNewPresetName(e.target.value)} />
                <div className="flex items-end gap-2">
                  <div className="space-y-1">
                    <label className="text-xs">Width</label>
                    <Input type="number" min={1} step="0.1" className="w-20" value={newPresetWidth} onChange={e => setNewPresetWidth(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs">Height</label>
                    <Input type="number" min={1} step="0.1" className="w-20" value={newPresetHeight} onChange={e => setNewPresetHeight(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs">Unit</label>
                    <select className="border rounded-md h-9 px-2 text-sm bg-white dark:bg-slate-950" value={newPresetUnit} onChange={e => setNewPresetUnit(e.target.value as 'mm' | 'cm' | 'in')}>
                      <option value="mm">mm</option>
                      <option value="cm">cm</option>
                      <option value="in">inch</option>
                    </select>
                  </div>
                  <Button onClick={handleAddPreset}>Save</Button>
                  <Button variant="outline" onClick={() => setShowAddPreset(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setShowAddPreset(true)}>+ Add Custom Size</Button>
            )}
          </div>
        </div>

        <div className="pt-6 mt-6 border-t space-y-4">
          <h3 className="font-bold text-slate-800 dark:text-slate-200">Branding</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Control what business identity elements appear on your printed bills.</p>

          <div className="flex items-center gap-4">
            {brandingSettings.stamp_url && (
              <img src={brandingSettings.stamp_url} alt="Stamp" className="h-16 w-16 object-contain border rounded-lg bg-white" />
            )}
            <div>
              <input type="file" accept="image/*" ref={stampInputRef} className="hidden" onChange={handleStampUpload} />
              <Button variant="outline" onClick={() => stampInputRef.current?.click()}>
                {brandingSettings.stamp_url ? 'Change Stamp/Signature Image' : 'Upload Stamp/Signature Image'}
              </Button>
              <p className="text-xs text-slate-500 mt-1">Appears near the signature area on printed bills.</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={brandingSettings.show_branch_name !== false}
                onChange={e => handleToggleBranding('show_branch_name', e.target.checked)}
              />
              Show Branch Name on Bill
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={brandingSettings.show_branch_address !== false}
                onChange={e => handleToggleBranding('show_branch_address', e.target.checked)}
              />
              Show Branch Address on Bill
            </label>
          </div>

          <div className="space-y-2 pt-3 border-t">
            <label className="text-sm font-medium">Bill Number Code (on printed bill)</label>
            <div className="flex gap-4 text-sm">
              {(['none', 'barcode', 'qr', 'both'] as const).map(ct => (
                <label key={ct} className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="billNumberCodeType"
                    checked={(brandingSettings.bill_number_code_type || 'none') === ct}
                    onChange={() => handleToggleBranding('bill_number_code_type' as any, ct as any)}
                  />
                  {ct === 'none' ? 'None' : ct === 'barcode' ? 'Barcode' : ct === 'qr' ? 'QR Code' : 'Both'}
                </label>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={brandingSettings.show_upi_qr_on_credit === true}
                onChange={e => handleToggleBranding('show_upi_qr_on_credit' as any, e.target.checked as any)}
              />
              Show UPI Payment QR on Credit bills
            </label>
          </div>

          {brandingSettings.show_upi_qr_on_credit && (
            <div className="space-y-2 pl-6">
              <label className="text-sm font-medium">Payment QR Source</label>
              <div className="flex flex-col gap-2 text-sm">
                <label className="flex items-start gap-2">
                  <input
                    type="radio"
                    name="creditQrProvider"
                    checked={(brandingSettings.credit_qr_provider || 'razorpay') === 'razorpay'}
                    onChange={() => handleToggleBranding('credit_qr_provider' as any, 'razorpay' as any)}
                  />
                  <span>
                    <span className="font-medium">Use Razorpay QR (Recommended)</span>
                    <br />
                    <span className="text-xs text-slate-500">Payment is tracked automatically and the bill marks itself Paid once received.</span>
                  </span>
                </label>
                <label className="flex items-start gap-2">
                  <input
                    type="radio"
                    name="creditQrProvider"
                    checked={brandingSettings.credit_qr_provider === 'custom_upi'}
                    onChange={() => handleToggleBranding('credit_qr_provider' as any, 'custom_upi' as any)}
                  />
                  <span>
                    <span className="font-medium">Use my own UPI ID</span>
                    <br />
                    <span className="text-xs text-slate-500">Uses the UPI ID set in Branch Settings. Payment is NOT tracked automatically — you'll need to mark the bill Paid manually after confirming payment yourself.</span>
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
      {viewingTemplate && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4" onClick={() => setViewingTemplate(null)}>
          <div className="bg-white dark:bg-slate-950 rounded-xl max-w-[95vw] max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-3 border-b sticky top-0 bg-white dark:bg-slate-950 z-10">
              <span className="font-semibold text-sm">{viewingTemplate.template.style_name} — {viewingTemplate.printerSize}</span>
              <button onClick={() => setViewingTemplate(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                <X size={18} />
              </button>
            </div>
            {viewingTemplate.channel?.startsWith('barcode_label') ? (
              <BillPreview blocks={viewingTemplate.template.blocks} printerSize="label" labelData={sampleLabelData} labelWidthMm={labelSettings.width} labelHeightMm={labelSettings.height} />
            ) : (
              <BillPreview blocks={viewingTemplate.template.blocks} data={getSampleBillData(viewingTemplate.channel || 'sale_invoice')} printerSize={viewingTemplate.printerSize} />
            )}
          </div>
        </div>
      )}
    </>
  );
}
