if (typeof __filename !== 'undefined' && (__filename.endsWith('.cjs') || __filename.includes('dist'))) {
  process.env.NODE_ENV = 'production';
}

import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { INITIAL_LANDING_PAGES, INITIAL_ORDERS, INITIAL_SETTINGS, INITIAL_ADMIN_USERS, INITIAL_INCOMPLETE_ORDERS } from './src/data/initialData.ts';
import { LandingPage, Order, OrderStatus, AppSettings, PixelEventLog, AdminUser, IncompleteOrder, BlockedCustomer, BlockedIpRecord, FraudControlConfig, CourierCustomerHistory } from './src/types.ts';

const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

const BN_TO_EN_DIGITS: { [k: string]: string } = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
};

function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  const converted = String(phone).replace(/[০-৯]/g, d => BN_TO_EN_DIGITS[d] || d);
  let cleaned = converted.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('880')) {
    cleaned = '0' + cleaned.substring(3);
  }
  return cleaned;
}

function getClientIp(req: Request): string {
  try {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
      const first = forwarded.split(',')[0].trim();
      if (first) return first;
    }
    const realIp = req.headers['x-real-ip'];
    if (typeof realIp === 'string' && realIp.trim()) {
      return realIp.trim();
    }
    const remote = req.socket?.remoteAddress || req.ip || '';
    // Format IPv6 loopback to readable form if needed
    if (remote === '::ffff:127.0.0.1') return '127.0.0.1';
    return remote;
  } catch {
    return '';
  }
}

interface DatabaseSchema {
  landingPages: LandingPage[];
  orders: Order[];
  settings: AppSettings;
  pixelLogs: PixelEventLog[];
  users: AdminUser[];
  incompleteOrders?: IncompleteOrder[];
  isDemoDataRemoved?: boolean;
  demoClearedAt?: string;
}

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Persistent flag file: Once demo data is cleared, this flag guarantees demo data will NEVER load again
const DEMO_REMOVED_FLAG_FILE = path.join(DATA_DIR, 'demo_data_removed.flag');
const DEMO_ORDER_IDS = new Set(['ORD-1001', 'ORD-1002', 'ORD-1003', 'ORD-1004']);
const DEMO_INCOMPLETE_IDS = new Set(['inc-101', 'inc-102']);

function isDemoRemovedOnDisk(): boolean {
  return fs.existsSync(DEMO_REMOVED_FLAG_FILE);
}

function markDemoRemovedOnDisk(): void {
  try {
    fs.writeFileSync(DEMO_REMOVED_FLAG_FILE, new Date().toISOString(), 'utf-8');
  } catch (err) {
    console.warn('Failed to write demo removed flag file:', err);
  }
}

function loadDatabase(): DatabaseSchema {
  const diskFlag = isDemoRemovedOnDisk();

  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      const isDemoRemoved = Boolean(diskFlag || parsed.isDemoDataRemoved || parsed.settings?.isDemoDataRemoved);

      if (isDemoRemoved && !diskFlag) {
        markDemoRemovedOnDisk();
      }

      // If demo data was removed, strictly respect user's data and never inject demo pages
      const pages: LandingPage[] = Array.isArray(parsed.landingPages)
        ? parsed.landingPages
        : (isDemoRemoved ? [] : INITIAL_LANDING_PAGES);

      // Ensure every page has pageType and storeCategories
      pages.forEach(p => {
        if (!p.pageType) p.pageType = 'landing';
        if (!p.storeCategories) p.storeCategories = ['সকল পণ্য', 'বোরকা ও আবায়া', 'পাঞ্জাবি', 'শাড়ি', 'হিজাব', 'অফার'];
      });

      const loadedSettings: AppSettings = parsed.settings || { ...INITIAL_SETTINGS };
      if (isDemoRemoved) {
        loadedSettings.isDemoDataRemoved = true;
      }
      if (!loadedSettings.defaultLandingPageId && pages.length > 0) {
        loadedSettings.defaultLandingPageId = pages[0].id;
      }

      // Synchronize isDefault flag with loadedSettings.defaultLandingPageId
      if (loadedSettings.defaultLandingPageId && pages.length > 0) {
        const targetId = loadedSettings.defaultLandingPageId;
        const exists = pages.some(p => p.id === targetId || p.slug === targetId);
        if (exists) {
          pages.forEach(p => {
            p.isDefault = (p.id === targetId || p.slug === targetId);
          });
        }
      }

      // Ensure exactly one page is marked isDefault if pages exist
      const defaultPages = pages.filter(p => p.isDefault);
      if (defaultPages.length === 0 && pages.length > 0) {
        pages[0].isDefault = true;
        loadedSettings.defaultLandingPageId = pages[0].id;
      } else if (defaultPages.length > 1) {
        pages.forEach((p, idx) => {
          p.isDefault = (idx === pages.indexOf(defaultPages[0]));
        });
        loadedSettings.defaultLandingPageId = defaultPages[0].id;
      }

      if (!loadedSettings.fraudControl) {
        loadedSettings.fraudControl = INITIAL_SETTINGS.fraudControl;
      } else {
        if (!loadedSettings.fraudControl.blockedIps) {
          loadedSettings.fraudControl.blockedIps = [];
        }
        if (loadedSettings.fraudControl.enableIpBlocking === undefined) {
          loadedSettings.fraudControl.enableIpBlocking = true;
        }
      }

      // Orders: If demo removed, NEVER load INITIAL_ORDERS under any circumstance; also strip demo IDs
      let loadedOrders: Order[] = [];
      if (Array.isArray(parsed.orders)) {
        loadedOrders = isDemoRemoved
          ? parsed.orders.filter((o: Order) => !DEMO_ORDER_IDS.has(o.id))
          : parsed.orders;
      } else if (!isDemoRemoved) {
        loadedOrders = INITIAL_ORDERS;
      }

      // Incomplete orders: If demo removed, NEVER load INITIAL_INCOMPLETE_ORDERS; also strip demo IDs
      let loadedIncomplete: IncompleteOrder[] = [];
      if (Array.isArray(parsed.incompleteOrders)) {
        loadedIncomplete = isDemoRemoved
          ? parsed.incompleteOrders.filter((inc: IncompleteOrder) => !DEMO_INCOMPLETE_IDS.has(inc.id))
          : parsed.incompleteOrders;
      } else if (!isDemoRemoved) {
        loadedIncomplete = INITIAL_INCOMPLETE_ORDERS;
      }

      let loadedUsers: AdminUser[] = Array.isArray(parsed.users) ? parsed.users : INITIAL_ADMIN_USERS;
      if (!loadedUsers.some((u: AdminUser) => u.email?.toLowerCase().trim() === 'bmrayhan330@gmail.com')) {
        const ownerUser = INITIAL_ADMIN_USERS.find(u => u.email === 'bmrayhan330@gmail.com');
        if (ownerUser) {
          loadedUsers.unshift(ownerUser);
        }
      }

      return {
        landingPages: pages,
        orders: loadedOrders,
        settings: loadedSettings,
        pixelLogs: Array.isArray(parsed.pixelLogs) ? parsed.pixelLogs : [],
        users: loadedUsers,
        incompleteOrders: loadedIncomplete,
        isDemoDataRemoved: isDemoRemoved,
        demoClearedAt: parsed.demoClearedAt || loadedSettings.demoClearedAt
      };
    }
  } catch (err) {
    console.error('Error loading db file:', err);
  }

  const isDemoRemoved = diskFlag;
  const initialDb: DatabaseSchema = {
    landingPages: isDemoRemoved ? [] : INITIAL_LANDING_PAGES,
    orders: isDemoRemoved ? [] : INITIAL_ORDERS,
    settings: {
      ...INITIAL_SETTINGS,
      isDemoDataRemoved: isDemoRemoved
    },
    pixelLogs: [],
    users: INITIAL_ADMIN_USERS,
    incompleteOrders: isDemoRemoved ? [] : INITIAL_INCOMPLETE_ORDERS,
    isDemoDataRemoved: isDemoRemoved
  };
  saveDatabase(initialDb);
  return initialDb;
}

function saveDatabase(data: DatabaseSchema): void {
  try {
    if (data.isDemoDataRemoved) {
      markDemoRemovedOnDisk();
      if (data.settings) {
        data.settings.isDemoDataRemoved = true;
      }
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving db file:', err);
  }
}

let db = loadDatabase();

// ==================== GOOGLE SHEETS AUTOMATION HELPER ====================
async function sendOrderToGoogleSheet(
  webhookUrl: string,
  order: Order,
  landingPageTitle: string,
  sheetName?: string
): Promise<boolean> {
  try {
    if (!webhookUrl || !webhookUrl.startsWith('http')) return false;

    const productsSummary = (order.items || [])
      .map(it => `${it.quantity}x ${it.variantName} (সাইজ: ${it.size || 'Standard'}${it.long ? `, লং: ${it.long}"` : ''})`)
      .join('; ');

    const totalQuantity = (order.items || []).reduce((acc, it) => acc + (it.quantity || 1), 0);

    const payload = {
      orderId: order.id,
      dateTime: new Date(order.createdAt).toLocaleString('bn-BD', { timeZone: 'Asia/Dhaka' }),
      createdAt: order.createdAt,
      landingPageTitle: landingPageTitle || order.landingPageTitle || 'Landing Page',
      landingPageSlug: order.landingPageSlug || '',
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerAddress: order.customerAddress,
      productsSummary,
      items: order.items,
      totalQuantity,
      subtotal: order.subtotal,
      deliveryLocation: order.deliveryLocation === 'inside_dhaka' ? 'ঢাকা ভিতরে' : 'ঢাকা বাইরে',
      deliveryCharge: order.deliveryCharge,
      grandTotal: order.grandTotal,
      status: order.status,
      notes: order.notes || '',
      sheetName: sheetName || 'Orders'
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    return response.ok || response.status < 400 || response.type === 'opaque';
  } catch (err) {
    console.error('Error sending order to Google Sheet:', err);
    return false;
  }
}

// ==================== SMS GATEWAY & DELIVERY HELPER ====================
let cachedServerIp = '';
async function getServerPublicIp(): Promise<string> {
  if (cachedServerIp) return cachedServerIp;
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3500) });
    const data = (await res.json()) as { ip?: string };
    if (data?.ip) {
      cachedServerIp = data.ip;
      return cachedServerIp;
    }
  } catch {
    // ignore
  }
  return '34.34.254.243';
}

function formatBdPhone(phone: string): { local: string; withCountryCode: string } {
  const clean = normalizePhoneNumber(phone || '');
  let local = clean;
  let withCountryCode = clean;

  if (clean.startsWith('880')) {
    local = '0' + clean.slice(3);
    withCountryCode = clean;
  } else if (clean.startsWith('01')) {
    local = clean;
    withCountryCode = '88' + clean;
  } else if (clean.startsWith('1') && clean.length === 10) {
    local = '0' + clean;
    withCountryCode = '880' + clean;
  }

  return { local, withCountryCode };
}

function isAutoSmsAllowed(eventType: 'orderReceived' | 'orderConfirmed' | 'courierDispatched' | 'delivered'): boolean {
  const cfg = db.settings?.smsGateway;
  if (!cfg || !cfg.isEnabled) return false;
  // If admin turned on Manual Only mode, all automatic event SMS are disabled
  if (cfg.manualOnly === true) return false;
  if (eventType === 'orderReceived' && cfg.autoOrderReceived === false) return false;
  if (eventType === 'orderConfirmed' && cfg.autoOrderConfirmed === false) return false;
  if (eventType === 'courierDispatched' && cfg.autoCourierDispatched === false) return false;
  if (eventType === 'delivered' && cfg.autoDelivered === false) return false;
  return true;
}

function formatSmsMessage(template: string, order: Order, brand: string, courierName?: string, trackingCode?: string): string {
  return template
    .replace(/\{customer_name\}/gi, order.customerName || 'সম্মানিত গ্রাহক')
    .replace(/\{order_id\}/gi, order.id)
    .replace(/\{total\}/gi, String(order.grandTotal))
    .replace(/\{brand_name\}/gi, brand)
    .replace(/\{courier_name\}/gi, courierName || (order.courier?.provider === 'pathao' ? 'Pathao' : 'Steadfast'))
    .replace(/\{tracking_code\}/gi, trackingCode || order.courier?.trackingCode || 'N/A');
}

