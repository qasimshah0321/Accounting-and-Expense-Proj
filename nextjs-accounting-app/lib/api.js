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

// ─── Sales Orders ────────────────────────────────────────────────────────────
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
