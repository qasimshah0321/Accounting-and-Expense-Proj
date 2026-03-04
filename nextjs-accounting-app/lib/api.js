const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

const getToken = () => {
  if (typeof window !== 'undefined') return localStorage.getItem('auth_token')
  return null
}

const buildHeaders = () => {
  const token = getToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

const handle = async (res) => {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    // On 401, clear stale token and reload so the login screen appears
    if (res.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
      window.location.reload()
    }
    // Backend wraps errors as { error: { code, message, details } }
    const baseMsg = data.error?.message || data.message || `Request failed (${res.status})`
    const details = data.error?.details
    const msg = details?.length
      ? `${baseMsg}: ${details.map(d => d.message || JSON.stringify(d)).join('; ')}`
      : baseMsg
    throw new Error(msg)
  }
  return data
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export const login = (email, password) =>
  fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ email, password }),
  }).then(handle)

export const register = (companyName, username, email, password, firstName, lastName) =>
  fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({
      company_name: companyName,
      username,
      email,
      password,
      first_name: firstName,
      last_name: lastName,
    }),
  }).then(handle)

export const getMe = () =>
  fetch(`${API_BASE}/auth/me`, { headers: buildHeaders() }).then(handle)

// ─── Customers ───────────────────────────────────────────────────────────────
export const getCustomers = (search = '') =>
  fetch(`${API_BASE}/customers?limit=200${search ? `&search=${encodeURIComponent(search)}` : ''}`, {
    headers: buildHeaders(),
  }).then(handle)

export const createCustomer = (data) =>
  fetch(`${API_BASE}/customers`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  }).then(handle)

export const updateCustomer = (id, data) =>
  fetch(`${API_BASE}/customers/${id}`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  }).then(handle)

export const deleteCustomer = (id) =>
  fetch(`${API_BASE}/customers/${id}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  }).then(handle)

// ─── Vendors ─────────────────────────────────────────────────────────────────
export const getVendors = (search = '') =>
  fetch(`${API_BASE}/vendors?limit=200${search ? `&search=${encodeURIComponent(search)}` : ''}`, {
    headers: buildHeaders(),
  }).then(handle)

export const createVendor = (data) =>
  fetch(`${API_BASE}/vendors`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  }).then(handle)

export const updateVendor = (id, data) =>
  fetch(`${API_BASE}/vendors/${id}`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  }).then(handle)

export const deleteVendor = (id) =>
  fetch(`${API_BASE}/vendors/${id}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  }).then(handle)

// ─── Products ────────────────────────────────────────────────────────────────
export const getProducts = (search = '') =>
  fetch(`${API_BASE}/products?limit=200${search ? `&search=${encodeURIComponent(search)}` : ''}`, {
    headers: buildHeaders(),
  }).then(handle)

export const createProduct = (data) =>
  fetch(`${API_BASE}/products`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  }).then(handle)

export const updateProduct = (id, data) =>
  fetch(`${API_BASE}/products/${id}`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  }).then(handle)

export const deleteProduct = (id) =>
  fetch(`${API_BASE}/products/${id}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  }).then(handle)

// ─── Taxes ───────────────────────────────────────────────────────────────────
export const getTaxes = () =>
  fetch(`${API_BASE}/taxes`, { headers: buildHeaders() }).then(handle)

export const createTax = (data) =>
  fetch(`${API_BASE}/taxes`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  }).then(handle)

export const updateTax = (id, data) =>
  fetch(`${API_BASE}/taxes/${id}`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  }).then(handle)

export const deleteTax = (id) =>
  fetch(`${API_BASE}/taxes/${id}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  }).then(handle)

export const toggleTaxActive = (id) =>
  fetch(`${API_BASE}/taxes/${id}/toggle-active`, {
    method: 'PATCH',
    headers: buildHeaders(),
  }).then(handle)

export const setDefaultTax = (id) =>
  fetch(`${API_BASE}/taxes/${id}/set-default`, {
    method: 'PATCH',
    headers: buildHeaders(),
  }).then(handle)

