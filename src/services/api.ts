import { LandingPage, Order, AppSettings, PixelEventLog, OrderStatus, AdminUser, FraudControlConfig, BlockedCustomer, BlockedIpRecord, IncompleteOrder } from '../types.ts';

const API_BASE = '/api';

export const api = {
  // Landing Pages
  async getLandingPages(): Promise<LandingPage[]> {
    const res = await fetch(`${API_BASE}/landing-pages`);
    if (!res.ok) throw new Error('Failed to fetch landing pages');
    return res.json();
  },

  async getLandingPage(slugOrId: string): Promise<LandingPage> {
    const res = await fetch(`${API_BASE}/landing-pages/${slugOrId}`);
    if (!res.ok) throw new Error('Failed to fetch landing page');
    return res.json();
  },

  async createLandingPage(page: Partial<LandingPage>): Promise<LandingPage> {
    const res = await fetch(`${API_BASE}/landing-pages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(page)
    });
    if (!res.ok) throw new Error('Failed to create landing page');
    return res.json();
  },

  async updateLandingPage(id: string, page: Partial<LandingPage>): Promise<LandingPage> {
    const res = await fetch(`${API_BASE}/landing-pages/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(page)
    });
    if (!res.ok) throw new Error('Failed to update landing page');
    return res.json();
  },

  async setDefaultLandingPage(id: string): Promise<{ success: boolean; defaultPageId: string; defaultPage: LandingPage; landingPages: LandingPage[] }> {
    const res = await fetch(`${API_BASE}/landing-pages/${id}/set-default`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Failed to set default landing page');
    return res.json();
  },

  async deleteLandingPage(id: string): Promise<{ success: boolean; message?: string }> {
    const res = await fetch(`${API_BASE}/landing-pages/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete landing page');
    }
    return res.json();
  },

  // Orders
  async getOrders(params?: { landingPageId?: string; status?: string }): Promise<Order[]> {
    const query = new URLSearchParams();
    if (params?.landingPageId) query.set('landingPageId', params.landingPageId);
    if (params?.status) query.set('status', params.status);
    const res = await fetch(`${API_BASE}/orders?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch orders');
    return res.json();
  },

  async createOrder(orderData: Partial<Order>): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || 'Failed to create order');
    }
    return res.json();
  },

  async updateOrderStatus(id: string, status: OrderStatus, notes?: string): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes })
    });
    if (!res.ok) throw new Error('Failed to update order status');
    return res.json();
  },

  async deleteOrder(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/orders/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete order');
    return res.json();
  },

  async clearAllOrders(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/orders/clear-all`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to clear orders');
    return res.json();
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
    const res = await fetch(`${API_BASE}/demo-data/clear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options || {})
    });
    if (!res.ok) throw new Error('Failed to clear demo data');
    return res.json();
  },

  // Courier
  async sendToCourier(
    orderId: string,
    provider: 'steadfast' | 'pathao',
    deliveryFee?: number,
    note?: string
  ): Promise<{ success: boolean; courier: NonNullable<Order['courier']>; order: Order }> {
    const res = await fetch(`${API_BASE}/orders/${orderId}/courier`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, deliveryFee, note })
    });
    if (!res.ok) throw new Error('Failed to send order to courier');
    return res.json();
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
    const res = await fetch(`${API_BASE}/orders/${orderId}/courier-status`);
    if (!res.ok) throw new Error('Failed to check courier status');
    return res.json();
  },

  async syncAllCouriers(): Promise<{
    success: boolean;
    count: number;
    orders: Order[];
    message: string;
  }> {
    const res = await fetch(`${API_BASE}/orders/sync-all-couriers`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to sync all courier orders');
    return res.json();
  },

  // SMS
  async sendSms(
    orderId: string,
    message: string,
    customPhone?: string
  ): Promise<{ success: boolean; log: NonNullable<Order['smsLogs']>[number] }> {
    const res = await fetch(`${API_BASE}/orders/${orderId}/send-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, customPhone })
    });
    if (!res.ok) throw new Error('Failed to send SMS');
    return res.json();
  },

  // Google Sheets Integration
  async testGoogleSheet(
    landingPageId: string,
    webhookUrl?: string,
    sheetName?: string
  ): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/landing-pages/${landingPageId}/test-sheet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhookUrl, sheetName })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'গুগল শিটে টেস্ট ডাটা পাঠানো ব্যর্থ হয়েছে');
    return data;
  },

  async syncOrderToSheet(orderId: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/orders/${orderId}/sync-sheet`, {
      method: 'POST'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'গুগল শিটে অর্ডার সিঙ্ক করা যায়নি');
    return data;
  },

  async syncAllOrdersToSheet(
    landingPageId: string
  ): Promise<{ success: boolean; count: number; message: string }> {
    const res = await fetch(`${API_BASE}/landing-pages/${landingPageId}/sync-all-orders`, {
      method: 'POST'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'সকল অর্ডার গুগল শিটে পাঠানো ব্যর্থ হয়েছে');
    return data;
  },

  // Settings
  async getSettings(): Promise<AppSettings> {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },

  // Facebook Pixel & TikTok Conversion API (CAPI) Logs
  async getPixelLogs(): Promise<PixelEventLog[]> {
    const res = await fetch(`${API_BASE}/pixel-logs`);
    if (!res.ok) throw new Error('Failed to fetch pixel logs');
    return res.json();
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
    const res = await fetch(`${API_BASE}/pixel-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) throw new Error('Failed to log pixel event');
    const json = await res.json();
    return json.log;
  },

  async testPixelCapiEvent(eventType = 'Purchase'): Promise<{ success: boolean; log: PixelEventLog }> {
    const res = await fetch(`${API_BASE}/pixel/test-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType })
    });
    if (!res.ok) throw new Error('Failed to send test event');
    return res.json();
  },

  // Users & Auth
  async login(email: string, password: string): Promise<{ success: boolean; user: AdminUser; token: string }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'লগইন ব্যর্থ হয়েছে');
    }
    return data;
  },

  async getUsers(): Promise<AdminUser[]> {
    const res = await fetch(`${API_BASE}/users`);
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  async createUser(userData: { name: string; email: string; password: string; role?: string }): Promise<{ success: boolean; user: AdminUser }> {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create user');
    }
    return data;
  },

  async deleteUser(id: string): Promise<{ success: boolean; message?: string }> {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to delete user');
    }
    return data;
  },

  // Fraud Control & Daily Order Limit
  async getFraudControl(): Promise<FraudControlConfig> {
    const res = await fetch(`${API_BASE}/fraud-control`);
    if (!res.ok) throw new Error('Failed to fetch fraud control settings');
    return res.json();
  },

  async updateFraudControl(config: Partial<FraudControlConfig>): Promise<FraudControlConfig> {
    const res = await fetch(`${API_BASE}/fraud-control`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    if (!res.ok) throw new Error('Failed to update fraud control settings');
    return res.json();
  },

  async blockCustomer(data: { phone: string; name?: string; reason?: string; ip?: string }): Promise<BlockedCustomer> {
    const res = await fetch(`${API_BASE}/fraud-control/block`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || result.error || 'Failed to block customer');
    return result;
  },

  async unblockCustomer(phone: string): Promise<{ success: boolean; message?: string }> {
    const res = await fetch(`${API_BASE}/fraud-control/block/${encodeURIComponent(phone)}`, {
      method: 'DELETE'
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || result.error || 'Failed to unblock customer');
    return result;
  },

  async blockIp(data: { ip: string; name?: string; reason?: string; associatedPhone?: string }): Promise<BlockedIpRecord> {
    const res = await fetch(`${API_BASE}/fraud-control/block-ip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || result.error || 'Failed to block IP');
    return result;
  },

  async unblockIp(ip: string): Promise<{ success: boolean; message?: string }> {
    const res = await fetch(`${API_BASE}/fraud-control/block-ip/${encodeURIComponent(ip)}`, {
      method: 'DELETE'
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || result.error || 'Failed to unblock IP');
    return result;
  },

  // Incomplete / Abandoned Checkout Orders
  async getIncompleteOrders(): Promise<IncompleteOrder[]> {
    const res = await fetch(`${API_BASE}/incomplete-orders`);
    if (!res.ok) throw new Error('Failed to fetch incomplete orders');
    return res.json();
  },

  async saveIncompleteOrder(data: Partial<IncompleteOrder>): Promise<IncompleteOrder> {
    const res = await fetch(`${API_BASE}/incomplete-orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save incomplete order');
    }
    return res.json();
  },

  async updateIncompleteOrder(
    id: string,
    data: {
      status?: IncompleteOrder['status'];
      notes?: string;
      contactLog?: { method: 'call' | 'sms' | 'whatsapp'; note?: string };
    }
  ): Promise<IncompleteOrder> {
    const res = await fetch(`${API_BASE}/incomplete-orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update incomplete order');
    return res.json();
  },

  async convertIncompleteOrder(id: string): Promise<{ success: boolean; order: Order; incompleteOrder: IncompleteOrder }> {
    const res = await fetch(`${API_BASE}/incomplete-orders/${id}/convert`, {
      method: 'POST'
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to convert incomplete order');
    return result;
  },

  async deleteIncompleteOrder(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/incomplete-orders/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete incomplete order');
    return res.json();
  },

  async clearAllIncompleteOrders(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/incomplete-orders/clear-all`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to clear incomplete orders');
    return res.json();
  }
};
