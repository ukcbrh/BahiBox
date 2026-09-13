import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { getSupabaseClient } from '@/src/lib/supabase';
import { Loader2, CheckCircle2 } from 'lucide-react';

export default function SetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }: any) => {
      if (data?.session) {
        setSessionReady(true);
      } else {
        setError('Yeh link expire ho chuka hai ya invalid hai. Kripya dobara subscribe karein ya Login page se "Forgot Password" try karein.');
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password kam se kam 6 characters ka hona chahiye.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Dono password match nahi kar rahe.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Client not ready');
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      await supabase.auth.signOut();
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.message || 'Password set karne mein error aayi.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Password set ho gaya!</h2>
          <p className="text-slate-500 mt-2">Aapko Login page par bheja ja raha hai...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="mb-8 flex items-center gap-3">
        <img src="/logolight.png" alt="BahiBox" className="h-16 dark:hidden object-contain" />
        <img src="/logodark.png" alt="BahiBox" className="h-16 hidden dark:block object-contain" />
      </div>
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Create Your Password</CardTitle>
          <p className="text-sm text-slate-500 mt-2">Set a password to secure your BahiBox merchant account.</p>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}
          {sessionReady && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="password"
                placeholder="New Password"
                className="h-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
              <Input
                type="password"
                placeholder="Confirm Password"
                className="h-12"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <Button type="submit" className="w-full h-12 text-base font-bold" disabled={loading}>
                {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
                Set Password & Continue to Login
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
