'use client'

import { useState, useEffect, useCallback } from 'react'
import styles from './Invoice.module.css'
import * as api from '../lib/api'

const TYPE_ORDER = ['asset', 'liability', 'equity', 'revenue', 'expense']
const TYPE_LABELS = { asset: 'Assets', liability: 'Liabilities', equity: 'Equity', revenue: 'Revenue', expense: 'Expenses' }

export default function OpeningBalance({ isOpen, onClose, currencySymbol = '$' }) {
  const [accounts, setAccounts] = useState([])
  const [balances, setBalances] = useState({})           // { account_id: amount_string }
  const [openingDate, setOpeningDate] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-01-01`
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [existingOB, setExistingOB] = useState(null)     // posted OB data
  const [viewMode, setViewMode] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [acctRes, obRes] = await Promise.all([api.getAccounts(), api.getOpeningBalance()])
      const allAccounts = acctRes.data?.accounts || acctRes.accounts || acctRes.data || []
      // Exclude Opening Balance Equity (3050) — it's auto-calculated
      setAccounts(allAccounts.filter(a => a.account_number !== '3050' && a.is_active))

      const ob = obRes.data || obRes
      if (ob.posted) {
        setExistingOB(ob)
        setViewMode(true)
        setOpeningDate(ob.opening_date?.split('T')[0] || ob.opening_date || '')
        // Pre-fill balance inputs from existing OB
        const filled = {}
        for (const line of ob.balances || []) {
          if (line.account_number !== '3050') filled[line.account_id] = String(line.balance || '')
        }
        setBalances(filled)
      } else {
        setExistingOB(null)
        setViewMode(false)
        setBalances({})
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (isOpen) loadData() }, [isOpen, loadData])

  const setBalance = (accountId, value) => {
    setBalances(prev => ({ ...prev, [accountId]: value }))
  }

  // Compute live totals
  const { totalDebits, totalCredits, obEquityBalance } = (() => {
    let dr = 0, cr = 0
    for (const acct of accounts) {
      const raw = parseFloat(balances[acct.id]) || 0
      if (raw === 0) continue
      const amount = Math.abs(raw)
      const isNormal = raw > 0
      if (acct.normal_balance === 'debit') {
        if (isNormal) dr += amount; else cr += amount
      } else {
        if (isNormal) cr += amount; else dr += amount
      }
    }
    const diff = dr - cr   // positive → need CR to OB equity; negative → need DR to OB equity
    return { totalDebits: dr, totalCredits: cr, obEquityBalance: diff }
  })()

  const isBalanced = Math.abs(obEquityBalance) < 0.01

  const handleSave = async () => {
    if (!openingDate) { setError('Opening date is required.'); return }
    const entries = accounts
      .map(a => ({ account_id: a.id, balance: parseFloat(balances[a.id]) || 0 }))
      .filter(e => Math.abs(e.balance) > 0)
    if (!entries.length) { setError('Enter at least one account balance.'); return }

    setSaving(true)
    setError('')
    try {
      await api.postOpeningBalance({ opening_date: openingDate, balances: entries })
      await loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = () => setViewMode(false)

  const fmt = (val) => {
    const n = Math.abs(parseFloat(val) || 0)
    return currencySymbol + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const groupedAccounts = {}
  for (const type of TYPE_ORDER) {
    groupedAccounts[type] = accounts.filter(a => a.account_type === type)
  }

  if (!isOpen) return null

  return (
    <div className={styles.invoicePopupOverlay} onClick={onClose}>
      <div className={styles.invoicePopup} onClick={e => e.stopPropagation()} style={{ maxWidth: 860, width: '95%' }}>

        {/* Header */}
        <div className={styles.popupHeader}>
          <h2>Opening Balance Setup</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {existingOB && viewMode && (
              <button onClick={handleEdit} style={{ padding: '6px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                <i className="fas fa-edit" style={{ marginRight: 6 }} />Edit
              </button>
            )}
            <button className={styles.closeBtn} onClick={onClose}><i className="fas fa-times" /></button>
          </div>
        </div>

        <div className={styles.popupContent}>
          {loading && <div style={{ textAlign: 'center', padding: 40 }}><i className="fas fa-spinner fa-spin" /> Loading...</div>}

          {!loading && (
            <>
              {/* Info banner when already posted */}
              {existingOB && viewMode && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <i className="fas fa-check-circle" style={{ color: '#16a34a', fontSize: 16 }} />
                  <span style={{ fontSize: 13, color: '#166534' }}>
                    Opening balance posted as <strong>{existingOB.entry_no}</strong> on <strong>{existingOB.opening_date?.split('T')[0]}</strong>.
                    Click <strong>Edit</strong> to re-enter.
                  </span>
                </div>
              )}

              {error && (
                <div style={{ color: '#dc2626', marginBottom: 12, padding: '8px 12px', background: '#fef2f2', borderRadius: 6 }}>{error}</div>
              )}

              {/* Date */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <label style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>Opening Date *</label>
                <input
                  type="date" value={openingDate}
                  onChange={e => setOpeningDate(e.target.value)}
                  readOnly={viewMode}
                  style={{ padding: '7px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, background: viewMode ? '#f9fafb' : undefined }}
                />
                <span style={{ fontSize: 12, color: '#6b7280' }}>Enter balances as at this date from your prior system</span>
              </div>

              {/* Account table */}
              <div style={{ maxHeight: 420, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 1 }}>
                      <th style={{ padding: '9px 12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', width: 80 }}>Acct #</th>
                      <th style={{ padding: '9px 12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Account Name</th>
                      <th style={{ padding: '9px 12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', width: 70 }}>Normal</th>
                      <th style={{ padding: '9px 12px', textAlign: 'right', borderBottom: '2px solid #e2e8f0', width: 160 }}>Opening Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TYPE_ORDER.map(type => {
                      const typeAccounts = groupedAccounts[type] || []
                      if (!typeAccounts.length) return null
                      return [
                        <tr key={`hdr-${type}`}>
                          <td colSpan={4} style={{ padding: '8px 12px', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                            {TYPE_LABELS[type]}
                          </td>
                        </tr>,
                        ...typeAccounts.map(acct => {
                          const val = balances[acct.id] || ''
                          const hasValue = parseFloat(val) !== 0 && val !== ''
                          return (
                            <tr key={acct.id} style={{ borderBottom: '1px solid #f1f5f9', background: hasValue ? '#fafff4' : undefined }}>
                              <td style={{ padding: '7px 12px' }}>
                                <span style={{ background: '#f1f5f9', color: '#374151', fontFamily: 'monospace', fontWeight: 700, fontSize: 11, padding: '2px 6px', borderRadius: 4, border: '1px solid #e2e8f0' }}>
                                  {acct.account_number}
                                </span>
                              </td>
                              <td style={{ padding: '7px 12px' }}>{acct.name}</td>
                              <td style={{ padding: '7px 12px', textAlign: 'center' }}>
                                <span style={{ padding: '1px 7px', borderRadius: 4, fontSize: 11, background: acct.normal_balance === 'debit' ? '#dbeafe' : '#fce7f3', color: acct.normal_balance === 'debit' ? '#1e40af' : '#9d174d' }}>
                                  {acct.normal_balance}
                                </span>
                              </td>
                              <td style={{ padding: '6px 12px', textAlign: 'right' }}>
                                {viewMode ? (
                                  <span style={{ fontFamily: 'monospace', fontWeight: hasValue ? 600 : undefined, color: hasValue ? '#111' : '#94a3b8' }}>
                                    {hasValue ? fmt(val) : '—'}
                                  </span>
                                ) : (
                                  <input
                                    type="number"
                                    value={val}
                                    onChange={e => setBalance(acct.id, e.target.value)}
                                    placeholder="0.00"
                                    step="0.01"
                                    style={{ width: '100%', padding: '5px 8px', border: '1px solid #d1d5db', borderRadius: 4, textAlign: 'right', fontSize: 13, background: hasValue ? '#f0fdf4' : undefined }}
                                  />
                                )}
                              </td>
                            </tr>
                          )
                        })
                      ]
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totals summary */}
              <div style={{ marginTop: 16, background: '#f8fafc', borderRadius: 8, padding: '14px 18px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Total Debits</div>
                    <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: '#1e40af' }}>{fmt(totalDebits)}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Total Credits</div>
                    <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: '#166534' }}>{fmt(totalCredits)}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Opening Balance Equity (3050)</div>
                    <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: isBalanced ? '#166534' : '#d97706' }}>
                      {isBalanced ? '—  Balanced' : fmt(Math.abs(obEquityBalance))}
                    </div>
                    {!isBalanced && (
                      <div style={{ fontSize: 11, color: '#92400e', marginTop: 2 }}>
                        Auto-posted to account 3050 to balance the entry
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              {!viewMode && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                  <button onClick={onClose} style={{ padding: '8px 20px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className={styles.btnPrimary}
                    style={{ padding: '8px 24px' }}
                  >
                    {saving ? <><i className="fas fa-spinner fa-spin" /> Posting...</> : (existingOB ? 'Update Opening Balance' : 'Post Opening Balance')}
                  </button>
                </div>
              )}
              {viewMode && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                  <button onClick={onClose} style={{ padding: '8px 20px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>Close</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
