'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './Invoice.module.css'
import * as api from '../lib/api'

export default function CustomerPayments({ isOpen, onClose }) {
  // ─── List state ───────────────────────────────────────────────────────────
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)

  // ─── Form state ───────────────────────────────────────────────────────────
  const [customers, setCustomers] = useState([])
  const [selectedCustomerId, setSelectedCustomerId] = useState(null)
  const [customerSearchText, setCustomerSearchText] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer')
  const [referenceNo, setReferenceNo] = useState('')
  const [depositToAccount, setDepositToAccount] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // ─── Outstanding invoices for allocation ──────────────────────────────────
  const [outstandingInvoices, setOutstandingInvoices] = useState([])
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null)
  const [loadingInvoices, setLoadingInvoices] = useState(false)

  const autocompleteRef = useRef(null)

  // ─── Data loading ─────────────────────────────────────────────────────────
  const loadPayments = useCallback(async () => {
    setLoading(true)
    setListError('')
    try {
      const res = await api.getCustomerPayments()
      setPayments(res.data?.payments || res.payments || res.data || [])
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
      loadPayments()
      loadCustomers()
    }
  }, [isOpen, loadPayments, loadCustomers])

  // ─── Load outstanding invoices when customer changes ────────────────────
  useEffect(() => {
    if (selectedCustomerId) {
      setLoadingInvoices(true)
      Promise.all([
        api.getOutstandingInvoices(selectedCustomerId),
        api.getPartiallyPaidInvoices(selectedCustomerId),
      ]).then(([unpaidRes, partialRes]) => {
        const unpaid = unpaidRes.data?.invoices || unpaidRes.invoices || []
        const partial = partialRes.data?.invoices || partialRes.invoices || []
        setOutstandingInvoices([...unpaid, ...partial])
      }).catch(() => {
        setOutstandingInvoices([])
      }).finally(() => setLoadingInvoices(false))
    } else {
      setOutstandingInvoices([])
    }
  }, [selectedCustomerId])

  // ─── Click-outside handler ────────────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        setShowCustomerDropdown(false)
      }
    }
    if (showCustomerDropdown) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showCustomerDropdown])

  if (!isOpen) return null

  // ─── Form helpers ─────────────────────────────────────────────────────────
  const resetForm = () => {
    setSelectedCustomerId(null)
    setCustomerSearchText('')
    setPaymentDate(new Date().toISOString().split('T')[0])
    setAmount('')
    setPaymentMethod('bank_transfer')
    setReferenceNo('')
    setDepositToAccount('')
    setNotes('')
    setSelectedInvoiceId(null)
    setOutstandingInvoices([])
    setError('')
  }

  const handleNewPayment = () => {
    resetForm()
    setShowForm(true)
  }

  const handleFormClose = () => {
    setShowForm(false)
  }

  const handleDeletePayment = async (id) => {
    if (!confirm('Are you sure you want to delete this payment?')) return
    setListError('')
    try {
      await api.deleteCustomerPayment(id)
      setPayments(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      setListError('Delete failed: ' + err.message)
    }
  }

  // ─── Customer autocomplete ────────────────────────────────────────────────
  const handleCustomerInputChange = (e) => {
    const value = e.target.value
    setCustomerSearchText(value)
    setShowCustomerDropdown(true)
    if (value === '') {
      setSelectedCustomerId(null)
    }
  }

  const handleCustomerSelect = (customer) => {
    setSelectedCustomerId(customer.id)
    setCustomerSearchText(customer.name)
    setShowCustomerDropdown(false)
  }

  const filteredCustomers = customers.filter(c =>
    (c.name || '').toLowerCase().includes(customerSearchText.toLowerCase())
  )

  // ─── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setError('')
    if (!selectedCustomerId) { setError('Please select a customer'); return }
    if (!amount || parseFloat(amount) <= 0) { setError('Amount must be greater than 0'); return }
    if (!paymentDate) { setError('Payment date is required'); return }
    setSaving(true)
    const payload = {
      customer_id: selectedCustomerId,
      payment_date: paymentDate,
      amount: parseFloat(amount),
      payment_method: paymentMethod,
      reference_no: referenceNo || undefined,
      deposit_to_account: depositToAccount || undefined,
      notes: notes || undefined,
      invoice_id: selectedInvoiceId || undefined,
    }
    try {
      await api.createCustomerPayment(payload)
      setShowForm(false)
      loadPayments()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ─── Display helpers ──────────────────────────────────────────────────────
  const filteredPayments = payments.filter(p =>
    (p.payment_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString()
  }

  const formatCurrency = (amt) => '$' + (parseFloat(amt) || 0).toFixed(2)

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Payment List View ─────────────────────────────────────────────── */}
      <div className={styles.invoiceListOverlay}>
        <div className={styles.invoiceListContainer}>

          <div className={styles.listHeader}>
            <div className={styles.listHeaderLeft}>
              <h2>Customer Payments</h2>
            </div>
            <div className={styles.listHeaderRight}>
              <button className={styles.btnNewInvoice} onClick={handleNewPayment}>
                <i className="fas fa-plus"></i> Receive Payment
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
                placeholder="Search by payment # or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className={styles.btnRefresh} onClick={loadPayments} title="Refresh">
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
                <p>Loading payments...</p>
              </div>
            ) : filteredPayments.length > 0 ? (
              <table className={styles.invoiceTable}>
                <thead>
                  <tr>
                    <th>Payment #</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((p) => (
                    <tr key={p.id}>
                      <td><strong>{p.payment_no || '-'}</strong></td>
                      <td>{p.customer_name || '-'}</td>
                      <td>{formatDate(p.payment_date)}</td>
                      <td>{formatCurrency(p.amount)}</td>
                      <td>{(p.payment_method || '-').replace('_', ' ')}</td>
                      <td>{p.reference_no || '-'}</td>
                      <td>
                        <div className={styles.actionButtons}>
                          <button className={styles.btnDelete} title="Delete" onClick={() => handleDeletePayment(p.id)}>
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
                <i className="fas fa-hand-holding-usd"></i>
                <h3>No payments found</h3>
                <p>{searchTerm ? 'Try adjusting your search' : 'Click "Receive Payment" to record a customer payment'}</p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Payment Form Popup ────────────────────────────────────────────── */}
      {showForm && (
        <div className={styles.invoicePopupOverlay}>
          <div className={styles.invoicePopup}>

            <div className={styles.popupHeader}>
              <div className={styles.headerLeft}>
                <h2>Receive Payment</h2>
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
                    {/* Left Side */}
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
                              {filteredCustomers.length > 0 ? (
                                filteredCustomers.map(customer => (
                                  <div
                                    key={customer.id}
                                    className={styles.autocompleteOption}
                                    onClick={() => handleCustomerSelect(customer)}
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
                        <label>Deposit To Account</label>
                        <input
                          type="text"
                          className={styles.formControlStandard}
                          placeholder="e.g. Checking Account"
                          value={depositToAccount}
                          onChange={(e) => setDepositToAccount(e.target.value)}
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label>Notes</label>
                        <textarea
                          className={styles.formControlStandard}
                          rows="3"
                          placeholder="Payment notes..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                        ></textarea>
                      </div>
                    </div>

                    {/* Right Side */}
                    <div className={styles.invoiceDetailsColumn}>
                      <div className={styles.formGroup}>
                        <label>Payment Date</label>
                        <input
                          type="date"
                          className={styles.formControlStandard}
                          value={paymentDate}
                          onChange={(e) => setPaymentDate(e.target.value)}
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label>Amount</label>
                        <input
                          type="number"
                          className={styles.formControlStandard}
                          placeholder="0.00"
                          value={amount}
                          min="0"
                          step="0.01"
                          onChange={(e) => setAmount(e.target.value)}
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label>Payment Method</label>
                        <select
                          className={styles.formControlStandard}
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                        >
                          <option value="cash">Cash</option>
                          <option value="check">Check</option>
                          <option value="bank_transfer">Bank Transfer</option>
                          <option value="card">Card</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div className={styles.formGroup}>
                        <label>Reference No.</label>
                        <input
                          type="text"
                          className={styles.formControlStandard}
                          placeholder="Check # or transaction ref"
                          value={referenceNo}
                          onChange={(e) => setReferenceNo(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Outstanding Invoices for Allocation */}
              {selectedCustomerId && (
                <div className={styles.invoiceBottomSection}>
                  <div className={styles.sectionCard}>
                    <div className={styles.sectionHeader}>
                      <h3>Apply to Invoice (optional)</h3>
                    </div>
                    <div className={styles.tableContainer}>
                      {loadingInvoices ? (
                        <div className={styles.loadingState}>
                          <i className="fas fa-spinner fa-spin"></i>
                          <p>Loading outstanding invoices...</p>
                        </div>
                      ) : outstandingInvoices.length > 0 ? (
                        <table className={styles.itemsTable}>
                          <thead>
                            <tr>
                              <th style={{ width: '40px' }}></th>
                              <th>Invoice #</th>
                              <th>Date</th>
                              <th>Due Date</th>
                              <th>Total</th>
                              <th>Paid</th>
                              <th>Due</th>
                            </tr>
                          </thead>
                          <tbody>
                            {outstandingInvoices.map((inv) => (
                              <tr key={inv.id} style={selectedInvoiceId === inv.id ? { backgroundColor: '#eff6ff' } : {}}>
                                <td>
                                  <input
                                    type="radio"
                                    name="invoiceAlloc"
                                    checked={selectedInvoiceId === inv.id}
                                    onChange={() => setSelectedInvoiceId(inv.id)}
                                  />
                                </td>
                                <td><strong>{inv.invoice_no}</strong></td>
                                <td>{formatDate(inv.invoice_date)}</td>
                                <td>{formatDate(inv.due_date)}</td>
                                <td>{formatCurrency(inv.grand_total)}</td>
                                <td>{formatCurrency(inv.amount_paid)}</td>
                                <td style={{ fontWeight: 600, color: '#ef4444' }}>{formatCurrency(inv.amount_due)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className={styles.emptyState} style={{ padding: '20px' }}>
                          <p>No outstanding invoices for this customer</p>
                        </div>
                      )}
                    </div>
                    {selectedInvoiceId && (
                      <div style={{ padding: '10px 16px', fontSize: '13px', color: '#6b7280' }}>
                        <button
                          style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '13px' }}
                          onClick={() => setSelectedInvoiceId(null)}
                        >
                          Clear selection (record as unallocated)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* Fixed Footer */}
            <div className={styles.popupFooter}>
              <div className={styles.footerLeft}>
                {error && <span style={{ color: '#ef4444', fontSize: '14px' }}>{error}</span>}
                <button className={styles.btnCancel} onClick={handleFormClose}>Cancel</button>
              </div>
              <div className={styles.footerRight}>
                <button className={styles.btnSecondary} onClick={handleSave} disabled={saving}>
                  <i className={saving ? 'fas fa-spinner fa-spin' : 'fas fa-save'}></i>
                  {saving ? 'Saving...' : 'Record Payment'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  )
}
