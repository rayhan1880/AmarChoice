import { LandingPage, Order, AppSettings, AdminUser, IncompleteOrder } from '../types.ts';

export const INITIAL_LANDING_PAGES: LandingPage[] = [
  {
    id: 'lp-mayaboti-1',
    slug: 'mayaboti-dress',
    title: 'নতুন আরাইভাল – স্পেশাল প্রিমিয়াম কালেকশন',
    brandName: 'AmarChoice',
    brandTagline: 'AmarChoice – প্রিমিয়াম বাংলাদেশি পোশাক',
    topBannerText: '🎉 স্পেশাল অফার – সীমিত সময়ের জন্য ৫০% ছাড়! দ্রুত অর্ডার করুন!',
    showTopBanner: true,
    heroTitle: 'AmarChoice – স্পেশাল প্রিমিয়াম কালেকশন',
    ratingStars: '★★★★☆',
    ratingCountText: '৩২৬+ কাস্টমার সন্তুষ্ট',
    mainImage: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&q=80',
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80',
      'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&q=80'
    ],
    features: [
      '১০০% প্রিমিয়াম লিলিন (Premium Lilin) – অত্যন্ত আরামদায়ক ও দীর্ঘস্থায়ী',
      'গলায় ও হাতায় চমৎকার ও নিখুঁত সুতার হ্যান্ডলুক কারুকাজ',
      '২টি আকর্ষণীয় ট্রেন্ডিং কালার: রয়্যাল ব্লু / গাঢ় নীল এবং মেরুন / গাঢ় লাল',
      'সাইজ: ৩৮ থেকে ৪৬ পর্যন্ত সকল সাইজ উপলব্ধ',
      'পণ্য হাতে পেয়ে দেখে মূল্য পরিশোধ করার ১০০% ক্যাশ অন ডেলিভারি সুবিধা',
      'পণ্য অপছন্দ হলে তাৎক্ষণিক রিটার্ন বা সাইজ এক্সচেঞ্জ গ্যারান্টি'
    ],
    countdown: {
      enabled: true,
      hours: 6,
      title: '⏰ অফার শেষ হওয়ার আগেই অর্ডার করুন!'
    },
    callNumber: '01606318193',
    products: [
      {
        id: 'prod-blue',
        name: 'রয়্যাল ব্লু (Royal Blue)',
        colorName: 'রয়্যাল ব্লু',
        price: 999,
        oldPrice: 1650,
        image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80',
        sizes: ['৩৮', '৪০', '৪২', '৪৪', '৪৬'],
        hasLong: true,
        longSizes: ['৪০', '৪২', '৪৪', '৪৬'],
        customFields: [
          {
            id: 'field_size',
            label: 'বডি সাইজ (Body Size):',
            options: ['৩৮', '৪০', '৪২', '৪৪', '৪৬']
          },
          {
            id: 'field_long',
            label: 'লং / ঝুল সাইজ (Long Size):',
            options: ['৪০', '৪২', '৪৪', '৪৬']
          }
        ],
        inStock: true,
        colorCode: '#1e3a8a'
      },
      {
        id: 'prod-cream',
        name: 'মেরুন / গাঢ় লাল (Deep Maroon)',
        colorName: 'মেরুন/গাঢ় লাল',
        price: 999,
        oldPrice: 1650,
        image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80',
        sizes: ['৩৮', '৪০', '৪২', '৪৪', '৪৬'],
        hasLong: true,
        longSizes: ['৪০', '৪২', '৪৪', '৪৬'],
        customFields: [
          {
            id: 'field_size',
            label: 'বডি সাইজ (Body Size):',
            options: ['৩৮', '৪০', '৪২', '৪৪', '৪৬']
          },
          {
            id: 'field_long',
            label: 'লং / ঝুল সাইজ (Long Size):',
            options: ['৪০', '৪২', '৪৪', '৪৬']
          }
        ],
        inStock: true,
        colorCode: '#881337'
      }
    ],
    deliveryCharges: {
      insideDhaka: 60,
      outsideDhaka: 120,
      isFreeDelivery: true
    },
    facebookPixelId: '984512398471201',
    tiktokPixelId: 'CP845210984TT',
    themeColor: '#c0392b',
    isDefault: true,
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-15T10:00:00.000Z'
  },
  {
    id: 'lp-smartwatch-2',
    slug: 'luxury-smartwatch',
    title: 'আল্ট্রা স্মার্টওয়াচ সিরিজ ৯ – প্রিমিয়াম ব্লুটুথ কলিং ঘড়ি',
    brandName: 'AmarChoice Gadgets',
    brandTagline: 'লেটেস্ট ট্রেন্ডিং গ্যাজেট ও অরিজিনাল কালেকশন',
    topBannerText: '⚡ মেগা অফার: আজই অর্ডার করলে ফ্রি ডেলিভারি + ১ বছরের গ্যারান্টি!',
    showTopBanner: true,
    heroTitle: 'আল্ট্রা স্মার্টওয়াচ সিরিজ ৯ (AMOLED Curved Display)',
    ratingStars: '★★★★★',
    ratingCountText: '৫৮৪+ সন্তুষ্ট গ্রাহক রিভিউ',
    mainImage: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&q=80',
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
      'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&q=80'
    ],
    features: [
      'অরিজিনাল AMOLED ২.০২ ইঞ্চি সুপার ব্রাইট ও ফ্লুইড ডিসপ্লে',
      'স্পষ্ট লাউড স্পিকারে সরাসরি ব্লুটুথ কল গ্রহণ ও কথা বলার সুবিধা',
      'হার্ট রেট, রক্তে অক্সিজেন (SpO2) ও স্লিপ মনিটরিং ট্র্যাকার',
      'একবার সম্পূর্ণ চার্জে ৫ থেকে ৭ দিনের অবিশ্বাস্য ব্যাটারি ব্যাকআপ',
      'পানি ও ঘাম প্রতিরোধী IP68 ওয়াটারপ্রুফ রেটিং'
    ],
    countdown: {
      enabled: true,
      hours: 4,
      title: '🔥 মেগা ডিসকাউন্ট অফার শেষ হতে আর মাত্র!'
    },
    callNumber: '01606318193',
    products: [
      {
        id: 'prod-watch-black',
        name: 'ম্যাট ব্ল্যাক এডিশন (Matte Black)',
        colorName: 'ম্যাট ব্ল্যাক',
        price: 1550,
        oldPrice: 2450,
        image: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600&q=80',
        sizes: ['Standard 49mm'],
        inStock: true,
        colorCode: '#18181b'
      },
      {
        id: 'prod-watch-silver',
        name: 'সিলভার মেটালিক এডিশন (Silver Metal)',
        colorName: 'সিলভার মেটালিক',
        price: 1699,
        oldPrice: 2650,
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80',
        sizes: ['Standard 49mm'],
        inStock: true,
        colorCode: '#71717a'
      }
    ],
    deliveryCharges: {
      insideDhaka: 70,
      outsideDhaka: 130,
      isFreeDelivery: false
    },
    facebookPixelId: '554433221199001',
    themeColor: '#1e40af',
    isDefault: false,
    createdAt: '2026-09-05T12:00:00.000Z',
    updatedAt: '2026-09-15T11:00:00.000Z'
  },
  {
    id: 'lp-ecommerce-store-3',
    slug: 'fashion-store',
    pageType: 'ecommerce',
    title: 'AmarChoice ফ্যাশন ও লাইফস্টাইল ই-কমার্স শপ',
    brandName: 'AmarChoice Store',
    brandTagline: 'আপনার আস্থার সেরা অনলাইন শপিং মল',
    topBannerText: '🛍️ মেগা শপিং ফেস্টিভ্যাল – যেকোনো ২টি পণ্য অর্ডারে ফ্রি ডেলিভারি!',
    showTopBanner: true,
    heroTitle: 'লেটেস্ট ট্রেন্ডি ফ্যাশন ও প্রিমিয়াম লাইফস্টাইল কালেকশন',
    ratingStars: '★★★★★',
    ratingCountText: '১২৫০+ কাস্টমার রিভিউ',
    mainImage: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80',
      'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&q=80',
      'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&q=80'
    ],
    features: [
      '১০০% জেনুইন ও প্রিমিয়াম কোয়ালিটি নিশ্চয়তা',
      'সারাদেশে দ্রুততম হোম ডেলিভারি ও ক্যাশ অন ডেলিভারি',
      'মাল্টিপল প্রোডাক্ট একসাথে কার্টে যোগ করে অর্ডার করার সুবিধা',
      'পণ্য হাতে পেয়ে চেক করে পেমেন্ট করার ১০০% নিরাপত্তা'
    ],
    countdown: {
      enabled: true,
      hours: 12,
      title: '⚡ বিশেষ সাপ্তাহিক অফার শেষ হতে আর বাকি!'
    },
    callNumber: '01606318193',
    storeCategories: ['সকল পণ্য', 'বোরকা ও আবায়া', 'পাঞ্জাবি', 'শাড়ি', 'হিজাব', 'অফার'],
    products: [
      {
        id: 'prod-store-1',
        name: 'দুবাই চেরি সিল্ক প্রিন্সেস আবায়া ও বোরকা',
        category: 'বোরকা ও আবায়া',
        price: 1490,
        oldPrice: 2300,
        image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80',
        sizes: ['৫২', '৫৪', '৫৬'],
        hasLong: false,
        inStock: true,
        isFeatured: true,
        description: 'অরিজিনাল দুবাই চেরি ফেব্রিক, অত্যন্ত আরামদায়ক ও ট্রেন্ডি কাটিং।'
      },
      {
        id: 'prod-store-2',
        name: 'প্রিমিয়াম প্রিমিয়াম কটন সেমি-লং কাবলি পাঞ্জাবি',
        category: 'পাঞ্জাবি',
        price: 1190,
        oldPrice: 1750,
        image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80',
        sizes: ['৩৮', '৪০', '৪২', '৪৪'],
        hasLong: true,
        longSizes: ['৪০', '৪২', '৪৪', '৪৬'],
        inStock: true,
        isFeatured: true,
        description: '১০০% ফাইন কটন ফেব্রিক, বুক ও কলারে নিখুঁত ডিজাইন।'
      },
      {
        id: 'prod-store-3',
        name: 'পিওর সফট জর্জেট এমব্রয়ডারি পার্টি শাড়ি',
        category: 'শাড়ি',
        price: 2350,
        oldPrice: 3400,
        image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80',
        sizes: ['১২ হাত উইথ ব্লাউজপিস'],
        inStock: true,
        isFeatured: false,
        description: 'মনোরম সফট জর্জেট সুতার এমব্রয়ডারি কাজ ও রানিং ব্লাউজপিস।'
      },
      {
        id: 'prod-store-4',
        name: 'প্রিমিয়াম তুর্কি শিফন ইন্সট্যান্ট রেডি হিজাব',
        category: 'হিজাব',
        price: 490,
        oldPrice: 750,
        image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600&q=80',
        sizes: ['ফ্রি সাইজ'],
        inStock: true,
        isFeatured: false,
        description: 'সহজে পড়ার মত আরামদায়ক নন-স্লিপার সফট শিফন হিজাব।'
      },
      {
        id: 'prod-store-5',
        name: 'প্রিমিয়াম ব্লুটুথ কলিং আল্ট্রা স্মার্টওয়াচ',
        category: 'অফার',
        price: 1690,
        oldPrice: 2800,
        image: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600&q=80',
        sizes: ['স্ট্যান্ডার্ড সাইজ'],
        inStock: true,
        isFeatured: true,
        description: 'মেটাল বডি, এইচডি ডিসপ্লে, কলিং ও স্পোর্টস ট্র্যাকিং ফিচার।'
      },
      {
        id: 'prod-store-6',
        name: 'জেনুইন লেদার ওয়ালেট ও বেল্ট গিফট বক্স কম্বো',
        category: 'অফার',
        price: 850,
        oldPrice: 1400,
        image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&q=80',
        sizes: ['স্ট্যান্ডার্ড'],
        inStock: true,
        isFeatured: false,
        description: '১০০% অরিজিনাল চামড়া নির্মিত লং-লাস্টিং ওয়ালেট ও বেল্ট।'
      }
    ],
    deliveryCharges: {
      insideDhaka: 60,
      outsideDhaka: 120,
      isFreeDelivery: false
    },
    facebookPixelId: '112233445566778',
    themeColor: '#0f766e',
    googleSheetConfig: {
      enabled: false,
      webhookUrl: '',
      sheetName: 'StoreOrders'
    },
    smsTemplates: {
      enabled: true,
      orderReceived: 'প্রিয় {customer_name}, AmarChoice Store-এ আপনার অর্ডার #{order_id} গ্রহণ করা হয়েছে। মোট বিল: {total}৳। আমাদের টিম দ্রুত যোগাযোগ করবে।',
      orderConfirmed: 'প্রিয় {customer_name}, আপনার অর্ডার #{order_id} নিশ্চিত করা হয়েছে। খুব শীঘ্রই পার্সেলটি পাঠিয়ে দেওয়া হবে। ধন্যবাদ - AmarChoice Store',
      courierDispatched: 'প্রিয় {customer_name}, আপনার পার্সেলটি {courier_name} কুরিয়ারে বুকিং সম্পন্ন হয়েছে। ট্র্যাকিং কোড: {tracking_code}।',
      delivered: 'প্রিয় {customer_name}, আপনার অর্ডার #{order_id} সফলভাবে ডেলিভারি করা হয়েছে। আমাদের পণ্য কেমন লাগলো জানাতে ভুলবেন না!'
    },
    isDefault: false,
    createdAt: '2026-09-10T12:00:00.000Z',
    updatedAt: '2026-09-15T12:00:00.000Z'
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ORD-1004',
    landingPageId: 'lp-mayaboti-1',
    landingPageTitle: 'নতুন আরাইভাল – স্পেশাল প্রিমিয়াম কালেকশন',
    landingPageSlug: 'mayaboti-dress',
    customerName: 'তানভীর আহমেদ',
    customerPhone: '01711234567',
    customerAddress: 'বাসা #১২, রোড #৪, মিরপুর-১০, ঢাকা',
    items: [
      {
        variantId: 'prod-blue',
        variantName: 'রয়্যাল ব্লু (Royal Blue)',
        size: '৪০',
        long: '৪২',
        quantity: 1,
        unitPrice: 999,
        subtotal: 999,
        image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=200&q=80'
      }
    ],
    deliveryLocation: 'inside_dhaka',
    deliveryCharge: 0,
    subtotal: 999,
    grandTotal: 999,
    status: 'pending',
    createdAt: '2026-09-15T09:40:00.000Z',
    notes: 'কল দিয়ে নিশ্চিত করে পাঠাবেন।'
  },
  {
    id: 'ORD-1003',
    landingPageId: 'lp-mayaboti-1',
    landingPageTitle: 'নতুন আরাইভাল – স্পেশাল প্রিমিয়াম কালেকশন',
    landingPageSlug: 'mayaboti-dress',
    customerName: 'নাসরিন সুলতানা',
    customerPhone: '01823456789',
    customerAddress: 'ফ্ল্যাট ৪বি, গ্রীন ভ্যালি, জিইসি মোড়, চট্টগ্রাম',
    items: [
      {
        variantId: 'prod-cream',
        variantName: 'মেরুন / গাঢ় লাল (Deep Maroon)',
        size: '৪২',
        quantity: 1,
        unitPrice: 999,
        subtotal: 999,
        image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=200&q=80'
      }
    ],
    deliveryLocation: 'outside_dhaka',
    deliveryCharge: 0,
    subtotal: 999,
    grandTotal: 999,
    status: 'in_courier',
    courier: {
      provider: 'steadfast',
      consignmentId: 'ST-984210',
      trackingCode: 'SF78421BD',
      status: 'In Transit',
      sentAt: '2026-09-14T14:30:00.000Z',
      deliveryFee: 120
    },
    smsLogs: [
      {
        id: 'sms-1',
        sentAt: '2026-09-14T14:35:00.000Z',
        phone: '01823456789',
        message: 'প্রিয় নাসরিন সুলতানা, আপনার অর্ডারটি Steadfast কুরিয়ারে বুকিং দেওয়া হয়েছে। ট্র্যাকিং কোড: SF78421BD। পণ্য বুঝে নিয়ে মূল্য পরিশোধ করুন। - AmarChoice',
        status: 'sent'
      }
    ],
    createdAt: '2026-09-14T11:15:00.000Z',
    notes: 'বিকেল ৪টার পর ডেলিভারি দিতে অনুরোধ।'
  },
  {
    id: 'ORD-1002',
    landingPageId: 'lp-smartwatch-2',
    landingPageTitle: 'আল্ট্রা স্মার্টওয়াচ সিরিজ ৯ – প্রিমিয়াম ব্লুটুথ কলিং ঘড়ি',
    landingPageSlug: 'luxury-smartwatch',
    customerName: 'সাকিব হাসান',
    customerPhone: '01934567890',
    customerAddress: 'হাউজ ২১, রোড ১, উপশহর, রাজশাহী',
    items: [
      {
        variantId: 'prod-watch-black',
        variantName: 'ম্যাট ব্ল্যাক এডিশন (Matte Black)',
        size: 'Standard 49mm',
        quantity: 1,
        unitPrice: 1550,
        subtotal: 1550,
        image: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=200&q=80'
      }
    ],
    deliveryLocation: 'outside_dhaka',
    deliveryCharge: 130,
    subtotal: 1550,
    grandTotal: 1680,
    status: 'delivered',
    courier: {
      provider: 'pathao',
      consignmentId: 'PTH-552190',
      trackingCode: 'PTH-LK99201',
      status: 'Delivered',
      sentAt: '2026-09-12T10:00:00.000Z',
      deliveryFee: 130
    },
    createdAt: '2026-09-11T16:20:00.000Z'
  },
  {
    id: 'ORD-1001',
    landingPageId: 'lp-mayaboti-1',
    landingPageTitle: 'নতুন আরাইভাল – স্পেশাল প্রিমিয়াম কালেকশন',
    landingPageSlug: 'mayaboti-dress',
    customerName: 'ফাতেমা আক্তার',
    customerPhone: '01556789012',
    customerAddress: 'বাড়ি ৫৬, রোড ২৭, ধানমন্ডি, ঢাকা',
    items: [
      {
        variantId: 'prod-blue',
        variantName: 'রয়্যাল ব্লু (Royal Blue)',
        size: '৩৮',
        quantity: 2,
        unitPrice: 999,
        subtotal: 1998,
        image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=200&q=80'
      }
    ],
    deliveryLocation: 'inside_dhaka',
    deliveryCharge: 0,
    subtotal: 1998,
    grandTotal: 1998,
    status: 'confirmed',
    createdAt: '2026-09-13T18:00:00.000Z'
  },
  {
    id: 'ORD-0998',
    landingPageId: 'lp-mayaboti-1',
    landingPageTitle: 'নতুন আরাইভাল – স্পেশাল প্রিমিয়াম কালেকশন',
    landingPageSlug: 'mayaboti-dress',
    customerName: 'তানভীর আহমেদ',
    customerPhone: '01711234567',
    customerAddress: 'বাসা #১২, রোড #৪, মিরপুর-১০, ঢাকা',
    items: [
      {
        variantId: 'prod-blue',
        variantName: 'রয়্যাল ব্লু (Royal Blue)',
        size: '৪০',
        quantity: 1,
        unitPrice: 999,
        subtotal: 999
      }
    ],
    deliveryLocation: 'inside_dhaka',
    deliveryCharge: 0,
    subtotal: 999,
    grandTotal: 999,
    status: 'delivered',
    courier: {
      provider: 'steadfast',
      consignmentId: 'ST-881230',
      trackingCode: 'SF66201BD',
      status: 'Delivered',
      sentAt: '2026-09-08T10:00:00.000Z',
      deliveryFee: 60
    },
    createdAt: '2026-09-07T14:30:00.000Z'
  },
  {
    id: 'ORD-0985',
    landingPageId: 'lp-mayaboti-1',
    landingPageTitle: 'নতুন আরাইভাল – স্পেশাল প্রিমিয়াম কালেকশন',
    landingPageSlug: 'mayaboti-dress',
    customerName: 'তানভীর আহমেদ',
    customerPhone: '01711234567',
    customerAddress: 'বাসা #১২, রোড #৪, মিরপুর-১০, ঢাকা',
    items: [
      {
        variantId: 'prod-cream',
        variantName: 'মেরুন / গাঢ় লাল (Deep Maroon)',
        size: '৪২',
        quantity: 1,
        unitPrice: 999,
        subtotal: 999
      }
    ],
    deliveryLocation: 'inside_dhaka',
    deliveryCharge: 0,
    subtotal: 999,
    grandTotal: 999,
    status: 'cancelled',
    notes: 'কাস্টমার বাইরে থাকায় অর্ডার বাতিল করেছেন।',
    createdAt: '2026-08-25T11:00:00.000Z'
  },
  {
    id: 'ORD-0992',
    landingPageId: 'lp-smartwatch-2',
    landingPageTitle: 'আল্ট্রা স্মার্টওয়াচ সিরিজ ৯ – প্রিমিয়াম ব্লুটুথ কলিং ঘড়ি',
    landingPageSlug: 'luxury-smartwatch',
    customerName: 'সাকিব হাসান',
    customerPhone: '01934567890',
    customerAddress: 'হাউজ ২১, রোড ১, উপশহর, রাজশাহী',
    items: [
      {
        variantId: 'prod-watch-black',
        variantName: 'ম্যাট ব্ল্যাক এডিশন (Matte Black)',
        size: 'Standard 49mm',
        quantity: 1,
        unitPrice: 1550,
        subtotal: 1550
      }
    ],
    deliveryLocation: 'outside_dhaka',
    deliveryCharge: 130,
    subtotal: 1550,
    grandTotal: 1680,
    status: 'delivered',
    courier: {
      provider: 'pathao',
      consignmentId: 'PTH-441200',
      trackingCode: 'PTH-LK88120',
      status: 'Delivered',
      sentAt: '2026-08-30T10:00:00.000Z',
      deliveryFee: 130
    },
    createdAt: '2026-08-28T16:00:00.000Z'
  }
];

