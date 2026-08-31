import { useState } from 'react';
import { ChefHat, Mail, Lock, User, Phone, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../lib/supabase';

type AuthMode = 'login' | 'register';

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [role, setRole] = useState<UserRole>('customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (mode === 'login') {
      const { error } = await signIn(email, password);
      if (error) setError(error);
    } else {
      if (!fullName.trim()) { setError('Full name is required'); setLoading(false); return; }
      const { error } = await signUp(email, password, fullName, role, phone);
      if (error) setError(error);
      else setSuccess('Account created! Please check your email to verify.');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center p-6">
      <div className="w-full max-w-6xl grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="premium-panel p-10 text-[#0B0B0B]">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-[1.25rem] bg-[#D4AF37] flex items-center justify-center shadow-[0_20px_60px_rgba(212,175,55,0.24)]">
              <ChefHat className="w-7 h-7 text-[#0B0B0B]" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[#8C6614]">Private Dining Concierge</p>
              <h1 className="text-4xl font-semibold tracking-tight mt-3">Design Your Perfect Meal</h1>
            </div>
          </div>
          <p className="max-w-xl text-base leading-8 text-[#5E5A53] mb-8">
            Custom meals, curated ingredients, professional chefs. Book your private culinary experience and let our expert chefs craft the menu.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              onClick={() => setMode('register')}
              className="premium-button px-8 py-4 text-sm font-semibold shadow-lg shadow-[0_20px_60px_rgba(212,175,55,0.22)] transition-transform hover:-translate-y-0.5"
            >
              Create Meal Request
            </button>
            <button
              onClick={() => setMode('login')}
              className="premium-button-secondary px-8 py-4 text-sm font-semibold transition-all hover:bg-white/90"
            >
              Browse Top Chefs
            </button>
          </div>
          <div className="mt-10 grid gap-4">
            <div className="rounded-3xl border border-[#E7E2D8] bg-[#FEFBF7] p-5 shadow-[0_20px_40px_rgba(11,11,11,0.04)]">
              <p className="text-xs uppercase tracking-[0.3em] text-[#8C6614] mb-3">Premium Trust</p>
              <p className="text-sm text-[#5E5A53]">Verified chefs, secure Paystack payment flow, and private concierge support for every booking.</p>
            </div>
            <div className="rounded-3xl border border-[#E7E2D8] bg-[#FEFBF7] p-5 shadow-[0_20px_40px_rgba(11,11,11,0.04)]">
              <p className="text-xs uppercase tracking-[0.3em] text-[#8C6614] mb-3">Authenticity</p>
              <p className="text-sm text-[#5E5A53]">From bespoke menus to chef consultations, your experience is handcrafted from start to finish.</p>
            </div>
          </div>
        </section>

        <section className="premium-panel p-8 bg-[#FAF7F0]">
          <div className="text-center mb-8">
            <p className="text-xs uppercase tracking-[0.35em] text-[#8C6614] mb-2">Welcome</p>
            <h2 className="text-3xl font-semibold text-[#0B0B0B]">{mode === 'login' ? 'Secure sign in' : 'Create your concierge profile'}</h2>
            <p className="text-sm text-[#5E5A53] mt-2">Access the premium marketplace for custom culinary experiences.</p>
          </div>

          <div className="bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(11,11,11,0.06)] border border-[#E7E2D8] overflow-hidden">
            <div className="flex border-b border-[#E7E2D8]">
              <button
                onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                className={`flex-1 py-4 text-sm font-semibold transition-colors ${mode === 'login' ? 'text-[#0B0B0B] bg-[#FFF7E8]' : 'text-[#5E5A53] hover:text-[#0B0B0B]'}`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
                className={`flex-1 py-4 text-sm font-semibold transition-colors ${mode === 'register' ? 'text-[#0B0B0B] bg-[#FFF7E8]' : 'text-[#5E5A53] hover:text-[#0B0B0B]'}`}
              >
                Create Account
              </button>
            </div>

            <div className="p-8">
              {success && (
                <div className="mb-6 p-4 bg-[#E6F4EA] border border-[#C8E6D7] rounded-2xl text-[#0F5132] text-sm">
                  {success}
                </div>
              )}
              {error && (
                <div className="mb-6 p-4 bg-[#F4E7E7] border border-[#E6C8C8] rounded-2xl text-[#8A2F2F] text-sm">
                  {error}
                </div>
              )}

              {mode === 'register' && (
                <div className="mb-6">
                  <p className="text-[0.7rem] uppercase tracking-[0.28em] text-[#8C6614] mb-4">I am a</p>
                  <div className="grid grid-cols-2 gap-3">
                    {(['customer', 'chef'] as UserRole[]).map(r => (
                      <button
                        key={r}
                        onClick={() => setRole(r)}
                        className={`p-3 rounded-2xl border-2 text-sm font-semibold capitalize transition-all ${
                          role === r
                            ? 'border-[#D4AF37] bg-[#FFF6E1] text-[#0B0B0B]'
                            : 'border-[#DCD3C4] text-[#5E5A53] hover:border-[#B38C26]'
                        }`}
                      >
                        {r === 'customer' ? 'Customer' : 'Chef'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'register' && (
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B3A58B]" />
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 border border-[#DCD3C4] rounded-2xl text-sm text-[#0B0B0B] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40"
                      required
                    />
                  </div>
                )}

                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B3A58B]" />
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-[#DCD3C4] rounded-2xl text-sm text-[#0B0B0B] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40"
                    required
                  />
                </div>

                {mode === 'register' && (
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B3A58B]" />
                    <input
                      type="tel"
                      placeholder="Phone Number (optional)"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 border border-[#DCD3C4] rounded-2xl text-sm text-[#0B0B0B] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40"
                    />
                  </div>
                )}

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B3A58B]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-11 pr-11 py-3 border border-[#DCD3C4] rounded-2xl text-sm text-[#0B0B0B] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7B6B54] hover:text-[#0B0B0B]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl premium-button text-sm font-semibold transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-[#0B0B0B] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      {mode === 'login' ? 'Sign In' : 'Create Account'}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {mode === 'login' && (
                <div className="mt-6 text-center text-xs text-[#5E5A53]">
                  <p className="font-semibold text-[#0B0B0B]">Demo Credentials</p>
                  <div className="mt-3 space-y-1">
                    <p>Customer: <span className="font-mono text-[#5E5A53]">customer@chefbid.com</span> / <span className="font-mono text-[#5E5A53]">admin123456</span></p>
                    <p>Chef (Approved): <span className="font-mono text-[#5E5A53]">chef@chefbid.com</span> / <span className="font-mono text-[#5E5A53]">admin123456</span></p>
                    <p>Chef (Pending): <span className="font-mono text-[#5E5A53]">chef_pending@chefbid.com</span> / <span className="font-mono text-[#5E5A53]">admin123456</span></p>
                    <p>Admin: <span className="font-mono text-[#5E5A53]">admin@chefbid.com</span> / <span className="font-mono text-[#5E5A53]">admin123456</span></p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
