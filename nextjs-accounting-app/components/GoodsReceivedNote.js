'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './Invoice.module.css'
import VendorPopup from './VendorPopup'
import * as api from '../lib/api'

export default function GoodsReceivedNote({ isOpen, onClose, onDirtyChange = () => {}, user, companyProfile = null }) {
  // ─── List state ───────────────────────────────────────────────────────────
  const [grns, setGrns] = useState([])
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingGRN, setEditingGRN] = useState(null)
  const [viewMode, setViewMode] = useState(false)

  // ─── Form state ───────────────────────────────────────────────────────────
  const [grnNo, setGrnNo] = useState('')
  const [lineItems, setLineItems] = useState([
    { id: 1, sku: '', description: '', ordered: 0, received: 0, pending: 0, unit_cost: 0, product_id: null }
  ])
  const [vendors, setVendors] = useState([])
  const [selectedVendor, setSelectedVendor] = useState('')
  const [selectedVendorId, setSelectedVendorId] = useState(null)
  const [vendorSearchText, setVendorSearchText] = useState('')
  const [showVendorDropdown, setShowVendorDropdown] = useState(false)
  const [isVendorPopupOpen, setIsVendorPopupOpen] = useState(false)
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0])
  const [expectedDate, setExpectedDate] = useState('')
  const [carrier, setCarrier] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [refNumber, setRefNumber] = useState('')
  const [deliverTo, setDeliverTo] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [products, setProducts] = useState([])
  const [activeItemId, setActiveItemId] = useState(null)
  const [activeField, setActiveField] = useState(null)
  const [linkedPOId, setLinkedPOId] = useState(null)
  const [showPoPicker, setShowPoPicker] = useState(false)
  const [poPickerOrders, setPoPickerOrders] = useState([])
  const [poPickerLoading, setPoPickerLoading] = useState(false)

  const autocompleteRef = useRef(null)

  // ─── Data loading ─────────────────────────────────────────────────────────
  const loadGRNs = useCallback(async () => {
    setLoading(true); setListError('')
    try {
      const res = await api.getGRNs()
      setGrns(res.data?.grns || res.data || [])
    } catch (err) {
      setListError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadVendors = useCallback(async () => {
    try {
      const res = await api.getVendors()
      setVendors(res.data?.vendors || res.vendors || [])
    } catch {}
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadGRNs()
      loadVendors()
      api.getProducts().then(res => setProducts(res.data?.products || res.products || [])).catch(() => {})
    }
  }, [isOpen, loadGRNs, loadVendors])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target))
        setShowVendorDropdown(false)
    }
    if (showVendorDropdown) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showVendorDropdown])

  if (!isOpen) return null

  // ─── Form helpers ─────────────────────────────────────────────────────────
  const resetForm = async () => {
    setLineItems([{ id: 1, sku: '', description: '', ordered: 0, received: 0, pending: 0, unit_cost: 0, product_id: null }])
    setSelectedVendor(''); setSelectedVendorId(null); setVendorSearchText('')
    setReceiptDate(new Date().toISOString().split('T')[0])
    setExpectedDate(''); setCarrier(''); setTrackingNumber('')
    setRefNumber(''); setDeliverTo(''); setNotes('')
    setLinkedPOId(null); setPoPickerOrders([]); setShowPoPicker(false)
    setError('')
    try {
      const res = await api.getNextGRNNumber()
      setGrnNo(res.data?.next_number || 'GRN-001')
    } catch { setGrnNo('GRN-001') }
  }

  const populateForm = (grn) => {
    setGrnNo(grn.grn_no || '')
    setSelectedVendor(grn.vendor_name || '')
    setSelectedVendorId(grn.vendor_id)
    setVendorSearchText(grn.vendor_name || '')
    setReceiptDate(grn.receipt_date ? grn.receipt_date.split('T')[0] : new Date().toISOString().split('T')[0])
    setExpectedDate(grn.expected_date ? grn.expected_date.split('T')[0] : '')
    setCarrier(grn.carrier || '')
    setTrackingNumber(grn.tracking_number || '')
    setRefNumber(grn.reference_no || '')
    setDeliverTo(grn.deliver_to || '')
    setNotes(grn.notes || '')
    setLinkedPOId(grn.purchase_order_id || null)
    if (grn.line_items?.length) {
      setLineItems(grn.line_items.map((item, idx) => ({
        id: idx + 1,
        sku: item.sku || '',
        description: item.description || '',
        ordered: parseFloat(item.ordered_qty) || 0,
        received: parseFloat(item.received_qty) || 0,
        pending: Math.max(0, (parseFloat(item.ordered_qty) || 0) - (parseFloat(item.received_qty) || 0)),
        unit_cost: parseFloat(item.unit_cost) || 0,
        product_id: item.product_id || null,
        purchase_order_line_item_id: item.purchase_order_line_item_id || null,
      })))
    } else {
      setLineItems([{ id: 1, sku: '', description: '', ordered: 0, received: 0, pending: 0, unit_cost: 0, product_id: null }])
    }
    setError('')
  }

  // ─── List actions ─────────────────────────────────────────────────────────
  const handleNew = async () => {
    await resetForm(); setEditingGRN(null); onDirtyChange(false); setShowForm(true)
  }

  const handleEdit = async (grn) => {
    setListError('')
    try {
      const res = await api.getGRN(grn.id)
      const full = res.data || res
      setEditingGRN(full); populateForm(full); onDirtyChange(false); setViewMode(false); setShowForm(true)
    } catch (err) { setListError('Failed to load GRN: ' + err.message) }
  }

  const handleView = async (grn) => {
    setListError('')
    try {
      const res = await api.getGRN(grn.id)
      const full = res.data || res
      setEditingGRN(full); populateForm(full); setViewMode(true); setShowForm(true)
    } catch (err) { setListError('Failed to load GRN: ' + err.message) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this Goods Received Note?')) return
    setListError('')
    try {
      await api.deleteGRN(id)
      setGrns(prev => prev.filter(g => g.id !== id))
    } catch (err) { setListError('Delete failed: ' + err.message) }
  }

  const handleFormClose = () => {
    onDirtyChange(false); setShowForm(false); setEditingGRN(null); setViewMode(false)
  }

  const handleGrnStatus = async (id, newStatus) => {
    setListError('')
    try {
      await api.updateGRNStatus(id, newStatus)
      setGrns(prev => prev.map(g => g.id === id ? { ...g, status: newStatus } : g))
    } catch (err) { setListError('Status update failed: ' + err.message) }
  }

  const handleReceiveGoods = async (grn) => {
    if (!confirm(`Receive goods for ${grn.grn_no}? This will add stock to inventory.`)) return
    setListError('')
    try {
      await api.receiveGRNGoods(grn.id, { add_to_inventory: true })
      setGrns(prev => prev.map(g => g.id === grn.id ? { ...g, status: 'received' } : g))
    } catch (err) { setListError('Receive failed: ' + err.message) }
  }

  const handleConvertToBill = async (grn) => {
    if (!confirm(`Create a draft Bill from ${grn.grn_no}?`)) return
    setListError('')
    try {
      const due = new Date(); due.setDate(due.getDate() + 30)
      await api.convertGRNToBill(grn.id, {
        bill_date: new Date().toISOString().split('T')[0],
        due_date: due.toISOString().split('T')[0],
      })
      setGrns(prev => prev.map(g => g.id === grn.id ? { ...g, billed: true, status: 'billed' } : g))
    } catch (err) { setListError('Convert to Bill failed: ' + err.message) }
  }

  // ─── Form handlers ────────────────────────────────────────────────────────
  const handleVendorInputChange = (e) => {
    const value = e.target.value
    setVendorSearchText(value); setShowVendorDropdown(true)
    if (!value) { setSelectedVendor(''); setSelectedVendorId(null) }
  }

  const handleVendorSelect = (vendorName) => {
    const vendor = vendors.find(v => v.name === vendorName)
    setSelectedVendor(vendorName); setSelectedVendorId(vendor?.id || null)
    setVendorSearchText(vendorName); setShowVendorDropdown(false)
    setLinkedPOId(null)
    if (vendor) {
      const addr = [vendor.address, vendor.city, vendor.state, vendor.postal_code, vendor.country].filter(Boolean).join(', ')
      setDeliverTo(addr)
      fetchVendorPOs(vendor.id)
    }
  }

  const fetchVendorPOs = async (vendorId) => {
    setPoPickerLoading(true)
    try {
      const res = await api.getPurchaseOrdersForVendor(vendorId)
      const orders = res.data?.purchase_orders || []
      const actionable = orders.filter(o =>
        ['approved', 'partially_received'].includes(o.status) ||
        (o.status === 'draft' && parseFloat(o.total_ordered_qty || 0) > parseFloat(o.total_received_qty || 0))
      )
      setPoPickerOrders(actionable)
      if (actionable.length > 0) setShowPoPicker(true)
    } catch {} finally { setPoPickerLoading(false) }
  }

  const handlePoSelect = async (po) => {
    setShowPoPicker(false)
    try {
      const res = await api.getPurchaseOrder(po.id)
      const full = res.data || res
      if (full.reference_no) setRefNumber(full.reference_no)
      setLinkedPOId(full.id)
      const items = (full.line_items || [])
        .map((li, idx) => {
          const remaining = Math.max(0, parseFloat(li.ordered_qty || 0) - parseFloat(li.received_qty || 0))
          return {
            id: idx + 1,
            sku: li.sku || '',
            description: li.description || '',
            ordered: remaining,
            received: 0,
            pending: remaining,
            unit_cost: parseFloat(li.rate) || 0,
            product_id: li.product_id || null,
            purchase_order_line_item_id: li.id || null,
          }
        })
        .filter(li => li.ordered > 0)
      setLineItems(items.length > 0
        ? items
        : [{ id: 1, sku: '', description: '', ordered: 0, received: 0, pending: 0, unit_cost: 0, product_id: null }]
      )
    } catch (err) { setError('Failed to load Purchase Order: ' + err.message) }
  }

  const filteredVendors = vendors.filter(v =>
    (v.name || '').toLowerCase().includes(vendorSearchText.toLowerCase())
  )

  const handleVendorSave = (newVendor) => {
    setVendors(prev => [...prev, newVendor])
    setSelectedVendor(newVendor.name); setSelectedVendorId(newVendor.id)
    setVendorSearchText(newVendor.name); setIsVendorPopupOpen(false)
  }

  const addLineItem = () => {
    const newId = lineItems.length > 0 ? Math.max(...lineItems.map(i => i.id)) + 1 : 1
    setLineItems([...lineItems, { id: newId, sku: '', description: '', ordered: 0, received: 0, pending: 0, unit_cost: 0, product_id: null }])
  }

  const removeLineItem = (id) => {
    if (lineItems.length > 1) setLineItems(lineItems.filter(i => i.id !== id))
  }

  const updateLineItem = (id, field, value) => {
    onDirtyChange(true)
    setLineItems(lineItems.map(item => {
      if (item.id !== id) return item
      const updated = { ...item, [field]: value }
      if (field === 'ordered' || field === 'received') {
        updated.pending = Math.max(0, updated.ordered - updated.received)
      }
      return updated
    }))
  }

  const handleFieldFocus = (itemId) => {
    if (lineItems[lineItems.length - 1].id === itemId) addLineItem()
  }

  const getProductSuggestions = (itemId, field) => {
    const item = lineItems.find(i => i.id === itemId)
    if (!item || !products.length) return []
    const q = (field === 'sku' ? item.sku : item.description).toLowerCase()
    if (!q) return []
    return products.filter(p =>
      (p.sku || '').toLowerCase().includes(q) ||
      (p.name || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
    ).slice(0, 8)
  }

  const handleProductSelect = (product, itemId) => {
    const targetId = itemId ?? activeItemId
    setLineItems(prev => prev.map(item => {
      if (item.id !== targetId) return item
      return { ...item, product_id: product.id, sku: product.sku || '', description: product.description || product.name || '', unit_cost: parseFloat(product.cost_price || product.selling_price || 0) }
    }))
    onDirtyChange(true); setActiveItemId(null); setActiveField(null)
  }

  const calculateTotalOrdered = () => lineItems.reduce((s, i) => s + (i.ordered || 0), 0)
  const calculateTotalReceived = () => lineItems.reduce((s, i) => s + (i.received || 0), 0)
  const calculateTotalPending = () => lineItems.reduce((s, i) => s + (i.pending || 0), 0)
  const calculateTotalCost = () => lineItems.reduce((s, i) => s + ((i.received || 0) * (i.unit_cost || 0)), 0)

  const handleSave = async () => {
    setError('')
    if (!selectedVendorId) { setError('Please select a vendor'); return }
    const validItems = lineItems.filter(i => i.description.trim())
    if (!validItems.length) { setError('Add at least one line item with a description'); return }
    if (!receiptDate) { setError('Receipt date is required'); return }
    setSaving(true)
    const payload = {
      vendor_id: selectedVendorId,
      purchase_order_id: linkedPOId || undefined,
      receipt_date: receiptDate,
      expected_date: expectedDate || undefined,
      carrier: carrier || undefined,
      tracking_number: trackingNumber || undefined,
      reference_no: refNumber || undefined,
      deliver_to: deliverTo,
      notes: notes || undefined,
      line_items: validItems.map(item => ({
        product_id: item.product_id || undefined,
        sku: item.sku || undefined,
        description: item.description,
        ordered_qty: item.ordered,
        received_qty: item.received,
        unit_cost: item.unit_cost || 0,
        purchase_order_line_item_id: item.purchase_order_line_item_id || undefined,
      })),
    }
    try {
      if (editingGRN) {
        await api.updateGRN(editingGRN.id, payload)
      } else {
        await api.createGRN(payload)
      }
      onDirtyChange(false); setShowForm(false); setEditingGRN(null); loadGRNs()
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  // ─── Print ────────────────────────────────────────────────────────────────
  const handlePrint = () => {
    const co = companyProfile || {}
    const coName = co.name || 'My Company'
    const coAddress = [co.address, co.city, co.state, co.postal_code].filter(Boolean).join(', ')
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-CA') : ''
    const validItems = lineItems.filter(i => i.description?.trim())

    const itemRows = validItems.map(item => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">
          <strong>${item.description}</strong>
          ${item.sku ? `<br/><span style="font-size:11px;color:#6b7280;">SKU: ${item.sku}</span>` : ''}
        </td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.ordered || 0}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.received || 0}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.pending || 0}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right;">$${((item.received || 0) * (item.unit_cost || 0)).toFixed(2)}</td>
      </tr>`).join('')

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<title>GRN ${grnNo}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;font-size:13px;color:#1a1a1a;padding:30px}
  .page{max-width:780px;margin:0 auto}
  .doc-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}
  .logo-icon{width:38px;height:38px;border-radius:50%;background:#2CA01C;display:flex;align-items:center;justify-content:center}
  .doc-title{font-size:28px;font-weight:700;color:#1d4ed8}
  .meta-row{display:flex;justify-content:space-between;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #1d4ed8}
  .doc-meta td{padding:2px 0 2px 16px;font-size:12.5px}
  .doc-meta td:first-child{color:#6b7280}
  .doc-meta td:last-child{font-weight:600}
  .address-row{display:flex;gap:20px;margin-bottom:20px}
  .address-box{flex:1;border:1px solid #d1d5db;border-radius:4px;padding:12px 14px;min-height:60px}
  .address-box h4{font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}
  .items-table{width:100%;border-collapse:collapse;margin-bottom:24px}
  .items-table thead tr{background:#1d4ed8;color:white}
  .items-table thead th{padding:9px 10px;text-align:left;font-size:12px;font-weight:600}
  .items-table tbody tr:nth-child(even){background:#f9fafb}
  .total-row td{font-weight:700;border-top:2px solid #d1d5db;background:#f1f5f9;padding:9px 10px}
  .signature-row{display:flex;gap:40px;margin-top:40px;border-top:1px solid #e5e7eb;padding-top:16px}
  .sig-field{flex:1}.sig-line{border-bottom:1px solid #374151;margin-bottom:6px;height:32px}
  .sig-field span{font-size:11px;color:#6b7280}
  @media print{body{padding:0}}
</style></head><body>
<div class="page">
  <div class="doc-header">
    <div style="display:flex;align-items:center;gap:10px">
      <div class="logo-icon"><svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><line x1="16" y1="21" x2="16" y2="7"/><line x1="8" y1="21" x2="8" y2="7"/></svg></div>
      <span style="font-size:20px;font-weight:800">${coName}</span>
    </div>
    <div class="doc-title">Goods Received Note</div>
  </div>
  <div class="meta-row">
    <div><p><strong>${coName}</strong></p>${coAddress ? `<p>${coAddress}</p>` : ''}${co.email ? `<p>Email: ${co.email}</p>` : ''}</div>
    <div class="doc-meta"><table>
      <tr><td>GRN #:</td><td>${grnNo}</td></tr>
      <tr><td>Receipt Date:</td><td>${fmtDate(receiptDate)}</td></tr>
      <tr><td>Vendor:</td><td>${selectedVendor || ''}</td></tr>
      ${refNumber ? `<tr><td>Reference:</td><td>${refNumber}</td></tr>` : ''}
      ${trackingNumber ? `<tr><td>Tracking:</td><td>${trackingNumber}</td></tr>` : ''}
      ${carrier ? `<tr><td>Carrier:</td><td>${carrier}</td></tr>` : ''}
    </table></div>
  </div>
  <div class="address-row">
    <div class="address-box"><h4>Vendor</h4><p>${selectedVendor}</p></div>
    <div class="address-box"><h4>Deliver To</h4><p>${(deliverTo || coName).replace(/\n/g, '<br/>')}</p></div>
  </div>
  <table class="items-table">
    <thead><tr>
      <th>Product / Description</th>
      <th style="width:90px;text-align:center">Ordered</th>
      <th style="width:90px;text-align:center">Received</th>
      <th style="width:90px;text-align:center">Pending</th>
      <th style="width:110px;text-align:right">Amount</th>
    </tr></thead>
    <tbody>${itemRows}</tbody>
    <tfoot><tr class="total-row">
      <td>Total</td>
      <td style="text-align:center">${calculateTotalOrdered()}</td>
      <td style="text-align:center">${calculateTotalReceived()}</td>
      <td style="text-align:center">${calculateTotalPending()}</td>
      <td style="text-align:right">$${calculateTotalCost().toFixed(2)}</td>
    </tr></tfoot>
  </table>
  ${notes ? `<div style="font-size:12px;margin-bottom:20px"><strong style="display:block;color:#6b7280;text-transform:uppercase;font-size:11px;margin-bottom:4px">Notes</strong>${notes}</div>` : ''}
  <div class="signature-row">
    <div class="sig-field"><div class="sig-line"></div><span>Received by</span></div>
    <div class="sig-field"><div class="sig-line"></div><span>Verified by</span></div>
    <div class="sig-field"><div class="sig-line"></div><span>Date</span></div>
  </div>
</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`
    const win = window.open('', '_blank', 'width=900,height=700')
    win.document.write(html); win.document.close()
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const filteredGRNs = grns.filter(g =>
    (g.grn_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (g.vendor_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : '-'

  const getStatusClass = (status) => {
    switch (status) {
      case 'approved':           return styles.statusApproved
      case 'partially_received': return styles.statusSent
      case 'received':           return styles.statusPaid
      case 'partially_billed':   return styles.statusSent
      case 'billed':             return styles.statusPaid
      case 'cancelled':          return styles.statusCancelled
      default:                   return styles.statusDraft
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'partially_received': return 'Partial'
      case 'partially_billed':   return 'Part. Billed'
      default:                   return status || 'draft'
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── GRN List ─────────────────────────────────────────────────────── */}
      <div className={styles.invoiceListOverlay}>
        <div className={styles.invoiceListContainer}>

          <div className={styles.listHeader}>
            <div className={styles.listHeaderLeft}>
              <h2>Goods Received Notes</h2>
            </div>
            <div className={styles.listHeaderRight}>
              <button className={styles.btnNewInvoice} onClick={handleNew}>
                <i className="fas fa-plus"></i> New GRN
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
                placeholder="Search by GRN # or vendor..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <button className={styles.btnRefresh} onClick={loadGRNs} title="Refresh">
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
                <p>Loading GRNs...</p>
              </div>
            ) : filteredGRNs.length > 0 ? (
              <table className={styles.invoiceTable}>
                <thead>
                  <tr>
                    <th>GRN #</th>
                    <th>Source PO</th>
                    <th>Vendor</th>
                    <th>Receipt Date</th>
                    <th>Ordered</th>
                    <th>Received</th>
                    <th>Pending</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGRNs.map(g => (
                    <tr key={g.id}>
                      <td><strong>{g.grn_no || '-'}</strong></td>
                      <td>{g.source_po_no || '-'}</td>
                      <td>{g.vendor_name || '-'}</td>
                      <td>{formatDate(g.receipt_date)}</td>
                      <td>{g.total_ordered_qty  != null ? parseInt(g.total_ordered_qty)  : '-'}</td>
                      <td>{g.total_received_qty != null ? parseInt(g.total_received_qty) : '-'}</td>
                      <td>{g.total_pending_qty  != null ? parseInt(g.total_pending_qty)  : '-'}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${getStatusClass(g.status)}`}>
                          {getStatusLabel(g.status)}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actionButtons}>
                          {g.status !== 'draft' && (
                            <button title="View" onClick={() => handleView(g)}
                              style={{ fontSize: 11, padding: '2px 8px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                              <i className="fas fa-eye"></i>
                            </button>
                          )}
                          {g.status === 'draft' && (
                            <button title="Approve GRN" onClick={() => handleGrnStatus(g.id, 'approved')}
                              style={{ fontSize: 11, padding: '2px 8px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                              Approve
                            </button>
                          )}
                          {['draft', 'approved'].includes(g.status) && (
                            <button title="Receive Goods (adds to inventory)" onClick={() => handleReceiveGoods(g)}
                              style={{ fontSize: 11, padding: '2px 8px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                              <i className="fas fa-box-open"></i> Receive
                            </button>
                          )}
                          {['received', 'partially_billed'].includes(g.status) && !g.billed && user?.role !== 'customer' && (
                            <button title="Create Bill from GRN" onClick={() => handleConvertToBill(g)}
                              style={{ fontSize: 11, padding: '2px 8px', background: '#0891b2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                              <i className="fas fa-file-invoice-dollar"></i> Create Bill
                            </button>
                          )}
                          {g.billed && (
                            <span style={{ fontSize: 11, color: '#16a34a', padding: '2px 4px' }}>
                              <i className="fas fa-check-circle"></i> Billed
                            </span>
                          )}
                          {g.status === 'draft' && (
                            <button className={styles.btnEdit} title="Edit" onClick={() => handleEdit(g)}>
                              <i className="fas fa-edit"></i>
                            </button>
                          )}
                          {['draft', 'approved'].includes(g.status) && (
                            <button className={styles.btnDelete} title="Delete" onClick={() => handleDelete(g.id)}>
                              <i className="fas fa-trash"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.emptyState} style={{ textAlign: 'center', padding: '48px 20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <i className="fas fa-box-open" style={{ fontSize: '48px', color: '#e2e8f0' }} />
                  <h3 style={{ margin: '8px 0 4px', fontSize: '18px', fontWeight: 600, color: '#4a5568' }}>No Goods Received Notes</h3>
                  <p style={{ margin: 0, color: '#a0aec0', fontSize: '14px' }}>{searchTerm ? 'Try adjusting your search' : 'Create your first GRN to get started'}</p>
                  {!searchTerm && (
                    <button
                      style={{ marginTop: '12px', background: '#2CA01C', color: 'white', border: 'none', padding: '9px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}
                      onClick={handleNew}
                    >+ New GRN</button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── GRN Form Popup ───────────────────────────────────────────────── */}
      {showForm && (
        <div className={styles.invoicePopupOverlay}>
          <div className={styles.invoicePopup}>

            <div className={styles.popupHeader}>
              <div className={styles.headerLeft}>
                <h2>{viewMode
                  ? `View GRN ${editingGRN?.grn_no || ''}`
                  : editingGRN
                    ? `Edit GRN ${editingGRN.grn_no || ''}`
                    : 'Create Goods Received Note'}</h2>
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

                    {/* Left — vendor + PO picker + deliver to */}
                    <div className={styles.customerSection}>
                      <div className={styles.formGroup}>
                        <label>Vendor</label>
                        <div className={styles.autocompleteWrapper} ref={autocompleteRef}>
                          <input
                            type="text"
                            className={styles.formControlStandard}
                            placeholder="Search or select vendor"
                            value={vendorSearchText}
                            onChange={handleVendorInputChange}
                            onFocus={() => !viewMode && setShowVendorDropdown(true)}
                            readOnly={viewMode}
                            style={viewMode ? { backgroundColor: '#f5f5f5', cursor: 'default' } : {}}
                          />
                          {showVendorDropdown && !viewMode && (
                            <div className={styles.autocompleteDropdown}>
                              <div className={`${styles.autocompleteOption} ${styles.addNewOption}`}
                                onClick={() => { setIsVendorPopupOpen(true); setShowVendorDropdown(false) }}>
                                <i className="fas fa-plus"></i> Add New Vendor
                              </div>
                              {filteredVendors.map(v => (
                                <div key={v.id} className={styles.autocompleteOption} onClick={() => handleVendorSelect(v.name)}>
                                  {v.name}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* PO Picker */}
                      {showPoPicker && poPickerOrders.length > 0 && !viewMode && (
                        <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 8, padding: '12px 14px', marginBottom: 10 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8', marginBottom: 8 }}>
                            <i className="fas fa-file-alt"></i> Link to a Purchase Order?
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 150, overflowY: 'auto' }}>
                            {poPickerOrders.map(po => (
                              <div key={po.id} onClick={() => handlePoSelect(po)}
                                style={{ cursor: 'pointer', padding: '6px 10px', background: '#fff', borderRadius: 6, border: '1px solid #bfdbfe', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                <span style={{ fontWeight: 600 }}>{po.purchase_order_no}</span>
                                <span style={{ color: '#6b7280' }}>{formatDate(po.order_date)}</span>
                                <span style={{ color: '#1d4ed8', fontWeight: 600 }}>{po.status}</span>
                              </div>
                            ))}
                          </div>
                          <button onClick={() => setShowPoPicker(false)}
                            style={{ marginTop: 8, fontSize: 11, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}>
                            Skip — Enter manually
                          </button>
                        </div>
                      )}

                      {linkedPOId && (
                        <div style={{ marginBottom: 8, fontSize: 12, color: '#1d4ed8', background: '#eff6ff', padding: '4px 10px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <i className="fas fa-link"></i> Linked to PO
                          {!viewMode && (
                            <button onClick={() => setLinkedPOId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 11, padding: 0, marginLeft: 4 }}>×</button>
                          )}
                        </div>
                      )}

                      <div className={styles.formGroup}>
                        <label>Deliver To</label>
                        <textarea className={styles.formControlStandard} placeholder="Receiving address / warehouse"
                          value={deliverTo} onChange={e => setDeliverTo(e.target.value)} rows="3" readOnly={viewMode} />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Ref. No.</label>
                        <input type="text" className={styles.formControlStandard} placeholder="Reference or PO #"
                          value={refNumber} onChange={e => setRefNumber(e.target.value)} readOnly={viewMode} />
                      </div>
                    </div>

                    {/* Right — GRN details */}
                    <div className={styles.invoiceDetailsColumn}>
                      <div className={styles.formGroup}>
                        <label>GRN No.</label>
                        <input type="text" className={styles.formControlStandard} value={grnNo || 'Auto-generated'}
                          readOnly style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }} />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Receipt Date</label>
                        <input type="date" className={styles.formControlStandard} value={receiptDate}
                          onChange={e => setReceiptDate(e.target.value)} readOnly={viewMode} />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Expected Date</label>
                        <input type="date" className={styles.formControlStandard} value={expectedDate}
                          onChange={e => setExpectedDate(e.target.value)} readOnly={viewMode} />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Carrier</label>
                        <input type="text" className={styles.formControlStandard} placeholder="Carrier name"
                          value={carrier} onChange={e => setCarrier(e.target.value)} readOnly={viewMode} />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Tracking #</label>
                        <input type="text" className={styles.formControlStandard} placeholder="Tracking number"
                          value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} readOnly={viewMode} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Line items */}
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
                          <th className={styles.colQuantity}>Received</th>
                          <th className={styles.colQuantity}>Pending</th>
                          <th className={styles.colRate}>Unit Cost</th>
                          <th className={styles.colAmount}>Amount</th>
                          <th className={styles.colAction}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map((item) => {
                          const skuSuggestions  = getProductSuggestions(item.id, 'sku')
                          const descSuggestions = getProductSuggestions(item.id, 'description')
                          return (
                            <tr key={item.id}>
                              <td>
                                <div style={{ position: 'relative' }}>
                                  <input type="text" className={styles.formControlTable} placeholder="SKU"
                                    value={item.sku}
                                    onChange={e => updateLineItem(item.id, 'sku', e.target.value)}
                                    onFocus={() => { if (!viewMode) { setActiveItemId(item.id); setActiveField('sku') } }}
                                    onBlur={() => setTimeout(() => { setActiveItemId(null); setActiveField(null) }, 150)}
                                    readOnly={viewMode}
                                  />
                                  {activeItemId === item.id && activeField === 'sku' && skuSuggestions.length > 0 && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 9999, background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: 280, maxHeight: 220, overflowY: 'auto' }}>
                                      {skuSuggestions.map(p => (
                                        <div key={p.id} onMouseDown={() => handleProductSelect(p, item.id)}
                                          style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                          onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                                          <div>
                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                                            {p.sku && <div style={{ fontSize: 11, color: '#64748b' }}>SKU: {p.sku}</div>}
                                          </div>
                                          <div style={{ fontSize: 12, color: '#0ea5e9', fontWeight: 600, marginLeft: 8 }}>
                                            ${parseFloat(p.cost_price || 0).toFixed(2)}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td>
                                <div style={{ position: 'relative' }}>
                                  <input type="text" className={styles.formControlTable} placeholder="Item description"
                                    value={item.description}
                                    onChange={e => updateLineItem(item.id, 'description', e.target.value)}
                                    onFocus={() => { if (!viewMode) { handleFieldFocus(item.id); setActiveItemId(item.id); setActiveField('description') } }}
                                    onBlur={() => setTimeout(() => { setActiveItemId(null); setActiveField(null) }, 150)}
                                    readOnly={viewMode}
                                  />
                                  {activeItemId === item.id && activeField === 'description' && descSuggestions.length > 0 && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 9999, background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: 280, maxHeight: 220, overflowY: 'auto' }}>
                                      {descSuggestions.map(p => (
                                        <div key={p.id} onMouseDown={() => handleProductSelect(p, item.id)}
                                          style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                          onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                                          <div>
                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                                            {p.sku && <div style={{ fontSize: 11, color: '#64748b' }}>SKU: {p.sku}</div>}
                                          </div>
                                          <div style={{ fontSize: 12, color: '#0ea5e9', fontWeight: 600, marginLeft: 8 }}>
                                            ${parseFloat(p.cost_price || 0).toFixed(2)}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td>
                                <input type="number" min="0" className={styles.formControlTable}
                                  value={item.ordered} onChange={e => updateLineItem(item.id, 'ordered', parseFloat(e.target.value) || 0)}
                                  onFocus={() => !viewMode && handleFieldFocus(item.id)} readOnly={viewMode} />
                              </td>
                              <td>
                                <input type="number" min="0" className={styles.formControlTable}
                                  value={item.received} onChange={e => updateLineItem(item.id, 'received', parseFloat(e.target.value) || 0)}
                                  onFocus={() => !viewMode && handleFieldFocus(item.id)} readOnly={viewMode} />
                              </td>
                              <td>
                                <input type="number" className={styles.formControlTable}
                                  value={item.pending} readOnly
                                  style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }} />
                              </td>
                              <td>
                                <input type="number" min="0" step="0.01" className={styles.formControlTable}
                                  value={item.unit_cost} onChange={e => updateLineItem(item.id, 'unit_cost', parseFloat(e.target.value) || 0)}
                                  onFocus={() => !viewMode && handleFieldFocus(item.id)}
                                  readOnly={viewMode} style={viewMode ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}} />
                              </td>
                              <td className={styles.amountCell}>
                                ${((item.received || 0) * (item.unit_cost || 0)).toFixed(2)}
                              </td>
                              <td className={styles.actionCell}>
                                <button className={styles.btnRemove} onClick={() => removeLineItem(item.id)}
                                  disabled={lineItems.length === 1 || viewMode}>
                                  <i className="fas fa-trash"></i>
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className={styles.bottomRow}>
                    <div className={styles.notesAttachmentsSection}>
                      <div className={styles.formGroup}>
                        <label>Notes</label>
                        <textarea className={styles.formControlStandard} rows="3"
                          placeholder="Add any additional notes..."
                          value={notes} onChange={e => setNotes(e.target.value)} readOnly={viewMode} />
                      </div>
                    </div>

                    <div className={styles.totalsSection}>
                      <div className={styles.totalsGrid}>
                        <div className={styles.totalRow}>
                          <span className={styles.totalLabel}>Total Ordered:</span>
                          <span className={styles.totalValue}>{calculateTotalOrdered()}</span>
                        </div>
                        <div className={styles.totalRow}>
                          <span className={styles.totalLabel}>Total Received:</span>
                          <span className={styles.totalValue} style={{ color: '#16a34a' }}>{calculateTotalReceived()}</span>
                        </div>
                        <div className={styles.totalRow}>
                          <span className={styles.totalLabel}>Pending:</span>
                          <span className={styles.totalValue} style={{ color: calculateTotalPending() > 0 ? '#dc2626' : '#16a34a' }}>
                            {calculateTotalPending()}
                          </span>
                        </div>
                        <div className={`${styles.totalRow} ${styles.grandTotal}`}>
                          <span className={styles.totalLabel}>Total Cost:</span>
                          <span className={styles.totalValue}>${calculateTotalCost().toFixed(2)}</span>
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
                <button className={styles.btnCancel} onClick={handleFormClose}>{viewMode ? 'Close' : 'Cancel'}</button>
              </div>
              {!viewMode ? (
                <div className={styles.footerRight}>
                  <button onClick={handlePrint}
                    style={{ marginRight: 8, padding: '8px 18px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <i className="fas fa-print"></i> Print
                  </button>
                  <button className={styles.btnSecondary} onClick={handleSave} disabled={saving}>
                    <i className={saving ? 'fas fa-spinner fa-spin' : 'fas fa-save'}></i>
                    {saving ? 'Saving...' : editingGRN ? 'Update' : 'Save'}
                  </button>
                </div>
              ) : (
                <div className={styles.footerRight}>
                  <button onClick={handlePrint}
                    style={{ padding: '8px 18px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <i className="fas fa-print"></i> Print
                  </button>
                </div>
              )}
            </div>

            <VendorPopup isOpen={isVendorPopupOpen} onClose={() => setIsVendorPopupOpen(false)} onSave={handleVendorSave} />
          </div>
        </div>
      )}
    </>
  )
}
