import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
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
  Lock, 
  Unlock,
  Building2,
  Megaphone,
  X,
  UserCog,
  IndianRupee
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { Textarea } from '@/src/components/ui/textarea';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { getSupabaseClient } from '../lib/supabase';

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
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [merchantsList, setMerchantsList] = useState<any[]>([]);
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
  const [merchantSubscriptions, setMerchantSubscriptions] = useState<any[]>([]);

  // Pricing State
  const [editingPrice, setEditingPrice] = useState<string>('999');
  const [testModeFree, setTestModeFree] = useState<boolean>(false);
  const [testModePro, setTestModePro] = useState<boolean>(false);
  const [testModeCustom, setTestModeCustom] = useState<boolean>(false);

  useEffect(() => {
    if (selectedModule) {
       const mod = modulesMaster.find(m => m.id === selectedModule);
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
        const { data: merchantsData, error: merchantsError } = await supabase.from('users').select('*');
        
        if (!merchantsError && merchantsData) {
          users = merchantsData.map(doc => ({
            id: doc.id,
            ...doc,
            name: doc.name || 'Unknown User',
            type: doc.type || doc.module || 'Unknown Module',
            location: doc.location || 'N/A',
            status: doc.status || 'Active',
            plan: doc.plan || 'Free Plan',
            email: doc.email || 'N/A',
            role: doc.role || 'merchant'
          }));
        }

        const fallbackModules = [
          { id: 'retail', name: 'Retail POS', description: 'Point of sale and inventory', icon: 'ShoppingCart', price: 49.00 },
          { id: 'manufacturing', name: 'Manufacturing', description: 'Production and tracking', icon: 'Factory', price: 199.00 },
          { id: 'education', name: 'Education', description: 'School management', icon: 'GraduationCap', price: 149.00 },
          { id: 'healthcare', name: 'Healthcare', description: 'Clinic and patient management', icon: 'Stethoscope', price: 299.00 },
          { id: 'hospitality', name: 'Hospitality', description: 'Hotel and restaurant', icon: 'Hotel', price: 99.00 },
          { id: 'transport', name: 'Transport', description: 'Fleet and logistics', icon: 'Truck', price: 149.00 },
          { id: 'services', name: 'Services', description: 'Service and booking', icon: 'Wrench', price: 49.00 },
          { id: 'agriculture', name: 'Agriculture', description: 'Farm and crop management', icon: 'Tractor', price: 79.00 }
        ];

        const { data: modulesData, error: modulesError } = await supabase.from('modules_master').select('*').order('name');
        
        let loadedModules = fallbackModules;
        
        if (modulesData && modulesData.length > 0) {
          loadedModules = modulesData;
          if (modulesData.length < 8) {
            const existingIds = new Set(modulesData.map(m => m.id));
            const missingModules = fallbackModules.filter(m => !existingIds.has(m.id));
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
          // Attempt to seed if empty
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

        let revenue = 0;
        try {
          const { data: subscriptions, error: subError } = await supabase.from('subscriptions').select('*');
          if (!subError && subscriptions) {
            subscriptions.forEach(data => {
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Shield size={64} className="mx-auto text-red-500 mb-4" />
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Access Denied</h1>
          <p className="text-slate-600 mb-6">You don't have permission to view the Super Admin panel.</p>
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
    const headers = ["ID", "Name", "Email", "Role", "Module", "Location", "Plan", "Status"];
    const csvRows = [];
    csvRows.push(headers.join(","));
    
    for (const row of merchantsList) {
      const values = [
        row.id,
        `"${row.name || ''}"`,
        `"${row.email || ''}"`,
        `"${row.role || ''}"`,
        `"${row.type || ''}"`,
        `"${row.location || ''}"`,
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
      const exists = prev.find(s => s.module_id === moduleId);
      if (exists) {
        return prev.map(s => s.module_id === moduleId ? { ...s, status: newStatus } : s);
      }
      return [...prev, { module_id: moduleId, status: newStatus }];
    });

    await supabase.from('merchant_subscriptions').upsert({
      merchant_id: selectedMerchantForModules.id,
      module_id: moduleId,
      status: newStatus
    }, { onConflict: 'merchant_id, module_id' });
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
      setModulesMaster(prev => prev.map(m => m.id === selectedModule ? { 
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
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
      }`}
    >
      <Icon size={20} />
      {sidebarOpen && <span className="font-medium">{label}</span>}
    </button>
  );

  return (
    <div className={`min-h-screen flex ${darkMode ? 'dark bg-slate-950 text-slate-50' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Sidebar */}
      <aside className={`transition-all duration-300 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 ${sidebarOpen ? 'w-64' : 'w-20'} flex flex-col sticky top-0 h-screen overflow-y-auto`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
          {sidebarOpen ? (
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">B</div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">Master Admin</span>
            </div>
          ) : (
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold mx-auto cursor-pointer" onClick={() => navigate('/')}>B</div>
          )}
          {sidebarOpen && (
            <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md lg:hidden">
              <X size={20} />
            </button>
          )}
        </div>
        
        <div className="flex-1 py-6 px-3 space-y-1.5">
          <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard View" />
          <NavItem id="pricing" icon={CreditCard} label="Pricing & Plans" />
          <NavItem id="merchants" icon={Building2} label="Merchants Directory" />
          <NavItem id="settings" icon={Settings} label="Global Settings" />
          <NavItem id="support" icon={Ticket} label="Support & Tickets" />
          <NavItem id="broadcast" icon={Megaphone} label="Broadcasts" />
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
                <p className="text-xs text-slate-500 truncate">System Control</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between sticky top-0 z-10">
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
                      <div className="p-3 bg-white/20 rounded-lg"><IndianRupee size={24} /></div>
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
                      <div className="p-3 bg-white/20 rounded-lg"><Building2 size={24} /></div>
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
                      <div className="p-3 bg-white/20 rounded-lg"><Users size={24} /></div>
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
                      <div className="p-3 bg-white/20 rounded-lg"><BarChart3 size={24} /></div>
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

          {/* PRICING TAB */}
          {activeTab === 'pricing' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h1 className="text-2xl font-bold dark:text-white">Subscription & Pricing Engine</h1>
                <p className="text-slate-500 dark:text-slate-400">Control prices and plans without touching backend code.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1 dark:bg-slate-900 dark:border-slate-800">
                  <CardHeader>
                    <CardTitle className="dark:text-white">Select Module</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select value={selectedModule} onValueChange={setSelectedModule}>
                      <SelectTrigger className="w-full h-12 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                        <SelectValue placeholder="Select Module" />
                      </SelectTrigger>
                      <SelectContent>
                        {modulesMaster.map(mod => (
                           <SelectItem key={mod.id} value={mod.id}>{mod.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <div className="mt-8 space-y-4">
                      <h4 className="font-semibold text-sm text-slate-500 uppercase tracking-wider">Coupons & Discounts</h4>
                      <Card className="bg-slate-50 dark:bg-slate-800 border-dashed dark:border-slate-700">
                        <CardContent className="p-4 space-y-3">
                          <Input placeholder="PROMO2026" className="dark:bg-slate-900 dark:border-slate-700 dark:text-white" />
                          <div className="flex gap-2">
                            <Input type="number" placeholder="20" className="dark:bg-slate-900 dark:border-slate-700 dark:text-white" />
                            <Select defaultValue="percent">
                              <SelectTrigger className="w-24 dark:bg-slate-900 dark:border-slate-700 dark:text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="percent">%</SelectItem>
                                <SelectItem value="flat">₹</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button className="w-full bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white">
                            Create Global Coupon
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2 dark:bg-slate-900 dark:border-slate-800">
                  <CardHeader className="flex flex-row items-center justify-between border-b dark:border-slate-800 pb-4">
                    <CardTitle className="dark:text-white">Editing Plans for: {modulesMaster.find(m => m.id === selectedModule)?.name}</CardTitle>
                    <Button onClick={handleUpdatePricing} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8">
                      Update Live Pricing
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x dark:divide-slate-800">
                      
                      {/* Free Plan Edit */}
                      <div className="p-6 space-y-4">
                        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Free Plan</h3>
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                          <input 
                            type="checkbox" 
                            checked={testModeFree} 
                            onChange={e => setTestModeFree(e.target.checked)} 
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          Enable ₹1 Testing Mode
                        </label>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-500">Price (₹)</label>
                          <Input defaultValue="0" disabled className="dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-500">Validity</label>
                          <Select defaultValue="lifetime">
                            <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="lifetime">Lifetime</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-500">Features List (Comma separated)</label>
                          <Textarea defaultValue="Single User, Basic Billing, Up to 50 Products" className="h-32 dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                        </div>
                      </div>

                      {/* Pro Plan Edit */}
                      <div className="p-6 space-y-4">
                        <h3 className="text-lg font-bold text-primary">Pro Plan</h3>
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                          <input 
                            type="checkbox" 
                            checked={testModePro} 
                            onChange={e => setTestModePro(e.target.checked)} 
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          Enable ₹1 Testing Mode
                        </label>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-500">Price (₹)</label>
                          <Input 
                            value={editingPrice} 
                            onChange={(e) => setEditingPrice(e.target.value)} 
                            className="dark:bg-slate-800 dark:border-slate-700 dark:text-white" 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-500">Validity</label>
                          <Select defaultValue="monthly">
                            <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="yearly">Yearly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-500">Features List</label>
                          <Textarea defaultValue="Unlimited Users, Advanced Inventory, Custom Reports, Priority Support" className="h-32 dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                        </div>
                      </div>

                      {/* Custom Plan Edit */}
                      <div className="p-6 space-y-4">
                        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Custom/Enterprise</h3>
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                          <input 
                            type="checkbox" 
                            checked={testModeCustom} 
                            onChange={e => setTestModeCustom(e.target.checked)} 
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          Enable ₹1 Testing Mode
                        </label>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-500">Button Text</label>
                          <Input defaultValue="Contact Sales" className="dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-500">Features List</label>
                          <Textarea defaultValue="Dedicated Server, Custom Integrations, SLA Guarantee, On-Premise" className="h-32 dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                        </div>
                      </div>

                    </div>
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
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">Module</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 dark:bg-slate-900">
                      {merchantsList.map((merchant) => (
                        <tr key={merchant.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-900 dark:text-white">{merchant.name}</div>
                            <div className="text-xs text-slate-500 font-mono" title={merchant.id}>{merchant.id.substring(0, 12)}...</div>
                          </td>
                          <td className="px-6 py-4 dark:text-slate-300">{merchant.email}</td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-xs font-medium uppercase">
                              {merchant.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 dark:text-slate-300">{merchant.type}</td>
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
                              <Button variant="ghost" size="icon" title="Impersonate (Login as Merchant)" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30">
                                <Users size={18} />
                              </Button>
                              <Button variant="ghost" size="icon" title="Module Access" onClick={() => handleOpenModulesModal(merchant)} className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30">
                                <Settings size={18} />
                              </Button>
                              <Button variant="ghost" size="icon" title="Edit Staff" className="text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                                <Edit size={18} />
                              </Button>
                              <Button variant="ghost" size="icon" title={merchant.status === 'Active' ? 'Suspend Merchant' : 'Unsuspend Merchant'} className={`${merchant.status === 'Active' ? 'text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/30' : 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'}`}>
                                {merchant.status === 'Active' ? <Lock size={18} /> : <Unlock size={18} />}
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
                        <p className="text-xs text-slate-500">Applies to all modules instantly.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" value="" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-500"></div>
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
                      <p className="text-xs text-slate-500">Add measurement units available globally (e.g., Kg, Piece, Box).</p>
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
                          <p className="text-xs text-slate-500">Let merchants choose between % and Flat amount.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" value="" className="sr-only peer" defaultChecked />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-primary"></div>
                        </label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* BROADCAST TAB */}
          {activeTab === 'broadcast' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h1 className="text-2xl font-bold dark:text-white">Global Broadcast</h1>
                <p className="text-slate-500 dark:text-slate-400">Send push notifications and alerts instantly.</p>
              </div>

              <Card className="max-w-3xl dark:bg-slate-900 dark:border-slate-800 border-primary/20 shadow-md">
                <CardHeader className="bg-primary/5 dark:bg-primary/10 border-b dark:border-slate-800">
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <Megaphone size={20} /> New Broadcast Message
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold dark:text-white">Target Audience</label>
                    <Select defaultValue="all_merchants">
                      <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_merchants">All Merchants (B2B)</SelectItem>
                        <SelectItem value="all_public">All Public App Users (B2C)</SelectItem>
                        <SelectItem value="retail_only">Retail POS Merchants Only</SelectItem>
                        <SelectItem value="healthcare_only">Healthcare Merchants Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold dark:text-white">Notification Title</label>
                    <Input placeholder="E.g., System Maintenance Alert" className="dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold dark:text-white">Message Body</label>
                    <Textarea 
                      placeholder="Type your message here..." 
                      className="h-32 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                      value={broadcastMsg}
                      onChange={(e) => setBroadcastMsg(e.target.value)}
                    />
                  </div>

                  <Button className="w-full h-12 text-lg shadow-lg hover:shadow-xl transition-all" onClick={() => {
                    alert("Broadcast Sent Successfully!");
                    setBroadcastMsg('');
                  }}>
                    Send Push Notification Now
                  </Button>
                </CardContent>
              </Card>
            </div>
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

          {/* RBAC TAB (Placeholder) */}
          {activeTab === 'rbac' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h1 className="text-2xl font-bold dark:text-white">Role-Based Access Control (RBAC)</h1>
                <p className="text-slate-500 dark:text-slate-400">Manage sub-admins and their permissions.</p>
              </div>
              <Card className="dark:bg-slate-900 dark:border-slate-800 max-w-2xl text-center py-16">
                <CardContent className="flex flex-col items-center">
                  <UserCog size={64} className="text-slate-300 dark:text-slate-700 mb-4" />
                  <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">Sub-Admin Management</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md">Create roles like 'Accountant' or 'Support Agent' to limit access to sensitive areas like Pricing or Merchant suspension.</p>
                  <Button className="bg-primary hover:bg-primary/90 text-white">Create New Role</Button>
                </CardContent>
              </Card>
            </div>
          )}

        </div>
      </main>

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
                {modulesMaster.map(module => {
                  const sub = merchantSubscriptions.find(s => s.module_id === module.id);
                  const status = sub?.status || 'Inactive';
                  const isActive = status === 'Active';
                  return (
                    <div key={module.id} className="flex items-center justify-between p-4 border dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950">
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white">{module.name}</h4>
                        <p className="text-sm text-slate-500">{module.description}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`text-xs font-bold uppercase tracking-wider ${isActive ? 'text-emerald-500' : 'text-slate-400'}`}>
                          {status}
                        </span>
                        <button 
                          onClick={() => toggleModuleAccess(module.id, status)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
