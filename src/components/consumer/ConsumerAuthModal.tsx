import React, { useState, useEffect } from 'react';
import { X, Smartphone, ShieldCheck, Loader2, Mail } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { getSupabaseClient } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { toast } from 'sonner';

interface ConsumerAuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function ConsumerAuthModal({ onClose, onSuccess }: ConsumerAuthModalProps) {
  const [step, setStep] = useState<'phone' | 'otp' | 'email' | 'forgot_password'>('phone');
  const [phone, setPhone] = useState('');
  const [authMethod, setAuthMethod] = useState<'phone' | 'email'>('phone');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [isSignUp, setIsSignUp] = useState(false);

  const supabase = getSupabaseClient();
  const { signInWithGoogle } = useAuth();

  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Ek hi jagah se symmetric-protection check hoti hai — Phone-OTP 
  // aur Email-login dono isi function ko call karte hain, taaki 
  // dono jagah consistent-check ho (pehle Phone-OTP mein yeh missing tha)
  const checkNotMerchantAndProceed = async (userId: string) => {
    const { data: consumerRole } = await supabase.from('consumer_profiles').select('*').eq('user_id', userId).maybeSingle();
    if (!consumerRole) {
      const { data: merchantRole } = await supabase.from('user_tenant_roles').select('*').eq('user_id', userId).eq('is_active', true).limit(1);
      if (merchantRole && merchantRole.length > 0) {
        await supabase.auth.signOut();
        setError("This account is registered as a merchant/partner account, not a customer account. Please use a different account to shop.");
        return false;
      }
    }
    onSuccess();
    return true;
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      if (data?.user) {
        await checkNotMerchantAndProceed(data.user.id);
      }
    } catch (err: any) {
      console.error('Email Login Error:', err);
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) {
        if (signUpError.message.includes('registered')) {
          setError('An account with this email already exists. Please log in instead.');
          setIsSignUp(false);
        } else {
          throw signUpError;
        }
        return;
      }
      if (data?.session) {
        // Session turant mil gaya (email-confirmation disabled hai is project mein)
        if (data.user) await checkNotMerchantAndProceed(data.user.id);
      } else if (data?.user) {
        // Email-confirmation zaroori hai — session turant nahi milega
        toast.success('Account created! Please check your email to confirm your account, then log in.');
        setIsSignUp(false);
        setPassword('');
      }
    } catch (err: any) {
      console.error('Email Sign Up Error:', err);
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email to reset password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/public?reset_password=true',
      });
      if (resetError) throw resetError;
      toast.success('Password reset link sent to your email.');
      setStep('email');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset link.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!phone || phone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (countdown > 0) {
      setError(`Please wait ${countdown} seconds before resending.`);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { error: sendError } = await supabase.auth.signInWithOtp({ phone: '+91' + phone });
      if (sendError) throw sendError;
      setStep('otp');
      setCountdown(60);
    } catch (err: any) {
      console.error('OTP Send Error:', err);
      if (err.status === 429) {
        setError('Too many requests. Please wait 60 seconds.');
        setCountdown(60);
      } else {
        setError(err.message || 'Failed to send OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        phone: '+91' + phone,
        token: otp,
        type: 'sms'
      });
      if (verifyError) throw verifyError;
      if (data?.user) {
        await checkNotMerchantAndProceed(data.user.id);
      }
    } catch (err: any) {
      console.error('OTP Verify Error:', err);
      if (err.message?.includes('expired') || err.message?.includes('invalid')) {
        setError('Invalid or expired OTP. Please try again.');
      } else {
        setError(err.message || 'Verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      // Consumer-context se aaya Google-login /public par wapas redirect 
      // hoga (Merchant-Login /login par hi rahega — dono alag)
      await signInWithGoogle('/public');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-slate-950 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 transition-colors z-10"
        >
          <X size={20} />
        </button>
        <div className="p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              {step === 'phone' || step === 'email' ? <Smartphone size={32} /> : <ShieldCheck size={32} />}
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              {step === 'forgot_password' ? 'Reset Password' : step === 'otp' ? 'Verify Mobile Number' : 'Login or Sign Up'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {step === 'forgot_password' ? 'Enter your email to receive a reset link.' : step === 'otp' ? `We've sent a 6-digit code to +91 ${phone}` : 'Log in to your account securely.'}
            </p>
          </div>

          {(step === 'phone' || step === 'email') && (
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-6">
              <button
                type="button"
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${authMethod === 'phone' && step === 'phone' ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                onClick={() => { setAuthMethod('phone'); setStep('phone'); setError(''); }}
              >
                Phone
              </button>
              <button
                type="button"
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${authMethod === 'email' && step === 'email' ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                onClick={() => { setAuthMethod('email'); setStep('email'); setError(''); }}
              >
                Email
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 font-medium border border-red-100">
              {error}
            </div>
          )}

          {step === 'phone' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 font-semibold border-r pr-3 border-slate-300 dark:border-slate-700">
                  +91
                </span>
                <Input
                  type="tel"
                  placeholder="Enter 10-digit number"
                  className="pl-16 h-14 text-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:bg-white dark:bg-slate-950 transition-colors"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  maxLength={10}
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-200 transition-all"
                disabled={loading || phone.length !== 10 || countdown > 0}
              >
                {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : null}
                {countdown > 0 ? `Wait ${countdown}s` : 'Send OTP'}
              </Button>
            </form>
          ) : step === 'email' ? (
            <form onSubmit={isSignUp ? handleEmailSignUp : handleEmailLogin} className="space-y-4">
              <Input
                type="email"
                placeholder="Email address"
                className="h-14 text-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:bg-white dark:bg-slate-950 transition-colors"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
              <Input
                type="password"
                placeholder={isSignUp ? "Create a password (min 6 characters)" : "Password"}
                className="h-14 text-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:bg-white dark:bg-slate-950 transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {!isSignUp && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => { setStep('forgot_password'); setError(''); }}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
              <Button
                type="submit"
                className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-200 transition-all"
                disabled={loading || !email || !password}
              >
                {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : null}
                {isSignUp ? 'Create Account' : 'Login with Email'}
              </Button>
              <div className="text-center mt-2">
                <button
                  type="button"
                  onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
                  className="text-slate-500 dark:text-slate-400 text-sm font-medium hover:text-slate-700 dark:hover:text-slate-300 underline"
                >
                  {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
                </button>
              </div>
            </form>
          ) : step === 'forgot_password' ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <Input
                type="email"
                placeholder="Enter your email"
                className="h-14 text-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:bg-white dark:bg-slate-950 transition-colors"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
              <Button
                type="submit"
                className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-200 transition-all"
                disabled={loading || !email}
              >
                {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : null}
                Send Reset Link
              </Button>
              <div className="text-center mt-2">
                <button
                  type="button"
                  onClick={() => { setStep('email'); setError(''); }}
                  className="text-slate-500 dark:text-slate-400 text-sm font-medium hover:text-slate-700 dark:hover:text-slate-300 underline"
                >
                  Back to Login
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div>
                <Input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  className="h-14 text-center text-2xl tracking-[0.5em] font-bold bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:bg-white dark:bg-slate-950 transition-colors"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-200 transition-all"
                disabled={loading || otp.length !== 6}
              >
                {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : null}
                Verify & Continue
              </Button>
              <div className="text-center text-sm">
                <span className="text-slate-500 dark:text-slate-400">Didn't receive the code? </span>
                {countdown > 0 ? (
                  <span className="text-slate-400 font-medium">Resend in {countdown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    className="text-blue-600 font-bold hover:underline"
                    disabled={loading}
                  >
                    Resend OTP
                  </button>
                )}
              </div>
              <div className="text-center mt-2">
                <button
                  type="button"
                  onClick={() => { setStep('phone'); setOtp(''); }}
                  className="text-slate-500 dark:text-slate-400 text-sm font-medium hover:text-slate-700 dark:hover:text-slate-300 underline"
                >
                  Change mobile number
                </button>
              </div>
            </form>
          )}

          {(step === 'phone' || step === 'email') && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white dark:bg-slate-950 px-2 text-slate-500 dark:text-slate-400">Or continue with</span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full h-14 text-base font-bold border-slate-200 dark:border-slate-800"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
              >
                {googleLoading ? <Loader2 className="animate-spin mr-2" size={20} /> : <Mail size={18} className="mr-2" />}
                Sign in with Google
              </Button>
            </>
          )}
        </div>

        <div className="bg-slate-50 dark:bg-slate-900 p-4 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
          By continuing, you agree to our Terms of Service & Privacy Policy.
        </div>
      </div>
    </div>
  );
}
