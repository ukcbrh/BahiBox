import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from "sonner";
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, AlertTriangle, 
  CreditCard, 
  Users, 
  BarChart3, 
  Settings, 
  Shield, 
  Ticket, 
  Bell, 
  Search, 
  Moon, 
  Sun, 
  Menu, 
  Download, 
  Edit, 
  Trash2, 
  Lock, KeyRound, 
  Unlock,
  Building2,
  Megaphone,
  X,
  UserCog,
  Eye,
  IndianRupee, Wallet, Globe, MessageSquare 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { Textarea } from '@/src/components/ui/textarea';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { fallbackModules } from '../data';
import { getSupabaseClient } from '../lib/supabase';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { NotificationEngineView } from '../components/NotificationEngineView';
import { PlatformRatesSettings } from '../components/superadmin/PlatformRatesSettings';
import MerchantProfileModal from '../components/superadmin/MerchantProfileModal';

import { SubscriptionPlanManager } from '../components/payments/SubscriptionPlanManager';
import UsageRateCardEditor from '../components/superadmin/UsageRateCardEditor';
import { PlatformPaymentsDashboard } from '../components/payments/PlatformPaymentsDashboard';
import { WalletAnalyticsView } from '../components/payments/WalletAnalyticsView';
import { WhiteLabelRequestsView } from '../components/WhiteLabelRequestsView';
import { WithdrawalRequestsView } from '../components/superadmin/WithdrawalRequestsView';
import { ConsumerDirectoryView } from '../components/payments/ConsumerDirectoryView';
import { ServiceProviderKYCView } from '../components/ServiceProviderKYCView';
import { MartSponsoredAdminView, FoodSponsoredAdminView } from '../components/superadmin/MartSponsoredAdminView';

// Mock Data
const revenueData = [
  { name: 'Mon', revenue: 4000 },
  { name: 'Tue', revenue: 3000 },
  { name: 'Wed', revenue: 2000 },
  { name: 'Thu', revenue: 2780 },
  { name: 'Fri', revenue: 1890 },
  { name: 'Sat', revenue: 2390 },
  { name: 'Sun', revenue: 3490 },
];

const modulePerformance = [
  { name: 'Retail', merchants: 400, users: 2400 },
  { name: 'Healthcare', merchants: 300, users: 1398 },
  { name: 'Education', merchants: 200, users: 9800 },
  { name: 'Manufacturing', merchants: 278, users: 3908 },
  { name: 'Hospitality', merchants: 189, users: 4800 },
  { name: 'Transport', merchants: 239, users: 3800 },
  { name: 'Agri', merchants: 349, users: 4300 },
];

const ticketsList = [
  { id: 'T-001', merchant: 'Sharma General Store', issue: 'Billing printer not syncing', priority: 'High', status: 'Open' },
  { id: 'T-002', merchant: 'City Hospital', issue: 'Need bulk bed update feature', priority: 'Medium', status: 'Pending' },
  { id: 'T-003', merchant: 'Raj Logistics', issue: 'Driver app crashing on Android 11', priority: 'High', status: 'Open' },
];

