'use client'

import { useState, useEffect, useCallback } from 'react'
import styles from './Invoice.module.css'
import * as api from '../lib/api'

export default function InventoryCenter({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('transactions')

  // Transactions
  const [transactions, setTransactions] = useState([])
  const [txLoading, setTxLoading] = useState(false)
  const [txError, setTxError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Low Stock
  const [lowStockProducts, setLowStockProducts] = useState([])
  const [lowLoading, setLowLoading] = useState(false)
  const [lowError, setLowError] = useState('')

  // Locations
  const [locations, setLocations] = useState([])
  const [locLoading, setLocLoading] = useState(false)
  const [locError, setLocError] = useState('')
  const [showLocForm, setShowLocForm] = useState(false)
  const [editingLoc, setEditingLoc] = useState(null)
  const [locForm, setLocForm] = useState({ name: '', code: '', description: '', is_default: false })
  const [locSaving, setLocSaving] = useState(false)
  const [locFormError, setLocFormError] = useState('')

  // Stock Adjustment
  const [products, setProducts] = useState([])
  const [adjustProductSearch, setAdjustProductSearch] = useState('')
  const [adjustProductId, setAdjustProductId] = useState(null)
  const [adjustProductName, setAdjustProductName] = useState('')
  const [showAdjustDropdown, setShowAdjustDropdown] = useState(false)
  const [adjustLocationId, setAdjustLocationId] = useState('')
  const [adjustQtyChange, setAdjustQtyChange] = useState('')
  const [adjustReason, setAdjustReason] = useState('adjustment')
  const [adjustNotes, setAdjustNotes] = useState('')
  const [adjusting, setAdjusting] = useState(false)
  const [adjustError, setAdjustError] = useState('')
  const [adjustSuccess, setAdjustSuccess] = useState('')

  // Stock Transfer
  const [transferProductSearch, setTransferProductSearch] = useState('')
  const [transferProductId, setTransferProductId] = useState(null)
  const [transferProductName, setTransferProductName] = useState('')
  const [showTransferDropdown, setShowTransferDropdown] = useState(false)
  const [fromLocationId, setFromLocationId] = useState('')
  const [toLocationId, setToLocationId] = useState('')
  const [transferQty, setTransferQty] = useState('')
  const [transferNotes, setTransferNotes] = useState('')
  const [transferring, setTransferring] = useState(false)
  const [transferError, setTransferError] = useState('')
  const [transferSuccess, setTransferSuccess] = useState('')

  // ─── Loaders ─────────────────────────────────────────────────────────────

  const loadTransactions = useCallback(async () => {
    setTxLoading(true); setTxError('')
    try {
      const res = await api.getInventoryTransactions()
      setTransactions(res.data?.inventory_transactions || res.data?.transactions || res.data || [])
    } catch (err) { setTxError(err.message) }
    finally { setTxLoading(false) }
  }, [])

  const loadLowStock = useCallback(async () => {
    setLowLoading(true); setLowError('')
    try {
      const res = await api.getLowStock()
      setLowStockProducts(res.data?.products || res.data || [])
    } catch (err) { setLowError(err.message) }
    finally { setLowLoading(false) }
  }, [])

  const loadLocations = useCallback(async () => {
    setLocLoading(true); setLocError('')
    try {
      const res = await api.getInventoryLocations()
      setLocations(res.data?.locations || res.data || [])
    } catch (err) { setLocError(err.message) }
    finally { setLocLoading(false) }
  }, [])

  const loadProducts = useCallback(async () => {
    try {
      const res = await api.getProducts()
      setProducts(res.data?.products || res.data || [])
    } catch {}
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadTransactions()
      loadLocations()
      loadProducts()
    }
  }, [isOpen, loadTransactions, loadLocations, loadProducts])

  useEffect(() => {
    if (isOpen && activeTab === 'lowstock') loadLowStock()
  }, [activeTab, isOpen, loadLowStock])

  if (!isOpen) return null

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const formatDate = (d) => {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const getTypeClass = (type) => {
    if (!type) return ''
    if (type.includes('sale') || type.includes('out') || type.includes('reduction') || type.includes('write')) return styles.statusCancelled
    if (type.includes('purchase') || type.includes('in') || type.includes('addition') || type.includes('opening')) return styles.statusPaid
    return styles.statusDraft
  }

  const filteredTransactions = transactions.filter(t =>
    (t.product_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.transaction_type || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  // ─── Adjust Stock ─────────────────────────────────────────────────────────

  const filteredAdjustProducts = products.filter(p =>
    (p.name || '').toLowerCase().includes(adjustProductSearch.toLowerCase())
  )

  const handleAdjustProductSelect = (p) => {
    setAdjustProductId(p.id); setAdjustProductName(p.name)
    setAdjustProductSearch(p.name); setShowAdjustDropdown(false)
  }

  const handleAdjust = async () => {
    setAdjustError(''); setAdjustSuccess('')
    if (!adjustProductId) { setAdjustError('Please select a product'); return }
    const qty = parseFloat(adjustQtyChange)
    if (isNaN(qty) || qty === 0) { setAdjustError('Enter a non-zero quantity change'); return }
    setAdjusting(true)
    try {
      await api.adjustInventory({
        product_id: adjustProductId,
        location_id: adjustLocationId || undefined,
        quantity: Math.abs(qty),
        transaction_type: qty > 0 ? 'adjustment_in' : 'adjustment_out',
        reason: adjustReason,
        notes: adjustNotes || undefined,
      })
      setAdjustSuccess(`Stock adjusted successfully (${qty > 0 ? '+' : ''}${qty} units)`)
      setAdjustProductId(null); setAdjustProductName(''); setAdjustProductSearch('')
      setAdjustLocationId(''); setAdjustQtyChange(''); setAdjustReason('adjustment'); setAdjustNotes('')
      loadTransactions()
    } catch (err) { setAdjustError(err.message) }
    finally { setAdjusting(false) }
  }

  // ─── Stock Transfer ───────────────────────────────────────────────────────

  const filteredTransferProducts = products.filter(p =>
    (p.name || '').toLowerCase().includes(transferProductSearch.toLowerCase())
  )

  const handleTransferProductSelect = (p) => {
    setTransferProductId(p.id); setTransferProductName(p.name)
    setTransferProductSearch(p.name); setShowTransferDropdown(false)
  }

  const handleTransfer = async () => {
    setTransferError(''); setTransferSuccess('')
    if (!transferProductId) { setTransferError('Please select a product'); return }
    if (!fromLocationId) { setTransferError('Please select source location'); return }
    if (!toLocationId) { setTransferError('Please select destination location'); return }
    if (fromLocationId === toLocationId) { setTransferError('Source and destination must be different'); return }
    const qty = parseFloat(transferQty)
    if (isNaN(qty) || qty <= 0) { setTransferError('Enter a positive quantity to transfer'); return }
    setTransferring(true)
    try {
      await api.transferInventoryStock({
        product_id: transferProductId,
        from_location_id: fromLocationId,
        to_location_id: toLocationId,
        quantity: qty,
        notes: transferNotes || undefined,
      })
      setTransferSuccess(`Transferred ${qty} units successfully`)
      setTransferProductId(null); setTransferProductName(''); setTransferProductSearch('')
      setFromLocationId(''); setToLocationId(''); setTransferQty(''); setTransferNotes('')
      loadTransactions()
    } catch (err) { setTransferError(err.message) }
    finally { setTransferring(false) }
  }

  // ─── Locations CRUD ───────────────────────────────────────────────────────

  const openNewLoc = () => {
    setLocForm({ name: '', code: '', description: '', is_default: false })
    setEditingLoc(null); setLocFormError(''); setShowLocForm(true)
  }

  const openEditLoc = (loc) => {
    setLocForm({ name: loc.name, code: loc.code || '', description: loc.description || '', is_default: loc.is_default })
    setEditingLoc(loc); setLocFormError(''); setShowLocForm(true)
  }

  const handleLocSave = async () => {
    setLocFormError('')
    if (!locForm.name.trim()) { setLocFormError('Name is required'); return }
    setLocSaving(true)
    try {
      if (editingLoc) {
        await api.updateInventoryLocation(editingLoc.id, locForm)
      } else {
        await api.createInventoryLocation(locForm)
      }
      setShowLocForm(false); setEditingLoc(null)
      loadLocations()
    } catch (err) { setLocFormError(err.message) }
    finally { setLocSaving(false) }
  }

  const handleLocDelete = async (loc) => {
    if (!confirm(`Delete location "${loc.name}"?`)) return
    try {
      await api.deleteInventoryLocation(loc.id)
      loadLocations()
    } catch (err) { alert(err.message) }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const TABS = [
    { key: 'transactions', label: 'Transactions', icon: 'fa-list' },
    { key: 'lowstock', label: 'Low Stock', icon: 'fa-exclamation-triangle' },
    { key: 'adjust', label: 'Adjust Stock', icon: 'fa-edit' },
    { key: 'transfer', label: 'Transfer', icon: 'fa-exchange-alt' },
    { key: 'locations', label: 'Locations', icon: 'fa-map-marker-alt' },
  ]

  return (
    <div className={styles.invoiceListOverlay}>
      <div className={styles.invoiceListContainer}>

        <div className={styles.listHeader}>
          <div className={styles.listHeaderLeft}>
            <h2>Inventory Management</h2>
          </div>
          <div className={styles.listHeaderRight}>
            <button className={styles.closeBtn} onClick={onClose}>
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '2px', padding: '0 24px', borderBottom: '2px solid #e2e8f0', marginBottom: '0' }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '10px 16px',
                border: 'none',
                borderBottom: activeTab === tab.key ? '2px solid #3b82f6' : '2px solid transparent',
                marginBottom: '-2px',
                background: 'none',
                color: activeTab === tab.key ? '#3b82f6' : '#64748b',
                fontWeight: activeTab === tab.key ? 600 : 400,
                cursor: 'pointer',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              <i className={`fas ${tab.icon}`}></i> {tab.label}
            </button>
          ))}
        </div>

        {/* ── Transactions Tab ───────────────────────────────────────── */}
        {activeTab === 'transactions' && (
          <>
            <div className={styles.searchSection}>
              <div className={styles.searchWrapper}>
                <i className="fas fa-search"></i>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Search by product or type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className={styles.btnRefresh} onClick={loadTransactions} title="Refresh">
                <i className={`fas fa-sync-alt ${txLoading ? 'fa-spin' : ''}`}></i>
              </button>
            </div>
            {txError && <div className={styles.errorBanner} style={{ margin: '0 24px 12px' }}><i className="fas fa-exclamation-circle"></i> {txError}</div>}
            <div className={styles.invoiceGridContainer}>
              {txLoading ? (
                <div className={styles.loadingState}><i className="fas fa-spinner fa-spin"></i><p>Loading...</p></div>
              ) : filteredTransactions.length > 0 ? (
                <table className={styles.invoiceTable}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Product</th>
                      <th>Type</th>
                      <th>Qty Change</th>
                      <th>Balance After</th>
                      <th>Reason / Notes</th>
                      <th>Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((t) => (
                      <tr key={t.id}>
                        <td>{formatDate(t.transaction_date || t.created_at)}</td>
                        <td><strong>{t.product_name || '-'}</strong>{t.sku && <span style={{ color: '#94a3b8', fontSize: 12, marginLeft: 6 }}>{t.sku}</span>}</td>
                        <td>
                          <span className={`${styles.statusBadge} ${getTypeClass(t.transaction_type)}`}>
                            {(t.transaction_type || '-').replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ color: (t.quantity || 0) >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600, fontFamily: 'monospace' }}>
                          {(t.quantity || 0) > 0 ? '+' : ''}{t.quantity || 0}
                        </td>
                        <td style={{ fontFamily: 'monospace' }}>{t.balance_after ?? '-'}</td>
                        <td style={{ color: '#64748b', fontSize: 13 }}>{t.reason || t.notes || '-'}</td>
                        <td>{t.location_name || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className={styles.emptyState}>
                  <i className="fas fa-boxes"></i>
                  <h3>No inventory transactions found</h3>
                  <p>{searchTerm ? 'Try adjusting your search' : 'Stock movements will appear here'}</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Low Stock Tab ──────────────────────────────────────────── */}
        {activeTab === 'lowstock' && (
          <>
            <div className={styles.searchSection} style={{ justifyContent: 'flex-end' }}>
              <button className={styles.btnRefresh} onClick={loadLowStock} title="Refresh">
                <i className={`fas fa-sync-alt ${lowLoading ? 'fa-spin' : ''}`}></i>
              </button>
            </div>
            {lowError && <div className={styles.errorBanner} style={{ margin: '0 24px 12px' }}><i className="fas fa-exclamation-circle"></i> {lowError}</div>}
            <div className={styles.invoiceGridContainer}>
              {lowLoading ? (
                <div className={styles.loadingState}><i className="fas fa-spinner fa-spin"></i><p>Loading...</p></div>
              ) : lowStockProducts.length > 0 ? (
                <table className={styles.invoiceTable}>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Current Stock</th>
                      <th>Reorder Level</th>
                      <th>Reorder Qty</th>
                      <th>UOM</th>
                      <th>Shortage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockProducts.map((p) => (
                      <tr key={p.id}>
                        <td><strong>{p.name}</strong></td>
                        <td>{p.sku || '-'}</td>
                        <td style={{ color: '#dc2626', fontWeight: 600 }}>{p.current_stock ?? 0}</td>
                        <td>{p.reorder_level ?? '-'}</td>
                        <td>{p.reorder_quantity ?? '-'}</td>
                        <td>{p.unit_of_measure || '-'}</td>
                        <td style={{ color: '#dc2626', fontWeight: 600 }}>
                          {p.reorder_level != null && p.current_stock != null
                            ? Math.max(0, p.reorder_level - p.current_stock)
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className={styles.emptyState}>
                  <i className="fas fa-check-circle" style={{ color: '#16a34a' }}></i>
                  <h3>All products are adequately stocked</h3>
                  <p>No products are below their reorder level</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Adjust Stock Tab ───────────────────────────────────────── */}
        {activeTab === 'adjust' && (
          <div style={{ padding: '24px', maxWidth: 640 }}>
            {adjustError && <div className={styles.errorBanner} style={{ marginBottom: 16 }}><i className="fas fa-exclamation-circle"></i> {adjustError}</div>}
            {adjustSuccess && (
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#166534', fontSize: 14 }}>
                <i className="fas fa-check-circle" style={{ marginRight: 8 }}></i>{adjustSuccess}
              </div>
            )}

            <div className={styles.formGroup} style={{ marginBottom: 16, position: 'relative' }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: '#374151' }}>Product <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                type="text"
                className={styles.formControlStandard}
                placeholder="Search product..."
                value={adjustProductSearch}
                onChange={(e) => { setAdjustProductSearch(e.target.value); setAdjustProductId(null); setShowAdjustDropdown(true) }}
                onFocus={() => setShowAdjustDropdown(true)}
              />
              {showAdjustDropdown && adjustProductSearch && (
                <div className={styles.autocompleteDropdown}>
                  {filteredAdjustProducts.slice(0, 10).map(p => (
                    <div key={p.id} className={styles.autocompleteOption} onClick={() => handleAdjustProductSelect(p)}>
                      {p.name} {p.sku ? `(${p.sku})` : ''} — Stock: {p.current_stock ?? 0}
                    </div>
                  ))}
                  {!filteredAdjustProducts.length && <div className={styles.autocompleteOption}>No products found</div>}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div className={styles.formGroup}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: '#374151' }}>Qty Change <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="number" className={styles.formControlStandard}
                  placeholder="+10 or -5"
                  value={adjustQtyChange} step="0.001"
                  onChange={(e) => setAdjustQtyChange(e.target.value)}
                />
                <small style={{ color: '#6b7280', fontSize: 12 }}>Positive = add, Negative = reduce</small>
              </div>
              <div className={styles.formGroup}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: '#374151' }}>Location</label>
                <select className={styles.formControlStandard} value={adjustLocationId} onChange={(e) => setAdjustLocationId(e.target.value)}>
                  <option value="">Default / No Location</option>
                  {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                </select>
              </div>
            </div>

            <div className={styles.formGroup} style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: '#374151' }}>Reason <span style={{ color: '#ef4444' }}>*</span></label>
              <select className={styles.formControlStandard} value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)}>
                <option value="adjustment">Adjustment</option>
                <option value="write-off">Write-Off</option>
                <option value="correction">Correction</option>
                <option value="opening_balance">Opening Balance</option>
                <option value="return">Return from Customer</option>
                <option value="damage">Damage / Loss</option>
              </select>
            </div>

            <div className={styles.formGroup} style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: '#374151' }}>Notes</label>
              <textarea className={styles.formControlStandard} rows="2" placeholder="Optional notes..."
                value={adjustNotes} onChange={(e) => setAdjustNotes(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className={styles.btnPrimary} onClick={handleAdjust} disabled={adjusting}>
                <i className={adjusting ? 'fas fa-spinner fa-spin' : 'fas fa-check'}></i>
                {adjusting ? ' Saving...' : ' Save Adjustment'}
              </button>
              <button className={styles.btnCancel} onClick={() => {
                setAdjustProductId(null); setAdjustProductSearch(''); setAdjustQtyChange('')
                setAdjustReason('adjustment'); setAdjustNotes(''); setAdjustError(''); setAdjustSuccess('')
              }}>Clear</button>
            </div>
          </div>
        )}

        {/* ── Stock Transfer Tab ─────────────────────────────────────── */}
        {activeTab === 'transfer' && (
          <div style={{ padding: '24px', maxWidth: 640 }}>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>
              Move stock from one location to another. Both locations must have been created first.
            </p>
            {transferError && <div className={styles.errorBanner} style={{ marginBottom: 16 }}><i className="fas fa-exclamation-circle"></i> {transferError}</div>}
            {transferSuccess && (
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#166534', fontSize: 14 }}>
                <i className="fas fa-check-circle" style={{ marginRight: 8 }}></i>{transferSuccess}
              </div>
            )}

            <div className={styles.formGroup} style={{ marginBottom: 16, position: 'relative' }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: '#374151' }}>Product <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                type="text" className={styles.formControlStandard}
                placeholder="Search product..."
                value={transferProductSearch}
                onChange={(e) => { setTransferProductSearch(e.target.value); setTransferProductId(null); setShowTransferDropdown(true) }}
                onFocus={() => setShowTransferDropdown(true)}
              />
              {showTransferDropdown && transferProductSearch && (
                <div className={styles.autocompleteDropdown}>
                  {filteredTransferProducts.slice(0, 10).map(p => (
                    <div key={p.id} className={styles.autocompleteOption} onClick={() => handleTransferProductSelect(p)}>
                      {p.name} {p.sku ? `(${p.sku})` : ''} — Stock: {p.current_stock ?? 0}
                    </div>
                  ))}
                  {!filteredTransferProducts.length && <div className={styles.autocompleteOption}>No products found</div>}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'end', marginBottom: 16 }}>
              <div className={styles.formGroup}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: '#374151' }}>From Location <span style={{ color: '#ef4444' }}>*</span></label>
                <select className={styles.formControlStandard} value={fromLocationId} onChange={(e) => setFromLocationId(e.target.value)}>
                  <option value="">Select source...</option>
                  {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                </select>
              </div>
              <div style={{ textAlign: 'center', paddingBottom: 8, color: '#94a3b8' }}>
                <i className="fas fa-arrow-right" style={{ fontSize: 18 }}></i>
              </div>
              <div className={styles.formGroup}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: '#374151' }}>To Location <span style={{ color: '#ef4444' }}>*</span></label>
                <select className={styles.formControlStandard} value={toLocationId} onChange={(e) => setToLocationId(e.target.value)}>
                  <option value="">Select destination...</option>
                  {locations.filter(l => l.id !== fromLocationId).map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 24 }}>
              <div className={styles.formGroup}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: '#374151' }}>Quantity <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="number" className={styles.formControlStandard} placeholder="0" min="0.001" step="0.001"
                  value={transferQty} onChange={(e) => setTransferQty(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: '#374151' }}>Notes</label>
                <input type="text" className={styles.formControlStandard} placeholder="Optional reason for transfer"
                  value={transferNotes} onChange={(e) => setTransferNotes(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className={styles.btnPrimary} onClick={handleTransfer} disabled={transferring}>
                <i className={transferring ? 'fas fa-spinner fa-spin' : 'fas fa-exchange-alt'}></i>
                {transferring ? ' Transferring...' : ' Transfer Stock'}
              </button>
              <button className={styles.btnCancel} onClick={() => {
                setTransferProductId(null); setTransferProductSearch(''); setFromLocationId('')
                setToLocationId(''); setTransferQty(''); setTransferNotes('')
                setTransferError(''); setTransferSuccess('')
              }}>Clear</button>
            </div>

            {locations.length === 0 && (
              <div style={{ marginTop: 20, padding: '12px 16px', background: '#fefce8', border: '1px solid #fde047', borderRadius: 8, fontSize: 13, color: '#713f12' }}>
                <i className="fas fa-info-circle" style={{ marginRight: 8 }}></i>
                No locations defined yet. Go to the <strong>Locations</strong> tab to create locations before transferring stock.
              </div>
            )}
          </div>
        )}

        {/* ── Locations Tab ─────────────────────────────────────────── */}
        {activeTab === 'locations' && (
          <>
            <div className={styles.searchSection} style={{ justifyContent: 'flex-end', gap: 10 }}>
              <button className={styles.btnRefresh} onClick={loadLocations} title="Refresh">
                <i className={`fas fa-sync-alt ${locLoading ? 'fa-spin' : ''}`}></i>
              </button>
              <button className={styles.btnPrimary} style={{ padding: '7px 16px' }} onClick={openNewLoc}>
                <i className="fas fa-plus" style={{ marginRight: 6 }}></i> New Location
              </button>
            </div>
            {locError && <div className={styles.errorBanner} style={{ margin: '0 24px 12px' }}><i className="fas fa-exclamation-circle"></i> {locError}</div>}

            {/* Location form */}
            {showLocForm && (
              <div style={{ margin: '0 24px 20px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20 }}>
                <h4 style={{ margin: '0 0 16px', fontSize: 15 }}>{editingLoc ? 'Edit Location' : 'New Location'}</h4>
                {locFormError && <div className={styles.errorBanner} style={{ marginBottom: 12 }}><i className="fas fa-exclamation-circle"></i> {locFormError}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div className={styles.formGroup}>
                    <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: '#374151' }}>Name <span style={{ color: '#ef4444' }}>*</span></label>
                    <input type="text" className={styles.formControlStandard} placeholder="e.g. Main Warehouse"
                      value={locForm.name} onChange={(e) => setLocForm({ ...locForm, name: e.target.value })} />
                  </div>
                  <div className={styles.formGroup}>
                    <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: '#374151' }}>Code</label>
                    <input type="text" className={styles.formControlStandard} placeholder="e.g. WH-01"
                      value={locForm.code} onChange={(e) => setLocForm({ ...locForm, code: e.target.value })} />
                  </div>
                </div>
                <div className={styles.formGroup} style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: '#374151' }}>Description</label>
                  <input type="text" className={styles.formControlStandard} placeholder="Optional description"
                    value={locForm.description} onChange={(e) => setLocForm({ ...locForm, description: e.target.value })} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                    <input type="checkbox" checked={locForm.is_default} onChange={(e) => setLocForm({ ...locForm, is_default: e.target.checked })} />
                    Set as default location
                  </label>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
                    <button className={styles.btnCancel} onClick={() => { setShowLocForm(false); setEditingLoc(null) }}>Cancel</button>
                    <button className={styles.btnPrimary} onClick={handleLocSave} disabled={locSaving}>
                      {locSaving ? <><i className="fas fa-spinner fa-spin"></i> Saving...</> : (editingLoc ? 'Update' : 'Create')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className={styles.invoiceGridContainer}>
              {locLoading ? (
                <div className={styles.loadingState}><i className="fas fa-spinner fa-spin"></i><p>Loading...</p></div>
              ) : locations.length > 0 ? (
                <table className={styles.invoiceTable}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Code</th>
                      <th>Description</th>
                      <th>Default</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {locations.map((loc) => (
                      <tr key={loc.id}>
                        <td><strong>{loc.name}</strong></td>
                        <td style={{ fontFamily: 'monospace' }}>{loc.code || '-'}</td>
                        <td style={{ color: '#64748b', fontSize: 13 }}>{loc.description || '-'}</td>
                        <td>
                          {loc.is_default && (
                            <span className={`${styles.statusBadge} ${styles.statusPaid}`}>Default</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button onClick={() => openEditLoc(loc)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', marginRight: 8 }} title="Edit">
                            <i className="fas fa-edit"></i>
                          </button>
                          {!loc.is_default && (
                            <button onClick={() => handleLocDelete(loc)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }} title="Delete">
                              <i className="fas fa-trash"></i>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className={styles.emptyState}>
                  <i className="fas fa-map-marker-alt"></i>
                  <h3>No stock locations defined</h3>
                  <p>Create locations to track inventory by warehouse, store, or bin</p>
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  )
}
