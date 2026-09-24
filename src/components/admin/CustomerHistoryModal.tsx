import { useState, useEffect } from 'react';
import { CustomerHistorySummary, normalizePhoneNumber } from '../../utils/customerHistory.ts';
import { Order, OrderStatus, CourierCustomerHistory } from '../../types.ts';
import { useApp } from '../../context/AppContext.tsx';
import { api } from '../../services/api.ts';
import { AdminLanguage, toLocalizedNumber, toLocalizedCurrency, toLocalizedDate } from '../../utils/translations.ts';
import {
  X,
  Phone,
  ExternalLink,
  ShoppingBag,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Truck,
  Eye,
  CreditCard,
  Copy,
  Check,
  MapPin,
  Globe,
  ShieldAlert,
  Package,
  Layers,
  FileText,
  RefreshCw
} from 'lucide-react';

interface CustomerHistoryModalProps {
  summary: CustomerHistorySummary;
  courierHistory?: CourierCustomerHistory;
  adminLanguage: AdminLanguage;
  onClose: () => void;
  onViewOrderDetails?: (order: Order) => void;
}

export default function CustomerHistoryModal({
  summary,
  courierHistory,
  adminLanguage,
  onClose,
  onViewOrderDetails
}: CustomerHistoryModalProps) {
  const {
    incompleteOrders,
    convertIncompleteToOrder,
    landingPages,
    fraudControl,
    blockCustomer,
    unblockCustomer,
    blockIp,
    unblockIp
  } = useApp();

  const isBn = adminLanguage === 'bn';
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedIp, setCopiedIp] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'incomplete'>('orders');
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [isBlocking, setIsBlocking] = useState(false);

  // Live Courier stats state
  const [courierData, setCourierData] = useState<CourierCustomerHistory | null>(courierHistory || null);
  const [isLoadingCourier, setIsLoadingCourier] = useState<boolean>(!courierHistory);
  const [courierError, setCourierError] = useState<string | null>(null);

  const fetchCourierData = async () => {
    setIsLoadingCourier(true);
    setCourierError(null);
    try {
      const res = await api.checkCustomerCourier(summary.phone);
      if (res.success && res.history) {
        setCourierData(res.history);
      }
    } catch (err: any) {
      setCourierError(err?.message || (isBn ? 'কুরিয়ার হিস্ট্রি লোড করা সম্ভব হয়নি' : 'Failed to load courier stats'));
    } finally {
      setIsLoadingCourier(false);
    }
  };

  useEffect(() => {
    if (!courierHistory) {
      fetchCourierData();
    } else {
      setCourierData(courierHistory);
    }
  }, [summary.phone, courierHistory]);

  // Normalize phone for comparison
  const normPhone = normalizePhoneNumber(summary.phone);

  // Check fraud control status
  const isPhoneBlocked = (fraudControl?.blockedPhones || []).some(
    b => normalizePhoneNumber(b.phone) === normPhone
  );
  const isIpBlocked = summary.lastKnownIp
    ? (fraudControl?.blockedIps || []).some(b => b.ip === summary.lastKnownIp?.trim())
    : false;

  // Filter incomplete orders for this customer
  const customerIncompletes = incompleteOrders.filter(
    inc => normalizePhoneNumber(inc.customerPhone) === normPhone
  );

  const statusColors: Record<OrderStatus, string> = {
    pending: 'bg-amber-50 text-amber-800 border-amber-300',
    confirmed: 'bg-blue-50 text-blue-800 border-blue-300',
    processing: 'bg-purple-50 text-purple-800 border-purple-300',
    in_courier: 'bg-indigo-50 text-indigo-800 border-indigo-300',
    delivered: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    cancelled: 'bg-rose-50 text-rose-800 border-rose-300',
    returned: 'bg-stone-100 text-stone-700 border-stone-300'
  };

  const statusLabel = (status: OrderStatus): string => {
    switch (status) {
      case 'pending':
        return isBn ? 'পেন্ডিং' : 'Pending';
      case 'confirmed':
        return isBn ? 'কনফার্মড' : 'Confirmed';
      case 'processing':
        return isBn ? 'প্রসেসিং' : 'Processing';
      case 'in_courier':
        return isBn ? 'কুরিয়ারে' : 'In Courier';
      case 'delivered':
        return isBn ? 'ডেলিভার্ড' : 'Delivered';
      case 'cancelled':
        return isBn ? 'বাতিল' : 'Cancelled';
      case 'returned':
        return isBn ? 'রিটার্ন' : 'Returned';
      default:
        return status;
    }
  };

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(summary.phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleCopyIp = () => {
    if (summary.lastKnownIp) {
      navigator.clipboard.writeText(summary.lastKnownIp);
      setCopiedIp(true);
      setTimeout(() => setCopiedIp(false), 2000);
    }
  };

  const handleToggleBlockPhone = async () => {
    setIsBlocking(true);
    try {
      if (isPhoneBlocked) {
        await unblockCustomer(summary.phone);
      } else {
        await blockCustomer({
          phone: summary.phone,
          ip: summary.lastKnownIp,
          name: summary.name,
          reason: 'অ্যাডমিন কর্তৃক কাস্টমার হিস্ট্রি থেকে ব্লক'
        });
      }
    } finally {
      setIsBlocking(false);
    }
  };

  const handleToggleBlockIp = async () => {
    if (!summary.lastKnownIp) return;
    setIsBlocking(true);
    try {
      if (isIpBlocked) {
        await unblockIp(summary.lastKnownIp);
      } else {
        await blockIp({
          ip: summary.lastKnownIp,
          name: summary.name,
          associatedPhone: summary.phone,
          reason: 'অ্যাডমিন কর্তৃক কাস্টমার হিস্ট্রি থেকে আইপি ব্লক'
        });
      }
    } finally {
      setIsBlocking(false);
    }
  };

  const handleConvertIncomplete = async (id: string) => {
    setConvertingId(id);
    try {
      await convertIncompleteToOrder(id);
    } finally {
      setConvertingId(null);
    }
  };

  // Helper to find image thumbnail for item
  const getItemThumbnail = (landingPageId: string, itemVariantName: string, itemImage?: string) => {
    if (itemImage) return itemImage;
    const page = landingPages.find(p => p.id === landingPageId);
    if (!page) return '';
    const prod = page.products.find(p => p.name === itemVariantName || p.id === itemVariantName);
    if (prod && prod.image) return prod.image;
    return page.mainImage || (page.galleryImages && page.galleryImages[0]) || '';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-stone-200 text-stone-800 max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-stone-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center text-white font-bold shrink-0 shadow-md">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-base sm:text-lg leading-tight">
                  {summary.name}
                </h3>
                {summary.trustLevel === 'trusted' && (
                  <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-semibold">
                    <ShieldCheck className="w-3 h-3" />
                    {isBn ? 'বিশ্বস্ত কাস্টমার' : 'Trusted Customer'}
                  </span>
                )}
                {summary.trustLevel === 'high_risk' && (
                  <span className="inline-flex items-center gap-1 text-[11px] bg-rose-500/25 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full font-semibold">
                    <AlertTriangle className="w-3 h-3" />
                    {isBn ? 'উচ্চ ক্যানসেল ঝুঁকি' : 'High Risk'}
                  </span>
                )}
                {summary.trustLevel === 'new' && (
                  <span className="inline-flex items-center gap-1 text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-semibold">
                    <Sparkles className="w-3 h-3" />
                    {isBn ? 'নতুন কাস্টমার' : 'New Customer'}
                  </span>
                )}
                {(isPhoneBlocked || isIpBlocked) && (
                  <span className="inline-flex items-center gap-1 text-[11px] bg-rose-600 text-white px-2 py-0.5 rounded-full font-bold">
                    <ShieldAlert className="w-3 h-3" />
                    {isBn ? 'ব্লকড কাস্টমার' : 'Blocked'}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-300 mt-1 flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-rose-400 bg-stone-800/80 px-1.5 py-0.5 rounded">
                  {summary.phone}
                </span>
                {summary.lastKnownIp && (
                  <span className="font-mono text-[11px] text-stone-400 flex items-center gap-1">
                    <Globe className="w-3 h-3 text-stone-400" />
                    {summary.lastKnownIp}
                  </span>
                )}
                <span className="hidden sm:inline text-stone-500">•</span>
                <span className="text-stone-400">
                  {isBn ? 'কাস্টমারের সকল অর্ডার ও ডিটেইলস' : 'All orders & product details'}
                </span>
              </p>
            </div>
          </div>

          {/* Quick Action Icons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleCopyPhone}
              className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg transition"
              title={isBn ? 'নাম্বার কপি করুন' : 'Copy phone'}
            >
              {copiedPhone ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <a
              href={`tel:${summary.phone}`}
              className="p-2 bg-stone-800 hover:bg-emerald-600 text-white rounded-lg transition"
              title={isBn ? 'কল দিন' : 'Call customer'}
            >
              <Phone className="w-4 h-4" />
            </a>
            <a
              href={`https://wa.me/88${summary.phone.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-stone-800 hover:bg-emerald-600 text-white rounded-lg transition"
              title="WhatsApp"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-bar: Address & Fraud Control Status */}
        <div className="bg-stone-50 px-5 py-3 border-b border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2 max-w-lg">
            <MapPin className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-stone-700">
                {isBn ? 'সর্বশেষ ডেলিভারি ঠিকানা:' : 'Last Known Address:'}
              </span>
              <p className="text-stone-600 font-medium mt-0.5">
                {summary.lastKnownAddress || (isBn ? 'ঠিকানা রেকর্ড পাওয়া যায়নি' : 'No address recorded')}
              </p>
            </div>
          </div>

          {/* Quick Block / Unblock buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={handleToggleBlockPhone}
              disabled={isBlocking}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs ${
                isPhoneBlocked
                  ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>
                {isPhoneBlocked
                  ? (isBn ? 'ফোন আনব্লক করুন' : 'Unblock Phone')
                  : (isBn ? 'ফোন ব্লক করুন' : 'Block Phone')}
              </span>
            </button>

            {summary.lastKnownIp && (
              <button
                type="button"
                onClick={handleToggleBlockIp}
                disabled={isBlocking}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs ${
                  isIpBlocked
                    ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>
                  {isIpBlocked
                    ? (isBn ? 'আইপি আনব্লক করুন' : 'Unblock IP')
                    : (isBn ? 'আইপি ব্লক করুন' : 'Block IP')}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Courier-Specific Order History (Steadfast Courier Delivery & Cancellation Record) */}
          <div className="bg-gradient-to-br from-stone-900 to-stone-850 text-white rounded-2xl p-4 sm:p-5 shadow-md border border-stone-700">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-stone-700/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{isBn ? 'কুরিয়ার ডেলিভারি ও ক্যানসেল হিস্ট্রি' : 'Courier Delivery & Cancellation History'}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-700/80 text-rose-300 border border-stone-600">
                      {courierData?.isLiveCourier ? 'Steadfast Live API' : (isBn ? 'স্টোর অর্ডার রেকর্ড' : 'Store Records')}
                    </span>
                  </h4>
                  <p className="text-[11px] text-stone-300 mt-0.5">
                    {isBn
                      ? `কাস্টমারের ফোন নাম্বার (${summary.phone}) দিয়ে কুরিয়ারে মোট ডেলিভারি ও ক্যানসেলের রেকর্ড`
                      : `Total parcels delivered vs cancelled for phone (${summary.phone}) across couriers`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={fetchCourierData}
                disabled={isLoadingCourier}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-700 hover:bg-stone-600 text-stone-200 text-xs font-semibold transition disabled:opacity-50"
                title={isBn ? 'কুরিয়ার থেকে সর্বশেষ ডাটা রিফ্রেশ করুন' : 'Refresh courier stats'}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCourier ? 'animate-spin text-rose-400' : ''}`} />
                <span>{isLoadingCourier ? (isBn ? 'চেক হচ্ছে...' : 'Checking...') : (isBn ? 'রিফ্রেশ' : 'Refresh')}</span>
              </button>
            </div>

            {isLoadingCourier ? (
              <div className="py-6 flex items-center justify-center gap-2 text-stone-300 text-xs">
                <RefreshCw className="w-4 h-4 animate-spin text-rose-400" />
                <span>{isBn ? 'কুরিয়ার সার্ভার থেকে কাস্টমারের ডেলিভারি ও ক্যানসেল হিস্ট্রি লোড হচ্ছে...' : 'Fetching customer courier stats...'}</span>
              </div>
            ) : courierData ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* Total Parcels */}
                  <div className="bg-stone-800/90 border border-stone-700 rounded-xl p-3 text-center">
                    <span className="text-[11px] font-medium text-stone-300 block">
                      {isBn ? 'কুরিয়ারে মোট পার্সেল' : 'Total Parcels'}
                    </span>
                    <span className="text-2xl font-black text-white block mt-0.5">
                      {toLocalizedNumber(courierData.totalParcels, adminLanguage)}
                    </span>
                    <span className="text-[10px] text-stone-400">
                      {isBn ? 'সকল মার্চেন্ট মিলে' : 'across all merchants'}
                    </span>
                  </div>

                  {/* Total Delivered */}
                  <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-3 text-center">
                    <span className="text-[11px] font-medium text-emerald-300 flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      {isBn ? 'সফল ডেলিভারি' : 'Delivered'}
                    </span>
                    <span className="text-2xl font-black text-emerald-400 block mt-0.5">
                      {toLocalizedNumber(courierData.totalDelivered, adminLanguage)}
                    </span>
                    <span className="text-[10px] text-emerald-300/80 font-medium">
                      {isBn ? 'কুরিয়ারে রিসিভড' : 'Completed'}
                    </span>
                  </div>

                  {/* Total Cancelled / Returned */}
                  <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-3 text-center">
                    <span className="text-[11px] font-medium text-rose-300 flex items-center justify-center gap-1">
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      {isBn ? 'ক্যানসেল / রিটার্ন' : 'Cancelled / Return'}
                    </span>
                    <span className="text-2xl font-black text-rose-400 block mt-0.5">
                      {toLocalizedNumber(courierData.totalCancelled, adminLanguage)}
                    </span>
                    <span className="text-[10px] text-rose-300/80 font-medium">
                      {isBn ? 'পার্সেল ফেরত বা বাতিল' : 'Cancelled in courier'}
                    </span>
                  </div>

                  {/* Courier Success Rate & Risk Level */}
                  <div className={`border rounded-xl p-3 text-center ${
                    courierData.level === 'risk' || (courierData.totalCancelled > courierData.totalDelivered && courierData.totalCancelled >= 2)
                      ? 'bg-rose-900/30 border-rose-700/80'
                      : courierData.level === 'caution'
                      ? 'bg-amber-900/30 border-amber-700/80'
                      : 'bg-emerald-900/30 border-emerald-700/80'
                  }`}>
                    <span className="text-[11px] font-medium text-stone-300 block">
                      {isBn ? 'সাকসেস রেট ও ঝুঁকি' : 'Success Rate & Risk'}
                    </span>
                    <span className="text-2xl font-black text-white block mt-0.5">
                      {toLocalizedNumber(courierData.deliveryRate, adminLanguage)}%
                    </span>
                    <div className="mt-1 flex items-center justify-center gap-1">
                      {courierData.level === 'risk' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-600 text-white rounded-md">
                          {isBn ? 'উচ্চ ঝুঁকি (High Risk)' : 'High Risk'}
                        </span>
                      )}
                      {courierData.level === 'caution' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500 text-white rounded-md">
                          {isBn ? 'সতর্কতা (Caution)' : 'Caution'}
                        </span>
                      )}
                      {courierData.level === 'safe' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-600 text-white rounded-md">
                          {isBn ? 'নিরাপদ কাস্টমার' : 'Safe Customer'}
                        </span>
                      )}
                      {courierData.level === 'new' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-600 text-white rounded-md">
                          {isBn ? 'নতুন কাস্টমার' : 'New Customer'}
                        </span>
                      )}
                      {courierData.score !== undefined && (
                        <span className="text-[10px] text-stone-300 font-mono">
                          ({toLocalizedNumber(courierData.score, adminLanguage)}/100)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Courier Advisory Banner */}
                {courierData.totalCancelled > courierData.totalDelivered && courierData.totalCancelled >= 2 && (
                  <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-start gap-2.5 text-xs text-rose-200">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold text-white block">
                        {isBn ? 'সতর্কতা: কুরিয়ারে অধিক ক্যানসেলের রেকর্ড রয়েছে!' : 'Warning: High Cancellation Rate in Courier!'}
                      </strong>
                      <p className="mt-0.5 text-rose-300 leading-relaxed">
                        {isBn
                          ? `এই কাস্টমারের কুরিয়ারে মোট ${toLocalizedNumber(courierData.totalParcels, 'bn')} টি পার্সেলের মধ্যে ${toLocalizedNumber(courierData.totalCancelled, 'bn')} টি পার্সেল বাতিল বা রিটার্ন হয়েছে। পার্সেল পাঠানোর পূর্বে কল করে অর্ডার কনফার্ম করে নিন অথবা অগ্রিম ডেলিভারি চার্জ গ্রহণ করুন।`
                          : `This customer has cancelled ${courierData.totalCancelled} out of ${courierData.totalParcels} parcels in courier. Consider confirming via phone call or taking advance delivery charge.`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Courier Note / Remarks */}
                {courierData.notice && (
                  <p className="text-[10px] text-stone-400 italic">
                    ℹ️ {courierData.notice}
                  </p>
                )}
              </div>
            ) : (
              <div className="py-3 text-center text-stone-400 text-xs">
                {courierError || (isBn ? 'কুরিয়ার হিস্ট্রি পাওয়া যায়নি।' : 'No courier records found.')}
              </div>
            )}
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-center">
              <span className="text-[11px] font-medium text-stone-500 block">
                {isBn ? 'এই শপে মোট অর্ডার' : 'Store Total Orders'}
              </span>
              <span className="text-xl font-black text-stone-900 block mt-0.5">
                {toLocalizedNumber(summary.totalOrders, adminLanguage)}
              </span>
              <span className="text-[10px] text-stone-400">
                {isBn ? 'এই ওয়েবসাইট হতে' : 'from this store'}
              </span>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
              <span className="text-[11px] font-medium text-emerald-700 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                {isBn ? 'ডেলিভার্ড' : 'Delivered'}
              </span>
              <span className="text-xl font-black text-emerald-800 block mt-0.5">
                {toLocalizedNumber(summary.deliveredOrders, adminLanguage)}
              </span>
              <span className="text-[10px] text-emerald-600 font-medium">
                {isBn ? 'সফল ডেলিভারি' : 'Completed'}
              </span>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-center">
              <span className="text-[11px] font-medium text-rose-700 flex items-center justify-center gap-1">
                <XCircle className="w-3 h-3 text-rose-600" />
                {isBn ? 'বাতিল' : 'Cancelled'}
              </span>
              <span className="text-xl font-black text-rose-800 block mt-0.5">
                {toLocalizedNumber(summary.cancelledOrders, adminLanguage)}
              </span>
              <span className="text-[10px] text-rose-600 font-medium">
                {isBn ? 'অর্ডার ক্যানসেল' : 'Cancelled'}
              </span>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
              <span className="text-[11px] font-medium text-amber-800 flex items-center justify-center gap-1">
                <RotateCcw className="w-3 h-3 text-amber-600" />
                {isBn ? 'রিটার্ন' : 'Returned'}
              </span>
              <span className="text-xl font-black text-amber-900 block mt-0.5">
                {toLocalizedNumber(summary.returnedOrders, adminLanguage)}
              </span>
              <span className="text-[10px] text-amber-700 font-medium">
                {isBn ? 'পার্সেল ফেরত' : 'Returned'}
              </span>
            </div>
          </div>

          {/* Delivery Success Ratio Bar */}
          <div className="bg-white border border-stone-200 rounded-xl p-3.5 shadow-2xs">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-stone-700 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                {isBn ? 'ডেলিভারি সাকসেস রেট ও লাইফটাইম ভ্যালু' : 'Delivery Success Rate & Lifetime Value'}
              </span>
              <span className="font-extrabold text-sm text-emerald-700">
                {toLocalizedNumber(summary.successRate, adminLanguage)}%
              </span>
            </div>

            <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden border border-stone-200">
              <div
                className={`h-full transition-all duration-500 ${
                  summary.successRate >= 70
                    ? 'bg-emerald-500'
                    : summary.successRate >= 40
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(5, summary.successRate))}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[11px] text-stone-500 mt-2.5 pt-2 border-t border-stone-100">
              <span>
                {isBn ? 'সফল ডেলিভারি বিক্রয়:' : 'Delivered Sales:'}{' '}
                <strong className="text-emerald-700 font-bold">
                  {toLocalizedCurrency(summary.totalDeliveredSpent, adminLanguage)}
                </strong>
              </span>
              <span>
                {isBn ? 'সর্বমোট অর্ডারকৃত ভ্যালু:' : 'Total Lifetime GMV:'}{' '}
                <strong className="text-stone-800 font-bold">
                  {toLocalizedCurrency(summary.totalLifetimeValue, adminLanguage)}
                </strong>
              </span>
            </div>
          </div>

          {/* Navigation Tabs between Placed Orders and Incomplete Checkouts */}
          <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'orders'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>
                {isBn ? 'অর্ডারসমূহ (যা যা অর্ডার করেছে)' : 'Placed Orders'} (
                {toLocalizedNumber(summary.orders.length, adminLanguage)})
              </span>
            </button>

            {customerIncompletes.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('incomplete')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                  activeTab === 'incomplete'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>
                  {isBn ? 'অসম্পূর্ণ অর্ডার চেষ্টা / লিড' : 'Incomplete Attempts'} (
                  {toLocalizedNumber(customerIncompletes.length, adminLanguage)})
                </span>
              </button>
            )}
          </div>

          {/* TAB 1: PLACED ORDERS (What the customer ordered) */}
          {activeTab === 'orders' && (
            <div className="space-y-3">
              {summary.orders.length === 0 ? (
                <div className="text-center py-8 bg-stone-50 rounded-xl border border-stone-200 text-stone-400">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="font-semibold text-sm">{isBn ? 'কোনো অর্ডার পাওয়া যায়নি' : 'No orders found'}</p>
                </div>
              ) : (
                summary.orders.map(ord => (
                  <div
                    key={ord.id}
                    className="bg-white border border-stone-200 rounded-xl p-4 hover:border-stone-300 transition shadow-xs space-y-3"
                  >
                    {/* Order Top Bar: ID, Date, Source, Status, Courier */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs bg-stone-100 text-stone-900 px-2 py-0.5 rounded border border-stone-200">
                          #{ord.id}
                        </span>
                        <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${statusColors[ord.status]}`}>
                          {statusLabel(ord.status)}
                        </span>
                        {ord.courier?.trackingCode && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded font-bold">
                            <Truck className="w-3 h-3 text-indigo-500" />
                            {ord.courier.trackingCode} ({ord.courier.provider})
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-stone-500 flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-stone-400" />
                          {toLocalizedDate(new Date(ord.createdAt), adminLanguage)}
                        </span>
                        <span>•</span>
                        <span className="font-medium text-stone-700 truncate max-w-[160px]" title={ord.landingPageTitle}>
                          {ord.landingPageTitle}
                        </span>
                      </div>
                    </div>

                    {/* ITEMS ORDERED (Exact products, sizes, quantities, images) */}
                    <div>
                      <h5 className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Package className="w-3 h-3 text-stone-400" />
                        <span>{isBn ? 'অর্ডারকৃত প্রোডাক্ট ও সাইজ বিবরণ:' : 'Ordered Items & Variants:'}</span>
                      </h5>

                      <div className="space-y-2">
                        {ord.items.map((it, idx) => {
                          const thumbnail = getItemThumbnail(ord.landingPageId, it.variantName, it.image);
                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2 rounded-lg bg-stone-50/80 border border-stone-200/80 text-xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                {thumbnail ? (
                                  <img
                                    src={thumbnail}
                                    alt={it.variantName}
                                    className="w-10 h-10 object-cover rounded-md border border-stone-200 shrink-0"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-md bg-stone-200 flex items-center justify-center text-stone-400 shrink-0">
                                    <Package className="w-5 h-5" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="font-bold text-stone-900 truncate">{it.variantName}</p>
                                  <div className="text-[11px] text-stone-500 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                                    {it.customSelections && Object.keys(it.customSelections).length > 0 ? (
                                      Object.entries(it.customSelections).map(([k, v]) => (
                                        <span key={k} className="bg-stone-200/60 px-1.5 py-0.2 rounded text-[10px]">
                                          {k}: <strong>{v}</strong>
                                        </span>
                                      ))
                                    ) : (
                                      <span>
                                        {isBn ? 'সাইজ:' : 'Size:'} <strong className="text-stone-700">{it.size || 'Standard'}</strong>
                                        {it.long && <> | {isBn ? 'লং:' : 'Long:'} <strong className="text-indigo-700">{it.long}"</strong></>}
                                      </span>
                                    )}
                                    <span>
                                      | {isBn ? 'পরিমাণ:' : 'Qty:'}{' '}
                                      <strong className="text-stone-800 font-bold">
                                        {toLocalizedNumber(it.quantity, adminLanguage)}
                                      </strong>{' '}
                                      {isBn ? 'টি' : ''}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="text-right shrink-0 pl-2">
                                <span className="font-bold text-stone-900 text-xs block">
                                  {toLocalizedCurrency(it.subtotal, adminLanguage)}
                                </span>
                                <span className="text-[10px] text-stone-400">
                                  @{toLocalizedCurrency(it.unitPrice, adminLanguage)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Order Details Footer: Delivery Address, Charge, Grand Total, and Action */}
                    <div className="bg-stone-50/60 p-2.5 rounded-lg border border-stone-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-stone-600">
                          <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span className="font-semibold">{ord.customerAddress}</span>
                        </div>
                        <p className="text-[10px] text-stone-400 pl-5">
                          {ord.deliveryLocation === 'inside_dhaka'
                            ? (isBn ? 'ডেলিভারি: ঢাকা ভিতরে' : 'Inside Dhaka')
                            : (isBn ? 'ডেলিভারি: ঢাকা বাইরে' : 'Outside Dhaka')}{' '}
                          • {isBn ? 'চার্জ:' : 'Charge:'}{' '}
                          {ord.deliveryCharge === 0
                            ? (isBn ? 'ফ্রি' : 'Free')
                            : toLocalizedCurrency(ord.deliveryCharge, adminLanguage)}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-200">
                        <div className="text-right">
                          <span className="text-[10px] text-stone-500 block">
                            {isBn ? 'সর্বমোট বিল (COD):' : 'Total (COD):'}
                          </span>
                          <span className="text-sm font-black text-rose-700">
                            {toLocalizedCurrency(ord.grandTotal, adminLanguage)}
                          </span>
                        </div>

                        {onViewOrderDetails && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onViewOrderDetails(ord);
                            }}
                            className="px-3 py-1.5 text-xs font-bold text-stone-700 hover:text-stone-900 bg-white hover:bg-stone-100 rounded-lg border border-stone-300 transition flex items-center gap-1 shadow-2xs cursor-pointer"
                            title={isBn ? 'এই অর্ডারের পূর্ণাঙ্গ বিবরণ দেখুন' : 'View full order'}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{isBn ? 'বিস্তারিত' : 'View'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: INCOMPLETE ORDERS / ATTEMPTED CHECKOUTS */}
          {activeTab === 'incomplete' && (
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <Layers className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block">
                    {isBn ? 'কাস্টমার অর্ডার করার চেষ্টা করেছিল কিন্তু সম্পন্ন করেনি' : 'Incomplete Checkout Leads'}
                  </strong>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    {isBn
                      ? 'কাস্টমার নাম ও মোবাইল নাম্বার দিয়ে প্রোডাক্ট সিলেক্ট করেছিল, কিন্তু কনফার্ম করেনি। আপনি ফোনে যোগাযোগ করে সরাসরি এটি অর্ডারে কনভার্ট করতে পারবেন।'
                      : 'The customer selected products and entered details but did not complete the order. You can call and convert it to a real order.'}
                  </p>
                </div>
              </div>

              {customerIncompletes.map(inc => (
                <div
                  key={inc.id}
                  className="bg-white border border-amber-200/90 rounded-xl p-4 shadow-xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-200">
                        {inc.id}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                        {inc.step === 'details_entered'
                          ? (isBn ? 'নাম্বার এন্ট্রি' : 'Phone Entered')
                          : inc.step === 'address_entered'
                          ? (isBn ? 'ঠিকানা এন্ট্রি' : 'Address Entered')
                          : (isBn ? 'ড্রপ অফ' : 'Abandoned')}
                      </span>
                    </div>

                    <div className="text-xs text-stone-500 flex items-center gap-2">
                      <span>{toLocalizedDate(new Date(inc.createdAt), adminLanguage)}</span>
                      <span>•</span>
                      <span className="font-semibold text-stone-700">{inc.landingPageTitle}</span>
                    </div>
                  </div>

                  {/* Items the customer wanted to buy */}
                  <div>
                    <h5 className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">
                      {isBn ? 'যা অর্ডার করতে চেয়েছিল:' : 'Products They Wanted:'}
                    </h5>
                    <div className="space-y-1.5">
                      {inc.items.map((it, idx) => {
                        const thumbnail = getItemThumbnail(inc.landingPageId, it.variantName, it.image);
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 rounded-lg bg-stone-50 border border-stone-200 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              {thumbnail && (
                                <img
                                  src={thumbnail}
                                  alt={it.variantName}
                                  className="w-8 h-8 object-cover rounded border border-stone-200"
                                  referrerPolicy="no-referrer"
                                />
                              )}
                              <div>
                                <span className="font-bold text-stone-900 block">{it.variantName}</span>
                                <span className="text-[10px] text-stone-500">
                                  {it.size || 'Standard'} • {toLocalizedNumber(it.quantity, adminLanguage)} {isBn ? 'টি' : 'qty'}
                                </span>
                              </div>
                            </div>
                            <span className="font-bold text-stone-900 text-xs">
                              {toLocalizedCurrency(it.subtotal, adminLanguage)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Conversion Button */}
                  <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
                    <div>
                      <span className="text-stone-500 text-[11px] block">{isBn ? 'প্রত্যাশিত সর্বমোট বিল:' : 'Estimated Total:'}</span>
                      <strong className="text-sm font-black text-stone-900">
                        {toLocalizedCurrency(inc.grandTotal, adminLanguage)}
                      </strong>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleConvertIncomplete(inc.id)}
                      disabled={convertingId === inc.id}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                    >
                      <CheckCircle2 className={`w-3.5 h-3.5 ${convertingId === inc.id ? 'animate-spin' : ''}`} />
                      <span>{convertingId === inc.id ? (isBn ? 'কনভার্ট হচ্ছে...' : 'Converting...') : (isBn ? 'অর্ডারে রূপান্তর করুন' : 'Convert to Order')}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-stone-50 p-3.5 border-t border-stone-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-bold rounded-lg transition cursor-pointer"
          >
            {isBn ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
