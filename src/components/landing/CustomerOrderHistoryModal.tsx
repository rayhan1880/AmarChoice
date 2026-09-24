import { useState, FormEvent, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { api } from '../../services/api.ts';
import { Order, CourierCustomerHistory } from '../../types.ts';
import {
  X,
  Search,
  PackageCheck,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  ShoppingBag
} from 'lucide-react';

interface CustomerOrderHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPhone?: string;
  themeColor?: string;
}

export default function CustomerOrderHistoryModal({
  isOpen,
  onClose,
  initialPhone = '',
  themeColor = '#e11d48'
}: CustomerOrderHistoryModalProps) {
  const { orders } = useApp();
  const [phoneNumber, setPhoneNumber] = useState(initialPhone);
  const [searchedPhone, setSearchedPhone] = useState(initialPhone);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [courierData, setCourierData] = useState<CourierCustomerHistory | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize or update with initial phone
  useEffect(() => {
    if (initialPhone && isOpen) {
      setPhoneNumber(initialPhone);
      handleSearchPhone(initialPhone);
    }
  }, [initialPhone, isOpen]);

  if (!isOpen) return null;

  const normalizePhone = (raw: string): string => {
    const digits = raw.replace(/\D/g, '');
    if (digits.length >= 11) {
      return digits.slice(-11);
    }
    return digits;
  };

  const handleSearchPhone = async (phoneToQuery: string) => {
    const cleanPhone = normalizePhone(phoneToQuery);
    if (!cleanPhone || cleanPhone.length < 11) {
      setErrorMsg('অনুগ্রহ করে সঠিক ১১ ডিজিটের মোবাইল নাম্বার প্রদান করুন (যেমন: 017XXXXXXXX)');
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);
    setSearchedPhone(cleanPhone);
    setHasSearched(true);

    try {
      // 1. Filter local orders
      const matchedOrders = orders.filter(o => {
        const orderPhone = normalizePhone(o.customerPhone || '');
        return orderPhone === cleanPhone;
      });
      setCustomerOrders(matchedOrders);

      // 2. Fetch live courier customer history from API
      try {
        const res = await api.checkCustomerCourier(cleanPhone);
        if (res && res.history) {
          setCourierData(res.history);
        } else {
          setCourierData(null);
        }
      } catch (courierErr) {
        console.warn('Failed to fetch courier stats for customer:', courierErr);
        setCourierData(null);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'ডাটা লোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSearchPhone(phoneNumber);
  };

  const toBanglaDigits = (num: number | string): string => {
    const bnMap: Record<string, string> = {
      '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
      '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
    };
    return String(num).replace(/[0-9]/g, d => bnMap[d] || d);
  };

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>ডেলিভারি সম্পন্ন</span>
          </span>
        );
      case 'dispatched':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Truck className="w-3.5 h-3.5" />
            <span>কুরিয়ারে পাঠানো হয়েছে</span>
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>প্যাকিং চলছে</span>
          </span>
        );
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>অর্ডার নিশ্চিত</span>
          </span>
        );
      case 'cancelled':
      case 'returned':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" />
            <span>বাতিল / ফেরত</span>
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5" />
            <span>অপেক্ষমাণ (যাচাই চলছে)</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md"
              style={{ backgroundColor: themeColor }}
            >
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold tracking-tight leading-tight">
                অর্ডার ট্র্যাক ও কুরিয়ার হিস্ট্রি
              </h3>
              <p className="text-stone-400 text-xs mt-0.5">
                মোবাইল নাম্বার দিয়ে আপনার অর্ডার স্ট্যাটাস ও কুরিয়ার ডেলিভারি রেকর্ড দেখুন
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input Box */}
        <div className="p-4 sm:p-5 bg-stone-50 border-b border-stone-200">
          <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                placeholder="আপনার মোবাইল নাম্বার লিখুন (যেমন: 01712345678)"
                className="w-full bg-white border border-stone-300 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 transition"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl text-white font-bold text-xs sm:text-sm shadow flex items-center justify-center gap-2 hover:opacity-95 transition disabled:opacity-50 shrink-0"
              style={{ backgroundColor: themeColor }}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>লোড হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>হিস্ট্রি দেখুন</span>
                </>
              )}
            </button>
          </form>

          {errorMsg && (
            <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {!hasSearched && (
            <div className="text-center py-10 px-4 space-y-3">
              <div className="w-16 h-16 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                <Search className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-stone-800">
                মোবাইল নাম্বার দিয়ে সহজেই সার্চ করুন
              </h4>
              <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
                আপনার অর্ডার করা ১১ ডিজিটের ফোন নাম্বার উপরে লিখে <strong>"হিস্ট্রি দেখুন"</strong> বাটনে ক্লিক করলেই আপনার পণ্যগুলোর সর্বশেষ স্ট্যাটাস ও কুরিয়ার ডেলিভারির রেকর্ড দেখতে পাবেন।
              </p>
            </div>
          )}

          {hasSearched && (
            <>
              {/* Courier Delivery Record Banner */}
              <div className="bg-gradient-to-br from-stone-900 via-stone-850 to-stone-900 text-white rounded-2xl p-4 sm:p-5 shadow-md border border-stone-800">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-stone-700/80">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                        <span>কুরিয়ার ডেলিভারি ও ক্যানসেল রিপোর্ট</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-800 text-rose-300 border border-stone-700 font-mono">
                          {searchedPhone}
                        </span>
                      </h4>
                    </div>
                  </div>
                  <span className="text-[10px] text-stone-400 font-mono">
                    {courierData?.source === 'steadfast' ? 'Steadfast Courier API' : 'Courier Network'}
                  </span>
                </div>

                {courierData ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {/* Total Parcels */}
                      <div className="bg-stone-800/80 border border-stone-700/80 rounded-xl p-3 text-center">
                        <span className="text-[11px] text-stone-300 block">কুরিয়ারে মোট পার্সেল</span>
                        <span className="text-xl sm:text-2xl font-black text-white block mt-0.5">
                          {toBanglaDigits(courierData.totalParcels)} টি
                        </span>
                        <span className="text-[10px] text-stone-400">সকল পার্সেল মিলে</span>
                      </div>

                      {/* Total Delivered */}
                      <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-3 text-center">
                        <span className="text-[11px] text-emerald-300 flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>সফল ডেলিভারি</span>
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-emerald-400 block mt-0.5">
                          {toBanglaDigits(courierData.totalDelivered)} টি
                        </span>
                        <span className="text-[10px] text-emerald-300/80 font-medium">রিসিভ সম্পন্ন</span>
                      </div>

                      {/* Total Cancelled */}
                      <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-3 text-center">
                        <span className="text-[11px] text-rose-300 flex items-center justify-center gap-1">
                          <XCircle className="w-3.5 h-3.5 text-rose-400" />
                          <span>ক্যানসেল / রিটার্ন</span>
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-rose-400 block mt-0.5">
                          {toBanglaDigits(courierData.totalCancelled)} টি
                        </span>
                        <span className="text-[10px] text-rose-300/80 font-medium">ফেরত বা বাতিল</span>
                      </div>

                      {/* Delivery Rate */}
                      <div className="bg-stone-800/80 border border-stone-700/80 rounded-xl p-3 text-center">
                        <span className="text-[11px] text-stone-300 block">ডেলিভারি সাফল্যের হার</span>
                        <span className="text-xl sm:text-2xl font-black text-amber-400 block mt-0.5">
                          {toBanglaDigits(courierData.deliveryRate)}%
                        </span>
                        <span className="text-[10px] text-stone-400">
                          {courierData.deliveryRate >= 70 ? 'উচ্চ গ্রহণযোগ্যতা' : 'নিয়মিত রেকর্ড'}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="bg-stone-800/60 p-2.5 rounded-xl border border-stone-700/60 space-y-1.5">
                      <div className="flex justify-between text-[11px] text-stone-300 font-medium">
                        <span>সফল ডেলিভারি রেট প্রগ্রেস:</span>
                        <span className="font-bold text-emerald-400">{toBanglaDigits(courierData.deliveryRate)}%</span>
                      </div>
                      <div className="w-full bg-stone-700 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(5, courierData.deliveryRate))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs text-stone-400 space-y-1">
                    <p>এই নাম্বারের জন্য কোনো পূর্ববর্তী কুরিয়ার ঝুঁকি বা রেকর্ড পাওয়া যায়নি।</p>
                    <p className="text-emerald-400 font-medium">ক্যাশ অন ডেলিভারিতে সম্পূর্ণ নিরাপদ কেনাকাটা করতে পারেন।</p>
                  </div>
                )}
              </div>

              {/* Store Orders Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-rose-600" />
                    <span>এই স্টোরে আপনার অর্ডারসমূহ ({toBanglaDigits(customerOrders.length)} টি)</span>
                  </h4>
                </div>

                {customerOrders.length === 0 ? (
                  <div className="p-6 bg-stone-50 border border-stone-200 rounded-2xl text-center space-y-2">
                    <p className="text-xs text-stone-600 font-medium">
                      এই নাম্বারে ({searchedPhone}) সম্প্রতি কোনো অর্ডার পাওয়া যায়নি।
                    </p>
                    <p className="text-[11px] text-stone-400">
                      আপনি যদি অন্য কোনো নাম্বার দিয়ে অর্ডার করে থাকেন, অনুগ্রহ করে সেই নাম্বার দিয়ে আবার সার্চ করুন।
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customerOrders.map(order => (
                      <div
                        key={order.id}
                        className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-3 hover:border-stone-300 transition"
                      >
                        {/* Order Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-stone-200">
                          <div>
                            <span className="text-xs font-mono font-bold text-stone-900 bg-white px-2 py-0.5 rounded border border-stone-200">
                              #{order.id}
                            </span>
                            <span className="text-[11px] text-stone-500 ml-2">
                              {new Date(order.createdAt).toLocaleDateString('bn-BD', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <div>
                            {getOrderStatusBadge(order.status)}
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="space-y-2">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-3 text-xs bg-white p-2.5 rounded-xl border border-stone-100">
                              <div className="flex items-center gap-2.5 min-w-0">
                                {item.image ? (
                                  <img
                                    src={item.image}
                                    alt={item.variantName}
                                    className="w-10 h-10 object-cover rounded-lg border border-stone-200 shrink-0"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center text-stone-400 shrink-0">
                                    <ShoppingBag className="w-4 h-4" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="font-bold text-stone-900 truncate">
                                    {item.variantName}
                                  </p>
                                  <p className="text-[11px] text-stone-500">
                                    {item.size ? `সাইজ: ${item.size}` : ''} {item.color ? `• কালার: ${item.color}` : ''} × {toBanglaDigits(item.quantity)}
                                  </p>
                                </div>
                              </div>
                              <span className="font-mono font-bold text-stone-900 shrink-0">
                                {toBanglaDigits(item.subtotal || item.unitPrice * item.quantity)}৳
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Total and Courier Tracking Details */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-200/80 text-xs">
                          <div>
                            <span className="text-stone-500">সর্বমোট বিল: </span>
                            <span className="font-extrabold text-stone-900 text-sm font-mono">
                              {toBanglaDigits(order.grandTotal)}৳
                            </span>
                            <span className="ml-2 text-[10px] text-stone-500 bg-stone-200/60 px-1.5 py-0.5 rounded">
                              ক্যাশ অন ডেলিভারি
                            </span>
                          </div>

                          {/* Courier Consignment Tracking Link */}
                          {order.courier && order.courier.trackingCode && (
                            <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-200">
                              <Truck className="w-3.5 h-3.5" />
                              <span className="font-mono font-bold text-[11px]">
                                ট্র্যাকিং: {order.courier.trackingCode}
                              </span>
                              {order.courier.provider === 'steadfast' && (
                                <a
                                  href={`https://steadfast.com.bd/tracking?tracking_code=${order.courier.trackingCode}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 ml-1 inline-flex items-center"
                                  title="কুরিয়ার লাইভ ট্র্যাকিং দেখুন"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-stone-100 border-t border-stone-200 flex items-center justify-between gap-2">
          <p className="text-[11px] text-stone-500">
            প্রয়োজনে কল বা হোয়াটসঅ্যাপে আমাদের কাস্টমার কেয়ারে যোগাযোগ করুন।
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-xs transition"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
}
