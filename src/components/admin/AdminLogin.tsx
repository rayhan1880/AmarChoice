import { useState, FormEvent } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, ArrowLeft, Loader2, Sparkles } from 'lucide-react';

export default function AdminLogin() {
  const { login, setViewMode } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('অনুগ্রহ করে ইমেইল এবং পাসওয়ার্ড প্রদান করুন');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login(email, password);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'ভুল ইমেইল অথবা পাসওয়ার্ড!');
      } else {
        setError('লগইন ব্যর্থ হয়েছে! অনুগ্রহ করে সঠিক তথ্য প্রদান করুন।');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (type: 'superadmin' | 'manager') => {
    if (type === 'superadmin') {
      setEmail('admin@amarchoice.com');
      setPassword('admin123');
    } else {
      setEmail('manager@amarchoice.com');
      setPassword('manager123');
    }
    setError(null);
  };

  return (
    <div className="min-h-screen bg-stone-900 flex flex-col justify-center items-center px-4 py-8 sm:px-6">
      {/* Background ambient accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-rose-600 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-amber-600 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white shadow-xl mb-3 shadow-rose-900/40">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            AmarChoice অ্যাডমিন প্যানেল
          </h1>
          <p className="text-stone-400 text-xs sm:text-sm mt-1 flex items-center justify-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            নিরাপদ সুরক্ষিত ইউআরএল: <code className="bg-stone-800 text-amber-400 px-2 py-0.5 rounded font-mono text-xs">/mypanel</code>
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-stone-800/90 backdrop-blur-xl border border-stone-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="mb-5 pb-4 border-b border-stone-700/60">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-rose-400" />
              অ্যাকাউন্টে সাইন ইন করুন
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              অ্যাডমিন ড্যাশবোর্ডে প্রবেশ করতে আপনার নিবন্ধিত ইমেইল ও পাসওয়ার্ড দিন
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs sm:text-sm flex items-start gap-2 animate-fadeIn">
              <span className="text-base leading-none">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                অ্যাডমিন ইমেইল (Email)
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@amarchoice.com"
                  required
                  className="w-full bg-stone-900/80 border border-stone-700 focus:border-rose-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-stone-500 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                পাসওয়ার্ড (Password)
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-stone-900/80 border border-stone-700 focus:border-rose-500 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-stone-500 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200 transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold py-2.5 sm:py-3 rounded-xl shadow-lg hover:shadow-rose-600/30 active:scale-[0.99] transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>যাচাই করা হচ্ছে...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>প্যানেলে লগইন করুন</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Fill Demo Credentials */}
          <div className="mt-6 pt-4 border-t border-stone-700/60">
            <div className="flex items-center justify-between text-xs text-stone-400 mb-2.5">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>দ্রুত টেস্ট লগইন করুন:</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleFillDemo('superadmin')}
                className="text-left bg-stone-900/70 hover:bg-stone-700/70 border border-stone-700/70 hover:border-amber-500/50 p-2 rounded-lg transition group"
              >
                <div className="text-[11px] font-bold text-amber-400 group-hover:text-amber-300">সুপার অ্যাডমিন</div>
                <div className="text-[10px] text-stone-400 truncate">admin@amarchoice.com</div>
                <div className="text-[9px] text-stone-500">পাসওয়ার্ড: admin123</div>
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('manager')}
                className="text-left bg-stone-900/70 hover:bg-stone-700/70 border border-stone-700/70 hover:border-rose-500/50 p-2 rounded-lg transition group"
              >
                <div className="text-[11px] font-bold text-rose-400 group-hover:text-rose-300">অর্ডার ম্যানেজার</div>
                <div className="text-[10px] text-stone-400 truncate">manager@amarchoice.com</div>
                <div className="text-[9px] text-stone-500">পাসওয়ার্ড: manager123</div>
              </button>
            </div>
          </div>
        </div>

        {/* Back to Customer Web View */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setViewMode('customer')}
            className="inline-flex items-center gap-2 text-xs sm:text-sm text-stone-400 hover:text-white transition py-2 px-3 rounded-lg hover:bg-stone-800"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>মূল ওয়েবসাইটে (কাস্টমার ভিউ) ফিরে যান</span>
          </button>
        </div>
      </div>
    </div>
  );
}