export default function SuperAdmin() {
  useDocumentTitle('BahiBox | Super Admin');
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [merchantsList, setMerchantsList] = useState<any[]>([]);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [merchantToDelete, setMerchantToDelete] = useState<any>(null);
  const [deleteCounts, setDeleteCounts] = useState<any>({});
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const [modulesMaster, setModulesMaster] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState({
    totalUsers: 0,
    activeMerchants: 0,
    systemHealth: 99.99,
    totalRevenue: 0
  });

  // States for sub-components
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  
  // Module Access Modal state
  const [selectedMerchantForModules, setSelectedMerchantForModules] = useState<any>(null);
  const [profileModalTenantId, setProfileModalTenantId] = useState<string | null>(null);
  const [merchantSubscriptions, setMerchantSubscriptions] = useState<any[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const [contactMessages, setContactMessages] = useState<any[]>([]);

  // Pricing State
  const [editingPrice, setEditingPrice] = useState<string>('999');
  const [testModeFree, setTestModeFree] = useState<boolean>(false);
  const [testModePro, setTestModePro] = useState<boolean>(false);
  const [testModeCustom, setTestModeCustom] = useState<boolean>(false);

  useEffect(() => {
    if (selectedModule) {
       const mod = modulesMaster.find((m: any) => m.id === selectedModule);
       if (mod) {
         setEditingPrice(mod.price?.toString() || '0');
         setTestModeFree(mod.test_mode_free || false);
         setTestModePro(mod.test_mode_pro || false);
         setTestModeCustom(mod.test_mode_custom || false);
       }
    }
  }, [selectedModule, modulesMaster]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const supabase = getSupabaseClient();
        if (!supabase) return;
        
        let users: any[] = [];
        
        // Sirf real, active tenant-owners lao (user_tenant_roles se) — 
        // legacy 'merchants' table aur 'public.users' ki saari rows 
        // (consumers/riders sab) query karna band kar diya
        const { data: ownerRoles } = await supabase
          .from('user_tenant_roles')
          .select('user_id, tenant_id')
          .eq('role_name', 'owner')
          .eq('is_active', true);

        const tenantIds = (ownerRoles || []).map((r: any) => r.tenant_id);
        const ownerUserIds = (ownerRoles || []).map((r: any) => r.user_id);

        const { data: tenantsData } = tenantIds.length > 0
          ? await supabase.from('tenants').select('*').in('id', tenantIds)
          : { data: [] as any[] };

        const { data: ownerUsersData } = ownerUserIds.length > 0
          ? await supabase.from('users').select('*').in('id', ownerUserIds)
          : { data: [] as any[] };

        const { data: merchantSubs } = tenantIds.length > 0
          ? await supabase.from('merchant_subscriptions').select('*, modules_master(name)').in('tenant_id', tenantIds)
          : { data: [] as any[] };
        
        const { data: plansData } = await supabase.from('subscription_plans').select('*');
        if (plansData) {
          setSubscriptionPlans(plansData);
        }
        
        try {
          const { data: messagesData } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false });
          if (messagesData) {
            setContactMessages(messagesData);
          }
        } catch(e) {}
        
        const { data: modulesData, error: modulesError } = await supabase.from('modules_master').select('*').order('name');
        
        let loadedModules = fallbackModules;
        
        if (modulesData && modulesData.length > 0) {
          loadedModules = modulesData;
          if (modulesData.length < 8) {
            const existingIds = new Set(modulesData.map((m: any) => m.id));
            const missingModules = fallbackModules.filter((m: any) => !existingIds.has(m.id));
            if (missingModules.length > 0) {
              try {
                await supabase.from('modules_master').upsert(missingModules);
                const { data: refreshedModules } = await supabase.from('modules_master').select('*').order('name');
                if (refreshedModules) {
                  loadedModules = refreshedModules;
                }
              } catch(e) {}
            }
          }
        } else if (!modulesError || modulesError.code === 'PGRST116' || modulesError.code === 'PGRST205' || modulesError.code === '42P01') {
          try {
            const { error: seedErr } = await supabase.from('modules_master').insert(fallbackModules);
            if (seedErr) {
              console.warn("Could not seed modules_master:", seedErr);
            }
          } catch(e) {
            console.warn("Exception seeding modules_master:", e);
          }
        }
        
        setModulesMaster(loadedModules);
        if (!selectedModule && loadedModules.length > 0) {
           setSelectedModule(loadedModules[0].id);
        }

        users = (tenantsData || []).map((tenant: any) => {
          const ownerRole = (ownerRoles || []).find((r: any) => r.tenant_id === tenant.id);
          const ownerUser = (ownerUsersData || []).find((u: any) => u.id === ownerRole?.user_id) || {};
          const subs = (merchantSubs || []).filter((s: any) => s.tenant_id === tenant.id);

          return {
            id: tenant.id, // Ab yeh SACH MEIN tenant.id hai
            owner_user_id: ownerUser.id,
            name: ownerUser.full_name || 'Unknown User',
            email: ownerUser.email || 'N/A',
            phone: ownerUser.phone || 'N/A',
            business_name: tenant.business_name || 'N/A',
            address: 'N/A',
            profile: tenant.business_type || 'N/A',
            status: tenant.status === 'suspended' ? 'suspended' : 'Active',
            plan: tenant.plan_type || 'Free Plan',
            role: 'merchant',
            activeModules: subs.map((s: any) => {
              const modName = (s as any).modules_master?.name || s.plan_id;
              return `${modName} (${s.status || 'Inactive'})`;
            }).join(', ') || 'None'
          };
        });

        let revenue = 0;
        try {
          const { data: subscriptions, error: subError } = await supabase.from('subscriptions').select('*');
          if (!subError && subscriptions) {
            subscriptions.forEach((data: any) => {
              if (data.amount) {
                revenue += Number(data.amount);
              }
            });
          }
        } catch (subErr) {
          // ignore error if table doesn't exist
        }

        setMerchantsList(users);
        setDashboardStats(prev => ({
          ...prev,
          totalUsers: users.length,
          activeMerchants: users.filter(u => u.status === 'Active').length,
          totalRevenue: revenue
        }));
      } catch (error) {
        console.warn("Error fetching dashboard data:", error);
      }
    };
    
    fetchDashboardData();
  }, [activeTab]);

  
  // Protect route
  if (!loading && user?.email !== 'ukcbrh@gmail.com') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <Shield size={64} className="mx-auto text-red-500 mb-4" />
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">Access Denied</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">You don't have permission to view the Super Admin panel.</p>
          <Button onClick={() => navigate('/')}>Return to Home</Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const handleExport = () => {
    if (merchantsList.length === 0) {
      alert("No data available to export.");
      return;
    }
    const headers = ["ID", "Name", "Email", "Phone", "Business Name", "Role", "Active Modules", "Plan", "Status"];
    const csvRows = [];
    csvRows.push(headers.join(","));
    
    for (const row of merchantsList) {
      const values = [
        row.id,
        `"${row.name || ''}"`,
        `"${row.email || ''}"`,
        `"${row.phone || ''}"`,
        `"${row.business_name || ''}"`,
        `"${row.role || ''}"`,
        `"${row.activeModules || ''}"`,
        `"${row.plan || ''}"`,
        `"${row.status || ''}"`
      ];
      csvRows.push(values.join(","));
    }
    
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "bahibox_users.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  
  const handleResetPassword = async (merchant: any) => {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      // Get the owner's email
      const { data: roles, error: roleError } = await supabase.from('user_tenant_roles').select('user_id, users(email)').eq('tenant_id', merchant.id).eq('role_name', 'owner');
      
      let ownerEmail = null;
      if (roles && roles.length > 0) {
          // Sub-selects can be returned as objects or arrays depending on one-to-many. Usually users is a single object here.
          const u = roles[0].users as any;
          if (u && !Array.isArray(u)) { ownerEmail = u.email; }
          else if (u && Array.isArray(u) && u.length > 0) { ownerEmail = u[0].email; }
      }
      
      if (!ownerEmail) {
         // Fallback if users relation fails, just use the merchant email string if they have one stored locally
         ownerEmail = merchant.email;
      }

      if (!ownerEmail || ownerEmail === 'N/A') {
        toast.error("Could not find owner email for this business");
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(ownerEmail, {
         redirectTo: `${window.location.origin}?reset_password=true`,
      });
      if (error) throw error;
      toast.success(`Password reset email sent to ${ownerEmail}`);
      
      // Log to audit logs
      await supabase.from('audit_logs').insert({
        tenant_id: merchant.id,
        actor_user_id: user?.id,
        action_type: 'reset_password',
        target_table: 'tenants',
        target_id: merchant.id,
        new_values: { email: ownerEmail }
      });
    } catch (err: any) {
      toast.error(`Failed to send reset email: ${err.message}`);
    }
  };

  const handleGenerateTempPassword = async (targetUserId: string, displayName: string) => {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/admin-set-temp-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({ target_user_id: targetUserId })
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error || 'Failed to generate temporary password');
        return;
      }
      window.prompt(
        `Temporary password for ${displayName} (share this securely — they should change it after logging in):`,
        result.temp_password
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate temporary password');
    }
  };


  const handleToggleSuspend = async (merchant: any) => {
    const isSuspending = merchant.status !== 'suspended';
    if (isSuspending) {
       const confirmed = window.confirm(`Suspend ${merchant.business_name}? Their team will lose dashboard access immediately. Data remains safe.`);
       if (!confirmed) return;
    }
    
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const newStatus = isSuspending ? 'suspended' : 'active';
      const { error } = await supabase.from('tenants').update({ status: newStatus }).eq('id', merchant.id);
      if (error) throw error;
      
      // Update local state
      setMerchantsList(prev => prev.map(m => m.id === merchant.id ? { ...m, status: newStatus } : m));
      toast.success(isSuspending ? 'Merchant suspended' : 'Merchant unsuspended');
      
      // Audit log
      await supabase.from('audit_logs').insert({
        tenant_id: merchant.id,
        actor_user_id: user?.id,
        action_type: isSuspending ? 'suspend_tenant' : 'unsuspend_tenant',
        target_table: 'tenants',
        target_id: merchant.id,
        new_values: { status: newStatus }
      });
    } catch (err: any) {
      toast.error(`Failed to update status: ${err.message}`);
    }
  };

  const initDelete = async (merchant: any) => {
    setMerchantToDelete(merchant);
    setDeleteConfirmText('');
    setDeleteModalOpen(true);
    setDeleteCounts({});
    const supabase = getSupabaseClient();
    if (!supabase) return;
    
    // fetch counts
    const counts: any = {};
    const { count: prodCount } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('tenant_id', merchant.id);
    counts.products = prodCount || 0;
    
    const { count: ordersCount } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('tenant_id', merchant.id);
    counts.orders = ordersCount || 0;
    
    const { count: salesCount } = await supabase.from('sales_invoices').select('*', { count: 'exact', head: true }).eq('tenant_id', merchant.id);
    counts.sales = salesCount || 0;
    
    setDeleteCounts(counts);
  };

  const confirmDelete = async () => {
    if (deleteConfirmText !== merchantToDelete.business_name) {
       toast.error("Business name does not match");
       return;
    }
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { error } = await supabase.from('tenants').update({ status: 'deleted' }).eq('id', merchantToDelete.id);
      if (error) throw error;
      
      setMerchantsList(prev => prev.map(m => m.id === merchantToDelete.id ? { ...m, status: 'deleted' } : m));
      toast.success('Merchant deleted successfully');
      setDeleteModalOpen(false);
      
      await supabase.from('audit_logs').insert({
        tenant_id: merchantToDelete.id,
        actor_user_id: user?.id,
        action_type: 'delete_tenant',
        target_table: 'tenants',
        target_id: merchantToDelete.id,
        new_values: { status: 'deleted' }
      });
    } catch (err: any) {
      toast.error(`Failed to delete: ${err.message}`);
    }
  };

