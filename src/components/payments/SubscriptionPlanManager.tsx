import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Plus, Edit, Check, Settings, X, Tag, Save, Trash2, Ticket } from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabase';
import PlanFeatureMatrix from '../superadmin/PlanFeatureMatrix';



interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  applicableModule: string;
  applicablePlan: string;
  isActive: boolean;
}

const DEFAULT_AVAILABLE_MODULES = [
  'Retail POS',
  'Daily Services',
  'Education Management',
  'Healthcare & Hospital',
  'Hotel & Restaurant (Hospitality)',
  'Manufacturing',
  'Transport & Logistics',
  'Agriculture & Farming'
];
            
export const DEFAULT_PLANS: Plan[] = [
    {
        id: '688b05e3-0bc5-4a0f-b478-70a0466ea4d8',
        moduleName: 'Retail POS',
        tier: 'Free',
        name: 'Starter Plan',
        priceMonthly: 0,
        priceYearly: 0,
        commission: 5,
        features: [
            'Basic Features',
            'Daily Reports',
            'Standard Support'
        ],
        isActive: true,
        whiteLabel: false
    },
    {
        id: '4f470680-68e5-4865-a8b1-f0417a67a26a',
        moduleName: 'Retail POS',
        tier: 'Premium',
        name: 'Growth Plan',
        priceMonthly: 999,
        priceYearly: 9999,
        commission: 2,
        features: [
            'Advanced Features',
            'Unlimited Usage',
            'Priority Support'
        ],
        isActive: true,
        whiteLabel: false
    },
    {
        id: '5e7aaf10-e60d-4155-b4c3-6c97b143e5d2',
        moduleName: 'Retail POS',
        tier: 'Enterprise',
        name: 'White-Label Pro',
        priceMonthly: 4999,
        priceYearly: 49999,
        commission: 1,
        features: [
            'White-label App',
            'Dedicated Manager',
            'Custom Domain'
        ],
        isActive: true,
        whiteLabel: true
    },
    {
        id: '0e09a174-1238-4aba-8800-03868869cc30',
        moduleName: 'Daily Services',
        tier: 'Free',
        name: 'Starter Plan',
        priceMonthly: 0,
        priceYearly: 0,
        commission: 5,
        features: [
            'Basic Features',
            'Daily Reports',
            'Standard Support'
        ],
        isActive: true,
        whiteLabel: false
    },
    {
        id: 'a8d64deb-be3d-4235-86e0-d27116dab37f',
        moduleName: 'Daily Services',
        tier: 'Premium',
        name: 'Growth Plan',
        priceMonthly: 999,
        priceYearly: 9999,
        commission: 2,
        features: [
            'Advanced Features',
            'Unlimited Usage',
            'Priority Support'
        ],
        isActive: true,
        whiteLabel: false
    },
    {
        id: 'fb22381c-2765-4c74-a5ed-ff497313b5d2',
        moduleName: 'Daily Services',
        tier: 'Enterprise',
        name: 'White-Label Pro',
        priceMonthly: 4999,
        priceYearly: 49999,
        commission: 1,
        features: [
            'White-label App',
            'Dedicated Manager',
            'Custom Domain'
        ],
        isActive: true,
        whiteLabel: true
    },
    {
        id: '10907883-46e5-46cd-9fd2-563cdded40c8',
        moduleName: 'Education',
        tier: 'Free',
        name: 'Starter Plan',
        priceMonthly: 0,
        priceYearly: 0,
        commission: 5,
        features: [
            'Basic Features',
            'Daily Reports',
            'Standard Support'
        ],
        isActive: true,
        whiteLabel: false
    },
    {
        id: '3f1fb66e-295a-49ff-bc90-54d306c309ed',
        moduleName: 'Education',
        tier: 'Premium',
        name: 'Growth Plan',
        priceMonthly: 999,
        priceYearly: 9999,
        commission: 2,
        features: [
            'Advanced Features',
            'Unlimited Usage',
            'Priority Support'
        ],
        isActive: true,
        whiteLabel: false
    },
    {
        id: 'f7311628-c167-48e0-8707-4c3a53f2269a',
        moduleName: 'Education',
        tier: 'Enterprise',
        name: 'White-Label Pro',
        priceMonthly: 4999,
        priceYearly: 49999,
        commission: 1,
        features: [
            'White-label App',
            'Dedicated Manager',
            'Custom Domain'
        ],
        isActive: true,
        whiteLabel: true
    },
    {
        id: '8315c4b6-10ad-48ec-aca7-76d3b83030ee',
        moduleName: 'Health Care',
        tier: 'Free',
        name: 'Starter Plan',
        priceMonthly: 0,
        priceYearly: 0,
        commission: 5,
        features: [
            'Basic Features',
            'Daily Reports',
            'Standard Support'
        ],
        isActive: true,
        whiteLabel: false
    },
    {
        id: '86bab8fa-45b5-412f-bc00-de5647b6009c',
        moduleName: 'Health Care',
        tier: 'Premium',
        name: 'Growth Plan',
        priceMonthly: 999,
        priceYearly: 9999,
        commission: 2,
        features: [
            'Advanced Features',
            'Unlimited Usage',
            'Priority Support'
        ],
        isActive: true,
        whiteLabel: false
    },
    {
        id: 'fb7e5e58-e3eb-477f-8142-3ef5aca6f623',
        moduleName: 'Health Care',
        tier: 'Enterprise',
        name: 'White-Label Pro',
        priceMonthly: 4999,
        priceYearly: 49999,
        commission: 1,
        features: [
            'White-label App',
            'Dedicated Manager',
            'Custom Domain'
        ],
        isActive: true,
        whiteLabel: true
    },
    {
        id: '7426f1d3-e79d-4e3e-a0cc-58aee4063bfd',
        moduleName: 'Hotel/Restaurant',
        tier: 'Free',
        name: 'Starter Plan',
        priceMonthly: 0,
        priceYearly: 0,
        commission: 5,
        features: [
            'Basic Features',
            'Daily Reports',
            'Standard Support'
        ],
        isActive: true,
        whiteLabel: false
    },
    {
        id: 'bff901e0-cc2f-4d4c-87a4-ada4500f938a',
        moduleName: 'Hotel/Restaurant',
        tier: 'Premium',
        name: 'Growth Plan',
        priceMonthly: 999,
        priceYearly: 9999,
        commission: 2,
        features: [
            'Advanced Features',
            'Unlimited Usage',
            'Priority Support'
        ],
        isActive: true,
        whiteLabel: false
    },
    {
        id: 'aa420e53-9cd2-4b80-af1f-3a54bad5ac1d',
        moduleName: 'Hotel/Restaurant',
        tier: 'Enterprise',
        name: 'White-Label Pro',
        priceMonthly: 4999,
        priceYearly: 49999,
        commission: 1,
        features: [
            'White-label App',
            'Dedicated Manager',
            'Custom Domain'
        ],
        isActive: true,
        whiteLabel: true
    },
    {
        id: 'c92c459b-0218-4c7e-b4b7-0dffac7670d8',
        moduleName: 'Manufacturing ERP',
        tier: 'Free',
        name: 'Starter Plan',
        priceMonthly: 0,
        priceYearly: 0,
        commission: 5,
        features: [
            'Basic Features',
            'Daily Reports',
            'Standard Support'
        ],
        isActive: true,
        whiteLabel: false
    },
    {
        id: 'e6fb48d5-bf35-467e-bc88-ce86a08dfb5f',
        moduleName: 'Manufacturing ERP',
        tier: 'Premium',
        name: 'Growth Plan',
        priceMonthly: 999,
        priceYearly: 9999,
        commission: 2,
        features: [
            'Advanced Features',
            'Unlimited Usage',
            'Priority Support'
        ],
        isActive: true,
        whiteLabel: false
    },
    {
        id: '215b8d0f-d262-4b7c-9432-235d014256cb',
        moduleName: 'Manufacturing ERP',
        tier: 'Enterprise',
        name: 'White-Label Pro',
        priceMonthly: 4999,
        priceYearly: 49999,
        commission: 1,
        features: [
            'White-label App',
            'Dedicated Manager',
            'Custom Domain'
        ],
        isActive: true,
        whiteLabel: true
    },
    {
        id: 'c2852ff1-13be-49d6-ad46-9e7d7e40aff7',
        moduleName: 'Transport Management',
        tier: 'Free',
        name: 'Starter Plan',
        priceMonthly: 0,
        priceYearly: 0,
        commission: 5,
        features: [
            'Basic Features',
            'Daily Reports',
            'Standard Support'
        ],
        isActive: true,
        whiteLabel: false
    },
    {
        id: 'f191c96d-dfba-48fe-89fc-9a4e53367331',
        moduleName: 'Transport Management',
        tier: 'Premium',
        name: 'Growth Plan',
        priceMonthly: 999,
        priceYearly: 9999,
        commission: 2,
        features: [
            'Advanced Features',
            'Unlimited Usage',
            'Priority Support'
        ],
        isActive: true,
        whiteLabel: false
    },
    {
        id: 'e1dfb5db-4cb3-4dd9-9a22-4416874bfdf4',
        moduleName: 'Transport Management',
        tier: 'Enterprise',
        name: 'White-Label Pro',
        priceMonthly: 4999,
        priceYearly: 49999,
        commission: 1,
        features: [
            'White-label App',
            'Dedicated Manager',
            'Custom Domain'
        ],
        isActive: true,
        whiteLabel: true
    },
    {
        id: '520aae39-1c7d-4252-8592-64b662baab74',
        moduleName: 'Agri Management',
        tier: 'Free',
        name: 'Starter Plan',
        priceMonthly: 0,
        priceYearly: 0,
        commission: 5,
        features: [
            'Basic Features',
            'Daily Reports',
            'Standard Support'
        ],
        isActive: true,
        whiteLabel: false
    },
    {
        id: '84b5b383-ec89-49e3-b877-d2686a001fc7',
        moduleName: 'Agri Management',
        tier: 'Premium',
        name: 'Growth Plan',
        priceMonthly: 999,
        priceYearly: 9999,
        commission: 2,
        features: [
            'Advanced Features',
            'Unlimited Usage',
            'Priority Support'
        ],
        isActive: true,
        whiteLabel: false
    },
    {
        id: '1523d701-a3b6-4967-9932-c30378d65130',
        moduleName: 'Agri Management',
        tier: 'Enterprise',
        name: 'White-Label Pro',
        priceMonthly: 4999,
        priceYearly: 49999,
        commission: 1,
        features: [
            'White-label App',
            'Dedicated Manager',
            'Custom Domain'
        ],
        isActive: true,
        whiteLabel: true
    }
];

