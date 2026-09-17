import { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { LandingPage } from '../../types.ts';
import {
  Plus,
  Edit,
  Eye,
  Copy,
  Trash2,
  Package,
  Layers,
  ShoppingBag,
  Store,
  ExternalLink,
  FileSpreadsheet,
  MessageSquare,
  Home,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import LandingPageEditor from './LandingPageEditor.tsx';

export default function LandingPagesView() {
  const {
    landingPages,
    orders,
    setActiveLandingPage,
    setViewMode,
    deleteLandingPage,
    createLandingPage,
    setDefaultLandingPage
  } = useApp();

  const [editingPage, setEditingPage] = useState<LandingPage | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Helper: find current default home page
  const currentHomePage = landingPages.find(p => p.isDefault) || landingPages[0];

  // Helper: count orders received from each landing page
  const getOrdersCountForPage = (pageId: string) => {
    return orders.filter(o => o.landingPageId === pageId).length;
  };

  const getRevenueForPage = (pageId: string) => {
    return orders
      .filter(o => o.landingPageId === pageId && o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.grandTotal, 0);
  };

  const handleOpenLive = (page: LandingPage) => {
    setActiveLandingPage(page);
    setViewMode('customer');
  };

  const handleSetDefault = async (page: LandingPage) => {
    try {
      setSettingDefaultId(page.id);
      await setDefaultLandingPage(page.id);
      setToastMessage(`"${page.title}" সফলভাবে ওয়েবসাইটের মূল হোমপেইজ হিসেবে নির্ধারণ করা হয়েছে!`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error('Failed to set default home page:', err);
      alert('হোমপেইজ পরিবর্তন করতে সমস্যা হয়েছে।');
    } finally {
      setSettingDefaultId(null);
    }
  };

  const handleClone = async (page: LandingPage) => {
    const clonedSlug = `${page.slug}-copy-${Math.floor(100 + Math.random() * 900)}`;
    const clonedPage: Partial<LandingPage> = {
      ...page,
      id: undefined,
      slug: clonedSlug,
      title: `${page.title} (কপি)`,
      heroTitle: `${page.heroTitle} (কপি)`
    };
    try {
      await createLandingPage(clonedPage);
    } catch (err) {
      console.error('Failed to clone landing page:', err);
    }
  };

  const handleDelete = async (pageId: string, pageTitle: string) => {
    if (landingPages.length <= 1) {
      alert('ন্যূনতম একটি অন-পেইজ অবশ্যই থাকতে হবে। এটি ডিলিট করা সম্ভব নয়।');
      return;
    }
    if (window.confirm(`আপনি কি সত্যিই "${pageTitle}" অন-পেইজটি ডিলিট করতে চান?`)) {
      try {
        await deleteLandingPage(pageId);
      } catch (err) {
        console.error('Failed to delete page:', err);
      }
    }
  };

  const handleCreateNewEcommerce = () => {
    const timestamp = Date.now();
    const newStore: LandingPage = {
      id: '',
      title: 'নতুন ই-কমার্স ফ্যাশন শপ',
      slug: `shop-${timestamp}`,
      pageType: 'ecommerce',
      brandName: 'AmarFashion',
      brandTagline: 'আধুনিক ট্রেন্ডি অনলাইন শপ',
      callNumber: '01606318193',
      themeColor: '#0f766e',
      showTopBanner: true,
      topBannerText: '🛍️ স্পেশাল মেগা ডিসকাউন্ট – ক্যাশ অন ডেলিভারিতে শপিং করুন!',
      heroTitle: 'অনলাইন শপিং স্টোর কালেকশন',
      ratingStars: '★★★★★',
      ratingCountText: '৫০০+ কাস্টমার রেটিং',
      mainImage: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80',
      galleryImages: [
        'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80'
      ],
      features: [
        '১০০% প্রিমিয়াম ও অরিজিনাল কোয়ালিটি পণ্য',
        'সরাসরি ক্যাশ অন ডেলিভারি (হাতে পেয়ে দেখে মূল্য পরিশোধ)',
        'পছন্দ না হলে সাথে সাথে রিটার্ন বা সাইজ এক্সচেঞ্জ সুবিধা'
      ],
      deliveryCharges: {
        isFreeDelivery: false,
        insideDhaka: 60,
        outsideDhaka: 120
      },
      facebookPixelId: '',
      countdown: {
        enabled: false,
        hours: 6,
        title: ''
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      storeCategories: ['সকল পণ্য', 'বোরকা ও আবায়া', 'পাঞ্জাবি', 'শাড়ি', 'হিজাব', 'অফার'],
      products: [
        {
          id: `prod-${timestamp}-1`,
          name: 'এক্সক্লুসিভ কাশ্মীরি আবায়া বোরকা',
          colorName: 'রয়েল ব্ল্যাক',
          price: 1850,
          oldPrice: 2450,
          image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80',
          category: 'বোরকা ও আবায়া',
          sizes: ['৩৮', '৪০', '৪২', '৪৪', '৪৬'],
          inStock: true,
          isFeatured: true,
          description: 'প্রিমিয়াম চেরি জর্জেট ফ্যাব্রিক, কুঁচি দেওয়া চমৎকার হাতার কাজ।'
        },
        {
          id: `prod-${timestamp}-2`,
          name: 'প্রিমিয়াম কটন সুতি পাঞ্জাবি',
          colorName: 'হোয়াইট সিল্কি',
          price: 1250,
          oldPrice: 1750,
          image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80',
          category: 'পাঞ্জাবি',
          sizes: ['৪০', '৪২', '৪৪'],
          inStock: true,
          isFeatured: true,
          description: '১০০% পিওর কটন ফেব্রিক, সফট কমফোর্ট ফিট।'
        }
      ]
    };
    setEditingPage(newStore);
  };

  if (editingPage || isCreatingNew) {
    return (
      <LandingPageEditor
        page={editingPage}
        onBack={() => {
          setEditingPage(null);
          setIsCreatingNew(false);
        }}
        onSaved={(savedPage) => {
          setEditingPage(savedPage);
          setIsCreatingNew(false);
          setToastMessage(`"${savedPage.title}" এর পিক্সেল ও সকল তথ্য সফলভাবে সংরক্ষিত হয়েছে!`);
          setTimeout(() => setToastMessage(null), 4000);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header bar */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-rose-600" />
            <span>অন-পেইজ ম্যানেজার (Landing Pages Builder)</span>
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            আপনার স্টোরে মোট <strong>{landingPages.length}</strong> টি সক্রিয় অন-পেইজ রয়েছে। যেকোনো অন-পেইজ বা ই-কমার্স স্টোরকে এক ক্লিকে প্রধান হোমপেইজ বানাতে পারেন।
          </p>

          <div className="mt-2.5 flex items-center gap-2 flex-wrap text-xs">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-semibold shadow-2xs">
              <Home className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>প্রধান হোমপেইজ:</span>
              <strong className="text-stone-900">{currentHomePage?.title}</strong>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200 text-amber-950 font-bold">
                {currentHomePage?.pageType === 'ecommerce' ? 'ই-কমার্স স্টোর' : 'অন-পেইজ'}
              </span>
            </div>
            <span className="text-stone-400 text-[11px]">• ওয়েবসাইটের মূল ঠিকানায় (/) সরাসরি এই পেইজটি লোড হবে</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleCreateNewEcommerce}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition shadow"
          >
            <Store className="w-4 h-4" />
            <span>নতুন ই-কমার্স শপ</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreatingNew(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন অন-পেইজ</span>
          </button>
        </div>
      </div>

      {/* Landing Pages Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {landingPages.map(page => {
          const ordersCount = getOrdersCountForPage(page.id);
          const totalRev = getRevenueForPage(page.id);

          return (
            <div
              key={page.id}
              className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Image Header & Badges */}
                <div className="relative h-44 bg-stone-100 overflow-hidden">
                  <img
                    src={page.mainImage || page.products[0]?.image}
                    alt={page.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30" />

                  <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                    {/* Default Home Page Badge */}
                    {page.isDefault && (
                      <span className="px-2.5 py-1 rounded-full bg-amber-400 text-stone-950 text-[10px] font-black shadow flex items-center gap-1 border border-amber-300">
                        <Home className="w-3 h-3 fill-stone-950 text-amber-400" />
                        প্রধান হোমপেইজ
                      </span>
                    )}

                    <span
                      className="px-2.5 py-1 rounded-full text-white text-[11px] font-bold shadow"
                      style={{ backgroundColor: page.themeColor || '#c0392b' }}
                    >
                      {page.brandName}
                    </span>

                    {/* Page Type Badge */}
                    {page.pageType === 'ecommerce' ? (
                      <span className="px-2.5 py-1 rounded-full bg-teal-600 text-white text-[10px] font-bold shadow flex items-center gap-1">
                        <Store className="w-3 h-3" />
                        ই-কমার্স শপ
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-rose-700 text-white text-[10px] font-bold shadow flex items-center gap-1">
                        <ShoppingBag className="w-3 h-3" />
                        অন-পেইজ
                      </span>
                    )}

                    {page.deliveryCharges?.isFreeDelivery ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold shadow">
                        ফ্রি ডেলিভারি
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-stone-800/80 text-stone-200 text-[10px] font-medium backdrop-blur-xs">
                        ডেলিভারি: {page.deliveryCharges?.insideDhaka || 60}৳ / {page.deliveryCharges?.outsideDhaka || 120}৳
                      </span>
                    )}
                  </div>

                  {/* Top-Right Integrations Badges */}
                  <div className="absolute top-3 right-3 flex items-center gap-1">
                    {page.googleSheetConfig?.enabled && (
                      <span
                        className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-bold shadow flex items-center gap-1"
                        title="গুগল শিট সংযুক্ত"
                      >
                        <FileSpreadsheet className="w-2.5 h-2.5" />
                        শিট
                      </span>
                    )}
                    {page.smsTemplates?.enabled && (
                      <span
                        className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-bold shadow flex items-center gap-1"
                        title="কাস্টম SMS টেমপ্লেট সক্রিয়"
                      >
                        <MessageSquare className="w-2.5 h-2.5" />
                        SMS
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <h3 className="font-bold text-base sm:text-lg leading-snug line-clamp-1">
                      {page.title}
                    </h3>
                    <p className="text-[11px] text-white/80 font-mono mt-0.5">
                      /{page.slug}
                    </p>
                  </div>
                </div>

                {/* Body Details */}
                <div className="p-4 space-y-3">
                  {/* Products & Price preview */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-stone-600 font-medium">
                      <ShoppingBag className="w-3.5 h-3.5 text-stone-400" />
                      <span>{page.products.length} টি পণ্য / ভ্যারিয়েন্ট</span>
                    </div>
                    {page.products.length > 0 && (
                      <div className="font-bold text-rose-700">
                        মূল্য: {page.products[0].price}৳
                        {page.products[0].oldPrice > page.products[0].price && (
                          <span className="text-[11px] text-stone-400 line-through ml-1 font-normal">
                            {page.products[0].oldPrice}৳
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Orders & Revenue Metrics for this page */}
                  <div className="grid grid-cols-2 gap-2 bg-stone-50 p-2.5 rounded-xl border border-stone-100 text-xs">
                    <div>
                      <span className="text-stone-400 block text-[10px]">এই পেজ থেকে অর্ডার:</span>
                      <strong className="text-stone-900 text-sm">{ordersCount} টি</strong>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px]">মোট বিক্রি:</span>
                      <strong className="text-emerald-700 text-sm">{totalRev}৳</strong>
                    </div>
                  </div>

                  {/* Pixel ID info */}
                  <div className="text-[11px] text-stone-500 truncate">
                    পিক্সেল আইডি: <span className="font-mono font-semibold text-stone-700">{page.facebookPixelId || 'গ্লোবাল পিক্সেল'}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="p-3 bg-stone-50 border-t border-stone-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenLive(page)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>লাইভ দেখুন</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingPage(page)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white hover:bg-stone-100 border border-stone-300 text-stone-700 text-xs font-bold transition"
                  >
                    <Edit className="w-3.5 h-3.5 text-stone-500" />
                    <span>এডিট করুন</span>
                  </button>

                  {/* Home Page Status / Set as Home Action */}
                  {page.isDefault ? (
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-100 border border-amber-300 text-amber-950 text-xs font-bold shadow-2xs"
                      title="এই পেইজটি বর্তমানে আপনার ওয়েবসাইটের প্রধান হোমপেইজ"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>প্রধান হোমপেইজ</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(page)}
                      disabled={settingDefaultId === page.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold transition shadow-2xs disabled:opacity-50"
                      title="এই পেইজটিকে ওয়েবসাইটের প্রধান হোমপেইজ হিসেবে সেট করুন"
                    >
                      <Home className="w-3.5 h-3.5 text-amber-700" />
                      <span>{settingDefaultId === page.id ? 'সেট হচ্ছে...' : 'হোমপেইজ বানান'}</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleClone(page)}
                    className="p-1.5 text-stone-500 hover:text-stone-800 rounded-lg hover:bg-stone-200"
                    title="ডুপ্লিকেট / ক্লোন করুন"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(page.id, page.title)}
                    className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-stone-200"
                    title="মুছে ফেলুন"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
