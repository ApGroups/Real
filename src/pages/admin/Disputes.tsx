import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import StatusBadge from '../../components/StatusBadge';

interface Dispute {
  id: string;
  order_id: string;
  reason: string;
  description: string;
  status: string;
  resolution: string;
  created_at: string;
  raised_by_profile: { full_name: string };
  against_profile: { full_name: string };
}

export default function Disputes() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [resolving, setResolving] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState('');
  const [activeDispute, setActiveDispute] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase
      .from('disputes')
      .select(`*, raised_by_profile:profiles!disputes_raised_by_fkey(full_name), against_profile:profiles!disputes_against_fkey(full_name)`)
      .order('created_at', { ascending: false });
    if (data) setDisputes(data as unknown as Dispute[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function resolveDispute(id: string) {
    setResolving(id);
    const adminId = (await supabase.auth.getUser()).data.user!.id;
    await supabase.from('disputes').update({
      status: 'resolved',
      resolution: resolutionText,
      resolved_by: adminId,
      resolved_at: new Date().toISOString(),
    }).eq('id', id);
    await load();
    setActiveDispute(null);
    setResolutionText('');
    setResolving(null);
  }

  const filtered = disputes.filter(d =>
    d.reason.toLowerCase().includes(search.toLowerCase()) ||
    d.raised_by_profile?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Disputes</h1>
        <p className="text-stone-500 text-sm mt-1">Manage and resolve order disputes.</p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input
          type="text"
          placeholder="Search disputes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array(3).fill(0).map((_, i) => <div key={i} className="bg-white rounded-2xl p-5 border border-stone-100 h-28 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-100 p-12 text-center">
          <AlertTriangle className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500 text-sm">No disputes found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(dispute => (
            <div key={dispute.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <p className="font-semibold text-stone-900">{dispute.reason}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-stone-500">
                    <span>By: <strong>{dispute.raised_by_profile?.full_name}</strong></span>
                    <span>Against: <strong>{dispute.against_profile?.full_name}</strong></span>
                    <span>{new Date(dispute.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <StatusBadge status={dispute.status} />
              </div>

              {dispute.description && (
                <p className="text-sm text-stone-600 mb-3 border-l-4 border-red-200 pl-3">{dispute.description}</p>
              )}

              {dispute.resolution && (
                <div className="mt-3 p-3 bg-green-50 rounded-xl border border-green-100">
                  <p className="text-xs font-semibold text-green-700 mb-1">Resolution</p>
                  <p className="text-sm text-green-800">{dispute.resolution}</p>
                </div>
              )}

              {dispute.status === 'open' && (
                <>
                  {activeDispute === dispute.id ? (
                    <div className="mt-3 space-y-2">
                      <textarea
                        placeholder="Write your resolution..."
                        value={resolutionText}
                        onChange={e => setResolutionText(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => resolveDispute(dispute.id)}
                          disabled={!resolutionText.trim() || resolving === dispute.id}
                          className="flex items-center gap-1.5 px-4 py-2 bg-green-500 text-white text-sm font-semibold rounded-xl hover:bg-green-600 disabled:opacity-50"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Resolve
                        </button>
                        <button
                          onClick={() => setActiveDispute(null)}
                          className="px-4 py-2 bg-stone-100 text-stone-600 text-sm font-semibold rounded-xl hover:bg-stone-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setActiveDispute(dispute.id)}
                      className="mt-3 px-4 py-2 border border-orange-300 text-orange-600 text-sm font-semibold rounded-xl hover:bg-orange-50"
                    >
                      Resolve Dispute
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
