export interface VariantOptionField {
  id: string;
  label: string; // The display name/title of the field, e.g. "বডি সাইজ (Body Size):" or "লং / ঝুল সাইজ (Long Size):"
  options: string[]; // Option values, e.g. ["৩৮", "৪০", "৪২", "৪৪"]
}

export interface ProductVariant {
  id: string;
  name: string;
  colorName?: string;
  price: number;
  oldPrice: number;
  image: string;
  images?: string[]; // Multiple product images for slider
  sizes: string[];
  colors?: string[]; // Optional color options list
  hasLong?: boolean;
  longSizes?: string[];
  customFields?: VariantOptionField[]; // Dynamic variant fields configured from admin
  inStock: boolean;
  colorCode?: string;
  category?: string;
  description?: string;
  isFeatured?: boolean;
}

export interface PageSmsTemplates {
  enabled: boolean;
  senderId?: string; // Optional custom sender ID for this landing page / brand
  orderReceived?: string;
  orderConfirmed?: string;
  courierDispatched?: string;
  delivered?: string;
}

export type PageType = 'landing' | 'ecommerce';

export interface DeliveryChargesConfig {
  insideDhaka: number;
  outsideDhaka: number;
  isFreeDelivery: boolean;
}

export interface GoogleSheetConfig {
  enabled: boolean;
  webhookUrl: string;
  sheetName?: string;
  autoSyncOnOrder?: boolean;
  lastSyncedAt?: string;
}

