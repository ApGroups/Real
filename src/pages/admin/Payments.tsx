import { useEffect, useState } from 'react';
import { ArrowLeft, DollarSign, TrendingUp, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import StatCard from '../../components/StatCard';

interface Props { onNavigate: (page: string) => void; }

interface PaymentRecord {
  id: string;
  order_id: string;
  customer_id: string;
  amount: number;
  status: string;
  provider: string;
  provider_ref: string;
  created_at: string;
  updated_at: string;
}

interface PayoutRecord {
  id: string;
  chef_id: string;
  amount: number;
  status: string;
  created_at: string;
  approved_at: string | null;
  paid_at: string | null;
}

interface TransactionRecord {
  id: string;
  event_type: string;
  amount: number;
  provider: string;
  provider_ref: string;
  status: string;
  created_at: string;
}

export default function Payments({ onNavigate }: Props) {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [payRes, payoutRes, transRes] = await Promise.all([
        supabase.from('payments').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('payout_requests').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('transaction_logs').select('*').order('created_at', { ascending: false }).limit(50),
      ]);
      if (payRes.data) setPayments(payRes.data);
      if (payoutRes.data) setPayouts(payoutRes.data);
      if (transRes.data) setTransactions(transRes.data);
      setLoading(false);
    }
    load();
  }, []);

  const functionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string;

  async function payPayout(payoutId: string) {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error('Not authenticated');
      const res = await fetch(`${functionsUrl}/paystack-transfer`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ payout_request_id: payoutId }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Transfer failed');
      }
      // refresh lists
      const { data: payoutData } = await supabase.from('payout_requests').select('*').order('created_at', { ascending: false }).limit(50);
      if (payoutData) setPayouts(payoutData as PayoutRecord[]);
      const { data: transData } = await supabase.from('transaction_logs').select('*').order('created_at', { ascending: false }).limit(50);
      if (transData) setTransactions(transData as TransactionRecord[]);
    } catch (err: any) {
      alert(err.message || 'Transfer failed');
    }
  }

  const totalCollected = payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);
  const pendingCollections = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
  const totalPayedOut = payouts.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);
  const platformRevenue = totalCollected * 0.1;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <button onClick={() => onNavigate('dashboard')} className="flex items-center gap-2 text-[#5E5A53] hover:text-[#0B0B0B] text-sm mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.32em] text-[#8C6614] mb-3">Payment Management</p>
        <h1 className="text-4xl font-semibold text-[#0B0B0B]">Payment Analytics</h1>
        <p className="text-[#5E5A53] text-base mt-3">Track all Paystack transactions, customer payments, and chef payouts.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Collected" value={`₦${totalCollected.toLocaleString()}`} icon={DollarSign} color="green" />
        <StatCard label="Platform Revenue (10%)" value={`₦${platformRevenue.toLocaleString()}`} icon={TrendingUp} color="amber" />
        <StatCard label="Total Paid Out" value={`₦${totalPayedOut.toLocaleString()}`} icon={CheckCircle} color="blue" />
        <StatCard label="Pending" value={`₦${pendingCollections.toLocaleString()}`} icon={Clock} color="orange" />
      </div>

      {/* Payment Transactions */}
      <div className="premium-card p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-[#0B0B0B]">Customer Payments</h2>
            <p className="text-sm text-[#5E5A53] mt-1">Paystack transactions from customers</p>
          </div>
          <span className="premium-badge">Paystack</span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array(5).fill(0).map((_, i) => <div key={i} className="h-16 bg-[#F3EFE8] rounded-3xl animate-pulse" />)}
          </div>
        ) : payments.length === 0 ? (
          <div className="p-8 text-center text-[#5E5A53]">
            <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No payment transactions yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payments.slice(0, 20).map(p => (
              <div key={p.id} className="rounded-3xl border border-[#E7E2D8] bg-[#FEFBF7] p-4 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#0B0B0B]">₦{p.amount.toLocaleString()}</p>
                  <p className="text-xs text-[#5E5A53] mt-1">Ref: {p.provider_ref} · {new Date(p.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`px-3 py-2 rounded-full text-xs font-semibold shrink-0 ml-4 ${
                  p.status === 'completed' ? 'bg-[#0F5132] text-white' :
                  p.status === 'pending' ? 'bg-[#FFF1D1] text-[#8C6614]' :
                  'bg-[#F3EFE8] text-[#5E5A53]'
                }`}>
                  {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chef Payouts */}
      <div className="premium-card p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-[#0B0B0B]">Chef Payouts</h2>
            <p className="text-sm text-[#5E5A53] mt-1">Pending and completed payout requests</p>
          </div>
          <span className="premium-badge">Transfers</span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array(5).fill(0).map((_, i) => <div key={i} className="h-16 bg-[#F3EFE8] rounded-3xl animate-pulse" />)}
          </div>
        ) : payouts.length === 0 ? (
          <div className="p-8 text-center text-[#5E5A53]">
            <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No payout requests yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payouts.slice(0, 20).map(p => (
              <div key={p.id} className="rounded-3xl border border-[#E7E2D8] bg-[#FEFBF7] p-4 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#0B0B0B]">₦{p.amount.toLocaleString()}</p>
                  <p className="text-xs text-[#5E5A53] mt-1">{new Date(p.created_at).toLocaleDateString()} {p.paid_at ? `• Paid: ${new Date(p.paid_at).toLocaleDateString()}` : ''}</p>
                </div>
                <div className="flex items-center gap-3">
                  {p.status === 'pending' && (
                    <button onClick={() => payPayout(p.id)} className="px-4 py-2 rounded-2xl bg-[#D4AF37] text-[#0B0B0B] font-semibold text-sm">Pay</button>
                  )}
                  <span className={`px-3 py-2 rounded-full text-xs font-semibold shrink-0 ml-4 ${
                    p.status === 'completed' ? 'bg-[#0F5132] text-white' :
                    p.status === 'pending' ? 'bg-[#FFF1D1] text-[#8C6614]' :
                    'bg-[#F3EFE8] text-[#5E5A53]'
                  }`}>
                    {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transaction Audit Log */}
      <div className="premium-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-[#0B0B0B]">Transaction Log</h2>
            <p className="text-sm text-[#5E5A53] mt-1">All payment events and webhooks</p>
          </div>
          <span className="premium-badge">Audit</span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array(5).fill(0).map((_, i) => <div key={i} className="h-16 bg-[#F3EFE8] rounded-3xl animate-pulse" />)}
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-[#5E5A53]">
            <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No transaction logs yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.slice(0, 30).map(t => (
              <div key={t.id} className="rounded-3xl border border-[#E7E2D8] bg-[#FEFBF7] p-4 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#0B0B0B] capitalize">{t.event_type.replace('.', ': ')}</p>
                  <p className="text-xs text-[#5E5A53] mt-1">
                    ₦{t.amount.toLocaleString()} · {t.provider} · {new Date(t.created_at).toLocaleString()}
                  </p>
                </div>
                <span className={`px-3 py-2 rounded-full text-xs font-semibold shrink-0 ml-4 ${
                  t.status === 'success' ? 'bg-[#0F5132] text-white' :
                  t.status === 'pending' ? 'bg-[#FFF1D1] text-[#8C6614]' :
                  'bg-[#F3EFE8] text-[#5E5A53]'
                }`}>
                  {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
