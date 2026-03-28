'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './Invoice.module.css'
import VendorPopup from './VendorPopup'
import TaxPopup from './TaxPopup'
import * as api from '../lib/api'

export default function PurchaseOrder({ isOpen, onClose, taxes, onTaxUpdate, onDirtyChange = () => {}, user, currencySymbol = '$', companyProfile = null }) {
  const isCustomerRole = user?.role === 'customer'

  // ─── List state ───────────────────────────────────────────────────────────
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingOrder, setEditingOrder] = useState(null)
  const [viewMode, setViewMode] = useState(false)

  // ─── Form state ───────────────────────────────────────────────────────────
  const [purchaseOrderNo, setPurchaseOrderNo] = useState('')
  const [lineItems, setLineItems] = useState([
    { id: 1, sku: '', description: '', quantity: 1, rate: 0, amount: 0 }
  ])
  const [vendors, setVendors] = useState([])
  const [selectedVendor, setSelectedVendor] = useState('')
  const [selectedVendorId, setSelectedVendorId] = useState(null)
  const [vendorSearchText, setVendorSearchText] = useState('')
  const [showVendorDropdown, setShowVendorDropdown] = useState(false)
  const [isVendorPopupOpen, setIsVendorPopupOpen] = useState(false)
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0])
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [refNumber, setRefNumber] = useState('')
  const [vendorAddress, setVendorAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedTax, setSelectedTax] = useState(null)
  const [isTaxPopupOpen, setIsTaxPopupOpen] = useState(false)
  const [showTaxDropdown, setShowTaxDropdown] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [products, setProducts] = useState([])
  const [activeItemId, setActiveItemId] = useState(null)
  const [activeField, setActiveField] = useState(null)

  const autocompleteRef = useRef(null)
  const taxDropdownRef = useRef(null)

  // ─── Data loading ─────────────────────────────────────────────────────────
  const loadOrders = useCallback(async () => {
    setLoading(true)
    setListError('')
    try {
      const res = await api.getPurchaseOrders()
      setOrders(res.data?.purchase_orders || res.data || [])
    } catch (err) {
      setListError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadVendors = useCallback(async () => {
    try {
      const res = await api.getVendors()
      setVendors(res.data?.vendors || res.data || [])
    } catch {}
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadOrders()
      loadVendors()
      api.getProducts().then(res => setProducts(res.data?.products || res.products || [])).catch(() => {})
    }
  }, [isOpen, loadOrders, loadVendors])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        setShowVendorDropdown(false)
      }
    }
    if (showVendorDropdown) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showVendorDropdown])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (taxDropdownRef.current && !taxDropdownRef.current.contains(event.target)) {
        setShowTaxDropdown(false)
      }
    }
    if (showTaxDropdown) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showTaxDropdown])

  useEffect(() => {
    if (showForm && !editingOrder && taxes && taxes.length > 0 && !selectedTax) {
      const defaultTax = taxes.find(tax => tax.is_default)
      setSelectedTax(defaultTax || taxes[0])
    }
  }, [showForm, taxes])

  if (!isOpen) return null

  // ─── Form helpers ─────────────────────────────────────────────────────────
  const formatAddress = (address, city, state, postalCode, country) => {
    const parts = [address, city, state, postalCode, country].filter(p => p && p.trim() !== '')
    return parts.join(', ')
  }

  const resetForm = async () => {
    setLineItems([{ id: 1, sku: '', description: '', quantity: 1, rate: 0, amount: 0 }])
    setSelectedVendor('')
    setSelectedVendorId(null)
    setVendorSearchText('')
    setOrderDate(new Date().toISOString().split('T')[0])
    setExpectedDeliveryDate('')
    setDueDate('')
    setRefNumber('')
    setVendorAddress('')
    setNotes('')
    setSelectedTax(taxes.find(t => t.is_default) || taxes[0] || null)
    setError('')
    try {
      const res = await api.getNextPurchaseOrderNumber()
      setPurchaseOrderNo(res.data?.purchase_order_no || 'PO-001')
    } catch { setPurchaseOrderNo('PO-001') }
  }

  const populateForm = (order) => {
    setPurchaseOrderNo(order.purchase_order_no || '')
    setSelectedVendor(order.vendor_name || '')
    setSelectedVendorId(order.vendor_id)
    setVendorSearchText(order.vendor_name || '')
    setOrderDate(order.order_date ? order.order_date.split('T')[0] : new Date().toISOString().split('T')[0])
    setExpectedDeliveryDate(order.expected_delivery_date ? order.expected_delivery_date.split('T')[0] : '')
    setDueDate(order.due_date ? order.due_date.split('T')[0] : '')
    setRefNumber(order.reference_no || '')
    setVendorAddress(order.vendor_address || '')
    setNotes(order.notes || '')
    if (order.line_items && order.line_items.length > 0) {
      setLineItems(order.line_items.map((item, idx) => ({
        id: idx + 1,
        sku: item.sku || '',
        description: item.description || '',
        quantity: parseInt(item.ordered_qty) || 1,
        rate: parseFloat(item.rate) || 0,
        amount: (parseInt(item.ordered_qty) || 1) * (parseFloat(item.rate) || 0),
      })))
    } else {
      setLineItems([{ id: 1, sku: '', description: '', quantity: 1, rate: 0, amount: 0 }])
    }
    if (order.tax_id) {
      setSelectedTax(taxes.find(t => t.id === order.tax_id) || null)
    } else {
      setSelectedTax(null)
    }
    setError('')
  }

  // ─── List actions ─────────────────────────────────────────────────────────
  const handleNewOrder = async () => {
    await resetForm()
    setEditingOrder(null)
    onDirtyChange(false)
    setShowForm(true)
  }

  const handleEditOrder = async (order) => {
    setListError('')
    try {
      const res = await api.getPurchaseOrder(order.id)
      const full = res.data || res
      setEditingOrder(full)
      populateForm(full)
      onDirtyChange(false)
      setViewMode(false)
      setShowForm(true)
    } catch (err) {
      setListError('Failed to load purchase order: ' + err.message)
    }
  }

  const handleViewOrder = async (order) => {
    setListError('')
    try {
      const res = await api.getPurchaseOrder(order.id)
      const full = res.data || res
      setEditingOrder(full)
      populateForm(full)
      setViewMode(true)
      setShowForm(true)
    } catch (err) {
      setListError('Failed to load purchase order: ' + err.message)
    }
  }

  const handleDeleteOrder = async (id) => {
    if (!confirm('Are you sure you want to delete this purchase order?')) return
    setListError('')
    try {
      await api.deletePurchaseOrder(id)
      setOrders(prev => prev.filter(o => o.id !== id))
    } catch (err) {
      setListError('Delete failed: ' + err.message)
    }
  }

  const handleFormClose = () => {
    onDirtyChange(false)
    setShowForm(false)
    setEditingOrder(null)
    setViewMode(false)
  }

  const handleOrderStatus = async (id, newStatus) => {
    setListError('')
    try {
      await api.updatePurchaseOrderStatus(id, newStatus)
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o))
    } catch (err) {
      setListError('Status update failed: ' + err.message)
    }
  }

  // ─── Form event handlers ──────────────────────────────────────────────────
  const handleVendorInputChange = (e) => {
    const value = e.target.value
    setVendorSearchText(value)
    setShowVendorDropdown(true)
    if (value === '') {
      setSelectedVendor('')
      setSelectedVendorId(null)
    }
  }

  const handleVendorSelect = (vendorName) => {
    const vendor = vendors.find(v => v.name === vendorName)
    setSelectedVendor(vendorName)
    setSelectedVendorId(vendor?.id || null)
    setVendorSearchText(vendorName)
    setShowVendorDropdown(false)
    if (vendor) {
      setVendorAddress(formatAddress(vendor.address, vendor.city, vendor.state, vendor.postal_code, vendor.country))
    }
  }

  const handleAddNewVendor = () => { setIsVendorPopupOpen(true); setShowVendorDropdown(false) }

  const filteredVendors = vendors.filter(v =>
    (v.name || '').toLowerCase().includes(vendorSearchText.toLowerCase())
  )

  const handleVendorSave = (newVendor) => {
    setVendors(prev => [...prev, newVendor])
    setSelectedVendor(newVendor.name)
    setSelectedVendorId(newVendor.id)
    setVendorSearchText(newVendor.name)
    setIsVendorPopupOpen(false)
    setVendorAddress(formatAddress(newVendor.address, newVendor.city, newVendor.state, newVendor.postal_code, newVendor.country))
  }

  const handleVendorPopupClose = () => setIsVendorPopupOpen(false)

  const addLineItem = () => {
    const newId = lineItems.length > 0 ? Math.max(...lineItems.map(item => item.id)) + 1 : 1
    setLineItems([...lineItems, { id: newId, sku: '', description: '', quantity: 1, rate: 0, amount: 0 }])
  }

  const handleFieldFocus = (itemId) => {
    if (lineItems[lineItems.length - 1].id === itemId) addLineItem()
  }

  const removeLineItem = (id) => {
    if (lineItems.length > 1) setLineItems(lineItems.filter(item => item.id !== id))
  }

  const handleTaxSelect = (tax) => { setSelectedTax(tax); setShowTaxDropdown(false) }
  const handleAddNewTax = () => { setIsTaxPopupOpen(true); setShowTaxDropdown(false) }
  const handleTaxPopupClose = () => setIsTaxPopupOpen(false)
  const handleTaxSave = (newTax) => { onTaxUpdate([...taxes, newTax]); setSelectedTax(newTax); setIsTaxPopupOpen(false) }

  const updateLineItem = (id, field, value) => {
    onDirtyChange(true)
    setLineItems(lineItems.map(item => {
      if (item.id !== id) return item
      const updated = { ...item, [field]: value }
      if (field === 'quantity' || field === 'rate') {
        updated.amount = updated.quantity * updated.rate
      }
      return updated
    }))
  }

  const calculateSubtotal = () => lineItems.reduce((sum, item) => sum + item.amount, 0)
  const calculateTax = () => selectedTax ? calculateSubtotal() * Number(selectedTax.rate) / 100 : 0
  const calculateTotal = () => calculateSubtotal() + calculateTax()

  const getProductSuggestions = (itemId, field) => {
    const item = lineItems.find(i => i.id === itemId)
    if (!item || !products.length) return []
    const q = (field === 'sku' ? item.sku : item.description).toLowerCase()
    if (!q) return []
    return products.filter(p =>
      (p.sku || '').toLowerCase().includes(q) ||
      (p.name || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
    ).slice(0, 8)
  }

  const handleProductSelect = (product, itemId) => {
    const targetId = itemId ?? activeItemId
    const price = parseFloat(product.cost_price) || parseFloat(product.unit_cost) || 0
    setLineItems(prev => prev.map(item => {
      if (item.id !== targetId) return item
      const updated = {
        ...item,
        sku: product.sku || '',
        description: product.description || product.name || '',
        rate: price,
      }
      if ('amount' in updated) updated.amount = (updated.quantity || 1) * price - (updated.discount || 0)
      return updated
    }))
    onDirtyChange(true)
    setActiveItemId(null)
    setActiveField(null)
  }

  const handleSave = async () => {
    setError('')
    if (typeof window !== 'undefined' && !localStorage.getItem('auth_token')) {
      setError('Session expired. Please log in again.')
      setTimeout(() => window.location.reload(), 1200)
      return
    }
    if (!selectedVendorId) { setError('Please select a vendor'); return }
    const validItems = lineItems.filter(item => item.description.trim())
    if (validItems.length === 0) { setError('Add at least one line item with a description'); return }
    if (!orderDate) { setError('Order date is required'); return }
    setSaving(true)
    const taxRate = selectedTax ? Number(selectedTax.rate) || 0 : 0
    const payload = {
      vendor_id: selectedVendorId,
      order_date: orderDate,
      expected_delivery_date: expectedDeliveryDate || undefined,
      due_date: dueDate || undefined,
      reference_no: refNumber || undefined,
      tax_id: selectedTax?.id || null,
      tax_rate: taxRate,
      notes: notes || undefined,
      line_items: validItems.map(item => ({
        sku: item.sku || undefined,
        description: item.description,
        ordered_qty: Number(item.quantity) || 1,
        rate: Number(item.rate) || 0,
        tax_id: selectedTax?.id || null,
        tax_rate: taxRate,
        tax_amount: selectedTax ? Number((item.amount * taxRate / 100).toFixed(4)) : 0,
      })),
    }
    try {
      if (editingOrder) {
        await api.updatePurchaseOrder(editingOrder.id, payload)
      } else {
        await api.createPurchaseOrder(payload)
      }
      onDirtyChange(false)
      setShowForm(false)
      setEditingOrder(null)
      loadOrders()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ─── Print / PDF ──────────────────────────────────────────────────────────
  const handlePrint = () => {
    const co = companyProfile || {}
    const coName = co.name || 'My Company'
    const coAddress = [co.address, co.city, co.state, co.postal_code].filter(Boolean).join(', ')
    const coEmail = co.email || ''
    const coPhone = co.phone || ''
    const coWebsite = co.website || ''
    const coGst = co.tax_number || co.gst_number || ''

    const validItems = lineItems.filter(i => i.description?.trim())
    const subtotal = calculateSubtotal()
    const taxAmt = calculateTax()
    const total = calculateTotal()
    const taxLabel = selectedTax ? `${selectedTax.name} (${selectedTax.rate}%)` : 'Tax'

    const fmtMoney = (v) => `${currencySymbol}${(parseFloat(v) || 0).toFixed(2)}`
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-CA') : ''

    const itemRows = validItems.map(item => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.quantity}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">
          <strong>${item.description}</strong>
          ${item.sku ? `<br/><span style="font-size:11px;color:#6b7280;">SKU: ${item.sku}</span>` : ''}
        </td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right;">${fmtMoney(item.rate)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right;">${fmtMoney(item.amount)}</td>
      </tr>`).join('')

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Purchase Order ${purchaseOrderNo}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; background: #fff; padding: 30px; }
    .page { max-width: 780px; margin: 0 auto; }
    .doc-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .logo-area { display: flex; align-items: center; gap: 10px; }
    .logo-icon { width: 38px; height: 38px; border-radius: 50%; background: #2CA01C; display: flex; align-items: center; justify-content: center; }
    .logo-icon svg { width: 20px; height: 20px; }
    .company-name-logo { font-size: 20px; font-weight: 800; color: #1a1a1a; }
    .doc-title { font-size: 28px; font-weight: 700; color: #1a1a1a; }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #2CA01C; }
    .company-info p { margin-bottom: 3px; font-size: 12.5px; line-height: 1.5; }
    .company-info strong { font-size: 14px; }
    .doc-meta { text-align: right; }
    .doc-meta table { margin-left: auto; }
    .doc-meta td { padding: 2px 0 2px 16px; font-size: 12.5px; }
    .doc-meta td:first-child { color: #6b7280; }
    .doc-meta td:last-child { font-weight: 600; }
    .vendor-box { border: 1px solid #d1d5db; border-radius: 4px; padding: 12px 14px; margin-bottom: 20px; max-width: 320px; }
    .vendor-box h4 { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 6px; }
    .vendor-box p { font-size: 12.5px; line-height: 1.6; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .items-table thead tr { background: #2CA01C; color: white; }
    .items-table thead th { padding: 9px 10px; text-align: left; font-size: 12px; font-weight: 600; }
    .items-table thead th:not(:first-child):not(:nth-child(2)) { text-align: right; }
    .items-table tbody tr:nth-child(even) { background: #f9fafb; }
    .bottom-row { display: flex; gap: 24px; align-items: flex-start; }
    .notes-col { flex: 1; font-size: 12px; color: #374151; }
    .notes-col strong { display: block; color: #6b7280; text-transform: uppercase; letter-spacing: .5px; font-size: 11px; margin-bottom: 4px; }
    .totals-col { min-width: 240px; }
    .totals-table { width: 100%; border-collapse: collapse; }
    .totals-table td { padding: 5px 10px; font-size: 13px; }
    .totals-table td:last-child { text-align: right; font-weight: 600; }
    .totals-table .grand-row td { background: #2CA01C; color: white; font-size: 14px; font-weight: 700; padding: 8px 10px; }
    .signature-row { display: flex; gap: 40px; margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 16px; }
    .sig-field { flex: 1; }
    .sig-field .sig-line { border-bottom: 1px solid #374151; margin-bottom: 6px; height: 32px; }
    .sig-field span { font-size: 11px; color: #6b7280; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
<div class="page">
  <div class="doc-header">
    <div class="logo-area">
      <div class="logo-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3,17 8,12 12,15 17,8 21,11"/><polyline points="17,8 21,8 21,12"/>
        </svg>
      </div>
      <span class="company-name-logo">${coName}</span>
    </div>
    <div class="doc-title">Purchase Order</div>
  </div>
  <div class="meta-row">
    <div class="company-info">
      <p><strong>${coName}</strong></p>
      ${coAddress ? `<p>${coAddress}</p>` : ''}
      ${coEmail ? `<p>Email: ${coEmail}</p>` : ''}
      ${coPhone ? `<p>Phone: ${coPhone}</p>` : ''}
      ${coWebsite ? `<p>Website: ${coWebsite}</p>` : ''}
    </div>
    <div class="doc-meta">
      <table>
        <tr><td>Prepared by:</td><td>${user?.name || user?.email || ''}</td></tr>
        <tr><td>Date:</td><td>${fmtDate(orderDate)}</td></tr>
        <tr><td>Purchase Order #:</td><td>${purchaseOrderNo}</td></tr>
        ${dueDate ? `<tr><td>Expected By:</td><td>${fmtDate(dueDate)}</td></tr>` : ''}
        ${coGst ? `<tr><td>GST #:</td><td>${coGst}</td></tr>` : ''}
      </table>
    </div>
  </div>
  <div class="vendor-box">
    <h4>Vendor</h4>
    <p><strong>${selectedVendor}</strong></p>
    ${vendorAddress ? `<p>${vendorAddress.replace(/\n/g, '<br/>')}</p>` : ''}
  </div>
  <table class="items-table">
    <thead>
      <tr>
        <th style="width:70px;">Qty</th>
        <th>Product / Description</th>
        <th style="width:130px;">Unit Price</th>
        <th style="width:130px;">Amount</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>
  <div class="bottom-row">
    <div class="notes-col">${notes ? `<strong>Notes</strong>${notes}` : ''}</div>
    <div class="totals-col">
      <table class="totals-table">
        <tr><td>Subtotal:</td><td>${fmtMoney(subtotal)}</td></tr>
        ${taxAmt > 0 ? `<tr><td>${taxLabel}:</td><td>${fmtMoney(taxAmt)}</td></tr>` : ''}
        <tr class="grand-row"><td>Total:</td><td>${fmtMoney(total)}</td></tr>
      </table>
    </div>
  </div>
  <div class="signature-row">
    <div class="sig-field"><div class="sig-line"></div><span>Authorized Signature</span></div>
    <div class="sig-field"><div class="sig-line"></div><span>Name (print)</span></div>
    <div class="sig-field"><div class="sig-line"></div><span>Date</span></div>
  </div>
</div>
<script>window.onload = function(){ window.print(); }</script>
</body>
</html>`
    const win = window.open('', '_blank', 'width=900,height=700')
    win.document.write(html)
    win.document.close()
  }

  // ─── List display helpers ─────────────────────────────────────────────────
  const filteredOrders = orders.filter(o =>
    (o.purchase_order_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.vendor_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString()
  }

  const formatCurrency = (amount) => currencySymbol + (parseFloat(amount) || 0).toFixed(2)

  const getStatusClass = (status) => {
    switch (status) {
      case 'approved': return styles.statusSent
      case 'received': return styles.statusPaid
      case 'partially_received': return styles.statusOverdue
      case 'cancelled': return styles.statusCancelled
      default: return styles.statusDraft
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Purchase Order List View ──────────────────────────────────────── */}
      <div className={styles.invoiceListOverlay}>
        <div className={styles.invoiceListContainer}>

          <div className={styles.listHeader}>
            <div className={styles.listHeaderLeft}>
              <h2>Purchase Orders</h2>
            </div>
            <div className={styles.listHeaderRight}>
              <button className={styles.btnNewInvoice} onClick={handleNewOrder}>
                <i className="fas fa-plus"></i> New Purchase Order
              </button>
              <button className={styles.closeBtn} onClick={onClose}>
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>

          <div className={styles.searchSection}>
            <div className={styles.searchWrapper}>
              <i className="fas fa-search"></i>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search by PO # or vendor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className={styles.btnRefresh} onClick={loadOrders} title="Refresh">
              <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
            </button>
          </div>

          {listError && (
            <div className={styles.errorBanner}>
              <i className="fas fa-exclamation-circle"></i> {listError}
            </div>
          )}

          <div className={styles.invoiceGridContainer}>
            {loading ? (
              <div className={styles.loadingState}>
                <i className="fas fa-spinner fa-spin"></i>
                <p>Loading purchase orders...</p>
              </div>
            ) : filteredOrders.length > 0 ? (
              <table className={styles.invoiceTable}>
                <thead>
                  <tr>
                    <th>PO #</th>
                    <th>Vendor</th>
                    <th>Date</th>
                    <th>Expected Delivery</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((o) => (
                    <tr key={o.id}>
                      <td><strong>{o.purchase_order_no || '-'}</strong></td>
                      <td>{o.vendor_name || '-'}</td>
                      <td>{formatDate(o.order_date)}</td>
                      <td>{formatDate(o.expected_delivery_date)}</td>
                      <td>{formatCurrency(o.grand_total)}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${getStatusClass(o.status)}`}>
                          {o.status || 'draft'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actionButtons}>
                          {o.status !== 'draft' && (
                            <button title="View" onClick={() => handleViewOrder(o)}
                              style={{ fontSize: 11, padding: '2px 8px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                              <i className="fas fa-eye"></i>
                            </button>
                          )}
                          {o.status === 'draft' && (
                            <button title="Approve PO" onClick={() => handleOrderStatus(o.id, 'approved')} style={{ fontSize: 11, padding: '2px 8px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                              Approve
                            </button>
                          )}
                          {o.status === 'approved' && (
                            <button title="Mark as Received" onClick={() => handleOrderStatus(o.id, 'received')} style={{ fontSize: 11, padding: '2px 8px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                              Received
                            </button>
                          )}
                          {o.status === 'draft' && (
                            <button className={styles.btnEdit} title="Edit" onClick={() => handleEditOrder(o)}>
                              <i className="fas fa-edit"></i>
                            </button>
                          )}
                          {o.status === 'draft' && (
                            <button className={styles.btnDelete} title="Delete" onClick={() => handleDeleteOrder(o.id)}>
                              <i className="fas fa-trash"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.emptyState} style={{textAlign:'center',padding:'48px 20px'}}>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'8px'}}>
                  <i className="fas fa-shopping-bag" style={{fontSize:'48px',color:'#e2e8f0'}} />
                  <h3 style={{margin:'8px 0 4px',fontSize:'18px',fontWeight:600,color:'#4a5568'}}>No Purchase Orders Yet</h3>
                  <p style={{margin:0,color:'#a0aec0',fontSize:'14px'}}>{searchTerm ? 'Try adjusting your search' : 'Create your first purchase order to get started'}</p>
                  {!searchTerm && (
                    <button
                      style={{marginTop:'12px',background:'#2CA01C',color:'white',border:'none',padding:'9px 20px',borderRadius:'6px',cursor:'pointer',fontSize:'14px',fontWeight:500}}
                      onClick={handleNewOrder}
                    >
                      + New Purchase Order
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Purchase Order Form Popup ─────────────────────────────────────── */}
      {showForm && (
        <div className={styles.invoicePopupOverlay}>
          <div className={styles.invoicePopup}>

            <div className={styles.popupHeader}>
              <div className={styles.headerLeft}>
                <h2>{viewMode
                  ? `View Purchase Order ${editingOrder?.purchase_order_no || ''}`
                  : editingOrder
                    ? `Edit Purchase Order ${editingOrder.purchase_order_no || ''}`
                    : 'Create Purchase Order'}</h2>
              </div>
              <div className={styles.headerRight}>
                <button className={styles.closeBtn} onClick={handleFormClose}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>

            <div className={styles.popupContent}>
              <div className={styles.invoiceUpperSection}>
                <div className={styles.sectionCard}>
                  <div className={styles.invoiceHeaderRow}>
                    <div className={styles.customerSection}>
                      <div className={styles.formGroup}>
                        <label>Vendor</label>
                        <div className={styles.autocompleteWrapper} ref={autocompleteRef}>
                          <input
                            type="text"
                            className={styles.formControlStandard}
                            placeholder="Search or select vendor"
                            value={vendorSearchText}
                            onChange={handleVendorInputChange}
                            onFocus={() => !viewMode && setShowVendorDropdown(true)}
                            readOnly={viewMode}
                            style={viewMode ? { backgroundColor: '#f5f5f5', cursor: 'default' } : {}}
                          />
                          {!viewMode && showVendorDropdown && (
                            <div className={styles.autocompleteDropdown}>
                              <div className={styles.autocompleteOption + ' ' + styles.addNewOption} onClick={handleAddNewVendor}>
                                <i className="fas fa-plus"></i> Add New
                              </div>
                              {filteredVendors.length > 0 ? (
                                filteredVendors.map(vendor => (
                                  <div key={vendor.id} className={styles.autocompleteOption} onClick={() => handleVendorSelect(vendor.name)}>
                                    {vendor.name}
                                  </div>
                                ))
                              ) : (
                                vendorSearchText && (
                                  <div className={styles.autocompleteOption + ' ' + styles.noResults}>No vendors found</div>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className={styles.formGroup}>
                        <label>Vendor Address</label>
                        <textarea className={styles.formControlStandard} placeholder="Address will populate automatically" value={vendorAddress} onChange={(e) => setVendorAddress(e.target.value)} rows="3" readOnly={viewMode} />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Ref. No.</label>
                        <input type="text" className={styles.formControlStandard} placeholder="REF-12345" value={refNumber} onChange={(e) => setRefNumber(e.target.value)} readOnly={viewMode} />
                      </div>
                    </div>

                    <div className={styles.invoiceDetailsColumn}>
                      <div className={styles.formGroup}>
                        <label>PO No.</label>
                        <input type="text" className={styles.formControlStandard} value={purchaseOrderNo || 'Auto-generated'} readOnly style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }} />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Date</label>
                        <input type="date" className={styles.formControlStandard} value={orderDate} onChange={(e) => setOrderDate(e.target.value)} readOnly={viewMode} />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Expected Delivery</label>
                        <input type="date" className={styles.formControlStandard} value={expectedDeliveryDate} onChange={(e) => setExpectedDeliveryDate(e.target.value)} readOnly={viewMode} />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Due Date</label>
                        <input type="date" className={styles.formControlStandard} value={dueDate} onChange={(e) => setDueDate(e.target.value)} readOnly={viewMode} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.invoiceBottomSection}>
                <div className={styles.sectionCard}>
                  <div className={styles.sectionHeader}><h3>Items</h3></div>
                  <div className={styles.tableContainer}>
                    <table className={styles.itemsTable}>
                      <thead>
                        <tr>
                          <th className={styles.colSku}>SKU</th>
                          <th className={styles.colDescription}>Description</th>
                          <th className={styles.colQuantity}>Qty</th>
                          <th className={styles.colRate}>Rate</th>
                          <th className={styles.colAmount}>Amount</th>
                          <th className={styles.colAction}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map((item) => (
                          <tr key={item.id}>
                            <td>
                              <div style={{ position: 'relative' }}>
                                <input
                                  type="text"
                                  className={styles.formControlTable}
                                  placeholder="SKU"
                                  value={item.sku}
                                  onChange={(e) => updateLineItem(item.id, 'sku', e.target.value)}
                                  onFocus={() => { if (!viewMode) { handleFieldFocus(item.id); setActiveItemId(item.id); setActiveField('sku') } }}
                                  onBlur={() => setTimeout(() => { setActiveItemId(null); setActiveField(null) }, 150)}
                                  readOnly={viewMode}
                                />
                                {activeItemId === item.id && activeField === 'sku' &&
                                  getProductSuggestions(item.id, 'sku').length > 0 && (
                                    <div style={{
                                      position: 'absolute', top: '100%', left: 0, zIndex: 9999,
                                      background: '#fff', border: '1px solid #d1d5db', borderRadius: 6,
                                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: 280,
                                      maxHeight: 220, overflowY: 'auto'
                                    }}>
                                      {getProductSuggestions(item.id, 'sku').map(product => (
                                        <div
                                          key={product.id}
                                          onMouseDown={() => handleProductSelect(product, item.id)}
                                          style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
                                                   display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                          onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                                        >
                                          <div>
                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{product.name}</div>
                                            {product.sku && <div style={{ fontSize: 11, color: '#64748b' }}>SKU: {product.sku}</div>}
                                            {product.description && <div style={{ fontSize: 11, color: '#94a3b8' }}>{product.description.slice(0, 50)}</div>}
                                          </div>
                                          <div style={{ fontSize: 12, color: '#0ea5e9', fontWeight: 600, marginLeft: 8 }}>
                                            {currencySymbol}{parseFloat(product.cost_price || 0).toFixed(2)}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                )}
                              </div>
                            </td>
                            <td>
                              <div style={{ position: 'relative' }}>
                                <input
                                  type="text"
                                  className={styles.formControlTable}
                                  placeholder="Item description"
                                  value={item.description}
                                  onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                                  onFocus={() => { if (!viewMode) { handleFieldFocus(item.id); setActiveItemId(item.id); setActiveField('description') } }}
                                  onBlur={() => setTimeout(() => { setActiveItemId(null); setActiveField(null) }, 150)}
                                  readOnly={viewMode}
                                />
                                {activeItemId === item.id && activeField === 'description' &&
                                  getProductSuggestions(item.id, 'description').length > 0 && (
                                    <div style={{
                                      position: 'absolute', top: '100%', left: 0, zIndex: 9999,
                                      background: '#fff', border: '1px solid #d1d5db', borderRadius: 6,
                                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: 280,
                                      maxHeight: 220, overflowY: 'auto'
                                    }}>
                                      {getProductSuggestions(item.id, 'description').map(product => (
                                        <div
                                          key={product.id}
                                          onMouseDown={() => handleProductSelect(product, item.id)}
                                          style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
                                                   display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                          onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                                        >
                                          <div>
                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{product.name}</div>
                                            {product.sku && <div style={{ fontSize: 11, color: '#64748b' }}>SKU: {product.sku}</div>}
                                            {product.description && <div style={{ fontSize: 11, color: '#94a3b8' }}>{product.description.slice(0, 50)}</div>}
                                          </div>
                                          <div style={{ fontSize: 12, color: '#0ea5e9', fontWeight: 600, marginLeft: 8 }}>
                                            {currencySymbol}{parseFloat(product.cost_price || 0).toFixed(2)}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                )}
                              </div>
                            </td>
                            <td><input type="number" className={styles.formControlTable} value={item.quantity} min="1" step="1" onChange={(e) => updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 0)} onFocus={() => handleFieldFocus(item.id)} readOnly={viewMode} /></td>
                            <td><input type="number" className={styles.formControlTable} value={item.rate} min="0" step="0.01" readOnly={isCustomerRole || viewMode} onChange={(e) => updateLineItem(item.id, 'rate', parseFloat(e.target.value) || 0)} onFocus={() => !(isCustomerRole || viewMode) && handleFieldFocus(item.id)} style={isCustomerRole || viewMode ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}} /></td>
                            <td className={styles.amountCell}>{currencySymbol}{item.amount.toFixed(2)}</td>
                            <td className={styles.actionCell}>
                              <button className={styles.btnRemove} onClick={() => removeLineItem(item.id)} disabled={lineItems.length === 1 || viewMode}>
                                <i className="fas fa-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className={styles.bottomRow}>
                    <div className={styles.notesAttachmentsSection}>
                      <div className={styles.formGroup}>
                        <label>Notes</label>
                        <textarea className={styles.formControlStandard} rows="3" placeholder="Add any additional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} readOnly={viewMode}></textarea>
                      </div>
                      <div className={styles.formGroup}>
                        <label>Attachments</label>
                        <div className={styles.attachmentArea}>
                          <input type="file" id="poFileUpload" className={styles.fileInput} multiple />
                          <label htmlFor="poFileUpload" className={styles.fileUploadLabel}>
                            <i className="fas fa-cloud-upload-alt"></i>
                            <span>Click to upload or drag and drop</span>
                            <small>PDF, DOC, JPG, PNG (Max 10MB each)</small>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className={styles.totalsSection}>
                      <div className={styles.totalsGrid}>
                        <div className={styles.totalRow}>
                          <span className={styles.totalLabel}>Subtotal:</span>
                          <span className={styles.totalValue}>{currencySymbol}{calculateSubtotal().toFixed(2)}</span>
                        </div>
                        <div className={styles.totalRow}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className={styles.totalLabel}>Tax:</span>
                            <div className={styles.taxSelectWrapper} style={{ position: 'relative', width: '200px' }} ref={taxDropdownRef}>
                              <div className={styles.taxSelectButton} onClick={() => !viewMode && setShowTaxDropdown(true)}>
                                <span>{selectedTax ? `${selectedTax.name} (${selectedTax.rate}%)` : 'Select tax'}</span>
                                <i className="fas fa-chevron-down"></i>
                              </div>
                              {showTaxDropdown && (
                                <div className={styles.autocompleteDropdown}>
                                  <div className={styles.autocompleteOption + ' ' + styles.addNewOption} onClick={handleAddNewTax}>
                                    <i className="fas fa-plus"></i> Add New
                                  </div>
                                  {taxes.map((t) => (
                                    <div key={t.id} className={styles.autocompleteOption} onClick={() => handleTaxSelect(t)}>
                                      {t.name} ({t.rate}%)
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <span className={styles.totalValue}>{currencySymbol}{calculateTax().toFixed(2)}</span>
                        </div>
                        <div className={`${styles.totalRow} ${styles.grandTotal}`}>
                          <span className={styles.totalLabel}>Total:</span>
                          <span className={styles.totalValue}>{currencySymbol}{calculateTotal().toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.popupFooter}>
              <div className={styles.footerLeft}>
                {error && <span style={{ color: '#ef4444', fontSize: '14px' }}>{error}</span>}
                <button className={styles.btnCancel} onClick={handleFormClose}>{viewMode ? 'Close' : 'Cancel'}</button>
              </div>
              {!viewMode ? (
                <div className={styles.footerRight}>
                  {user?.role === 'admin' && (
                    <button
                      onClick={handlePrint}
                      style={{ marginRight: 8, padding: '8px 18px', background: '#6b7280', color: '#fff',
                               border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600,
                               display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      title="Print / Save as PDF"
                    >
                      <i className="fas fa-print"></i> Print
                    </button>
                  )}
                  <button className={styles.btnSecondary} onClick={handleSave} disabled={saving}>
                    <i className={saving ? 'fas fa-spinner fa-spin' : 'fas fa-save'}></i>
                    {saving ? 'Saving...' : editingOrder ? 'Update' : 'Save'}
                  </button>
                </div>
              ) : user?.role === 'admin' && (
                <div className={styles.footerRight}>
                  <button onClick={handlePrint} style={{ padding: '8px 18px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }} title="Print / Save as PDF">
                    <i className="fas fa-print"></i> Print
                  </button>
                </div>
              )}
            </div>
          </div>

          <VendorPopup isOpen={isVendorPopupOpen} onClose={handleVendorPopupClose} onSave={handleVendorSave} />
          <TaxPopup isOpen={isTaxPopupOpen} onClose={handleTaxPopupClose} onSave={handleTaxSave} />
        </div>
      )}
    </>
  )
}
