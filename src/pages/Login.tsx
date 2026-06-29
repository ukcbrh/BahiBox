import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { useAuth } from '../contexts/AuthContext';
import { ModuleType } from '../types';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function Login() {
  useDocumentTitle('BahiBox | Login');
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const { signInWithGoogle, signInWithEmail, user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate('/merchant');
    }
  }, [user, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setIsLoggingIn(true);
      let loginEmail = identifier;
      // If it's a User ID without @ symbol, append a domain to make it an email for Firebase Auth
      if (!identifier.includes('@')) {
        loginEmail = `${identifier}@staff.bahibox.local`;
      }
      await signInWithEmail(loginEmail, password);
      // navigation can be handled in useEffect or here if we know userRole, but for now we navigate manually or rely on a wrapper.
      // Wait, let's just go to /merchant, context will update
      navigate('/merchant');
    } catch (err: any) {
      setError('Failed to sign in. Please check your credentials.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError('');
      setIsLoggingIn(true);
      await signInWithGoogle();
      // Google Login Redirects the browser, so we don't navigate manually
    } catch (err: any) {
      if (err?.message?.includes('OAuth secret') || err?.message?.includes('Unsupported provider')) {
        setError('Google Sign-In requires configuring Google OAuth Client ID and Secret in your Supabase Dashboard under Authentication > Providers.');
      } else {
        setError('Failed to sign in with Google: ' + err.message);
      }
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col justify-center items-center p-4">
      <div className="mb-8 flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
        <img src="/logolight.png" alt="BahiBox Logo" className="h-28 md:h-36 dark:hidden object-contain" />
        <img src="/logodark.png" alt="BahiBox Logo" className="h-28 md:h-36 hidden dark:block object-contain" />
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">BahiBox Login</CardTitle>
          <p className="text-sm text-slate-500 mt-2">
            Sign in to your account
          </p>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address or User ID</label>
              <Input 
                type="text" 
                placeholder="Enter email or User ID" 
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input 
                type="password" 
                placeholder="Enter your password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            <Button type="submit" className="w-full mt-6" disabled={isLoggingIn || loading}>
              {isLoggingIn ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-slate-500">Or continue with</span>
            </div>
          </div>

          <Button type="button" variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={isLoggingIn || loading}>
            Sign in with Google
          </Button>

          <Button type="button" variant="ghost" className="w-full mt-2" onClick={() => navigate('/')}>
            Back to Home Page
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
