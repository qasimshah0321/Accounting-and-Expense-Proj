import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://candydada.com/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Unwrap response — backend always wraps as { data: {...}, message: '...' }
// Axios also wraps in .data, so response.data is the backend envelope
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const msg =
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      error.message ||
      'Network error';
    const status = error.response?.status;

    // If 401 we let the AuthContext handle it
    if (status === 401) {
      // Fire a global event so AuthContext can logout
      if (global.onAuthExpired) global.onAuthExpired();
    }

    return Promise.reject(new Error(msg));
  }
);

// ─── Auth ──────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
};

// ─── Customers ─────────────────────────────────────────────────────────────
export const customersAPI = {
  getAll: (search = '') =>
    api.get(`/customers?limit=200${search ? `&search=${encodeURIComponent(search)}` : ''}`),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
  getStatement: (id, startDate, endDate) =>
    api.get(`/customers/${id}/statement?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`),
};

// ─── Vendors ───────────────────────────────────────────────────────────────
export const vendorsAPI = {
  getAll: (search = '') =>
    api.get(`/vendors?limit=200${search ? `&search=${encodeURIComponent(search)}` : ''}`),
  getById: (id) => api.get(`/vendors/${id}`),
  create: (data) => api.post('/vendors', data),
  update: (id, data) => api.put(`/vendors/${id}`, data),
  delete: (id) => api.delete(`/vendors/${id}`),
  getStatement: (id, startDate, endDate) =>
    api.get(`/vendors/${id}/statement?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`),
};

// ─── Products ──────────────────────────────────────────────────────────────
export const productsAPI = {
  getAll: (search = '') =>
    api.get(`/products?limit=200${search ? `&search=${encodeURIComponent(search)}` : ''}`),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
};

// ─── Invoices ──────────────────────────────────────────────────────────────
export const invoicesAPI = {
  getAll: () => api.get('/invoices?limit=200'),
  getById: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post('/invoices', data),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  delete: (id) => api.delete(`/invoices/${id}`),
  getNextNumber: () => api.get('/invoices/next-number'),
  updateStatus: (id, status, reason) =>
    api.patch(`/invoices/${id}/status`, { status, ...(reason && { reason }) }),
};

// ─── Sales Orders ──────────────────────────────────────────────────────────
export const salesOrdersAPI = {
  getAll: () => api.get('/sales-orders?limit=200'),
  getById: (id) => api.get(`/sales-orders/${id}`),
  create: (data) => api.post('/sales-orders', data),
  update: (id, data) => api.put(`/sales-orders/${id}`, data),
  delete: (id) => api.delete(`/sales-orders/${id}`),
  getNextNumber: () => api.get('/sales-orders/next-number'),
  updateStatus: (id, status, reason) =>
    api.patch(`/sales-orders/${id}/status`, { status, reason }),
  getByCustomer: (customerId) =>
    api.get(`/sales-orders?customer_id=${customerId}&limit=200`),
};

// ─── Bills ─────────────────────────────────────────────────────────────────
export const billsAPI = {
  getAll: () => api.get('/bills?limit=200'),
  getById: (id) => api.get(`/bills/${id}`),
  create: (data) => api.post('/bills', data),
  update: (id, data) => api.put(`/bills/${id}`, data),
  delete: (id) => api.delete(`/bills/${id}`),
  getNextNumber: () => api.get('/bills/next-number'),
  updateStatus: (id, status) => api.patch(`/bills/${id}/status`, { status }),
};

// ─── Purchase Orders ───────────────────────────────────────────────────────
export const purchaseOrdersAPI = {
  getAll: () => api.get('/purchase-orders?limit=200'),
  getById: (id) => api.get(`/purchase-orders/${id}`),
  create: (data) => api.post('/purchase-orders', data),
  update: (id, data) => api.put(`/purchase-orders/${id}`, data),
  delete: (id) => api.delete(`/purchase-orders/${id}`),
  getNextNumber: () => api.get('/purchase-orders/next-number'),
  updateStatus: (id, status, reason) =>
    api.patch(`/purchase-orders/${id}/status`, { status, reason }),
  getGrnRequirement: () => api.get('/purchase-orders/grn-requirement'),
  convertToBill: (id, data) => api.post(`/purchase-orders/${id}/convert-to-bill`, data),
};

// ─── Estimates ─────────────────────────────────────────────────────────────
export const estimatesAPI = {
  getAll: () => api.get('/estimates?limit=200'),
  getById: (id) => api.get(`/estimates/${id}`),
  create: (data) => api.post('/estimates', data),
  update: (id, data) => api.put(`/estimates/${id}`, data),
  delete: (id) => api.delete(`/estimates/${id}`),
  getNextNumber: () => api.get('/estimates/next-number'),
  updateStatus: (id, status, reason) =>
    api.patch(`/estimates/${id}/status`, { status, ...(reason && { reason }) }),
};

