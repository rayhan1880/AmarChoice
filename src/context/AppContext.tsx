import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { LandingPage, Order, AppSettings, PixelEventLog, OrderStatus, AdminTab, AdminUser, FraudControlConfig, BlockedCustomer, BlockedIpRecord, IncompleteOrder } from '../types.ts';
import { api } from '../services/api.ts';
import { INITIAL_LANDING_PAGES, INITIAL_ORDERS, INITIAL_SETTINGS, INITIAL_ADMIN_USERS, INITIAL_INCOMPLETE_ORDERS } from '../data/initialData.ts';
import { AdminLanguage } from '../utils/translations.ts';
import { initFacebookPixel, initTikTokPixel } from '../utils/pixelTracker.ts';

export type { AdminTab, AdminLanguage };

export function isDemoOrder(o: any): boolean {
  if (!o) return false;
  if (o.isDemo === true) return true;
  if (typeof o.id === 'string' && o.id.toLowerCase().startsWith('demo-')) return true;
  const demoPhones = new Set(['01556789012', '01934567890', '01823456789', '01711234567']);
  const demoNames = new Set(['ফাতেমা আক্তার', 'সাকিব হাসান', 'নাসরিন সুলতানা', 'তানভীর আহমেদ']);
  if (demoPhones.has(o.customerPhone) && demoNames.has(o.customerName)) {
    return true;
  }
  return false;
}

export function isDemoIncompleteOrder(inc: any): boolean {
  if (!inc) return false;
  if (inc.isDemo === true) return true;
  if (typeof inc.id === 'string' && (inc.id.toLowerCase().startsWith('demo-') || inc.id === 'inc-101' || inc.id === 'inc-102')) {
    if (['01712000000', '01911445566', '01788112233'].includes(inc.customerPhone) || ['রাকিব হাসান', 'মেহেদী হাসান শুভ', 'ফারজানা আক্তার রেশমা'].includes(inc.customerName)) {
      return true;
    }
  }
  return false;
}

interface AppContextType {
  landingPages: LandingPage[];
  activeLandingPage: LandingPage | null;
  orders: Order[];
  incompleteOrders: IncompleteOrder[];
  fraudControl: FraudControlConfig;
  settings: AppSettings;
  pixelLogs: PixelEventLog[];
  loading: boolean;
  viewMode: 'customer' | 'admin';
  adminTab: AdminTab;
  adminSidebarOpen: boolean;
  setAdminSidebarOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
  currentUser: AdminUser | null;
  users: AdminUser[];
  adminLanguage: AdminLanguage;
  setAdminLanguage: (lang: AdminLanguage) => void;
  setViewMode: (mode: 'customer' | 'admin', targetPageSlug?: string) => void;
  setAdminTab: (tab: AdminTab) => void;
  setActiveLandingPage: (page: LandingPage, updateUrl?: boolean) => void;
  selectPageBySlug: (slug: string) => void;
  refreshAll: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  createAdminUser: (userData: { name: string; email: string; password: string; role?: 'superadmin' | 'admin' | 'moderator' }) => Promise<AdminUser>;
  deleteAdminUser: (id: string, email?: string) => Promise<void>;
  createOrder: (orderData: Partial<Order>) => Promise<Order>;
  updateOrder: (id: string, orderData: Partial<Order>) => Promise<Order>;
  updateOrderStatus: (id: string, status: OrderStatus, notes?: string) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  bulkActionOrders: (payload: {
    orderIds: string[];
    action: 'status' | 'delete' | 'courier' | 'sync_courier';
    status?: OrderStatus;
    provider?: 'steadfast' | 'pathao';
  }) => Promise<{ success: boolean; count: number; message: string }>;
  sendToCourier: (orderId: string, provider: 'steadfast' | 'pathao', deliveryFee?: number, note?: string) => Promise<{ success: boolean; message?: string; order: Order }>;
  checkCourierStatus: (orderId: string) => Promise<string>;
  syncAllCouriers: () => Promise<number>;
  sendSms: (orderId: string, message: string, customPhone?: string) => Promise<{ success: boolean; log?: NonNullable<Order['smsLogs']>[number]; error?: string; gatewayResponse?: string }>;
  sendOrderConfirmSms: (
    orderId: string,
    payload?: { customPhone?: string; customMessage?: string; updateStatusToConfirmed?: boolean }
  ) => Promise<{ success: boolean; message: string; log?: NonNullable<Order['smsLogs']>[number]; order?: Order; error?: string; gatewayResponse?: string }>;
  bulkSendConfirmSms: (
    orderIds: string[],
    updateStatusToConfirmed?: boolean
  ) => Promise<{ success: boolean; count: number; failedCount: number; message: string }>;
  createLandingPage: (page: Partial<LandingPage>) => Promise<LandingPage>;
  updateLandingPage: (id: string, page: Partial<LandingPage>) => Promise<LandingPage>;
  setDefaultLandingPage: (id: string) => Promise<void>;
  deleteLandingPage: (id: string) => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  trackPixelEvent: (
    eventName: string,
    data?: Record<string, unknown>,
    customerData?: { name?: string; phone?: string; email?: string; address?: string }
  ) => void;
  testPixelCapi: (eventType?: string) => Promise<{ success: boolean; log: PixelEventLog }>;
  // Fraud Control
  updateFraudControl: (config: Partial<FraudControlConfig>) => Promise<void>;
  blockCustomer: (data: { phone: string; name?: string; reason?: string; ip?: string }) => Promise<BlockedCustomer>;
  unblockCustomer: (phone: string) => Promise<void>;
  blockIp: (data: { ip: string; name?: string; reason?: string; associatedPhone?: string }) => Promise<BlockedIpRecord>;
  unblockIp: (ip: string) => Promise<void>;
  // Incomplete Orders
  refreshIncompleteOrders: () => Promise<IncompleteOrder[]>;
  saveIncompleteOrderLead: (data: Partial<IncompleteOrder>) => Promise<IncompleteOrder>;
  updateIncompleteOrder: (
    id: string,
    data: Partial<IncompleteOrder> & {
      contactLog?: { method: 'call' | 'sms' | 'whatsapp'; note?: string };
    }
  ) => Promise<void>;
  convertIncompleteToOrder: (id: string) => Promise<Order>;
  deleteIncompleteOrder: (id: string) => Promise<void>;
  bulkActionIncompleteOrders: (
    ids: string[],
    action: 'status' | 'delete',
    status?: IncompleteOrder['status']
  ) => Promise<{ success: boolean; count: number }>;
  clearDemoData: (options?: { clearOrders?: boolean; clearIncomplete?: boolean; clearDemoPages?: boolean }) => Promise<void>;
  clearAllOrders: () => Promise<void>;
  clearAllIncompleteOrders: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper to check if URL targets mypanel / admin / login
function checkIsMyPanelUrl(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const path = (window.location.pathname || '').toLowerCase();
    const hash = (window.location.hash || '').toLowerCase();
    const search = (window.location.search || '').toLowerCase();
    const href = (window.location.href || '').toLowerCase();

    const adminKeywords = ['mypanel', 'admin', 'login', 'panel', 'dashboard'];
    for (const kw of adminKeywords) {
      if (
        path.includes(kw) ||
        hash.includes(kw) ||
        search.includes(kw) ||
        href.includes(kw)
      ) {
        return true;
      }
    }

    // Check parent location if same-origin (safe try-catch)
    try {
      if (window.parent && window.parent !== window) {
        const parentHref = (window.parent.location.href || '').toLowerCase();
        const parentPath = (window.parent.location.pathname || '').toLowerCase();
        for (const kw of adminKeywords) {
          if (parentHref.includes(kw) || parentPath.includes(kw)) {
            return true;
          }
        }
      }
    } catch {
      // Cross-origin iframe security restriction - silently ignore
    }

    return false;
  } catch {
    return false;
  }
}

