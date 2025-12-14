'use client'

import { useState } from 'react'
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
  const [isCustomerPopupOpen, setIsCustomerPopupOpen] = useState(false)

  if (!isOpen) return null

  const handleCustomerChange = (e) => {
    const value = e.target.value
    if (value === 'add-new') {
      setIsCustomerPopupOpen(true)
    } else {
      setSelectedCustomer(value)
    }
  }

  const handleCustomerSave = (newCustomer) => {
    setCustomers(prev => [...prev, newCustomer])
    setSelectedCustomer(newCustomer.name)
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
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Customer *</label>
              <select
                className={styles.formControl}
                value={selectedCustomer}
                onChange={handleCustomerChange}
              >
                <option value="">Select Customer</option>
                <option value="add-new" className={styles.addNewOption}>
                  + Add New
                </option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.name}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Invoice Number *</label>
              <input
                type="text"
                className={styles.formControl}
                placeholder="INV-001"
                defaultValue="INV-001"
              />
            </div>
          </div>

          <div className={styles.formRow}>
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

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Payment Terms</label>
              <select className={styles.formControl}>
                <option>Net 30</option>
                <option>Net 15</option>
                <option>Due on Receipt</option>
                <option>Net 60</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Reference Number</label>
              <input
                type="text"
                className={styles.formControl}
                placeholder="PO-12345"
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroupFull}>
              <label>Notes</label>
              <textarea
                className={styles.formControl}
                rows="3"
                placeholder="Add any additional notes or instructions..."
              ></textarea>
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
