'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './Invoice.module.css'
import VendorPopup from './VendorPopup'
import * as api from '../lib/api'

export default function RequestForQuotation({ isOpen, onClose, taxes, onDirtyChange = () => {}, user, currencySymbol = '$' }) {
  // ─── List state ───────────────────────────────────────────────────────────
  const [rfqs, setRfqs] = useState([])
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingRFQ, setEditingRFQ] = useState(null)
  const [viewMode, setViewMode] = useState(false)

  // ─── Form state ───────────────────────────────────────────────────────────
  const [lineItems, setLineItems] = useState([{ id: 1, sku: '', description: '', quantity: 1, rate: 0, amount: 0 }])
  const [vendors, setVendors] = useState([])
  const [selectedVendor, setSelectedVendor] = useState('')
  const [selectedVendorId, setSelectedVendorId] = useState(null)
  const [vendorSearchText, setVendorSearchText] = useState('')
  const [showVendorDropdown, setShowVendorDropdown] = useState(false)
  const [isVendorPopupOpen, setIsVendorPopupOpen] = useState(false)
  const [rfqNo, setRfqNo] = useState('')
  const [rfqDate, setRfqDate] = useState(new Date().toISOString().split('T')[0])
  const [requiredByDate, setRequiredByDate] = useState('')
  const [referenceNo, setReferenceNo] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [products, setProducts] = useState([])
  const [activeItemId, setActiveItemId] = useState(null)
  const [activeField, setActiveField] = useState(null)

  // ─── Convert to PO dialog ─────────────────────────────────────────────────
  const [convertDialog, setConvertDialog] = useState(null)
  const [convertDate, setConvertDate] = useState('')
  const [converting, setConverting] = useState(false)

  const autocompleteRef = useRef(null)

  // ─── Data loading ─────────────────────────────────────────────────────────
  const loadRFQs = useCallback(async () => {
    setLoading(true); setListError('')
    try {
      const res = await api.getRFQs()
      setRfqs(res.data?.rfqs || res.data || [])
    } catch (err) { setListError(err.message) }
    finally { setLoading(false) }
  }, [])

  const loadVendors = useCallback(async () => {
    try {
      const res = await api.getVendors()
      setVendors(res.data?.vendors || res.vendors || [])
    } catch {}
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadRFQs()
      loadVendors()
      api.getProducts().then(res => setProducts(res.data?.products || [])).catch(() => {})
    }
  }, [isOpen, loadRFQs, loadVendors])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target)) setShowVendorDropdown(false)
    }
    if (showVendorDropdown) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showVendorDropdown])

  if (!isOpen) return null

  // ─── Form helpers ─────────────────────────────────────────────────────────
  const resetForm = async () => {
    setLineItems([{ id: 1, sku: '', description: '', quantity: 1, rate: 0, amount: 0 }])
    setSelectedVendor(''); setSelectedVendorId(null); setVendorSearchText('')
    setRfqDate(new Date().toISOString().split('T')[0])
    setRequiredByDate(''); setReferenceNo(''); setNotes(''); setError('')
    try {
      const res = await api.getNextRFQNumber()
      setRfqNo(res.data?.rfq_no || '')
    } catch { setRfqNo('') }
  }

  const populateForm = (rfq) => {
    setRfqNo(rfq.rfq_no || '')
    setSelectedVendor(rfq.vendor_name || '')
    setSelectedVendorId(rfq.vendor_id)
    setVendorSearchText(rfq.vendor_name || '')
    setRfqDate(rfq.rfq_date ? rfq.rfq_date.split('T')[0] : new Date().toISOString().split('T')[0])
    setRequiredByDate(rfq.required_by_date ? rfq.required_by_date.split('T')[0] : '')
    setReferenceNo(rfq.reference_no || '')
    setNotes(rfq.notes || '')
    if (rfq.line_items?.length > 0) {
      setLineItems(rfq.line_items.map((item, idx) => ({
        id: idx + 1,
        sku: item.sku || '',
        description: item.description || '',
        quantity: parseFloat(item.ordered_qty) || 1,
        rate: parseFloat(item.rate) || 0,
        amount: (parseFloat(item.ordered_qty) || 1) * (parseFloat(item.rate) || 0),
      })))
    } else {
      setLineItems([{ id: 1, sku: '', description: '', quantity: 1, rate: 0, amount: 0 }])
    }
    setError('')
  }

  // ─── List actions ─────────────────────────────────────────────────────────
  const handleNew = async () => {
    await resetForm(); setEditingRFQ(null); onDirtyChange(false); setShowForm(true)
  }

  const handleEdit = async (rfq) => {
    setListError('')
    try {
      const res = await api.getRFQ(rfq.id)
      const full = res.data || res
      setEditingRFQ(full); populateForm(full); setViewMode(false); setShowForm(true)
    } catch (err) { setListError('Failed to load RFQ: ' + err.message) }
  }

  const handleView = async (rfq) => {
    setListError('')
    try {
      const res = await api.getRFQ(rfq.id)
      const full = res.data || res
      setEditingRFQ(full); populateForm(full); setViewMode(true); setShowForm(true)
    } catch (err) { setListError('Failed to load RFQ: ' + err.message) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this RFQ?')) return
    try { await api.deleteRFQ(id); setRfqs(prev => prev.filter(r => r.id !== id)) }
    catch (err) { setListError('Delete failed: ' + err.message) }
  }

  const handleStatusChange = async (id, newStatus) => {
    setListError('')
    try { await api.updateRFQStatus(id, newStatus); loadRFQs() }
    catch (err) { setListError('Status update failed: ' + err.message) }
  }

  const handleConvertToPO = (rfq) => {
    setConvertDialog({ rfq }); setConvertDate(new Date().toISOString().split('T')[0])
  }

  const doConvert = async () => {
    setConverting(true)
    try {
      await api.convertRFQToPO(convertDialog.rfq.id, { order_date: convertDate })
      setConvertDialog(null); loadRFQs()
    } catch (err) { setListError('Convert failed: ' + err.message); setConvertDialog(null) }
    finally { setConverting(false) }
  }

  const handleFormClose = () => { onDirtyChange(false); setShowForm(false); setEditingRFQ(null); setViewMode(false) }

  // ─── Vendor helpers ───────────────────────────────────────────────────────
  const filteredVendors = vendors.filter(v => (v.name || '').toLowerCase().includes(vendorSearchText.toLowerCase()))

  const handleVendorSelect = (vendorName) => {
    const vendor = vendors.find(v => v.name === vendorName)
    setSelectedVendor(vendorName); setSelectedVendorId(vendor?.id || null)
    setVendorSearchText(vendorName); setShowVendorDropdown(false)
  }

  const handleVendorSave = (newVendor) => {
    setVendors(prev => [...prev, newVendor])
    setSelectedVendor(newVendor.name); setSelectedVendorId(newVendor.id)
    setVendorSearchText(newVendor.name); setIsVendorPopupOpen(false)
  }

  // ─── Line item helpers ────────────────────────────────────────────────────
  const addLineItem = () => {
    const newId = lineItems.length > 0 ? Math.max(...lineItems.map(i => i.id)) + 1 : 1
    setLineItems([...lineItems, { id: newId, sku: '', description: '', quantity: 1, rate: 0, amount: 0 }])
  }

  const handleFieldFocus = (itemId) => { if (lineItems[lineItems.length - 1].id === itemId) addLineItem() }

  const removeLineItem = (id) => { if (lineItems.length > 1) setLineItems(lineItems.filter(i => i.id !== id)) }

  const updateLineItem = (id, field, value) => {
    onDirtyChange(true)
    setLineItems(lineItems.map(item => {
      if (item.id !== id) return item
      const updated = { ...item, [field]: value }
      if (field === 'quantity' || field === 'rate') updated.amount = updated.quantity * updated.rate
      return updated
    }))
  }

  const getProductSuggestions = (itemId, field) => {
    const item = lineItems.find(i => i.id === itemId)
    if (!item || !products.length) return []
    const q = (field === 'sku' ? item.sku : item.description).toLowerCase()
    if (!q) return []
    return products.filter(p =>
      (p.sku || '').toLowerCase().includes(q) || (p.name || '').toLowerCase().includes(q)
    ).slice(0, 8)
  }

  const handleProductSelect = (product, itemId) => {
    const price = parseFloat(product.selling_price) || parseFloat(product.unit_price) || 0
    setLineItems(prev => prev.map(item => {
      if (item.id !== itemId) return item
      return { ...item, sku: product.sku || '', description: product.description || product.name || '', rate: price, amount: (item.quantity || 1) * price }
    }))
    onDirtyChange(true); setActiveItemId(null); setActiveField(null)
  }

  // ─── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setError('')
    if (!selectedVendorId) { setError('Please select a vendor'); return }
    const validItems = lineItems.filter(item => item.description.trim())
    if (validItems.length === 0) { setError('Add at least one line item'); return }
    if (!rfqDate) { setError('RFQ date is required'); return }
    setSaving(true)
    const payload = {
      ...(rfqNo && !editingRFQ ? { rfq_no: rfqNo } : {}),
      vendor_id: selectedVendorId,
      rfq_date: rfqDate,
      required_by_date: requiredByDate || undefined,
      reference_no: referenceNo || undefined,
      notes: notes || undefined,
      line_items: validItems.map(item => ({
        sku: item.sku || undefined,
        description: item.description,
        ordered_qty: Number(item.quantity) || 1,
        rate: Number(item.rate) || 0,
      })),
    }
    try {
      if (editingRFQ) { await api.updateRFQ(editingRFQ.id, payload) }
      else { await api.createRFQ(payload) }
      onDirtyChange(false); setShowForm(false); setEditingRFQ(null); loadRFQs()
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  // ─── Display helpers ──────────────────────────────────────────────────────
  const filteredRFQs = rfqs.filter(r =>
    (r.rfq_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.vendor_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : '-'
  const formatCurrency = (amount) => currencySymbol + (parseFloat(amount) || 0).toFixed(2)

  const getStatusClass = (status) => {
    switch (status) {
      case 'sent': return styles.statusSent
      case 'quoted': return styles.statusDraft
      case 'accepted': return styles.statusPaid
      case 'rejected': return styles.statusOverdue
      case 'cancelled': return styles.statusCancelled
      default: return styles.statusDraft
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── List View ─────────────────────────────────────────────────────── */}
      <div className={styles.invoiceListOverlay}>
        <div className={styles.invoiceListContainer}>

          <div className={styles.listHeader}>
            <div className={styles.listHeaderLeft}>
              <h2>Request for Quotation</h2>
            </div>
            <div className={styles.listHeaderRight}>
              <button className={styles.btnNewInvoice} onClick={handleNew}>
                <i className="fas fa-plus"></i> New RFQ
              </button>
              <button className={styles.closeBtn} onClick={onClose}>
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>

          <div className={styles.searchSection}>
            <div className={styles.searchWrapper}>
              <i className="fas fa-search"></i>
              <input type="text" className={styles.searchInput} placeholder="Search by RFQ # or vendor..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <button className={styles.btnRefresh} onClick={loadRFQs} title="Refresh">
              <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
            </button>
          </div>

          {listError && <div className={styles.errorBanner}><i className="fas fa-exclamation-circle"></i> {listError}</div>}

          <div className={styles.invoiceGridContainer}>
            {loading ? (
              <div className={styles.loadingState}><i className="fas fa-spinner fa-spin"></i><p>Loading RFQs...</p></div>
            ) : filteredRFQs.length > 0 ? (
              <table className={styles.invoiceTable}>
                <thead>
                  <tr>
                    <th>RFQ #</th>
                    <th>Vendor</th>
                    <th>Date</th>
                    <th>Required By</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRFQs.map(r => (
                    <tr key={r.id}>
                      <td><strong>{r.rfq_no || '-'}</strong></td>
                      <td>{r.vendor_name || '-'}</td>
                      <td>{formatDate(r.rfq_date)}</td>
                      <td>{formatDate(r.required_by_date)}</td>
                      <td>{formatCurrency(r.grand_total)}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${getStatusClass(r.status)}`}>
                          {r.status || 'draft'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actionButtons}>
                          <button title="View" onClick={() => handleView(r)}
                            style={{ fontSize: 11, padding: '2px 8px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                            <i className="fas fa-eye"></i>
                          </button>
                          {r.status === 'draft' && <>
                            <button title="Send to Vendor" onClick={() => handleStatusChange(r.id, 'sent')}
                              style={{ fontSize: 11, padding: '2px 8px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                              <i className="fas fa-paper-plane"></i>
                            </button>
                            <button className={styles.btnEdit} title="Edit" onClick={() => handleEdit(r)}>
                              <i className="fas fa-edit"></i>
                            </button>
                            <button className={styles.btnDelete} title="Delete" onClick={() => handleDelete(r.id)}>
                              <i className="fas fa-trash"></i>
                            </button>
                          </>}
                          {r.status === 'sent' && (
                            <button title="Mark Quoted" onClick={() => handleStatusChange(r.id, 'quoted')}
                              style={{ fontSize: 11, padding: '2px 8px', background: '#d97706', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                              <i className="fas fa-tag"></i> Quoted
                            </button>
                          )}
                          {r.status === 'quoted' && <>
                            <button title="Accept Quote" onClick={() => handleStatusChange(r.id, 'accepted')}
                              style={{ fontSize: 11, padding: '2px 8px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                              <i className="fas fa-check"></i>
                            </button>
                            <button title="Reject Quote" onClick={() => handleStatusChange(r.id, 'rejected')}
                              style={{ fontSize: 11, padding: '2px 8px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                              <i className="fas fa-times"></i>
                            </button>
                          </>}
                          {(r.status === 'quoted' || r.status === 'accepted') && !r.converted_to_po && (
                            <button title="Convert to Purchase Order" onClick={() => handleConvertToPO(r)}
                              style={{ fontSize: 11, padding: '2px 8px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                              <i className="fas fa-exchange-alt"></i> Convert to PO
                            </button>
                          )}
                          {r.converted_to_po && (
                            <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>
                              <i className="fas fa-check-circle"></i> PO Created
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.emptyState} style={{ textAlign: 'center', padding: '48px 20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <i className="fas fa-envelope-open-text" style={{ fontSize: 48, color: '#e2e8f0' }} />
                  <h3 style={{ margin: '8px 0 4px', fontSize: 18, fontWeight: 600, color: '#4a5568' }}>No RFQs Yet</h3>
                  <p style={{ margin: 0, color: '#a0aec0', fontSize: 14 }}>{searchTerm ? 'Try adjusting your search' : 'Create your first request for quotation'}</p>
                  {!searchTerm && (
                    <button style={{ marginTop: 12, background: '#2CA01C', color: 'white', border: 'none', padding: '9px 20px', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}
                      onClick={handleNew}>+ New RFQ</button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Form Popup ────────────────────────────────────────────────────── */}
      {showForm && (
        <div className={styles.invoicePopupOverlay}>
          <div className={styles.invoicePopup}>

            <div className={styles.popupHeader}>
              <div className={styles.headerLeft}>
                <h2>{viewMode ? `View RFQ ${editingRFQ?.rfq_no || ''}` : editingRFQ ? `Edit RFQ ${editingRFQ.rfq_no || ''}` : 'Create Request for Quotation'}</h2>
              </div>
              <div className={styles.headerRight}>
                <button className={styles.closeBtn} onClick={handleFormClose}><i className="fas fa-times"></i></button>
              </div>
            </div>

            <div className={styles.popupContent}>
              <div className={styles.invoiceUpperSection}>
                <div className={styles.sectionCard}>
                  <div className={styles.invoiceHeaderRow}>
                    <div className={styles.customerSection}>
                      <div className={styles.formGroup}>
                        <label>Vendor</label>
                        <div className={styles.autocompleteWrapper} ref={autocompleteRef}>
                          <input
                            type="text" className={styles.formControlStandard}
                            placeholder="Search or select vendor"
                            value={vendorSearchText}
                            onChange={e => { setVendorSearchText(e.target.value); setShowVendorDropdown(true); if (!e.target.value) { setSelectedVendor(''); setSelectedVendorId(null) } }}
                            onFocus={() => !viewMode && setShowVendorDropdown(true)}
                            readOnly={viewMode}
                            style={viewMode ? { backgroundColor: '#f5f5f5', cursor: 'default' } : {}}
                          />
                          {!viewMode && showVendorDropdown && (
                            <div className={styles.autocompleteDropdown}>
                              <div className={styles.autocompleteOption + ' ' + styles.addNewOption} onClick={() => { setIsVendorPopupOpen(true); setShowVendorDropdown(false) }}>
                                <i className="fas fa-plus"></i> Add New Vendor
                              </div>
                              {filteredVendors.length > 0 ? filteredVendors.map(v => (
                                <div key={v.id} className={styles.autocompleteOption} onClick={() => handleVendorSelect(v.name)}>{v.name}</div>
                              )) : vendorSearchText && <div className={styles.autocompleteOption + ' ' + styles.noResults}>No vendors found</div>}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className={styles.invoiceDetailsColumn}>
                      <div className={styles.formGroup}>
                        <label>RFQ No.</label>
                        <input type="text" className={styles.formControlStandard} value={rfqNo} onChange={e => setRfqNo(e.target.value)} readOnly={!!editingRFQ} style={editingRFQ ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}} />
                      </div>
                      <div className={styles.formGroup}>
                        <label>RFQ Date</label>
                        <input type="date" className={styles.formControlStandard} value={rfqDate} onChange={e => setRfqDate(e.target.value)} readOnly={viewMode} />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Required By</label>
                        <input type="date" className={styles.formControlStandard} value={requiredByDate} onChange={e => setRequiredByDate(e.target.value)} readOnly={viewMode} />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Reference No.</label>
                        <input type="text" className={styles.formControlStandard} placeholder="Optional reference" value={referenceNo} onChange={e => setReferenceNo(e.target.value)} readOnly={viewMode} />
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
                        {lineItems.map(item => (
                          <tr key={item.id}>
                            <td>
                              <div style={{ position: 'relative' }}>
                                <input type="text" className={styles.formControlTable} placeholder="SKU" value={item.sku}
                                  onChange={e => updateLineItem(item.id, 'sku', e.target.value)}
                                  onFocus={() => { if (!viewMode) { handleFieldFocus(item.id); setActiveItemId(item.id); setActiveField('sku') } }}
                                  onBlur={() => setTimeout(() => { setActiveItemId(null); setActiveField(null) }, 150)}
                                  readOnly={viewMode} />
                                {activeItemId === item.id && activeField === 'sku' && getProductSuggestions(item.id, 'sku').length > 0 && (
                                  <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 9999, background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: 280, maxHeight: 220, overflowY: 'auto' }}>
                                    {getProductSuggestions(item.id, 'sku').map(p => (
                                      <div key={p.id} onMouseDown={() => handleProductSelect(p, item.id)}
                                        style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                                        <div>
                                          <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                                          {p.sku && <div style={{ fontSize: 11, color: '#64748b' }}>SKU: {p.sku}</div>}
                                        </div>
                                        <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>{currencySymbol}{parseFloat(p.selling_price || 0).toFixed(2)}</div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td>
                              <div style={{ position: 'relative' }}>
                                <input type="text" className={styles.formControlTable} placeholder="Item description" value={item.description}
                                  onChange={e => updateLineItem(item.id, 'description', e.target.value)}
                                  onFocus={() => { if (!viewMode) { handleFieldFocus(item.id); setActiveItemId(item.id); setActiveField('description') } }}
                                  onBlur={() => setTimeout(() => { setActiveItemId(null); setActiveField(null) }, 150)}
                                  readOnly={viewMode} />
                                {activeItemId === item.id && activeField === 'description' && getProductSuggestions(item.id, 'description').length > 0 && (
                                  <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 9999, background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: 280, maxHeight: 220, overflowY: 'auto' }}>
                                    {getProductSuggestions(item.id, 'description').map(p => (
                                      <div key={p.id} onMouseDown={() => handleProductSelect(p, item.id)}
                                        style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                                        <div>
                                          <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                                          {p.description && <div style={{ fontSize: 11, color: '#94a3b8' }}>{p.description.slice(0, 50)}</div>}
                                        </div>
                                        <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>{currencySymbol}{parseFloat(p.selling_price || 0).toFixed(2)}</div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td><input type="number" className={styles.formControlTable} value={item.quantity} min="1" step="1" onChange={e => updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 0)} onFocus={() => handleFieldFocus(item.id)} readOnly={viewMode} /></td>
                            <td><input type="number" className={styles.formControlTable} value={item.rate} min="0" step="0.01" onChange={e => updateLineItem(item.id, 'rate', parseFloat(e.target.value) || 0)} onFocus={() => !viewMode && handleFieldFocus(item.id)} readOnly={viewMode} /></td>
                            <td className={styles.amountCell}>{currencySymbol}{item.amount.toFixed(2)}</td>
                            <td className={styles.actionCell}>
                              <button className={styles.btnRemove} onClick={() => removeLineItem(item.id)} disabled={lineItems.length === 1 || viewMode}>
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
                        <textarea className={styles.formControlStandard} rows="3" placeholder="Add any notes..." value={notes} onChange={e => setNotes(e.target.value)} readOnly={viewMode}></textarea>
                      </div>
                    </div>
                    <div className={styles.totalsSection}>
                      <div className={styles.totalsGrid}>
                        <div className={styles.totalRow}>
                          <span className={styles.totalLabel}>Subtotal:</span>
                          <span className={styles.totalValue}>{currencySymbol}{lineItems.reduce((s, i) => s + i.amount, 0).toFixed(2)}</span>
                        </div>
                        <div className={`${styles.totalRow} ${styles.grandTotal}`}>
                          <span className={styles.totalLabel}>Total:</span>
                          <span className={styles.totalValue}>{currencySymbol}{lineItems.reduce((s, i) => s + i.amount, 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.popupFooter}>
              <div className={styles.footerLeft}>
                {error && <span style={{ color: '#ef4444', fontSize: 14 }}>{error}</span>}
                <button className={styles.btnCancel} onClick={handleFormClose}>{viewMode ? 'Close' : 'Cancel'}</button>
              </div>
              {!viewMode && (
                <div className={styles.footerRight}>
                  <button className={styles.btnSecondary} onClick={handleSave} disabled={saving}>
                    <i className={saving ? 'fas fa-spinner fa-spin' : 'fas fa-save'}></i>
                    {saving ? 'Saving...' : editingRFQ ? 'Update' : 'Save'}
                  </button>
                </div>
              )}
            </div>

            <VendorPopup isOpen={isVendorPopupOpen} onClose={() => setIsVendorPopupOpen(false)} onSave={handleVendorSave} />
          </div>
        </div>
      )}

      {/* ── Convert to PO Dialog ──────────────────────────────────────────── */}
      {convertDialog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, maxWidth: 400, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 17, color: '#1e293b' }}>
              <i className="fas fa-exchange-alt" style={{ color: '#7c3aed', marginRight: 8 }}></i>
              Convert to Purchase Order
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b' }}>
              RFQ <strong>{convertDialog.rfq.rfq_no}</strong> will be converted to a Purchase Order.
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#374151' }}>Order Date *</label>
              <input type="date" value={convertDate} onChange={e => setConvertDate(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setConvertDialog(null)} style={{ padding: '8px 18px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={doConvert} disabled={converting || !convertDate}
                style={{ padding: '8px 18px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                {converting ? <><i className="fas fa-spinner fa-spin"></i> Converting...</> : 'Convert to PO'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
