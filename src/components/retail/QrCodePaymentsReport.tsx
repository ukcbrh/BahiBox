import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { getSupabaseClient } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';

export function QrCodePaymentsReport() {
  const { currentTenantId } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      if (!currentTenantId) return;
      setLoading(true);
      const supabase = getSupabaseClient();
      if (!supabase) { setLoading(false); return; }
      const { data } = await supabase
        .from('qr_code_payments')
        .select('*, branches(branch_name)')
        .eq('tenant_id', currentTenantId)
        .order('received_at', { ascending: false })
        .limit(100);
      setPayments(data || []);
      setLoading(false);
    };
    fetchPayments();
  }, [currentTenantId]);

  const total = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">QR Code Payments</h2>
        <p className="text-slate-500 dark:text-slate-400">Payments received directly via your counter QR code, without a bill.</p>
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="mb-4 text-sm text-slate-600 dark:text-slate-400">
            Total received: <span className="font-bold text-slate-900 dark:text-slate-100">₹{total.toFixed(2)}</span> ({payments.length} payments)
          </div>
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-10">Loading...</p>
          ) : payments.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">No QR payments received yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 text-left">
                <tr>
                  <th className="py-2 px-4">Date</th>
                  <th className="py-2 px-4">Branch</th>
                  <th className="py-2 px-4">Payer</th>
                  <th className="py-2 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p: any) => (
                  <tr key={p.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-2 px-4">{new Date(p.received_at).toLocaleString()}</td>
                    <td className="py-2 px-4">{p.branches?.branch_name || '-'}</td>
                    <td className="py-2 px-4">{p.payer_vpa || 'Unknown'}</td>
                    <td className="py-2 px-4 text-right font-medium">₹{Number(p.amount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
