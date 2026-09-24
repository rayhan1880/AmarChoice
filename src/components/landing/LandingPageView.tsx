import { useState, useEffect, useRef, useCallback, MouseEvent, FormEvent, TouchEvent } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { LandingPage, OrderItem, VariantOptionField, ProductVariant } from '../../types.ts';
import { INITIAL_LANDING_PAGES } from '../../data/initialData.ts';
import { 
  Check, 
  ShoppingCart, 
  Clock, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause,
  PackageCheck
} from 'lucide-react';
import EcommerceStoreView from './EcommerceStoreView.tsx';
import CustomerOrderHistoryModal from './CustomerOrderHistoryModal.tsx';

function WhatsAppIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
    </svg>
  );
}

interface SelectedCardState {
  selected: boolean;
  size: string | null;
  long: string | null;
  customSelections?: Record<string, string>; // fieldId -> selected option value
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
      label: 'বডি সাইজ (Body Size):',
      options: [...prod.sizes]
    });
  }
  if (prod.hasLong && prod.longSizes && prod.longSizes.length > 0) {
    fields.push({
      id: 'field_long_' + prod.id,
      label: 'লং / ঝুল সাইজ (Long Size):',
      options: [...prod.longSizes]
    });
  }
  return fields;
}

export default function LandingPageView() {
  const { activeLandingPage, createOrder, saveIncompleteOrderLead, trackPixelEvent, setAdminTab } = useApp();

  const page: LandingPage = activeLandingPage || INITIAL_LANDING_PAGES[0];

  // Slide Images list
  const slideImages: string[] = page
    ? (page.galleryImages && page.galleryImages.length > 0
        ? page.galleryImages
        : [page.mainImage].filter(Boolean))
    : [];

  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [isAutoPlay, setIsAutoPlay] = useState<boolean>(true);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  // Selected products state map: { [variantId]: { selected: boolean, size: string | null, quantity: number } }
  const [selectedVariants, setSelectedVariants] = useState<Record<string, SelectedCardState>>({});

  // Delivery choice: 'inside_dhaka' | 'outside_dhaka'
  const [deliveryLocation, setDeliveryLocation] = useState<'inside_dhaka' | 'outside_dhaka'>('inside_dhaka');

  // Form inputs
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [warnMsg, setWarnMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<{ id: string; total: number; phone?: string } | null>(null);
  const [isOrderHistoryOpen, setIsOrderHistoryOpen] = useState(false);
  const [orderHistoryPhone, setOrderHistoryPhone] = useState('');

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 5,
    minutes: 42,
    seconds: 19
  });

  const productsSectionRef = useRef<HTMLDivElement>(null);
  const orderFormRef = useRef<HTMLDivElement>(null);
  const thumbnailCarouselRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Automatically scroll active thumbnail into view when current slide changes and carousel is active (> 5 images)
  useEffect(() => {
    if (slideImages.length > 5 && thumbRefs.current[currentSlide]) {
      thumbRefs.current[currentSlide]?.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest'
      });
    }
  }, [currentSlide, slideImages.length]);

  const scrollThumbnails = (direction: 'left' | 'right') => {
    if (!thumbnailCarouselRef.current) return;
    const scrollAmount = Math.max(160, thumbnailCarouselRef.current.clientWidth * 0.6);
    thumbnailCarouselRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  // Initialize slide and variant selection whenever active landing page changes
  useEffect(() => {
    if (!page) return;
    setCurrentSlide(0);

    // Initialize variant selection state - no product pre-selected by default
    const initialMap: Record<string, SelectedCardState> = {};
    page.products.forEach((prod) => {
      const fields = getProductCustomFields(prod);
      const initialSelections: Record<string, string> = {};
      fields.forEach(f => {
        if (f.options && f.options.length > 0) {
          initialSelections[f.id] = f.options[0];
        }
      });

      initialMap[prod.id] = {
        selected: false, // Customer selects the product themselves
        size: fields[0]?.options[0] || (prod.sizes && prod.sizes.length > 0 ? prod.sizes[0] : null),
        long: fields[1]?.options[0] || (prod.hasLong && prod.longSizes && prod.longSizes.length > 0 ? prod.longSizes[0] : null),
        customSelections: initialSelections,
        quantity: 1
      };
    });
    setSelectedVariants(initialMap);

    // Track ViewContent for this landing page
    trackPixelEvent('ViewContent', {
      pageId: page.id,
      title: page.title,
      price: page.products[0]?.price || 0
    });
  }, [page, trackPixelEvent]);

  // Auto-play slideshow loop (switches slide smoothly every 3.5 seconds)
  useEffect(() => {
    if (!isAutoPlay || isHovered || slideImages.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slideImages.length);
    }, 3500);

    return () => clearInterval(interval);
  }, [isAutoPlay, isHovered, slideImages.length]);

  const handleNextSlide = () => {
    if (slideImages.length <= 1) return;
    setCurrentSlide(prev => (prev + 1) % slideImages.length);
  };

  const handlePrevSlide = () => {
    if (slideImages.length <= 1) return;
    setCurrentSlide(prev => (prev - 1 + slideImages.length) % slideImages.length);
  };

  const goToSlide = (index: number) => {
    if (index >= 0 && index < slideImages.length) {
      setCurrentSlide(index);
    }
  };

  // Touch swipe support for mobile
  const handleTouchStart = (e: TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStartX === null || touchEndX === null) return;
    const distance = touchStartX - touchEndX;
    const minSwipeDistance = 40;
    if (distance > minSwipeDistance) {
      handleNextSlide();
    } else if (distance < -minSwipeDistance) {
      handlePrevSlide();
    }
    setTouchStartX(null);
    setTouchEndX(null);
  };

  // Countdown countdown loop
  useEffect(() => {
    if (!page?.countdown.enabled) return;
    let totalSeconds = (page.countdown.hours || 6) * 3600;

    const interval = setInterval(() => {
      if (totalSeconds <= 0) {
        totalSeconds = (page.countdown.hours || 6) * 3600;
      } else {
        totalSeconds -= 1;
      }
      setTimeLeft({
        hours: Math.floor(totalSeconds / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
        seconds: totalSeconds % 60
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [page.countdown.enabled, page.countdown.hours]);

  // Toggle selection of variant card
  const toggleVariantSelection = (id: string) => {
    const selectedProd = page?.products.find(p => p.id === id);
    if (selectedProd?.image) {
      const matchIdx = slideImages.findIndex(img => img === selectedProd.image);
      if (matchIdx !== -1) {
        goToSlide(matchIdx);
      }
    }

    setSelectedVariants(prev => {
      const prodMatch = page.products.find(p => p.id === id);
      const fields = prodMatch ? getProductCustomFields(prodMatch) : [];
      const defaultSelections: Record<string, string> = {};
      fields.forEach(f => {
        if (f.options && f.options.length > 0) {
          defaultSelections[f.id] = f.options[0];
        }
      });

      const current = prev[id] || {
        selected: false,
        size: fields[0]?.options[0] || (prodMatch?.sizes && prodMatch.sizes.length > 0 ? prodMatch.sizes[0] : null),
        long: fields[1]?.options[0] || (prodMatch?.hasLong && prodMatch?.longSizes && prodMatch.longSizes[0]) || null,
        customSelections: defaultSelections,
        quantity: 1
      };
      const updated = {
        ...prev,
        [id]: {
          ...current,
          customSelections: current.customSelections || defaultSelections,
          selected: !current.selected
        }
      };
      return updated;
    });
    setWarnMsg(null);
  };

  // Handle dynamic custom option selection
  const handleCustomOptionSelect = (e: MouseEvent, variantId: string, fieldId: string, optionVal: string) => {
    e.stopPropagation();
    setSelectedVariants(prev => {
      const current = prev[variantId] || { selected: true, size: null, long: null, quantity: 1, customSelections: {} };
      const updatedCustom = { ...(current.customSelections || {}), [fieldId]: optionVal };

      const prod = page?.products.find(p => p.id === variantId);
      const fields = prod ? getProductCustomFields(prod) : [];
      const sizeVal = fields[0] ? updatedCustom[fields[0].id] : current.size;
      const longVal = fields[1] ? updatedCustom[fields[1].id] : current.long;

      return {
        ...prev,
        [variantId]: {
          ...current,
          selected: true,
          size: sizeVal || current.size,
          long: longVal || current.long,
          customSelections: updatedCustom
        }
      };
    });
    setWarnMsg(null);
  };

  // Change selected size for variant (legacy backward compatibility)
  const handleSizeSelect = (e: MouseEvent, variantId: string, size: string) => {
    e.stopPropagation();
    setSelectedVariants(prev => {
      const current = prev[variantId] || { quantity: 1, selected: true, size: null, long: null, customSelections: {} };
      const prod = page?.products.find(p => p.id === variantId);
      const fields = prod ? getProductCustomFields(prod) : [];
      const updatedCustom = { ...(current.customSelections || {}) };
      if (fields[0]) {
        updatedCustom[fields[0].id] = size;
      }
      return {
        ...prev,
        [variantId]: {
          ...current,
          selected: true,
          size,
          customSelections: updatedCustom
        }
      };
    });
    setWarnMsg(null);
  };

  // Change selected long for variant (legacy backward compatibility)
  const handleLongSelect = (e: MouseEvent, variantId: string, longVal: string) => {
    e.stopPropagation();
    setSelectedVariants(prev => {
      const current = prev[variantId] || { quantity: 1, selected: true, size: null, long: null, customSelections: {} };
      const prod = page?.products.find(p => p.id === variantId);
      const fields = prod ? getProductCustomFields(prod) : [];
      const updatedCustom = { ...(current.customSelections || {}) };
      if (fields[1]) {
        updatedCustom[fields[1].id] = longVal;
      }
      return {
        ...prev,
        [variantId]: {
          ...current,
          selected: true,
          long: longVal,
          customSelections: updatedCustom
        }
      };
    });
    setWarnMsg(null);
  };

  // Change quantity (+ / -)
  const handleQtyChange = (e: MouseEvent, variantId: string, delta: number) => {
    e.stopPropagation();
    setSelectedVariants(prev => {
      const current = prev[variantId] || { selected: true, size: null, long: null, quantity: 1 };
      const newQty = Math.max(1, current.quantity + delta);
      return {
        ...prev,
        [variantId]: {
          ...current,
          selected: true,
          quantity: newQty
        }
      };
    });
  };

  // Calculate Order Summary
  const isFreeDelivery = page.deliveryCharges?.isFreeDelivery;
  const deliveryCharge = isFreeDelivery
    ? 0
    : deliveryLocation === 'inside_dhaka'
    ? page.deliveryCharges?.insideDhaka ?? 60
    : page.deliveryCharges?.outsideDhaka ?? 120;

  const selectedItemsList: OrderItem[] = [];
  let subtotal = 0;

  page.products.forEach(prod => {
    const sel = selectedVariants[prod.id];
    if (sel && sel.selected) {
      const itemSub = prod.price * sel.quantity;
      subtotal += itemSub;

      const fields = getProductCustomFields(prod);
      const customSelectionsLabelMap: Record<string, string> = {};
      fields.forEach(f => {
        const val = sel.customSelections?.[f.id] || f.options[0];
        if (val) {
          const cleanLabel = f.label.replace(/:$/, '').trim();
          customSelectionsLabelMap[cleanLabel] = val;
        }
      });

      selectedItemsList.push({
        variantId: prod.id,
        variantName: prod.name,
        size: sel.size || (fields[0]?.options?.[0] ?? 'Standard'),
        long: fields[1] ? (sel.long || fields[1].options?.[0]) : undefined,
        customSelections: customSelectionsLabelMap,
        quantity: sel.quantity,
        unitPrice: prod.price,
        subtotal: itemSub,
        image: prod.image
      });
    }
  });

  const grandTotal = subtotal + (subtotal > 0 ? deliveryCharge : 0);

  // Stable ID for current checkout session lead
  const leadSessionIdRef = useRef<string>(`inc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`);

  // Fallback product items if customer hasn't explicitly checked variant card
  const fallbackProduct = page.products && page.products.length > 0 ? page.products[0] : null;
  const effectiveItemsList: OrderItem[] = selectedItemsList.length > 0
    ? selectedItemsList
    : (fallbackProduct ? [{
        variantId: fallbackProduct.id,
        variantName: fallbackProduct.name,
        size: 'Standard',
        quantity: 1,
        unitPrice: fallbackProduct.price,
        subtotal: fallbackProduct.price,
        image: fallbackProduct.image
      }] : []);

  const effectiveSubtotal = subtotal > 0 ? subtotal : (fallbackProduct?.price || 0);
  const effectiveGrandTotal = effectiveSubtotal + (effectiveSubtotal > 0 ? deliveryCharge : 0);

  // Auto-capture Abandoned / Incomplete checkout leads
  const captureIncompleteLead = useCallback((customStep?: string, customNote?: string) => {
    if (orderSuccess || !page) return;
    const bnToEn: Record<string, string> = { '০':'0','১':'1','২':'2','৩':'3','৪':'4','৫':'5','৬':'6','৭':'7','৮':'8','৯':'9' };
    const phoneClean = custPhone.replace(/[০-৯]/g, d => bnToEn[d] || d).replace(/\D/g, '');
    const hasPhone = phoneClean.length >= 6 || custPhone.trim().length >= 6;
    const hasNameOrAddr = (custName.trim().length > 1 && custName.trim() !== 'অজানা ক্রেতা') || custAddress.trim().length > 3;

    if (!hasPhone && !hasNameOrAddr) return;

    saveIncompleteOrderLead({
      id: leadSessionIdRef.current,
      landingPageId: page.id,
      landingPageTitle: page.title,
      landingPageSlug: page.slug,
      customerName: custName.trim() || 'অজানা ক্রেতা',
      customerPhone: custPhone.trim(),
      customerAddress: custAddress.trim(),
      items: effectiveItemsList,
      deliveryLocation,
      subtotal: effectiveSubtotal,
      deliveryCharge,
      grandTotal: effectiveGrandTotal,
      step: (customStep as any) || (custAddress.trim() ? 'address_entered' : (hasPhone ? 'phone_entered' : 'details_entered')),
      notes: customNote || 'চেকআউট ফর্ম পূরণ করেছেন কিন্তু কনফার্ম করেননি'
    });
  }, [orderSuccess, page, custPhone, custName, custAddress, effectiveItemsList, deliveryLocation, effectiveSubtotal, deliveryCharge, effectiveGrandTotal, saveIncompleteOrderLead]);

  useEffect(() => {
    if (orderSuccess || !page) return;
    const bnToEn: Record<string, string> = { '০':'0','১':'1','২':'2','৩':'3','৪':'4','৫':'5','৬':'6','৭':'7','৮':'8','৯':'9' };
    const phoneClean = custPhone.replace(/[০-৯]/g, d => bnToEn[d] || d).replace(/\D/g, '');
    const hasPhone = phoneClean.length >= 6 || custPhone.trim().length >= 6;
    const hasNameOrAddr = (custName.trim().length > 1 && custName.trim() !== 'অজানা ক্রেতা') || custAddress.trim().length > 3;

    if (!hasPhone && !hasNameOrAddr) return;

    // Trigger save immediately if full 11 digits phone is entered, else debounce 500ms
    const delay = phoneClean.length >= 11 ? 150 : 500;
    const timer = setTimeout(() => {
      captureIncompleteLead();
    }, delay);

    const handleBeforeUnload = () => {
      captureIncompleteLead('abandoned', 'পেজ ত্যাগ করার সময় স্বয়ংক্রিয়ভাবে সংগৃহীত লিড');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, [custPhone, custName, custAddress, captureIncompleteLead, orderSuccess, page]);

  // Scroll to Order Form
  const scrollToOrderForm = () => {
    orderFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    trackPixelEvent('InitiateCheckout', { pageTitle: page.title, subtotal });
  };

  const scrollToProducts = () => {
    productsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Submit Order
  const handleSubmitOrder = async (e: FormEvent) => {
    e.preventDefault();
    if (!custName.trim() || !custPhone.trim() || !custAddress.trim()) {
      captureIncompleteLead('details_entered', 'অর্ডার ফর্ম অসম্পূর্ণ রেখে সাবমিট করার চেষ্টা করেছিলেন');
      setWarnMsg('⚠️ অনুগ্রহ করে আপনার নাম, মোবাইল নাম্বার এবং সম্পূর্ণ ঠিকানা প্রদান করুন।');
      return;
    }

    if (selectedItemsList.length === 0) {
      captureIncompleteLead('details_entered', 'পণ্য নির্বাচন ছাড়া ফর্ম পূরণ করেছিলেন');
      setWarnMsg('⚠️ অনুগ্রহ করে তালিকা থেকে অন্তত একটি পছন্দের পণ্য সিলেক্ট করুন।');
      scrollToProducts();
      return;
    }

    // Verify each dynamic option field of selected items
    for (const item of selectedItemsList) {
      const prod = page.products.find(p => p.id === item.variantId);
      if (prod) {
        const fields = getProductCustomFields(prod);
        for (const field of fields) {
          if (field.options && field.options.length > 0) {
            const cleanLabel = field.label.replace(/:$/, '').trim();
            const chosenVal = item.customSelections?.[cleanLabel];
            if (!chosenVal) {
              setWarnMsg(`⚠️ অনুগ্রহ করে "${prod.name}" এর জন্য ${cleanLabel} নির্বাচন করুন।`);
              scrollToProducts();
              return;
            }
          }
        }
      }
    }

    setWarnMsg(null);
    setIsSubmitting(true);

    try {
      const newOrder = await createOrder({
        landingPageId: page.id,
        landingPageTitle: page.title,
        landingPageSlug: page.slug,
        customerName: custName.trim(),
        customerPhone: custPhone.trim(),
        customerAddress: custAddress.trim(),
        items: selectedItemsList,
        deliveryLocation,
        deliveryCharge,
        subtotal,
        grandTotal,
        notes: ''
      });

      const phoneUsed = custPhone;
      setOrderSuccess({ id: newOrder.id, total: grandTotal, phone: phoneUsed });
      setOrderHistoryPhone(phoneUsed);
      // Reset form
      setCustName('');
      setCustPhone('');
      setCustAddress('');
    } catch (err: unknown) {
      console.error('Order submission error:', err);
      const errorMsg = err instanceof Error ? err.message : 'অর্ডার সম্পন্ন করতে সাময়িক সমস্যা হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।';
      setWarnMsg(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bengali numerals helper
  const toBanglaDigits = (num: number | string): string => {
    const banglaDigits: Record<string, string> = {
      '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
      '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
    };
    return String(num).replace(/[0-9]/g, w => banglaDigits[w] || w);
  };

  // Theme primary color fallback
  const themeColor = page.themeColor || '#c0392b';

  // WhatsApp link generation
  const getWhatsAppUrl = (phone: string, productTitle: string) => {
    const digits = (phone || '01606318193').replace(/\D/g, '');
    let fullNumber = digits;
    if (digits.startsWith('01') && digits.length === 11) {
      fullNumber = '88' + digits;
    } else if (digits.startsWith('1') && digits.length === 10) {
      fullNumber = '880' + digits;
    } else if (!digits.startsWith('88') && digits.length <= 11) {
      fullNumber = '88' + digits;
    }
    const message = `আসসালামু আলাইকুম, আমি "${productTitle || 'পণ্য'}" সম্পর্কে জানতে এবং অর্ডার করতে চাই।`;
    return `https://wa.me/${fullNumber}?text=${encodeURIComponent(message)}`;
  };

  const whatsAppUrl = getWhatsAppUrl(page.callNumber || '01606318193', page.title);

  // If this is an E-Commerce multi-product shopping store, render the E-commerce view
  if (page.pageType === 'ecommerce') {
    return <EcommerceStoreView page={page} />;
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#f8f4f0] text-[#1a1a2e] font-sans antialiased relative">
      {/* ===== TOP BANNER ===== */}
      {page.showTopBanner && (
        <div
          className="text-white text-center py-2.5 px-4 text-sm font-medium tracking-wide shadow-sm"
          style={{ backgroundColor: themeColor }}
        >
          {page.topBannerText || '🎉 স্পেশাল অফার – সীমিত সময়ের জন্য ৫০% ছাড়! দ্রুত অর্ডার করুন!'}
        </div>
      )}

      {/* ===== HEADER (Clean, no admin bar, sticky top-0) ===== */}
      <header className="bg-white border-b border-[#e8e0d8] py-3.5 px-4 sticky top-0 z-40 shadow-xs text-center">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="text-left">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: themeColor, fontFamily: 'serif' }}>
              {page.brandName || 'AmarChoice'}
            </h1>
            <p className="text-xs text-stone-500 font-medium">
              {page.brandTagline || 'প্রিমিয়াম বাংলাদেশি শপ'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Direct WhatsApp button in header */}
            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackPixelEvent('Contact', { channel: 'header_whatsapp', page: page.title })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 border border-[#25D366]/30 text-xs font-bold transition shadow-2xs"
              title="হোয়াটসঅ্যাপে মেসেজ দিন"
            >
              <WhatsAppIcon className="w-3.5 h-3.5 fill-[#25D366]" />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={scrollToOrderForm}
              className="px-4 py-1.5 rounded-full text-white text-xs font-bold shadow hover:opacity-95 transition"
              style={{ backgroundColor: themeColor }}
            >
              অর্ডার করুন
            </button>
          </div>
        </div>
      </header>

      {/* ===== MAIN CONTENT CONTAINER ===== */}
      <main className="max-w-4xl mx-auto px-4 mt-5 w-full flex-1 mb-8">
        {/* ===== HERO / PRODUCT GALLERY & INFO SECTION ===== */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#e8e0d8] mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Gallery Column (Interactive Image Slider) */}
            <div
              className="flex flex-col bg-[#f0ebe4] select-none"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              {/* Main Image Slider Viewport */}
              <div
                className="relative aspect-square sm:aspect-auto sm:min-h-[420px] overflow-hidden bg-stone-100 group touch-pan-y"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* Floating Badges */}
                <div
                  className="absolute top-4 left-4 text-white text-xs font-bold px-3.5 py-1.5 rounded-full shadow-md z-20 pointer-events-none"
                  style={{ backgroundColor: themeColor }}
                >
                  ৫০% ছাড়!
                </div>
                <div className="absolute top-4 right-4 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow z-20 pointer-events-none">
                  নতুন
                </div>

                {/* Sliding Horizontal Strip */}
                <div
                  className="flex w-full h-full transition-transform duration-500 ease-out will-change-transform"
                  style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                >
                  {slideImages.map((img, idx) => (
                    <div
                      key={idx}
                      className="w-full h-full shrink-0 relative aspect-square sm:aspect-auto sm:min-h-[420px] bg-stone-100 flex items-center justify-center"
                    >
                      <img
                        src={img}
                        alt={`${page.heroTitle || page.title} - ছবি ${idx + 1}`}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ))}
                </div>

                {/* Previous Slide Button */}
                {slideImages.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrevSlide();
                    }}
                    aria-label="পূর্ববর্তী ছবি"
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/85 hover:bg-white text-stone-800 flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95 z-20 border border-stone-200/70 backdrop-blur-xs"
                  >
                    <ChevronLeft className="w-5 h-5 text-stone-800 -ml-0.5" />
                  </button>
                )}

                {/* Next Slide Button */}
                {slideImages.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextSlide();
                    }}
                    aria-label="পরবর্তী ছবি"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/85 hover:bg-white text-stone-800 flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95 z-20 border border-stone-200/70 backdrop-blur-xs"
                  >
                    <ChevronRight className="w-5 h-5 text-stone-800 -mr-0.5" />
                  </button>
                )}

                {/* Slide Indicator Dots */}
                {slideImages.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-black/35 backdrop-blur-xs px-2.5 py-1 rounded-full">
                    {slideImages.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          goToSlide(idx);
                        }}
                        aria-label={`ছবি ${idx + 1}`}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          currentSlide === idx
                            ? 'w-5 bg-white shadow-xs'
                            : 'w-2 bg-white/50 hover:bg-white/80'
                        }`}
                      />
                    ))}
                  </div>
                )}

                {/* Slide Counter & Auto-play Pause/Play Pill */}
                {slideImages.length > 1 && (
                  <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur-xs text-white px-2.5 py-0.5 rounded-full text-[11px] font-mono shadow">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsAutoPlay(!isAutoPlay);
                      }}
                      title={isAutoPlay ? 'অটো-স্লাইড বন্ধ করুন' : 'অটো-স্লাইড চালু করুন'}
                      className="hover:text-amber-300 transition"
                    >
                      {isAutoPlay ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    </button>
                    <span>{toBanglaDigits(currentSlide + 1)}/{toBanglaDigits(slideImages.length)}</span>
                  </div>
                )}
              </div>

              {/* Thumbnails Row (Slide Triggers) */}
              {slideImages.length > 1 && (
                (() => {
                  const count = slideImages.length;

                  const renderThumbItem = (img: string, idx: number, extraClasses = '') => {
                    const isActive = currentSlide === idx;
                    return (
                      <button
                        key={idx}
                        ref={el => { thumbRefs.current[idx] = el; }}
                        type="button"
                        onClick={() => goToSlide(idx)}
                        aria-label={`স্লাইড ${idx + 1}`}
                        className={`aspect-square overflow-hidden rounded-lg border-2 transition-all relative group/thumb cursor-pointer ${
                          isActive
                            ? 'border-rose-600 ring-2 ring-rose-300 shadow-md scale-102 opacity-100 bg-white'
                            : 'border-transparent opacity-75 hover:opacity-100 hover:border-stone-300'
                        } ${extraClasses}`}
                      >
                        <img
                          src={img}
                          alt={`থাম্বনেইল ${idx + 1}`}
                          className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform"
                          referrerPolicy="no-referrer"
                        />
                        {isActive && (
                          <div className="absolute bottom-0 inset-x-0 h-1 bg-rose-600" />
                        )}
                      </button>
                    );
                  };

                  // 2 images: keep the exact same size as 3 images, in 1 row
                  if (count === 2) {
                    return (
                      <div className="flex items-center justify-center gap-2 p-2.5 bg-[#e8e0d8]">
                        {slideImages.map((img, idx) =>
                          renderThumbItem(img, idx, 'w-[calc((100%-1rem)/3)]')
                        )}
                      </div>
                    );
                  }

                  // 3 images: standard 3-column size in 1 row (exact original size)
                  if (count === 3) {
                    return (
                      <div className="grid grid-cols-3 gap-2 p-2.5 bg-[#e8e0d8]">
                        {slideImages.map((img, idx) => renderThumbItem(img, idx))}
                      </div>
                    );
                  }

                  // 4 images: 4 in 1 row, scaled down proportionally
                  if (count === 4) {
                    return (
                      <div className="grid grid-cols-4 gap-2 p-2.5 bg-[#e8e0d8]">
                        {slideImages.map((img, idx) => renderThumbItem(img, idx))}
                      </div>
                    );
                  }

                  // 5 images: 5 in 1 row, scaled down proportionally
                  if (count === 5) {
                    return (
                      <div className="grid grid-cols-5 gap-1.5 sm:gap-2 p-2.5 bg-[#e8e0d8]">
                        {slideImages.map((img, idx) => renderThumbItem(img, idx))}
                      </div>
                    );
                  }

                  // More than 5 images: Horizontal carousel with scroll buttons and swipe/touch
                  return (
                    <div className="relative p-2 sm:p-2.5 bg-[#e8e0d8] flex items-center group/thumbcarousel select-none">
                      {/* Left Carousel Arrow */}
                      <button
                        type="button"
                        onClick={() => scrollThumbnails('left')}
                        aria-label="আগের ছবিগুলো"
                        className="shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/95 hover:bg-white text-stone-800 shadow-md flex items-center justify-center border border-stone-300 transition-all hover:scale-105 active:scale-95 z-10 mr-1 sm:mr-1.5 cursor-pointer"
                        title="আগের থাম্বনেইল"
                      >
                        <ChevronLeft className="w-4 h-4 text-stone-800 -ml-0.5" />
                      </button>

                      {/* Scrollable Track */}
                      <div
                        ref={thumbnailCarouselRef}
                        className="flex-1 flex items-center gap-2 overflow-x-auto scroll-smooth no-scrollbar py-0.5"
                      >
                        {slideImages.map((img, idx) =>
                          renderThumbItem(img, idx, 'shrink-0 w-[64px] sm:w-[74px] md:w-[80px]')
                        )}
                      </div>

                      {/* Right Carousel Arrow */}
                      <button
                        type="button"
                        onClick={() => scrollThumbnails('right')}
                        aria-label="পরের ছবিগুলো"
                        className="shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/95 hover:bg-white text-stone-800 shadow-md flex items-center justify-center border border-stone-300 transition-all hover:scale-105 active:scale-95 z-10 ml-1 sm:ml-1.5 cursor-pointer"
                        title="পরের থাম্বনেইল"
                      >
                        <ChevronRight className="w-4 h-4 text-stone-800 -mr-0.5" />
                      </button>
                    </div>
                  );
                })()
              )}
            </div>

            {/* Info Panel Column */}
            <div className="p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-stone-900 leading-snug mb-2" style={{ fontFamily: 'serif' }}>
                  {page.heroTitle || page.title}
                </h2>

                {/* Rating */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="text-amber-500 text-base">{page.ratingStars || '★★★★★'}</div>
                  <div className="text-xs text-stone-500 font-medium">{page.ratingCountText || '৩২৬+ কাস্টমার সন্তুষ্ট'}</div>
                </div>

                {/* Price Box */}
                {page.products && page.products.length > 0 && (
                  <div
                    className="flex items-center gap-3 p-3.5 rounded-xl mb-5 border-l-4"
                    style={{
                      backgroundColor: `${themeColor}12`,
                      borderColor: themeColor
                    }}
                  >
                    <span className="text-3xl font-extrabold" style={{ color: themeColor }}>
                      {toBanglaDigits(page.products[0].price)}৳
                    </span>
                    {page.products[0].oldPrice > page.products[0].price && (
                      <span className="text-base text-stone-400 line-through">
                        {toBanglaDigits(page.products[0].oldPrice)}৳
                      </span>
                    )}
                    {page.products[0].oldPrice > page.products[0].price && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-600 text-white ml-auto">
                        {toBanglaDigits(page.products[0].oldPrice - page.products[0].price)}৳ সাশ্রয়
                      </span>
                    )}
                  </div>
                )}

                {/* Features List */}
                <div className="mb-6">
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">পণ্যের বৈশিষ্ট্যসমূহ</h3>
                  <ul className="space-y-2 text-sm text-stone-800">
                    {page.features?.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2.5 pb-2 border-b border-dashed border-stone-200 last:border-none">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Instant Order Trigger Button */}
              <button
                type="button"
                onClick={scrollToProducts}
                className="w-full py-3.5 px-6 text-white text-base sm:text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                style={{ backgroundColor: themeColor }}
              >
                <ShoppingCart className="w-5 h-5" />
                <span>পণ্য ও কালার সিলেক্ট করুন</span>
              </button>
            </div>
          </div>
        </div>

        {/* ===== COUNTDOWN SECTION ===== */}
        {page.countdown?.enabled && (
          <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white p-5 rounded-2xl text-center mb-6 shadow-md border border-stone-800">
            <div className="text-amber-400 font-bold text-sm sm:text-base flex items-center justify-center gap-2 mb-3">
              <Clock className="w-4 h-4" />
              <span>{page.countdown.title || '⏰ অফার শেষ হওয়ার আগেই অর্ডার করুন!'}</span>
            </div>
            <div className="flex justify-center gap-3 sm:gap-5">
              <div className="bg-white/10 border border-white/15 rounded-xl px-4 py-2 min-w-[70px]">
                <span className="block text-2xl sm:text-3xl font-bold font-mono">
                  {toBanglaDigits(String(timeLeft.hours).padStart(2, '0'))}
                </span>
                <span className="text-[11px] text-white/70">ঘণ্টা</span>
              </div>
              <div className="bg-white/10 border border-white/15 rounded-xl px-4 py-2 min-w-[70px]">
                <span className="block text-2xl sm:text-3xl font-bold font-mono">
                  {toBanglaDigits(String(timeLeft.minutes).padStart(2, '0'))}
                </span>
                <span className="text-[11px] text-white/70">মিনিট</span>
              </div>
              <div className="bg-white/10 border border-white/15 rounded-xl px-4 py-2 min-w-[70px]">
                <span className="block text-2xl sm:text-3xl font-bold font-mono text-amber-400">
                  {toBanglaDigits(String(timeLeft.seconds).padStart(2, '0'))}
                </span>
                <span className="text-[11px] text-white/70">সেকেন্ড</span>
              </div>
            </div>
          </div>
        )}

        {/* ===== WHATSAPP SECTION ===== */}
        <div className="bg-white rounded-2xl p-6 mb-6 text-center border border-[#e8e0d8] shadow-sm">
          <p className="text-stone-700 font-semibold text-sm sm:text-base mb-1">
            যেকোনো তথ্যের জন্য হোয়াটসঅ্যাপে মেসেজ দিন
          </p>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-wider my-2 font-mono" style={{ color: themeColor }}>
            {page.callNumber || '01606318193'}
          </div>

          <div className="flex items-center justify-center gap-3 mt-3">
            {/* Primary WhatsApp Direct SMS/Message Button */}
            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackPixelEvent('Contact', { channel: 'whatsapp_button', page: page.title })}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white px-8 py-3.5 rounded-full font-bold text-base transition-all shadow-md hover:shadow-lg active:scale-95 group"
            >
              <WhatsAppIcon className="w-5 h-5 fill-white shrink-0 group-hover:scale-110 transition-transform" />
              <span>হোয়াটসঅ্যাপে মেসেজ করুন</span>
            </a>
          </div>
        </div>

        {/* ===== PRODUCT CARDS SECTION ===== */}
        <div ref={productsSectionRef} className="mb-6">
          <div className="text-center mb-5">
            <h2 className="text-xl sm:text-2xl font-bold text-stone-900" style={{ fontFamily: 'serif' }}>
              পছন্দের পণ্য বা কালার সিলেক্ট করুন
            </h2>
            <div className="w-16 h-1 rounded mx-auto mt-2" style={{ backgroundColor: themeColor }}></div>
          </div>

          <div className="space-y-4">
            {page.products.map(prod => {
              const sel = selectedVariants[prod.id] || { selected: false, size: null, long: null, quantity: 1 };
              const isSelected = sel.selected;

              return (
                <div
                  key={prod.id}
                  className={`bg-white rounded-2xl border-2 transition-all shadow-sm overflow-hidden ${
                    isSelected
                      ? 'border-rose-600 ring-2 ring-rose-100 shadow-md'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  {/* Top Clickable Header Area */}
                  <div
                    onClick={() => toggleVariantSelection(prod.id)}
                    className="p-3.5 sm:p-4 cursor-pointer hover:bg-stone-50/50 transition-colors flex items-center gap-3.5"
                  >
                    {/* Variant Thumbnail */}
                    <div className="relative shrink-0">
                      <img
                        src={prod.image}
                        alt={prod.name}
                        className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl border border-stone-200 shadow-xs"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    {/* Variant Title & Pricing */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-base sm:text-lg text-stone-900 leading-snug break-words">
                        {prod.name}
                      </h4>

                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        <span className="text-xl sm:text-2xl font-black" style={{ color: themeColor }}>
                          {toBanglaDigits(prod.price)}৳
                        </span>
                        {prod.oldPrice > prod.price && (
                          <span className="text-xs sm:text-sm text-stone-400 line-through">
                            {toBanglaDigits(prod.oldPrice)}৳
                          </span>
                        )}
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          স্টকে আছে
                        </span>
                      </div>

                      {/* Helper status text */}
                      <p className="text-[11px] text-stone-500 mt-1">
                        {isSelected ? (
                          <span className="text-emerald-700 font-medium">
                            ✓ সিলেক্ট করা হয়েছে
                            {getProductCustomFields(prod).map(f => {
                              const val = sel.customSelections?.[f.id] || f.options[0];
                              const cleanLabel = f.label.replace(/:$/, '').trim();
                              return val ? ` • ${cleanLabel}: ${val}` : '';
                            }).join('')}
                          </span>
                        ) : (
                          <span className="text-stone-400">সিলেক্ট করতে ক্লিক করুন</span>
                        )}
                      </p>
                    </div>

                    {/* Checkbox / Selection Indicator */}
                    <div className="shrink-0 pl-1">
                      <div
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                          isSelected
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm scale-105'
                            : 'border-stone-300 bg-stone-50'
                        }`}
                      >
                        {isSelected && <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />}
                      </div>
                    </div>
                  </div>

                  {/* Options Expansion Panel (Full Width across the bottom of the card) */}
                  {isSelected && (
                    <div className="bg-[#faf7f4] border-t border-stone-200/90 p-3.5 sm:p-4 space-y-3.5">
                      {/* Dynamically Rendered Fields Configured by Admin */}
                      {getProductCustomFields(prod).map(field => {
                        const activeVal = sel.customSelections?.[field.id] || field.options[0];
                        return (
                          <div key={field.id}>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-bold text-stone-700">
                                {field.label.endsWith(':') ? field.label : `${field.label}:`}
                              </span>
                              {activeVal && (
                                <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                                  নির্বাচিত: {activeVal}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {field.options.map(optionVal => {
                                const isOptionActive = activeVal === optionVal;
                                return (
                                  <button
                                    key={optionVal}
                                    type="button"
                                    onClick={(e) => handleCustomOptionSelect(e, prod.id, field.id, optionVal)}
                                    className={`min-w-[48px] h-9 px-3.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center border shadow-xs active:scale-95 ${
                                      isOptionActive
                                        ? 'bg-rose-600 border-rose-600 text-white ring-2 ring-rose-200 shadow-sm'
                                        : 'bg-white border-stone-300 text-stone-700 hover:border-stone-400 hover:bg-stone-50'
                                    }`}
                                  >
                                    {optionVal}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                      {/* Quantity & Subtotal Action Strip */}
                      <div className="pt-2.5 border-t border-stone-200 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-stone-700">পরিমাণ:</span>
                          <div className="flex items-center border border-stone-300 rounded-lg overflow-hidden bg-white shadow-xs">
                            <button
                              type="button"
                              onClick={(e) => handleQtyChange(e, prod.id, -1)}
                              className="w-9 h-9 flex items-center justify-center font-bold text-stone-700 hover:bg-stone-100 text-base active:bg-stone-200"
                              title="পরিমাণ কমান"
                            >
                              −
                            </button>
                            <span className="w-10 text-center font-bold text-stone-900 text-sm">
                              {toBanglaDigits(sel.quantity)}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleQtyChange(e, prod.id, 1)}
                              className="w-9 h-9 flex items-center justify-center font-bold text-stone-700 hover:bg-stone-100 text-base active:bg-stone-200"
                              title="পরিমাণ বাড়ান"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Subtotal */}
                        <div className="text-right">
                          <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-semibold">
                            সাবটোটাল
                          </span>
                          <span className="text-base sm:text-lg font-black" style={{ color: themeColor }}>
                            {toBanglaDigits(prod.price * sel.quantity)}৳
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ===== ORDER FORM SECTION ===== */}
        <div ref={orderFormRef} className="bg-white rounded-2xl p-6 sm:p-8 border border-[#e8e0d8] shadow-sm mb-8">
          <h3 className="text-xl sm:text-2xl font-bold text-center text-stone-900 mb-6" style={{ fontFamily: 'serif' }}>
            অর্ডার <span style={{ color: themeColor }}>ফর্ম</span> পূরণ করুন
          </h3>

          <form onSubmit={handleSubmitOrder} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                আপনার নাম <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={custName}
                onChange={e => setCustName(e.target.value)}
                onBlur={() => captureIncompleteLead()}
                placeholder="আপনার পূর্ণ নাম লিখুন"
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm bg-stone-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                মোবাইল নাম্বার <span className="text-rose-600">*</span>
              </label>
              <input
                type="tel"
                required
                value={custPhone}
                onChange={e => setCustPhone(e.target.value)}
                onBlur={() => captureIncompleteLead()}
                placeholder="১১ ডিজিটের মোবাইল নাম্বার দিন (যেমন: 01712345678)"
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm bg-stone-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                সম্পূর্ণ ঠিকানা <span className="text-rose-600">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={custAddress}
                onChange={e => setCustAddress(e.target.value)}
                onBlur={() => captureIncompleteLead()}
                placeholder="আপনার জেলা, উপজেলা/ থানা, গ্রাম/ বাসা"
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm bg-stone-50 focus:bg-white resize-none"
              ></textarea>
            </div>

            {/* Delivery Charge Selector */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-stone-700 mb-2">
                ডেলিভারি এরিয়া সিলেক্ট করুন
              </label>
              {isFreeDelivery ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>🎉 এই পণ্যের জন্য সারাদেশে ফ্রি ডেলিভারি চলছে!</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <label
                    className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                      deliveryLocation === 'inside_dhaka'
                        ? 'border-rose-600 bg-rose-50/60 ring-2 ring-rose-100 shadow-2xs'
                        : 'border-stone-200 hover:border-stone-300 bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="deliveryLocation"
                        checked={deliveryLocation === 'inside_dhaka'}
                        onChange={() => setDeliveryLocation('inside_dhaka')}
                        className="text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs sm:text-sm font-semibold text-stone-800">ঢাকার ভিতরে</span>
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-rose-700">
                      {toBanglaDigits(page.deliveryCharges?.insideDhaka || 60)}৳
                    </span>
                  </label>

                  <label
                    className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                      deliveryLocation === 'outside_dhaka'
                        ? 'border-rose-600 bg-rose-50/60 ring-2 ring-rose-100 shadow-2xs'
                        : 'border-stone-200 hover:border-stone-300 bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="deliveryLocation"
                        checked={deliveryLocation === 'outside_dhaka'}
                        onChange={() => setDeliveryLocation('outside_dhaka')}
                        className="text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs sm:text-sm font-semibold text-stone-800">ঢাকার বাইরে</span>
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-rose-700">
                      {toBanglaDigits(page.deliveryCharges?.outsideDhaka || 120)}৳
                    </span>
                  </label>
                </div>
              )}
            </div>

            {/* ORDER SUMMARY */}
            <div className="bg-[#f8f4f0] rounded-xl p-4 border border-stone-200 mt-4 text-sm">
              <h4 className="font-bold text-stone-800 mb-3 flex items-center gap-1.5 text-xs uppercase tracking-wide">
                <ShoppingCart className="w-4 h-4 text-stone-600" />
                <span>অর্ডার সামারি</span>
              </h4>

              {selectedItemsList.length === 0 ? (
                <div className="py-2.5 px-3 bg-amber-50/80 border border-amber-200/80 rounded-lg mb-2">
                  <p className="text-xs text-amber-800 font-medium">
                    👆 কোনো পণ্য সিলেক্ট করা হয়নি। উপরের তালিকা থেকে আপনার পছন্দের পণ্যটি সিলেক্ট করুন।
                  </p>
                </div>
              ) : (
                <div className="space-y-2 mb-3">
                  {selectedItemsList.map((it, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs pb-1.5 border-b border-stone-200">
                      <span className="text-stone-700 font-medium">
                        {it.variantName}
                        {it.customSelections && Object.keys(it.customSelections).length > 0
                          ? ` (${Object.entries(it.customSelections).map(([k, v]) => `${k}: ${v}`).join(', ')})`
                          : it.size ? ` (সাইজ: ${it.size}${it.long ? `, লং: ${it.long}"` : ''})` : ''
                        } × {toBanglaDigits(it.quantity)}
                      </span>
                      <span className="font-bold text-stone-900">{toBanglaDigits(it.subtotal)}৳</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center text-xs text-stone-600 pt-1">
                <span>পণ্যের মূল্য:</span>
                <span className="font-semibold">{toBanglaDigits(subtotal)}৳</span>
              </div>

              <div className="flex justify-between items-center text-xs text-stone-600 pt-1">
                <span>ডেলিভারি চার্জ:</span>
                <span className="font-semibold text-emerald-700">
                  {isFreeDelivery || deliveryCharge === 0
                    ? 'ফ্রি ডেলিভারি'
                    : selectedItemsList.length === 0
                    ? '০৳'
                    : `${toBanglaDigits(deliveryCharge)}৳`}
                </span>
              </div>

              <div className="flex justify-between items-center text-base font-bold text-stone-900 pt-3 mt-2 border-t-2 border-stone-300">
                <span style={{ color: themeColor }}>সর্বমোট বিল:</span>
                <span className="text-lg font-extrabold" style={{ color: themeColor }}>
                  {toBanglaDigits(grandTotal)}৳
                </span>
              </div>
            </div>

            {/* Warning Message */}
            {warnMsg && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-800 text-xs font-semibold">
                {warnMsg}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 text-white text-base sm:text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
              style={{ backgroundColor: themeColor }}
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{isSubmitting ? 'অর্ডার গ্রহণ করা হচ্ছে...' : '✅ অর্ডার কনফার্ম করুন'}</span>
            </button>
          </form>
        </div>
      </main>

      {/* ===== POPUP MODAL (THANK YOU) ===== */}
      {orderSuccess && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl border border-stone-100 transform transition-all">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h3 className="text-2xl font-bold text-stone-900 mb-1" style={{ fontFamily: 'serif' }}>
              ধন্যবাদ! 🎉
            </h3>
            <p className="text-xs text-stone-500 mb-3">আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে।</p>

            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 mb-4 text-xs text-left space-y-1">
              <div className="flex justify-between">
                <span className="text-stone-500">অর্ডার আইডি:</span>
                <span className="font-bold text-stone-900">{orderSuccess.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">মোট মূল্য:</span>
                <span className="font-bold text-emerald-700">{toBanglaDigits(orderSuccess.total)}৳</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">পেমেন্ট মেথড:</span>
                <span className="font-medium text-stone-700">ক্যাশ অন ডেলিভারি</span>
              </div>
            </div>

            <p className="text-xs text-stone-600 mb-4">
              খুব শীঘ্রই আমাদের একজন প্রতিনিধি কল করে আপনার অর্ডারটি কনফার্ম করবেন।
            </p>

            <div className="flex flex-col gap-2">
              <a
                href={`https://wa.me/${(page.callNumber || '01606318193').replace(/\D/g, '').startsWith('88') ? (page.callNumber || '01606318193').replace(/\D/g, '') : '88' + (page.callNumber || '01606318193').replace(/\D/g, '')}?text=${encodeURIComponent(`আসসালামু আলাইকুম, আমি ওয়েবসাইট থেকে একটি অর্ডার করেছি।\nঅর্ডার আইডি: ${orderSuccess.id}\nসর্বমোট বিল: ${orderSuccess.total}৳`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl text-sm font-bold shadow flex items-center justify-center gap-2 transition"
              >
                <WhatsAppIcon className="w-4 h-4 fill-white" />
                <span>হোয়াটসঅ্যাপে মেসেজ দিয়ে কনফার্ম করুন</span>
              </a>

              <button
                type="button"
                onClick={() => setOrderSuccess(null)}
                className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition"
              >
                ঠিক আছে
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Order History & Courier Report Modal */}
      <CustomerOrderHistoryModal
        isOpen={isOrderHistoryOpen}
        onClose={() => setIsOrderHistoryOpen(false)}
        initialPhone={orderHistoryPhone}
        themeColor={themeColor}
      />

      {/* Floating WhatsApp Action Button */}
      <a
        href={whatsAppUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackPixelEvent('Contact', { channel: 'floating_whatsapp', page: page.title })}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 bg-[#25D366] text-white px-4 py-3 rounded-full shadow-xl hover:bg-[#20bd5a] hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 font-bold text-sm"
        title="হোয়াটসঅ্যাপে সরাসরি মেসেজ দিন"
      >
        <WhatsAppIcon className="w-5 h-5 fill-white shrink-0" />
        <span className="font-semibold text-xs sm:text-sm">হোয়াটসঅ্যাপে মেসেজ</span>
      </a>

      {/* ===== FOOTER ===== */}
      <footer className="text-center text-xs text-stone-500 py-6 border-t border-stone-200 mt-auto bg-white/80 w-full">
        <p>© ২০২৬ {page.brandName || 'AmarChoice'} – সর্বস্বত্ব সংরক্ষিত</p>
        <p className="mt-1 text-[11px] text-stone-400">নিরাপদ ক্যাশ অন ডেলিভারি সুবিধা ও ১০০% কোয়ালিটি গ্যারান্টি</p>
      </footer>
    </div>
  );
}
