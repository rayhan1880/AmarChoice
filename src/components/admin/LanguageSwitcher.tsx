import { useApp } from '../../context/AppContext.tsx';
import { Globe } from 'lucide-react';

interface LanguageSwitcherProps {
  variant?: 'navbar' | 'sidebar' | 'pill';
}

export default function LanguageSwitcher({ variant = 'navbar' }: LanguageSwitcherProps) {
  const { adminLanguage, setAdminLanguage } = useApp();

  if (variant === 'sidebar') {
    return (
      <div className="bg-stone-50 border border-stone-200 rounded-xl p-2.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-stone-600 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-stone-500" />
            <span>{adminLanguage === 'bn' ? 'প্যানেলের ভাষা' : 'Panel Language'}</span>
          </span>
          <span className="text-[10px] font-semibold text-rose-600 uppercase font-mono">
            {adminLanguage === 'bn' ? 'বাংলা' : 'EN'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 bg-stone-200/80 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setAdminLanguage('bn')}
            className={`py-1 px-2 rounded-md text-xs font-bold transition-all text-center ${
              adminLanguage === 'bn'
                ? 'bg-white text-rose-700 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            বাংলা
          </button>
          <button
            type="button"
            onClick={() => setAdminLanguage('en')}
            className={`py-1 px-2 rounded-md text-xs font-bold transition-all text-center ${
              adminLanguage === 'en'
                ? 'bg-white text-rose-700 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            English
          </button>
        </div>
      </div>
    );
  }

  // Navbar variant (compact, elegant pill)
  return (
    <div
      className="flex items-center gap-1 bg-stone-800/90 hover:bg-stone-800 border border-stone-700 p-0.5 rounded-lg text-xs transition"
      title={adminLanguage === 'bn' ? 'ভাষা পরিবর্তন করুন (বাংলা / English)' : 'Switch Language (Bangla / English)'}
    >
      <div className="px-1.5 text-stone-400 hidden sm:flex items-center">
        <Globe className="w-3.5 h-3.5" />
      </div>
      <button
        type="button"
        onClick={() => setAdminLanguage('bn')}
        className={`px-2 py-1 rounded text-xs font-bold transition-all ${
          adminLanguage === 'bn'
            ? 'bg-rose-600 text-white shadow-xs'
            : 'text-stone-300 hover:text-white hover:bg-stone-700/60'
        }`}
        aria-label="বাংলা ভাষায় পরিবর্তন করুন"
      >
        বাং
      </button>
      <button
        type="button"
        onClick={() => setAdminLanguage('en')}
        className={`px-2 py-1 rounded text-xs font-bold transition-all ${
          adminLanguage === 'en'
            ? 'bg-rose-600 text-white shadow-xs'
            : 'text-stone-300 hover:text-white hover:bg-stone-700/60'
        }`}
        aria-label="Switch to English"
      >
        EN
      </button>
    </div>
  );
}
