import { useState } from 'react';
import { ArrowLeft, Send, DollarSign, Clock, ChefHat, AlertCircle } from 'lucide-react';
import { supabase, FoodRequest } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface Props {
  request: FoodRequest;
  onNavigate: (page: string) => void;
}

export default function SubmitBid({ request, onNavigate }: Props) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    proposed_recipe: '',
    preparation_notes: '',
    message: '',
    labour_cost: '',
    ingredient_cost: '',
    delivery_cost: '',
    estimated_hours: '4',
  });

  const totalCost = (parseFloat(form.labour_cost) || 0) + (parseFloat(form.ingredient_cost) || 0) + (parseFloat(form.delivery_cost) || 0);
  const withinBudget = totalCost <= request.budget_max && totalCost >= request.budget_min;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await supabase.from('bids').insert({
        request_id: request.id,
        chef_id: profile!.id,
        proposed_recipe: form.proposed_recipe,
        preparation_notes: form.preparation_notes,
        message: form.message,
        labour_cost: parseFloat(form.labour_cost) || 0,
        ingredient_cost: parseFloat(form.ingredient_cost) || 0,
        delivery_cost: parseFloat(form.delivery_cost) || 0,
        total_cost: totalCost,
        estimated_hours: parseInt(form.estimated_hours) || 4,
      });

      if (error) throw error;

      await supabase.from('food_requests').update({ status: 'bidding' }).eq('id', request.id).eq('status', 'open');

      setSuccess(true);
      setTimeout(() => onNavigate('marketplace'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit bid');
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div className="p-6 max-w-2xl mx-auto flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Send className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-stone-900 mb-2">Bid Submitted!</h2>
          <p className="text-stone-500 text-sm">Your bid has been sent to the customer. You'll be notified if they accept.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button onClick={() => onNavigate('marketplace')} className="flex items-center gap-2 text-stone-500 hover:text-stone-700 text-sm mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Marketplace
      </button>

      {/* Request Summary */}
      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 mb-6">
        <div className="flex items-start gap-3">
          <ChefHat className="w-6 h-6 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <h2 className="font-bold text-stone-900 text-lg">{request.title}</h2>
            <p className="text-stone-600 text-sm mt-1">{request.description}</p>
            <div className="flex flex-wrap gap-3 mt-3 text-xs text-stone-500">
              <span>Budget: ₦{request.budget_min.toLocaleString()} – ₦{request.budget_max.toLocaleString()}</span>
              <span>·</span>
              <span>{request.servings} servings</span>
              <span>·</span>
              <span className="capitalize">{request.event_type.replace('_', ' ')}</span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 space-y-4">
          <h3 className="font-semibold text-stone-900">Recipe & Preparation</h3>
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">Proposed Recipe *</label>
            <textarea
              placeholder="Describe your recipe approach, cooking method, and key techniques..."
              value={form.proposed_recipe}
              onChange={e => setForm({ ...form, proposed_recipe: e.target.value })}
              rows={3}
              required
              className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">Preparation Notes</label>
            <textarea
              placeholder="Any special preparation requirements, equipment needed, timing..."
              value={form.preparation_notes}
              onChange={e => setForm({ ...form, preparation_notes: e.target.value })}
              rows={2}
              className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">Message to Customer</label>
            <textarea
              placeholder="Introduce yourself and explain why you're the best chef for this request..."
              value={form.message}
              onChange={e => setForm({ ...form, message: e.target.value })}
              rows={2}
              className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 space-y-4">
          <h3 className="font-semibold text-stone-900">Pricing Breakdown</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Labour Cost (₦)</label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={form.labour_cost}
                onChange={e => setForm({ ...form, labour_cost: e.target.value })}
                required
                className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Ingredient Cost (₦)</label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={form.ingredient_cost}
                onChange={e => setForm({ ...form, ingredient_cost: e.target.value })}
                required
                className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Delivery Cost (₦)</label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={form.delivery_cost}
                onChange={e => setForm({ ...form, delivery_cost: e.target.value })}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              Estimated Hours to Complete
            </label>
            <input
              type="number"
              min="1"
              value={form.estimated_hours}
              onChange={e => setForm({ ...form, estimated_hours: e.target.value })}
              className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>

          {/* Total */}
          <div className={`flex items-center justify-between p-4 rounded-xl border-2 ${
            totalCost === 0 ? 'border-stone-200 bg-stone-50' :
            withinBudget ? 'border-green-300 bg-green-50' : 'border-amber-300 bg-amber-50'
          }`}>
            <div>
              <p className="text-sm font-semibold text-stone-700">Total Bid Amount</p>
              {!withinBudget && totalCost > 0 && (
                <p className="text-xs text-amber-600 mt-0.5">
                  {totalCost > request.budget_max
                    ? `₦${(totalCost - request.budget_max).toLocaleString()} above budget`
                    : `₦${(request.budget_min - totalCost).toLocaleString()} below minimum`}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="w-5 h-5 text-stone-600" />
              <span className="text-2xl font-bold text-stone-900">₦{totalCost.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || totalCost === 0}
          className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-orange-600 transition-colors disabled:opacity-50 shadow-lg shadow-orange-200"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <><Send className="w-4 h-4" /> Submit Bid</>
          )}
        </button>
      </form>
    </div>
  );
}