// ─── Ship Via ────────────────────────────────────────────────────────────────
export const getShipVias = () =>
  fetch(`${API_BASE}/ship-via`, { headers: buildHeaders() }).then(handle)

export const createShipVia = (data) =>
  fetch(`${API_BASE}/ship-via`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  }).then(handle)

export const updateShipVia = (id, data) =>
  fetch(`${API_BASE}/ship-via/${id}`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  }).then(handle)

export const deleteShipVia = (id) =>
  fetch(`${API_BASE}/ship-via/${id}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  }).then(handle)

export const toggleShipViaActive = (id) =>
  fetch(`${API_BASE}/ship-via/${id}/toggle-active`, {
    method: 'PATCH',
    headers: buildHeaders(),
  }).then(handle)

// ─── Invoices ────────────────────────────────────────────────────────────────
export const getNextInvoiceNumber = () =>
  fetch(`${API_BASE}/invoices/next-number`, { headers: buildHeaders() }).then(handle)

export const getInvoices = () =>
  fetch(`${API_BASE}/invoices?limit=200`, { headers: buildHeaders() }).then(handle)

export const getInvoice = (id) =>
  fetch(`${API_BASE}/invoices/${id}`, { headers: buildHeaders() }).then(handle)

export const createInvoice = (data) =>
  fetch(`${API_BASE}/invoices`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  }).then(handle)

export const updateInvoice = (id, data) =>
  fetch(`${API_BASE}/invoices/${id}`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  }).then(handle)

export const deleteInvoice = (id) =>
  fetch(`${API_BASE}/invoices/${id}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  }).then(handle)

// ─── Purchase Orders ─────────────────────────────────────────────────────────
export const getNextPurchaseOrderNumber = () =>
  fetch(`${API_BASE}/purchase-orders/next-number`, { headers: buildHeaders() }).then(handle)

export const getPurchaseOrders = () =>
  fetch(`${API_BASE}/purchase-orders?limit=200`, { headers: buildHeaders() }).then(handle)

export const getPurchaseOrder = (id) =>
  fetch(`${API_BASE}/purchase-orders/${id}`, { headers: buildHeaders() }).then(handle)

export const createPurchaseOrder = (data) =>
  fetch(`${API_BASE}/purchase-orders`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  }).then(handle)

export const updatePurchaseOrder = (id, data) =>
  fetch(`${API_BASE}/purchase-orders/${id}`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  }).then(handle)

export const deletePurchaseOrder = (id) =>
  fetch(`${API_BASE}/purchase-orders/${id}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  }).then(handle)

// ─── Sales Orders ────────────────────────────────────────────────────────────
export const getNextSalesOrderNumber = () =>
  fetch(`${API_BASE}/sales-orders/next-number`, { headers: buildHeaders() }).then(handle)

export const getSalesOrders = () =>
  fetch(`${API_BASE}/sales-orders?limit=200`, { headers: buildHeaders() }).then(handle)

export const getSalesOrder = (id) =>
  fetch(`${API_BASE}/sales-orders/${id}`, { headers: buildHeaders() }).then(handle)

export const createSalesOrder = (data) =>
  fetch(`${API_BASE}/sales-orders`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  }).then(handle)

export const updateSalesOrder = (id, data) =>
  fetch(`${API_BASE}/sales-orders/${id}`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  }).then(handle)

export const deleteSalesOrder = (id) =>
  fetch(`${API_BASE}/sales-orders/${id}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  }).then(handle)

// ─── Estimates ───────────────────────────────────────────────────────────────
export const getNextEstimateNumber = () =>
  fetch(`${API_BASE}/estimates/next-number`, { headers: buildHeaders() }).then(handle)

export const getEstimates = () =>
  fetch(`${API_BASE}/estimates?limit=200`, { headers: buildHeaders() }).then(handle)

export const getEstimate = (id) =>
  fetch(`${API_BASE}/estimates/${id}`, { headers: buildHeaders() }).then(handle)

export const createEstimate = (data) =>
  fetch(`${API_BASE}/estimates`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  }).then(handle)

