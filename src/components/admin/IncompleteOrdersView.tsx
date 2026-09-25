import { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { IncompleteOrder } from '../../types.ts';
import { translations, formatOrderRelativeTime, toLocalizedNumber } from '../../utils/translations.ts';
import {
  ShoppingBag,
  Phone,
  MessageSquare,
  CheckCircle2,
  Clock,
  Trash2,
  Search,
  ExternalLink,
  MapPin,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  UserCheck,
  Send,
  PhoneCall,
  XCircle,
  FileText,
  Eye,
  Copy,
  Check,
  Package,
  Layers,
  Sparkles,
  User,
  ArrowRight,
  Pencil,
  CheckSquare
} from 'lucide-react';
import { IncompleteOrderEditModal } from './IncompleteOrderEditModal.tsx';

function WhatsAppIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
    </svg>
  );
}

export default function IncompleteOrdersView() {
  const {
    incompleteOrders,
    updateIncompleteOrder,
    convertIncompleteToOrder,
    deleteIncompleteOrder,
    bulkActionIncompleteOrders,
    clearDemoData,
    settings,
    landingPages,
    adminLanguage,
    setAdminTab
  } = useApp();

  const isBn = adminLanguage === 'bn';

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | IncompleteOrder['status']>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [editingIncompleteOrder, setEditingIncompleteOrder] = useState<IncompleteOrder | null>(null);
  const [convertedOrderResult, setConvertedOrderResult] = useState<string | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Multi-select & Bulk Actions State
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<IncompleteOrder['status']>('contacted');
  const [isApplyingBulk, setIsApplyingBulk] = useState<boolean>(false);
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    type: 'single' | 'bulk';
    id?: string;
    ids?: string[];
  }>({ isOpen: false, type: 'bulk' });
  const [actionFeedbackToast, setActionFeedbackToast] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Customer order details modal state
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<IncompleteOrder | null>(null);
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Helper to find matching product image for item
  const getItemImage = (order: IncompleteOrder, itemVariantId: string, itemImage?: string) => {
    if (itemImage) return itemImage;
    const page = landingPages.find(p => p.id === order.landingPageId);
    if (!page) return '';
    const prod = page.products.find(p => p.id === itemVariantId);
    if (prod && prod.image) return prod.image;
    return page.mainImage || (page.galleryImages && page.galleryImages[0]) || '';
  };

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  // Note/log modal state
  const [selectedForLog, setSelectedForLog] = useState<IncompleteOrder | null>(null);
  const [logMethod, setLogMethod] = useState<'call' | 'whatsapp' | 'sms'>('call');
  const [logNote, setLogNote] = useState('');

  const filteredOrders = incompleteOrders.filter(order => {
    if (statusFilter !== 'all' && order.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const bnToEn: Record<string, string> = {
        '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
        '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
      };
      const enQ = q.replace(/[০-৯]/g, d => bnToEn[d] || d);
      const cleanQDigits = enQ.replace(/\D/g, '');
      const orderPhoneDigits = (order.customerPhone || '').replace(/[০-৯]/g, d => bnToEn[d] || d).replace(/\D/g, '');

      const matchPhone = (cleanQDigits.length >= 3 && orderPhoneDigits.includes(cleanQDigits)) ||
                         order.customerPhone.toLowerCase().includes(q) ||
                         order.customerPhone.toLowerCase().includes(enQ);

      const matchName = order.customerName.toLowerCase().includes(q) ||
                        order.customerName.toLowerCase().includes(enQ);

      const matchAddress = Boolean(order.customerAddress && (
        order.customerAddress.toLowerCase().includes(q) ||
        order.customerAddress.toLowerCase().includes(enQ)
      ));

      const matchProduct = Boolean(
        order.items?.some(i => i.variantName?.toLowerCase().includes(q) || i.variantName?.toLowerCase().includes(enQ))
      );

      const matchPage = Boolean(order.landingPageTitle && (
        order.landingPageTitle.toLowerCase().includes(q) ||
        order.landingPageTitle.toLowerCase().includes(enQ)
      ));

      return matchPhone || matchName || matchAddress || matchProduct || matchPage;
    }
    return true;
  });

  // Analytics
  const totalCount = incompleteOrders.length;
  const uncontactedCount = incompleteOrders.filter(o => o.status === 'uncontacted').length;
  const recoveredCount = incompleteOrders.filter(o => o.status === 'recovered').length;
  const potentialRevenue = incompleteOrders
    .filter(o => o.status !== 'recovered' && o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.grandTotal || 0), 0);

  const handleConvert = async (id: string) => {
    try {
      setConvertingId(id);
      const newOrder = await convertIncompleteToOrder(id);
      setConvertedOrderResult(newOrder.id);
      setTimeout(() => setConvertedOrderResult(null), 4000);
    } catch (err) {
      console.error('Failed to convert incomplete order:', err);
    } finally {
      setConvertingId(null);
    }
  };

  // Multi-select Handlers
  const handleToggleSelectAll = () => {
    if (filteredOrders.length === 0) return;
    const allFilteredSelected = filteredOrders.every(o => selectedOrderIds.includes(o.id));
    if (allFilteredSelected) {
      const filteredIdsSet = new Set(filteredOrders.map(o => o.id));
      setSelectedOrderIds(prev => prev.filter(id => !filteredIdsSet.has(id)));
    } else {
      const newSelected = new Set(selectedOrderIds);
      filteredOrders.forEach(o => newSelected.add(o.id));
      setSelectedOrderIds(Array.from(newSelected));
    }
  };

  const handleToggleSelectOrder = (id: string) => {
    setSelectedOrderIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleApplyBulkStatus = async (targetStatus: IncompleteOrder['status']) => {
    if (selectedOrderIds.length === 0) return;
    try {
      setIsApplyingBulk(true);
      const res = await bulkActionIncompleteOrders(selectedOrderIds, 'status', targetStatus);
      const statusLabel =
        targetStatus === 'contacted'
          ? (isBn ? 'কথা হয়েছে' : 'Contacted')
          : targetStatus === 'recovered'
          ? (isBn ? 'রিকভার্ড' : 'Recovered')
          : targetStatus === 'cancelled'
          ? (isBn ? 'বাতিল' : 'Cancelled')
          : (isBn ? 'কল দেওয়া হয়নি' : 'Uncontacted');

      setActionFeedbackToast({
        success: true,
        message: isBn
          ? `${toLocalizedNumber(res.count, adminLanguage)}টি অসম্পূর্ণ অর্ডারের স্ট্যাটাস "${statusLabel}" করা হয়েছে`
          : `Updated status of ${res.count} incomplete order(s) to ${statusLabel}`
      });
      setTimeout(() => setActionFeedbackToast(null), 4500);
      setSelectedOrderIds([]);
    } catch (err) {
      console.error('Failed to update bulk status:', err);
      setActionFeedbackToast({
        success: false,
        message: isBn ? 'স্ট্যাটাস পরিবর্তনে সমস্যা হয়েছে' : 'Failed to update statuses'
      });
      setTimeout(() => setActionFeedbackToast(null), 4500);
    } finally {
      setIsApplyingBulk(false);
    }
  };

  const handleBulkConvert = async () => {
    if (selectedOrderIds.length === 0) return;
    try {
      setIsApplyingBulk(true);
      let count = 0;
      for (const id of selectedOrderIds) {
        try {
          await convertIncompleteToOrder(id);
          count++;
        } catch (e) {
          console.error(`Failed to convert incomplete order ${id}:`, e);
        }
      }
      setActionFeedbackToast({
        success: true,
        message: isBn
          ? `${toLocalizedNumber(count, adminLanguage)}টি অসম্পূর্ণ লিড সফলভাবে কনফার্মড অর্ডারে রূপান্তর করা হয়েছে!`
          : `Converted ${count} lead(s) to confirmed orders!`
      });
      setTimeout(() => setActionFeedbackToast(null), 5000);
      setSelectedOrderIds([]);
    } catch (err) {
      console.error('Failed to bulk convert:', err);
    } finally {
      setIsApplyingBulk(false);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      setIsApplyingBulk(true);
      if (deleteModalState.type === 'single' && deleteModalState.id) {
        await deleteIncompleteOrder(deleteModalState.id);
        setSelectedOrderIds(prev => prev.filter(id => id !== deleteModalState.id));
        setActionFeedbackToast({
          success: true,
          message: isBn ? 'অসম্পূর্ণ অর্ডারটি মুছে ফেলা হয়েছে' : 'Incomplete order deleted'
        });
      } else {
        const idsToDelete = deleteModalState.ids || selectedOrderIds;
        const res = await bulkActionIncompleteOrders(idsToDelete, 'delete');
        setSelectedOrderIds(prev => prev.filter(id => !idsToDelete.includes(id)));
        setActionFeedbackToast({
          success: true,
          message: isBn
            ? `${toLocalizedNumber(res.count, adminLanguage)}টি অসম্পূর্ণ অর্ডার মুছে ফেলা হয়েছে`
            : `Deleted ${res.count} incomplete order(s)`
        });
      }
      setTimeout(() => setActionFeedbackToast(null), 4000);
      setDeleteModalState({ isOpen: false, type: 'bulk' });
    } catch (err) {
      console.error('Failed to delete:', err);
      setActionFeedbackToast({
        success: false,
        message: isBn ? 'মুছে ফেলতে ব্যর্থ হয়েছে' : 'Failed to delete'
      });
      setTimeout(() => setActionFeedbackToast(null), 4000);
    } finally {
      setIsApplyingBulk(false);
    }
  };

  const handleSaveLog = async () => {
    if (!selectedForLog) return;
    try {
      await updateIncompleteOrder(selectedForLog.id, {
        status: 'contacted',
        contactLog: {
          method: logMethod,
          note: logNote.trim() || undefined
        }
      });
      setSelectedForLog(null);
      setLogNote('');
    } catch (err) {
      console.error('Failed to update log:', err);
    }
  };

  const getWhatsAppLink = (phone: string, name: string, pageTitle: string) => {
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('01') && cleanPhone.length === 11) {
      cleanPhone = '88' + cleanPhone;
    }
    const message = isBn
      ? `আসসালামু আলাইকুম ${name || 'সম্মানিত গ্রাহক'}, আপনি আমাদের "${pageTitle || 'AmarChoice'}" অন-পেইজে পণ্য কেনার জন্য চেকআউট ফর্ম পূরণ করেছিলেন। আপনার কোনো সহায়তার প্রয়োজন হলে আমাদের জানাতে পারেন। ধন্যবাদ!`
      : `Hello ${name || 'Customer'}, you started checking out for "${pageTitle || 'AmarChoice'}". Would you like us to confirm your order? Thank you!`;

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
          <ShoppingBag className="w-64 h-64 text-white" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-semibold mb-3">
            <Clock className="w-3.5 h-3.5" />
            {isBn ? 'অসম্পূর্ণ চেকআউট রিকভারি ও লিড ট্র্যাকিং' : 'Abandoned Checkout Lead Recovery'}
          </div>
          <h2 className="text-2xl font-bold">
            {isBn ? 'অসম্পূর্ণ চেকআউট ও পরিত্যক্ত অর্ডার ম্যানেজমেন্ট' : 'Incomplete & Abandoned Checkouts'}
          </h2>
          <p className="text-white/90 text-sm mt-1 leading-relaxed">
            {isBn
              ? 'যেসব কাস্টমার পণ্য দেখে চেকআউট ফর্মে মোবাইল নাম্বার বা নাম লিখে অর্ডার কনফার্ম না করে পেজ থেকে বের হয়ে গেছে, তাদের তথ্য এখানে রিকভার করা হয়েছে। ফোন বা হোয়াটসঅ্যাপে কথা বলে সহজেই এ অর্ডারগুলো রিকভার করতে পারবেন।'
              : 'Recover potential customers who began filling out your checkout form but dropped off before placing their order.'}
          </p>
        </div>
      </div>

      {/* Converted Alert */}
      {convertedOrderResult && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold text-sm">
                {isBn ? 'অর্ডার সফলভাবে কনফার্ম হয়েছে!' : 'Order successfully converted!'}
              </p>
              <p className="text-xs text-emerald-700 mt-0.5">
                {isBn
                  ? `নতুন অর্ডার #${convertedOrderResult} তৈরি হয়েছে এবং "অর্ডারসমূহ" ট্যাবে যুক্ত হয়েছে।`
                  : `New Order #${convertedOrderResult} has been placed in your Orders tab.`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAdminTab('orders')}
            className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition"
          >
            {isBn ? 'অর্ডারে দেখুন' : 'View Orders'}
          </button>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">{isBn ? 'মোট অসম্পূর্ণ লিড' : 'Total Abandoned Leads'}</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalCount} {isBn ? 'টি' : ''}</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              {isBn ? 'ফর্ম পূরণ শুরু করেছিলেন' : 'Started checking out'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">{isBn ? 'যোগাযোগ প্রয়োজন (Pending)' : 'Uncontacted Follow-up'}</p>
            <h3 className="text-2xl font-bold text-rose-600 mt-1">{uncontactedCount} {isBn ? 'টি' : ''}</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              {isBn ? 'এখনও কল দেওয়া হয়নি' : 'Awaiting contact'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <PhoneCall className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">{isBn ? 'সফলভাবে রিকভার্ড' : 'Recovered Orders'}</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{recoveredCount} {isBn ? 'টি' : ''}</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              {isBn ? 'কনফার্ম অর্ডারে রূপান্তর' : 'Successfully placed'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">{isBn ? 'সম্ভাব্য উদ্ধারযোগ্য বিক্রয়' : 'Potential Lost Value'}</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">৳{potentialRevenue.toLocaleString()}</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              {isBn ? 'ফলো-আপ করে বিক্রয় নিশ্চিত করুন' : 'Pending cart totals'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Filter bar */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {isBn ? 'সকল লিড' : 'All Leads'} ({incompleteOrders.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('uncontacted')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                statusFilter === 'uncontacted'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              {isBn ? 'কল দেওয়া হয়নি' : 'Uncontacted'} ({uncontactedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('contacted')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                statusFilter === 'contacted'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              {isBn ? 'কথা হয়েছে' : 'Contacted'} ({incompleteOrders.filter(o => o.status === 'contacted').length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('recovered')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                statusFilter === 'recovered'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              {isBn ? 'রিকভার্ড' : 'Recovered'} ({recoveredCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('cancelled')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                statusFilter === 'cancelled'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {isBn ? 'বাতিল' : 'Cancelled'} ({incompleteOrders.filter(o => o.status === 'cancelled').length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Quick Select All Toggle in Filter Bar */}
            {filteredOrders.length > 0 && (
              <div className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 transition">
                <input
                  type="checkbox"
                  id="filterBarSelectAll"
                  checked={filteredOrders.length > 0 && filteredOrders.every(o => selectedOrderIds.includes(o.id))}
                  ref={input => {
                    if (input) {
                      const someSelected = filteredOrders.some(o => selectedOrderIds.includes(o.id));
                      const allSelected = filteredOrders.length > 0 && filteredOrders.every(o => selectedOrderIds.includes(o.id));
                      input.indeterminate = someSelected && !allSelected;
                    }
                  }}
                  onChange={handleToggleSelectAll}
                  className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="filterBarSelectAll" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                  {selectedOrderIds.length > 0 ? (
                    <span className="text-amber-800">
                      {toLocalizedNumber(selectedOrderIds.length, adminLanguage)} {isBn ? 'টি নির্বাচিত' : 'selected'}
                    </span>
                  ) : (
                    <span>{isBn ? 'সব সিলেক্ট' : 'Select All'}</span>
                  )}
                </label>
              </div>
            )}

            {!settings?.isDemoDataRemoved && incompleteOrders.length > 0 && (
              <button
                type="button"
                onClick={() => setShowClearModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs shadow-2xs transition cursor-pointer shrink-0"
                title={isBn ? 'সকল টেস্ট/ডেমো অসম্পূর্ণ লিড মুছে ফেলুন যেন ভবিষ্যতে আর কোনো ডেমো ডাটা না আসে' : 'Clear all demo incomplete leads'}
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>{isBn ? '🗑️ ডেমো লিড মুছুন' : '🗑️ Clear Demo Leads'}</span>
              </button>
            )}

            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={isBn ? 'ফোন নাম্বার, নাম বা অন-পেইজ...' : 'Search by phone, name or page...'}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Bulk Action Controls Bar (shown when 1 or more leads selected) */}
        {selectedOrderIds.length > 0 && (
          <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-b border-amber-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-200 text-amber-900 border border-amber-300 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" />
                <span>{toLocalizedNumber(selectedOrderIds.length, adminLanguage)} {isBn ? 'টি সিলেক্টেড' : 'selected'}</span>
              </span>

              <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                {isBn ? 'মোট সম্ভাব্য মূল্য:' : 'Selected Total:'}{' '}
                <strong className="text-slate-900 font-mono">
                  ৳{incompleteOrders
                    .filter(o => selectedOrderIds.includes(o.id))
                    .reduce((sum, o) => sum + (o.grandTotal || o.subtotal || 0), 0)
                    .toLocaleString()}
                </strong>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Quick Status Change Dropdown */}
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-amber-300 shadow-2xs">
                <span className="text-xs font-bold text-slate-600 hidden sm:inline">
                  {isBn ? 'স্ট্যাটাস বদলান:' : 'Change Status:'}
                </span>
                <select
                  value={bulkStatus}
                  onChange={e => setBulkStatus(e.target.value as IncompleteOrder['status'])}
                  className="text-xs font-bold text-slate-800 bg-transparent py-1 pr-1 focus:outline-none cursor-pointer"
                >
                  <option value="uncontacted">{isBn ? '⚠️ কল দেওয়া হয়নি' : 'Uncontacted'}</option>
                  <option value="contacted">{isBn ? '📞 কথা হয়েছে' : 'Contacted'}</option>
                  <option value="recovered">{isBn ? '✅ রিকভার্ড' : 'Recovered'}</option>
                  <option value="cancelled">{isBn ? '❌ বাতিল' : 'Cancelled'}</option>
                </select>
                <button
                  type="button"
                  onClick={() => handleApplyBulkStatus(bulkStatus)}
                  disabled={isApplyingBulk}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-lg text-xs font-bold transition shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title={isBn ? 'নির্বাচিতগুলোর স্ট্যাটাস পরিবর্তন করুন' : 'Apply status to selected'}
                >
                  {isApplyingBulk ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  <span>{isBn ? 'প্রয়োগ' : 'Apply'}</span>
                </button>
              </div>

              {/* Convert Selected Button */}
              <button
                type="button"
                onClick={handleBulkConvert}
                disabled={isApplyingBulk}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-2xs transition cursor-pointer disabled:opacity-50"
                title={isBn ? 'নির্বাচিত অসম্পূর্ণ লিডগুলো কনফার্মড অর্ডারে রূপান্তর করুন' : 'Convert selected leads to confirmed orders'}
              >
                {isApplyingBulk ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>{isBn ? 'কনফার্ম অর্ডার করুন' : 'Convert to Orders'}</span>
              </button>

              {/* Delete Selected Button */}
              <button
                type="button"
                onClick={() => setDeleteModalState({ isOpen: true, type: 'bulk', ids: selectedOrderIds })}
                disabled={isApplyingBulk}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-2xs transition cursor-pointer disabled:opacity-50"
                title={isBn ? 'নির্বাচিত লিডগুলো মুছে ফেলুন' : 'Delete selected leads'}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isBn ? 'মুছে ফেলুন' : 'Delete'}</span>
              </button>

              {/* Deselect / Cancel */}
              <button
                type="button"
                onClick={() => setSelectedOrderIds([])}
                className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition font-medium cursor-pointer"
              >
                {isBn ? 'সিলেকশন মুছুন' : 'Clear'}
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">
              {searchQuery ? (isBn ? 'কোনো অসম্পূর্ণ অর্ডার পাওয়া যায়নি' : 'No matching incomplete checkouts') : (isBn ? 'কোনো অসম্পূর্ণ অর্ডার নেই' : 'No incomplete orders recorded')}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {isBn
                ? 'কাস্টমার যখন চেকআউট ফর্মে তথ্য লিখে অর্ডার সম্পন্ন না করেই পেজ ছেড়ে যাবে, তাদের তথ্য এখানে স্বয়ংক্রিয়ভাবে জমা হবে।'
                : 'Customer drop-offs will appear here with contact details for instant follow-up.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
                <tr>
                  {/* Master Select All Checkbox Column */}
                  <th className="px-4 py-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      id="bulkSelectAllIncompletes"
                      checked={filteredOrders.length > 0 && filteredOrders.every(o => selectedOrderIds.includes(o.id))}
                      ref={input => {
                        if (input) {
                          const someSelected = filteredOrders.some(o => selectedOrderIds.includes(o.id));
                          const allSelected = filteredOrders.length > 0 && filteredOrders.every(o => selectedOrderIds.includes(o.id));
                          input.indeterminate = someSelected && !allSelected;
                        }
                      }}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                      title={isBn ? 'সবগুলো নির্বাচন করুন' : 'Select All'}
                    />
                  </th>
                  <th className="px-6 py-3.5">{isBn ? 'গ্রাহক ও মোবাইল' : 'Customer & Phone'}</th>
                  <th className="px-6 py-3.5">{isBn ? 'অন-পেইজ ও পণ্য' : 'Page & Items'}</th>
                  <th className="px-6 py-3.5">{isBn ? 'পরিমাণ ও মোট' : 'Total Value'}</th>
                  <th className="px-6 py-3.5">{isBn ? 'ছেড়ে যাওয়ার ধাপ' : 'Drop-off Step'}</th>
                  <th className="px-6 py-3.5">{isBn ? 'স্ট্যাটাস' : 'Status'}</th>
                  <th className="px-6 py-3.5 text-right">{isBn ? 'অ্যাকশন' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map(order => {
                  const isSelected = selectedOrderIds.includes(order.id);
                  return (
                  <tr key={order.id} className={`hover:bg-amber-50/20 transition group/row ${isSelected ? 'bg-amber-100/45' : ''}`}>
                    {/* Row Checkbox */}
                    <td className="px-4 py-4 text-center" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectOrder(order.id)}
                        className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                        title={isBn ? 'সিলেক্ট করুন' : 'Select'}
                      />
                    </td>

                    {/* Customer - Click to view what they wanted to order */}
                    <td
                      className="px-6 py-4 cursor-pointer"
                      onClick={() => setSelectedOrderForDetails(order)}
                      title={isBn ? 'কাস্টমার কী কী অর্ডার করতে চেয়েছিল দেখতে এখানে ক্লিক করুন' : 'Click to inspect customer order details'}
                    >
                      <div className="p-2 -m-2 rounded-xl transition duration-150 group-hover/row:bg-amber-100/70 border border-transparent group-hover/row:border-amber-300">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="font-bold text-slate-900 font-mono text-sm group-hover/row:text-amber-950">
                            {order.customerPhone}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-200/90 px-2 py-0.5 rounded-md shadow-2xs group-hover/row:bg-amber-500 group-hover/row:text-white transition">
                            <Eye className="w-3 h-3" />
                            {isBn ? 'অর্ডারের বিবরণ' : 'Details'}
                          </span>
                        </div>
                        <p className="text-slate-800 font-semibold mt-0.5 group-hover/row:text-slate-950">{order.customerName}</p>
                        {order.customerAddress ? (
                          <p className="text-[11px] text-slate-500 flex items-start gap-1 max-w-xs mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                            <span className="line-clamp-1">{order.customerAddress}</span>
                          </p>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic block mt-0.5">
                            {isBn ? 'ঠিকানা টাইপ করার আগে বের হয়েছে' : 'No address typed'}
                          </span>
                        )}
                        {(() => {
                          const rel = formatOrderRelativeTime(order.createdAt, adminLanguage);
                          return (
                            <p
                              className={`text-[10px] mt-1 flex items-center gap-1 ${
                                rel.isRecent ? 'text-amber-700 font-bold' : 'text-slate-400'
                              }`}
                              title={rel.fullTooltip}
                            >
                              <Clock className="w-2.5 h-2.5 shrink-0 text-amber-600" />
                              <span>{rel.display}</span>
                            </p>
                          );
                        })()}
                      </div>
                    </td>

                    {/* Page & Items */}
                    <td className="px-6 py-4">
                      <div className="space-y-1 max-w-xs">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                          {order.landingPageTitle || 'Landing Page'}
                        </span>
                        {order.items && order.items.length > 0 ? (
                          <div className="space-y-0.5 mt-1">
                            {order.items.map((it, idx) => (
                              <p key={idx} className="text-[11px] text-slate-600 line-clamp-1">
                                • {it.variantName} {it.size ? `(${it.size})` : ''} x{it.quantity}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">
                            {isBn ? 'পণ্য নির্বাচন প্রক্রিয়াধীন ছিল' : 'Cart items pending'}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Total */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-bold text-slate-900 text-sm">৳{order.grandTotal || order.subtotal}</p>
                      <p className="text-[11px] text-slate-400">
                        {order.deliveryLocation === 'inside_dhaka'
                          ? (isBn ? 'ঢাকার ভেতরে' : 'Inside Dhaka')
                          : (isBn ? 'ঢাকার বাইরে' : 'Outside Dhaka')}
                      </p>
                    </td>

                    {/* Drop-off Step */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          order.step === 'address_entered'
                            ? 'bg-amber-100 text-amber-800'
                            : order.step === 'phone_entered'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {order.step === 'address_entered'
                          ? (isBn ? 'ঠিকানা পূরণ পর্যন্ত' : 'Address entered')
                          : order.step === 'phone_entered'
                          ? (isBn ? 'নাম্বার টাইপ করার পর' : 'Phone entered')
                          : (isBn ? 'ফর্ম পূরণ অবস্থায়' : 'In checkout')}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={order.status}
                        onChange={e => updateIncompleteOrder(order.id, { status: e.target.value as IncompleteOrder['status'] })}
                        className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border focus:outline-none cursor-pointer ${
                          order.status === 'recovered'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : order.status === 'contacted'
                            ? 'bg-blue-50 text-blue-800 border-blue-300'
                            : order.status === 'cancelled'
                            ? 'bg-slate-100 text-slate-600 border-slate-300'
                            : 'bg-rose-50 text-rose-800 border-rose-300 animate-pulse'
                        }`}
                      >
                        <option value="uncontacted">{isBn ? '⚠️ কল দেওয়া হয়নি' : 'Uncontacted'}</option>
                        <option value="contacted">{isBn ? '📞 কথা হয়েছে' : 'Contacted'}</option>
                        <option value="recovered">{isBn ? '✅ রিকভার্ড' : 'Recovered'}</option>
                        <option value="cancelled">{isBn ? '❌ বাতিল' : 'Cancelled'}</option>
                      </select>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {/* View Order Intent Details */}
                        <button
                          type="button"
                          onClick={() => setSelectedOrderForDetails(order)}
                          className="p-2 bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white rounded-lg transition border border-amber-200"
                          title={isBn ? 'কাস্টমার কী কী অর্ডার করতে চেয়েছিল দেখতে ক্লিক করুন' : 'View customer order details'}
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* WhatsApp Action */}
                        <a
                          href={getWhatsAppLink(order.customerPhone, order.customerName, order.landingPageTitle)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg transition border border-emerald-200"
                          title={isBn ? 'হোয়াটসঅ্যাপে মেসেজ দিন' : 'Send WhatsApp Message'}
                        >
                          <WhatsAppIcon className="w-4 h-4" />
                        </a>

                        {/* Direct Call */}
                        <a
                          href={`tel:${order.customerPhone}`}
                          className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition border border-blue-200"
                          title={isBn ? 'সরাসরি ফোন কল করুন' : 'Direct Call'}
                        >
                          <Phone className="w-4 h-4" />
                        </a>

                        {/* Edit Info */}
                        <button
                          type="button"
                          onClick={() => setEditingIncompleteOrder(order)}
                          className="p-2 bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white rounded-lg transition border border-amber-200 cursor-pointer"
                          title={isBn ? 'গ্রাহকের তথ্য ও অর্ডার এডিট করুন' : 'Edit Customer Info & Order'}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        {/* Add Log / Note */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedForLog(order);
                            setLogNote(order.notes || '');
                          }}
                          className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition border border-slate-200"
                          title={isBn ? 'কল নোট ও লগ যোগ করুন' : 'Add Note / Log'}
                        >
                          <FileText className="w-4 h-4" />
                        </button>

                        {/* Convert to Confirmed Order */}
                        {order.status !== 'recovered' && (
                          <button
                            type="button"
                            disabled={convertingId === order.id}
                            onClick={() => handleConvert(order.id)}
                            className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                            title={isBn ? 'কনফার্মড অর্ডারে রূপান্তর করুন' : 'Convert to Confirmed Order'}
                          >
                            {convertingId === order.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            {isBn ? 'কনফার্ম অর্ডার করুন' : 'Convert'}
                          </button>
                        )}

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => setDeleteModalState({ isOpen: true, type: 'single', id: order.id })}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                          title={isBn ? 'মুছে ফেলুন' : 'Delete'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Note & Follow-up Log Modal */}
      {selectedForLog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isBn ? 'কাস্টমার ফলো-আপ ও কল লগ' : 'Customer Follow-up Log'}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {selectedForLog.customerName} ({selectedForLog.customerPhone})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedForLog(null)}
                className="text-slate-400 hover:text-slate-600 p-1 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBn ? 'যোগাযোগের মাধ্যম' : 'Contact Method'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setLogMethod('call')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 ${
                      logMethod === 'call'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {isBn ? 'ফোন কল' : 'Phone Call'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogMethod('whatsapp')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 ${
                      logMethod === 'whatsapp'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <WhatsAppIcon className="w-3.5 h-3.5" />
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogMethod('sms')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 ${
                      logMethod === 'sms'
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    SMS
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBn ? 'ফলো-আপ নোট / কাস্টমারের প্রতিক্রিয়া' : 'Follow-up Note'}
                </label>
                <textarea
                  rows={3}
                  placeholder={isBn ? 'যেমন: কাস্টমার কাল কনফার্ম করবেন বলেছেন...' : 'e.g. Customer requested to call back tomorrow...'}
                  value={logNote}
                  onChange={e => setLogNote(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              {/* Existing Logs History */}
              {selectedForLog.contactLogs && selectedForLog.contactLogs.length > 0 && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 max-h-36 overflow-y-auto">
                  <p className="text-[11px] font-bold text-slate-700 uppercase">
                    {isBn ? 'পূর্ববর্তী যোগাযোগের ইতিহাস' : 'Previous Logs'}
                  </p>
                  {selectedForLog.contactLogs.map((lg, i) => (
                    <div key={i} className="text-xs text-slate-600 border-b border-slate-200/60 pb-1.5 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-semibold uppercase">{lg.method}</span>
                        <span>{new Date(lg.timestamp).toLocaleString(isBn ? 'bn-BD' : 'en-US')}</span>
                      </div>
                      <p className="mt-0.5 text-slate-700">{lg.note}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedForLog(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveLog}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
                >
                  {isBn ? 'লগ সংরক্ষণ করুন' : 'Save Log'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Order Full Details Modal */}
      {selectedOrderForDetails && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold text-lg">
                  <ShoppingBag className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white flex items-center gap-2">
                    <span>{isBn ? 'কাস্টমার কী অর্ডার করতে চেয়েছিল' : 'Customer Order Intent & Details'}</span>
                    <span className="text-[11px] font-semibold bg-white/20 px-2 py-0.5 rounded-full">
                      #{selectedOrderForDetails.id}
                    </span>
                  </h3>
                  <p className="text-xs text-white/90">
                    {isBn ? 'অসম্পূর্ণ চেকআউট ড্রপ-অফ বিবরণ ও কাস্টমার ফলো-আপ' : 'Abandoned checkout lead inspection'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderForDetails(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-slate-600">
              {/* Customer Profile & Contact Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{selectedOrderForDetails.customerName}</h4>
                      <p className="text-slate-500 text-[11px]">{selectedOrderForDetails.customerPhone}</p>
                    </div>
                  </div>

                  {/* Stage Badge */}
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      selectedOrderForDetails.step === 'address_entered'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : selectedOrderForDetails.step === 'phone_entered'
                        ? 'bg-orange-100 text-orange-800 border border-orange-200'
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}
                  >
                    {selectedOrderForDetails.step === 'address_entered'
                      ? (isBn ? 'ঠিকানা পূরণ পর্যন্ত এসেছিলেন' : 'Address entered')
                      : selectedOrderForDetails.step === 'phone_entered'
                      ? (isBn ? 'নাম্বার টাইপ করে ছেড়ে গেছেন' : 'Phone entered')
                      : (isBn ? 'ফর্ম পূরণ অবস্থায় বের হয়েছেন' : 'In checkout')}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">{isBn ? 'মোবাইল নাম্বার' : 'Phone Number'}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono font-bold text-slate-900 text-sm">{selectedOrderForDetails.customerPhone}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyPhone(selectedOrderForDetails.customerPhone)}
                        className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-200 transition"
                        title={isBn ? 'নাম্বার কপি করুন' : 'Copy Phone'}
                      >
                        {copiedPhone ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">{isBn ? 'ডেলিভারি লোকেশন' : 'Delivery Location'}</span>
                    <p className="font-semibold text-slate-800 mt-0.5">
                      {selectedOrderForDetails.deliveryLocation === 'inside_dhaka'
                        ? (isBn ? 'ঢাকার ভেতরে (চার্জ ৳৬০)' : 'Inside Dhaka (৳60)')
                        : (isBn ? 'ঢাকার বাইরে (চার্জ ৳১২০)' : 'Outside Dhaka (৳120)')}
                    </p>
                  </div>

                  <div className="sm:col-span-2">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">{isBn ? 'সম্পূর্ণ ঠিকানা' : 'Customer Address'}</span>
                    <p className="font-medium text-slate-800 mt-0.5 flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{selectedOrderForDetails.customerAddress || (isBn ? 'কাস্টমার ঠিকানা টাইপ করার আগেই পেজ ছেড়ে গেছেন' : 'No address provided')}</span>
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">{isBn ? 'অন-পেইজ সোর্স' : 'Landing Page'}</span>
                    <p className="font-semibold text-indigo-700 mt-0.5">
                      {selectedOrderForDetails.landingPageTitle || 'Landing Page'}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">{isBn ? 'ড্রপ-অফের তারিখ ও সময়' : 'Date & Time'}</span>
                    <p className="font-medium text-slate-700 mt-0.5">
                      {new Date(selectedOrderForDetails.createdAt).toLocaleString(isBn ? 'bn-BD' : 'en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Ordered Products Section */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Package className="w-4 h-4 text-amber-600" />
                    <span>{isBn ? 'কাস্টমারের পছন্দের পণ্য ও ভ্যারিয়েন্ট' : 'Products Customer Wanted to Order'}</span>
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {selectedOrderForDetails.items?.length || 0} {isBn ? 'টি আইটেম' : 'items'}
                    </span>
                  </h4>
                </div>

                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden bg-white">
                  {selectedOrderForDetails.items && selectedOrderForDetails.items.length > 0 ? (
                    selectedOrderForDetails.items.map((item, idx) => {
                      const itemImg = getItemImage(selectedOrderForDetails, item.variantId, item.image);
                      return (
                        <div key={idx} className="p-3.5 flex items-center gap-3.5 hover:bg-slate-50/80 transition">
                          {itemImg ? (
                            <img
                              src={itemImg}
                              alt={item.variantName}
                              referrerPolicy="no-referrer"
                              className="w-14 h-14 object-cover rounded-lg border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm shrink-0 border border-amber-200">
                              <ShoppingBag className="w-6 h-6" />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <h5 className="font-bold text-slate-900 text-sm truncate">{item.variantName}</h5>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {item.size && (
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded text-[11px] border border-slate-200">
                                  {isBn ? 'সাইজ' : 'Size'}: {item.size}
                                </span>
                              )}
                              {item.long && (
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded text-[11px] border border-slate-200">
                                  {isBn ? 'লং' : 'Length'}: {item.long}"
                                </span>
                              )}
                              {item.customSelections && Object.entries(item.customSelections).map(([k, v]) => (
                                <span key={k} className="px-2 py-0.5 bg-amber-50 text-amber-800 font-semibold rounded text-[11px] border border-amber-200">
                                  {k}: {v}
                                </span>
                              ))}
                            </div>

                            <p className="text-[11px] text-slate-500 mt-1">
                              {isBn ? 'একক মূল্য' : 'Unit Price'}: ৳{item.unitPrice} × {item.quantity} {isBn ? 'টি' : 'qty'}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-bold text-slate-900 text-sm">৳{item.subtotal || (item.unitPrice * item.quantity)}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-slate-400 italic">
                      {isBn ? 'কাস্টমার পণ্য নির্বাচন করার সময় পেজ ছেড়ে গেছেন' : 'No specific items captured'}
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing Calculation Summary */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>{isBn ? 'পণ্যের মোট মূল্য (Subtotal):' : 'Products Subtotal:'}</span>
                  <span className="font-semibold text-slate-800">৳{selectedOrderForDetails.subtotal}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>{isBn ? 'ডেলিভারি চার্জ:' : 'Delivery Charge:'}</span>
                  <span className="font-semibold text-slate-800">৳{selectedOrderForDetails.deliveryCharge}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-900">{isBn ? 'সর্বমোট প্রদেয় টাকা (Grand Total):' : 'Grand Total:'}</span>
                  <span className="font-extrabold text-base text-rose-600">৳{selectedOrderForDetails.grandTotal || (selectedOrderForDetails.subtotal + selectedOrderForDetails.deliveryCharge)}</span>
                </div>
              </div>

              {/* Contact Status & Follow-up History */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-600" />
                    <span>{isBn ? 'ফলো-আপ ও যোগাযোগের হিস্ট্রি' : 'Contact & Follow-up History'}</span>
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">{isBn ? 'স্ট্যাটাস:' : 'Status:'}</span>
                    <select
                      value={selectedOrderForDetails.status}
                      onChange={async (e) => {
                        const newSt = e.target.value as IncompleteOrder['status'];
                        await updateIncompleteOrder(selectedOrderForDetails.id, { status: newSt });
                        setSelectedOrderForDetails({ ...selectedOrderForDetails, status: newSt });
                      }}
                      className="text-xs font-bold px-2 py-1 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="uncontacted">{isBn ? '⚠️ কল দেওয়া হয়নি' : 'Uncontacted'}</option>
                      <option value="contacted">{isBn ? '📞 কথা হয়েছে' : 'Contacted'}</option>
                      <option value="recovered">{isBn ? '✅ রিকভার্ড' : 'Recovered'}</option>
                      <option value="cancelled">{isBn ? '❌ বাতিল' : 'Cancelled'}</option>
                    </select>
                  </div>
                </div>

                {selectedOrderForDetails.contactLogs && selectedOrderForDetails.contactLogs.length > 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 max-h-32 overflow-y-auto">
                    {selectedOrderForDetails.contactLogs.map((log, i) => (
                      <div key={i} className="text-xs border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span className="font-bold uppercase text-slate-600">{log.method}</span>
                          <span>{new Date(log.timestamp).toLocaleString(isBn ? 'bn-BD' : 'en-US')}</span>
                        </div>
                        <p className="text-slate-700 mt-0.5">{log.note}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center text-slate-400 text-xs italic">
                    {isBn ? 'এখনও কোনো কল লগ রেকর্ড করা হয়নি' : 'No contact logs yet'}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Bottom Fixed Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                {/* Direct WhatsApp button */}
                <a
                  href={getWhatsAppLink(selectedOrderForDetails.customerPhone, selectedOrderForDetails.customerName, selectedOrderForDetails.landingPageTitle)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  <span>WhatsApp</span>
                </a>

                {/* Direct Call button */}
                <a
                  href={`tel:${selectedOrderForDetails.customerPhone}`}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{isBn ? 'ফোন কল' : 'Call'}</span>
                </a>

                {/* Add log button */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedForLog(selectedOrderForDetails);
                    setLogNote(selectedOrderForDetails.notes || '');
                  }}
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>{isBn ? '+ লগ যোগ' : '+ Add Log'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Convert to Confirmed Order button */}
                {selectedOrderForDetails.status !== 'recovered' && (
                  <button
                    type="button"
                    disabled={convertingId === selectedOrderForDetails.id}
                    onClick={async () => {
                      const currentId = selectedOrderForDetails.id;
                      setSelectedOrderForDetails(null);
                      await handleConvert(currentId);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    {convertingId === selectedOrderForDetails.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>{isBn ? 'কনফার্মড অর্ডারে রূপান্তর করুন' : 'Convert to Order'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedOrderForDetails(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition"
                >
                  {isBn ? 'বন্ধ করুন' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Clear Demo Incomplete Orders Modal */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-bold text-stone-900">
                {isBn ? 'সব ডেমো অসম্পূর্ণ লিড মুছে ফেলতে চান?' : 'Clear all demo incomplete leads?'}
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                {isBn
                  ? 'একবার মুছে ফেললে সিস্টেমটি স্থায়ীভাবে লাইভ মোডে থাকবে এবং কোনো অবস্থাতেই ডেমো লিড আর রিলোড হবে না। এরপরে শুধু আপনার আসল কাস্টমারদের ড্রপ-অফ লিড জমা হবে।'
                  : 'Once cleared, live mode is permanently locked and demo leads will never reload.'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                disabled={clearing}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    setClearing(true);
                    await clearDemoData({ clearOrders: false, clearIncomplete: true });
                    setShowClearModal(false);
                  } catch (err) {
                    console.error(err);
                    alert(isBn ? 'মুছে ফেলতে ব্যর্থ হয়েছে' : 'Failed to clear');
                  } finally {
                    setClearing(false);
                  }
                }}
                disabled={clearing}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {clearing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{clearing ? (isBn ? 'মুছে ফেলা হচ্ছে...' : 'Clearing...') : (isBn ? 'হ্যাঁ, ডেমো লিড মুছুন' : 'Yes, Clear Demo Leads')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Incomplete Order Edit Modal */}
      {editingIncompleteOrder && (
        <IncompleteOrderEditModal
          order={editingIncompleteOrder}
          isOpen={Boolean(editingIncompleteOrder)}
          onClose={() => setEditingIncompleteOrder(null)}
          onConvert={(id) => handleConvert(id)}
        />
      )}

      {/* Floating Bottom Quick Action Bar for multi-selected items */}
      {selectedOrderIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 text-white px-4 sm:px-6 py-3 rounded-2xl shadow-2xl border border-slate-700 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-bottom-5 duration-200 max-w-[95vw]">
          <div className="flex items-center gap-2 pr-3 border-r border-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-bold text-amber-300 whitespace-nowrap">
              {toLocalizedNumber(selectedOrderIds.length, adminLanguage)} {isBn ? 'টি সিলেক্টেড' : 'selected'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <select
              value={bulkStatus}
              onChange={e => setBulkStatus(e.target.value as IncompleteOrder['status'])}
              className="bg-slate-800 text-white text-xs font-bold px-2.5 py-1.5 rounded-xl border border-slate-600 focus:outline-none cursor-pointer"
            >
              <option value="uncontacted">{isBn ? '⚠️ কল দেওয়া হয়নি' : 'Uncontacted'}</option>
              <option value="contacted">{isBn ? '📞 কথা হয়েছে' : 'Contacted'}</option>
              <option value="recovered">{isBn ? '✅ রিকভার্ড' : 'Recovered'}</option>
              <option value="cancelled">{isBn ? '❌ বাতিল' : 'Cancelled'}</option>
            </select>
            <button
              type="button"
              onClick={() => handleApplyBulkStatus(bulkStatus)}
              disabled={isApplyingBulk}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-extrabold text-xs rounded-xl transition shadow-sm flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              {isApplyingBulk ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              <span>{isBn ? 'স্ট্যাটাস দিন' : 'Set Status'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleBulkConvert}
            disabled={isApplyingBulk}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl transition shadow-sm flex items-center gap-1 cursor-pointer disabled:opacity-50"
            title={isBn ? 'কনফার্মড অর্ডারে রূপান্তর করুন' : 'Convert to Orders'}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isBn ? 'কনফার্ম করুন' : 'Convert'}</span>
          </button>

          <button
            type="button"
            onClick={() => setDeleteModalState({ isOpen: true, type: 'bulk', ids: selectedOrderIds })}
            disabled={isApplyingBulk}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs rounded-xl transition shadow-sm flex items-center gap-1 cursor-pointer disabled:opacity-50"
            title={isBn ? 'মুছে ফেলুন' : 'Delete'}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isBn ? 'মুছে ফেলুন' : 'Delete'}</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedOrderIds([])}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 transition cursor-pointer"
            title={isBn ? 'সিলেকশন বাতিল' : 'Cancel selection'}
          >
            ✕
          </button>
        </div>
      )}

      {/* Action Feedback Toast */}
      {actionFeedbackToast && (
        <div className={`fixed top-5 right-5 z-50 p-4 rounded-xl shadow-lg border flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-top-3 duration-200 ${
          actionFeedbackToast.success
            ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
            : 'bg-rose-50 text-rose-900 border-rose-300'
        }`}>
          {actionFeedbackToast.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{actionFeedbackToast.message}</span>
        </div>
      )}

      {/* In-App Delete Confirmation Modal */}
      {deleteModalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900">
                {deleteModalState.type === 'bulk'
                  ? (isBn
                      ? `নির্বাচিত ${toLocalizedNumber(deleteModalState.ids?.length || selectedOrderIds.length, adminLanguage)}টি অসম্পূর্ণ অর্ডার মুছবেন?`
                      : `Delete ${deleteModalState.ids?.length || selectedOrderIds.length} selected incomplete order(s)?`)
                  : (isBn
                      ? `এই অসম্পূর্ণ অর্ডারটি মুছে ফেলতে চান?`
                      : `Delete this incomplete order?`)}
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                {isBn
                  ? 'এই কাজটি সম্পন্ন করলে নির্বাচিত অসম্পূর্ণ অর্ডারগুলো স্থায়ীভাবে মুছে যাবে এবং তা আর পুনরুদ্ধার করা সম্ভব হবে না।'
                  : 'This action cannot be undone. The selected lead(s) will be permanently deleted.'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteModalState({ isOpen: false, type: 'bulk' })}
                disabled={isApplyingBulk}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
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
    </div>
  );
}
