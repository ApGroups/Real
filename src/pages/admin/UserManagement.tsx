import { useEffect, useState } from 'react';
import { Search, UserX, UserCheck, Shield, ChefHat, User } from 'lucide-react';
import { supabase, Profile } from '../../lib/supabase';

export default function UserManagement() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [processing, setProcessing] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setUsers(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleActive(userId: string, currentState: boolean) {
    setProcessing(userId);
    await supabase.from('profiles').update({ is_active: !currentState }).eq('id', userId);
    await load();
    setProcessing(null);
  }

  const filtered = users.filter(u => {
    const matchSearch = u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const roleIcon = (role: string) => {
    if (role === 'admin') return <Shield className="w-4 h-4 text-blue-500" />;
    if (role === 'chef') return <ChefHat className="w-4 h-4 text-orange-500" />;
    return <User className="w-4 h-4 text-teal-500" />;
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">User Management</h1>
        <p className="text-stone-500 text-sm mt-1">{users.length} total users</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="border border-stone-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
        >
          <option value="all">All Roles</option>
          <option value="customer">Customers</option>
          <option value="chef">Chefs</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-stone-100">
            <tr>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-stone-500 uppercase tracking-wider">User</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-stone-500 uppercase tracking-wider hidden sm:table-cell">Role</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-stone-500 uppercase tracking-wider hidden md:table-cell">Joined</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-stone-500 uppercase tracking-wider">Status</th>
              <th className="text-right px-5 py-3.5 text-xs font-semibold text-stone-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <tr key={i}>
                  <td colSpan={5} className="px-5 py-4">
                    <div className="h-8 bg-stone-100 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : filtered.map(user => (
              <tr key={user.id} className="hover:bg-stone-50 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {user.full_name?.charAt(0) || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-stone-900 truncate">{user.full_name || 'No name'}</p>
                      <p className="text-xs text-stone-400 truncate">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 hidden sm:table-cell">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-stone-600 capitalize">
                    {roleIcon(user.role)} {user.role}
                  </span>
                </td>
                <td className="px-5 py-4 text-xs text-stone-400 hidden md:table-cell">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-5 py-4">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {user.is_active ? 'Active' : 'Suspended'}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  <button
                    onClick={() => toggleActive(user.id, user.is_active)}
                    disabled={processing === user.id || user.role === 'admin'}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      user.is_active
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                    }`}
                  >
                    {user.is_active ? <><UserX className="w-3.5 h-3.5" />Suspend</> : <><UserCheck className="w-3.5 h-3.5" />Activate</>}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && filtered.length === 0 && (
          <div className="p-8 text-center text-stone-400">
            <p className="text-sm">No users found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
