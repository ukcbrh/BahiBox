import { loadRazorpayScript } from '@/src/lib/utils';
import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, Phone, MapPin, Package, LogOut, ChevronRight, CheckCircle2, Loader2, Key, Wallet } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { getSupabaseClient } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { WalletBalanceCard, LedgerHistoryTable, WithdrawalHistoryList } from '../WalletComponents';

import { OrderHistoryView } from './OrderHistoryView';
import { SavedAddressesView } from './SavedAddressesView';

interface ConsumerProfileViewProps {
  onLogout: () => void;
  tenantColor?: string;
  initialTab?: string;
}

export function ConsumerProfileView({ onLogout, tenantColor, initialTab = 'menu' }: ConsumerProfileViewProps) {
  const { user } = useAuth();
  const supabase = getSupabaseClient();
  const [activeView, setActiveView] = useState<'menu' | 'profile_edit' | 'security' | 'orders' | 'addresses' | 'wallet'>(initialTab as any);

  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Security Form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (user) {
      setFullName(user.user_metadata?.full_name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      // Update in auth.users
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: fullName }
      });
      if (authError) throw authError;

      // Update in public.users
      const { error: dbError } = await supabase
        .from('users')
        .update({ full_name: fullName })
        .eq('id', user.id);
      
      if (dbError) throw dbError;

      toast.success('Profile updated successfully');
      setActiveView('menu');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updates: { email?: string, password?: string } = {};
      if (email && email !== user?.email) updates.email = email;
      if (password) updates.password = password;

      if (Object.keys(updates).length === 0) {
        toast.info("No changes to save.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.updateUser(updates);
      if (error) throw error;

      if (updates.email && data?.user?.email !== email) {
        toast.success("Confirmation email sent! Please check your inbox to verify your new email.", { duration: 5000 });
      } else {
        toast.success("Security settings updated successfully");
      }
      
      setPassword(''); // Clear password after successful save
    } catch (error: any) {
      console.error('Error updating security:', error);
      toast.error(error.message || 'Failed to update security settings');
    } finally {
      setLoading(false);
    }
  };

  const MenuItem = ({ icon: Icon, title, subtitle, onClick, textColor = 'text-slate-800 dark:text-slate-200' }: any) => (
    <div 
      onClick={onClick}
      className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-all group"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center group-hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <Icon className={`w-6 h-6 ${textColor}`} />
        </div>
        <div>
          <h3 className={`font-bold ${textColor}`}>{title}</h3>
          {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{subtitle}</p>}
        </div>
      </div>
      <ChevronRight className="text-slate-400 w-5 h-5 group-hover:text-slate-600 dark:hover:text-slate-400 group-hover:translate-x-1 transition-all" />
    </div>
  );

  if (!user) return null;

  if (activeView === 'orders') {
    return (
      <div className="space-y-4">
        <button onClick={() => setActiveView('menu')} className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 mb-2">
          <ChevronRight className="w-4 h-4 rotate-180" /> Back to Profile
        </button>
        <OrderHistoryView />
      </div>
    );
  }

  if (activeView === 'addresses') {
    return (
      <div className="space-y-4">
        <button onClick={() => setActiveView('menu')} className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 mb-2">
          <ChevronRight className="w-4 h-4 rotate-180" /> Back to Profile
        </button>
        <SavedAddressesView tenantColor={tenantColor} />
      </div>
    );
  }

  if (activeView === 'profile_edit') {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <button onClick={() => setActiveView('menu')} className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 mb-2">
          <ChevronRight className="w-4 h-4 rotate-180" /> Back to Profile
        </button>
        
        <div className="bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
            <User className="w-6 h-6 text-slate-700 dark:text-slate-300" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Personal Details</h2>
          </div>
          
          <form onSubmit={handleUpdateProfile} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Full Name</label>
              <Input 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="h-12 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Phone Number (Login)</label>
              <div className="h-12 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center px-3 text-slate-500 dark:text-slate-400 font-medium cursor-not-allowed select-none">
                {user.phone || 'No phone linked'}
                <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />
              </div>
              <p className="text-xs text-slate-400 mt-1.5">Verified. This is your primary login method.</p>
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-12 text-base font-bold rounded-xl text-white"
              style={{ backgroundColor: tenantColor || '#0f172a' }}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Save Changes'}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (activeView === 'security') {
    return (
       <div className="max-w-xl mx-auto space-y-6">
        <button onClick={() => setActiveView('menu')} className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 mb-2">
          <ChevronRight className="w-4 h-4 rotate-180" /> Back to Profile
        </button>
        
        <div className="bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
            <Lock className="w-6 h-6 text-slate-700 dark:text-slate-300" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Account Security</h2>
          </div>
          
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 leading-relaxed">
            You can link an email address and password to your account. This allows you to log in using either your phone number with an OTP, or your email and password.
          </p>

          <form onSubmit={handleUpdateSecurity} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
              <Input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-12 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              />
              {user.email && user.email === email && (
                 <p className="text-xs text-emerald-600 mt-1.5 font-medium flex items-center gap-1">
                   <CheckCircle2 className="w-3 h-3" /> Email is verified
                 </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">New Password</label>
              <Input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={user.email ? "Enter new password to change" : "Create a strong password"}
                className="h-12 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              />
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-12 text-base font-bold rounded-xl text-white"
              style={{ backgroundColor: tenantColor || '#0f172a' }}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Update Security Settings'}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (activeView === 'wallet') {
    return (
      <div className="space-y-4">
        <button onClick={() => setActiveView('menu')} className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 mb-2">
          <ChevronRight className="w-4 h-4 rotate-180" /> Back to Profile
        </button>
        <ConsumerWalletView onBack={() => setActiveView('menu')} />
      </div>
    );
  }

  // default 'menu' view
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header Profile Summary */}
      <div className="bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-5">
        <div 
          className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white"
          style={{ backgroundColor: tenantColor || '#0f172a' }}
        >
          {user.user_metadata?.full_name?.split(' ').map((n: any) => n[0]).join('').substring(0, 2).toUpperCase() || 'U'}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{user.user_metadata?.full_name || 'Guest User'}</h2>
          <div className="flex items-center gap-2 mt-1 text-slate-500 dark:text-slate-400 font-medium text-sm">
            <Phone className="w-4 h-4" />
            <span>{user.phone}</span>
          </div>
          {user.email && (
            <div className="flex items-center gap-2 mt-1 text-slate-500 dark:text-slate-400 font-medium text-sm">
              <Mail className="w-4 h-4" />
              <span>{user.email}</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-bold text-slate-400 uppercase tracking-wider text-xs px-2 mb-2">Account Settings</h3>
        <MenuItem 
          icon={User} 
          title="Personal Details" 
          subtitle="Update your name and profile information" 
          onClick={() => setActiveView('profile_edit')}
        />
        <MenuItem 
          icon={Key} 
          title="Security & Login" 
          subtitle="Manage email, password, and login methods" 
          onClick={() => setActiveView('security')}
        />
        <MenuItem 
          icon={MapPin} 
          title="Saved Addresses" 
          subtitle="Manage delivery locations for faster checkout" 
          onClick={() => setActiveView('addresses')}
        />
      </div>

      <div className="space-y-3">
        <h3 className="font-bold text-slate-400 uppercase tracking-wider text-xs px-2 mb-2">My Activity</h3>
        <MenuItem 
          icon={Package} 
          title="Order History" 
          subtitle="View and track your past orders" 
          onClick={() => setActiveView('orders')}
        />

        <MenuItem 
          icon={Wallet} 
          title="My Wallet" 
          subtitle="Manage your balance and top up" 
          onClick={() => setActiveView('wallet')}
        />

      </div>

      <div className="pt-4">
        <Button 
          variant="outline"
          onClick={() => {
            if (window.confirm('Are you sure you want to log out?')) {
              onLogout();
            }
          }}
          className="w-full h-14 rounded-2xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 font-bold text-lg"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Log Out
        </Button>
      </div>
    </div>
  );
}


function ConsumerWalletView({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [walletId, setWalletId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [walletError, setWalletError] = useState<string | null>(null);

  const [activeWalletTab, setActiveWalletTab] = useState<'recharge' | 'withdraw' | 'send'>('recharge');
  const [sendForm, setSendForm] = useState({ phone: '', amount: '', note: '' });
  const [sendLoading, setSendLoading] = useState(false);
  const [recipientIdentifier, setRecipientIdentifier] = useState('');
  const [verifiedRecipient, setVerifiedRecipient] = useState<{full_name: string, phone: string, is_business: boolean, business_name: string | null} | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', name: '', account: '', ifsc: '' });
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [platformSettings, setPlatformSettings] = useState<any>(null);

  const handleSendMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletId || !user) return;
    const amount = parseFloat(sendForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Invalid amount");
      return;
    }
    if (!sendForm.phone) {
      toast.error("Please enter a phone number");
      return;
    }
    setSendLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
       const { data, error } = await supabase.rpc('transfer_wallet_to_phone', {
           p_from_wallet_id: walletId,
           p_amount: amount,
           p_to_phone: sendForm.phone,
           p_description: sendForm.note || 'Wallet Transfer'
       });
       if (error) throw error;
       toast.success(`Successfully sent ₹${amount} to ${data.recipient_name || 'recipient'}`);
       setSendForm({ phone: '', amount: '', note: '' });
       setVerifiedRecipient(null);
       setRecipientIdentifier('');
       setRefreshKey(k => k + 1);
    } catch (err: any) {
       toast.error(err.message || 'Transfer failed');
    } finally {
       setSendLoading(false);
    }
  };
  const handleVerifyRecipient = async () => {
    if (!recipientIdentifier.trim()) {
      toast.error('Enter phone or email');
      return;
    }
    setVerifyLoading(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data, error } = await supabase.rpc('lookup_wallet_recipient', {
        p_identifier: recipientIdentifier.trim()
      });
      if (error) throw error;
      const recipient = Array.isArray(data) ? data[0] : data;
      if (!recipient) throw new Error('Recipient not found');
      setVerifiedRecipient(recipient);
      setSendForm(prev => ({ ...prev, phone: recipient.phone }));
    } catch (err: any) {
      toast.error(err.message || 'Could not verify recipient');
      setVerifiedRecipient(null);
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleChangeRecipient = () => {
    setVerifiedRecipient(null);
    setRecipientIdentifier('');
    setSendForm(prev => ({ ...prev, phone: '' }));
  };


  const handleWithdrawRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletId || !user) return;
    const amount = parseFloat(withdrawForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Invalid amount");
      return;
    }
    if (!withdrawForm.name || !withdrawForm.account || !withdrawForm.ifsc) {
      toast.error("Please fill all bank details");
      return;
    }

    setWithdrawLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
       const { error } = await supabase.rpc('request_withdrawal', {
           p_wallet_id: walletId,
           p_amount: amount,
           p_account_holder_name: withdrawForm.name,
           p_bank_account_number: withdrawForm.account,
           p_bank_ifsc: withdrawForm.ifsc,
           p_requester_type: 'consumer'
       });
       if (error) throw error;
       toast.success("Withdrawal request submitted successfully");
       setActiveWalletTab('recharge');
       setWithdrawForm({ amount: '', name: '', account: '', ifsc: '' });
       setRefreshKey(k => k + 1);
    } catch(err: any) {
       toast.error(err.message || 'Withdrawal request failed');
    } finally {
       setWithdrawLoading(false);
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
        const supabase = getSupabaseClient();
        if(!supabase) return;
        const { data } = await supabase.from('platform_settings').select('*');
        if(data) {
            const settingsMap = data.reduce((acc: any, curr: any) => {
                acc[curr.setting_key] = curr.setting_value;
                return acc;
            }, {});
            setPlatformSettings(settingsMap);
        }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    const initWallet = async () => {
      const supabase = getSupabaseClient();
      if (!supabase || !user) return;
      setWalletError(null);
      try {
        const { data: wId, error } = await supabase.rpc('get_or_create_platform_wallet', { p_user_id: user.id });
        if (error) throw new Error(error.message);
        if (wId) setWalletId(wId);
      } catch (err: any) {
        console.error("Failed to init consumer wallet", err);
        setWalletError("Failed to load wallet — please try again");
      }
    };
    initWallet();
  }, [user]);

  const handleRecharge = async () => {
    if (!walletId || !user) return;
    const amountStr = prompt("Enter amount to recharge (₹):", "200");
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) return;
    
    setLoading(true);
    const supabase = getSupabaseClient();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/create-wallet-recharge-order', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token || ''}`
          },
          body: JSON.stringify({
              amount: amount,
              wallet_owner_context: 'consumer'
          })
      });

      if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to create Razorpay order');
      }
      
      const orderData = await response.json();
      
      console.log("RZP KEY FROM BACKEND:", orderData.razorpay_key_id); const options = {
          key: orderData.razorpay_key_id,
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'BahiBox',
          description: `Wallet Recharge`,
          order_id: orderData.razorpay_order_id,
          handler: async function (response: any) {
              const { error } = await supabase.rpc('capture_payment', {
                  p_payment_order_id: orderData.payment_order_id,
                  p_razorpay_payment_id: response.razorpay_payment_id,
                  p_method: 'razorpay',
                  p_gateway_fee: 0,
                  p_raw_response: response
              });
              
              if (error) {
                  toast.error(error.message || 'Payment capture failed');
              } else {
                  toast.success(`Successfully recharged ₹${amount}`);
                  setRefreshKey(k => k + 1);
              }
          },
          prefill: {
              name: user.full_name || '',
              email: user.email || '',
              contact: user.phone || ''
          },
          theme: {
              color: '#3b82f6'
          }
      };

      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        toast.error('Failed to load payment gateway');
        return;
      }
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
          toast.error(response.error.description || 'Payment failed');
      });
      rzp.open();

    } catch (err: any) {
      toast.error(err.message || 'Recharge failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div key={refreshKey} className="animate-in fade-in duration-300">
      <button onClick={onBack} className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 mb-2">
        ← Back
      </button>
      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
        <Wallet className="w-5 h-5" /> My Wallet
      </h3>
      
      {walletError ? (
        <div className="p-8 text-center text-red-500 font-medium">{walletError}</div>
      ) : !walletId ? (
         <div className="p-8 text-center text-slate-500">Loading wallet...</div>
      ) : (
         <div className="space-y-6">
           <WalletBalanceCard walletId={walletId} onRefresh={() => setRefreshKey(k=>k+1)} />
           <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full">
            <button
              onClick={() => setActiveWalletTab('recharge')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${activeWalletTab === 'recharge' ? 'bg-white dark:bg-slate-900 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
            >
              Recharge
            </button>
            <button
              onClick={() => setActiveWalletTab('withdraw')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${activeWalletTab === 'withdraw' ? 'bg-white dark:bg-slate-900 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
            >
              Withdraw
            </button>
            <button
              onClick={() => setActiveWalletTab('send')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${activeWalletTab === 'send' ? 'bg-white dark:bg-slate-900 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
            >
              Send Money
            </button>
          </div>

          {activeWalletTab === 'recharge' && (
            <Card className="shadow-sm border-none bg-white dark:bg-slate-950">
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-lg">Recharge Balance</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={handleRecharge} disabled={loading}>
                  {loading ? 'Processing...' : 'Add Amount'}
                </Button>
              </CardContent>
            </Card>
          )}
          {activeWalletTab === 'withdraw' && (
            <Card className="shadow-sm border-none bg-white dark:bg-slate-950">
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-lg">Withdraw Funds</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleWithdrawRequest} className="space-y-4">
                  <div>
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Amount (₹)</label>
                    <Input type="number" required min="1" value={withdrawForm.amount} onChange={e => setWithdrawForm({...withdrawForm, amount: e.target.value})} placeholder="e.g. 5000" />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Account Holder Name</label>
                    <Input required value={withdrawForm.name} onChange={e => setWithdrawForm({...withdrawForm, name: e.target.value})} placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Bank Account Number</label>
                    <Input required value={withdrawForm.account} onChange={e => setWithdrawForm({...withdrawForm, account: e.target.value})} placeholder="Account Number" />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Bank IFSC Code</label>
                    <Input required value={withdrawForm.ifsc} onChange={e => setWithdrawForm({...withdrawForm, ifsc: e.target.value})} placeholder="e.g. HDFC0001234" />
                  </div>
                  
                  {platformSettings && (
                    <div className="space-y-2">
                        <p className="text-xs text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                            Withdraw between ₹{platformSettings.withdrawal_min_amount || 100} and ₹{platformSettings.withdrawal_max_amount || 50000}. A {platformSettings.withdrawal_charge_percent || 0}% platform charge applies. Funds typically settle within {platformSettings.withdrawal_settlement_days || 4} working days.
                        </p>
                        {parseFloat(withdrawForm.amount || '0') > 0 && (
                            <div className="text-sm p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                                <div className="flex justify-between text-slate-600 dark:text-slate-400 mb-1">
                                    <span>You'll receive:</span>
                                    <span className="font-medium text-slate-900 dark:text-white">₹{parseFloat(withdrawForm.amount).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-slate-600 dark:text-slate-400 mb-1">
                                    <span>Charge ({platformSettings.withdrawal_charge_percent || 0}%):</span>
                                    <span className="font-medium text-slate-900 dark:text-white">₹{(parseFloat(withdrawForm.amount) * (parseFloat(platformSettings.withdrawal_charge_percent) || 0) / 100).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between font-bold border-t border-slate-200 dark:border-slate-800 pt-1 mt-1">
                                    <span className="text-slate-900 dark:text-white">Total deducted from wallet:</span>
                                    <span className="text-slate-900 dark:text-white">₹{(parseFloat(withdrawForm.amount) * (1 + (parseFloat(platformSettings.withdrawal_charge_percent) || 0) / 100)).toFixed(2)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                  )}
                  <Button type="submit" className="w-full" disabled={withdrawLoading}>
                    {withdrawLoading ? 'Submitting...' : 'Request Withdrawal'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {activeWalletTab === 'send' && (
            <Card className="shadow-sm border-none bg-white dark:bg-slate-950">
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-lg">Send Money</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {!verifiedRecipient ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Recipient Phone or Email</label>
                      <Input
                        value={recipientIdentifier}
                        onChange={e => setRecipientIdentifier(e.target.value)}
                        placeholder="e.g. 9876543210 or name@email.com"
                      />
                    </div>
                    <Button className="w-full" onClick={handleVerifyRecipient} disabled={verifyLoading}>
                      {verifyLoading ? 'Verifying...' : 'Verify Recipient'}
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSendMoney} className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <div>
                        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase">Sending to</p>
                        <p className="font-bold text-slate-900 dark:text-white">
                          {verifiedRecipient.is_business ? verifiedRecipient.business_name : verifiedRecipient.full_name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{verifiedRecipient.phone}</p>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={handleChangeRecipient}>Change</Button>
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Amount (₹)</label>
                      <Input type="number" required min="1" value={sendForm.amount} onChange={e => setSendForm({...sendForm, amount: e.target.value})} placeholder="e.g. 500" />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Note (optional)</label>
                      <Input value={sendForm.note} onChange={e => setSendForm({...sendForm, note: e.target.value})} placeholder="What's this for?" />
                    </div>
                    <Button type="submit" className="w-full" disabled={sendLoading}>
                      {sendLoading ? 'Sending...' : `Send ₹${sendForm.amount || '0'}`}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          )}
           <WithdrawalHistoryList walletId={walletId} />
           <LedgerHistoryTable walletId={walletId} />
         </div>
      )}
    </div>
  );
}