export const updateEstimate = (id, data) =>
  fetch(`${API_BASE}/estimates/${id}`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  }).then(handle)

export const deleteEstimate = (id) =>
  fetch(`${API_BASE}/estimates/${id}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  }).then(handle)

// ─── Delivery Notes ──────────────────────────────────────────────────────────
export const getNextDeliveryNoteNumber = () =>
  fetch(`${API_BASE}/delivery-notes/next-number`, { headers: buildHeaders() }).then(handle)

export const getDeliveryNotes = () =>
  fetch(`${API_BASE}/delivery-notes?limit=200`, { headers: buildHeaders() }).then(handle)

export const getDeliveryNote = (id) =>
  fetch(`${API_BASE}/delivery-notes/${id}`, { headers: buildHeaders() }).then(handle)

export const createDeliveryNote = (data) =>
  fetch(`${API_BASE}/delivery-notes`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  }).then(handle)

export const updateDeliveryNote = (id, data) =>
  fetch(`${API_BASE}/delivery-notes/${id}`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  }).then(handle)

export const deleteDeliveryNote = (id) =>
  fetch(`${API_BASE}/delivery-notes/${id}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  }).then(handle)

// ─── Bills ──────────────────────────────────────────────────────────────────
export const getBills = () =>
  fetch(`${API_BASE}/bills?limit=200`, { headers: buildHeaders() }).then(handle)

export const getBill = (id) =>
  fetch(`${API_BASE}/bills/${id}`, { headers: buildHeaders() }).then(handle)

export const getNextBillNumber = () =>
  fetch(`${API_BASE}/bills/next-number`, { headers: buildHeaders() }).then(handle)

export const createBill = (data) =>
  fetch(`${API_BASE}/bills`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  }).then(handle)

export const updateBill = (id, data) =>
  fetch(`${API_BASE}/bills/${id}`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  }).then(handle)

export const deleteBill = (id) =>
  fetch(`${API_BASE}/bills/${id}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  }).then(handle)

export const updateBillStatus = (id, status) =>
  fetch(`${API_BASE}/bills/${id}/status`, {
    method: 'PATCH',
    headers: buildHeaders(),
    body: JSON.stringify({ status }),
  }).then(handle)

export const recordBillPayment = (id, data) =>
  fetch(`${API_BASE}/bills/${id}/record-payment`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  }).then(handle)

export const getOverdueBills = () =>
  fetch(`${API_BASE}/bills/overdue`, { headers: buildHeaders() }).then(handle)

// ─── Expenses ───────────────────────────────────────────────────────────────
export const getExpenses = () =>
  fetch(`${API_BASE}/expenses?limit=200`, { headers: buildHeaders() }).then(handle)

export const getExpense = (id) =>
  fetch(`${API_BASE}/expenses/${id}`, { headers: buildHeaders() }).then(handle)

export const createExpense = (data) =>
  fetch(`${API_BASE}/expenses`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  }).then(handle)

export const updateExpense = (id, data) =>
  fetch(`${API_BASE}/expenses/${id}`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  }).then(handle)

export const deleteExpense = (id) =>
  fetch(`${API_BASE}/expenses/${id}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  }).then(handle)

export const approveExpense = (id) =>
  fetch(`${API_BASE}/expenses/${id}/approve`, {
    method: 'PATCH',
    headers: buildHeaders(),
  }).then(handle)

export const markExpensePaid = (id) =>
  fetch(`${API_BASE}/expenses/${id}/mark-paid`, {
    method: 'PATCH',
    headers: buildHeaders(),
  }).then(handle)

// ─── Customer Payments ──────────────────────────────────────────────────────
export const getCustomerPayments = () =>
  fetch(`${API_BASE}/customer-payments?limit=200`, { headers: buildHeaders() }).then(handle)

export const getCustomerPayment = (id) =>
  fetch(`${API_BASE}/customer-payments/${id}`, { headers: buildHeaders() }).then(handle)

export const createCustomerPayment = (data) =>
  fetch(`${API_BASE}/customer-payments`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  }).then(handle)

