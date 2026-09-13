import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Activity } from 'lucide-react';

interface HealthcarePlaceholderProps {
  title: string;
}

export function HealthcarePlaceholder({ title }: HealthcarePlaceholderProps) {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Healthcare & Clinic Module</p>
        </div>
      </div>
      
      <Card className="border-dashed border-2 bg-slate-50 dark:bg-slate-900/50">
        <CardContent className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
            <Activity size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Under Construction</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            The {title} view is currently being built. This will be available in the upcoming healthcare release.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
