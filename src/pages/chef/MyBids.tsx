import { useEffect, useState } from 'react';
import { Star, Clock, DollarSign, CheckCircle, TrendingUp, Target } from 'lucide-react';
import { supabase, Bid } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';

interface Props { onNavigate: (page: string, data?: unknown) => void; }

export default function MyBids({ onNavigate }: Props) {
  const { profile } = useAuth();
  const [bids, setBids] = useState<(Bid & { food_requests?: { title: string; budget_min: number; budget_max: number; customer_id: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('bids')
        .select('*, food_requests(title, budget_min, budget_max, customer_id, event_type, servings)')
        .eq('chef_id', profile!.id)
        .order('created_at', { ascending: false });
      if (data) setBids(data as typeof bids);
      setLoading(false);
    }
    if (profile) load();
  }, [profile]);

  const filtered = bids.filter(b => filter === 'all' || b.status === filter);
  const stats = {
    pending: bids.filter(b => b.status === 'pending').length,
    accepted: bids.filter(b => b.status === 'accepted').length,
    rejected: bids.filter(b => b.status === 'rejected').length,
  };
  const winRate = bids.length ? Math.round((stats.accepted / bids.length) * 100) : 0;
  const avgBid = bids.length ? bids.reduce((sum, bid) => sum + (bid.total_cost || 0), 0) / bids.length : 0;
  const pendingValue = bids.filter(b => b.status === 'pending').reduce((sum, bid) => sum + (bid.total_cost || 0), 0);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">My Bids</h1>
        <p className="text-stone-500 text-sm mt-1">{bids.length} bids submitted</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-700">{stats.pending}</p>
          <p className="text-xs text-amber-600 mt-0.5">Pending</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-green-700">{stats.accepted}</p>
          <p className="text-xs text-green-600 mt-0.5">Accepted</p>
        </div>
        <div className="bg-stone-100 border border-stone-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-stone-600">{stats.rejected}</p>
          <p className="text-xs text-stone-500 mt-0.5">Rejected</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-stone-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-stone-400 text-xs mb-2">
            <Target className="w-4 h-4" />
            Win rate
          </div>
          <p className="text-2xl font-bold text-stone-900">{winRate}%</p>
        </div>
        <div className="bg-white border border-stone-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-stone-400 text-xs mb-2">
            <TrendingUp className="w-4 h-4" />
            Avg bid
          </div>
          <p className="text-2xl font-bold text-stone-900">₦{Math.round(avgBid).toLocaleString()}</p>
        </div>
        <div className="bg-white border border-stone-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-stone-400 text-xs mb-2">
            <DollarSign className="w-4 h-4" />
            Pending value
          </div>
          <p className="text-2xl font-bold text-stone-900">₦{pendingValue.toLocaleString()}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'pending', 'accepted', 'rejected', 'withdrawn'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
              filter === f ? 'bg-orange-500 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:border-orange-300'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array(4).fill(0).map((_, i) => <div key={i} className="bg-white rounded-2xl p-5 border border-stone-100 h-24 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-100 p-12 text-center">
          <Star className="w-12 h-12 text-stone-300 mx-auto mb-4" />
          <p className="text-stone-500">No bids found. Browse the marketplace to start bidding!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(bid => {
            const req = bid.food_requests;
            return (
              <div key={bid.id} className={`bg-white rounded-2xl border p-5 transition-all ${
                bid.status === 'accepted' ? 'border-green-300 shadow-md' :
                bid.status === 'rejected' ? 'border-stone-200 opacity-70' :
                'border-stone-100 hover:border-orange-200 hover:shadow-sm'
              }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-stone-900 truncate">{req?.title || 'Request'}</h3>
                      <StatusBadge status={bid.status} />
                    </div>
                    {bid.message && <p className="text-sm text-stone-500 line-clamp-1 italic mb-2">"{bid.message}"</p>}
                    <div className="flex items-center gap-4 text-xs text-stone-400">
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5" />
                        Your bid: <strong className="text-stone-700">₦{bid.total_cost.toLocaleString()}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {bid.estimated_hours}h
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 mt-1">
                      Submitted {new Date(bid.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {bid.status === 'accepted' && (
                    <button
                      onClick={() => onNavigate('orders')}
                      className="flex items-center gap-1.5 px-3 py-2 bg-green-500 text-white text-xs font-bold rounded-xl hover:bg-green-600 shrink-0"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      View Order
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
