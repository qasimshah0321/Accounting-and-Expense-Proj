'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './Invoice.module.css'
import VendorPopup from './VendorPopup'
import TaxPopup from './TaxPopup'
import * as api from '../lib/api'

export default function PurchaseOrder({ isOpen, onClose, taxes, onTaxUpdate, onDirtyChange = () => {}, user, currencySymbol = '$' }) {
  const isCustomerRole = user?.role === 'customer'

  // ─── List state ───────────────────────────────────────────────────────────
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingOrder, setEditingOrder] = useState(null)

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
                <h2>{editingOrder ? `Edit Purchase Order ${editingOrder.purchase_order_no || ''}` : 'Create Purchase Order'}</h2>
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
                            onFocus={() => setShowVendorDropdown(true)}
                          />
                          {showVendorDropdown && (
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
                        <textarea className={styles.formControlStandard} placeholder="Address will populate automatically" value={vendorAddress} onChange={(e) => setVendorAddress(e.target.value)} rows="3" />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Ref. No.</label>
                        <input type="text" className={styles.formControlStandard} placeholder="REF-12345" value={refNumber} onChange={(e) => setRefNumber(e.target.value)} />
                      </div>
                    </div>

                    <div className={styles.invoiceDetailsColumn}>
                      <div className={styles.formGroup}>
                        <label>PO No.</label>
                        <input type="text" className={styles.formControlStandard} value={purchaseOrderNo || 'Auto-generated'} readOnly style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }} />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Date</label>
                        <input type="date" className={styles.formControlStandard} value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Expected Delivery</label>
                        <input type="date" className={styles.formControlStandard} value={expectedDeliveryDate} onChange={(e) => setExpectedDeliveryDate(e.target.value)} />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Due Date</label>
                        <input type="date" className={styles.formControlStandard} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
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
                                  onFocus={() => { handleFieldFocus(item.id); setActiveItemId(item.id); setActiveField('sku') }}
                                  onBlur={() => setTimeout(() => { setActiveItemId(null); setActiveField(null) }, 150)}
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
                                  onFocus={() => { handleFieldFocus(item.id); setActiveItemId(item.id); setActiveField('description') }}
                                  onBlur={() => setTimeout(() => { setActiveItemId(null); setActiveField(null) }, 150)}
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
                            <td><input type="number" className={styles.formControlTable} value={item.quantity} min="1" step="1" onChange={(e) => updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 0)} onFocus={() => handleFieldFocus(item.id)} /></td>
                            <td><input type="number" className={styles.formControlTable} value={item.rate} min="0" step="0.01" readOnly={isCustomerRole || viewMode} onChange={(e) => updateLineItem(item.id, 'rate', parseFloat(e.target.value) || 0)} onFocus={() => !(isCustomerRole || viewMode) && handleFieldFocus(item.id)} style={isCustomerRole || viewMode ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}} /></td>
                            <td className={styles.amountCell}>{currencySymbol}{item.amount.toFixed(2)}</td>
                            <td className={styles.actionCell}>
                              <button className={styles.btnRemove} onClick={() => removeLineItem(item.id)} disabled={lineItems.length === 1}>
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
                        <textarea className={styles.formControlStandard} rows="3" placeholder="Add any additional notes..." value={notes} onChange={(e) => setNotes(e.target.value)}></textarea>
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
                              <div className={styles.taxSelectButton} onClick={() => setShowTaxDropdown(true)}>
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
                <button className={styles.btnCancel} onClick={handleFormClose}>Cancel</button>
              </div>
              <div className={styles.footerRight}>
                <button className={styles.btnSecondary} onClick={handleSave} disabled={saving}>
                  <i className={saving ? 'fas fa-spinner fa-spin' : 'fas fa-save'}></i>
                  {saving ? 'Saving...' : editingOrder ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
          </div>

          <VendorPopup isOpen={isVendorPopupOpen} onClose={handleVendorPopupClose} onSave={handleVendorSave} />
          <TaxPopup isOpen={isTaxPopupOpen} onClose={handleTaxPopupClose} onSave={handleTaxSave} />
        </div>
      )}
    </>
  )
}
