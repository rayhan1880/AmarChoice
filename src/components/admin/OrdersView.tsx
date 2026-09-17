import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { Order, OrderStatus } from '../../types.ts';
import { api } from '../../services/api.ts';
import {
  Search,
  Truck,
  MessageSquare,
  Printer,
  Trash2,
  ChevronRight,
  Filter,
  Eye,
  Phone,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  Calendar,
  CalendarDays,
  CalendarRange,
  X,
  TrendingUp,
  Clock,
  UserCheck,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  Zap,
  XCircle,
  RotateCcw
} from 'lucide-react';
import OrderDetailsModal from './OrderDetailsModal.tsx';
import InvoiceModal from './InvoiceModal.tsx';
import CustomerHistoryModal from './CustomerHistoryModal.tsx';
import { getCustomerHistory, CustomerHistorySummary } from '../../utils/customerHistory.ts';
import { getCourierStatusDisplay, getCourierProviderInfo } from '../../utils/courierStatusHelper.ts';
import {
  translations,
  toLocalizedNumber,
  toLocalizedCurrency,
  toLocalizedDate,
  getLocalizedDayName
} from '../../utils/translations.ts';

type DateFilterMode = 'all' | 'today' | 'yesterday' | 'last7days' | 'thisMonth' | 'last30days' | 'custom';

interface DayStatItem {
  dateKey: string;
  dateObj: Date;
  displayDate: string;
  dayName: string;
  relativeLabel: string | null;
  totalOrders: number;
  totalRevenue: number;
  pendingCount: number;
  inCourierCount: number;
  deliveredCount: number;
  confirmedCount: number;
  cancelledCount: number;
}

const formatDateToKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function OrdersView() {
  const {
    orders,
    landingPages,
    updateOrderStatus,
    deleteOrder,
    refreshAll,
    adminLanguage,
    checkCourierStatus,
    syncAllCouriers,
    clearAllOrders,
    clearDemoData,
    settings
  } = useApp();
  const t = translations[adminLanguage];
  const isBn = adminLanguage === 'bn';

  const [selectedLandingPageId, setSelectedLandingPageId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Date Filtering States
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [showDailyBreakdown, setShowDailyBreakdown] = useState<boolean>(true);

  const [activeOrderForModal, setActiveOrderForModal] = useState<Order | null>(null);
  const [activeOrderForInvoice, setActiveOrderForInvoice] = useState<Order | null>(null);
  const [selectedCustomerSummary, setSelectedCustomerSummary] = useState<CustomerHistorySummary | null>(null);

  const [syncingOrderId, setSyncingOrderId] = useState<string | null>(null);
  const [isSyncingPage, setIsSyncingPage] = useState<boolean>(false);
  const [isSyncingAllCouriers, setIsSyncingAllCouriers] = useState<boolean>(false);
  const [syncingTrackingId, setSyncingTrackingId] = useState<string | null>(null);
  const [syncToast, setSyncToast] = useState<{ success: boolean; message: string } | null>(null);

  // Clear demo data modal state
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearingOrders, setClearingOrders] = useState(false);
  const [alsoClearIncomplete, setAlsoClearIncomplete] = useState(true);

  // Single order courier status live check & auto-sync to order status
  const handleSyncSingleCourier = async (orderId: string) => {
    try {
      setSyncingTrackingId(orderId);
      const updatedStatus = await checkCourierStatus(orderId);
      setSyncToast({
        success: true,
        message: isBn
          ? `কুরিয়ার স্ট্যাটাস (${updatedStatus}) চেক হয়েছে এবং অর্ডারের স্ট্যাটাস স্বয়ংক্রিয়ভাবে আপডেট হয়েছে`
          : `Courier status (${updatedStatus}) checked & order status updated!`
      });
      setTimeout(() => setSyncToast(null), 3500);
    } catch (err: unknown) {
      setSyncToast({
        success: false,
        message: isBn ? 'কুরিয়ার স্ট্যাটাস চেক করা যায়নি' : 'Failed to check courier status'
      });
      setTimeout(() => setSyncToast(null), 3500);
    } finally {
      setSyncingTrackingId(null);
    }
  };

  // Bulk sync all orders with tracking code & auto-update order statuses
  const handleSyncAllCouriers = async () => {
    try {
      setIsSyncingAllCouriers(true);
      const count = await syncAllCouriers();
      setSyncToast({
        success: true,
        message: isBn
          ? `${toLocalizedNumber(count, 'bn')} টি পার্সেলের কুরিয়ার স্ট্যাটাস সিঙ্ক হয়েছে এবং অর্ডারের স্ট্যাটাস স্বয়ংক্রিয় আপডেট হয়েছে`
          : `Successfully synced ${count} courier order(s) and auto-updated their status!`
      });
      setTimeout(() => setSyncToast(null), 4000);
    } catch (err: unknown) {
      setSyncToast({
        success: false,
        message: isBn ? 'কুরিয়ার সিঙ্ক সম্পন্ন হয়নি' : 'Courier bulk sync failed'
      });
      setTimeout(() => setSyncToast(null), 4000);
    } finally {
      setIsSyncingAllCouriers(false);
    }
  };

  const handleSyncSingleOrder = async (orderId: string) => {
    try {
      setSyncingOrderId(orderId);
      const res = await api.syncOrderToSheet(orderId);
      setSyncToast({ success: true, message: res.message });
      setTimeout(() => setSyncToast(null), 3500);
      await refreshAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'গুগল শিটে পাঠানো যায়নি';
      setSyncToast({ success: false, message: msg });
      setTimeout(() => setSyncToast(null), 4000);
    } finally {
      setSyncingOrderId(null);
    }
  };

  const handleSyncAllForFilteredPage = async () => {
    if (selectedLandingPageId === 'all') return;
    try {
      setIsSyncingPage(true);
      const res = await api.syncAllOrdersToSheet(selectedLandingPageId);
      setSyncToast({ success: true, message: res.message });
      setTimeout(() => setSyncToast(null), 4000);
      await refreshAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'সিঙ্ক করা যায়নি';
      setSyncToast({ success: false, message: msg });
      setTimeout(() => setSyncToast(null), 4000);
    } finally {
      setIsSyncingPage(false);
    }
  };

  // Find selected landing page for Google Sheet status
  const currentFilteredPage = useMemo(() => {
    if (selectedLandingPageId === 'all') return null;
    return landingPages.find(p => p.id === selectedLandingPageId);
  }, [landingPages, selectedLandingPageId]);

  // Helper to test if order date is within selected mode
  const isOrderInDateRange = (orderDate: Date, mode: DateFilterMode, customStart: string, customEnd: string): boolean => {
    const now = new Date();
    if (mode === 'all') return true;

    const oYear = orderDate.getFullYear();
    const oMonth = orderDate.getMonth();
    const oDate = orderDate.getDate();

    const nYear = now.getFullYear();
    const nMonth = now.getMonth();
    const nDate = now.getDate();

    if (mode === 'today') {
      return oYear === nYear && oMonth === nMonth && oDate === nDate;
    }

    if (mode === 'yesterday') {
      const yDate = new Date(nYear, nMonth, nDate - 1);
      return oYear === yDate.getFullYear() && oMonth === yDate.getMonth() && oDate === yDate.getDate();
    }

    if (mode === 'last7days') {
      const startOf7DaysAgo = new Date(nYear, nMonth, nDate - 6, 0, 0, 0, 0);
      const endOfToday = new Date(nYear, nMonth, nDate, 23, 59, 59, 999);
      return orderDate >= startOf7DaysAgo && orderDate <= endOfToday;
    }

    if (mode === 'thisMonth') {
      return oYear === nYear && oMonth === nMonth;
    }

    if (mode === 'last30days') {
      const startOf30DaysAgo = new Date(nYear, nMonth, nDate - 29, 0, 0, 0, 0);
      const endOfToday = new Date(nYear, nMonth, nDate, 23, 59, 59, 999);
      return orderDate >= startOf30DaysAgo && orderDate <= endOfToday;
    }

    if (mode === 'custom') {
      if (customStart) {
        const start = new Date(customStart + 'T00:00:00');
        if (orderDate < start) return false;
      }
      if (customEnd) {
        const end = new Date(customEnd + 'T23:59:59.999');
        if (orderDate > end) return false;
      }
      return true;
    }

    return true;
  };

  // Orders matching current search, status, landing page, and date filter mode
  const periodFilteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Filter by landing page
      if (selectedLandingPageId !== 'all' && order.landingPageId !== selectedLandingPageId) {
        return false;
      }
      // Filter by status
      if (selectedStatus !== 'all' && order.status !== selectedStatus) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchId = order.id.toLowerCase().includes(q);
        const matchName = order.customerName.toLowerCase().includes(q);
        const matchPhone = order.customerPhone.includes(q);
        const matchAddress = order.customerAddress.toLowerCase().includes(q);
        const matchPage = order.landingPageTitle.toLowerCase().includes(q);
        if (!matchId && !matchName && !matchPhone && !matchAddress && !matchPage) {
          return false;
        }
      }
      // Date filter mode
      const orderDate = new Date(order.createdAt);
      return isOrderInDateRange(orderDate, dateFilterMode, customStartDate, customEndDate);
    });
  }, [orders, selectedLandingPageId, selectedStatus, searchTerm, dateFilterMode, customStartDate, customEndDate]);

  // Compute daily breakdown ("কোন দিন কত অর্ডার পড়েছে")
  const dailyStats = useMemo<DayStatItem[]>(() => {
    const groups: Record<string, { dateObj: Date; orders: Order[] }> = {};

    periodFilteredOrders.forEach(order => {
      const d = new Date(order.createdAt);
      const key = formatDateToKey(d);
      if (!groups[key]) {
        groups[key] = { dateObj: d, orders: [] };
      }
      groups[key].orders.push(order);
    });

    const now = new Date();
    const todayKey = formatDateToKey(now);
    const yesterdayKey = formatDateToKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));

    const keys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    return keys.map(key => {
      const { dateObj, orders } = groups[key];
      const totalOrders = orders.length;
      const totalRevenue = orders
        .filter(o => o.status !== 'cancelled')
        .reduce((sum, o) => sum + o.grandTotal, 0);

      const pendingCount = orders.filter(o => o.status === 'pending').length;
      const inCourierCount = orders.filter(o => o.status === 'in_courier').length;
      const deliveredCount = orders.filter(o => o.status === 'delivered').length;
      const confirmedCount = orders.filter(o => o.status === 'confirmed').length;
      const cancelledCount = orders.filter(o => o.status === 'cancelled').length;

      let relativeLabel: string | null = null;
      if (key === todayKey) relativeLabel = t.dailyToday;
      else if (key === yesterdayKey) relativeLabel = t.dailyYesterday;

      return {
        dateKey: key,
        dateObj,
        displayDate: toLocalizedDate(dateObj, adminLanguage),
        dayName: getLocalizedDayName(dateObj, adminLanguage),
        relativeLabel,
        totalOrders,
        totalRevenue,
        pendingCount,
        inCourierCount,
        deliveredCount,
        confirmedCount,
        cancelledCount
      };
    });
  }, [periodFilteredOrders, adminLanguage, t.dailyToday, t.dailyYesterday]);

  // Final filtered orders for the table (can further filter down to a specific clicked day)
  const filteredOrders = useMemo(() => {
    if (!selectedDayKey) return periodFilteredOrders;
    return periodFilteredOrders.filter(order => {
      const d = new Date(order.createdAt);
      return formatDateToKey(d) === selectedDayKey;
    });
  }, [periodFilteredOrders, selectedDayKey]);

  // Status badge helper
  const statusColors: Record<OrderStatus, string> = {
    pending: 'bg-amber-100 text-amber-800 border-amber-300',
    confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
    processing: 'bg-purple-100 text-purple-800 border-purple-300',
    in_courier: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    delivered: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    cancelled: 'bg-rose-100 text-rose-800 border-rose-300',
    returned: 'bg-stone-200 text-stone-700 border-stone-300'
  };

  const statusLabels: Record<OrderStatus, string> = {
    pending: t.statusPendingShort,
    confirmed: t.statusConfirmedShort,
    processing: t.statusProcessingShort,
    in_courier: t.statusInCourierShort,
    delivered: t.statusDeliveredShort,
    cancelled: t.statusCancelledShort,
    returned: t.statusReturnedShort
  };

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    updateOrderStatus(orderId, newStatus);
  };

  const handleDelete = (orderId: string) => {
    const confirmMsg = adminLanguage === 'bn'
      ? `আপনি কি সত্যিই অর্ডার ${orderId} মুছে ফেলতে চান?`
      : `Are you sure you want to delete order ${orderId}?`;
    if (window.confirm(confirmMsg)) {
      deleteOrder(orderId);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header & Search / Filters Bar */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-stone-900">{t.ordersTitle}</h2>
            <p className="text-xs text-stone-500">
              {t.ordersSubtitle
                .replace('{total}', toLocalizedNumber(orders.length, adminLanguage))
                .replace('{filtered}', toLocalizedNumber(filteredOrders.length, adminLanguage))}
              {selectedDayKey && ` (${dailyStats.find(d => d.dateKey === selectedDayKey)?.displayDate || selectedDayKey} ${adminLanguage === 'bn' ? 'এর অর্ডার' : 'orders'})`}
            </p>
          </div>

          {/* Quick Stats Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
              {t.statusPendingShort}: {toLocalizedNumber(orders.filter(o => o.status === 'pending').length, adminLanguage)}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold">
              {t.statusInCourierShort}: {toLocalizedNumber(orders.filter(o => o.status === 'in_courier').length, adminLanguage)}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              {t.statusDeliveredShort}: {toLocalizedNumber(orders.filter(o => o.status === 'delivered').length, adminLanguage)}
            </span>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={t.ordersSearchPlaceholder}
              className="w-full pl-9 pr-4 py-2 text-xs border border-stone-300 rounded-xl bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Landing Page Source Filter */}
          <div className="sm:col-span-4 relative">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-stone-500 shrink-0 hidden lg:inline">{t.ordersSourceLabel}</span>
              <select
                value={selectedLandingPageId}
                onChange={e => setSelectedLandingPageId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl bg-stone-50 font-medium focus:ring-2 focus:ring-rose-500"
              >
                <option value="all">{t.ordersAllPages}</option>
                {landingPages.map(page => (
                  <option key={page.id} value={page.id}>
                    {page.pageType === 'ecommerce' ? '🏪 ' : '📄 '} {page.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl bg-stone-50 font-medium focus:ring-2 focus:ring-rose-500"
            >
              <option value="all">{t.statusAll}</option>
              <option value="pending">{t.statusPending}</option>
              <option value="confirmed">{t.statusConfirmed}</option>
              <option value="processing">{t.statusProcessing}</option>
              <option value="in_courier">{t.statusInCourier}</option>
              <option value="delivered">{t.statusDelivered}</option>
              <option value="cancelled">{t.statusCancelled}</option>
              <option value="returned">{t.statusReturned}</option>
            </select>
          </div>
        </div>

        {/* Quick Landing Page Source Filter Tabs */}
        {landingPages.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 text-xs border-t border-stone-100">
            <span className="text-[11px] font-bold text-stone-500 shrink-0 mr-1">{t.ordersFilterByPage}</span>
            <button
              type="button"
              onClick={() => setSelectedLandingPageId('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 ${
                selectedLandingPageId === 'all'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              <span>{t.ordersAllPagesTab}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  selectedLandingPageId === 'all' ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-700'
                }`}
              >
                {toLocalizedNumber(orders.length, adminLanguage)}
              </span>
            </button>
            {landingPages.map(page => {
              const pageOrderCount = orders.filter(o => o.landingPageId === page.id).length;
              const isSelected = selectedLandingPageId === page.id;
              const hasSheet = Boolean(page.googleSheetConfig?.enabled && page.googleSheetConfig?.webhookUrl);
              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => setSelectedLandingPageId(page.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                      : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                  }`}
                  title={`${page.title} (${adminLanguage === 'bn' ? 'অর্ডার' : 'Orders'}: ${pageOrderCount}${hasSheet ? (adminLanguage === 'bn' ? ', গুগল শিট কানেক্টেড' : ', Google Sheet Connected') : ''})`}
                >
                  {hasSheet && (
                    <FileSpreadsheet
                      className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-emerald-300' : 'text-emerald-600'}`}
                    />
                  )}
                  <span className="max-w-[150px] truncate">{page.title}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-700'
                    }`}
                  >
                    {toLocalizedNumber(pageOrderCount, adminLanguage)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Date Filter Bar (Day, Weekly, Monthly, Custom) */}
        <div className="pt-2 border-t border-stone-100 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="flex items-center gap-1 text-[11px] font-bold text-stone-500 mr-1">
                <Calendar className="w-3.5 h-3.5 text-rose-600" />
                <span>{t.dateFilterLabel}</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setDateFilterMode('all');
                  setSelectedDayKey(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  dateFilterMode === 'all'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                }`}
              >
                <span>{t.dateAllTime}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDateFilterMode('today');
                  setSelectedDayKey(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  dateFilterMode === 'today'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                }`}
              >
                <span>{t.dateToday}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDateFilterMode('yesterday');
                  setSelectedDayKey(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  dateFilterMode === 'yesterday'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                }`}
              >
                <span>{t.dateYesterday}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDateFilterMode('last7days');
                  setSelectedDayKey(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  dateFilterMode === 'last7days'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                }`}
              >
                <span>{t.dateLast7Days}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDateFilterMode('thisMonth');
                  setSelectedDayKey(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  dateFilterMode === 'thisMonth'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                }`}
              >
                <span>{t.dateThisMonth}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDateFilterMode('last30days');
                  setSelectedDayKey(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  dateFilterMode === 'last30days'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                }`}
              >
                <span>{t.dateLast30Days}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDateFilterMode('custom');
                  setSelectedDayKey(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  dateFilterMode === 'custom'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                }`}
              >
                <CalendarRange className="w-3.5 h-3.5" />
                <span>{t.dateCustom}</span>
              </button>
            </div>

            {/* Quick summary of period orders */}
            <div className="text-xs text-stone-500 font-medium">
              {t.dateSelectedOrders} <strong className="text-stone-900 font-bold">{toLocalizedNumber(periodFilteredOrders.length, adminLanguage)}</strong> {t.dashOrdersUnit}
            </div>
          </div>

          {/* Custom Date Inputs Box (when custom mode is selected) */}
          {dateFilterMode === 'custom' && (
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-stone-600">{t.dateFrom}</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={e => {
                    setCustomStartDate(e.target.value);
                    setSelectedDayKey(null);
                  }}
                  className="px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-stone-600">{t.dateTo}</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={e => {
                    setCustomEndDate(e.target.value);
                    setSelectedDayKey(null);
                  }}
                  className="px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              {(customStartDate || customEndDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomStartDate('');
                    setCustomEndDate('');
                    setSelectedDayKey(null);
                  }}
                  className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-bold transition flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>{t.dateReset}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Google Sheet Quick Sync Banner for filtered page */}
        {currentFilteredPage?.googleSheetConfig?.enabled && currentFilteredPage.googleSheetConfig.webhookUrl && (
          <div className="mt-3 pt-3 border-t border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-800">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>{currentFilteredPage.title}</strong>-এর জন্য গুগল শিট অটোমেশন চালু রয়েছে
              </span>
            </div>
            <button
              type="button"
              onClick={handleSyncAllForFilteredPage}
              disabled={isSyncingPage}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition disabled:opacity-50 shadow-xs shrink-0 self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingPage ? 'animate-spin' : ''}`} />
              <span>{isSyncingPage ? 'সিঙ্ক হচ্ছে...' : 'এই পেইজের সকল অর্ডার শিটে সিঙ্ক করুন'}</span>
            </button>
          </div>
        )}

        {/* Sync Toast */}
        {syncToast && (
          <div
            className={`mt-3 p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
              syncToast.success
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-rose-50 border-rose-300 text-rose-800'
            }`}
          >
            {syncToast.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{syncToast.message}</span>
          </div>
        )}
      </div>

      {/* Daily Breakdown Section: "কোন দিন কত অর্ডার পড়েছে" */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <span>{t.dailyBreakdownTitle}</span>
                {selectedDayKey && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-semibold border border-rose-200">
                    {t.dailyFilteredBadge}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-stone-500">
                {t.dailyBreakdownSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {selectedDayKey && (
              <button
                type="button"
                onClick={() => setSelectedDayKey(null)}
                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg transition flex items-center gap-1 border border-rose-200"
              >
                <X className="w-3.5 h-3.5" />
                <span>{t.dailyViewAllDays}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowDailyBreakdown(prev => !prev)}
              className="px-2.5 py-1 text-xs font-semibold text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition"
            >
              {showDailyBreakdown ? t.dailyHide : t.dailyShowDetails}
            </button>
          </div>
        </div>

        {showDailyBreakdown && (
          <div>
            {dailyStats.length === 0 ? (
              <div className="py-6 text-center text-stone-400">
                <Calendar className="w-6 h-6 mx-auto mb-1 opacity-40" />
                <p className="text-xs font-medium">{t.dailyNoOrders}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pt-1">
                {dailyStats.map(item => {
                  const isSelected = selectedDayKey === item.dateKey;
                  return (
                    <div
                      key={item.dateKey}
                      onClick={() => {
                        setSelectedDayKey(isSelected ? null : item.dateKey);
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none text-left relative group ${
                        isSelected
                          ? 'bg-rose-50/70 border-rose-400 ring-2 ring-rose-500/20 shadow-xs'
                          : 'bg-stone-50/80 hover:bg-stone-100/90 border-stone-200 hover:border-stone-300'
                      }`}
                      title={`${item.displayDate}`}
                    >
                      {/* Header with relative day badge */}
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-[11px] font-semibold text-stone-500 truncate">
                          {item.dayName}
                        </span>
                        {item.relativeLabel ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-600 text-white shrink-0">
                            {item.relativeLabel}
                          </span>
                        ) : (
                          isSelected && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 shrink-0">
                              {t.dailyFilteredBadge}
                            </span>
                          )
                        )}
                      </div>

                      {/* Date */}
                      <p className="text-xs font-bold text-stone-800 truncate mb-2">
                        {item.displayDate}
                      </p>

                      {/* Order count & revenue */}
                      <div className="flex items-baseline justify-between gap-2 border-t border-stone-200/60 pt-2 mb-2">
                        <div>
                          <span className="text-base font-black text-stone-900 block leading-tight">
                            {toLocalizedNumber(item.totalOrders, adminLanguage)} <span className="text-xs font-medium text-stone-500">{t.dashOrdersUnit}</span>
                          </span>
                          <span className="text-[10px] text-stone-500">{t.dailyOrderCount}</span>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold text-emerald-700 block leading-tight">
                            {toLocalizedCurrency(item.totalRevenue, adminLanguage)}
                          </span>
                          <span className="text-[10px] text-stone-400">{t.dailyTotalRevenue}</span>
                        </div>
                      </div>

                      {/* Mini status tags */}
                      <div className="flex items-center gap-1 flex-wrap text-[10px] pt-1.5 border-t border-stone-200/40">
                        {item.pendingCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-semibold" title={t.statusPending}>
                            {t.statusPendingShort}: {toLocalizedNumber(item.pendingCount, adminLanguage)}
                          </span>
                        )}
                        {item.inCourierCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 font-semibold" title={t.statusInCourier}>
                            {t.statusInCourierShort}: {toLocalizedNumber(item.inCourierCount, adminLanguage)}
                          </span>
                        )}
                        {item.deliveredCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-semibold" title={t.statusDelivered}>
                            {t.statusDeliveredShort}: {toLocalizedNumber(item.deliveredCount, adminLanguage)}
                          </span>
                        )}
                        {item.cancelledCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-semibold" title={t.statusCancelled}>
                            {t.statusCancelledShort}: {toLocalizedNumber(item.cancelledCount, adminLanguage)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        {/* Table Top Toolbar: Status Automation Info & Bulk Courier Sync */}
        <div className="bg-stone-50/90 border-b border-stone-200 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-xs text-stone-600">
            <span className="font-bold text-stone-800">
              {toLocalizedNumber(filteredOrders.length, adminLanguage)} {isBn ? 'টি অর্ডার প্রদর্শিত' : 'orders shown'}
            </span>
            <span className="hidden md:inline-block text-stone-300">•</span>
            <span className="hidden md:flex items-center gap-1 text-[11px] text-stone-600 bg-white px-2 py-0.5 rounded-md border border-stone-200 shadow-2xs">
              <Sparkles className="w-3 h-3 text-amber-500" />
              {isBn ? 'কুরিয়ার স্ট্যাটাস পরিবর্তনের সাথে সাথে অর্ডারের স্ট্যাটাস স্বয়ংক্রিয় আপডেট হয়' : 'Order status syncs automatically with courier tracking updates'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {orders.length > 0 && (
              <button
                type="button"
                onClick={() => setShowClearModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs shadow-2xs transition cursor-pointer"
                title={isBn ? 'সকল টেস্ট/ডেমো অর্ডার মুছে ফেলুন যেন ভবিষ্যতে আর কোনো ডেমো ডাটা না আসে' : 'Clear all demo orders to transition to live data'}
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>{isBn ? '🗑️ ডেমো অর্ডার মুছুন' : '🗑️ Clear Demo Orders'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSyncAllCouriers}
              disabled={isSyncingAllCouriers}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition disabled:opacity-50 cursor-pointer"
              title={isBn ? 'সকল কুরিয়ার পার্সেলের স্ট্যাটাস চেক করে অর্ডারের স্ট্যাটাস স্বয়ংক্রিয় আপডেট করুন' : 'Sync all courier orders & auto-update order statuses'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAllCouriers ? 'animate-spin' : ''}`} />
              <span>{isSyncingAllCouriers ? (isBn ? 'কুরিয়ার সিঙ্ক হচ্ছে...' : 'Syncing...') : (isBn ? '🔄 কুরিয়ার স্ট্যাটাস সিঙ্ক' : '🔄 Sync Courier Status')}</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-600 border-b border-stone-200 uppercase font-bold text-[11px]">
              <tr>
                <th className="py-3 px-4 min-w-[90px] whitespace-nowrap">{t.ordersColIdTime}</th>
                <th className="py-3 px-4 min-w-[130px]">{t.ordersColSource}</th>
                <th className="py-3 px-4 min-w-[185px]">{t.ordersColCustomer}</th>
                <th className="py-3 px-4 min-w-[160px]">{t.ordersColProducts}</th>
                <th className="py-3 px-4 min-w-[110px] whitespace-nowrap">{t.ordersColPrice}</th>
                <th className="py-3 px-4 min-w-[170px] whitespace-nowrap">{t.ordersColStatus}</th>
                <th className="py-3 px-4 min-w-[220px] whitespace-nowrap">{t.ordersColCourier}</th>
                <th className="py-3 px-4 min-w-[115px] whitespace-nowrap">{t.ordersColSheet}</th>
                <th className="py-3 px-4 min-w-[110px] text-right whitespace-nowrap">{t.ordersColActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center">
                    {orders.length === 0 ? (
                      <div className="max-w-md mx-auto space-y-3 px-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 shadow-2xs">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold text-stone-900 text-sm">
                            {isBn ? 'কোনো অর্ডার নেই (লাইভ মোড সক্রিয়)' : 'No Orders Yet (Live Mode Active)'}
                          </p>
                          <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                            {isBn
                              ? 'আপনার স্টোর এখন সম্পূর্ণ লাইভ। আসল কাস্টমার অর্ডার করলে তা সরাসরি এখানে দেখা যাবে। কোনো ডেমো ডাটা আর কখনোই লোড হবে না।'
                              : 'Your store is in live production mode. Real customer orders will appear here automatically. Demo data will never reappear.'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 text-stone-400">
                        <Filter className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="font-semibold text-sm">{t.ordersNoFound}</p>
                        <p className="text-xs">{t.ordersNoFoundSub}</p>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  const custHistory = getCustomerHistory(order.customerPhone, orders, order.customerName);
                  return (
                  <tr
                    key={order.id}
                    className="hover:bg-stone-50/80 transition-colors cursor-pointer"
                    onClick={() => setActiveOrderForModal(order)}
                  >
                    {/* Order ID & Date */}
                    <td className="py-3 px-4">
                      <span className="font-bold text-stone-900 block font-mono">#{order.id}</span>
                      <span className="text-[10px] text-stone-400">
                        {toLocalizedDate(new Date(order.createdAt), adminLanguage)} {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>

                    {/* Source On-Page / E-Commerce Badge */}
                    <td className="py-3 px-4">
                      {order.pageType === 'ecommerce' ? (
                        <span className="inline-flex items-center gap-1 max-w-[150px] truncate px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 font-semibold text-[10px] border border-teal-200" title={order.landingPageTitle}>
                          <span>🏪</span>
                          <span className="truncate">{order.landingPageTitle}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 max-w-[150px] truncate px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold text-[10px] border border-rose-200" title={order.landingPageTitle}>
                          <span>📄</span>
                          <span className="truncate">{order.landingPageTitle}</span>
                        </span>
                      )}
                      <span className="block text-[10px] text-stone-400">/{order.landingPageSlug}</span>
                    </td>

                    {/* Customer Info & History Pill */}
                    <td
                      className="py-3 px-4"
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedCustomerSummary(custHistory);
                      }}
                    >
                      <div
                        className="group/cust p-2 -m-1 rounded-xl hover:bg-rose-50/80 border border-transparent hover:border-rose-200 transition cursor-pointer"
                        title={isBn ? 'কাস্টমারের উপর ক্লিক করে তার সকল অর্ডার ও বিস্তারিত দেখুন' : 'Click to view all orders and details for this customer'}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-stone-900 group-hover/cust:text-rose-700 transition">
                            {order.customerName}
                          </span>
                          <span className="text-[10px] text-rose-600 font-bold opacity-0 group-hover/cust:opacity-100 transition hidden sm:inline">
                            {isBn ? 'বিস্তারিত দেখুন →' : 'Details →'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-stone-500 mt-0.5">
                          <span className="font-mono text-xs text-rose-700 font-semibold">{order.customerPhone}</span>
                          <a
                            href={`tel:${order.customerPhone}`}
                            onClick={e => e.stopPropagation()}
                            className="p-1 hover:text-emerald-600 rounded"
                            title={adminLanguage === 'bn' ? 'কল দিন' : 'Call customer'}
                          >
                            <Phone className="w-3 h-3" />
                          </a>
                        </div>
                        <p className="text-[10px] text-stone-400 truncate max-w-[150px]">{order.customerAddress}</p>

                        {/* Customer Order History Pill (Total, Delivered, Cancelled) */}
                        <div className="mt-1.5 pt-1.5 border-t border-stone-100">
                          <div
                            className="w-full text-left group bg-stone-50 group-hover/cust:bg-white p-1.5 rounded-md border border-stone-200/80 transition"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[10px] font-bold text-stone-800 flex items-center gap-1">
                                <UserCheck className="w-3 h-3 text-stone-500 group-hover/cust:text-rose-600" />
                                {toLocalizedNumber(custHistory.totalOrders, adminLanguage)} {isBn ? 'টি অর্ডার' : 'orders'}
                              </span>
                              {custHistory.trustLevel === 'trusted' && (
                                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/80 px-1 rounded border border-emerald-200">
                                  {isBn ? 'বিশ্বস্ত' : 'Trusted'}
                                </span>
                              )}
                              {custHistory.trustLevel === 'high_risk' && (
                                <span className="text-[9px] font-bold text-rose-700 bg-rose-100/80 px-1 rounded border border-rose-200">
                                  {isBn ? 'ঝুঁকিপূর্ণ' : 'Risk'}
                                </span>
                              )}
                              {custHistory.trustLevel === 'new' && (
                                <span className="text-[9px] font-bold text-amber-800 bg-amber-100/80 px-1 rounded border border-amber-200">
                                  {isBn ? 'নতুন' : 'New'}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] mt-0.5 text-stone-500">
                              <span className="text-emerald-700 font-semibold" title={isBn ? 'ডেলিভারি সম্পন্ন' : 'Delivered'}>
                                ✅ {toLocalizedNumber(custHistory.deliveredOrders, adminLanguage)}
                              </span>
                              <span className="text-rose-600 font-semibold" title={isBn ? 'অর্ডার ক্যানসেল' : 'Cancelled'}>
                                ❌ {toLocalizedNumber(custHistory.cancelledOrders, adminLanguage)}
                              </span>
                              {custHistory.returnedOrders > 0 && (
                                <span className="text-amber-700 font-semibold" title={isBn ? 'পার্সেল রিটার্ন' : 'Returned'}>
                                  🔄 {toLocalizedNumber(custHistory.returnedOrders, adminLanguage)}
                                </span>
                              )}
                              <span className="ml-auto text-[9px] font-bold text-rose-600 group-hover/cust:underline">
                                {isBn ? 'হিস্ট্রি ↗' : 'History ↗'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Items & Sizes */}
                    <td className="py-3 px-4">
                      <div className="space-y-0.5 max-w-[180px]">
                        {order.items.map((it, i) => (
                          <div key={i} className="text-[11px] text-stone-700 truncate">
                            <strong>{toLocalizedNumber(it.quantity, adminLanguage)}x</strong> {it.variantName}{' '}
                            <span className="text-stone-500">
                              ({it.size}{it.long ? `${adminLanguage === 'bn' ? ', লং' : ', Length'}: ${it.long}"` : ''})
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Price & Delivery */}
                    <td className="py-3 px-4">
                      <span className="font-bold text-sm text-stone-900 block">{toLocalizedCurrency(order.grandTotal, adminLanguage)}</span>
                      <span className="text-[10px] text-stone-500">
                        {adminLanguage === 'bn' ? 'ডেলিভারি' : 'Delivery'}: {order.deliveryCharge === 0 ? (adminLanguage === 'bn' ? 'ফ্রি' : 'Free') : toLocalizedCurrency(order.deliveryCharge, adminLanguage)}
                      </span>
                    </td>

                    {/* Status Dropdown (Manual update supported anytime) */}
                    <td className="py-3 px-4 min-w-[170px]" onClick={e => e.stopPropagation()}>
                      <div className="space-y-1.5">
                        <div className="relative">
                          <select
                            value={order.status}
                            onChange={e => handleStatusChange(order.id, e.target.value as OrderStatus)}
                            className={`w-full text-xs font-bold py-1.5 pl-2.5 pr-7 rounded-lg border shadow-2xs focus:outline-none transition cursor-pointer appearance-none ${statusColors[order.status]}`}
                          >
                            <option value="pending">{t.statusPending}</option>
                            <option value="confirmed">{t.statusConfirmed}</option>
                            <option value="processing">{t.statusProcessing}</option>
                            <option value="in_courier">{t.statusInCourier}</option>
                            <option value="delivered">{t.statusDelivered}</option>
                            <option value="cancelled">{t.statusCancelled}</option>
                            <option value="returned">{t.statusReturned}</option>
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-stone-500">
                            <ChevronDown className="w-3.5 h-3.5" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] px-0.5 text-stone-500">
                          {order.courier?.trackingCode ? (
                            <span className="inline-flex items-center gap-1 text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200" title={isBn ? 'কুরিয়ার ট্র্যাকিংয়ের সাথে অটো সিঙ্ক' : 'Auto syncs with courier tracking'}>
                              <Zap className="w-2.5 h-2.5 text-indigo-600" />
                              <span className="whitespace-nowrap">{isBn ? 'অটো কুরিয়ার সিঙ্ক' : 'Auto Courier Sync'}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">
                              <span>✏️</span>
                              <span className="whitespace-nowrap">{isBn ? 'ম্যানুয়াল আপডেট' : 'Manual'}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Courier Tracking Info with clear Bangla status and live sync */}
                    <td className="py-3 px-4 min-w-[220px]" onClick={e => e.stopPropagation()}>
                      {order.courier?.trackingCode ? (() => {
                        const courierInfo = getCourierProviderInfo(order.courier.provider);
                        const courierStatus = getCourierStatusDisplay(order.courier.status, adminLanguage);
                        return (
                          <div className="space-y-1.5">
                            {/* Provider badge, tracking code with copy and live refresh */}
                            <div className="flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border uppercase ${courierInfo.badgeClass}`}>
                                  {courierInfo.name}
                                </span>
                                <span className="font-mono font-bold text-xs text-stone-900 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">
                                  {order.courier.trackingCode}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleSyncSingleCourier(order.id)}
                                disabled={syncingTrackingId === order.id}
                                className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded border border-indigo-200 transition disabled:opacity-50 cursor-pointer shrink-0"
                                title={isBn ? 'কুরিয়ার লাইভ স্ট্যাটাস রিফ্রেশ করুন' : 'Refresh live courier status'}
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${syncingTrackingId === order.id ? 'animate-spin' : ''}`} />
                              </button>
                            </div>

                            {/* Prominent Bangla / English Status Badge */}
                            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-bold shadow-2xs ${courierStatus.badgeClass}`}>
                              {courierStatus.category === 'delivered' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                              {courierStatus.category === 'out_for_delivery' && <Truck className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                              {courierStatus.category === 'in_transit' && <Truck className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                              {courierStatus.category === 'cancelled' && <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                              {courierStatus.category === 'returned' && <RotateCcw className="w-3.5 h-3.5 text-purple-600 shrink-0" />}
                              {courierStatus.category === 'hold' && <AlertTriangle className="w-3.5 h-3.5 text-orange-600 shrink-0" />}
                              {courierStatus.category === 'pending' && <Clock className="w-3.5 h-3.5 text-stone-500 shrink-0" />}
                              <span className="truncate">{courierStatus.label}</span>
                            </div>

                            {/* Subtitle explanation */}
                            {courierStatus.subLabel && (
                              <p className="text-[10px] text-stone-500 pl-0.5 truncate">
                                {courierStatus.subLabel}
                              </p>
                            )}
                          </div>
                        );
                      })() : (
                        <button
                          type="button"
                          onClick={() => setActiveOrderForModal(order)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-950 bg-indigo-50/90 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 transition shadow-2xs w-full justify-center cursor-pointer"
                          title={isBn ? 'এই অর্ডারে কুরিয়ার বুকিং দিন বা ট্র্যাকিং কোড যুক্ত করুন' : 'Add courier booking or tracking'}
                        >
                          <Truck className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{isBn ? '+ কুরিয়ারে বুকিং দিন' : '+ Send to Courier'}</span>
                        </button>
                      )}
                    </td>

                    {/* Google Sheet Sync Status */}
                    <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                      {order.googleSheetSynced ? (
                        <div className="flex flex-col items-start gap-0.5">
                          <span
                            className="inline-flex items-center gap-1 font-bold text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200"
                            title={order.googleSheetSyncedAt ? `${adminLanguage === 'bn' ? 'সিঙ্ক হয়েছে' : 'Synced'}: ${toLocalizedDate(new Date(order.googleSheetSyncedAt), adminLanguage)}` : 'Synced to Sheet'}
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {adminLanguage === 'bn' ? 'শিটে সিঙ্কড' : 'Sheet Synced'}
                          </span>
                          {order.googleSheetSyncedAt && (
                            <span className="text-[9px] text-stone-400">
                              {new Date(order.googleSheetSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSyncSingleOrder(order.id)}
                          disabled={syncingOrderId === order.id}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition disabled:opacity-50"
                          title={adminLanguage === 'bn' ? 'এই অর্ডারটি গুগল শিটে পাঠান' : 'Send this order to Google Sheet'}
                        >
                          <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                          <span>{syncingOrderId === order.id ? (adminLanguage === 'bn' ? 'যাচ্ছে...' : 'Sending...') : (adminLanguage === 'bn' ? 'শিটে পাঠান' : 'Sync to Sheet')}</span>
                        </button>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedCustomerSummary(custHistory)}
                          className="p-1.5 text-stone-500 hover:text-rose-600 rounded-lg hover:bg-stone-100"
                          title={isBn ? 'কাস্টমার অর্ডার হিস্ট্রি দেখুন' : 'View customer history'}
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveOrderForModal(order)}
                          className="p-1.5 text-stone-500 hover:text-rose-600 rounded-lg hover:bg-stone-100"
                          title={adminLanguage === 'bn' ? 'বিস্তারিত দেখুন ও কুরিয়ার / এসএমএস পাঠান' : 'View details & courier/SMS'}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveOrderForInvoice(order)}
                          className="p-1.5 text-stone-500 hover:text-indigo-600 rounded-lg hover:bg-stone-100"
                          title={adminLanguage === 'bn' ? 'ইনভয়েস প্রিন্ট করুন' : 'Print invoice'}
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(order.id)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-stone-100"
                          title={adminLanguage === 'bn' ? 'মুছে ফেলুন' : 'Delete order'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {selectedCustomerSummary && (
        <CustomerHistoryModal
          summary={selectedCustomerSummary}
          adminLanguage={adminLanguage}
          onClose={() => setSelectedCustomerSummary(null)}
          onViewOrderDetails={(order) => {
            setSelectedCustomerSummary(null);
            setActiveOrderForModal(order);
          }}
        />
      )}

      {activeOrderForModal && (
        <OrderDetailsModal
          order={activeOrderForModal}
          onClose={() => setActiveOrderForModal(null)}
        />
      )}

      {activeOrderForInvoice && (
        <InvoiceModal
          order={activeOrderForInvoice}
          onClose={() => setActiveOrderForInvoice(null)}
        />
      )}

      {/* Clear Demo Data Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-stone-900">
                {isBn ? 'সকল টেস্ট ও ডেমো ডাটা মুছবেন?' : 'Clear All Demo / Test Data?'}
              </h3>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                {isBn
                  ? 'আপনি কি নিশ্চিত যে সমস্ত টেস্ট/ডেমো অর্ডার মুছে ফেলতে চান? একবার মুছে ফেললে সিস্টেমটি স্থায়ীভাবে লাইভ প্রোডাকশন মোডে রূপান্তরিত হবে এবং ভবিষ্যতে কোনো অবস্থাতেই ডেমো ডাটা আর রিলোড হবে না।'
                  : 'Are you sure you want to delete all test/demo orders? Once removed, the store permanently switches to live mode and demo data will never reload.'}
              </p>
            </div>

            <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 text-xs space-y-2">
              <label className="flex items-center gap-2 font-medium text-stone-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={alsoClearIncomplete}
                  onChange={e => setAlsoClearIncomplete(e.target.checked)}
                  className="rounded border-stone-300 text-rose-600 focus:ring-rose-500 w-4 h-4"
                />
                <span>{isBn ? 'টেস্ট অসম্পূর্ণ অর্ডার (লিড) ও মুছে ফেলুন' : 'Also clear incomplete abandoned leads'}</span>
              </label>
              <div className="text-[11px] text-emerald-700 flex items-center gap-1.5 pt-1 border-t border-stone-200/60 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{isBn ? 'এরপরে আসল কাস্টমারদের ডাটা সম্পূর্ণ সুরক্ষিত থাকবে' : 'From now on, only real customer data is saved'}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                disabled={clearingOrders}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    setClearingOrders(true);
                    await clearDemoData({
                      clearOrders: true,
                      clearIncomplete: alsoClearIncomplete,
                      clearDemoPages: false
                    });
                    setShowClearModal(false);
                    setSyncToast({
                      success: true,
                      message: isBn
                        ? 'সকল ডেমো ডাটা সফলভাবে মুছে ফেলা হয়েছে! এখন থেকে আর কোনো ডেমো ডাটা আসবে না।'
                        : 'All demo orders removed! Live mode is permanently active.'
                    });
                    setTimeout(() => setSyncToast(null), 5000);
                  } catch (err) {
                    console.error(err);
                    alert(isBn ? 'ডাটা মুছতে ত্রুটি হয়েছে' : 'Failed to clear demo data');
                  } finally {
                    setClearingOrders(false);
                  }
                }}
                disabled={clearingOrders}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {clearingOrders ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{clearingOrders ? (isBn ? 'মুছে ফেলা হচ্ছে...' : 'Clearing...') : (isBn ? 'হ্যাঁ, ডেমো ডাটা মুছুন' : 'Yes, Clear Demo Data')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
