import { useState, useMemo, useEffect } from 'react';
import { Order, OrderStatus, CourierCustomerHistory } from '../../types.ts';
import { useApp } from '../../context/AppContext.tsx';
import { api } from '../../services/api.ts';
import { getCustomerHistory } from '../../utils/customerHistory.ts';
import { getCourierStatusDisplay, getCourierProviderInfo } from '../../utils/courierStatusHelper.ts';
import {
  toLocalizedNumber,
  toLocalizedCurrency,
  toLocalizedDate,
  formatOrderRelativeTime
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
  Eye,
  Pencil
} from 'lucide-react';
import InvoiceModal from './InvoiceModal.tsx';
import CustomerHistoryModal from './CustomerHistoryModal.tsx';
import { OrderEditModal } from './OrderEditModal.tsx';

interface OrderDetailsModalProps {
  order: Order;
  courierHistory?: CourierCustomerHistory;
  initialTab?: 'details' | 'courier' | 'sms';
  onClose: () => void;
}

export default function OrderDetailsModal({ order, courierHistory, initialTab = 'details', onClose }: OrderDetailsModalProps) {
  const { orders, landingPages, updateOrderStatus, sendToCourier, checkCourierStatus, sendSms, sendOrderConfirmSms, settings, refreshAll, adminLanguage } = useApp();
  const isBn = adminLanguage === 'bn';

  const [currentOrder, setCurrentOrder] = useState<Order>(order);
  const [showEditModal, setShowEditModal] = useState(false);

  // Always bind to the most up-to-date order object from state/orders
  const liveOrder = orders.find(o => o.id === order.id) || currentOrder || order;

  useEffect(() => {
    setCurrentOrder(order);
  }, [order]);

  const matchedPage = useMemo(() => {
    return landingPages?.find(p => p.id === liveOrder.landingPageId || p.slug === liveOrder.landingPageSlug);
  }, [landingPages, liveOrder.landingPageId, liveOrder.landingPageSlug]);

  const hasPageSpecificSms = matchedPage?.smsTemplates?.enabled;

  const [activeTab, setActiveTab] = useState<'details' | 'courier' | 'sms'>(initialTab);
  const [currentStatus, setCurrentStatus] = useState<OrderStatus>(liveOrder.status);
  const [orderNotes, setOrderNotes] = useState(liveOrder.notes || '');
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  // Direct manual Confirm SMS state
  const [isSendingConfirmSms, setIsSendingConfirmSms] = useState(false);
  const [confirmSmsFeedback, setConfirmSmsFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const handleSendConfirmSmsDirectly = async (autoConfirm = true) => {
    try {
      setIsSendingConfirmSms(true);
      setConfirmSmsFeedback(null);
      const res = await sendOrderConfirmSms(liveOrder.id, { updateStatusToConfirmed: autoConfirm });
      if (res.success) {
        if (autoConfirm) setCurrentStatus('confirmed');
        setConfirmSmsFeedback({
          success: true,
          message: res.message || 'কাস্টমারকে কনফার্মেশন এসএমএস সফলভাবে পাঠানো হয়েছে!'
        });
      } else {
        setConfirmSmsFeedback({
          success: false,
          message: res.error || 'কনফার্মেশন এসএমএস পাঠাতে ব্যর্থ হয়েছে।'
        });
      }
    } catch (err: any) {
      setConfirmSmsFeedback({
        success: false,
        message: err?.message || 'এসএমএস পাঠাতে সমস্যা হয়েছে।'
      });
    } finally {
      setIsSendingConfirmSms(false);
    }
  };

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    setCurrentStatus(liveOrder.status);
    setOrderNotes(liveOrder.notes || '');
  }, [liveOrder.status, liveOrder.notes]);

  // Customer order history summary
  const customerHistory = useMemo(() => {
    return getCustomerHistory(liveOrder.customerPhone, orders, liveOrder.customerName);
  }, [liveOrder.customerPhone, liveOrder.customerName, orders]);

  // Google Sheet state
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [sheetFeedback, setSheetFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const handleSyncToSheet = async () => {
    try {
      setIsSyncingSheet(true);
      const res = await api.syncOrderToSheet(liveOrder.id);
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
    liveOrder.courier?.provider === 'pathao' ? 'pathao' : 'steadfast'
  );
  const [courierFee, setCourierFee] = useState<number>(liveOrder.deliveryCharge || 120);
  const [courierNote, setCourierNote] = useState<string>(liveOrder.notes || 'Handle with care');
  const [isDispatchingCourier, setIsDispatchingCourier] = useState(false);
  const [isCheckingCourier, setIsCheckingCourier] = useState(false);
  const [courierFeedback, setCourierFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // SMS state
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('orderConfirmed');
  const [customSmsText, setCustomSmsText] = useState<string>('');
  const [customPhone, setCustomPhone] = useState<string>(liveOrder.customerPhone);
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [smsFeedback, setSmsFeedback] = useState<string | null>(null);

  // Invoice modal
  const [showInvoice, setShowInvoice] = useState(false);

  // Handle status update
  const handleSaveStatus = async () => {
    setIsSavingStatus(true);
    try {
      await updateOrderStatus(liveOrder.id, currentStatus, orderNotes);
    } finally {
      setIsSavingStatus(false);
    }
  };

  // Handle Courier Dispatch
  const handleCourierEntry = async () => {
    setIsDispatchingCourier(true);
    setCourierFeedback(null);
    try {
      const res = await sendToCourier(liveOrder.id, courierProvider, courierFee, courierNote);
      setCurrentStatus('in_courier');
      setCourierFeedback({
        success: true,
        message: res?.message || (isBn ? 'স্টিডফাস্ট কুরিয়ারে পার্সেল সফলভাবে এন্ট্রি হয়েছে!' : 'Courier parcel booked successfully!')
      });
    } catch (err: any) {
      console.error('Courier dispatch error:', err);
      setCourierFeedback({
        success: false,
        message: err?.message || (isBn ? 'কুরিয়ারে এন্ট্রি করা যায়নি। কাস্টমারের ১১ ডিজিটের সঠিক মোবাইল নম্বর ও সেটিংস যাচাই করুন।' : 'Failed to send to courier.')
      });
    } finally {
      setIsDispatchingCourier(false);
    }
  };

  // Handle live status check & auto-map to order status
  const handleCheckTracking = async () => {
    setIsCheckingCourier(true);
    try {
      const courierStatus = await checkCourierStatus(liveOrder.id);
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
    const pageTpls = matchedPage?.smsTemplates?.enabled ? matchedPage.smsTemplates : null;
    const globalTpls = settings.smsGateway.templates;
    const raw = (pageTpls && (pageTpls as any)[key]) || (globalTpls as any)[key] || '';
    const brand = matchedPage?.brandName || 'AmarChoice';

    if (!raw) {
      return `প্রিয় ${order.customerName}, আপনার অর্ডার #${order.id} প্রসেসিংয়ে রয়েছে। মোট বিল: ${order.grandTotal}৳। - ${brand}`;
    }

    return raw
      .replace(/\{customer_name\}/gi, order.customerName)
      .replace(/\{order_id\}/gi, order.id)
      .replace(/\{total\}/gi, String(order.grandTotal))
      .replace(/\{brand_name\}/gi, brand)
      .replace(/\{tracking_code\}/gi, order.courier?.trackingCode || 'TRK-PENDING')
      .replace(/\{courier_name\}/gi, order.courier?.provider === 'pathao' ? 'Pathao' : 'Steadfast');
  };

  // Handle Send SMS
  const handleSendSms = async () => {
    setIsSendingSms(true);
    setSmsFeedback(null);
    try {
      const messageText = customSmsText.trim() || getFormattedTemplate(selectedTemplateKey);
      const res = await sendSms(order.id, messageText, customPhone);
      if (res && res.error) {
        setSmsFeedback(`❌ এসএমএস পাঠানো যায়নি: ${res.error}`);
      } else {
        setSmsFeedback('✅ এসএমএস সফলভাবে পাঠানো হয়েছে!');
        setCustomSmsText('');
        await refreshAll();
      }
    } catch (err: any) {
      setSmsFeedback(`❌ এসএমএস পাঠাতে সমস্যা হয়েছে: ${err?.message || 'গেটওয়ে কানেকশন ব্যর্থ'}`);
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
            <div className="text-xs text-stone-500 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>অন-পেইজ: <strong className="text-stone-700">{order.landingPageTitle}</strong></span>
              <span>•</span>
              {(() => {
                const rel = formatOrderRelativeTime(order.createdAt, adminLanguage);
                return (
                  <span
                    className={`flex items-center gap-1 ${
                      rel.isRecent ? 'text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200' : 'text-stone-600'
                    }`}
                    title={rel.fullTooltip}
                  >
                    <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                    <span>{rel.display}</span>
                    {rel.isRecent && (
                      <span className="text-[10px] text-stone-400 font-normal">({rel.fullTooltip})</span>
                    )}
                  </span>
                );
              })()}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSendConfirmSmsDirectly(true)}
              disabled={isSendingConfirmSms}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold transition border border-emerald-300 shadow-2xs cursor-pointer disabled:opacity-50"
              title={isBn ? 'কাস্টমারকে সরাসরি অর্ডার কনফার্মেশন SMS পাঠান' : 'Send Order Confirm SMS directly'}
            >
              {isSendingConfirmSms ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              ) : (
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span>{isBn ? '💬 কনফার্ম SMS' : 'Confirm SMS'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-bold transition border border-amber-300 shadow-2xs cursor-pointer"
              title={isBn ? 'গ্রাহকের তথ্য ও অর্ডার এডিট করুন' : 'Edit customer info & order'}
            >
              <Pencil className="w-3.5 h-3.5 text-amber-700" />
              <span>{isBn ? '✏️ এডিট' : 'Edit'}</span>
            </button>
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

        {/* Confirm SMS Feedback Banner */}
        {confirmSmsFeedback && (
          <div
            className={`mt-2 p-3 rounded-xl border text-xs flex items-center justify-between gap-2 shrink-0 ${
              confirmSmsFeedback.success
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {confirmSmsFeedback.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="font-semibold">{confirmSmsFeedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setConfirmSmsFeedback(null)}
              className="text-stone-400 hover:text-stone-700 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

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
                      onClick={() => setShowEditModal(true)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition shadow-2xs cursor-pointer"
                      title={isBn ? 'কাস্টমারের নাম, ফোন, ঠিকানা ও অর্ডার এডিট করুন' : 'Edit customer info & order'}
                    >
                      <Pencil className="w-3.5 h-3.5 text-amber-700" />
                      <span>{isBn ? 'তথ্য এডিট' : 'Edit Info'}</span>
                    </button>
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
                    <span className="text-stone-500">{isBn ? 'নাম:' : 'Name:'}</span>
                    <p className="font-bold text-sm text-stone-900">{order.customerName}</p>
                  </div>
                  <div>
                    <span className="text-stone-500">{isBn ? 'মোবাইল:' : 'Phone:'}</span>
                    <p className="font-bold text-sm text-rose-700 font-mono">{order.customerPhone}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-stone-500">{isBn ? 'ঠিকানা:' : 'Address:'}</span>
                    <p className="font-medium text-stone-800 whitespace-pre-line mt-0.5 bg-white p-2.5 rounded-lg border border-stone-200">
                      {order.customerAddress}
                    </p>
                  </div>

                  {/* Customer Courier Delivery & Cancellation Status Card */}
                  {courierHistory && (
                    <div className="sm:col-span-2 bg-stone-900 text-white p-3 rounded-xl border border-stone-700 shadow-2xs">
                      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-stone-800">
                        <div className="flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span className="text-xs font-bold text-white">
                            {isBn ? 'কুরিয়ার ডেলিভারি ও ক্যানসেল রেকর্ড' : 'Courier Delivery & Cancellation Record'}
                          </span>
                          {courierHistory.isLiveCourier ? (
                            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-800">
                              Steadfast Live
                            </span>
                          ) : (
                            <span className="text-[9px] font-medium text-stone-400 bg-stone-800 px-1.5 py-0.2 rounded border border-stone-700">
                              {isBn ? 'স্টোর রেকর্ড' : 'Store Record'}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowCustomerModal(true)}
                          className="text-[10px] text-rose-400 hover:text-rose-300 font-bold underline cursor-pointer"
                        >
                          {isBn ? 'বিস্তারিত প্রোফাইল →' : 'Full Profile →'}
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-stone-800/80 p-2 rounded-lg border border-stone-700/80">
                          <span className="text-[10px] text-stone-400 block">{isBn ? 'মোট পার্সেল' : 'Total'}</span>
                          <span className="text-base font-bold text-white block mt-0.5">
                            {toLocalizedNumber(courierHistory.totalParcels, adminLanguage)}
                          </span>
                        </div>
                        <div className="bg-emerald-950/40 p-2 rounded-lg border border-emerald-800/60">
                          <span className="text-[10px] text-emerald-300 block">✅ {isBn ? 'রিসিভ / ডেলিভার্ড' : 'Delivered'}</span>
                          <span className="text-base font-bold text-emerald-400 block mt-0.5">
                            {toLocalizedNumber(courierHistory.totalDelivered, adminLanguage)}
                          </span>
                        </div>
                        <div className="bg-rose-950/40 p-2 rounded-lg border border-rose-800/60">
                          <span className="text-[10px] text-rose-300 block">❌ {isBn ? 'ক্যানসেল / বাতিল' : 'Cancelled'}</span>
                          <span className="text-base font-bold text-rose-400 block mt-0.5">
                            {toLocalizedNumber(courierHistory.totalCancelled, adminLanguage)}
                          </span>
                        </div>
                      </div>
                      {courierHistory.notice && (
                        <p className="text-[10px] text-stone-400 mt-2 italic">
                          ℹ️ {courierHistory.notice}
                        </p>
                      )}
                    </div>
                  )}
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
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleSaveStatus}
                    disabled={isSavingStatus}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow disabled:opacity-50 cursor-pointer"
                  >
                    {isSavingStatus ? 'সেভ হচ্ছে...' : 'স্ট্যাটাস আপডেট করুন'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendConfirmSmsDirectly(true)}
                    disabled={isSendingConfirmSms}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                    title={isBn ? 'অর্ডারটি কনফার্ম করুন এবং গ্রাহককে এসএমএস পাঠান' : 'Confirm order and send confirmation SMS'}
                  >
                    {isSendingConfirmSms ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <MessageSquare className="w-3.5 h-3.5" />
                    )}
                    <span>{isSendingConfirmSms ? 'এসএমএস যাচ্ছে...' : (isBn ? '💬 কনফার্ম করুন ও SMS পাঠান' : 'Confirm & Send SMS')}</span>
                  </button>
                </div>
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
              {courierFeedback && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    courierFeedback.success
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                      : 'bg-rose-50 border-rose-300 text-rose-900 font-medium'
                  }`}
                >
                  {courierFeedback.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{courierFeedback.message}</span>
                </div>
              )}

              {/* Existing Courier Info (if dispatched) */}
              {liveOrder.courier && liveOrder.courier.trackingCode ? (
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Truck className="w-5 h-5 text-emerald-700" />
                      <h4 className="font-bold text-sm text-emerald-900 uppercase">
                        {liveOrder.courier.provider} কুরিয়ারে এন্ট্রি সম্পন্ন!
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
                    const courierInfo = getCourierProviderInfo(liveOrder.courier.provider);
                    const courierStatus = getCourierStatusDisplay(liveOrder.courier.status, adminLanguage);
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
                            <strong className="text-stone-900 font-mono text-sm block mt-0.5">{liveOrder.courier.trackingCode}</strong>
                          </div>
                          <div>
                            <span className="text-stone-400 block text-[10px]">{isBn ? 'কনসাইনমেন্ট আইডি:' : 'Consignment ID:'}</span>
                            <strong className="text-stone-700 font-mono block mt-0.5">{liveOrder.courier.consignmentId || '—'}</strong>
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
                          {liveOrder.courier.sentAt && (
                            <span className="text-[10px] opacity-75 shrink-0">
                              {isBn ? 'বুকিং:' : 'Booked:'} {toLocalizedDate(new Date(liveOrder.courier.sentAt), adminLanguage)}
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
                  {liveOrder.courier?.trackingCode ? 'পুনরায় কুরিয়ার এন্ট্রি / পরিবর্তন' : 'নতুন কুরিয়ার বুকিং এন্ট্রি'}
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
                      <span className="text-stone-400">গ্রাহকের নাম:</span> <strong>{liveOrder.customerName}</strong>
                    </div>
                    <div>
                      <span className="text-stone-400">মোবাইল:</span> <strong>{liveOrder.customerPhone}</strong>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-stone-400">ঠিকানা:</span> {liveOrder.customerAddress}
                    </div>
                    <div>
                      <span className="text-stone-400">ক্যাশ অন ডেলিভারি (COD):</span> <strong className="text-rose-700">{liveOrder.grandTotal}৳</strong>
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-stone-700">কাস্টমারকে SMS পাঠান</h4>
                  {hasPageSpecificSms ? (
                    <span className="text-[11px] text-indigo-700 font-semibold flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                      <Sparkles className="w-3 h-3 text-indigo-600" />
                      <span>অন-পেইজ কাস্টম SMS ({order.landingPageTitle || matchedPage?.title})</span>
                      <strong className="text-indigo-950 font-mono ml-1">
                        [{matchedPage?.smsTemplates?.senderId || settings.smsGateway.senderId || 'AmarChoice'}]
                      </strong>
                    </span>
                  ) : (
                    <span className="text-[11px] text-stone-500">
                      Sender ID: <strong className="text-rose-700">{settings.smsGateway.senderId || 'AmarChoice'}</strong>
                    </span>
                  )}
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

                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSendSms}
                    disabled={isSendingSms}
                    className="w-full sm:flex-1 py-2.5 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSendingSms ? 'এসএমএস পাঠানো হচ্ছে...' : 'কাস্টম টেক্সট পাঠান'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendConfirmSmsDirectly(true)}
                    disabled={isSendingConfirmSms}
                    className="w-full sm:flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                    title="কাস্টমারকে তাৎক্ষণিক কনফার্মেশন এসএমএস পাঠান এবং স্ট্যাটাস কনফার্ম করুন"
                  >
                    {isSendingConfirmSms ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>{isSendingConfirmSms ? 'কনফার্ম SMS যাচ্ছে...' : '💬 কনফার্ম করুন ও SMS পাঠান'}</span>
                  </button>
                </div>
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
          courierHistory={courierHistory || currentOrder.courierCustomerHistory}
          adminLanguage={adminLanguage}
          onClose={() => setShowCustomerModal(false)}
        />
      )}

      {/* Order Edit Modal Overlay */}
      {showEditModal && (
        <OrderEditModal
          order={currentOrder}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSaved={(updated) => {
            setCurrentOrder(updated);
            setCurrentStatus(updated.status);
            if (updated.notes) setOrderNotes(updated.notes);
          }}
        />
      )}
    </div>
  );
}