export const deleteCustomerPayment = (id) =>
  fetch(`${API_BASE}/customer-payments/${id}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  }).then(handle)

// ─── Vendor Payments ────────────────────────────────────────────────────────
export const getVendorPayments = () =>
  fetch(`${API_BASE}/vendor-payments?limit=200`, { headers: buildHeaders() }).then(handle)

export const getVendorPayment = (id) =>
  fetch(`${API_BASE}/vendor-payments/${id}`, { headers: buildHeaders() }).then(handle)

export const createVendorPayment = (data) =>
  fetch(`${API_BASE}/vendor-payments`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  }).then(handle)

export const deleteVendorPayment = (id) =>
  fetch(`${API_BASE}/vendor-payments/${id}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  }).then(handle)

// ─── Reports ────────────────────────────────────────────────────────────────
export const getReportsDashboard = () =>
  fetch(`${API_BASE}/reports/dashboard`, { headers: buildHeaders() }).then(handle)

export const getProfitLossReport = (startDate, endDate) =>
  fetch(`${API_BASE}/reports/profit-loss?date_from=${startDate}&date_to=${endDate}`, {
    headers: buildHeaders(),
  }).then(handle)

export const getSalesSummaryReport = (startDate, endDate) =>
  fetch(`${API_BASE}/reports/sales-summary?date_from=${startDate}&date_to=${endDate}`, {
    headers: buildHeaders(),
  }).then(handle)

export const getExpenseSummaryReport = (startDate, endDate) =>
  fetch(`${API_BASE}/reports/expense-summary?date_from=${startDate}&date_to=${endDate}`, {
    headers: buildHeaders(),
  }).then(handle)

export const getReceivablesAgingReport = () =>
  fetch(`${API_BASE}/reports/receivables-ageing`, { headers: buildHeaders() }).then(handle)

export const getPayablesAgingReport = () =>
  fetch(`${API_BASE}/reports/payables-ageing`, { headers: buildHeaders() }).then(handle)

export const getInventoryValuationReport = () =>
  fetch(`${API_BASE}/reports/inventory-valuation`, { headers: buildHeaders() }).then(handle)

// ─── Inventory ──────────────────────────────────────────────────────────────
export const getLowStock = () =>
  fetch(`${API_BASE}/inventory/low-stock`, { headers: buildHeaders() }).then(handle)

export const getStockByLocation = () =>
  fetch(`${API_BASE}/inventory/stock-by-location`, { headers: buildHeaders() }).then(handle)

export const adjustInventory = (data) =>
  fetch(`${API_BASE}/inventory/transactions/adjust`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  }).then(handle)

export const transferInventoryStock = (data) =>
  fetch(`${API_BASE}/inventory/transactions/transfer`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  }).then(handle)

export const getInventoryTransactions = (params = '') =>
  fetch(`${API_BASE}/inventory/transactions?limit=200${params ? `&${params}` : ''}`, { headers: buildHeaders() }).then(handle)

export const getInventoryLocations = () =>
  fetch(`${API_BASE}/inventory/locations`, { headers: buildHeaders() }).then(handle)

export const createInventoryLocation = (data) =>
  fetch(`${API_BASE}/inventory/locations`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  }).then(handle)

export const updateInventoryLocation = (id, data) =>
  fetch(`${API_BASE}/inventory/locations/${id}`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  }).then(handle)

