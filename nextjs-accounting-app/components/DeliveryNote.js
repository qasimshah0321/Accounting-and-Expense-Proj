'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './Invoice.module.css'
import CustomerPopup from './CustomerPopup'
import ShipViaPopup from './ShipViaPopup'
import * as api from '../lib/api'

export default function DeliveryNote({ isOpen, onClose, shipVias, onShipViaUpdate }) {
  const [lineItems, setLineItems] = useState([
    { id: 1, sku: '', description: '', ordered: 0, shipped: 0, backordered: 0 }
  ])
  const [customers, setCustomers] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState(null)
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
  const [notes, setNotes] = useState('')
  const [selectedShipVia, setSelectedShipVia] = useState(null)
  const [isShipViaPopupOpen, setIsShipViaPopupOpen] = useState(false)
  const [showShipViaDropdown, setShowShipViaDropdown] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const autocompleteRef = useRef(null)
  const shipViaDropdownRef = useRef(null)

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
      if (shipViaDropdownRef.current && !shipViaDropdownRef.current.contains(event.target)) {
        setShowShipViaDropdown(false)
      }
    }
    if (showShipViaDropdown) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showShipViaDropdown])

  useEffect(() => {
    if (isOpen && shipVias && shipVias.length > 0 && !selectedShipVia) {
      const activeShipVias = shipVias.filter(sv => sv.is_active)
      if (activeShipVias.length > 0) setSelectedShipVia(activeShipVias[0])
    }
  }, [isOpen, shipVias])

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
    setLineItems([...lineItems, { id: newId, sku: '', description: '', ordered: 0, shipped: 0, backordered: 0 }])
  }

  const handleFieldFocus = (itemId) => {
    if (lineItems[lineItems.length - 1].id === itemId) addLineItem()
  }

  const removeLineItem = (id) => {
    if (lineItems.length > 1) setLineItems(lineItems.filter(item => item.id !== id))
  }

  const handleShipViaSelect = (shipVia) => {
    setSelectedShipVia(shipVia)
    setShowShipViaDropdown(false)
  }

  const handleAddNewShipVia = () => {
    setIsShipViaPopupOpen(true)
    setShowShipViaDropdown(false)
  }

  const handleShipViaPopupClose = () => setIsShipViaPopupOpen(false)

  const handleShipViaSave = (newShipVia) => {
    onShipViaUpdate([...shipVias, newShipVia])
    setSelectedShipVia(newShipVia)
    setIsShipViaPopupOpen(false)
  }

  const updateLineItem = (id, field, value) => {
    setLineItems(lineItems.map(item => {
      if (item.id !== id) return item
      const updated = { ...item, [field]: value }
      if (field === 'ordered' || field === 'shipped') {
        updated.backordered = Math.max(0, updated.ordered - updated.shipped)
      }
      return updated
    }))
  }

  const calculateTotalOrdered = () => lineItems.reduce((sum, item) => sum + (item.ordered || 0), 0)
  const calculateTotalShipped = () => lineItems.reduce((sum, item) => sum + (item.shipped || 0), 0)
  const calculateTotalBackordered = () => lineItems.reduce((sum, item) => sum + (item.backordered || 0), 0)

  const handleSave = async () => {
    setError('')
    if (!selectedCustomerId) { setError('Please select a customer'); return }
    const validItems = lineItems.filter(item => item.description.trim())
    if (validItems.length === 0) { setError('Add at least one line item with a description'); return }
    if (!deliveryDate) { setError('Delivery date is required'); return }
    setSaving(true)
    try {
      await api.createDeliveryNote({
        customer_id: selectedCustomerId,
        delivery_date: deliveryDate,
        due_date: dueDate || undefined,
        shipment_date: shipmentDate || undefined,
        po_number: poNumber || undefined,
        reference_no: refNumber || undefined,
        ship_via_id: selectedShipVia?.id || null,
        ship_to: shipTo,
        notes: notes || undefined,
        line_items: validItems.map(item => ({
          sku: item.sku || undefined,
          description: item.description,
          ordered_qty: item.ordered,
          shipped_qty: item.shipped,
        })),
      })
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const activeShipVias = shipVias ? shipVias.filter(sv => sv.is_active) : []

  return (
    <div className={styles.invoicePopupOverlay}>
      <div className={styles.invoicePopup}>
        {/* Header */}
        <div className={styles.popupHeader}>
          <div className={styles.headerLeft}>
            <h2>Create Delivery Note</h2>
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

              {/* Additional fields */}
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

            {/* Right Side - Delivery Note Details Column */}
            <div className={styles.invoiceDetailsColumn}>
              <div className={styles.formGroup}>
                <label>DN No</label>
                <input
                  type="text"
                  className={styles.formControlStandard}
                  placeholder="Auto-generated"
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
                <label>Shipment Date</label>
                <input
                  type="date"
                  className={styles.formControlStandard}
                  value={shipmentDate}
                  onChange={(e) => setShipmentDate(e.target.value)}
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

          {/* Bottom Row - Notes and Attachments */}
          <div className={styles.bottomRow}>
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
                    id="dnFileUpload"
                    className={styles.fileInput}
                    multiple
                  />
                  <label htmlFor="dnFileUpload" className={styles.fileUploadLabel}>
                    <i className="fas fa-cloud-upload-alt"></i>
                    <span>Click to upload or drag and drop</span>
                    <small>PDF, DOC, JPG, PNG (Max 10MB each)</small>
                  </label>
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

      {/* Ship Via Popup */}
      <ShipViaPopup
        isOpen={isShipViaPopupOpen}
        onClose={handleShipViaPopupClose}
        onSave={handleShipViaSave}
      />
    </div>
  )
}
