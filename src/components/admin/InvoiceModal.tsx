import { Order } from '../../types.ts';
import { Printer, X, CheckCircle, Package } from 'lucide-react';

interface InvoiceModalProps {
  order?: Order;
  orders?: Order[];
  onClose: () => void;
}

export default function InvoiceModal({ order, orders, onClose }: InvoiceModalProps) {
  const orderList = orders && orders.length > 0 ? orders : (order ? [order] : []);

  const handlePrint = () => {
    window.print();
  };

  if (orderList.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-stone-200 text-stone-800 print:shadow-none print:border-none print:max-w-none print:w-full print:p-0">
        {/* Header with Print & Close buttons (hidden on print) */}
        <div className="flex items-center justify-between border-b pb-4 mb-4 print:hidden">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-rose-600" />
            <h3 className="font-bold text-lg text-stone-900">
              ইনভয়েস / পার্সেল স্লিপ {orderList.length > 1 ? `(${orderList.length}টি অর্ডার)` : ''}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold shadow hover:bg-rose-700 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{orderList.length > 1 ? `সব প্রিন্ট করুন (${orderList.length})` : 'প্রিন্ট করুন'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area with all orders */}
        <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1 print:max-h-none print:overflow-visible print:space-y-8">
          {orderList.map((ord, orderIndex) => (
            <div
              key={ord.id}
              className="border border-stone-300 rounded-xl p-6 bg-white print:border-2 print:p-6 text-sm break-inside-avoid print:break-after-page"
              style={{ pageBreakAfter: orderIndex < orderList.length - 1 ? 'always' : 'auto' }}
            >
              {/* Top Brand & Order Info */}
              <div className="flex justify-between items-start border-b border-stone-200 pb-4 mb-4">
                <div>
                  <h2 className="text-xl font-extrabold text-rose-700 tracking-tight">AmarChoice</h2>
                  <p className="text-xs text-stone-500">অনলাইন ই-কমার্স ও ডেলিভারি পার্সেল স্লিপ</p>
                  <p className="text-xs text-stone-600 font-medium mt-1">হটলাইন: 01606318193</p>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-stone-900">ইনভয়েস: {ord.id}</div>
                  <div className="text-xs text-stone-500">
                    তারিখ: {new Date(ord.createdAt).toLocaleDateString('bn-BD')}
                  </div>
                  <div className="mt-1 inline-block px-2 py-0.5 rounded bg-stone-100 text-stone-700 text-[11px] font-semibold border border-stone-200">
                    অন-পেইজ: {ord.landingPageTitle}
                  </div>
                </div>
              </div>

              {/* Recipient Customer Details Box */}
              <div className="grid grid-cols-2 gap-4 bg-stone-50 p-3.5 rounded-lg border border-stone-200 mb-4 text-xs">
                <div>
                  <p className="font-bold text-stone-600 uppercase tracking-wide text-[10px] mb-1">গ্রাহকের বিবরণ (কাস্টমার):</p>
                  <p className="font-bold text-stone-900 text-sm">{ord.customerName}</p>
                  <p className="font-bold text-rose-700 text-sm mt-0.5">মোবাইল: {ord.customerPhone}</p>
                  <p className="text-stone-700 mt-1 whitespace-pre-line leading-relaxed">{ord.customerAddress}</p>
                </div>
                <div className="border-l border-stone-200 pl-4">
                  <p className="font-bold text-stone-600 uppercase tracking-wide text-[10px] mb-1">কুরিয়ার বিবরণ:</p>
                  <p className="font-semibold text-stone-900">
                    {ord.courier ? (
                      <span className="text-emerald-700 uppercase font-bold">{ord.courier.provider} Courier</span>
                    ) : (
                      <span className="text-amber-700">কুরিয়ার এন্ট্রি পেন্ডিং</span>
                    )}
                  </p>
                  {ord.courier?.trackingCode && (
                    <p className="text-stone-700 mt-1 font-mono text-xs">
                      ট্র্যাকিং কোড: <span className="font-bold text-stone-900">{ord.courier.trackingCode}</span>
                    </p>
                  )}
                  {ord.courier?.consignmentId && (
                    <p className="text-stone-700 font-mono text-xs">
                      কনসাইনমেন্ট আইডি: {ord.courier.consignmentId}
                    </p>
                  )}
                  <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded text-rose-900 font-bold text-xs">
                    ক্যাশ অন ডেলিভারি (COD): {ord.grandTotal}৳
                  </div>
                </div>
              </div>

              {/* Ordered Products Table */}
              <table className="w-full text-left text-xs mb-4">
                <thead>
                  <tr className="border-b border-stone-300 text-stone-600 uppercase font-bold text-[10px]">
                    <th className="pb-2">পণ্য বিবরণ</th>
                    <th className="pb-2 text-center">অপশন / সাইজ</th>
                    <th className="pb-2 text-center">পরিমাণ</th>
                    <th className="pb-2 text-right">মূল্য</th>
                    <th className="pb-2 text-right">মোট</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {ord.items.map((item, idx) => (
                    <tr key={idx} className="py-2">
                      <td className="py-2 font-medium text-stone-800">{item.variantName}</td>
                      <td className="py-2 text-center text-stone-700">
                        {item.customSelections && Object.keys(item.customSelections).length > 0 ? (
                          <div className="text-[10px] space-y-0.5">
                            {Object.entries(item.customSelections).map(([k, v]) => (
                              <div key={k}>
                                <span className="text-stone-500">{k}:</span> <strong>{v}</strong>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <>
                            <span>{item.size || '—'}</span>
                            {item.long && <span className="block text-[10px] text-stone-500 font-semibold">লং: {item.long}"</span>}
                          </>
                        )}
                      </td>
                      <td className="py-2 text-center font-bold text-stone-800">{item.quantity}</td>
                      <td className="py-2 text-right text-stone-700">{item.unitPrice}৳</td>
                      <td className="py-2 text-right font-bold text-stone-900">{item.subtotal}৳</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Total Calculation */}
              <div className="border-t border-stone-200 pt-3 flex justify-end text-xs">
                <div className="w-48 space-y-1">
                  <div className="flex justify-between text-stone-600">
                    <span>পণ্যের মূল্য:</span>
                    <span>{ord.subtotal}৳</span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>ডেলিভারি চার্জ:</span>
                    <span>{ord.deliveryCharge === 0 ? 'ফ্রি' : `${ord.deliveryCharge}৳`}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-stone-900 border-t border-stone-300 pt-1">
                    <span>সর্বমোট (COD):</span>
                    <span className="text-rose-700">{ord.grandTotal}৳</span>
                  </div>
                </div>
              </div>

              {/* Barcode representation */}
              <div className="mt-6 pt-4 border-t border-dashed border-stone-300 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-stone-500">পার্সেল ডেলিভারি নোট:</p>
                  <p className="text-xs text-stone-700 italic">{ord.notes || 'কাস্টমারকে কল করে ডেলিভারি দিন।'}</p>
                </div>
                <div className="text-center font-mono text-[10px] text-stone-400">
                  <div className="tracking-widest text-xs font-bold text-stone-700">||| | | || ||| || ||| |</div>
                  <div>*{ord.id}*</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <div className="mt-4 flex justify-end gap-2 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
          >
            বন্ধ করুন
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{orderList.length > 1 ? `সব প্রিন্ট করুন (${orderList.length})` : 'প্রিন্ট করুন'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
