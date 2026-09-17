import { useState, useMemo, FormEvent } from 'react';
import { LandingPage, ProductVariant, OrderItem, VariantOptionField } from '../../types.ts';
import { useApp } from '../../context/AppContext.tsx';
import {
  ShoppingBag,
  ShoppingCart,
  Search,
  Check,
  Plus,
  Minus,
  Trash2,
  X,
  Zap,
  ArrowRight,
  ShieldCheck,
  Truck,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ExternalLink,
  Eye,
  Star,
  PhoneCall
} from 'lucide-react';

interface EcommerceStoreViewProps {
  page: LandingPage;
}

interface CartItem {
  id: string; // unique key in cart: variantId + options fingerprint
  variant: ProductVariant;
  size: string;
  long?: string;
  customSelections?: Record<string, string>;
  quantity: number;
}

// Helper to extract variant option fields, falling back to legacy sizes/longSizes
function getProductCustomFields(prod: ProductVariant): VariantOptionField[] {
  if (prod.customFields && Array.isArray(prod.customFields) && prod.customFields.length > 0) {
    return prod.customFields;
  }
  const fields: VariantOptionField[] = [];
  if (prod.sizes && prod.sizes.length > 0) {
    fields.push({
      id: 'field_size_' + prod.id,
      label: 'সাইজ',
      options: [...prod.sizes]
    });
  }
  if (prod.hasLong && prod.longSizes && prod.longSizes.length > 0) {
    fields.push({
      id: 'field_long_' + prod.id,
      label: 'লং',
      options: [...prod.longSizes]
    });
  }
  return fields;
}

