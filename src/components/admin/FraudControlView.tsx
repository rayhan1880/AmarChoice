import { useState, FormEvent } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { translations } from '../../utils/translations.ts';
import {
  ShieldAlert,
  ShieldCheck,
  UserX,
  Plus,
  Trash2,
  Search,
  AlertTriangle,
  Lock,
  CheckCircle2,
  RefreshCw,
  Phone,
  User,
  Sliders,
  Sparkles,
  Globe,
  Laptop,
  Network
} from 'lucide-react';

export default function FraudControlView() {
  const { fraudControl, updateFraudControl, blockCustomer, unblockCustomer, blockIp, unblockIp, adminLanguage } = useApp();
  const t = translations[adminLanguage] || translations.bn;
  const isBn = adminLanguage === 'bn';

  // Config form state
  const [enableDailyLimit, setEnableDailyLimit] = useState(fraudControl.enableDailyLimit ?? true);
  const [maxOrdersPerDay, setMaxOrdersPerDay] = useState(fraudControl.maxOrdersPerDay ?? 2);
  const [autoBlockOnExceed, setAutoBlockOnExceed] = useState(fraudControl.autoBlockOnExceed ?? true);
  const [enableIpBlocking, setEnableIpBlocking] = useState(fraudControl.enableIpBlocking ?? true);
  const [blockDurationDays, setBlockDurationDays] = useState(fraudControl.blockDurationDays ?? 30);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configSuccessMsg, setConfigSuccessMsg] = useState(false);

  // Sub tab for list view: 'phones' vs 'ips'
  const [activeListTab, setActiveListTab] = useState<'phones' | 'ips'>('phones');

  // Manual block form modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'phone' | 'ip'>('phone');
  const [newPhone, setNewPhone] = useState('');
  const [newIp, setNewIp] = useState('');
  const [newName, setNewName] = useState('');
  const [newReason, setNewReason] = useState('');
  const [blockError, setBlockError] = useState<string | null>(null);
  const [isBlocking, setIsBlocking] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  const handleSaveSettings = async () => {
    try {
      setIsSavingConfig(true);
      await updateFraudControl({
        enableDailyLimit,
        maxOrdersPerDay: Number(maxOrdersPerDay) || 2,
        autoBlockOnExceed,
        enableIpBlocking,
        blockDurationDays: Number(blockDurationDays) || 30
      });
      setConfigSuccessMsg(true);
      setTimeout(() => setConfigSuccessMsg(false), 3000);
    } catch (err) {
      console.error('Failed to save fraud control config:', err);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleManualBlock = async (e: FormEvent) => {
    e.preventDefault();
    setBlockError(null);
    setIsBlocking(true);

    try {
      if (modalType === 'phone') {
        if (!newPhone.trim()) {
          setBlockError(isBn ? 'মোবাইল নাম্বার দিন' : 'Phone number is required');
          setIsBlocking(false);
          return;
        }
        await blockCustomer({
          phone: newPhone.trim(),
          name: newName.trim() || undefined,
          ip: newIp.trim() || undefined,
          reason: newReason.trim() || (isBn ? 'অ্যাডমিন কর্তৃক ম্যানুয়ালি ব্লক করা হয়েছে' : 'Manually blocked by admin')
        });
      } else {
        if (!newIp.trim()) {
          setBlockError(isBn ? 'আইপি (IP) ঠিকানা দিন' : 'IP address is required');
          setIsBlocking(false);
          return;
        }
        await blockIp({
          ip: newIp.trim(),
          name: newName.trim() || undefined,
          associatedPhone: newPhone.trim() || undefined,
          reason: newReason.trim() || (isBn ? 'অ্যাডমিন কর্তৃক আইপি ম্যানুয়ালি ব্লক করা হয়েছে' : 'Manually blocked IP by admin')
        });
      }

      setNewPhone('');
      setNewIp('');
      setNewName('');
      setNewReason('');
      setIsAddModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error blocking';
      setBlockError(msg);
    } finally {
      setIsBlocking(false);
    }
  };

  const blockedPhonesList = fraudControl.blockedPhones || [];
  const blockedIpsList = fraudControl.blockedIps || [];

  const filteredBlockedPhones = blockedPhonesList.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.phone.toLowerCase().includes(q) ||
      (item.name && item.name.toLowerCase().includes(q)) ||
      (item.ip && item.ip.toLowerCase().includes(q))
    );
  });

  const filteredBlockedIps = blockedIpsList.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.ip.toLowerCase().includes(q) ||
      (item.associatedPhone && item.associatedPhone.toLowerCase().includes(q)) ||
      (item.name && item.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
          <ShieldAlert className="w-64 h-64 text-white" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-semibold mb-3">
            <Lock className="w-3.5 h-3.5" />
            {isBn ? 'স্মার্ট ফেক অর্ডার ও আইপি ফ্রড সুরক্ষা' : 'Smart Fraud & IP Protection System'}
          </div>
          <h2 className="text-2xl font-bold">
            {isBn ? 'কাস্টমার অর্ডার লিমিট ও আইপি অটো-ব্লক' : 'Customer Order Limit & IP Auto-Block'}
          </h2>
          <p className="text-white/90 text-sm mt-1 leading-relaxed">
            {isBn
              ? 'যদি কোনো কাস্টমার অতিরিক্ত ভুয়া বা ফেক অর্ডার করার চেষ্টা করে, সিস্টেম স্বয়ংক্রিয়ভাবে তার মোবাইল নাম্বার এবং আইপি (IP) ঠিকানা দুটিই ব্লক করে দেবে যাতে একই ডিভাইস থেকে আর কোনো অর্ডার দেওয়া সম্ভব না হয়।'
              : 'Automatically detect repeated abusive or fake orders and block both the customer phone number and client IP address to prevent further checkout attempts.'}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">{isBn ? 'দৈনিক অর্ডার লিমিট' : 'Daily Limit Per Customer'}</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {enableDailyLimit ? `${maxOrdersPerDay} ${isBn ? 'টি' : 'orders'}` : (isBn ? 'সীমাহীন' : 'Unlimited')}
            </h3>
            <span className={`inline-block text-[11px] font-semibold mt-1 px-2 py-0.5 rounded-full ${enableDailyLimit ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
              {enableDailyLimit ? (isBn ? 'লিমিট সক্রিয়' : 'Limit Active') : (isBn ? 'বন্ধ' : 'Disabled')}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Sliders className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">{isBn ? 'আইপি ও নাম্বার অটো-ব্লক' : 'Auto-Block System'}</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {autoBlockOnExceed ? (isBn ? 'সক্রিয়' : 'Enabled') : (isBn ? 'নিষ্ক্রিয়' : 'Disabled')}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              {isBn ? `সীমা পার হলে ফোন ও আইপি ব্লক` : 'Blocks IP + Phone on exceed'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">{isBn ? 'ব্লকড মোবাইল নাম্বার' : 'Blocked Numbers'}</p>
            <h3 className="text-2xl font-bold text-red-600 mt-1">
              {blockedPhonesList.length} {isBn ? 'টি' : 'numbers'}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              {isBn ? 'অর্ডার ব্লক করা নাম্বার' : 'Phone checkouts blocked'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <Phone className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">{isBn ? 'ব্লকড আইপি ঠিকানা' : 'Blocked IP Addresses'}</p>
            <h3 className="text-2xl font-bold text-indigo-600 mt-1">
              {blockedIpsList.length} {isBn ? 'টি' : 'IPs'}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              {isBn ? 'ডিভাইস বা নেটওয়ার্ক ব্লক' : 'Device/Network blocked'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Globe className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-rose-600" />
              {isBn ? 'দৈনিক অর্ডার সীমা ও অটো-ব্লক কনফিগারেশন' : 'Order Limits & Auto-Block Rules'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isBn
                ? 'একজন গ্রাহক দিনে সর্বোচ্চ কতবার অর্ডার করতে পারবে এবং লিমিট পার হলে সিস্টেম স্বয়ংক্রিয়ভাবে তার নাম্বার ও আইপি ব্লক করবে কিনা তা নিয়ন্ত্রণ করুন।'
                : 'Configure rules for maximum allowed orders and auto-blocking abusers by phone and IP.'}
            </p>
          </div>
          {configSuccessMsg && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {isBn ? 'সেটিংস সফলভাবে সংরক্ষিত হয়েছে!' : 'Settings updated successfully!'}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Daily Limit Enable Toggle */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 flex items-start justify-between">
            <div>
              <label className="text-sm font-semibold text-slate-900 block">
                {isBn ? 'দৈনিক অর্ডার লিমিট সক্রিয় করুন' : 'Enable Daily Order Limit'}
              </label>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                {isBn
                  ? 'এটি সক্রিয় থাকলে যেকোনো কাস্টমার একই ফোন নাম্বার বা ডিভাইস দিয়ে ২৪ ঘণ্টায় নির্ধারিত সংখ্যার বেশি অর্ডার করতে পারবে না।'
                  : 'Restrict how many orders a single customer can place within a 24-hour window.'}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enableDailyLimit}
                onChange={e => setEnableDailyLimit(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
            </label>
          </div>

          {/* Max Orders Input */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
            <label className="text-sm font-semibold text-slate-900 block">
              {isBn ? 'প্রতি কাস্টমার দিনে সর্বোচ্চ অর্ডার (Max Orders)' : 'Max Orders Per Customer / Day'}
            </label>
            <p className="text-xs text-slate-500 mt-1">
              {isBn ? 'একদিনে এর বেশি অর্ডার করার চেষ্টা করলে গ্রাহককে বাধা দেওয়া হবে।' : 'Maximum allowed orders before action is taken.'}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="20"
                value={maxOrdersPerDay}
                onChange={e => setMaxOrdersPerDay(Math.max(1, parseInt(e.target.value) || 1))}
                disabled={!enableDailyLimit}
                className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-bold text-center bg-white disabled:opacity-50"
              />
              <span className="text-sm font-medium text-slate-600">{isBn ? 'টি অর্ডার / দিন' : 'orders / day'}</span>
              <span className="text-xs text-slate-400">({isBn ? 'ডিফল্ট: ২ টি' : 'default: 2'})</span>
            </div>
          </div>

          {/* Auto Block on Exceed (Phone & IP) */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 flex items-start justify-between">
            <div>
              <label className="text-sm font-semibold text-slate-900 block">
                {isBn ? 'সীমা অতিক্রম করলে ফোন ও আইপি অটো-ব্লক' : 'Auto-Block Phone & IP on Exceed'}
              </label>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                {isBn
                  ? 'গ্রাহক যদি নির্ধারিত সীমার বেশি অর্ডার করে, তবে সিস্টেম সাথে সাথে তার মোবাইল নাম্বার এবং আইপি ব্লক করবে।'
                  : 'Automatically block both phone number and IP address when customer exceeds order limit.'}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoBlockOnExceed}
                onChange={e => setAutoBlockOnExceed(e.target.checked)}
                disabled={!enableDailyLimit}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600 disabled:opacity-50"></div>
            </label>
          </div>

          {/* IP Blocking Toggle */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 flex items-start justify-between">
            <div>
              <label className="text-sm font-semibold text-slate-900 block">
                {isBn ? 'আইপি ফিল্টারিং ও ডিভাইস ব্লকিং সক্রিয়' : 'Enforce IP Address Blocking'}
              </label>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                {isBn
                  ? 'ব্লকড আইপি থেকে অন্য মোবাইল নাম্বার দিয়েও ভুয়া অর্ডার করার চেষ্টা করলে চেকআউট আটকে দেওয়া হবে।'
                  : 'Prevents checkout attempts from blocked IPs even if another phone number is typed.'}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enableIpBlocking}
                onChange={e => setEnableIpBlocking(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={isSavingConfig}
            className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-sm shadow-sm transition flex items-center gap-2"
          >
            {isSavingConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {isBn ? 'সেটিংস সংরক্ষণ করুন' : 'Save Rules'}
          </button>
        </div>
      </div>

      {/* Blocked List Section with Sub-Tabs (Phones vs IPs) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header with Sub-tabs and Search */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <UserX className="w-5 h-5 text-red-600" />
              {isBn ? 'ব্লকলিস্ট ডেটাবেস' : 'Blocklist Database'}
            </h3>
            {/* Tab switchers */}
            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit">
              <button
                type="button"
                onClick={() => setActiveListTab('phones')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeListTab === 'phones'
                    ? 'bg-white text-rose-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{isBn ? 'মোবাইল নাম্বার' : 'Phone Numbers'}</span>
                <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded-full text-[10px] font-bold">
                  {blockedPhonesList.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveListTab('ips')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeListTab === 'ips'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{isBn ? 'আইপি এড্রেস' : 'IP Addresses'}</span>
                <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded-full text-[10px] font-bold">
                  {blockedIpsList.length}
                </span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={
                  activeListTab === 'phones'
                    ? (isBn ? 'নাম্বার, নাম বা আইপি দিয়ে খুঁজুন...' : 'Search by phone, name, IP...')
                    : (isBn ? 'আইপি বা ফোন দিয়ে খুঁজুন...' : 'Search by IP or phone...')
                }
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl w-48 sm:w-64 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            {/* Manual Block Button */}
            <button
              type="button"
              onClick={() => {
                setModalType(activeListTab === 'ips' ? 'ip' : 'phone');
                setIsAddModalOpen(true);
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              {activeListTab === 'ips'
                ? (isBn ? 'ম্যানুয়াল আইপি ব্লক' : 'Block IP')
                : (isBn ? 'ম্যানুয়াল নাম্বার ব্লক' : 'Block Phone')}
            </button>
          </div>
        </div>

        {/* TAB 1: BLOCKED PHONES */}
        {activeListTab === 'phones' && (
          <div>
            {filteredBlockedPhones.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck className="w-8 h-8 text-emerald-600" />
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  {searchQuery ? (isBn ? 'কোনো নাম্বার পাওয়া যায়নি' : 'No matches found') : (isBn ? 'ব্লকলিস্টে কোনো নাম্বার নেই' : 'No blocked numbers currently')}
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {isBn
                    ? 'গ্রাহক দৈনিক অর্ডারের সীমা অতিক্রম করলে সিস্টেম স্বয়ংক্রিয়ভাবে তার নাম্বার এখানে যুক্ত করবে।'
                    : 'Customer numbers will automatically appear here if they exceed order limits.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3.5">{isBn ? 'গ্রাহকের নাম্বার ও নাম' : 'Phone & Customer'}</th>
                      <th className="px-6 py-3.5">{isBn ? 'ক্যাপচারকৃত আইপি' : 'Captured IP'}</th>
                      <th className="px-6 py-3.5">{isBn ? 'ব্লকের কারণ' : 'Reason'}</th>
                      <th className="px-6 py-3.5">{isBn ? 'ব্লক টাইপ' : 'Blocked By'}</th>
                      <th className="px-6 py-3.5">{isBn ? 'তারিখ ও সময়' : 'Date & Time'}</th>
                      <th className="px-6 py-3.5 text-right">{isBn ? 'অ্যাকশন' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBlockedPhones.map(b => (
                      <tr key={b.id || b.phone} className="hover:bg-slate-50/60 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs">
                              <Phone className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 font-mono text-sm">{b.phone}</p>
                              <p className="text-slate-500 text-[11px]">{b.name || (isBn ? 'অজানা গ্রাহক' : 'Unknown Customer')}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {b.ip ? (
                            <span className="inline-flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                              <Globe className="w-3 h-3 text-indigo-500" />
                              {b.ip}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs italic">{isBn ? 'সংরক্ষিত নেই' : 'N/A'}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-red-50 text-red-700 border border-red-100">
                            <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
                            {b.reason || (isBn ? 'অর্ডার সীমা অতিক্রম' : 'Order Limit Exceeded')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              b.blockedBy === 'system'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-purple-100 text-purple-800 border border-purple-200'
                            }`}
                          >
                            {b.blockedBy === 'system'
                              ? (isBn ? '⚡ অটো-সিস্টেম (Auto)' : '⚡ System Auto')
                              : (isBn ? '👤 অ্যাডমিন (Admin)' : '👤 Admin Manual')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                          {new Date(b.blockedAt).toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(isBn ? `আপনি কি ${b.phone} নাম্বারটি আনব্লক করতে চান?` : `Unblock ${b.phone}?`)) {
                                unblockCustomer(b.phone);
                              }
                            }}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            {isBn ? 'আনব্লক করুন' : 'Unblock'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BLOCKED IPS */}
        {activeListTab === 'ips' && (
          <div>
            {filteredBlockedIps.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Globe className="w-8 h-8 text-indigo-500" />
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  {searchQuery ? (isBn ? 'কোনো আইপি পাওয়া যায়নি' : 'No IP matches found') : (isBn ? 'ব্লকলিস্টে কোনো আইপি ঠিকানা নেই' : 'No blocked IP addresses')}
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {isBn
                    ? 'গ্রাহক একের পর এক ফেক অর্ডার দিলে সিস্টেম স্বয়ংক্রিয়ভাবে তার নেটওয়ার্ক আইপি ব্লক করে এখানে যুক্ত করে।'
                    : 'System automatically bans customer IPs upon abusive fake order attempts.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3.5">{isBn ? 'আইপি (IP) ঠিকানা' : 'IP Address'}</th>
                      <th className="px-6 py-3.5">{isBn ? 'সংযুক্ত মোবাইল ও নাম' : 'Associated Phone'}</th>
                      <th className="px-6 py-3.5">{isBn ? 'ব্লকের কারণ' : 'Reason'}</th>
                      <th className="px-6 py-3.5">{isBn ? 'ব্লক টাইপ' : 'Blocked By'}</th>
                      <th className="px-6 py-3.5">{isBn ? 'তারিখ ও সময়' : 'Date & Time'}</th>
                      <th className="px-6 py-3.5 text-right">{isBn ? 'অ্যাকশন' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBlockedIps.map(item => (
                      <tr key={item.id || item.ip} className="hover:bg-slate-50/60 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                              <Globe className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 font-mono text-sm flex items-center gap-1.5">
                                {item.ip}
                              </p>
                              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Network className="w-3 h-3" />
                                {isBn ? 'নেটওয়ার্ক / ডিভাইস' : 'Network Client'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {item.associatedPhone ? (
                            <div>
                              <p className="font-mono font-bold text-slate-800 text-xs">{item.associatedPhone}</p>
                              {item.name && <p className="text-slate-400 text-[11px]">{item.name}</p>}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-xs">{item.name || (isBn ? 'অজানা' : 'N/A')}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-red-50 text-red-700 border border-red-100">
                            <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
                            {item.reason || (isBn ? 'অটো-সিস্টেম আইপি ব্লক' : 'IP Auto-Banned')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              item.blockedBy === 'system'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-purple-100 text-purple-800 border border-purple-200'
                            }`}
                          >
                            {item.blockedBy === 'system'
                              ? (isBn ? '⚡ অটো-সিস্টেম (Auto)' : '⚡ System Auto')
                              : (isBn ? '👤 অ্যাডমিন (Admin)' : '👤 Admin Manual')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                          {new Date(item.blockedAt).toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(isBn ? `আপনি কি ${item.ip} আইপিটি আনব্লক করতে চান?` : `Unblock IP ${item.ip}?`)) {
                                unblockIp(item.ip);
                              }
                            }}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            {isBn ? 'আনব্লক করুন' : 'Unblock IP'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual Block Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserX className="w-5 h-5 text-red-600" />
                {modalType === 'phone'
                  ? (isBn ? 'নতুন মোবাইল নাম্বার ব্লক করুন' : 'Block Customer Phone')
                  : (isBn ? 'নতুন আইপি (IP) ঠিকানা ব্লক করুন' : 'Block IP Address')}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal type switcher */}
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-4">
              <button
                type="button"
                onClick={() => setModalType('phone')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  modalType === 'phone'
                    ? 'bg-white text-rose-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{isBn ? 'মোবাইল নাম্বার' : 'Phone'}</span>
              </button>
              <button
                type="button"
                onClick={() => setModalType('ip')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  modalType === 'ip'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{isBn ? 'আইপি এড্রেস' : 'IP Address'}</span>
              </button>
            </div>

            {blockError && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                {blockError}
              </div>
            )}

            <form onSubmit={handleManualBlock} className="space-y-4">
              {modalType === 'phone' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isBn ? 'গ্রাহকের মোবাইল নাম্বার *' : 'Customer Phone Number *'}
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="017XXXXXXXX"
                        value={newPhone}
                        onChange={e => setNewPhone(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isBn ? 'কাস্টমারের আইপি এড্রেস (ঐচ্ছিক)' : 'Customer IP (Optional)'}
                    </label>
                    <div className="relative">
                      <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="যেমন: 103.205.71.18"
                        value={newIp}
                        onChange={e => setNewIp(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isBn ? 'আইপি (IP) ঠিকানা *' : 'IP Address *'}
                    </label>
                    <div className="relative">
                      <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="যেমন: 103.205.71.18"
                        value={newIp}
                        onChange={e => setNewIp(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isBn ? 'সংযুক্ত ফোন নাম্বার (যদি থাকে)' : 'Associated Phone (Optional)'}
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="017XXXXXXXX"
                        value={newPhone}
                        onChange={e => setNewPhone(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBn ? 'গ্রাহক বা ডিভাইসের নাম (ঐচ্ছিক)' : 'Customer / Device Name (Optional)'}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={isBn ? 'যেমন: সন্দেহভাজন ফেক ক্রেতা' : 'e.g. Suspicious User'}
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBn ? 'ব্লকের কারণ' : 'Reason for Blocking'}
                </label>
                <textarea
                  rows={2}
                  placeholder={isBn ? 'যেমন: বারবার ভুয়া অর্ডার দিয়ে পণ্য রিটার্ন করে...' : 'e.g. Repeated fake checkout attempts'}
                  value={newReason}
                  onChange={e => setNewReason(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isBlocking}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-sm"
                >
                  {isBlocking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserX className="w-3.5 h-3.5" />}
                  {isBn ? 'ব্লক কনফার্ম করুন' : 'Confirm Block'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
