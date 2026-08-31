import { useEffect, useState } from 'react';
import { ShoppingBag, Clock } from 'lucide-react';
import { supabase, FoodRequest, Order } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';

interface Props { onNavigate: (page: string, data?: unknown) => void; }

export default function CustomerDashboard({ onNavigate }: Props) {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<FoodRequest[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [reqRes, ordRes] = await Promise.all([
        supabase.from('food_requests').select('*, bids(id, status, total_cost)').eq('customer_id', profile!.id).order('created_at', { ascending: false }),
        supabase.from('orders').select('*, food_requests(title)').eq('customer_id', profile!.id).order('created_at', { ascending: false }),
      ]);
      if (reqRes.data) setRequests(reqRes.data);
      if (ordRes.data) setOrders(ordRes.data);
      setLoading(false);
    }
    if (profile) load();
  }, [profile]);

  const activeRequests = requests.filter(req => ['open', 'bidding'].includes(req.status)).length;
  const upcomingOrders = orders.filter(order => !['completed', 'cancelled'].includes(order.status)).length;
  const completedOrders = orders.filter(order => order.status === 'completed').length;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <section className="premium-panel p-8 mb-10">
        <div className="grid gap-8 xl:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="text-sm uppercase tracking-[0.32em] text-[#8C6614] mb-3">{greeting}, premium concierge</p>
            <h1 className="text-4xl font-semibold tracking-tight text-[#0B0B0B] mb-4">Design Your Perfect Meal</h1>
            <p className="max-w-2xl text-base leading-8 text-[#5E5A53]">Create a bespoke dining experience with curated ingredients, chef recommendations, and private booking support. Every meal is crafted to feel exclusive, memorable, and tailored to your occasion.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={() => onNavigate('new-request')}
                className="premium-button px-6 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5"
              >
                Create Meal Request
              </button>
              <button
                onClick={() => onNavigate('marketplace')}
                className="premium-button-secondary px-6 py-3 text-sm font-semibold transition-all hover:bg-white/90"
              >
                Browse Top Chefs
              </button>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[1.75rem] border border-[#E7E2D8] bg-[#FEFBF7] p-6 shadow-[0_24px_60px_rgba(11,11,11,0.05)]">
              <p className="text-xs uppercase tracking-[0.32em] text-[#8C6614] mb-3">Effortless booking</p>
              <p className="text-sm leading-7 text-[#5E5A53]">Submit your request, review chef proposals, and secure payment with trusted Paystack security.</p>
            </div>
            <div className="rounded-[1.75rem] border border-[#E7E2D8] bg-[#FEFBF7] p-6 shadow-[0_24px_60px_rgba(11,11,11,0.05)]">
              <p className="text-xs uppercase tracking-[0.32em] text-[#8C6614] mb-3">Trusted service</p>
              <p className="text-sm leading-7 text-[#5E5A53]">Verified chefs, private consultations, and curated menus that feel less like delivery and more like a bespoke experience.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-3 mb-10">
        <div className="rounded-3xl border border-[#E7E2D8] bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.32em] text-[#8C6614] mb-3">Pending requests</p>
          <h2 className="text-3xl font-semibold text-[#0B0B0B]">{activeRequests}</h2>
          <p className="text-sm text-[#5E5A53] mt-2">Active requests awaiting chef responses.</p>
        </div>
        <div className="rounded-3xl border border-[#E7E2D8] bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.32em] text-[#8C6614] mb-3">Upcoming orders</p>
          <h2 className="text-3xl font-semibold text-[#0B0B0B]">{upcomingOrders}</h2>
          <p className="text-sm text-[#5E5A53] mt-2">Orders in progress or awaiting payment.</p>
        </div>
        <div className="rounded-3xl border border-[#E7E2D8] bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.32em] text-[#8C6614] mb-3">Past orders</p>
          <h2 className="text-3xl font-semibold text-[#0B0B0B]">{completedOrders}</h2>
          <p className="text-sm text-[#5E5A53] mt-2">Completed dining experiences you can reorder.</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="grid gap-6">
          <div className="premium-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-[#0B0B0B]">Recent Requests</h3>
                <p className="text-sm text-[#5E5A53] mt-1">Review your latest dining briefs.</p>
              </div>
              <button onClick={() => onNavigate('my-requests')} className="text-sm font-semibold text-[#8C6614] hover:text-[#0B0B0B]">View all</button>
            </div>
            <div className="space-y-3">
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-3xl bg-[#F3EFE8] p-5" />
                ))
              ) : requests.length === 0 ? (
                <div className="p-10 text-center text-[#5E5A53]">
                  <ShoppingBag className="w-10 h-10 mx-auto mb-4 text-[#B3A58B]" />
                  <p className="text-sm">No requests yet</p>
                </div>
              ) : (
                requests.slice(0, 5).map(req => (
                  <button
                    key={req.id}
                    onClick={() => onNavigate('request-detail', req)}
                    className="w-full rounded-[1.5rem] border border-[#E7E2D8] bg-[#FFFFFF] p-5 text-left transition hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(11,11,11,0.08)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#0B0B0B] truncate">{req.title}</p>
                        <p className="text-xs text-[#5E5A53] mt-1 capitalize">{req.event_type.replace('_', ' ')} · {req.servings} servings</p>
                      </div>
                      <StatusBadge status={req.status} />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          <div className="premium-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-[#0B0B0B]">Recent Orders</h3>
                <p className="text-sm text-[#5E5A53] mt-1">Track your latest meals.</p>
              </div>
              <button onClick={() => onNavigate('orders')} className="text-sm font-semibold text-[#8C6614] hover:text-[#0B0B0B]">View all</button>
            </div>
            <div className="space-y-3">
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-3xl bg-[#F3EFE8] p-5" />
                ))
              ) : orders.length === 0 ? (
                <div className="p-10 text-center text-[#5E5A53]">
                  <Clock className="w-10 h-10 mx-auto mb-4 text-[#B3A58B]" />
                  <p className="text-sm">No orders yet</p>
                </div>
              ) : (
                orders.slice(0, 5).map(order => (
                  <button
                    key={order.id}
                    onClick={() => onNavigate('order-detail', order)}
                    className="w-full rounded-[1.5rem] border border-[#E7E2D8] bg-[#FFFFFF] p-5 text-left transition hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(11,11,11,0.08)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#0B0B0B] truncate">{(order as unknown as { food_requests?: { title: string } }).food_requests?.title || 'Order'}</p>
                        <p className="text-xs text-[#5E5A53] mt-1">₦{order.total_amount.toLocaleString()}</p>
                      </div>
                      <StatusBadge status={order.status} />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
