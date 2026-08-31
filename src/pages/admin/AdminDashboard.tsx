import { useEffect, useState } from 'react';
import { Users, ChefHat, Briefcase, DollarSign, AlertTriangle, TrendingUp, CheckCircle, Clock, ChevronRight, ShoppingBag, Target, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import StatCard from '../../components/StatCard';

interface Props { onNavigate: (page: string) => void; }

interface Stats {
  totalUsers: number;
  totalChefs: number;
  pendingApprovals: number;
  activeOrders: number;
  completedOrders: number;
  totalRevenue: number;
  marketplaceGMV: number;
  totalRequests: number;
  openRequests: number;
  biddingRequests: number;
  totalBids: number;
  acceptedBids: number;
  avgOrderValue: number;
  requestConversionRate: number;
  bidAcceptanceRate: number;
  openDisputes: number;
}

interface MonthlyMetric {
  label: string;
  revenue: number;
  orders: number;
}

export default function AdminDashboard({ onNavigate }: Props) {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0, totalChefs: 0, pendingApprovals: 0,
    activeOrders: 0, completedOrders: 0, totalRevenue: 0, marketplaceGMV: 0,
    totalRequests: 0, openRequests: 0, biddingRequests: 0, totalBids: 0,
    acceptedBids: 0, avgOrderValue: 0, requestConversionRate: 0,
    bidAcceptanceRate: 0, openDisputes: 0,
  });
  const [recentOrders, setRecentOrders] = useState<{ id: string; status: string; total_amount: number; food_requests?: { title: string } }[]>([]);
  const [monthlyMetrics, setMonthlyMetrics] = useState<MonthlyMetric[]>([]);
  const [requestStatus, setRequestStatus] = useState<Record<string, number>>({});
  const [orderStatus, setOrderStatus] = useState<Record<string, number>>({});
  const [eventTypes, setEventTypes] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [usersRes, chefsRes, pendingRes, ordersRes, requestsRes, bidsRes, disputesRes, recentRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'customer'),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'chef'),
        supabase.from('chef_profiles').select('id', { count: 'exact' }).eq('is_approved', false),
        supabase.from('orders').select('status, total_amount, platform_fee, created_at'),
        supabase.from('food_requests').select('status, event_type, budget_min, budget_max, created_at'),
        supabase.from('bids').select('status, total_cost, created_at'),
        supabase.from('disputes').select('id', { count: 'exact' }).eq('status', 'open'),
        supabase.from('orders').select('id, status, total_amount, food_requests(title)').order('created_at', { ascending: false }).limit(5),
      ]);

      const allOrders = ordersRes.data || [];
      const allRequests = requestsRes.data || [];
      const allBids = bidsRes.data || [];
      const activeOrders = allOrders.filter(o => !['completed', 'cancelled'].includes(o.status)).length;
      const completedOrders = allOrders.filter(o => o.status === 'completed').length;
      const paidOrders = allOrders.filter(o => ['payment_confirmed', 'preparing', 'out_for_delivery', 'delivered', 'payout_pending', 'payout_completed', 'completed'].includes(o.status));
      const marketplaceGMV = paidOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.platform_fee || o.total_amount * 0.1 || 0), 0);
      const acceptedBids = allBids.filter(b => b.status === 'accepted').length;
      const requestStatusCounts = allRequests.reduce<Record<string, number>>((acc, req) => {
        acc[req.status] = (acc[req.status] || 0) + 1;
        return acc;
      }, {});
      const orderStatusCounts = allOrders.reduce<Record<string, number>>((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {});
      const eventTypeCounts = allRequests.reduce<Record<string, number>>((acc, req) => {
        acc[req.event_type] = (acc[req.event_type] || 0) + 1;
        return acc;
      }, {});
      const months = Array.from({ length: 6 }, (_, index) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (5 - index));
        return {
          key: `${date.getFullYear()}-${date.getMonth()}`,
          label: date.toLocaleDateString([], { month: 'short' }),
          revenue: 0,
          orders: 0,
        };
      });
      allOrders.forEach(order => {
        const date = new Date(order.created_at);
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        const bucket = months.find(month => month.key === key);
        if (!bucket) return;
        bucket.orders += 1;
        bucket.revenue += order.platform_fee || order.total_amount * 0.1 || 0;
      });

      setStats({
        totalUsers: usersRes.count || 0,
        totalChefs: chefsRes.count || 0,
        pendingApprovals: pendingRes.count || 0,
        activeOrders,
        completedOrders,
        totalRevenue,
        marketplaceGMV,
        totalRequests: allRequests.length,
        openRequests: requestStatusCounts.open || 0,
        biddingRequests: requestStatusCounts.bidding || 0,
        totalBids: allBids.length,
        acceptedBids,
        avgOrderValue: allOrders.length ? marketplaceGMV / allOrders.length : 0,
        requestConversionRate: allRequests.length ? Math.round(((requestStatusCounts.accepted || 0) / allRequests.length) * 100) : 0,
        bidAcceptanceRate: allBids.length ? Math.round((acceptedBids / allBids.length) * 100) : 0,
        openDisputes: disputesRes.count || 0,
      });
      setRequestStatus(requestStatusCounts);
      setOrderStatus(orderStatusCounts);
      setEventTypes(eventTypeCounts);
      setMonthlyMetrics(months.map(({ label, revenue, orders }) => ({ label, revenue, orders })));

      if (recentRes.data) setRecentOrders(recentRes.data as typeof recentOrders);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900">Admin Dashboard</h1>
        <p className="text-stone-500 text-sm mt-1">Platform overview and management tools.</p>
      </div>

      {/* Alerts */}
      {(stats.pendingApprovals > 0 || stats.openDisputes > 0) && (
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          {stats.pendingApprovals > 0 && (
            <button
              onClick={() => onNavigate('chefs')}
              className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl hover:bg-amber-100 transition-colors text-left"
            >
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-800">{stats.pendingApprovals} Pending Chef Approvals</p>
                <p className="text-xs text-amber-600">Click to review</p>
              </div>
            </button>
          )}
          {stats.openDisputes > 0 && (
            <button
              onClick={() => onNavigate('disputes')}
              className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl hover:bg-red-100 transition-colors text-left"
            >
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-red-800">{stats.openDisputes} Open Disputes</p>
                <p className="text-xs text-red-600">Click to investigate</p>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Customers" value={stats.totalUsers} icon={Users} color="blue" />
        <StatCard label="Total Chefs" value={stats.totalChefs} icon={ChefHat} color="orange" />
        <StatCard label="Active Orders" value={stats.activeOrders} icon={Briefcase} color="amber" />
        <StatCard label="Platform Revenue" value={`₦${stats.totalRevenue.toLocaleString()}`} icon={DollarSign} color="green" />
      </div>

      <div className="grid sm:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatCard label="Completed Orders" value={stats.completedOrders} icon={CheckCircle} color="teal" />
        <StatCard label="Marketplace GMV" value={`₦${stats.marketplaceGMV.toLocaleString()}`} icon={TrendingUp} color="green" />
        <StatCard label="Total Requests" value={stats.totalRequests} icon={ShoppingBag} color="orange" />
        <StatCard label="Total Bids" value={stats.totalBids} icon={Target} color="blue" />
        <StatCard label="Pending Approvals" value={stats.pendingApprovals} icon={Clock} color="amber" />
        <StatCard label="Open Disputes" value={stats.openDisputes} icon={AlertTriangle} color="red" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-stone-900">Revenue Trend</h3>
              <p className="text-xs text-stone-400 mt-0.5">Last 6 months, based on actual orders</p>
            </div>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <div className="flex items-end justify-between gap-1 h-32">
            {monthlyMetrics.map(metric => {
              const maxRevenue = Math.max(...monthlyMetrics.map(m => m.revenue), 1);
              const height = Math.max((metric.revenue / maxRevenue) * 100, metric.orders > 0 ? 12 : 4);
              return (
              <div key={metric.label} className="flex-1 bg-orange-100 rounded-t-sm hover:bg-orange-300 transition-colors relative group cursor-pointer" style={{ height: `${height}%` }}>
                <div className="absolute -top-9 left-1/2 -translate-x-1/2 text-xs text-stone-500 opacity-0 group-hover:opacity-100 whitespace-nowrap">
                  ₦{metric.revenue.toLocaleString()} · {metric.orders} orders
                </div>
              </div>
            );})}
          </div>
          <div className="flex justify-between text-xs text-stone-400 mt-2">
            {monthlyMetrics.map(metric => (
              <span key={metric.label}>{metric.label}</span>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
          <h3 className="font-semibold text-stone-900 mb-4">Marketplace Health</h3>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="rounded-xl bg-stone-50 p-4 border border-stone-100">
              <p className="text-xs text-stone-400">Request conversion</p>
              <p className="text-2xl font-bold text-stone-900">{stats.requestConversionRate}%</p>
            </div>
            <div className="rounded-xl bg-stone-50 p-4 border border-stone-100">
              <p className="text-xs text-stone-400">Bid acceptance</p>
              <p className="text-2xl font-bold text-stone-900">{stats.bidAcceptanceRate}%</p>
            </div>
            <div className="rounded-xl bg-stone-50 p-4 border border-stone-100">
              <p className="text-xs text-stone-400">Avg order value</p>
              <p className="text-2xl font-bold text-stone-900">₦{Math.round(stats.avgOrderValue).toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-stone-50 p-4 border border-stone-100">
              <p className="text-xs text-stone-400">Open demand</p>
              <p className="text-2xl font-bold text-stone-900">{stats.openRequests + stats.biddingRequests}</p>
            </div>
          </div>
          <div className="space-y-3">
            {Object.entries(requestStatus).map(([status, count]) => (
              <div key={status}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="capitalize text-stone-500">{status.replace(/_/g, ' ')}</span>
                  <span className="font-semibold text-stone-700">{count}</span>
                </div>
                <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-400 rounded-full" style={{ width: `${stats.totalRequests ? (count / stats.totalRequests) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
          <h3 className="font-semibold text-stone-900 mb-4">Demand Mix</h3>
          <div className="space-y-3">
            {Object.entries(eventTypes).length === 0 ? (
              <p className="text-sm text-stone-400">No request data yet.</p>
            ) : Object.entries(eventTypes).sort((a, b) => b[1] - a[1]).map(([event, count]) => (
              <div key={event}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="capitalize text-stone-500">{event.replace(/_/g, ' ')}</span>
                  <span className="font-semibold text-stone-700">{count}</span>
                </div>
                <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-400 rounded-full" style={{ width: `${stats.totalRequests ? (count / stats.totalRequests) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
          <h3 className="font-semibold text-stone-900 mb-4">Order Pipeline</h3>
          <div className="space-y-3">
            {Object.entries(orderStatus).length === 0 ? (
              <p className="text-sm text-stone-400">No order data yet.</p>
            ) : Object.entries(orderStatus).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
              <div key={status}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="capitalize text-stone-500">{status.replace(/_/g, ' ')}</span>
                  <span className="font-semibold text-stone-700">{count}</span>
                </div>
                <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-400 rounded-full" style={{ width: `${Object.values(orderStatus).reduce((sum, countValue) => sum + countValue, 0) ? (count / Object.values(orderStatus).reduce((sum, countValue) => sum + countValue, 0)) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
          <h3 className="font-semibold text-stone-900 mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {[
              { label: 'Manage Users', page: 'users', icon: Users, color: 'text-blue-500 bg-blue-50' },
              { label: 'Chef Approvals', page: 'chefs', icon: ChefHat, color: 'text-orange-500 bg-orange-50' },
              { label: 'All Orders', page: 'orders', icon: Briefcase, color: 'text-amber-500 bg-amber-50' },
              { label: 'Disputes', page: 'disputes', icon: AlertTriangle, color: 'text-red-500 bg-red-50' },
              { label: 'Send Notifications', page: 'notifications', icon: Activity, color: 'text-teal-500 bg-teal-50' },
            ].map(item => (
              <button
                key={item.page}
                onClick={() => onNavigate(item.page)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 transition-colors text-left group"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.color}`}>
                  <item.icon className="w-4 h-4" />
                </div>
                <span className="font-medium text-stone-800 text-sm flex-1">{item.label}</span>
                <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-stone-500" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <h3 className="font-semibold text-stone-900">Recent Orders</h3>
          <button onClick={() => onNavigate('orders')} className="text-orange-500 text-sm hover:text-orange-600 flex items-center gap-1">
            View all <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="divide-y divide-stone-50">
          {loading ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="p-4 animate-pulse">
                <div className="h-4 bg-stone-100 rounded w-3/4 mb-2" />
                <div className="h-3 bg-stone-100 rounded w-1/3" />
              </div>
            ))
          ) : recentOrders.map(order => (
            <div key={order.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-stone-800">{order.food_requests?.title || 'Order'}</p>
                <p className="text-xs text-stone-400 mt-0.5">₦{order.total_amount.toLocaleString()}</p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                order.status === 'completed' ? 'bg-green-100 text-green-700' :
                order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {order.status.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
