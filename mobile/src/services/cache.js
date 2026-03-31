// Simple in-memory cache with TTL — stale-while-revalidate pattern
// Persists across screen navigations within the same app session
const _store = {};

export const cache = {
  get(key) {
    const entry = _store[key];
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      delete _store[key];
      return null;
    }
    return entry.data;
  },
  set(key, data, ttlMs = 120_000) {
    _store[key] = { data, expiresAt: Date.now() + ttlMs };
  },
  invalidate(...keys) {
    keys.forEach(k => delete _store[k]);
  },
  clear() {
    Object.keys(_store).forEach(k => delete _store[k]);
  },
};

export const CACHE_KEYS = {
  DASHBOARD: 'dashboard',
  INVOICES: 'invoices',
  SALES_ORDERS: 'sales_orders',
  ESTIMATES: 'estimates',
  DELIVERY_NOTES: 'delivery_notes',
  BILLS: 'bills',
  PURCHASE_ORDERS: 'purchase_orders',
  EXPENSES: 'expenses',
  CUSTOMER_PAYMENTS: 'customer_payments',
  VENDOR_PAYMENTS: 'vendor_payments',
  CUSTOMERS: 'customers',
  VENDORS: 'vendors',
  PRODUCTS: 'products',
  TAXES: 'taxes',
  SHIP_VIA: 'ship_via',
};

export const TTL = {
  SHORT: 60_000,    // 1 min — transactional lists
  MEDIUM: 120_000,  // 2 min — dashboard
  LONG: 300_000,    // 5 min — reference data (products, taxes, ship-via)
};