async function sendSmsViaGateway(
  phone: string,
  message: string,
  customConfig?: Partial<AppSettings['smsGateway']>
): Promise<{ success: boolean; gatewayResponse: string; error?: string; serverIp: string }> {
  const serverIp = await getServerPublicIp();
  const smsConfig = {
    ...(db.settings?.smsGateway || INITIAL_SETTINGS.smsGateway),
    ...(customConfig || {})
  };

  if (!smsConfig.apiKey || !smsConfig.apiKey.trim()) {
    return {
      success: false,
      gatewayResponse: 'Missing API Key',
      error: 'এসএমএস গেটওয়ের API Key বা Token ফিল্ডটি খালি। Settings থেকে API Key দিয়ে সেভ করুন।',
      serverIp
    };
  }

  const { local, withCountryCode } = formatBdPhone(phone);
  if (!local || local.length < 11) {
    return {
      success: false,
      gatewayResponse: 'Invalid Phone Number',
      error: `অবৈধ মোবাইল নাম্বার (${phone})! সঠিক ১১ ডিজিটের নাম্বার প্রদান করুন।`,
      serverIp
    };
  }

  const provider = smsConfig.provider || 'bulksmsbd';

  try {
    if (provider === 'bulksmsbd') {
      const apiUrl = smsConfig.apiUrl?.trim() || 'http://bulksmsbd.net/api/smsapi';
      const sender = smsConfig.senderId?.trim() || '8809617628579';
      const params = new URLSearchParams({
        api_key: smsConfig.apiKey.trim(),
        type: 'text',
        number: local,
        senderid: sender,
        message: message
      });

      const fullUrl = `${apiUrl}?${params.toString()}`;
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json, text/plain, */*' }
      });
      const responseText = await response.text();

      let responseJson: any = null;
      try {
        responseJson = JSON.parse(responseText);
      } catch {
        // Plain text response
      }

      if (responseJson) {
        if (responseJson.response_code === 202) {
          return {
            success: true,
            gatewayResponse: responseJson.success_message || responseText,
            serverIp
          };
        } else {
          let errorMsg = responseJson.error_message || `BulkSMSBD এরর কোড: ${responseJson.response_code}`;
          const errLower = String(errorMsg).toLowerCase();
          if (responseJson.response_code === 1032 || errLower.includes('whitelisted') || errLower.includes('whitelist')) {
            errorMsg = `BulkSMSBD আইপি ব্লক: আপনার সার্ভার আইপি (${serverIp}) হোয়াইটলিস্ট করা নেই। সমাধান: bulksmsbd.net প্যানেলে লগইন করে Phonebook / API Settings এ গিয়ে আইপি ${serverIp} যুক্ত করুন অথবা IP Whitelisting বন্ধ (Allow All) করুন।`;
          } else if (responseJson.response_code === 1002 || errLower.includes('sender')) {
            errorMsg = `ভুল সেন্ডার আইডি (${sender})! BulkSMSBD এরর: ${errorMsg}। আপনার অ্যাকাউন্টে অনুমোদিত Sender ID প্রদান করুন।`;
          } else if (responseJson.response_code === 1003 || errLower.includes('key')) {
            errorMsg = `ভুল API Key! BulkSMSBD এ প্রদত্ত API Key টি সঠিক নয়।`;
          } else if (responseJson.response_code === 1007 || errLower.includes('balance')) {
            errorMsg = `অপর্যাপ্ত ব্যালেন্স! BulkSMSBD একাউন্টে কোনো এসএমএস ক্রেডিট অবশিষ্ট নেই।`;
          }
          return {
            success: false,
            gatewayResponse: responseText,
            error: errorMsg,
            serverIp
          };
        }
      }

      if (responseText.toLowerCase().includes('success') || responseText.includes('202')) {
        return { success: true, gatewayResponse: responseText, serverIp };
      }

      return {
        success: false,
        gatewayResponse: responseText,
        error: responseText,
        serverIp
      };
    } else if (provider === 'greenweb') {
      const apiUrl = smsConfig.apiUrl?.trim() || 'https://api.greenweb.com.bd/api.php';
      const params = new URLSearchParams({
        token: smsConfig.apiKey.trim(),
        to: withCountryCode,
        message: message
      });
      if (smsConfig.senderId && smsConfig.senderId.trim() !== 'AmarChoice') {
        params.append('senderid', smsConfig.senderId.trim());
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });
      const responseText = await response.text();

      if (responseText.toLowerCase().includes('ok') || responseText.toLowerCase().includes('success')) {
        return { success: true, gatewayResponse: responseText, serverIp };
      }
      return {
        success: false,
        gatewayResponse: responseText,
        error: `Greenweb BD এরর: ${responseText}`,
        serverIp
      };
    } else if (provider === 'mimsms') {
      const apiUrl = smsConfig.apiUrl?.trim() || 'https://mimsms.com.bd/smsapi';
      const params = new URLSearchParams({
        api_key: smsConfig.apiKey.trim(),
        type: 'text',
        contacts: withCountryCode,
        senderid: smsConfig.senderId?.trim() || '',
        msg: message
      });

      const response = await fetch(`${apiUrl}?${params.toString()}`);
      const responseText = await response.text();
      const isSuccess = response.ok && !responseText.toLowerCase().includes('error') && !responseText.toLowerCase().includes('fail');
      return {
        success: isSuccess,
        gatewayResponse: responseText,
        error: isSuccess ? undefined : `MimSMS এরর: ${responseText}`,
        serverIp
      };
    } else {
      // Custom HTTP API
      let targetUrl = smsConfig.apiUrl?.trim() || '';
      targetUrl = targetUrl
        .replace(/\{api_key\}/gi, encodeURIComponent(smsConfig.apiKey.trim()))
        .replace(/\{sender_id\}/gi, encodeURIComponent(smsConfig.senderId?.trim() || ''))
        .replace(/\{phone\}/gi, encodeURIComponent(local))
        .replace(/\{message\}/gi, encodeURIComponent(message));

      const response = await fetch(targetUrl);
      const responseText = await response.text();
      return {
        success: response.ok,
        gatewayResponse: responseText,
        error: response.ok ? undefined : `Custom API এরর: ${responseText}`,
        serverIp
      };
    }
  } catch (err: any) {
    return {
      success: false,
      gatewayResponse: err?.message || 'Network error',
      error: `এসএমএস গেটওয়ে সংযোগে ত্রুটি: ${err?.message || 'Network error'}`,
      serverIp
    };
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // ==================== API ROUTES ====================

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // --- LANDING PAGES ---
  app.get('/api/landing-pages', (_req: Request, res: Response) => {
    res.json(db.landingPages);
  });

  app.get('/api/landing-pages/:slugOrId', (req: Request, res: Response) => {
    const slugOrId = (req.params.slugOrId || '').trim().toLowerCase();
    const page = db.landingPages.find(p => 
      (p.slug && p.slug.trim().toLowerCase() === slugOrId) || 
      (p.id && p.id.trim().toLowerCase() === slugOrId)
    );
    if (!page) {
      return res.status(404).json({ error: 'Landing page not found' });
    }
    res.json(page);
  });

  app.post('/api/landing-pages', (req: Request, res: Response) => {
    const body = req.body;
    const newPage: LandingPage = {
      id: `lp-${Date.now()}`,
      slug: body.slug ? body.slug.toLowerCase().replace(/[^a-z0-9-_]/g, '-') : `page-${Date.now()}`,
      title: body.title || 'নতুন প্রোডাক্ট ল্যান্ডিং পেইজ',
      brandName: body.brandName || 'AmarChoice',
      brandTagline: body.brandTagline || 'প্রিমিয়াম কালেকশন',
      topBannerText: body.topBannerText || '🎉 বিশেষ অফার – সীমিত সময়ের জন্য ছাড়!',
      showTopBanner: body.showTopBanner !== false,
      heroTitle: body.heroTitle || body.title || 'প্রিমিয়াম কালেকশন',
      ratingStars: body.ratingStars || '★★★★★',
      ratingCountText: body.ratingCountText || '১২০+ সন্তুষ্ট কাস্টমার',
      mainImage: body.mainImage || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&q=80',
      galleryImages: body.galleryImages || [body.mainImage || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&q=80'],
      features: body.features || ['১০০% অরিজিনাল কোয়ালিটি', 'ক্যাশ অন ডেলিভারি সুবিধা', 'সহজ রিটার্ন সুবিধা'],
      countdown: body.countdown || { enabled: true, hours: 6, title: '⏰ অফার শেষ হওয়ার আগেই অর্ডার করুন!' },
      callNumber: body.callNumber || '01606318193',
      products: body.products || [],
      storeCategories: body.storeCategories || ['সকল পণ্য', 'বোরকা ও আবায়া', 'পাঞ্জাবি', 'শাড়ি', 'হিজাব', 'অফার'],
      deliveryCharges: body.deliveryCharges || { insideDhaka: 60, outsideDhaka: 120, isFreeDelivery: false },
      metaPixelEnabled: body.metaPixelEnabled !== undefined ? Boolean(body.metaPixelEnabled) : Boolean(body.facebookPixelId || body.metaCapiToken),
      facebookPixelId: body.facebookPixelId !== undefined ? body.facebookPixelId : (db.settings.globalPixelId || ''),
      metaCapiToken: body.metaCapiToken !== undefined ? body.metaCapiToken : (db.settings.globalMetaCapiToken || ''),
      metaTestCode: body.metaTestCode !== undefined ? body.metaTestCode : '',
      tiktokPixelEnabled: body.tiktokPixelEnabled !== undefined ? Boolean(body.tiktokPixelEnabled) : Boolean(body.tiktokPixelId || body.tiktokCapiToken),
      tiktokPixelId: body.tiktokPixelId !== undefined ? body.tiktokPixelId : (db.settings.globalTiktokPixelId || ''),
      tiktokCapiToken: body.tiktokCapiToken !== undefined ? body.tiktokCapiToken : (db.settings.globalTiktokCapiToken || ''),
      tiktokTestCode: body.tiktokTestCode !== undefined ? body.tiktokTestCode : '',
      themeColor: body.themeColor || '#c0392b',
      pageType: body.pageType || 'landing',
      isDefault: !!body.isDefault,
      googleSheetConfig: body.googleSheetConfig || { enabled: false, webhookUrl: '', sheetName: 'Orders' },
      smsTemplates: body.smsTemplates || {
        enabled: false,
        orderReceived: '',
        orderConfirmed: '',
        courierDispatched: '',
        delivered: ''
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (newPage.isDefault) {
      db.landingPages.forEach(p => {
        p.isDefault = false;
      });
      db.settings.defaultLandingPageId = newPage.id;
    }

    db.landingPages.unshift(newPage);
    saveDatabase(db);
    res.status(201).json(newPage);
  });

  app.put('/api/landing-pages/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const index = db.landingPages.findIndex(p => p.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Landing page not found' });
    }

    const isNowDefault = req.body.isDefault === true;
    const existing = db.landingPages[index];

    db.landingPages[index] = {
      ...existing,
      ...req.body,
      metaPixelEnabled: req.body.metaPixelEnabled !== undefined ? Boolean(req.body.metaPixelEnabled) : existing.metaPixelEnabled,
      facebookPixelId: req.body.facebookPixelId !== undefined ? req.body.facebookPixelId : existing.facebookPixelId,
      metaCapiToken: req.body.metaCapiToken !== undefined ? req.body.metaCapiToken : existing.metaCapiToken,
      metaTestCode: req.body.metaTestCode !== undefined ? req.body.metaTestCode : existing.metaTestCode,
      tiktokPixelEnabled: req.body.tiktokPixelEnabled !== undefined ? Boolean(req.body.tiktokPixelEnabled) : existing.tiktokPixelEnabled,
      tiktokPixelId: req.body.tiktokPixelId !== undefined ? req.body.tiktokPixelId : existing.tiktokPixelId,
      tiktokCapiToken: req.body.tiktokCapiToken !== undefined ? req.body.tiktokCapiToken : existing.tiktokCapiToken,
      tiktokTestCode: req.body.tiktokTestCode !== undefined ? req.body.tiktokTestCode : existing.tiktokTestCode,
      id, // Preserve id
      updatedAt: new Date().toISOString()
    };

    if (isNowDefault) {
      db.landingPages.forEach((p, idx) => {
        p.isDefault = (idx === index);
      });
      if (!db.settings) db.settings = { ...INITIAL_SETTINGS };
      db.settings.defaultLandingPageId = id;
    } else {
      if (!db.landingPages.some(p => p.isDefault) && db.landingPages.length > 0) {
        db.landingPages[0].isDefault = true;
        if (!db.settings) db.settings = { ...INITIAL_SETTINGS };
        db.settings.defaultLandingPageId = db.landingPages[0].id;
      }
    }

    saveDatabase(db);
    res.json(db.landingPages[index]);
  });

  // Set any landing page or e-commerce store as the default home page
  app.post('/api/landing-pages/:id/set-default', (req: Request, res: Response) => {
    const { id } = req.params;
    const target = db.landingPages.find(p => p.id === id || p.slug === id);
    if (!target) {
      return res.status(404).json({ error: 'Landing page not found' });
    }

    db.landingPages.forEach(p => {
      p.isDefault = (p.id === target.id);
    });
    if (!db.settings) db.settings = { ...INITIAL_SETTINGS };
    db.settings.defaultLandingPageId = target.id;
    saveDatabase(db);
    res.json({ success: true, defaultPageId: target.id, defaultPage: target, landingPages: db.landingPages });
  });

  app.delete('/api/landing-pages/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    if (db.landingPages.length <= 1) {
      return res.status(400).json({ error: 'Cannot delete the only remaining landing page.' });
    }
    const wasDefault = db.landingPages.some(p => p.id === id && p.isDefault);
    db.landingPages = db.landingPages.filter(p => p.id !== id);
    if (wasDefault && db.landingPages.length > 0) {
      db.landingPages[0].isDefault = true;
      db.settings.defaultLandingPageId = db.landingPages[0].id;
    }
    if (id === 'lp-mayaboti-1' || id === 'fashion-store' || id.startsWith('lp-mayaboti')) {
      db.isDemoDataRemoved = true;
      if (db.settings) db.settings.isDemoDataRemoved = true;
    }
    saveDatabase(db);
    res.json({ success: true, message: 'Landing page deleted successfully', landingPages: db.landingPages });
  });

  // --- ORDERS ---
  app.get('/api/orders', (req: Request, res: Response) => {
    const isDemoRemoved = Boolean(isDemoRemovedOnDisk() || db.isDemoDataRemoved || db.settings?.isDemoDataRemoved);
    let orders = [...db.orders];
    if (isDemoRemoved) {
      orders = orders.filter(o => !DEMO_ORDER_IDS.has(o.id));
      if (orders.length !== db.orders.length) {
        db.orders = orders;
        saveDatabase(db);
      }
    }
    const { landingPageId, status } = req.query;
    if (landingPageId && typeof landingPageId === 'string') {
      orders = orders.filter(o => o.landingPageId === landingPageId);
    }
    if (status && typeof status === 'string') {
      orders = orders.filter(o => o.status === status);
    }
    // Sort newest first
    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(orders);
  });

  app.post('/api/orders', async (req: Request, res: Response) => {
    const body = req.body;
    if (!body.customerName || !body.customerPhone || !body.customerAddress) {
      return res.status(400).json({ error: 'Customer name, phone, and address are required' });
    }
    if (!body.items || body.items.length === 0) {
      return res.status(400).json({ error: 'At least one product must be selected' });
    }

    const clientIp = getClientIp(req);
    const normalizedPhone = normalizePhoneNumber(body.customerPhone);

    // 1. Check if customer Phone or IP is blocked
    const fraudConfig = db.settings.fraudControl || {
      enableDailyLimit: true,
      maxOrdersPerDay: 2,
      autoBlockOnExceed: true,
      enableIpBlocking: true,
      blockDurationDays: 30,
      blockedPhones: [],
      blockedIps: []
    };

    if (!fraudConfig.blockedPhones) fraudConfig.blockedPhones = [];
    if (!fraudConfig.blockedIps) fraudConfig.blockedIps = [];

    // Check blocked phone
    const isPhoneBlocked = fraudConfig.blockedPhones.some(
      b => normalizePhoneNumber(b.phone) === normalizedPhone
    );
    if (isPhoneBlocked) {
      return res.status(403).json({
        error: 'blocked',
        message: 'দুঃখিত, আপনার মোবাইল নাম্বারটি ফ্রড সুরক্ষার জন্য ব্লক করা আছে। বিস্তারিত তথ্যের জন্য আমাদের কাস্টমার সার্ভিসে যোগাযোগ করুন।'
      });
    }

    // Check blocked IP
    if (fraudConfig.enableIpBlocking !== false && clientIp) {
      const isIpBlocked =
        fraudConfig.blockedIps.some(b => b.ip === clientIp) ||
        fraudConfig.blockedPhones.some(b => b.ip && b.ip === clientIp);

      if (isIpBlocked) {
        return res.status(403).json({
          error: 'ip_blocked',
          message: `দুঃখিত, অতিরিক্ত বা সন্দেহজনক ফেক অর্ডারের পুনরাবৃত্তির কারণে আপনার ডিভাইস/আইপি (${clientIp}) ব্লক করা হয়েছে। বিস্তারিত তথ্যের জন্য কাস্টমার সার্ভিসে যোগাযোগ করুন।`
        });
      }
    }

    // 2. Check daily order limit (Checks both phone and client IP)
    if (fraudConfig.enableDailyLimit) {
      const maxLimit = Math.max(1, fraudConfig.maxOrdersPerDay || 2);
      const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;

      // Match orders by phone
      const recentOrdersByPhone = db.orders.filter(o => {
        const phoneMatch = normalizePhoneNumber(o.customerPhone) === normalizedPhone;
        const timeMatch = new Date(o.createdAt).getTime() >= twentyFourHoursAgo;
        return phoneMatch && timeMatch;
      });

      // Match orders by IP (excluding loopback if empty)
      const recentOrdersByIp = (clientIp && clientIp !== '127.0.0.1' && clientIp !== '::1')
        ? db.orders.filter(o => {
            const ipMatch = o.customerIp && o.customerIp === clientIp;
            const timeMatch = new Date(o.createdAt).getTime() >= twentyFourHoursAgo;
            return ipMatch && timeMatch;
          })
        : [];

      const currentOrderCount = Math.max(recentOrdersByPhone.length, recentOrdersByIp.length);

      if (currentOrderCount >= maxLimit) {
        // Auto block both phone AND IP if autoBlockOnExceed enabled
        if (fraudConfig.autoBlockOnExceed) {
          // 1. Auto-block Phone
          if (!fraudConfig.blockedPhones.some(b => normalizePhoneNumber(b.phone) === normalizedPhone)) {
            fraudConfig.blockedPhones.unshift({
              id: `blk-${Date.now()}`,
              phone: body.customerPhone.trim(),
              ip: clientIp || undefined,
              name: body.customerName.trim(),
              reason: `দৈনিক অর্ডারের সর্বোচ্চ সীমা (${maxLimit}টি) অতিক্রম করায় সিস্টেম স্বয়ংক্রিয়ভাবে ফোন ও আইপি ব্লক করেছে`,
              blockedAt: new Date().toISOString(),
              blockedBy: 'system',
              orderCountToday: currentOrderCount + 1
            });
          }

          // 2. Auto-block IP address
          if (clientIp && !fraudConfig.blockedIps.some(b => b.ip === clientIp)) {
            fraudConfig.blockedIps.unshift({
              id: `ip-${Date.now()}`,
              ip: clientIp,
              associatedPhone: body.customerPhone.trim(),
              name: body.customerName.trim(),
              reason: `দৈনিক অর্ডারের সর্বোচ্চ সীমা (${maxLimit}টি) অতিক্রম করায় সিস্টেম স্বয়ংক্রিয়ভাবে আইপি ব্লক করেছে`,
              blockedAt: new Date().toISOString(),
              blockedBy: 'system',
              orderCountToday: currentOrderCount + 1
            });
          }

          db.settings.fraudControl = fraudConfig;
          saveDatabase(db);
        }

        return res.status(429).json({
          error: 'limit_exceeded',
          message: `আপনি আজকে ইতিমধ্যে ${currentOrderCount}টি অর্ডার সম্পন্ন বা চেষ্টা করেছেন। প্রতিদিন সর্বোচ্চ ${maxLimit}টি অর্ডার করার অনুমতি রয়েছে। অতিরিক্ত ফেক অর্ডারের চেষ্টার কারণে আপনার মোবাইল নাম্বার এবং ডিভাইস আইপি (${clientIp || 'Network'}) স্বয়ংক্রিয়ভাবে ব্লক করা হয়েছে। বিস্তারিত সহায়তার জন্য হেল্পলাইনে যোগাযোগ করুন।`
        });
      }
    }

    // Generate sequential order ID and serial number (never random numbers)
    let maxOrderNum = 1000;
    let maxSerial = 0;
    for (const ord of db.orders) {
      if (ord.serialNumber && typeof ord.serialNumber === 'number' && ord.serialNumber > maxSerial) {
        maxSerial = ord.serialNumber;
      }
      const match = ord.id?.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxOrderNum && num < 1000000) {
          maxOrderNum = num;
        }
      }
    }
    const nextOrderNum = maxOrderNum + 1;
    const nextSerial = Math.max(maxSerial + 1, db.orders.length + 1);
    const orderId = `ORD-${nextOrderNum}`;

    const newOrder: Order = {
      id: orderId,
      serialNumber: nextSerial,
      landingPageId: body.landingPageId || (db.landingPages[0]?.id ?? 'default'),
      landingPageTitle: body.landingPageTitle || (db.landingPages[0]?.title ?? 'অর্ডার পেজ'),
      landingPageSlug: body.landingPageSlug || (db.landingPages[0]?.slug ?? 'default'),
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      customerAddress: body.customerAddress,
      customerIp: clientIp || undefined,
      items: body.items,
      deliveryLocation: body.deliveryLocation || 'inside_dhaka',
      deliveryCharge: Number(body.deliveryCharge) || 0,
      subtotal: Number(body.subtotal) || 0,
      grandTotal: Number(body.grandTotal) || 0,
      status: 'pending',
      createdAt: new Date().toISOString(),
      notes: body.notes || ''
    };

    // If an incomplete checkout exists for this customer, mark it recovered
    if (db.incompleteOrders && db.incompleteOrders.length > 0) {
      db.incompleteOrders = db.incompleteOrders.map(inc => {
        if (normalizePhoneNumber(inc.customerPhone) === normalizedPhone && inc.status !== 'recovered') {
          return {
            ...inc,
            status: 'recovered' as const,
            notes: (inc.notes ? inc.notes + ' • ' : '') + `অর্ডার সফলভাবে কনফার্ম হয়েছে: #${newOrder.id}`
          };
        }
        return inc;
      });
    }

    // Find matched page for page-specific configurations
    const matchedPage = db.landingPages.find(p => p.id === newOrder.landingPageId || p.slug === newOrder.landingPageSlug);

    // Auto-send order received SMS if gateway configured and permitted
    if (isAutoSmsAllowed('orderReceived')) {
      let template = '';
      if (matchedPage?.smsTemplates?.enabled && matchedPage.smsTemplates.orderReceived) {
        template = matchedPage.smsTemplates.orderReceived;
      } else if (db.settings.smsGateway?.templates?.orderReceived) {
        template = db.settings.smsGateway.templates.orderReceived;
      }

      if (template) {
        const brand = matchedPage?.brandName || 'AmarChoice';
        const smsText = formatSmsMessage(template, newOrder, brand);

        try {
          const pageSenderId = matchedPage?.smsTemplates?.enabled && matchedPage.smsTemplates.senderId
            ? matchedPage.smsTemplates.senderId
            : undefined;
          const smsRes = await sendSmsViaGateway(
            newOrder.customerPhone,
            smsText,
            pageSenderId ? { senderId: pageSenderId } : undefined
          );
          newOrder.smsLogs = [
            {
              id: `sms-${Date.now()}`,
              sentAt: new Date().toISOString(),
              phone: newOrder.customerPhone,
              message: smsText,
              status: smsRes.success ? 'sent' : 'failed',
              gatewayResponse: smsRes.gatewayResponse || smsRes.error
            }
          ];
        } catch (err: any) {
          newOrder.smsLogs = [
            {
              id: `sms-${Date.now()}`,
              sentAt: new Date().toISOString(),
              phone: newOrder.customerPhone,
              message: smsText,
              status: 'failed',
              gatewayResponse: err?.message || 'Failed to send SMS'
            }
          ];
        }
      }
    }

    db.orders.unshift(newOrder);
    saveDatabase(db);

    // Optional Google Sheet auto-sync per on-page landing page or ecommerce store
    if (matchedPage?.googleSheetConfig?.enabled && matchedPage.googleSheetConfig.webhookUrl) {
      sendOrderToGoogleSheet(
        matchedPage.googleSheetConfig.webhookUrl,
        newOrder,
        matchedPage.title,
        matchedPage.googleSheetConfig.sheetName
      ).then(success => {
        if (success) {
          newOrder.googleSheetSynced = true;
          newOrder.googleSheetSyncedAt = new Date().toISOString();
          if (matchedPage.googleSheetConfig) {
            matchedPage.googleSheetConfig.lastSyncedAt = new Date().toISOString();
          }
          saveDatabase(db);
        }
      }).catch(err => {
        console.warn('Google Sheet auto-sync error:', err);
      });
    }

    res.status(201).json(newOrder);
  });

  // --- GOOGLE SHEETS SYNC ENDPOINTS ---
  app.post('/api/landing-pages/:id/test-sheet', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { webhookUrl, sheetName } = req.body;
    const page = db.landingPages.find(p => p.id === id);
    const targetUrl = webhookUrl || page?.googleSheetConfig?.webhookUrl;
    if (!targetUrl) {
      return res.status(400).json({ error: 'গুগল শিট ওয়েব অ্যাপ ইউআরএল প্রদান করা হয়নি।' });
    }

    const testOrder: Order = {
      id: `TEST-${Math.floor(1000 + Math.random() * 9000)}`,
      landingPageId: id,
      landingPageTitle: page?.title || 'টেস্ট ল্যান্ডিং পেইজ',
      landingPageSlug: page?.slug || 'test-page',
      customerName: 'সাকিব আল হাসান (টেস্ট কাস্টমার)',
      customerPhone: '01711000000',
      customerAddress: 'হাউজ ১২, রোড ৫, ধানমন্ডি, ঢাকা',
      items: [
        {
          variantId: 'v-test',
          variantName: 'স্যাম্পল টেস্ট প্রোডাক্ট',
          size: 'XL',
          long: '42',
          quantity: 1,
          unitPrice: 1200,
          subtotal: 1200
        }
      ],
      deliveryLocation: 'inside_dhaka',
      deliveryCharge: 70,
      subtotal: 1200,
      grandTotal: 1270,
      status: 'pending',
      notes: 'গুগল শিট কানেকশন যাচাই টেস্ট এন্ট্রি',
      createdAt: new Date().toISOString()
    };

    const success = await sendOrderToGoogleSheet(targetUrl, testOrder, page?.title || 'টেস্ট পেজ', sheetName || page?.googleSheetConfig?.sheetName);
    if (success) {
      if (page && page.googleSheetConfig) {
        page.googleSheetConfig.lastSyncedAt = new Date().toISOString();
        saveDatabase(db);
      }
      return res.json({ success: true, message: 'গুগল শিটে টেস্ট রো সফলভাবে যুক্ত হয়েছে!' });
    } else {
      return res.status(500).json({ error: 'গুগল শিটে সংযোগ করা যায়নি। আপনার Web App URL এবং Deploy অনুমতি (Anyone) যাচাই করুন।' });
    }
  });

  app.post('/api/orders/:id/sync-sheet', async (req: Request, res: Response) => {
    const { id } = req.params;
    const order = db.orders.find(o => o.id === id);
    if (!order) {
      return res.status(404).json({ error: 'অর্ডার পাওয়া যায়নি' });
    }

    const page = db.landingPages.find(p => p.id === order.landingPageId || p.slug === order.landingPageSlug);
    const webhookUrl = page?.googleSheetConfig?.webhookUrl;
    if (!webhookUrl) {
      return res.status(400).json({ error: 'এই ল্যান্ডিং পেইজের জন্য গুগল শিট ইউআরএল কনফিগার করা নেই।' });
    }

    const success = await sendOrderToGoogleSheet(webhookUrl, order, page.title, page.googleSheetConfig?.sheetName);
    if (success) {
      order.googleSheetSynced = true;
      order.googleSheetSyncedAt = new Date().toISOString();
      if (page.googleSheetConfig) {
        page.googleSheetConfig.lastSyncedAt = new Date().toISOString();
      }
      saveDatabase(db);
      return res.json({ success: true, message: 'অর্ডারটি সফলভাবে গুগল শিটে পাঠানো হয়েছে' });
    } else {
      return res.status(500).json({ error: 'গুগল শিটে পাঠানো ব্যর্থ হয়েছে' });
    }
  });

  app.post('/api/landing-pages/:id/sync-all-orders', async (req: Request, res: Response) => {
    const { id } = req.params;
    const page = db.landingPages.find(p => p.id === id);
    if (!page) return res.status(404).json({ error: 'ল্যান্ডিং পেইজ পাওয়া যায়নি' });
    if (!page.googleSheetConfig?.webhookUrl) {
      return res.status(400).json({ error: 'গুগল শিট ইউআরএল যুক্ত করা নেই' });
    }

    const pageOrders = db.orders.filter(o => o.landingPageId === id || o.landingPageSlug === page.slug);
    if (pageOrders.length === 0) {
      return res.json({ success: true, count: 0, message: 'এই পেইজে কোনো অর্ডার নেই' });
    }

    let syncedCount = 0;
    for (const order of pageOrders) {
      const ok = await sendOrderToGoogleSheet(page.googleSheetConfig.webhookUrl, order, page.title, page.googleSheetConfig.sheetName);
      if (ok) {
        order.googleSheetSynced = true;
        order.googleSheetSyncedAt = new Date().toISOString();
        syncedCount++;
      }
    }

    if (page.googleSheetConfig) {
      page.googleSheetConfig.lastSyncedAt = new Date().toISOString();
    }
    saveDatabase(db);
    return res.json({ success: true, count: syncedCount, message: `${syncedCount} টি অর্ডার সফলভাবে গুগল শিটে সিঙ্ক হয়েছে!` });
  });

  app.patch('/api/orders/:id/status', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, notes } = req.body;
    const order = db.orders.find(o => o.id === id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const previousStatus = order.status;
    if (status) order.status = status;
    if (notes !== undefined) order.notes = notes;

    // Trigger SMS when status changes to 'confirmed' or 'delivered' if permitted
    if (status && status !== previousStatus) {
      const isConfirmedPermitted = status === 'confirmed' && isAutoSmsAllowed('orderConfirmed');
      const isDeliveredPermitted = status === 'delivered' && isAutoSmsAllowed('delivered');

      if (isConfirmedPermitted || isDeliveredPermitted) {
        const matchedPage = db.landingPages.find(p => p.id === order.landingPageId || p.slug === order.landingPageSlug);
        const brand = matchedPage?.brandName || 'AmarChoice';
        const pageSenderId = matchedPage?.smsTemplates?.enabled && matchedPage.smsTemplates.senderId
          ? matchedPage.smsTemplates.senderId
          : undefined;

        let tpl = '';
        if (status === 'confirmed') {
          if (matchedPage?.smsTemplates?.enabled && matchedPage.smsTemplates.orderConfirmed) {
            tpl = matchedPage.smsTemplates.orderConfirmed;
          } else if (db.settings.smsGateway?.templates?.orderConfirmed) {
            tpl = db.settings.smsGateway.templates.orderConfirmed;
          }
        } else if (status === 'delivered') {
          if (matchedPage?.smsTemplates?.enabled && matchedPage.smsTemplates.delivered) {
            tpl = matchedPage.smsTemplates.delivered;
          } else if (db.settings.smsGateway?.templates?.delivered) {
            tpl = db.settings.smsGateway.templates.delivered;
          }
        }

        if (tpl) {
          const msg = formatSmsMessage(tpl, order, brand);

          try {
            const smsRes = await sendSmsViaGateway(
              order.customerPhone,
              msg,
              pageSenderId ? { senderId: pageSenderId } : undefined
            );
            if (!order.smsLogs) order.smsLogs = [];
            order.smsLogs.unshift({
              id: `sms-${Date.now()}`,
              sentAt: new Date().toISOString(),
              phone: order.customerPhone,
              message: msg,
              status: smsRes.success ? 'sent' : 'failed',
              gatewayResponse: smsRes.gatewayResponse || smsRes.error
            });
          } catch (err: any) {
            console.error(`Failed to send status ${status} SMS:`, err);
          }
        }
      }
    }

    saveDatabase(db);
    res.json(order);
  });

  // Full edit of complete order info (customer, items, delivery, totals, status, notes)
  app.put('/api/orders/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const order = db.orders.find(o => o.id === id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const body = req.body;
    if (body.customerName !== undefined) order.customerName = String(body.customerName).trim();
    if (body.customerPhone !== undefined) order.customerPhone = String(body.customerPhone).trim();
    if (body.customerAddress !== undefined) order.customerAddress = String(body.customerAddress).trim();
    if (body.deliveryLocation !== undefined) order.deliveryLocation = body.deliveryLocation;
    if (body.deliveryCharge !== undefined) order.deliveryCharge = Number(body.deliveryCharge) || 0;
    if (body.subtotal !== undefined) order.subtotal = Number(body.subtotal) || 0;
    if (body.grandTotal !== undefined) order.grandTotal = Number(body.grandTotal) || 0;
    if (body.notes !== undefined) order.notes = body.notes;
    if (body.status !== undefined) order.status = body.status;
    if (Array.isArray(body.items)) {
      order.items = body.items;
      if (body.subtotal === undefined) {
        order.subtotal = order.items.reduce((sum, it) => sum + (Number(it.unitPrice || 0) * Number(it.quantity || 1)), 0);
      }
      if (body.grandTotal === undefined) {
        order.grandTotal = order.subtotal + (order.deliveryCharge || 0);
      }
    }
    saveDatabase(db);
    res.json(order);
  });

  app.delete('/api/orders/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    db.orders = db.orders.filter(o => o.id !== id);
    // If user has cleared out orders, guarantee demo data will never reload
    if (db.orders.length === 0) {
      db.isDemoDataRemoved = true;
      if (db.settings) db.settings.isDemoDataRemoved = true;
    }
    saveDatabase(db);
    res.json({ success: true });
  });

  // Sync locally stored fallback orders from client to backend database
  app.post('/api/orders/sync-local', (req: Request, res: Response) => {
    const { localOrders } = req.body;
    if (!Array.isArray(localOrders)) {
      return res.status(400).json({ error: 'localOrders array required' });
    }
    let addedCount = 0;
    for (const lo of localOrders) {
      if (!lo || !lo.id) continue;
      const cleanLoId = lo.id.trim().toLowerCase().replace(/^#/, '');
      const exists = db.orders.some(o => o.id.toLowerCase().replace(/^#/, '') === cleanLoId);
      if (!exists) {
        db.orders.unshift({
          ...lo,
          createdAt: lo.createdAt || new Date().toISOString()
        });
        addedCount++;
      }
    }
    if (addedCount > 0) {
      // Sort newest first
      db.orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      saveDatabase(db);
    }
    res.json({ success: true, addedCount, orders: db.orders });
  });

  // Bulk clear all orders permanently
  app.post('/api/orders/clear-all', (_req: Request, res: Response) => {
    db.orders = [];
    db.isDemoDataRemoved = true;
    if (!db.settings) db.settings = { ...INITIAL_SETTINGS };
    db.settings.isDemoDataRemoved = true;
    saveDatabase(db);
    res.json({ success: true, message: 'সকল অর্ডার মুছে ফেলা হয়েছে এবং ডেমো ডাটা স্থায়ীভাবে বন্ধ করা হয়েছে' });
  });

  // --- BULK ORDERS ACTION ---
  app.post('/api/orders/bulk-action', async (req: Request, res: Response) => {
    const { orderIds, action, status, provider } = req.body;
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: 'কোনো অর্ডার নির্বাচন করা হয়নি' });
    }

    let affectedCount = 0;

    if (action === 'delete') {
      const idSet = new Set(orderIds);
      const initialCount = db.orders.length;
      db.orders = db.orders.filter(o => !idSet.has(o.id));
      affectedCount = initialCount - db.orders.length;
      if (db.orders.length === 0) {
        db.isDemoDataRemoved = true;
        if (db.settings) db.settings.isDemoDataRemoved = true;
      }
      saveDatabase(db);
      return res.json({ success: true, count: affectedCount, orders: db.orders, message: `${affectedCount} টি অর্ডার সফলভাবে মুছে ফেলা হয়েছে` });
    }

    if (action === 'status' && status) {
      for (const id of orderIds) {
        const order = db.orders.find(o => o.id === id);
        if (!order) continue;
        const previousStatus = order.status;
        order.status = status;
        affectedCount++;

        // Trigger SMS if status is confirmed or delivered
        if (status !== previousStatus) {
          const isConfirmedAllowed = status === 'confirmed' && isAutoSmsAllowed('orderConfirmed');
          const isDeliveredAllowed = status === 'delivered' && isAutoSmsAllowed('delivered');

          if (isConfirmedAllowed || isDeliveredAllowed) {
            const matchedPage = db.landingPages.find(p => p.id === order.landingPageId || p.slug === order.landingPageSlug);
            const brand = matchedPage?.brandName || 'AmarChoice';
            const pageSenderId = matchedPage?.smsTemplates?.enabled && matchedPage.smsTemplates.senderId
              ? matchedPage.smsTemplates.senderId
              : undefined;

            let tpl = '';
            if (status === 'confirmed') {
              tpl = (matchedPage?.smsTemplates?.enabled && matchedPage.smsTemplates.orderConfirmed) || db.settings.smsGateway?.templates?.orderConfirmed || '';
            } else if (status === 'delivered') {
              tpl = (matchedPage?.smsTemplates?.enabled && matchedPage.smsTemplates.delivered) || db.settings.smsGateway?.templates?.delivered || '';
            }

            if (tpl) {
              const msg = formatSmsMessage(tpl, order, brand);

              try {
                const smsRes = await sendSmsViaGateway(
                  order.customerPhone,
                  msg,
                  pageSenderId ? { senderId: pageSenderId } : undefined
                );
                if (!order.smsLogs) order.smsLogs = [];
                order.smsLogs.unshift({
                  id: `sms-${Date.now()}`,
                  sentAt: new Date().toISOString(),
                  phone: order.customerPhone,
                  message: msg,
                  status: smsRes.success ? 'sent' : 'failed',
                  gatewayResponse: smsRes.gatewayResponse || smsRes.error
                });
              } catch (err: any) {
                console.error('Bulk SMS send error:', err);
              }
            }
          }
        }
      }
      saveDatabase(db);
      return res.json({ success: true, count: affectedCount, orders: db.orders, message: `${affectedCount} টি অর্ডারের স্ট্যাটাস সফলভাবে আপডেট করা হয়েছে` });
    }

    if (action === 'courier' && (provider === 'steadfast' || provider === 'pathao')) {
      for (const id of orderIds) {
        const order = db.orders.find(o => o.id === id);
        if (!order) continue;

        if (provider === 'steadfast') {
          const sfConfig = db.settings.steadfast;
          const cleanPhone = formatSteadfastPhone(order.customerPhone);
          let consignmentId = `ST-${Math.floor(100000 + Math.random() * 900000)}`;
          let trackingCode = `SF${Math.floor(10000 + Math.random() * 90000)}BD`;
          let courierStatus = 'in_review';

          // If real Steadfast credentials configured and active, dispatch to real API
          const isReal = Boolean(
            sfConfig && sfConfig.isEnabled && !sfConfig.sandboxMode &&
            sfConfig.apiKey && sfConfig.apiKey.trim() &&
            sfConfig.secretKey && sfConfig.secretKey.trim()
          );

          if (isReal && cleanPhone.length === 11) {
            try {
              const sfReq = await fetchSteadfastRequest('/create_order', {
                method: 'POST',
                headers: {
                  'Api-Key': sfConfig.apiKey.trim(),
                  'Secret-Key': sfConfig.secretKey.trim()
                },
                body: JSON.stringify({
                  invoice: order.id,
                  recipient_name: (order.customerName || 'Customer').trim().slice(0, 100),
                  recipient_phone: cleanPhone,
                  recipient_address: (order.customerAddress || 'Dhaka, Bangladesh').trim().slice(0, 250),
                  cod_amount: Math.max(0, Math.round(Number(order.grandTotal) || 0)),
                  note: (order.notes || 'Handle with care').trim().slice(0, 450)
                })
              }, sfConfig.baseUrl);

              const result: any = sfReq.data;
              if (sfReq.ok && (result?.status === 200 || result?.consignment)) {
                if (result.consignment?.consignment_id) consignmentId = String(result.consignment.consignment_id);
                if (result.consignment?.tracking_code) trackingCode = String(result.consignment.tracking_code);
                else if (result.tracking_code) trackingCode = String(result.tracking_code);
                if (result.consignment?.status) courierStatus = result.consignment.status;
              }
            } catch (err) {
              console.warn('Steadfast bulk dispatch API error:', err);
            }
          }

          order.courier = {
            provider: 'steadfast',
            consignmentId,
            trackingCode,
            status: courierStatus,
            sentAt: new Date().toISOString(),
            deliveryFee: 120,
            note: order.notes || 'Bulk Dispatch'
          };
          order.status = 'in_courier';
          affectedCount++;

          if (isAutoSmsAllowed('courierDispatched')) {
            const matchedPage = db.landingPages.find(p => p.id === order.landingPageId || p.slug === order.landingPageSlug);
            const tpl = (matchedPage?.smsTemplates?.enabled && matchedPage.smsTemplates.courierDispatched) || db.settings.smsGateway?.templates?.courierDispatched;
            if (tpl) {
              const brand = matchedPage?.brandName || 'AmarChoice';
              const pageSenderId = matchedPage?.smsTemplates?.enabled && matchedPage.smsTemplates.senderId
                ? matchedPage.smsTemplates.senderId
                : undefined;
              const msg = formatSmsMessage(tpl, order, brand, 'Steadfast Courier', trackingCode);

              try {
                const smsRes = await sendSmsViaGateway(
                  cleanPhone || order.customerPhone,
                  msg,
                  pageSenderId ? { senderId: pageSenderId } : undefined
                );
                if (!order.smsLogs) order.smsLogs = [];
                order.smsLogs.unshift({
                  id: `sms-${Date.now()}`,
                  sentAt: new Date().toISOString(),
                  phone: cleanPhone || order.customerPhone,
                  message: msg,
                  status: smsRes.success ? 'sent' : 'failed',
                  gatewayResponse: smsRes.gatewayResponse || smsRes.error
                });
              } catch (e) {}
            }
          }
        } else if (provider === 'pathao') {
          const consignmentId = `PTH-${Math.floor(100000 + Math.random() * 900000)}`;
          const trackingCode = `PTH-LK${Math.floor(10000 + Math.random() * 90000)}`;
          order.courier = {
            provider: 'pathao',
            consignmentId,
            trackingCode,
            status: 'Picked',
            sentAt: new Date().toISOString(),
            deliveryFee: 120,
            note: order.notes || 'Bulk Dispatch'
          };
          order.status = 'in_courier';
          affectedCount++;

          if (isAutoSmsAllowed('courierDispatched')) {
            const matchedPage = db.landingPages.find(p => p.id === order.landingPageId || p.slug === order.landingPageSlug);
            const tpl = (matchedPage?.smsTemplates?.enabled && matchedPage.smsTemplates.courierDispatched) || db.settings.smsGateway?.templates?.courierDispatched;
            if (tpl) {
              const brand = matchedPage?.brandName || 'AmarChoice';
              const pageSenderId = matchedPage?.smsTemplates?.enabled && matchedPage.smsTemplates.senderId
                ? matchedPage.smsTemplates.senderId
                : undefined;
              const msg = formatSmsMessage(tpl, order, brand, 'Pathao Courier', trackingCode);

              try {
                const smsRes = await sendSmsViaGateway(
                  order.customerPhone,
                  msg,
                  pageSenderId ? { senderId: pageSenderId } : undefined
                );
                if (!order.smsLogs) order.smsLogs = [];
                order.smsLogs.unshift({
                  id: `sms-${Date.now()}`,
                  sentAt: new Date().toISOString(),
                  phone: order.customerPhone,
                  message: msg,
                  status: smsRes.success ? 'sent' : 'failed',
                  gatewayResponse: smsRes.gatewayResponse || smsRes.error
                });
              } catch (e) {}
            }
          }
        }
      }
      saveDatabase(db);
      return res.json({ 
        success: true, 
        count: affectedCount, 
        orders: db.orders, 
        message: `${affectedCount} টি অর্ডার সফলভাবে ${provider === 'steadfast' ? 'স্টিডফাস্ট' : 'পাঠাও'} কুরিয়ারে বুকিং সম্পন্ন হয়েছে` 
      });
    }

    if (action === 'sync_courier') {
      affectedCount = await syncActiveCourierOrders(orderIds);
      return res.json({ 
        success: true, 
        count: affectedCount, 
        orders: db.orders, 
        message: affectedCount > 0 
          ? `${affectedCount} টি অর্ডারের কুরিয়ার স্ট্যাটাস সফলভাবে সিঙ্ক ও আপডেট করা হয়েছে`
          : 'নির্বাচিত অর্ডারসমূহের কুরিয়ার স্ট্যাটাস ইতিমধ্যে সর্বশেষ অবস্থায় রয়েছে' 
      });
    }

    return res.status(400).json({ error: 'অকার্যকর বাল্ক একশন' });
  });

  // Bulk clear all demo data (orders, incomplete orders, optional demo pages)
  app.post('/api/demo-data/clear', (req: Request, res: Response) => {
    const { clearOrders = true, clearIncomplete = true, clearDemoPages = false } = req.body || {};
    markDemoRemovedOnDisk();
    db.isDemoDataRemoved = true;
    if (!db.settings) db.settings = { ...INITIAL_SETTINGS };
    db.settings.isDemoDataRemoved = true;
    db.settings.demoClearedAt = new Date().toISOString();

    if (clearOrders) {
      db.orders = [];
    }
    if (clearIncomplete) {
      db.incompleteOrders = [];
    }
    if (clearDemoPages) {
      // Remove default demo landing pages: lp-mayaboti-1, fashion-store
      const remainingPages = db.landingPages.filter(
        p => p.id !== 'lp-mayaboti-1' && p.slug !== 'mayaboti-dress' && p.slug !== 'fashion-store'
      );
      if (remainingPages.length > 0) {
        db.landingPages = remainingPages;
        if (!db.landingPages.some(p => p.isDefault)) {
          db.landingPages[0].isDefault = true;
          db.settings.defaultLandingPageId = db.landingPages[0].id;
        }
      }
    }

    saveDatabase(db);
    res.json({
      success: true,
      message: 'সকল ডেমো ডাটা সফলভাবে মুছে ফেলা হয়েছে। এখন থেকে শুধুমাত্র আপনার রিয়েল ডাটা সংরক্ষিত থাকবে।',
      orders: db.orders,
      incompleteOrders: db.incompleteOrders || [],
      landingPages: db.landingPages,
      settings: db.settings
    });
  });

  // --- COURIER INTEGRATION & AUTO-STATUS SYNC (Steadfast & Pathao) ---

  function getSteadfastBaseUrls(configuredBaseUrl?: string): string[] {
    const list: string[] = [];
    const conf = (configuredBaseUrl || '').trim().replace(/\/+$/, '');
    if (conf && !conf.includes('steadfast.com.bd')) {
      list.push(conf);
    }
    // Official Steadfast working API gateway (packzy.com)
    list.push('https://portal.packzy.com/api/v1');
    if (conf && conf.includes('steadfast.com.bd')) {
      list.push(conf);
    } else {
      list.push('https://portal.steadfast.com.bd/api/v1');
    }
    return Array.from(new Set(list));
  }

  async function fetchSteadfastRequest(
    endpoint: string,
    options: {
      method?: string;
      headers: Record<string, string>;
      body?: string;
    },
    configuredBaseUrl?: string
  ): Promise<{ ok: boolean; status: number; data: any; error?: string }> {
    const candidateUrls = getSteadfastBaseUrls(configuredBaseUrl);
    let lastError = '';

    for (const base of candidateUrls) {
      try {
        const fullUrl = `${base}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 9000);

        const response = await fetch(fullUrl, {
          method: options.method || 'GET',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'AmarChoice-Ecom/1.0',
            ...options.headers
          },
          body: options.body,
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const data = await response.json().catch(() => null);
        return { ok: response.ok, status: response.status, data };
      } catch (err: any) {
        lastError = err.message || 'Network error';
      }
    }
    return { ok: false, status: 500, data: null, error: lastError };
  }

  // Helper to normalize Bangladeshi phone numbers to strictly 11 digits (e.g. 01XXXXXXXXX)
  function formatSteadfastPhone(phone: string | number | undefined): string {
    if (!phone) return '';
    const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    let clean = phone.toString().trim();
    bengaliDigits.forEach((d, idx) => {
      clean = clean.split(d).join(String(idx));
    });
    // Remove all non-digit characters (spaces, dashes, parens, etc.)
    clean = clean.replace(/\D/g, '');
    // Strip country code (+88 or 88) if present
    if (clean.startsWith('880') && clean.length === 13) {
      clean = clean.slice(2);
    } else if (clean.startsWith('88') && clean.length === 13) {
      clean = clean.slice(2);
    }
    // If 10 digits starting with 1, prepend 0
    if (clean.length === 10 && clean.startsWith('1')) {
      clean = '0' + clean;
    }
    return clean;
  }

  // Map Steadfast & courier tracking status to internal OrderStatus
  // Reference official Steadfast statuses: in_review, pending, hold, delivered, delivered_approval_pending,
  // partial_delivered, partial_delivered_approval_pending, cancelled, cancelled_approval_pending,
  // partial_delivered_return_processing, cancelled_return_processing, exceptional, unknown
  function mapCourierStatusToOrderStatus(courierStatus: string): OrderStatus {
    const s = (courierStatus || '').toLowerCase().trim();
    
    // Delivered statuses
    if (
      s === 'delivered' ||
      s === 'delivered_approval_pending' ||
      s === 'partial_delivered' ||
      s === 'partial_delivered_approval_pending' ||
      s.includes('delivered') ||
      s === 'completed' ||
      s === 'successful'
    ) {
      return 'delivered';
    }

    // Cancelled statuses
    if (
      s === 'cancelled' ||
      s === 'cancelled_approval_pending' ||
      s.includes('cancel') ||
      s === 'closed'
    ) {
      return 'cancelled';
    }

    // Returned statuses
    if (
      s.includes('return') ||
      s.includes('failed') ||
      s.includes('rejected')
    ) {
      return 'returned';
    }

    // All active in-flight courier statuses (in_review, pending, hold, in_transit, picked, out_for_delivery, exceptional, unknown)
    // NOTE: in_review and pending MUST remain 'in_courier' so the order is tracked in courier view!
    return 'in_courier';
  }

  // Live status query for Steadfast using multiple identifiers (Tracking Code, Consignment ID, Invoice)
  async function fetchSteadfastStatus(order: Order, sfConfig: any): Promise<{ status: string; rawData: any } | null> {
    const headers = {
      'Api-Key': sfConfig.apiKey.trim(),
      'Secret-Key': sfConfig.secretKey.trim()
    };

    // 1. Try by tracking code
    if (order.courier?.trackingCode) {
      try {
        const res = await fetchSteadfastRequest(`/status_by_trackingcode/${encodeURIComponent(order.courier.trackingCode.trim())}`, { headers }, sfConfig.baseUrl);
        if (res.ok && res.data) {
          const st = res.data.delivery_status || (typeof res.data.status === 'string' ? res.data.status : null);
          if (st) return { status: st, rawData: res.data };
        }
      } catch (e) {
        console.warn('Steadfast status_by_trackingcode query error:', e);
      }
    }

    // 2. Try by consignment ID
    if (order.courier?.consignmentId) {
      try {
        const res = await fetchSteadfastRequest(`/status_by_cid/${encodeURIComponent(order.courier.consignmentId.trim())}`, { headers }, sfConfig.baseUrl);
        if (res.ok && res.data) {
          const st = res.data.delivery_status || (typeof res.data.status === 'string' ? res.data.status : null);
          if (st) return { status: st, rawData: res.data };
        }
      } catch (e) {
        console.warn('Steadfast status_by_cid query error:', e);
      }
    }

    // 3. Try by invoice (Order ID)
    if (order.id) {
      try {
        const res = await fetchSteadfastRequest(`/status_by_invoice/${encodeURIComponent(order.id.trim())}`, { headers }, sfConfig.baseUrl);
        if (res.ok && res.data) {
          const st = res.data.delivery_status || (typeof res.data.status === 'string' ? res.data.status : null);
          if (st) return { status: st, rawData: res.data };
        }
      } catch (e) {
        console.warn('Steadfast status_by_invoice query error:', e);
      }
    }

    return null;
  }

  // Auto-sync function for active orders in courier
  async function syncActiveCourierOrders(specificOrderIds?: string[]): Promise<number> {
    const sfConfig = db.settings?.steadfast;
    const isRealSteadfast = Boolean(
      sfConfig?.isEnabled &&
      sfConfig?.apiKey && sfConfig.apiKey.trim() &&
      sfConfig?.secretKey && sfConfig.secretKey.trim() &&
      !sfConfig.sandboxMode
    );

    let updatedCount = 0;
    const ordersToSync = db.orders.filter(o => {
      if (specificOrderIds && specificOrderIds.length > 0) {
        return specificOrderIds.includes(o.id) && o.courier?.trackingCode;
      }
      return o.status === 'in_courier' && o.courier?.trackingCode;
    });

    for (const order of ordersToSync) {
      if (!order.courier) continue;

      if (order.courier.provider === 'steadfast') {
        if (isRealSteadfast) {
          const queryRes = await fetchSteadfastStatus(order, sfConfig);
          if (queryRes && queryRes.status) {
            const newCourierStatus = queryRes.status;
            const newOrderStatus = mapCourierStatusToOrderStatus(newCourierStatus);
            if (order.courier.status !== newCourierStatus || order.status !== newOrderStatus) {
              order.courier.status = newCourierStatus;
              order.status = newOrderStatus;
              updatedCount++;
            }
          }
        } else if (specificOrderIds && specificOrderIds.length > 0) {
          // In test/sandbox mode, advance status cycle on manual sync
          const statuses = ['In Transit', 'Out for Delivery', 'Delivered'];
          const curr = order.courier.status || 'In Transit';
          const nextIdx = (statuses.indexOf(curr) + 1) % statuses.length;
          const nextStatus = statuses[nextIdx];
          order.courier.status = nextStatus;
          order.status = mapCourierStatusToOrderStatus(nextStatus);
          updatedCount++;
        }
      }
    }

    if (updatedCount > 0) {
      saveDatabase(db);
    }
    return updatedCount;
  }

  // Background interval: auto-check and update courier orders every 2 minutes
  setInterval(async () => {
    try {
      await syncActiveCourierOrders();
    } catch (err) {
      console.warn('Periodic courier auto-sync error:', err);
    }
  }, 2 * 60 * 1000);

  // In-memory cache for customer courier parcel history (15 mins TTL)
  const customerCourierCache: Record<string, { data: CourierCustomerHistory; timestamp: number }> = {};

  // Helper to query customer courier history & delivery stats
  async function queryCustomerCourierHistory(rawPhone: string): Promise<CourierCustomerHistory> {
    const cleanPhone = formatSteadfastPhone(rawPhone);
    const now = Date.now();
    const CACHE_TTL = 15 * 60 * 1000; // 15 minutes cache

    // 1. Return cached history if still fresh
    if (cleanPhone && customerCourierCache[cleanPhone] && (now - customerCourierCache[cleanPhone].timestamp < CACHE_TTL)) {
      return customerCourierCache[cleanPhone].data;
    }

    const sfConfig = db.settings?.steadfast;
    const isRealSteadfast = Boolean(
      sfConfig?.isEnabled &&
      sfConfig?.apiKey && sfConfig.apiKey.trim() &&
      sfConfig?.secretKey && sfConfig.secretKey.trim() &&
      !sfConfig.sandboxMode
    );

    // Compute internal store records for fallback & combined insight
    const matchingStoreOrders = db.orders.filter(o => formatSteadfastPhone(o.customerPhone) === cleanPhone);
    const storeDelivered = matchingStoreOrders.filter(o => o.status === 'delivered').length;
    const storeCancelled = matchingStoreOrders.filter(o => o.status === 'cancelled' || o.status === 'returned').length;
    const storeTotal = matchingStoreOrders.length;

    let resultHistory: CourierCustomerHistory = {
      phone: cleanPhone || rawPhone,
      totalParcels: storeTotal,
      totalDelivered: storeDelivered,
      totalCancelled: storeCancelled,
      totalFraudReports: 0,
      deliveryRate: storeTotal > 0 ? Math.round((storeDelivered / (storeDelivered + storeCancelled || 1)) * 100) : 0,
      level: storeCancelled > storeDelivered && storeCancelled >= 2 ? 'risk' : (storeDelivered >= 1 ? 'safe' : 'new'),
      source: 'store',
      checkedAt: new Date().toISOString(),
      isLiveCourier: false
    };

    if (isRealSteadfast && cleanPhone && cleanPhone.length === 11 && cleanPhone.startsWith('01')) {
      try {
        const fcReq = await fetchSteadfastRequest(`/fraud_check/${cleanPhone}`, {
          headers: {
            'Api-Key': sfConfig.apiKey.trim(),
            'Secret-Key': sfConfig.secretKey.trim()
          }
        }, sfConfig.baseUrl);

        if (fcReq.ok && fcReq.data) {
          const d = fcReq.data;
          const totalParcels = Number(d.total_parcels) || 0;
          const totalDelivered = Number(d.total_delivered) || 0;
          const totalCancelled = Number(d.total_cancelled) || 0;
          const fraudReportsCount = Array.isArray(d.total_fraud_reports)
            ? d.total_fraud_reports.length
            : (Number(d.total_fraud_reports) || 0);

          let deliveryRate = 0;
          if (totalParcels > 0) {
            deliveryRate = Math.round((totalDelivered / totalParcels) * 100);
          }

          let score: number | undefined;
          let level: 'safe' | 'caution' | 'risk' | 'new' | 'unknown' = 'safe';
          let reasons: string[] | undefined;

          // Attempt score endpoint for further risk rating if supported
          try {
            const scoreReq = await fetchSteadfastRequest(`/fraud_check/score/${cleanPhone}`, {
              headers: {
                'Api-Key': sfConfig.apiKey.trim(),
                'Secret-Key': sfConfig.secretKey.trim()
              }
            }, sfConfig.baseUrl);
            if (scoreReq.ok && scoreReq.data) {
              score = typeof scoreReq.data.score === 'number' ? scoreReq.data.score : undefined;
              if (scoreReq.data.level === 'caution') level = 'caution';
              else if (scoreReq.data.level === 'danger' || scoreReq.data.level === 'risk') level = 'risk';
              else if (scoreReq.data.level === 'safe' || scoreReq.data.level === 'good') level = 'safe';
              reasons = scoreReq.data.reasons;
            }
          } catch {}

          if (!score) {
            if (totalParcels === 0) {
              level = 'new';
            } else if (fraudReportsCount > 0 || (totalCancelled > totalDelivered && totalCancelled >= 2) || deliveryRate < 40) {
              level = 'risk';
            } else if (deliveryRate < 70) {
              level = 'caution';
            } else {
              level = 'safe';
            }
          }

          resultHistory = {
            phone: cleanPhone,
            totalParcels,
            totalDelivered,
            totalCancelled,
            totalFraudReports: fraudReportsCount,
            deliveryRate,
            score,
            level,
            reasons,
            notice: d.notice,
            source: 'steadfast',
            checkedAt: new Date().toISOString(),
            isLiveCourier: true
          };
        } else {
          // Fallback notice when Steadfast API limit reached or temporarily unavailable
          if (fcReq.status === 429 || (fcReq.data && typeof fcReq.data.error === 'string' && fcReq.data.error.toLowerCase().includes('limit'))) {
            resultHistory.notice = `স্টিডফাস্ট এপিআই-র দৈনিক সার্চ লিমিট (${fcReq.data?.current || '18'}/${fcReq.data?.limit || '18'}) শেষ হওয়ায় স্টোরের রেকর্ড দেখানো হচ্ছে। লিমিট রিসেট হলে লাইভ কুরিয়ার ডাটা পাওয়া যাবে।`;
          } else if (fcReq.data && typeof fcReq.data.error === 'string') {
            resultHistory.notice = fcReq.data.error;
          }
        }
      } catch (err) {
        console.warn(`Steadfast fraud check failed for ${cleanPhone}:`, err);
      }
    }

    if (cleanPhone) {
      customerCourierCache[cleanPhone] = {
        data: resultHistory,
        timestamp: now
      };
    }

    return resultHistory;
  }

  // Single customer courier parcel & delivery history
  app.get('/api/courier/check-customer/:phone', async (req: Request, res: Response) => {
    const { phone } = req.params;
    try {
      const history = await queryCustomerCourierHistory(phone);
      res.json({ success: true, history });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to check customer courier history' });
    }
  });

  // Bulk check customer courier history for orders list
  app.post('/api/courier/check-customers-bulk', async (req: Request, res: Response) => {
    const { phones } = req.body;
    if (!Array.isArray(phones)) {
      return res.status(400).json({ error: 'phones array is required' });
    }

    const uniquePhones = Array.from(new Set(phones.map(p => formatSteadfastPhone(p)).filter(Boolean)));
    const histories: Record<string, CourierCustomerHistory> = {};

    const chunkSize = 5;
    for (let i = 0; i < uniquePhones.length; i += chunkSize) {
      const chunk = uniquePhones.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map(async p => {
          try {
            const h = await queryCustomerCourierHistory(p);
            histories[p] = h;
          } catch (e) {
            console.warn(`Bulk courier check error for ${p}:`, e);
          }
        })
      );
    }

    res.json({ success: true, histories });
  });

  // Test Steadfast Connection & Check Account Balance
  app.post('/api/courier/test-steadfast', async (req: Request, res: Response) => {
    const apiKey = (req.body?.apiKey || db.settings?.steadfast?.apiKey || '').trim();
    const secretKey = (req.body?.secretKey || db.settings?.steadfast?.secretKey || '').trim();
    const baseUrl = (req.body?.baseUrl || db.settings?.steadfast?.baseUrl || 'https://portal.packzy.com/api/v1').replace(/\/+$/, '');

    if (!apiKey || !secretKey) {
      return res.status(400).json({
        success: false,
        error: 'Steadfast API Key ও Secret Key উভয় ফিল্ড পূরণ করতে হবে'
      });
    }

    try {
      const result = await fetchSteadfastRequest('/get_balance', {
        headers: {
          'Api-Key': apiKey,
          'Secret-Key': secretKey
        }
      }, baseUrl);

      if (result.ok && (result.data?.status === 200 || result.data?.current_balance !== undefined)) {
        // Upgrade settings if still pointing to outdated steadfast domain
        if (db.settings?.steadfast && (!db.settings.steadfast.baseUrl || db.settings.steadfast.baseUrl.includes('steadfast.com.bd'))) {
          db.settings.steadfast.baseUrl = 'https://portal.packzy.com/api/v1';
          saveDatabase(db);
        }

        return res.json({
          success: true,
          balance: result.data?.current_balance !== undefined ? result.data.current_balance : 0,
          message: `Steadfast API কানেকশন সফল! বর্তমান ব্যালেন্স: ৳${result.data?.current_balance ?? 0}`
        });
      } else {
        const data = result.data || {};
        return res.status(400).json({
          success: false,
          error: data.message || `কানেকশন ব্যর্থ হয়েছে (Code: ${data.status || result.status})। আপনার API Key ও Secret Key সঠিক কি না যাচাই করুন।`
        });
      }
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: `Steadfast সার্ভারের সাথে যোগাযোগ করা যায়নি: ${err.message || 'নেটওয়ার্ক এরর'}`
      });
    }
  });

  // Dispatch single order to courier
  app.post('/api/orders/:id/courier', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { provider, deliveryFee, note, orderData } = req.body;
    const cleanId = (id || '').trim().replace(/^#/, '').toLowerCase();
    let order = db.orders.find(o => o.id.toLowerCase().replace(/^#/, '') === cleanId || o.id === id);

    // If order was created in client-side fallback and missing in db.orders, auto-register it
    if (!order && orderData && orderData.id) {
      order = {
        ...orderData,
        id: orderData.id,
        createdAt: orderData.createdAt || new Date().toISOString()
      };
      db.orders.unshift(order);
      saveDatabase(db);
    }

    if (!order) {
      return res.status(404).json({
        error: `অর্ডার (#${id}) ডাটাবেজে পাওয়া যায়নি। পেজটি রিফ্রেশ করে আবার চেষ্টা করুন।`
      });
    }

    if (provider === 'steadfast') {
      const sfConfig = db.settings.steadfast;
      const cleanPhone = formatSteadfastPhone(order.customerPhone);

      // Validate 11-digit Bangladeshi mobile number
      if (cleanPhone.length !== 11 || !cleanPhone.startsWith('01')) {
        return res.status(400).json({
          error: `গ্রাহকের ফোন নম্বর "${order.customerPhone || ''}" সঠিক নয়। Steadfast কুরিয়ারের জন্য ১১ ডিজিটের মোবাইল নম্বর (যেমন: 01XXXXXXXXX) আবশ্যক। দয়া করে অর্ডারটি এডিট করে সঠিক ফোন নম্বর দিন।`
        });
      }

      // Check if real live credentials configured
      const isReal = Boolean(
        sfConfig?.isEnabled &&
        sfConfig?.apiKey && sfConfig.apiKey.trim() &&
        sfConfig?.secretKey && sfConfig.secretKey.trim() &&
        !sfConfig.sandboxMode
      );

      if (isReal) {
        try {
          let sfInvoice = order.id;
          if (order.courier?.consignmentId || order.courier?.trackingCode) {
            sfInvoice = `${order.id}-${Date.now().toString().slice(-4)}`;
          }

          const sfPayload = {
            invoice: sfInvoice,
            recipient_name: (order.customerName || 'Customer').trim().slice(0, 100),
            recipient_phone: cleanPhone,
            recipient_address: (order.customerAddress || 'Dhaka, Bangladesh').trim().slice(0, 250),
            cod_amount: Math.max(0, Math.round(Number(order.grandTotal) || 0)),
            note: (note || order.notes || 'Handle with care').trim().slice(0, 450)
          };

          let sfReq = await fetchSteadfastRequest('/create_order', {
            method: 'POST',
            body: JSON.stringify(sfPayload),
            headers: {
              'Api-Key': sfConfig.apiKey.trim(),
              'Secret-Key': sfConfig.secretKey.trim()
            }
          }, sfConfig.baseUrl);

          let result: any = sfReq.data;

          // If invoice already taken, auto-retry with unique timestamp suffix
          if (!sfReq.ok && (
            result?.message?.toLowerCase().includes('already been taken') ||
            result?.errors?.invoice?.some((m: string) => m.toLowerCase().includes('already been taken'))
          )) {
            const retryInvoice = `${order.id}-${Date.now().toString().slice(-4)}`;
            const retryPayload = { ...sfPayload, invoice: retryInvoice };
            const retryReq = await fetchSteadfastRequest('/create_order', {
              method: 'POST',
              body: JSON.stringify(retryPayload),
              headers: {
                'Api-Key': sfConfig.apiKey.trim(),
                'Secret-Key': sfConfig.secretKey.trim()
              }
            }, sfConfig.baseUrl);
            if (retryReq.ok && (retryReq.data?.status === 200 || retryReq.data?.consignment)) {
              sfReq = retryReq;
              result = retryReq.data;
            }
          }

          if (sfReq.ok && (result?.status === 200 || result?.consignment)) {
            const consignment = result.consignment || {};
            const consignmentId = String(consignment.consignment_id || result.consignment_id || `ST-${Date.now()}`);
            const trackingCode = String(consignment.tracking_code || result.tracking_code || `SF-${Date.now()}`);

            order.courier = {
              provider: 'steadfast',
              consignmentId,
              trackingCode,
              status: consignment.status || 'in_review',
              sentAt: new Date().toISOString(),
              deliveryFee: Number(deliveryFee) || 120,
              note: note || order.notes || 'Steadfast Dispatch'
            };
            order.status = 'in_courier';
            saveDatabase(db);

            // Auto Send Courier SMS if configured and permitted
            if (isAutoSmsAllowed('courierDispatched')) {
              const matchedPage = db.landingPages.find(p => p.id === order.landingPageId || p.slug === order.landingPageSlug);
              let tpl = (matchedPage?.smsTemplates?.enabled && matchedPage.smsTemplates.courierDispatched) || db.settings.smsGateway?.templates?.courierDispatched;
              if (tpl) {
                const brand = matchedPage?.brandName || 'AmarChoice';
                const pageSenderId = matchedPage?.smsTemplates?.enabled && matchedPage.smsTemplates.senderId ? matchedPage.smsTemplates.senderId : undefined;
                const msg = formatSmsMessage(tpl, order, brand, 'Steadfast Courier', trackingCode);

                try {
                  const smsRes = await sendSmsViaGateway(cleanPhone, msg, pageSenderId ? { senderId: pageSenderId } : undefined);
                  if (!order.smsLogs) order.smsLogs = [];
                  order.smsLogs.unshift({
                    id: `sms-${Date.now()}`,
                    sentAt: new Date().toISOString(),
                    phone: cleanPhone,
                    message: msg,
                    status: smsRes.success ? 'sent' : 'failed',
                    gatewayResponse: smsRes.gatewayResponse || smsRes.error
                  });
                  saveDatabase(db);
                } catch (e) {}
              }
            }

            return res.json({
              success: true,
              courier: order.courier,
              order,
              message: `স্টিডফাস্ট কুরিয়ারে সফলভাবে পার্সেল বুকিং হয়েছে! কনসাইনমেন্ট আইডি: ${consignmentId}, ট্র্যাকিং কোড: ${trackingCode}`
            });
          } else {
            // Steadfast rejected the order
            let errMsg = result.message || '';
            if (result.errors) {
              const errDetails = Object.entries(result.errors)
                .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(', ')}`)
                .join('; ');
              errMsg = `${errMsg ? errMsg + ' - ' : ''}${errDetails}`;
            }
            return res.status(400).json({
              error: `Steadfast কুরিয়ার বুকিং প্রত্যাখ্যান করেছে: ${errMsg || 'API Key/Secret Key সঠিক কি না অথবা গ্রাহকের ফোন নম্বর সঠিক কি না পরীক্ষা করুন'}`,
              details: result
            });
          }
        } catch (apiErr: any) {
          console.error('Steadfast live create_order error:', apiErr);
          return res.status(500).json({
            error: `Steadfast সার্ভারের সাথে সংযোগ স্থাপন ব্যর্থ হয়েছে: ${apiErr.message || 'নেটওয়ার্ক এরর'}`
          });
        }
      }

      // Default / Sandbox successful dispatch
      const consignmentId = `ST-${Math.floor(100000 + Math.random() * 900000)}`;
      const trackingCode = `SF${Math.floor(10000 + Math.random() * 90000)}BD`;
      order.courier = {
        provider: 'steadfast',
        consignmentId,
        trackingCode,
        status: 'in_review',
        sentAt: new Date().toISOString(),
        deliveryFee: Number(deliveryFee) || 120,
        note: note || 'Steadfast Courier Entry (Test Mode)'
      };
      order.status = 'in_courier';

      // Auto Send Courier SMS in sandbox/test if configured and permitted
      if (isAutoSmsAllowed('courierDispatched')) {
        const matchedPage = db.landingPages.find(p => p.id === order.landingPageId || p.slug === order.landingPageSlug);
        let tpl = (matchedPage?.smsTemplates?.enabled && matchedPage.smsTemplates.courierDispatched) || db.settings.smsGateway?.templates?.courierDispatched;
        if (tpl) {
          const brand = matchedPage?.brandName || 'AmarChoice';
          const pageSenderId = matchedPage?.smsTemplates?.enabled && matchedPage.smsTemplates.senderId ? matchedPage.smsTemplates.senderId : undefined;
          const msg = formatSmsMessage(tpl, order, brand, 'Steadfast Courier', trackingCode);

          try {
            const smsRes = await sendSmsViaGateway(cleanPhone, msg, pageSenderId ? { senderId: pageSenderId } : undefined);
            if (!order.smsLogs) order.smsLogs = [];
            order.smsLogs.unshift({
              id: `sms-${Date.now()}`,
              sentAt: new Date().toISOString(),
              phone: cleanPhone,
              message: msg,
              status: smsRes.success ? 'sent' : 'failed',
              gatewayResponse: smsRes.gatewayResponse || smsRes.error
            });
          } catch (e) {}
        }
      }

      saveDatabase(db);
      return res.json({
        success: true,
        courier: order.courier,
        order,
        message: `টেস্ট মোডে কুরিয়ার এন্ট্রি সম্পন্ন হয়েছে! ট্র্যাকিং কোড: ${trackingCode} (রিয়েল পার্সেল বুক করতে সেটিংসে রিয়েল API Key ও Secret Key দিন)`
      });
    } else if (provider === 'pathao') {
      const pathaoConfig = db.settings.pathao;
      const consignmentId = `PTH-${Math.floor(100000 + Math.random() * 900000)}`;
      const trackingCode = `PTH-LK${Math.floor(10000 + Math.random() * 90000)}`;

      order.courier = {
        provider: 'pathao',
        consignmentId,
        trackingCode,
        status: 'In Transit',
        sentAt: new Date().toISOString(),
        deliveryFee: Number(deliveryFee) || 130,
        note: note || 'Pathao Courier Entry'
      };
      order.status = 'in_courier';

      if (isAutoSmsAllowed('courierDispatched')) {
        const matchedPage = db.landingPages.find(p => p.id === order.landingPageId || p.slug === order.landingPageSlug);
        let tpl = (matchedPage?.smsTemplates?.enabled && matchedPage.smsTemplates.courierDispatched) || db.settings.smsGateway?.templates?.courierDispatched;
        if (tpl) {
          const brand = matchedPage?.brandName || 'AmarChoice';
          const pageSenderId = matchedPage?.smsTemplates?.enabled && matchedPage.smsTemplates.senderId ? matchedPage.smsTemplates.senderId : undefined;
          const msg = formatSmsMessage(tpl, order, brand, 'Pathao Courier', trackingCode);

          try {
            const smsRes = await sendSmsViaGateway(order.customerPhone, msg, pageSenderId ? { senderId: pageSenderId } : undefined);
            if (!order.smsLogs) order.smsLogs = [];
            order.smsLogs.unshift({
              id: `sms-${Date.now()}`,
              sentAt: new Date().toISOString(),
              phone: order.customerPhone,
              message: msg,
              status: smsRes.success ? 'sent' : 'failed',
              gatewayResponse: smsRes.gatewayResponse || smsRes.error
            });
          } catch (e) {}
        }
      }

      saveDatabase(db);
      return res.json({ success: true, courier: order.courier, order });
    }

    res.status(400).json({ error: 'Invalid courier provider. Must be steadfast or pathao.' });
  });

  // Check live courier tracking status & automatically update order status
  app.get('/api/orders/:id/courier-status', async (req: Request, res: Response) => {
    const { id } = req.params;
    const order = db.orders.find(o => o.id === id);
    if (!order || !order.courier) {
      return res.status(404).json({ error: 'Order or courier details not found' });
    }

    let updatedCourierStatus = order.courier.status || 'In Transit';

    // If real Steadfast configuration exists, query real tracking endpoint
    const sfConfig = db.settings.steadfast;
    const isReal = Boolean(
      sfConfig?.isEnabled &&
      sfConfig?.apiKey && sfConfig.apiKey.trim() &&
      sfConfig?.secretKey && sfConfig.secretKey.trim() &&
      !sfConfig.sandboxMode
    );

    if (order.courier.provider === 'steadfast' && isReal) {
      try {
        const queryRes = await fetchSteadfastStatus(order, sfConfig);
        if (queryRes && queryRes.status) {
          updatedCourierStatus = queryRes.status;
        }
      } catch (err) {
        console.warn('Real courier status query failed:', err);
      }
    } else {
      // Dynamic mock status cycle for testing: In Transit -> Out for Delivery -> Delivered -> Returned
      const statuses = ['In Transit', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned'];
      const currentStatus = order.courier.status || 'In Transit';
      const nextIndex = (statuses.indexOf(currentStatus) + 1) % statuses.length;
      updatedCourierStatus = statuses[nextIndex];
    }

    // Automatically update courier status and corresponding order status
    order.courier.status = updatedCourierStatus;
    const mappedOrderStatus = mapCourierStatusToOrderStatus(updatedCourierStatus);
    order.status = mappedOrderStatus;

    saveDatabase(db);

    res.json({
      success: true,
      provider: order.courier.provider,
      trackingCode: order.courier.trackingCode,
      status: updatedCourierStatus,
      orderStatus: mappedOrderStatus,
      order,
      lastUpdated: new Date().toISOString()
    });
  });

  // Sync all courier orders at once (queries live APIs for all orders in courier)
  app.post('/api/orders/sync-all-couriers', async (_req: Request, res: Response) => {
    const updatedCount = await syncActiveCourierOrders();
    res.json({
      success: true,
      count: updatedCount,
      orders: db.orders,
      message: `${updatedCount} টি অর্ডারের কুরিয়ার স্ট্যাটাস সফলভাবে সিঙ্ক ও অটো-আপডেট হয়েছে!`
    });
  });

  // Courier Webhook for Steadfast (Real-time auto status change)
  app.post('/api/courier/webhook/steadfast', (req: Request, res: Response) => {
    const { consignment_id, tracking_code, status, delivery_status, invoice } = req.body || {};
    const effectiveStatus = delivery_status || status;

    const order = db.orders.find(
      o =>
        (o.courier && (
          (tracking_code && o.courier.trackingCode === tracking_code) ||
          (consignment_id && o.courier.consignmentId === String(consignment_id))
        )) ||
        (invoice && o.id === invoice)
    );

    if (order && order.courier) {
      const rawStatus = effectiveStatus || 'In Transit';
      order.courier.status = rawStatus;
      order.status = mapCourierStatusToOrderStatus(rawStatus);
      saveDatabase(db);
      return res.json({
        success: true,
        orderId: order.id,
        orderStatus: order.status,
        courierStatus: rawStatus,
        message: 'Order status updated via Steadfast webhook'
      });
    }
    res.status(404).json({ error: 'Order not found for given tracking/consignment ID or invoice' });
  });

  // Courier Webhook for Pathao
  app.post('/api/courier/webhook/pathao', (req: Request, res: Response) => {
    const { consignment_id, order_status, merchant_order_id } = req.body || {};
    const order = db.orders.find(
      o =>
        (o.courier && (o.courier.consignmentId === consignment_id || o.courier.trackingCode === consignment_id)) ||
        o.id === merchant_order_id
    );

    if (order && order.courier) {
      const rawStatus = order_status || 'In Transit';
      order.courier.status = rawStatus;
      order.status = mapCourierStatusToOrderStatus(rawStatus);
      saveDatabase(db);
      return res.json({ success: true, orderId: order.id, orderStatus: order.status, courierStatus: rawStatus });
    }
    res.status(404).json({ error: 'Order not found' });
  });

  // Courier Webhook for Pathao
  app.post('/api/courier/webhook/pathao', (req: Request, res: Response) => {
    const { consignment_id, order_status, merchant_order_id } = req.body;
    const order = db.orders.find(
      o =>
        (o.courier && (o.courier.consignmentId === consignment_id || o.courier.trackingCode === consignment_id)) ||
        o.id === merchant_order_id
    );

    if (order && order.courier) {
      const rawStatus = order_status || 'In Transit';
      order.courier.status = rawStatus;
      order.status = mapCourierStatusToOrderStatus(rawStatus);
      saveDatabase(db);
      return res.json({ success: true, orderId: order.id, orderStatus: order.status, courierStatus: rawStatus });
    }
    res.status(404).json({ error: 'Order not found' });
  });

  // --- SERVER IP & SMS GATEWAY ---
  app.get('/api/server-ip', async (_req: Request, res: Response) => {
    const ip = await getServerPublicIp();
    res.json({ ip });
  });

  app.post('/api/sms/send-test', async (req: Request, res: Response) => {
    const { phone, message, config } = req.body;
    if (!phone || !String(phone).trim()) {
      return res.status(400).json({ success: false, error: 'মোবাইল নাম্বার প্রদান করুন' });
    }
    const testMessage = message || 'টেস্ট এসএমএস: AmarChoice SMS গেটওয়ে সফলভাবে কাজ করছে!';
    const result = await sendSmsViaGateway(phone, testMessage, config);
    res.json(result);
  });

  app.post('/api/orders/:id/send-sms', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { message, customPhone } = req.body;
    const order = db.orders.find(o => o.id === id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const phoneToSend = customPhone || order.customerPhone;
    const smsMessage = message || `প্রিয় ${order.customerName}, আপনার অর্ডার #${order.id} প্রসেসিংয়ে রয়েছে। মোট মূল্য: ${order.grandTotal}৳। ধন্যবাদ!`;

    const matchedPage = db.landingPages.find(p => p.id === order.landingPageId || p.slug === order.landingPageSlug);
    const pageSenderId = matchedPage?.smsTemplates?.enabled && matchedPage.smsTemplates.senderId
      ? matchedPage.smsTemplates.senderId
      : undefined;

    const smsResult = await sendSmsViaGateway(
      phoneToSend,
      smsMessage,
      pageSenderId ? { senderId: pageSenderId } : undefined
    );

    if (!order.smsLogs) order.smsLogs = [];
    const logItem: Order['smsLogs'][number] = {
      id: `sms-${Date.now()}`,
      sentAt: new Date().toISOString(),
      phone: phoneToSend,
      message: smsMessage,
      status: smsResult.success ? 'sent' : 'failed',
      gatewayResponse: smsResult.gatewayResponse || smsResult.error || 'No response'
    };
    order.smsLogs.unshift(logItem);
    saveDatabase(db);

    res.json({ success: smsResult.success, log: logItem, order, error: smsResult.error, gatewayResponse: smsResult.gatewayResponse });
  });

  // Dedicated endpoint for Admin to trigger Order Confirmation SMS on demand
  app.post('/api/orders/:id/send-confirm-sms', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { customPhone, customMessage, updateStatusToConfirmed } = req.body;
    const order = db.orders.find(o => o.id === id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const matchedPage = db.landingPages.find(p => p.id === order.landingPageId || p.slug === order.landingPageSlug);
    const brand = matchedPage?.brandName || 'AmarChoice';
    const pageSenderId = matchedPage?.smsTemplates?.enabled && matchedPage.smsTemplates.senderId
      ? matchedPage.smsTemplates.senderId
      : undefined;

    let template = (customMessage && String(customMessage).trim()) || '';
    if (!template) {
      if (matchedPage?.smsTemplates?.enabled && matchedPage.smsTemplates.orderConfirmed) {
        template = matchedPage.smsTemplates.orderConfirmed;
      } else if (db.settings.smsGateway?.templates?.orderConfirmed) {
        template = db.settings.smsGateway.templates.orderConfirmed;
      } else {
        template = 'প্রিয় {customer_name}, আপনার অর্ডার #{order_id} সফলভাবে কনফার্ম করা হয়েছে। মোট মূল্য: {total}৳। শীঘ্রই পার্সেল পাঠানো হবে। সাথে থাকুন!';
      }
    }

    const finalMessage = formatSmsMessage(template, order, brand);
    const phoneToSend = customPhone || order.customerPhone;

    const smsResult = await sendSmsViaGateway(
      phoneToSend,
      finalMessage,
      pageSenderId ? { senderId: pageSenderId } : undefined
    );

    if (!order.smsLogs) order.smsLogs = [];
    const logItem: Order['smsLogs'][number] = {
      id: `sms-${Date.now()}`,
      sentAt: new Date().toISOString(),
      phone: phoneToSend,
      message: finalMessage,
      status: smsResult.success ? 'sent' : 'failed',
      gatewayResponse: smsResult.gatewayResponse || smsResult.error || (smsResult.success ? 'Success' : 'Failed')
    };
    order.smsLogs.unshift(logItem);

    if (updateStatusToConfirmed && order.status !== 'confirmed') {
      order.status = 'confirmed';
    }

    saveDatabase(db);

    res.json({
      success: smsResult.success,
      message: smsResult.success
        ? `অর্ডার #${order.id} এর কনফার্মেশন এসএমএস কাস্টমারের (${phoneToSend}) কাছে সফলভাবে পাঠানো হয়েছে!`
        : (smsResult.error || 'কনফার্মেশন এসএমএস পাঠাতে ব্যর্থ হয়েছে।'),
      log: logItem,
      order,
      error: smsResult.error,
      gatewayResponse: smsResult.gatewayResponse
    });
  });

  // Bulk Send Confirmation SMS endpoint
  app.post('/api/orders/bulk-confirm-sms', async (req: Request, res: Response) => {
    const { orderIds, updateStatusToConfirmed } = req.body;
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ success: false, error: 'কোনো অর্ডার নির্বাচন করা হয়নি' });
    }

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const id of orderIds) {
      const order = db.orders.find(o => o.id === id);
      if (!order) continue;

      const matchedPage = db.landingPages.find(p => p.id === order.landingPageId || p.slug === order.landingPageSlug);
      const brand = matchedPage?.brandName || 'AmarChoice';
      const pageSenderId = matchedPage?.smsTemplates?.enabled && matchedPage.smsTemplates.senderId
        ? matchedPage.smsTemplates.senderId
        : undefined;

      const template = (matchedPage?.smsTemplates?.enabled && matchedPage.smsTemplates.orderConfirmed) ||
        db.settings.smsGateway?.templates?.orderConfirmed ||
        'প্রিয় {customer_name}, আপনার অর্ডার #{order_id} সফলভাবে কনফার্ম করা হয়েছে। মোট মূল্য: {total}৳। - {brand_name}';

      const finalMessage = formatSmsMessage(template, order, brand);

      try {
        const smsResult = await sendSmsViaGateway(
          order.customerPhone,
          finalMessage,
          pageSenderId ? { senderId: pageSenderId } : undefined
        );

        if (!order.smsLogs) order.smsLogs = [];
        order.smsLogs.unshift({
          id: `sms-${Date.now()}`,
          sentAt: new Date().toISOString(),
          phone: order.customerPhone,
          message: finalMessage,
          status: smsResult.success ? 'sent' : 'failed',
          gatewayResponse: smsResult.gatewayResponse || smsResult.error || (smsResult.success ? 'Success' : 'Failed')
        });

        if (updateStatusToConfirmed && order.status !== 'confirmed') {
          order.status = 'confirmed';
        }

        if (smsResult.success) {
          successCount++;
        } else {
          failedCount++;
          if (smsResult.error && !errors.includes(smsResult.error)) {
            errors.push(smsResult.error);
          }
        }
      } catch (err: any) {
        failedCount++;
        if (err?.message && !errors.includes(err.message)) {
          errors.push(err.message);
        }
      }
    }

    saveDatabase(db);
    res.json({
      success: successCount > 0,
      count: successCount,
      failedCount,
      orders: db.orders,
      message: `${successCount} টি অর্ডারে সফলভাবে কনফার্মেশন এসএমএস পাঠানো হয়েছে${failedCount > 0 ? `, ${failedCount} টি ব্যর্থ হয়েছে` : ''}।`,
      errors: errors.length > 0 ? errors : undefined
    });
  });

  // --- APP SETTINGS ---
  app.get('/api/settings', (_req: Request, res: Response) => {
    res.json(db.settings);
  });

  app.put('/api/settings', (req: Request, res: Response) => {
    db.settings = {
      ...db.settings,
      ...req.body
    };
    if (req.body.defaultLandingPageId) {
      const targetId = req.body.defaultLandingPageId;
      const target = db.landingPages.find(p => p.id === targetId || p.slug === targetId);
      if (target) {
        db.landingPages.forEach(p => {
          p.isDefault = (p.id === target.id);
        });
        db.settings.defaultLandingPageId = target.id;
      }
    }
    saveDatabase(db);
    res.json(db.settings);
  });

  // --- PIXEL & CONVERSION API (CAPI) LOGS & SERVER-SIDE TRACKING ---
  function sha256Hash(val?: string): string | undefined {
    if (!val || typeof val !== 'string') return undefined;
    const clean = val.trim().toLowerCase();
    if (!clean) return undefined;
    return crypto.createHash('sha256').update(clean).digest('hex');
  }

  async function dispatchCapiEvents(params: {
    eventName: string;
    eventId: string;
    pageTitle: string;
    sourceUrl?: string;
    clientIp?: string;
    userAgent?: string;
    metaPixelId?: string;
    metaCapiToken?: string;
    metaTestCode?: string;
    tiktokPixelId?: string;
    tiktokCapiToken?: string;
    tiktokTestCode?: string;
    customerData?: {
      name?: string;
      phone?: string;
      email?: string;
      address?: string;
    };
    customData?: Record<string, unknown>;
  }) {
    const {
      eventName,
      eventId,
      pageTitle,
      sourceUrl = 'https://archoice.com',
      clientIp = '',
      userAgent = '',
      metaPixelId,
      metaCapiToken,
      metaTestCode,
      tiktokPixelId,
      tiktokCapiToken,
      tiktokTestCode,
      customerData = {},
      customData = {}
    } = params;

    const channels: ('facebook_pixel' | 'meta_capi' | 'tiktok_pixel' | 'tiktok_capi')[] = [];
    const capiStatus: {
      meta?: { status: 'success' | 'failed' | 'simulated'; message?: string };
      tiktok?: { status: 'success' | 'failed' | 'simulated'; message?: string };
    } = {};

    if (metaPixelId) channels.push('facebook_pixel');
    if (tiktokPixelId) channels.push('tiktok_pixel');

    // 1. Meta / Facebook Conversion API (CAPI)
    if (metaPixelId && metaCapiToken) {
      channels.push('meta_capi');
      try {
        const rawPhone = customerData.phone ? normalizePhoneNumber(customerData.phone) : undefined;
        const hashedPhone = rawPhone ? sha256Hash(`88${rawPhone}`) : undefined;
        const hashedFirstName = customerData.name ? sha256Hash(customerData.name.split(' ')[0]) : undefined;
        const hashedEmail = customerData.email ? sha256Hash(customerData.email) : undefined;

        const metaPayload = {
          data: [
            {
              event_name: eventName,
              event_time: Math.floor(Date.now() / 1000),
              event_id: eventId,
              event_source_url: sourceUrl,
              action_source: 'website',
              user_data: {
                client_ip_address: clientIp || undefined,
                client_user_agent: userAgent || undefined,
                ph: hashedPhone ? [hashedPhone] : undefined,
                fn: hashedFirstName ? [hashedFirstName] : undefined,
                em: hashedEmail ? [hashedEmail] : undefined
              },
              custom_data: {
                currency: 'BDT',
                value: customData.value || 0,
                order_id: customData.orderId,
                content_name: pageTitle,
                ...customData
              },
              test_event_code: metaTestCode || undefined
            }
          ]
        };

        const metaUrl = `https://graph.facebook.com/v19.0/${metaPixelId}/events?access_token=${metaCapiToken}`;
        const response = await fetch(metaUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(metaPayload)
        });
        const resJson = await response.json();
        if (response.ok && !resJson.error) {
          capiStatus.meta = {
            status: 'success',
            message: `Meta CAPI-তে রিয়েল-টাইম ডেলিভার্ড (Events received: ${resJson.events_received || 1})`
          };
        } else {
          capiStatus.meta = {
            status: 'failed',
            message: resJson.error?.message || 'Meta CAPI API ত্রুটি'
          };
        }
      } catch (err: unknown) {
        capiStatus.meta = {
          status: 'failed',
          message: err instanceof Error ? err.message : 'Meta CAPI Network Error'
        };
      }
    } else if (metaPixelId) {
      capiStatus.meta = {
        status: 'simulated',
        message: 'ব্রাউজার পিক্সেল সক্রিয় (Meta CAPI Token সেট করলে সার্ভার-সাইড ব্যাকআপ সক্রিয় হবে)'
      };
    }

    // 2. TikTok Conversion API / Events API
    if (tiktokPixelId && tiktokCapiToken) {
      channels.push('tiktok_capi');
      try {
        const rawPhone = customerData.phone ? normalizePhoneNumber(customerData.phone) : undefined;
        const hashedPhone = rawPhone ? sha256Hash(`+88${rawPhone}`) : undefined;
        const hashedEmail = customerData.email ? sha256Hash(customerData.email) : undefined;

        const tiktokEventName = eventName === 'Purchase' ? 'CompletePayment'
          : eventName === 'InitiateCheckout' ? 'InitiateCheckout'
          : eventName === 'AddToCart' ? 'AddToCart'
          : eventName === 'ViewContent' ? 'ViewContent'
          : 'Pageview';

        const tiktokPayload = {
          event_source: 'web',
          event_source_id: tiktokPixelId,
          data: [
            {
              event: tiktokEventName,
              event_id: eventId,
              event_time: Math.floor(Date.now() / 1000),
              user: {
                ip: clientIp || undefined,
                user_agent: userAgent || undefined,
                phone: hashedPhone,
                email: hashedEmail
              },
              properties: {
                currency: 'BDT',
                value: Number(customData.value || 0),
                order_id: customData.orderId,
                content_name: pageTitle,
                ...customData
              }
            }
          ],
          test_event_code: tiktokTestCode || undefined
        };

        const tiktokUrl = 'https://business-api.tiktok.com/open_api/v1.3/event/track/';
        const response = await fetch(tiktokUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Access-Token': tiktokCapiToken
          },
          body: JSON.stringify(tiktokPayload)
        });
        const resJson = await response.json();
        if (response.ok && resJson.code === 0) {
          capiStatus.tiktok = {
            status: 'success',
            message: 'TikTok Events API (CAPI)-তে সফলভাবে ডেলিভার্ড'
          };
        } else {
          capiStatus.tiktok = {
            status: 'failed',
            message: resJson.message || 'TikTok CAPI ত্রুটি'
          };
        }
      } catch (err: unknown) {
        capiStatus.tiktok = {
          status: 'failed',
          message: err instanceof Error ? err.message : 'TikTok CAPI Network Error'
        };
      }
    } else if (tiktokPixelId) {
      capiStatus.tiktok = {
        status: 'simulated',
        message: 'ব্রাউজার পিক্সেল সক্রিয় (TikTok CAPI Token সেট করলে সার্ভার-সাইড ব্যাকআপ সক্রিয় হবে)'
      };
    }

    return { channels, capiStatus };
  }

  app.get('/api/pixel-logs', (_req: Request, res: Response) => {
    res.json(db.pixelLogs.slice(0, 50));
  });

  app.post('/api/pixel-logs', async (req: Request, res: Response) => {
    const {
      eventName,
      pixelId,
      tiktokPixelId,
      pageTitle,
      data,
      eventId: clientEventId,
      landingPageId,
      customerData,
      sourceUrl
    } = req.body;

    const eventId = clientEventId || `ev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const page = landingPageId ? db.landingPages.find(p => p.id === landingPageId) : null;

    const effectiveMetaPixel = pixelId || page?.facebookPixelId || db.settings.globalPixelId || '';
    const effectiveMetaToken = page?.metaCapiToken || db.settings.globalMetaCapiToken || '';
    const effectiveMetaTest = page?.metaTestCode || db.settings.globalMetaTestCode || '';

    const effectiveTikTokPixel = tiktokPixelId || page?.tiktokPixelId || db.settings.globalTiktokPixelId || '';
    const effectiveTikTokToken = page?.tiktokCapiToken || db.settings.globalTiktokCapiToken || '';
    const effectiveTikTokTest = page?.tiktokTestCode || db.settings.globalTiktokTestCode || '';

    const clientIp = getClientIp(req);
    const userAgent = String(req.headers['user-agent'] || '');

    // Dispatch CAPI Server-side
    const { channels, capiStatus } = await dispatchCapiEvents({
      eventName: eventName || 'PageView',
      eventId,
      pageTitle: pageTitle || page?.title || 'Landing Page',
      sourceUrl,
      clientIp,
      userAgent,
      metaPixelId: effectiveMetaPixel,
      metaCapiToken: effectiveMetaToken,
      metaTestCode: effectiveMetaTest,
      tiktokPixelId: effectiveTikTokPixel,
      tiktokCapiToken: effectiveTikTokToken,
      tiktokTestCode: effectiveTikTokTest,
      customerData,
      customData: data || {}
    });

    const newLog: PixelEventLog = {
      id: `px-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      eventName: eventName || 'PageView',
      pixelId: effectiveMetaPixel || 'None',
      tiktokPixelId: effectiveTikTokPixel || undefined,
      eventId,
      pageTitle: pageTitle || page?.title || 'Landing Page',
      channels,
      capiStatus,
      data: data || {}
    };

    db.pixelLogs.unshift(newLog);
    if (db.pixelLogs.length > 100) {
      db.pixelLogs = db.pixelLogs.slice(0, 100);
    }
    saveDatabase(db);
    res.json({ success: true, log: newLog });
  });

  // Test CAPI Dispatch route for Admin Dashboard
  app.post('/api/pixel/test-event', async (req: Request, res: Response) => {
    const { eventType = 'Purchase' } = req.body;
    const eventId = `test_ev_${Date.now()}`;
    const clientIp = getClientIp(req);
    const userAgent = String(req.headers['user-agent'] || '');

    const { channels, capiStatus } = await dispatchCapiEvents({
      eventName: eventType,
      eventId,
      pageTitle: 'Test Event (Admin Ping)',
      sourceUrl: 'https://archoice.com/admin/test',
      clientIp,
      userAgent,
      metaPixelId: db.settings.globalPixelId,
      metaCapiToken: db.settings.globalMetaCapiToken,
      metaTestCode: db.settings.globalMetaTestCode,
      tiktokPixelId: db.settings.globalTiktokPixelId,
      tiktokCapiToken: db.settings.globalTiktokCapiToken,
      tiktokTestCode: db.settings.globalTiktokTestCode,
      customerData: {
        name: 'Test Customer',
        phone: '01711000000',
        email: 'test@example.com'
      },
      customData: {
        value: 1250,
        currency: 'BDT',
        orderId: 'TEST-ORD-01',
        isTest: true
      }
    });

    const newLog: PixelEventLog = {
      id: `px-test-${Date.now()}`,
      timestamp: new Date().toISOString(),
      eventName: eventType,
      pixelId: db.settings.globalPixelId || 'None',
      tiktokPixelId: db.settings.globalTiktokPixelId,
      eventId,
      pageTitle: '🛠️ Test Ping Event',
      channels,
      capiStatus,
      data: { value: 1250, currency: 'BDT', note: 'Manual Test Event from Admin' }
    };

    db.pixelLogs.unshift(newLog);
    saveDatabase(db);
    res.json({ success: true, log: newLog, capiStatus });
  });

  // ==================== AUTH & USERS ====================
  // Login route
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'ইমেইল এবং পাসওয়ার্ড প্রদান করুন' });
    }

    const foundUser = db.users.find(
      u => u.email.toLowerCase().trim() === String(email).toLowerCase().trim() &&
           u.password === String(password).trim()
    );

    if (!foundUser) {
      return res.status(401).json({ error: 'ভুল ইমেইল অথবা পাসওয়ার্ড! অনুগ্রহ করে আবার চেষ্টা করুন।' });
    }

    // Return safe user object (without password)
    const { password: _p, ...safeUser } = foundUser;
    return res.json({
      success: true,
      user: safeUser,
      token: `token_${safeUser.id}_${Date.now()}`
    });
  });

  // Get all users
  app.get('/api/users', (_req: Request, res: Response) => {
    const safeUsers = db.users.map(({ password: _p, ...u }) => u);
    res.json(safeUsers);
  });

  // Create new admin user
  app.post('/api/users', (req: Request, res: Response) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'নাম, ইমেইল এবং পাসওয়ার্ড আবশ্যক' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    if (db.users.some(u => u.email.toLowerCase().trim() === normalizedEmail)) {
      return res.status(400).json({ error: 'এই ইমেইল দিয়ে ইতোমধ্যে একটি একাউন্ট বিদ্যমান রয়েছে' });
    }

    const newUser: AdminUser = {
      id: `user-${Date.now()}`,
      name: String(name).trim(),
      email: normalizedEmail,
      password: String(password).trim(),
      role: role || 'admin',
      createdAt: new Date().toISOString()
    };

    db.users.push(newUser);
    saveDatabase(db);

    const { password: _p, ...safeUser } = newUser;
    res.status(201).json({ success: true, user: safeUser });
  });

  // Delete admin user
  app.delete('/api/users/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    if (db.users.length <= 1) {
      return res.status(400).json({ error: 'অন্তত একজন অ্যাডমিন ইউজার অবশিষ্ট থাকতে হবে।' });
    }

    const initialLen = db.users.length;
    db.users = db.users.filter(u => u.id !== id);

    if (db.users.length === initialLen) {
      return res.status(404).json({ error: 'ইউজার পাওয়া যায়নি' });
    }

    saveDatabase(db);
    res.json({ success: true, message: 'ইউজার সফলভাবে ডিলিট করা হয়েছে' });
  });

  // ==================== FRAUD CONTROL & ORDER LIMITS ====================
  app.get('/api/fraud-control', (_req: Request, res: Response) => {
    if (!db.settings.fraudControl) {
      db.settings.fraudControl = INITIAL_SETTINGS.fraudControl!;
      saveDatabase(db);
    }
    res.json(db.settings.fraudControl);
  });

  app.put('/api/fraud-control', (req: Request, res: Response) => {
    const body = req.body;
    db.settings.fraudControl = {
      enableDailyLimit: Boolean(body.enableDailyLimit),
      maxOrdersPerDay: Math.max(1, Number(body.maxOrdersPerDay) || 2),
      autoBlockOnExceed: Boolean(body.autoBlockOnExceed),
      enableIpBlocking: body.enableIpBlocking !== false,
      blockDurationDays: Number(body.blockDurationDays) || 30,
      blockedPhones: Array.isArray(body.blockedPhones) ? body.blockedPhones : (db.settings.fraudControl?.blockedPhones || []),
      blockedIps: Array.isArray(body.blockedIps) ? body.blockedIps : (db.settings.fraudControl?.blockedIps || [])
    };
    saveDatabase(db);
    res.json(db.settings.fraudControl);
  });

  app.post('/api/fraud-control/block', (req: Request, res: Response) => {
    const { phone, name, reason, ip } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'মোবাইল নাম্বার আবশ্যক' });
    }
    const cleanPhone = normalizePhoneNumber(phone);
    if (!db.settings.fraudControl) {
      db.settings.fraudControl = INITIAL_SETTINGS.fraudControl!;
    }
    if (!db.settings.fraudControl.blockedPhones) {
      db.settings.fraudControl.blockedPhones = [];
    }
    if (!db.settings.fraudControl.blockedIps) {
      db.settings.fraudControl.blockedIps = [];
    }

    const existingIdx = db.settings.fraudControl.blockedPhones.findIndex(
      b => normalizePhoneNumber(b.phone) === cleanPhone
    );

    const newBlockItem: BlockedCustomer = {
      id: `blk-${Date.now()}`,
      phone: phone.trim(),
      ip: ip ? String(ip).trim() : undefined,
      name: name?.trim() || 'গ্রাহক',
      reason: reason?.trim() || 'অ্যাডমিন কর্তৃক ব্লক করা হয়েছে',
      blockedAt: new Date().toISOString(),
      blockedBy: 'admin',
      orderCountToday: 0
    };

    if (existingIdx !== -1) {
      db.settings.fraudControl.blockedPhones[existingIdx] = newBlockItem;
    } else {
      db.settings.fraudControl.blockedPhones.unshift(newBlockItem);
    }

    // Also block IP if provided
    if (ip && String(ip).trim()) {
      const cleanIp = String(ip).trim();
      if (!db.settings.fraudControl.blockedIps.some(b => b.ip === cleanIp)) {
        db.settings.fraudControl.blockedIps.unshift({
          id: `ip-${Date.now()}`,
          ip: cleanIp,
          associatedPhone: phone.trim(),
          name: name?.trim() || 'গ্রাহক',
          reason: reason?.trim() || 'অ্যাডমিন কর্তৃক মোবাইল ও আইপি ব্লক করা হয়েছে',
          blockedAt: new Date().toISOString(),
          blockedBy: 'admin',
          orderCountToday: 0
        });
      }
    }

    saveDatabase(db);
    res.status(201).json(newBlockItem);
  });

  app.delete('/api/fraud-control/block/:phone', (req: Request, res: Response) => {
    const { phone } = req.params;
    const cleanPhone = normalizePhoneNumber(phone);
    if (db.settings.fraudControl?.blockedPhones) {
      db.settings.fraudControl.blockedPhones = db.settings.fraudControl.blockedPhones.filter(
        b => normalizePhoneNumber(b.phone) !== cleanPhone
      );
      saveDatabase(db);
    }
    res.json({ success: true, message: 'আনব্লক সম্পন্ন হয়েছে' });
  });

  // Block IP manually
  app.post('/api/fraud-control/block-ip', (req: Request, res: Response) => {
    const { ip, name, reason, associatedPhone } = req.body;
    if (!ip || !String(ip).trim()) {
      return res.status(400).json({ error: 'আইপি (IP) ঠিকানা আবশ্যক' });
    }
    const cleanIp = String(ip).trim();
    if (!db.settings.fraudControl) {
      db.settings.fraudControl = INITIAL_SETTINGS.fraudControl!;
    }
    if (!db.settings.fraudControl.blockedIps) {
      db.settings.fraudControl.blockedIps = [];
    }

    const existingIdx = db.settings.fraudControl.blockedIps.findIndex(b => b.ip === cleanIp);
    const newBlockItem: BlockedIpRecord = {
      id: `ip-${Date.now()}`,
      ip: cleanIp,
      associatedPhone: associatedPhone ? String(associatedPhone).trim() : undefined,
      name: name ? String(name).trim() : 'সন্দেহভাজন ডিভাইস',
      reason: reason ? String(reason).trim() : 'অ্যাডমিন কর্তৃক আইপি ম্যানুয়ালি ব্লক করা হয়েছে',
      blockedAt: new Date().toISOString(),
      blockedBy: 'admin',
      orderCountToday: 0
    };

    if (existingIdx !== -1) {
      db.settings.fraudControl.blockedIps[existingIdx] = newBlockItem;
    } else {
      db.settings.fraudControl.blockedIps.unshift(newBlockItem);
    }

    saveDatabase(db);
    res.status(201).json(newBlockItem);
  });

  // Unblock IP
  app.delete('/api/fraud-control/block-ip/:ip', (req: Request, res: Response) => {
    const { ip } = req.params;
    const cleanIp = decodeURIComponent(ip).trim();
    if (db.settings.fraudControl?.blockedIps) {
      db.settings.fraudControl.blockedIps = db.settings.fraudControl.blockedIps.filter(
        b => b.ip !== cleanIp
      );
    }
    // Also clear IP from blocked phones if matching
    if (db.settings.fraudControl?.blockedPhones) {
      db.settings.fraudControl.blockedPhones = db.settings.fraudControl.blockedPhones.map(b => {
        if (b.ip === cleanIp) {
          return { ...b, ip: undefined };
        }
        return b;
      });
    }
    saveDatabase(db);
    res.json({ success: true, message: 'আইপি সফলভাবে আনব্লক করা হয়েছে' });
  });

  // ==================== INCOMPLETE / ABANDONED ORDERS ====================
  app.get('/api/incomplete-orders', (_req: Request, res: Response) => {
    const isDemoRemoved = Boolean(isDemoRemovedOnDisk() || db.isDemoDataRemoved || db.settings?.isDemoDataRemoved);
    if (!db.incompleteOrders) {
      db.incompleteOrders = isDemoRemoved ? [] : INITIAL_INCOMPLETE_ORDERS;
      saveDatabase(db);
    }
    if (isDemoRemoved) {
      const filtered = db.incompleteOrders.filter(inc => !DEMO_INCOMPLETE_IDS.has(inc.id));
      if (filtered.length !== db.incompleteOrders.length) {
        db.incompleteOrders = filtered;
        saveDatabase(db);
      }
    }
    res.json(db.incompleteOrders);
  });

  app.post('/api/incomplete-orders', (req: Request, res: Response) => {
    const body = req.body;
    const rawPhone = String(body.customerPhone || '').trim();
    const cleanPhone = normalizePhoneNumber(rawPhone);
    const hasValidPhone = cleanPhone.length >= 6 || rawPhone.length >= 6;
    const trimmedName = String(body.customerName || '').trim();
    const isGenericName = !trimmedName || trimmedName === 'অজানা ক্রেতা' || trimmedName.length < 2;
    const hasNameOrAddr = (!isGenericName) || (body.customerAddress && String(body.customerAddress).trim().length > 3);

    if (!hasValidPhone && !hasNameOrAddr) {
      return res.status(400).json({ error: 'Valid contact info required to save checkout lead' });
    }

    if (!db.incompleteOrders) {
      db.incompleteOrders = [];
    }

    const clientIp = getClientIp(req);
    const fourHoursAgo = Date.now() - 4 * 60 * 60 * 1000;

    // Search for existing incomplete order to update
    const existing = db.incompleteOrders.find(
      inc => {
        // 1. Direct ID match from current client checkout session
        if (body.id && inc.id === body.id) {
          return true;
        }
        // 2. Phone match if phone is provided and lead is not yet converted
        if (cleanPhone && cleanPhone.length >= 6 && normalizePhoneNumber(inc.customerPhone) === cleanPhone) {
          return new Date(inc.createdAt).getTime() > fourHoursAgo && inc.status !== 'recovered';
        }
        // 3. Name match ONLY if phone is not provided and name is a genuine name (never generic placeholder)
        if (!cleanPhone && !isGenericName && inc.customerName === trimmedName && body.landingPageId === inc.landingPageId) {
          return new Date(inc.createdAt).getTime() > fourHoursAgo && inc.status !== 'recovered';
        }
        return false;
      }
    );

    // Fallback product items if client didn't supply items array
    let items = Array.isArray(body.items) && body.items.length > 0 ? body.items : [];
    let subtotal = Number(body.subtotal) || 0;
    const deliveryCharge = Number(body.deliveryCharge) || 0;

    if (items.length === 0) {
      const matchedPage = db.landingPages.find(p => p.id === body.landingPageId || p.slug === body.landingPageSlug);
      if (matchedPage && matchedPage.products && matchedPage.products.length > 0) {
        const firstProd = matchedPage.products[0];
        items = [{
          variantId: firstProd.id,
          variantName: firstProd.name,
          quantity: 1,
          unitPrice: firstProd.price,
          subtotal: firstProd.price,
          image: firstProd.image
        }];
        if (subtotal === 0) {
          subtotal = firstProd.price;
        }
      }
    }

    const grandTotal = Number(body.grandTotal) || (subtotal + deliveryCharge);

    if (existing) {
      if (trimmedName && !isGenericName) existing.customerName = trimmedName;
      if (rawPhone && hasValidPhone) existing.customerPhone = rawPhone;
      if (body.customerAddress !== undefined && body.customerAddress.trim()) existing.customerAddress = body.customerAddress.trim();
      if (items.length > 0) existing.items = items;
      if (body.deliveryLocation) existing.deliveryLocation = body.deliveryLocation;
      if (subtotal > 0) existing.subtotal = subtotal;
      existing.deliveryCharge = deliveryCharge;
      if (grandTotal > 0) existing.grandTotal = grandTotal;
      if (body.step) existing.step = body.step;
      if (body.notes) existing.notes = body.notes;
      existing.customerIp = existing.customerIp || clientIp || undefined;
      existing.updatedAt = new Date().toISOString();
      saveDatabase(db);
      return res.json(existing);
    }

    const newIncomplete: IncompleteOrder = {
      id: (body.id && typeof body.id === 'string' && body.id.startsWith('inc-')) ? body.id : `inc-${Date.now()}`,
      landingPageId: body.landingPageId || (db.landingPages[0]?.id ?? 'default'),
      landingPageTitle: body.landingPageTitle || (db.landingPages[0]?.title ?? 'অর্ডার পেজ'),
      landingPageSlug: body.landingPageSlug || (db.landingPages[0]?.slug ?? 'default'),
      customerName: trimmedName || 'অজানা ক্রেতা',
      customerPhone: rawPhone || '',
      customerAddress: body.customerAddress ? body.customerAddress.trim() : '',
      customerIp: clientIp || undefined,
      items,
      deliveryLocation: body.deliveryLocation || 'inside_dhaka',
      subtotal,
      deliveryCharge,
      grandTotal,
      step: body.step || (body.customerAddress ? 'address_entered' : (rawPhone ? 'details_entered' : 'details_entered')),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'uncontacted',
      notes: body.notes || 'চেকআউট ফর্ম পূরণ করার সময় পেজ ত্যাগ করেছে'
    };

    db.incompleteOrders.unshift(newIncomplete);
    saveDatabase(db);
    res.status(201).json(newIncomplete);
  });

  app.put('/api/incomplete-orders/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const body = req.body;
    if (!db.incompleteOrders) db.incompleteOrders = [];
    const item = db.incompleteOrders.find(inc => inc.id === id);
    if (!item) {
      return res.status(404).json({ error: 'Incomplete order not found' });
    }

    if (body.customerName !== undefined) item.customerName = String(body.customerName).trim();
    if (body.customerPhone !== undefined) item.customerPhone = String(body.customerPhone).trim();
    if (body.customerAddress !== undefined) item.customerAddress = String(body.customerAddress).trim();
    if (body.deliveryLocation !== undefined) item.deliveryLocation = body.deliveryLocation;
    if (body.deliveryCharge !== undefined) item.deliveryCharge = Number(body.deliveryCharge) || 0;
    if (body.subtotal !== undefined) item.subtotal = Number(body.subtotal) || 0;
    if (body.grandTotal !== undefined) item.grandTotal = Number(body.grandTotal) || 0;
    if (Array.isArray(body.items)) {
      item.items = body.items;
      if (body.subtotal === undefined) {
        item.subtotal = item.items.reduce((s, it) => s + (Number(it.unitPrice || 0) * Number(it.quantity || 1)), 0);
      }
      if (body.grandTotal === undefined) {
        item.grandTotal = item.subtotal + (item.deliveryCharge || 0);
      }
    }
    if (body.status) item.status = body.status;
    if (body.notes !== undefined) item.notes = body.notes;
    if (body.contactLog) {
      if (!item.contactLogs) item.contactLogs = [];
      item.contactLogs.unshift({
        timestamp: new Date().toISOString(),
        method: body.contactLog.method || 'call',
        note: body.contactLog.note
      });
      if (item.status === 'uncontacted') {
        item.status = 'contacted';
      }
    }
    item.updatedAt = new Date().toISOString();
    saveDatabase(db);
    res.json(item);
  });

  app.post('/api/incomplete-orders/:id/convert', (req: Request, res: Response) => {
    const { id } = req.params;
    if (!db.incompleteOrders) db.incompleteOrders = [];
    const inc = db.incompleteOrders.find(o => o.id === id);
    if (!inc) {
      return res.status(404).json({ error: 'Incomplete order not found' });
    }

    // Convert to regular order
    const orderNum = Math.floor(1000 + Math.random() * 9000);
    const newOrder: Order = {
      id: `ORD-${orderNum}`,
      landingPageId: inc.landingPageId,
      landingPageTitle: inc.landingPageTitle,
      landingPageSlug: inc.landingPageSlug,
      customerName: inc.customerName,
      customerPhone: inc.customerPhone,
      customerAddress: inc.customerAddress || 'ঠিকানা পরে সংগৃহীত',
      items: inc.items && inc.items.length > 0 ? inc.items : [
        {
          variantId: 'v-recovered',
          variantName: 'রিকভার্ড আইটেম',
          size: 'Standard',
          quantity: 1,
          unitPrice: inc.grandTotal || 1000,
          subtotal: inc.grandTotal || 1000
        }
      ],
      deliveryLocation: inc.deliveryLocation || 'inside_dhaka',
      deliveryCharge: inc.deliveryCharge || 0,
      subtotal: inc.subtotal || inc.grandTotal || 1000,
      grandTotal: inc.grandTotal || 1000,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      notes: `অসম্পূর্ণ অর্ডার (#${inc.id}) থেকে ম্যানুয়ালি কনফার্ম করা হয়েছে`
    };

    db.orders.unshift(newOrder);
    inc.status = 'recovered';
    inc.notes = (inc.notes ? inc.notes + ' • ' : '') + `কনফার্মড অর্ডার তৈরি হয়েছে: #${newOrder.id}`;
    inc.updatedAt = new Date().toISOString();
    saveDatabase(db);

    res.status(201).json({ success: true, order: newOrder, incompleteOrder: inc });
  });

  app.delete('/api/incomplete-orders/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    if (db.incompleteOrders) {
      db.incompleteOrders = db.incompleteOrders.filter(inc => inc.id !== id);
      saveDatabase(db);
    }
    res.json({ success: true });
  });

  app.post('/api/incomplete-orders/clear-all', (_req: Request, res: Response) => {
    db.incompleteOrders = [];
    db.isDemoDataRemoved = true;
    if (!db.settings) db.settings = { ...INITIAL_SETTINGS };
    db.settings.isDemoDataRemoved = true;
    saveDatabase(db);
    res.json({ success: true, message: 'সকল অসম্পূর্ণ অর্ডার মুছে ফেলা হয়েছে' });
  });

  // ==================== FRONTEND / SPA SERVING ====================
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    (typeof __filename !== 'undefined' && (__filename.endsWith('.cjs') || __filename.includes('dist')));

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });

    // High-priority explicit route for /mypanel, /admin, /login in dev mode (before vite.middlewares)
    app.get(['/mypanel', '/mypanel/*', '/admin', '/admin/*', '/login', '/login/*', '/panel', '/panel/*'], async (req: Request, res: Response, next) => {
      try {
        const indexPath = path.resolve(process.cwd(), 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        return res.status(200).set({
          'Content-Type': 'text/html',
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }).end(template);
      } catch (e) {
        return next(e);
      }
    });

    app.use(vite.middlewares);

    // Explicit fallback for SPA routes in dev mode (e.g. /mypanel)
    app.use('*', async (req: Request, res: Response, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api')) return next();
      try {
        const indexPath = path.resolve(process.cwd(), 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = (typeof __dirname !== 'undefined' && fs.existsSync(path.join(__dirname, 'index.html')))
      ? __dirname
      : path.join(process.cwd(), 'dist');

    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'Endpoint not found' });
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