const handleOpenModulesModal = async (merchant: any) => {
    setSelectedMerchantForModules(merchant);
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data } = await supabase.from('merchant_subscriptions').select('*').eq('merchant_id', merchant.id);
      if (data) {
        setMerchantSubscriptions(data);
      }
    }
  };

  const toggleModuleAccess = async (moduleId: string, currentStatus: string) => {
    if (!selectedMerchantForModules) return;
    const newStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    
    const supabase = getSupabaseClient();
    if (!supabase) return;

    // Optimistic update
    setMerchantSubscriptions(prev => {
      const exists = prev.find((s: any) => s.module_id === moduleId);
      if (exists) {
        return prev.map((s: any) => s.module_id === moduleId ? { ...s, status: newStatus } : s);
      }
      return [...prev, { module_id: moduleId, status: newStatus }];
    });

    await supabase.from('merchant_subscriptions').upsert({
      merchant_id: selectedMerchantForModules.id,
      module_id: moduleId,
      status: newStatus
    }, { onConflict: 'merchant_id, module_id' });
  };

  const updateModulePlan = async (moduleId: string, newPlan: string) => {
    if (!selectedMerchantForModules) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    
    setMerchantSubscriptions(prev => {
      const exists = prev.find((s: any) => s.module_id === moduleId);
      if (exists) {
        return prev.map((s: any) => s.module_id === moduleId ? { ...s, plan_type: newPlan } : s);
      }
      return [...prev, { module_id: moduleId, plan_type: newPlan, status: 'Inactive' }];
    });

    await supabase.from('merchant_subscriptions').upsert({
      merchant_id: selectedMerchantForModules.id,
      module_id: moduleId,
      plan_type: newPlan
    }, { onConflict: 'merchant_id, module_id' });
  };

  const updateModuleSettings = async (moduleId: string, settingsString: string) => {
    if (!selectedMerchantForModules) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    
    try {
      let parsedSettings = null;
      if (settingsString.trim() !== '') {
        parsedSettings = JSON.parse(settingsString);
      }
      
      setMerchantSubscriptions(prev => {
        const exists = prev.find((s: any) => s.module_id === moduleId);
        if (exists) {
          return prev.map((s: any) => s.module_id === moduleId ? { ...s, settings: parsedSettings } : s);
        }
        return [...prev, { module_id: moduleId, settings: parsedSettings, status: 'Inactive' }];
      });

      const { error } = await supabase.from('merchant_subscriptions').upsert({
        merchant_id: selectedMerchantForModules.id,
        module_id: moduleId,
        settings: parsedSettings
      }, { onConflict: 'merchant_id, module_id' });
      
      if (error) {
        console.error("Error updating settings:", error);
      }
    } catch (e) {
      alert("Invalid JSON format for settings.");
    }
  };

  const handleUpdatePricing = async () => {
    const supabase = getSupabaseClient();
    if (!supabase || !selectedModule) return;
    
    const priceNum = parseFloat(editingPrice);
    if (isNaN(priceNum)) {
      alert("Invalid price");
      return;
    }

    const { error } = await supabase.from('modules_master')
      .update({ 
        price: priceNum,
        test_mode_free: testModeFree,
        test_mode_pro: testModePro,
        test_mode_custom: testModeCustom
      })
      .eq('id', selectedModule);

    if (error) {
      if (error.code === 'PGRST205' || error.code === '42P01') {
        console.warn("Table modules_master not found, skipping update.");
        alert("Simulated update: modules_master table not initialized.");
      } else {
        alert("Error updating price: " + error.message);
      }
    } else {
      alert("Price updated successfully!");
      setModulesMaster(prev => prev.map((m: any) => m.id === selectedModule ? { 
        ...m, 
        price: priceNum,
        test_mode_free: testModeFree,
        test_mode_pro: testModePro,
        test_mode_custom: testModeCustom
      } : m));
    }
  };

  const NavItem = ({ id, icon: Icon, label }: { id: string, icon: any, label: string }) => (
    <button 
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left ${
        activeTab === id 
          ? 'bg-primary text-white shadow-md' 
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
      }`}
    >
      <Icon size={20} />
      {sidebarOpen && <span className="font-medium">{label}</span>}
    </button>
  );

  return (
    <div className={`min-h-screen flex ${darkMode ? 'dark bg-slate-950 text-slate-50' : 'bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100'}`}>
      
      {/* Sidebar */}
      <aside className={`transition-all duration-300 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 ${sidebarOpen ? 'w-64' : 'w-28'} flex flex-col sticky top-0 h-screen overflow-y-auto`}>
        <div className="h-28 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
          {sidebarOpen ? (
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
              <img src="/logolight.png" alt="BahiBox Logo" className="h-24 dark:hidden object-contain" />
              <img src="/logodark.png" alt="BahiBox Logo" className="h-24 hidden dark:block object-contain" />
              <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">Admin</span>
            </div>
          ) : (
            <div className="flex justify-center w-full cursor-pointer" onClick={() => navigate('/')}>
              <img src="/logolight.png" alt="B" className="h-24 w-24 object-cover object-left dark:hidden" />
              <img src="/logodark.png" alt="B" className="h-24 w-24 object-cover object-left hidden dark:block" />
            </div>
          )}
          {sidebarOpen && (
            <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md lg:hidden">
              <X size={20} />
            </button>
          )}
        </div>
        
        <div className="flex-1 py-6 px-3 space-y-1.5">
          <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard View" />
          <NavItem id="plans" icon={CreditCard} label="Subscription Plans" />
          <NavItem id="payments" icon={IndianRupee} label="Platform Payments" />
          <NavItem id="rates" icon={Settings} label="Platform Rates" />
          <NavItem id="merchants" icon={Building2} label="Merchants Directory" />
          <NavItem id="mart_sponsored" icon={Megaphone} label="Mart Sponsored Products" />
          <NavItem id="food_sponsored" icon={Megaphone} label="Food Sponsored Items" />
          <NavItem id="settings" icon={Settings} label="Global Settings" />
          <NavItem id="whitelabel" icon={Globe} label="White-Label Requests" />
          <NavItem id="kyc" icon={Shield} label="Service Provider KYC" />
          <NavItem id="withdrawals" icon={Wallet} label="Withdrawal Requests" />
          <NavItem id="wallet_analytics" icon={IndianRupee} label="Wallet Analytics" />
          <NavItem id="consumers" icon={Users} label="Consumer Directory" />
          <NavItem id="contact" icon={MessageSquare} label="Contact Inquiries" />
          <NavItem id="support" icon={Ticket} label="Support & Tickets" />
          <NavItem id="notifications" icon={Bell} label="Notification Engine" />
          <NavItem id="rbac" icon={UserCog} label="Sub-Admins (RBAC)" />
        </div>
        
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center">
              <Shield size={20} className="text-slate-500 dark:text-slate-400" />
            </div>
            {sidebarOpen && (
              <div className="overflow-hidden">
                <p className="text-sm font-semibold truncate dark:text-white">Super Admin</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">System Control</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-28 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4 flex-1">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 hidden lg:block">
              <Menu size={20} />
            </button>
            <div className="relative max-w-md w-full hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input placeholder="Global Search (Merchants, Transactions, Tickets)..." className="pl-10 bg-slate-50 dark:bg-slate-800 border-none w-full dark:text-white focus-visible:ring-1" />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-600 dark:text-slate-400">
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <Button variant="outline" className="hidden sm:flex" onClick={() => navigate('/')}>
              Exit Admin
            </Button>
            <Button 
              variant="outline" 
              className="hidden sm:flex text-red-600 border-red-200 hover:bg-red-50" 
              onClick={async () => { await logout(); }}
            >
              Logout
            </Button>
          </div>
        </header>

        {/* Tab Content */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto">
          
          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold dark:text-white">System Overview</h1>
                  <p className="text-slate-500 dark:text-slate-400">Live health and wealth data of BahiBox Ecosystem.</p>
                </div>
                <Button onClick={handleExport} className="bg-primary hover:bg-primary/90 text-white gap-2">
                  <Download size={16} /> Export Report
                </Button>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-none">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-emerald-100 font-medium">Total Revenue</p>
                        <h3 className="text-3xl font-bold mt-1">₹ {dashboardStats.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h3>
                      </div>
                      <div className="p-3 bg-white dark:bg-slate-950/20 rounded-lg"><IndianRupee size={24} /></div>
                    </div>
                    <div className="mt-4 text-sm font-medium text-emerald-100">
                      Auto-synced with DB
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-none">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-blue-100 font-medium">Active Merchants</p>
                        <h3 className="text-3xl font-bold mt-1">{dashboardStats.activeMerchants}</h3>
                      </div>
                      <div className="p-3 bg-white dark:bg-slate-950/20 rounded-lg"><Building2 size={24} /></div>
                    </div>
                    <div className="mt-4 text-sm font-medium text-blue-100">
                      Auto-synced with DB
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white border-none">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-purple-100 font-medium">Total Users</p>
                        <h3 className="text-3xl font-bold mt-1">{dashboardStats.totalUsers}</h3>
                      </div>
                      <div className="p-3 bg-white dark:bg-slate-950/20 rounded-lg"><Users size={24} /></div>
                    </div>
                    <div className="mt-4 text-sm font-medium text-purple-100">
                      Total accounts
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white border-none">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-orange-100 font-medium">System Health</p>
                        <h3 className="text-3xl font-bold mt-1">99.99%</h3>
                      </div>
                      <div className="p-3 bg-white dark:bg-slate-950/20 rounded-lg"><BarChart3 size={24} /></div>
                    </div>
                    <div className="mt-4 text-sm font-medium text-orange-100">
                      All systems operational
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="dark:bg-slate-900 dark:border-slate-800">
                  <CardHeader>
                    <CardTitle className="dark:text-white">Revenue Trend (Last 7 Days)</CardTitle>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" stroke="#64748b" />
                        <YAxis stroke="#64748b" />
                        <RechartsTooltip />
                        <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} activeDot={{ r: 8 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="dark:bg-slate-900 dark:border-slate-800">
                  <CardHeader>
                    <CardTitle className="dark:text-white">Module Performance (Comparative)</CardTitle>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={modulePerformance}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickFormatter={(val) => val.slice(0,4)} />
                        <YAxis stroke="#64748b" />
                        <RechartsTooltip />
                        <Legend />
                        <Bar dataKey="merchants" fill="#8b5cf6" name="Merchants" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="users" fill="#10b981" name="End Users" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}


          {/* MERCHANTS TAB */}
          {activeTab === 'merchants' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold dark:text-white">Merchant & Staff Management</h1>
                  <p className="text-slate-500 dark:text-slate-400">Global directory, impersonation mode, and suspension controls.</p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="gap-2 dark:border-slate-700 dark:text-white" onClick={handleExport}><Download size={16} /> Export</Button>
                </div>
              </div>

              <Card className="dark:bg-slate-900 dark:border-slate-800 border-none shadow-sm">
                <div className="p-4 border-b dark:border-slate-800 flex gap-4 bg-white dark:bg-slate-900 rounded-t-xl">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <Input placeholder="Search merchants by name, ID, or phone..." className="pl-10 max-w-md dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                  </div>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-40 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                      <SelectValue placeholder="Filter Module" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Modules</SelectItem>
                      <SelectItem value="retail">Retail POS</SelectItem>
                      <SelectItem value="health">Health Care</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-medium">
                      <tr>
                        <th className="px-6 py-4">User ID & Name</th>
                        <th className="px-6 py-4">Contact & Business</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">Active Modules</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 dark:bg-slate-900">
                      {merchantsList.map((merchant) => (
                        <tr key={merchant.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-900 dark:text-white">{merchant.name}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono" title={merchant.id}>{merchant.id.substring(0, 12)}...</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-semibold dark:text-slate-300">{merchant.business_name !== 'N/A' ? merchant.business_name : merchant.email}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{merchant.phone !== 'N/A' ? merchant.phone : 'No Phone'}</div>
                            {merchant.address && merchant.address !== 'N/A' && (
                              <div className="text-xs text-slate-400 mt-1 line-clamp-1" title={merchant.address}>{merchant.address}</div>
                            )}
                            {merchant.profile && merchant.profile !== 'N/A' && (
                              <div className="text-xs text-slate-400 mt-0.5 line-clamp-1" title={merchant.profile}>{merchant.profile}</div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-xs font-medium uppercase">
                              {merchant.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm dark:text-slate-300 max-w-[200px] truncate" title={merchant.activeModules}>{merchant.activeModules}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                              merchant.status === 'Active' 
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' 
                                : 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                            }`}>
                              {merchant.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" title="View Profile" onClick={() => setProfileModalTenantId(merchant.id)} className="text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                                <Eye size={18} />
                              </Button>
                              <Button variant="ghost" size="icon" title="Impersonate (Login as Merchant)" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30">
                                <Users size={18} />
                              </Button>
                              <Button variant="ghost" size="icon" title="Module Access" onClick={() => handleOpenModulesModal(merchant)} className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30">
                                <Settings size={18} />
                              </Button>
                              <Button variant="ghost" size="icon" title="Edit Staff" className="text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                                <Edit size={18} />
                              </Button>
                              <Button variant="ghost" size="icon" title="Reset Password" onClick={() => handleResetPassword(merchant)} className="text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30">
                                <KeyRound size={18} />
                              </Button>
                              <Button variant="ghost" size="icon" title="Generate Temp Password" onClick={async () => {
                                const supabase = getSupabaseClient();
                                if (!supabase) return;
                                const { data: roles } = await supabase.from('user_tenant_roles').select('user_id').eq('tenant_id', merchant.id).eq('role_name', 'owner').limit(1);
                                if (!roles || roles.length === 0) {
                                  toast.error("Could not find owner for this business");
                                  return;
                                }
                                handleGenerateTempPassword(roles[0].user_id, merchant.business_name);
                              }} className="text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/30">
                                <KeyRound size={18} />
                              </Button>
                              <Button variant="ghost" size="icon" title={merchant.status === 'suspended' ? 'Unsuspend Merchant' : 'Suspend Merchant'} onClick={() => handleToggleSuspend(merchant)} className={`${merchant.status === 'suspended' ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30' : 'text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/30'}`}>
                                {merchant.status === 'suspended' ? <Unlock size={18} /> : <Lock size={18} />}
                              </Button>
                              <Button variant="ghost" size="icon" title="Delete Merchant" onClick={() => initDelete(merchant)} className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30">
                                <Trash2 size={18} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* RATE SETTINGS TAB */}
          {activeTab === 'rates' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <PlatformRatesSettings />
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h1 className="text-2xl font-bold dark:text-white">Global Settings & Security</h1>
                <p className="text-slate-500 dark:text-slate-400">System-wide configurations and security protocols.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="dark:bg-slate-900 dark:border-slate-800 border-l-4 border-l-red-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 dark:text-white">
                      <Shield className="text-red-500" />
                      Security: "Child Before Parent" Rule
                    </CardTitle>
                    <CardDescription>
                      Prevents orphan records and database corruption.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      When enabled, merchants cannot delete a parent category (e.g., 'Snacks') until all child items (e.g., 'Chips', 'Biscuits') inside it are deleted or moved.
                    </p>
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border dark:border-slate-700">
                      <div>
                        <p className="font-semibold dark:text-white">Enforce Global Rule</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Applies to all modules instantly.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" value="" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-slate-950 after:border-slate-300 dark:border-slate-700 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>
                  </CardContent>
                </Card>

                <Card className="dark:bg-slate-900 dark:border-slate-800">
                  <CardHeader>
                    <CardTitle className="dark:text-white">Master Configuration</CardTitle>
                    <CardDescription>Configure global dropdowns for all merchants.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-sm font-semibold dark:text-white">Master Units List</label>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Add measurement units available globally (e.g., Kg, Piece, Box).</p>
                      <div className="flex gap-2">
                        <Input placeholder="Add new unit (e.g., Ltr)" className="dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                        <Button className="bg-slate-800 text-white dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600">Add</Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {['1 Kg', '500 Gm', '1 Box', '1 Piece', '1 Dozen'].map(unit => (
                          <span key={unit} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm rounded-full flex items-center gap-1 border dark:border-slate-700">
                            {unit} <X size={14} className="cursor-pointer hover:text-red-500" />
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm dark:text-white">Allow Discount Toggle on POS</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Let merchants choose between % and Flat amount.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" value="" className="sr-only peer" defaultChecked />
                          <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-slate-950 after:border-slate-300 dark:border-slate-700 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-primary"></div>
                        </label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* NOTIFICATION ENGINE TAB */}
          {activeTab === 'notifications' && (
            <NotificationEngineView />
          )}

          {/* MART SPONSORED PRODUCTS TAB */}
          {activeTab === 'mart_sponsored' && (
            <MartSponsoredAdminView />
          )}

          {/* FOOD SPONSORED ITEMS TAB */}
          {activeTab === 'food_sponsored' && (
            <FoodSponsoredAdminView />
          )}

          {/* SUPPORT TICKETS TAB */}
          {activeTab === 'support' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h1 className="text-2xl font-bold dark:text-white">Helpdesk & Support</h1>
                <p className="text-slate-500 dark:text-slate-400">Manage merchant issues and platform tickets.</p>
              </div>

              <Card className="dark:bg-slate-900 dark:border-slate-800 border-none shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-medium">
                      <tr>
                        <th className="px-6 py-4">Ticket ID</th>
                        <th className="px-6 py-4">Merchant</th>
                        <th className="px-6 py-4">Issue Summary</th>
                        <th className="px-6 py-4">Priority</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 dark:bg-slate-900">
                      {ticketsList.map((ticket) => (
                        <tr key={ticket.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="px-6 py-4 font-mono font-medium dark:text-slate-300">{ticket.id}</td>
                          <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">{ticket.merchant}</td>
                          <td className="px-6 py-4 dark:text-slate-300">{ticket.issue}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              ticket.priority === 'High' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            }`}>
                              {ticket.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium">
                              {ticket.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button size="sm" variant="outline" className="dark:border-slate-700 dark:text-white">View & Reply</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* PLANS TAB */}
          {activeTab === 'plans' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <UsageRateCardEditor />
              <SubscriptionPlanManager />
            </div>
          )}

          {/* PAYMENTS TAB */}
          {activeTab === 'payments' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <PlatformPaymentsDashboard />
            </div>
          )}

          {activeTab === 'wallet_analytics' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <WalletAnalyticsView />
            </div>
          )}

          {activeTab === 'consumers' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <ConsumerDirectoryView />
            </div>
          )}

          {/* RBAC TAB (Placeholder) */}
          {activeTab === 'rbac' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h1 className="text-2xl font-bold dark:text-white">Role-Based Access Control (RBAC)</h1>
                <p className="text-slate-500 dark:text-slate-400">Manage sub-admins and their permissions.</p>
              </div>
              <Card className="dark:bg-slate-900 dark:border-slate-800 max-w-2xl text-center py-16">
                <CardContent className="flex flex-col items-center">
                  <UserCog size={64} className="text-slate-300 dark:text-slate-700 dark:text-slate-300 mb-4" />
                  <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">Sub-Admin Management</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md">Create roles like 'Accountant' or 'Support Agent' to limit access to sensitive areas like Pricing or Merchant suspension.</p>
                  <Button className="bg-primary hover:bg-primary/90 text-white">Create New Role</Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* WHITE LABEL TAB */}
          {activeTab === 'whitelabel' && (
            <WhiteLabelRequestsView />
          )}

          {/* KYC VERIFICATION TAB */}
          {activeTab === 'kyc' && (
            <ServiceProviderKYCView />
          )}
          {/* WITHDRAWALS TAB */}
          {activeTab === 'withdrawals' && (
            <WithdrawalRequestsView />
          )}

          {/* CONTACT INQUIRIES TAB */}
          {activeTab === 'contact' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h1 className="text-2xl font-bold dark:text-white">Contact Inquiries</h1>
                <p className="text-slate-500 dark:text-slate-400">Manage messages submitted from the landing page contact form.</p>
              </div>
              <Card className="dark:bg-slate-900 dark:border-slate-800 border-none shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-medium">
                      <tr>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">Contact</th>
                        <th className="px-6 py-4">Type</th>
                        <th className="px-6 py-4">Message</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 dark:bg-slate-900">
                      {contactMessages.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">No contact messages found.</td>
                        </tr>
                      ) : contactMessages.map((msg: any) => (
                        <tr key={msg.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-slate-500 dark:text-slate-400">{new Date(msg.created_at).toLocaleDateString()}</td>
                          <td className="px-6 py-4 font-medium dark:text-slate-300">{msg.name}</td>
                          <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                            <div>{msg.email}</div>
                            <div>{msg.phone}</div>
                          </td>
                          <td className="px-6 py-4 dark:text-slate-300">{msg.inquiry_type}</td>
                          <td className="px-6 py-4 dark:text-slate-300 max-w-xs truncate" title={msg.message}>{msg.message}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-xs font-medium uppercase`}>
                              {msg.status || 'New'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </div>
      </main>

      {profileModalTenantId && (
        <MerchantProfileModal tenantId={profileModalTenantId} onClose={() => setProfileModalTenantId(null)} />
      )}

      {/* Module Access Modal */}
      {selectedMerchantForModules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedMerchantForModules(null)}></div>
          <Card className="relative w-full max-w-2xl shadow-xl z-10 dark:bg-slate-900 border-0 max-h-[90vh] overflow-hidden flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between border-b dark:border-slate-800 shrink-0">
              <CardTitle className="text-xl">
                Module Access Matrix - {selectedMerchantForModules.name}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setSelectedMerchantForModules(null)}>
                <X size={20} />
              </Button>
            </CardHeader>
            <CardContent className="p-6 overflow-y-auto">
              <div className="space-y-4">
                {modulesMaster.map((module: any) => {
                  const sub = merchantSubscriptions.find((s: any) => s.module_id === module.id);
                  const status = sub?.status || 'Inactive';
                  const isActive = status === 'Active';
                  const planType = sub?.plan_type || 'None';
                  const settingsString = sub?.settings ? JSON.stringify(sub.settings, null, 2) : '';

                  return (
                    <div key={module.id} className="flex flex-col p-4 border dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-slate-900 dark:text-white">{module.name}</h4>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{module.description}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`text-xs font-bold uppercase tracking-wider ${isActive ? 'text-emerald-500' : 'text-slate-400'}`}>
                            {status}
                          </span>
                          <button 
                            onClick={() => toggleModuleAccess(module.id, status)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-slate-950 transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t dark:border-slate-800">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Active Plan</label>
                          <Select value={planType} onValueChange={(val: any) => updateModulePlan(module.id, val)}>
                            <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-900">
                              <SelectValue placeholder="Select Plan" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="None">None</SelectItem>
                              {subscriptionPlans
                                .filter((p: any) => p.module_name === module.name || p.module_name === module.id)
                                .map((plan: any) => (
                                  <SelectItem key={plan.id} value={plan.tier}>{plan.name} ({plan.tier})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Module Settings (JSON)</label>
                          <div className="flex gap-2">
                            <Textarea 
                              className="font-mono text-xs bg-slate-50 dark:bg-slate-900 min-h-[60px]" 
                              placeholder='{"feature_flag": true}'
                              defaultValue={settingsString}
                              onBlur={(e: any) => updateModuleSettings(module.id, e.target.value)}
                            />
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Updates on blur (click outside)</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    
      {/* Delete Merchant Modal */}
      <AnimatePresence>
        {deleteModalOpen && merchantToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-red-50 dark:bg-red-900/20">
                <h3 className="text-xl font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" /> Delete Business
                </h3>
                <button onClick={() => setDeleteModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  This business has <strong>{deleteCounts.products !== undefined ? deleteCounts.products : '...'}</strong> products, <strong>{deleteCounts.orders !== undefined ? deleteCounts.orders : '...'}</strong> orders, and <strong>{deleteCounts.sales !== undefined ? deleteCounts.sales : '...'}</strong> sales records.
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  Deleting will hide this business from all dashboards, but records are retained for compliance (GST/accounting) — this cannot fully erase transactional history.
                </p>
                <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Type <strong>{merchantToDelete.business_name}</strong> to confirm:
                  </label>
                  <Input 
                    value={deleteConfirmText} 
                    onChange={e => setDeleteConfirmText(e.target.value)} 
                    placeholder="Enter business name"
                    className="dark:bg-slate-900 dark:border-slate-700"
                  />
                </div>
              </div>
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
                <Button 
                  onClick={confirmDelete}
                  disabled={deleteConfirmText !== merchantToDelete.business_name}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Confirm Delete
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
</div>
  );
}