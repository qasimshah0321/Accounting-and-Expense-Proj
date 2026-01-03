'use client'

import { useState, useEffect, useRef } from 'react'
import styles from './Invoice.module.css'
import CustomerPopup from './CustomerPopup'
import TaxPopup from './TaxPopup'

export default function Invoice({ isOpen, onClose, taxes, onTaxUpdate }) {
  const [lineItems, setLineItems] = useState([
    { id: 1, sku: '', description: '', quantity: 1, rate: 0, amount: 0 }
  ])

  const [customers, setCustomers] = useState([
    {
      id: 1,
      name: 'John Doe',
      billingAddress: '123 Main St',
      billingCity: 'New York',
      billingState: 'NY',
      billingPostalCode: '10001',
      billingCountry: 'USA',
      shippingAddress: '123 Main St',
      shippingCity: 'New York',
      shippingState: 'NY',
      shippingPostalCode: '10001',
      shippingCountry: 'USA'
    },
    {
      id: 2,
      name: 'Jane Smith',
      billingAddress: '456 Oak Avenue',
      billingCity: 'Los Angeles',
      billingState: 'CA',
      billingPostalCode: '90001',
      billingCountry: 'USA',
      shippingAddress: '789 Pine Street',
      shippingCity: 'San Francisco',
      shippingState: 'CA',
      shippingPostalCode: '94102',
      shippingCountry: 'USA'
    },
    {
      id: 3,
      name: 'ABC Corporation',
      billingAddress: '999 Business Blvd',
      billingCity: 'Chicago',
      billingState: 'IL',
      billingPostalCode: '60601',
      billingCountry: 'USA',
      shippingAddress: '999 Business Blvd',
      shippingCity: 'Chicago',
      shippingState: 'IL',
      shippingPostalCode: '60601',
      shippingCountry: 'USA'
    }
  ])

  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [customerSearchText, setCustomerSearchText] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [isCustomerPopupOpen, setIsCustomerPopupOpen] = useState(false)
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [terms, setTerms] = useState('Net 30')
  const [billTo, setBillTo] = useState('')
  const [shipTo, setShipTo] = useState('')
  const [selectedTax, setSelectedTax] = useState(null)
  const [isTaxPopupOpen, setIsTaxPopupOpen] = useState(false)
  const [showTaxDropdown, setShowTaxDropdown] = useState(false)
  const [discount, setDiscount] = useState(0)

  const autocompleteRef = useRef(null)
  const taxDropdownRef = useRef(null)

  // Calculate due date based on terms and invoice date
  const calculateDueDate = (selectedTerms, selectedInvoiceDate) => {
    if (!selectedInvoiceDate) return ''

    const date = new Date(selectedInvoiceDate)

    switch (selectedTerms) {
      case 'Net 15':
        date.setDate(date.getDate() + 15)
        break
      case 'Net 30':
        date.setDate(date.getDate() + 30)
        break
      case 'Net 60':
        date.setDate(date.getDate() + 60)
        break
      case 'Due on Receipt':
        // Due date is same as invoice date
        break
      default:
        date.setDate(date.getDate() + 30)
    }

    return date.toISOString().split('T')[0]
  }

  // Update due date when terms or invoice date changes
  useEffect(() => {
    const newDueDate = calculateDueDate(terms, invoiceDate)
    setDueDate(newDueDate)
  }, [terms, invoiceDate])

  // Click away handler for autocomplete dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        setShowCustomerDropdown(false)
      }
    }

    if (showCustomerDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCustomerDropdown])

  // Click away handler for tax dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (taxDropdownRef.current && !taxDropdownRef.current.contains(event.target)) {
        setShowTaxDropdown(false)
        setTaxDropdownIndex(null)
      }
    }

    if (showTaxDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showTaxDropdown])

  // Auto-populate default tax when invoice opens
  useEffect(() => {
    if (isOpen && taxes && taxes.length > 0 && !selectedTax) {
      const defaultTax = taxes.find(tax => tax.isDefault)
      if (defaultTax) {
        setSelectedTax(defaultTax)
      } else {
        // If no default tax, use first tax
        setSelectedTax(taxes[0])
      }
    }
  }, [isOpen, taxes])

  if (!isOpen) return null

  const handleCustomerInputChange = (e) => {
    const value = e.target.value
    setCustomerSearchText(value)
    setShowCustomerDropdown(true)
    if (value === '') {
      setSelectedCustomer('')
    }
  }

  const handleCustomerSelect = (customerName) => {
    setSelectedCustomer(customerName)
    setCustomerSearchText(customerName)
    setShowCustomerDropdown(false)

    // Find the selected customer and populate addresses
    const customer = customers.find(c => c.name === customerName)
    if (customer) {
      const billingAddress = formatAddress(
        customer.billingAddress,
        customer.billingCity,
        customer.billingState,
        customer.billingPostalCode,
        customer.billingCountry
      )
      const shippingAddress = formatAddress(
        customer.shippingAddress,
        customer.shippingCity,
        customer.shippingState,
        customer.shippingPostalCode,
        customer.shippingCountry
      )
      setBillTo(billingAddress)
      setShipTo(shippingAddress)
    }
  }

  const handleAddNewCustomer = () => {
    setIsCustomerPopupOpen(true)
    setShowCustomerDropdown(false)
  }

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearchText.toLowerCase())
  )

  const handleCustomerSave = (newCustomer) => {
    setCustomers(prev => [...prev, newCustomer])
    setSelectedCustomer(newCustomer.name)
    setCustomerSearchText(newCustomer.name)
    setIsCustomerPopupOpen(false)

    // Populate addresses for the new customer
    const billingAddress = formatAddress(
      newCustomer.billingAddress,
      newCustomer.billingCity,
      newCustomer.billingState,
      newCustomer.billingPostalCode,
      newCustomer.billingCountry
    )
    const shippingAddress = formatAddress(
      newCustomer.shippingAddress,
      newCustomer.shippingCity,
      newCustomer.shippingState,
      newCustomer.shippingPostalCode,
      newCustomer.shippingCountry
    )
    setBillTo(billingAddress)
    setShipTo(shippingAddress)
  }

  const handleCustomerPopupClose = () => {
    setIsCustomerPopupOpen(false)
  }

  const addLineItem = () => {
    const newId = lineItems.length > 0 ? Math.max(...lineItems.map(item => item.id)) + 1 : 1
    setLineItems([...lineItems, { id: newId, sku: '', description: '', quantity: 1, rate: 0, amount: 0 }])
  }

  const handleFieldFocus = (itemId) => {
    const isLastRow = lineItems[lineItems.length - 1].id === itemId
    if (isLastRow) {
      addLineItem()
    }
  }

  const removeLineItem = (id) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id))
    }
  }

  const handleTaxSelect = (tax) => {
    setSelectedTax(tax)
    setShowTaxDropdown(false)
  }

  const handleAddNewTax = () => {
    setIsTaxPopupOpen(true)
    setShowTaxDropdown(false)
  }

  const handleTaxPopupClose = () => {
    setIsTaxPopupOpen(false)
  }

  const handleTaxSave = (newTax) => {
    onTaxUpdate([...taxes, newTax])
    setSelectedTax(newTax)
    setIsTaxPopupOpen(false)
  }

  const updateLineItem = (id, field, value) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value }
        if (field === 'quantity' || field === 'rate') {
          updatedItem.amount = updatedItem.quantity * updatedItem.rate
        }
        return updatedItem
      }
      return item
    }))
  }

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + item.amount, 0)
  }

  const calculateTax = () => {
    if (selectedTax) {
      const subtotal = calculateSubtotal()
      return subtotal * selectedTax.rate / 100
    }
    return 0
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax() - discount
  }

  const formatAddress = (address, city, state, postalCode, country) => {
    const parts = [address, city, state, postalCode, country].filter(part => part && part.trim() !== '')
    return parts.join(', ')
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
            <button className={styles.headerBtn}>
              <i className="fas fa-file-pdf"></i>
              View PDF
            </button>
            <button className={styles.headerBtn}>
              <i className="fas fa-edit"></i>
              Edit
            </button>
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
                  placeholder="INV-001"
                  defaultValue="INV-001"
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
                ></textarea>
              </div>

              <div className={styles.formGroup}>
                <label>Attachments</label>
                <div className={styles.attachmentArea}>
                  <input
                    type="file"
                    id="fileUpload"
                    className={styles.fileInput}
                    multiple
                  />
                  <label htmlFor="fileUpload" className={styles.fileUploadLabel}>
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
                  <span className={styles.totalValue}>
                    <input
                      type="number"
                      className={styles.discountInput}
                      value={discount}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      step="0.01"
                      min="0"
                    />
                  </span>
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
            <button className={styles.btnCancel} onClick={onClose}>Cancel</button>
          </div>
          <div className={styles.footerRight}>
            <button className={styles.btnSecondary}>
              <i className="fas fa-save"></i>
              Save
            </button>
            <button className={styles.btnPrimary}>
              <i className="fas fa-paper-plane"></i>
              Review & Send
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
