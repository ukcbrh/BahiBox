import React from 'react';
import { Truck } from 'lucide-react';

interface TransportPlaceholderProps {
  title: string;
}

export const TransportPlaceholder: React.FC<TransportPlaceholderProps> = ({ title }) => {
  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
      </div>
      
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-sm">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Truck className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Module Under Construction</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          The {title} view is currently being designed and built. It will be available soon with full functionality.
        </p>
      </div>
    </div>
  );
};
