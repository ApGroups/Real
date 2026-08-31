import { useEffect, useState } from 'react';
import { Briefcase, ChevronRight, Search, Clock, CheckCircle, DollarSign, TrendingUp, Activity, Target } from 'lucide-react';
import { supabase, Order } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';

interface Props { onNavigate: (page: string, data?: unknown) => void; }

export default function Orders({ onNavigate }: Props) {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      let query = supabase
        .from('orders')
        .select(`*, food_requests(title, event_type), customer:profiles!orders_customer_id_fkey(full_name, avatar_url), chef:profiles!orders_chef_id_fkey(full_name, avatar_url)`)
        .order('created_at', { ascending: false });

      if (profile!.role === 'customer') query = query.eq('customer_id', profile!.id);
      if (profile!.role === 'chef') query = query.eq('chef_id', profile!.id);

      const { data } = await query;
      if (data) setOrders(data);
      setLoading(false);
    }
    if (profile) load();
  }, [profile]);

  const filtered = orders.filter(o => {
    const title = (o as unknown as { food_requests?: { title: string } }).food_requests?.title || '';
    return title.toLowerCase().includes(search.toLowerCase());
  });

  const active = filtered.filter(o => !['completed', 'cancelled'].includes(o.status));
  const completed = filtered.filter(o => ['completed', 'cancelled'].includes(o.status));
  const paidOrders = orders.filter(o => !['cancelled', 'payment_failed'].includes(o.status));
  const totalValue = paidOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
  const platformRevenue = paidOrders.reduce((sum, order) => sum + (order.platform_fee || order.total_amount * 0.1 || 0), 0);
  const chefEarnings = paidOrders.reduce((sum, order) => sum + (order.chef_payout || 0), 0);
  const avgOrderValue = paidOrders.length ? totalValue / paidOrders.length : 0;
  const completionRate = orders.length ? Math.round((orders.filter(order => order.status === 'completed').length / orders.length) * 100) : 0;
  const statusMix = orders.reduce<Record<string, number>>((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {});
  const orderValueLabel = profile?.role === 'chef' ? 'Chef Earnings' : profile?.role === 'admin' ? 'Marketplace GMV' : 'Total Spend';
  const orderValue = profile?.role === 'chef' ? chefEarnings : totalValue;

  function OrderCard({ order }: { order: Order }) {
    const req = (order as unknown as { food_requests?: { title: string; event_type: string } }).food_requests;
    const chef = (order as unknown as { chef?: { full_name: string } }).chef;
    const customer = (order as unknown as { customer?: { full_name: string } }).customer;
    const counterparty = profile?.role === 'chef' ? customer : chef;
    return (
      <button
        onClick={() => onNavigate('order-detail', order)}
        className="w-full bg-white rounded-2xl border border-stone-100 p-5 text-left hover:shadow-md hover:border-orange-200 transition-all group"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center text-white font-bold shrink-0">
              {counterparty?.full_name?.charAt(0) || 'C'}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-stone-900 truncate group-hover:text-orange-600 transition-colors">{req?.title || 'Order'}</p>
              <p className="text-xs text-stone-400 mt-0.5">
                {profile?.role === 'chef' ? 'Customer' : 'Chef'}: {counterparty?.full_name || 'Unknown'}
              </p>
              <div className="flex items-center gap-3 mt-1 text-xs text-stone-400">
                <span>₦{order.total_amount.toLocaleString()}</span>
                <span>·</span>
                <span className="capitalize">{req?.event_type?.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <StatusBadge status={order.status} />
            <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-orange-400" />
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">{profile?.role === 'admin' ? 'All Orders' : 'My Orders'}</h1>
        <p className="text-stone-500 text-sm mt-1">{orders.length} total orders</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-stone-100 p-4 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center mb-3">
            <Briefcase className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-stone-900">{active.length}</p>
          <p className="text-xs text-stone-400 uppercase tracking-wide">Active</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-100 p-4 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-green-50 text-green-500 flex items-center justify-center mb-3">
            <DollarSign className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-stone-900">₦{Math.round(orderValue).toLocaleString()}</p>
          <p className="text-xs text-stone-400 uppercase tracking-wide">{orderValueLabel}</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-100 p-4 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center mb-3">
            <Target className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-stone-900">{completionRate}%</p>
          <p className="text-xs text-stone-400 uppercase tracking-wide">Completion</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-100 p-4 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center mb-3">
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-stone-900">₦{Math.round(avgOrderValue).toLocaleString()}</p>
          <p className="text-xs text-stone-400 uppercase tracking-wide">Avg value</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-stone-900">Order Analytics</h2>
            <p className="text-xs text-stone-400 mt-0.5">
              {profile?.role === 'admin' ? `Platform revenue: ₦${Math.round(platformRevenue).toLocaleString()}` : 'Pipeline and status health'}
            </p>
          </div>
          <Activity className="w-5 h-5 text-orange-500" />
        </div>
        <div className="space-y-3">
          {Object.entries(statusMix).length === 0 ? (
            <p className="text-sm text-stone-400">No order data yet.</p>
          ) : Object.entries(statusMix).map(([status, count]) => (
            <div key={status}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="capitalize text-stone-500">{status.replace(/_/g, ' ')}</span>
                <span className="font-semibold text-stone-700">{count}</span>
              </div>
              <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                <div className="h-full bg-orange-400 rounded-full" style={{ width: `${orders.length ? (count / orders.length) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input
          type="text"
          placeholder="Search orders..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-stone-100 animate-pulse">
              <div className="h-10 bg-stone-100 rounded-xl mb-3" />
              <div className="h-4 bg-stone-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-100 p-12 text-center">
          <Briefcase className="w-12 h-12 text-stone-300 mx-auto mb-4" />
          <h3 className="text-stone-600 font-semibold mb-1">No orders yet</h3>
          <p className="text-stone-400 text-sm">Accept a chef's bid to create your first order.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-orange-500" />
                <h2 className="font-semibold text-stone-800">Active ({active.length})</h2>
              </div>
              <div className="space-y-3">
                {active.map(o => <OrderCard key={o.id} order={o} />)}
              </div>
            </div>
          )}

          {completed.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <h2 className="font-semibold text-stone-800">History ({completed.length})</h2>
              </div>
              <div className="space-y-3">
                {completed.map(o => <OrderCard key={o.id} order={o} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
