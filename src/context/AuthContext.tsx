import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, Profile, UserRole } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  role: UserRole | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, role: UserRole, phone?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (data) setProfile(data);
  }

  function getDemoProfileDefaults(email: string) {
    switch (email) {
      case 'customer@chefbid.com':
        return {
          full_name: 'Sarah Johnson',
          phone: '+234 701 234 5678',
          role: 'customer' as UserRole,
          location: 'Lagos',
          is_verified: true,
          is_active: true,
        };
      case 'chef@chefbid.com':
        return {
          full_name: 'Chef Adekunle',
          phone: '+234 802 987 6543',
          role: 'chef' as UserRole,
          location: 'Lagos',
          is_verified: true,
          is_active: true,
        };
      case 'chef_pending@chefbid.com':
        return {
          full_name: 'Chef Zainab',
          phone: '+234 803 555 7890',
          role: 'chef' as UserRole,
          location: 'Lagos',
          is_verified: false,
          is_active: true,
        };
      case 'admin@chefbid.com':
        return {
          full_name: 'Admin User',
          phone: '+234 700 000 0000',
          role: 'admin' as UserRole,
          location: 'Lagos',
          is_verified: true,
          is_active: true,
        };
      default:
        return null;
    }
  }

  async function ensureDemoProfiles(user: User) {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (existing) return;

    const defaults = getDemoProfileDefaults(user.email);
    if (!defaults) return;

    const { error: profileError } = await supabase.from('profiles').insert({
      id: user.id,
      email: user.email,
      ...defaults,
    });
    if (profileError) {
      console.error('Failed to create demo profile:', profileError);
      return;
    }

    if (defaults.role === 'chef') {
      const chefDefaults = {
        user_id: user.id,
        bio: user.email === 'chef@chefbid.com'
          ? 'Professional chef with 8 years experience. Specializing in Nigerian and continental cuisine.'
          : 'Passionate pastry chef with 5 years experience. Specializes in custom cakes, pastries, and desserts.',
        years_experience: user.email === 'chef@chefbid.com' ? 8 : 5,
        specialties: user.email === 'chef@chefbid.com'
          ? ['Nigerian Cuisine', 'Continental', 'Catering']
          : ['Pastry & Baking', 'Desserts', 'Wedding Cakes'],
        service_areas: user.email === 'chef@chefbid.com'
          ? ['Lagos Island', 'VI', 'Lekki', 'Ikoyi']
          : ['Lagos', 'Ogun State'],
        hourly_rate: user.email === 'chef@chefbid.com' ? 15000 : 12000,
        is_approved: user.email === 'chef@chefbid.com',
        is_available: true,
        total_orders: user.email === 'chef@chefbid.com' ? 42 : 8,
        avg_rating: user.email === 'chef@chefbid.com' ? 4.8 : 4.6,
        bank_name: user.email === 'chef@chefbid.com' ? 'GTBank' : 'Access Bank',
        bank_account: user.email === 'chef@chefbid.com' ? '0123456789' : '9876543210',
      };
      const { error: chefError } = await supabase.from('chef_profiles').insert(chefDefaults);
      if (chefError) console.error('Failed to create demo chef profile:', chefError);
    }
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id);
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await ensureDemoProfiles(session.user);
        await fetchProfile(session.user.id);
        setLoading(false);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        (async () => {
          await ensureDemoProfiles(session.user);
          await fetchProfile(session.user.id);
          setLoading(false);
        })();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      return { error: 'Email and password are required.' };
    }

    const { error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
    if (error) {
      console.error('Supabase signInWithPassword error:', error);
    }
    return { error: error?.message ?? null };
  }

  async function signUp(email: string, password: string, fullName: string, role: UserRole, phone = '') {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      return { error: 'Email and password are required.' };
    }

    const { data, error } = await supabase.auth.signUp({ email: trimmedEmail, password });
    if (error) return { error: error.message };
    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        email,
        full_name: fullName,
        role,
        phone,
      });
      if (profileError) return { error: profileError.message };
      if (role === 'chef') {
        await supabase.from('chef_profiles').insert({ user_id: data.user.id });
      }
    }
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{
      user, profile, session, loading,
      role: profile?.role ?? null,
      signIn, signUp, signOut, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
