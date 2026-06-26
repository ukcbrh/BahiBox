import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ShoppingBag, Wallet, User as UserIcon, Search, Stethoscope, GraduationCap, Truck } from 'lucide-react';
import { Card, CardContent } from '@/src/components/ui/card';
import { Input } from '@/src/components/ui/input';
import { useAuth } from '../contexts/AuthContext';

export default function PublicApp() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('home');
  const { user } = useAuth();
  
  const userName = user?.displayName || 'Rahul Kumar';
  const userInitials = userName.split(' ').map(n => n[0]).join('').substring(0, 2);

  return (
    <div className="min-h-screen bg-slate-900 flex justify-center items-center p-4">
      {/* Mobile Simulator Container */}
      <div className="w-full max-w-[400px] h-[800px] bg-slate-50 font-sans text-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative border-8 border-slate-800">
        
        {/* Header */}
        <header className="bg-primary text-white px-6 py-6 rounded-b-3xl shadow-sm z-10">
          <div className="flex justify-between items-center mb-6 mt-4">
            <div>
              <p className="text-primary-foreground/80 text-sm">Hello,</p>
              <h1 className="text-xl font-bold">{userName}</h1>
            </div>
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center cursor-pointer" onClick={() => navigate('/')}>
              <span className="font-bold">{userInitials}</span>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
            <Input 
              placeholder="Search groceries, doctors, cabs..." 
              className="pl-10 bg-white text-slate-900 border-0 h-10 rounded-xl"
            />
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-auto pb-24 pt-4 px-4 space-y-6">
          
          {/* Services Grid */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4 px-2">BahiBox Services</h2>
            <div className="grid grid-cols-4 gap-y-4 gap-x-2">
              <ServiceIcon icon={ShoppingBag} label="Grocery" color="bg-blue-100 text-blue-600" />
              <ServiceIcon icon={Stethoscope} label="Doctors" color="bg-emerald-100 text-emerald-600" />
              <ServiceIcon icon={GraduationCap} label="School" color="bg-orange-100 text-orange-600" />
              <ServiceIcon icon={Truck} label="Transport" color="bg-yellow-100 text-yellow-600" />
            </div>
          </div>

          {/* Featured Deals / Merchants */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4 px-2">Local Shops (Retail POS)</h2>
            <Card className="mb-3 border-0 shadow-sm overflow-hidden rounded-2xl cursor-pointer">
              <div className="h-24 bg-blue-500 p-4 flex items-end">
                <h3 className="text-white font-bold text-lg">Sharma General Store</h3>
              </div>
              <CardContent className="p-4">
                <p className="text-sm text-slate-500 mb-2">Groceries, Daily Needs • 1.2km</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Open Now</span>
                  <span className="text-sm font-semibold text-primary">Order &rarr;</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Job Portal Access */}
          <Card className="bg-gradient-to-r from-primary to-blue-600 border-0 rounded-2xl text-white cursor-pointer hover:opacity-90 transition-opacity">
            <CardContent className="p-5 flex justify-between items-center">
              <div>
                <h3 className="font-bold mb-1">Local Job Portal</h3>
                <p className="text-xs text-white/80">Upload CV & apply to merchants directly.</p>
              </div>
              <div className="bg-white/20 p-2 rounded-xl">
                <UserIcon size={24} />
              </div>
            </CardContent>
          </Card>

        </main>

        {/* Bottom Nav Bar */}
        <nav className="absolute bottom-0 w-full bg-white border-t border-slate-100 px-6 py-4 flex justify-between items-center rounded-b-[2rem]">
          <NavItem icon={Home} label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <NavItem icon={ShoppingBag} label="Orders" active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} />
          <NavItem icon={Wallet} label="Wallet" active={activeTab === 'wallet'} onClick={() => setActiveTab('wallet')} />
          <NavItem icon={UserIcon} label="Profile" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
        </nav>
      </div>
    </div>
  );
}

function ServiceIcon({ icon: Icon, label, color }: { icon: any, label: string, color: string }) {
  return (
    <div className="flex flex-col items-center gap-2 cursor-pointer hover:scale-105 transition-transform">
      <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center`}>
        <Icon size={24} />
      </div>
      <span className="text-xs font-medium text-slate-700 text-center">{label}</span>
    </div>
  );
}

function NavItem({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <div onClick={onClick} className="flex flex-col items-center gap-1 cursor-pointer">
      <Icon size={24} className={active ? 'text-primary' : 'text-slate-400'} />
      <span className={`text-[10px] font-medium ${active ? 'text-primary' : 'text-slate-400'}`}>{label}</span>
    </div>
  );
}
