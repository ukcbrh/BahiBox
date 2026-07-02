import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Plus, Tag, Trash2, Edit2 } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { getSupabaseClient } from '../../lib/supabase';
import { toast } from 'sonner';

export function RetailDiscountsOffers() {
  const { tenant } = useTenant();
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form state
  const [ruleName, setRuleName] = useState('');
  const [discountType, setDiscountType] = useState('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [appliesTo, setAppliesTo] = useState('all');

  const fetchRules = async () => {
    if (!tenant) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase
      .from('discount_rules')
      .select('*')
      .eq('tenant_id', tenant.id);
    if (data) setRules(data);
  };

  useEffect(() => {
    fetchRules();
  }, [tenant]);

  const handleCreateRule = async () => {
    if (!tenant || !ruleName || !discountValue) return;
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) return;
    
    const { error } = await supabase.from('discount_rules').insert({
      tenant_id: tenant.id,
      rule_name: ruleName,
      discount_type: discountType,
      discount_value: parseFloat(discountValue),
      applies_to: appliesTo,
      is_active: true
    });
    
    setLoading(false);
    if (error) {
      toast.error('Failed to create discount rule');
    } else {
      toast.success('Discount rule created');
      setShowAddForm(false);
      setRuleName('');
      setDiscountValue('');
      fetchRules();
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Delete this rule?')) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from('discount_rules').delete().eq('id', id);
    if (error) toast.error('Failed to delete rule');
    else {
      toast.success('Rule deleted');
      fetchRules();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Discounts & Offers</h2>
          <p className="text-slate-500">Configure retail promotions using the Smart Discount Engine.</p>
        </div>
        <Button onClick={() => setShowAddForm(true)}><Plus size={16} className="mr-2" /> Create Rule</Button>
      </div>
      
      {showAddForm && (
        <Card className="mb-6 shadow-sm border-none bg-white">
          <CardHeader>
            <CardTitle className="text-lg">New Discount Rule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Rule Name</label>
                <Input value={ruleName} onChange={e => setRuleName(e.target.value)} placeholder="Summer Sale" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Applies To</label>
                <Select value={appliesTo} onValueChange={setAppliesTo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Entire Store</SelectItem>
                    <SelectItem value="category">Specific Category</SelectItem>
                    <SelectItem value="product">Specific Product</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Discount Type</label>
                <Select value={discountType} onValueChange={setDiscountType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Discount Value</label>
                <Input type="number" value={discountValue} onChange={e => setDiscountValue(e.target.value)} placeholder="10" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
              <Button onClick={handleCreateRule} disabled={loading}>{loading ? 'Saving...' : 'Save Rule'}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {rules.length === 0 && !showAddForm ? (
        <Card className="border-none shadow-sm bg-white p-12 text-center">
          <Tag className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No Active Offers</h3>
          <p className="text-slate-500 mt-2 max-w-md mx-auto">Set up percentage or fixed discount rules that automatically apply during billing.</p>
          <Button className="mt-6" onClick={() => setShowAddForm(true)}><Plus size={16} className="mr-2" /> Create Rule</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rules.map(rule => (
            <Card key={rule.id} className="border-none shadow-sm bg-white">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900">{rule.rule_name}</h3>
                    <p className="text-sm text-slate-500 capitalize">Applies to: {rule.applies_to}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Edit2 size={14}/></Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-600" onClick={() => handleDeleteRule(rule.id)}><Trash2 size={14}/></Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-primary">
                    {rule.discount_type === 'fixed' ? '₹' : ''}{rule.discount_value}{rule.discount_type === 'percent' ? '%' : ''}
                  </span>
                  <span className="text-sm font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">OFF</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
