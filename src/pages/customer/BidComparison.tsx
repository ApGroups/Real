import { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, Star, Clock, CheckCircle, ChefHat, DollarSign, MessageCircle, Package } from 'lucide-react';
import { supabase, Bid, FoodRequest, Order } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';

interface Props {
  request: FoodRequest;
  onNavigate: (page: string, data?: unknown) => void;
}

export default function BidComparison({ request, onNavigate }: Props) {
  const { profile } = useAuth();
  const [bids, setBids] = useState<Bid[]>([]);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [commissionRate, setCommissionRate] = useState(0.1);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setError('');
      const [commissionRes, bidsRes, orderRes] = await Promise.all([
        supabase.from('platform_config').select('commission_rate').limit(1).maybeSingle(),
        supabase
          .from('bids')
          .select('*, profiles!bids_chef_id_fkey(*, chef_profiles(*))')
          .eq('request_id', request.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('orders')
          .select('*')
          .eq('request_id', request.id)
          .eq('customer_id', profile!.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (commissionRes.data?.commission_rate) setCommissionRate(commissionRes.data.commission_rate);
      if (bidsRes.error) setError(bidsRes.error.message);
      if (bidsRes.data) {
        const sorted = bidsRes.data.sort((a, b) => {
          const orderWeight: Record<string, number> = { accepted: 0, pending: 1, rejected: 2, withdrawn: 3 };
          return (orderWeight[a.status] ?? 4) - (orderWeight[b.status] ?? 4);
        });
        setBids(sorted);
        const acceptedBid = sorted.find(bid => bid.status === 'accepted');
        if (acceptedBid) setSelected(acceptedBid.id);
      }
      if (orderRes.data) setOrder(orderRes.data);
      setLoading(false);
    }
    if (profile) load();
  }, [profile, request.id]);

  async function acceptBid(bid: Bid) {
    if (request.status === 'accepted' || bid.status !== 'pending') return;
    setAccepting(bid.id);
    setError('');
    try {
      const platformFee = Number((bid.total_cost * commissionRate).toFixed(2));
      const { data: newOrder, error: orderError } = await supabase.from('orders').insert({
        request_id: request.id,
        bid_id: bid.id,
        customer_id: profile!.id,
        chef_id: bid.chef_id,
        total_amount: bid.total_cost,
        platform_fee: platformFee,
        chef_payout: Number((bid.total_cost - platformFee).toFixed(2)),
        status: 'payment_pending',
      }).select().single();

      if (orderError) throw orderError;

      const [acceptedRes, rejectedRes, requestRes] = await Promise.all([
        supabase.from('bids').update({ status: 'accepted' }).eq('id', bid.id),
        supabase.from('bids').update({ status: 'rejected' }).eq('request_id', request.id).neq('id', bid.id).eq('status', 'pending'),
        supabase.from('food_requests').update({ status: 'accepted' }).eq('id', request.id),
      ]);

      if (acceptedRes.error) throw acceptedRes.error;
      if (rejectedRes.error) throw rejectedRes.error;
      if (requestRes.error) throw requestRes.error;

      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('request_id', request.id)
        .eq('customer_id', profile!.id)
        .eq('chef_id', bid.chef_id)
        .maybeSingle();

      if (!existingConversation) {
        await supabase.from('conversations').insert({
          order_id: newOrder.id,
          request_id: request.id,
          customer_id: profile!.id,
          chef_id: bid.chef_id,
          last_message: 'Order created from accepted bid',
          last_message_at: new Date().toISOString(),
        });
      }

      setSelected(bid.id);
      setOrder(newOrder);
      setBids(prev => prev.map(item => (
        item.id === bid.id ? { ...item, status: 'accepted' } :
        item.status === 'pending' ? { ...item, status: 'rejected' } :
        item
      )));
      setTimeout(() => onNavigate('order-detail', newOrder), 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept bid');
    }
    setAccepting(null);
  }

  async function messageChef(bid: Bid) {
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('request_id', request.id)
      .eq('customer_id', profile!.id)
      .eq('chef_id', bid.chef_id)
      .maybeSingle();

    if (conversation) {
      onNavigate('messages', { conversationId: conversation.id });
      return;
    }

    const { data: created, error: createError } = await supabase
      .from('conversations')
      .insert({
        request_id: request.id,
        order_id: order?.id ?? null,
        customer_id: profile!.id,
        chef_id: bid.chef_id,
        last_message: '',
        last_message_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (createError) {
      setError(createError.message);
      return;
    }

    onNavigate('messages', { conversationId: created.id });
  }

  const pendingCount = bids.filter(bid => bid.status === 'pending').length;
  const acceptedBid = bids.find(bid => bid.status === 'accepted');
  const lowestBid = bids.length ? Math.min(...bids.map(bid => bid.total_cost)) : 0;
  const averageBid = bids.length ? bids.reduce((sum, bid) => sum + bid.total_cost, 0) / bids.length : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <button onClick={() => onNavigate('my-requests')} className="flex items-center gap-2 text-stone-500 hover:text-stone-700 text-sm mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Requests
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">{request.title}</h1>
        <p className="text-stone-500 text-sm mt-1">
          {acceptedBid ? 'A bid has been accepted. You can view the order or message the chef.' : 'Compare bids from chefs and select the best one for your order.'}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Request Summary */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 text-sm">
          <div>
            <p className="text-amber-600 text-xs font-semibold mb-1">BUDGET</p>
            <p className="font-bold text-amber-900">₦{request.budget_min.toLocaleString()} – ₦{request.budget_max.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-amber-600 text-xs font-semibold mb-1">SERVINGS</p>
            <p className="font-bold text-amber-900">{request.servings} people</p>
          </div>
          <div>
            <p className="text-amber-600 text-xs font-semibold mb-1">DELIVERY</p>
            <p className="font-bold text-amber-900 capitalize">{request.delivery_type.replace(/_/g, ' ')}</p>
          </div>
          <div>
            <p className="text-amber-600 text-xs font-semibold mb-1">STATUS</p>
            <StatusBadge status={request.status} />
          </div>
          <div>
            <p className="text-amber-600 text-xs font-semibold mb-1">BIDS</p>
            <p className="font-bold text-amber-900">{bids.length} total · {pendingCount} pending</p>
          </div>
          <div>
            <p className="text-amber-600 text-xs font-semibold mb-1">LOWEST / AVG</p>
            <p className="font-bold text-amber-900">₦{lowestBid.toLocaleString()} / ₦{Math.round(averageBid).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {order && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-green-800">Order created from accepted bid</p>
            <p className="text-xs text-green-700 mt-0.5">Continue to payment and fulfillment from the order page.</p>
          </div>
          <button
            onClick={() => onNavigate('order-detail', order)}
            className="inline-flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-green-700"
          >
            <CheckCircle className="w-4 h-4" />
            View Order
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid lg:grid-cols-2 gap-4">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-stone-100 p-5 animate-pulse">
              <div className="h-12 bg-stone-100 rounded-xl mb-4" />
              <div className="space-y-2">
                <div className="h-4 bg-stone-100 rounded w-3/4" />
                <div className="h-4 bg-stone-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : bids.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-100 p-12 text-center">
          <ChefHat className="w-12 h-12 text-stone-300 mx-auto mb-4" />
          <h3 className="text-stone-600 font-semibold mb-1">No bids yet</h3>
          <p className="text-stone-400 text-sm">Chefs will start bidding on your request soon. Check back later.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {bids.map(bid => {
            const chef = bid.profiles;
            const chefProfile = (bid.profiles as { chef_profiles?: typeof bid.chef_profiles })?.chef_profiles || bid.chef_profiles;
            const isAccepted = selected === bid.id;

            return (
              <div
                key={bid.id}
                className={`bg-white rounded-2xl border-2 p-5 transition-all ${
                  isAccepted ? 'border-green-500 shadow-lg shadow-green-100' : 'border-stone-100 hover:border-orange-200 hover:shadow-md'
                }`}
              >
                {/* Chef Header */}
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-stone-100">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center text-white text-lg font-bold shrink-0">
                    {chef?.full_name?.charAt(0) || 'C'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-stone-900 truncate">{chef?.full_name || 'Chef'}</p>
                    <div className="flex items-center gap-2 text-xs text-stone-500 flex-wrap">
                      <div className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span>{chefProfile?.avg_rating?.toFixed(1) || '0.0'}</span>
                      </div>
                      <span>·</span>
                      <span>{chefProfile?.total_orders || 0} orders</span>
                      <span>·</span>
                      <span>{chefProfile?.years_experience || 0} yrs exp</span>
                      <span>·</span>
                      <StatusBadge status={bid.status} />
                    </div>
                  </div>
                  {isAccepted && <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />}
                </div>

                {/* Bid Details */}
                <div className="space-y-3 mb-4">
                  {bid.proposed_recipe && (
                    <div>
                      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Proposed Recipe</p>
                      <p className="text-sm text-stone-700 line-clamp-2">{bid.proposed_recipe}</p>
                    </div>
                  )}

                  {bid.message && (
                    <div className="bg-stone-50 rounded-xl p-3">
                      <p className="text-sm text-stone-600 italic">"{bid.message}"</p>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-stone-50 rounded-lg p-2.5 text-center">
                      <p className="text-xs text-stone-400 mb-0.5">Labour</p>
                      <p className="text-sm font-bold text-stone-800">₦{bid.labour_cost.toLocaleString()}</p>
                    </div>
                    <div className="bg-stone-50 rounded-lg p-2.5 text-center">
                      <p className="text-xs text-stone-400 mb-0.5">Ingredients</p>
                      <p className="text-sm font-bold text-stone-800">₦{bid.ingredient_cost.toLocaleString()}</p>
                    </div>
                    <div className="bg-stone-50 rounded-lg p-2.5 text-center">
                      <p className="text-xs text-stone-400 mb-0.5">Delivery</p>
                      <p className="text-sm font-bold text-stone-800">₦{bid.delivery_cost.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                    <div className="flex items-center gap-1.5 text-stone-500 text-xs">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{bid.estimated_hours}h estimated</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-orange-500" />
                      <span className="text-xl font-bold text-stone-900">₦{bid.total_cost.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Budget check */}
                {bid.total_cost > request.budget_max && (
                  <div className="flex items-center gap-2 text-amber-700 bg-amber-50 rounded-lg px-3 py-2 text-xs mb-3">
                    <Package className="w-3.5 h-3.5" />
                    Above your budget by ₦{(bid.total_cost - request.budget_max).toLocaleString()}
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => isAccepted && order ? onNavigate('order-detail', order) : acceptBid(bid)}
                    disabled={!!accepting || (!!selected && !isAccepted) || bid.status !== 'pending' && !isAccepted || request.status === 'accepted' && !isAccepted}
                    className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                      isAccepted
                        ? 'bg-green-500 text-white hover:bg-green-600'
                        : bid.status !== 'pending' || request.status === 'accepted'
                        ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                        : 'bg-orange-500 text-white hover:bg-orange-600 shadow-sm'
                    }`}
                  >
                    {accepting === bid.id ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : isAccepted ? (
                      <><CheckCircle className="w-4 h-4" /> View Order</>
                    ) : bid.status === 'rejected' ? (
                      'Not Selected'
                    ) : (
                      'Accept Bid'
                    )}
                  </button>
                  <button
                    onClick={() => messageChef(bid)}
                    className="w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 bg-white border border-stone-200 text-stone-700 hover:border-orange-200 hover:text-orange-600"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Message Chef
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