const RESERVED_URL_KEYWORDS = new Set([
  '',
  '/',
  'index.html',
  'mypanel',
  'admin',
  'login',
  'panel',
  'dashboard',
  'customer',
  'home',
  'api',
  'assets',
  'favicon.ico',
  'manifest.json',
  'sw.js',
  'robots.txt',
  'sitemap.xml'
]);

// Helper to extract requested landing page slug from URL pathname, search query, or hash
export function extractSlugFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    // 1. Check query parameter: ?page=slug, ?p=slug, ?slug=slug, ?lp=slug
    const searchParams = new URLSearchParams(window.location.search);
    const fromSearch = searchParams.get('page') || searchParams.get('p') || searchParams.get('slug') || searchParams.get('lp');
    if (fromSearch && fromSearch.trim()) {
      const clean = decodeURIComponent(fromSearch.trim().toLowerCase());
      if (!RESERVED_URL_KEYWORDS.has(clean)) return clean;
    }

    // 2. Check hash: #/slug, #slug, #page=slug
    if (window.location.hash) {
      const cleanHash = window.location.hash.replace(/^#\/?/, '').trim();
      if (cleanHash && !cleanHash.toLowerCase().includes('mypanel') && !cleanHash.toLowerCase().includes('admin')) {
        if (cleanHash.includes('=')) {
          const hashParams = new URLSearchParams(cleanHash);
          const val = hashParams.get('page') || hashParams.get('p') || hashParams.get('slug') || hashParams.get('lp');
          if (val) {
            const cleanVal = decodeURIComponent(val.trim().toLowerCase());
            if (!RESERVED_URL_KEYWORDS.has(cleanVal)) return cleanVal;
          }
        }
        const firstSegment = cleanHash.split('/')[0].split('?')[0].trim().toLowerCase();
        if (firstSegment && !RESERVED_URL_KEYWORDS.has(firstSegment)) {
          return decodeURIComponent(firstSegment);
        }
      }
    }

    // 3. Check pathname: e.g. /page-1789975991009, /mayaboti-dress, /page/mayaboti-dress
    const pathname = window.location.pathname.trim();
    if (pathname && pathname !== '/' && pathname !== '/index.html') {
      const segments = pathname.replace(/^\/+|\/+$/g, '').split('/');
      const first = segments[0]?.toLowerCase().trim() || '';
      if (RESERVED_URL_KEYWORDS.has(first)) {
        return null;
      }
      // Prefixed path like /page/some-slug or /p/some-slug or /shop/some-slug
      if (['page', 'p', 'shop', 'landing', 'product'].includes(first) && segments[1]) {
        const sub = segments[1].toLowerCase().trim();
        if (sub && !RESERVED_URL_KEYWORDS.has(sub)) {
          return decodeURIComponent(sub);
        }
      }
      // Direct path like /page-1789975991009 or /mayaboti-dress
      return decodeURIComponent(first);
    }

    return null;
  } catch {
    return null;
  }
}