export interface Plan {
  id: string;
  moduleName: string;
  tier: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  commission: number;
  features: string[];
  isActive: boolean;
  whiteLabel: boolean;
}

export function SubscriptionPlanManager() {
  const [availableModules, setAvailableModules] = useState<string[]>(DEFAULT_AVAILABLE_MODULES);
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS);

  const [coupons, setCoupons] = useState<Coupon[]>([
    { id: 'cf41d728-907c-4187-9336-50eea8e8c4a8', code: 'LAUNCH50', discountType: 'percentage', discountValue: 50, isActive: true, applicableModule: "all", applicablePlan: "all" },
  ]);

  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isAddingPlan, setIsAddingPlan] = useState(false);
  const [newFeatureText, setNewFeatureText] = useState('');
  const [planCycles, setPlanCycles] = useState<Record<string, string>>({});
  
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [isAddingCoupon, setIsAddingCoupon] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);
  const [couponToDelete, setCouponToDelete] = useState<string | null>(null);

  const fetchPlans = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      
      const { data: modsData } = await supabase.from('modules_master').select('name');
      if (modsData && modsData.length > 0) {
         setAvailableModules(modsData.map((m: any) => m.name));
      }

      // Fetch plans from DB
      const { data: plansData, error: plansErr } = await supabase.from('subscription_plans').select('*');
      if (plansData && plansData.length > 0) {
        setPlans(plansData.map((p: any) => ({
          id: p.id,
          moduleName: p.module_name,
          tier: p.tier,
          name: p.name,
          priceMonthly: p.price_monthly,
          priceYearly: p.price_yearly,
          commission: p.commission,
          features: p.features || [],
          isActive: p.is_active,
          whiteLabel: p.white_label
        })));
      } else {
        // Fallback to local defaults if DB is empty, but push to DB so they exist
        setPlans(currentPlans => {
          const pushDefaults = async () => {
            for (const p of currentPlans) {
              await supabase.from('subscription_plans').upsert({
                id: p.id,
                module_name: p.moduleName,
                tier: p.tier,
                name: p.name,
                price_monthly: p.priceMonthly,
                price_yearly: p.priceYearly,
                commission: p.commission,
                features: p.features,
                is_active: p.isActive,
                white_label: p.whiteLabel
              }, { onConflict: 'id' });
            }
          };
          pushDefaults();
          return currentPlans;
        });
      }

      // Fetch coupons from DB
      const { data: couponsData } = await supabase.from('promo_codes').select('*');
      if (couponsData && couponsData.length > 0) {
        setCoupons(couponsData.map((c: any) => ({
          id: c.id,
          code: c.code,
          discountType: c.discount_type || (c.discount_percentage ? 'percentage' : 'fixed'),
          discountValue: c.discount_value || c.discount_percentage || c.fixed_discount || 0,
          applicableModule: c.applicable_module || 'All',
          applicablePlan: c.applicable_plan || 'All',
          isActive: c.is_active
        })));
      } else {
        setCoupons(currentCoupons => {
          const pushDefaults = async () => {
            for (const c of currentCoupons) {
              await supabase.from('promo_codes').upsert({
                id: c.id,
                code: c.code,
                discount_type: c.discountType,
                discount_value: c.discountValue,
                applicable_module: c.applicableModule,
                applicable_plan: c.applicablePlan,
                is_active: c.isActive
              }, { onConflict: 'id' });
            }
          };
          pushDefaults();
          return currentCoupons;
        });
      }
    };

  useEffect(() => {
    fetchPlans();
  }, []);

  const saveAllPlans = async (newPlans?: Plan[]) => {
    const p = newPlans || plans;
    localStorage.setItem('admin_subscription_plans_v2', JSON.stringify(p));
    
    const supabase = getSupabaseClient();
    if (supabase) {
      for (const plan of p) {
        await supabase.from('subscription_plans').upsert({
          id: plan.id,
          module_name: plan.moduleName,
          tier: plan.tier,
          name: plan.name,
          price_monthly: plan.priceMonthly,
          price_yearly: plan.priceYearly,
          commission: plan.commission,
          features: plan.features,
          is_active: plan.isActive,
          white_label: plan.whiteLabel
        }, { onConflict: 'id' });
      }
    }
    
    alert('All plans saved successfully!');
  };

  const saveAllCoupons = async (newCoupons?: Coupon[], editedCoupon?: Coupon, isAdding?: boolean) => {
    const c = newCoupons || coupons;
    localStorage.setItem('admin_subscription_coupons', JSON.stringify(c));
    const supabase = getSupabaseClient();
    if (supabase && editedCoupon) {
      const { error: dbErr } = await supabase.from('promo_codes').upsert({
        id: editedCoupon.id,
        code: editedCoupon.code,
        discount_type: editedCoupon.discountType,
        discount_value: editedCoupon.discountValue,
        applicable_module: editedCoupon.applicableModule,
        applicable_plan: editedCoupon.applicablePlan,
        is_active: editedCoupon.isActive
      }, { onConflict: 'id' });
      if (dbErr) console.error("Supabase upsert error promo:", dbErr);
    }
  };

  const handleSavePlan = () => {
    if (editingPlan) {
      let updatedPlans;
      if (isAddingPlan) {
        updatedPlans = [...plans, editingPlan];
      } else {
        updatedPlans = plans.map((p: any) => p.id === editingPlan.id ? editingPlan : p);
      }
      setPlans(updatedPlans);
      setEditingPlan(null);
      setIsAddingPlan(false);
      
      // Also save to Supabase
      const saveToDb = async () => {
        const supabase = getSupabaseClient();
        if (supabase) {
          const { error: dbErr } = await supabase.from('subscription_plans').upsert({
            id: editingPlan.id,
            module_name: editingPlan.moduleName,
            tier: editingPlan.tier,
            name: editingPlan.name,
            price_monthly: editingPlan.priceMonthly,
            price_yearly: editingPlan.priceYearly,
            commission: editingPlan.commission,
            features: editingPlan.features,
            is_active: editingPlan.isActive,
            white_label: editingPlan.whiteLabel
          }, { onConflict: 'id' });
          if (dbErr) console.error("Supabase upsert error:", dbErr);
        }
      };
      saveToDb();

    }
  };

  const handleAddPlan = () => {
    const newPlan: Plan = {
      id: crypto.randomUUID(),
      moduleName: availableModules[0] || 'Unknown',
      tier: 'New Tier',
      name: 'New Plan',
      priceMonthly: 0,
      priceYearly: 0,
      commission: 0,
      features: [],
      isActive: true,
      whiteLabel: false
    };
    setEditingPlan(newPlan);
    setIsAddingPlan(true);
    setNewFeatureText('');
  };
  
  const addFeature = () => {
    if (newFeatureText.trim() && editingPlan) {
      setEditingPlan({
        ...editingPlan,
        features: [...(editingPlan.features || []), newFeatureText.trim()]
      });
      setNewFeatureText('');
    }
  };
  
  const removeFeature = (idx: number) => {
    if (editingPlan && editingPlan.features) {
      setEditingPlan({
        ...editingPlan,
        features: editingPlan.features.filter((_, i) => i !== idx)
      });
    }
  };

  const handleSaveCoupon = () => {
    if (editingCoupon) {
      let updatedCoupons;
      if (isAddingCoupon) {
        updatedCoupons = [...coupons, editingCoupon];
      } else {
        updatedCoupons = coupons.map((c: any) => c.id === editingCoupon.id ? editingCoupon : c);
      }
      setCoupons(updatedCoupons);
      setEditingCoupon(null);
      setIsAddingCoupon(false);
      saveAllCoupons(updatedCoupons, editingCoupon, isAddingCoupon);
    }
  };

  const handleDeletePlan = async (id: string) => {
    const updated = plans.filter((p: any) => p.id !== id);
    setPlans(updated);
    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase.from('subscription_plans').delete().eq('id', id);
      if (error) {
        console.error("Failed to delete plan:", error);
      }
    } else {
      localStorage.setItem('admin_subscription_plans_v2', JSON.stringify(updated));
    }
  };

  const handleTogglePlanActive = async (plan: Plan) => {
    const updatedPlan = { ...plan, isActive: !plan.isActive };
    const updatedPlans = plans.map((p: any) => p.id === plan.id ? updatedPlan : p);
    setPlans(updatedPlans);
    
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from('subscription_plans').update({ is_active: updatedPlan.isActive }).eq('id', plan.id);
    }
  };
  
  const handleDeleteCoupon = async (id: string) => {
    const updated = coupons.filter((c: any) => c.id !== id);
    setCoupons(updated);
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from('promo_codes').delete().eq('id', id);
    }
  };
  
  // Group plans by module name
  const groupedPlans = plans.reduce((acc, plan) => {
    if (!acc[plan.moduleName]) {
      acc[plan.moduleName] = [];
    }
    acc[plan.moduleName].push(plan);
    return acc;
  }, {} as Record<string, Plan[]>);

  return (
    <div className="space-y-10">
      {/* Plans Section */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold dark:text-white">Subscription Plan Manager</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Configure billing tiers, modules, and commissions for merchants.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => saveAllPlans()} variant="outline" className="gap-2 border-primary text-primary hover:bg-primary/5">
              <Save size={16}/> Save All Plans
            </Button>
            <Button onClick={handleAddPlan} className="gap-2"><Plus size={16}/> Add New Plan</Button>
          </div>
        </div>

        {editingPlan && (
          <Card className="border-primary shadow-lg border-2">
            <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b">
              <div className="flex justify-between items-center">
                <CardTitle>{isAddingPlan ? 'Create New Plan' : 'Edit Plan'}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => { setEditingPlan(null); setIsAddingPlan(false); }}>
                  <X size={18} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Module</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={editingPlan.moduleName} 
                    onChange={e => setEditingPlan({...editingPlan, moduleName: e.target.value})}
                  >
                    {availableModules.map(mod => (
                      <option key={mod} value={mod}>{mod}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Plan Name (e.g. Star Plan, Growth Plan, White-Label Pro)</label>
                  <Input value={editingPlan.name} onChange={e => setEditingPlan({...editingPlan, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tier Label (e.g. Premium, Enterprise)</label>
                  <Input value={editingPlan.tier} onChange={e => setEditingPlan({...editingPlan, tier: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Monthly Price (₹)</label>
                  <Input type="number" value={editingPlan.priceMonthly} onChange={e => setEditingPlan({...editingPlan, priceMonthly: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Yearly Price (₹)</label>
                  <Input type="number" value={editingPlan.priceYearly} onChange={e => setEditingPlan({...editingPlan, priceYearly: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Platform Commission (%)</label>
                  <Input type="number" step="0.1" value={editingPlan.commission} onChange={e => setEditingPlan({...editingPlan, commission: Number(e.target.value)})} />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Active Status</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Is this plan visible to users?</p>
                  </div>
                  <input type="checkbox" className="w-5 h-5" checked={editingPlan.isActive} onChange={e => setEditingPlan({...editingPlan, isActive: e.target.checked})} />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">White-Label Access</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Allow Bring Your Own Keys (BYOK)?</p>
                  </div>
                  <input type="checkbox" className="w-5 h-5" checked={editingPlan.whiteLabel} onChange={e => setEditingPlan({...editingPlan, whiteLabel: e.target.checked})} />
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <label className="text-sm font-medium">Module Features</label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Enter a feature..." 
                    value={newFeatureText} 
                    onChange={e => setNewFeatureText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFeature(); } }}
                  />
                  <Button type="button" onClick={addFeature} variant="secondary">Add</Button>
                </div>
                {editingPlan.features && editingPlan.features.length > 0 && (
                  <ul className="space-y-2 mt-4">
                    {editingPlan.features.map((feat, idx) => (
                      <li key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded-md border text-sm">
                        <span>{feat}</span>
                        <button type="button" onClick={() => removeFeature(idx)} className="text-slate-400 hover:text-red-500">
                          <X size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => { setEditingPlan(null); setIsAddingPlan(false); }}>Cancel</Button>
                <Button onClick={handleSavePlan} className="gap-2"><Save size={16}/> {isAddingPlan ? 'Create Plan' : 'Save Changes'}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!editingPlan && (
          <div className="space-y-10">
            {Object.keys(groupedPlans).length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed rounded-xl text-slate-500 dark:text-slate-400">
                No plans found. Create one to get started.
              </div>
            ) : (
              Object.keys(groupedPlans).map(moduleName => (
                <div key={moduleName} className="space-y-4">
                  <h3 className="text-lg font-bold border-b pb-2 text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Settings size={20} className="text-slate-500 dark:text-slate-400" />
                    {moduleName} Module Plans
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {groupedPlans[moduleName].map(plan => {
                      const cycle = planCycles[plan.id] || 'Month';
                      const displayPrice = cycle === 'Two Years' ? (plan.priceYearly || 0) * 2 : (cycle === 'One Year' ? (plan.priceYearly || 0) : (plan.priceMonthly || 0));
                      return (
                      <Card key={plan.id} className={`border ${plan.isActive ? 'border-slate-200 dark:border-slate-800' : 'border-slate-200 dark:border-slate-800 opacity-75'} shadow-sm hover:shadow-md transition-shadow dark:bg-slate-900 relative overflow-hidden flex flex-col`}>
                        {!plan.isActive && (
                          <div className="absolute top-4 right-4 text-xs font-semibold px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full">Inactive</div>
                        )}
                        <CardHeader className="pb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Tag size={18} className="text-primary" />
                            <span className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{plan.tier}</span>
                          </div>
                          <CardTitle className="text-2xl">{plan.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-3xl font-extrabold">₹{displayPrice.toLocaleString()}</span>
                            <div className="w-24">
                              <select 
                                value={cycle} 
                                onChange={(e) => setPlanCycles({...planCycles, [plan.id]: e.target.value})}
                                className="h-8 text-sm font-medium bg-slate-50 dark:bg-slate-900 border-0 focus:ring-0 text-slate-600 dark:text-slate-400 rounded px-2"
                              >
                                <option value="Month">Month</option>
                                <option value="One Year">One Year</option>
                                <option value="Two Years">Two Years</option>
                              </select>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4 flex-1 flex flex-col">
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500 dark:text-slate-400">Platform Commission</span>
                              <span className="font-semibold">{plan.commission}%</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500 dark:text-slate-400">White-Label</span>
                              <span className="font-semibold flex items-center gap-1">
                                {plan.whiteLabel ? <Check size={14} className="text-green-600"/> : <X size={14} className="text-slate-400"/>}
                                {plan.whiteLabel ? 'Allowed' : 'Not Allowed'}
                              </span>
                            </div>
                          </div>
                          <div className="pt-4 border-t dark:border-slate-800 flex-1">
                            <p className="text-sm font-semibold mb-2">Features ({plan.features?.length || 0}):</p>
                            <ul className="space-y-2 mb-4">
                              {plan.features?.map((feat, idx) => (
                                <li key={idx} className="text-sm flex items-start gap-2 text-slate-600 dark:text-slate-400">
                                  <Check size={14} className="text-primary mt-1 shrink-0" />
                                  <span>{feat}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="pt-4 mt-auto flex flex-wrap gap-2">
                            <Button variant="outline" className="flex-1 gap-2 text-xs" onClick={() => handleTogglePlanActive(plan)}>
                              {plan.isActive ? <X size={14} className="text-red-500" /> : <Check size={14} className="text-green-500" />} 
                              {plan.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button variant="outline" className="flex-1 gap-2 text-xs" onClick={() => { setIsAddingPlan(false); setEditingPlan({...plan}); setNewFeatureText(''); }}>
                              <Edit size={14}/> Edit
                            </Button>
                            <Button variant="outline" className="flex-1 gap-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setPlanToDelete(plan.id)}>
                              <Trash2 size={14}/> Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )})}
                  </div>
                  <PlanFeatureMatrix moduleName={moduleName} onFeatureChanged={fetchPlans} />
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Coupons & Discounts Section */}
      <div className="space-y-6 pt-10 border-t">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold dark:text-white">Coupons & Discounts</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Manage promotional codes for subscriptions.</p>
          </div>
          <Button onClick={() => { setIsAddingCoupon(true); setEditingCoupon({ id: crypto.randomUUID(), code: '', discountType: 'percentage', discountValue: 0, applicableModule: 'All', applicablePlan: 'All', isActive: true }); }} className="gap-2 bg-slate-800 hover:bg-slate-900"><Plus size={16}/> Add Coupon</Button>
        </div>

        {editingCoupon && (
           <Card className="border-slate-800 shadow-lg border-2 max-w-2xl">
            <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b">
              <div className="flex justify-between items-center">
                <CardTitle>{isAddingCoupon ? 'Create New Coupon' : 'Edit Coupon'}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => { setEditingCoupon(null); setIsAddingCoupon(false); }}>
                  <X size={18} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Coupon Code</label>
                  <Input placeholder="e.g. SUMMER50" className="uppercase" value={editingCoupon.code} onChange={e => setEditingCoupon({...editingCoupon, code: e.target.value.toUpperCase()})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Discount Type</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={editingCoupon.discountType} 
                    onChange={e => setEditingCoupon({...editingCoupon, discountType: e.target.value as 'percentage'|'fixed'})}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Discount Value</label>
                  <Input type="number" value={editingCoupon.discountValue} onChange={e => setEditingCoupon({...editingCoupon, discountValue: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Applicable Module</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    value={editingCoupon.applicableModule || 'All'} 
                    onChange={e => setEditingCoupon({...editingCoupon, applicableModule: e.target.value, applicablePlan: 'All'})}
                  >
                    <option value="All">All Modules</option>
                    {availableModules.map(mod => (
                      <option key={mod} value={mod}>{mod}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Applicable Plan</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    value={editingCoupon.applicablePlan || 'All'} 
                    onChange={e => setEditingCoupon({...editingCoupon, applicablePlan: e.target.value})}
                  >
                    <option value="All">All Plans</option>
                    {plans.filter((p: any) => editingCoupon.applicableModule === 'All' || p.moduleName === editingCoupon.applicableModule).map((p: any) => (
                      <option key={p.id} value={p.name}>{p.name} ({p.moduleName})</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Active Status</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Can users apply this?</p>
                  </div>
                  <input type="checkbox" className="w-5 h-5" checked={editingCoupon.isActive} onChange={e => setEditingCoupon({...editingCoupon, isActive: e.target.checked})} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => { setEditingCoupon(null); setIsAddingCoupon(false); }}>Cancel</Button>
                <Button onClick={handleSaveCoupon} className="gap-2 bg-slate-800 hover:bg-slate-900"><Save size={16}/> Save Coupon</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!editingCoupon && (
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {coupons.map(coupon => (
              <Card key={coupon.id} className={`border ${coupon.isActive ? 'border-slate-200 dark:border-slate-800' : 'border-slate-200 dark:border-slate-800 opacity-75 bg-slate-50 dark:bg-slate-900'}`}>
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <Ticket size={18} className="text-slate-600 dark:text-slate-400"/>
                      <span className="font-bold text-lg tracking-wide">{coupon.code}</span>
                    </div>
                    {!coupon.isActive && <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded">Inactive</span>}
                  </div>
                  <div className="mb-6">
                    <p className="text-2xl font-black text-slate-800 dark:text-slate-200">
                      {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`} <span className="text-sm font-medium text-slate-500 dark:text-slate-400">OFF</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => { setIsAddingCoupon(false); setEditingCoupon({...coupon}); }}>
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 px-2" onClick={() => setCouponToDelete(coupon.id)}>
                      <Trash2 size={14}/>
                    </Button>
                  </div>
                </CardContent>
                      </Card>
                    ))}
            
            {coupons.length === 0 && (
              <div className="col-span-full p-6 text-center border border-dashed rounded-xl text-slate-500 dark:text-slate-400">
                No active coupons. Create one to offer discounts.
              </div>
            )}
          </div>
        )}
      </div>
      
      {planToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-xl max-w-sm w-full">
            <h3 className="text-lg font-bold mb-2 dark:text-white">Confirm Deletion</h3>
            <p className="mb-6 text-slate-600 dark:text-slate-400">Are you sure you want to delete this plan? This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPlanToDelete(null)}>Cancel</Button>
              <Button className="bg-red-500 hover:bg-red-600 text-white" onClick={() => { handleDeletePlan(planToDelete); setPlanToDelete(null); }}>Delete Plan</Button>
            </div>
          </div>
        </div>
      )}

      {couponToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-xl max-w-sm w-full">
            <h3 className="text-lg font-bold mb-2 dark:text-white">Confirm Deletion</h3>
            <p className="mb-6 text-slate-600 dark:text-slate-400">Are you sure you want to delete this coupon? This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCouponToDelete(null)}>Cancel</Button>
              <Button className="bg-red-500 hover:bg-red-600 text-white" onClick={() => { handleDeleteCoupon(couponToDelete); setCouponToDelete(null); }}>Delete Coupon</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
