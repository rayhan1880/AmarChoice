import { Order } from '../types.ts';

export interface CustomerHistorySummary {
  phone: string;
  name: string;
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  activeOrders: number;
  totalDeliveredSpent: number;
  totalLifetimeValue: number;
  successRate: number; // 0 to 100
  trustLevel: 'new' | 'trusted' | 'neutral' | 'high_risk';
  lastKnownIp?: string;
  lastKnownAddress?: string;
  orders: Order[];
}

export const normalizePhoneNumber = (phone: string): string => {
  if (!phone) return '';
  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, '');
  // If starts with 880, take 01...
  if (cleaned.startsWith('880')) {
    cleaned = cleaned.substring(2);
  }
  return cleaned;
};

export const getCustomerHistory = (
  phone: string,
  allOrders: Order[],
  fallbackName = 'কাস্টমার'
): CustomerHistorySummary => {
  const normPhone = normalizePhoneNumber(phone);
  if (!normPhone) {
    return {
      phone: phone || '',
      name: fallbackName,
      totalOrders: 0,
      deliveredOrders: 0,
      cancelledOrders: 0,
      returnedOrders: 0,
      activeOrders: 0,
      totalDeliveredSpent: 0,
      totalLifetimeValue: 0,
      successRate: 0,
      trustLevel: 'new',
      orders: []
    };
  }

  const matchingOrders = allOrders
    .filter(o => normalizePhoneNumber(o.customerPhone) === normPhone)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalOrders = matchingOrders.length;
  const deliveredOrders = matchingOrders.filter(o => o.status === 'delivered').length;
  const cancelledOrders = matchingOrders.filter(o => o.status === 'cancelled').length;
  const returnedOrders = matchingOrders.filter(o => o.status === 'returned').length;
  const activeOrders = matchingOrders.filter(
    o => o.status === 'pending' || o.status === 'confirmed' || o.status === 'processing' || o.status === 'in_courier'
  ).length;

  const totalDeliveredSpent = matchingOrders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + (o.grandTotal || 0), 0);

  const totalLifetimeValue = matchingOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);

  // Success rate: percentage of resolved orders that were delivered
  const resolvedCount = deliveredOrders + cancelledOrders + returnedOrders;
  let successRate = 0;
  if (resolvedCount > 0) {
    successRate = Math.round((deliveredOrders / resolvedCount) * 100);
  } else if (totalOrders === 1) {
    successRate = 100; // optimistic for first-time order
  }

  // Trust level logic
  let trustLevel: 'new' | 'trusted' | 'neutral' | 'high_risk' = 'neutral';
  if (totalOrders <= 1) {
    trustLevel = 'new';
  } else if (cancelledOrders + returnedOrders > deliveredOrders && (cancelledOrders + returnedOrders) >= 2) {
    trustLevel = 'high_risk';
  } else if (deliveredOrders >= 1 && cancelledOrders === 0 && returnedOrders === 0) {
    trustLevel = 'trusted';
  } else if (successRate >= 70) {
    trustLevel = 'trusted';
  } else if (successRate <= 40) {
    trustLevel = 'high_risk';
  }

  const name = matchingOrders[0]?.customerName || fallbackName;
  const lastKnownIp = matchingOrders.find(o => o.customerIp)?.customerIp;
  const lastKnownAddress = matchingOrders.find(o => o.customerAddress)?.customerAddress;

  return {
    phone: normPhone,
    name,
    totalOrders,
    deliveredOrders,
    cancelledOrders,
    returnedOrders,
    activeOrders,
    totalDeliveredSpent,
    totalLifetimeValue,
    successRate,
    trustLevel,
    lastKnownIp,
    lastKnownAddress,
    orders: matchingOrders
  };
};
