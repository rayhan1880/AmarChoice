import { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { Order, OrderStatus, CourierCustomerHistory } from '../../types.ts';
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
  RotateCcw,
  CheckSquare,
  Pencil
} from 'lucide-react';
import OrderDetailsModal from './OrderDetailsModal.tsx';
import InvoiceModal from './InvoiceModal.tsx';
import CustomerHistoryModal from './CustomerHistoryModal.tsx';
import { OrderEditModal } from './OrderEditModal.tsx';
import { getCustomerHistory, CustomerHistorySummary, normalizePhoneNumber } from '../../utils/customerHistory.ts';
import { getCourierStatusDisplay, getCourierProviderInfo } from '../../utils/courierStatusHelper.ts';
import {
  translations,
  toLocalizedNumber,
  toLocalizedCurrency,
  toLocalizedDate,
  getLocalizedDayName,
  formatOrderRelativeTime
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

// Helper to convert Bengali numerals to English numerals
const convertBnToEnDigits = (str: string): string => {
  const bnToEn: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
  };
  return (str || '').replace(/[০-৯]/g, d => bnToEn[d] || d);
};

// Helper to normalize phone numbers for searching
const cleanPhoneForSearch = (phone: string): string => {
  const normalized = convertBnToEnDigits(phone || '');
  const digitsOnly = normalized.replace(/\D/g, '');
  if (digitsOnly.startsWith('880')) {
    return digitsOnly.slice(2);
  }
  return digitsOnly;
};

export type SearchScope = 'all' | 'phone' | 'id' | 'courier' | 'customer' | 'product' | 'address';

