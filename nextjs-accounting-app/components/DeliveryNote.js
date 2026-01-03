'use client'

import { useState, useEffect, useRef } from 'react'
import styles from './Invoice.module.css'
import CustomerPopup from './CustomerPopup'
import ShipViaPopup from './ShipViaPopup'

export default function DeliveryNote({ isOpen, onClose, shipVias, onShipViaUpdate }) {
  // Auto-generate Delivery Note Number (EN#)
  const generateDeliveryNoteNumber = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `EN-${year}${month}${day}-${random}`
  }

  const [deliveryNoteNumber] = useState(generateDeliveryNoteNumber())
  const [lineItems, setLineItems] = useState([
    { id: 1, sku: '', description: '', ordered: 0, shipped: 0, backordered: 0 }
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
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [shipmentDate, setShipmentDate] = useState('')
  const [poNumber, setPoNumber] = useState('')
  const [refNumber, setRefNumber] = useState('')
  const [billTo, setBillTo] = useState('')
  const [shipTo, setShipTo] = useState('')
  const [selectedShipVia, setSelectedShipVia] = useState(null)
  const [isShipViaPopupOpen, setIsShipViaPopupOpen] = useState(false)
  const [showShipViaDropdown, setShowShipViaDropdown] = useState(false)

  const autocompleteRef = useRef(null)
  const shipViaDropdownRef = useRef(null)

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

  // Click away handler for ship via dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (shipViaDropdownRef.current && !shipViaDropdownRef.current.contains(event.target)) {
        setShowShipViaDropdown(false)
      }
    }

    if (showShipViaDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showShipViaDropdown])

  // Auto-populate first active ship via when delivery note opens
  useEffect(() => {
    if (isOpen && shipVias && shipVias.length > 0 && !selectedShipVia) {
      const activeShipVias = shipVias.filter(sv => sv.isActive)
      if (activeShipVias.length > 0) {
        setSelectedShipVia(activeShipVias[0])
      }
    }
  }, [isOpen, shipVias])

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
    setLineItems([...lineItems, { id: newId, sku: '', description: '', ordered: 0, shipped: 0, backordered: 0 }])
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

  const handleShipViaSelect = (shipVia) => {
    setSelectedShipVia(shipVia)
    setShowShipViaDropdown(false)
  }

  const handleAddNewShipVia = () => {
    setIsShipViaPopupOpen(true)
    setShowShipViaDropdown(false)
  }

  const handleShipViaPopupClose = () => {
    setIsShipViaPopupOpen(false)
  }

  const handleShipViaSave = (newShipVia) => {
    onShipViaUpdate([...shipVias, newShipVia])
    setSelectedShipVia(newShipVia)
    setIsShipViaPopupOpen(false)
  }

  const updateLineItem = (id, field, value) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value }
        // Auto-calculate backordered when ordered or shipped changes
        if (field === 'ordered' || field === 'shipped') {
          updatedItem.backordered = Math.max(0, updatedItem.ordered - updatedItem.shipped)
        }
        return updatedItem
      }
      return item
    }))
  }

  const calculateTotalOrdered = () => {
    return lineItems.reduce((sum, item) => sum + (item.ordered || 0), 0)
  }

  const calculateTotalShipped = () => {
    return lineItems.reduce((sum, item) => sum + (item.shipped || 0), 0)
  }

  const calculateTotalBackordered = () => {
    return lineItems.reduce((sum, item) => sum + (item.backordered || 0), 0)
  }

  const formatAddress = (address, city, state, postalCode, country) => {
    const parts = [address, city, state, postalCode, country].filter(part => part && part.trim() !== '')
    return parts.join(', ')
  }

  const activeShipVias = shipVias ? shipVias.filter(sv => sv.isActive) : []

  return (
    <div className={styles.invoicePopupOverlay}>
      <div className={styles.invoicePopup}>
        {/* Header */}
        <div className={styles.popupHeader}>
          <div className={styles.headerLeft}>
            <h2>Create Delivery Note</h2>
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

            {/* Right Side - Delivery Note Details Column */}
            <div className={styles.invoiceDetailsColumn}>
              <div className={styles.formGroup}>
                <label>EN#</label>
                <input
                  type="text"
                  className={styles.formControlStandard}
                  value={deliveryNoteNumber}
                  readOnly
                  style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Date</label>
                <input
                  type="date"
                  className={styles.formControlStandard}
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label>PO No.</label>
                <input
                  type="text"
                  className={styles.formControlStandard}
                  placeholder="PO-12345"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
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
                <label>Ref. No.</label>
                <input
                  type="text"
                  className={styles.formControlStandard}
                  placeholder="REF-12345"
                  value={refNumber}
                  onChange={(e) => setRefNumber(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Shipment Date</label>
                <input
                  type="date"
                  className={styles.formControlStandard}
                  value={shipmentDate}
                  onChange={(e) => setShipmentDate(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Ship Via</label>
                <div className={styles.autocompleteWrapper} ref={shipViaDropdownRef}>
                  <div
                    className={styles.formControlStandard}
                    onClick={() => setShowShipViaDropdown(true)}
                    style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <span>{selectedShipVia ? selectedShipVia.name : 'Select shipping method'}</span>
                    <i className="fas fa-chevron-down"></i>
                  </div>
                  {showShipViaDropdown && (
                    <div className={styles.autocompleteDropdown}>
                      <div
                        className={styles.autocompleteOption + ' ' + styles.addNewOption}
                        onClick={handleAddNewShipVia}
                      >
                        <i className="fas fa-plus"></i> Add New
                      </div>
                      {activeShipVias.length > 0 ? (
                        activeShipVias.map(shipVia => (
                          <div
                            key={shipVia.id}
                            className={styles.autocompleteOption}
                            onClick={() => handleShipViaSelect(shipVia)}
                          >
                            {shipVia.name}
                          </div>
                        ))
                      ) : (
                        <div className={styles.autocompleteOption + ' ' + styles.noResults}>
                          No active shipping methods
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
                  <th className={styles.colQuantity}>Ordered</th>
                  <th className={styles.colQuantity}>Shipped</th>
                  <th className={styles.colQuantity}>Backordered</th>
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
                        value={item.ordered}
                        min="0"
                        onChange={(e) => updateLineItem(item.id, 'ordered', parseFloat(e.target.value) || 0)}
                        onFocus={() => handleFieldFocus(item.id)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className={styles.formControlTable}
                        value={item.shipped}
                        min="0"
                        onChange={(e) => updateLineItem(item.id, 'shipped', parseFloat(e.target.value) || 0)}
                        onFocus={() => handleFieldFocus(item.id)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className={styles.formControlTable}
                        value={item.backordered}
                        min="0"
                        onChange={(e) => updateLineItem(item.id, 'backordered', parseFloat(e.target.value) || 0)}
                        onFocus={() => handleFieldFocus(item.id)}
                      />
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

            {/* Right Side - Quantity Totals */}
            <div className={styles.totalsSection}>
              <div className={styles.totalsGrid}>
                <div className={styles.totalRow}>
                  <span className={styles.totalLabel}>Total Ordered:</span>
                  <span className={styles.totalValue}>{calculateTotalOrdered()}</span>
                </div>
                <div className={styles.totalRow}>
                  <span className={styles.totalLabel}>Total Shipped:</span>
                  <span className={styles.totalValue}>{calculateTotalShipped()}</span>
                </div>
                <div className={`${styles.totalRow} ${styles.grandTotal}`}>
                  <span className={styles.totalLabel}>Total Backordered:</span>
                  <span className={styles.totalValue}>{calculateTotalBackordered()}</span>
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

      {/* Ship Via Popup */}
      <ShipViaPopup
        isOpen={isShipViaPopupOpen}
        onClose={handleShipViaPopupClose}
        onSave={handleShipViaSave}
      />
    </div>
  )
}
