import { useState, useEffect } from 'react';
import { ArrowLeft, Check, ChefHat, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface Props { onNavigate: (page: string) => void; }

interface IngredientCategory {
  id: string;
  name: string;
  slug: string;
  options: string[];
  is_allergy_category: boolean;
  sort_order: number;
}

const EVENT_TYPES = [
  { value: 'family_meal', label: 'Family Meal' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'corporate_event', label: 'Corporate Event' },
  { value: 'dinner_party', label: 'Dinner Party' },
  { value: 'meal_prep', label: 'Meal Prep' },
  { value: 'other', label: 'Other' },
];

const DELIVERY_TYPES = [
  { value: 'delivery', label: 'Delivery' },
  { value: 'pickup', label: 'Pickup' },
  { value: 'chef_comes_to_home', label: 'Chef Comes to Home' },
];

export default function NewRequest({ onNavigate }: Props) {
  const { profile } = useAuth();
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState<IngredientCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    event_type: 'family_meal',
    budget_min: '',
    budget_max: '',
    servings: '4',
    location: '',
    delivery_type: 'delivery',
    consultation_needed: false,
    additional_notes: '',
  });

  const [selectedIngredients, setSelectedIngredients] = useState<Record<string, string[]>>({});
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);

  useEffect(() => {
    supabase.from('ingredient_categories').select('*').order('sort_order').then(({ data }) => {
      if (data) setCategories(data);
    });
  }, []);

  function toggleIngredient(slug: string, ingredient: string) {
    setSelectedIngredients(prev => {
      const current = prev[slug] || [];
      return {
        ...prev,
        [slug]: current.includes(ingredient)
          ? current.filter(i => i !== ingredient)
          : [...current, ingredient],
      };
    });
  }

  function toggleAllergy(allergy: string) {
    setSelectedAllergies(prev =>
      prev.includes(allergy) ? prev.filter(a => a !== allergy) : [...prev, allergy]
    );
  }

  async function handleSubmit() {
    setError('');
    setLoading(true);
    try {
      const { data: req, error: reqErr } = await supabase.from('food_requests').insert({
        customer_id: profile!.id,
        title: form.title,
        description: form.description,
        event_type: form.event_type,
        budget_min: parseFloat(form.budget_min) || 0,
        budget_max: parseFloat(form.budget_max) || 0,
        servings: parseInt(form.servings) || 1,
        location: form.location,
        delivery_type: form.delivery_type,
        consultation_needed: form.consultation_needed,
      }).select().single();

      if (reqErr) throw reqErr;

      const ingredientRows: { request_id: string; category: string; ingredient: string; is_allergy: boolean }[] = [];

      Object.entries(selectedIngredients).forEach(([cat, items]) => {
        items.forEach(ingredient => {
          ingredientRows.push({ request_id: req.id, category: cat, ingredient, is_allergy: false });
        });
      });

      selectedAllergies.forEach(allergy => {
        ingredientRows.push({ request_id: req.id, category: 'allergies', ingredient: allergy, is_allergy: true });
      });

      if (ingredientRows.length > 0) {
        await supabase.from('request_ingredients').insert(ingredientRows);
      }

      onNavigate('my-requests');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
    setLoading(false);
  }

  const mainCategories = categories.filter(c => !c.is_allergy_category);
  const allergyCategories = categories.filter(c => c.is_allergy_category);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <button onClick={() => onNavigate('dashboard')} className="flex items-center gap-2 text-[#5E5A53] hover:text-[#0B0B0B] text-sm mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <p className="text-xs uppercase tracking-[0.32em] text-[#8C6614] mb-3">Private dining request</p>
        <h1 className="text-4xl font-semibold text-[#0B0B0B] leading-tight">Create your luxury meal brief</h1>
        <p className="text-[#5E5A53] text-base mt-3">Describe your bespoke menu, choose refined ingredients, and invite top chefs to craft your elevated dining experience.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-10">
        {[
          { step: 1, label: 'Occasion Details' },
          { step: 2, label: 'Ingredients & Preferences' },
          { step: 3, label: 'Review & Submit' },
        ].map(item => {
          const active = step === item.step;
          const complete = step > item.step;
          return (
            <div key={item.step} className={`rounded-3xl p-5 border ${active ? 'border-[#D4AF37] bg-[#FFF8E5]' : 'border-[#E7E2D8] bg-white'} shadow-[0_20px_40px_rgba(11,11,11,0.04)]`}>
              <div className={`w-10 h-10 mb-4 rounded-full flex items-center justify-center text-sm font-bold ${complete ? 'bg-[#0F5132] text-white' : active ? 'bg-[#D4AF37] text-[#0B0B0B]' : 'bg-[#F3EFE8] text-[#5E5A53]'}`}>
                {complete ? <Check className="w-4 h-4" /> : item.step}
              </div>
              <p className={`text-sm font-semibold ${active ? 'text-[#0B0B0B]' : 'text-[#5E5A53]'}`}>{item.label}</p>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-[#F4E7E7] border border-[#E6C8C8] rounded-3xl text-[#8A2F2F] text-sm">{error}</div>
      )}

      {step === 1 && (
        <div className="premium-card p-8 space-y-7">
          <div className="grid gap-6">
            <div>
              <label className="block text-sm font-semibold text-[#0B0B0B] mb-3">Request Title *</label>
              <input
                type="text"
                placeholder="Seafood pasta for 8 guests"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-[1.5rem] border border-[#E7E2D8] bg-[#FEFBF7] px-5 py-4 text-sm text-[#0B0B0B] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#0B0B0B] mb-3">Description *</label>
              <textarea
                placeholder="Describe the mood, flavours, and occasion."
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows={4}
                className="w-full rounded-[1.5rem] border border-[#E7E2D8] bg-[#FEFBF7] px-5 py-4 text-sm text-[#0B0B0B] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none resize-none"
              />
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-[#0B0B0B]">Occasion</p>
              <div className="grid grid-cols-2 gap-3">
                {EVENT_TYPES.map(type => (
                  <button
                    type="button"
                    key={type.value}
                    onClick={() => setForm({ ...form, event_type: type.value })}
                    className={`rounded-3xl border p-4 text-left text-sm font-semibold transition ${form.event_type === type.value ? 'border-[#D4AF37] bg-[#FFF8E5] text-[#0B0B0B]' : 'border-[#E7E2D8] bg-white text-[#5E5A53] hover:border-[#D4AF37]'}`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-[#0B0B0B]">Guest Count</p>
              <input
                type="number"
                min="1"
                value={form.servings}
                onChange={e => setForm({ ...form, servings: e.target.value })}
                className="w-full rounded-[1.5rem] border border-[#E7E2D8] bg-[#FEFBF7] px-5 py-4 text-sm text-[#0B0B0B] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none"
              />
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-[#0B0B0B]">Budget Range</p>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="Min"
                  value={form.budget_min}
                  onChange={e => setForm({ ...form, budget_min: e.target.value })}
                  className="w-full rounded-[1.5rem] border border-[#E7E2D8] bg-[#FEFBF7] px-5 py-4 text-sm text-[#0B0B0B] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={form.budget_max}
                  onChange={e => setForm({ ...form, budget_max: e.target.value })}
                  className="w-full rounded-[1.5rem] border border-[#E7E2D8] bg-[#FEFBF7] px-5 py-4 text-sm text-[#0B0B0B] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none"
                />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-[#0B0B0B]">Delivery Style</p>
              <div className="grid grid-cols-1 gap-3">
                {DELIVERY_TYPES.map(type => (
                  <button
                    type="button"
                    key={type.value}
                    onClick={() => setForm({ ...form, delivery_type: type.value })}
                    className={`rounded-3xl border p-4 text-left text-sm font-semibold transition ${form.delivery_type === type.value ? 'border-[#D4AF37] bg-[#FFF8E5] text-[#0B0B0B]' : 'border-[#E7E2D8] bg-white text-[#5E5A53] hover:border-[#D4AF37]'}`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-3xl border border-[#E7E2D8] bg-[#FFF8E5] p-4">
            <input
              type="checkbox"
              id="consultation"
              checked={form.consultation_needed}
              onChange={e => setForm({ ...form, consultation_needed: e.target.checked })}
              className="w-4 h-4 accent-[#D4AF37]"
            />
            <div>
              <p className="text-sm font-semibold text-[#0B0B0B]">Request Chef Consultation</p>
              <p className="text-xs text-[#5E5A53] mt-1">A chef will review your brief and suggest enhancements before cooking.</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => { if (!form.title) { setError('Please add a title'); return; } setError(''); setStep(2); }}
              className="flex-1 rounded-3xl bg-[#D4AF37] px-6 py-4 text-sm font-semibold text-[#0B0B0B] transition-transform hover:-translate-y-0.5"
            >
              Continue to Ingredients
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          {mainCategories.map(cat => (
            <div key={cat.id} className="premium-card p-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <p className="text-sm font-semibold text-[#0B0B0B]">{cat.name}</p>
                  <p className="text-xs text-[#5E5A53] mt-1">Select the premium ingredients you want featured.</p>
                </div>
                <span className="premium-badge">Ingredient</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {cat.options.map(opt => {
                  const selected = (selectedIngredients[cat.slug] || []).includes(opt);
                  return (
                    <button
                      key={opt}
                      onClick={() => toggleIngredient(cat.slug, opt)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${selected ? 'bg-[#D4AF37] text-[#0B0B0B] shadow-[0_10px_25px_rgba(212,175,55,0.18)]' : 'bg-[#F3EFE8] text-[#5E5A53] hover:bg-[#FFF1D1]'}`}
                    >
                      {selected ? <Check className="w-3 h-3 inline mr-2" /> : null}
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {allergyCategories.map(cat => (
            <div key={cat.id} className="premium-card border-[#F4D2BC] bg-[#FFF4ED] p-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <p className="text-sm font-semibold text-[#8A2F2F]">Allergies & Dietary Restrictions</p>
                  <p className="text-xs text-[#8A2F2F] mt-1">Avoid these ingredients for a safer, refined meal.</p>
                </div>
                <span className="premium-badge">Care</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {cat.options.map(opt => {
                  const selected = selectedAllergies.includes(opt);
                  return (
                    <button
                      key={opt}
                      onClick={() => toggleAllergy(opt)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${selected ? 'bg-[#8A2F2F] text-white' : 'bg-white text-[#8A2F2F] border border-[#F4D2BC] hover:bg-[#FFE7D1]'}`}
                    >
                      {selected ? <X className="w-3 h-3 inline mr-2" /> : null}
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="premium-card p-6">
            <label className="block text-sm font-semibold text-[#0B0B0B] mb-3">Additional Notes</label>
            <textarea
              placeholder="Any other preferences, cooking methods, or special requirements..."
              value={form.additional_notes}
              onChange={e => setForm({ ...form, additional_notes: e.target.value })}
              rows={4}
              className="w-full rounded-[1.5rem] border border-[#E7E2D8] bg-[#FEFBF7] px-5 py-4 text-sm text-[#0B0B0B] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none resize-none"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => setStep(1)}
              className="rounded-3xl border border-[#E7E2D8] bg-white px-6 py-4 text-sm font-semibold text-[#5E5A53] hover:bg-[#FAF3DB]"
            >
              <ArrowLeft className="w-4 h-4 inline mr-2" /> Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="rounded-3xl bg-[#D4AF37] px-6 py-4 text-sm font-semibold text-[#0B0B0B] hover:bg-[#B38C26]"
            >
              Review Request
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="premium-card p-8 space-y-7">
          <div className="rounded-[2rem] border border-[#D4AF37] bg-[#FFF8E5] p-6">
            <div className="flex items-center gap-4">
              <ChefHat className="w-6 h-6 text-[#D4AF37]" />
              <div>
                <p className="text-sm font-semibold text-[#0B0B0B]">Final review</p>
                <p className="text-xs text-[#5E5A53] mt-1">Confirm your meal brief before it goes to elite chefs.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-[#0B0B0B]">{form.title}</h3>
              <p className="text-sm text-[#5E5A53]">{form.description}</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-4">
              <div className="rounded-3xl bg-[#FEFBF7] p-4 border border-[#E7E2D8]">
                <p className="text-xs uppercase tracking-[0.3em] text-[#8C6614] mb-2">Occasion</p>
                <p className="text-sm font-semibold text-[#0B0B0B] capitalize">{form.event_type.replace('_', ' ')}</p>
              </div>
              <div className="rounded-3xl bg-[#FEFBF7] p-4 border border-[#E7E2D8]">
                <p className="text-xs uppercase tracking-[0.3em] text-[#8C6614] mb-2">Guests</p>
                <p className="text-sm font-semibold text-[#0B0B0B]">{form.servings} people</p>
              </div>
              <div className="rounded-3xl bg-[#FEFBF7] p-4 border border-[#E7E2D8]">
                <p className="text-xs uppercase tracking-[0.3em] text-[#8C6614] mb-2">Budget</p>
                <p className="text-sm font-semibold text-[#0B0B0B]">₦{form.budget_min} – ₦{form.budget_max}</p>
              </div>
              <div className="rounded-3xl bg-[#FEFBF7] p-4 border border-[#E7E2D8]">
                <p className="text-xs uppercase tracking-[0.3em] text-[#8C6614] mb-2">Delivery</p>
                <p className="text-sm font-semibold text-[#0B0B0B] capitalize">{form.delivery_type.replace(/_/g, ' ')}</p>
              </div>
            </div>
          </div>

          {Object.entries(selectedIngredients).filter(([, items]) => items.length > 0).map(([cat, items]) => (
            <div key={cat}>
              <p className="text-xs font-semibold text-[#5E5A53] uppercase tracking-[0.24em] mb-3 capitalize">{cat}</p>
              <div className="flex flex-wrap gap-3">
                {items.map(item => (
                  <span key={item} className="rounded-full bg-[#FFF1D1] px-4 py-2 text-sm font-semibold text-[#8C6614]">{item}</span>
                ))}
              </div>
            </div>
          ))}

          {selectedAllergies.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#8A2F2F] uppercase tracking-[0.24em] mb-3">Allergies</p>
              <div className="flex flex-wrap gap-3">
                {selectedAllergies.map(a => (
                  <span key={a} className="rounded-full bg-[#F4E7E7] px-4 py-2 text-sm font-semibold text-[#8A2F2F]">{a}</span>
                ))}
              </div>
            </div>
          )}

          {form.consultation_needed && (
            <div className="rounded-3xl border border-[#E7E2D8] bg-[#FFF8E5] p-4 text-sm text-[#5E5A53]">
              <span className="font-semibold text-[#0B0B0B]">Chef consultation requested.</span> Your brief will be reviewed by a chef for menu refinement.
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => setStep(2)}
              className="rounded-3xl border border-[#E7E2D8] bg-white px-6 py-4 text-sm font-semibold text-[#5E5A53] hover:bg-[#FAF3DB]"
            >
              <ArrowLeft className="w-4 h-4 inline mr-2" /> Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="rounded-3xl bg-[#D4AF37] px-6 py-4 text-sm font-semibold text-[#0B0B0B] hover:bg-[#B38C26] disabled:opacity-70"
            >
              {loading ? <div className="inline-block w-5 h-5 border-2 border-[#0B0B0B] border-t-transparent rounded-full animate-spin" /> : 'Submit Request'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
