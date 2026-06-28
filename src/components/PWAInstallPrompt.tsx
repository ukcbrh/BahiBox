import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from './ui/button';

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:bottom-4 md:left-auto md:right-4 md:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 z-50 flex items-center justify-between animate-in slide-in-from-bottom-5">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-2 rounded-lg">
          <Download className="text-primary" size={24} />
        </div>
        <div>
          <h4 className="font-bold text-slate-900 text-sm">Install App</h4>
          <p className="text-xs text-slate-500">Add to home screen for quick access</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleInstallClick} className="h-8 text-xs font-bold px-4">
          Install
        </Button>
        <button onClick={() => setShowPrompt(false)} className="text-slate-400 hover:text-slate-600 p-1">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