export interface LandingPage {
  id: string;
  slug: string;
  title: string;
  pageType?: PageType; // 'landing' (on-page) or 'ecommerce' (full store)
  brandName: string;
  brandTagline: string;
  topBannerText: string;
  showTopBanner: boolean;
  heroTitle: string;
  ratingStars: string;
  ratingCountText: string;
  mainImage: string;
  galleryImages: string[];
  features: string[];
  countdown: {
    enabled: boolean;
    hours: number;
    title: string;
  };
  callNumber: string;
  products: ProductVariant[];
  storeCategories?: string[]; // E-commerce store categories
  deliveryCharges: DeliveryChargesConfig;
  metaPixelEnabled?: boolean;
  facebookPixelId: string;
  metaCapiToken?: string;
  metaTestCode?: string;
  tiktokPixelEnabled?: boolean;
  tiktokPixelId?: string;
  tiktokCapiToken?: string;
  tiktokTestCode?: string;
  themeColor: string;
  isDefault?: boolean; // When true, this page is served as the main website home page
  googleSheetConfig?: GoogleSheetConfig;
  smsTemplates?: PageSmsTemplates; // Custom SMS per page
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  variantId: string;
  variantName: string;
  size: string;
  long?: string;
  customSelections?: Record<string, string>; // Dynamic field label -> selected value
  quantity: number;
  unitPrice: number;
  subtotal: number;
  image?: string;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'in_courier'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export interface CourierCustomerHistory {
  phone: string;
  totalParcels: number;
  totalDelivered: number;
  totalCancelled: number;
  totalFraudReports: number;
  deliveryRate: number; // 0-100 percentage
  score?: number;
  level?: 'safe' | 'caution' | 'risk' | 'new' | 'unknown';
  reasons?: string[];
  notice?: string;
  source: 'steadfast' | 'store' | 'mixed';
  checkedAt?: string;
  isLiveCourier?: boolean;
}

export interface CourierDetails {
  provider: 'steadfast' | 'pathao' | 'none';
  consignmentId?: string;
  trackingCode?: string;
  status?: string;
  sentAt?: string;
  deliveryFee?: number;
  note?: string;
}

export interface SmsLogItem {
  id: string;
  sentAt: string;
  phone: string;
  message: string;
  status: 'sent' | 'failed';
  gatewayResponse?: string;
}

export interface Order {
  id: string;
  isDemo?: boolean;
  landingPageId: string;
  landingPageTitle: string;
  landingPageSlug: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: OrderItem[];
  deliveryLocation: 'inside_dhaka' | 'outside_dhaka';
  deliveryCharge: number;
  subtotal: number;
  grandTotal: number;
  status: OrderStatus;
  serialNumber?: number;
  courier?: CourierDetails;
  courierCustomerHistory?: CourierCustomerHistory;
  smsLogs?: SmsLogItem[];
  googleSheetSynced?: boolean;
  googleSheetSyncedAt?: string;
  createdAt: string;
  customerIp?: string;
  notes?: string;
}

export interface SteadfastConfig {
  apiKey: string;
  secretKey: string;
  baseUrl?: string;
  isEnabled: boolean;
  sandboxMode: boolean;
}

export interface PathaoConfig {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  storeId: string;
  isEnabled: boolean;
  sandboxMode: boolean;
}

export interface SmsGatewayConfig {
  provider: 'greenweb' | 'bulksmsbd' | 'mimsms' | 'custom_api';
  apiKey: string;
  senderId: string;
  apiUrl?: string;
  isEnabled: boolean;
  manualOnly?: boolean; // When true, all automatic SMS are turned off; admin triggers manually
  autoOrderReceived?: boolean; // Auto-send SMS when order is placed
  autoOrderConfirmed?: boolean; // Auto-send SMS when order is marked confirmed
  autoCourierDispatched?: boolean; // Auto-send SMS when parcel is sent to courier
  autoDelivered?: boolean; // Auto-send SMS when delivery is complete
  templates: {
    orderReceived: string;
    orderConfirmed: string;
    courierDispatched: string;
    delivered: string;
  };
}

export interface PixelEventLog {
  id: string;
  timestamp: string;
  eventName: string;
  pixelId: string;
  tiktokPixelId?: string;
  eventId?: string;
  pageTitle: string;
  channels?: ('facebook_pixel' | 'meta_capi' | 'tiktok_pixel' | 'tiktok_capi')[];
  capiStatus?: {
    meta?: { status: 'success' | 'failed' | 'simulated'; message?: string };
    tiktok?: { status: 'success' | 'failed' | 'simulated'; message?: string };
  };
  data: Record<string, unknown>;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'superadmin' | 'admin' | 'moderator';
  createdAt: string;
}

export type AdminTab =
  | 'overview'
  | 'dashboard'
  | 'orders'
  | 'incomplete_orders'
  | 'fraud_control'
  | 'pages'
  | 'courier'
  | 'sms'
  | 'pixel'
  | 'users';

export interface BlockedCustomer {
  id: string;
  phone: string;
  ip?: string;
  name?: string;
  reason: string;
  blockedAt: string;
  blockedBy: 'system' | 'admin';
  orderCountToday?: number;
}

export interface BlockedIpRecord {
  id: string;
  ip: string;
  associatedPhone?: string;
  name?: string;
  reason: string;
  blockedAt: string;
  blockedBy: 'system' | 'admin';
  orderCountToday?: number;
}

export interface FraudControlConfig {
  enableDailyLimit: boolean;
  maxOrdersPerDay: number;
  autoBlockOnExceed: boolean;
  enableIpBlocking?: boolean;
  blockDurationDays: number;
  blockedPhones: BlockedCustomer[];
  blockedIps?: BlockedIpRecord[];
}

export interface IncompleteOrderContactLog {
  timestamp: string;
  method: 'call' | 'sms' | 'whatsapp';
  note?: string;
}

export interface IncompleteOrder {
  id: string;
  isDemo?: boolean;
  landingPageId: string;
  landingPageTitle: string;
  landingPageSlug: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: OrderItem[];
  deliveryLocation?: 'inside_dhaka' | 'outside_dhaka';
  subtotal: number;
  deliveryCharge: number;
  grandTotal: number;
  step: 'details_entered' | 'address_entered' | 'abandoned';
  createdAt: string;
  updatedAt: string;
  status: 'uncontacted' | 'contacted' | 'recovered' | 'cancelled' | 'discarded';
  notes?: string;
  customerIp?: string;
  contactLogs?: IncompleteOrderContactLog[];
}

export interface AppSettings {
  steadfast: SteadfastConfig;
  pathao: PathaoConfig;
  smsGateway: SmsGatewayConfig;
  metaPixelEnabled?: boolean;
  globalPixelId: string;
  globalMetaCapiToken?: string;
  globalMetaTestCode?: string;
  tiktokPixelEnabled?: boolean;
  globalTiktokPixelId?: string;
  globalTiktokCapiToken?: string;
  globalTiktokTestCode?: string;
  enableServerSideTracking?: boolean;
  defaultLandingPageId?: string;
  fraudControl?: FraudControlConfig;
  isDemoDataRemoved?: boolean;
  demoClearedAt?: string;
}
