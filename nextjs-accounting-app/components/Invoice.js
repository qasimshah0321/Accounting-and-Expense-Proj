'use client'

import { useState, useEffect, useRef } from 'react'
import styles from './Invoice.module.css'
import CustomerPopup from './CustomerPopup'

export default function Invoice({ isOpen, onClose }) {
  const [lineItems, setLineItems] = useState([
    { id: 1, description: '', quantity: 1, rate: 0, amount: 0 }
  ])

  const [customers, setCustomers] = useState([
    { id: 1, name: 'John Doe' },
    { id: 2, name: 'Jane Smith' },
    { id: 3, name: 'ABC Corporation' }
  ])

  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [customerSearchText, setCustomerSearchText] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [isCustomerPopupOpen, setIsCustomerPopupOpen] = useState(false)

  const autocompleteRef = useRef(null)

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
  }

  const handleCustomerPopupClose = () => {
    setIsCustomerPopupOpen(false)
  }

  const addLineItem = () => {
    const newId = lineItems.length > 0 ? Math.max(...lineItems.map(item => item.id)) + 1 : 1
    setLineItems([...lineItems, { id: newId, description: '', quantity: 1, rate: 0, amount: 0 }])
  }

  const removeLineItem = (id) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id))
    }
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
    return calculateSubtotal() * 0.1 // 10% tax
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax()
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
                <label>Customer *</label>
                <div className={styles.autocompleteWrapper} ref={autocompleteRef}>
                  <input
                    type="text"
                    className={styles.formControl}
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
            </div>

            {/* Right Side - Invoice Details Column */}
            <div className={styles.invoiceDetailsColumn}>
              <div className={styles.formGroup}>
                <label>Invoice Number *</label>
                <input
                  type="text"
                  className={styles.formControl}
                  placeholder="INV-001"
                  defaultValue="INV-001"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Terms</label>
                <select className={styles.formControl}>
                  <option>Net 30</option>
                  <option>Net 15</option>
                  <option>Due on Receipt</option>
                  <option>Net 60</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Invoice Date *</label>
                <input
                  type="date"
                  className={styles.formControl}
                  defaultValue={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Due Date *</label>
                <input
                  type="date"
                  className={styles.formControl}
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
            <button className={styles.btnAddItem} onClick={addLineItem}>
              <i className="fas fa-plus"></i> Add Item
            </button>
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
                      <input
                        type="text"
                        className={styles.formControl}
                        placeholder="Item description"
                        value={item.description}
                        onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className={styles.formControl}
                        value={item.quantity}
                        min="1"
                        onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className={styles.formControl}
                        value={item.rate}
                        min="0"
                        step="0.01"
                        onChange={(e) => updateLineItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
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

          {/* Notes and Attachments Section */}
          <div className={styles.notesAttachmentsSection}>
            <div className={styles.formGroup}>
              <label>Reference Number</label>
              <input
                type="text"
                className={styles.formControl}
                placeholder="PO-12345"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Notes</label>
              <textarea
                className={styles.formControl}
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

          <div className={styles.totalsSection}>
            <div className={styles.totalsGrid}>
              <div className={styles.totalRow}>
                <span className={styles.totalLabel}>Subtotal:</span>
                <span className={styles.totalValue}>${calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className={styles.totalRow}>
                <span className={styles.totalLabel}>Tax (10%):</span>
                <span className={styles.totalValue}>${calculateTax().toFixed(2)}</span>
              </div>
              <div className={styles.totalRow}>
                <span className={styles.totalLabel}>Discount:</span>
                <span className={styles.totalValue}>
                  <input
                    type="number"
                    className={styles.discountInput}
                    defaultValue="0.00"
                    step="0.01"
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
    </div>
  )
}