// Monkey-patch history so pushState/replaceState dispatch events
if (typeof window !== 'undefined') {
  const origPush = window.history.pushState;
  window.history.pushState = function (...args) {
    const res = origPush.apply(this, args);
    window.dispatchEvent(new Event('app_location_change'));
    return res;
  };
  const origReplace = window.history.replaceState;
  window.history.replaceState = function (...args) {
    const res = origReplace.apply(this, args);
    window.dispatchEvent(new Event('app_location_change'));
    return res;
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [landingPages, setLandingPages] = useState<LandingPage[]>(INITIAL_LANDING_PAGES);
  const landingPagesRef = useRef<LandingPage[]>(INITIAL_LANDING_PAGES);

  // Synchronize ref with latest landing pages list
  useEffect(() => {
    landingPagesRef.current = landingPages;
  }, [landingPages]);

  // Initial active page resolved from URL or default
  const [activeLandingPage, setActiveLandingPageState] = useState<LandingPage | null>(() => {
    const targetSlug = extractSlugFromUrl();
    if (targetSlug) {
      const matched = INITIAL_LANDING_PAGES.find(p => 
        (p.slug && p.slug.toLowerCase() === targetSlug) || 
        (p.id && p.id.toLowerCase() === targetSlug)
      );
      if (matched) return matched;
    }
    const defaultPage = INITIAL_LANDING_PAGES.find(p => p.isDefault) || INITIAL_LANDING_PAGES[0] || null;
    return defaultPage;
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [incompleteOrders, setIncompleteOrders] = useState<IncompleteOrder[]>([]);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [fraudControl, setFraudControl] = useState<FraudControlConfig>(() => INITIAL_SETTINGS.fraudControl || {
    enableDailyLimit: true,
    maxOrdersPerDay: 2,
    autoBlockOnExceed: true,
    blockDurationDays: 30,
    blockedPhones: []
  });
  const [pixelLogs, setPixelLogs] = useState<PixelEventLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // URL-based viewMode initialization: if URL is /mypanel, open admin
  const [viewMode, setViewModeState] = useState<'customer' | 'admin'>(() => {
    return checkIsMyPanelUrl() ? 'admin' : 'customer';
  });

  const [adminTab, setAdminTab] = useState<AdminTab>('overview');
  const [adminSidebarOpen, setAdminSidebarOpen] = useState<boolean>(false);

  // Authenticated user
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(() => {
    try {
      const stored = localStorage.getItem('amarchoice_admin_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.email && (
          parsed.email.toLowerCase().trim() === 'admin@amarchoice.com' ||
          parsed.email.toLowerCase().trim() === 'manager@amarchoice.com'
        )) {
          localStorage.removeItem('amarchoice_admin_user');
          return null;
        }
        return parsed;
      }
    } catch {
      // ignore
    }
    return null;
  });

  // Helper to load persisted users from localStorage
  const getStoredUsers = (): AdminUser[] => {
    if (typeof window === 'undefined') return INITIAL_ADMIN_USERS;
    try {
      let deletedEmails: string[] = [];
      try {
        deletedEmails = JSON.parse(localStorage.getItem('amarchoice_deleted_admin_emails') || '[]');
      } catch {}
      const deletedSet = new Set(deletedEmails.map(e => String(e).toLowerCase().trim()));
      deletedSet.add('admin@amarchoice.com');
      deletedSet.add('manager@amarchoice.com');

      const stored = localStorage.getItem('amarchoice_admin_users');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed.filter(u => u && u.email && !deletedSet.has(u.email.toLowerCase().trim()));
          if (filtered.length > 0) return filtered;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_ADMIN_USERS;
  };

  const persistStoredUsers = (usersList: AdminUser[]) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('amarchoice_admin_users', JSON.stringify(usersList));
    } catch {
      // ignore
    }
  };

  const [users, setUsers] = useState<AdminUser[]>(getStoredUsers);

  // Admin language preference ('bn' or 'en')
  const [adminLanguage, setAdminLanguageState] = useState<AdminLanguage>(() => {
    try {
      const stored = localStorage.getItem('amarchoice_admin_lang');
      if (stored === 'en' || stored === 'bn') return stored;
    } catch {
      // ignore
    }
    return 'bn';
  });

  const setAdminLanguage = useCallback((lang: AdminLanguage) => {
    setAdminLanguageState(lang);
    try {
      localStorage.setItem('amarchoice_admin_lang', lang);
    } catch {
      // ignore
    }
  }, []);

  // Sync with browser URL popstate, hashchange, pushState, and interval poll
  useEffect(() => {
    const handleUrlChange = () => {
      const isPanel = checkIsMyPanelUrl();
      if (isPanel) {
        setViewModeState('admin');
        try { sessionStorage.setItem('amarchoice_current_view', 'admin'); } catch {}
        return;
      }

      setViewModeState('customer');
      try { sessionStorage.setItem('amarchoice_current_view', 'customer'); } catch {}

      // If customer view, synchronize active landing page with current URL slug
      const targetSlug = extractSlugFromUrl();
      const pages = landingPagesRef.current;
      if (pages.length > 0) {
        if (targetSlug) {
          const clean = targetSlug.toLowerCase();
          const found = pages.find(p => 
            (p.slug && p.slug.toLowerCase() === clean) || 
            (p.id && p.id.toLowerCase() === clean)
          );
          if (found) {
            setActiveLandingPageState(curr => (curr?.id === found.id ? curr : found));
          }
        } else {
          // URL is root / home page -> activate designated default home page
          const defaultHome = pages.find(p => p.isDefault) || pages[0];
          if (defaultHome) {
            setActiveLandingPageState(curr => (curr?.id === defaultHome.id ? curr : defaultHome));
          }
        }
      }
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('app_location_change', handleUrlChange);
    window.addEventListener('focus', handleUrlChange);

    const handleVisibility = () => {
      if (!document.hidden) handleUrlChange();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // AI Studio message listener
    const handleMessage = (event: MessageEvent) => {
      try {
        if (!event.data) return;
        const str = typeof event.data === 'string' ? event.data : JSON.stringify(event.data);
        const lower = str.toLowerCase();
        if (
          lower.includes('mypanel') ||
          lower.includes('admin') ||
          lower.includes('login') ||
          lower.includes('panel')
        ) {
          setViewModeState('admin');
          try { sessionStorage.setItem('amarchoice_current_view', 'admin'); } catch {}
        } else {
          handleUrlChange();
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener('message', handleMessage);

    // Periodic check for URL bar updates in iframe environments
    const timer = setInterval(() => {
      const isPanel = checkIsMyPanelUrl();
      if (isPanel) {
        setViewModeState('admin');
      }
    }, 250);

    // Secret shortcut: Alt+P or Ctrl+Shift+A for store owners
    let keyBuffer = '';
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      if ((e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) || (e.altKey && (e.key === 'P' || e.key === 'p'))) {
        e.preventDefault();
        setViewMode('admin');
        return;
      }

      // Check if store owner typed 'mypanel' or 'admin'
      if (e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        keyBuffer = (keyBuffer + e.key.toLowerCase()).slice(-8);
        if (keyBuffer.includes('mypanel') || keyBuffer.includes('admin')) {
          keyBuffer = '';
          setViewMode('admin');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('app_location_change', handleUrlChange);
      window.removeEventListener('focus', handleUrlChange);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('keydown', handleKeyDown);
      clearInterval(timer);
    };
  }, []);

  // Dynamically load Meta (Facebook) Pixel & TikTok Pixel scripts when active page or settings change
  useEffect(() => {
    const metaPixel = activeLandingPage?.facebookPixelId || settings.globalPixelId;
    if (metaPixel) {
      initFacebookPixel(metaPixel);
    }
    const ttPixel = activeLandingPage?.tiktokPixelId || settings.globalTiktokPixelId;
    if (ttPixel) {
      initTikTokPixel(ttPixel);
    }
  }, [activeLandingPage?.facebookPixelId, activeLandingPage?.tiktokPixelId, settings.globalPixelId, settings.globalTiktokPixelId]);

  const setViewMode = (mode: 'customer' | 'admin', targetPageSlug?: string) => {
    setViewModeState(mode);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('amarchoice_current_view', mode);
      } catch {}
      if (mode === 'admin') {
        if (!checkIsMyPanelUrl()) {
          try {
            window.history.pushState(null, '', '/mypanel');
          } catch {
            window.location.hash = '/mypanel';
          }
        }
      } else {
        const pages = landingPagesRef.current;
        const defaultPage = pages.find(p => p.isDefault) ||
                            pages.find(p => p.id === settings.defaultLandingPageId) ||
                            pages[0];

        let targetPage: LandingPage | undefined;
        let targetUrl = '/';

        if (targetPageSlug) {
          targetPage = pages.find(p => p.slug === targetPageSlug || p.id === targetPageSlug);
          if (targetPage && targetPage.isDefault) {
            targetUrl = '/';
          } else if (targetPage) {
            targetUrl = `/${targetPage.slug}`;
          } else {
            targetUrl = `/${targetPageSlug}`;
          }
        } else {
          // No specific slug passed (e.g. clicking Live Preview / Home) -> show default home page
          targetPage = defaultPage;
          targetUrl = '/';
        }

        if (targetPage) {
          setActiveLandingPageState(targetPage);
        }

        try {
          window.history.pushState(null, '', targetUrl);
        } catch {
          window.location.hash = targetUrl === '/' ? '' : `#${targetUrl}`;
        }
      }
    }
  };

  const refreshAll = useCallback(async () => {
    try {
      setLoading(true);
      const [pagesData, ordersData, settingsData, logsData, usersData, incOrdersData, fraudData] = await Promise.all([
        api.getLandingPages().catch(() => []),
        api.getOrders().catch(() => []),
        api.getSettings().catch(() => INITIAL_SETTINGS),
        api.getPixelLogs().catch(() => []),
        api.getUsers().catch(() => []),
        api.getIncompleteOrders().catch(() => []),
        api.getFraudControl().catch(() => INITIAL_SETTINGS.fraudControl!)
      ]);

      const localDemoRemoved = typeof window !== 'undefined' && localStorage.getItem('amarchoice_demo_data_removed') === 'true';
      const isDemoRemoved = Boolean(localDemoRemoved || settingsData.isDemoDataRemoved);

      if (isDemoRemoved) {
        settingsData.isDemoDataRemoved = true;
        if (typeof window !== 'undefined') {
          localStorage.setItem('amarchoice_demo_data_removed', 'true');
        }
      }

      // Filter out demo orders/leads permanently if demo was removed
      const finalOrders = isDemoRemoved
        ? ordersData.filter(o => !isDemoOrder(o))
        : ordersData;

      // Read any locally stored offline orders (useful if backend server is not running on static host)
      let localOrders: Order[] = [];
      try {
        if (typeof window !== 'undefined') {
          localOrders = JSON.parse(localStorage.getItem('amarchoice_orders') || '[]');
        }
      } catch {
        localOrders = [];
      }

      // Sync any local offline orders to backend so they exist in database
      if (localOrders.length > 0) {
        try {
          await api.syncLocalOrders(localOrders);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('amarchoice_orders');
          }
        } catch (e) {
          console.warn('Failed to sync local orders to backend:', e);
        }
      }

      const mergedOrdersMap = new Map<string, Order>();
      [...finalOrders, ...localOrders].forEach(o => {
        if (o && o.id) mergedOrdersMap.set(o.id, o);
      });
      const combinedOrders = Array.from(mergedOrdersMap.values());
      // Always sort newest first
      combinedOrders.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      const finalIncOrders = isDemoRemoved
        ? incOrdersData.filter(i => !isDemoIncompleteOrder(i))
        : incOrdersData;

      // Fall back to INITIAL_LANDING_PAGES if backend returns empty or unavailable (e.g. static hosting on Vercel)
      const validPages = (pagesData && pagesData.length > 0) ? pagesData : INITIAL_LANDING_PAGES;

      setLandingPages(validPages);
      setOrders(combinedOrders);
      setSettings(settingsData);
      setPixelLogs(logsData);
      setIncompleteOrders(finalIncOrders);

      // Merge users: Backend users + persistent local users (offline cache)
      const localUsers = getStoredUsers();
      const mergedUsersMap = new Map<string, AdminUser>();

      let deletedEmails: string[] = [];
      try {
        deletedEmails = JSON.parse(localStorage.getItem('amarchoice_deleted_admin_emails') || '[]');
      } catch {}

      // Clean owner emails from deleted list so owner is never blocked
      deletedEmails = deletedEmails.filter(e => {
        const lower = String(e).toLowerCase().trim();
        return lower !== 'bmrayhan330@gmail.com' && lower !== 'bmrayhan877@gmail.com';
      });
      try {
        localStorage.setItem('amarchoice_deleted_admin_emails', JSON.stringify(deletedEmails));
      } catch {}

      const bannedDemoEmails = new Set(['admin@amarchoice.com', 'manager@amarchoice.com']);
      const deletedEmailsSet = new Set(deletedEmails.map(e => e.toLowerCase().trim()));

      if (Array.isArray(usersData) && usersData.length > 0) {
        // Backend users are the primary source of truth!
        usersData.forEach(u => {
          if (u && u.email) {
            const email = u.email.toLowerCase().trim();
            if (!bannedDemoEmails.has(email)) {
              mergedUsersMap.set(email, u);
            }
          }
        });

        // Add local offline password if existing
        localUsers.forEach(u => {
          if (u && u.email) {
            const email = u.email.toLowerCase().trim();
            if (!bannedDemoEmails.has(email)) {
              const existing = mergedUsersMap.get(email);
              if (existing) {
                mergedUsersMap.set(email, { ...existing, password: u.password || existing.password });
              }
            }
          }
        });
      } else {
        // Fallback when backend is unreachable or completely empty
        const fallbackList = localUsers.length > 0 ? localUsers : INITIAL_ADMIN_USERS;
        fallbackList.forEach(u => {
          if (u && u.email) {
            const email = u.email.toLowerCase().trim();
            if (!bannedDemoEmails.has(email) && !deletedEmailsSet.has(email)) {
              mergedUsersMap.set(email, u);
            }
          }
        });
      }

      // Always guarantee the logged-in currentUser is present in users list
      if (currentUser && currentUser.email) {
        const curEmail = currentUser.email.toLowerCase().trim();
        if (!bannedDemoEmails.has(curEmail) && !mergedUsersMap.has(curEmail)) {
          mergedUsersMap.set(curEmail, currentUser);
        }
      }

      // Guarantee owner account is never lost
      if (mergedUsersMap.size === 0) {
        INITIAL_ADMIN_USERS.forEach(u => {
          if (u && u.email) {
            mergedUsersMap.set(u.email.toLowerCase().trim(), u);
          }
        });
      }

      const finalUsers = Array.from(mergedUsersMap.values()).filter(u => {
        const email = u.email?.toLowerCase().trim();
        return email && !bannedDemoEmails.has(email);
      });
      setUsers(finalUsers);
      persistStoredUsers(finalUsers);

      // Background sync local users to server database only for non-deleted active users
      if (finalUsers.length > 0) {
        api.syncLocalUsers(finalUsers).catch(() => {});
      }
      if (fraudData) {
        setFraudControl(fraudData);
      } else if (settingsData.fraudControl) {
        setFraudControl(settingsData.fraudControl);
      }

      // Determine initial active page:
      // If URL explicitly requests a slug (from pathname e.g. /page-1789975991009, ?page=slug, or hash), respect that.
      // Otherwise, select the designated Home Page (isDefault: true or settingsData.defaultLandingPageId).
      const targetSlugOrId = extractSlugFromUrl();

      let targetPage: LandingPage | null = null;
      if (targetSlugOrId) {
        const cleanTarget = targetSlugOrId.toLowerCase();
        targetPage = validPages.find(p => 
          (p.slug && p.slug.toLowerCase() === cleanTarget) || 
          (p.id && p.id.toLowerCase() === cleanTarget)
        ) || null;

        // If not found in loaded array yet, fetch single landing page by slug or id directly from the server
        if (!targetPage) {
          try {
            const single = await api.getLandingPage(targetSlugOrId);
            if (single) {
              targetPage = single;
              if (!validPages.some(p => p.id === single.id)) {
                validPages.push(single);
                setLandingPages([...validPages]);
                landingPagesRef.current = validPages;
              }
            }
          } catch {
            // ignore
          }
        }
      }

      const defaultPage = validPages.find(p => p.isDefault) ||
                          validPages.find(p => p.id === settingsData.defaultLandingPageId) ||
                          validPages[0] ||
                          INITIAL_LANDING_PAGES[0] ||
                          null;
      setActiveLandingPageState(targetPage || defaultPage);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Auto-poll orders periodically so new customer orders immediately appear at the top in serial
  useEffect(() => {
    let isCancelled = false;
    const interval = setInterval(async () => {
      try {
        const fetchedOrders = await api.getOrders();
        if (!isCancelled && Array.isArray(fetchedOrders)) {
          setOrders(prev => {
            const hasNew = fetchedOrders.length !== prev.length ||
              (fetchedOrders[0] && prev[0]?.id !== fetchedOrders[0]?.id);
            if (hasNew) {
              return [...fetchedOrders].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            }
            return prev;
          });
        }
      } catch {
        // Silently ignore polling errors
      }
    }, 5000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    const normalizedEmail = email.toLowerCase().trim();
    const cleanPassword = password.trim();

    try {
      const res = await api.login(normalizedEmail, cleanPassword);
      if (res && res.user) {
        setCurrentUser(res.user);
        try {
          localStorage.setItem('amarchoice_admin_user', JSON.stringify(res.user));
        } catch {
          // ignore
        }
        return true;
      }
    } catch (err: any) {
      // If the backend server responded with an error (such as 401 Wrong Password / User Not Found),
      // we MUST NEVER allow any local fallback bypass! Always throw the server error immediately.
      const errMsg = String(err?.message || '');
      const isServerOffline = errMsg.includes('API_SERVER_UNAVAILABLE') || errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError');

      if (!isServerOffline) {
        throw err;
      }

      // Emergency offline fallback (ONLY when backend server is completely unreachable / static deploy)
      let deletedEmails: string[] = [];
      try {
        deletedEmails = JSON.parse(localStorage.getItem('amarchoice_deleted_admin_emails') || '[]');
      } catch {}
      const deletedEmailsSet = new Set(deletedEmails.map(e => e.toLowerCase().trim()));
      deletedEmailsSet.add('admin@amarchoice.com');
      deletedEmailsSet.add('manager@amarchoice.com');

      if (deletedEmailsSet.has(normalizedEmail)) {
        throw new Error('ভুল ইমেইল অথবা পাসওয়ার্ড! অনুগ্রহ করে আবার চেষ্টা করুন।');
      }

      const currentUsersList = users.length > 0 ? users : getStoredUsers();
      const localFound = currentUsersList.find(
        u => u.email?.toLowerCase().trim() === normalizedEmail &&
             !deletedEmailsSet.has(u.email?.toLowerCase().trim()) &&
             u.password === cleanPassword
      );

      if (localFound) {
        const { password: _p, ...safe } = localFound;
        setCurrentUser(safe as AdminUser);
        try {
          localStorage.setItem('amarchoice_admin_user', JSON.stringify(safe));
        } catch {
          // ignore
        }
        return true;
      }
      throw new Error('ভুল ইমেইল অথবা পাসওয়ার্ড! অনুগ্রহ করে আবার চেষ্টা করুন।');
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('amarchoice_admin_user');
    } catch {
      // ignore
    }
  };

  const createAdminUser = async (userData: { name: string; email: string; password: string; role?: 'superadmin' | 'admin' | 'moderator' }): Promise<AdminUser> => {
    const cleanName = userData.name.trim();
    const normalizedEmail = userData.email.toLowerCase().trim();
    const cleanPassword = userData.password.trim();
    const role = userData.role || 'admin';

    // Duplicate check in existing users
    const currentList = users.length > 0 ? users : getStoredUsers();
    if (currentList.some(u => u.email?.toLowerCase().trim() === normalizedEmail)) {
      throw new Error('এই ইমেইল দিয়ে ইতোমধ্যে একটি একাউন্ট বিদ্যমান রয়েছে');
    }

    const localUser: AdminUser = {
      id: `user-${Date.now()}`,
      name: cleanName,
      email: normalizedEmail,
      password: cleanPassword,
      role,
      createdAt: new Date().toISOString()
    };

    let userToSave = localUser;

    try {
      const res = await api.createUser({
        name: cleanName,
        email: normalizedEmail,
        password: cleanPassword,
        role
      });
      if (res && res.user) {
        userToSave = { ...localUser, ...res.user, password: cleanPassword };
      }
    } catch (err: any) {
      console.warn('Backend user creation error or offline, saving to local persistent storage:', err);
      const msg = err?.message || String(err);
      if (msg.includes('ইতোমধ্যে একটি একাউন্ট') || msg.includes('বিদ্যমান') || msg.includes('already exists') || msg.includes('আবশ্যক')) {
        throw new Error(msg);
      }
    }

    // Remove email from deleted emails list if previously deleted
    try {
      const deletedEmails: string[] = JSON.parse(localStorage.getItem('amarchoice_deleted_admin_emails') || '[]');
      const filtered = deletedEmails.filter(e => e.toLowerCase().trim() !== normalizedEmail);
      localStorage.setItem('amarchoice_deleted_admin_emails', JSON.stringify(filtered));
    } catch {}

    setUsers(prev => {
      const updated = [...prev.filter(u => u.email?.toLowerCase().trim() !== normalizedEmail), userToSave];
      persistStoredUsers(updated);
      return updated;
    });

    // Background sync to backend
    api.syncLocalUsers([userToSave]).catch(() => {});

    return userToSave;
  };

  const deleteAdminUser = async (id: string, userEmail?: string): Promise<void> => {
    const cleanId = id.toLowerCase().trim();
    const targetUser = users.find(u => u.id === id || u.id?.toLowerCase().trim() === cleanId || (u.email && u.email.toLowerCase().trim() === cleanId));
    const targetEmail = (userEmail || targetUser?.email || (cleanId.includes('@') ? cleanId : ''))?.toLowerCase().trim();

    try {
      await api.deleteUser(id, targetEmail);
    } catch (err) {
      console.warn('Backend delete failed, deleting locally:', err);
    }

    if (targetEmail) {
      try {
        const deletedEmails: string[] = JSON.parse(localStorage.getItem('amarchoice_deleted_admin_emails') || '[]');
        if (!deletedEmails.includes(targetEmail)) {
          deletedEmails.push(targetEmail);
          localStorage.setItem('amarchoice_deleted_admin_emails', JSON.stringify(deletedEmails));
        }
      } catch {}
    }

    setUsers(prev => {
      const updated = prev.filter(u => {
        const uId = u.id?.toLowerCase().trim();
        const uEmail = u.email?.toLowerCase().trim();
        if (u.id === id || uId === cleanId) return false;
        if (uEmail && (uEmail === cleanId || (targetEmail && uEmail === targetEmail))) return false;
        return true;
      });
      persistStoredUsers(updated);
      return updated;
    });
  };

  const setActiveLandingPage = (page: LandingPage, updateUrl = true) => {
    setActiveLandingPageState(page);
    // Track PageView for this landing page
    trackPixelEvent('PageView', { pageTitle: page.title, slug: page.slug });
    if (updateUrl && typeof window !== 'undefined' && viewMode === 'customer' && !checkIsMyPanelUrl()) {
      const targetUrl = page.isDefault ? '/' : `/${page.slug}`;
      if (window.location.pathname !== targetUrl) {
        try {
          window.history.pushState(null, '', targetUrl);
        } catch {
          window.location.hash = page.isDefault ? '' : `#/${page.slug}`;
        }
      }
    }
  };

  const selectPageBySlug = (slug: string) => {
    const clean = slug.trim().toLowerCase();
    const found = landingPages.find(p => 
      (p.slug && p.slug.toLowerCase() === clean) || 
      (p.id && p.id.toLowerCase() === clean)
    );
    if (found) {
      setActiveLandingPage(found, true);
    }
  };

  const trackPixelEvent = useCallback((
    eventName: string,
    data: Record<string, unknown> = {},
    customerData?: { name?: string; phone?: string; email?: string; address?: string }
  ) => {
    if (!activeLandingPage) return;
    const pixelId = activeLandingPage.facebookPixelId || settings.globalPixelId || '';
    const tiktokPixelId = activeLandingPage.tiktokPixelId || settings.globalTiktokPixelId || '';
    const eventId = `ev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // 1. Meta / Facebook Browser Pixel (fbq) with Event ID for deduplication
    if (typeof window !== 'undefined') {
      if (pixelId) initFacebookPixel(pixelId);
      if (tiktokPixelId) initTikTokPixel(tiktokPixelId);

      const fbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
      if (typeof fbq === 'function') {
        fbq('track', eventName, data, { eventID: eventId });
      }

      // 2. TikTok Browser Pixel (ttq) with Event ID for deduplication
      const ttq = (window as unknown as { ttq?: { track?: (...args: unknown[]) => void; page?: () => void } }).ttq;
      if (ttq) {
        if (eventName === 'PageView' && typeof ttq.page === 'function') {
          ttq.page();
        } else if (typeof ttq.track === 'function') {
          const tiktokEventName = eventName === 'Purchase' ? 'CompletePayment'
            : eventName === 'InitiateCheckout' ? 'InitiateCheckout'
            : eventName === 'AddToCart' ? 'AddToCart'
            : eventName === 'ViewContent' ? 'ViewContent'
            : eventName;
          ttq.track(tiktokEventName, data, { event_id: eventId });
        }
      }
    }

    // 3. Server-Side CAPI (Conversion API for Meta & TikTok)
    api.logPixelEvent({
      eventName,
      data,
      pageTitle: activeLandingPage.title,
      pixelId,
      tiktokPixelId,
      eventId,
      landingPageId: activeLandingPage.id,
      customerData,
      sourceUrl: typeof window !== 'undefined' ? window.location.href : undefined
    })
      .then(newLog => {
        setPixelLogs(prev => [newLog, ...prev.slice(0, 49)]);
      })
      .catch(() => {
        // Fallback local state
        setPixelLogs(prev => [
          {
            id: `px-${Date.now()}`,
            timestamp: new Date().toISOString(),
            eventName,
            pixelId: pixelId || 'None',
            tiktokPixelId: tiktokPixelId || undefined,
            eventId,
            pageTitle: activeLandingPage.title,
            channels: [
              ...(pixelId ? ['facebook_pixel' as const] : []),
              ...(tiktokPixelId ? ['tiktok_pixel' as const] : [])
            ],
            data
          },
          ...prev.slice(0, 49)
        ]);
      });
  }, [activeLandingPage, settings.globalPixelId, settings.globalTiktokPixelId]);

  const testPixelCapi = useCallback(async (eventType = 'Purchase') => {
    try {
      const res = await api.testPixelCapiEvent(eventType);
      if (res.log) {
        setPixelLogs(prev => [res.log, ...prev.slice(0, 49)]);
      }
      return res;
    } catch (err) {
      console.error('Failed to run test pixel CAPI event:', err);
      throw err;
    }
  }, []);

  const createOrder = async (orderData: Partial<Order>): Promise<Order> => {
    try {
      const newOrder = await api.createOrder(orderData);
      setOrders(prev => [newOrder, ...prev]);
      trackPixelEvent('Purchase', {
        value: newOrder.grandTotal,
        currency: 'BDT',
        orderId: newOrder.id,
        itemsCount: newOrder.items.length
      }, {
        name: newOrder.customerName,
        phone: newOrder.customerPhone,
        address: newOrder.customerAddress
      });
      return newOrder;
    } catch (err) {
      console.warn('Backend API unavailable or returned HTML, creating local fallback order:', err);
      
      const localId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
      const fallbackOrder: Order = {
        id: localId,
        landingPageId: orderData.landingPageId || '',
        landingPageTitle: orderData.landingPageTitle || 'Landing Page',
        landingPageSlug: orderData.landingPageSlug || '',
        customerName: orderData.customerName || 'সম্মানিত ক্রেতা',
        customerPhone: orderData.customerPhone || '',
        customerAddress: orderData.customerAddress || '',
        items: orderData.items || [],
        deliveryLocation: orderData.deliveryLocation || 'inside_dhaka',
        deliveryCharge: orderData.deliveryCharge ?? 0,
        subtotal: orderData.subtotal ?? 0,
        grandTotal: orderData.grandTotal ?? 0,
        status: 'pending',
        notes: orderData.notes || '',
        createdAt: new Date().toISOString()
      };

      try {
        if (typeof window !== 'undefined') {
          const stored = JSON.parse(localStorage.getItem('amarchoice_orders') || '[]');
          localStorage.setItem('amarchoice_orders', JSON.stringify([fallbackOrder, ...stored]));
        }
      } catch (e) {
        console.warn('Could not save to localStorage:', e);
      }

      setOrders(prev => [fallbackOrder, ...prev]);

      trackPixelEvent('Purchase', {
        value: fallbackOrder.grandTotal,
        currency: 'BDT',
        orderId: fallbackOrder.id,
        itemsCount: fallbackOrder.items.length
      }, {
        name: fallbackOrder.customerName,
        phone: fallbackOrder.customerPhone,
        address: fallbackOrder.customerAddress
      });

      return fallbackOrder;
    }
  };

  const updateOrder = async (id: string, orderData: Partial<Order>): Promise<Order> => {
    try {
      const updated = await api.updateOrder(id, orderData);
      setOrders(prev => prev.map(o => o.id === id ? { ...o, ...updated } : o));
      return updated;
    } catch (err) {
      console.error('Failed to update order:', err);
      let fallback: Order | undefined;
      setOrders(prev => prev.map(o => {
        if (o.id === id) {
          fallback = { ...o, ...orderData };
          return fallback;
        }
        return o;
      }));
      if (fallback) return fallback;
      throw err;
    }
  };

  const updateOrderStatus = async (id: string, status: OrderStatus, notes?: string) => {
    try {
      const updated = await api.updateOrderStatus(id, status, notes);
      setOrders(prev => prev.map(o => o.id === id ? updated : o));
    } catch (err) {
      console.error('Failed to update status:', err);
      // Fallback
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status, notes: notes ?? o.notes } : o));
    }
  };

  const deleteOrder = async (id: string) => {
    try {
      await api.deleteOrder(id);
      setOrders(prev => prev.filter(o => o.id !== id));
    } catch (err) {
      console.error('Failed to delete order:', err);
      setOrders(prev => prev.filter(o => o.id !== id));
    }
  };

  const bulkActionOrders = async (payload: {
    orderIds: string[];
    action: 'status' | 'delete' | 'courier' | 'sync_courier';
    status?: OrderStatus;
    provider?: 'steadfast' | 'pathao';
  }) => {
    try {
      const res = await api.bulkActionOrders(payload);
      if (res.orders) {
        setOrders(res.orders);
      } else {
        await refreshAll();
      }
      return { success: true, count: res.count, message: res.message };
    } catch (err: any) {
      console.error('Failed to perform bulk action on orders:', err);
      await refreshAll();
      throw err;
    }
  };

  const sendToCourier = async (orderId: string, provider: 'steadfast' | 'pathao', deliveryFee?: number, note?: string) => {
    try {
      const existingOrder = orders.find(o => o.id === orderId);
      const res = await api.sendToCourier(orderId, provider, deliveryFee, note, existingOrder);
      if (res.order) {
        setOrders(prev => prev.map(o => o.id === orderId ? res.order : o));
      }
      return { success: true, message: res.message, order: res.order };
    } catch (err) {
      console.error('Failed to send to courier:', err);
      throw err;
    }
  };

  const checkCourierStatus = async (orderId: string): Promise<string> => {
    try {
      const res = await api.checkCourierStatus(orderId);
      setOrders(prev => prev.map(o => {
        if (o.id === orderId && o.courier) {
          const updatedOrderStatus = res.orderStatus || (res.status.toLowerCase().includes('delivered') ? 'delivered' : o.status);
          return {
            ...o,
            status: updatedOrderStatus,
            courier: {
              ...o.courier,
              status: res.status
            }
          };
        }
        return o;
      }));
      return res.status;
    } catch (err) {
      console.error('Failed to check courier status:', err);
      throw err;
    }
  };

  const syncAllCouriers = async (): Promise<number> => {
    try {
      const res = await api.syncAllCouriers();
      if (res.orders && res.orders.length > 0) {
        setOrders(res.orders);
      }
      return res.count || 0;
    } catch (err) {
      console.error('Failed to sync all couriers:', err);
      throw err;
    }
  };

  const sendSms = async (orderId: string, message: string, customPhone?: string) => {
    try {
      const res = await api.sendSms(orderId, message, customPhone);
      if (res.order) {
        setOrders(prev => prev.map(o => o.id === orderId ? res.order! : o));
      } else if (res.log) {
        setOrders(prev => prev.map(o => {
          if (o.id === orderId) {
            return {
              ...o,
              smsLogs: [res.log!, ...(o.smsLogs || [])]
            };
          }
          return o;
        }));
      }
      return res;
    } catch (err) {
      console.error('Failed to send SMS:', err);
      throw err;
    }
  };

  const sendOrderConfirmSms = async (
    orderId: string,
    payload?: { customPhone?: string; customMessage?: string; updateStatusToConfirmed?: boolean }
  ) => {
    try {
      const res = await api.sendOrderConfirmSms(orderId, payload);
      if (res.order) {
        setOrders(prev => prev.map(o => o.id === orderId ? res.order! : o));
      } else if (res.log) {
        setOrders(prev => prev.map(o => {
          if (o.id === orderId) {
            return {
              ...o,
              status: payload?.updateStatusToConfirmed ? 'confirmed' : o.status,
              smsLogs: [res.log!, ...(o.smsLogs || [])]
            };
          }
          return o;
        }));
      }
      return res;
    } catch (err) {
      console.error('Failed to send confirmation SMS:', err);
      throw err;
    }
  };

  const bulkSendConfirmSms = async (orderIds: string[], updateStatusToConfirmed = false) => {
    try {
      const res = await api.bulkSendConfirmSms(orderIds, updateStatusToConfirmed);
      if (res.orders) {
        setOrders(res.orders);
      }
      return res;
    } catch (err) {
      console.error('Failed to bulk send confirmation SMS:', err);
      throw err;
    }
  };

  const createLandingPage = async (page: Partial<LandingPage>): Promise<LandingPage> => {
    try {
      const created = await api.createLandingPage(page);
      setLandingPages(prev => {
        const next = created.isDefault
          ? [created, ...prev.map(p => ({ ...p, isDefault: false }))]
          : [created, ...prev];
        landingPagesRef.current = next;
        return next;
      });
      if (created.isDefault) {
        setActiveLandingPageState(created);
        setSettings(prev => ({ ...prev, defaultLandingPageId: created.id }));
      } else {
        setActiveLandingPageState(created);
      }
      return created;
    } catch (err) {
      console.error('Failed to create landing page:', err);
      throw err;
    }
  };

  const updateLandingPage = async (id: string, page: Partial<LandingPage>): Promise<LandingPage> => {
    try {
      const updated = await api.updateLandingPage(id, page);
      setLandingPages(prev => {
        const next = prev.map(p => {
          if (p.id === id) return updated;
          if (updated.isDefault) return { ...p, isDefault: false };
          return p;
        });
        landingPagesRef.current = next;
        return next;
      });
      if (updated.isDefault) {
        setActiveLandingPageState(updated);
        setSettings(prev => ({ ...prev, defaultLandingPageId: updated.id }));
      } else if (activeLandingPage?.id === id) {
        setActiveLandingPageState(updated);
      }
      return updated;
    } catch (err) {
      console.error('Failed to update landing page:', err);
      throw err;
    }
  };

  const setDefaultLandingPage = async (id: string): Promise<void> => {
    try {
      const res = await api.setDefaultLandingPage(id);
      let newPages: LandingPage[];
      let newDefault: LandingPage | undefined;

      if (res && res.landingPages && res.landingPages.length > 0) {
        newPages = res.landingPages;
        newDefault = res.defaultPage || res.landingPages.find(p => p.id === id || p.slug === id || p.isDefault);
      } else {
        newPages = landingPagesRef.current.map(p => ({
          ...p,
          isDefault: p.id === id || p.slug === id
        }));
        newDefault = newPages.find(p => p.isDefault);
      }

      setLandingPages(newPages);
      landingPagesRef.current = newPages;

      if (newDefault) {
        setActiveLandingPageState(newDefault);
      }

      setSettings(prev => ({
        ...prev,
        defaultLandingPageId: newDefault?.id || id
      }));
    } catch (err) {
      console.error('Failed to set default landing page:', err);
      const nextPages = landingPagesRef.current.map(p => ({
        ...p,
        isDefault: p.id === id || p.slug === id
      }));
      setLandingPages(nextPages);
      landingPagesRef.current = nextPages;
      const newDef = nextPages.find(p => p.isDefault);
      if (newDef) setActiveLandingPageState(newDef);
      setSettings(prev => ({
        ...prev,
        defaultLandingPageId: newDef?.id || id
      }));
    }
  };

  const deleteLandingPage = async (id: string) => {
    try {
      await api.deleteLandingPage(id);
      setLandingPages(prev => {
        const next = prev.filter(p => p.id !== id);
        const wasDefault = prev.some(p => p.id === id && p.isDefault);
        if (wasDefault && next.length > 0) {
          next[0].isDefault = true;
          setSettings(s => ({ ...s, defaultLandingPageId: next[0].id }));
        }
        landingPagesRef.current = next;
        if (activeLandingPage?.id === id) {
          setActiveLandingPageState(next.find(p => p.isDefault) || next[0] || null);
        }
        return next;
      });
    } catch (err) {
      console.error('Failed to delete landing page:', err);
      throw err;
    }
  };

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      const updated = await api.updateSettings(newSettings);
      setSettings(updated);
      if (updated.fraudControl) {
        setFraudControl(updated.fraudControl);
      }
    } catch (err) {
      console.error('Failed to update settings:', err);
      setSettings(prev => ({ ...prev, ...newSettings }));
    }
  };

  // Fraud Control Handlers
  const updateFraudControl = async (newConfig: Partial<FraudControlConfig>) => {
    try {
      const updated = await api.updateFraudControl(newConfig);
      setFraudControl(updated);
      setSettings(prev => ({ ...prev, fraudControl: updated }));
    } catch (err) {
      console.error('Failed to update fraud control:', err);
      setFraudControl(prev => ({ ...prev, ...newConfig }));
    }
  };

  const blockCustomer = async (data: { phone: string; name?: string; reason?: string; ip?: string }): Promise<BlockedCustomer> => {
    try {
      const blocked = await api.blockCustomer(data);
      setFraudControl(prev => ({
        ...prev,
        blockedPhones: [blocked, ...prev.blockedPhones.filter(b => b.phone !== data.phone.trim())]
      }));
      return blocked;
    } catch (err) {
      console.error('Failed to block customer:', err);
      const fallbackItem: BlockedCustomer = {
        id: `blk-${Date.now()}`,
        phone: data.phone.trim(),
        ip: data.ip?.trim(),
        name: data.name?.trim() || 'গ্রাহক',
        reason: data.reason?.trim() || 'অ্যাডমিন কর্তৃক ব্লক',
        blockedAt: new Date().toISOString(),
        blockedBy: 'admin',
        orderCountToday: 0
      };
      setFraudControl(prev => ({
        ...prev,
        blockedPhones: [fallbackItem, ...prev.blockedPhones]
      }));
      return fallbackItem;
    }
  };

  const unblockCustomer = async (phone: string) => {
    try {
      await api.unblockCustomer(phone);
      setFraudControl(prev => ({
        ...prev,
        blockedPhones: prev.blockedPhones.filter(b => b.phone.replace(/[^0-9]/g, '') !== phone.replace(/[^0-9]/g, ''))
      }));
    } catch (err) {
      console.error('Failed to unblock customer:', err);
      setFraudControl(prev => ({
        ...prev,
        blockedPhones: prev.blockedPhones.filter(b => b.phone.replace(/[^0-9]/g, '') !== phone.replace(/[^0-9]/g, ''))
      }));
    }
  };

  const blockIp = async (data: { ip: string; name?: string; reason?: string; associatedPhone?: string }): Promise<BlockedIpRecord> => {
    try {
      const blocked = await api.blockIp(data);
      setFraudControl(prev => ({
        ...prev,
        blockedIps: [blocked, ...(prev.blockedIps || []).filter(b => b.ip !== data.ip.trim())]
      }));
      return blocked;
    } catch (err) {
      console.error('Failed to block IP:', err);
      const fallbackItem: BlockedIpRecord = {
        id: `ip-${Date.now()}`,
        ip: data.ip.trim(),
        name: data.name?.trim() || 'সন্দেহভাজন ডিভাইস',
        associatedPhone: data.associatedPhone?.trim(),
        reason: data.reason?.trim() || 'অ্যাডমিন কর্তৃক আইপি ব্লক',
        blockedAt: new Date().toISOString(),
        blockedBy: 'admin',
        orderCountToday: 0
      };
      setFraudControl(prev => ({
        ...prev,
        blockedIps: [fallbackItem, ...(prev.blockedIps || [])]
      }));
      return fallbackItem;
    }
  };

  const unblockIp = async (ip: string) => {
    try {
      await api.unblockIp(ip);
      setFraudControl(prev => ({
        ...prev,
        blockedIps: (prev.blockedIps || []).filter(b => b.ip !== ip.trim()),
        blockedPhones: prev.blockedPhones.map(b => b.ip === ip.trim() ? { ...b, ip: undefined } : b)
      }));
    } catch (err) {
      console.error('Failed to unblock IP:', err);
      setFraudControl(prev => ({
        ...prev,
        blockedIps: (prev.blockedIps || []).filter(b => b.ip !== ip.trim()),
        blockedPhones: prev.blockedPhones.map(b => b.ip === ip.trim() ? { ...b, ip: undefined } : b)
      }));
    }
  };

  // Incomplete Orders Handlers
  const refreshIncompleteOrders = async (): Promise<IncompleteOrder[]> => {
    try {
      const data = await api.getIncompleteOrders();
      const localDemoRemoved = typeof window !== 'undefined' && localStorage.getItem('amarchoice_demo_data_removed') === 'true';
      const isDemoRemoved = Boolean(localDemoRemoved || settings?.isDemoDataRemoved);
      const filtered = isDemoRemoved ? (data || []).filter(i => !['inc-101', 'inc-102'].includes(i.id)) : (data || []);
      setIncompleteOrders(filtered);
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('amarchoice_incomplete_orders', JSON.stringify(filtered.slice(0, 100)));
        }
      } catch {
        // ignore
      }
      return filtered;
    } catch (err) {
      console.warn('Failed to refresh incomplete orders from server, keeping local list:', err);
      return incompleteOrders;
    }
  };

  const saveIncompleteOrderLead = async (data: Partial<IncompleteOrder>): Promise<IncompleteOrder> => {
    try {
      const saved = await api.saveIncompleteOrder(data);
      setIncompleteOrders(prev => {
        const cleanSavedPhone = saved.customerPhone ? saved.customerPhone.replace(/\D/g, '') : '';
        const existingIdx = prev.findIndex(item => {
          if (item.id === saved.id) return true;
          const cleanItemPhone = item.customerPhone ? item.customerPhone.replace(/\D/g, '') : '';
          if (cleanSavedPhone && cleanItemPhone && cleanSavedPhone.length >= 6 && cleanItemPhone === cleanSavedPhone && item.status !== 'recovered') {
            return true;
          }
          return false;
        });

        let next: IncompleteOrder[];
        if (existingIdx !== -1) {
          next = [...prev];
          next[existingIdx] = { ...next[existingIdx], ...saved };
        } else {
          next = [saved, ...prev];
        }

        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('amarchoice_incomplete_orders', JSON.stringify(next.slice(0, 100)));
          }
        } catch {
          // ignore
        }
        return next;
      });
      return saved;
    } catch (err) {
      console.warn('Silent save incomplete order error (swallowed):', err);
      const fallback: IncompleteOrder = {
        id: data.id || `inc-${Date.now()}`,
        landingPageId: data.landingPageId || 'default',
        landingPageTitle: data.landingPageTitle || 'অর্ডার পেজ',
        landingPageSlug: data.landingPageSlug || 'default',
        customerName: data.customerName || 'অজানা ক্রেতা',
        customerPhone: data.customerPhone || '',
        customerAddress: data.customerAddress || '',
        items: data.items || [],
        subtotal: data.subtotal || 0,
        deliveryCharge: data.deliveryCharge || 0,
        grandTotal: data.grandTotal || 0,
        step: data.step || 'details_entered',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'uncontacted'
      };
      setIncompleteOrders(prev => {
        const next = [fallback, ...prev.filter(p => p.id !== fallback.id)];
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('amarchoice_incomplete_orders', JSON.stringify(next.slice(0, 100)));
          }
        } catch {
          // ignore
        }
        return next;
      });
      return fallback;
    }
  };

  const updateIncompleteOrder = async (
    id: string,
    data: Partial<IncompleteOrder> & {
      contactLog?: { method: 'call' | 'sms' | 'whatsapp'; note?: string };
    }
  ) => {
    try {
      const updated = await api.updateIncompleteOrder(id, data);
      setIncompleteOrders(prev => prev.map(item => item.id === id ? updated : item));
    } catch (err) {
      console.error('Failed to update incomplete order:', err);
      setIncompleteOrders(prev => prev.map(item => {
        if (item.id === id) {
          const logs = item.contactLogs ? [...item.contactLogs] : [];
          if (data.contactLog) {
            logs.unshift({
              timestamp: new Date().toISOString(),
              method: data.contactLog.method,
              note: data.contactLog.note
            });
          }
          return {
            ...item,
            ...data,
            contactLogs: logs,
            updatedAt: new Date().toISOString()
          };
        }
        return item;
      }));
    }
  };

  const convertIncompleteToOrder = async (id: string): Promise<Order> => {
    try {
      const res = await api.convertIncompleteOrder(id);
      setOrders(prev => [res.order, ...prev]);
      setIncompleteOrders(prev => prev.map(item => item.id === id ? res.incompleteOrder : item));
      return res.order;
    } catch (err) {
      console.error('Failed to convert incomplete order:', err);
      throw err;
    }
  };

  const deleteIncompleteOrder = async (id: string) => {
    try {
      await api.deleteIncompleteOrder(id);
      setIncompleteOrders(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error('Failed to delete incomplete order:', err);
      setIncompleteOrders(prev => prev.filter(item => item.id !== id));
    }
  };

  const bulkActionIncompleteOrders = async (
    ids: string[],
    action: 'status' | 'delete',
    status?: IncompleteOrder['status']
  ): Promise<{ success: boolean; count: number }> => {
    const idSet = new Set(ids);
    try {
      const res = await api.bulkActionIncompleteOrders(ids, action, status);
      if (action === 'delete') {
        setIncompleteOrders(prev => prev.filter(item => !idSet.has(item.id)));
      } else if (action === 'status' && status) {
        setIncompleteOrders(prev =>
          prev.map(item =>
            idSet.has(item.id)
              ? { ...item, status, updatedAt: new Date().toISOString() }
              : item
          )
        );
      }
      return { success: true, count: res.count || ids.length };
    } catch (err) {
      console.warn('Backend bulkActionIncompleteOrders failed, falling back locally:', err);
      if (action === 'delete') {
        setIncompleteOrders(prev => prev.filter(item => !idSet.has(item.id)));
      } else if (action === 'status' && status) {
        setIncompleteOrders(prev =>
          prev.map(item =>
            idSet.has(item.id)
              ? { ...item, status, updatedAt: new Date().toISOString() }
              : item
          )
        );
      }
      return { success: true, count: ids.length };
    }
  };

  const clearDemoData = async (options?: {
    clearOrders?: boolean;
    clearIncomplete?: boolean;
    clearDemoPages?: boolean;
  }) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('amarchoice_demo_data_removed', 'true');
      }
      const res = await api.clearDemoData(options);
      if (res.orders) {
        setOrders(res.orders.filter(o => !isDemoOrder(o)));
      }
      if (res.incompleteOrders) {
        setIncompleteOrders(res.incompleteOrders.filter(i => !isDemoIncompleteOrder(i)));
      }
      if (res.landingPages) {
        setLandingPages(res.landingPages);
        if (res.landingPages.length > 0) {
          const defaultP = res.landingPages.find(p => p.isDefault) || res.landingPages[0];
          setActiveLandingPageState(defaultP);
        }
      }
      if (res.settings) {
        setSettings({ ...res.settings, isDemoDataRemoved: true });
      } else {
        setSettings(prev => ({ ...prev, isDemoDataRemoved: true }));
      }
    } catch (err) {
      console.error('Failed to clear demo data:', err);
      throw err;
    }
  };

  const clearAllOrders = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('amarchoice_demo_data_removed', 'true');
      }
      await api.clearAllOrders();
      setOrders([]);
      setSettings(prev => ({ ...prev, isDemoDataRemoved: true }));
    } catch (err) {
      console.error('Failed to clear all orders:', err);
      setOrders([]);
    }
  };

  const clearAllIncompleteOrders = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('amarchoice_demo_data_removed', 'true');
      }
      await api.clearAllIncompleteOrders();
      setIncompleteOrders([]);
      setSettings(prev => ({ ...prev, isDemoDataRemoved: true }));
    } catch (err) {
      console.error('Failed to clear all incomplete orders:', err);
      setIncompleteOrders([]);
    }
  };

  return (
    <AppContext.Provider
      value={{
        landingPages,
        activeLandingPage,
        orders,
        incompleteOrders,
        fraudControl,
        settings,
        pixelLogs,
        loading,
        viewMode,
        adminTab,
        adminSidebarOpen,
        setAdminSidebarOpen,
        currentUser,
        users,
        adminLanguage,
        setAdminLanguage,
        setViewMode,
        setAdminTab,
        setActiveLandingPage,
        selectPageBySlug,
        refreshAll,
        login,
        logout,
        createAdminUser,
        deleteAdminUser,
        createOrder,
        updateOrder,
        updateOrderStatus,
        deleteOrder,
        bulkActionOrders,
        sendToCourier,
        checkCourierStatus,
        syncAllCouriers,
        sendSms,
        sendOrderConfirmSms,
        bulkSendConfirmSms,
        createLandingPage,
        updateLandingPage,
        setDefaultLandingPage,
        deleteLandingPage,
        updateSettings,
        trackPixelEvent,
        testPixelCapi,
        updateFraudControl,
        blockCustomer,
        unblockCustomer,
        blockIp,
        unblockIp,
        refreshIncompleteOrders,
        saveIncompleteOrderLead,
        updateIncompleteOrder,
        convertIncompleteToOrder,
        deleteIncompleteOrder,
        bulkActionIncompleteOrders,
        clearDemoData,
        clearAllOrders,
        clearAllIncompleteOrders
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
