'use client'

import { useState, useEffect, useCallback } from 'react'
import styles from './Invoice.module.css'
import * as api from '../lib/api'

export default function InventoryCenter({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('transactions') // transactions | lowstock | adjust
  const [transactions, setTransactions] = useState([])
  const [lowStockProducts, setLowStockProducts] = useState([])
  const [locations, setLocations] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Adjust form state
  const [adjustProductSearch, setAdjustProductSearch] = useState('')
  const [adjustProductId, setAdjustProductId] = useState(null)
  const [adjustProductName, setAdjustProductName] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [adjustLocationId, setAdjustLocationId] = useState('')
  const [adjustQtyChange, setAdjustQtyChange] = useState('')
  const [adjustReason, setAdjustReason] = useState('adjustment')
  const [adjustNotes, setAdjustNotes] = useState('')
  const [adjusting, setAdjusting] = useState(false)
  const [adjustError, setAdjustError] = useState('')
  const [adjustSuccess, setAdjustSuccess] = useState('')

  const loadTransactions = useCallback(async () => {
    setLoading(true)
    setListError('')
    try {
      const res = await api.getInventoryTransactions()
      setTransactions(res.data?.transactions || res.data || [])
    } catch (err) {
      setListError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadLowStock = useCallback(async () => {
    setLoading(true)
    setListError('')
    try {
      const res = await api.getLowStock()
      setLowStockProducts(res.data?.products || res.data || [])
    } catch (err) {
      setListError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadLocations = useCallback(async () => {
    try {
      const res = await api.getInventoryLocations()
      setLocations(res.data?.locations || res.data || [])
    } catch {}
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
    if (isOpen && activeTab === 'transactions') loadTransactions()
  }, [activeTab, isOpen, loadLowStock, loadTransactions])

  if (!isOpen) return null

  const filteredTransactions = transactions.filter(t =>
    (t.product_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.transaction_type || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(adjustProductSearch.toLowerCase())
  )

  const handleProductSelect = (product) => {
    setAdjustProductId(product.id)
    setAdjustProductName(product.name)
    setAdjustProductSearch(product.name)
    setShowProductDropdown(false)
  }

  const handleAdjust = async () => {
    setAdjustError('')
    setAdjustSuccess('')
    if (!adjustProductId) { setAdjustError('Please select a product'); return }
    const qty = parseFloat(adjustQtyChange)
    if (isNaN(qty) || qty === 0) { setAdjustError('Enter a non-zero quantity change'); return }
    if (!adjustReason) { setAdjustError('Please select a reason'); return }
    setAdjusting(true)
    try {
      await api.adjustInventory({
        product_id: adjustProductId,
        location_id: adjustLocationId || undefined,
        quantity_change: qty,
        reason: adjustReason,
        notes: adjustNotes || undefined,
      })
      setAdjustSuccess(`Stock adjusted successfully (${qty > 0 ? '+' : ''}${qty} units)`)
      setAdjustProductId(null)
      setAdjustProductName('')
      setAdjustProductSearch('')
      setAdjustLocationId('')
      setAdjustQtyChange('')
      setAdjustReason('adjustment')
      setAdjustNotes('')
      loadTransactions()
    } catch (err) {
      setAdjustError(err.message)
    } finally {
      setAdjusting(false)
    }
  }

  const formatDate = (d) => {
    if (!d) return '-'
    return new Date(d).toLocaleDateString()
  }

  const getTypeClass = (type) => {
    if (!type) return ''
    if (type.includes('sale') || type.includes('out') || type.includes('reduction')) return styles.statusCancelled
    if (type.includes('purchase') || type.includes('in') || type.includes('addition')) return styles.statusPaid
    return styles.statusDraft
  }

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
        <div style={{ display: 'flex', gap: '8px', padding: '0 24px 0', borderBottom: '1px solid #e2e8f0', marginBottom: '16px' }}>
          {[
            { key: 'transactions', label: 'Transactions', icon: 'fa-list' },
            { key: 'lowstock', label: 'Low Stock', icon: 'fa-exclamation-triangle' },
            { key: 'adjust', label: 'Adjust Stock', icon: 'fa-edit' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '10px 18px',
                border: 'none',
                borderBottom: activeTab === tab.key ? '2px solid #3b82f6' : '2px solid transparent',
                background: 'none',
                color: activeTab === tab.key ? '#3b82f6' : '#64748b',
                fontWeight: activeTab === tab.key ? 600 : 400,
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <i className={`fas ${tab.icon}`}></i> {tab.label}
            </button>
          ))}
        </div>

        {listError && (
          <div className={styles.errorBanner} style={{ margin: '0 24px 16px' }}>
            <i className="fas fa-exclamation-circle"></i> {listError}
          </div>
        )}

        {/* Transactions Tab */}
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
                <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
              </button>
            </div>
            <div className={styles.invoiceGridContainer}>
              {loading ? (
                <div className={styles.loadingState}>
                  <i className="fas fa-spinner fa-spin"></i>
                  <p>Loading transactions...</p>
                </div>
              ) : filteredTransactions.length > 0 ? (
                <table className={styles.invoiceTable}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Product</th>
                      <th>Type</th>
                      <th>Qty Change</th>
                      <th>Reason</th>
                      <th>Location</th>
                      <th>Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((t) => (
                      <tr key={t.id}>
                        <td>{formatDate(t.transaction_date || t.created_at)}</td>
                        <td><strong>{t.product_name || t.product_id || '-'}</strong></td>
                        <td>
                          <span className={`${styles.statusBadge} ${getTypeClass(t.transaction_type)}`}>
                            {t.transaction_type || '-'}
                          </span>
                        </td>
                        <td style={{ color: (t.quantity_change || 0) >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                          {(t.quantity_change || 0) > 0 ? '+' : ''}{t.quantity_change || 0}
                        </td>
                        <td>{t.reason || '-'}</td>
                        <td>{t.location_name || '-'}</td>
                        <td>{t.reference_no || t.reference_id || '-'}</td>
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

        {/* Low Stock Tab */}
        {activeTab === 'lowstock' && (
          <div className={styles.invoiceGridContainer}>
            {loading ? (
              <div className={styles.loadingState}>
                <i className="fas fa-spinner fa-spin"></i>
                <p>Loading low stock...</p>
              </div>
            ) : lowStockProducts.length > 0 ? (
              <table className={styles.invoiceTable}>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Current Stock</th>
                    <th>Reorder Level</th>
                    <th>Below By</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockProducts.map((p) => (
                    <tr key={p.id}>
                      <td><strong>{p.name}</strong></td>
                      <td>{p.sku || '-'}</td>
                      <td style={{ color: '#dc2626', fontWeight: 600 }}>{p.current_stock ?? '-'}</td>
                      <td>{p.reorder_level ?? '-'}</td>
                      <td style={{ color: '#dc2626' }}>
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
        )}

        {/* Adjust Stock Tab */}
        {activeTab === 'adjust' && (
          <div style={{ padding: '0 24px 24px' }}>
            <div style={{ maxWidth: '600px' }}>
              {adjustError && (
                <div className={styles.errorBanner} style={{ marginBottom: '16px' }}>
                  <i className="fas fa-exclamation-circle"></i> {adjustError}
                </div>
              )}
              {adjustSuccess && (
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: '#166534', fontSize: '14px' }}>
                  <i className="fas fa-check-circle" style={{ marginRight: '8px' }}></i>{adjustSuccess}
                </div>
              )}

              <div className={styles.formGroup} style={{ marginBottom: '16px', position: 'relative' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px', color: '#374151' }}>
                  Product <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className={styles.formControlStandard}
                  placeholder="Search product..."
                  value={adjustProductSearch}
                  onChange={(e) => { setAdjustProductSearch(e.target.value); setAdjustProductId(null); setShowProductDropdown(true) }}
                  onFocus={() => setShowProductDropdown(true)}
                />
                {showProductDropdown && adjustProductSearch && (
                  <div className={styles.autocompleteDropdown}>
                    {filteredProducts.slice(0, 10).map(p => (
                      <div key={p.id} className={styles.autocompleteOption} onClick={() => handleProductSelect(p)}>
                        {p.name} {p.sku ? `(${p.sku})` : ''} — Stock: {p.current_stock ?? 0}
                      </div>
                    ))}
                    {filteredProducts.length === 0 && (
                      <div className={`${styles.autocompleteOption} ${styles.noResults}`}>No products found</div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className={styles.formGroup}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px', color: '#374151' }}>
                    Quantity Change <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    className={styles.formControlStandard}
                    placeholder="e.g. +10 or -5"
                    value={adjustQtyChange}
                    step="0.001"
                    onChange={(e) => setAdjustQtyChange(e.target.value)}
                  />
                  <small style={{ color: '#6b7280', fontSize: '12px' }}>Positive = add stock, Negative = reduce</small>
                </div>

                <div className={styles.formGroup}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px', color: '#374151' }}>Location</label>
                  <select
                    className={styles.formControlStandard}
                    value={adjustLocationId}
                    onChange={(e) => setAdjustLocationId(e.target.value)}
                  >
                    <option value="">Default / No Location</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px', color: '#374151' }}>
                  Reason <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  className={styles.formControlStandard}
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                >
                  <option value="adjustment">Adjustment</option>
                  <option value="write-off">Write-Off</option>
                  <option value="correction">Correction</option>
                  <option value="opening_balance">Opening Balance</option>
                  <option value="return">Return / Return from Customer</option>
                  <option value="damage">Damage / Loss</option>
                </select>
              </div>

              <div className={styles.formGroup} style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px', color: '#374151' }}>Notes</label>
                <textarea
                  className={styles.formControlStandard}
                  rows="3"
                  placeholder="Optional notes about this adjustment..."
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  className={styles.btnSecondary}
                  onClick={handleAdjust}
                  disabled={adjusting}
                >
                  <i className={adjusting ? 'fas fa-spinner fa-spin' : 'fas fa-save'}></i>
                  {adjusting ? ' Saving...' : ' Save Adjustment'}
                </button>
                <button
                  className={styles.btnCancel}
                  onClick={() => {
                    setAdjustProductId(null); setAdjustProductSearch(''); setAdjustQtyChange('')
                    setAdjustReason('adjustment'); setAdjustNotes(''); setAdjustError(''); setAdjustSuccess('')
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
