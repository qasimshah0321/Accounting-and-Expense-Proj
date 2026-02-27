'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './Invoice.module.css'
import CustomerPopup from './CustomerPopup'
import TaxPopup from './TaxPopup'
import * as api from '../lib/api'

export default function Invoice({ isOpen, onClose, taxes, onTaxUpdate }) {
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

  const loadCustomers = useCallback(async () => {
    try {
      const res = await api.getCustomers()
      setCustomers(res.data?.customers || res.customers || [])
    } catch {}
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadCustomers()
      setError('')
    }
  }, [isOpen, loadCustomers])

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
    setDueDate(calculateDueDate(terms, invoiceDate))
  }, [terms, invoiceDate])

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

  useEffect(() => {
    if (isOpen && taxes && taxes.length > 0 && !selectedTax) {
      const defaultTax = taxes.find(tax => tax.is_default)
      setSelectedTax(defaultTax || taxes[0])
    }
  }, [isOpen, taxes])

  if (!isOpen) return null

  const formatAddress = (address, city, state, postalCode, country) => {
    const parts = [address, city, state, postalCode, country].filter(p => p && p.trim() !== '')
    return parts.join(', ')
  }

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
    try {
      await api.createInvoice({
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
      })
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.invoicePopupOverlay}>
      <div className={styles.invoicePopup}>
        {/* Header */}
        <div className={styles.popupHeader}>
          <div className={styles.headerLeft}>
            <h2>Create Invoice</h2>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.closeBtn} onClick={onClose}>
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

            {/* Right Side - Invoice Details Column */}
            <div className={styles.invoiceDetailsColumn}>
              <div className={styles.formGroup}>
                <label>Invoice Number</label>
                <input
                  type="text"
                  className={styles.formControlStandard}
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

          {/* Bottom Row - Notes/Attachments and Totals */}
          <div className={styles.bottomRow}>
            {/* Left Side - Notes and Attachments */}
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

            {/* Right Side - Totals */}
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
            <button className={styles.btnCancel} onClick={onClose}>Cancel</button>
          </div>
          <div className={styles.footerRight}>
            <button className={styles.btnSecondary} onClick={handleSave} disabled={saving}>
              <i className={saving ? 'fas fa-spinner fa-spin' : 'fas fa-save'}></i>
              {saving ? 'Saving...' : 'Save'}
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
  )
}
