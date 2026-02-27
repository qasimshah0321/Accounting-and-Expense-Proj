'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './Invoice.module.css'
import CustomerPopup from './CustomerPopup'
import TaxPopup from './TaxPopup'
import * as api from '../lib/api'

export default function Invoice({ isOpen, onClose, taxes, onTaxUpdate }) {
  // ─── List state ───────────────────────────────────────────────────────────
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState(null)

  // ─── Form state ───────────────────────────────────────────────────────────
  const [lineItems, setLineItems] = useState([
    { id: 1, sku: '', description: '', quantity: 1, rate: 0, discount: 0, amount: 0 }
  ])
  const [customers, setCustomers] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState(null)
  const [customerSearchText, setCustomerSearchText] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [isCustomerPopupOpen, setIsCustomerPopupOpen] = useState(false)
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [terms, setTerms] = useState('Net 30')
  const [billTo, setBillTo] = useState('')
  const [shipTo, setShipTo] = useState('')
  const [referenceNo, setReferenceNo] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedTax, setSelectedTax] = useState(null)
  const [isTaxPopupOpen, setIsTaxPopupOpen] = useState(false)
  const [showTaxDropdown, setShowTaxDropdown] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const autocompleteRef = useRef(null)
  const taxDropdownRef = useRef(null)

  // ─── Data loading ─────────────────────────────────────────────────────────
  const loadInvoices = useCallback(async () => {
    setLoading(true)
    setListError('')
    try {
      const res = await api.getInvoices()
      setInvoices(res.data?.invoices || res.invoices || res.data || [])
    } catch (err) {
      setListError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadCustomers = useCallback(async () => {
    try {
      const res = await api.getCustomers()
      setCustomers(res.data?.customers || res.customers || [])
    } catch {}
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadInvoices()
      loadCustomers()
    }
  }, [isOpen, loadInvoices, loadCustomers])

  // ─── Auto-calculate due date only for new invoices ────────────────────────
  const calculateDueDate = (selectedTerms, selectedInvoiceDate) => {
    if (!selectedInvoiceDate) return ''
    const date = new Date(selectedInvoiceDate)
    switch (selectedTerms) {
      case 'Net 15': date.setDate(date.getDate() + 15); break
      case 'Net 30': date.setDate(date.getDate() + 30); break
      case 'Net 60': date.setDate(date.getDate() + 60); break
      case 'Due on Receipt': break
      default: date.setDate(date.getDate() + 30)
    }
    return date.toISOString().split('T')[0]
  }

  useEffect(() => {
    if (!editingInvoice) {
      setDueDate(calculateDueDate(terms, invoiceDate))
    }
  }, [terms, invoiceDate])

  // ─── Click-outside handlers ───────────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        setShowCustomerDropdown(false)
      }
    }
    if (showCustomerDropdown) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showCustomerDropdown])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (taxDropdownRef.current && !taxDropdownRef.current.contains(event.target)) {
        setShowTaxDropdown(false)
      }
    }
    if (showTaxDropdown) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showTaxDropdown])

  // ─── Set default tax when opening new invoice form ────────────────────────
  useEffect(() => {
    if (showForm && !editingInvoice && taxes && taxes.length > 0 && !selectedTax) {
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

  const resetForm = () => {
    setLineItems([{ id: 1, sku: '', description: '', quantity: 1, rate: 0, discount: 0, amount: 0 }])
    setSelectedCustomer('')
    setSelectedCustomerId(null)
    setCustomerSearchText('')
    setInvoiceDate(new Date().toISOString().split('T')[0])
    setDueDate('')
    setTerms('Net 30')
    setBillTo('')
    setShipTo('')
    setReferenceNo('')
    setNotes('')
    setSelectedTax(taxes.find(t => t.is_default) || taxes[0] || null)
    setError('')
  }

  const populateForm = (invoice) => {
    setSelectedCustomer(invoice.customer_name || '')
    setSelectedCustomerId(invoice.customer_id)
    setCustomerSearchText(invoice.customer_name || '')
    setInvoiceDate(invoice.invoice_date ? invoice.invoice_date.split('T')[0] : new Date().toISOString().split('T')[0])
    setDueDate(invoice.due_date ? invoice.due_date.split('T')[0] : '')
    setBillTo(invoice.bill_to || '')
    setShipTo(invoice.ship_to || '')
    setReferenceNo(invoice.reference_no || '')
    setNotes(invoice.notes || '')
    setTerms('Net 30')
    if (invoice.line_items && invoice.line_items.length > 0) {
      setLineItems(invoice.line_items.map((item, idx) => ({
        id: idx + 1,
        sku: item.sku || '',
        description: item.description || '',
        quantity: parseFloat(item.quantity) || 1,
        rate: parseFloat(item.rate) || 0,
        discount: parseFloat(item.discount_per_item) || 0,
        amount: parseFloat(item.amount) || 0,
      })))
    } else {
      setLineItems([{ id: 1, sku: '', description: '', quantity: 1, rate: 0, discount: 0, amount: 0 }])
    }
    if (invoice.tax_id) {
      const tax = taxes.find(t => t.id === invoice.tax_id)
      setSelectedTax(tax || null)
    } else {
      setSelectedTax(null)
    }
    setError('')
  }

  // ─── List actions ─────────────────────────────────────────────────────────
  const handleNewInvoice = () => {
    resetForm()
    setEditingInvoice(null)
    setShowForm(true)
  }

  const handleEditInvoice = async (invoice) => {
    setListError('')
    try {
      const res = await api.getInvoice(invoice.id)
      const full = res.data || res
      setEditingInvoice(full)
      populateForm(full)
      setShowForm(true)
    } catch (err) {
      setListError('Failed to load invoice: ' + err.message)
    }
  }

  const handleDeleteInvoice = async (id) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return
    setListError('')
    try {
      await api.deleteInvoice(id)
      setInvoices(prev => prev.filter(inv => inv.id !== id))
    } catch (err) {
      setListError('Delete failed: ' + err.message)
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingInvoice(null)
  }

  // ─── Form event handlers ──────────────────────────────────────────────────
  const handleCustomerInputChange = (e) => {
    const value = e.target.value
    setCustomerSearchText(value)
    setShowCustomerDropdown(true)
    if (value === '') {
      setSelectedCustomer('')
      setSelectedCustomerId(null)
    }
  }

  const handleCustomerSelect = (customerName) => {
    const customer = customers.find(c => c.name === customerName)
    setSelectedCustomer(customerName)
    setSelectedCustomerId(customer?.id || null)
    setCustomerSearchText(customerName)
    setShowCustomerDropdown(false)
    if (customer) {
      setBillTo(formatAddress(customer.billing_address, customer.billing_city, customer.billing_state, customer.billing_postal_code, customer.billing_country))
      setShipTo(formatAddress(customer.shipping_address, customer.shipping_city, customer.shipping_state, customer.shipping_postal_code, customer.shipping_country))
    }
  }

  const handleAddNewCustomer = () => {
    setIsCustomerPopupOpen(true)
    setShowCustomerDropdown(false)
  }

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearchText.toLowerCase())
  )

  const handleCustomerSave = (newCustomer) => {
    setCustomers(prev => [...prev, newCustomer])
    setSelectedCustomer(newCustomer.name)
    setSelectedCustomerId(newCustomer.id)
    setCustomerSearchText(newCustomer.name)
    setIsCustomerPopupOpen(false)
    setBillTo(formatAddress(newCustomer.billing_address, newCustomer.billing_city, newCustomer.billing_state, newCustomer.billing_postal_code, newCustomer.billing_country))
    setShipTo(formatAddress(newCustomer.shipping_address, newCustomer.shipping_city, newCustomer.shipping_state, newCustomer.shipping_postal_code, newCustomer.shipping_country))
  }

  const handleCustomerPopupClose = () => setIsCustomerPopupOpen(false)

  const addLineItem = () => {
    const newId = lineItems.length > 0 ? Math.max(...lineItems.map(item => item.id)) + 1 : 1
    setLineItems([...lineItems, { id: newId, sku: '', description: '', quantity: 1, rate: 0, discount: 0, amount: 0 }])
  }

  const handleFieldFocus = (itemId) => {
    if (lineItems[lineItems.length - 1].id === itemId) addLineItem()
  }

  const removeLineItem = (id) => {
    if (lineItems.length > 1) setLineItems(lineItems.filter(item => item.id !== id))
  }

  const handleTaxSelect = (tax) => {
    setSelectedTax(tax)
    setShowTaxDropdown(false)
  }

  const handleAddNewTax = () => {
    setIsTaxPopupOpen(true)
    setShowTaxDropdown(false)
  }

  const handleTaxPopupClose = () => setIsTaxPopupOpen(false)

  const handleTaxSave = (newTax) => {
    onTaxUpdate([...taxes, newTax])
    setSelectedTax(newTax)
    setIsTaxPopupOpen(false)
  }

  const updateLineItem = (id, field, value) => {
    setLineItems(lineItems.map(item => {
      if (item.id !== id) return item
      const updated = { ...item, [field]: value }
      if (field === 'quantity' || field === 'rate' || field === 'discount') {
        updated.amount = (updated.quantity * updated.rate) - updated.discount
      }
      return updated
    }))
  }

  const calculateSubtotal = () => lineItems.reduce((sum, item) => sum + item.amount, 0)
  const calculateDiscount = () => lineItems.reduce((sum, item) => sum + (item.discount || 0), 0)
  const calculateTax = () => selectedTax ? calculateSubtotal() * selectedTax.rate / 100 : 0
  const calculateTotal = () => calculateSubtotal() + calculateTax()

  const handleSave = async () => {
    setError('')
    if (!selectedCustomerId) { setError('Please select a customer'); return }
    const validItems = lineItems.filter(item => item.description.trim())
    if (validItems.length === 0) { setError('Add at least one line item with a description'); return }
    if (!invoiceDate) { setError('Invoice date is required'); return }
    if (!dueDate) { setError('Due date is required'); return }
    setSaving(true)
    const payload = {
      customer_id: selectedCustomerId,
      invoice_date: invoiceDate,
      due_date: dueDate,
      reference_no: referenceNo || undefined,
      bill_to: billTo,
      ship_to: shipTo,
      tax_id: selectedTax?.id || null,
      tax_rate: selectedTax?.rate || 0,
      discount_amount: calculateDiscount(),
      notes: notes || undefined,
      line_items: validItems.map(item => ({
        sku: item.sku || undefined,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        discount_per_item: item.discount || 0,
        tax_id: selectedTax?.id || null,
        tax_rate: selectedTax?.rate || 0,
        tax_amount: selectedTax ? (item.amount * selectedTax.rate / 100) : 0,
      })),
    }
    try {
      if (editingInvoice) {
        await api.updateInvoice(editingInvoice.id, payload)
      } else {
        await api.createInvoice(payload)
      }
      setShowForm(false)
      setEditingInvoice(null)
      loadInvoices()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ─── List display helpers ─────────────────────────────────────────────────
  const filteredInvoices = invoices.filter(inv =>
    (inv.invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inv.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString()
  }

  const formatCurrency = (amount) => '$' + (parseFloat(amount) || 0).toFixed(2)

  const getStatusClass = (status) => {
    switch (status) {
      case 'paid': return styles.statusPaid
      case 'sent': return styles.statusSent
      case 'overdue': return styles.statusOverdue
      case 'cancelled': return styles.statusCancelled
      default: return styles.statusDraft
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Invoice List View ─────────────────────────────────────────────── */}
      <div className={styles.invoiceListOverlay}>
        <div className={styles.invoiceListContainer}>

          {/* Header */}
          <div className={styles.listHeader}>
            <div className={styles.listHeaderLeft}>
              <h2>Invoices</h2>
            </div>
            <div className={styles.listHeaderRight}>
              <button className={styles.btnNewInvoice} onClick={handleNewInvoice}>
                <i className="fas fa-plus"></i> New Invoice
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
                placeholder="Search by invoice # or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className={styles.btnRefresh} onClick={loadInvoices} title="Refresh">
              <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
            </button>
          </div>

          {listError && (
            <div className={styles.errorBanner}>
              <i className="fas fa-exclamation-circle"></i> {listError}
            </div>
          )}

          {/* Invoice Table */}
          <div className={styles.invoiceGridContainer}>
            {loading ? (
              <div className={styles.loadingState}>
                <i className="fas fa-spinner fa-spin"></i>
                <p>Loading invoices...</p>
              </div>
            ) : filteredInvoices.length > 0 ? (
              <table className={styles.invoiceTable}>
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Due Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id}>
                      <td><strong>{inv.invoice_number || '-'}</strong></td>
                      <td>{inv.customer_name || '-'}</td>
                      <td>{formatDate(inv.invoice_date)}</td>
                      <td>{formatDate(inv.due_date)}</td>
                      <td>{formatCurrency(inv.total_amount)}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${getStatusClass(inv.status)}`}>
                          {inv.status || 'draft'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actionButtons}>
                          <button
                            className={styles.btnEdit}
                            title="Edit"
                            onClick={() => handleEditInvoice(inv)}
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            className={styles.btnDelete}
                            title="Delete"
                            onClick={() => handleDeleteInvoice(inv.id)}
                          >
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
                <h3>No invoices found</h3>
                <p>{searchTerm ? 'Try adjusting your search' : 'Click "New Invoice" to create your first invoice'}</p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Invoice Form Popup ────────────────────────────────────────────── */}
      {showForm && (
        <div className={styles.invoicePopupOverlay}>
          <div className={styles.invoicePopup}>

            {/* Header */}
            <div className={styles.popupHeader}>
              <div className={styles.headerLeft}>
                <h2>{editingInvoice ? `Edit Invoice ${editingInvoice.invoice_number || ''}` : 'Create Invoice'}</h2>
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
                    {/* Left Side - Customer */}
                    <div className={styles.customerSection}>
                      <div className={styles.formGroup}>
                        <label>Customer</label>
                        <div className={styles.autocompleteWrapper} ref={autocompleteRef}>
                          <input
                            type="text"
                            className={styles.formControlStandard}
                            placeholder="Search or select customer"
                            value={customerSearchText}
                            onChange={handleCustomerInputChange}
                            onFocus={() => setShowCustomerDropdown(true)}
                          />
                          {showCustomerDropdown && (
                            <div className={styles.autocompleteDropdown}>
                              <div
                                className={styles.autocompleteOption + ' ' + styles.addNewOption}
                                onClick={handleAddNewCustomer}
                              >
                                <i className="fas fa-plus"></i> Add New
                              </div>
                              {filteredCustomers.length > 0 ? (
                                filteredCustomers.map(customer => (
                                  <div
                                    key={customer.id}
                                    className={styles.autocompleteOption}
                                    onClick={() => handleCustomerSelect(customer.name)}
                                  >
                                    {customer.name}
                                  </div>
                                ))
                              ) : (
                                customerSearchText && (
                                  <div className={styles.autocompleteOption + ' ' + styles.noResults}>
                                    No customers found
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className={styles.formGroup}>
                        <label>Bill To</label>
                        <textarea
                          className={styles.formControlStandard}
                          placeholder="Billing address will populate automatically"
                          value={billTo}
                          onChange={(e) => setBillTo(e.target.value)}
                          rows="3"
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label>Ship To</label>
                        <textarea
                          className={styles.formControlStandard}
                          placeholder="Shipping address will populate automatically"
                          value={shipTo}
                          onChange={(e) => setShipTo(e.target.value)}
                          rows="3"
                        />
                      </div>
                    </div>

                    {/* Right Side - Invoice Details */}
                    <div className={styles.invoiceDetailsColumn}>
                      <div className={styles.formGroup}>
                        <label>Invoice Number</label>
                        <input
                          type="text"
                          className={styles.formControlStandard}
                          value={editingInvoice?.invoice_number || ''}
                          placeholder="Auto-generated"
                          readOnly
                          style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Terms</label>
                        <select
                          className={styles.formControlStandard}
                          value={terms}
                          onChange={(e) => setTerms(e.target.value)}
                        >
                          <option>Net 30</option>
                          <option>Net 15</option>
                          <option>Due on Receipt</option>
                          <option>Net 60</option>
                        </select>
                      </div>
                      <div className={styles.formGroup}>
                        <label>Invoice Date</label>
                        <input
                          type="date"
                          className={styles.formControlStandard}
                          value={invoiceDate}
                          onChange={(e) => setInvoiceDate(e.target.value)}
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
                      <div className={styles.formGroup}>
                        <label>Due Date</label>
                        <input
                          type="date"
                          className={styles.formControlStandard}
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
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
                          <th className={styles.colSku}>SKU</th>
                          <th className={styles.colDescription}>Description</th>
                          <th className={styles.colQuantity}>Quantity</th>
                          <th className={styles.colRate}>Rate</th>
                          <th className={styles.colDiscount}>Discount</th>
                          <th className={styles.colAmount}>Amount</th>
                          <th className={styles.colAction}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map((item) => (
                          <tr key={item.id}>
                            <td>
                              <input
                                type="text"
                                className={styles.formControlTable}
                                placeholder="SKU"
                                value={item.sku}
                                onChange={(e) => updateLineItem(item.id, 'sku', e.target.value)}
                                onFocus={() => handleFieldFocus(item.id)}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                className={styles.formControlTable}
                                placeholder="Item description"
                                value={item.description}
                                onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                                onFocus={() => handleFieldFocus(item.id)}
                              />
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
                            <td>
                              <input
                                type="number"
                                className={styles.formControlTable}
                                value={item.discount}
                                min="0"
                                step="0.01"
                                onChange={(e) => updateLineItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                                onFocus={() => handleFieldFocus(item.id)}
                              />
                            </td>
                            <td className={styles.amountCell}>
                              ${item.amount.toFixed(2)}
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
                    {/* Left - Notes and Attachments */}
                    <div className={styles.notesAttachmentsSection}>
                      <div className={styles.formGroup}>
                        <label>Notes</label>
                        <textarea
                          className={styles.formControlStandard}
                          rows="3"
                          placeholder="Add any additional notes or instructions..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                        ></textarea>
                      </div>
                      <div className={styles.formGroup}>
                        <label>Attachments</label>
                        <div className={styles.attachmentArea}>
                          <input
                            type="file"
                            id="invoiceFileUpload"
                            className={styles.fileInput}
                            multiple
                          />
                          <label htmlFor="invoiceFileUpload" className={styles.fileUploadLabel}>
                            <i className="fas fa-cloud-upload-alt"></i>
                            <span>Click to upload or drag and drop</span>
                            <small>PDF, DOC, JPG, PNG (Max 10MB each)</small>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Right - Totals */}
                    <div className={styles.totalsSection}>
                      <div className={styles.totalsGrid}>
                        <div className={styles.totalRow}>
                          <span className={styles.totalLabel}>Subtotal:</span>
                          <span className={styles.totalValue}>${calculateSubtotal().toFixed(2)}</span>
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
                          <span className={styles.totalValue}>${calculateTax().toFixed(2)}</span>
                        </div>

                        <div className={styles.totalRow}>
                          <span className={styles.totalLabel}>Discount:</span>
                          <span className={styles.totalValue}>${calculateDiscount().toFixed(2)}</span>
                        </div>
                        <div className={`${styles.totalRow} ${styles.grandTotal}`}>
                          <span className={styles.totalLabel}>Total:</span>
                          <span className={styles.totalValue}>${calculateTotal().toFixed(2)}</span>
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
                  {saving ? 'Saving...' : editingInvoice ? 'Update' : 'Save'}
                </button>
              </div>
            </div>

          </div>

          {/* Customer Popup */}
          <CustomerPopup
            isOpen={isCustomerPopupOpen}
            onClose={handleCustomerPopupClose}
            onSave={handleCustomerSave}
          />

          {/* Tax Popup */}
          <TaxPopup
            isOpen={isTaxPopupOpen}
            onClose={handleTaxPopupClose}
            onSave={handleTaxSave}
          />
        </div>
      )}
    </>
  )
}
