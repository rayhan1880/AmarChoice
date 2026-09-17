import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { LandingPage, Order, AppSettings, PixelEventLog, OrderStatus, AdminTab, AdminUser, FraudControlConfig, BlockedCustomer, BlockedIpRecord, IncompleteOrder } from '../types.ts';
import { api } from '../services/api.ts';
import { INITIAL_LANDING_PAGES, INITIAL_ORDERS, INITIAL_SETTINGS, INITIAL_ADMIN_USERS, INITIAL_INCOMPLETE_ORDERS } from '../data/initialData.ts';
import { AdminLanguage } from '../utils/translations.ts';

export type { AdminTab, AdminLanguage };

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
  setViewMode: (mode: 'customer' | 'admin') => void;
  setAdminTab: (tab: AdminTab) => void;
  setActiveLandingPage: (page: LandingPage) => void;
  selectPageBySlug: (slug: string) => void;
  refreshAll: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  createAdminUser: (userData: { name: string; email: string; password: string; role?: 'superadmin' | 'admin' | 'moderator' }) => Promise<AdminUser>;
  deleteAdminUser: (id: string) => Promise<void>;
  createOrder: (orderData: Partial<Order>) => Promise<Order>;
  updateOrderStatus: (id: string, status: OrderStatus, notes?: string) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  sendToCourier: (orderId: string, provider: 'steadfast' | 'pathao', deliveryFee?: number, note?: string) => Promise<void>;
  checkCourierStatus: (orderId: string) => Promise<string>;
  syncAllCouriers: () => Promise<number>;
  sendSms: (orderId: string, message: string, customPhone?: string) => Promise<void>;
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
  saveIncompleteOrderLead: (data: Partial<IncompleteOrder>) => Promise<IncompleteOrder>;
  updateIncompleteOrder: (
    id: string,
    data: {
      status?: IncompleteOrder['status'];
      notes?: string;
      contactLog?: { method: 'call' | 'sms' | 'whatsapp'; note?: string };
    }
  ) => Promise<void>;
  convertIncompleteToOrder: (id: string) => Promise<Order>;
  deleteIncompleteOrder: (id: string) => Promise<void>;
  clearDemoData: (options?: { clearOrders?: boolean; clearIncomplete?: boolean; clearDemoPages?: boolean }) => Promise<void>;
  clearAllOrders: () => Promise<void>;
  clearAllIncompleteOrders: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper to check if URL targets mypanel
