import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '@/src/lib/supabase';
import { toast } from 'sonner';
import { Loader2, Key, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';

export function ResetPasswordModal() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    // Supabase passes type=recovery or we manually passed reset_password=true
    if (searchParams.get('reset_password') === 'true' || searchParams.get('type') === 'recovery') {
      setShow(true);
      const supabase = getSupabaseClient();
      if (supabase) {
        supabase.auth.getSession().then(({ data }: any) => {
          setSessionValid(!!data?.session);
        });
      } else {
        setSessionValid(false);
      }
    }
  }, [searchParams]);

  if (!show) return null;

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabase is not connected");

      const { data: sessionCheck } = await supabase.auth.getSession();
      console.log('DEBUG session right before updateUser:', sessionCheck);
      if (!sessionCheck?.session) {
        toast.error('DEBUG: no session found right before submit (sessionValid was ' + sessionValid + ')');
        setLoading(false);
        return;
      }
      
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) throw error;
      
      toast.success('Password updated successfully! You can now log in.');
      setResetSuccess(true);

      // Clear URL params/hash so the token isn't left in the address bar
      searchParams.delete('reset_password');
      searchParams.delete('type');
      setSearchParams(searchParams);
      window.history.replaceState(null, '', window.location.pathname);

      setTimeout(() => {
        setShow(false);
        navigate('/login');
      }, 1500);
      
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast.error(error.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <div className="bg-white dark:bg-slate-950 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        <button 
          onClick={() => {
            searchParams.delete('reset_password');
            searchParams.delete('type');
            setSearchParams(searchParams);
            setShow(false);
          }}
          className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 transition-colors z-10"
        >
          <X size={20} />
        </button>
        <div className="p-8">
          {resetSuccess ? (
            <div className="text-center py-4">
              <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Password Updated!</h2>
              <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Aapko Login page par bheja ja raha hai...</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Key size={32} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Set New Password</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  Please enter your new password below.
                </p>
              </div>
              
              {sessionValid === false ? (
                <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-xl text-red-600 dark:text-red-400 text-sm">
                  Yeh link expire ho chuka hai ya pehle hi use ho chuka hai. Kripya "Forgot Password" se dobara try karein.
                </div>
              ) : (
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div>
                    <Input
                      type="password"
                      placeholder="Enter new password"
                      className="h-14 text-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:bg-white dark:bg-slate-950 transition-colors"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoFocus
                      required
                      minLength={6}
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-200 transition-all"
                    disabled={loading || !password || sessionValid !== true}
                  >
                    {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : null}
                    Update Password
                  </Button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
