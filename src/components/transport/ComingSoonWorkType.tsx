import React from 'react';
import { Construction } from 'lucide-react';

export function ComingSoonWorkType() {
  return (
    <div className="w-full max-w-xl mx-auto py-16 text-center space-y-6">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
        <Construction className="w-10 h-10 text-primary" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Coming Soon</h1>
      <p className="text-slate-500 dark:text-slate-400">
        Tools for this kind of driving work are being built and will be available soon.
      </p>
    </div>
  );
}
