import { useEffect, useState, useRef } from 'react';
import { Send, MessageCircle, ArrowLeft, ChefHat, User } from 'lucide-react';
import { supabase, Conversation, Message } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface Props {
  initialConversationId?: string;
}

export default function ChatPage({ initialConversationId }: Props) {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('conversations')
        .select('*, customer:profiles!conversations_customer_id_fkey(full_name), chef:profiles!conversations_chef_id_fkey(full_name), messages(id,is_read,sender_id,created_at)')
        .or(`customer_id.eq.${profile!.id},chef_id.eq.${profile!.id}`)
        .order('last_message_at', { ascending: false });
      if (data) {
        const rows = data as unknown as Conversation[];
        setConversations(rows);
        if (initialConversationId) {
          const selected = rows.find(conv => conv.id === initialConversationId);
          if (selected) setActive(selected);
        }
      }
      setLoading(false);
    }
    if (profile) load();
  }, [initialConversationId, profile]);

  useEffect(() => {
    if (!active) return;
    const activeConversationId = active.id;

    async function loadMessages() {
      const { data } = await supabase
        .from('messages')
        .select('*, sender:profiles!messages_sender_id_fkey(full_name)')
        .eq('conversation_id', activeConversationId)
        .order('created_at', { ascending: true });
      if (data) {
        const messages = data as unknown as Message[];
        setMessages(messages);
        const unreadIds = messages
          .filter(msg => !msg.is_read && msg.sender_id !== profile!.id)
          .map(msg => msg.id);
        if (unreadIds.length > 0) {
          await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('conversation_id', activeConversationId)
            .eq('is_read', false)
            .neq('sender_id', profile!.id);
          setMessages(prev => prev.map(msg => (
            msg.sender_id !== profile!.id ? { ...msg, is_read: true } : msg
          )));
          setConversations(prev => prev.map(conv => conv.id === activeConversationId ? { ...conv, messages: conv.messages?.map(msg => ({ ...msg, is_read: true })) } : conv));
        }
      }
    }
    loadMessages();

    const channel = supabase
      .channel(`conv-${activeConversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConversationId}` },
        payload => setMessages(prev => [...prev, payload.new as Message]))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [active, profile?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    if (!text.trim() || !active) return;
    setSending(true);
    const content = text.trim();
    setText('');

    try {
      const { error: messageError } = await supabase.from('messages').insert({
        conversation_id: active.id,
        sender_id: profile!.id,
        content,
      });
      if (messageError) throw messageError;

      const { error: convoError } = await supabase.from('conversations').update({
        last_message: content,
        last_message_at: new Date().toISOString(),
      }).eq('id', active.id);
      if (convoError) throw convoError;
    } catch (err) {
      console.error('Failed to send message', err);
    } finally {
      setSending(false);
    }
  }

  function getOtherName(conv: Conversation) {
    if (profile!.role === 'customer') return (conv as unknown as { chef?: { full_name: string } }).chef?.full_name || 'Chef';
    return (conv as unknown as { customer?: { full_name: string } }).customer?.full_name || 'Customer';
  }

  function getConversationUnreadCount(conv: Conversation) {
    return conv.messages?.filter(msg => msg.sender_id !== profile!.id && !msg.is_read).length || 0;
  }

  function formatTimestamp(timestamp: string | null | undefined) {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
  }

  return (
    <div className="flex h-full bg-stone-50">
      {/* Conversation List */}
      <div className={`w-full sm:w-80 bg-white border-r border-stone-100 flex flex-col shrink-0 ${active ? 'hidden sm:flex' : 'flex'}`}>
        <div className="p-5 border-b border-stone-100">
          <h2 className="font-bold text-stone-900 text-lg">Messages</h2>
          <p className="text-stone-400 text-xs mt-0.5">{conversations.length} conversations</p>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-stone-50">
          {loading ? (
            Array(4).fill(0).map((_, i) => <div key={i} className="p-4 animate-pulse"><div className="h-12 bg-stone-100 rounded-xl" /></div>)
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-stone-400">
              <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No conversations yet</p>
            </div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => setActive(conv)}
                className={`w-full p-4 text-left hover:bg-stone-50 transition-colors flex items-center gap-3 ${active?.id === conv.id ? 'bg-orange-50' : ''}`}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center text-white font-bold shrink-0">
                  {getOtherName(conv).charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-stone-900 text-sm truncate">{getOtherName(conv)}</p>
                    <span className="text-[10px] text-stone-400 uppercase tracking-[0.2em]">{formatTimestamp(conv.last_message_at)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-stone-400 truncate">{conv.last_message || 'No messages yet'}</p>
                    {getConversationUnreadCount(conv) > 0 && (
                      <span className="inline-flex items-center justify-center rounded-full bg-orange-500 text-white text-[10px] font-semibold px-2 py-0.5">
                        {getConversationUnreadCount(conv)}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      {active ? (
        <div className="flex-1 flex flex-col min-w-0">
          <div className="p-4 bg-white border-b border-stone-100 flex items-center gap-3">
            <button onClick={() => setActive(null)} className="sm:hidden w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center">
              <ArrowLeft className="w-4 h-4 text-stone-600" />
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center text-white font-bold">
              {getOtherName(active).charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-stone-900 text-sm">{getOtherName(active)}</p>
              <p className="text-xs text-stone-400">{profile?.role === 'customer' ? <><ChefHat className="w-3 h-3 inline mr-0.5" />Chef</> : <><User className="w-3 h-3 inline mr-0.5" />Customer</>}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map(msg => {
              const isOwn = msg.sender_id === profile!.id;
              return (
                <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs sm:max-w-sm lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${
                    isOwn
                      ? 'bg-orange-500 text-white rounded-br-sm'
                      : 'bg-white border border-stone-200 text-stone-800 rounded-bl-sm shadow-sm'
                  }`}>
                    <p>{msg.content}</p>
                    <p className={`text-xs mt-1 ${isOwn ? 'text-orange-200' : 'text-stone-400'}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-stone-100">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type a message..."
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                className="flex-1 px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-stone-50"
              />
              <button
                onClick={sendMessage}
                disabled={sending || !text.trim()}
                className="w-10 h-10 bg-orange-500 text-white rounded-xl flex items-center justify-center hover:bg-orange-600 disabled:opacity-50 shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-stone-400 mt-2 text-center">Phone numbers and contact info cannot be shared</p>
          </div>
        </div>
      ) : (
        <div className="hidden sm:flex flex-1 items-center justify-center bg-stone-50">
          <div className="text-center text-stone-400">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Select a conversation</p>
            <p className="text-sm mt-1">Choose from the list to start messaging</p>
          </div>
        </div>
      )}
    </div>
  );
}
