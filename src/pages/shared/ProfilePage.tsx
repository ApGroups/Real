import { useState } from 'react';
import { Save, User, Mail, Phone, MapPin, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    location: profile?.location || '',
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwError, setPwError] = useState('');

  async function handleSave() {
    setSaving(true);
    await supabase.from('profiles').update(form).eq('id', profile!.id);
    await refreshProfile();
    setSuccess('Profile updated!');
    setSaving(false);
    setTimeout(() => setSuccess(''), 3000);
  }

  async function handlePasswordChange() {
    setChangingPassword(true);
    setPwError('');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setPwError(error.message);
    else { setPwSuccess('Password updated!'); setCurrentPassword(''); setNewPassword(''); }
    setChangingPassword(false);
    setTimeout(() => setPwSuccess(''), 3000);
  }

  const roleColors = {
    customer: 'bg-teal-100 text-teal-700',
    chef: 'bg-orange-100 text-orange-700',
    admin: 'bg-blue-100 text-blue-700',
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">My Profile</h1>
        <p className="text-stone-500 text-sm mt-1">Manage your account settings.</p>
      </div>

      {/* Avatar & Role */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 mb-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center text-white text-2xl font-bold shrink-0">
          {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <div>
          <h2 className="text-xl font-bold text-stone-900">{profile?.full_name}</h2>
          <p className="text-stone-500 text-sm">{profile?.email}</p>
          <span className={`mt-2 inline-block px-3 py-1 rounded-full text-xs font-bold capitalize ${roleColors[profile?.role || 'customer']}`}>
            {profile?.role}
          </span>
        </div>
      </div>

      {success && <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">{success}</div>}

      {/* Personal Info */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 mb-5 space-y-4">
        <h3 className="font-semibold text-stone-900 flex items-center gap-2">
          <User className="w-4 h-4 text-orange-500" /> Personal Information
        </h3>
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">Full Name</label>
          <input
            type="text"
            value={form.full_name}
            onChange={e => setForm({ ...form, full_name: e.target.value })}
            className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">
            <Mail className="w-3.5 h-3.5 inline mr-1" />Email
          </label>
          <input
            type="email"
            value={profile?.email || ''}
            disabled
            className="w-full px-4 py-3 border border-stone-100 rounded-xl text-sm bg-stone-50 text-stone-400 cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">
            <Phone className="w-3.5 h-3.5 inline mr-1" />Phone
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
            className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">
            <MapPin className="w-3.5 h-3.5 inline mr-1" />Location
          </label>
          <input
            type="text"
            placeholder="City, State"
            value={form.location}
            onChange={e => setForm({ ...form, location: e.target.value })}
            className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white py-3 rounded-xl font-semibold text-sm hover:bg-orange-600 disabled:opacity-50"
        >
          {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save className="w-4 h-4" />Save Changes</>}
        </button>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 space-y-4">
        <h3 className="font-semibold text-stone-900 flex items-center gap-2">
          <Shield className="w-4 h-4 text-orange-500" /> Change Password
        </h3>
        {pwSuccess && <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">{pwSuccess}</div>}
        {pwError && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{pwError}</div>}
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">New Password</label>
          <input
            type="password"
            placeholder="Min 6 characters"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>
        <button
          onClick={handlePasswordChange}
          disabled={changingPassword || newPassword.length < 6}
          className="w-full py-3 border border-orange-300 text-orange-600 rounded-xl font-semibold text-sm hover:bg-orange-50 disabled:opacity-40"
        >
          Update Password
        </button>
      </div>
    </div>
  );
}
