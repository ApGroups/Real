import { useEffect, useState } from 'react';
import { Save, Star, Briefcase, MapPin, Award, Plus, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface Props { onNavigate?: (page: string) => void; }

const SPECIALTIES_OPTIONS = [
  'Nigerian Cuisine', 'Continental', 'Seafood', 'Pastry & Baking', 'BBQ & Grills',
  'Italian', 'Chinese', 'Indian', 'Vegetarian/Vegan', 'Desserts', 'Wedding Cakes', 'Catering',
];

export default function ChefProfile({ onNavigate: _ }: Props) {
  const { profile, refreshProfile } = useAuth();
  const [chefProfile, setChefProfile] = useState({
    bio: '',
    years_experience: 0,
    specialties: [] as string[],
    service_areas: [] as string[],
    hourly_rate: 0,
    bank_name: '',
    bank_account: '',
    is_available: true,
  });
  const [stats, setStats] = useState({ total_orders: 0, avg_rating: 0, is_approved: false });
  const [profileForm, setProfileForm] = useState({ full_name: '', phone: '', location: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [newArea, setNewArea] = useState('');

  useEffect(() => {
    async function load() {
      if (!profile) return;
      setProfileForm({ full_name: profile.full_name, phone: profile.phone || '', location: profile.location || '' });
      const { data } = await supabase.from('chef_profiles').select('*').eq('user_id', profile.id).maybeSingle();
      if (data) {
        setChefProfile({
          bio: data.bio || '',
          years_experience: data.years_experience || 0,
          specialties: data.specialties || [],
          service_areas: data.service_areas || [],
          hourly_rate: data.hourly_rate || 0,
          bank_name: data.bank_name || '',
          bank_account: data.bank_account || '',
          is_available: data.is_available ?? true,
        });
        setStats({ total_orders: data.total_orders, avg_rating: data.avg_rating, is_approved: data.is_approved });
      }
      setLoading(false);
    }
    load();
  }, [profile]);

  async function handleSave() {
    setSaving(true);
    setSuccess('');
    try {
      await supabase.from('profiles').update({
        full_name: profileForm.full_name,
        phone: profileForm.phone,
        location: profileForm.location,
      }).eq('id', profile!.id);

      await supabase.from('chef_profiles').update(chefProfile).eq('user_id', profile!.id);
      await refreshProfile();
      setSuccess('Profile saved successfully!');
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
    setTimeout(() => setSuccess(''), 3000);
  }

  function toggleSpecialty(s: string) {
    setChefProfile(prev => ({
      ...prev,
      specialties: prev.specialties.includes(s)
        ? prev.specialties.filter(x => x !== s)
        : [...prev.specialties, s],
    }));
  }

  function addArea() {
    if (newArea.trim() && !chefProfile.service_areas.includes(newArea.trim())) {
      setChefProfile(prev => ({ ...prev, service_areas: [...prev.service_areas, newArea.trim()] }));
      setNewArea('');
    }
  }

  if (loading) return <div className="p-6 animate-pulse"><div className="h-8 bg-stone-100 rounded w-48 mb-4" /></div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Chef Profile</h1>
        <p className="text-stone-500 text-sm mt-1">Keep your profile updated to attract more customers.</p>
      </div>

      {/* Status Banner */}
      {!stats.is_approved && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-sm flex items-center gap-3">
          <Award className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-semibold">Pending Approval</p>
            <p className="text-amber-600 text-xs mt-0.5">Complete your profile to get faster approval from our team.</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">{success}</div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 border border-stone-100 text-center">
          <Briefcase className="w-5 h-5 text-orange-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-stone-900">{stats.total_orders}</p>
          <p className="text-xs text-stone-500">Orders</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-stone-100 text-center">
          <Star className="w-5 h-5 text-amber-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-stone-900">{stats.avg_rating.toFixed(1)}</p>
          <p className="text-xs text-stone-500">Avg Rating</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-stone-100 text-center">
          <Award className="w-5 h-5 text-green-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-stone-900">{stats.is_approved ? 'Yes' : 'No'}</p>
          <p className="text-xs text-stone-500">Approved</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Personal Info */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 space-y-4">
          <h3 className="font-semibold text-stone-900">Personal Information</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Full Name</label>
              <input
                type="text"
                value={profileForm.full_name}
                onChange={e => setProfileForm({ ...profileForm, full_name: e.target.value })}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Phone</label>
              <input
                type="tel"
                value={profileForm.phone}
                onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              Base Location
            </label>
            <input
              type="text"
              placeholder="e.g., Lagos, Nigeria"
              value={profileForm.location}
              onChange={e => setProfileForm({ ...profileForm, location: e.target.value })}
              className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
        </div>

        {/* Chef Info */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 space-y-4">
          <h3 className="font-semibold text-stone-900">Chef Information</h3>
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">Bio</label>
            <textarea
              placeholder="Tell customers about yourself, your cooking style, and experience..."
              value={chefProfile.bio}
              onChange={e => setChefProfile({ ...chefProfile, bio: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Years of Experience</label>
              <input
                type="number"
                min="0"
                value={chefProfile.years_experience}
                onChange={e => setChefProfile({ ...chefProfile, years_experience: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Hourly Rate (₦)</label>
              <input
                type="number"
                min="0"
                value={chefProfile.hourly_rate}
                onChange={e => setChefProfile({ ...chefProfile, hourly_rate: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
          </div>

          {/* Availability */}
          <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
            <input
              type="checkbox"
              id="available"
              checked={chefProfile.is_available}
              onChange={e => setChefProfile({ ...chefProfile, is_available: e.target.checked })}
              className="w-4 h-4 accent-orange-500"
            />
            <label htmlFor="available" className="text-sm font-medium text-stone-700 cursor-pointer">
              Currently Available for Orders
            </label>
          </div>
        </div>

        {/* Specialties */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
          <h3 className="font-semibold text-stone-900 mb-3">Specialties</h3>
          <div className="flex flex-wrap gap-2">
            {SPECIALTIES_OPTIONS.map(s => (
              <button
                key={s}
                onClick={() => toggleSpecialty(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  chefProfile.specialties.includes(s)
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:border-orange-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Service Areas */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
          <h3 className="font-semibold text-stone-900 mb-3">Service Areas</h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {chefProfile.service_areas.map(area => (
              <span key={area} className="flex items-center gap-1 px-3 py-1.5 bg-teal-100 text-teal-700 text-xs rounded-full font-medium">
                {area}
                <button onClick={() => setChefProfile(prev => ({ ...prev, service_areas: prev.service_areas.filter(a => a !== area) }))}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add area (e.g., Lekki)"
              value={newArea}
              onChange={e => setNewArea(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addArea())}
              className="flex-1 px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
            <button onClick={addArea} className="w-10 h-10 bg-orange-500 text-white rounded-xl flex items-center justify-center hover:bg-orange-600">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Banking */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 space-y-4">
          <h3 className="font-semibold text-stone-900">Payment Details</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Bank Name</label>
              <input
                type="text"
                placeholder="e.g., GTBank"
                value={chefProfile.bank_name}
                onChange={e => setChefProfile({ ...chefProfile, bank_name: e.target.value })}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Account Number</label>
              <input
                type="text"
                placeholder="10-digit account number"
                value={chefProfile.bank_account}
                onChange={e => setChefProfile({ ...chefProfile, bank_account: e.target.value })}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-orange-600 transition-colors disabled:opacity-50 shadow-lg shadow-orange-200"
        >
          {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save className="w-4 h-4" /> Save Profile</>}
        </button>
      </div>
    </div>
  );
}