export const deleteInventoryLocation = (id) =>
  fetch(`${API_BASE}/inventory/locations/${id}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  }).then(handle)

// ─── Outstanding Invoices/Bills for Payment Allocation ─────────────────────
export const getOutstandingInvoices = (customerId) =>
  fetch(`${API_BASE}/invoices?customer_id=${customerId}&payment_status=unpaid&limit=200`, {
    headers: buildHeaders(),
  }).then(handle)

export const getPartiallyPaidInvoices = (customerId) =>
  fetch(`${API_BASE}/invoices?customer_id=${customerId}&payment_status=partially_paid&limit=200`, {
    headers: buildHeaders(),
  }).then(handle)

export const getOutstandingBills = (vendorId) =>
  fetch(`${API_BASE}/bills?vendor_id=${vendorId}&payment_status=unpaid&limit=200`, {
    headers: buildHeaders(),
  }).then(handle)

export const getPartiallyPaidBills = (vendorId) =>
  fetch(`${API_BASE}/bills?vendor_id=${vendorId}&payment_status=partial&limit=200`, {
    headers: buildHeaders(),
  }).then(handle)

// ─── Accounting / GL ────────────────────────────────────────────────────────
export const getAccounts = (type = '') =>
  fetch(`${API_BASE}/accounting/accounts${type ? `?account_type=${type}` : ''}`, {
    headers: buildHeaders(),
  }).then(handle)

export const searchAccounts = (search) =>
  fetch(`${API_BASE}/accounting/accounts?search=${encodeURIComponent(search)}`, {
    headers: buildHeaders(),
  }).then(handle)

export const createAccount = (data) =>
  fetch(`${API_BASE}/accounting/accounts`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  }).then(handle)

export const updateAccount = (id, data) =>
  fetch(`${API_BASE}/accounting/accounts/${id}`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  }).then(handle)

export const deleteAccount = (id) =>
  fetch(`${API_BASE}/accounting/accounts/${id}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  }).then(handle)

export const getNextJENumber = () =>
  fetch(`${API_BASE}/accounting/journal-entries/next-number`, {
    headers: buildHeaders(),
  }).then(handle)

export const getJournalEntries = (params = '') =>
  fetch(`${API_BASE}/accounting/journal-entries?limit=200${params ? `&${params}` : ''}`, {
    headers: buildHeaders(),
  }).then(handle)

export const getJournalEntry = (id) =>
  fetch(`${API_BASE}/accounting/journal-entries/${id}`, {
    headers: buildHeaders(),
  }).then(handle)

export const createJournalEntry = (data) =>
  fetch(`${API_BASE}/accounting/journal-entries`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  }).then(handle)

export const reverseJournalEntry = (id) =>
  fetch(`${API_BASE}/accounting/journal-entries/${id}/reverse`, {
    method: 'POST',
    headers: buildHeaders(),
  }).then(handle)

export const getGeneralLedger = (accountId, startDate, endDate) =>
  fetch(`${API_BASE}/accounting/general-ledger?account_id=${accountId}&start_date=${startDate}&end_date=${endDate}`, {
    headers: buildHeaders(),
  }).then(handle)

export const getTrialBalance = (asOfDate) =>
  fetch(`${API_BASE}/accounting/trial-balance${asOfDate ? `?as_of_date=${asOfDate}` : ''}`, {
    headers: buildHeaders(),
  }).then(handle)

// ─── Banking ─────────────────────────────────────────────────────────────────
export const getBankAccounts = () =>
  fetch(`${API_BASE}/banking/bank-accounts`, { headers: buildHeaders() }).then(handle)

export const getBankAccount = (id) =>
  fetch(`${API_BASE}/banking/bank-accounts/${id}`, { headers: buildHeaders() }).then(handle)

export const createBankAccount = (data) =>
  fetch(`${API_BASE}/banking/bank-accounts`, {
    method: 'POST', headers: buildHeaders(), body: JSON.stringify(data),
  }).then(handle)

export const updateBankAccount = (id, data) =>
  fetch(`${API_BASE}/banking/bank-accounts/${id}`, {
    method: 'PUT', headers: buildHeaders(), body: JSON.stringify(data),
  }).then(handle)

export const deleteBankAccount = (id) =>
  fetch(`${API_BASE}/banking/bank-accounts/${id}`, {
    method: 'DELETE', headers: buildHeaders(),
  }).then(handle)

export const getBankTransactions = (accountId, params = '') =>
  fetch(`${API_BASE}/banking/bank-accounts/${accountId}/transactions${params ? `?${params}` : ''}`, {
    headers: buildHeaders(),
  }).then(handle)

export const createBankTransaction = (accountId, data) =>
  fetch(`${API_BASE}/banking/bank-accounts/${accountId}/transactions`, {
    method: 'POST', headers: buildHeaders(), body: JSON.stringify(data),
  }).then(handle)

