import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle, Clock, MessageCircle, Star, AlertTriangle, DollarSign, Package } from 'lucide-react';
import { supabase, Order } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import { startPaystackCheckout } from '../../lib/paystack';

interface Props {
  order: Order;
  onNavigate: (page: string, data?: unknown) => void;
}

const ORDER_STATUSES = [
  { key: 'payment_pending', label: 'Payment Pending' },
  { key: 'payment_failed', label: 'Payment Failed' },
  { key: 'payment_confirmed', label: 'Payment Confirmed' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'out_for_delivery', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'payout_pending', label: 'Payout Pending' },
  { key: 'payout_completed', label: 'Payout Completed' },
  { key: 'completed', label: 'Completed' },
];

type RatingKey = 'food_quality' | 'communication' | 'timeliness' | 'overall';

const REVIEW_FIELDS: Array<{ key: RatingKey; label: string }> = [
  { key: 'food_quality', label: 'Food Quality' },
  { key: 'communication', label: 'Communication' },
  { key: 'timeliness', label: 'Timeliness' },
  { key: 'overall', label: 'Overall Experience' },
];

export default function OrderDetail({ order, onNavigate }: Props) {
  const { profile } = useAuth();
  const [fullOrder, setFullOrder] = useState<Order & { food_requests?: { title: string; description: string; event_type: string; delivery_type: string; location: string; servings: number }; customer?: { full_name: string }; chef?: { full_name: string }; bids?: { proposed_recipe: string; message: string; estimated_hours: number } } | null>(null);
  const [updating, setUpdating] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [review, setReview] = useState({ food_quality: 5, communication: 5, timeliness: 5, overall: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  async function handlePay() {
    if (!fullOrder?.customer?.email) {
      setPaymentError('Customer email is required to start checkout.');
      return;
    }

    setPaymentError('');
    setIsPaying(true);
    try {
      await startPaystackCheckout(fullOrder.id, fullOrder.customer.email, fullOrder.total_amount);
      setFullOrder(prev => prev ? { ...prev, status: 'payment_confirmed' } : prev);
    } catch (error: any) {
      setPaymentError(error?.message || 'Payment initiation failed.');
      if (fullOrder?.status === 'payment_pending') {
        await supabase.from('orders').update({ status: 'payment_failed' }).eq('id', fullOrder.id);
        setFullOrder(prev => prev ? { ...prev, status: 'payment_failed' } : prev);
      }
    }
    setIsPaying(false);
  }

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('orders')
        .select(`*, food_requests(*), customer:profiles!orders_customer_id_fkey(full_name, email), chef:profiles!orders_chef_id_fkey(full_name, email), bids(*)`)
        .eq('id', order.id)
        .maybeSingle();
      if (data) setFullOrder(data as typeof fullOrder);
    }
    load();
  }, [order.id]);

  async function updateStatus(newStatus: string) {
    setUpdating(true);
    await supabase.from('orders').update({ status: newStatus }).eq('id', order.id);
    setFullOrder(prev => prev ? { ...prev, status: newStatus } : prev);
    setUpdating(false);
  }

  async function submitReview() {
    setSubmittingReview(true);
    await supabase.from('reviews').insert({
      order_id: order.id,
      customer_id: profile!.id,
      chef_id: order.chef_id,
      ...review,
    });
    await updateStatus('completed');
    setShowReview(false);
    setSubmittingReview(false);
  }

  const statusIndex = ORDER_STATUSES.findIndex(s => s.key === (fullOrder?.status || order.status));

  if (!fullOrder) {
    return (
      <div className="p-6 max-w-3xl mx-auto animate-pulse">
        <div className="h-8 bg-stone-100 rounded w-1/2 mb-4" />
        <div className="h-48 bg-stone-100 rounded-2xl" />
      </div>
    );
  }

  const isCustomer = profile?.role === 'customer';
  const isChef = profile?.role === 'chef';
  const currentStatus = fullOrder.status;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button onClick={() => onNavigate('orders')} className="flex items-center gap-2 text-stone-500 hover:text-stone-700 text-sm mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Orders
      </button>

      {/* Order Header */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 mb-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl font-bold text-stone-900">{fullOrder.food_requests?.title}</h1>
            <p className="text-stone-500 text-sm mt-1">{fullOrder.food_requests?.description}</p>
          </div>
          <StatusBadge status={currentStatus} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div className="bg-stone-50 rounded-xl p-3">
            <p className="text-xs text-stone-400 mb-0.5">Amount</p>
            <p className="font-bold text-stone-900">₦{fullOrder.total_amount.toLocaleString()}</p>
          </div>
          <div className="bg-stone-50 rounded-xl p-3">
            <p className="text-xs text-stone-400 mb-0.5">{isCustomer ? 'Chef' : 'Customer'}</p>
            <p className="font-bold text-stone-900 truncate">{isCustomer ? fullOrder.chef?.full_name : fullOrder.customer?.full_name}</p>
          </div>
          <div className="bg-stone-50 rounded-xl p-3">
            <p className="text-xs text-stone-400 mb-0.5">Servings</p>
            <p className="font-bold text-stone-900">{fullOrder.food_requests?.servings}</p>
          </div>
          <div className="bg-stone-50 rounded-xl p-3">
            <p className="text-xs text-stone-400 mb-0.5">Delivery</p>
            <p className="font-bold text-stone-900 capitalize text-xs leading-tight">{fullOrder.food_requests?.delivery_type?.replace(/_/g, ' ')}</p>
          </div>
        </div>
      </div>

      {/* Progress Tracker */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 mb-5">
        <h3 className="font-semibold text-stone-900 mb-4">Order Progress</h3>
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-stone-100" />
          <div className="space-y-4">
            {ORDER_STATUSES.map((s, idx) => {
              const isDone = idx < statusIndex;
              const isCurrent = idx === statusIndex;
              return (
                <div key={s.key} className="flex items-center gap-4 relative">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 border-2 ${
                    isDone ? 'bg-green-500 border-green-500 text-white' :
                    isCurrent ? 'bg-orange-500 border-orange-500 text-white' :
                    'bg-white border-stone-200 text-stone-400'
                  }`}>
                    {isDone ? <CheckCircle className="w-4 h-4" /> : isCurrent ? <Clock className="w-4 h-4" /> : <div className="w-2 h-2 rounded-full bg-stone-300" />}
                  </div>
                  <p className={`text-sm font-medium ${isDone ? 'text-stone-600' : isCurrent ? 'text-orange-600' : 'text-stone-300'}`}>
                    {s.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recipe / Bid Info */}
      {fullOrder.bids && (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 mb-5">
          <h3 className="font-semibold text-stone-900 mb-3">Recipe Details</h3>
          {fullOrder.bids.proposed_recipe && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Proposed Recipe</p>
              <p className="text-sm text-stone-700">{fullOrder.bids.proposed_recipe}</p>
            </div>
          )}
          {fullOrder.bids.message && (
            <div className="bg-orange-50 rounded-xl p-3 border border-orange-100">
              <p className="text-sm text-stone-700 italic">"{fullOrder.bids.message}"</p>
            </div>
          )}
          <div className="flex items-center gap-2 mt-3 text-xs text-stone-500">
            <Clock className="w-3.5 h-3.5" />
            <span>Est. {fullOrder.bids.estimated_hours}h to complete</span>
          </div>
        </div>
      )}

      {/* Payment Info */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-stone-900">Payment Breakdown</h3>
          <span className="premium-badge">Paystack</span>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-stone-500">Order Amount</span>
            <span className="font-medium text-stone-900">₦{fullOrder.total_amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">Platform Fee (10%)</span>
            <span className="text-stone-500">₦{fullOrder.platform_fee.toLocaleString()}</span>
          </div>
          {isChef && (
            <div className="flex justify-between border-t border-stone-100 pt-2 mt-2">
              <span className="font-semibold text-stone-800">Your Payout</span>
              <span className="font-bold text-green-600">₦{fullOrder.chef_payout.toLocaleString()}</span>
            </div>
          )}
          <div className="mt-4 rounded-3xl border border-[#D4AF37] bg-[#FFF8E5] p-4">
            <div className="flex items-center gap-3">
              <Package className="w-4 h-4 text-[#D4AF37]" />
              <p className="text-sm text-[#5E5A53]">Paystack secures your payment and holds it in escrow until delivery is confirmed.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {/* Chef Status Updates */}
        {isChef && currentStatus === 'payment_confirmed' && (
          <button onClick={() => updateStatus('preparing')} disabled={updating}
            className="w-full py-3 bg-blue-500 text-white rounded-xl font-semibold text-sm hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2">
            {updating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Clock className="w-4 h-4" /> Start Preparing</>}
          </button>
        )}
        {isChef && currentStatus === 'preparing' && (
          <button onClick={() => updateStatus('out_for_delivery')} disabled={updating}
            className="w-full py-3 bg-amber-500 text-white rounded-xl font-semibold text-sm hover:bg-amber-600 disabled:opacity-50">
            Mark Out for Delivery
          </button>
        )}
        {isChef && currentStatus === 'out_for_delivery' && (
          <button onClick={() => updateStatus('delivered')} disabled={updating}
            className="w-full py-3 bg-green-500 text-white rounded-xl font-semibold text-sm hover:bg-green-600 disabled:opacity-50">
            Mark as Delivered
          </button>
        )}

        {/* Customer Actions */}
        {isCustomer && ['payment_pending', 'payment_failed'].includes(currentStatus) && (
          <button onClick={handlePay} disabled={isPaying}
            className="w-full py-3 premium-button text-[#0B0B0B] rounded-[1.5rem] font-semibold text-sm disabled:opacity-70 flex items-center justify-center gap-2">
            {isPaying ? (
              <div className="w-4 h-4 border-2 border-[#0B0B0B] border-t-transparent rounded-full animate-spin" />
            ) : (
              <><DollarSign className="w-4 h-4" /> Pay with Paystack</>
            )}
          </button>
        )}
        {paymentError && (
          <div className="text-sm text-[#8A2F2F] bg-[#FFF1F0] border border-[#F3D6D5] rounded-3xl p-4">
            {paymentError}
          </div>
        )}
        {isCustomer && currentStatus === 'delivered' && !showReview && (
          <button onClick={() => setShowReview(true)}
            className="w-full py-3 bg-orange-500 text-white rounded-xl font-semibold text-sm hover:bg-orange-600">
            <Star className="w-4 h-4 inline mr-2" />Leave Review & Complete Order
          </button>
        )}

        {/* Review Form */}
        {showReview && (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 space-y-4">
            <h3 className="font-semibold text-stone-900">Leave a Review</h3>
            {REVIEW_FIELDS.map(({ key, label }) => (
              <div key={key}>
                <label className="block text-sm font-semibold text-stone-700 mb-2">{label}</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => setReview(prev => ({ ...prev, [key]: n }))}
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                        review[key] >= n ? 'bg-amber-400 text-white' : 'bg-stone-100 text-stone-400 hover:bg-amber-100'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Written Review *</label>
              <textarea
                placeholder="Share your experience..."
                value={review.comment}
                onChange={e => setReview({ ...review, comment: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
              />
            </div>
            <button
              onClick={submitReview}
              disabled={!review.comment.trim() || submittingReview}
              className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 disabled:opacity-50"
            >
              Submit Review & Complete
            </button>
          </div>
        )}

        {/* Message / Dispute */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onNavigate('messages')}
            className="py-3 border border-stone-200 text-stone-600 rounded-xl font-semibold text-sm hover:bg-stone-50 flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" /> Message
          </button>
          {!['completed', 'cancelled'].includes(currentStatus) && (
            <button
              className="py-3 border border-red-200 text-red-500 rounded-xl font-semibold text-sm hover:bg-red-50 flex items-center justify-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" /> Dispute
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
