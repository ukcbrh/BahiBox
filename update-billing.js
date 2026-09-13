const fs = require('fs');

let content = fs.readFileSync('src/components/payments/BillingSubscriptionView.tsx', 'utf8');

content = content.replace(
  `import { CheckCircle2, CreditCard, Download, Layers, ChevronDown } from 'lucide-react';`,
  `import { CheckCircle2, CreditCard, Download, Layers, ChevronDown } from 'lucide-react';\nimport { supabase } from '../../lib/supabase';`
);

content = content.replace(
  `  const { plans, loading: plansLoading } = usePlans();
  const [selectedModule, setSelectedModule] = useState(activeModule);`,
  `  const { plans, loading: plansLoading } = usePlans();
  const [selectedModule, setSelectedModule] = useState(activeModule);
  const [realInvoices, setRealInvoices] = useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<{type: string, last4: string, expiry: string} | null>(null);

  useEffect(() => {
    if (currentTenantId) {
      const fetchInvoices = async () => {
        const { data } = await supabase.from('payment_orders').select('*, payment_transactions(*)').eq('tenant_id', currentTenantId).eq('purpose', 'platform_subscription').eq('status', 'paid').order('created_at', { ascending: false });
        if (data) {
          setRealInvoices(data);
          // Try to extract payment method from latest transaction
          if (data.length > 0 && data[0].payment_transactions && data[0].payment_transactions.length > 0) {
            const tx = data[0].payment_transactions[0];
            const method = tx.method || 'card';
            setPaymentMethod({
               type: method.toUpperCase(),
               last4: '****',
               expiry: 'N/A'
            });
          }
        }
      };
      fetchInvoices();
    }
  }, [currentTenantId]);`
);

content = content.replace(
  `  const invoices = [
    { id: 'inv_101', date: '01 Oct 2023', amount: displayPlan ? displayPlan.priceMonthly : 999, status: 'Paid', download: '#' },
    { id: 'inv_100', date: '01 Sep 2023', amount: displayPlan ? displayPlan.priceMonthly : 999, status: 'Paid', download: '#' },
  ];`,
  `  const invoices = realInvoices.length > 0 ? realInvoices.map(inv => ({
    id: 'INV-' + inv.id.substring(0,6).toUpperCase(),
    date: new Date(inv.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
    amount: inv.amount,
    status: 'Paid',
    download: '#'
  })) : [];`
);

content = content.replace(
  `<p className="font-semibold text-sm">•••• •••• •••• 4242</p>
                    <p className="text-xs text-slate-500">Expires 12/25</p>`,
  `<p className="font-semibold text-sm">•••• •••• •••• {paymentMethod?.last4 || '4242'}</p>
                    <p className="text-xs text-slate-500">{paymentMethod ? '' : 'Expires 12/25'}</p>`
);

content = content.replace(
  `<div className="w-12 h-8 bg-slate-200 rounded flex items-center justify-center font-bold text-slate-500 text-xs">VISA</div>`,
  `<div className="w-16 h-8 bg-slate-200 rounded flex items-center justify-center font-bold text-slate-500 text-xs">{paymentMethod?.type || 'VISA'}</div>`
);

fs.writeFileSync('src/components/payments/BillingSubscriptionView.tsx', content, 'utf8');