export const updateBankTransaction = (accountId, txId, data) =>
  fetch(`${API_BASE}/banking/bank-accounts/${accountId}/transactions/${txId}`, {
    method: 'PUT', headers: buildHeaders(), body: JSON.stringify(data),
  }).then(handle)

export const deleteBankTransaction = (accountId, txId) =>
  fetch(`${API_BASE}/banking/bank-accounts/${accountId}/transactions/${txId}`, {
    method: 'DELETE', headers: buildHeaders(),
  }).then(handle)

export const getBankReconciliation = (accountId) =>
  fetch(`${API_BASE}/banking/bank-accounts/${accountId}/reconciliation`, {
    headers: buildHeaders(),
  }).then(handle)

export const startBankReconciliation = (accountId, data) =>
  fetch(`${API_BASE}/banking/bank-accounts/${accountId}/reconciliation/start`, {
    method: 'POST', headers: buildHeaders(), body: JSON.stringify(data),
  }).then(handle)

export const markTransactionReconciled = (accountId, recId, txId, reconcile = true) =>
  fetch(`${API_BASE}/banking/bank-accounts/${accountId}/reconciliation/${recId}/mark-reconciled/${txId}`, {
    method: 'POST', headers: buildHeaders(), body: JSON.stringify({ reconcile }),
  }).then(handle)

export const completeBankReconciliation = (accountId, recId) =>
  fetch(`${API_BASE}/banking/bank-accounts/${accountId}/reconciliation/${recId}/complete`, {
    method: 'POST', headers: buildHeaders(),
  }).then(handle)

export const getBankSummary = () =>
  fetch(`${API_BASE}/banking/bank-summary`, { headers: buildHeaders() }).then(handle)

// ─── Recurring Documents ────────────────────────────────────────────────────
export const getRecurringDocuments = () =>
  fetch(`${API_BASE}/recurring`, { headers: buildHeaders() }).then(handle)

export const createRecurringDocument = (data) =>
  fetch(`${API_BASE}/recurring`, { method: 'POST', headers: buildHeaders(), body: JSON.stringify(data) }).then(handle)

export const updateRecurringDocument = (id, data) =>
  fetch(`${API_BASE}/recurring/${id}`, { method: 'PUT', headers: buildHeaders(), body: JSON.stringify(data) }).then(handle)

export const deleteRecurringDocument = (id) =>
  fetch(`${API_BASE}/recurring/${id}`, { method: 'DELETE', headers: buildHeaders() }).then(handle)

export const generateRecurringDocument = (id) =>
  fetch(`${API_BASE}/recurring/${id}/generate`, { method: 'POST', headers: buildHeaders() }).then(handle)

// ─── Company Settings ───────────────────────────────────────────────────────
export const getCompanyProfile = () =>
  fetch(`${API_BASE}/company-profile`, { headers: buildHeaders() }).then(handle)

export const updateCompanyProfile = (data) =>
  fetch(`${API_BASE}/company-profile`, { method: 'PUT', headers: buildHeaders(), body: JSON.stringify(data) }).then(handle)

// ─── Helpers ─────────────────────────────────────────────────────────────────
export const paymentTermsToNumber = (terms) => {
  const map = { 'Net 15': 15, 'Net 30': 30, 'Net 60': 60, 'Due on Receipt': 0 }
  return map[terms] ?? 30
}

export const numberToPaymentTerms = (days) => {
  if (days === 0) return 'Due on Receipt'
  if (days === 15) return 'Net 15'
  if (days === 60) return 'Net 60'
  return 'Net 30'
}

export const productTypeToBackend = (type) => {
  const map = { 'Services': 'service', 'Inventory item': 'inventory', 'Non-Inventory': 'non-inventory' }
  return map[type] || 'service'
}

export const productTypeToFrontend = (type) => {
  const map = { 'service': 'Services', 'inventory': 'Inventory item', 'non-inventory': 'Non-Inventory' }
  return map[type] || 'Services'
}
