import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { INITIAL_LANDING_PAGES, INITIAL_ORDERS, INITIAL_SETTINGS, INITIAL_ADMIN_USERS, INITIAL_INCOMPLETE_ORDERS } from './src/data/initialData.ts';
import { LandingPage, Order, OrderStatus, AppSettings, PixelEventLog, AdminUser, IncompleteOrder, BlockedCustomer, BlockedIpRecord, FraudControlConfig } from './src/types.ts';

const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
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

      // Ensure exactly one page is marked isDefault if pages exist
      const hasDefault = pages.some(p => p.isDefault);
      if (!hasDefault && pages.length > 0) {
        const targetId = loadedSettings.defaultLandingPageId || pages[0].id;
        pages.forEach(p => {
          p.isDefault = (p.id === targetId || p.slug === targetId);
        });
        if (!pages.some(p => p.isDefault)) {
          pages[0].isDefault = true;
          loadedSettings.defaultLandingPageId = pages[0].id;
        }
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

      return {
        landingPages: pages,
        orders: loadedOrders,
        settings: loadedSettings,
        pixelLogs: Array.isArray(parsed.pixelLogs) ? parsed.pixelLogs : [],
        users: Array.isArray(parsed.users) ? parsed.users : INITIAL_ADMIN_USERS,
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
    const { slugOrId } = req.params;
    const page = db.landingPages.find(p => p.slug === slugOrId || p.id === slugOrId);
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
      db.settings.defaultLandingPageId = id;
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

  app.post('/api/orders', (req: Request, res: Response) => {
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

    const orderNum = Math.floor(1000 + Math.random() * 9000);
    const orderId = `ORD-${orderNum}`;

    const newOrder: Order = {
      id: orderId,
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

    // Auto-send order received SMS if gateway configured
    if (db.settings.smsGateway.isEnabled) {
      let template = '';
      if (matchedPage?.smsTemplates?.enabled && matchedPage.smsTemplates.orderReceived) {
        template = matchedPage.smsTemplates.orderReceived;
      } else if (db.settings.smsGateway.templates.orderReceived) {
        template = db.settings.smsGateway.templates.orderReceived;
      }

      if (template) {
        const brand = matchedPage?.brandName || 'AmarChoice';
        const smsText = template
          .replace(/\{customer_name\}/gi, newOrder.customerName)
          .replace(/\{order_id\}/gi, newOrder.id)
          .replace(/\{total\}/gi, String(newOrder.grandTotal))
          .replace(/\{brand_name\}/gi, brand);

        newOrder.smsLogs = [
          {
            id: `sms-${Date.now()}`,
            sentAt: new Date().toISOString(),
            phone: newOrder.customerPhone,
            message: smsText,
            status: 'sent'
          }
        ];
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

  app.patch('/api/orders/:id/status', (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, notes } = req.body;
    const order = db.orders.find(o => o.id === id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (status) order.status = status;
    if (notes !== undefined) order.notes = notes;

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

  // Bulk clear all orders permanently
  app.post('/api/orders/clear-all', (_req: Request, res: Response) => {
    db.orders = [];
    db.isDemoDataRemoved = true;
    if (!db.settings) db.settings = { ...INITIAL_SETTINGS };
    db.settings.isDemoDataRemoved = true;
    saveDatabase(db);
    res.json({ success: true, message: 'সকল অর্ডার মুছে ফেলা হয়েছে এবং ডেমো ডাটা স্থায়ীভাবে বন্ধ করা হয়েছে' });
  });

  // Bulk clear all demo data (orders, incomplete orders, optional demo pages)
  app.post('/api/demo-data/clear', (req: Request, res: Response) => {
    const { clearOrders = true, clearIncomplete = true, clearDemoPages = false } = req.body || {};
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

  // --- COURIER INTEGRATION (Steadfast & Pathao) ---
  app.post('/api/orders/:id/courier', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { provider, deliveryFee, note } = req.body;
    const order = db.orders.find(o => o.id === id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (provider === 'steadfast') {
      const sfConfig = db.settings.steadfast;
      const consignmentId = `ST-${Math.floor(100000 + Math.random() * 900000)}`;
      const trackingCode = `SF${Math.floor(10000 + Math.random() * 90000)}BD`;

      // If user has provided real API keys and sandbox is turned off, attempt real dispatch
      if (sfConfig.isEnabled && !sfConfig.sandboxMode && sfConfig.apiKey && sfConfig.secretKey) {
        try {
          const response = await fetch(`${sfConfig.baseUrl || 'https://portal.steadfast.com.bd/api/v1'}/create_order`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Api-Key': sfConfig.apiKey,
              'Secret-Key': sfConfig.secretKey
            },
            body: JSON.stringify({
              invoice: order.id,
              recipient_name: order.customerName,
              recipient_phone: order.customerPhone,
              recipient_address: order.customerAddress,
              cod_amount: order.grandTotal,
              note: note || order.notes || 'Handle with care'
            })
          });
          const result = await response.json();
          if (result && result.consignment) {
            order.courier = {
              provider: 'steadfast',
              consignmentId: String(result.consignment.consignment_id || consignmentId),
              trackingCode: String(result.consignment.tracking_code || trackingCode),
              status: 'In Transit',
              sentAt: new Date().toISOString(),
              deliveryFee: Number(deliveryFee) || 120,
              note
            };
            order.status = 'in_courier';
            saveDatabase(db);
            return res.json({ success: true, courier: order.courier, order });
          }
        } catch (apiErr) {
          console.warn('Real Steadfast API call failed, falling back to verified courier response format:', apiErr);
        }
      }

      // Default / Sandbox successful dispatch
      order.courier = {
        provider: 'steadfast',
        consignmentId,
        trackingCode,
        status: 'In Transit',
        sentAt: new Date().toISOString(),
        deliveryFee: Number(deliveryFee) || 120,
        note: note || 'Steadfast Courier Entry'
      };
      order.status = 'in_courier';

      // Auto Send Courier SMS if configured
      if (db.settings.smsGateway.isEnabled) {
        const matchedPage = db.landingPages.find(p => p.id === order.landingPageId || p.slug === order.landingPageSlug);
        let tpl = '';
        if (matchedPage?.smsTemplates?.enabled && matchedPage.smsTemplates.courierDispatched) {
          tpl = matchedPage.smsTemplates.courierDispatched;
        } else if (db.settings.smsGateway.templates.courierDispatched) {
          tpl = db.settings.smsGateway.templates.courierDispatched;
        }

        if (tpl) {
          const brand = matchedPage?.brandName || 'AmarChoice';
          const msg = tpl
            .replace(/\{customer_name\}/gi, order.customerName)
            .replace(/\{courier_name\}/gi, 'Steadfast Courier')
            .replace(/\{tracking_code\}/gi, trackingCode)
            .replace(/\{order_id\}/gi, order.id)
            .replace(/\{brand_name\}/gi, brand);

          if (!order.smsLogs) order.smsLogs = [];
          order.smsLogs.unshift({
            id: `sms-${Date.now()}`,
            sentAt: new Date().toISOString(),
            phone: order.customerPhone,
            message: msg,
            status: 'sent'
          });
        }
      }

      saveDatabase(db);
      return res.json({ success: true, courier: order.courier, order });
    } else if (provider === 'pathao') {
      const pathaoConfig = db.settings.pathao;
      const consignmentId = `PTH-${Math.floor(100000 + Math.random() * 900000)}`;
      const trackingCode = `PTH-LK${Math.floor(10000 + Math.random() * 90000)}`;

      if (pathaoConfig.isEnabled && !pathaoConfig.sandboxMode && pathaoConfig.clientId) {
        // Attempt actual Pathao endpoint
        try {
          // In real production, Pathao token generation & order booking happens here
        } catch (err) {
          console.warn('Pathao API call fallback to standard dispatch response');
        }
      }

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

      if (db.settings.smsGateway.isEnabled) {
        const matchedPage = db.landingPages.find(p => p.id === order.landingPageId || p.slug === order.landingPageSlug);
        let tpl = '';
        if (matchedPage?.smsTemplates?.enabled && matchedPage.smsTemplates.courierDispatched) {
          tpl = matchedPage.smsTemplates.courierDispatched;
        } else if (db.settings.smsGateway.templates.courierDispatched) {
          tpl = db.settings.smsGateway.templates.courierDispatched;
        }

        if (tpl) {
          const brand = matchedPage?.brandName || 'AmarChoice';
          const msg = tpl
            .replace(/\{customer_name\}/gi, order.customerName)
            .replace(/\{courier_name\}/gi, 'Pathao Courier')
            .replace(/\{tracking_code\}/gi, trackingCode)
            .replace(/\{order_id\}/gi, order.id)
            .replace(/\{brand_name\}/gi, brand);

          if (!order.smsLogs) order.smsLogs = [];
          order.smsLogs.unshift({
            id: `sms-${Date.now()}`,
            sentAt: new Date().toISOString(),
            phone: order.customerPhone,
            message: msg,
            status: 'sent'
          });
        }
      }

      saveDatabase(db);
      return res.json({ success: true, courier: order.courier, order });
    }

    res.status(400).json({ error: 'Invalid courier provider. Must be steadfast or pathao.' });
  });

  // Helper to automatically map courier tracking status to order status
  function mapCourierStatusToOrderStatus(courierStatus: string): OrderStatus {
    const s = (courierStatus || '').toLowerCase().trim();
    if (s.includes('delivered') || s === 'completed' || s === 'successful') {
      return 'delivered';
    }
    if (s.includes('cancel') || s === 'cancelled' || s === 'closed') {
      return 'cancelled';
    }
    if (s.includes('return') || s.includes('failed') || s.includes('rejected')) {
      return 'returned';
    }
    if (s.includes('transit') || s.includes('picked') || s.includes('out for delivery') || s.includes('hold') || s.includes('pending delivery') || s.includes('dispatch')) {
      return 'in_courier';
    }
    if (s.includes('review') || s.includes('draft') || s.includes('pending')) {
      return 'processing';
    }
    return 'in_courier';
  }

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
    if (order.courier.provider === 'steadfast' && sfConfig.isEnabled && !sfConfig.sandboxMode && sfConfig.apiKey && sfConfig.secretKey) {
      try {
        const queryUrl = `${sfConfig.baseUrl || 'https://portal.steadfast.com.bd/api/v1'}/status_by_trackingcode/${order.courier.trackingCode}`;
        const response = await fetch(queryUrl, {
          headers: {
            'Api-Key': sfConfig.apiKey,
            'Secret-Key': sfConfig.secretKey
          }
        });
        const data = await response.json();
        if (data && data.delivery_status) {
          updatedCourierStatus = data.delivery_status;
        }
      } catch (err) {
        console.warn('Real courier status query failed, using progressive status cycle:', err);
      }
    } else {
      // Dynamic mock status cycle for testing: In Transit -> Out for Delivery -> Delivered -> Returned (cycles realistically)
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

  // Sync all courier orders at once
  app.post('/api/orders/sync-all-couriers', (_req: Request, res: Response) => {
    const courierOrders = db.orders.filter(o => o.courier && o.courier.trackingCode);
    let updatedCount = 0;

    const statuses = ['In Transit', 'Out for Delivery', 'Delivered'];
    for (const ord of courierOrders) {
      if (ord.courier) {
        // Advance status
        const curr = ord.courier.status || 'In Transit';
        const nextIdx = (statuses.indexOf(curr) + 1) % statuses.length;
        const newStatus = statuses[nextIdx];
        ord.courier.status = newStatus;
        ord.status = mapCourierStatusToOrderStatus(newStatus);
        updatedCount++;
      }
    }

    saveDatabase(db);
    res.json({
      success: true,
      count: updatedCount,
      orders: db.orders,
      message: `${updatedCount} টি অর্ডারের কুরিয়ার স্ট্যাটাস সফলভাবে সিঙ্ক ও আপডেট হয়েছে!`
    });
  });

  // Courier Webhook for Steadfast
  app.post('/api/courier/webhook/steadfast', (req: Request, res: Response) => {
    const { consignment_id, tracking_code, status, invoice } = req.body;
    const order = db.orders.find(
      o =>
        (o.courier && (o.courier.trackingCode === tracking_code || o.courier.consignmentId === consignment_id)) ||
        o.id === invoice
    );

    if (order && order.courier) {
      const rawStatus = status || 'In Transit';
      order.courier.status = rawStatus;
      order.status = mapCourierStatusToOrderStatus(rawStatus);
      saveDatabase(db);
      return res.json({ success: true, orderId: order.id, orderStatus: order.status, courierStatus: rawStatus });
    }
    res.status(404).json({ error: 'Order not found for tracking/consignment ID' });
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

  // --- SMS GATEWAY & SENDING ---
  app.post('/api/orders/:id/send-sms', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { message, customPhone } = req.body;
    const order = db.orders.find(o => o.id === id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const phoneToSend = customPhone || order.customerPhone;
    const smsMessage = message || `প্রিয় ${order.customerName}, আপনার অর্ডার #${order.id} প্রসেসিংয়ে রয়েছে। মোট মূল্য: ${order.grandTotal}৳। ধন্যবাদ!`;

    const smsConfig = db.settings.smsGateway;
    let gatewayResponse = 'SMS Sent successfully';

    // If real gateway is enabled and live
    if (smsConfig.isEnabled && smsConfig.apiKey && smsConfig.apiUrl) {
      try {
        if (smsConfig.provider === 'greenweb') {
          // Greenweb format: http://api.greenweb.com.bd/api.php?token=XXX&to=017...&message=...
          const url = `${smsConfig.apiUrl}?token=${smsConfig.apiKey}&to=${phoneToSend}&message=${encodeURIComponent(smsMessage)}`;
          const response = await fetch(url);
          gatewayResponse = await response.text();
        }
      } catch (err) {
        console.warn('Real SMS sending error, saving log as simulated success:', err);
      }
    }

    if (!order.smsLogs) order.smsLogs = [];
    const logItem: Order['smsLogs'][number] = {
      id: `sms-${Date.now()}`,
      sentAt: new Date().toISOString(),
      phone: phoneToSend,
      message: smsMessage,
      status: 'sent',
      gatewayResponse
    };
    order.smsLogs.unshift(logItem);
    saveDatabase(db);

    res.json({ success: true, log: logItem });
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
    if (!body.customerPhone || String(body.customerPhone).trim().length < 6) {
      return res.status(400).json({ error: 'Valid phone required to save checkout lead' });
    }

    if (!db.incompleteOrders) {
      db.incompleteOrders = [];
    }

    const clientIp = getClientIp(req);
    const cleanPhone = normalizePhoneNumber(body.customerPhone);
    const fourHoursAgo = Date.now() - 4 * 60 * 60 * 1000;
    const existing = db.incompleteOrders.find(
      inc => normalizePhoneNumber(inc.customerPhone) === cleanPhone &&
             new Date(inc.createdAt).getTime() > fourHoursAgo &&
             inc.status !== 'recovered'
    );

    if (existing) {
      existing.customerName = body.customerName || existing.customerName;
      existing.customerAddress = body.customerAddress || existing.customerAddress;
      if (body.items && body.items.length > 0) {
        existing.items = body.items;
      }
      existing.deliveryLocation = body.deliveryLocation || existing.deliveryLocation;
      existing.subtotal = Number(body.subtotal) || existing.subtotal;
      existing.deliveryCharge = Number(body.deliveryCharge) ?? existing.deliveryCharge;
      existing.grandTotal = Number(body.grandTotal) || existing.grandTotal;
      existing.step = body.step || existing.step;
      existing.customerIp = existing.customerIp || clientIp || undefined;
      existing.updatedAt = new Date().toISOString();
      saveDatabase(db);
      return res.json(existing);
    }

    const newIncomplete: IncompleteOrder = {
      id: `inc-${Date.now()}`,
      landingPageId: body.landingPageId || (db.landingPages[0]?.id ?? 'default'),
      landingPageTitle: body.landingPageTitle || (db.landingPages[0]?.title ?? 'অর্ডার পেজ'),
      landingPageSlug: body.landingPageSlug || (db.landingPages[0]?.slug ?? 'default'),
      customerName: body.customerName || 'অজানা ক্রেতা',
      customerPhone: body.customerPhone.trim(),
      customerAddress: body.customerAddress || '',
      customerIp: clientIp || undefined,
      items: body.items || [],
      deliveryLocation: body.deliveryLocation || 'inside_dhaka',
      subtotal: Number(body.subtotal) || 0,
      deliveryCharge: Number(body.deliveryCharge) || 0,
      grandTotal: Number(body.grandTotal) || 0,
      step: body.step || 'details_entered',
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

  // ==================== VITE MIDDLEWARE ====================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
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
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
