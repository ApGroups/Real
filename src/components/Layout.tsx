import { useEffect, useState } from 'react';
import {
  ChefHat, Home, ShoppingBag, MessageCircle, Bell, User, LogOut,
  Menu, X, Star, BarChart3, Users, Shield, Briefcase, PlusCircle, Settings
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
}

function NavItem({ icon: Icon, label, active, onClick, badge }: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all group relative ${
        active
          ? 'bg-[#D4AF37] text-[#0B0B0B] shadow-[0_18px_40px_rgba(212,175,55,0.25)]'
          : 'text-[#E7E2D8] hover:bg-white/10 hover:text-white'
      }`}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="truncate">{label}</span>
      {badge && badge > 0 ? (
        <span className="ml-auto bg-[#8A2F2F] text-white text-[0.65rem] rounded-full w-5 h-5 flex items-center justify-center shrink-0">
          {badge > 9 ? '9+' : badge}
        </span>
      ) : null}
    </button>
  );
}

export default function Layout({ children, activePage, onNavigate }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (!profile) {
      setUnreadNotifications(0);
      return;
    }

    let mounted = true;

    async function loadUnreadCount() {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile!.id)
        .eq('is_read', false);

      if (mounted) setUnreadNotifications(count ?? 0);
    }

    loadUnreadCount();

    const channel = supabase
      .channel(`notification-count-${profile.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
        loadUnreadCount
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const customerNav = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'new-request', icon: PlusCircle, label: 'New Request' },
    { id: 'my-requests', icon: ShoppingBag, label: 'My Requests' },
    { id: 'orders', icon: Briefcase, label: 'Orders' },
    { id: 'messages', icon: MessageCircle, label: 'Messages' },
    { id: 'notifications', icon: Bell, label: 'Notifications' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  const chefNav = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'marketplace', icon: ShoppingBag, label: 'Marketplace' },
    { id: 'my-bids', icon: Star, label: 'My Bids' },
    { id: 'orders', icon: Briefcase, label: 'Orders' },
    { id: 'messages', icon: MessageCircle, label: 'Messages' },
    { id: 'earnings', icon: BarChart3, label: 'Earnings' },
    { id: 'notifications', icon: Bell, label: 'Notifications' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  const adminNav = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'users', icon: Users, label: 'Users' },
    { id: 'chefs', icon: ChefHat, label: 'Chef Approvals' },
    { id: 'orders', icon: Briefcase, label: 'Orders' },
    { id: 'payments', icon: BarChart3, label: 'Payments' },
    { id: 'disputes', icon: Shield, label: 'Disputes' },
    { id: 'notifications', icon: Bell, label: 'Notifications' },
    { id: 'analytics', icon: BarChart3, label: 'Analytics' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  const navItems = profile?.role === 'admin' ? adminNav : profile?.role === 'chef' ? chefNav : customerNav;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="p-6 border-b border-white/10 bg-[#0B0B0B]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-3xl bg-[#D4AF37] flex items-center justify-center shadow-[0_20px_40px_rgba(212,175,55,0.24)]">
            <ChefHat className="w-6 h-6 text-[#0B0B0B]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white leading-none">ChefBid</h1>
            <p className="text-xs text-[#E7E2D8] mt-0.5 uppercase tracking-[0.2em]">Luxury Concierge</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(item => (
          <NavItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            active={activePage === item.id}
            onClick={() => { onNavigate(item.id); setMobileOpen(false); }}
            badge={item.id === 'notifications' ? unreadNotifications : undefined}
          />
        ))}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-stone-100">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 mb-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center text-white text-sm font-bold shrink-0">
            {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-stone-800 truncate">{profile?.full_name}</p>
            <p className="text-xs text-stone-400 truncate">{profile?.email}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-stone-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#FAF7F0] overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 bg-[#0B0B0B] border-r border-white/10 flex-col shrink-0 text-white">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 bg-[#0B0B0B] h-full shadow-2xl flex flex-col z-10 text-white">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/15"
            >
              <X className="w-4 h-4" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-[#0B0B0B] border-b border-white/10 shrink-0 text-white">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/10 text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-[#D4AF37] rounded-2xl flex items-center justify-center text-[#0B0B0B]">
              <ChefHat className="w-4 h-4" />
            </div>
            <span className="font-semibold text-white">ChefBid</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
