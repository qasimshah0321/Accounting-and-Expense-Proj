'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './QuickOrder.module.css'
import ProductSelectorPopup from './ProductSelectorPopup'
import * as api from '@/lib/api'

export default function QuickOrder({ isOpen, onClose, user, currencySymbol = '$', taxes = [] }) {
  // Data
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [orderNo, setOrderNo] = useState('')

  // Order state
  const [lineItems, setLineItems] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState(null)
  const [orderDate, setOrderDate] = useState('')
  const [selectedTax, setSelectedTax] = useState(null)
  const [notes, setNotes] = useState('')

  // Customer autocomplete
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerDd, setShowCustomerDd] = useState(false)
  const [filteredCustomers, setFilteredCustomers] = useState([])
  const customerRef = useRef(null)

  // UI state
  const [showProductSelector, setShowProductSelector] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Close customer dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (customerRef.current && !customerRef.current.contains(e.target)) {
        setShowCustomerDd(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Load data when panel opens
  useEffect(() => {
    if (!isOpen) return
    setOrderDate(new Date().toISOString().split('T')[0])

    const defTax = taxes.find(t => t.is_default)
    if (defTax) setSelectedTax(defTax)

    const loadAll = async () => {
      try {
        const [prodRes, custRes, numRes] = await Promise.all([
          api.getProducts(),
          api.getCustomers(),
          api.getNextSalesOrderNumber(),
        ])
        setProducts(prodRes.data?.products || prodRes.products || [])
        setCustomers(custRes.data?.customers || custRes.customers || [])
        setOrderNo(numRes.data?.order_no || numRes.order_no || '')
      } catch { /* silent */ }

      // Auto-open product selector for customer role
      if (user?.role === 'customer') {
        setShowProductSelector(true)
      }
    }
    loadAll()
  }, [isOpen, taxes])

  // ── Customer autocomplete ──
  const handleCustomerInput = (val) => {
    setCustomerSearch(val)
    setSelectedCustomerId(null)
    if (!val.trim()) {
      setFilteredCustomers([])
      setShowCustomerDd(false)
      return
    }
    const filtered = customers.filter(c =>
      c.name?.toLowerCase().includes(val.toLowerCase())
    )
    setFilteredCustomers(filtered)
    setShowCustomerDd(filtered.length > 0)
  }

  const handleCustomerSelect = (c) => {
    setSelectedCustomer(c.name)
    setCustomerSearch(c.name)
    setSelectedCustomerId(c.id)
    setShowCustomerDd(false)
  }

  // ── Add product from popup ──
  const handleAddProduct = useCallback((product, qty) => {
    const rate = parseFloat(product.selling_price || 0)
    setLineItems(prev => {
      const existing = prev.find(i => i.product_id === product.id)
      if (existing) {
        return prev.map(i =>
          i.product_id === product.id
            ? { ...i, quantity: i.quantity + qty, amount: (i.quantity + qty) * i.rate }
            : i
        )
      }
      return [...prev, {
        id: Date.now() + Math.random(),
        product_id: product.id,
        sku: product.sku || '',
        description: product.name,
        quantity: qty,
        rate,
        amount: qty * rate,
      }]
    })
  }, [])

  // ── Qty adjust in order window ──
  const adjustQty = (id, delta) => {
    setLineItems(prev =>
      prev.map(i => {
        if (i.id !== id) return i
        const qty = Math.max(1, i.quantity + delta)
        return { ...i, quantity: qty, amount: qty * i.rate }
      })
    )
  }

  const removeLine = (id) => setLineItems(prev => prev.filter(i => i.id !== id))

  // ── Totals ──
  const subtotal = lineItems.reduce((s, i) => s + i.amount, 0)
  const taxRate  = selectedTax ? parseFloat(selectedTax.rate) / 100 : 0
  const taxAmt   = subtotal * taxRate
  const total    = subtotal + taxAmt

  // ── Save ──
  const handleSave = async () => {
    setError('')
    if (!selectedCustomerId) { setError('Please select a customer.'); return }
    if (lineItems.length === 0) { setError('Please add at least one product.'); return }

    setSaving(true)
    try {
      const payload = {
        customer_id: selectedCustomerId,
        order_date: orderDate,
        tax_id: selectedTax?.id || null,
        tax_rate: selectedTax ? parseFloat(selectedTax.rate) : 0,
        notes: notes || undefined,
        line_items: lineItems.map(i => ({
          sku: i.sku,
          description: i.description,
          quantity: i.quantity,
          rate: i.rate,
          amount: i.amount,
          tax_id: selectedTax?.id || null,
          tax_rate: selectedTax ? parseFloat(selectedTax.rate) : 0,
          tax_amount: selectedTax ? parseFloat((i.amount * taxRate).toFixed(4)) : 0,
        })),
      }
      await api.createSalesOrder(payload)
      setSuccessMsg('Order created successfully!')
      setTimeout(() => {
        resetForm()
        onClose()
      }, 1400)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setLineItems([])
    setSelectedCustomer('')
    setSelectedCustomerId(null)
    setCustomerSearch('')
    setNotes('')
    setError('')
    setSuccessMsg('')
    setOrderNo('')
    setSelectedTax(taxes.find(t => t.is_default) || null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      {/* ── Main panel ── */}
      <div className={styles.panel}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2 className={styles.title}>Quick Order</h2>
            {orderNo && <span className={styles.orderNo}>#{orderNo}</span>}
          </div>
          <button className={styles.closeBtn} onClick={handleClose}>✕</button>
        </div>

        {/* Body */}
        <div className={styles.body}>

          {/* Top fields row */}
          <div className={styles.fieldsRow}>
            {/* Customer */}
            <div className={styles.fieldGroup} ref={customerRef}>
              <label className={styles.label}>Customer <span className={styles.required}>*</span></label>
              <div className={styles.autocompleteWrap}>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Search customer..."
                  value={customerSearch}
                  onChange={e => handleCustomerInput(e.target.value)}
                  autoComplete="off"
                />
                {showCustomerDd && (
                  <div className={styles.dropdown}>
                    {filteredCustomers.map(c => (
                      <div
                        key={c.id}
                        className={styles.dropdownItem}
                        onMouseDown={() => handleCustomerSelect(c)}
                      >
                        {c.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Date */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Order Date</label>
              <input
                type="date"
                className={styles.input}
                value={orderDate}
                onChange={e => setOrderDate(e.target.value)}
              />
            </div>

            {/* Tax */}
            {taxes.length > 0 && (
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Tax</label>
                <select
                  className={styles.input}
                  value={selectedTax?.id || ''}
                  onChange={e => setSelectedTax(taxes.find(t => String(t.id) === e.target.value) || null)}
                >
                  <option value="">No Tax</option>
                  {taxes.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.rate}%)</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* ── Order Window ── */}
          <div className={styles.orderWindow}>
            <div className={styles.orderWindowHeader}>
              <div className={styles.orderWindowTitle}>
                <span>Order Items</span>
                {lineItems.length > 0 && (
                  <span className={styles.itemCount}>{lineItems.length} item{lineItems.length !== 1 ? 's' : ''}</span>
                )}
              </div>
              <button
                className={styles.browseBtn}
                onClick={() => setShowProductSelector(true)}
              >
                + Browse Products
              </button>
            </div>

            {/* Empty state */}
            {lineItems.length === 0 ? (
              <div className={styles.emptyOrder}>
                <div className={styles.emptyIcon}>🛒</div>
                <p className={styles.emptyText}>No products added yet</p>
                <p className={styles.emptyHint}>Click "Browse Products" to add items to this order</p>
                <button
                  className={styles.browseBtnLarge}
                  onClick={() => setShowProductSelector(true)}
                >
                  + Browse Products
                </button>
              </div>
            ) : (
              /* Order table */
              <div className={styles.tableWrap}>
                <table className={styles.orderTable}>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th className={styles.right}>Unit Price</th>
                      <th className={styles.center}>Quantity</th>
                      <th className={styles.right}>Amount</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map(item => (
                      <tr key={item.id}>
                        <td className={styles.productCell}>{item.description}</td>
                        <td className={styles.skuCell}>{item.sku}</td>
                        <td className={styles.right}>
                          {currencySymbol}{item.rate.toFixed(2)}
                        </td>
                        <td className={styles.center}>
                          <div className={styles.tableQtyControl}>
                            <button
                              className={styles.tableQtyBtn}
                              onClick={() => adjustQty(item.id, -1)}
                            >−</button>
                            <span className={styles.tableQtyVal}>{item.quantity}</span>
                            <button
                              className={styles.tableQtyBtn}
                              onClick={() => adjustQty(item.id, 1)}
                            >+</button>
                          </div>
                        </td>
                        <td className={`${styles.right} ${styles.amountCell}`}>
                          {currencySymbol}{item.amount.toFixed(2)}
                        </td>
                        <td>
                          <button
                            className={styles.removeBtn}
                            onClick={() => removeLine(item.id)}
                            title="Remove"
                          >✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Totals */}
          {lineItems.length > 0 && (
            <div className={styles.totals}>
              <div className={styles.totalRow}>
                <span>Subtotal</span>
                <span>{currencySymbol}{subtotal.toFixed(2)}</span>
              </div>
              {selectedTax && (
                <div className={styles.totalRow}>
                  <span>Tax ({selectedTax.name} {selectedTax.rate}%)</span>
                  <span>{currencySymbol}{taxAmt.toFixed(2)}</span>
                </div>
              )}
              <div className={`${styles.totalRow} ${styles.grandTotal}`}>
                <span>Total</span>
                <span>{currencySymbol}{total.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Notes</label>
            <textarea
              className={styles.textarea}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add order notes or instructions..."
              rows={2}
            />
          </div>

          {/* Messages */}
          {error      && <div className={styles.error}>{error}</div>}
          {successMsg && <div className={styles.success}>{successMsg}</div>}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={handleClose}>Cancel</button>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={saving || !!successMsg}
          >
            {saving ? 'Saving…' : 'Create Order'}
          </button>
        </div>
      </div>

      {/* ── Product Selector Popup ── */}
      <ProductSelectorPopup
        isOpen={showProductSelector}
        onClose={() => setShowProductSelector(false)}
        products={products}
        onAdd={handleAddProduct}
        currencySymbol={currencySymbol}
      />
    </>
  )
}