export const INITIAL_SETTINGS: AppSettings = {
  steadfast: {
    apiKey: 'st_live_67823ab912e847c',
    secretKey: 'st_sec_991823746152',
    baseUrl: 'https://portal.steadfast.com.bd/api/v1',
    isEnabled: true,
    sandboxMode: true
  },
  pathao: {
    clientId: 'pathao_cid_98124',
    clientSecret: 'pathao_sec_871625341',
    username: 'merchant@amarchoice.com',
    password: 'merchant_pass_secure',
    storeId: 'STR-44812',
    isEnabled: true,
    sandboxMode: true
  },
  smsGateway: {
    provider: 'greenweb',
    apiKey: 'gw_auth_token_8891234',
    senderId: 'AmarChoice',
    apiUrl: 'https://api.greenweb.com.bd/api.php',
    isEnabled: true,
    templates: {
      orderReceived: 'প্রিয় {customer_name}, আপনার অর্ডারটি (#{order_id}) AmarChoice-এ গ্রহণ করা হয়েছে। মোট মূল্য: {total}৳। প্রতিনিধি শীঘ্রই যোগাযোগ করবেন।',
      orderConfirmed: 'প্রিয় {customer_name}, আপনার অর্ডার #{order_id} সফলভাবে কনফার্ম করা হয়েছে। শীঘ্রই পার্সেল পাঠানো হবে। সাথে থাকুন!',
      courierDispatched: 'প্রিয় {customer_name}, আপনার পার্সেলটি {courier_name} কুরিয়ারে বুক করা হয়েছে। ট্র্যাকিং কোড: {tracking_code}। - AmarChoice',
      delivered: 'প্রিয় {customer_name}, আপনার পার্সেলটি সফলভাবে ডেলিভারি সম্পন্ন হয়েছে। AmarChoice এর সাথে কেনাকাটা করার জন্য ধন্যবাদ!'
    }
  },
  globalPixelId: '984512398471201',
  globalMetaCapiToken: '',
  globalMetaTestCode: '',
  globalTiktokPixelId: 'CP845210984TT',
  globalTiktokCapiToken: '',
  globalTiktokTestCode: '',
  enableServerSideTracking: true,
  defaultLandingPageId: 'lp-mayaboti-1',
  fraudControl: {
    enableDailyLimit: true,
    maxOrdersPerDay: 2,
    autoBlockOnExceed: true,
    enableIpBlocking: true,
    blockDurationDays: 30,
    blockedPhones: [
      {
        id: 'blk-1',
        phone: '01700999888',
        ip: '103.205.71.18',
        name: 'সন্দেহভাজন ফেক ক্রেতা',
        reason: 'একাধিকবার ভুয়া অর্ডার দিয়ে ফোন বন্ধ রেখেছে (অ্যাডমিন ব্লক)',
        blockedAt: '2026-09-10T14:30:00.000Z',
        blockedBy: 'admin',
        orderCountToday: 3
      }
    ],
    blockedIps: [
      {
        id: 'ip-blk-1',
        ip: '103.205.71.18',
        associatedPhone: '01700999888',
        name: 'সন্দেহভাজন ফেক ক্রেতা',
        reason: 'অটো-সিস্টেম: দৈনিক অর্ডারের সর্বোচ্চ সীমা অতিক্রম করায় আইপি ব্লক করা হয়েছে',
        blockedAt: '2026-09-10T14:30:00.000Z',
        blockedBy: 'system',
        orderCountToday: 3
      }
    ]
  }
};

