import { useEffect, useState } from 'react';
import { ShoppingBag, ChevronRight, Plus, Search, Filter, TrendingUp, Target, DollarSign, Activity } from 'lucide-react';
import { supabase, FoodRequest } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';

interface Props { onNavigate: (page: string, data?: unknown) => void; }

export default function MyRequests({ onNavigate }: Props) {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<FoodRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('food_requests')
        .select('*, bids(id, status)')
        .eq('customer_id', profile!.id)
        .order('created_at', { ascending: false });
      if (data) setRequests(data);
      setLoading(false);
    }
    if (profile) load();
  }, [profile]);

  const filtered = requests.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || r.status === filter;
    return matchesSearch && matchesFilter;
  });
  const totalBids = requests.reduce((sum, req) => sum + (((req as unknown as { bids?: { id: string }[] }).bids?.length) || 0), 0);
  const acceptedRequests = requests.filter(req => req.status === 'accepted').length;
  const activeRequests = requests.filter(req => ['open', 'bidding'].includes(req.status)).length;
  const conversionRate = requests.length ? Math.round((acceptedRequests / requests.length) * 100) : 0;
  const avgBudget = requests.length ? requests.reduce((sum, req) => sum + ((req.budget_min + req.budget_max) / 2), 0) / requests.length : 0;
  const statusMix = requests.reduce<Record<string, number>>((acc, req) => {
    acc[req.status] = (acc[req.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">My Requests</h1>
          <p className="text-stone-500 text-sm mt-1">{requests.length} total requests</p>
        </div>
        <button
          onClick={() => onNavigate('new-request')}
          className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Request
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-stone-100 p-4 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center mb-3">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-stone-900">{activeRequests}</p>
          <p className="text-xs text-stone-400 uppercase tracking-wide">Active requests</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-100 p-4 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center mb-3">
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-stone-900">{totalBids}</p>
          <p className="text-xs text-stone-400 uppercase tracking-wide">Total bids</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-100 p-4 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-green-50 text-green-500 flex items-center justify-center mb-3">
            <Target className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-stone-900">{conversionRate}%</p>
          <p className="text-xs text-stone-400 uppercase tracking-wide">Conversion</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-100 p-4 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center mb-3">
            <DollarSign className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-stone-900">₦{Math.round(avgBudget).toLocaleString()}</p>
          <p className="text-xs text-stone-400 uppercase tracking-wide">Avg budget</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-stone-900">Request Analytics</h2>
            <p className="text-xs text-stone-400 mt-0.5">Status mix and bid response across your marketplace demand</p>
          </div>
          <Activity className="w-5 h-5 text-orange-500" />
        </div>
        <div className="grid md:grid-cols-[1fr_0.7fr] gap-5">
          <div className="space-y-3">
            {Object.entries(statusMix).length === 0 ? (
              <p className="text-sm text-stone-400">No requests yet.</p>
            ) : Object.entries(statusMix).map(([status, count]) => (
              <div key={status}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="capitalize text-stone-500">{status.replace(/_/g, ' ')}</span>
                  <span className="font-semibold text-stone-700">{count}</span>
                </div>
                <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-400 rounded-full" style={{ width: `${requests.length ? (count / requests.length) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-1 gap-3">
            <div className="rounded-xl bg-stone-50 border border-stone-100 p-4">
              <p className="text-xs text-stone-400">Avg bids/request</p>
              <p className="text-2xl font-bold text-stone-900">{requests.length ? (totalBids / requests.length).toFixed(1) : '0.0'}</p>
            </div>
            <div className="rounded-xl bg-stone-50 border border-stone-100 p-4">
              <p className="text-xs text-stone-400">Filtered requests</p>
              <p className="text-2xl font-bold text-stone-900">{filtered.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search requests..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-stone-400" />
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="bidding">Bidding</option>
            <option value="accepted">Accepted</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-stone-100 animate-pulse">
              <div className="h-5 bg-stone-100 rounded w-1/2 mb-3" />
              <div className="h-4 bg-stone-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-100 p-12 text-center">
          <ShoppingBag className="w-12 h-12 text-stone-300 mx-auto mb-4" />
          <h3 className="text-stone-600 font-semibold mb-1">No requests found</h3>
          <p className="text-stone-400 text-sm mb-6">Create your first custom food request to get bids from chefs.</p>
          <button
            onClick={() => onNavigate('new-request')}
            className="bg-orange-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-600"
          >
            Create Request
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => {
            const bidCount = (req as unknown as { bids?: { id: string }[] }).bids?.length || 0;
            return (
              <button
                key={req.id}
                onClick={() => onNavigate('request-detail', req)}
                className="w-full bg-white rounded-2xl border border-stone-100 p-5 text-left hover:shadow-md hover:border-orange-200 transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-1.5">
                      <h3 className="font-semibold text-stone-900 group-hover:text-orange-600 transition-colors truncate">{req.title}</h3>
                      <StatusBadge status={req.status} />
                    </div>
                    <p className="text-stone-500 text-sm truncate">{req.description}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-stone-400">
                      <span className="capitalize">{req.event_type.replace('_', ' ')}</span>
                      <span>·</span>
                      <span>{req.servings} servings</span>
                      <span>·</span>
                      <span>₦{req.budget_min.toLocaleString()} – ₦{req.budget_max.toLocaleString()}</span>
                      {bidCount > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-orange-500 font-semibold">{bidCount} bid{bidCount !== 1 ? 's' : ''}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-stone-300 group-hover:text-orange-400 transition-colors shrink-0 mt-0.5" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
