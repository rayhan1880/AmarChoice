import { LandingPage, Order, AppSettings, PixelEventLog, OrderStatus, AdminUser, FraudControlConfig, BlockedCustomer, BlockedIpRecord, IncompleteOrder, CourierCustomerHistory } from '../types.ts';

const API_BASE = '/api';

async function safeFetchJson<T>(url: string, options?: RequestInit, defaultErrMsg = 'Request failed'): Promise<T> {
  const res = await fetch(url, options);
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();

  if (!text || text.trim().startsWith('<') || contentType.includes('text/html')) {
    throw new Error(`API_SERVER_UNAVAILABLE: Server returned HTML instead of JSON (HTTP ${res.status})`);
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`API_SERVER_UNAVAILABLE: Invalid JSON response`);
  }

  if (!res.ok) {
    throw new Error(data.message || data.error || `${defaultErrMsg} (HTTP ${res.status})`);
  }

  return data as T;
}

export const api = {
  // Landing Pages
  async getLandingPages(): Promise<LandingPage[]> {
    return safeFetchJson<LandingPage[]>(`${API_BASE}/landing-pages`, undefined, 'Failed to fetch landing pages');
  },

  async getLandingPage(slugOrId: string): Promise<LandingPage> {
    return safeFetchJson<LandingPage>(`${API_BASE}/landing-pages/${slugOrId}`, undefined, 'Failed to fetch landing page');
  },

  async createLandingPage(page: Partial<LandingPage>): Promise<LandingPage> {
    return safeFetchJson<LandingPage>(`${API_BASE}/landing-pages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(page)
    }, 'Failed to create landing page');
  },

  async updateLandingPage(id: string, page: Partial<LandingPage>): Promise<LandingPage> {
    return safeFetchJson<LandingPage>(`${API_BASE}/landing-pages/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(page)
    }, 'Failed to update landing page');
  },

  async setDefaultLandingPage(id: string): Promise<{ success: boolean; defaultPageId: string; defaultPage: LandingPage; landingPages: LandingPage[] }> {
    return safeFetchJson<{ success: boolean; defaultPageId: string; defaultPage: LandingPage; landingPages: LandingPage[] }>(`${API_BASE}/landing-pages/${id}/set-default`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, 'Failed to set default landing page');
  },

  async deleteLandingPage(id: string): Promise<{ success: boolean; message?: string }> {
    return safeFetchJson<{ success: boolean; message?: string }>(`${API_BASE}/landing-pages/${id}`, {
      method: 'DELETE'
    }, 'Failed to delete landing page');
  },

  // Orders
  async getOrders(params?: { landingPageId?: string; status?: string }): Promise<Order[]> {
    const query = new URLSearchParams();
    if (params?.landingPageId) query.set('landingPageId', params.landingPageId);
    if (params?.status) query.set('status', params.status);
    return safeFetchJson<Order[]>(`${API_BASE}/orders?${query.toString()}`, undefined, 'Failed to fetch orders');
  },

  async createOrder(orderData: Partial<Order>): Promise<Order> {
    return safeFetchJson<Order>(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    }, 'Failed to create order');
  },

  async updateOrder(id: string, orderData: Partial<Order>): Promise<Order> {
    return safeFetchJson<Order>(`${API_BASE}/orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    }, 'Failed to update order');
  },

  async updateOrderStatus(id: string, status: OrderStatus, notes?: string): Promise<Order> {
    return safeFetchJson<Order>(`${API_BASE}/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes })
    }, 'Failed to update order status');
  },

  async deleteOrder(id: string): Promise<{ success: boolean }> {
    return safeFetchJson<{ success: boolean }>(`${API_BASE}/orders/${id}`, {
      method: 'DELETE'
    }, 'Failed to delete order');
  },

  async bulkActionOrders(payload: {
    orderIds: string[];
    action: 'status' | 'delete' | 'courier' | 'sync_courier';
    status?: OrderStatus;
    provider?: 'steadfast' | 'pathao';
  }): Promise<{ success: boolean; count: number; orders: Order[]; message: string }> {
    return safeFetchJson(`${API_BASE}/orders/bulk-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }, 'Failed to perform bulk action on orders');
  },

  async clearAllOrders(): Promise<{ success: boolean; message: string }> {
    return safeFetchJson<{ success: boolean; message: string }>(`${API_BASE}/orders/clear-all`, {
      method: 'POST'
    }, 'Failed to clear orders');
  },

  async clearDemoData(options?: {
    clearOrders?: boolean;
    clearIncomplete?: boolean;
    clearDemoPages?: boolean;
  }): Promise<{
    success: boolean;
    message: string;
    orders: Order[];
    incompleteOrders: IncompleteOrder[];
    landingPages: LandingPage[];
    settings: AppSettings;
  }> {
    return safeFetchJson(`${API_BASE}/demo-data/clear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options || {})
    }, 'Failed to clear demo data');
  },

  // Courier
  async sendToCourier(
    orderId: string,
    provider: 'steadfast' | 'pathao',
    deliveryFee?: number,
    note?: string,
    orderData?: Order
  ): Promise<{ success: boolean; courier: NonNullable<Order['courier']>; order: Order; message?: string }> {
    return safeFetchJson(`${API_BASE}/orders/${orderId}/courier`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, deliveryFee, note, orderData })
    }, 'Failed to send order to courier');
  },

  async syncLocalOrders(localOrders: Order[]): Promise<{
    success: boolean;
    addedCount: number;
    orders: Order[];
  }> {
    return safeFetchJson(`${API_BASE}/orders/sync-local`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ localOrders })
    }, 'Failed to sync local orders');
  },

  async checkCourierStatus(orderId: string): Promise<{
    success: boolean;
    provider: string;
    trackingCode: string;
    status: string;
    orderStatus?: OrderStatus;
    order?: Order;
    lastUpdated: string;
  }> {
    return safeFetchJson(`${API_BASE}/orders/${orderId}/courier-status`, undefined, 'Failed to check courier status');
  },

  async syncAllCouriers(): Promise<{
    success: boolean;
    count: number;
    orders: Order[];
    message: string;
  }> {
    return safeFetchJson(`${API_BASE}/orders/sync-all-couriers`, {
      method: 'POST'
    }, 'Failed to sync all courier orders');
  },

  async testSteadfast(credentials?: {
    apiKey?: string;
    secretKey?: string;
    baseUrl?: string;
  }): Promise<{ success: boolean; balance?: number; message?: string; error?: string }> {
    return safeFetchJson(`${API_BASE}/courier/test-steadfast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials || {})
    }, 'Failed to test Steadfast connection');
  },

  async checkCustomerCourier(phone: string): Promise<{ success: boolean; history: CourierCustomerHistory; error?: string }> {
    return safeFetchJson(`${API_BASE}/courier/check-customer/${encodeURIComponent(phone)}`, {
      method: 'GET'
    }, 'Failed to fetch courier customer history');
  },

  async checkCustomersCourierBulk(phones: string[]): Promise<{ success: boolean; histories: Record<string, CourierCustomerHistory>; error?: string }> {
    return safeFetchJson(`${API_BASE}/courier/check-customers-bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phones })
    }, 'Failed to bulk check courier customer histories');
  },

  // SMS
  async sendSms(
    orderId: string,
    message: string,
    customPhone?: string
  ): Promise<{ success: boolean; log: NonNullable<Order['smsLogs']>[number]; order?: Order; error?: string; gatewayResponse?: string }> {
    return safeFetchJson(`${API_BASE}/orders/${orderId}/send-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, customPhone })
    }, 'Failed to send SMS');
  },

  async sendOrderConfirmSms(
    orderId: string,
    payload?: { customPhone?: string; customMessage?: string; updateStatusToConfirmed?: boolean }
  ): Promise<{ success: boolean; message: string; log?: NonNullable<Order['smsLogs']>[number]; order?: Order; error?: string; gatewayResponse?: string }> {
    return safeFetchJson(`${API_BASE}/orders/${orderId}/send-confirm-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {})
    }, 'Failed to send confirmation SMS');
  },

  async bulkSendConfirmSms(
    orderIds: string[],
    updateStatusToConfirmed = false
  ): Promise<{ success: boolean; count: number; failedCount: number; message: string; orders?: Order[]; errors?: string[] }> {
    return safeFetchJson(`${API_BASE}/orders/bulk-confirm-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderIds, updateStatusToConfirmed })
    }, 'Failed to bulk send confirmation SMS');
  },

  async sendTestSms(
    phone: string,
    message: string,
    config?: Partial<AppSettings['smsGateway']>
  ): Promise<{ success: boolean; gatewayResponse: string; error?: string; serverIp?: string }> {
    return safeFetchJson(`${API_BASE}/sms/send-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, message, config })
    }, 'Failed to send test SMS');
  },

  async getServerIp(): Promise<{ ip: string }> {
    return safeFetchJson(`${API_BASE}/server-ip`, {}, 'Failed to get server IP');
  },

  // Google Sheets Integration
  async testGoogleSheet(
    landingPageId: string,
    webhookUrl?: string,
    sheetName?: string
  ): Promise<{ success: boolean; message: string }> {
    return safeFetchJson(`${API_BASE}/landing-pages/${landingPageId}/test-sheet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhookUrl, sheetName })
    }, 'গুগল শিটে টেস্ট ডাটা পাঠানো ব্যর্থ হয়েছে');
  },

  async syncOrderToSheet(orderId: string): Promise<{ success: boolean; message: string }> {
    return safeFetchJson(`${API_BASE}/orders/${orderId}/sync-sheet`, {
      method: 'POST'
    }, 'গুগল শিটে অর্ডার সিঙ্ক করা যায়নি');
  },

  async syncAllOrdersToSheet(
    landingPageId: string
  ): Promise<{ success: boolean; count: number; message: string }> {
    return safeFetchJson(`${API_BASE}/landing-pages/${landingPageId}/sync-all-orders`, {
      method: 'POST'
    }, 'সকল অর্ডার গুগল শিটে পাঠানো ব্যর্থ হয়েছে');
  },

  // Settings
  async getSettings(): Promise<AppSettings> {
    return safeFetchJson<AppSettings>(`${API_BASE}/settings`, undefined, 'Failed to fetch settings');
  },

  async updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    return safeFetchJson<AppSettings>(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    }, 'Failed to update settings');
  },

  // Facebook Pixel & TikTok Conversion API (CAPI) Logs
  async getPixelLogs(): Promise<PixelEventLog[]> {
    return safeFetchJson<PixelEventLog[]>(`${API_BASE}/pixel-logs`, undefined, 'Failed to fetch pixel logs');
  },

  async logPixelEvent(params: {
    eventName: string;
    data?: Record<string, unknown>;
    pageTitle?: string;
    pixelId?: string;
    tiktokPixelId?: string;
    eventId?: string;
    landingPageId?: string;
    customerData?: {
      name?: string;
      phone?: string;
      email?: string;
      address?: string;
    };
    sourceUrl?: string;
  }): Promise<PixelEventLog> {
    const res = await safeFetchJson<{ success: boolean; log: PixelEventLog }>(`${API_BASE}/pixel-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    }, 'Failed to log pixel event');
    return res.log;
  },

  async testPixelCapiEvent(eventType = 'Purchase'): Promise<{ success: boolean; log: PixelEventLog }> {
    return safeFetchJson(`${API_BASE}/pixel/test-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType })
    }, 'Failed to send test event');
  },

  // Users & Auth
  async login(email: string, password: string): Promise<{ success: boolean; user: AdminUser; token: string }> {
    return safeFetchJson(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    }, 'লগইন ব্যর্থ হয়েছে');
  },

  async getUsers(): Promise<AdminUser[]> {
    return safeFetchJson<AdminUser[]>(`${API_BASE}/users`, undefined, 'Failed to fetch users');
  },

  async createUser(userData: { name: string; email: string; password: string; role?: string }): Promise<{ success: boolean; user: AdminUser }> {
    return safeFetchJson(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    }, 'Failed to create user');
  },

  async deleteUser(id: string): Promise<{ success: boolean; message?: string }> {
    return safeFetchJson(`${API_BASE}/users/${id}`, {
      method: 'DELETE'
    }, 'Failed to delete user');
  },

  // Fraud Control & Daily Order Limit
  async getFraudControl(): Promise<FraudControlConfig> {
    return safeFetchJson<FraudControlConfig>(`${API_BASE}/fraud-control`, undefined, 'Failed to fetch fraud control settings');
  },

  async updateFraudControl(config: Partial<FraudControlConfig>): Promise<FraudControlConfig> {
    return safeFetchJson<FraudControlConfig>(`${API_BASE}/fraud-control`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    }, 'Failed to update fraud control settings');
  },

  async blockCustomer(data: { phone: string; name?: string; reason?: string; ip?: string }): Promise<BlockedCustomer> {
    return safeFetchJson<BlockedCustomer>(`${API_BASE}/fraud-control/block`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }, 'Failed to block customer');
  },

  async unblockCustomer(phone: string): Promise<{ success: boolean; message?: string }> {
    return safeFetchJson(`${API_BASE}/fraud-control/block/${encodeURIComponent(phone)}`, {
      method: 'DELETE'
    }, 'Failed to unblock customer');
  },

  async blockIp(data: { ip: string; name?: string; reason?: string; associatedPhone?: string }): Promise<BlockedIpRecord> {
    return safeFetchJson<BlockedIpRecord>(`${API_BASE}/fraud-control/block-ip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }, 'Failed to block IP');
  },

  async unblockIp(ip: string): Promise<{ success: boolean; message?: string }> {
    return safeFetchJson(`${API_BASE}/fraud-control/block-ip/${encodeURIComponent(ip)}`, {
      method: 'DELETE'
    }, 'Failed to unblock IP');
  },

  // Incomplete / Abandoned Checkout Orders
  async getIncompleteOrders(): Promise<IncompleteOrder[]> {
    return safeFetchJson<IncompleteOrder[]>(`${API_BASE}/incomplete-orders`, undefined, 'Failed to fetch incomplete orders');
  },

  async saveIncompleteOrder(data: Partial<IncompleteOrder>): Promise<IncompleteOrder> {
    return safeFetchJson<IncompleteOrder>(`${API_BASE}/incomplete-orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      keepalive: true
    }, 'Failed to save incomplete order');
  },

  async updateIncompleteOrder(
    id: string,
    data: Partial<IncompleteOrder> & {
      contactLog?: { method: 'call' | 'sms' | 'whatsapp'; note?: string };
    }
  ): Promise<IncompleteOrder> {
    return safeFetchJson<IncompleteOrder>(`${API_BASE}/incomplete-orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }, 'Failed to update incomplete order');
  },

  async convertIncompleteOrder(id: string): Promise<{ success: boolean; order: Order; incompleteOrder: IncompleteOrder }> {
    return safeFetchJson(`${API_BASE}/incomplete-orders/${id}/convert`, {
      method: 'POST'
    }, 'Failed to convert incomplete order');
  },

  async deleteIncompleteOrder(id: string): Promise<{ success: boolean }> {
    return safeFetchJson(`${API_BASE}/incomplete-orders/${id}`, {
      method: 'DELETE'
    }, 'Failed to delete incomplete order');
  },

  async clearAllIncompleteOrders(): Promise<{ success: boolean; message: string }> {
    return safeFetchJson(`${API_BASE}/incomplete-orders/clear-all`, {
      method: 'POST'
    }, 'Failed to clear incomplete orders');
  }
};