export const INITIAL_INCOMPLETE_ORDERS: IncompleteOrder[] = [
  {
    id: 'inc-101',
    landingPageId: 'page-1',
    landingPageTitle: 'প্রিমিয়াম দুবাই চেরি বোরকা কালেকশন',
    landingPageSlug: 'dubai-cherry-borkha',
    customerName: 'ফারজানা আক্তার রেশমা',
    customerPhone: '01788112233',
    customerAddress: 'হাউজ #৪৫, রোড #১২, বনশ্রী, ঢাকা',
    items: [
      {
        variantId: 'prod-cherry-borkha-black',
        variantName: 'জেট ব্ল্যাক (Jet Black)',
        size: '৫২ (লম্বা: ৫২ ইঞ্চি)',
        quantity: 1,
        unitPrice: 1999,
        subtotal: 1999,
        image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80'
      }
    ],
    deliveryLocation: 'inside_dhaka',
    subtotal: 1999,
    deliveryCharge: 0,
    grandTotal: 1999,
    step: 'address_entered',
    createdAt: '2026-09-15T18:20:00.000Z',
    updatedAt: '2026-09-15T18:22:00.000Z',
    status: 'uncontacted',
    notes: 'চেকআউট ফর্ম পূরণ করেছে কিন্তু অর্ডার কনফার্ম করেনি'
  },
  {
    id: 'inc-102',
    landingPageId: 'page-2',
    landingPageTitle: 'আল্ট্রা স্মার্টওয়াচ সিরিজ ৯ - সুপার অ্যামোলেড',
    landingPageSlug: 'ultra-smartwatch-series9',
    customerName: 'মেহেদী হাসান শুভ',
    customerPhone: '01911445566',
    customerAddress: 'জিইসি মোড়, চট্টগ্রাম',
    items: [
      {
        variantId: 'prod-watch-black',
        variantName: 'ম্যাট ব্ল্যাক এডিশন (Matte Black)',
        size: 'Standard 49mm',
        quantity: 1,
        unitPrice: 1550,
        subtotal: 1550,
        image: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600&q=80'
      }
    ],
    deliveryLocation: 'outside_dhaka',
    subtotal: 1550,
    deliveryCharge: 130,
    grandTotal: 1680,
    step: 'details_entered',
    createdAt: '2026-09-16T00:15:00.000Z',
    updatedAt: '2026-09-16T00:16:00.000Z',
    status: 'uncontacted',
    notes: 'নাম এবং মোবাইল নাম্বার ইনপুট দেওয়ার পর বের হয়ে গেছে'
  }
];

export const INITIAL_ADMIN_USERS: AdminUser[] = [
  {
    id: 'user-admin-1',
    name: 'মালিক / সুপার অ্যাডমিন',
    email: 'admin@amarchoice.com',
    password: 'admin123',
    role: 'superadmin',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'user-admin-2',
    name: 'অর্ডার ম্যানেজার',
    email: 'manager@amarchoice.com',
    password: 'manager123',
    role: 'admin',
    createdAt: '2026-02-15T00:00:00.000Z'
  }
];
