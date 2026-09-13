import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getSupabaseClient } from '../lib/supabase';
import { loadRazorpayScript } from '../lib/utils';
import { toast } from 'sonner';

export const PaymentBottomSheet = ({
  isOpen,
  onClose,
  amount,
  tenantId,
  branchId,
  onCreateOrder,
  onPaymentConfirmed,
  paymentStatusTable = 'orders'
}: {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  tenantId: string;
  branchId?: string | null;
  onCreateOrder: (paymentMethod: 'cod' | 'wallet' | 'wallet_plus_online' | 'online') => Promise<{ order_id: string; amount_pending: number; wallet_amount_used?: number; [key: string]: any }>;
  onPaymentConfirmed: (result: any) => void;
  paymentStatusTable?: string;
}) => {
  const { user } = useAuth();
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !user) return;
    const fetchWallet = async () => {
      setLoadingWallet(true);
      const supabase = getSupabaseClient();
      if (!supabase) { setLoadingWallet(false); return; }
      const { data } = await supabase.from('wallet_accounts').select('current_balance').eq('user_id', user.id).eq('account_type', 'consumer').maybeSingle();
      setWalletBalance(data?.current_balance ?? 0);
      setLoadingWallet(false);
    };
    fetchWallet();
  }, [isOpen, user]);

  const openRazorpayFor = async (payAmount: number, orderId: string, orderIds?: string[]) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { throw new Error('Please login to continue'); }

    const response = await fetch('/api/create-order-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.access_token },
      body: JSON.stringify({
        amount: payAmount,
        tenant_id: tenantId,
        branch_id: branchId || null,
        reference_type: paymentStatusTable === 'orders' ? 'order' : paymentStatusTable,
        reference_id: orderId,
        purpose: 'consumer_order'
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to create payment order');
    }
    const orderData = await response.json();

    const isLoaded = await loadRazorpayScript();
    if (!isLoaded) { throw new Error('Failed to load payment gateway'); }

    return new Promise<void>((resolve, reject) => {
      const options = {
        key: orderData.razorpay_key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'BahiBox',
        description: 'Order Payment',
        order_id: orderData.razorpay_order_id,
        handler: async function () {
          try {
            const idsToUpdate = orderIds && orderIds.length > 0 ? orderIds : [orderId];
            await supabase.from(paymentStatusTable).update({ payment_status: 'paid' }).in('id', idsToUpdate);
          } catch (e) {
            console.warn('Failed to update local payment_status, webhook will reconcile', e);
          }
          resolve();
        },
        prefill: { email: user?.email || '' },
        theme: { color: '#22C55E' },
        modal: { ondismiss: () => reject(new Error('Payment cancelled')) }
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        reject(new Error(response.error?.description || 'Payment failed'));
      });
      rzp.open();
    });
  };

  const handleCash = async () => {
    setProcessing('cod');
    try {
      const result = await onCreateOrder('cod');
      onPaymentConfirmed(result);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to place order');
    } finally {
      setProcessing(null);
    }
  };

  const handleWallet = async () => {
    if (walletBalance === null) return;
    setProcessing('wallet');
    try {
      const method = walletBalance >= amount ? 'wallet' : 'wallet_plus_online';
      const result = await onCreateOrder(method);
      if (result.amount_pending > 0) {
        toast('Paying ₹' + (result.wallet_amount_used || 0).toFixed(2) + ' from Wallet, remaining ₹' + result.amount_pending.toFixed(2) + ' via online payment');
        await openRazorpayFor(result.amount_pending, result.order_id, result.order_ids);
      }
      onPaymentConfirmed(result);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Payment failed');
    } finally {
      setProcessing(null);
    }
  };

  const handleOnline = async () => {
    setProcessing('online');
    try {
      const result = await onCreateOrder('online');
      if (result.amount_pending > 0) {
        await openRazorpayFor(result.amount_pending, result.order_id, result.order_ids);
      }
      onPaymentConfirmed(result);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Payment failed');
    } finally {
      setProcessing(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-slate-950 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Choose Payment Method</h3>
          <button onClick={onClose} className="text-slate-400"><X size={20} /></button>
        </div>
        <p className="text-2xl font-extrabold text-primary">₹{amount.toFixed(2)}</p>

        <div className="space-y-3">
          <button onClick={handleCash} disabled={!!processing} className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 hover:border-primary transition-colors disabled:opacity-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">💵</div>
              <span className="font-semibold text-slate-900 dark:text-slate-100">Cash</span>
            </div>
            {processing === 'cod' && <span className="text-xs text-primary">Placing...</span>}
          </button>

          <button onClick={handleWallet} disabled={!!processing || loadingWallet} className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 hover:border-primary transition-colors disabled:opacity-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">🪙</div>
              <div className="text-left">
                <p className="font-semibold text-slate-900 dark:text-slate-100">BahiBox Coin</p>
                <p className="text-xs text-slate-400">{loadingWallet ? 'Loading...' : 'Balance: ₹' + (walletBalance ?? 0).toFixed(2)}</p>
              </div>
            </div>
            {processing === 'wallet' && <span className="text-xs text-primary">Processing...</span>}
          </button>

          <button onClick={handleOnline} disabled={!!processing} className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 hover:border-primary transition-colors disabled:opacity-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">💳</div>
              <span className="font-semibold text-slate-900 dark:text-slate-100">Pay Online</span>
            </div>
            {processing === 'online' && <span className="text-xs text-primary">Processing...</span>}
          </button>
        </div>
      </div>
    </div>
  );
};
