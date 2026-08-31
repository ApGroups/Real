import { useEffect, useState } from 'react';
import { AlertCircle, BellOff, CheckCheck, Clock, DollarSign, Info, MessageCircle, Send, ShoppingBag, Star, Users } from 'lucide-react';
import { supabase, Notification, Profile, UserRole } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface Props { onNavigate?: (page: string, data?: unknown) => void; }

type Audience = 'all' | UserRole | 'specific';

const audienceLabel: Record<Audience, string> = {
  all: 'All active users',
  customer: 'Customers',
  chef: 'Chefs',
  admin: 'Admins',
  specific: 'Specific user',
};

const typeIcon = (type: string) => {
  switch (type) {
    case 'bid': return <ShoppingBag className="w-4 h-4 text-orange-500" />;
    case 'order': return <DollarSign className="w-4 h-4 text-green-500" />;
    case 'message': return <MessageCircle className="w-4 h-4 text-blue-500" />;
    case 'review': return <Star className="w-4 h-4 text-amber-500" />;
    case 'payment': return <DollarSign className="w-4 h-4 text-teal-500" />;
    default: return <Info className="w-4 h-4 text-stone-400" />;
  }
};

const typeColor = (type: string) => {
  switch (type) {
    case 'bid': return 'bg-orange-50';
    case 'order': return 'bg-green-50';
    case 'message': return 'bg-blue-50';
    case 'review': return 'bg-amber-50';
    case 'payment': return 'bg-teal-50';
    default: return 'bg-stone-50';
  }
};

