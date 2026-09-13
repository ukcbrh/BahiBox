import React from 'react';
import { 
  Tractor, 
  Sprout, 
  CloudRain, 
  Warehouse, 
  Users, 
  Landmark, 
  LineChart, 
  Settings,
  Leaf
} from 'lucide-react';

interface AgriculturePlaceholderProps {
  title: string;
}

export const AgriculturePlaceholder: React.FC<AgriculturePlaceholderProps> = ({ title }) => {
  return (
    <div className="flex-1 p-6 h-full overflow-auto bg-green-50/30">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-green-900">{title}</h1>
        <p className="text-green-600/80">Manage your farm, crops, and agricultural operations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl shadow-sm border border-green-100 flex flex-col items-center justify-center text-center">
           <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Tractor className="text-green-600 w-8 h-8" />
           </div>
           <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Farm & Crop</h3>
           <p className="text-sm text-slate-500 dark:text-slate-400">Plot directory, smart calendar, and crop registry.</p>
        </div>
        
        <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl shadow-sm border border-green-100 flex flex-col items-center justify-center text-center">
           <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <Warehouse className="text-emerald-600 w-8 h-8" />
           </div>
           <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Godown & Inventory</h3>
           <p className="text-sm text-slate-500 dark:text-slate-400">Seeds, fertilizers, stock tracking & alerts.</p>
        </div>
        
        <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl shadow-sm border border-green-100 flex flex-col items-center justify-center text-center">
           <div className="w-16 h-16 bg-lime-100 rounded-full flex items-center justify-center mb-4">
              <Users className="text-lime-600 w-8 h-8" />
           </div>
           <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Team & Labor</h3>
           <p className="text-sm text-slate-500 dark:text-slate-400">Smart attendance, piece-rate, and daily wages.</p>
        </div>

        <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl shadow-sm border border-green-100 flex flex-col items-center justify-center text-center">
           <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mb-4">
              <Landmark className="text-teal-600 w-8 h-8" />
           </div>
           <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Bank & Loans</h3>
           <p className="text-sm text-slate-500 dark:text-slate-400">KCC, crop budget planner, and EMI tracking.</p>
        </div>

         <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl shadow-sm border border-green-100 flex flex-col items-center justify-center text-center">
           <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <Leaf className="text-yellow-600 w-8 h-8" />
           </div>
           <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Sales & Billing</h3>
           <p className="text-sm text-slate-500 dark:text-slate-400">Mandi sales, weighing, and payment tracking.</p>
        </div>

        <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl shadow-sm border border-green-100 flex flex-col items-center justify-center text-center">
           <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <LineChart className="text-blue-600 w-8 h-8" />
           </div>
           <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Reports</h3>
           <p className="text-sm text-slate-500 dark:text-slate-400">Crop-wise P&L, yield reports, and analytics.</p>
        </div>
      </div>
      
      <div className="mt-8 bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <h4 className="font-bold text-green-800 mb-2">Agriculture Module Active</h4>
          <p className="text-sm text-green-700">The "Farm to Mandi" digital workflow is currently being configured.</p>
      </div>
    </div>
  );
};