export default function OrdersView() {
  const {
    orders,
    landingPages,
    updateOrderStatus,
    deleteOrder,
    bulkActionOrders,
    sendToCourier,
    sendOrderConfirmSms,
    bulkSendConfirmSms,
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
  const [searchScope, setSearchScope] = useState<SearchScope>('all');
  const [searchAllDates, setSearchAllDates] = useState<boolean>(true);

  // Date Filtering States
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [showDailyBreakdown, setShowDailyBreakdown] = useState<boolean>(true);

  // Quick SMS state
  const [sendingSmsOrderId, setSendingSmsOrderId] = useState<string | null>(null);

  const handleQuickSendConfirmSms = async (order: Order) => {
    try {
      setSendingSmsOrderId(order.id);
      const res = await sendOrderConfirmSms(order.id, { updateStatusToConfirmed: true });
      setSyncToast({
        success: res.success,
        message: res.message || (res.success
          ? (isBn ? `অর্ডার #${order.id} এর কনফার্মেশন SMS সফলভাবে পাঠানো হয়েছে!` : `Confirmation SMS sent for order #${order.id}`)
          : (res.error || (isBn ? 'এসএমএস পাঠাতে ব্যর্থ হয়েছে' : 'Failed to send SMS')))
      });
      setTimeout(() => setSyncToast(null), 4500);
      await refreshAll();
    } catch (err: any) {
      setSyncToast({
        success: false,
        message: err?.message || (isBn ? 'এসএমএস পাঠাতে সমস্যা হয়েছে' : 'Failed to send SMS')
      });
      setTimeout(() => setSyncToast(null), 4500);
    } finally {
      setSendingSmsOrderId(null);
    }
  };

  const [activeOrderForModal, setActiveOrderForModal] = useState<Order | null>(null);
  const [modalInitialTab, setModalInitialTab] = useState<'details' | 'courier' | 'sms'>('details');
  const [quickSendingOrderId, setQuickSendingOrderId] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [activeOrderForInvoice, setActiveOrderForInvoice] = useState<Order | null>(null);
  const [bulkInvoicesModalOrders, setBulkInvoicesModalOrders] = useState<Order[] | null>(null);
  const [selectedCustomerSummary, setSelectedCustomerSummary] = useState<CustomerHistorySummary | null>(null);

  // Quick 1-click dispatch to Steadfast courier directly from table row
  const handleQuickSendSteadfast = async (order: Order) => {
    try {
      setQuickSendingOrderId(order.id);
      const res = await sendToCourier(order.id, 'steadfast', order.deliveryCharge || 120, order.notes || 'Handle with care');
      setSyncToast({
        success: true,
        message: res?.message || (isBn ? `অর্ডার #${order.id} স্টিডফাস্ট কুরিয়ারে সফলভাবে বুকিং হয়েছে!` : `Order #${order.id} sent to Steadfast successfully!`)
      });
      setTimeout(() => setSyncToast(null), 5000);
    } catch (err: any) {
      console.error('Quick dispatch error:', err);
      setSyncToast({
        success: false,
        message: err?.message || (isBn ? 'স্টিডফাস্ট কুরিয়ারে বুকিং করা যায়নি। গ্রাহকের ফোন নম্বর ও সেটিংস যাচাই করুন।' : 'Failed to send to Steadfast Courier.')
      });
      setTimeout(() => setSyncToast(null), 5000);
    } finally {
      setQuickSendingOrderId(null);
    }
  };

  // Courier customer histories (parcels, delivered, cancelled) from courier API
  const [courierHistories, setCourierHistories] = useState<Record<string, CourierCustomerHistory>>({});

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
        const rawQ = searchTerm.trim().toLowerCase();
        const enQ = convertBnToEnDigits(rawQ);
        const cleanQueryPhone = cleanPhoneForSearch(rawQ);
        const orderPhoneClean = cleanPhoneForSearch(order.customerPhone);

        // Matching checks
        const cleanRawNoHash = rawQ.replace(/^#/, '');
        const cleanEnNoHash = enQ.replace(/^#/, '');
        const orderIdClean = order.id.toLowerCase().replace(/^ord-/, '');

        const matchId = order.id.toLowerCase().includes(rawQ) || 
                        order.id.toLowerCase().includes(enQ) ||
                        orderIdClean.includes(cleanRawNoHash) ||
                        orderIdClean.includes(cleanEnNoHash);

        const matchPhone = (cleanQueryPhone.length >= 3 && orderPhoneClean.includes(cleanQueryPhone)) ||
                           order.customerPhone.toLowerCase().includes(rawQ) ||
                           order.customerPhone.toLowerCase().includes(enQ);

        const matchName = order.customerName.toLowerCase().includes(rawQ) ||
                          order.customerName.toLowerCase().includes(enQ);

        const matchAddress = order.customerAddress.toLowerCase().includes(rawQ) ||
                             order.customerAddress.toLowerCase().includes(enQ);

        const matchCourier = Boolean(
          (order.courier?.trackingCode && (
            order.courier.trackingCode.toLowerCase().includes(rawQ) ||
            order.courier.trackingCode.toLowerCase().includes(enQ)
          )) ||
          (order.courier?.consignmentId && (
            order.courier.consignmentId.toLowerCase().includes(rawQ) ||
            order.courier.consignmentId.toLowerCase().includes(enQ)
          )) ||
          (order.courier?.provider && order.courier.provider.toLowerCase().includes(rawQ))
        );

        const matchProduct = Boolean(
          order.items?.some(item =>
            item.variantName?.toLowerCase().includes(rawQ) ||
            item.variantName?.toLowerCase().includes(enQ) ||
            (item.size && item.size.toLowerCase().includes(rawQ)) ||
            (item.variantId && item.variantId.toLowerCase().includes(rawQ))
          )
        );

        const matchPage = (order.landingPageTitle || '').toLowerCase().includes(rawQ);
        const matchNotes = Boolean(order.notes?.toLowerCase().includes(rawQ));
        const matchIp = Boolean(order.customerIp?.toLowerCase().includes(rawQ));

        if (searchScope === 'phone') {
          if (!matchPhone) return false;
        } else if (searchScope === 'id') {
          if (!matchId) return false;
        } else if (searchScope === 'courier') {
          if (!matchCourier) return false;
        } else if (searchScope === 'customer') {
          if (!matchName) return false;
        } else if (searchScope === 'product') {
          if (!matchProduct) return false;
        } else if (searchScope === 'address') {
          if (!matchAddress) return false;
        } else {
          // 'all'
          if (!matchId && !matchPhone && !matchName && !matchAddress && !matchCourier && !matchProduct && !matchPage && !matchNotes && !matchIp) {
            return false;
          }
        }
      }

      // Date filter mode (bypass date filter if search is active and searchAllDates is true)
      if (searchTerm.trim() && searchAllDates) {
        return true;
      }

      const orderDate = new Date(order.createdAt);
      return isOrderInDateRange(orderDate, dateFilterMode, customStartDate, customEndDate);
    });
  }, [orders, selectedLandingPageId, selectedStatus, searchTerm, searchScope, searchAllDates, dateFilterMode, customStartDate, customEndDate]);

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

  // Final filtered orders for the table (strictly sorted newest first with sequential display)
  const filteredOrders = useMemo(() => {
    let list = periodFilteredOrders;
    // When searching with searchAllDates enabled, do not restrict to a clicked day card
    if (!searchTerm.trim() || !searchAllDates) {
      if (selectedDayKey) {
        list = periodFilteredOrders.filter(order => {
          const d = new Date(order.createdAt);
          return formatDateToKey(d) === selectedDayKey;
        });
      }
    }
    // Strict newest-first sorting: top order is always the newest order with Serial #1
    return [...list].sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  }, [periodFilteredOrders, selectedDayKey, searchTerm, searchAllDates]);

  // Bulk fetch courier customer histories for phone numbers shown on screen
  useEffect(() => {
    const phones: string[] = Array.from(
      new Set<string>(
        filteredOrders
          .map(o => normalizePhoneNumber(o.customerPhone))
          .filter(p => p.length >= 10)
      )
    );

    if (phones.length === 0) return;

    const missingPhones = phones.filter(p => !courierHistories[p]);
    if (missingPhones.length === 0) return;

    let isMounted = true;
    api.checkCustomersCourierBulk(missingPhones)
      .then(res => {
        if (isMounted && res.success && res.histories) {
          setCourierHistories(prev => ({ ...prev, ...res.histories }));
        }
      })
      .catch(err => {
        console.warn('Failed to bulk fetch courier histories:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [filteredOrders, courierHistories]);

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

  // In-app Delete Confirmation Modal State (replaces blocked window.confirm in iframe)
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    type: 'single' | 'bulk';
    orderId?: string;
    orderIds?: string[];
  }>({
    isOpen: false,
    type: 'bulk'
  });

  const handleDelete = (orderId: string) => {
    setDeleteModalState({
      isOpen: true,
      type: 'single',
      orderId
    });
  };

  // Bulk Selection & Actions Logic
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<string>('');
  const [isApplyingBulk, setIsApplyingBulk] = useState<boolean>(false);

  const handleToggleSelectOrder = (orderId: string) => {
    setSelectedOrderIds(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const handleToggleSelectAll = () => {
    if (filteredOrders.length === 0) return;
    const allFilteredIds = filteredOrders.map(o => o.id);
    const areAllSelected = allFilteredIds.every(id => selectedOrderIds.includes(id));

    if (areAllSelected) {
      setSelectedOrderIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      setSelectedOrderIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  // CSV Export utility with UTF-8 BOM for Bangla font compatibility
  const exportOrdersToCsv = (ordersToExport: Order[]) => {
    const headers = [
      'Order ID',
      'Order Date',
      'Landing Page',
      'Customer Name',
      'Phone Number',
      'Address',
      'Ordered Products',
      'Location',
      'Delivery Charge (BDT)',
      'Subtotal (BDT)',
      'Grand Total COD (BDT)',
      'Order Status',
      'Courier Provider',
      'Consignment ID',
      'Tracking Code',
      'Courier Status',
      'Notes'
    ];

    const rows = ordersToExport.map(ord => {
      const itemsStr = ord.items.map(i => `${i.variantName} x${i.quantity}${i.size ? ` [${i.size}]` : ''}${i.long ? ` [Long: ${i.long}"]` : ''}`).join('; ');
      return [
        `"${ord.id}"`,
        `"${new Date(ord.createdAt).toLocaleString('bn-BD')}"`,
        `"${(ord.landingPageTitle || '').replace(/"/g, '""')}"`,
        `"${(ord.customerName || '').replace(/"/g, '""')}"`,
        `"${ord.customerPhone || ''}"`,
        `"${(ord.customerAddress || '').replace(/"/g, '""')}"`,
        `"${itemsStr.replace(/"/g, '""')}"`,
        `"${ord.deliveryLocation === 'inside_dhaka' ? 'ঢাকার ভেতরে' : 'ঢাকার বাইরে'}"`,
        ord.deliveryCharge,
        ord.subtotal,
        ord.grandTotal,
        `"${ord.status}"`,
        `"${ord.courier?.provider || 'N/A'}"`,
        `"${ord.courier?.consignmentId || ''}"`,
        `"${ord.courier?.trackingCode || ''}"`,
        `"${ord.courier?.status || ''}"`,
        `"${(ord.notes || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `orders_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const executeBulkAction = async (action: string, targetOrderIds: string[]) => {
    try {
      setIsApplyingBulk(true);

      if (action === 'delete') {
        const res = await bulkActionOrders({
          orderIds: targetOrderIds,
          action: 'delete'
        });
        setSelectedOrderIds(prev => prev.filter(id => !targetOrderIds.includes(id)));
        setBulkAction('');
        setSyncToast({
          success: true,
          message: res.message || (isBn ? 'অর্ডারগুলো সফলভাবে মুছে ফেলা হয়েছে' : 'Orders deleted successfully')
        });
      } else if (action === 'print_invoices') {
        const selectedOrders = orders.filter(o => targetOrderIds.includes(o.id));
        if (selectedOrders.length === 0) {
          setSyncToast({
            success: false,
            message: isBn ? 'কোনো অর্ডার নির্বাচন করা হয়নি' : 'No orders selected'
          });
          return;
        }
        setBulkInvoicesModalOrders(selectedOrders);
        setBulkAction('');
        return;
      } else if (action === 'export_csv') {
        const selectedOrders = orders.filter(o => targetOrderIds.includes(o.id));
        if (selectedOrders.length === 0) {
          setSyncToast({
            success: false,
            message: isBn ? 'কোনো অর্ডার নির্বাচন করা হয়নি' : 'No orders selected'
          });
          return;
        }
        exportOrdersToCsv(selectedOrders);
        setSelectedOrderIds([]);
        setBulkAction('');
        setSyncToast({
          success: true,
          message: isBn ? `${selectedOrders.length} টি অর্ডারের এক্সেল/CSV ফাইল ডাউনলোড সম্পন্ন হয়েছে` : `Exported ${selectedOrders.length} orders to CSV`
        });
      } else if (action.startsWith('status_')) {
        const targetStatus = action.replace('status_', '') as OrderStatus;
        const res = await bulkActionOrders({
          orderIds: targetOrderIds,
          action: 'status',
          status: targetStatus
        });
        setSelectedOrderIds([]);
        setBulkAction('');
        setSyncToast({
          success: true,
          message: res.message || (isBn ? `${targetOrderIds.length} টি অর্ডারের স্ট্যাটাস সফলভাবে আপডেট করা হয়েছে` : 'Order statuses updated successfully')
        });
      } else if (action === 'courier_steadfast') {
        const res = await bulkActionOrders({
          orderIds: targetOrderIds,
          action: 'courier',
          provider: 'steadfast'
        });
        setSelectedOrderIds([]);
        setBulkAction('');
        setSyncToast({
          success: true,
          message: res.message || (isBn ? 'স্টিডফাস্ট কুরিয়ারে বুকিং সম্পন্ন হয়েছে' : 'Sent to Steadfast Courier successfully')
        });
      } else if (action === 'courier_pathao') {
        const res = await bulkActionOrders({
          orderIds: targetOrderIds,
          action: 'courier',
          provider: 'pathao'
        });
        setSelectedOrderIds([]);
        setBulkAction('');
        setSyncToast({
          success: true,
          message: res.message || (isBn ? 'পাঠাও কুরিয়ারে বুকিং সম্পন্ন হয়েছে' : 'Sent to Pathao Courier successfully')
        });
      } else if (action === 'sync_courier') {
        const res = await bulkActionOrders({
          orderIds: targetOrderIds,
          action: 'sync_courier'
        });
        setSelectedOrderIds([]);
        setBulkAction('');
        setSyncToast({
          success: true,
          message: res.message || (isBn ? 'কুরিয়ার ট্র্যাকিং স্ট্যাটাস সিঙ্ক সম্পন্ন হয়েছে' : 'Courier tracking synced successfully')
        });
      } else if (action === 'sms_confirm') {
        const res = await bulkSendConfirmSms(targetOrderIds, false);
        setSelectedOrderIds([]);
        setBulkAction('');
        setSyncToast({
          success: res.success,
          message: res.message
        });
        await refreshAll();
      } else if (action === 'status_confirmed_with_sms') {
        const res = await bulkSendConfirmSms(targetOrderIds, true);
        setSelectedOrderIds([]);
        setBulkAction('');
        setSyncToast({
          success: res.success,
          message: res.message
        });
        await refreshAll();
      }

      setTimeout(() => setSyncToast(null), 3500);
    } catch (err: any) {
      console.error('Bulk action error:', err);
      setSyncToast({
        success: false,
        message: err?.message || (isBn ? 'বাল্ক অ্যাকশন প্রয়োগ করতে সমস্যা হয়েছে' : 'Failed to apply bulk action')
      });
      setTimeout(() => setSyncToast(null), 4000);
    } finally {
      setIsApplyingBulk(false);
    }
  };

  const handleConfirmDeleteModal = async () => {
    try {
      setIsApplyingBulk(true);
      if (deleteModalState.type === 'single' && deleteModalState.orderId) {
        const idToDelete = deleteModalState.orderId;
        await deleteOrder(idToDelete);
        setSelectedOrderIds(prev => prev.filter(id => id !== idToDelete));
        setSyncToast({
          success: true,
          message: isBn ? `অর্ডার #${idToDelete} সফলভাবে মুছে ফেলা হয়েছে` : `Order #${idToDelete} deleted successfully`
        });
        setTimeout(() => setSyncToast(null), 3500);
      } else if (deleteModalState.type === 'bulk') {
        const idsToDelete = deleteModalState.orderIds && deleteModalState.orderIds.length > 0
          ? deleteModalState.orderIds
          : selectedOrderIds;
        if (idsToDelete.length > 0) {
          const res = await bulkActionOrders({
            orderIds: idsToDelete,
            action: 'delete'
          });
          setSelectedOrderIds(prev => prev.filter(id => !idsToDelete.includes(id)));
          setBulkAction('');
          setSyncToast({
            success: true,
            message: res.message || (isBn ? 'অর্ডারগুলো সফলভাবে মুছে ফেলা হয়েছে' : 'Orders deleted successfully')
          });
          setTimeout(() => setSyncToast(null), 3500);
        }
      }
    } catch (err: any) {
      console.error('Delete action failed:', err);
      setSyncToast({
        success: false,
        message: err?.message || (isBn ? 'অর্ডার মুছতে সমস্যা হয়েছে' : 'Failed to delete order(s)')
      });
      setTimeout(() => setSyncToast(null), 4000);
    } finally {
      setIsApplyingBulk(false);
      setDeleteModalState({ isOpen: false, type: 'bulk' });
    }
  };

  const handleApplyBulkAction = async () => {
    if (selectedOrderIds.length === 0) {
      setSyncToast({
        success: false,
        message: isBn ? '⚠️ অনুগ্রহ করে অন্তত একটি অর্ডার টিক চিহ্ন (☑) দিয়ে সিলেক্ট করুন' : '⚠️ Please select at least one order using the checkbox'
      });
      setTimeout(() => setSyncToast(null), 3500);
      return;
    }

    if (!bulkAction) {
      setSyncToast({
        success: false,
        message: isBn ? '⚠️ অনুগ্রহ করে ড্রপডাউন থেকে একটি অ্যাকশন নির্বাচন করুন' : '⚠️ Please select an action from the dropdown'
      });
      setTimeout(() => setSyncToast(null), 3500);
      return;
    }

    if (bulkAction === 'delete') {
      // Open in-app confirmation modal (does not rely on blocked browser window.confirm)
      setDeleteModalState({
        isOpen: true,
        type: 'bulk',
        orderIds: [...selectedOrderIds]
      });
      return;
    }

    if (bulkAction === 'print_invoices') {
      const selectedOrders = orders.filter(o => selectedOrderIds.includes(o.id));
      if (selectedOrders.length > 0) {
        setBulkInvoicesModalOrders(selectedOrders);
      }
      setBulkAction('');
      return;
    }

    if (bulkAction === 'export_csv') {
      const selectedOrders = orders.filter(o => selectedOrderIds.includes(o.id));
      if (selectedOrders.length > 0) {
        exportOrdersToCsv(selectedOrders);
        setSyncToast({
          success: true,
          message: isBn ? `${selectedOrders.length} টি অর্ডারের এক্সেল/CSV ফাইল ডাউনলোড সম্পন্ন হয়েছে` : `Exported ${selectedOrders.length} orders to CSV`
        });
        setTimeout(() => setSyncToast(null), 3500);
      }
      setSelectedOrderIds([]);
      setBulkAction('');
      return;
    }

    // Execute other actions directly
    await executeBulkAction(bulkAction, selectedOrderIds);
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

          {/* Status Quick Filter Cards Summary Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 w-full lg:w-auto">
            {/* Pending Card */}
            <button
              type="button"
              onClick={() => {
                setSelectedStatus(prev => prev === 'pending' ? 'all' : 'pending');
                setSelectedDayKey(null);
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
                selectedStatus === 'pending'
                  ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-300'
                  : 'bg-amber-50/70 hover:bg-amber-100/80 text-amber-950 border-amber-200/90 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${
                  selectedStatus === 'pending' ? 'text-amber-100' : 'text-amber-700'
                }`}>
                  {t.statusPendingShort}
                </span>
                <Clock className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                  selectedStatus === 'pending' ? 'text-white' : 'text-amber-600'
                }`} />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-black tracking-tight">
                  {toLocalizedNumber(orders.filter(o => o.status === 'pending').length, adminLanguage)}
                </span>
                <span className={`text-[10px] font-semibold ${
                  selectedStatus === 'pending' ? 'text-amber-100 underline decoration-white/60' : 'text-amber-600 group-hover:underline'
                }`}>
                  {selectedStatus === 'pending' ? (isBn ? 'ফিল্টার চালু ✓' : 'Active ✓') : (isBn ? 'ক্লিক ফিল্টার' : 'Filter')}
                </span>
              </div>
            </button>

            {/* Confirmed Card */}
            <button
              type="button"
              onClick={() => {
                setSelectedStatus(prev => prev === 'confirmed' ? 'all' : 'confirmed');
                setSelectedDayKey(null);
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
                selectedStatus === 'confirmed'
                  ? 'bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-300'
                  : 'bg-blue-50/70 hover:bg-blue-100/80 text-blue-950 border-blue-200/90 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${
                  selectedStatus === 'confirmed' ? 'text-blue-100' : 'text-blue-700'
                }`}>
                  {t.statusConfirmedShort}
                </span>
                <CheckCircle2 className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                  selectedStatus === 'confirmed' ? 'text-white' : 'text-blue-600'
                }`} />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-black tracking-tight">
                  {toLocalizedNumber(orders.filter(o => o.status === 'confirmed').length, adminLanguage)}
                </span>
                <span className={`text-[10px] font-semibold ${
                  selectedStatus === 'confirmed' ? 'text-blue-100 underline decoration-white/60' : 'text-blue-600 group-hover:underline'
                }`}>
                  {selectedStatus === 'confirmed' ? (isBn ? 'ফিল্টার চালু ✓' : 'Active ✓') : (isBn ? 'ক্লিক ফিল্টার' : 'Filter')}
                </span>
              </div>
            </button>

            {/* Processing Card */}
            <button
              type="button"
              onClick={() => {
                setSelectedStatus(prev => prev === 'processing' ? 'all' : 'processing');
                setSelectedDayKey(null);
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
                selectedStatus === 'processing'
                  ? 'bg-purple-600 text-white border-purple-700 shadow-md ring-2 ring-purple-300'
                  : 'bg-purple-50/70 hover:bg-purple-100/80 text-purple-950 border-purple-200/90 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${
                  selectedStatus === 'processing' ? 'text-purple-100' : 'text-purple-700'
                }`}>
                  {t.statusProcessingShort}
                </span>
                <RefreshCw className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                  selectedStatus === 'processing' ? 'text-white' : 'text-purple-600'
                }`} />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-black tracking-tight">
                  {toLocalizedNumber(orders.filter(o => o.status === 'processing').length, adminLanguage)}
                </span>
                <span className={`text-[10px] font-semibold ${
                  selectedStatus === 'processing' ? 'text-purple-100 underline decoration-white/60' : 'text-purple-600 group-hover:underline'
                }`}>
                  {selectedStatus === 'processing' ? (isBn ? 'ফিল্টার চালু ✓' : 'Active ✓') : (isBn ? 'ক্লিক ফিল্টার' : 'Filter')}
                </span>
              </div>
            </button>

            {/* Cancelled Card */}
            <button
              type="button"
              onClick={() => {
                setSelectedStatus(prev => prev === 'cancelled' ? 'all' : 'cancelled');
                setSelectedDayKey(null);
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
                selectedStatus === 'cancelled'
                  ? 'bg-rose-600 text-white border-rose-700 shadow-md ring-2 ring-rose-300'
                  : 'bg-rose-50/70 hover:bg-rose-100/80 text-rose-950 border-rose-200/90 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${
                  selectedStatus === 'cancelled' ? 'text-rose-100' : 'text-rose-700'
                }`}>
                  {t.statusCancelledShort}
                </span>
                <XCircle className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                  selectedStatus === 'cancelled' ? 'text-white' : 'text-rose-600'
                }`} />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-black tracking-tight">
                  {toLocalizedNumber(orders.filter(o => o.status === 'cancelled').length, adminLanguage)}
                </span>
                <span className={`text-[10px] font-semibold ${
                  selectedStatus === 'cancelled' ? 'text-rose-100 underline decoration-white/60' : 'text-rose-600 group-hover:underline'
                }`}>
                  {selectedStatus === 'cancelled' ? (isBn ? 'ফিল্টার চালু ✓' : 'Active ✓') : (isBn ? 'ক্লিক ফিল্টার' : 'Filter')}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Prominent Order Search Bar Section */}
        <div className="bg-stone-50/90 rounded-2xl border border-stone-200/90 p-3 sm:p-4 space-y-2.5 shadow-2xs">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
            {/* Search Scope Dropdown */}
            <div className="shrink-0">
              <select
                id="orderSearchScopeSelect"
                value={searchScope}
                onChange={e => setSearchScope(e.target.value as SearchScope)}
                className="w-full md:w-auto px-3 py-2.5 text-xs font-bold text-stone-700 bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-2xs cursor-pointer"
              >
                <option value="all">🌐 {t.ordersSearchAllScope}</option>
                <option value="phone">📞 {t.ordersSearchPhoneScope}</option>
                <option value="id">🔢 {t.ordersSearchIdScope}</option>
                <option value="courier">🚚 {t.ordersSearchCourierScope}</option>
                <option value="customer">👤 {t.ordersSearchCustomerScope}</option>
                <option value="product">🛍️ {t.ordersSearchProductScope}</option>
                <option value="address">📍 {t.ordersSearchAddressScope}</option>
              </select>
            </div>

            {/* Main Search Input */}
            <div className="relative flex-1">
              <Search
                className={`w-4 h-4 absolute left-3.5 top-3 transition-colors ${
                  searchTerm.trim() ? 'text-rose-600' : 'text-stone-400'
                }`}
              />
              <input
                id="orderSearchInput"
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={t.ordersSearchPlaceholder}
                className="w-full pl-10 pr-24 py-2.5 text-xs sm:text-sm font-medium border border-stone-300 rounded-xl bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-2xs placeholder:text-stone-400 text-stone-900"
              />

              {/* Right Action Icons inside Input */}
              <div className="absolute right-2.5 top-2 flex items-center gap-1.5">
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
                    title={t.ordersSearchClear}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {searchTerm.trim() && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 whitespace-nowrap">
                    {toLocalizedNumber(filteredOrders.length, adminLanguage)} {isBn ? 'টি' : ''}
                  </span>
                )}
              </div>
            </div>

            {/* Quick All Dates Checkbox Toggle */}
            <label
              className="flex items-center gap-2 cursor-pointer select-none px-3 py-2 text-xs font-semibold text-stone-700 bg-white md:bg-transparent rounded-xl border md:border-0 border-stone-200 shrink-0"
              title={isBn ? 'চালু থাকলে ডেট ফিল্টার ছাড়াই সব তারিখের অর্ডারে সার্চ হবে' : 'Search across all dates ignoring current date filter'}
            >
              <input
                type="checkbox"
                checked={searchAllDates}
                onChange={e => setSearchAllDates(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-rose-600 focus:ring-rose-500 border-stone-300 cursor-pointer"
              />
              <span className="whitespace-nowrap">{t.ordersSearchAllDates}</span>
            </label>
          </div>

          {/* Active Search Result Feedback Banner */}
          {searchTerm.trim() && (
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-950">
              <div className="flex items-center gap-2 min-w-0">
                <Search className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span className="truncate">
                  {isBn ? (
                    <>
                      <strong>‘{searchTerm}’</strong> দিয়ে সার্চ করা হয়েছে — <strong>{toLocalizedNumber(filteredOrders.length, adminLanguage)} টি অর্ডার</strong> মিলেছে
                      {searchAllDates && <span className="text-stone-500 font-normal"> (সকল তারিখের অর্ডারে সার্চ হচ্ছে)</span>}
                    </>
                  ) : (
                    <>
                      Searched for <strong>‘{searchTerm}’</strong> — found <strong>{toLocalizedNumber(filteredOrders.length, adminLanguage)} orders</strong>
                      {searchAllDates && <span className="text-stone-500 font-normal"> (Searching across all dates)</span>}
                    </>
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="shrink-0 px-2.5 py-1 rounded-md bg-white border border-rose-300 text-rose-700 hover:bg-rose-100 font-bold text-[11px] transition flex items-center gap-1 cursor-pointer shadow-2xs"
              >
                <X className="w-3 h-3" />
                <span>{t.ordersSearchClear}</span>
              </button>
            </div>
          )}
        </div>

        {/* Secondary Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Landing Page Source Filter */}
          <div className="sm:col-span-6 relative">
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
          <div className="sm:col-span-6">
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

        {/* Date Filter Bar with Dropdown Selector */}
        <div className="pt-2 border-t border-stone-100 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-600">
                <Calendar className="w-4 h-4 text-rose-600" />
                <span>{t.dateFilterLabel}</span>
              </div>

              {/* Date Filter Dropdown */}
              <select
                id="ordersDateFilterSelect"
                value={dateFilterMode}
                onChange={e => {
                  setDateFilterMode(e.target.value as DateFilterMode);
                  setSelectedDayKey(null);
                }}
                className="px-3.5 py-2 text-xs font-bold text-stone-800 bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none shadow-2xs cursor-pointer"
              >
                <option value="all">🗓️ {t.dateAllTime}</option>
                <option value="today">☀️ {t.dateToday}</option>
                <option value="yesterday">🌤️ {t.dateYesterday}</option>
                <option value="last7days">📅 {t.dateLast7Days}</option>
                <option value="thisMonth">🗓️ {t.dateThisMonth}</option>
                <option value="last30days">📆 {t.dateLast30Days}</option>
                <option value="custom">⚙️ {t.dateCustom}</option>
              </select>
            </div>

            {/* Quick summary of period orders */}
            <div className="text-xs text-stone-500 font-medium bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200">
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
            {!settings?.isDemoDataRemoved && orders.length > 0 && (
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

        {/* Bulk Action Controls Bar (Dropdown + Apply Button) */}
        <div className="bg-stone-50 border-b border-stone-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Select All Checkbox & Count */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-stone-300 shadow-2xs">
              <input
                type="checkbox"
                id="bulkSelectAllOrders"
                checked={filteredOrders.length > 0 && filteredOrders.every(o => selectedOrderIds.includes(o.id))}
                ref={input => {
                  if (input) {
                    const someSelected = filteredOrders.some(o => selectedOrderIds.includes(o.id));
                    const allSelected = filteredOrders.length > 0 && filteredOrders.every(o => selectedOrderIds.includes(o.id));
                    input.indeterminate = someSelected && !allSelected;
                  }
                }}
                onChange={handleToggleSelectAll}
                className="w-4 h-4 text-rose-600 rounded border-stone-300 focus:ring-rose-500 cursor-pointer"
              />
              <label htmlFor="bulkSelectAllOrders" className="text-xs font-bold text-stone-700 cursor-pointer select-none">
                {selectedOrderIds.length > 0 ? (
                  <span className="text-rose-700">
                    {toLocalizedNumber(selectedOrderIds.length, adminLanguage)} {isBn ? 'টি সিলেক্টেড' : 'selected'}
                  </span>
                ) : (
                  <span>{isBn ? 'সব সিলেক্ট' : 'Select All'}</span>
                )}
              </label>
            </div>

            {/* Bulk Action Dropdown */}
            <div className="flex items-center gap-1.5">
              <select
                id="bulkActionDropdown"
                value={bulkAction}
                onChange={e => setBulkAction(e.target.value)}
                className="text-xs font-semibold border border-stone-300 rounded-lg px-3 py-1.5 bg-white text-stone-800 focus:outline-rose-500 shadow-2xs h-8 cursor-pointer"
              >
                <option value="">{isBn ? '-- বাল্ক অ্যাকশন নির্বাচন করুন --' : '-- Choose Bulk Action --'}</option>
                <optgroup label={isBn ? 'স্ট্যাটাস পরিবর্তন (Change Status)' : 'Change Status'}>
                  <option value="status_confirmed">{isBn ? '✅ কনফার্ম করুন (Confirmed)' : '✅ Mark as Confirmed'}</option>
                  <option value="status_processing">{isBn ? '⚙️ প্রসেসিং করুন (Processing)' : '⚙️ Mark as Processing'}</option>
                  <option value="status_in_courier">{isBn ? '🚚 কুরিয়ারে পাঠান (In Courier)' : '🚚 Mark as In Courier'}</option>
                  <option value="status_delivered">{isBn ? '🎉 ডেলিভার্ড সম্পন্ন (Delivered)' : '🎉 Mark as Delivered'}</option>
                  <option value="status_returned">{isBn ? '↩️ রিটার্ন করুন (Returned)' : '↩️ Mark as Returned'}</option>
                  <option value="status_cancelled">{isBn ? '❌ অর্ডার বাতিল করুন (Cancelled)' : '❌ Mark as Cancelled'}</option>
                  <option value="status_pending">{isBn ? '⏳ পেন্ডিং করুন (Pending)' : '⏳ Mark as Pending'}</option>
                </optgroup>
                <optgroup label={isBn ? 'কুরিয়ার সার্ভিস (Courier Services)' : 'Courier Services'}>
                  <option value="courier_steadfast">{isBn ? '📦 স্টিডফাস্ট কুরিয়ারে পাঠান (Steadfast)' : '📦 Send to Steadfast'}</option>
                  <option value="courier_pathao">{isBn ? '📦 পাঠাও কুরিয়ারে পাঠান (Pathao)' : '📦 Send to Pathao'}</option>
                  <option value="sync_courier">{isBn ? '🔄 কুরিয়ার ট্র্যাকিং স্ট্যাটাস সিঙ্ক' : '🔄 Sync Courier Status'}</option>
                </optgroup>
                <optgroup label={isBn ? 'এসএমএস নোটিফিকেশন (SMS Actions)' : 'SMS Notification'}>
                  <option value="status_confirmed_with_sms">{isBn ? '💬✅ কনফার্ম করুন ও কাস্টমারকে SMS পাঠান' : '💬✅ Confirm & Send SMS'}</option>
                  <option value="sms_confirm">{isBn ? '💬 শুধুমাত্র অর্ডার কনফার্ম SMS পাঠান' : '💬 Send Order Confirm SMS Only'}</option>
                </optgroup>
                <optgroup label={isBn ? 'প্রিন্ট ও এক্সপোর্ট (Print & Export)' : 'Print & Export'}>
                  <option value="print_invoices">{isBn ? '🖨️ ইনভয়েস স্লিপ প্রিন্ট করুন' : '🖨️ Print Invoices'}</option>
                  <option value="export_csv">{isBn ? '📥 এক্সেল / CSV ডাউনলোড' : '📥 Export to CSV'}</option>
                </optgroup>
                <optgroup label={isBn ? 'অর্ডার মুছে ফেলুন (Danger Zone)' : 'Danger Zone'}>
                  <option value="delete">{isBn ? '🗑️ নির্বাচিত অর্ডার মুছুন (Delete)' : '🗑️ Delete Selected Orders'}</option>
                </optgroup>
              </select>

              {/* Apply Button */}
              <button
                type="button"
                id="bulkApplyBtn"
                onClick={handleApplyBulkAction}
                disabled={isApplyingBulk}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 h-8 rounded-lg font-bold text-xs shadow-2xs transition cursor-pointer ${
                  selectedOrderIds.length > 0 && bulkAction
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm ring-2 ring-rose-300'
                    : 'bg-rose-600/90 hover:bg-rose-700 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={isBn ? 'নির্বাচিত অর্ডারসমূহে অ্যাকশন প্রয়োগ করুন' : 'Apply selected action to orders'}
              >
                {isApplyingBulk ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{isBn ? 'প্রয়োগ হচ্ছে...' : 'Applying...'}</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>
                      {isBn ? 'Apply (প্রয়োগ করুন)' : 'Apply'}
                      {selectedOrderIds.length > 0 ? ` (${toLocalizedNumber(selectedOrderIds.length, adminLanguage)})` : ''}
                    </span>
                  </>
                )}
              </button>
            </div>

            {selectedOrderIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedOrderIds([])}
                className="text-[11px] text-stone-500 hover:text-stone-800 underline font-medium cursor-pointer"
              >
                {isBn ? 'সিলেকশন বাতিল' : 'Clear selection'}
              </button>
            )}
          </div>

          {/* Selected items summary */}
          {selectedOrderIds.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="bg-rose-100 text-rose-800 font-bold px-2.5 py-0.5 rounded-full border border-rose-200">
                {toLocalizedNumber(selectedOrderIds.length, adminLanguage)} {isBn ? 'টি অর্ডার সিলেক্ট করা হয়েছে' : 'orders selected'}
              </span>
              <span className="text-stone-500 text-[11px] font-medium hidden sm:inline">
                {isBn ? 'মোট মূল্য:' : 'Total:'}{' '}
                <strong className="text-stone-800 font-mono">
                  {toLocalizedCurrency(
                    orders.filter(o => selectedOrderIds.includes(o.id)).reduce((acc, curr) => acc + (curr.grandTotal || 0), 0),
                    adminLanguage
                  )}
                </strong>
              </span>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-600 border-b border-stone-200 uppercase font-bold text-[11px]">
              <tr>
                {/* Select All Checkbox Column */}
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredOrders.length > 0 && filteredOrders.every(o => selectedOrderIds.includes(o.id))}
                    ref={input => {
                      if (input) {
                        const someSelected = filteredOrders.some(o => selectedOrderIds.includes(o.id));
                        const allSelected = filteredOrders.length > 0 && filteredOrders.every(o => selectedOrderIds.includes(o.id));
                        input.indeterminate = someSelected && !allSelected;
                      }
                    }}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 text-rose-600 rounded border-stone-300 focus:ring-rose-500 cursor-pointer"
                    title={isBn ? 'সকল প্রদর্শিত অর্ডার নির্বাচন করুন' : 'Select all shown orders'}
                  />
                </th>
                <th className="py-3 px-2 min-w-[50px] text-center whitespace-nowrap" title={isBn ? 'অর্ডারের সিরিয়াল নম্বর' : 'Serial Number'}>
                  {isBn ? 'সিরিয়াল' : 'SL'}
                </th>
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
                  <td colSpan={11} className="py-14 text-center">
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
                    ) : searchTerm.trim() ? (
                      <div className="max-w-md mx-auto py-4 px-4 space-y-3">
                        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200 shadow-2xs">
                          <Search className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold text-stone-900 text-sm">
                            {isBn ? `‘${searchTerm}’ এর সাথে মিল রেখে কোনো অর্ডার পাওয়া যায়নি` : `No orders found matching ‘${searchTerm}’`}
                          </p>
                          <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                            {isBn
                              ? 'কাস্টমারের ফোন নাম্বার, সঠিক অর্ডার আইডি (#123) অথবা কুরিয়ার ট্র্যাকিং কোড পুনরায় চেক করুন।'
                              : 'Check customer phone number, correct order ID (#123) or courier tracking code.'}
                          </p>
                        </div>
                        <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setSearchTerm('')}
                            className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>{t.ordersSearchClear}</span>
                          </button>
                          {(selectedStatus !== 'all' || selectedLandingPageId !== 'all' || !searchAllDates) && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedStatus('all');
                                setSelectedLandingPageId('all');
                                setSearchAllDates(true);
                                setDateFilterMode('all');
                                setSelectedDayKey(null);
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-stone-100 text-stone-700 font-bold text-xs hover:bg-stone-200 transition border border-stone-300 cursor-pointer"
                            >
                              <span>{isBn ? 'সব ফিল্টার রিসেট করুন' : 'Reset All Filters'}</span>
                            </button>
                          )}
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
                filteredOrders.map((order, index) => {
                  const custHistory = getCustomerHistory(order.customerPhone, orders, order.customerName);
                  const cleanPhone = normalizePhoneNumber(order.customerPhone);
                  const courierStat = courierHistories[cleanPhone];
                  const isSelected = selectedOrderIds.includes(order.id);
                  return (
                  <tr
                    key={order.id}
                    className={`hover:bg-stone-50/80 transition-colors cursor-pointer ${isSelected ? 'bg-rose-50/40' : ''}`}
                    onClick={() => {
                      setActiveOrderForModal(order);
                      setModalInitialTab('details');
                    }}
                  >
                    {/* Row Checkbox */}
                    <td
                      className="py-3 px-3 text-center"
                      onClick={e => {
                        e.stopPropagation();
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectOrder(order.id)}
                        className="w-4 h-4 text-rose-600 rounded border-stone-300 focus:ring-rose-500 cursor-pointer"
                        title={isBn ? `অর্ডার #${order.id} নির্বাচন করুন` : `Select order #${order.id}`}
                      />
                    </td>

                    {/* Serial Number (SL) Column */}
                    <td
                      className="py-3 px-2 text-center whitespace-nowrap"
                      onClick={e => {
                        e.stopPropagation();
                        setActiveOrderForModal(order);
                        setModalInitialTab('details');
                      }}
                    >
                      <div className="inline-flex items-center justify-center gap-1">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-stone-800 shadow-2xs">
                          #{toLocalizedNumber(index + 1, adminLanguage)}
                        </span>
                        {(() => {
                          const orderTime = new Date(order.createdAt || 0).getTime();
                          const isVeryNew = Date.now() - orderTime < 15 * 60 * 1000;
                          return isVeryNew ? (
                            <span className="relative flex h-2 w-2" title={isBn ? 'নতুন অর্ডার' : 'New Order'}>
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                          ) : null;
                        })()}
                      </div>
                    </td>

                    {/* Order ID & Date */}
                    <td className="py-3 px-4">
                      <span className="font-bold text-stone-900 block font-mono">#{order.id}</span>
                      {(() => {
                        const rel = formatOrderRelativeTime(order.createdAt, adminLanguage);
                        return (
                          <span
                            className={`text-[11px] block transition-colors ${
                              rel.isRecent
                                ? 'text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200/80 inline-flex items-center gap-1 mt-0.5'
                                : 'text-stone-500 font-medium'
                            }`}
                            title={rel.fullTooltip}
                          >
                            {rel.isRecent && <Clock className="w-2.5 h-2.5 text-amber-600 shrink-0" />}
                            <span>{rel.display}</span>
                          </span>
                        );
                      })()}
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

                        {/* Customer Order History Pill (Total, Delivered, Cancelled from Courier & Store) */}
                        <div className="mt-1.5 pt-1.5 border-t border-stone-100">
                          <div
                            className="w-full text-left group bg-stone-50 group-hover/cust:bg-white p-1.5 rounded-md border border-stone-200/80 transition"
                          >
                            {courierStat ? (
                              <>
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-[10px] font-bold text-stone-800 flex items-center gap-1">
                                      <Truck className="w-3 h-3 text-rose-600 shrink-0" />
                                      <span>
                                        {toLocalizedNumber(courierStat.totalParcels, adminLanguage)} {isBn ? 'টি পার্সেল' : 'parcels'}
                                      </span>
                                    </span>
                                    {courierStat.isLiveCourier ? (
                                      <span
                                        className="text-[8px] font-bold text-emerald-700 bg-emerald-100/90 px-1 py-0.2 rounded border border-emerald-200 shrink-0"
                                        title={isBn ? 'স্টিডফাস্ট কুরিয়ারের লাইভ ডাটা' : 'Steadfast Live Courier API'}
                                      >
                                        Steadfast
                                      </span>
                                    ) : (
                                      <span
                                        className="text-[8px] font-medium text-stone-500 bg-stone-100 px-1 py-0.2 rounded border border-stone-200 shrink-0"
                                        title={isBn ? (courierStat.notice || 'স্টোরের অভ্যন্তরীণ অর্ডার রেকর্ড') : 'Store Records'}
                                      >
                                        {isBn ? 'স্টোর ডাটা' : 'Store'}
                                      </span>
                                    )}
                                  </div>
                                  {courierStat.level === 'risk' || (courierStat.totalCancelled > courierStat.totalDelivered && courierStat.totalCancelled >= 2) ? (
                                    <span className="text-[9px] font-bold text-rose-700 bg-rose-100/90 px-1 py-0.2 rounded border border-rose-200 shrink-0">
                                      {isBn ? 'উচ্চ ঝুঁকি' : 'Risk'}
                                    </span>
                                  ) : courierStat.level === 'caution' ? (
                                    <span className="text-[9px] font-bold text-amber-800 bg-amber-100/90 px-1 py-0.2 rounded border border-amber-200 shrink-0">
                                      {isBn ? 'সতর্কতা' : 'Caution'}
                                    </span>
                                  ) : courierStat.level === 'safe' ? (
                                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/90 px-1 py-0.2 rounded border border-emerald-200 shrink-0">
                                      {isBn ? 'বিশ্বস্ত' : 'Safe'}
                                    </span>
                                  ) : courierStat.level === 'new' ? (
                                    <span className="text-[9px] font-bold text-blue-700 bg-blue-100/90 px-1 py-0.2 rounded border border-blue-200 shrink-0">
                                      {isBn ? 'নতুন' : 'New'}
                                    </span>
                                  ) : custHistory.trustLevel === 'high_risk' ? (
                                    <span className="text-[9px] font-bold text-rose-700 bg-rose-100/90 px-1 py-0.2 rounded border border-rose-200 shrink-0">
                                      {isBn ? 'ঝুঁকি' : 'Risk'}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] mt-1 text-stone-600 flex-wrap">
                                  <span
                                    className="text-emerald-700 font-bold inline-flex items-center gap-0.5 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/80"
                                    title={isBn ? 'কাস্টমার কুরিয়ারে কয়টি পার্সেল সফলভাবে ডেলিভারি / রিসিভ করেছে' : 'Parcels received / delivered'}
                                  >
                                    ✅ <span className="text-[9px] font-medium font-sans">{isBn ? 'রিসিভ:' : 'Del:'}</span>
                                    <span className="font-mono font-bold">{toLocalizedNumber(courierStat.totalDelivered, adminLanguage)}</span>
                                  </span>
                                  <span
                                    className="text-rose-700 font-bold inline-flex items-center gap-0.5 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200/80"
                                    title={isBn ? 'কাস্টমার কুরিয়ারে কয়টি পার্সেল বাতিল বা রিটার্ন করেছে' : 'Parcels cancelled / returned'}
                                  >
                                    ❌ <span className="text-[9px] font-medium font-sans">{isBn ? 'বাতিল:' : 'Can:'}</span>
                                    <span className="font-mono font-bold">{toLocalizedNumber(courierStat.totalCancelled, adminLanguage)}</span>
                                  </span>
                                  {courierStat.totalParcels > 0 && (
                                    <span className="text-stone-500 font-sans text-[9px] font-semibold" title={isBn ? 'সফল ডেলিভারির শতকরা হার' : 'Success rate'}>
                                      ({toLocalizedNumber(courierStat.deliveryRate, adminLanguage)}%)
                                    </span>
                                  )}
                                  <span className="ml-auto text-[9px] font-sans font-bold text-rose-600 group-hover/cust:underline">
                                    {isBn ? 'হিস্ট্রি ↗' : 'History ↗'}
                                  </span>
                                </div>
                              </>
                            ) : (
                              <>
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
                                <div className="flex items-center gap-1.5 text-[10px] mt-1 text-stone-500 flex-wrap">
                                  <span
                                    className="text-emerald-700 font-bold inline-flex items-center gap-0.5 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/80"
                                    title={isBn ? 'ডেলিভারি সম্পন্ন (রিসিভ)' : 'Delivered'}
                                  >
                                    ✅ <span className="text-[9px] font-medium font-sans">{isBn ? 'রিসিভ:' : 'Del:'}</span>
                                    <span className="font-mono font-bold">{toLocalizedNumber(custHistory.deliveredOrders, adminLanguage)}</span>
                                  </span>
                                  <span
                                    className="text-rose-600 font-bold inline-flex items-center gap-0.5 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200/80"
                                    title={isBn ? 'অর্ডার বাতিল' : 'Cancelled'}
                                  >
                                    ❌ <span className="text-[9px] font-medium font-sans">{isBn ? 'বাতিল:' : 'Can:'}</span>
                                    <span className="font-mono font-bold">{toLocalizedNumber(custHistory.cancelledOrders, adminLanguage)}</span>
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
                              </>
                            )}
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
                        <div className="space-y-1.5 min-w-[130px]">
                          {/* 1-Click Fast Steadfast Courier Dispatch Button */}
                          <button
                            type="button"
                            onClick={() => handleQuickSendSteadfast(order)}
                            disabled={quickSendingOrderId === order.id}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 px-2.5 py-1.5 rounded-lg shadow-2xs transition w-full justify-center cursor-pointer disabled:opacity-50"
                            title={isBn ? 'সরাসরি ১-ক্লিকে স্টিডফাস্ট কুরিয়ারে বুকিং করুন' : '1-Click Send to Steadfast Courier'}
                          >
                            {quickSendingOrderId === order.id ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>{isBn ? 'বুকিং হচ্ছে...' : 'Booking...'}</span>
                              </>
                            ) : (
                              <>
                                <Truck className="w-3.5 h-3.5" />
                                <span>{isBn ? '📦 স্টিডফাস্টে পাঠান' : '📦 Send to Steadfast'}</span>
                              </>
                            )}
                          </button>

                          {/* Secondary options button for Pathao / details modal */}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveOrderForModal(order);
                              setModalInitialTab('courier');
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-600 hover:text-indigo-700 bg-stone-100 hover:bg-indigo-50 px-2 py-0.5 rounded border border-stone-200 hover:border-indigo-200 transition w-full justify-center cursor-pointer"
                            title={isBn ? 'কুরিয়ার বুকিং ফর্ম বা অন্য কুরিয়ার সিলেক্ট করুন' : 'Open Courier Booking Form'}
                          >
                            <span>🚚</span>
                            <span>{isBn ? 'বুকিং ফর্ম / বিস্তারিত' : 'Booking Form'}</span>
                          </button>
                        </div>
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
                          onClick={() => setEditingOrder(order)}
                          className="p-1.5 text-stone-500 hover:text-amber-600 rounded-lg hover:bg-stone-100"
                          title={isBn ? 'অর্ডারের তথ্য এডিট করুন' : 'Edit order details'}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickSendConfirmSms(order)}
                          disabled={sendingSmsOrderId === order.id}
                          className="p-1.5 text-stone-500 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 transition relative group cursor-pointer disabled:opacity-50"
                          title={isBn ? 'কাস্টমারকে সরাসরি অর্ডার কনফার্ম SMS পাঠান' : '1-Click Send Confirm SMS to Customer'}
                        >
                          {sendingSmsOrderId === order.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                          ) : (
                            <MessageSquare className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition" />
                          )}
                          {order.smsLogs && order.smsLogs.length > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white" title={isBn ? `${order.smsLogs.length}টি SMS পাঠানো হয়েছে` : `${order.smsLogs.length} SMS sent`} />
                          )}
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
          courierHistory={courierHistories[normalizePhoneNumber(selectedCustomerSummary.phone)]}
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
          courierHistory={courierHistories[normalizePhoneNumber(activeOrderForModal.customerPhone)]}
          initialTab={modalInitialTab}
          onClose={() => setActiveOrderForModal(null)}
        />
      )}

      {activeOrderForInvoice && (
        <InvoiceModal
          order={activeOrderForInvoice}
          onClose={() => setActiveOrderForInvoice(null)}
        />
      )}

      {bulkInvoicesModalOrders && (
        <InvoiceModal
          orders={bulkInvoicesModalOrders}
          onClose={() => setBulkInvoicesModalOrders(null)}
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
                    setSyncToast({
                      success: false,
                      message: isBn ? 'ডাটা মুছতে ত্রুটি হয়েছে' : 'Failed to clear demo data'
                    });
                    setTimeout(() => setSyncToast(null), 4000);
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

      {/* Delete Confirmation Modal (In-App Dialog - Not Blocked by iFrame) */}
      {deleteModalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-stone-900">
                {deleteModalState.type === 'bulk'
                  ? (isBn
                      ? `নির্বাচিত ${toLocalizedNumber(deleteModalState.orderIds?.length || selectedOrderIds.length, adminLanguage)}টি অর্ডার মুছবেন?`
                      : `Delete ${deleteModalState.orderIds?.length || selectedOrderIds.length} selected order(s)?`)
                  : (isBn
                      ? `অর্ডার #${deleteModalState.orderId} মুছে ফেলবেন?`
                      : `Delete order #${deleteModalState.orderId}?`)}
              </h3>
              <p className="text-xs text-stone-500 mt-2 leading-relaxed">
                {isBn
                  ? 'এই কাজটি সম্পন্ন করলে অর্ডারগুলো স্থায়ীভাবে সিস্টেম থেকে মুছে যাবে এবং তা আর পুনরুদ্ধার করা সম্ভব হবে না।'
                  : 'This action cannot be undone. The selected order(s) will be permanently deleted from the system.'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setDeleteModalState({ isOpen: false, type: 'bulk' })}
                disabled={isApplyingBulk}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition cursor-pointer"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteModal}
                disabled={isApplyingBulk}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isApplyingBulk ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{isBn ? 'মুছে ফেলা হচ্ছে...' : 'Deleting...'}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isBn ? 'হ্যাঁ, মুছে ফেলুন' : 'Yes, Delete'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {editingOrder && (
        <OrderEditModal
          order={editingOrder}
          isOpen={Boolean(editingOrder)}
          onClose={() => setEditingOrder(null)}
        />
      )}
    </div>
  );
}
