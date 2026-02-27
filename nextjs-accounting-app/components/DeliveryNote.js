'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './Invoice.module.css'
import CustomerPopup from './CustomerPopup'
import ShipViaPopup from './ShipViaPopup'
import * as api from '../lib/api'

export default function DeliveryNote({ isOpen, onClose, shipVias, onShipViaUpdate }) {
  // ─── List state ───────────────────────────────────────────────────────────
  const [deliveryNotes, setDeliveryNotes] = useState([])
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingNote, setEditingNote] = useState(null)

  // ─── Form state ───────────────────────────────────────────────────────────
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

  // ─── Data loading ─────────────────────────────────────────────────────────
  const loadDeliveryNotes = useCallback(async () => {
    setLoading(true)
    setListError('')
    try {
      const res = await api.getDeliveryNotes()
      setDeliveryNotes(res.data?.delivery_notes || res.data || [])
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
      loadDeliveryNotes()
      loadCustomers()
    }
  }, [isOpen, loadDeliveryNotes, loadCustomers])

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
    if (showForm && !editingNote && shipVias && shipVias.length > 0 && !selectedShipVia) {
      const activeShipVias = shipVias.filter(sv => sv.is_active)
      if (activeShipVias.length > 0) setSelectedShipVia(activeShipVias[0])
    }
  }, [showForm, shipVias])

  if (!isOpen) return null

  // ─── Form helpers ─────────────────────────────────────────────────────────
  const formatAddress = (address, city, state, postalCode, country) => {
    const parts = [address, city, state, postalCode, country].filter(p => p && p.trim() !== '')
    return parts.join(', ')
  }

  const resetForm = () => {
    setLineItems([{ id: 1, sku: '', description: '', ordered: 0, shipped: 0, backordered: 0 }])
    setSelectedCustomer('')
    setSelectedCustomerId(null)
    setCustomerSearchText('')
    setDeliveryDate(new Date().toISOString().split('T')[0])
    setDueDate('')
    setShipmentDate('')
    setPoNumber('')
    setRefNumber('')
    setBillTo('')
    setShipTo('')
    setNotes('')
    const activeShipVias = shipVias ? shipVias.filter(sv => sv.is_active) : []
    setSelectedShipVia(activeShipVias[0] || null)
    setError('')
  }

  const populateForm = (note) => {
    setSelectedCustomer(note.customer_name || '')
    setSelectedCustomerId(note.customer_id)
    setCustomerSearchText(note.customer_name || '')
    setDeliveryDate(note.delivery_date ? note.delivery_date.split('T')[0] : new Date().toISOString().split('T')[0])
    setDueDate(note.due_date ? note.due_date.split('T')[0] : '')
    setShipmentDate(note.shipment_date ? note.shipment_date.split('T')[0] : '')
    setPoNumber(note.po_number || '')
    setRefNumber(note.reference_no || '')
    setBillTo(note.bill_to || '')
    setShipTo(note.ship_to || '')
    setNotes(note.notes || '')
    if (note.ship_via_id) {
      setSelectedShipVia(shipVias.find(sv => sv.id === note.ship_via_id) || null)
    } else {
      setSelectedShipVia(null)
    }
    if (note.line_items && note.line_items.length > 0) {
      setLineItems(note.line_items.map((item, idx) => ({
        id: idx + 1,
        sku: item.sku || '',
        description: item.description || '',
        ordered: parseFloat(item.ordered_qty) || 0,
        shipped: parseFloat(item.shipped_qty) || 0,
        backordered: Math.max(0, (parseFloat(item.ordered_qty) || 0) - (parseFloat(item.shipped_qty) || 0)),
      })))
    } else {
      setLineItems([{ id: 1, sku: '', description: '', ordered: 0, shipped: 0, backordered: 0 }])
    }
    setError('')
  }

  // ─── List actions ─────────────────────────────────────────────────────────
  const handleNewNote = () => {
    resetForm()
    setEditingNote(null)
    setShowForm(true)
  }

  const handleEditNote = async (note) => {
    setListError('')
    try {
      const res = await api.getDeliveryNote(note.id)
      const full = res.data || res
      setEditingNote(full)
      populateForm(full)
      setShowForm(true)
    } catch (err) {
      setListError('Failed to load delivery note: ' + err.message)
    }
  }

  const handleDeleteNote = async (id) => {
    if (!confirm('Are you sure you want to delete this delivery note?')) return
    setListError('')
    try {
      await api.deleteDeliveryNote(id)
      setDeliveryNotes(prev => prev.filter(n => n.id !== id))
    } catch (err) {
      setListError('Delete failed: ' + err.message)
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingNote(null)
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

  const handleAddNewCustomer = () => { setIsCustomerPopupOpen(true); setShowCustomerDropdown(false) }

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

  const handleShipViaSelect = (shipVia) => { setSelectedShipVia(shipVia); setShowShipViaDropdown(false) }
  const handleAddNewShipVia = () => { setIsShipViaPopupOpen(true); setShowShipViaDropdown(false) }
  const handleShipViaPopupClose = () => setIsShipViaPopupOpen(false)
  const handleShipViaSave = (newShipVia) => { onShipViaUpdate([...shipVias, newShipVia]); setSelectedShipVia(newShipVia); setIsShipViaPopupOpen(false) }

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
    const payload = {
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
    }
    try {
      if (editingNote) {
        await api.updateDeliveryNote(editingNote.id, payload)
      } else {
        await api.createDeliveryNote(payload)
      }
      setShowForm(false)
      setEditingNote(null)
      loadDeliveryNotes()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ─── List display helpers ─────────────────────────────────────────────────
  const filteredNotes = deliveryNotes.filter(n =>
    (n.delivery_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (n.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString()
  }

  const getStatusClass = (status) => {
    switch (status) {
      case 'shipped': return styles.statusSent
      case 'delivered': return styles.statusPaid
      case 'cancelled': return styles.statusCancelled
      default: return styles.statusDraft
    }
  }

  const activeShipVias = shipVias ? shipVias.filter(sv => sv.is_active) : []

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Delivery Notes List View ──────────────────────────────────────── */}
      <div className={styles.invoiceListOverlay}>
        <div className={styles.invoiceListContainer}>

          <div className={styles.listHeader}>
            <div className={styles.listHeaderLeft}>
              <h2>Delivery Notes</h2>
            </div>
            <div className={styles.listHeaderRight}>
              <button className={styles.btnNewInvoice} onClick={handleNewNote}>
                <i className="fas fa-plus"></i> New Delivery Note
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
                placeholder="Search by DN # or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className={styles.btnRefresh} onClick={loadDeliveryNotes} title="Refresh">
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
                <p>Loading delivery notes...</p>
              </div>
            ) : filteredNotes.length > 0 ? (
              <table className={styles.invoiceTable}>
                <thead>
                  <tr>
                    <th>DN #</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Shipment Date</th>
                    <th>Ship Via</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNotes.map((n) => (
                    <tr key={n.id}>
                      <td><strong>{n.delivery_number || '-'}</strong></td>
                      <td>{n.customer_name || '-'}</td>
                      <td>{formatDate(n.delivery_date)}</td>
                      <td>{formatDate(n.shipment_date)}</td>
                      <td>{n.ship_via_name || '-'}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${getStatusClass(n.status)}`}>
                          {n.status || 'draft'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actionButtons}>
                          <button className={styles.btnEdit} title="Edit" onClick={() => handleEditNote(n)}>
                            <i className="fas fa-edit"></i>
                          </button>
                          <button className={styles.btnDelete} title="Delete" onClick={() => handleDeleteNote(n.id)}>
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
                <i className="fas fa-truck"></i>
                <h3>No delivery notes found</h3>
                <p>{searchTerm ? 'Try adjusting your search' : 'Click "New Delivery Note" to create your first delivery note'}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Delivery Note Form Popup ──────────────────────────────────────── */}
      {showForm && (
        <div className={styles.invoicePopupOverlay}>
          <div className={styles.invoicePopup}>

            <div className={styles.popupHeader}>
              <div className={styles.headerLeft}>
                <h2>{editingNote ? `Edit Delivery Note ${editingNote.delivery_number || ''}` : 'Create Delivery Note'}</h2>
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
                              <div className={styles.autocompleteOption + ' ' + styles.addNewOption} onClick={handleAddNewCustomer}>
                                <i className="fas fa-plus"></i> Add New
                              </div>
                              {filteredCustomers.length > 0 ? (
                                filteredCustomers.map(customer => (
                                  <div key={customer.id} className={styles.autocompleteOption} onClick={() => handleCustomerSelect(customer.name)}>
                                    {customer.name}
                                  </div>
                                ))
                              ) : (
                                customerSearchText && (
                                  <div className={styles.autocompleteOption + ' ' + styles.noResults}>No customers found</div>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className={styles.formGroup}>
                        <label>Bill To</label>
                        <textarea className={styles.formControlStandard} placeholder="Billing address will populate automatically" value={billTo} onChange={(e) => setBillTo(e.target.value)} rows="3" />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Ship To</label>
                        <textarea className={styles.formControlStandard} placeholder="Shipping address will populate automatically" value={shipTo} onChange={(e) => setShipTo(e.target.value)} rows="3" />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Ref. No.</label>
                        <input type="text" className={styles.formControlStandard} placeholder="REF-12345" value={refNumber} onChange={(e) => setRefNumber(e.target.value)} />
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
                              <div className={styles.autocompleteOption + ' ' + styles.addNewOption} onClick={handleAddNewShipVia}>
                                <i className="fas fa-plus"></i> Add New
                              </div>
                              {activeShipVias.length > 0 ? (
                                activeShipVias.map(sv => (
                                  <div key={sv.id} className={styles.autocompleteOption} onClick={() => handleShipViaSelect(sv)}>
                                    {sv.name}
                                  </div>
                                ))
                              ) : (
                                <div className={styles.autocompleteOption + ' ' + styles.noResults}>No active shipping methods</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className={styles.invoiceDetailsColumn}>
                      <div className={styles.formGroup}>
                        <label>DN No</label>
                        <input type="text" className={styles.formControlStandard} value={editingNote?.delivery_number || ''} placeholder="Auto-generated" readOnly style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }} />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Date</label>
                        <input type="date" className={styles.formControlStandard} value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
                      </div>
                      <div className={styles.formGroup}>
                        <label>PO No.</label>
                        <input type="text" className={styles.formControlStandard} placeholder="PO-12345" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Due Date</label>
                        <input type="date" className={styles.formControlStandard} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Shipment Date</label>
                        <input type="date" className={styles.formControlStandard} value={shipmentDate} onChange={(e) => setShipmentDate(e.target.value)} />
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
                          <th className={styles.colQuantity}>Ordered</th>
                          <th className={styles.colQuantity}>Shipped</th>
                          <th className={styles.colQuantity}>Backordered</th>
                          <th className={styles.colAction}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map((item) => (
                          <tr key={item.id}>
                            <td><input type="text" className={styles.formControlTable} placeholder="SKU" value={item.sku} onChange={(e) => updateLineItem(item.id, 'sku', e.target.value)} onFocus={() => handleFieldFocus(item.id)} /></td>
                            <td><input type="text" className={styles.formControlTable} placeholder="Item description" value={item.description} onChange={(e) => updateLineItem(item.id, 'description', e.target.value)} onFocus={() => handleFieldFocus(item.id)} /></td>
                            <td><input type="number" className={styles.formControlTable} value={item.ordered} min="0" onChange={(e) => updateLineItem(item.id, 'ordered', parseFloat(e.target.value) || 0)} onFocus={() => handleFieldFocus(item.id)} /></td>
                            <td><input type="number" className={styles.formControlTable} value={item.shipped} min="0" onChange={(e) => updateLineItem(item.id, 'shipped', parseFloat(e.target.value) || 0)} onFocus={() => handleFieldFocus(item.id)} /></td>
                            <td><input type="number" className={styles.formControlTable} value={item.backordered} min="0" onChange={(e) => updateLineItem(item.id, 'backordered', parseFloat(e.target.value) || 0)} onFocus={() => handleFieldFocus(item.id)} /></td>
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
                          <input type="file" id="dnFileUpload" className={styles.fileInput} multiple />
                          <label htmlFor="dnFileUpload" className={styles.fileUploadLabel}>
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
                          <span className={styles.totalLabel}>Total Ordered:</span>
                          <span className={styles.totalValue}>{calculateTotalOrdered()}</span>
                        </div>
                        <div className={styles.totalRow}>
                          <span className={styles.totalLabel}>Total Shipped:</span>
                          <span className={styles.totalValue}>{calculateTotalShipped()}</span>
                        </div>
                        <div className={`${styles.totalRow} ${styles.grandTotal}`}>
                          <span className={styles.totalLabel}>Backordered:</span>
                          <span className={styles.totalValue}>{calculateTotalBackordered()}</span>
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
                  {saving ? 'Saving...' : editingNote ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
          </div>

          <CustomerPopup isOpen={isCustomerPopupOpen} onClose={handleCustomerPopupClose} onSave={handleCustomerSave} />
          <ShipViaPopup isOpen={isShipViaPopupOpen} onClose={handleShipViaPopupClose} onSave={handleShipViaSave} />
        </div>
      )}
    </>
  )
}
