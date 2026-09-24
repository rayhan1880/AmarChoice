import { useApp } from '../context/AppContext.tsx';
import {
  Eye,
  LogOut,
  ShoppingBag,
  Menu
} from 'lucide-react';
import { translations } from '../utils/translations.ts';

export default function Navigation() {
  const {
    viewMode,
    setViewMode,
    setAdminSidebarOpen,
    currentUser,
    logout,
    adminLanguage
  } = useApp();

  const t = translations[adminLanguage];

  // Hide the admin navigation bar completely when in customer view
  if (viewMode === 'customer') {
    return null;
  }

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="sticky top-0 z-50 bg-stone-900 text-stone-100 shadow-md border-b border-stone-800">
      <div className="w-full px-3 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Brand & URL badge */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Mobile Sidebar Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setAdminSidebarOpen(prev => !prev)}
              className="p-1.5 -ml-1 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800 md:hidden transition flex items-center justify-center"
              title={adminLanguage === 'bn' ? 'মেনু খুলুন/বন্ধ করুন' : 'Toggle Menu'}
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white font-bold shadow">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm sm:text-base tracking-tight text-white leading-tight">
                  AmarChoice <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 hidden sm:inline">{t.adminLabel}</span>
                </span>
                <span className="text-[10px] text-stone-400 font-mono leading-none">{t.mypanelUrl}</span>
              </div>
            </div>

            {/* Quick Live Preview button for store owner */}
            <button
              type="button"
              onClick={() => setViewMode('customer')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition"
              title={adminLanguage === 'bn' ? 'কাস্টমারদের জন্য লাইভ অন-পেইজ দেখুন' : 'View live customer landing page'}
            >
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">{t.livePreview}</span>
              <span className="sm:hidden">{t.previewShort}</span>
            </button>
          </div>

          {/* Right Section: User details & Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Switcher hidden per user request */}

            {/* User Profile Badge */}
            {currentUser && (
              <div className="flex items-center gap-2 bg-stone-800/80 px-2.5 py-1 rounded-xl border border-stone-700/80 text-xs">
                <div className="w-6 h-6 rounded-full bg-rose-600/80 text-white flex items-center justify-center font-bold text-[10px]">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:block text-left">
                  <div className="font-bold text-stone-200 leading-tight truncate max-w-[110px]">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-amber-400 leading-none">
                    {currentUser.role === 'superadmin' ? t.superadmin : t.manager}
                  </div>
                </div>
              </div>
            )}

            {/* Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 bg-rose-900/40 hover:bg-rose-900/80 text-rose-200 border border-rose-800/60 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs"
              title={t.logout}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.logout}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
