import { useEffect, useState } from 'react';
import { Search, MapPin, Users, DollarSign, Clock, ChevronRight, Filter, ChefHat, TrendingUp, Target, Activity } from 'lucide-react';
import { supabase, FoodRequest } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';

interface Props { onNavigate: (page: string, data?: unknown) => void; }

export default function Marketplace({ onNavigate }: Props) {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<FoodRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [myBids, setMyBids] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      const [reqRes, bidRes] = await Promise.all([
        supabase
          .from('food_requests')
          .select('*, profiles!food_requests_customer_id_fkey(full_name, avatar_url), request_ingredients(*)')
          .in('status', ['open', 'bidding'])
          .order('created_at', { ascending: false }),
        supabase.from('bids').select('request_id').eq('chef_id', profile!.id),
      ]);
      if (reqRes.data) setRequests(reqRes.data);
      if (bidRes.data) setMyBids(new Set(bidRes.data.map(b => b.request_id)));
      setLoading(false);
    }
    if (profile) load();
  }, [profile]);

  const filtered = requests.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || r.event_type === filter;
    return matchesSearch && matchesFilter;
  });
  const totalMarketValue = requests.reduce((sum, req) => sum + (req.budget_max || 0), 0);
  const avgBudget = requests.length ? requests.reduce((sum, req) => sum + ((req.budget_min + req.budget_max) / 2), 0) / requests.length : 0;
  const alreadyBidCount = requests.filter(req => myBids.has(req.id)).length;
  const bidCoverage = requests.length ? Math.round((alreadyBidCount / requests.length) * 100) : 0;
  const hotRequests = requests.filter(req => req.status === 'bidding').length;
  const eventMix = requests.reduce<Record<string, number>>((acc, req) => {
    acc[req.event_type] = (acc[req.event_type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Food Marketplace</h1>
        <p className="text-stone-500 text-sm mt-1">Browse customer requests and submit your best bid.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-stone-100 p-4 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center mb-3">
            <ChefHat className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-stone-900">{requests.length}</p>
          <p className="text-xs text-stone-400 uppercase tracking-wide">Open requests</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-100 p-4 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-green-50 text-green-500 flex items-center justify-center mb-3">
            <DollarSign className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-stone-900">₦{Math.round(totalMarketValue).toLocaleString()}</p>
          <p className="text-xs text-stone-400 uppercase tracking-wide">Max market value</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-100 p-4 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center mb-3">
            <Target className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-stone-900">{bidCoverage}%</p>
          <p className="text-xs text-stone-400 uppercase tracking-wide">Your coverage</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-100 p-4 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center mb-3">
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-stone-900">₦{Math.round(avgBudget).toLocaleString()}</p>
          <p className="text-xs text-stone-400 uppercase tracking-wide">Avg budget</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-stone-900">Marketplace Analytics</h2>
            <p className="text-xs text-stone-400 mt-0.5">{hotRequests} requests already receiving bids</p>
          </div>
          <Activity className="w-5 h-5 text-orange-500" />
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          <div className="space-y-3">
            {Object.entries(eventMix).length === 0 ? (
              <p className="text-sm text-stone-400">No active demand yet.</p>
            ) : Object.entries(eventMix).sort((a, b) => b[1] - a[1]).map(([event, count]) => (
              <div key={event}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="capitalize text-stone-500">{event.replace(/_/g, ' ')}</span>
                  <span className="font-semibold text-stone-700">{count}</span>
                </div>
                <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-400 rounded-full" style={{ width: `${requests.length ? (count / requests.length) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-stone-50 border border-stone-100 p-4">
              <p className="text-xs text-stone-400">Submitted bids</p>
              <p className="text-2xl font-bold text-stone-900">{alreadyBidCount}</p>
            </div>
            <div className="rounded-xl bg-stone-50 border border-stone-100 p-4">
              <p className="text-xs text-stone-400">Unbid requests</p>
              <p className="text-2xl font-bold text-stone-900">{Math.max(requests.length - alreadyBidCount, 0)}</p>
            </div>
            <div className="rounded-xl bg-stone-50 border border-stone-100 p-4 col-span-2">
              <p className="text-xs text-stone-400">Filtered result share</p>
              <p className="text-2xl font-bold text-stone-900">{requests.length ? Math.round((filtered.length / requests.length) * 100) : 0}%</p>
            </div>
          </div>
        </div>
      </div>

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
            className="border border-stone-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
          >
            <option value="all">All Events</option>
            <option value="family_meal">Family Meal</option>
            <option value="birthday">Birthday</option>
            <option value="wedding">Wedding</option>
            <option value="corporate_event">Corporate Event</option>
            <option value="dinner_party">Dinner Party</option>
            <option value="meal_prep">Meal Prep</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-stone-100 p-5 animate-pulse">
              <div className="h-5 bg-stone-100 rounded w-1/2 mb-3" />
              <div className="h-4 bg-stone-100 rounded w-3/4 mb-2" />
              <div className="h-4 bg-stone-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-100 p-12 text-center">
          <ChefHat className="w-12 h-12 text-stone-300 mx-auto mb-4" />
          <h3 className="text-stone-600 font-semibold mb-1">No requests available</h3>
          <p className="text-stone-400 text-sm">New food requests will appear here. Check back soon!</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-stone-500">{filtered.length} request{filtered.length !== 1 ? 's' : ''} found</p>
          {filtered.map(req => {
            const customer = (req as unknown as { profiles?: { full_name: string } }).profiles;
            const ingredients = (req as unknown as { request_ingredients?: { ingredient: string; is_allergy: boolean }[] }).request_ingredients || [];
            const nonAllergyIngredients = ingredients.filter(i => !i.is_allergy).slice(0, 6);
            const alreadyBid = myBids.has(req.id);

            return (
              <button
                key={req.id}
                onClick={() => onNavigate('submit-bid', req)}
                className="w-full bg-white rounded-2xl border border-stone-100 p-5 text-left hover:shadow-md hover:border-orange-200 transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <h3 className="font-semibold text-stone-900 group-hover:text-orange-600 transition-colors">{req.title}</h3>
                      <StatusBadge status={req.status} />
                      {alreadyBid && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-semibold">Bid Submitted</span>
                      )}
                    </div>
                    <p className="text-stone-500 text-sm line-clamp-2 mb-3">{req.description}</p>

                    {nonAllergyIngredients.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {nonAllergyIngredients.map(i => (
                          <span key={i.ingredient} className="px-2 py-0.5 bg-orange-50 text-orange-600 text-xs rounded-full border border-orange-100">
                            {i.ingredient}
                          </span>
                        ))}
                        {ingredients.filter(i => !i.is_allergy).length > 6 && (
                          <span className="px-2 py-0.5 bg-stone-50 text-stone-500 text-xs rounded-full">+{ingredients.filter(i => !i.is_allergy).length - 6} more</span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-stone-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {req.servings} servings
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5" />
                        ₦{req.budget_min.toLocaleString()} – ₦{req.budget_max.toLocaleString()}
                      </span>
                      {req.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {req.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(req.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-teal-400 flex items-center justify-center text-white text-sm font-bold">
                      {customer?.full_name?.charAt(0) || 'C'}
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-orange-400" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
