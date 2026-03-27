'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './Invoice.module.css'
import * as api from '../lib/api'

export default function VendorPayments({ isOpen, onClose, currencySymbol = '$' }) {
  // ─── List state ───────────────────────────────────────────────────────────
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)

  // ─── Form state ───────────────────────────────────────────────────────────
  const [vendors, setVendors] = useState([])
  const [selectedVendorId, setSelectedVendorId] = useState(null)
  const [vendorSearchText, setVendorSearchText] = useState('')
  const [showVendorDropdown, setShowVendorDropdown] = useState(false)
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer')
  const [referenceNo, setReferenceNo] = useState('')
  const [paymentFromAccount, setPaymentFromAccount] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // ─── Outstanding bills for allocation ─────────────────────────────────────
  const [outstandingBills, setOutstandingBills] = useState([])
  const [selectedBillId, setSelectedBillId] = useState(null)
  const [loadingBills, setLoadingBills] = useState(false)

  const autocompleteRef = useRef(null)

  // ─── Data loading ─────────────────────────────────────────────────────────
  const loadPayments = useCallback(async () => {
    setLoading(true)
    setListError('')
    try {
      const res = await api.getVendorPayments()
      setPayments(res.data?.vendor_payments || res.data?.payments || res.payments || [])
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
      loadPayments()
      loadVendors()
    }
  }, [isOpen, loadPayments, loadVendors])

  // ─── Load outstanding bills when vendor changes ─────────────────────────
  useEffect(() => {
    if (selectedVendorId) {
      setLoadingBills(true)
      Promise.all([
        api.getOutstandingBills(selectedVendorId),
        api.getPartiallyPaidBills(selectedVendorId),
      ]).then(([unpaidRes, partialRes]) => {
        const unpaid = unpaidRes.data?.bills || unpaidRes.bills || []
        const partial = partialRes.data?.bills || partialRes.bills || []
        setOutstandingBills([...unpaid, ...partial])
      }).catch(() => {
        setOutstandingBills([])
      }).finally(() => setLoadingBills(false))
    } else {
      setOutstandingBills([])
    }
  }, [selectedVendorId])

  // ─── Click-outside handler ────────────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        setShowVendorDropdown(false)
      }
    }
    if (showVendorDropdown) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showVendorDropdown])

  if (!isOpen) return null

  // ─── Form helpers ─────────────────────────────────────────────────────────
  const resetForm = () => {
    setSelectedVendorId(null)
    setVendorSearchText('')
    setPaymentDate(new Date().toISOString().split('T')[0])
    setAmount('')
    setPaymentMethod('bank_transfer')
    setReferenceNo('')
    setPaymentFromAccount('')
    setNotes('')
    setSelectedBillId(null)
    setOutstandingBills([])
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
      await api.deleteVendorPayment(id)
      setPayments(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      setListError('Delete failed: ' + err.message)
    }
  }

  // ─── Vendor autocomplete ─────────────────────────────────────────────────
  const handleVendorInputChange = (e) => {
    const value = e.target.value
    setVendorSearchText(value)
    setShowVendorDropdown(true)
    if (value === '') {
      setSelectedVendorId(null)
    }
  }

  const handleVendorSelect = (vendor) => {
    setSelectedVendorId(vendor.id)
    setVendorSearchText(vendor.name)
    setShowVendorDropdown(false)
  }

  const filteredVendors = vendors.filter(v =>
    (v.name || '').toLowerCase().includes(vendorSearchText.toLowerCase())
  )

  // ─── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setError('')
    if (!selectedVendorId) { setError('Please select a vendor'); return }
    if (!amount || parseFloat(amount) <= 0) { setError('Amount must be greater than 0'); return }
    if (!paymentDate) { setError('Payment date is required'); return }
    setSaving(true)
    const payload = {
      vendor_id: selectedVendorId,
      payment_date: paymentDate,
      amount: parseFloat(amount),
      payment_method: paymentMethod,
      reference_no: referenceNo || undefined,
      payment_from_account: paymentFromAccount || undefined,
      notes: notes || undefined,
      bill_id: selectedBillId || undefined,
    }
    try {
      await api.createVendorPayment(payload)
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
    (p.vendor_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString()
  }

  const formatCurrency = (amt) => currencySymbol + (parseFloat(amt) || 0).toFixed(2)

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Payment List View ─────────────────────────────────────────────── */}
      <div className={styles.invoiceListOverlay}>
        <div className={styles.invoiceListContainer}>

          <div className={styles.listHeader}>
            <div className={styles.listHeaderLeft}>
              <h2>Vendor Payments</h2>
            </div>
            <div className={styles.listHeaderRight}>
              <button className={styles.btnNewInvoice} onClick={handleNewPayment}>
                <i className="fas fa-plus"></i> Make Payment
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
                placeholder="Search by payment # or vendor..."
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
                    <th>Vendor</th>
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
                      <td>{p.vendor_name || '-'}</td>
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
                <i className="fas fa-money-bill-wave"></i>
                <h3>No payments found</h3>
                <p>{searchTerm ? 'Try adjusting your search' : 'Click "Make Payment" to record a vendor payment'}</p>
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
                <h2>Make Payment</h2>
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
                        <label>Vendor</label>
                        <div className={styles.autocompleteWrapper} ref={autocompleteRef}>
                          <input
                            type="text"
                            className={styles.formControlStandard}
                            placeholder="Search or select vendor"
                            value={vendorSearchText}
                            onChange={handleVendorInputChange}
                            onFocus={() => setShowVendorDropdown(true)}
                          />
                          {showVendorDropdown && (
                            <div className={styles.autocompleteDropdown}>
                              {filteredVendors.length > 0 ? (
                                filteredVendors.map(vendor => (
                                  <div
                                    key={vendor.id}
                                    className={styles.autocompleteOption}
                                    onClick={() => handleVendorSelect(vendor)}
                                  >
                                    {vendor.name}
                                  </div>
                                ))
                              ) : (
                                vendorSearchText && (
                                  <div className={styles.autocompleteOption + ' ' + styles.noResults}>
                                    No vendors found
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className={styles.formGroup}>
                        <label>Payment From Account</label>
                        <input
                          type="text"
                          className={styles.formControlStandard}
                          placeholder="e.g. Checking Account"
                          value={paymentFromAccount}
                          onChange={(e) => setPaymentFromAccount(e.target.value)}
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

              {/* Outstanding Bills for Allocation */}
              {selectedVendorId && (
                <div className={styles.invoiceBottomSection}>
                  <div className={styles.sectionCard}>
                    <div className={styles.sectionHeader}>
                      <h3>Apply to Bill (optional)</h3>
                    </div>
                    <div className={styles.tableContainer}>
                      {loadingBills ? (
                        <div className={styles.loadingState}>
                          <i className="fas fa-spinner fa-spin"></i>
                          <p>Loading outstanding bills...</p>
                        </div>
                      ) : outstandingBills.length > 0 ? (
                        <table className={styles.itemsTable}>
                          <thead>
                            <tr>
                              <th style={{ width: '40px' }}></th>
                              <th>Bill #</th>
                              <th>Date</th>
                              <th>Due Date</th>
                              <th>Total</th>
                              <th>Paid</th>
                              <th>Due</th>
                            </tr>
                          </thead>
                          <tbody>
                            {outstandingBills.map((bill) => (
                              <tr key={bill.id} style={selectedBillId === bill.id ? { backgroundColor: '#eff6ff' } : {}}>
                                <td>
                                  <input
                                    type="radio"
                                    name="billAlloc"
                                    checked={selectedBillId === bill.id}
                                    onChange={() => setSelectedBillId(bill.id)}
                                  />
                                </td>
                                <td><strong>{bill.bill_no}</strong></td>
                                <td>{formatDate(bill.bill_date)}</td>
                                <td>{formatDate(bill.due_date)}</td>
                                <td>{formatCurrency(bill.total_amount)}</td>
                                <td>{formatCurrency(bill.amount_paid)}</td>
                                <td style={{ fontWeight: 600, color: '#ef4444' }}>{formatCurrency(bill.amount_due)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className={styles.emptyState} style={{ padding: '20px' }}>
                          <p>No outstanding bills for this vendor</p>
                        </div>
                      )}
                    </div>
                    {selectedBillId && (
                      <div style={{ padding: '10px 16px', fontSize: '13px', color: '#6b7280' }}>
                        <button
                          style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '13px' }}
                          onClick={() => setSelectedBillId(null)}
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
