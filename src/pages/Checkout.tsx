import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { getSupabaseClient } from '../lib/supabase';

export default function Checkout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const moduleName = searchParams.get('module') || 'General';
  const plan = searchParams.get('plan') || 'Free';

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    businessName: ''
  });
  
  const [isProcessing, setIsProcessing] = useState(false);

  const getPrice = () => {
    switch(plan) {
      case 'Free': return 1;
      case 'Pro': return 999;
      case 'Custom': return 0; // Handled separately
      default: return 1;
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Database not connected");

      // Save subscription/billing info to Supabase
      const { error } = await supabase.from('subscriptions').insert({
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        businessName: formData.businessName,
        module: moduleName,
        plan: plan,
        amount: getPrice() * 1.18, // Total with GST
        status: plan === 'Custom' ? 'pending_contact' : 'active',
      });
      
      if (error) throw error;
      
      alert(`Payment of ₹${getPrice()} successful! Generating bill...`);
      navigate('/login', { state: { module: moduleName } });
    } catch (error) {
      console.error("Error saving subscription:", error);
      alert("There was an error processing your request. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-4xl flex items-center gap-3 mb-8 cursor-pointer" onClick={() => navigate('/')}>
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl">B</div>
        <span className="text-2xl font-extrabold tracking-tight text-slate-900">BahiBox Checkout</span>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Form Section */}
        <Card>
          <CardHeader>
            <CardTitle>Billing Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCheckout} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name</label>
                <Input 
                  required 
                  placeholder="Rahul Kumar" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone Number</label>
                <Input 
                  required 
                  placeholder="+91 XXXXX XXXXX" 
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email Address</label>
                <Input 
                  required 
                  type="email"
                  placeholder="rahul@example.com" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Business Name</label>
                <Input 
                  required 
                  placeholder="Sharma General Store" 
                  value={formData.businessName}
                  onChange={e => setFormData({...formData, businessName: e.target.value})}
                />
              </div>

              {plan !== 'Custom' && (
                <div className="pt-4 border-t mt-6">
                  <h3 className="text-sm font-medium mb-3">Payment Method</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Button type="button" variant="outline" className="justify-center border-primary bg-primary/5">
                      UPI
                    </Button>
                    <Button type="button" variant="outline" className="justify-center">
                      Card
                    </Button>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full mt-6 h-12 text-lg" disabled={isProcessing}>
                {isProcessing ? 'Processing...' : (plan === 'Custom' ? 'Submit Request' : `Pay ₹${getPrice()} Now`)}
              </Button>
              <Button type="button" variant="outline" className="w-full mt-2" onClick={() => navigate('/')}>
                Back to Home Page
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Order Summary Section */}
        <Card className="h-fit bg-slate-900 text-white border-0">
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-start pb-4 border-b border-white/20">
                <div>
                  <p className="font-semibold text-lg">{moduleName} Module</p>
                  <p className="text-sm text-white/60">{plan} Plan</p>
                </div>
                <p className="font-bold">₹{getPrice()}</p>
              </div>

              <div className="flex justify-between items-center text-sm text-white/60">
                <p>Subtotal</p>
                <p>₹{getPrice()}</p>
              </div>
              <div className="flex justify-between items-center text-sm text-white/60">
                <p>Taxes (GST 18%)</p>
                <p>₹{(getPrice() * 0.18).toFixed(2)}</p>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-white/20 text-xl font-bold">
                <p>Total</p>
                <p>₹{(getPrice() * 1.18).toFixed(2)}</p>
              </div>

              {plan === 'Free' && (
                <div className="mt-6 p-4 bg-white/10 rounded-lg text-sm text-white/80">
                  <p><strong>Note:</strong> A nominal fee of ₹1 is charged to verify your payment method. This helps us prevent spam and abuse.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
