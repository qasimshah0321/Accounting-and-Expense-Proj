'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './Invoice.module.css'
import * as api from '../lib/api'

export default function ExpenseCenter({ isOpen, onClose, taxes, onDirtyChange = () => {} }) {
  // ─── List state ───────────────────────────────────────────────────────────
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)

  // ─── Form state ───────────────────────────────────────────────────────────
  const [vendors, setVendors] = useState([])
  const [selectedVendorId, setSelectedVendorId] = useState(null)
  const [vendorSearchText, setVendorSearchText] = useState('')
  const [showVendorDropdown, setShowVendorDropdown] = useState(false)
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0])
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [selectedTax, setSelectedTax] = useState(null)
  const [showTaxDropdown, setShowTaxDropdown] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [referenceNo, setReferenceNo] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const autocompleteRef = useRef(null)
  const taxDropdownRef = useRef(null)

  // ─── Data loading ─────────────────────────────────────────────────────────
  const loadExpenses = useCallback(async () => {
    setLoading(true)
    setListError('')
    try {
      const res = await api.getExpenses()
      setExpenses(res.data?.expenses || res.expenses || res.data || [])
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
      loadExpenses()
      loadVendors()
    }
  }, [isOpen, loadExpenses, loadVendors])

  // ─── Click-outside handlers ───────────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        setShowVendorDropdown(false)
      }
    }
    if (showVendorDropdown) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showVendorDropdown])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (taxDropdownRef.current && !taxDropdownRef.current.contains(event.target)) {
        setShowTaxDropdown(false)
      }
    }
    if (showTaxDropdown) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showTaxDropdown])

  if (!isOpen) return null

  // ─── Form helpers ─────────────────────────────────────────────────────────
  const resetForm = () => {
    setSelectedVendorId(null)
    setVendorSearchText('')
    setExpenseDate(new Date().toISOString().split('T')[0])
    setCategory('')
    setDescription('')
    setAmount('')
    setSelectedTax(null)
    setPaymentMethod('cash')
    setReferenceNo('')
    setNotes('')
    setError('')
  }

  const populateForm = (expense) => {
    setSelectedVendorId(expense.vendor_id || null)
    setVendorSearchText(expense.vendor_name || '')
    setExpenseDate(expense.expense_date ? expense.expense_date.split('T')[0] : new Date().toISOString().split('T')[0])
    setCategory(expense.category || '')
    setDescription(expense.description || '')
    setAmount(expense.amount != null ? String(expense.amount) : '')
    setPaymentMethod(expense.payment_method || 'cash')
    setReferenceNo(expense.reference_no || '')
    setNotes(expense.notes || '')
    if (expense.tax_id && taxes) {
      const tax = taxes.find(t => t.id === expense.tax_id)
      setSelectedTax(tax || null)
    } else {
      setSelectedTax(null)
    }
    setError('')
  }

  // ─── List actions ─────────────────────────────────────────────────────────
  const handleNewExpense = () => {
    resetForm()
    setEditingExpense(null)
    onDirtyChange(false)
    setShowForm(true)
  }

  const handleEditExpense = async (expense) => {
    setListError('')
    try {
      const res = await api.getExpense(expense.id)
      const full = res.data || res
      setEditingExpense(full)
      populateForm(full)
      onDirtyChange(false)
      setShowForm(true)
    } catch (err) {
      setListError('Failed to load expense: ' + err.message)
    }
  }

  const handleDeleteExpense = async (id) => {
    if (!confirm('Are you sure you want to delete this expense?')) return
    setListError('')
    try {
      await api.deleteExpense(id)
      setExpenses(prev => prev.filter(e => e.id !== id))
    } catch (err) {
      setListError('Delete failed: ' + err.message)
    }
  }

  const handleApprove = async (id) => {
    setListError('')
    try {
      await api.approveExpense(id)
      loadExpenses()
    } catch (err) {
      setListError('Approve failed: ' + err.message)
    }
  }

  const handleMarkPaid = async (id) => {
    setListError('')
    try {
      await api.markExpensePaid(id)
      loadExpenses()
    } catch (err) {
      setListError('Mark paid failed: ' + err.message)
    }
  }

  const handleFormClose = () => {
    onDirtyChange(false)
    setShowForm(false)
    setEditingExpense(null)
  }

  // ─── Vendor autocomplete ──────────────────────────────────────────────────
  const handleVendorInputChange = (e) => {
    const value = e.target.value
    setVendorSearchText(value)
    setShowVendorDropdown(true)
    if (value === '') setSelectedVendorId(null)
  }

  const handleVendorSelect = (vendor) => {
    setSelectedVendorId(vendor.id)
    setVendorSearchText(vendor.name)
    setShowVendorDropdown(false)
  }

  const filteredVendors = vendors.filter(v =>
    (v.name || '').toLowerCase().includes(vendorSearchText.toLowerCase())
  )

  // ─── Tax handlers ─────────────────────────────────────────────────────────
  const handleTaxSelect = (tax) => {
    setSelectedTax(tax)
    setShowTaxDropdown(false)
  }

  // ─── Calculations ─────────────────────────────────────────────────────────
  const calcTaxAmount = () => {
    const amt = parseFloat(amount) || 0
    return selectedTax ? amt * Number(selectedTax.rate) / 100 : 0
  }
  const calcTotal = () => (parseFloat(amount) || 0) + calcTaxAmount()

  // ─── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setError('')
    if (!category.trim()) { setError('Category is required'); return }
    if (!amount || parseFloat(amount) <= 0) { setError('Amount must be greater than 0'); return }
    if (!expenseDate) { setError('Date is required'); return }
    setSaving(true)
    const taxRate = selectedTax ? Number(selectedTax.rate) || 0 : 0
    const payload = {
      expense_date: expenseDate,
      vendor_id: selectedVendorId || undefined,
      category: category,
      description: description || undefined,
      amount: parseFloat(amount),
      tax_id: selectedTax?.id || null,
      tax_rate: taxRate,
      tax_amount: calcTaxAmount(),
      total_amount: calcTotal(),
      payment_method: paymentMethod,
      reference_no: referenceNo || undefined,
      notes: notes || undefined,
    }
    try {
      if (editingExpense) {
        await api.updateExpense(editingExpense.id, payload)
      } else {
        await api.createExpense(payload)
      }
      onDirtyChange(false)
      setShowForm(false)
      setEditingExpense(null)
      loadExpenses()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ─── List display helpers ─────────────────────────────────────────────────
  const filteredExpenses = expenses.filter(e =>
    (e.expense_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.vendor_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString()
  }

  const formatCurrency = (amt) => '$' + (parseFloat(amt) || 0).toFixed(2)

  const getStatusClass = (status) => {
    switch (status) {
      case 'approved': case 'paid': return styles.statusPaid
      case 'submitted': return styles.statusSent
      case 'rejected': return styles.statusOverdue
      default: return styles.statusDraft
    }
  }

  const getPaymentStatusClass = (status) => {
    switch (status) {
      case 'paid': return styles.statusPaid
      default: return styles.statusOverdue
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Expense List View ─────────────────────────────────────────────── */}
      <div className={styles.invoiceListOverlay}>
        <div className={styles.invoiceListContainer}>

          {/* Header */}
          <div className={styles.listHeader}>
            <div className={styles.listHeaderLeft}>
              <h2>Expenses</h2>
            </div>
            <div className={styles.listHeaderRight}>
              <button className={styles.btnNewInvoice} onClick={handleNewExpense}>
                <i className="fas fa-plus"></i> New Expense
              </button>
              <button className={styles.closeBtn} onClick={onClose}>
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className={styles.searchSection}>
            <div className={styles.searchWrapper}>
              <i className="fas fa-search"></i>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search by expense #, category, or vendor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className={styles.btnRefresh} onClick={loadExpenses} title="Refresh">
              <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
            </button>
          </div>

          {listError && (
            <div className={styles.errorBanner}>
              <i className="fas fa-exclamation-circle"></i> {listError}
            </div>
          )}

          {/* Expense Table */}
          <div className={styles.invoiceGridContainer}>
            {loading ? (
              <div className={styles.loadingState}>
                <i className="fas fa-spinner fa-spin"></i>
                <p>Loading expenses...</p>
              </div>
            ) : filteredExpenses.length > 0 ? (
              <table className={styles.invoiceTable}>
                <thead>
                  <tr>
                    <th>Expense #</th>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Vendor</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((exp) => (
                    <tr key={exp.id}>
                      <td><strong>{exp.expense_no || '-'}</strong></td>
                      <td>{formatDate(exp.expense_date)}</td>
                      <td>{exp.category || '-'}</td>
                      <td>{exp.vendor_name || '-'}</td>
                      <td>{exp.description ? (exp.description.length > 30 ? exp.description.substring(0, 30) + '...' : exp.description) : '-'}</td>
                      <td>{formatCurrency(exp.total_amount || exp.amount)}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${getStatusClass(exp.status)}`}>
                          {exp.status || 'draft'}
                        </span>
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${getPaymentStatusClass(exp.payment_status)}`}>
                          {exp.payment_status || 'unpaid'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actionButtons}>
                          <button className={styles.btnEdit} title="Edit" onClick={() => handleEditExpense(exp)}>
                            <i className="fas fa-edit"></i>
                          </button>
                          {(exp.status === 'draft' || exp.status === 'submitted') && (
                            <button className={styles.btnEdit} title="Approve" onClick={() => handleApprove(exp.id)} style={{ color: '#10b981' }}>
                              <i className="fas fa-check"></i>
                            </button>
                          )}
                          {exp.status === 'approved' && exp.payment_status !== 'paid' && (
                            <button className={styles.btnEdit} title="Mark Paid" onClick={() => handleMarkPaid(exp.id)} style={{ color: '#3b82f6' }}>
                              <i className="fas fa-dollar-sign"></i>
                            </button>
                          )}
                          <button className={styles.btnDelete} title="Delete" onClick={() => handleDeleteExpense(exp.id)}>
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
                <i className="fas fa-receipt"></i>
                <h3>No expenses found</h3>
                <p>{searchTerm ? 'Try adjusting your search' : 'Click "New Expense" to record your first expense'}</p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Expense Form Popup ────────────────────────────────────────────── */}
      {showForm && (
        <div className={styles.invoicePopupOverlay}>
          <div className={styles.invoicePopup}>

            {/* Header */}
            <div className={styles.popupHeader}>
              <div className={styles.headerLeft}>
                <h2>{editingExpense ? `Edit Expense ${editingExpense.expense_no || ''}` : 'Record Expense'}</h2>
              </div>
              <div className={styles.headerRight}>
                <button className={styles.closeBtn} onClick={handleFormClose}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className={styles.popupContent}>

              <div className={styles.invoiceUpperSection}>
                <div className={styles.sectionCard}>
                  <div className={styles.invoiceHeaderRow}>
                    {/* Left Side */}
                    <div className={styles.customerSection}>
                      <div className={styles.formGroup}>
                        <label>Category</label>
                        <input
                          type="text"
                          className={styles.formControlStandard}
                          placeholder="e.g. Office Supplies, Travel, Utilities"
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label>Vendor (optional)</label>
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
                        <label>Description</label>
                        <textarea
                          className={styles.formControlStandard}
                          rows="3"
                          placeholder="Describe the expense..."
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                        ></textarea>
                      </div>
                    </div>

                    {/* Right Side */}
                    <div className={styles.invoiceDetailsColumn}>
                      <div className={styles.formGroup}>
                        <label>Date</label>
                        <input
                          type="date"
                          className={styles.formControlStandard}
                          value={expenseDate}
                          onChange={(e) => setExpenseDate(e.target.value)}
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
                        <label>Tax</label>
                        <div className={styles.taxSelectWrapper} style={{ position: 'relative' }} ref={taxDropdownRef}>
                          <div
                            className={styles.taxSelectButton}
                            onClick={() => setShowTaxDropdown(true)}
                          >
                            <span>{selectedTax ? `${selectedTax.name} (${selectedTax.rate}%)` : 'No tax'}</span>
                            <i className="fas fa-chevron-down"></i>
                          </div>
                          {showTaxDropdown && (
                            <div className={styles.autocompleteDropdown}>
                              <div
                                className={styles.autocompleteOption}
                                onClick={() => { setSelectedTax(null); setShowTaxDropdown(false) }}
                              >
                                No tax
                              </div>
                              {(taxes || []).map((t) => (
                                <div
                                  key={t.id}
                                  className={styles.autocompleteOption}
                                  onClick={() => handleTaxSelect(t)}
                                >
                                  {t.name} ({t.rate}%)
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className={styles.formGroup}>
                        <label>Payment Method</label>
                        <select
                          className={styles.formControlStandard}
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                        >
                          <option value="cash">Cash</option>
                          <option value="card">Card</option>
                          <option value="bank_transfer">Bank Transfer</option>
                          <option value="check">Check</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div className={styles.formGroup}>
                        <label>Reference No.</label>
                        <input
                          type="text"
                          className={styles.formControlStandard}
                          placeholder="Receipt # or reference"
                          value={referenceNo}
                          onChange={(e) => setReferenceNo(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Totals Section */}
              <div className={styles.invoiceBottomSection}>
                <div className={styles.sectionCard}>
                  <div className={styles.bottomRow}>
                    <div className={styles.notesAttachmentsSection}>
                      <div className={styles.formGroup}>
                        <label>Notes</label>
                        <textarea
                          className={styles.formControlStandard}
                          rows="3"
                          placeholder="Additional notes..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                        ></textarea>
                      </div>
                    </div>
                    <div className={styles.totalsSection}>
                      <div className={styles.totalsGrid}>
                        <div className={styles.totalRow}>
                          <span className={styles.totalLabel}>Amount:</span>
                          <span className={styles.totalValue}>{formatCurrency(amount)}</span>
                        </div>
                        <div className={styles.totalRow}>
                          <span className={styles.totalLabel}>Tax:</span>
                          <span className={styles.totalValue}>{formatCurrency(calcTaxAmount())}</span>
                        </div>
                        <div className={`${styles.totalRow} ${styles.grandTotal}`}>
                          <span className={styles.totalLabel}>Total:</span>
                          <span className={styles.totalValue}>{formatCurrency(calcTotal())}</span>
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
                <button className={styles.btnCancel} onClick={handleFormClose}>Cancel</button>
              </div>
              <div className={styles.footerRight}>
                <button className={styles.btnSecondary} onClick={handleSave} disabled={saving}>
                  <i className={saving ? 'fas fa-spinner fa-spin' : 'fas fa-save'}></i>
                  {saving ? 'Saving...' : editingExpense ? 'Update' : 'Save'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  )
}