export default function EcommerceStoreView({ page }: EcommerceStoreViewProps) {
  const { createOrder, trackPixelEvent } = useApp();

  // Search and Category filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('সকল পণ্য');

  // Selected options cache per product variant ID: { [prodId]: { [fieldId]: string } }
  const [variantSelections, setVariantSelections] = useState<Record<string, Record<string, string>>>({});

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartToast, setCartToast] = useState<{ message: string; visible: boolean } | null>(null);

  // Single Product Quick Order Modal
  const [quickOrderProduct, setQuickOrderProduct] = useState<{
    product: ProductVariant;
    size: string;
    long?: string;
    customSelections: Record<string, string>;
    fieldSelections: Record<string, string>;
  } | null>(null);

  // Product Full Detail Quick View Modal
  const [quickViewProduct, setQuickViewProduct] = useState<ProductVariant | null>(null);

  // Checkout Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState<'inside_dhaka' | 'outside_dhaka'>('inside_dhaka');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [orderSuccessData, setOrderSuccessData] = useState<{
    id: string;
    total: number;
    items: OrderItem[];
    customerName: string;
    customerPhone: string;
  } | null>(null);

  const themeColor = page.themeColor || '#0f766e';

  // Categories list
  const categories = useMemo(() => {
    const list = page.storeCategories && page.storeCategories.length > 0
      ? page.storeCategories
      : ['সকল পণ্য'];
    if (!list.includes('সকল পণ্য')) {
      return ['সকল পণ্য', ...list];
    }
    return list;
  }, [page.storeCategories]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return (page.products || []).filter(prod => {
      const matchesSearch = prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (prod.description && prod.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (prod.category && prod.category.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'সকল পণ্য' || prod.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [page.products, searchQuery, selectedCategory]);

  // Active selections helper
  const getProductSelection = (prod: ProductVariant) => {
    const fields = getProductCustomFields(prod);
    const prodState = variantSelections[prod.id] || {};
    const fieldSelections: Record<string, string> = {};
    const customSelections: Record<string, string> = {};

    fields.forEach(f => {
      const chosen = prodState[f.id] || (f.options && f.options.length > 0 ? f.options[0] : '');
      if (chosen) {
        fieldSelections[f.id] = chosen;
        const cleanLabel = f.label.replace(/:$/, '').trim();
        customSelections[cleanLabel] = chosen;
      }
    });

    const size = fields[0] ? fieldSelections[fields[0].id] : (prod.sizes?.[0] || 'Standard');
    const long = fields[1] ? fieldSelections[fields[1].id] : (prod.hasLong ? prod.longSizes?.[0] : undefined);

    return {
      size: size || 'Standard',
      long,
      customSelections,
      fieldSelections
    };
  };

  const handleSelectOption = (prodId: string, fieldId: string, optionVal: string) => {
    setVariantSelections(prev => ({
      ...prev,
      [prodId]: {
        ...(prev[prodId] || {}),
        [fieldId]: optionVal
      }
    }));
  };

  const handleSelectSize = (prodId: string, sizeVal: string) => {
    const prod = page.products.find(p => p.id === prodId);
    const fields = prod ? getProductCustomFields(prod) : [];
    const fieldId = fields[0]?.id || `field_size_${prodId}`;
    handleSelectOption(prodId, fieldId, sizeVal);
  };

  const handleSelectLong = (prodId: string, longVal: string) => {
    const prod = page.products.find(p => p.id === prodId);
    const fields = prod ? getProductCustomFields(prod) : [];
    const fieldId = fields[1]?.id || `field_long_${prodId}`;
    handleSelectOption(prodId, fieldId, longVal);
  };

  // Toast notification
  const triggerToast = (msg: string) => {
    setCartToast({ message: msg, visible: true });
    setTimeout(() => {
      setCartToast(null);
    }, 2800);
  };

  // Add product to Cart
  const handleAddToCart = (prod: ProductVariant, openCartAfter = false) => {
    const { size, long, customSelections } = getProductSelection(prod);
    const optionFingerprint = Object.entries(customSelections).map(([k, v]) => `${k}:${v}`).join('|') || `${size}-${long || 'none'}`;
    const cartItemId = `${prod.id}-${optionFingerprint}`;

    setCart(prev => {
      const existingIdx = prev.findIndex(item => item.id === cartItemId);
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += 1;
        return updated;
      } else {
        return [
          ...prev,
          {
            id: cartItemId,
            variant: prod,
            size,
            long,
            customSelections,
            quantity: 1
          }
        ];
      }
    });

    trackPixelEvent('AddToCart', {
      productName: prod.name,
      price: prod.price,
      size,
      long
    });

    triggerToast(`"${prod.name}" কার্টে যোগ করা হয়েছে!`);
    if (openCartAfter) {
      setIsCartOpen(true);
    }
  };

  // Quick Single Product "অর্ডার করুন" click
  const handleDirectOrder = (prod: ProductVariant) => {
    const { size, long, customSelections, fieldSelections } = getProductSelection(prod);
    setQuickOrderProduct({ product: prod, size, long, customSelections, fieldSelections });
    // Also prepare cart or open direct checkout modal
  };

  // Cart operations
  const updateCartItemQuantity = (cartItemId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.id === cartItemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeCartItem = (cartItemId: string) => {
    setCart(prev => prev.filter(item => item.id !== cartItemId));
  };

  const totalCartCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.variant.price * item.quantity, 0);
  }, [cart]);

  // Delivery charge calculation
  const isFreeDelivery = page.deliveryCharges?.isFreeDelivery || (cartSubtotal >= 2000);
  const deliveryFee = isFreeDelivery
    ? 0
    : deliveryLocation === 'inside_dhaka'
    ? page.deliveryCharges?.insideDhaka ?? 60
    : page.deliveryCharges?.outsideDhaka ?? 120;

  const cartGrandTotal = cartSubtotal > 0 ? cartSubtotal + deliveryFee : 0;

  // Single Product Quick Order Calculation
  const quickProductSubtotal = quickOrderProduct ? quickOrderProduct.product.price : 0;
  const quickDeliveryFee = page.deliveryCharges?.isFreeDelivery
    ? 0
    : deliveryLocation === 'inside_dhaka'
    ? page.deliveryCharges?.insideDhaka ?? 60
    : page.deliveryCharges?.outsideDhaka ?? 120;
  const quickGrandTotal = quickProductSubtotal + quickDeliveryFee;

  // Submit Multi-Item Cart Order
  const handleCartCheckoutSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) {
      setCheckoutError('অনুগ্রহ করে নাম, ১১ ডিজিটের মোবাইল নাম্বার ও সম্পূর্ণ ঠিকানা পূরণ করুন।');
      return;
    }
    if (cart.length === 0) {
      setCheckoutError('আপনার শপিং কার্ট খালি। অনুগ্রহ করে পণ্য নির্বাচন করুন।');
      return;
    }

    setCheckoutError(null);
    setIsSubmitting(true);

    const orderItems: OrderItem[] = cart.map(item => ({
      variantId: item.variant.id,
      variantName: item.variant.name,
      size: item.size,
      long: item.long,
      customSelections: item.customSelections,
      quantity: item.quantity,
      unitPrice: item.variant.price,
      subtotal: item.variant.price * item.quantity,
      image: item.variant.image
    }));

    try {
      const newOrder = await createOrder({
        landingPageId: page.id,
        landingPageTitle: page.title,
        landingPageSlug: page.slug,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        items: orderItems,
        deliveryLocation,
        deliveryCharge: deliveryFee,
        subtotal: cartSubtotal,
        grandTotal: cartGrandTotal,
        notes: orderNote.trim()
      });

      trackPixelEvent('Purchase', {
        orderId: newOrder.id,
        value: newOrder.grandTotal,
        currency: 'BDT',
        num_items: totalCartCount
      }, {
        name: customerName.trim(),
        phone: customerPhone.trim(),
        address: customerAddress.trim()
      });

      setOrderSuccessData({
        id: newOrder.id,
        total: newOrder.grandTotal,
        items: orderItems,
        customerName: newOrder.customerName,
        customerPhone: newOrder.customerPhone
      });

      // Clear cart
      setCart([]);
      setIsCartOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'অর্ডার সম্পন্ন করা যায়নি। পুনরায় চেষ্টা করুন।';
      setCheckoutError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Single Product Quick Order
  const handleQuickOrderSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!quickOrderProduct) return;
    if (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) {
      setCheckoutError('অনুগ্রহ করে নাম, ১১ ডিজিটের মোবাইল নাম্বার ও সম্পূর্ণ ঠিকানা পূরণ করুন।');
      return;
    }

    setCheckoutError(null);
    setIsSubmitting(true);

    const orderItems: OrderItem[] = [
      {
        variantId: quickOrderProduct.product.id,
        variantName: quickOrderProduct.product.name,
        size: quickOrderProduct.size,
        long: quickOrderProduct.long,
        customSelections: quickOrderProduct.customSelections,
        quantity: 1,
        unitPrice: quickOrderProduct.product.price,
        subtotal: quickOrderProduct.product.price,
        image: quickOrderProduct.product.image
      }
    ];

    try {
      const newOrder = await createOrder({
        landingPageId: page.id,
        landingPageTitle: page.title,
        landingPageSlug: page.slug,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        items: orderItems,
        deliveryLocation,
        deliveryCharge: quickDeliveryFee,
        subtotal: quickProductSubtotal,
        grandTotal: quickGrandTotal,
        notes: orderNote.trim()
      });

      trackPixelEvent('Purchase', {
        orderId: newOrder.id,
        value: newOrder.grandTotal,
        currency: 'BDT',
        num_items: 1
      }, {
        name: customerName.trim(),
        phone: customerPhone.trim(),
        address: customerAddress.trim()
      });

      setOrderSuccessData({
        id: newOrder.id,
        total: newOrder.grandTotal,
        items: orderItems,
        customerName: newOrder.customerName,
        customerPhone: newOrder.customerPhone
      });

      setQuickOrderProduct(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'অর্ডার সম্পন্ন করা যায়নি। পুনরায় চেষ্টা করুন।';
      setCheckoutError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#f8f9fa] text-stone-900">
      {/* Toast Notification */}
      {cartToast && (
        <div className="fixed top-5 right-5 z-50 bg-stone-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{cartToast.message}</span>
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="ml-2 underline text-amber-300 hover:text-amber-200"
          >
            কার্ট দেখুন
          </button>
        </div>
      )}

      {/* Top Promotional Announcement Banner */}
      {page.showTopBanner && (
        <div
          className="text-white text-xs font-bold py-2 px-4 text-center shadow-xs"
          style={{ backgroundColor: themeColor }}
        >
          {page.topBannerText || '🎉 বিশেষ অফার – যেকোনো ২টি পণ্য অর্ডারে ফ্রি হোম ডেলিভারি!'}
        </div>
      )}

      {/* Main E-Commerce Sticky Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0"
              style={{ backgroundColor: themeColor }}
            >
              {page.brandName.charAt(0) || 'A'}
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-stone-900 leading-tight">
                {page.brandName}
              </h1>
              <p className="text-[11px] text-stone-500 font-medium hidden sm:block">
                {page.brandTagline || 'অফিসিয়াল ই-কমার্স অনলাইন শপ'}
              </p>
            </div>
          </div>

          {/* Search Box in Header (Desktop) */}
          <div className="hidden md:flex flex-1 max-w-md mx-4 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="পছন্দের পোশাক বা পণ্য খুঁজুন..."
              className="w-full pl-9 pr-4 py-2 bg-stone-100 focus:bg-white border border-stone-200 rounded-full text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
            />
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            {/* Call button */}
            {page.callNumber && (
              <a
                href={`tel:${page.callNumber}`}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition"
              >
                <span>📞 {page.callNumber}</span>
              </a>
            )}

            {/* Cart Button */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-full text-white font-bold text-xs shadow hover:opacity-95 transition relative"
              style={{ backgroundColor: themeColor }}
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">কার্ট</span>
              <span className="bg-white text-stone-900 font-black px-1.5 py-0.5 rounded-full text-[10px] shadow-xs">
                {totalCartCount}
              </span>
              {cartSubtotal > 0 && (
                <span className="hidden md:inline pl-1 text-[11px] font-mono border-l border-white/30">
                  {cartSubtotal}৳
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="px-4 pb-2.5 md:hidden">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="পণ্য খুঁজুন..."
              className="w-full pl-9 pr-4 py-2 bg-stone-100 border border-stone-200 rounded-full text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-stone-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 pt-5 space-y-6">
        {/* Store Hero Banner & Badges */}
        <div
          className="relative text-white rounded-3xl p-6 sm:p-8 shadow-sm overflow-hidden border border-stone-800"
          style={{
            background: `linear-gradient(135deg, #1c1917 0%, #292524 50%, #1c1917 100%)`
          }}
        >
          {/* Subtle colored glow from theme */}
          <div
            className="absolute -right-16 -top-16 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none"
            style={{ backgroundColor: themeColor }}
          />

          <div className="relative z-10 max-w-2xl space-y-3.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold backdrop-blur-md border border-white/10">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: themeColor }} />
              <span>{page.brandName} অফিশিয়াল অনলাইন শপ</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              {page.heroTitle || 'প্রিমিয়াম কালেকশন ও এক্সক্লুসিভ অফার'}
            </h2>

            <p className="text-stone-300 text-xs sm:text-sm leading-relaxed max-w-xl">
              পছন্দের একাধিক পোশাক একসাথে কার্টে যুক্ত করুন অথবা সরাসরি ১-ক্লিকে ক্যাশ অন ডেলিভারিতে অর্ডার করুন।
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-stone-200">
              <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg backdrop-blur-xs border border-white/5">
                <Truck className="w-4 h-4 text-emerald-400" />
                <span>সারাদেশে দ্রুত ডেলিভারি</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg backdrop-blur-xs border border-white/5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>ক্যাশ অন ডেলিভারি (হাতে পেয়ে পেমেন্ট)</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg backdrop-blur-xs border border-white/5">
                <RotateCcw className="w-4 h-4 text-emerald-400" />
                <span>সহজ রিটার্ন ও এক্সচেঞ্জ</span>
              </div>
            </div>
          </div>
        </div>

        {/* Category Pills Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map(cat => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-extrabold transition whitespace-nowrap shrink-0 border ${
                  isSelected
                    ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                    : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-200 hover:border-stone-300'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Catalog Count & Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-teal-600" />
            <h3 className="font-extrabold text-sm sm:text-base text-stone-900">
              {selectedCategory} ({filteredProducts.length} টি পণ্য)
            </h3>
          </div>
          {searchQuery && (
            <span className="text-xs text-stone-500">
              সার্চ রেজাল্ট: <strong>"{searchQuery}"</strong>
            </span>
          )}
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-stone-200 space-y-3">
            <ShoppingBag className="w-12 h-12 text-stone-300 mx-auto" />
            <p className="text-stone-600 font-bold text-sm">কোনো পণ্য পাওয়া যায়নি।</p>
            <p className="text-xs text-stone-400">অনুগ্রহ করে অন্য কোনো ক্যাটাগরি অথবা ভিন্ন কিওয়ার্ড দিয়ে সার্চ করুন।</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('সকল পণ্য');
              }}
              className="px-4 py-2 bg-stone-900 text-white text-xs font-bold rounded-xl"
            >
              সব পণ্য দেখুন
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filteredProducts.map(prod => {
              const selection = getProductSelection(prod);
              const discountPct = prod.oldPrice > prod.price
                ? Math.round(((prod.oldPrice - prod.price) / prod.oldPrice) * 100)
                : 0;

              return (
                <div
                  key={prod.id}
                  className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group hover:border-stone-300"
                >
                  {/* Top Image & Badges */}
                  <div>
                    <div
                      className="relative aspect-square bg-stone-100 overflow-hidden cursor-pointer"
                      onClick={() => setQuickViewProduct(prod)}
                    >
                      <img
                        src={prod.image}
                        alt={prod.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        referrerPolicy="no-referrer"
                      />

                      {/* Top Badges */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1 items-start pointer-events-none">
                        {discountPct > 0 && (
                          <span
                            className="text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs"
                            style={{ backgroundColor: themeColor }}
                          >
                            -{discountPct}% ছাড়
                          </span>
                        )}
                        {prod.isFeatured && (
                          <span className="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-xs flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5" />
                            হট
                          </span>
                        )}
                      </div>

                      {/* Quick View Hover Button (desktop) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuickViewProduct(prod);
                        }}
                        className="absolute bottom-2 right-2 p-1.5 rounded-xl bg-white/90 hover:bg-white text-stone-700 shadow-sm transition backdrop-blur-xs hidden sm:flex items-center gap-1 text-[10px] font-bold"
                        title="পণ্যটি বিস্তারিত দেখুন"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>ভিউ</span>
                      </button>

                      {/* Category Badge */}
                      {prod.category && (
                        <div className="absolute bottom-2 left-2 bg-stone-900/80 text-stone-100 text-[9px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs pointer-events-none">
                          {prod.category}
                        </div>
                      )}
                    </div>

                    {/* Card Content */}
                    <div className="p-3 space-y-2">
                      <h4
                        onClick={() => setQuickViewProduct(prod)}
                        className="font-bold text-xs sm:text-sm text-stone-900 line-clamp-2 leading-snug group-hover:text-teal-700 transition cursor-pointer"
                        title={prod.name}
                      >
                        {prod.name}
                      </h4>

                      {/* Pricing */}
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm sm:text-base font-black text-rose-700">
                          ৳ {prod.price}
                        </span>
                        {prod.oldPrice > prod.price && (
                          <span className="text-[11px] text-stone-400 line-through">
                            ৳ {prod.oldPrice}
                          </span>
                        )}
                      </div>

                      {/* Dynamic Option Selectors (Clean compact rows configured by admin) */}
                      {getProductCustomFields(prod).map(field => {
                        const activeVal = selection.fieldSelections[field.id] || field.options[0];
                        const cleanLabel = field.label.replace(/:$/, '').trim();
                        return (
                          <div key={field.id} className="space-y-1 pt-0.5">
                            <div className="flex items-center justify-between text-[10px] text-stone-500">
                              <span className="font-semibold text-stone-400">{cleanLabel}:</span>
                              <span className="font-bold text-stone-700 font-mono">{activeVal}</span>
                            </div>
                            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
                              {field.options.slice(0, 4).map(opt => {
                                const isSelected = activeVal === opt;
                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSelectOption(prod.id, field.id, opt);
                                    }}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition shrink-0 ${
                                      isSelected
                                        ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
                                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                              {field.options.length > 4 && (
                                <button
                                  type="button"
                                  onClick={() => setQuickViewProduct(prod)}
                                  className="text-[9px] text-teal-700 font-bold px-1 bg-teal-50 rounded border border-teal-200 shrink-0"
                                >
                                  +{field.options.length - 4}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sleek Action Buttons Bar: Single-line & Zero text wrap */}
                  <div className="p-2.5 pt-0 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart(prod, false);
                      }}
                      className="w-9 h-9 shrink-0 flex items-center justify-center rounded-xl bg-stone-100 hover:bg-teal-50 hover:text-teal-700 text-stone-700 transition border border-stone-200 active:scale-95 shadow-2xs"
                      title="কার্টে যোগ করুন"
                    >
                      <ShoppingCart className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDirectOrder(prod);
                      }}
                      className="flex-1 h-9 flex items-center justify-center gap-1 px-2.5 rounded-xl text-white text-xs font-extrabold transition shadow-xs hover:opacity-95 active:scale-95 whitespace-nowrap"
                      style={{ backgroundColor: themeColor }}
                      title="সরাসরি ১-ক্লিকে অর্ডার করুন"
                    >
                      <Zap className="w-3.5 h-3.5 fill-current shrink-0" />
                      <span className="truncate">অর্ডার করুন</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Bottom Mobile Cart Bar */}
      {totalCartCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 sm:hidden z-30">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="w-full py-3 px-5 rounded-2xl text-white font-bold shadow-2xl flex items-center justify-between backdrop-blur-md"
            style={{ backgroundColor: themeColor }}
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              <span>কার্টে {totalCartCount} টি পণ্য</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm">৳ {cartSubtotal}</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* ==================== SHOPPING CART DRAWER ==================== */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsCartOpen(false)}
          />

          {/* Slide-over Drawer Panel */}
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl z-10 flex flex-col justify-between overflow-y-auto">
            {/* Drawer Header */}
            <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50 sticky top-0 z-20">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-teal-700" />
                <h3 className="font-bold text-stone-900 text-base">আপনার শপিং কার্ট</h3>
                <span className="px-2 py-0.5 bg-stone-200 text-stone-700 rounded-full text-xs font-bold">
                  {totalCartCount} টি
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-lg hover:bg-stone-200 text-stone-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Items Body */}
            <div className="flex-1 p-4 space-y-4">
              {cart.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <ShoppingCart className="w-16 h-16 text-stone-300 mx-auto" />
                  <p className="font-bold text-stone-700 text-sm">আপনার শপিং কার্ট খালি রয়েছে</p>
                  <p className="text-xs text-stone-400">শপ থেকে পছন্দের পণ্য নির্বাচন করে কার্টে যোগ করুন।</p>
                  <button
                    type="button"
                    onClick={() => setIsCartOpen(false)}
                    className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold"
                  >
                    শপিং শুরু করুন
                  </button>
                </div>
              ) : (
                <>
                  {/* Cart Items List */}
                  <div className="divide-y divide-stone-100 space-y-3">
                    {cart.map(item => (
                      <div key={item.id} className="pt-3 first:pt-0 flex gap-3 items-start">
                        <img
                          src={item.variant.image}
                          alt={item.variant.name}
                          className="w-16 h-16 rounded-xl object-cover border border-stone-200 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          <h4 className="font-bold text-xs text-stone-900 truncate">
                            {item.variant.name}
                          </h4>
                          <div className="flex flex-wrap gap-2 text-[11px] text-stone-500">
                            {item.customSelections && Object.keys(item.customSelections).length > 0 ? (
                              Object.entries(item.customSelections).map(([lbl, val]) => (
                                <span key={lbl}>
                                  {lbl}: <strong>{val}</strong>
                                </span>
                              ))
                            ) : (
                              <>
                                <span>সাইজ: <strong>{item.size}</strong></span>
                                {item.long && <span>লং: <strong>{item.long}"</strong></span>}
                              </>
                            )}
                          </div>
                          <div className="font-black text-rose-700 text-xs">
                            ৳ {item.variant.price * item.quantity}
                          </div>
                        </div>

                        {/* Quantity Stepper & Delete */}
                        <div className="flex flex-col items-end gap-2">
                          <button
                            type="button"
                            onClick={() => removeCartItem(item.id)}
                            className="text-stone-400 hover:text-rose-600 p-1"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden bg-stone-50">
                            <button
                              type="button"
                              onClick={() => updateCartItemQuantity(item.id, -1)}
                              className="px-2 py-1 hover:bg-stone-200 text-stone-700"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2 text-xs font-bold text-stone-900">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateCartItemQuantity(item.id, 1)}
                              className="px-2 py-1 hover:bg-stone-200 text-stone-700"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Delivery Location Radios */}
                  <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-2.5">
                    <span className="text-xs font-bold text-stone-800 block">
                      ডেলিভারি এরিয়া সিলেক্ট করুন:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <label
                        className={`p-2.5 rounded-xl border flex flex-col cursor-pointer transition text-xs ${
                          deliveryLocation === 'inside_dhaka'
                            ? 'bg-teal-50 border-teal-500 text-teal-950 font-bold shadow-2xs'
                            : 'bg-white border-stone-200 text-stone-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>ঢাকার ভেতরে</span>
                          <input
                            type="radio"
                            name="cartDelivery"
                            checked={deliveryLocation === 'inside_dhaka'}
                            onChange={() => setDeliveryLocation('inside_dhaka')}
                            className="text-teal-600"
                          />
                        </div>
                        <span className="text-[11px] text-stone-500 mt-1 font-semibold">
                          {page.deliveryCharges?.insideDhaka ?? 60}৳
                        </span>
                      </label>

                      <label
                        className={`p-2.5 rounded-xl border flex flex-col cursor-pointer transition text-xs ${
                          deliveryLocation === 'outside_dhaka'
                            ? 'bg-teal-50 border-teal-500 text-teal-950 font-bold shadow-2xs'
                            : 'bg-white border-stone-200 text-stone-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>ঢাকার বাইরে</span>
                          <input
                            type="radio"
                            name="cartDelivery"
                            checked={deliveryLocation === 'outside_dhaka'}
                            onChange={() => setDeliveryLocation('outside_dhaka')}
                            className="text-teal-600"
                          />
                        </div>
                        <span className="text-[11px] text-stone-500 mt-1 font-semibold">
                          {page.deliveryCharges?.outsideDhaka ?? 120}৳
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Cash on Delivery Form */}
                  <form onSubmit={handleCartCheckoutSubmit} className="space-y-3 pt-2">
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-stone-700">
                      ডেলিভারি ও ক্যাশ অন ডেলিভারি ঠিকানা
                    </h4>

                    {checkoutError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{checkoutError}</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">
                        আপনার পুরো নাম *
                      </label>
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        placeholder="যেমন: তানভীর হাসান"
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">
                        মোবাইল নাম্বার *
                      </label>
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={e => setCustomerPhone(e.target.value)}
                        placeholder="১১ ডিজিটের সচল নাম্বার দিন"
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">
                        সম্পূর্ণ ডেলিভারি ঠিকানা *
                      </label>
                      <textarea
                        required
                        rows={2}
                        value={customerAddress}
                        onChange={e => setCustomerAddress(e.target.value)}
                        placeholder="আপনার জেলা, উপজেলা/ থানা, গ্রাম/ বাসা"
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-medium resize-none"
                      />
                    </div>

                    {/* Pricing Summary */}
                    <div className="bg-stone-100 p-3.5 rounded-xl text-xs space-y-1.5 border border-stone-200">
                      <div className="flex justify-between text-stone-600">
                        <span>পণ্যের মোট মূল্য ({totalCartCount} টি):</span>
                        <span className="font-mono font-bold text-stone-900">৳ {cartSubtotal}</span>
                      </div>
                      <div className="flex justify-between text-stone-600">
                        <span>ডেলিভারি চার্জ:</span>
                        <span className="font-mono font-bold text-stone-900">
                          {deliveryFee === 0 ? 'ফ্রি' : `৳ ${deliveryFee}`}
                        </span>
                      </div>
                      <div className="border-t border-stone-200 pt-1.5 flex justify-between font-black text-sm text-stone-900">
                        <span>সর্বমোট বিল:</span>
                        <span className="font-mono text-rose-700">৳ {cartGrandTotal}</span>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 rounded-xl text-white font-extrabold text-sm shadow-md transition hover:opacity-95 disabled:opacity-50 flex items-center justify-center gap-2"
                      style={{ backgroundColor: themeColor }}
                    >
                      {isSubmitting ? (
                        <span>অর্ডার সম্পন্ন হচ্ছে...</span>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>ক্যাশ অন ডেলিভারিতে অর্ডার কনফার্ম করুন (৳{cartGrandTotal})</span>
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== SINGLE PRODUCT QUICK ORDER MODAL ==================== */}
      {quickOrderProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setQuickOrderProduct(null)}
          />

          <div className="relative bg-white rounded-3xl w-full max-w-lg shadow-2xl z-10 overflow-hidden border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50 sticky top-0 z-20">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-stone-900 text-sm sm:text-base">
                  দ্রুত অর্ডার করুন (১-ক্লিক ক্যাশ অন ডেলিভারি)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setQuickOrderProduct(null)}
                className="p-1 rounded-lg hover:bg-stone-200 text-stone-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickOrderSubmit} className="p-5 space-y-4">
              {/* Product Preview & Variant Selectors */}
              <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 space-y-3">
                <div className="flex gap-3 items-center">
                  <img
                    src={quickOrderProduct.product.image}
                    alt={quickOrderProduct.product.name}
                    className="w-16 h-16 rounded-xl object-cover border border-stone-200 shrink-0 shadow-2xs"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-xs sm:text-sm text-stone-900 leading-snug">
                      {quickOrderProduct.product.name}
                    </h4>
                    <div className="font-black text-rose-700 text-sm mt-0.5">
                      ৳ {quickOrderProduct.product.price}
                    </div>
                  </div>
                </div>

                {/* Dynamic Fields Choice */}
                {getProductCustomFields(quickOrderProduct.product).map(field => {
                  const cleanLabel = field.label.replace(/:$/, '').trim();
                  const selectedVal = quickOrderProduct.fieldSelections[field.id] || field.options[0];
                  return (
                    <div key={field.id} className="border-t border-stone-200/80 pt-2.5">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-bold text-stone-700">{cleanLabel} পছন্দ করুন:</span>
                        <span className="font-mono font-bold text-stone-900">{selectedVal}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {field.options.map(opt => {
                          const isSelected = selectedVal === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                setQuickOrderProduct(prev => {
                                  if (!prev) return null;
                                  const customFields = getProductCustomFields(prev.product);
                                  const updatedFields = { ...prev.fieldSelections, [field.id]: opt };
                                  const updatedCustom = { ...prev.customSelections, [cleanLabel]: opt };
                                  return {
                                    ...prev,
                                    size: field.id === customFields[0]?.id ? opt : prev.size,
                                    long: field.id === customFields[1]?.id ? opt : prev.long,
                                    fieldSelections: updatedFields,
                                    customSelections: updatedCustom
                                  };
                                });
                              }}
                              className={`px-3 py-1 rounded-lg text-xs font-bold border transition ${
                                isSelected
                                  ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
                                  : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {checkoutError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{checkoutError}</span>
                </div>
              )}

              {/* Delivery Choice */}
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  ডেলিভারি লোকেশন:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryLocation('inside_dhaka')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-between ${
                      deliveryLocation === 'inside_dhaka'
                        ? 'bg-teal-50 border-teal-600 text-teal-900 shadow-2xs'
                        : 'bg-white border-stone-200 text-stone-700'
                    }`}
                  >
                    <span>ঢাকার ভেতরে</span>
                    <span>{page.deliveryCharges?.insideDhaka ?? 60}৳</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryLocation('outside_dhaka')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-between ${
                      deliveryLocation === 'outside_dhaka'
                        ? 'bg-teal-50 border-teal-600 text-teal-900 shadow-2xs'
                        : 'bg-white border-stone-200 text-stone-700'
                    }`}
                  >
                    <span>ঢাকার বাইরে</span>
                    <span>{page.deliveryCharges?.outsideDhaka ?? 120}৳</span>
                  </button>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    আপনার নাম *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="আপনার পুরো নাম দিন"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    মোবাইল নাম্বার *
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    placeholder="১১ ডিজিটের মোবাইল নাম্বার"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    সম্পূর্ণ ডেলিভারি ঠিকানা *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={customerAddress}
                    onChange={e => setCustomerAddress(e.target.value)}
                    placeholder="আপনার জেলা, উপজেলা/ থানা, গ্রাম/ বাসা"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-none"
                  />
                </div>
              </div>

              {/* Total Box */}
              <div className="bg-stone-100 p-3 rounded-xl text-xs flex items-center justify-between font-bold">
                <span>সর্বমোট পরিশোধযোগ্য বিল:</span>
                <span className="text-base text-rose-700 font-mono">৳ {quickGrandTotal}</span>
              </div>

              {/* Submit */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    handleAddToCart(quickOrderProduct.product, true);
                    setQuickOrderProduct(null);
                  }}
                  className="py-3 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs border border-stone-300 transition"
                >
                  কার্টে যোগ করে আরো কিনুন
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-3 px-3 rounded-xl text-white font-extrabold text-xs shadow transition hover:opacity-95 disabled:opacity-50"
                  style={{ backgroundColor: themeColor }}
                >
                  {isSubmitting ? 'অর্ডার হচ্ছে...' : 'অর্ডার কনফার্ম করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== PRODUCT QUICK VIEW MODAL ==================== */}
      {quickViewProduct && (() => {
        const selection = getProductSelection(quickViewProduct);
        const discountPct = quickViewProduct.oldPrice > quickViewProduct.price
          ? Math.round(((quickViewProduct.oldPrice - quickViewProduct.price) / quickViewProduct.oldPrice) * 100)
          : 0;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setQuickViewProduct(null)}
            />

            <div className="relative bg-white rounded-3xl w-full max-w-2xl shadow-2xl z-10 overflow-hidden border border-stone-200 max-h-[92vh] overflow-y-auto">
              {/* Header Close */}
              <button
                type="button"
                onClick={() => setQuickViewProduct(null)}
                className="absolute top-3 right-3 z-20 p-2 rounded-full bg-stone-900/60 hover:bg-stone-900 text-white transition backdrop-blur-xs shadow-md"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2">
                {/* Left: Product Image */}
                <div className="relative aspect-square sm:aspect-auto bg-stone-100 min-h-[260px] sm:min-h-[380px]">
                  <img
                    src={quickViewProduct.image}
                    alt={quickViewProduct.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {discountPct > 0 && (
                    <div
                      className="absolute top-3 left-3 text-white text-xs font-black px-2.5 py-1 rounded-full shadow"
                      style={{ backgroundColor: themeColor }}
                    >
                      -{discountPct}% অফার
                    </div>
                  )}
                  {quickViewProduct.category && (
                    <div className="absolute bottom-3 left-3 bg-stone-900/80 text-stone-100 text-xs font-bold px-2.5 py-1 rounded-lg backdrop-blur-xs">
                      {quickViewProduct.category}
                    </div>
                  )}
                </div>

                {/* Right: Product Details & Controls */}
                <div className="p-5 sm:p-6 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-base sm:text-lg font-extrabold text-stone-900 leading-snug">
                        {quickViewProduct.name}
                      </h3>
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-xl sm:text-2xl font-black text-rose-700">
                          ৳ {quickViewProduct.price}
                        </span>
                        {quickViewProduct.oldPrice > quickViewProduct.price && (
                          <span className="text-xs sm:text-sm text-stone-400 line-through">
                            ৳ {quickViewProduct.oldPrice}
                          </span>
                        )}
                        {discountPct > 0 && (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            ৳ {quickViewProduct.oldPrice - quickViewProduct.price} সাশ্রয়
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dynamic Option Fields Selector */}
                    {getProductCustomFields(quickViewProduct).map(field => {
                      const cleanLabel = field.label.replace(/:$/, '').trim();
                      const activeVal = selection.fieldSelections[field.id] || field.options[0];
                      return (
                        <div key={field.id} className="space-y-1.5 pt-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-stone-700">{cleanLabel} নির্বাচন করুন:</span>
                            <span className="font-mono font-bold text-stone-900">{activeVal}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {field.options.map(opt => {
                              const isSelected = activeVal === opt;
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => handleSelectOption(quickViewProduct.id, field.id, opt)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                                    isSelected
                                      ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                                  }`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {/* Store Guarantees */}
                    <div className="bg-stone-50 rounded-2xl p-3 border border-stone-200 space-y-2 text-xs text-stone-600">
                      <div className="flex items-center gap-2">
                        <Truck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span>সারাদেশে ক্যাশ অন ডেলিভারি সুবিধা</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span>প্রোডাক্ট দেখে পছন্দ হলে পেমেন্ট করুন</span>
                      </div>
                    </div>
                  </div>

                  {/* Dual Action Buttons */}
                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleDirectOrder(quickViewProduct);
                        setQuickViewProduct(null);
                      }}
                      className="w-full py-3 px-4 rounded-xl text-white font-extrabold text-xs sm:text-sm shadow-md transition hover:opacity-95 flex items-center justify-center gap-2"
                      style={{ backgroundColor: themeColor }}
                    >
                      <Zap className="w-4 h-4 fill-current" />
                      <span>সরাসরি অর্ডার করুন (ক্যাশ অন ডেলিভারি)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleAddToCart(quickViewProduct, false);
                        setQuickViewProduct(null);
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs border border-stone-200 transition flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="w-4 h-4 text-stone-600" />
                      <span>কার্টে যোগ করুন</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ==================== ORDER SUCCESS MODAL ==================== */}
      {orderSuccessData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs" />
          <div className="relative bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl z-10 text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div>
              <h3 className="text-xl font-black text-stone-900">
                ধন্যবাদ! আপনার অর্ডার সফল হয়েছে 🎉
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                আপনার অর্ডার আইডি:{' '}
                <span className="font-mono font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded">
                  #{orderSuccessData.id}
                </span>
              </p>
            </div>

            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-stone-500">গ্রাহকের নাম:</span>
                <strong className="text-stone-900">{orderSuccessData.customerName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">মোবাইল নাম্বার:</span>
                <strong className="text-stone-900">{orderSuccessData.customerPhone}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">মোট আইটেম:</span>
                <strong className="text-stone-900">{orderSuccessData.items.length} টি</strong>
              </div>
              <div className="border-t border-stone-200 pt-2 flex justify-between font-bold text-sm">
                <span>সর্বমোট মূল্য:</span>
                <span className="text-rose-700 font-mono">৳ {orderSuccessData.total}</span>
              </div>
            </div>

            <p className="text-xs text-stone-600 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
              📞 শীঘ্রই আমাদের কাস্টমার কেয়ার থেকে কল করে আপনার অর্ডারটি কনফার্ম করা হবে।
            </p>

            <button
              type="button"
              onClick={() => setOrderSuccessData(null)}
              className="w-full py-3 rounded-xl text-white font-bold text-xs shadow hover:opacity-95 transition"
              style={{ backgroundColor: themeColor }}
            >
              আরও কেনাকাটা করুন
            </button>
          </div>
        </div>
      )}

      {/* E-Commerce Footer */}
      <footer className="text-center text-xs text-stone-500 py-6 border-t border-stone-200 mt-auto bg-white/80 w-full">
        <p>© ২০২৬ {page.brandName || 'AmarChoice'} – সর্বস্বত্ব সংরক্ষিত</p>
        <p className="mt-1 text-[11px] text-stone-400">নিরাপদ ক্যাশ অন ডেলিভারি সুবিধা ও ১০০% কোয়ালিটি গ্যারান্টি</p>
      </footer>
    </div>
  );
}