// ─── Delivery Notes ────────────────────────────────────────────────────────
export const deliveryNotesAPI = {
  getAll: () => api.get('/delivery-notes?limit=200'),
  getById: (id) => api.get(`/delivery-notes/${id}`),
  create: (data) => api.post('/delivery-notes', data),
  update: (id, data) => api.put(`/delivery-notes/${id}`, data),
  delete: (id) => api.delete(`/delivery-notes/${id}`),
};

// ─── Expenses ──────────────────────────────────────────────────────────────
export const expensesAPI = {
  getAll: () => api.get('/expenses?limit=200'),
  getById: (id) => api.get(`/expenses/${id}`),
  create: (data) => api.post('/expenses', data),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  delete: (id) => api.delete(`/expenses/${id}`),
};

// ─── Customer Payments ─────────────────────────────────────────────────────
export const customerPaymentsAPI = {
  getAll: () => api.get('/customer-payments?limit=200'),
  getById: (id) => api.get(`/customer-payments/${id}`),
  create: (data) => api.post('/customer-payments', data),
  update: (id, data) => api.put(`/customer-payments/${id}`, data),
  delete: (id) => api.delete(`/customer-payments/${id}`),
};

// ─── Vendor Payments ───────────────────────────────────────────────────────
export const vendorPaymentsAPI = {
  getAll: () => api.get('/vendor-payments?limit=200'),
  getById: (id) => api.get(`/vendor-payments/${id}`),
  create: (data) => api.post('/vendor-payments', data),
  update: (id, data) => api.put(`/vendor-payments/${id}`, data),
  delete: (id) => api.delete(`/vendor-payments/${id}`),
};

// ─── Taxes ─────────────────────────────────────────────────────────────────
export const taxesAPI = {
  getAll: () => api.get('/taxes?limit=200'),
  getById: (id) => api.get(`/taxes/${id}`),
  create: (data) => api.post('/taxes', data),
  update: (id, data) => api.put(`/taxes/${id}`, data),
  delete: (id) => api.delete(`/taxes/${id}`),
  toggleActive: (id) => api.patch(`/taxes/${id}/toggle-active`),
  setDefault: (id) => api.patch(`/taxes/${id}/set-default`),
};

// ─── Ship Via ──────────────────────────────────────────────────────────────
export const shipViaAPI = {
  getAll: () => api.get('/ship-via?limit=200'),
  getById: (id) => api.get(`/ship-via/${id}`),
  create: (data) => api.post('/ship-via', data),
  update: (id, data) => api.put(`/ship-via/${id}`, data),
  delete: (id) => api.delete(`/ship-via/${id}`),
  toggleActive: (id) => api.patch(`/ship-via/${id}/toggle-active`),
};

// ─── Chart of Accounts ─────────────────────────────────────────────────────
export const chartOfAccountsAPI = {
  getAll: () => api.get('/chart-of-accounts?limit=500'),
  getById: (id) => api.get(`/chart-of-accounts/${id}`),
  create: (data) => api.post('/chart-of-accounts', data),
  update: (id, data) => api.put(`/chart-of-accounts/${id}`, data),
  delete: (id) => api.delete(`/chart-of-accounts/${id}`),
};

// ─── Journal Entries ───────────────────────────────────────────────────────
export const journalEntriesAPI = {
  getAll: () => api.get('/journal-entries?limit=200'),
  getById: (id) => api.get(`/journal-entries/${id}`),
  create: (data) => api.post('/journal-entries', data),
  update: (id, data) => api.put(`/journal-entries/${id}`, data),
  delete: (id) => api.delete(`/journal-entries/${id}`),
};

// ─── Bank Accounts ─────────────────────────────────────────────────────────
export const bankAccountsAPI = {
  getAll: () => api.get('/bank-accounts?limit=200'),
  getById: (id) => api.get(`/bank-accounts/${id}`),
  create: (data) => api.post('/bank-accounts', data),
  update: (id, data) => api.put(`/bank-accounts/${id}`, data),
  delete: (id) => api.delete(`/bank-accounts/${id}`),
};

// ─── Bank Transactions ─────────────────────────────────────────────────────
export const bankTransactionsAPI = {
  getAll: () => api.get('/bank-transactions?limit=200'),
  getById: (id) => api.get(`/bank-transactions/${id}`),
  create: (data) => api.post('/bank-transactions', data),
  update: (id, data) => api.put(`/bank-transactions/${id}`, data),
  delete: (id) => api.delete(`/bank-transactions/${id}`),
};