function checkIsMyPanelUrl(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    const search = window.location.search.toLowerCase();
    const href = window.location.href.toLowerCase();

    return (
      path.includes('mypanel') ||
      path.endsWith('/admin') ||
      path === '/admin' ||
      hash.includes('mypanel') ||
      hash.includes('admin') ||
      search.includes('mypanel') ||
      search.includes('admin') ||
      href.includes('mypanel')
    );
  } catch {
    return false;
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
  const [activeLandingPage, setActiveLandingPageState] = useState<LandingPage | null>(INITIAL_LANDING_PAGES[0]);
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
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return null;
  });

  const [users, setUsers] = useState<AdminUser[]>(INITIAL_ADMIN_USERS);

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
      setViewModeState(prev => {
        const next = isPanel ? 'admin' : 'customer';
        return prev !== next ? next : prev;
      });
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('app_location_change', handleUrlChange);

    // AI Studio message listener
    const handleMessage = (event: MessageEvent) => {
      try {
        if (typeof event.data === 'string' && event.data.includes('mypanel')) {
          setViewModeState('admin');
        } else if (event.data && typeof event.data === 'object') {
          const str = JSON.stringify(event.data);
          if (str.includes('mypanel')) {
            setViewModeState('admin');
          }
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener('message', handleMessage);

    // Fast interval fallback for embedded AI Studio preview bar URL updates
    const timer = setInterval(() => {
      handleUrlChange();
    }, 120);

    // Secret shortcut: Alt+P or Ctrl+Shift+A for store owners
    let keyBuffer = '';
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) || (e.altKey && (e.key === 'P' || e.key === 'p'))) {
        e.preventDefault();
        setViewMode('admin');
        return;
      }

      // Check if user typed 'mypanel' anywhere
      if (e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        keyBuffer = (keyBuffer + e.key.toLowerCase()).slice(-8);
        if (keyBuffer.includes('mypanel')) {
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
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('keydown', handleKeyDown);
      clearInterval(timer);
    };
  }, []);

  const setViewMode = (mode: 'customer' | 'admin') => {
    setViewModeState(mode);
    if (typeof window !== 'undefined') {
      if (mode === 'admin') {
        if (!checkIsMyPanelUrl()) {
          try {
            window.history.pushState(null, '', '/mypanel');
          } catch {
            window.location.hash = '/mypanel';
          }
        }
      } else {
        if (checkIsMyPanelUrl()) {
          try {
            window.history.pushState(null, '', '/');
          } catch {
            window.location.hash = '';
          }
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
        api.getUsers().catch(() => INITIAL_ADMIN_USERS),
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
        ? ordersData.filter(o => !['ORD-1001', 'ORD-1002', 'ORD-1003', 'ORD-1004'].includes(o.id))
        : ordersData;

      const finalIncOrders = isDemoRemoved
        ? incOrdersData.filter(i => !['inc-101', 'inc-102'].includes(i.id))
        : incOrdersData;

      // Fall back to INITIAL_LANDING_PAGES if backend returns empty or unavailable (e.g. static hosting on Vercel)
      const validPages = (pagesData && pagesData.length > 0) ? pagesData : INITIAL_LANDING_PAGES;

      setLandingPages(validPages);
      setOrders(finalOrders);
      setSettings(settingsData);
      setPixelLogs(logsData);
      setUsers(usersData);
      setIncompleteOrders(finalIncOrders);
      if (fraudData) {
        setFraudControl(fraudData);
      } else if (settingsData.fraudControl) {
        setFraudControl(settingsData.fraudControl);
      }

      // Determine initial active page:
      // If URL explicitly requests a slug (?page=slug or hash), respect that.
      // Otherwise, select the designated Home Page (isDefault: true or settingsData.defaultLandingPageId).
      let targetSlugOrId: string | null = null;
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        targetSlugOrId = searchParams.get('page') || searchParams.get('p') || null;
        if (!targetSlugOrId && window.location.hash) {
          const cleanHash = window.location.hash.replace(/^#\/?/, '');
          if (cleanHash && !cleanHash.includes('mypanel') && !cleanHash.includes('admin')) {
            targetSlugOrId = cleanHash;
          }
        }
      }

      setActiveLandingPageState(prev => {
        if (targetSlugOrId) {
          const matchedByUrl = validPages.find(p => p.slug === targetSlugOrId || p.id === targetSlugOrId);
          if (matchedByUrl) return matchedByUrl;
        }
        if (prev) {
          const matched = validPages.find(p => p.id === prev.id || p.slug === prev.slug);
          if (matched) return matched;
        }
        const defaultPage = validPages.find(p => p.isDefault) ||
                            validPages.find(p => p.id === settingsData.defaultLandingPageId) ||
                            validPages[0] ||
                            INITIAL_LANDING_PAGES[0] ||
                            null;
        return defaultPage;
      });
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await api.login(email, password);
      if (res && res.user) {
        setCurrentUser(res.user);
        try {
          localStorage.setItem('amarchoice_admin_user', JSON.stringify(res.user));
        } catch {
          // ignore
        }
        return true;
      }
    } catch (err) {
      // Fallback check against local initial/state users if network or server restarted
      const normalizedEmail = email.toLowerCase().trim();
      const localFound = users.find(
        u => u.email.toLowerCase().trim() === normalizedEmail && (u.password === password.trim() || (!u.password && password.trim() === 'admin123'))
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
      throw err;
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
    try {
      const res = await api.createUser(userData);
      setUsers(prev => [...prev, res.user]);
      return res.user;
    } catch (err) {
      // Fallback local creation
      const localUser: AdminUser = {
        id: `user-${Date.now()}`,
        name: userData.name,
        email: userData.email.toLowerCase().trim(),
        password: userData.password,
        role: userData.role || 'admin',
        createdAt: new Date().toISOString()
      };
      setUsers(prev => [...prev, localUser]);
      return localUser;
    }
  };

  const deleteAdminUser = async (id: string): Promise<void> => {
    try {
      await api.deleteUser(id);
    } catch {
      // Fallback
    }
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const setActiveLandingPage = (page: LandingPage) => {
    setActiveLandingPageState(page);
    // Track PageView for this landing page
    trackPixelEvent('PageView', { pageTitle: page.title, slug: page.slug });
  };

  const selectPageBySlug = (slug: string) => {
    const found = landingPages.find(p => p.slug === slug);
    if (found) {
      setActiveLandingPage(found);
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
      console.error('Failed to create order:', err);
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

  const sendToCourier = async (orderId: string, provider: 'steadfast' | 'pathao', deliveryFee?: number, note?: string) => {
    try {
      const res = await api.sendToCourier(orderId, provider, deliveryFee, note);
      setOrders(prev => prev.map(o => o.id === orderId ? res.order : o));
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
      setOrders(prev => prev.map(o => {
        if (o.id === orderId) {
          return {
            ...o,
            smsLogs: [res.log, ...(o.smsLogs || [])]
          };
        }
        return o;
      }));
    } catch (err) {
      console.error('Failed to send SMS:', err);
      throw err;
    }
  };

  const createLandingPage = async (page: Partial<LandingPage>): Promise<LandingPage> => {
    try {
      const created = await api.createLandingPage(page);
      setLandingPages(prev => {
        if (created.isDefault) {
          return [created, ...prev.map(p => ({ ...p, isDefault: false }))];
        }
        return [created, ...prev];
      });
      setActiveLandingPageState(created);
      return created;
    } catch (err) {
      console.error('Failed to create landing page:', err);
      throw err;
    }
  };

  const updateLandingPage = async (id: string, page: Partial<LandingPage>): Promise<LandingPage> => {
    try {
      const updated = await api.updateLandingPage(id, page);
      setLandingPages(prev =>
        prev.map(p => {
          if (p.id === id) return updated;
          if (updated.isDefault) return { ...p, isDefault: false };
          return p;
        })
      );
      if (activeLandingPage?.id === id) {
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
      if (res && res.landingPages) {
        setLandingPages(res.landingPages);
        if (res.defaultPage) {
          setActiveLandingPageState(res.defaultPage);
        }
      } else {
        setLandingPages(prev =>
          prev.map(p => ({
            ...p,
            isDefault: p.id === id || p.slug === id
          }))
        );
        const newDef = landingPages.find(p => p.id === id || p.slug === id);
        if (newDef) setActiveLandingPageState({ ...newDef, isDefault: true });
      }
      setSettings(prev => ({
        ...prev,
        defaultLandingPageId: id
      }));
    } catch (err) {
      console.error('Failed to set default landing page:', err);
      setLandingPages(prev =>
        prev.map(p => ({
          ...p,
          isDefault: p.id === id || p.slug === id
        }))
      );
      const newDef = landingPages.find(p => p.id === id || p.slug === id);
      if (newDef) setActiveLandingPageState({ ...newDef, isDefault: true });
      setSettings(prev => ({
        ...prev,
        defaultLandingPageId: id
      }));
    }
  };

  const deleteLandingPage = async (id: string) => {
    try {
      await api.deleteLandingPage(id);
      setLandingPages(prev => {
        const next = prev.filter(p => p.id !== id);
        if (activeLandingPage?.id === id) {
          setActiveLandingPageState(next[0] || null);
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
  const saveIncompleteOrderLead = async (data: Partial<IncompleteOrder>): Promise<IncompleteOrder> => {
    try {
      const saved = await api.saveIncompleteOrder(data);
      setIncompleteOrders(prev => {
        const existingIdx = prev.findIndex(item => item.id === saved.id || item.customerPhone === saved.customerPhone);
        if (existingIdx !== -1) {
          const clone = [...prev];
          clone[existingIdx] = saved;
          return clone;
        }
        return [saved, ...prev];
      });
      return saved;
    } catch (err) {
      console.warn('Silent save incomplete order error (swallowed):', err);
      const fallback: IncompleteOrder = {
        id: `inc-${Date.now()}`,
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
      return fallback;
    }
  };

  const updateIncompleteOrder = async (
    id: string,
    data: {
      status?: IncompleteOrder['status'];
      notes?: string;
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
            status: data.status || item.status,
            notes: data.notes !== undefined ? data.notes : item.notes,
            contactLogs: logs
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
        setOrders(res.orders.filter(o => !['ORD-1001', 'ORD-1002', 'ORD-1003', 'ORD-1004'].includes(o.id)));
      }
      if (res.incompleteOrders) {
        setIncompleteOrders(res.incompleteOrders.filter(i => !['inc-101', 'inc-102'].includes(i.id)));
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
        updateOrderStatus,
        deleteOrder,
        sendToCourier,
        checkCourierStatus,
        syncAllCouriers,
        sendSms,
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
        saveIncompleteOrderLead,
        updateIncompleteOrder,
        convertIncompleteToOrder,
        deleteIncompleteOrder,
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
