'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './Invoice.module.css'
import VendorPopup from './VendorPopup'
import TaxPopup from './TaxPopup'
import * as api from '../lib/api'

export default function BillCenter({ isOpen, onClose, taxes, onTaxUpdate, onDirtyChange = () => {}, currencySymbol = '$' }) {
  // ─── List state ───────────────────────────────────────────────────────────
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingBill, setEditingBill] = useState(null)

  // ─── Form state ───────────────────────────────────────────────────────────
  const [lineItems, setLineItems] = useState([
    { id: 1, description: '', quantity: 1, rate: 0, amount: 0 }
  ])
  const [vendors, setVendors] = useState([])
  const [selectedVendor, setSelectedVendor] = useState('')
  const [selectedVendorId, setSelectedVendorId] = useState(null)
  const [vendorSearchText, setVendorSearchText] = useState('')
  const [showVendorDropdown, setShowVendorDropdown] = useState(false)
  const [isVendorPopupOpen, setIsVendorPopupOpen] = useState(false)
  const [billNo, setBillNo] = useState('')
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [vendorInvoiceNo, setVendorInvoiceNo] = useState('')
  const [referenceNo, setReferenceNo] = useState('')
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
  const loadBills = useCallback(async () => {
    setLoading(true)
    setListError('')
    try {
      const res = await api.getBills()
      setBills(res.data?.bills || res.bills || res.data || [])
    } catch (err) {
      setListError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadVendors = useCallback(async () => {
    try {
      const res = await api.getVendors()
      setVendors(res.data?.vendors || res.vendors || [])
    } catch {}
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadBills()
      loadVendors()
      api.getProducts().then(res => setProducts(res.data?.products || res.products || [])).catch(() => {})
    }
  }, [isOpen, loadBills, loadVendors])

  // ─── Auto-calculate due date ────────────────────────────────────────────
  useEffect(() => {
    if (!editingBill && billDate) {
      const date = new Date(billDate)
      date.setDate(date.getDate() + 30)
      setDueDate(date.toISOString().split('T')[0])
    }
  }, [billDate, editingBill])

  // ─── Click-outside handlers ───────────────────────────────────────────────
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

  // ─── Set default tax when opening new bill form ────────────────────────
  useEffect(() => {
    if (showForm && !editingBill && taxes && taxes.length > 0 && !selectedTax) {
      const defaultTax = taxes.find(tax => tax.is_default)
      setSelectedTax(defaultTax || taxes[0])
    }
  }, [showForm, taxes])

  if (!isOpen) return null

  // ─── Form helpers ─────────────────────────────────────────────────────────
  const resetForm = () => {
    setLineItems([{ id: 1, description: '', quantity: 1, rate: 0, amount: 0 }])
    setSelectedVendor('')
    setSelectedVendorId(null)
    setVendorSearchText('')
    setBillNo('')
    setBillDate(new Date().toISOString().split('T')[0])
    setDueDate('')
    setVendorInvoiceNo('')
    setReferenceNo('')
    setNotes('')
    setSelectedTax(taxes.find(t => t.is_default) || taxes[0] || null)
    setError('')
  }

  const populateForm = (bill) => {
    setBillNo(bill.bill_no || '')
    setSelectedVendor(bill.vendor_name || '')
    setSelectedVendorId(bill.vendor_id)
    setVendorSearchText(bill.vendor_name || '')
    setBillDate(bill.bill_date ? bill.bill_date.split('T')[0] : new Date().toISOString().split('T')[0])
    setDueDate(bill.due_date ? bill.due_date.split('T')[0] : '')
    setVendorInvoiceNo(bill.vendor_invoice_no || '')
    setReferenceNo(bill.reference_no || '')
    setNotes(bill.notes || '')
    if (bill.line_items && bill.line_items.length > 0) {
      setLineItems(bill.line_items.map((item, idx) => ({
        id: idx + 1,
        description: item.description || '',
        quantity: parseFloat(item.quantity) || 1,
        rate: parseFloat(item.rate) || 0,
        amount: (parseFloat(item.quantity) || 1) * (parseFloat(item.rate) || 0),
      })))
    } else {
      setLineItems([{ id: 1, description: '', quantity: 1, rate: 0, amount: 0 }])
    }
    if (bill.tax_id) {
      const tax = taxes.find(t => t.id === bill.tax_id)
      setSelectedTax(tax || null)
    } else {
      setSelectedTax(null)
    }
    setError('')
  }

  // ─── List actions ─────────────────────────────────────────────────────────
  const handleNewBill = () => {
    resetForm()
    setEditingBill(null)
    onDirtyChange(false)
    setShowForm(true)
  }

  const handleEditBill = async (bill) => {
    setListError('')
    try {
      const res = await api.getBill(bill.id)
      const full = res.data || res
      setEditingBill(full)
      populateForm(full)
      onDirtyChange(false)
      setShowForm(true)
    } catch (err) {
      setListError('Failed to load bill: ' + err.message)
    }
  }

  const handleDeleteBill = async (id) => {
    if (!confirm('Are you sure you want to delete this bill?')) return
    setListError('')
    try {
      await api.deleteBill(id)
      setBills(prev => prev.filter(b => b.id !== id))
    } catch (err) {
      setListError('Delete failed: ' + err.message)
    }
  }

  const handleFormClose = () => {
    onDirtyChange(false)
    setShowForm(false)
    setEditingBill(null)
  }

  // ─── Vendor autocomplete handlers ──────────────────────────────────────
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
  }

  const handleAddNewVendor = () => {
    setIsVendorPopupOpen(true)
    setShowVendorDropdown(false)
  }

  const filteredVendors = vendors.filter(v =>
    (v.name || '').toLowerCase().includes(vendorSearchText.toLowerCase())
  )

  const handleVendorSave = (newVendor) => {
    setVendors(prev => [...prev, newVendor])
    setSelectedVendor(newVendor.name)
    setSelectedVendorId(newVendor.id)
    setVendorSearchText(newVendor.name)
    setIsVendorPopupOpen(false)
  }

  // ─── Tax handlers ─────────────────────────────────────────────────────────
  const handleTaxSelect = (tax) => {
    setSelectedTax(tax)
    setShowTaxDropdown(false)
  }

  const handleAddNewTax = () => {
    setIsTaxPopupOpen(true)
    setShowTaxDropdown(false)
  }

  const handleTaxSave = (newTax) => {
    onTaxUpdate([...taxes, newTax])
    setSelectedTax(newTax)
    setIsTaxPopupOpen(false)
  }

  // ─── Line items ─────────────────────────────────────────────────────────
  const addLineItem = () => {
    const newId = lineItems.length > 0 ? Math.max(...lineItems.map(item => item.id)) + 1 : 1
    setLineItems([...lineItems, { id: newId, description: '', quantity: 1, rate: 0, amount: 0 }])
  }

  const handleFieldFocus = (itemId) => {
    if (lineItems[lineItems.length - 1].id === itemId) addLineItem()
  }

  const removeLineItem = (id) => {
    if (lineItems.length > 1) setLineItems(lineItems.filter(item => item.id !== id))
  }

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

  // ─── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setError('')
    if (!selectedVendorId) { setError('Please select a vendor'); return }
    const validItems = lineItems.filter(item => item.description.trim())
    if (validItems.length === 0) { setError('Add at least one line item with a description'); return }
    if (!billDate) { setError('Bill date is required'); return }
    if (!dueDate) { setError('Due date is required'); return }
    setSaving(true)
    const taxRate = selectedTax ? Number(selectedTax.rate) || 0 : 0
    const payload = {
      vendor_id: selectedVendorId,
      bill_date: billDate,
      due_date: dueDate,
      vendor_invoice_no: vendorInvoiceNo || undefined,
      reference_no: referenceNo || undefined,
      tax_id: selectedTax?.id || null,
      tax_rate: taxRate,
      notes: notes || undefined,
      line_items: validItems.map(item => ({
        description: item.description,
        quantity: Number(item.quantity) || 1,
        rate: Number(item.rate) || 0,
        tax_id: selectedTax?.id || null,
        tax_rate: taxRate,
        tax_amount: selectedTax ? Number((item.amount * taxRate / 100).toFixed(4)) : 0,
      })),
    }
    try {
      if (editingBill) {
        await api.updateBill(editingBill.id, payload)
      } else {
        await api.createBill(payload)
      }
      onDirtyChange(false)
      setShowForm(false)
      setEditingBill(null)
      loadBills()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ─── List display helpers ─────────────────────────────────────────────────
  const filteredBills = bills.filter(b =>
    (b.bill_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.vendor_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString()
  }

  const formatCurrency = (amount) => currencySymbol + (parseFloat(amount) || 0).toFixed(2)

  const getStatusClass = (status) => {
    switch (status) {
      case 'paid': return styles.statusPaid
      case 'received': case 'approved': return styles.statusSent
      case 'overdue': return styles.statusOverdue
      case 'cancelled': return styles.statusCancelled
      default: return styles.statusDraft
    }
  }

  const getPaymentStatusClass = (status) => {
    switch (status) {
      case 'paid': return styles.statusPaid
      case 'partial': case 'partially_paid': return styles.statusSent
      default: return styles.statusOverdue
    }
  }

  // ─── Product autocomplete ────────────────────────────────────────────────
  const getProductSuggestions = (itemId, field) => {
    const item = lineItems.find(i => i.id === itemId)
    if (!item || !products.length) return []
    const q = (field === 'sku' ? (item.sku || '') : item.description).toLowerCase()
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

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Bill List View ─────────────────────────────────────────────── */}
      <div className={styles.invoiceListOverlay}>
        <div className={styles.invoiceListContainer}>

          {/* Header */}
          <div className={styles.listHeader}>
            <div className={styles.listHeaderLeft}>
              <h2>Bills</h2>
            </div>
            <div className={styles.listHeaderRight}>
              <button className={styles.btnNewInvoice} onClick={handleNewBill}>
                <i className="fas fa-plus"></i> New Bill
              </button>
              <button className={styles.closeBtn} onClick={onClose}>
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className={styles.searchSection}>
            <div className={styles.searchWrapper}>
              <i className="fas fa-search"></i>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search by bill # or vendor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className={styles.btnRefresh} onClick={loadBills} title="Refresh">
              <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
            </button>
          </div>

          {listError && (
            <div className={styles.errorBanner}>
              <i className="fas fa-exclamation-circle"></i> {listError}
            </div>
          )}

          {/* Bill Table */}
          <div className={styles.invoiceGridContainer}>
            {loading ? (
              <div className={styles.loadingState}>
                <i className="fas fa-spinner fa-spin"></i>
                <p>Loading bills...</p>
              </div>
            ) : filteredBills.length > 0 ? (
              <table className={styles.invoiceTable}>
                <thead>
                  <tr>
                    <th>Bill #</th>
                    <th>Vendor</th>
                    <th>Bill Date</th>
                    <th>Due Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBills.map((bill) => (
                    <tr key={bill.id}>
                      <td><strong>{bill.bill_no || '-'}</strong></td>
                      <td>{bill.vendor_name || '-'}</td>
                      <td>{formatDate(bill.bill_date)}</td>
                      <td>{formatDate(bill.due_date)}</td>
                      <td>{formatCurrency(bill.total_amount)}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${getStatusClass(bill.status)}`}>
                          {bill.status || 'draft'}
                        </span>
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${getPaymentStatusClass(bill.payment_status)}`}>
                          {bill.payment_status || 'unpaid'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actionButtons}>
                          <button className={styles.btnEdit} title="Edit" onClick={() => handleEditBill(bill)}>
                            <i className="fas fa-edit"></i>
                          </button>
                          <button className={styles.btnDelete} title="Delete" onClick={() => handleDeleteBill(bill.id)}>
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.emptyState}>
                <i className="fas fa-file-invoice-dollar"></i>
                <h3>No bills found</h3>
                <p>{searchTerm ? 'Try adjusting your search' : 'Click "New Bill" to create your first bill'}</p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Bill Form Popup ────────────────────────────────────────────── */}
      {showForm && (
        <div className={styles.invoicePopupOverlay}>
          <div className={styles.invoicePopup}>

            {/* Header */}
            <div className={styles.popupHeader}>
              <div className={styles.headerLeft}>
                <h2>{editingBill ? `Edit Bill ${editingBill.bill_no || ''}` : 'Create Bill'}</h2>
              </div>
              <div className={styles.headerRight}>
                <button className={styles.closeBtn} onClick={handleFormClose}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className={styles.popupContent}>

              {/* Upper Section */}
              <div className={styles.invoiceUpperSection}>
                <div className={styles.sectionCard}>
                  <div className={styles.invoiceHeaderRow}>
                    {/* Left Side - Vendor */}
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
                              <div
                                className={styles.autocompleteOption + ' ' + styles.addNewOption}
                                onClick={handleAddNewVendor}
                              >
                                <i className="fas fa-plus"></i> Add New
                              </div>
                              {filteredVendors.length > 0 ? (
                                filteredVendors.map(vendor => (
                                  <div
                                    key={vendor.id}
                                    className={styles.autocompleteOption}
                                    onClick={() => handleVendorSelect(vendor.name)}
                                  >
                                    {vendor.name}
                                  </div>
                                ))
                              ) : (
                                vendorSearchText && (
                                  <div className={styles.autocompleteOption + ' ' + styles.noResults}>
                                    No vendors found
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className={styles.formGroup}>
                        <label>Vendor Invoice No.</label>
                        <input
                          type="text"
                          className={styles.formControlStandard}
                          placeholder="Vendor's invoice number"
                          value={vendorInvoiceNo}
                          onChange={(e) => setVendorInvoiceNo(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Right Side - Bill Details */}
                    <div className={styles.invoiceDetailsColumn}>
                      <div className={styles.formGroup}>
                        <label>Bill Number</label>
                        <input
                          type="text"
                          className={styles.formControlStandard}
                          value={billNo}
                          placeholder="Auto-generated"
                          onChange={(e) => setBillNo(e.target.value)}
                          readOnly={!!editingBill}
                          style={editingBill ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Bill Date</label>
                        <input
                          type="date"
                          className={styles.formControlStandard}
                          value={billDate}
                          onChange={(e) => setBillDate(e.target.value)}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Due Date</label>
                        <input
                          type="date"
                          className={styles.formControlStandard}
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Reference Number</label>
                        <input
                          type="text"
                          className={styles.formControlStandard}
                          placeholder="PO-12345"
                          value={referenceNo}
                          onChange={(e) => setReferenceNo(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Section - Line Items */}
              <div className={styles.invoiceBottomSection}>
                <div className={styles.sectionCard}>
                  <div className={styles.sectionHeader}>
                    <h3>Items</h3>
                  </div>

                  <div className={styles.tableContainer}>
                    <table className={styles.itemsTable}>
                      <thead>
                        <tr>
                          <th className={styles.colDescription}>Description</th>
                          <th className={styles.colQuantity}>Quantity</th>
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
                            <td>
                              <input
                                type="number"
                                className={styles.formControlTable}
                                value={item.quantity}
                                min="1"
                                onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                onFocus={() => handleFieldFocus(item.id)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                className={styles.formControlTable}
                                value={item.rate}
                                min="0"
                                step="0.01"
                                onChange={(e) => updateLineItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                                onFocus={() => handleFieldFocus(item.id)}
                              />
                            </td>
                            <td className={styles.amountCell}>
                              {currencySymbol}{item.amount.toFixed(2)}
                            </td>
                            <td className={styles.actionCell}>
                              <button
                                className={styles.btnRemove}
                                onClick={() => removeLineItem(item.id)}
                                disabled={lineItems.length === 1}
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Bottom Row - Notes and Totals */}
                  <div className={styles.bottomRow}>
                    {/* Left - Notes */}
                    <div className={styles.notesAttachmentsSection}>
                      <div className={styles.formGroup}>
                        <label>Notes</label>
                        <textarea
                          className={styles.formControlStandard}
                          rows="3"
                          placeholder="Add any additional notes..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                        ></textarea>
                      </div>
                    </div>

                    {/* Right - Totals */}
                    <div className={styles.totalsSection}>
                      <div className={styles.totalsGrid}>
                        <div className={styles.totalRow}>
                          <span className={styles.totalLabel}>Subtotal:</span>
                          <span className={styles.totalValue}>{currencySymbol}{calculateSubtotal().toFixed(2)}</span>
                        </div>

                        {/* Tax Dropdown */}
                        <div className={styles.totalRow}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className={styles.totalLabel}>Tax:</span>
                            <div className={styles.taxSelectWrapper} style={{ position: 'relative', width: '200px' }} ref={taxDropdownRef}>
                              <div
                                className={styles.taxSelectButton}
                                onClick={() => setShowTaxDropdown(true)}
                              >
                                <span>{selectedTax ? `${selectedTax.name} (${selectedTax.rate}%)` : 'Select tax'}</span>
                                <i className="fas fa-chevron-down"></i>
                              </div>
                              {showTaxDropdown && (
                                <div className={styles.autocompleteDropdown}>
                                  <div
                                    className={styles.autocompleteOption + ' ' + styles.addNewOption}
                                    onClick={handleAddNewTax}
                                  >
                                    <i className="fas fa-plus"></i> Add New
                                  </div>
                                  {taxes.map((t) => (
                                    <div
                                      key={t.id}
                                      className={styles.autocompleteOption}
                                      onClick={() => handleTaxSelect(t)}
                                    >
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

            {/* Fixed Footer */}
            <div className={styles.popupFooter}>
              <div className={styles.footerLeft}>
                {error && <span style={{ color: '#ef4444', fontSize: '14px' }}>{error}</span>}
                <button className={styles.btnCancel} onClick={handleFormClose}>Cancel</button>
              </div>
              <div className={styles.footerRight}>
                <button className={styles.btnSecondary} onClick={handleSave} disabled={saving}>
                  <i className={saving ? 'fas fa-spinner fa-spin' : 'fas fa-save'}></i>
                  {saving ? 'Saving...' : editingBill ? 'Update' : 'Save'}
                </button>
              </div>
            </div>

          </div>

          {/* Vendor Popup */}
          <VendorPopup
            isOpen={isVendorPopupOpen}
            onClose={() => setIsVendorPopupOpen(false)}
            onSave={handleVendorSave}
          />

          {/* Tax Popup */}
          <TaxPopup
            isOpen={isTaxPopupOpen}
            onClose={() => setIsTaxPopupOpen(false)}
            onSave={handleTaxSave}
          />
        </div>
      )}
    </>
  )
}