// ─── Notifications ────────────────────────────────────────────────────────
export const notificationsAPI = {
  getAll: (limit = 30) => api.get(`/notifications?limit=${limit}`),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

// ─── Expo Push ────────────────────────────────────────────────────────────
export const pushAPI = {
  registerExpoToken: (data) => api.post('/push/expo-subscribe', data),
};

// ─── Reports / Dashboard ──────────────────────────────────────────────────
export const reportsAPI = {
  getDashboard: () => api.get('/reports/dashboard'),
  getProfitLoss: (params = '') => api.get(`/reports/profit-loss${params ? `?${params}` : ''}`),
  getSalesSummary: (params = '') => api.get(`/reports/sales-summary${params ? `?${params}` : ''}`),
  getPurchasesSummary: (params = '') => api.get(`/reports/purchases-summary${params ? `?${params}` : ''}`),
  getReceivablesAging: (asOf) => api.get(`/reports/receivables-ageing${asOf ? `?as_of=${encodeURIComponent(asOf)}` : ''}`),
  getPayablesAging: (asOf) => api.get(`/reports/payables-ageing${asOf ? `?as_of=${encodeURIComponent(asOf)}` : ''}`),
};

// ─── Goods Received Notes (GRN) ──────────────────────────────────────────────
export const grnAPI = {
  getAll: () => api.get('/goods-received-notes?limit=200'),
  getById: (id) => api.get(`/goods-received-notes/${id}`),
  create: (data) => api.post('/goods-received-notes', data),
  update: (id, data) => api.put(`/goods-received-notes/${id}`, data),
  delete: (id) => api.delete(`/goods-received-notes/${id}`),
  getNextNumber: () => api.get('/goods-received-notes/next-number'),
  updateStatus: (id, status, reason) =>
    api.patch(`/goods-received-notes/${id}/status`, { status, ...(reason && { reason }) }),
  receiveGoods: (id, data) => api.post(`/goods-received-notes/${id}/receive`, data),
  convertToBill: (id, data) => api.post(`/goods-received-notes/${id}/convert-to-bill`, data),
};

// ─── Departments ─────────────────────────────────────────────────────────────
export const departmentsAPI = {
  getAll: () => api.get('/departments'),
  getById: (id) => api.get(`/departments/${id}`),
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.put(`/departments/${id}`, data),
  delete: (id) => api.delete(`/departments/${id}`),
};

// ─── Roles ───────────────────────────────────────────────────────────────────
export const rolesAPI = {
  getAll: () => api.get('/roles'),
  create: (data) => api.post('/roles', data),
  update: (id, data) => api.put(`/roles/${id}`, data),
  delete: (id) => api.delete(`/roles/${id}`),
};

// ─── Users ───────────────────────────────────────────────────────────────────
export const usersAPI = {
  getAll: () => api.get('/users?limit=200'),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  getPermissions: (id) => api.get(`/users/${id}/permissions`),
  updatePermissions: (id, updates) => api.put(`/users/${id}/permissions`, updates),
};

// ─── Company Settings ──────────────────────────────────────────────────────
export const companySettingsAPI = {
  get: () => api.get('/company-profile'),
  update: (data) => api.put('/company-profile', data),
};

// ─── FBR (Pakistan Federal Board of Revenue) ───────────────────────────────
export const fbrAPI = {
  getConfig: () => api.get('/fbr/config'),
  saveConfig: (data) => api.put('/fbr/config', data),
  testConnection: () => api.post('/fbr/test-connection'),
  submitInvoice: (invoiceId) => api.post(`/fbr/invoices/${invoiceId}/submit`),
  getInvoiceStatus: (invoiceId) => api.get(`/fbr/invoices/${invoiceId}/status`),
};

// ─── Helpers ───────────────────────────────────────────────────────────────
export const paymentTermsToNumber = (terms) => {
  const map = { 'Net 15': 15, 'Net 30': 30, 'Net 60': 60, 'Due on Receipt': 0 };
  return map[terms] ?? 30;
};

export const numberToPaymentTerms = (days) => {
  if (days === 0) return 'Due on Receipt';
  if (days === 15) return 'Net 15';
  if (days === 60) return 'Net 60';
  return 'Net 30';
};

// Computes a YYYY-MM-DD due date from a payment-terms label + a YYYY-MM-DD
// invoice/document date. Returns '' when the date isn't a valid, complete date
// (e.g. while the user is still typing it) so callers can safely call this on
// every keystroke without producing "Invalid Date" errors.
export const calculateDueDate = (terms, dateStr) => {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return '';
  const date = new Date(dateStr + 'T00:00:00');
  if (isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + paymentTermsToNumber(terms));
  return date.toISOString().slice(0, 10);
};

export const productTypeToBackend = (type) => {
  const map = { Services: 'service', 'Inventory item': 'inventory', 'Non-Inventory': 'non-inventory' };
  return map[type] || 'service';
};

export const productTypeToFrontend = (type) => {
  const map = { service: 'Services', inventory: 'Inventory item', 'non-inventory': 'Non-Inventory' };
  return map[type] || 'Services';
};

export default api;
