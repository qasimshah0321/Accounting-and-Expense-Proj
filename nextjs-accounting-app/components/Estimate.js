'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './Invoice.module.css'
import CustomerPopup from './CustomerPopup'
import TaxPopup from './TaxPopup'
import * as api from '../lib/api'

export default function Estimate({ isOpen, onClose, taxes, onTaxUpdate }) {
  // ─── List state ───────────────────────────────────────────────────────────
  const [estimates, setEstimates] = useState([])
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingEstimate, setEditingEstimate] = useState(null)

  // ─── Form state ───────────────────────────────────────────────────────────
  const [lineItems, setLineItems] = useState([
    { id: 1, sku: '', description: '', quantity: 1, rate: 0, amount: 0 }
  ])
  const [customers, setCustomers] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState(null)
  const [customerSearchText, setCustomerSearchText] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [isCustomerPopupOpen, setIsCustomerPopupOpen] = useState(false)
  const [estimateDate, setEstimateDate] = useState(new Date().toISOString().split('T')[0])
  const [billTo, setBillTo] = useState('')
  const [shipTo, setShipTo] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedTax, setSelectedTax] = useState(null)
  const [isTaxPopupOpen, setIsTaxPopupOpen] = useState(false)
  const [showTaxDropdown, setShowTaxDropdown] = useState(false)
  const [estimateNo, setEstimateNo] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const autocompleteRef = useRef(null)
  const taxDropdownRef = useRef(null)

  // ─── Data loading ─────────────────────────────────────────────────────────
  const loadEstimates = useCallback(async () => {
    setLoading(true)
    setListError('')
    try {
      const res = await api.getEstimates()
      setEstimates(res.data?.estimates || res.data || [])
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
      loadEstimates()
      loadCustomers()
    }
  }, [isOpen, loadEstimates, loadCustomers])

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
    if (showForm && !editingEstimate && taxes && taxes.length > 0 && !selectedTax) {
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
    setSelectedCustomer('')
    setSelectedCustomerId(null)
    setCustomerSearchText('')
    setEstimateDate(new Date().toISOString().split('T')[0])
    setBillTo('')
    setShipTo('')
    setNotes('')
    setSelectedTax(taxes.find(t => t.is_default) || taxes[0] || null)
    setError('')
    try {
      const res = await api.getNextEstimateNumber()
      setEstimateNo(res.data?.estimate_no || res.estimate_no || '')
    } catch { setEstimateNo('') }
  }

  const populateForm = (estimate) => {
    setEstimateNo(estimate.estimate_no || '')
    setSelectedCustomer(estimate.customer_name || '')
    setSelectedCustomerId(estimate.customer_id)
    setCustomerSearchText(estimate.customer_name || '')
    setEstimateDate(estimate.estimate_date ? estimate.estimate_date.split('T')[0] : new Date().toISOString().split('T')[0])
    setBillTo(estimate.bill_to || '')
    setShipTo(estimate.ship_to || '')
    setNotes(estimate.notes || '')
    if (estimate.line_items && estimate.line_items.length > 0) {
      setLineItems(estimate.line_items.map((item, idx) => ({
        id: idx + 1,
        sku: item.sku || '',
        description: item.description || '',
        quantity: parseFloat(item.ordered_qty) || 1,
        rate: parseFloat(item.rate) || 0,
        amount: parseFloat(item.amount) || 0,
      })))
    } else {
      setLineItems([{ id: 1, sku: '', description: '', quantity: 1, rate: 0, amount: 0 }])
    }
    if (estimate.tax_id) {
      setSelectedTax(taxes.find(t => t.id === estimate.tax_id) || null)
    } else {
      setSelectedTax(null)
    }
    setError('')
  }

  // ─── List actions ─────────────────────────────────────────────────────────
  const handleNewEstimate = async () => {
    await resetForm()
    setEditingEstimate(null)
    setShowForm(true)
  }

  const handleEditEstimate = async (estimate) => {
    setListError('')
    try {
      const res = await api.getEstimate(estimate.id)
      const full = res.data || res
      setEditingEstimate(full)
      populateForm(full)
      setShowForm(true)
    } catch (err) {
      setListError('Failed to load estimate: ' + err.message)
    }
  }

  const handleDeleteEstimate = async (id) => {
    if (!confirm('Are you sure you want to delete this estimate?')) return
    setListError('')
    try {
      await api.deleteEstimate(id)
      setEstimates(prev => prev.filter(e => e.id !== id))
    } catch (err) {
      setListError('Delete failed: ' + err.message)
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingEstimate(null)
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
  const calculateTax = () => selectedTax ? calculateSubtotal() * selectedTax.rate / 100 : 0
  const calculateTotal = () => calculateSubtotal() + calculateTax()

  const handleSave = async () => {
    setError('')
    if (!selectedCustomerId) { setError('Please select a customer'); return }
    const validItems = lineItems.filter(item => item.description.trim())
    if (validItems.length === 0) { setError('Add at least one line item with a description'); return }
    if (!estimateDate) { setError('Estimate date is required'); return }
    setSaving(true)
    const taxRate = selectedTax ? Number(selectedTax.rate) || 0 : 0
    const payload = {
      ...(estimateNo && !editingEstimate ? { estimate_no: estimateNo } : {}),
      customer_id: selectedCustomerId,
      estimate_date: estimateDate,
      bill_to: billTo,
      ship_to: shipTo,
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
      if (editingEstimate) {
        await api.updateEstimate(editingEstimate.id, payload)
      } else {
        await api.createEstimate(payload)
      }
      setShowForm(false)
      setEditingEstimate(null)
      loadEstimates()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ─── List display helpers ─────────────────────────────────────────────────
  const filteredEstimates = estimates.filter(e =>
    (e.estimate_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString()
  }

  const formatCurrency = (amount) => '$' + (parseFloat(amount) || 0).toFixed(2)

  const getStatusClass = (status) => {
    switch (status) {
      case 'sent': return styles.statusSent
      case 'accepted': return styles.statusPaid
      case 'declined': return styles.statusOverdue
      case 'expired': return styles.statusCancelled
      default: return styles.statusDraft
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Estimates List View ───────────────────────────────────────────── */}
      <div className={styles.invoiceListOverlay}>
        <div className={styles.invoiceListContainer}>

          <div className={styles.listHeader}>
            <div className={styles.listHeaderLeft}>
              <h2>Estimates / Quotations</h2>
            </div>
            <div className={styles.listHeaderRight}>
              <button className={styles.btnNewInvoice} onClick={handleNewEstimate}>
                <i className="fas fa-plus"></i> New Estimate
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
                placeholder="Search by estimate # or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className={styles.btnRefresh} onClick={loadEstimates} title="Refresh">
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
                <p>Loading estimates...</p>
              </div>
            ) : filteredEstimates.length > 0 ? (
              <table className={styles.invoiceTable}>
                <thead>
                  <tr>
                    <th>Estimate #</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEstimates.map((e) => (
                    <tr key={e.id}>
                      <td><strong>{e.estimate_no || '-'}</strong></td>
                      <td>{e.customer_name || '-'}</td>
                      <td>{formatDate(e.estimate_date)}</td>
                      <td>{formatCurrency(e.grand_total)}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${getStatusClass(e.status)}`}>
                          {e.status || 'draft'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actionButtons}>
                          <button className={styles.btnEdit} title="Edit" onClick={() => handleEditEstimate(e)}>
                            <i className="fas fa-edit"></i>
                          </button>
                          <button className={styles.btnDelete} title="Delete" onClick={() => handleDeleteEstimate(e.id)}>
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
                <i className="fas fa-file-contract"></i>
                <h3>No estimates found</h3>
                <p>{searchTerm ? 'Try adjusting your search' : 'Click "New Estimate" to create your first estimate'}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Estimate Form Popup ───────────────────────────────────────────── */}
      {showForm && (
        <div className={styles.invoicePopupOverlay}>
          <div className={styles.invoicePopup}>

            <div className={styles.popupHeader}>
              <div className={styles.headerLeft}>
                <h2>{editingEstimate ? `Edit Estimate ${editingEstimate.estimate_no || ''}` : 'Create Estimate / Quotation'}</h2>
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
                    </div>

                    <div className={styles.invoiceDetailsColumn}>
                      <div className={styles.formGroup}>
                        <label>Est./Quotation No.</label>
                        <input type="text" className={styles.formControlStandard} value={estimateNo} placeholder="e.g. EST-001" onChange={(e) => setEstimateNo(e.target.value)} readOnly={!!editingEstimate} style={editingEstimate ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}} />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Date</label>
                        <input type="date" className={styles.formControlStandard} value={estimateDate} onChange={(e) => setEstimateDate(e.target.value)} />
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
                          <th className={styles.colQuantity}>Quantity</th>
                          <th className={styles.colRate}>Rate</th>
                          <th className={styles.colAmount}>Amount</th>
                          <th className={styles.colAction}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map((item) => (
                          <tr key={item.id}>
                            <td><input type="text" className={styles.formControlTable} placeholder="SKU" value={item.sku} onChange={(e) => updateLineItem(item.id, 'sku', e.target.value)} onFocus={() => handleFieldFocus(item.id)} /></td>
                            <td><input type="text" className={styles.formControlTable} placeholder="Item description" value={item.description} onChange={(e) => updateLineItem(item.id, 'description', e.target.value)} onFocus={() => handleFieldFocus(item.id)} /></td>
                            <td><input type="number" className={styles.formControlTable} value={item.quantity} min="1" onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)} onFocus={() => handleFieldFocus(item.id)} /></td>
                            <td><input type="number" className={styles.formControlTable} value={item.rate} min="0" step="0.01" onChange={(e) => updateLineItem(item.id, 'rate', parseFloat(e.target.value) || 0)} onFocus={() => handleFieldFocus(item.id)} /></td>
                            <td className={styles.amountCell}>${item.amount.toFixed(2)}</td>
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
                          <input type="file" id="estimateFileUpload" className={styles.fileInput} multiple />
                          <label htmlFor="estimateFileUpload" className={styles.fileUploadLabel}>
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
                          <span className={styles.totalValue}>${calculateTax().toFixed(2)}</span>
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

            <div className={styles.popupFooter}>
              <div className={styles.footerLeft}>
                {error && <span style={{ color: '#ef4444', fontSize: '14px' }}>{error}</span>}
                <button className={styles.btnCancel} onClick={handleFormClose}>Cancel</button>
              </div>
              <div className={styles.footerRight}>
                <button className={styles.btnSecondary} onClick={handleSave} disabled={saving}>
                  <i className={saving ? 'fas fa-spinner fa-spin' : 'fas fa-save'}></i>
                  {saving ? 'Saving...' : editingEstimate ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
          </div>

          <CustomerPopup isOpen={isCustomerPopupOpen} onClose={handleCustomerPopupClose} onSave={handleCustomerSave} />
          <TaxPopup isOpen={isTaxPopupOpen} onClose={handleTaxPopupClose} onSave={handleTaxSave} />
        </div>
      )}
    </>
  )
}
