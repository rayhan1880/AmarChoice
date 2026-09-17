import { useState, useMemo } from 'react';
import { Order, OrderStatus } from '../../types.ts';
import { useApp } from '../../context/AppContext.tsx';
import { api } from '../../services/api.ts';
import { getCustomerHistory } from '../../utils/customerHistory.ts';
import { getCourierStatusDisplay, getCourierProviderInfo } from '../../utils/courierStatusHelper.ts';
import {
  toLocalizedNumber,
  toLocalizedCurrency,
  toLocalizedDate
} from '../../utils/translations.ts';
import {
  X,
  Phone,
  Truck,
  MessageSquare,
  Printer,
  Calendar,
  Send,
  RefreshCw,
  Clock,
  ExternalLink,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  ShieldCheck,
  XCircle,
  RotateCcw,
  Sparkles,
  UserCheck,
  Eye
} from 'lucide-react';
import InvoiceModal from './InvoiceModal.tsx';
import CustomerHistoryModal from './CustomerHistoryModal.tsx';

interface OrderDetailsModalProps {
  order: Order;
  onClose: () => void;
}

export default function OrderDetailsModal({ order, onClose }: OrderDetailsModalProps) {
  const { orders, updateOrderStatus, sendToCourier, checkCourierStatus, sendSms, settings, refreshAll, adminLanguage } = useApp();
  const isBn = adminLanguage === 'bn';

  const [activeTab, setActiveTab] = useState<'details' | 'courier' | 'sms'>('details');
  const [currentStatus, setCurrentStatus] = useState<OrderStatus>(order.status);
  const [orderNotes, setOrderNotes] = useState(order.notes || '');
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  // Customer order history summary
  const customerHistory = useMemo(() => {
    return getCustomerHistory(order.customerPhone, orders, order.customerName);
  }, [order.customerPhone, order.customerName, orders]);

  // Google Sheet state
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [sheetFeedback, setSheetFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const handleSyncToSheet = async () => {
    try {
      setIsSyncingSheet(true);
      const res = await api.syncOrderToSheet(order.id);
      setSheetFeedback({ success: true, message: res.message });
      await refreshAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'শিটে পাঠানো যায়নি';
      setSheetFeedback({ success: false, message: msg });
    } finally {
      setIsSyncingSheet(false);
    }
  };

  // Courier state
  const [courierProvider, setCourierProvider] = useState<'steadfast' | 'pathao'>(
    order.courier?.provider === 'pathao' ? 'pathao' : 'steadfast'
  );
  const [courierFee, setCourierFee] = useState<number>(order.deliveryCharge || 120);
  const [courierNote, setCourierNote] = useState<string>(order.notes || 'Handle with care');
  const [isDispatchingCourier, setIsDispatchingCourier] = useState(false);
  const [isCheckingCourier, setIsCheckingCourier] = useState(false);

  // SMS state
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('orderConfirmed');
  const [customSmsText, setCustomSmsText] = useState<string>('');
  const [customPhone, setCustomPhone] = useState<string>(order.customerPhone);
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [smsFeedback, setSmsFeedback] = useState<string | null>(null);

  // Invoice modal
  const [showInvoice, setShowInvoice] = useState(false);

  // Handle status update
  const handleSaveStatus = async () => {
    setIsSavingStatus(true);
    try {
      await updateOrderStatus(order.id, currentStatus, orderNotes);
    } finally {
      setIsSavingStatus(false);
    }
  };

  // Handle Courier Dispatch
  const handleCourierEntry = async () => {
    setIsDispatchingCourier(true);
    try {
      await sendToCourier(order.id, courierProvider, courierFee, courierNote);
      setCurrentStatus('in_courier');
    } catch (err) {
      console.error('Courier dispatch error:', err);
    } finally {
      setIsDispatchingCourier(false);
    }
  };

  // Handle live status check & auto-map to order status
  const handleCheckTracking = async () => {
    setIsCheckingCourier(true);
    try {
      const courierStatus = await checkCourierStatus(order.id);
      const s = (courierStatus || '').toLowerCase();
      if (s.includes('delivered') || s.includes('completed')) {
        setCurrentStatus('delivered');
      } else if (s.includes('cancel')) {
        setCurrentStatus('cancelled');
      } else if (s.includes('return') || s.includes('failed')) {
        setCurrentStatus('returned');
      } else if (s.includes('transit') || s.includes('out for delivery') || s.includes('picked')) {
        setCurrentStatus('in_courier');
      }
    } catch (err) {
      console.error('Tracking check error:', err);
    } finally {
      setIsCheckingCourier(false);
    }
  };

  // Format template text
  const getFormattedTemplate = (key: string): string => {
    const templates = settings.smsGateway.templates;
    let raw = templates[key as keyof typeof templates] || '';
    if (!raw) {
      raw = `প্রিয় ${order.customerName}, আপনার অর্ডার #${order.id} প্রসেসিংয়ে রয়েছে। AmarChoice`;
    }
    return raw
      .replace('{customer_name}', order.customerName)
      .replace('{order_id}', order.id)
      .replace('{total}', String(order.grandTotal))
      .replace('{tracking_code}', order.courier?.trackingCode || 'TRK-PENDING')
      .replace('{courier_name}', order.courier?.provider === 'pathao' ? 'Pathao' : 'Steadfast');
  };

  // Handle Send SMS
  const handleSendSms = async () => {
    setIsSendingSms(true);
    setSmsFeedback(null);
    try {
      const messageText = customSmsText.trim() || getFormattedTemplate(selectedTemplateKey);
      await sendSms(order.id, messageText, customPhone);
      setSmsFeedback('এসএমএস সফলভাবে পাঠানো হয়েছে!');
      setCustomSmsText('');
    } catch (err) {
      setSmsFeedback('এসএমএস পাঠাতে সমস্যা হয়েছে।');
    } finally {
      setIsSendingSms(false);
    }
  };

  const statusColors: Record<OrderStatus, string> = {
    pending: 'bg-amber-100 text-amber-800 border-amber-300',
    confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
    processing: 'bg-purple-100 text-purple-800 border-purple-300',
    in_courier: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    delivered: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    cancelled: 'bg-rose-100 text-rose-800 border-rose-300',
    returned: 'bg-stone-200 text-stone-700 border-stone-300'
  };

  const statusBangla: Record<OrderStatus, string> = {
    pending: 'পেন্ডিং (Pending)',
    confirmed: 'কনফার্মড (Confirmed)',
    processing: 'প্রসেসিং (Processing)',
    in_courier: 'কুরিয়ারে (In Courier)',
    delivered: 'ডেলিভার্ড (Delivered)',
    cancelled: 'বাতিল (Cancelled)',
    returned: 'রিটার্ন (Returned)'
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-stone-200 text-stone-800 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b pb-4 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-xl text-stone-900">{order.id}</h3>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${statusColors[order.status]}`}>
                {statusBangla[order.status]}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5 flex items-center gap-2">
              <span>অন-পেইজ: <strong className="text-stone-700">{order.landingPageTitle}</strong></span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-stone-400" />
                {new Date(order.createdAt).toLocaleString('bn-BD')}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowInvoice(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-bold transition border border-stone-300"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>ইনভয়েস</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-200 mt-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'details'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <span>অর্ডার বিবরণ</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('courier')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'courier'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>কুরিয়ার এন্ট্রি (Steadfast / Pathao)</span>
            {order.courier?.trackingCode && (
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sms')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'sms'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>এসএমএস গেটওয়ে</span>
            {order.smsLogs && order.smsLogs.length > 0 && (
              <span className="text-[10px] bg-stone-200 text-stone-700 px-1.5 rounded-full font-bold">
                {order.smsLogs.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* TAB 1: DETAILS */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              {/* Customer Info Card */}
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-stone-500">কাস্টমার তথ্য</h4>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCustomerModal(true)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-white hover:bg-rose-50 text-stone-700 hover:text-rose-700 border border-stone-300 text-xs font-bold transition shadow-2xs cursor-pointer"
                      title={isBn ? 'এই কাস্টমারের সকল পূর্বের অর্ডার ও বিস্তারিত দেখুন' : 'View all orders for this customer'}
                    >
                      <UserCheck className="w-3.5 h-3.5 text-rose-600" />
                      <span>{isBn ? 'কাস্টমার প্রোফাইল ও হিস্ট্রি' : 'Customer History'}</span>
                    </button>
                    <a
                      href={`tel:${order.customerPhone}`}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow"
                    >
                      <Phone className="w-3 h-3" />
                      <span>কল দিন</span>
                    </a>
                    <a
                      href={`https://wa.me/88${order.customerPhone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 text-xs font-bold transition"
                    >
                      <span>WhatsApp</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-stone-500">নাম:</span>
                    <p className="font-bold text-sm text-stone-900">{order.customerName}</p>
                  </div>
                  <div>
                    <span className="text-stone-500">মোবাইল:</span>
                    <p className="font-bold text-sm text-rose-700">{order.customerPhone}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-stone-500">ঠিকানা:</span>
                    <p className="font-medium text-stone-800 whitespace-pre-line mt-0.5 bg-white p-2.5 rounded-lg border border-stone-200">
                      {order.customerAddress}
                    </p>
                  </div>
                </div>
              </div>

              {/* Ordered Items Table */}
              <div className="border border-stone-200 rounded-xl overflow-hidden">
                <div className="bg-stone-100 px-4 py-2 border-b border-stone-200">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-stone-600">অর্ডারকৃত পণ্য</h4>
                </div>
                <div className="divide-y divide-stone-100 p-2">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2">
                      <div className="flex items-center gap-3">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.variantName}
                            className="w-12 h-12 object-cover rounded-lg border border-stone-200"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <div>
                          <p className="font-bold text-xs text-stone-900">{item.variantName}</p>
                          <div className="text-[11px] text-stone-500 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                            {item.customSelections && Object.keys(item.customSelections).length > 0 ? (
                              Object.entries(item.customSelections).map(([key, val]) => (
                                <span key={key} className="bg-stone-100 border border-stone-200 px-1.5 py-0.2 rounded text-[10px]">
                                  {key}: <strong className="text-stone-800 font-bold">{val}</strong>
                                </span>
                              ))
                            ) : (
                              <span>
                                সাইজ: <strong className="text-stone-700">{item.size || 'Standard'}</strong>
                                {item.long && <> | লং: <strong className="text-indigo-700">{item.long}"</strong></>}
                              </span>
                            )}
                            <span>| পরিমাণ: <strong className="text-stone-800 font-bold">{item.quantity}</strong> টি</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-xs text-stone-900">{item.subtotal}৳</p>
                        <p className="text-[10px] text-stone-400">@{item.unitPrice}৳</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Calculation Summary */}
                <div className="bg-stone-50 p-3 border-t border-stone-200 text-xs space-y-1">
                  <div className="flex justify-between text-stone-600">
                    <span>পণ্যের সাবটোটাল:</span>
                    <span className="font-semibold">{order.subtotal}৳</span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>ডেলিভারি চার্জ ({order.deliveryLocation === 'inside_dhaka' ? 'ঢাকা ভিতরে' : 'ঢাকা বাইরে'}):</span>
                    <span className="font-semibold text-emerald-700">
                      {order.deliveryCharge === 0 ? 'ফ্রি ডেলিভারি' : `${order.deliveryCharge}৳`}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-stone-900 border-t border-stone-200 pt-1">
                    <span>সর্বমোট বিল (COD):</span>
                    <span className="text-rose-700 font-extrabold">{order.grandTotal}৳</span>
                  </div>
                </div>
              </div>

              {/* Status & Notes Form */}
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                <h4 className="font-bold text-xs uppercase tracking-wider text-stone-500 mb-3">অর্ডার স্ট্যাটাস ও নোট পরিবর্তন করুন</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">স্ট্যাটাস:</label>
                    <select
                      value={currentStatus}
                      onChange={e => setCurrentStatus(e.target.value as OrderStatus)}
                      className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-rose-500"
                    >
                      <option value="pending">পেন্ডিং (Pending)</option>
                      <option value="confirmed">কনফার্মড (Confirmed)</option>
                      <option value="processing">প্রসেসিং (Processing)</option>
                      <option value="in_courier">কুরিয়ারে পাঠানো হয়েছে (In Courier)</option>
                      <option value="delivered">ডেলিভার্ড সম্পন্ন (Delivered)</option>
                      <option value="cancelled">বাতিল (Cancelled)</option>
                      <option value="returned">রিটার্ন (Returned)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">অভ্যন্তরীণ নোট (Merchant Note):</label>
                    <input
                      type="text"
                      value={orderNotes}
                      onChange={e => setOrderNotes(e.target.value)}
                      placeholder="যেমন: কাস্টমার বিকেলে ডেলিভারি চায়"
                      className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSaveStatus}
                  disabled={isSavingStatus}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow disabled:opacity-50"
                >
                  {isSavingStatus ? 'সেভ হচ্ছে...' : 'স্ট্যাটাস আপডেট করুন'}
                </button>
              </div>

              {/* Google Sheets Integration Card */}
              <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wider text-stone-900">গুগল শিট সিঙ্ক (Google Sheet Sync)</h4>
                      <p className="text-[11px] text-stone-500">
                        {order.googleSheetSynced ? (
                          <span className="text-emerald-700 font-medium">
                            অর্ডারটি গুগল শিটে সফলভাবে রেকর্ড করা হয়েছে
                            {order.googleSheetSyncedAt && ` (${new Date(order.googleSheetSyncedAt).toLocaleString('bn-BD')})`}
                          </span>
                        ) : (
                          'অর্ডারটি এখনো গুগল শিটে পাঠানো হয়নি'
                        )}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSyncToSheet}
                    disabled={isSyncingSheet}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition disabled:opacity-50 shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSheet ? 'animate-spin' : ''}`} />
                    <span>{isSyncingSheet ? 'পাঠানো হচ্ছে...' : order.googleSheetSynced ? 'পুনরায় শিটে পাঠান' : 'শিটে পাঠান'}</span>
                  </button>
                </div>

                {sheetFeedback && (
                  <div
                    className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                      sheetFeedback.success
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-rose-50 border-rose-300 text-rose-800'
                    }`}
                  >
                    {sheetFeedback.success ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    )}
                    <span>{sheetFeedback.message}</span>
                  </div>
                )}
              </div>

              {/* USER ORDER HISTORY SECTION (at the end of order details) */}
              <div className="bg-stone-50/90 p-4 rounded-xl border border-stone-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wider text-stone-900 flex items-center gap-2">
                        <span>{isBn ? 'কাস্টমার অর্ডার ও ডেলিভারি হিস্ট্রি' : 'Customer Order & Delivery History'}</span>
                        {customerHistory.trustLevel === 'trusted' && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                            {isBn ? '✅ বিশ্বস্ত কাস্টমার' : '✅ Trusted Customer'}
                          </span>
                        )}
                        {customerHistory.trustLevel === 'high_risk' && (
                          <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-bold border border-rose-200">
                            {isBn ? '⚠️ উচ্চ ক্যানসেল ঝুঁকি' : '⚠️ High Risk'}
                          </span>
                        )}
                        {customerHistory.trustLevel === 'new' && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold border border-amber-200">
                            {isBn ? '🌟 নতুন কাস্টমার (১ম অর্ডার)' : '🌟 New Customer'}
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-stone-500">
                        {isBn
                          ? `নাম্বার: ${customerHistory.phone} • এই নাম্বার থেকে করা সকল অর্ডারের ট্র্যাক রেকর্ড`
                          : `Phone: ${customerHistory.phone} • Order history across all landing pages`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4 Metric Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-white border border-stone-200 rounded-lg p-2.5 text-center">
                    <span className="text-[11px] font-medium text-stone-500 block">
                      {isBn ? 'মোট অর্ডার করেছে' : 'Total Orders Placed'}
                    </span>
                    <span className="text-lg font-black text-stone-900 block mt-0.5">
                      {toLocalizedNumber(customerHistory.totalOrders, adminLanguage)} {isBn ? 'টি' : ''}
                    </span>
                  </div>

                  <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-2.5 text-center">
                    <span className="text-[11px] font-medium text-emerald-800 block flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      {isBn ? 'ডেলিভারি সম্পন্ন' : 'Delivered'}
                    </span>
                    <span className="text-lg font-black text-emerald-800 block mt-0.5">
                      {toLocalizedNumber(customerHistory.deliveredOrders, adminLanguage)} {isBn ? 'টি' : ''}
                    </span>
                  </div>

                  <div className="bg-rose-50/80 border border-rose-200 rounded-lg p-2.5 text-center">
                    <span className="text-[11px] font-medium text-rose-800 block flex items-center justify-center gap-1">
                      <XCircle className="w-3 h-3 text-rose-600" />
                      {isBn ? 'অর্ডার ক্যানসেল' : 'Cancelled'}
                    </span>
                    <span className="text-lg font-black text-rose-800 block mt-0.5">
                      {toLocalizedNumber(customerHistory.cancelledOrders, adminLanguage)} {isBn ? 'টি' : ''}
                    </span>
                  </div>

                  <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-2.5 text-center">
                    <span className="text-[11px] font-medium text-amber-900 block flex items-center justify-center gap-1">
                      <RotateCcw className="w-3 h-3 text-amber-600" />
                      {isBn ? 'পার্সেল রিটার্ন' : 'Returned'}
                    </span>
                    <span className="text-lg font-black text-amber-900 block mt-0.5">
                      {toLocalizedNumber(customerHistory.returnedOrders, adminLanguage)} {isBn ? 'টি' : ''}
                    </span>
                  </div>
                </div>

                {/* Success rate progress bar */}
                <div className="bg-white p-3 rounded-lg border border-stone-200 space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-stone-700">
                    <span>{isBn ? 'ডেলিভারি সাকসেস রেট:' : 'Delivery Success Rate:'}</span>
                    <span className="font-bold text-emerald-700">
                      {toLocalizedNumber(customerHistory.successRate, adminLanguage)}%
                    </span>
                  </div>
                  <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden border border-stone-200">
                    <div
                      className={`h-full transition-all duration-300 ${
                        customerHistory.successRate >= 70
                          ? 'bg-emerald-500'
                          : customerHistory.successRate >= 40
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, customerHistory.successRate))}%` }}
                    />
                  </div>
                </div>

                {/* List of customer's previous orders */}
                {customerHistory.orders.length > 0 && (
                  <div className="border border-stone-200 rounded-lg overflow-hidden bg-white divide-y divide-stone-100 text-xs">
                    <div className="p-2.5 bg-stone-100 font-bold text-stone-700 text-[11px] uppercase tracking-wider flex justify-between items-center">
                      <span>{isBn ? 'এই কাস্টমারের সকল অর্ডার তালিকা' : 'All Orders From This Customer'}</span>
                      <button
                        type="button"
                        onClick={() => setShowCustomerModal(true)}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>{isBn ? 'পূর্ণাঙ্গ হিস্ট্রি ও প্রোডাক্ট দেখুন →' : 'View Full Details →'}</span>
                      </button>
                    </div>
                    {customerHistory.orders.map(histOrder => (
                      <div
                        key={histOrder.id}
                        className={`p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                          histOrder.id === order.id ? 'bg-amber-50/60 font-semibold' : 'hover:bg-stone-50'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-xs font-bold text-stone-900">#{histOrder.id}</span>
                            {histOrder.id === order.id && (
                              <span className="text-[10px] bg-amber-200 text-amber-900 px-1 rounded font-bold">
                                {isBn ? 'বর্তমান' : 'Current'}
                              </span>
                            )}
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${statusColors[histOrder.status]}`}>
                              {statusBangla[histOrder.status] || histOrder.status}
                            </span>
                          </div>
                          <p className="text-[10px] text-stone-500">
                            {toLocalizedDate(new Date(histOrder.createdAt), adminLanguage)} • {histOrder.landingPageTitle}
                          </p>
                          <div className="text-[11px] text-stone-700 font-medium">
                            {histOrder.items.map((it, idx) => (
                              <span key={idx} className="mr-2 inline-block">
                                • {it.quantity}x {it.variantName} {it.size ? `(${it.size})` : ''}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold text-stone-900 text-xs block">
                            {toLocalizedCurrency(histOrder.grandTotal, adminLanguage)}
                          </span>
                          {histOrder.courier?.trackingCode && (
                            <span className="text-[9px] text-indigo-700 font-mono block">
                              {histOrder.courier.trackingCode}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: COURIER (STEADFAST & PATHAO) */}
          {activeTab === 'courier' && (
            <div className="space-y-4">
              {/* Existing Courier Info (if dispatched) */}
              {order.courier && order.courier.trackingCode ? (
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Truck className="w-5 h-5 text-emerald-700" />
                      <h4 className="font-bold text-sm text-emerald-900 uppercase">
                        {order.courier.provider} কুরিয়ারে এন্ট্রি সম্পন্ন!
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={handleCheckTracking}
                      disabled={isCheckingCourier}
                      className="flex items-center gap-1.5 px-3 py-1 bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold transition shadow-xs"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isCheckingCourier ? 'animate-spin' : ''}`} />
                      <span>লাইভ স্ট্যাটাস চেক করুন</span>
                    </button>
                  </div>

                  {(() => {
                    const courierInfo = getCourierProviderInfo(order.courier.provider);
                    const courierStatus = getCourierStatusDisplay(order.courier.status, adminLanguage);
                    return (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white p-3.5 rounded-lg border border-emerald-200">
                          <div>
                            <span className="text-stone-400 block text-[10px]">{isBn ? 'কুরিয়ার কোম্পানি:' : 'Courier Service:'}</span>
                            <strong className="text-stone-900 uppercase font-extrabold flex items-center gap-1 mt-0.5">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${courierInfo.badgeClass}`}>
                                {courierInfo.name}
                              </span>
                            </strong>
                          </div>
                          <div>
                            <span className="text-stone-400 block text-[10px]">{isBn ? 'ট্র্যাকিং কোড:' : 'Tracking Code:'}</span>
                            <strong className="text-stone-900 font-mono text-sm block mt-0.5">{order.courier.trackingCode}</strong>
                          </div>
                          <div>
                            <span className="text-stone-400 block text-[10px]">{isBn ? 'কনসাইনমেন্ট আইডি:' : 'Consignment ID:'}</span>
                            <strong className="text-stone-700 font-mono block mt-0.5">{order.courier.consignmentId || '—'}</strong>
                          </div>
                          <div>
                            <span className="text-stone-400 block text-[10px]">{isBn ? 'বর্তমান স্ট্যাটাস:' : 'Current Status:'}</span>
                            <div className="mt-0.5">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-xs border shadow-2xs ${courierStatus.badgeClass}`}>
                                {courierStatus.category === 'delivered' && <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />}
                                {courierStatus.category === 'out_for_delivery' && <Truck className="w-3 h-3 text-amber-600 shrink-0" />}
                                {courierStatus.category === 'in_transit' && <Truck className="w-3 h-3 text-blue-600 shrink-0" />}
                                {courierStatus.category === 'cancelled' && <XCircle className="w-3 h-3 text-rose-600 shrink-0" />}
                                {courierStatus.category === 'returned' && <RotateCcw className="w-3 h-3 text-purple-600 shrink-0" />}
                                {courierStatus.category === 'hold' && <AlertCircle className="w-3 h-3 text-orange-600 shrink-0" />}
                                {courierStatus.category === 'pending' && <Clock className="w-3 h-3 text-stone-500 shrink-0" />}
                                <span>{courierStatus.label}</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Status explanation bar */}
                        <div className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 ${courierStatus.badgeClass}`}>
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4 shrink-0" />
                            <div>
                              <span className="font-bold block">{courierStatus.label}</span>
                              {courierStatus.subLabel && <span className="text-[11px] opacity-80">{courierStatus.subLabel}</span>}
                            </div>
                          </div>
                          {order.courier.sentAt && (
                            <span className="text-[10px] opacity-75 shrink-0">
                              {isBn ? 'বুকিং:' : 'Booked:'} {toLocalizedDate(new Date(order.courier.sentAt), adminLanguage)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>এই অর্ডারের জন্য এখনো কুরিয়ার বুকিং দেওয়া হয়নি। নিচের ফর্ম থেকে সরাসরি কুরিয়ার এন্ট্রি দিন।</span>
                </div>
              )}

              {/* Courier Entry Form */}
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-stone-700">
                  {order.courier?.trackingCode ? 'পুনরায় কুরিয়ার এন্ট্রি / পরিবর্তন' : 'নতুন কুরিয়ার বুকিং এন্ট্রি'}
                </h4>

                {/* Courier Selection Radios */}
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      courierProvider === 'steadfast'
                        ? 'bg-red-50 border-red-500 ring-2 ring-red-100'
                        : 'bg-white border-stone-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="courierProvider"
                      checked={courierProvider === 'steadfast'}
                      onChange={() => setCourierProvider('steadfast')}
                      className="text-red-600"
                    />
                    <div>
                      <span className="font-bold text-xs text-stone-900 block">Steadfast Courier</span>
                      <span className="text-[10px] text-stone-500">স্টেডফাস্ট কুরিয়ার সার্ভিস</span>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      courierProvider === 'pathao'
                        ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-100'
                        : 'bg-white border-stone-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="courierProvider"
                      checked={courierProvider === 'pathao'}
                      onChange={() => setCourierProvider('pathao')}
                      className="text-rose-600"
                    />
                    <div>
                      <span className="font-bold text-xs text-stone-900 block">Pathao Courier</span>
                      <span className="text-[10px] text-stone-500">পাঠাও পার্সেল ডেলিভারি</span>
                    </div>
                  </label>
                </div>

                {/* Pre-filled Details to Send */}
                <div className="bg-white p-3 rounded-lg border border-stone-200 text-xs space-y-2">
                  <p className="font-bold text-stone-600 text-[11px]">কুরিয়ারে পাঠানো হবে এমন তথ্য:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-stone-700">
                    <div>
                      <span className="text-stone-400">গ্রাহকের নাম:</span> <strong>{order.customerName}</strong>
                    </div>
                    <div>
                      <span className="text-stone-400">মোবাইল:</span> <strong>{order.customerPhone}</strong>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-stone-400">ঠিকানা:</span> {order.customerAddress}
                    </div>
                    <div>
                      <span className="text-stone-400">ক্যাশ অন ডেলিভারি (COD):</span> <strong className="text-rose-700">{order.grandTotal}৳</strong>
                    </div>
                  </div>
                </div>

                {/* Delivery Fee & Note */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">কুরিয়ার ডেলিভারি চার্জ (৳):</label>
                    <input
                      type="number"
                      value={courierFee}
                      onChange={e => setCourierFee(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">পার্সেল নোট / নির্দেশনা:</label>
                    <input
                      type="text"
                      value={courierNote}
                      onChange={e => setCourierNote(e.target.value)}
                      placeholder="যেমন: Fragile, Handle with Care"
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCourierEntry}
                  disabled={isDispatchingCourier}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  <Truck className="w-4 h-4" />
                  <span>
                    {isDispatchingCourier
                      ? 'কুরিয়ারে এন্ট্রি দেওয়া হচ্ছে...'
                      : `সরাসরি ${courierProvider === 'pathao' ? 'Pathao' : 'Steadfast'} কুরিয়ার এন্ট্রি দিন`}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: SMS GATEWAY */}
          {activeTab === 'sms' && (
            <div className="space-y-4">
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-stone-700">কাস্টমারকে SMS পাঠান</h4>
                  <span className="text-[11px] text-stone-500">
                    Sender ID: <strong className="text-rose-700">{settings.smsGateway.senderId || 'AmarChoice'}</strong>
                  </span>
                </div>

                {/* Template Selector */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">টেমপ্লেট সিলেক্ট করুন:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTemplateKey('orderReceived');
                        setCustomSmsText('');
                      }}
                      className={`p-2 rounded-lg text-xs font-semibold border text-left transition ${
                        selectedTemplateKey === 'orderReceived' && !customSmsText
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-white border-stone-300 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      অর্ডার গ্রহণ
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTemplateKey('orderConfirmed');
                        setCustomSmsText('');
                      }}
                      className={`p-2 rounded-lg text-xs font-semibold border text-left transition ${
                        selectedTemplateKey === 'orderConfirmed' && !customSmsText
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-white border-stone-300 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      অর্ডার কনফার্ম
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTemplateKey('courierDispatched');
                        setCustomSmsText('');
                      }}
                      className={`p-2 rounded-lg text-xs font-semibold border text-left transition ${
                        selectedTemplateKey === 'courierDispatched' && !customSmsText
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-white border-stone-300 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      কুরিয়ার ট্র্যাকিং
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTemplateKey('delivered');
                        setCustomSmsText('');
                      }}
                      className={`p-2 rounded-lg text-xs font-semibold border text-left transition ${
                        selectedTemplateKey === 'delivered' && !customSmsText
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-white border-stone-300 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      ডেলিভারি সম্পন্ন
                    </button>
                  </div>
                </div>

                {/* Recipient Phone */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">প্রাপকের মোবাইল নাম্বার:</label>
                  <input
                    type="tel"
                    value={customPhone}
                    onChange={e => setCustomPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white font-mono"
                  />
                </div>

                {/* SMS Text Box */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">এসএমএস মেসেজ টেক্সট:</label>
                  <textarea
                    rows={4}
                    value={customSmsText || getFormattedTemplate(selectedTemplateKey)}
                    onChange={e => setCustomSmsText(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white resize-none leading-relaxed font-sans"
                  ></textarea>
                  <div className="flex justify-between text-[11px] text-stone-400 mt-1">
                    <span>
                      অক্ষর সংখ্যা: {(customSmsText || getFormattedTemplate(selectedTemplateKey)).length} টি
                    </span>
                    <span>গেটওয়ে: {settings.smsGateway.provider}</span>
                  </div>
                </div>

                {smsFeedback && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-semibold">
                    {smsFeedback}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSendSms}
                  disabled={isSendingSms}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingSms ? 'এসএমএস পাঠানো হচ্ছে...' : 'এসএমএস পাঠান'}</span>
                </button>
              </div>

              {/* SMS Delivery History / Logs */}
              <div className="border border-stone-200 rounded-xl overflow-hidden">
                <div className="bg-stone-100 px-4 py-2 border-b border-stone-200">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-stone-600">
                    পূর্বে পাঠানো এসএমএস লগ ({order.smsLogs?.length || 0})
                  </h4>
                </div>
                <div className="divide-y divide-stone-100 p-2 max-h-48 overflow-y-auto">
                  {order.smsLogs && order.smsLogs.length > 0 ? (
                    order.smsLogs.map(log => (
                      <div key={log.id} className="p-2 text-xs space-y-1">
                        <div className="flex justify-between items-center text-[10px] text-stone-400">
                          <span>প্রাপক: <strong className="text-stone-700">{log.phone}</strong></span>
                          <span>{new Date(log.sentAt).toLocaleString('bn-BD')}</span>
                        </div>
                        <p className="text-stone-800 bg-stone-50 p-2 rounded border border-stone-200">
                          {log.message}
                        </p>
                        <div className="text-[10px] text-emerald-600 font-semibold">
                          স্ট্যাটাস: ডেলিভার্ড ({log.status})
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="p-4 text-xs text-stone-400 text-center italic">
                      এখনো কোনো এসএমএস পাঠানো হয়নি।
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t pt-3 flex justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-bold"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>

      {/* Invoice Modal Overlay */}
      {showInvoice && (
        <InvoiceModal order={order} onClose={() => setShowInvoice(false)} />
      )}

      {/* Customer History & All Orders Modal */}
      {showCustomerModal && (
        <CustomerHistoryModal
          summary={customerHistory}
          adminLanguage={adminLanguage}
          onClose={() => setShowCustomerModal(false)}
        />
      )}
    </div>
  );
}
