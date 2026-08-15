import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Star, Clock, MapPin, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ChefRow {
  id: string;
  user_id: string;
  bio: string;
  years_experience: number;
  specialties: string[];
  service_areas: string[];
  is_approved: boolean;
  total_orders: number;
  avg_rating: number;
  created_at: string;
  profiles: { full_name: string; email: string; location: string };
}

export default function ChefApprovals() {
  const [chefs, setChefs] = useState<ChefRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('pending');
  const [processing, setProcessing] = useState<string | null>(null);

  async function load() {
    const q = supabase
      .from('chef_profiles')
      .select('*, profiles!inner(full_name, email, location)')
      .order('created_at', { ascending: false });
    const { data } = await q;
    if (data) setChefs(data as unknown as ChefRow[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function updateApproval(userId: string, approved: boolean) {
    setProcessing(userId);
    await supabase.from('chef_profiles').update({ is_approved: approved }).eq('user_id', userId);
    await supabase.from('admin_actions').insert({
      admin_id: (await supabase.auth.getUser()).data.user!.id,
      action_type: approved ? 'approve_chef' : 'reject_chef',
      target_type: 'chef',
      target_id: userId,
      notes: approved ? 'Chef approved' : 'Chef rejected',
    });
    await load();
    setProcessing(null);
  }

  const filtered = chefs.filter(c => {
    const matchSearch = c.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.profiles?.email?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || (filter === 'pending' && !c.is_approved) || (filter === 'approved' && c.is_approved);
    return matchSearch && matchFilter;
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Chef Approvals</h1>
        <p className="text-stone-500 text-sm mt-1">Review and approve chef registrations.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search chefs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'pending', 'approved'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium capitalize transition-all ${
                filter === f ? 'bg-orange-500 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:border-orange-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array(3).fill(0).map((_, i) => <div key={i} className="bg-white rounded-2xl p-5 border border-stone-100 h-32 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-100 p-12 text-center">
          <Clock className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500">No chefs found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(chef => (
            <div key={chef.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center text-white text-lg font-bold shrink-0">
                    {chef.profiles?.full_name?.charAt(0) || 'C'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-stone-900">{chef.profiles?.full_name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${chef.is_approved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {chef.is_approved ? 'Approved' : 'Pending'}
                      </span>
                    </div>
                    <p className="text-sm text-stone-500">{chef.profiles?.email}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-stone-400">
                      {chef.profiles?.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{chef.profiles.location}</span>}
                      <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400" />{chef.avg_rating?.toFixed(1)}</span>
                      <span>{chef.years_experience} yrs exp</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!chef.is_approved ? (
                    <>
                      <button
                        onClick={() => updateApproval(chef.user_id, true)}
                        disabled={processing === chef.user_id}
                        className="flex items-center gap-1.5 px-4 py-2 bg-green-500 text-white text-sm font-semibold rounded-xl hover:bg-green-600 disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => updateApproval(chef.user_id, false)}
                        disabled={processing === chef.user_id}
                        className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-100 disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => updateApproval(chef.user_id, false)}
                      disabled={processing === chef.user_id}
                      className="flex items-center gap-1.5 px-4 py-2 bg-stone-100 text-stone-600 text-sm font-semibold rounded-xl hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Revoke
                    </button>
                  )}
                </div>
              </div>

              {chef.bio && <p className="text-sm text-stone-600 mt-3 border-t border-stone-100 pt-3">{chef.bio}</p>}

              {chef.specialties?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {chef.specialties.map(s => (
                    <span key={s} className="px-2.5 py-1 bg-orange-50 text-orange-600 text-xs rounded-full">{s}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
