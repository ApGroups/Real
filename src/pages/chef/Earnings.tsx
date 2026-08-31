import { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, Briefcase, Star, X, AlertCircle, Check } from 'lucide-react';
import { supabase, PayoutRequest } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/StatCard';

interface EarningRecord {
  id: string;
  total_amount: number;
  chef_payout: number;
  platform_fee: number;
  status: string;
  created_at: string;
  food_requests?: { title: string; event_type: string };
}

export default function Earnings() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<EarningRecord[]>([]);
  const [chefData, setChefData] = useState({ total_earnings: 0, avg_rating: 0, total_orders: 0 });
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutForm, setPayoutForm] = useState({ bank_name: '', bank_account: '', bank_code: '' });
  const [payoutError, setPayoutError] = useState('');
  const [submittingPayout, setSubmittingPayout] = useState(false);

  useEffect(() => {
    async function load() {
      const [ordRes, cpRes, payoutRes] = await Promise.all([
        supabase
          .from('orders')
          .select('id, total_amount, chef_payout, platform_fee, status, created_at, food_requests(title, event_type)')
          .eq('chef_id', profile!.id)
          .order('created_at', { ascending: false }),
        supabase.from('chef_profiles').select('total_earnings, avg_rating, total_orders').eq('user_id', profile!.id).maybeSingle(),
        supabase.from('payout_requests').select('*').eq('chef_id', profile!.id).order('created_at', { ascending: false }),
      ]);
      if (ordRes.data) setOrders(ordRes.data as EarningRecord[]);
      if (cpRes.data) setChefData(cpRes.data);
      if (payoutRes.data) setPayoutRequests(payoutRes.data);
      setLoading(false);
    }
    if (profile) load();
  }, [profile]);

  async function handleRequestPayout() {
    if (!payoutForm.bank_name || !payoutForm.bank_account) {
      setPayoutError('Please fill in all bank details.');
      return;
    }

    setPayoutError('');
    setSubmittingPayout(true);
    try {
      const { error } = await supabase.from('payout_requests').insert({
        chef_id: profile!.id,
        amount: pendingPayout,
        status: 'pending',
        metadata: { bank_name: payoutForm.bank_name, bank_account: payoutForm.bank_account, bank_code: payoutForm.bank_code },
      });
      if (error) throw error;
      setShowPayoutModal(false);
      setPayoutForm({ bank_name: '', bank_account: '', bank_code: '' });
      const { data } = await supabase.from('payout_requests').select('*').eq('chef_id', profile!.id).order('created_at', { ascending: false });
      if (data) setPayoutRequests(data);
    } catch (err) {
      setPayoutError(err instanceof Error ? err.message : 'Failed to request payout');
    }
    setSubmittingPayout(false);
  }


  const completedOrders = orders.filter(o => o.status === 'completed');
  const pendingPayout = orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + o.chef_payout, 0);
  const thisMonthEarnings = completedOrders
    .filter(o => new Date(o.created_at).getMonth() === new Date().getMonth())
    .reduce((sum, o) => sum + o.chef_payout, 0);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Earnings</h1>
        <p className="text-stone-500 text-sm mt-1">Track your income and payouts.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Earned" value={`₦${chefData.total_earnings.toLocaleString()}`} icon={DollarSign} color="green" />
        <StatCard label="This Month" value={`₦${thisMonthEarnings.toLocaleString()}`} icon={TrendingUp} color="teal" />
        <StatCard label="Pending Payout" value={`₦${pendingPayout.toLocaleString()}`} icon={DollarSign} color="amber" />
        <StatCard label="Completed Orders" value={completedOrders.length} icon={Briefcase} color="orange" />
      </div>

      {/* Pending Payouts Alert */}
      {pendingPayout > 0 && (
        <div className="rounded-3xl border border-[#D4AF37] bg-[#FFF8E5] p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[#D4AF37] flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5 text-[#0B0B0B]" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-[#0B0B0B] mb-1">Ready to withdraw</p>
              <p className="text-sm text-[#5E5A53] mb-4">You have ₦{pendingPayout.toLocaleString()} available from completed orders.</p>
              <button
                onClick={() => setShowPayoutModal(true)}
                className="premium-button px-6 py-3 text-sm font-semibold"
              >
                Request Payout via Paystack
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payout Requests History */}
      {payoutRequests.length > 0 && (
        <div className="premium-card p-6 mb-6">
          <h3 className="text-xl font-semibold text-[#0B0B0B] mb-4 flex items-center gap-2">
            <Check className="w-5 h-5 text-[#0F5132]" />
            Payout Requests
          </h3>
          <div className="space-y-3">
            {payoutRequests.map(req => (
              <div key={req.id} className="rounded-3xl border border-[#E7E2D8] bg-[#FEFBF7] p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[#0B0B0B]">₦{req.amount.toLocaleString()}</p>
                  <p className="text-xs text-[#5E5A53] mt-1">{new Date(req.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`px-3 py-2 rounded-full text-xs font-semibold ${
                  req.status === 'completed' ? 'bg-[#0F5132] text-white' :
                  req.status === 'pending' ? 'bg-[#FFF1D1] text-[#8C6614]' :
                  'bg-[#F3EFE8] text-[#5E5A53]'
                }`}>
                  {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payout Request Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="premium-card p-8 max-w-md w-full mx-4 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-[#0B0B0B]">Request Payout</h2>
              <button onClick={() => { setShowPayoutModal(false); setPayoutError(''); }} className="text-[#5E5A53] hover:text-[#0B0B0B]">
                <X className="w-6 h-6" />
              </button>
            </div>

            {payoutError && (
              <div className="rounded-3xl border border-[#F3D6D5] bg-[#FFF1F0] p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-[#8A2F2F] shrink-0 mt-0.5" />
                <p className="text-sm text-[#8A2F2F]">{payoutError}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#0B0B0B] mb-3">Bank Name</label>
                <input
                  type="text"
                  placeholder="e.g., Access Bank"
                  value={payoutForm.bank_name}
                  onChange={e => setPayoutForm({ ...payoutForm, bank_name: e.target.value })}
                  className="w-full rounded-[1.5rem] border border-[#E7E2D8] bg-[#FEFBF7] px-5 py-4 text-sm text-[#0B0B0B] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0B0B0B] mb-3">Account Number</label>
                <input
                  type="text"
                  placeholder="e.g., 1234567890"
                  value={payoutForm.bank_account}
                  onChange={e => setPayoutForm({ ...payoutForm, bank_account: e.target.value })}
                  className="w-full rounded-[1.5rem] border border-[#E7E2D8] bg-[#FEFBF7] px-5 py-4 text-sm text-[#0B0B0B] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0B0B0B] mb-3">Bank Code (optional)</label>
                <input
                  type="text"
                  placeholder="e.g., 044"
                  value={payoutForm.bank_code}
                  onChange={e => setPayoutForm({ ...payoutForm, bank_code: e.target.value })}
                  className="w-full rounded-[1.5rem] border border-[#E7E2D8] bg-[#FEFBF7] px-5 py-4 text-sm text-[#0B0B0B] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none"
                />
              </div>
            </div>

            <div className="rounded-3xl border border-[#E7E2D8] bg-[#FEFBF7] p-4">
              <p className="text-sm text-[#5E5A53]">
                <span className="font-semibold text-[#0B0B0B]">Amount:</span> ₦{pendingPayout.toLocaleString()}
              </p>
              <p className="text-xs text-[#8C6614] mt-2">Paystack will process this transfer to your bank within 24 hours.</p>
            </div>

            <div className="grid gap-3 grid-cols-2">
              <button
                onClick={() => { setShowPayoutModal(false); setPayoutError(''); }}
                className="rounded-3xl border border-[#E7E2D8] bg-white px-6 py-4 text-sm font-semibold text-[#5E5A53] hover:bg-[#FAF3DB]"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestPayout}
                disabled={submittingPayout}
                className="rounded-3xl bg-[#D4AF37] px-6 py-4 text-sm font-semibold text-[#0B0B0B] hover:bg-[#B38C26] disabled:opacity-70"
              >
                {submittingPayout ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating Banner */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-5 mb-6 text-white flex items-center justify-between">
        <div>
          <p className="text-amber-100 text-sm">Your Rating</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-4xl font-bold">{chefData.avg_rating.toFixed(1)}</span>
            <span className="text-amber-200">/ 5.0</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map(s => (
            <Star key={s} className={`w-6 h-6 ${s <= Math.round(chefData.avg_rating) ? 'text-white fill-white' : 'text-amber-200'}`} />
          ))}
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-stone-100">
          <h3 className="font-semibold text-stone-900">Transaction History</h3>
        </div>
        {loading ? (
          <div className="p-4 space-y-3">
            {Array(5).fill(0).map((_, i) => <div key={i} className="h-12 bg-stone-100 rounded-xl animate-pulse" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-stone-400">
            <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No transactions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-50">
            {orders.map(order => (
              <div key={order.id} className="p-4 flex items-center justify-between hover:bg-stone-50 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-stone-900 truncate">{order.food_requests?.title || 'Order'}</p>
                  <div className="flex items-center gap-3 text-xs text-stone-400 mt-0.5">
                    <span>{new Date(order.created_at).toLocaleDateString()}</span>
                    <span className="capitalize">{order.food_requests?.event_type?.replace('_', ' ')}</span>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className={`font-bold text-sm ${order.status === 'completed' ? 'text-green-600' : order.status === 'cancelled' ? 'text-stone-400 line-through' : 'text-amber-600'}`}>
                    ₦{order.chef_payout.toLocaleString()}
                  </p>
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                    order.status === 'completed' ? 'bg-green-100 text-green-700' :
                    order.status === 'cancelled' ? 'bg-stone-100 text-stone-500' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {order.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
