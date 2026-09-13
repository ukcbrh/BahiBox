import React, { useState, useEffect } from 'react';
import { Smartphone, ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { getSupabaseClient } from '@/src/lib/supabase';

export function RiderLoginScreen() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const supabase = getSupabaseClient();

  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (countdown > 0) return;
    setLoading(true);
    setError('');
    try {
      if (!supabase) throw new Error('Client not ready');
      const { error: sendError } = await supabase.auth.signInWithOtp({ phone: '+91' + phone });
      if (sendError) throw sendError;
      setStep('otp');
      setCountdown(60);
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit OTP.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (!supabase) throw new Error('Client not ready');
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone: '+91' + phone,
        token: otp,
        type: 'sms'
      });
      if (verifyError) throw verifyError;
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            {step === 'phone' ? <Smartphone size={32} /> : <ShieldCheck size={32} />}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Partner Login</h1>
          <p className="text-slate-500 text-sm">
            {step === 'phone' ? 'Enter your registered mobile number' : `We've sent a 6-digit code to +91 ${phone}`}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 font-medium border border-red-100">
            {error}
          </div>
        )}

        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold border-r pr-3 border-slate-300">+91</span>
              <Input
                type="tel"
                placeholder="Enter 10-digit number"
                className="pl-16 h-14 text-lg bg-white border-slate-200"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                maxLength={10}
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl" disabled={loading || phone.length !== 10}>
              {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : null}
              Send OTP
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <Input
              type="text"
              placeholder="Enter 6-digit OTP"
              className="h-14 text-center text-2xl tracking-[0.5em] font-bold bg-white border-slate-200"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              autoFocus
            />
            <Button type="submit" className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl" disabled={loading || otp.length !== 6}>
              {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : null}
              Verify & Continue
            </Button>
            <div className="text-center text-sm">
              {countdown > 0 ? (
                <span className="text-slate-400 font-medium">Resend in {countdown}s</span>
              ) : (
                <button type="button" onClick={() => setStep('phone')} className="text-blue-600 font-bold hover:underline">
                  Change number
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
