import React, { useState } from 'react';
import { 
  X, 
  Save, 
  User, 
  Phone, 
  MapPin, 
  Truck, 
  Package, 
  Plus, 
  Trash2, 
  DollarSign, 
  FileText, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Order, OrderItem, OrderStatus } from '../../types';

interface OrderEditModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (updatedOrder: Order) => void;
}

export const OrderEditModal: React.FC<OrderEditModalProps> = ({
  order,
  isOpen,
  onClose,
  onSaved
}) => {
  const { updateOrder, adminLanguage } = useApp();
  const isBn = adminLanguage === 'bn';

  const [customerName, setCustomerName] = useState(order.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(order.customerPhone || '');
  const [customerAddress, setCustomerAddress] = useState(order.customerAddress || '');
  const [deliveryLocation, setDeliveryLocation] = useState<'inside_dhaka' | 'outside_dhaka'>(order.deliveryLocation || 'inside_dhaka');
  const [deliveryCharge, setDeliveryCharge] = useState<number>(order.deliveryCharge || (order.deliveryLocation === 'outside_dhaka' ? 120 : 60));
  const [status, setStatus] = useState<OrderStatus>(order.status || 'confirmed');
  const [notes, setNotes] = useState(order.notes || '');

  const [items, setItems] = useState<OrderItem[]>(
    order.items && order.items.length > 0 
      ? order.items.map(it => ({ ...it })) 
      : [{
          variantId: 'custom-1',
          variantName: 'পণ্য',
          size: 'Standard',
          quantity: 1,
          unitPrice: order.subtotal || 1000,
          subtotal: order.subtotal || 1000
        }]
  );

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  // Calculated totals
  const calculatedSubtotal = items.reduce((sum, item) => sum + (Number(item.unitPrice || 0) * Number(item.quantity || 1)), 0);
  const calculatedGrandTotal = calculatedSubtotal + Number(deliveryCharge || 0);

  const handleItemChange = (index: number, field: keyof OrderItem, value: any) => {
    setItems(prev => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        const qty = field === 'quantity' ? Number(value) : item.quantity;
        const price = field === 'unitPrice' ? Number(value) : item.unitPrice;
        item.subtotal = (qty || 1) * (price || 0);
      }
      updated[index] = item;
      return updated;
    });
  };

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      {
        variantId: `item-${Date.now()}`,
        variantName: 'নতুন আইটেম',
        size: 'Standard',
        quantity: 1,
        unitPrice: 500,
        subtotal: 500
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      alert(isBn ? 'কমপক্ষে একটি পণ্য অর্ডারে থাকতে হবে!' : 'At least one item must remain in the order!');
      return;
    }
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleLocationChange = (loc: 'inside_dhaka' | 'outside_dhaka') => {
    setDeliveryLocation(loc);
    if (loc === 'inside_dhaka' && deliveryCharge === 120) {
      setDeliveryCharge(60);
    } else if (loc === 'outside_dhaka' && deliveryCharge === 60) {
      setDeliveryCharge(120);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerPhone.trim()) {
      setErrorMsg(isBn ? 'কাস্টমারের ফোন নাম্বার আবশ্যক!' : 'Customer phone is required!');
      return;
    }
    if (items.length === 0) {
      setErrorMsg(isBn ? 'কমপক্ষে একটি আইটেম থাকতে হবে!' : 'Must have at least one item!');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      const updatedData: Partial<Order> = {
        customerName: customerName.trim() || 'অজানা ক্রেতা',
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        deliveryLocation,
        deliveryCharge: Number(deliveryCharge) || 0,
        items,
        subtotal: calculatedSubtotal,
        grandTotal: calculatedGrandTotal,
        status,
        notes: notes.trim()
      };

      const res = await updateOrder(order.id, updatedData);
      setSuccessMsg(isBn ? 'অর্ডারের তথ্য সফলভাবে আপডেট হয়েছে!' : 'Order updated successfully!');
      if (onSaved) onSaved(res);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err?.message || (isBn ? 'আপডেট করতে সমস্যা হয়েছে' : 'Failed to update order'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-400/30">
              <Package className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base tracking-tight">
                  {isBn ? 'অর্ডার তথ্য এডিট করুন' : 'Edit Order Details'}
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 bg-white/10 text-amber-300 rounded-md font-bold">
                  #{order.id}
                </span>
              </div>
              <p className="text-xs text-stone-300">
                {order.landingPageTitle || 'Landing Page'} • {new Date(order.createdAt).toLocaleDateString('bn-BD')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-white hover:bg-white/10 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Section 1: Customer Contact Info */}
          <div className="bg-stone-50/80 p-4 rounded-xl border border-stone-200 space-y-3">
            <div className="flex items-center gap-2 text-stone-800 font-bold text-xs">
              <User className="w-4 h-4 text-stone-600" />
              <span>{isBn ? 'গ্রাহকের তথ্য' : 'Customer Info'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">
                  {isBn ? 'গ্রাহকের নাম' : 'Customer Name'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="যেমন: মোঃ সাব্বির আহমেদ"
                    className="w-full pl-8 pr-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-stone-400 focus:outline-none"
                  />
                  <User className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">
                  {isBn ? 'মোবাইল নাম্বার *' : 'Phone Number *'}
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full pl-8 pr-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-900 focus:ring-2 focus:ring-stone-400 focus:outline-none"
                  />
                  <Phone className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-600 mb-1">
                {isBn ? 'ডেলিভারি ঠিকানা' : 'Delivery Address'}
              </label>
              <div className="relative">
                <textarea
                  rows={2}
                  value={customerAddress}
                  onChange={e => setCustomerAddress(e.target.value)}
                  placeholder="জেলা, থানা, গ্রাম/মহল্লা, বাসা নং"
                  className="w-full pl-8 pr-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-stone-400 focus:outline-none resize-none"
                />
                <MapPin className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
              </div>
            </div>
          </div>

          {/* Section 2: Items in Order */}
          <div className="bg-stone-50/80 p-4 rounded-xl border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-stone-800 font-bold text-xs">
                <Package className="w-4 h-4 text-stone-600" />
                <span>{isBn ? 'অর্ডারের পণ্যসমূহ' : 'Order Items'}</span>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-[11px] font-bold text-stone-700 bg-white hover:bg-stone-100 border border-stone-300 px-2.5 py-1 rounded-lg transition flex items-center gap-1 shadow-2xs"
              >
                <Plus className="w-3 h-3" />
                <span>{isBn ? '+ পণ্য যোগ করুন' : '+ Add Item'}</span>
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {items.map((item, idx) => (
                <div key={idx} className="bg-white p-3 rounded-lg border border-stone-200 grid grid-cols-12 gap-2 items-center text-xs">
                  <div className="col-span-5">
                    <label className="block text-[10px] text-stone-500 font-bold mb-0.5">{isBn ? 'পণ্যের নাম' : 'Name'}</label>
                    <input
                      type="text"
                      value={item.variantName || ''}
                      onChange={e => handleItemChange(idx, 'variantName', e.target.value)}
                      className="w-full px-2 py-1 bg-stone-50 border border-stone-200 rounded text-xs font-medium focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] text-stone-500 font-bold mb-0.5">{isBn ? 'সাইজ/ভেরিয়েন্ট' : 'Size'}</label>
                    <input
                      type="text"
                      value={item.size || ''}
                      onChange={e => handleItemChange(idx, 'size', e.target.value)}
                      placeholder="M / L"
                      className="w-full px-2 py-1 bg-stone-50 border border-stone-200 rounded text-xs font-medium focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] text-stone-500 font-bold mb-0.5">{isBn ? 'পরিমাণ' : 'Qty'}</label>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={e => handleItemChange(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-2 py-1 bg-stone-50 border border-stone-200 rounded text-xs font-mono font-bold text-center focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] text-stone-500 font-bold mb-0.5">{isBn ? 'মূল্য (৳)' : 'Price'}</label>
                    <input
                      type="number"
                      min={0}
                      value={item.unitPrice}
                      onChange={e => handleItemChange(idx, 'unitPrice', Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-2 py-1 bg-stone-50 border border-stone-200 rounded text-xs font-mono font-bold focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="col-span-1 flex justify-end pt-3">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                      title={isBn ? 'বাদ দিন' : 'Remove item'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Delivery Location & Charges */}
          <div className="bg-stone-50/80 p-4 rounded-xl border border-stone-200 space-y-3">
            <div className="flex items-center gap-2 text-stone-800 font-bold text-xs">
              <Truck className="w-4 h-4 text-stone-600" />
              <span>{isBn ? 'ডেলিভারি এরিয়া ও চার্জ' : 'Delivery & Location'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">
                  {isBn ? 'ডেলিভারি এরিয়া' : 'Delivery Location'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleLocationChange('inside_dhaka')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition ${
                      deliveryLocation === 'inside_dhaka'
                        ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                        : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                    }`}
                  >
                    {isBn ? 'ঢাকা সিটি (৳৬০)' : 'Inside Dhaka'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLocationChange('outside_dhaka')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition ${
                      deliveryLocation === 'outside_dhaka'
                        ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                        : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                    }`}
                  >
                    {isBn ? 'ঢাকার বাইরে (৳১২০)' : 'Outside Dhaka'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">
                  {isBn ? 'ডেলিভারি চার্জ (৳)' : 'Delivery Charge (৳)'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    value={deliveryCharge}
                    onChange={e => setDeliveryCharge(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-900 focus:ring-2 focus:ring-stone-400 focus:outline-none"
                  />
                  <DollarSign className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Status & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-stone-600 mb-1">
                {isBn ? 'অর্ডার স্ট্যাটাস' : 'Order Status'}
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as OrderStatus)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-bold text-stone-900 focus:ring-2 focus:ring-stone-400 focus:outline-none"
              >
                <option value="pending">{isBn ? '⏳ পেন্ডিং (Pending)' : 'Pending'}</option>
                <option value="confirmed">{isBn ? '✅ কনফার্মড (Confirmed)' : 'Confirmed'}</option>
                <option value="processing">{isBn ? '📦 প্রসেসিং (Processing)' : 'Processing'}</option>
                <option value="in_courier">{isBn ? '🚚 কুরিয়ারে পাঠানো (In Courier)' : 'In Courier'}</option>
                <option value="delivered">{isBn ? '🎉 ডেলিভার্ড (Delivered)' : 'Delivered'}</option>
                <option value="cancelled">{isBn ? '❌ বাতিল (Cancelled)' : 'Cancelled'}</option>
                <option value="returned">{isBn ? '↩️ রিটার্নড (Returned)' : 'Returned'}</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-600 mb-1">
                {isBn ? 'অর্ডার নোট / মন্তব্য' : 'Order Note'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="যেমন: গ্রাহক আগামীকাল ডেলিভারি চেয়েছেন"
                  className="w-full pl-8 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-stone-400 focus:outline-none"
                />
                <FileText className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
              </div>
            </div>
          </div>

          {/* Summary Box */}
          <div className="bg-stone-900 text-white p-4 rounded-xl flex items-center justify-between text-xs">
            <div className="space-y-1">
              <div className="text-stone-300">
                {isBn ? 'আইটেম সাবটোটাল:' : 'Items Subtotal:'} <span className="font-mono font-bold text-white">৳ {calculatedSubtotal}</span>
              </div>
              <div className="text-stone-300">
                {isBn ? 'ডেলিভারি চার্জ:' : 'Delivery Charge:'} <span className="font-mono font-bold text-white">৳ {deliveryCharge}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-amber-300 font-bold uppercase">{isBn ? 'সর্বমোট বিল' : 'Grand Total'}</div>
              <div className="text-xl font-mono font-black text-amber-400">৳ {calculatedGrandTotal}</div>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-stone-50 border-t border-stone-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-stone-600 hover:text-stone-900 font-bold text-xs rounded-xl hover:bg-stone-200/60 transition"
          >
            {isBn ? 'বাতিল' : 'Cancel'}
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSubmit}
            className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isBn ? 'পরিবর্তন সংরক্ষণ করুন' : 'Save Changes'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
