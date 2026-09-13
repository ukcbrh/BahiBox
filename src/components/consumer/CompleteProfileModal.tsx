import React, { useState } from 'react';
import { UserCircle, Loader2 } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { getSupabaseClient } from '@/src/lib/supabase';

interface CompleteProfileModalProps {
  userId: string;
  onComplete: (fullName: string) => void;
  onSkip: () => void;
}

export function CompleteProfileModal({ userId, onComplete, onSkip }: CompleteProfileModalProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { error: updateError } = await supabase
        .from('users')
        .update({ full_name: name.trim() })
        .eq('id', userId);
      if (updateError) throw updateError;

      // Auth-metadata bhi update karo, taaki header mein naam turant 
      // dikhe (userName is se derive hota hai)
      const { error: metaError } = await supabase.auth.updateUser({
        data: { full_name: name.trim() }
      });
      if (metaError) console.warn('Metadata update failed:', metaError.message);

      onComplete(name.trim());
    } catch (err: any) {
      setError(err.message || 'Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-slate-950 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        <div className="p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserCircle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">What's your name?</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Help us personalize your experience.</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 font-medium border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <Input
              type="text"
              placeholder="Enter your full name"
              className="h-14 text-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <Button
              type="submit"
              className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg"
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : null}
              Save
            </Button>
            <button
              type="button"
              onClick={onSkip}
              className="w-full text-center text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium"
            >
              Skip for now
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
