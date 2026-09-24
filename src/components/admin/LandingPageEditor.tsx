import { useState, useEffect, FormEvent } from 'react';
import { LandingPage, ProductVariant, GoogleSheetConfig, PageType, VariantOptionField } from '../../types.ts';
import { useApp } from '../../context/AppContext.tsx';
import { api } from '../../services/api.ts';
import {
  Save,
  ArrowLeft,
  Plus,
  Trash2,
  Image as ImageIcon,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  Percent,
  Clock,
  FileSpreadsheet,
  ExternalLink,
  Copy,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShoppingBag,
  Store,
  MessageSquare,
  Tag,
  Star,
  Sliders,
  Type,
  Home,
  Activity,
  ShieldCheck,
  Key,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

interface LandingPageEditorProps {
  page?: LandingPage | null; // null if creating a new one
  onBack: () => void;
  onSaved: (savedPage: LandingPage) => void;
}

export default function LandingPageEditor({ page, onBack, onSaved }: LandingPageEditorProps) {
  const { createLandingPage, updateLandingPage, setActiveLandingPage, setViewMode } = useApp();

  const isEditing = !!page;

  // Page Type: 'landing' (single-product high-converting) vs 'ecommerce' (full multi-product shop with cart)
  const [pageType, setPageType] = useState<PageType>(page?.pageType || 'landing');
  const [storeCategories, setStoreCategories] = useState<string[]>(
    page?.storeCategories || ['সকল পণ্য', 'বোরকা ও আবায়া', 'পাঞ্জাবি', 'শাড়ি', 'হিজাব', 'অফার']
  );
  const [newCategoryInput, setNewCategoryInput] = useState('');

  // Page-specific SMS Templates
  const [smsTemplatesEnabled, setSmsTemplatesEnabled] = useState(page?.smsTemplates?.enabled ?? false);
  const [smsSenderId, setSmsSenderId] = useState(page?.smsTemplates?.senderId || '');
  const [smsOrderReceived, setSmsOrderReceived] = useState(
    page?.smsTemplates?.orderReceived || 'প্রিয় {customer_name}, {brand_name}-এ আপনার অর্ডার #{order_id} গ্রহণ করা হয়েছে। মোট বিল: {total}৳।'
  );
  const [smsOrderConfirmed, setSmsOrderConfirmed] = useState(
    page?.smsTemplates?.orderConfirmed || 'প্রিয় {customer_name}, আপনার অর্ডার #{order_id} নিশ্চিত করা হয়েছে। খুব শীঘ্রই পার্সেল পাঠানো হবে। ধন্যবাদ - {brand_name}'
  );
  const [smsCourierDispatched, setSmsCourierDispatched] = useState(
    page?.smsTemplates?.courierDispatched || 'প্রিয় {customer_name}, আপনার পার্সেলটি {courier_name} কুরিয়ারে বুকিং সম্পন্ন হয়েছে। ট্র্যাকিং কোড: {tracking_code}। - {brand_name}'
  );
  const [smsDelivered, setSmsDelivered] = useState(
    page?.smsTemplates?.delivered || 'প্রিয় {customer_name}, আপনার অর্ডার #{order_id} সফলভাবে ডেলিভারি হয়েছে। আমাদের সাথে থাকার জন্য ধন্যবাদ! - {brand_name}'
  );

  // Form states
  const [title, setTitle] = useState(page?.title || 'নতুন প্রোডাক্ট ল্যান্ডিং পেইজ');
  const [slug, setSlug] = useState(page?.slug || `page-${Date.now()}`);
  const [brandName, setBrandName] = useState(page?.brandName || 'AmarChoice');
  const [brandTagline, setBrandTagline] = useState(page?.brandTagline || 'AmarChoice – প্রিমিয়াম বাংলাদেশি কালেকশন');
  const [callNumber, setCallNumber] = useState(page?.callNumber || '01606318193');
  const [themeColor, setThemeColor] = useState(page?.themeColor || '#c0392b');
  const [isDefault, setIsDefault] = useState<boolean>(page?.isDefault ?? false);

  // Announcement Banner
  const [showTopBanner, setShowTopBanner] = useState(page ? page.showTopBanner : true);
  const [topBannerText, setTopBannerText] = useState(
    page?.topBannerText || '🎉 স্পেশাল অফার – সীমিত সময়ের জন্য ৫০% ছাড়! দ্রুত অর্ডার করুন!'
  );

  // Hero & Gallery
  const [heroTitle, setHeroTitle] = useState(page?.heroTitle || page?.title || 'স্পেশাল প্রিমিয়াম কালেকশন');
  const [ratingStars, setRatingStars] = useState(page?.ratingStars || '★★★★★');
  const [ratingCountText, setRatingCountText] = useState(page?.ratingCountText || '৩২৬+ কাস্টমার সন্তুষ্ট');
  const [mainImage, setMainImage] = useState(
    page?.mainImage || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&q=80'
  );
  const [galleryImages, setGalleryImages] = useState<string[]>(
    page?.galleryImages || [
      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&q=80',
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80'
    ]
  );
  const [newGalleryImgInput, setNewGalleryImgInput] = useState('');

  // Features
  const [features, setFeatures] = useState<string[]>(
    page?.features || [
      '১০০% প্রিমিয়াম কোয়ালিটি ফেব্রিক – অত্যন্ত আরামদায়ক ও মানসম্মত',
      'গলায় ও হাতায় চমৎকার ও নিখুঁত ফিনিশিং',
      'সাইজ: ৩৮ থেকে ৪৬ পর্যন্ত সাইজ উপলব্ধ',
      'পণ্য হাতে পেয়ে দেখে মূল্য পরিশোধ করার সুবিধা (ক্যাশ অন ডেলিভারি)',
      'পছন্দ না হলে সাথে সাথে রিটার্ন বা সাইজ এক্সচেঞ্জ সুবিধা'
    ]
  );
  const [newFeatureInput, setNewFeatureInput] = useState('');

  // Countdown
  const [countdownEnabled, setCountdownEnabled] = useState(page?.countdown?.enabled ?? true);
  const [countdownHours, setCountdownHours] = useState(page?.countdown?.hours ?? 6);
  const [countdownTitle, setCountdownTitle] = useState(
    page?.countdown?.title || '⏰ অফার শেষ হওয়ার আগেই অর্ডার করুন!'
  );

  // Delivery Charges
  const [isFreeDelivery, setIsFreeDelivery] = useState(page?.deliveryCharges?.isFreeDelivery ?? false);
  const [insideDhaka, setInsideDhaka] = useState(page?.deliveryCharges?.insideDhaka ?? 60);
  const [outsideDhaka, setOutsideDhaka] = useState(page?.deliveryCharges?.outsideDhaka ?? 120);

  // Pixel & Conversion API (Meta & TikTok)
  const [metaPixelEnabled, setMetaPixelEnabled] = useState(
    page?.metaPixelEnabled ?? (Boolean(page?.facebookPixelId || page?.metaCapiToken))
  );
  const [facebookPixelId, setFacebookPixelId] = useState(page?.facebookPixelId || '');
  const [metaCapiToken, setMetaCapiToken] = useState(page?.metaCapiToken || '');
  const [metaTestCode, setMetaTestCode] = useState(page?.metaTestCode || '');
  const [showMetaToken, setShowMetaToken] = useState(false);

  const [tiktokPixelEnabled, setTiktokPixelEnabled] = useState(
    page?.tiktokPixelEnabled ?? (Boolean(page?.tiktokPixelId || page?.tiktokCapiToken))
  );
  const [tiktokPixelId, setTiktokPixelId] = useState(page?.tiktokPixelId || '');
  const [tiktokCapiToken, setTiktokCapiToken] = useState(page?.tiktokCapiToken || '');
  const [tiktokTestCode, setTiktokTestCode] = useState(page?.tiktokTestCode || '');
  const [showTiktokToken, setShowTiktokToken] = useState(false);
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<string | null>(null);

  // Synchronize state when editing page changes or loads
  useEffect(() => {
    if (page) {
      if (page.facebookPixelId !== undefined) setFacebookPixelId(page.facebookPixelId || '');
      if (page.metaCapiToken !== undefined) setMetaCapiToken(page.metaCapiToken || '');
      if (page.metaTestCode !== undefined) setMetaTestCode(page.metaTestCode || '');
      setMetaPixelEnabled(page.metaPixelEnabled ?? Boolean(page.facebookPixelId || page.metaCapiToken));

      if (page.tiktokPixelId !== undefined) setTiktokPixelId(page.tiktokPixelId || '');
      if (page.tiktokCapiToken !== undefined) setTiktokCapiToken(page.tiktokCapiToken || '');
      if (page.tiktokTestCode !== undefined) setTiktokTestCode(page.tiktokTestCode || '');
      setTiktokPixelEnabled(page.tiktokPixelEnabled ?? Boolean(page.tiktokPixelId || page.tiktokCapiToken));
    }
  }, [page?.id, page?.updatedAt]);

  // Google Sheets Integration (Optional per landing page)
  const [googleSheetEnabled, setGoogleSheetEnabled] = useState(
    page?.googleSheetConfig?.enabled ?? false
  );
  const [googleSheetWebhookUrl, setGoogleSheetWebhookUrl] = useState(
    page?.googleSheetConfig?.webhookUrl || ''
  );
  const [googleSheetName, setGoogleSheetName] = useState(
    page?.googleSheetConfig?.sheetName || 'Orders'
  );
  const [isTestingSheet, setIsTestingSheet] = useState(false);
  const [sheetTestResult, setSheetTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncAllResult, setSyncAllResult] = useState<{ success: boolean; message: string } | null>(null);

  // Products / Variants
  const [products, setProducts] = useState<ProductVariant[]>(
    page?.products || [
      {
        id: `prod-${Date.now()}-1`,
        name: 'রয়্যাল ব্লু (Royal Blue)',
        colorName: 'রয়্যাল ব্লু',
        price: 999,
        oldPrice: 1650,
        image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80',
        sizes: ['৩৮', '৪০', '৪২', '৪৪', '৪৬'],
        inStock: true,
        colorCode: '#1e3a8a'
      }
    ]
  );

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Variant editing helpers
  const handleAddVariant = () => {
    const defaultFields: VariantOptionField[] = products[0]?.customFields && products[0].customFields.length > 0
      ? JSON.parse(JSON.stringify(products[0].customFields))
      : [
          {
            id: `field_size_${Date.now()}`,
            label: 'বডি সাইজ (Body Size):',
            options: ['৩৮', '৪০', '৪২', '৪৪']
          },
          {
            id: `field_long_${Date.now()}`,
            label: 'লং / ঝুল সাইজ (Long Size):',
            options: ['৪০', '৪২', '৪৪', '৪৬']
          }
        ];

    const newVariant: ProductVariant = {
      id: `prod-${Date.now()}`,
      name: `নতুন কালার / ভ্যারিয়েন্ট ${products.length + 1}`,
      colorName: 'স্ট্যান্ডার্ড',
      price: products[0]?.price || 999,
      oldPrice: products[0]?.oldPrice || 1650,
      image: products[0]?.image || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80',
      images: [products[0]?.image || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80'],
      customFields: defaultFields,
      sizes: defaultFields[0]?.options || ['৩৮', '৪০', '৪২', '৪৪'],
      hasLong: !!defaultFields[1],
      longSizes: defaultFields[1]?.options || ['৪০', '৪২', '৪৪', '৪৬'],
      inStock: true
    };
    setProducts([...products, newVariant]);
  };

  const handleUpdateVariant = (idx: number, field: keyof ProductVariant, value: unknown) => {
    const updated = [...products];
    updated[idx] = { ...updated[idx], [field]: value };
    setProducts(updated);
  };

  const handleRemoveVariant = (idx: number) => {
    if (products.length <= 1) {
      alert('কমপক্ষে একটি পণ্য বা ভ্যারিয়েন্ট থাকতে হবে।');
      return;
    }
    setProducts(products.filter((_, i) => i !== idx));
  };

  // Helper to get all custom variant fields for a product, falling back to legacy sizes & longSizes
  const getProductCustomFields = (prod: ProductVariant): VariantOptionField[] => {
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
  };

  // Add a new dynamic field to a variant
  const handleAddCustomField = (variantIdx: number, customLabel?: string, defaultOptions?: string[]) => {
    const updated = [...products];
    const currentFields = [...getProductCustomFields(updated[variantIdx])];
    const newField: VariantOptionField = {
      id: `field_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label: customLabel || (currentFields.length === 0 ? 'বডি সাইজ (Body Size):' : `ফিল্ড #${currentFields.length + 1}:`),
      options: defaultOptions || []
    };
    currentFields.push(newField);
    updated[variantIdx].customFields = currentFields;

    // Sync legacy sizes/longSizes for backward compatibility
    if (currentFields[0]) {
      updated[variantIdx].sizes = [...currentFields[0].options];
    }
    if (currentFields[1]) {
      updated[variantIdx].longSizes = [...currentFields[1].options];
      updated[variantIdx].hasLong = true;
    } else {
      updated[variantIdx].hasLong = false;
    }

    setProducts(updated);
  };

  // Remove a dynamic field from a variant
  const handleRemoveCustomField = (variantIdx: number, fieldIdx: number) => {
    const updated = [...products];
    const currentFields = [...getProductCustomFields(updated[variantIdx])];
    currentFields.splice(fieldIdx, 1);
    updated[variantIdx].customFields = currentFields;

    // Sync legacy
    if (currentFields[0]) {
      updated[variantIdx].sizes = [...currentFields[0].options];
    } else {
      updated[variantIdx].sizes = [];
    }
    if (currentFields[1]) {
      updated[variantIdx].longSizes = [...currentFields[1].options];
      updated[variantIdx].hasLong = true;
    } else {
      updated[variantIdx].longSizes = [];
      updated[variantIdx].hasLong = false;
    }

    setProducts(updated);
  };

  // Update a field's title/label (e.g. change "বডি সাইজ (Body Size):" to "কলার সাইজ:")
  const handleUpdateFieldLabel = (variantIdx: number, fieldIdx: number, newLabel: string) => {
    const updated = [...products];
    const currentFields = [...getProductCustomFields(updated[variantIdx])];
    if (currentFields[fieldIdx]) {
      currentFields[fieldIdx].label = newLabel;
      updated[variantIdx].customFields = currentFields;
      setProducts(updated);
    }
  };

  // Add an option tag/pill to a specific field
  const handleAddOptionToField = (variantIdx: number, fieldIdx: number, optionVal: string) => {
    if (!optionVal.trim()) return;
    const updated = [...products];
    const currentFields = [...getProductCustomFields(updated[variantIdx])];
    if (currentFields[fieldIdx]) {
      const trimmed = optionVal.trim();
      if (!currentFields[fieldIdx].options.includes(trimmed)) {
        currentFields[fieldIdx].options = [...currentFields[fieldIdx].options, trimmed];
        updated[variantIdx].customFields = currentFields;

        // Sync legacy sizes/longSizes
        if (fieldIdx === 0) {
          updated[variantIdx].sizes = [...currentFields[0].options];
        } else if (fieldIdx === 1) {
          updated[variantIdx].longSizes = [...currentFields[1].options];
        }
        setProducts(updated);
      }
    }
  };

  // Remove an option tag/pill from a specific field
  const handleRemoveOptionFromField = (variantIdx: number, fieldIdx: number, optionVal: string) => {
    const updated = [...products];
    const currentFields = [...getProductCustomFields(updated[variantIdx])];
    if (currentFields[fieldIdx]) {
      currentFields[fieldIdx].options = currentFields[fieldIdx].options.filter(o => o !== optionVal);
      updated[variantIdx].customFields = currentFields;

      // Sync legacy sizes/longSizes
      if (fieldIdx === 0) {
        updated[variantIdx].sizes = [...currentFields[0].options];
      } else if (fieldIdx === 1) {
        updated[variantIdx].longSizes = [...currentFields[1].options];
      }
      setProducts(updated);
    }
  };

  const handleAddSizeToVariant = (variantIdx: number, sizeTag: string) => {
    if (!sizeTag.trim()) return;
    const updated = [...products];
    if (!updated[variantIdx].sizes.includes(sizeTag.trim())) {
      updated[variantIdx].sizes.push(sizeTag.trim());
      setProducts(updated);
    }
  };

  const handleRemoveSizeFromVariant = (variantIdx: number, sizeTag: string) => {
    const updated = [...products];
    updated[variantIdx].sizes = updated[variantIdx].sizes.filter(s => s !== sizeTag);
    setProducts(updated);
  };

  const handleAddLongSizeToVariant = (variantIdx: number, longTag: string) => {
    if (!longTag.trim()) return;
    const updated = [...products];
    const currentLongs = updated[variantIdx].longSizes || [];
    if (!currentLongs.includes(longTag.trim())) {
      updated[variantIdx].longSizes = [...currentLongs, longTag.trim()];
      setProducts(updated);
    }
  };

  const handleRemoveLongSizeFromVariant = (variantIdx: number, longTag: string) => {
    const updated = [...products];
    const currentLongs = updated[variantIdx].longSizes || [];
    updated[variantIdx].longSizes = currentLongs.filter(s => s !== longTag);
    setProducts(updated);
  };

  // Feature list helpers
  const handleAddFeature = () => {
    if (newFeatureInput.trim()) {
      setFeatures([...features, newFeatureInput.trim()]);
      setNewFeatureInput('');
    }
  };

  const handleRemoveFeature = (idx: number) => {
    setFeatures(features.filter((_, i) => i !== idx));
  };

  // Gallery image helpers
  const handleAddGalleryImage = () => {
    if (newGalleryImgInput.trim()) {
      setGalleryImages([...galleryImages, newGalleryImgInput.trim()]);
      setNewGalleryImgInput('');
    }
  };

  const handleRemoveGalleryImage = (idx: number) => {
    setGalleryImages(galleryImages.filter((_, i) => i !== idx));
  };

  // Save form
  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) {
      alert('শিরোনাম ও URL স্লাগ পূরণ করুন।');
      return;
    }

    if (products.length === 0) {
      alert('কমপক্ষে একটি পণ্য যুক্ত করুন।');
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);

    const payload: Partial<LandingPage> = {
      pageType,
      storeCategories: pageType === 'ecommerce' ? storeCategories : undefined,
      title: title.trim(),
      slug: slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
      brandName: brandName.trim(),
      brandTagline: brandTagline.trim(),
      callNumber: callNumber.trim(),
      themeColor,
      isDefault,
      showTopBanner,
      topBannerText: topBannerText.trim(),
      heroTitle: heroTitle.trim(),
      ratingStars,
      ratingCountText,
      mainImage: mainImage || products[0]?.image,
      galleryImages: galleryImages.length > 0 ? galleryImages : [mainImage || products[0]?.image],
      features,
      countdown: {
        enabled: countdownEnabled,
        hours: Number(countdownHours) || 6,
        title: countdownTitle
      },
      deliveryCharges: {
        isFreeDelivery,
        insideDhaka: Number(insideDhaka) || 60,
        outsideDhaka: Number(outsideDhaka) || 120
      },
      metaPixelEnabled,
      facebookPixelId: facebookPixelId.trim(),
      metaCapiToken: metaCapiToken.trim(),
      metaTestCode: metaTestCode.trim(),
      tiktokPixelEnabled,
      tiktokPixelId: tiktokPixelId.trim(),
      tiktokCapiToken: tiktokCapiToken.trim(),
      tiktokTestCode: tiktokTestCode.trim(),
      googleSheetConfig: {
        enabled: googleSheetEnabled,
        webhookUrl: googleSheetWebhookUrl.trim(),
        sheetName: googleSheetName.trim() || 'Orders',
        lastSyncedAt: page?.googleSheetConfig?.lastSyncedAt
      },
      smsTemplates: {
        enabled: smsTemplatesEnabled,
        senderId: smsSenderId.trim(),
        orderReceived: smsOrderReceived.trim(),
        orderConfirmed: smsOrderConfirmed.trim(),
        courierDispatched: smsCourierDispatched.trim(),
        delivered: smsDelivered.trim()
      },
      products
    };

    try {
      let saved: LandingPage;
      if (isEditing && page) {
        saved = await updateLandingPage(page.id, payload);
      } else {
        saved = await createLandingPage(payload);
      }

      // Update local state with saved page so no inputs are wiped out!
      setFacebookPixelId(saved.facebookPixelId || '');
      setMetaCapiToken(saved.metaCapiToken || '');
      setMetaTestCode(saved.metaTestCode || '');
      setMetaPixelEnabled(saved.metaPixelEnabled ?? Boolean(saved.facebookPixelId || saved.metaCapiToken));

      setTiktokPixelId(saved.tiktokPixelId || '');
      setTiktokCapiToken(saved.tiktokCapiToken || '');
      setTiktokTestCode(saved.tiktokTestCode || '');
      setTiktokPixelEnabled(saved.tiktokPixelEnabled ?? Boolean(saved.tiktokPixelId || saved.tiktokCapiToken));

      const now = new Date();
      const timeStr = now.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSavedTimestamp(timeStr);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 5000);
      onSaved(saved);
    } catch (err) {
      console.error('Save page error:', err);
      alert('পেইজ সংরক্ষণ করতে সমস্যা হয়েছে।');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestSheet = async () => {
    if (!googleSheetWebhookUrl.trim()) {
      alert('অনুগ্রহ করে প্রথমে আপনার Google Sheet Web App URL টি প্রদান করুন');
      return;
    }
    try {
      setIsTestingSheet(true);
      setSheetTestResult(null);
      const res = await api.testGoogleSheet(page?.id || 'temp', googleSheetWebhookUrl.trim(), googleSheetName);
      setSheetTestResult({ success: true, message: res.message || 'গুগল শিটে টেস্ট রো সফলভাবে যুক্ত হয়েছে!' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'টেস্ট ডেটা পাঠানো ব্যর্থ হয়েছে';
      setSheetTestResult({ success: false, message: msg });
    } finally {
      setIsTestingSheet(false);
    }
  };

  const handleSyncAllOrders = async () => {
    if (!page?.id) {
      alert('আগে ল্যান্ডিং পেইজটি সেভ করুন, এরপর সিঙ্ক করতে পারবেন।');
      return;
    }
    if (!googleSheetWebhookUrl.trim()) {
      alert('অনুগ্রহ করে প্রথমে Google Sheet Web App URL দিন এবং পেইজটি সেভ করুন');
      return;
    }
    try {
      setIsSyncingAll(true);
      setSyncAllResult(null);
      const res = await api.syncAllOrdersToSheet(page.id);
      setSyncAllResult({ success: true, message: res.message });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'সিঙ্ক করা ব্যর্থ হয়েছে';
      setSyncAllResult({ success: false, message: msg });
    } finally {
      setIsSyncingAll(false);
    }
  };

  const googleAppsScriptCode = `// ==========================================
// AmarChoice Landing Page -> Google Sheet Script
// ==========================================
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);

    // অটোমেটিক হেডার রো তৈরি (যদি শিট নতুন থাকে)
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "অর্ডার আইডি", "তারিখ ও সময়", "অন-পেইজ নাম", "কাস্টমার নাম",
        "মোবাইল নাম্বার", "সম্পূর্ণ ঠিকানা", "পণ্য বিবরণ", "মোট পরিমাণ",
        "সাবটোটাল (৳)", "ডেলিভারি চার্জ (৳)", "সর্বমোট মূল্য (৳)", "অর্ডার স্ট্যাটাস", "নোট"
      ]);
      sheet.getRange(1, 1, 1, 13).setFontWeight("bold").setBackground("#e2e8f0");
    }

    // নতুন অর্ডারের রো অ্যাপেন্ড করুন
    sheet.appendRow([
      data.orderId || "",
      data.dateTime || new Date().toLocaleString("bn-BD"),
      data.landingPageTitle || "",
      data.customerName || "",
      data.customerPhone || "",
      data.customerAddress || "",
      data.productsSummary || "",
      data.totalQuantity || 1,
      data.subtotal || 0,
      data.deliveryCharge || 0,
      data.grandTotal || 0,
      data.status || "pending",
      data.notes || ""
    ]);

    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(googleAppsScriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  const previewLive = () => {
    if (page) {
      setActiveLandingPage(page);
      setViewMode('customer');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-sm sticky top-16 z-30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 text-stone-500 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition"
            title="ফিরে যান"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-stone-900">
              {isEditing ? `অন-পেইজ এডিট: ${page?.title}` : 'নতুন অন-পেইজ তৈরি করুন'}
            </h2>
            <p className="text-xs text-stone-500">
              এই অন-পেইজের সকল তথ্য, পণ্য, ডেলিভারি চার্জ ও ফেসবুক পিক্সেল কাস্টমাইজ করুন
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditing && (
            <button
              type="button"
              onClick={previewLive}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition border border-stone-300"
            >
              <Eye className="w-4 h-4 text-emerald-600" />
              <span>লাইভ প্রিভিউ</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'সংরক্ষণ হচ্ছে...' : 'সেভ ও প্রকাশ করুন'}</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-400 rounded-2xl text-emerald-950 text-xs shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-black text-emerald-900">
                অন-পেইজের সকল তথ্য ও পিক্সেল/CAPI ডাটা সফলভাবে ডাটাবেজে সেভ হয়েছে!
              </p>
              <p className="text-xs text-emerald-700 font-medium">
                {lastSavedTimestamp ? `শেষ সেভ করা হয়েছে: ${lastSavedTimestamp} | ` : ''}
                আপনার দেয়া পিক্সেল আইডি ও টোকেন মেমরিতে অক্ষত আছে এবং কোনো ফিল্ড খালি হবে না।
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="self-end sm:self-auto px-4 py-2 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold transition shadow-xs whitespace-nowrap"
          >
            ← পেইজ তালিকায় যান
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* PAGE TYPE SELECTOR (Landing Page vs E-Commerce Store) */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
            <Store className="w-5 h-5 text-rose-600" />
            <div>
              <h3 className="font-bold text-sm text-stone-900 uppercase tracking-wide">
                পেইজের ধরন নির্বাচন করুন (Page Type Mode)
              </h3>
              <p className="text-xs text-stone-500">
                আপনি কি সিঙ্গেল প্রোডাক্টের ল্যান্ডিং পেজ তৈরি করতে চান নাকি সম্পূর্ণ মাল্টি-প্রোডাক্ট ই-কমার্স শপ?
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Landing Page Option */}
            <div
              onClick={() => setPageType('landing')}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition flex gap-3.5 items-start ${
                pageType === 'landing'
                  ? 'border-rose-600 bg-rose-50/40 shadow-xs'
                  : 'border-stone-200 bg-stone-50 hover:bg-white hover:border-stone-300'
              }`}
            >
              <div
                className={`p-2.5 rounded-xl shrink-0 ${
                  pageType === 'landing' ? 'bg-rose-600 text-white' : 'bg-stone-200 text-stone-600'
                }`}
              >
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-stone-900">
                    সিঙ্গেল প্রোডাক্ট অন-পেইজ (Landing Page)
                  </h4>
                  {pageType === 'landing' && (
                    <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      সক্রিয়
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500 leading-relaxed">
                  নির্দিষ্ট একটি পণ্য বা স্পেশাল কালেকশনের জন্য হাই-কনভার্টিং ল্যান্ডিং পেইজ। ইমেজ স্লাইডার, অফার কাউন্টডাউন এবং সরাসরি ক্যাশ অন ডেলিভারি ফর্ম।
                </p>
              </div>
            </div>

            {/* E-Commerce Store Option */}
            <div
              onClick={() => setPageType('ecommerce')}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition flex gap-3.5 items-start ${
                pageType === 'ecommerce'
                  ? 'border-teal-600 bg-teal-50/40 shadow-xs'
                  : 'border-stone-200 bg-stone-50 hover:bg-white hover:border-stone-300'
              }`}
            >
              <div
                className={`p-2.5 rounded-xl shrink-0 ${
                  pageType === 'ecommerce' ? 'bg-teal-600 text-white' : 'bg-stone-200 text-stone-600'
                }`}
              >
                <Store className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-stone-900">
                    মাল্টি-প্রোডাক্ট ই-কমার্স ওয়েবসাইট (E-Commerce Store)
                  </h4>
                  {pageType === 'ecommerce' && (
                    <span className="bg-teal-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      সক্রিয়
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500 leading-relaxed">
                  সম্পূর্ণ আধুনিক অনলাইন শপ। একাধিক পণ্য, ক্যাটাগরি ফিল্টার, লাইভ সার্চ, ডাইনামিক শপিং কার্ট এবং একাধিক পণ্য একসাথে বা ১-ক্লিকে অর্ডারের সুবিধা।
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* E-COMMERCE STORE CATEGORIES MANAGER (Only if pageType === 'ecommerce') */}
        {pageType === 'ecommerce' && (
          <div className="bg-white rounded-2xl p-5 border border-teal-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-teal-600" />
                <div>
                  <h3 className="font-bold text-sm text-stone-900 uppercase tracking-wide">
                    ই-কমার্স ক্যাটাগরি ব্যবস্থাপনা (Store Categories)
                  </h3>
                  <p className="text-xs text-stone-500">
                    আপনার অনলাইন স্টোরের জন্য ক্যাটাগরি যুক্ত বা পরিবর্তন করুন
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex flex-wrap gap-2">
                {storeCategories.map(cat => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 font-bold text-xs"
                  >
                    <span>{cat}</span>
                    {cat !== 'সকল পণ্য' && (
                      <button
                        type="button"
                        onClick={() => setStoreCategories(storeCategories.filter(c => c !== cat))}
                        className="text-teal-600 hover:text-rose-600 font-black ml-1"
                        title="ক্যাটাগরি মুছুন"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-1 max-w-md">
                <input
                  type="text"
                  value={newCategoryInput}
                  onChange={e => setNewCategoryInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newCategoryInput.trim() && !storeCategories.includes(newCategoryInput.trim())) {
                        setStoreCategories([...storeCategories, newCategoryInput.trim()]);
                        setNewCategoryInput('');
                      }
                    }
                  }}
                  placeholder="নতুন ক্যাটাগরি নাম (যেমন: জুয়েলারি, ঘড়ি, টি-শার্ট)..."
                  className="flex-1 px-3 py-1.5 border border-stone-300 rounded-xl bg-stone-50 focus:bg-white text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newCategoryInput.trim() && !storeCategories.includes(newCategoryInput.trim())) {
                      setStoreCategories([...storeCategories, newCategoryInput.trim()]);
                      setNewCategoryInput('');
                    }
                  }}
                  className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs"
                >
                  যোগ করুন
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 1: BASIC PAGE INFO */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
            <Sparkles className="w-4 h-4 text-rose-600" />
            <h3 className="font-bold text-sm text-stone-800 uppercase tracking-wide">
              মৌলিক তথ্য ও ব্র্যান্ডিং (Basic Info & Branding)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Set as Default Home Page Toggle Card */}
            <div className="sm:col-span-2 p-4 rounded-2xl border-2 border-amber-200 bg-amber-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500 text-stone-950 shrink-0">
                  <Home className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-stone-900">
                      এই পেইজটি ওয়েবসাইটের প্রধান হোমপেইজ হিসেবে সেট করুন
                    </h4>
                    {isDefault && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-950 font-bold text-[10px]">
                        সক্রিয় হোমপেইজ
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-600 mt-0.5">
                    চালু রাখলে, ক্রেতারা কোনো স্লাগ ছাড়াই সরাসরি মূল ডোমেইনে (/) আসলে এই {pageType === 'ecommerce' ? 'ই-কমার্স শপ' : 'অন-পেইজ'}টি দেখতে পাবেন।
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={e => setIsDefault(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">
                অন-পেইজ শিরোনাম (Page Title) <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="যেমন: মায়াবতী ড্রেস – প্রিমিয়াম কালেকশন"
                className="w-full px-3.5 py-2 border border-stone-300 rounded-xl bg-stone-50 focus:bg-white focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">
                URL স্লাগ (Slug) <span className="text-rose-600">*</span>
              </label>
              <div className="flex items-center">
                <span className="px-3 py-2 bg-stone-100 border border-r-0 border-stone-300 rounded-l-xl text-stone-500 font-mono">
                  /
                </span>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={e => setSlug(e.target.value)}
                  placeholder="mayaboti-dress"
                  className="w-full px-3.5 py-2 border border-stone-300 rounded-r-xl bg-stone-50 focus:bg-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">ব্র্যান্ডের নাম (Brand Name)</label>
              <input
                type="text"
                value={brandName}
                onChange={e => setBrandName(e.target.value)}
                placeholder="AmarChoice"
                className="w-full px-3.5 py-2 border border-stone-300 rounded-xl bg-stone-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">ট্যাগলাইন (Brand Tagline)</label>
              <input
                type="text"
                value={brandTagline}
                onChange={e => setBrandTagline(e.target.value)}
                placeholder="AmarChoice – প্রিমিয়াম বাংলাদেশি পোশাক"
                className="w-full px-3.5 py-2 border border-stone-300 rounded-xl bg-stone-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">হটলাইন / কল নাম্বার (Call Button)</label>
              <input
                type="text"
                value={callNumber}
                onChange={e => setCallNumber(e.target.value)}
                placeholder="01606318193"
                className="w-full px-3.5 py-2 border border-stone-300 rounded-xl bg-stone-50 focus:bg-white font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">থিম অ্যাকসেন্ট কালার (Theme Color)</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={themeColor}
                  onChange={e => setThemeColor(e.target.value)}
                  className="w-10 h-9 rounded-lg border border-stone-300 p-0.5 cursor-pointer bg-white"
                />
                <input
                  type="text"
                  value={themeColor}
                  onChange={e => setThemeColor(e.target.value)}
                  className="flex-1 px-3.5 py-2 border border-stone-300 rounded-xl bg-stone-50 font-mono uppercase"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: TOP BANNER & COUNTDOWN URGENCY */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
            <Clock className="w-4 h-4 text-amber-600" />
            <h3 className="font-bold text-sm text-stone-800 uppercase tracking-wide">
              অ্যানাউন্সমেন্ট ব্যানার ও কাউন্টডাউন টাইমার (Banner & Urgency)
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            {/* Banner Toggle & Text */}
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <label className="flex items-center gap-2 font-bold text-stone-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTopBanner}
                  onChange={e => setShowTopBanner(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span>টপ অ্যানাউন্সমেন্ট ব্যানার দেখান (Show Announcement Top Bar)</span>
              </label>
              {showTopBanner && (
                <input
                  type="text"
                  value={topBannerText}
                  onChange={e => setTopBannerText(e.target.value)}
                  placeholder="🎉 স্পেশাল অফার – সীমিত সময়ের জন্য ৫০% ছাড়!"
                  className="w-full px-3.5 py-2 border border-stone-300 rounded-lg bg-white"
                />
              )}
            </div>

            {/* Countdown Toggle & Settings */}
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <label className="flex items-center gap-2 font-bold text-stone-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={countdownEnabled}
                  onChange={e => setCountdownEnabled(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span>লাইভ কাউন্টডাউন টাইমার দেখান (Show Countdown Urgency Timer)</span>
              </label>

              {countdownEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">কাউন্টডাউন সময় (ঘণ্টায়):</label>
                    <input
                      type="number"
                      min="1"
                      max="72"
                      value={countdownHours}
                      onChange={e => setCountdownHours(Number(e.target.value))}
                      className="w-full px-3.5 py-2 border border-stone-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">কাউন্টডাউন শিরোনাম:</label>
                    <input
                      type="text"
                      value={countdownTitle}
                      onChange={e => setCountdownTitle(e.target.value)}
                      placeholder="⏰ অফার শেষ হওয়ার আগেই অর্ডার করুন!"
                      className="w-full px-3.5 py-2 border border-stone-300 rounded-lg bg-white"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 3: PRODUCTS & VARIANTS BUILDER */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm text-stone-800 uppercase tracking-wide">
                প্রোডাক্ট ও ভ্যারিয়েন্ট সমুহ (Products, Colors & Sizes)
              </h3>
            </div>
            <button
              type="button"
              onClick={handleAddVariant}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>নতুন প্রোডাক্ট / কালার যোগ করুন</span>
            </button>
          </div>

          <div className="space-y-4">
            {products.map((prod, idx) => (
              <div
                key={prod.id}
                className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-3 relative text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-stone-800">
                    ভ্যারিয়েন্ট #{idx + 1}: {prod.name}
                  </span>
                  {products.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveVariant(idx)}
                      className="text-stone-400 hover:text-rose-600 p-1"
                      title="মুছে ফেলুন"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {/* Name */}
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-stone-700 mb-1">পণ্যের নাম / কালার:</label>
                    <input
                      type="text"
                      value={prod.name}
                      onChange={e => handleUpdateVariant(idx, 'name', e.target.value)}
                      className="w-full px-3 py-1.5 border border-stone-300 rounded-lg bg-white font-medium"
                    />
                  </div>

                  {/* Sale Price */}
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">বর্তমান মূল্য (৳):</label>
                    <input
                      type="number"
                      value={prod.price}
                      onChange={e => handleUpdateVariant(idx, 'price', Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-stone-300 rounded-lg bg-white font-bold text-rose-700"
                    />
                  </div>

                  {/* Old Price */}
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">পূর্বের মূল্য (কাটা দাগ) (৳):</label>
                    <input
                      type="number"
                      value={prod.oldPrice}
                      onChange={e => handleUpdateVariant(idx, 'oldPrice', Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-stone-300 rounded-lg bg-white line-through text-stone-500"
                    />
                  </div>

                  {/* Image URL */}
                  <div className="sm:col-span-3">
                    <label className="block font-bold text-stone-700 mb-1">পণ্য প্রধান ছবির URL (Primary Image URL):</label>
                    <input
                      type="url"
                      value={prod.image}
                      onChange={e => {
                        const newUrl = e.target.value;
                        const currentImages = prod.images && prod.images.length > 0 ? [...prod.images] : [prod.image];
                        if (currentImages.length > 0) {
                          currentImages[0] = newUrl;
                        } else {
                          currentImages.push(newUrl);
                        }
                        handleUpdateVariant(idx, 'image', newUrl);
                        handleUpdateVariant(idx, 'images', currentImages);
                      }}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full px-3 py-1.5 border border-stone-300 rounded-lg bg-white font-mono text-[11px]"
                    />
                  </div>

                  {/* Image Preview */}
                  <div className="flex items-center gap-2">
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="w-12 h-12 object-cover rounded-lg border border-stone-300"
                      onError={e => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=200&q=80';
                      }}
                    />
                    <span className="text-[10px] text-stone-500">প্রধান ছবি</span>
                  </div>

                  {/* Multiple Product Images / Slider Gallery Manager */}
                  <div className="sm:col-span-4 bg-teal-50/60 p-3 rounded-xl border border-teal-200/80 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-teal-700" />
                        <label className="font-extrabold text-xs text-teal-950">
                          প্রোডাক্ট স্লাইডার গ্যালারি (Multiple Slide Images):
                        </label>
                      </div>
                      <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded-full">
                        মোট {((prod.images && prod.images.length > 0) ? prod.images : [prod.image].filter(Boolean)).length} টি ছবি
                      </span>
                    </div>

                    {/* Image thumbnails list */}
                    <div className="flex flex-wrap gap-2.5 items-center">
                      {((prod.images && prod.images.length > 0) ? prod.images : [prod.image].filter(Boolean)).map((imgUrl, imgIdx) => {
                        const isMain = prod.image === imgUrl || imgIdx === 0;
                        return (
                          <div key={imgIdx} className="relative group w-14 h-14 rounded-xl border-2 border-stone-200 overflow-hidden bg-white shadow-2xs">
                            <img
                              src={imgUrl}
                              alt={`Product slide ${imgIdx + 1}`}
                              className="w-full h-full object-cover"
                              onError={e => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=200&q=80';
                              }}
                            />
                            {isMain ? (
                              <span className="absolute top-0.5 left-0.5 bg-teal-600 text-white text-[7px] font-black px-1 rounded-sm shadow-xs pointer-events-none">
                                মেইন
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  const currentImages = prod.images && prod.images.length > 0 ? [...prod.images] : [prod.image];
                                  const reordered = [imgUrl, ...currentImages.filter(url => url !== imgUrl)];
                                  handleUpdateVariant(idx, 'image', imgUrl);
                                  handleUpdateVariant(idx, 'images', reordered);
                                }}
                                className="absolute bottom-0.5 left-0.5 bg-stone-900/90 hover:bg-stone-900 text-white text-[7px] font-bold px-1 py-0.5 rounded-sm opacity-90 sm:opacity-0 group-hover:opacity-100 transition shadow-xs"
                                title="প্রধান ছবি বানান"
                              >
                                প্রধান
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                const currentImages = prod.images && prod.images.length > 0 ? [...prod.images] : [prod.image];
                                const filtered = currentImages.filter((_, i) => i !== imgIdx);
                                if (filtered.length === 0) {
                                  alert('কমপক্ষে একটি ছবি থাকতে হবে!');
                                  return;
                                }
                                const newMain = isMain ? filtered[0] : prod.image;
                                handleUpdateVariant(idx, 'image', newMain);
                                handleUpdateVariant(idx, 'images', filtered);
                              }}
                              className="absolute top-0.5 right-0.5 bg-rose-600/90 hover:bg-rose-700 text-white p-0.5 rounded-full opacity-90 sm:opacity-0 group-hover:opacity-100 transition shadow-xs"
                              title="ছবি মুছে ফেলুন"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        );
                      })}

                      {/* Add new image input */}
                      <div className="flex-1 min-w-[200px] flex items-center gap-1.5">
                        <input
                          type="url"
                          id={`add-img-input-${idx}`}
                          placeholder="নতুন ছবির URL পেস্ট করুন..."
                          className="flex-1 px-2.5 py-1 text-xs border border-teal-300 rounded-lg bg-white font-mono text-[11px]"
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const input = e.currentTarget;
                              const val = input.value.trim();
                              if (val) {
                                const currentImages = prod.images && prod.images.length > 0 ? [...prod.images] : [prod.image].filter(Boolean);
                                if (!currentImages.includes(val)) {
                                  const updated = [...currentImages, val];
                                  handleUpdateVariant(idx, 'images', updated);
                                }
                                input.value = '';
                              }
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.getElementById(`add-img-input-${idx}`) as HTMLInputElement;
                            if (input && input.value.trim()) {
                              const val = input.value.trim();
                              const currentImages = prod.images && prod.images.length > 0 ? [...prod.images] : [prod.image].filter(Boolean);
                              if (!currentImages.includes(val)) {
                                const updated = [...currentImages, val];
                                handleUpdateVariant(idx, 'images', updated);
                              }
                              input.value = '';
                            }
                          }}
                          className="px-2.5 py-1 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-lg transition shrink-0 flex items-center gap-1 shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ ছবি যোগ</span>
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-teal-800/80">
                      💡 আপনি একাধিক ছবি যোগ করতে পারবেন। কাস্টমাররা ওয়েবসাইটে পণ্যটি স্লাইড (Slide) করে সবগুলো ছবি দেখতে পারবে।
                    </p>
                  </div>

                  {/* Category Selection (E-Commerce Mode) */}
                  {pageType === 'ecommerce' && (
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-teal-800 mb-1">প্রোডাক্ট ক্যাটাগরি:</label>
                      <select
                        value={prod.category || storeCategories[0] || 'সকল পণ্য'}
                        onChange={e => handleUpdateVariant(idx, 'category', e.target.value)}
                        className="w-full px-3 py-1.5 border border-stone-300 rounded-lg bg-white font-medium text-xs text-stone-800"
                      >
                        {storeCategories.map(cat => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Short Description (E-Commerce Mode) */}
                  {pageType === 'ecommerce' && (
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-stone-700 mb-1">সংক্ষিপ্ত বিবরণ (Short Note):</label>
                      <input
                        type="text"
                        value={prod.description || ''}
                        onChange={e => handleUpdateVariant(idx, 'description', e.target.value)}
                        placeholder="যেমন: প্রিমিয়াম জর্জেট ফেব্রিক, আরামদায়ক ফিটিংস..."
                        className="w-full px-3 py-1.5 border border-stone-300 rounded-lg bg-white"
                      />
                    </div>
                  )}

                  {/* Featured Product Checkbox (E-Commerce Mode) */}
                  {pageType === 'ecommerce' && (
                    <div className="sm:col-span-4 flex items-center gap-2 bg-amber-50/70 p-2 rounded-lg border border-amber-200">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-amber-900 text-xs">
                        <input
                          type="checkbox"
                          checked={prod.isFeatured ?? false}
                          onChange={e => handleUpdateVariant(idx, 'isFeatured', e.target.checked)}
                          className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                        />
                        <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                        <span>ফিচার্ড পণ্য হিসেবে হোমপেজে হাইলাইট করুন (Featured Badge)</span>
                      </label>
                    </div>
                  )}
                </div>

                {/* Dynamic Variant Fields Manager (Admin Controls: How many fields & What is written on each field) */}
                <div className="border-t border-stone-200 pt-3 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-stone-100/70 p-3 rounded-xl border border-stone-200">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Sliders className="w-4 h-4 text-rose-600" />
                        <h5 className="font-extrabold text-xs sm:text-sm text-stone-900">
                          ভ্যারিয়েন্ট ফিল্ড ও সাইজ ব্যবস্থাপনা ({getProductCustomFields(prod).length} টি ফিল্ড)
                        </h5>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        পণ্যটিতে কয়টি ফিল্ড থাকবে (যেমন: বডি সাইজ, লং সাইজ, কালার ইত্যাদি) এবং ফিল্ডে কি লেখা থাকবে তা এখান থেকে নির্ধারণ করুন।
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleAddCustomField(idx)}
                        className="inline-flex items-center gap-1 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg transition shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ নতুন ফিল্ড যোগ করুন</span>
                      </button>
                    </div>
                  </div>

                  {/* Quick Preset Buttons to Add Popular Fields */}
                  <div className="flex items-center gap-1.5 flex-wrap px-1 text-[11px]">
                    <span className="text-stone-400 font-medium">দ্রুত ফিল্ড যোগ করুন:</span>
                    <button
                      type="button"
                      onClick={() => handleAddCustomField(idx, 'বডি সাইজ (Body Size):', ['৩৮', '৪০', '৪২', '৪৪', '৪৬'])}
                      className="px-2 py-0.5 rounded bg-white hover:bg-rose-50 border border-stone-300 text-stone-700 text-[11px] font-semibold"
                    >
                      + বডি সাইজ
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddCustomField(idx, 'লং / ঝুল সাইজ (Long Size):', ['৪০', '৪২', '৪৪', '৪৬'])}
                      className="px-2 py-0.5 rounded bg-white hover:bg-indigo-50 border border-stone-300 text-stone-700 text-[11px] font-semibold"
                    >
                      + লং সাইজ
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddCustomField(idx, 'কালার / Color:', ['লাল', 'নীল', 'কালো', 'মেরুন', 'সাদা'])}
                      className="px-2 py-0.5 rounded bg-white hover:bg-emerald-50 border border-stone-300 text-stone-700 text-[11px] font-semibold"
                    >
                      + কালার
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddCustomField(idx, 'ফেব্রিক / কাপড়ের ধরন:', ['প্রিমিয়াম জর্জেট', 'সুতি / কটন', 'সিল্ক', 'লিলেন'])}
                      className="px-2 py-0.5 rounded bg-white hover:bg-amber-50 border border-stone-300 text-stone-700 text-[11px] font-semibold"
                    >
                      + ফেব্রিক
                    </button>
                  </div>

                  {/* List of Configured Fields */}
                  <div className="space-y-3 pt-1">
                    {getProductCustomFields(prod).map((field, fIdx) => (
                      <div
                        key={field.id || fIdx}
                        className="bg-white p-3 sm:p-3.5 rounded-xl border border-stone-200 shadow-2xs space-y-2.5"
                      >
                        {/* Field Header & Editable Label */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-stone-100">
                          <div className="flex-1 flex items-center gap-2">
                            <span className="shrink-0 text-[11px] font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded">
                              ফিল্ড #{fIdx + 1}
                            </span>
                            <div className="flex-1 flex items-center gap-1.5">
                              <label className="text-xs font-bold text-stone-700 shrink-0">
                                ফিল্ডের নাম / লেখা:
                              </label>
                              <input
                                type="text"
                                value={field.label}
                                onChange={e => handleUpdateFieldLabel(idx, fIdx, e.target.value)}
                                placeholder="যেমন: বডি সাইজ (Body Size):"
                                className="w-full max-w-sm px-2.5 py-1 text-xs font-bold text-stone-900 border border-stone-300 rounded-lg bg-stone-50 focus:bg-white focus:border-rose-500"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-1 self-end sm:self-auto">
                            <button
                              type="button"
                              onClick={() => handleRemoveCustomField(idx, fIdx)}
                              className="text-stone-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition text-xs font-bold flex items-center gap-1"
                              title="এই ফিল্ডটি ডিলিট করুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>ফিল্ড মুছুন</span>
                            </button>
                          </div>
                        </div>

                        {/* Quick Label Presets */}
                        <div className="flex items-center gap-1 flex-wrap text-[10px] text-stone-500">
                          <span className="text-stone-400">নাম পরিবর্তন করুন:</span>
                          {[
                            'বডি সাইজ (Body Size):',
                            'লং / ঝুল সাইজ (Long Size):',
                            'কালার / Color:',
                            'ফেব্রিক / Fabric:',
                            'প্যাকেজ / টাইপ:',
                            'ওজন / Weight:'
                          ].map(presetLabel => (
                            <button
                              key={presetLabel}
                              type="button"
                              onClick={() => handleUpdateFieldLabel(idx, fIdx, presetLabel)}
                              className="px-1.5 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium"
                            >
                              {presetLabel.replace(':', '')}
                            </button>
                          ))}
                        </div>

                        {/* Configured Options (Tags / Pills) */}
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-stone-700">উপলব্ধ অপশনসমূহ (Options):</span>
                            <span className="text-[10px] text-stone-400">
                              {field.options.length} টি অপশন যোগ করা আছে
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            {field.options.map(opt => (
                              <span
                                key={opt}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-900 text-xs font-bold border border-stone-200"
                              >
                                <span>{opt}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOptionFromField(idx, fIdx, opt)}
                                  className="text-stone-400 hover:text-rose-600 font-bold ml-0.5 text-sm leading-none"
                                  title="অপশনটি মুছুন"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                            {field.options.length === 0 && (
                              <span className="text-xs text-amber-700 italic">
                                কোনো অপশন যোগ করা হয়নি। নিচে অপশন লিখে এন্টার দিন।
                              </span>
                            )}
                          </div>

                          {/* Quick Add Option Input & Contextual Presets */}
                          <div className="flex items-center gap-2 flex-wrap pt-1">
                            <input
                              type="text"
                              placeholder="যেমন: ৩৮ বা XL বা লাল"
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const val = (e.target as HTMLInputElement).value;
                                  handleAddOptionToField(idx, fIdx, val);
                                  (e.target as HTMLInputElement).value = '';
                                }
                              }}
                              className="w-40 px-2.5 py-1 text-xs border border-stone-300 rounded-lg bg-white placeholder:text-stone-400 font-medium"
                            />

                            <span className="text-[10px] text-stone-400">ক্লিক করে অপশন যোগ করুন:</span>
                            {(field.label.includes('লং') || field.label.includes('ঝুল')
                              ? ['৩৮', '৪০', '৪২', '৪৪', '৪৬', '৪৮']
                              : field.label.includes('কালার') || field.label.includes('রং')
                              ? ['লাল', 'নীল', 'কালো', 'মেরুন', 'সাদা', 'সবুজ', 'গোলাপী']
                              : ['৩৮', '৪০', '৪২', '৪৪', '৪৬', 'S', 'M', 'L', 'XL', 'Free Size']
                            ).map(presetOpt => (
                              <button
                                key={presetOpt}
                                type="button"
                                onClick={() => handleAddOptionToField(idx, fIdx, presetOpt)}
                                className="px-2 py-0.5 rounded bg-white hover:bg-stone-100 border border-stone-200 text-[10px] font-semibold text-stone-700"
                              >
                                + {presetOpt}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}

                    {getProductCustomFields(prod).length === 0 && (
                      <div className="text-center py-4 px-3 bg-stone-50 rounded-xl border border-dashed border-stone-300 text-stone-500 text-xs">
                        <p className="font-semibold text-stone-700">এই পণ্যে কোনো ভ্যারিয়েন্ট ফিল্ড নেই</p>
                        <p className="text-[11px] mt-0.5">পণ্যটি একক সাইজে সরাসরি অর্ডার করা যাবে। সাইজ বা অপশন দিতে উপরের "+ নতুন ফিল্ড যোগ করুন" বাটনে ক্লিক করুন।</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 4: DELIVERY CHARGES & FACEBOOK PIXEL */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Delivery Charges Box */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
              <h3 className="font-bold text-sm text-stone-800 uppercase tracking-wide">
                ডেলিভারি চার্জ কনফিগারেশন
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <label className="flex items-center gap-2 font-bold text-emerald-800 p-3 bg-emerald-50 rounded-xl border border-emerald-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFreeDelivery}
                  onChange={e => setIsFreeDelivery(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span>🎉 সারাদেশে সম্পূর্ণ ফ্রি ডেলিভারি (Free Delivery)</span>
              </label>

              {!isFreeDelivery && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">ঢাকার ভিতরে চার্জ (৳):</label>
                    <input
                      type="number"
                      value={insideDhaka}
                      onChange={e => setInsideDhaka(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-stone-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">ঢাকার বাইরে চার্জ (৳):</label>
                    <input
                      type="number"
                      value={outsideDhaka}
                      onChange={e => setOutsideDhaka(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-stone-50 focus:bg-white"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pixel & Conversion API (CAPI) Box for Meta & TikTok with ON/OFF Toggles */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-900 uppercase tracking-wide">
                    পিক্সেল ও কনভার্সন এপিআই সেটআপ (Pixel & CAPI)
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    এই অন-পেইজের জন্য নির্দিষ্ট মেটা (Facebook) ও টিকটক পিক্সেল চালু/বন্ধ (ON/OFF) ও এডিট করুন
                  </p>
                </div>
              </div>
              <div className="text-xs text-stone-500 flex items-center gap-2">
                <span className="text-[11px] bg-stone-100 px-2.5 py-1 rounded-full text-stone-700 font-medium border border-stone-200">
                  ডেটা স্থায়ীভাবে ডাটাবেজে সেভ থাকবে
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Meta (Facebook) Pixel & CAPI Card */}
              <div className={`p-4 rounded-xl border transition-all duration-200 ${metaPixelEnabled ? 'border-blue-300 bg-blue-50/40 shadow-xs' : 'border-stone-200 bg-stone-50/60 opacity-90'}`}>
                <div className="flex items-center justify-between border-b border-blue-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${metaPixelEnabled ? 'bg-blue-600 animate-pulse' : 'bg-stone-400'}`}></span>
                    <span className="font-bold text-xs text-stone-900">
                      Meta / Facebook Pixel & CAPI
                    </span>
                  </div>
                  
                  {/* ON/OFF Switch */}
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${metaPixelEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'}`}>
                      {metaPixelEnabled ? 'সক্রিয় (ON)' : 'বন্ধ (OFF)'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setMetaPixelEnabled(!metaPixelEnabled)}
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${metaPixelEnabled ? 'bg-blue-600' : 'bg-stone-300'}`}
                      role="switch"
                      aria-checked={metaPixelEnabled}
                      title={metaPixelEnabled ? "ক্লিক করে মেটা পিক্সেল বন্ধ করুন" : "ক্লিক করে মেটা পিক্সেল চালু করুন"}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${metaPixelEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                      />
                    </button>
                  </div>
                </div>

                {metaPixelEnabled ? (
                  /* Expanded Editable Meta Form */
                  <div className="space-y-3 pt-2 text-xs">
                    <div>
                      <label className="block font-bold text-stone-700 mb-1 flex items-center justify-between">
                        <span>Facebook Pixel / Dataset ID:</span>
                        {facebookPixelId && (
                          <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> সেট করা আছে
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={facebookPixelId}
                        onChange={e => setFacebookPixelId(e.target.value)}
                        placeholder="যেমন: 984512398471201"
                        className="w-full px-3 py-2 border border-blue-200 rounded-lg bg-white font-mono text-xs text-stone-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-[10px] text-stone-500 mt-0.5">
                        ফাঁকা রাখলে গ্লোবাল ফেসবুক পিক্সেল আইডি কার্যকর হবে।
                      </p>
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1 flex items-center justify-between">
                        <span>Meta Conversion API (CAPI) Access Token:</span>
                        <button
                          type="button"
                          onClick={() => setShowMetaToken(!showMetaToken)}
                          className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                        >
                          {showMetaToken ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          <span>{showMetaToken ? 'হাইড করুন' : 'টোকেন দেখুন'}</span>
                        </button>
                      </label>
                      <div className="relative">
                        <input
                          type={showMetaToken ? 'text' : 'password'}
                          value={metaCapiToken}
                          onChange={e => setMetaCapiToken(e.target.value)}
                          placeholder="EAA..."
                          className="w-full px-3 py-2 pr-10 border border-blue-200 rounded-lg bg-white font-mono text-xs text-stone-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowMetaToken(!showMetaToken)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                        >
                          {showMetaToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[10px] text-stone-500 mt-0.5">
                        সার্ভার-সাইড ব্যাকআপ ও আইওএস ট্র্যাকিংয়ের জন্য এক্সেস টোকেন (ঐচ্ছিক)।
                      </p>
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1">
                        Meta Test Event Code (ঐচ্ছিক):
                      </label>
                      <input
                        type="text"
                        value={metaTestCode}
                        onChange={e => setMetaTestCode(e.target.value)}
                        placeholder="যেমন: TEST38192"
                        className="w-full px-3 py-2 border border-blue-200 rounded-lg bg-white font-mono text-xs text-stone-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-[10px] text-stone-500 mt-0.5">
                        ইভেন্ট ম্যানেজার থেকে টেস্ট কোড দিলে লাইভ ট্র্যাকিং টেস্ট দেখতে পারবেন।
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Collapsed Meta View */
                  <div className="py-4 text-center space-y-2">
                    <p className="text-xs text-stone-500">
                      এই অন-পেইজের জন্য মেটা পিক্সেল ট্র্যাকিং বর্তমানে বন্ধ (OFF) রয়েছে।
                    </p>
                    <button
                      type="button"
                      onClick={() => setMetaPixelEnabled(true)}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5"
                    >
                      <ToggleRight className="w-4 h-4" />
                      <span>মেটা পিক্সেল চালু করুন (Turn ON)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* TikTok Pixel & CAPI Card */}
              <div className={`p-4 rounded-xl border transition-all duration-200 ${tiktokPixelEnabled ? 'border-stone-800 bg-stone-900/5 shadow-xs' : 'border-stone-200 bg-stone-50/60 opacity-90'}`}>
                <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${tiktokPixelEnabled ? 'bg-stone-900 animate-pulse' : 'bg-stone-400'}`}></span>
                    <span className="font-bold text-xs text-stone-900">
                      TikTok Pixel & Events API (CAPI)
                    </span>
                  </div>

                  {/* ON/OFF Switch */}
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tiktokPixelEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'}`}>
                      {tiktokPixelEnabled ? 'সক্রিয় (ON)' : 'বন্ধ (OFF)'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTiktokPixelEnabled(!tiktokPixelEnabled)}
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${tiktokPixelEnabled ? 'bg-stone-900' : 'bg-stone-300'}`}
                      role="switch"
                      aria-checked={tiktokPixelEnabled}
                      title={tiktokPixelEnabled ? "ক্লিক করে টিকটক পিক্সেল বন্ধ করুন" : "ক্লিক করে টিকটক পিক্সেল চালু করুন"}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${tiktokPixelEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                      />
                    </button>
                  </div>
                </div>

                {tiktokPixelEnabled ? (
                  /* Expanded Editable TikTok Form */
                  <div className="space-y-3 pt-2 text-xs">
                    <div>
                      <label className="block font-bold text-stone-700 mb-1 flex items-center justify-between">
                        <span>TikTok Pixel ID:</span>
                        {tiktokPixelId && (
                          <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> সেট করা আছে
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={tiktokPixelId}
                        onChange={e => setTiktokPixelId(e.target.value)}
                        placeholder="যেমন: CP845210984TT"
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white font-mono text-xs text-stone-900 focus:ring-2 focus:ring-stone-800 focus:border-stone-800"
                      />
                      <p className="text-[10px] text-stone-500 mt-0.5">
                        ফাঁকা রাখলে গ্লোবাল টিকটক পিক্সেল আইডি কার্যকর হবে।
                      </p>
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1 flex items-center justify-between">
                        <span>TikTok Conversion API Access Token:</span>
                        <button
                          type="button"
                          onClick={() => setShowTiktokToken(!showTiktokToken)}
                          className="text-[10px] text-stone-700 hover:text-stone-900 flex items-center gap-1 font-medium"
                        >
                          {showTiktokToken ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          <span>{showTiktokToken ? 'হাইড করুন' : 'টোকেন দেখুন'}</span>
                        </button>
                      </label>
                      <div className="relative">
                        <input
                          type={showTiktokToken ? 'text' : 'password'}
                          value={tiktokCapiToken}
                          onChange={e => setTiktokCapiToken(e.target.value)}
                          placeholder="টিকটক অ্যাডস ম্যানেজার থেকে এক্সেস টোকেন..."
                          className="w-full px-3 py-2 pr-10 border border-stone-300 rounded-lg bg-white font-mono text-xs text-stone-900 focus:ring-2 focus:ring-stone-800 focus:border-stone-800"
                        />
                        <button
                          type="button"
                          onClick={() => setShowTiktokToken(!showTiktokToken)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                        >
                          {showTiktokToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[10px] text-stone-500 mt-0.5">
                        সার্ভার-সাইড ব্যাকআপ ট্র্যাকিংয়ের জন্য এক্সেস টোকেন (ঐচ্ছিক)।
                      </p>
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1">
                        TikTok Test Event Code (ঐচ্ছিক):
                      </label>
                      <input
                        type="text"
                        value={tiktokTestCode}
                        onChange={e => setTiktokTestCode(e.target.value)}
                        placeholder="যেমন: TEST54321"
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white font-mono text-xs text-stone-900 focus:ring-2 focus:ring-stone-800 focus:border-stone-800"
                      />
                      <p className="text-[10px] text-stone-500 mt-0.5">
                        টিকটক টেস্ট কোড দিলে ইভেন্টস ম্যানেজারে লাইভ ট্র্যাক দেখতে পারবেন।
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Collapsed TikTok View */
                  <div className="py-4 text-center space-y-2">
                    <p className="text-xs text-stone-500">
                      এই অন-পেইজের জন্য টিকটক পিক্সেল ট্র্যাকিং বর্তমানে বন্ধ (OFF) রয়েছে।
                    </p>
                    <button
                      type="button"
                      onClick={() => setTiktokPixelEnabled(true)}
                      className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5"
                    >
                      <ToggleRight className="w-4 h-4" />
                      <span>টিকটক পিক্সেল চালু করুন (Turn ON)</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl text-[11px] text-stone-700 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong>১০০% নির্ভুল ট্র্যাকিং ও ডেটা গ্যারান্টি:</strong> আপনার প্রবেশকৃত প্রতিটি পিক্সেল আইডি এবং CAPI টোকেন ডাটাবেজে অক্ষতভাবে সংরক্ষিত থাকবে। প্রতিটি ভিজিটর ও অর্ডারে স্বয়ংক্রিয়ভাবে একটি ইউনিক <code>eventId</code> যুক্ত হয়, যা ব্রাউজার পিক্সেল ও সার্ভার CAPI উভয়েই প্রেরণ করে ডেটা ডুপ্লিকেশন রোধ করে।
              </div>
            </div>
          </div>

          {/* SECTION: GOOGLE SHEETS AUTOMATION (Optional per landing page) */}
          <div className="bg-white rounded-2xl p-5 border border-emerald-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-900 uppercase tracking-wide flex items-center gap-2">
                    গুগল শিট অটোমেশন (Google Sheets Sync)
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-700 text-[10px] font-semibold lowercase">
                      ঐচ্ছিক
                    </span>
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    এই অন-পেইজে কাস্টমার অর্ডার করলে সরাসরি গুগল শিটে লিস্ট আকারে যুক্ত হবে
                  </p>
                </div>
              </div>

              {/* Enable / Disable toggle */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={googleSheetEnabled}
                  onChange={e => setGoogleSheetEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {googleSheetEnabled ? (
              <div className="space-y-4 text-xs pt-1">
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      এই অন-পেইজের জন্য গুগল শিট অটো-সিঙ্ক সক্রিয়
                    </p>
                    <p className="text-emerald-800 text-[11px]">
                      কাস্টমার অর্ডার করার সাথে সাথে স্বয়ংক্রিয়ভাবে আপনার গুগল শিটে একটি নতুন সারি তৈরি হবে।
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowScriptModal(true)}
                    className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-bold transition shadow-xs"
                  >
                    <span>সেটআপ গাইড ও কোড</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      গুগল অ্যাপস স্ক্রিপ্ট ওয়েব অ্যাপ ইউআরএল (Web App URL): *
                    </label>
                    <input
                      type="url"
                      value={googleSheetWebhookUrl}
                      onChange={e => setGoogleSheetWebhookUrl(e.target.value)}
                      placeholder="https://script.google.com/macros/s/.../exec"
                      className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl bg-stone-50 focus:bg-white font-mono text-[11px]"
                    />
                    <p className="text-[11px] text-stone-500 mt-1">
                      আপনার গুগল শিটের Extensions &gt; Apps Script থেকে Deploy করা Web App URL টি এখানে পেস্ট করুন।
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">
                        শিট / ট্যাবের নাম (Sheet Tab Name):
                      </label>
                      <input
                        type="text"
                        value={googleSheetName}
                        onChange={e => setGoogleSheetName(e.target.value)}
                        placeholder="Orders"
                        className="w-full px-3.5 py-2 border border-stone-300 rounded-xl bg-stone-50 focus:bg-white"
                      />
                      <p className="text-[10px] text-stone-400 mt-1">ডিফল্ট: Orders</p>
                    </div>

                    {page?.googleSheetConfig?.lastSyncedAt && (
                      <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200 flex flex-col justify-center">
                        <span className="text-stone-400 text-[10px]">সর্বশেষ শিটে ডাটা পাঠানো হয়েছে:</span>
                        <strong className="text-stone-800 font-medium">
                          {new Date(page.googleSheetConfig.lastSyncedAt).toLocaleString('bn-BD')}
                        </strong>
                      </div>
                    )}
                  </div>

                  {/* Actions: Test & Sync All */}
                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTestSheet}
                      disabled={isTestingSheet || !googleSheetWebhookUrl.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition disabled:opacity-50 shadow-xs"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTestingSheet ? 'animate-spin' : ''}`} />
                      <span>{isTestingSheet ? 'টেস্ট হচ্ছে...' : 'টেস্ট ডেটা পাঠিয়ে চেক করুন'}</span>
                    </button>

                    {isEditing && (
                      <button
                        type="button"
                        onClick={handleSyncAllOrders}
                        disabled={isSyncingAll || !googleSheetWebhookUrl.trim()}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-900 text-white font-bold transition disabled:opacity-50 shadow-xs"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
                        <span>{isSyncingAll ? 'সিঙ্ক হচ্ছে...' : 'এই পেইজের সকল পূর্বের অর্ডার শিটে পাঠান'}</span>
                      </button>
                    )}
                  </div>

                  {/* Test Result feedback */}
                  {sheetTestResult && (
                    <div
                      className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                        sheetTestResult.success
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                          : 'bg-rose-50 border-rose-300 text-rose-800'
                      }`}
                    >
                      {sheetTestResult.success ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      )}
                      <span>{sheetTestResult.message}</span>
                    </div>
                  )}

                  {/* Sync All Result feedback */}
                  {syncAllResult && (
                    <div
                      className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                        syncAllResult.success
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                          : 'bg-rose-50 border-rose-300 text-rose-800'
                      }`}
                    >
                      {syncAllResult.success ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      )}
                      <span>{syncAllResult.message}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-stone-500 italic">
                এই অন-পেইজের জন্য গুগল শিট কানেকশন বন্ধ আছে। অন-পেইজের অর্ডার গুগল শিটে পেতে উপরের টগল বাটনে ক্লিক করে চালু করুন।
              </p>
            )}
          </div>

          {/* SECTION: PAGE-SPECIFIC SMS TEMPLATES */}
          <div className="bg-white rounded-2xl p-5 border border-indigo-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-900 uppercase tracking-wide flex items-center gap-2">
                    পেজ-নির্দিষ্ট SMS মেসেজ টেমপ্লেট (Page-Specific SMS)
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-300 text-indigo-700 text-[10px] font-semibold lowercase">
                      ঐচ্ছিক
                    </span>
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    এই নির্দিষ্ট পেইজের অর্ডারের ক্ষেত্রে গ্রাহকের মোবাইলে কী মেসেজ যাবে তা এখান থেকে পরিবর্তন করতে পারবেন
                  </p>
                </div>
              </div>

              {/* Enable / Disable toggle */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={smsTemplatesEnabled}
                  onChange={e => setSmsTemplatesEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {smsTemplatesEnabled ? (
              <div className="space-y-4 text-xs pt-1">
                <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1">
                  <p className="font-bold text-indigo-950">
                    💡 মেসেজে ডায়নামিক ভ্যারিয়েবল ব্যবহার করতে পারেন:
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      { code: '{customer_name}', label: 'গ্রাহকের নাম' },
                      { code: '{order_id}', label: 'অর্ডার নম্বর' },
                      { code: '{total}', label: 'মোট বিল (৳)' },
                      { code: '{brand_name}', label: 'ব্র্যান্ডের নাম' },
                      { code: '{courier_name}', label: 'কুরিয়ারের নাম' },
                      { code: '{tracking_code}', label: 'ট্র্যাকিং কোড' }
                    ].map(v => (
                      <span
                        key={v.code}
                        className="px-2 py-0.5 rounded bg-white text-indigo-900 font-mono text-[10px] font-bold border border-indigo-200"
                      >
                        {v.code} ({v.label})
                      </span>
                    ))}
                  </div>
                </div>

                {/* Page Specific Sender ID (Optional) */}
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                  <label className="block font-bold text-stone-800 mb-1">
                    পেজের জন্য আলাদা সেন্ডার আইডি (Sender ID / Masking) - ঐচ্ছিক:
                  </label>
                  <input
                    type="text"
                    value={smsSenderId}
                    onChange={e => setSmsSenderId(e.target.value)}
                    placeholder="যেমন: AmarChoice বা HoneyShop (খালি রাখলে মেইন সেটিংসের সেন্ডার আইডি ব্যবহার হবে)"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white font-mono text-xs"
                  />
                  <span className="text-[10px] text-stone-500 mt-1 block">
                    যদি এই নির্দিষ্ট ক্যাম্পেইন বা ব্র্যান্ডের জন্য আপনার বাল্কএসএমএস অ্যাকাউন্টে আলাদা সেন্ডার আইডি থাকে, তবে দিতে পারেন।
                  </span>
                </div>

                {/* 1. Order Received SMS */}
                <div>
                  <label className="block font-bold text-stone-800 mb-1">
                    ১. নতুন অর্ডার রিসিভড মেসেজ (Order Received SMS):
                  </label>
                  <textarea
                    rows={2}
                    value={smsOrderReceived}
                    onChange={e => setSmsOrderReceived(e.target.value)}
                    placeholder="অর্ডার গ্রহণ করার সাথে সাথে যে মেসেজ যাবে..."
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50 focus:bg-white text-xs"
                  />
                </div>

                {/* 2. Order Confirmed SMS */}
                <div>
                  <label className="block font-bold text-stone-800 mb-1">
                    ২. অর্ডার কনফার্মড মেসেজ (Order Confirmed SMS):
                  </label>
                  <textarea
                    rows={2}
                    value={smsOrderConfirmed}
                    onChange={e => setSmsOrderConfirmed(e.target.value)}
                    placeholder="অর্ডার কনফার্ম করার পর যে মেসেজ যাবে..."
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50 focus:bg-white text-xs"
                  />
                </div>

                {/* 3. Courier Dispatched SMS */}
                <div>
                  <label className="block font-bold text-stone-800 mb-1">
                    ৩. কুরিয়ারে বুকিং মেসেজ (Courier Dispatched SMS):
                  </label>
                  <textarea
                    rows={2}
                    value={smsCourierDispatched}
                    onChange={e => setSmsCourierDispatched(e.target.value)}
                    placeholder="কুরিয়ারে পার্সেল পাঠানোর পর ট্র্যাকিং কোডসহ যে মেসেজ যাবে..."
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50 focus:bg-white text-xs"
                  />
                </div>

                {/* 4. Delivered SMS */}
                <div>
                  <label className="block font-bold text-stone-800 mb-1">
                    ৪. ডেলিভারি সম্পন্ন মেসেজ (Order Delivered SMS):
                  </label>
                  <textarea
                    rows={2}
                    value={smsDelivered}
                    onChange={e => setSmsDelivered(e.target.value)}
                    placeholder="পণ্য সফলভাবে কাস্টমার ডেলিভারি পাওয়ার পর..."
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50 focus:bg-white text-xs"
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-stone-500 italic">
                এই পেজের জন্য আলাদা SMS বন্ধ আছে (সিস্টেমের গ্লোবাল SMS টেমপ্লেট ব্যবহার হবে)। এই পেজের জন্য আলাদা SMS বার্তা পাঠাতে উপরের সুইচটি অন করুন।
              </p>
            )}
          </div>
        </div>

        {/* SECTION 5: FEATURES BULLET POINTS */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
            <h3 className="font-bold text-sm text-stone-800 uppercase tracking-wide">
              পণ্যের প্রধান সুবিধাসমূহ (Features Checklist)
            </h3>
          </div>

          <div className="space-y-2 text-xs">
            {features.map((feat, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 bg-stone-50 rounded-lg border border-stone-200">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold">
                  ✓
                </span>
                <span className="flex-1 font-medium text-stone-800">{feat}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFeature(idx)}
                  className="text-stone-400 hover:text-rose-600 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {/* Add new feature input */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="text"
                value={newFeatureInput}
                onChange={e => setNewFeatureInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddFeature();
                  }
                }}
                placeholder="নতুন বৈশিষ্ট্য লিখুন (যেমন: ৭ দিনের রিপ্লেসমেন্ট গ্যারান্টি)"
                className="flex-1 px-3.5 py-2 border border-stone-300 rounded-xl bg-stone-50 focus:bg-white"
              />
              <button
                type="button"
                onClick={handleAddFeature}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl font-bold transition shadow"
              >
                যোগ করুন
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 6: GALLERY IMAGES */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-stone-700" />
              <h3 className="font-bold text-sm text-stone-800 uppercase tracking-wide">
                গ্যালারি ছবি সমূহ (Gallery Images)
              </h3>
            </div>
            <span className="text-[11px] text-stone-500 bg-stone-100 px-2.5 py-0.5 rounded-full font-semibold">
              {galleryImages.length} টি ছবি
            </span>
          </div>

          <p className="text-[11px] text-stone-500 bg-stone-50 p-2.5 rounded-xl border border-stone-200">
            💡 <strong>থাম্বনেইল ডিসপ্লে নিয়ম:</strong> ২ বা ৩টি ছবি থাকলে স্ট্যান্ডার্ড বড় সাইজে ১ লাইনে থাকবে, ৪ বা ৫টি থাকলে ছোট হয়ে একই লাইনে ফিট হবে, এবং ৫টির বেশি ছবি থাকলে স্বয়ংক্রিয়ভাবে অ্যারো বাটন ও টাচ-স্ক্রোলসহ স্মুথ ক্যারোসেল (Carousel) তৈরি হবে।
          </p>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {galleryImages.map((img, idx) => (
                <div key={idx} className="relative rounded-xl overflow-hidden border border-stone-300 aspect-square group">
                  <img src={img} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveGalleryImage(idx)}
                    className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full opacity-80 group-hover:opacity-100 transition shadow"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="url"
                value={newGalleryImgInput}
                onChange={e => setNewGalleryImgInput(e.target.value)}
                placeholder="নতুন ছবির URL দিন (https://...)"
                className="flex-1 px-3.5 py-2 border border-stone-300 rounded-xl bg-stone-50 focus:bg-white text-xs font-mono"
              />
              <button
                type="button"
                onClick={handleAddGalleryImage}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl font-bold text-xs"
              >
                ছবি যোগ করুন
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2.5 border border-stone-300 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-100"
          >
            বাতিল
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'সংরক্ষণ হচ্ছে...' : 'সেভ ও প্রকাশ করুন'}</span>
          </button>
        </div>
      </form>

      {/* GOOGLE APPS SCRIPT SETUP MODAL */}
      {showScriptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between p-4 border-b border-stone-200 bg-stone-50">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                <h3 className="font-bold text-base text-stone-900">গুগল শিট কানেক্ট করার সহজ ৪ ধাপ</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowScriptModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs text-stone-700">
              <div className="space-y-2 bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200">
                <h4 className="font-bold text-emerald-900 text-sm">সহজ গাইড:</h4>
                <ol className="list-decimal list-inside space-y-1.5 leading-relaxed text-emerald-950 font-medium">
                  <li>যেকোনো ব্রাউজারে একটি নতুন <strong>Google Sheet</strong> খুলুন।</li>
                  <li>শিটের উপরের মেনু থেকে <strong>Extensions &gt; Apps Script</strong> এ ক্লিক করুন।</li>
                  <li>সেখানে থাকা কোডটি মুছে ফেলে নিচের কোডটি হুবহু পেস্ট করুন।</li>
                  <li>
                    উপরে ডানপাশে <strong>Deploy &gt; New deployment</strong> এ ক্লিক করুন &gt; Select type এ <strong>Web app</strong> নির্বাচন করুন &gt;
                    Who has access এ <strong>Anyone</strong> সিলেক্ট করে <strong>Deploy</strong> এ ক্লিক করুন।
                  </li>
                  <li>পাওয়া <strong>Web App URL</strong> কপি করে এই অন-পেইজের বক্সে পেস্ট করুন। ব্যস, কাজ শেষ!</li>
                </ol>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-800">গুগল অ্যাপস স্ক্রিপ্ট কোড (Apps Script Code):</span>
                  <button
                    type="button"
                    onClick={handleCopyScript}
                    className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition shadow-xs"
                  >
                    {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedScript ? 'কপি হয়েছে!' : 'কোড কপি করুন'}</span>
                  </button>
                </div>
                <div className="bg-stone-900 text-emerald-400 p-4 rounded-xl font-mono text-[11px] overflow-x-auto max-h-60 border border-stone-800 select-all">
                  <pre>{googleAppsScriptCode}</pre>
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-stone-200 bg-stone-50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowScriptModal(false)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl font-bold text-xs"
              >
                বুঝেছি, বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
