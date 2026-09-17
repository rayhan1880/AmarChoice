import { useState, FormEvent } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { AdminUser } from '../../types.ts';
import { 
  UserPlus, 
  Users, 
  ShieldCheck, 
  ShieldAlert, 
  Trash2, 
  Mail, 
  Lock, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  Key,
  X,
  Sparkles
} from 'lucide-react';

export default function UsersView() {
  const { users, currentUser, createAdminUser, deleteAdminUser } = useApp();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'superadmin' | 'admin' | 'moderator'>('admin');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('অনুগ্রহ করে নাম, ইমেইল এবং পাসওয়ার্ড পূরণ করুন');
      return;
    }

    if (password.length < 6) {
      setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
      return;
    }

    try {
      setLoading(true);
      await createAdminUser({
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
        role
      });

      setSuccess(`ইউজার "${name}" সফলভাবে যুক্ত হয়েছে! এখন এই ইমেইল ও পাসওয়ার্ড দিয়ে /mypanel এ লগইন করা যাবে।`);
      setName('');
      setEmail('');
      setPassword('');
      setRole('admin');
      setIsAddModalOpen(false);

      setTimeout(() => {
        setSuccess(null);
      }, 5000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('ইউজার তৈরিতে সমস্যা হয়েছে');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (user: AdminUser) => {
    if (user.id === currentUser?.id) {
      alert('আপনি আপনার নিজের অ্যাকাউন্ট ডিলিট করতে পারবেন না!');
      return;
    }
    if (users.length <= 1) {
      alert('সিস্টেমে অন্তত একজন অ্যাডমিন থাকতে হবে!');
      return;
    }

    const confirmDelete = window.confirm(`আপনি কি নিশ্চিত যে "${user.name}" (${user.email}) ইউজারটি ডিলিট করতে চান?`);
    if (confirmDelete) {
      try {
        await deleteAdminUser(user.id);
        setSuccess(`"${user.name}" ইউজারটি ডিলিট করা হয়েছে`);
        setTimeout(() => setSuccess(null), 4000);
      } catch (err) {
        alert('ইউজার ডিলিট করা সম্ভব হয়নি');
        console.error(err);
      }
    }
  };

  const getRoleBadge = (userRole: string) => {
    switch (userRole) {
      case 'superadmin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <ShieldAlert className="w-3 h-3 text-amber-600" />
            সুপার অ্যাডমিন
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <ShieldCheck className="w-3 h-3 text-rose-600" />
            অ্যাডমিন
          </span>
        );
      case 'moderator':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <User className="w-3 h-3 text-blue-600" />
            মডারেটর
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-rose-700 font-bold text-xs tracking-wider uppercase mb-1">
            <Users className="w-4 h-4" />
            অ্যাক্সেস কন্ট্রোল ও ইউজার অ্যাডমিন
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900">
            অ্যাডমিন প্যানেল ইউজার ম্যানেজমেন্ট
          </h2>
          <p className="text-stone-600 text-xs sm:text-sm mt-1 max-w-2xl">
            নতুন ইউজার যোগ করুন যারা <code className="bg-stone-100 text-rose-600 px-1.5 py-0.5 rounded font-mono font-bold text-xs">/mypanel</code> লিঙ্কে গিয়ে তাদের ইমেইল ও পাসওয়ার্ড দিয়ে ড্যাশবোর্ডে প্রবেশ করতে পারবেন।
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setError(null);
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition text-sm shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>নতুন ইউজার যোগ করুন</span>
        </button>
      </div>

      {/* Success Notification */}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-sm flex items-start gap-3 shadow-xs animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{success}</div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-stone-900">{users.length}</div>
            <div className="text-xs text-stone-500 font-medium">মোট অ্যাডমিন ইউজার</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-700">
              {users.filter(u => u.role === 'superadmin').length}
            </div>
            <div className="text-xs text-stone-500 font-medium">সুপার অ্যাডমিন</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-rose-700">
              {users.filter(u => u.role !== 'superadmin').length}
            </div>
            <div className="text-xs text-stone-500 font-medium">ম্যানেজার ও মডারেটর</div>
          </div>
        </div>
      </div>

      {/* Users List (Desktop Table + Mobile Cards) */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between">
          <h3 className="font-bold text-stone-800 text-base flex items-center gap-2">
            <Key className="w-4 h-4 text-stone-500" />
            অনুমোদিত অ্যাডমিন ইউজারদের তালিকা
          </h3>
          <span className="text-xs text-stone-500 bg-stone-100 px-2 py-1 rounded-md font-mono">
            {users.length} জন সক্রিয়
          </span>
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-stone-50 text-stone-600 text-xs uppercase tracking-wider border-b border-stone-200">
                <th className="py-3 px-4 font-bold">ইউজারের নাম ও ইমেইল</th>
                <th className="py-3 px-4 font-bold">লগইন ইমেইল</th>
                <th className="py-3 px-4 font-bold">অ্যাক্সেস রোল</th>
                <th className="py-3 px-4 font-bold">স্ট্যাটাস</th>
                <th className="py-3 px-4 font-bold text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {users.map((u) => {
                const isCurrent = u.id === currentUser?.id;
                return (
                  <tr key={u.id} className="hover:bg-stone-50/80 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-sm shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-stone-900 flex items-center gap-2">
                            {u.name}
                            {isCurrent && (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                                আপনি (Current)
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-stone-400 font-mono">ID: {u.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-stone-700">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-stone-400" />
                        {u.email}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {getRoleBadge(u.role)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        সক্রিয় (Active)
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {isCurrent ? (
                        <span className="text-xs text-stone-400 italic">লগইন করা আছেন</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDelete(u)}
                          className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-lg font-medium transition"
                          title="ইউজার ডিলিট করুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>মুছুন</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile View Cards */}
        <div className="md:hidden divide-y divide-stone-100">
          {users.map((u) => {
            const isCurrent = u.id === currentUser?.id;
            return (
              <div key={u.id} className="p-4 space-y-2.5 hover:bg-stone-50 transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-sm shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
                        {u.name}
                        {isCurrent && (
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                            আপনি
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-stone-500 font-mono">{u.email}</div>
                    </div>
                  </div>
                  <div>
                    {getRoleBadge(u.role)}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs border-t border-stone-100">
                  <span className="text-emerald-700 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    সক্রিয়
                  </span>

                  {!isCurrent && (
                    <button
                      type="button"
                      onClick={() => handleDelete(u)}
                      className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 bg-rose-50 px-2 py-1 rounded-lg font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>মুছে ফেলুন</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 relative animate-scaleUp">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1 rounded-lg hover:bg-stone-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-900">নতুন অ্যাডমিন ইউজার যোগ করুন</h3>
                <p className="text-xs text-stone-500">লগইন তথ্য প্রদান করুন</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  ইউজারের পূর্ণ নাম (Full Name) *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="যেমনঃ রায়হান আহমেদ"
                    required
                    className="w-full pl-9 pr-3 py-2 text-sm border border-stone-300 rounded-xl focus:border-rose-500 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  লগইন ইমেইল (Login Email) *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@amarchoice.com"
                    required
                    className="w-full pl-9 pr-3 py-2 text-sm border border-stone-300 rounded-xl focus:border-rose-500 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
                <p className="text-[11px] text-stone-400 mt-0.5">এই ইমেইল দিয়ে ইউজার /mypanel এ সাইন ইন করবেন</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  পাসওয়ার্ড (Password) *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="কমপক্ষে ৬ অক্ষর"
                    required
                    className="w-full pl-9 pr-3 py-2 text-sm border border-stone-300 rounded-xl focus:border-rose-500 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  ইউজার রোল / অ্যাক্সেস (Role)
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'superadmin' | 'admin' | 'moderator')}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-xl focus:border-rose-500 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 bg-white"
                >
                  <option value="admin">অ্যাডমিন / ম্যানেজার (অর্ডার ও পণ্য নিয়ন্ত্রণ)</option>
                  <option value="superadmin">সুপার অ্যাডমিন (সম্পূর্ণ নিয়ন্ত্রণ ও ইউজার ম্যানেজমেন্ট)</option>
                  <option value="moderator">মডারেটর (শুধুমাত্র অর্ডার প্রসেসিং)</option>
                </select>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 border border-stone-300 text-stone-700 hover:bg-stone-50 rounded-xl text-sm font-bold transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{loading ? 'সংরক্ষণ হচ্ছে...' : 'ইউজার সংরক্ষণ করুন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
