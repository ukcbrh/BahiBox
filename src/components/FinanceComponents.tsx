import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { BookOpen, Calculator, Calendar, Landmark, Settings, Table, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getSupabaseClient } from '../lib/supabase';
import { toast } from 'sonner';

export function FinanceDashboard() {
  const { tenant } = useAuth();
  
  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Finance & Accounting Engine</h2>
        <p className="text-slate-500">Stage 0 - Core Double Entry, TDS, EMI, Assets & Year-End Close.</p>
      </div>

      <Tabs defaultValue="coa" className="w-full">
        <TabsList className="bg-white border rounded-lg p-1 h-auto mb-6">
          <TabsTrigger value="coa" className="flex gap-2 py-2 data-[state=active]:bg-slate-100">
            <Table size={16}/> Chart of Accounts
          </TabsTrigger>
          <TabsTrigger value="journal" className="flex gap-2 py-2 data-[state=active]:bg-slate-100">
            <BookOpen size={16}/> Journal Entries
          </TabsTrigger>
          <TabsTrigger value="emi" className="flex gap-2 py-2 data-[state=active]:bg-slate-100">
            <Calculator size={16}/> EMI / BNPL
          </TabsTrigger>
          <TabsTrigger value="assets" className="flex gap-2 py-2 data-[state=active]:bg-slate-100">
            <Landmark size={16}/> Fixed Assets
          </TabsTrigger>
          <TabsTrigger value="closing" className="flex gap-2 py-2 data-[state=active]:bg-slate-100">
            <Calendar size={16}/> FY Closing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="coa">
          <Card className="shadow-sm border-none bg-white">
            <CardHeader className="border-b flex flex-row items-center justify-between">
              <CardTitle>Chart of Accounts</CardTitle>
              <Button size="sm"><Plus size={16} className="mr-2"/> Add Account</Button>
            </CardHeader>
            <CardContent className="p-8 text-center text-slate-500">
              <Table className="mx-auto h-12 w-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-1">Double-Entry Foundation</h3>
              <p className="max-w-md mx-auto">Here you'll manage your Assets, Liabilities, Equity, Income, and Expenses. This forms the backbone of all financial reporting.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="journal">
          <Card className="shadow-sm border-none bg-white">
            <CardHeader className="border-b">
              <CardTitle>Journal Entry</CardTitle>
            </CardHeader>
            <CardContent className="p-8">
               <div className="bg-slate-50 border rounded-lg p-6 max-w-2xl mx-auto text-center">
                  <p className="text-sm text-slate-600 mb-4">Manual Journal Entries must balance (Total Debit = Total Credit) before posting.</p>
                  <Button variant="outline"><Plus size={16} className="mr-2"/> Create Journal Entry</Button>
               </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emi">
           <Card className="shadow-sm border-none bg-white">
            <CardHeader className="border-b">
              <CardTitle>EMI & BNPL Manager</CardTitle>
            </CardHeader>
            <CardContent className="p-8 text-center text-slate-500">
              <p>Setup installment plans, view schedules, and track pending or overdue payments.</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="assets">
           <Card className="shadow-sm border-none bg-white">
            <CardHeader className="border-b">
              <CardTitle>Asset Register & Depreciation</CardTitle>
            </CardHeader>
            <CardContent className="p-8 text-center text-slate-500">
              <p>Manage fixed assets and run monthly depreciation (SLM/WDV) automatically.</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="closing">
           <Card className="shadow-sm border-none bg-white">
            <CardHeader className="border-b">
              <CardTitle>Year-End Closing Wizard</CardTitle>
            </CardHeader>
            <CardContent className="p-8 text-center text-slate-500">
              <p>Validate ledgers, transfer P&L to retained earnings, and lock the financial year safely.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
