import { useEffect, useState } from 'react';
import { Briefcase, Star, DollarSign, TrendingUp, ChefHat, ChevronRight, Clock, CheckCircle, Target, Activity } from 'lucide-react';
import { supabase, Bid, FoodRequest, Order } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';

interface Props { onNavigate: (page: string, data?: unknown) => void; }

export default function ChefDashboard({ onNavigate }: Props) {
  const { profile } = useAuth();
  const [chefProfile, setChefProfile] = useState<{
    total_orders: number; avg_rating: number; total_earnings: number; is_approved: boolean;
  } | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [marketplaceRequests, setMarketplaceRequests] = useState<FoodRequest[]>([]);
  const [pendingBids, setPendingBids] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [cpRes, ordRes, bidRes, allBidsRes, marketRes] = await Promise.all([
        supabase.from('chef_profiles').select('*').eq('user_id', profile!.id).maybeSingle(),
        supabase.from('orders').select('*, food_requests(title)').eq('chef_id', profile!.id).order('created_at', { ascending: false }),
        supabase.from('bids').select('id', { count: 'exact' }).eq('chef_id', profile!.id).eq('status', 'pending'),
        supabase.from('bids').select('*').eq('chef_id', profile!.id).order('created_at', { ascending: false }),
        supabase.from('food_requests').select('*').in('status', ['open', 'bidding']).order('created_at', { ascending: false }),
      ]);
      if (cpRes.data) setChefProfile(cpRes.data);
      if (ordRes.data) setOrders(ordRes.data);
      if (bidRes.count !== null) setPendingBids(bidRes.count);
      if (allBidsRes.data) setBids(allBidsRes.data);
      if (marketRes.data) setMarketplaceRequests(marketRes.data);
      setLoading(false);
    }
    if (profile) load();
  }, [profile]);

  const activeOrders = orders.filter(o => !['completed', 'cancelled'].includes(o.status)).length;
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  const acceptedBids = bids.filter(bid => bid.status === 'accepted').length;
  const rejectedBids = bids.filter(bid => bid.status === 'rejected').length;
  const bidWinRate = bids.length ? Math.round((acceptedBids / bids.length) * 100) : 0;
  const avgBidValue = bids.length ? bids.reduce((sum, bid) => sum + (bid.total_cost || 0), 0) / bids.length : 0;
  const potentialPipeline = bids.filter(bid => bid.status === 'pending').reduce((sum, bid) => sum + (bid.total_cost || 0), 0);
  const activeOrderValue = orders.filter(o => !['completed', 'cancelled'].includes(o.status)).reduce((sum, order) => sum + (order.chef_payout || order.total_amount || 0), 0);
  const bidMix = bids.reduce<Record<string, number>>((acc, bid) => {
    acc[bid.status] = (acc[bid.status] || 0) + 1;
    return acc;
  }, {});
  const marketplaceAvgBudget = marketplaceRequests.length
    ? marketplaceRequests.reduce((sum, req) => sum + ((req.budget_min + req.budget_max) / 2), 0) / marketplaceRequests.length
    : 0;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <p className="text-stone-500 text-sm">{greeting}, Chef</p>
        <h1 className="text-2xl font-bold text-stone-900 mt-1">
          {profile?.full_name?.split(' ')[0] || 'Welcome back'}!
        </h1>
        {chefProfile && !chefProfile.is_approved && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 shrink-0" />
            Your account is pending admin approval. You can still explore and submit bids.
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Orders" value={chefProfile?.total_orders || 0} icon={Briefcase} color="orange" />
        <StatCard label="Active Orders" value={activeOrders} icon={Clock} color="blue" />
        <StatCard label="Avg Rating" value={(chefProfile?.avg_rating || 0).toFixed(1)} icon={Star} color="amber" />
        <StatCard label="Total Earnings" value={`₦${(chefProfile?.total_earnings || 0).toLocaleString()}`} icon={DollarSign} color="green" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Bid Win Rate" value={`${bidWinRate}%`} icon={Target} color="teal" />
        <StatCard label="Avg Bid Value" value={`₦${Math.round(avgBidValue).toLocaleString()}`} icon={TrendingUp} color="green" />
        <StatCard label="Pending Pipeline" value={`₦${potentialPipeline.toLocaleString()}`} icon={Activity} color="amber" />
        <StatCard label="Open Marketplace" value={marketplaceRequests.length} icon={ChefHat} color="orange" />
      </div>

      <div className="grid lg:grid-cols-[1fr_0.9fr] gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-stone-900">Bid Analytics</h2>
              <p className="text-xs text-stone-400 mt-0.5">Performance across submitted bids</p>
            </div>
            <Target className="w-5 h-5 text-orange-500" />
          </div>
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
              <p className="text-xs text-amber-700">Pending</p>
              <p className="text-2xl font-bold text-amber-900">{pendingBids}</p>
            </div>
            <div className="rounded-xl bg-green-50 border border-green-100 p-4">
              <p className="text-xs text-green-700">Accepted</p>
              <p className="text-2xl font-bold text-green-900">{acceptedBids}</p>
            </div>
            <div className="rounded-xl bg-stone-50 border border-stone-100 p-4">
              <p className="text-xs text-stone-500">Rejected</p>
              <p className="text-2xl font-bold text-stone-900">{rejectedBids}</p>
            </div>
          </div>
          <div className="space-y-3">
            {Object.entries(bidMix).length === 0 ? (
              <p className="text-sm text-stone-400">Submit bids to start building analytics.</p>
            ) : Object.entries(bidMix).map(([status, count]) => (
              <div key={status}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="capitalize text-stone-500">{status.replace(/_/g, ' ')}</span>
                  <span className="font-semibold text-stone-700">{count}</span>
                </div>
                <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-400 rounded-full" style={{ width: `${bids.length ? (count / bids.length) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
          <h2 className="font-semibold text-stone-900 mb-4">Marketplace Opportunity</h2>
          <div className="space-y-4">
            <div className="rounded-xl bg-stone-50 border border-stone-100 p-4">
              <p className="text-xs text-stone-400">Available request value</p>
              <p className="text-2xl font-bold text-stone-900">₦{Math.round(marketplaceRequests.reduce((sum, req) => sum + req.budget_max, 0)).toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-stone-50 border border-stone-100 p-4">
              <p className="text-xs text-stone-400">Avg market budget</p>
              <p className="text-2xl font-bold text-stone-900">₦{Math.round(marketplaceAvgBudget).toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-stone-50 border border-stone-100 p-4">
              <p className="text-xs text-stone-400">Active order value</p>
              <p className="text-2xl font-bold text-stone-900">₦{Math.round(activeOrderValue).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <button
          onClick={() => onNavigate('marketplace')}
          className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-5 text-white text-left hover:from-orange-600 hover:to-amber-600 transition-all group"
        >
          <ChefHat className="w-8 h-8 mb-3 opacity-90" />
          <h3 className="font-bold text-lg mb-1">Browse Marketplace</h3>
          <p className="text-orange-100 text-sm">Find new food requests and submit bids</p>
        </button>
        <button
          onClick={() => onNavigate('my-bids')}
          className="bg-white border-2 border-stone-100 rounded-2xl p-5 text-left hover:border-orange-200 hover:shadow-md transition-all group"
        >
          <TrendingUp className="w-8 h-8 mb-3 text-orange-500" />
          <h3 className="font-bold text-lg text-stone-900 mb-1">My Bids</h3>
          <p className="text-stone-500 text-sm">{pendingBids} pending bid{pendingBids !== 1 ? 's' : ''}</p>
        </button>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <h2 className="font-semibold text-stone-900">Recent Orders</h2>
          <button onClick={() => onNavigate('orders')} className="text-orange-500 text-sm hover:text-orange-600 flex items-center gap-1">
            View all <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="divide-y divide-stone-50">
          {loading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="p-4 animate-pulse">
                <div className="h-4 bg-stone-100 rounded w-3/4 mb-2" />
                <div className="h-3 bg-stone-100 rounded w-1/2" />
              </div>
            ))
          ) : orders.length === 0 ? (
            <div className="p-8 text-center text-stone-400">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No orders yet. Start by browsing the marketplace.</p>
            </div>
          ) : (
            orders.slice(0, 5).map(order => {
              const req = (order as unknown as { food_requests?: { title: string } }).food_requests;
              return (
                <button
                  key={order.id}
                  onClick={() => onNavigate('order-detail', order)}
                  className="w-full p-4 text-left hover:bg-stone-50 transition-colors flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-stone-800">{req?.title || 'Order'}</p>
                    <p className="text-xs text-stone-400 mt-0.5">₦{order.total_amount.toLocaleString()}</p>
                  </div>
                  <StatusBadge status={order.status} />
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