export default function NotificationsPage({ onNavigate }: Props) {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [recipients, setRecipients] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sentMessage, setSentMessage] = useState('');
  const [form, setForm] = useState({
    audience: 'all' as Audience,
    user_id: '',
    title: '',
    body: '',
    type: 'info',
  });

  useEffect(() => {
    async function load() {
      setError('');
      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (profile!.role !== 'admin') query = query.eq('user_id', profile!.id);

      const { data, error: loadError } = await query;

      if (loadError) setError(loadError.message);
      if (data) setNotifications(data);
      setLoading(false);
    }

    async function loadRecipients() {
      if (profile!.role !== 'admin') return;

      const { data, error: recipientError } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (recipientError) {
        setError(recipientError.message);
        return;
      }

      if (data) setRecipients(data);
    }

    if (!profile) return;
    load();
    loadRecipients();

    const channel = supabase
      .channel(`notifications-${profile.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        payload => {
          const next = payload.new as Notification;
          if (profile.role !== 'admin' && next.user_id !== profile.id) return;
          setNotifications(prev => [next, ...prev.filter(n => n.id !== next.id)].slice(0, 50));
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications' },
        payload => {
          const next = payload.new as Notification;
          if (profile.role !== 'admin' && next.user_id !== profile.id) return;
          setNotifications(prev => prev.map(n => n.id === next.id ? next : n));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'notifications', filter: profile.role === 'admin' ? undefined : `user_id=eq.${profile.id}` },
        payload => setNotifications(prev => prev.filter(n => n.id !== payload.old.id))
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile]);

  async function markAllRead() {
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', profile!.id)
      .eq('is_read', false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  async function markRead(id: string) {
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', profile!.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  }

  async function sendNotification(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSentMessage('');

    const title = form.title.trim();
    const body = form.body.trim();

    if (!title || !body) {
      setError('Title and message are required.');
      return;
    }

    const selectedRecipients = recipients.filter(user => {
      if (user.id === profile?.id) return false;
      if (form.audience === 'all') return true;
      if (form.audience === 'specific') return user.id === form.user_id;
      return user.role === form.audience;
    });

    if (selectedRecipients.length === 0) {
      setError('No active recipients match that audience.');
      return;
    }

    setSending(true);
    const notificationRows = selectedRecipients.map(user => ({
        user_id: user.id,
        created_by: profile!.id,
        title,
        body,
        type: form.type,
        reference_type: 'admin',
      }));

    const { error: sendError } = await supabase.from('notifications').insert(notificationRows);
    const schemaCacheMiss = sendError?.message?.includes("Could not find the 'created_by' column");
    const fallbackError = schemaCacheMiss
      ? (await supabase.from('notifications').insert(notificationRows.map(({ created_by: _, ...row }) => row))).error
      : null;

    if (sendError && !schemaCacheMiss) {
      setError(sendError.message);
    } else if (fallbackError) {
      setError(fallbackError.message);
    } else {
      setSentMessage(`Sent to ${selectedRecipients.length} ${selectedRecipients.length === 1 ? 'user' : 'users'}.`);
      setForm(prev => ({ ...prev, title: '', body: '', user_id: '' }));
    }

    setSending(false);
  }

  async function openNotification(notif: Notification) {
    if (profile?.role === 'admin' && notif.user_id !== profile.id) return;
    if (!notif.is_read) await markRead(notif.id);
    if (!onNavigate) return;

    if (notif.reference_type === 'conversation') {
      onNavigate('messages', { conversationId: notif.reference_id });
      return;
    }

    if (notif.reference_type === 'order' && notif.reference_id) {
      const { data } = await supabase.from('orders').select('*').eq('id', notif.reference_id).maybeSingle();
      if (data) onNavigate('order-detail', data);
      return;
    }

    if (notif.reference_type === 'bid' && notif.reference_id) {
      if (profile?.role === 'customer') {
        const { data } = await supabase
          .from('bids')
          .select('food_requests(*)')
          .eq('id', notif.reference_id)
          .maybeSingle();
        const request = (data as unknown as { food_requests?: unknown })?.food_requests;
        if (request) onNavigate('request-detail', request);
      } else {
        onNavigate('my-bids');
      }
      return;
    }

    if (notif.reference_type === 'request') {
      onNavigate(profile?.role === 'chef' ? 'marketplace' : 'my-requests');
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const latestTypes = Array.from(new Set(notifications.map(n => n.type))).slice(0, 4);
  const isAdmin = profile?.role === 'admin';
  const recipientCount = recipients.filter(user => user.id !== profile?.id).length;
  const targetCount = recipients.filter(user => {
    if (user.id === profile?.id) return false;
    if (form.audience === 'all') return true;
    if (form.audience === 'specific') return user.id === form.user_id;
    return user.role === form.audience;
  }).length;

  return (
    <div className={`p-6 ${isAdmin ? 'max-w-5xl' : 'max-w-3xl'} mx-auto`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">{isAdmin ? 'Send Notifications' : 'Notifications'}</h1>
          <p className="text-stone-500 text-sm mt-1">
            {isAdmin ? `${recipientCount} active recipients available` : unreadCount > 0 ? `${unreadCount} unread` : 'Your latest updates'}
          </p>
        </div>
        {!isAdmin && unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="inline-flex items-center gap-2 text-sm text-orange-500 hover:text-orange-600 font-medium"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {sentMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-2">
          <CheckCheck className="w-4 h-4 shrink-0" />
          {sentMessage}
        </div>
      )}

      {isAdmin && (
        <form onSubmit={sendNotification} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 mb-6">
          <div className="flex items-start gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
              <Send className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="font-bold text-stone-900">Compose Notification</h2>
              <p className="text-xs text-stone-400 mt-0.5">{targetCount} selected recipients</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Audience</label>
              <select
                value={form.audience}
                onChange={e => setForm({ ...form, audience: e.target.value as Audience, user_id: '' })}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
              >
                {(Object.keys(audienceLabel) as Audience[]).map(key => (
                  <option key={key} value={key}>{audienceLabel[key]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Type</label>
              <select
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
              >
                {['info', 'system', 'order', 'payment', 'bid', 'message', 'review'].map(type => (
                  <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                ))}
              </select>
            </div>

            {form.audience === 'specific' && (
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">User</label>
                <select
                  value={form.user_id}
                  onChange={e => setForm({ ...form, user_id: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
                >
                  <option value="">Select user</option>
                  {recipients.filter(user => user.id !== profile?.id).map(user => (
                    <option key={user.id} value={user.id}>{user.full_name || user.email} ({user.role})</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Title</label>
              <input
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                maxLength={90}
                required
                className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Message</label>
              <textarea
                value={form.body}
                onChange={e => setForm({ ...form, body: e.target.value })}
                rows={4}
                required
                className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={sending || targetCount === 0}
            className="mt-5 inline-flex items-center justify-center gap-2 bg-orange-500 text-white px-5 py-3 rounded-xl font-bold text-sm hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            {sending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
            Send Notification
          </button>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 border border-stone-100 animate-pulse">
              <div className="h-12 bg-stone-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-100 p-12 text-center">
          <BellOff className="w-12 h-12 text-stone-300 mx-auto mb-4" />
          <h3 className="text-stone-600 font-semibold mb-1">No notifications</h3>
          <p className="text-stone-400 text-sm">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(notif => (
            <button
              key={notif.id}
              onClick={() => openNotification(notif)}
              className={`w-full text-left rounded-2xl p-4 border transition-all ${
                notif.is_read
                  ? 'bg-white border-stone-100 hover:border-stone-200'
                  : 'bg-white border-orange-200 shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${typeColor(notif.type)}`}>
                  {typeIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-semibold ${notif.is_read ? 'text-stone-700' : 'text-stone-900'}`}>{notif.title}</p>
                    {!notif.is_read && <div className="w-2 h-2 bg-orange-500 rounded-full shrink-0 mt-1" />}
                  </div>
                  {notif.body && <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{notif.body}</p>}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-stone-400">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(notif.created_at).toLocaleString()}
                    </span>
                    {isAdmin && (
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {recipients.find(user => user.id === notif.user_id)?.full_name || 'Recipient'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {!loading && notifications.length > 0 && (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-4 bg-white rounded-2xl border border-stone-100">
            <p className="text-xs text-stone-400 mb-1">Unread</p>
            <p className="text-2xl font-bold text-stone-900">{unreadCount}</p>
          </div>
          <div className="p-4 bg-white rounded-2xl border border-stone-100">
            <p className="text-xs text-stone-400 mb-1">Total shown</p>
            <p className="text-2xl font-bold text-stone-900">{notifications.length}</p>
          </div>
          <div className="p-4 bg-white rounded-2xl border border-stone-100 col-span-2 sm:col-span-1">
            <p className="text-xs text-stone-400 mb-1">Activity</p>
            <p className="text-sm font-semibold text-stone-700 capitalize truncate">
              {latestTypes.length ? latestTypes.join(', ') : 'None'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
