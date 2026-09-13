import { useState, useEffect } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { getSupabaseClient } from '@/src/lib/supabase';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent } from '@/src/components/ui/card';
import { ArrowLeft, Plus } from 'lucide-react';
import { CreateCreditNote } from './CreateCreditNote';

export function CreditNoteList({ onBack }: { onBack?: () => void }) {
  const { currentTenantId } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotes = async () => {
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) { setLoading(false); return; }
    const { data } = await supabase.from('credit_notes').select('*, retail_customers(customer_name)').eq('tenant_id', currentTenantId).order('created_at', { ascending: false }).limit(100);
    setNotes(data || []);
    setLoading(false);
  };

  useEffect(() => { if (!isCreating) fetchNotes(); }, [currentTenantId, isCreating]);

  if (isCreating) {
    return <CreateCreditNote onBack={() => setIsCreating(false)} />;
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      {onBack && (
        <Button variant="ghost" onClick={onBack} className="gap-2 -ml-2"><ArrowLeft className="h-4 w-4" /> Back to Documents</Button>
      )}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Credit Notes</h2>
          <p className="text-slate-500 dark:text-slate-400">Sales returns and corrections.</p>
        </div>
        <Button onClick={() => setIsCreating(true)}><Plus className="h-4 w-4 mr-2" /> Add New</Button>
      </div>
      <Card>
        <CardContent className="p-6">
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-6">Loading...</p>
          ) : notes.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No credit notes yet.</p>
          ) : (
            <div className="space-y-3">
              {notes.map((n: any) => (
                <div key={n.id} className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 flex justify-between">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{n.note_number}</p>
                    <p className="text-xs text-slate-500">{n.retail_customers?.customer_name} · {n.note_date} · {n.source_type === 'sales_invoice' ? 'Against Invoice' : 'Against Delivery Challan'}</p>
                    {n.reason && <p className="text-xs text-slate-400 mt-1">{n.reason}</p>}
                  </div>
                  <p className="font-extrabold text-red-600">₹{Number(n.total_amount).toLocaleString('en-IN')}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
