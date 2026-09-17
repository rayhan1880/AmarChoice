import { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import {
  ShoppingBag,
  Clock,
  Truck,
  TrendingUp,
  Layers,
  ArrowRight,
  Plus,
  MessageSquare,
  Trash2,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { translations, toLocalizedNumber, toLocalizedCurrency } from '../../utils/translations.ts';

export default function DashboardOverview() {
  const {
    orders,
    landingPages,
    incompleteOrders,
    settings,
    clearDemoData,
    setAdminTab,
    adminLanguage
  } = useApp();

  const [showClearModal, setShowClearModal] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearDemoPagesOption, setClearDemoPagesOption] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const t = translations[adminLanguage];
  const isBn = adminLanguage === 'bn';

  const isDemoActive = !settings.isDemoDataRemoved;

  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const inCourierOrders = orders.filter(o => o.status === 'in_courier').length;

  const totalRevenue = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.grandTotal, 0);

  // Group orders by landing page
  const pageStats = landingPages.map(page => {
    const pageOrders = orders.filter(o => o.landingPageId === page.id);
    const rev = pageOrders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.grandTotal, 0);
    return {
      page,
      ordersCount: pageOrders.length,
      revenue: rev
    };
  });

  const handleClearDemoData = async () => {
    try {
      setClearing(true);
      await clearDemoData({
        clearOrders: true,
        clearIncomplete: true,
        clearDemoPages: clearDemoPagesOption
      });
      setShowClearModal(false);
      setToastMessage(
        isBn
          ? 'সকল ডেমো ডাটা স্থায়ীভাবে মুছে ফেলা হয়েছে! এখন থেকে শুধুমাত্র আপনার নিজস্ব আসল ডাটা থাকবে এবং আর কোনো ডেমো ডাটা রিলোড হবে না।'
          : 'All demo data permanently removed! Live mode active, demo data will never reload.'
      );
      setTimeout(() => setToastMessage(null), 6000);
    } catch (err) {
      console.error(err);
      alert(isBn ? 'মুছে ফেলতে ব্যর্থ হয়েছে' : 'Failed to clear demo data');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-stone-400 hover:text-stone-600 font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Live Mode / Demo Data Status Banner */}
      {isDemoActive ? (
        <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-stone-900 text-sm">
                  {isBn ? 'স্টোর মোড: ডেমো ডাটা সক্রিয়' : 'Store Mode: Demo Data Active'}
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 font-bold text-[10px]">
                  {isBn ? 'টেস্ট মোড' : 'Test Mode'}
                </span>
              </div>
              <p className="text-xs text-stone-600 mt-1 max-w-2xl leading-relaxed">
                {isBn
                  ? 'আপনার স্টোরে বর্তমানে ডেমো/টেস্ট অর্ডার রয়েছে। আপনার আসল ব্যবসা ও গ্রাহকদের ডাটা নির্ভুলভাবে যুক্ত করতে এক ক্লিকে সব ডেমো ডাটা মুছে ফেলুন। একবার মুছে ফেললে আর কখনোই কোনো ডেমো ডাটা আসবে না।'
                  : 'Your store currently has sample demo orders and leads. Clear demo data once to switch to live production mode permanently.'}
              </p>
            </div>
          </div>

          <div className="w-full sm:w-auto flex items-center justify-start sm:justify-center shrink-0 pt-1 sm:pt-0">
            <button
              type="button"
              onClick={() => setShowClearModal(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isBn ? '🗑️ ডেমো ডাটা মুছুন (লাইভ করুন)' : '🗑️ Clear Demo Data'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2 text-emerald-900 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {isBn
                ? '✅ লাইভ প্রোডাকশন মোড সক্রিয়: ডেমো ডাটা স্থায়ীভাবে বন্ধ আছে। এখন শুধুমাত্র আপনার আসল ডাটা সংরক্ষিত হচ্ছে।'
                : '✅ Live Production Mode Active: Demo data is permanently disabled. Only real customer data is active.'}
            </span>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full shrink-0">
            {isBn ? 'লাইভ মোড' : 'LIVE'}
          </span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Orders */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-stone-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between min-h-[105px] sm:min-h-[115px]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-semibold text-stone-500 truncate" title={t.dashTotalOrders}>
              {t.dashTotalOrders}
            </span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl lg:text-3xl font-black text-stone-900 tracking-tight">
              {toLocalizedNumber(totalOrders, adminLanguage)}
            </span>
            <span className="text-[11px] sm:text-xs font-medium text-stone-400">
              {t.dashOrdersUnit}
            </span>
          </div>
        </div>

        {/* Pending Orders */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-stone-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between min-h-[105px] sm:min-h-[115px]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-semibold text-stone-500 truncate" title={t.dashPendingOrders}>
              {t.dashPendingOrders}
            </span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl lg:text-3xl font-black text-amber-600 tracking-tight">
              {toLocalizedNumber(pendingOrders, adminLanguage)}
            </span>
            <span className="text-[11px] sm:text-xs font-medium text-amber-600/70">
              {t.dashOrdersUnit}
            </span>
          </div>
        </div>

        {/* In Courier */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-stone-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between min-h-[105px] sm:min-h-[115px]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-semibold text-stone-500 truncate" title={t.dashInCourier}>
              {t.dashInCourier}
            </span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl lg:text-3xl font-black text-indigo-600 tracking-tight">
              {toLocalizedNumber(inCourierOrders, adminLanguage)}
            </span>
            <span className="text-[11px] sm:text-xs font-medium text-indigo-600/70">
              {t.dashOrdersUnit}
            </span>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-stone-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between min-h-[105px] sm:min-h-[115px]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-semibold text-stone-500 truncate" title={t.dashTotalRevenue}>
              {t.dashTotalRevenue}
            </span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl lg:text-3xl font-black text-emerald-600 tracking-tight">
              {toLocalizedCurrency(totalRevenue, adminLanguage)}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Action Banner */}
      <div className="bg-gradient-to-r from-stone-900 to-stone-800 text-white p-6 rounded-2xl shadow flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold">
            {adminLanguage === 'bn' ? 'অন-পেইজ ও কুরিয়ার কন্ট্রোল সেন্টার' : 'Landing Pages & Logistics Center'}
          </h3>
          <p className="text-xs text-stone-300 mt-1 max-w-xl">
            {adminLanguage === 'bn'
              ? 'একই অ্যাডমিন প্যানেল থেকে যত খুশি অন-পেইজ তৈরি করুন, Steadfast ও Pathao কুরিয়ারে এন্ট্রি দিন এবং গ্রাহকদের স্বয়ংক্রিয় ট্র্যাকিং SMS পাঠান।'
              : 'Create multiple landing pages, book parcels to Steadfast & Pathao couriers with 1-click, and send automated tracking SMS.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => setAdminTab('pages')}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow"
          >
            <Plus className="w-4 h-4" />
            <span>{adminLanguage === 'bn' ? 'নতুন অন-পেইজ তৈরি' : 'Create New Page'}</span>
          </button>
          <button
            type="button"
            onClick={() => setAdminTab('courier')}
            className="flex items-center gap-1.5 px-4 py-2 bg-stone-700 hover:bg-stone-600 text-white rounded-xl text-xs font-bold transition border border-stone-600"
          >
            <Truck className="w-4 h-4" />
            <span>{t.tabCourier}</span>
          </button>
          <button
            type="button"
            onClick={() => setAdminTab('sms')}
            className="flex items-center gap-1.5 px-4 py-2 bg-stone-700 hover:bg-stone-600 text-white rounded-xl text-xs font-bold transition border border-stone-600"
          >
            <MessageSquare className="w-4 h-4" />
            <span>{t.tabSms}</span>
          </button>
        </div>
      </div>

      {/* Two columns: Performance by Landing Page & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Landing Pages Performance */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-rose-600" />
              <h3 className="font-bold text-sm text-stone-900">{t.dashLandingPerformance}</h3>
            </div>
            <button
              type="button"
              onClick={() => setAdminTab('pages')}
              className="text-xs text-rose-600 font-bold hover:underline"
            >
              {adminLanguage === 'bn' ? 'সব দেখুন' : 'View All'}
            </button>
          </div>

          <div className="space-y-3">
            {pageStats.map(({ page, ordersCount, revenue }) => (
              <div
                key={page.id}
                className="p-3 bg-stone-50 hover:bg-stone-100 transition rounded-xl border border-stone-200 flex items-center justify-between"
              >
                <div className="min-w-0 pr-3">
                  <h4 className="font-bold text-xs text-stone-900 truncate">{page.title}</h4>
                  <p className="text-[11px] text-stone-500 font-mono truncate">/{page.slug}</p>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-bold text-xs text-stone-900 block">
                    {toLocalizedNumber(ordersCount, adminLanguage)} {t.dashOrdersUnit}
                  </span>
                  <span className="text-[11px] text-emerald-700 font-semibold">
                    {toLocalizedCurrency(revenue, adminLanguage)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders List */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-rose-600" />
              <h3 className="font-bold text-sm text-stone-900">{t.dashRecentOrders}</h3>
            </div>
            <button
              type="button"
              onClick={() => setAdminTab('orders')}
              className="text-xs text-rose-600 font-bold hover:underline flex items-center gap-1"
            >
              <span>{t.dashViewAllOrders}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-stone-100 text-xs">
            {orders.slice(0, 5).map(order => (
              <div
                key={order.id}
                onClick={() => setAdminTab('orders')}
                className="py-3 flex items-center justify-between gap-3 hover:bg-stone-50 rounded-lg px-2 transition cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-900 font-mono">{order.id}</span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold text-[10px] border border-rose-200 truncate max-w-[120px]">
                      {order.landingPageTitle}
                    </span>
                  </div>
                  <p className="text-stone-600 text-[11px] mt-0.5">
                    {order.customerName} ({order.customerPhone})
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-extrabold text-stone-900 text-xs block">
                    {toLocalizedCurrency(order.grandTotal, adminLanguage)}
                  </span>
                  <span className="text-[10px] text-stone-400 capitalize">
                    {order.status === 'in_courier'
                      ? t.dashStatusCourier
                      : order.status === 'delivered'
                      ? t.dashStatusDelivered
                      : order.status === 'pending'
                      ? t.dashStatusPending
                      : order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Clear Demo Data Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  {isBn ? 'সব ডেমো ডাটা মুছে ফেলতে চান?' : 'Clear All Demo Data?'}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  {isBn ? 'লাইভ প্রোডাকশন মোডে প্রবেশ করুন' : 'Switch to live production mode'}
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  {isBn
                    ? 'এটি টেস্ট/ডেমো অর্ডার এবং অসম্পূর্ণ লিডগুলো স্থায়ীভাবে মুছে দেবে যাতে আপনি আসল কাস্টমারদের ডাটা নিয়ে কাজ করতে পারেন।'
                    : 'This will permanently remove all test/demo orders and abandoned checkouts so your reporting only tracks real customers.'}
                </p>
              </div>
            </div>

            <label className="flex items-start gap-3 p-3 rounded-xl bg-stone-50 border border-stone-200 hover:bg-stone-100 transition cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={clearDemoPagesOption}
                onChange={e => setClearDemoPagesOption(e.target.checked)}
                className="mt-0.5 rounded border-stone-300 text-rose-600 focus:ring-rose-500"
              />
              <div>
                <span className="font-semibold text-stone-900 block">
                  {isBn ? 'ডেমো অন-পেইজগুলোও মুছে ফেলুন' : 'Also delete sample landing pages'}
                </span>
                <span className="text-stone-500 text-[11px] block mt-0.5">
                  {isBn
                    ? 'ডেমো ল্যান্ডিং পেইজগুলো বাদ দিয়ে শুধু আপনার নিজস্ব পেইজ রাখতে টিক দিন।'
                    : 'Check this if you only want to keep custom pages created by you.'}
                </span>
              </div>
            </label>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                disabled={clearing}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 transition"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleClearDemoData}
                disabled={clearing}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {clearing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isBn ? 'মুছে ফেলা হচ্ছে...' : 'Clearing...'}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>{isBn ? 'হ্যাঁ, ডেমো মুছুন' : 'Yes, Clear Demo Data'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
