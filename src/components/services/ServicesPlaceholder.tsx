import React from 'react';
import { Calendar, BookOpen, Receipt, Users, Package, LineChart } from 'lucide-react';

interface ServicesPlaceholderProps {
  title: string;
}

export const ServicesPlaceholder: React.FC<ServicesPlaceholderProps> = ({ title }) => {
  return (
    <div className="flex-1 p-6 h-full overflow-auto bg-slate-50 dark:bg-slate-900">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{title}</h1>
        <p className="text-slate-500 dark:text-slate-400">Manage your service business operations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Placeholder cards to give a feel of the module */}
        <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
           <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Calendar className="text-primary w-8 h-8" />
           </div>
           <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Booking & Appointments</h3>
           <p className="text-sm text-slate-500 dark:text-slate-400">Calendar view, slots, and reminders.</p>
        </div>
        
        <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
           <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <BookOpen className="text-blue-500 w-8 h-8" />
           </div>
           <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Service Catalog</h3>
           <p className="text-sm text-slate-500 dark:text-slate-400">Rate card, packages, and material links.</p>
        </div>
        
        <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
           <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
              <Receipt className="text-green-500 w-8 h-8" />
           </div>
           <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Smart Billing</h3>
           <p className="text-sm text-slate-500 dark:text-slate-400">Fast billing, discounts, and digital receipts.</p>
        </div>

        <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
           <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mb-4">
              <Users className="text-orange-500 w-8 h-8" />
           </div>
           <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Staff & Team</h3>
           <p className="text-sm text-slate-500 dark:text-slate-400">Technicians, jobs assigned, and attendance.</p>
        </div>

         <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
           <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mb-4">
              <Package className="text-purple-500 w-8 h-8" />
           </div>
           <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Inventory Management</h3>
           <p className="text-sm text-slate-500 dark:text-slate-400">Material consumption and low stock alerts.</p>
        </div>

        <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
           <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <LineChart className="text-slate-600 dark:text-slate-400 w-8 h-8" />
           </div>
           <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Reports & Analytics</h3>
           <p className="text-sm text-slate-500 dark:text-slate-400">Sales, staff performance, and profit.</p>
        </div>
      </div>
      
      <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-6 text-center">
          <h4 className="font-bold text-blue-800 mb-2">Daily Services Module Active</h4>
          <p className="text-sm text-blue-600">The "Pure Service to Payment" module is currently being configured.</p>
      </div>
    </div>
  );
};
