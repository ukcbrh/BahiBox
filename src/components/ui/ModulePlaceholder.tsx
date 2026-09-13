import React from 'react';
import * as Icons from 'lucide-react';

export default function ModulePlaceholder({ title, description, icon }: { title: string, description: string, icon: string }) {
  const IconComponent = (Icons as any)[icon] || Icons.Box;
  
  return (
    <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 border-dashed min-h-[400px] text-center max-w-2xl mx-auto mt-10">
      <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 text-slate-400 rounded-2xl flex items-center justify-center mb-6">
        <IconComponent size={40} />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">{title} — coming soon</h2>
      <p className="text-slate-500 dark:text-slate-400 max-w-md">{description}</p>
    </div>
  );
}
