'use client'

import { useState, useEffect, useCallback } from 'react'
import styles from './Invoice.module.css'
import * as api from '../lib/api'

export default function YearEndClose({ isOpen, onClose, currencySymbol = '$' }) {
  const [fiscalYearEnd, setFiscalYearEnd] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-12-31`
  })
  const [preview, setPreview] = useState(null)      // { revenue, expenses, net, accounts }
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const loadHistory = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getYearEndCloses()
      setHistory(res.data || res || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (isOpen) { loadHistory(); setPreview(null); setConfirmed(false); setError('') } }, [isOpen, loadHistory])

  const handlePreview = async () => {
    if (!fiscalYearEnd) { setError('Select a fiscal year end date.'); return }
    setPreviewing(true)
    setError('')
    setPreview(null)
    setConfirmed(false)
    try {
      // Use the accounts endpoint to pull P&L account balances for preview
      const res = await api.getAccounts()
      const accounts = res.data?.accounts || res.accounts || res.data || []
      const plAccounts = accounts.filter(a => (a.account_type === 'revenue' || a.account_type === 'expense') && Math.abs(parseFloat(a.balance) || 0) > 0.001)

      let totalRevenue = 0
      let totalExpenses = 0
      for (const a of plAccounts) {
        const bal = parseFloat(a.balance) || 0
        if (a.account_type === 'revenue') totalRevenue += bal
        else totalExpenses += bal
      }

      setPreview({
        revenueAccounts: plAccounts.filter(a => a.account_type === 'revenue'),
        expenseAccounts: plAccounts.filter(a => a.account_type === 'expense'),
        totalRevenue,
        totalExpenses,
        netIncome: totalRevenue - totalExpenses,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setPreviewing(false)
    }
  }

  const handleClose = async () => {
    if (!confirmed) { setError('Please tick the confirmation checkbox before proceeding.'); return }
    setSaving(true)
    setError('')
    try {
      await api.performYearEndClose({ fiscal_year_end_date: fiscalYearEnd })
      await loadHistory()
      setPreview(null)
      setConfirmed(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const fmt = (val) => {
    const n = parseFloat(val) || 0
    const abs = Math.abs(n)
    const s = currencySymbol + abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return n < 0 ? `(${s})` : s
  }

  const formatDate = (d) => {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  if (!isOpen) return null

  return (
    <div className={styles.invoicePopupOverlay} onClick={onClose}>
      <div className={styles.invoicePopup} onClick={e => e.stopPropagation()} style={{ maxWidth: 780, width: '95%' }}>

        <div className={styles.popupHeader}>
          <h2>Year-End Close</h2>
          <button className={styles.closeBtn} onClick={onClose}><i className="fas fa-times" /></button>
        </div>

        <div className={styles.popupContent}>

          {/* Info banner */}
          <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#92400e' }}>
            <i className="fas fa-exclamation-triangle" style={{ marginRight: 8 }} />
            <strong>What this does:</strong> Transfers all revenue and expense account balances to Retained Earnings (3100) and resets them to zero, marking the start of a new fiscal year.
          </div>

          {error && <div style={{ color: '#dc2626', marginBottom: 12, padding: '8px 12px', background: '#fef2f2', borderRadius: 6 }}>{error}</div>}

          {/* Date + Preview */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 13 }}>Fiscal Year End Date *</label>
              <input
                type="date" value={fiscalYearEnd}
                onChange={e => { setFiscalYearEnd(e.target.value); setPreview(null); setConfirmed(false) }}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6 }}
              />
            </div>
            <button
              onClick={handlePreview} disabled={previewing}
              style={{ padding: '8px 18px', background: '#f1f5f9', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}
            >
              {previewing ? <><i className="fas fa-spinner fa-spin" /> Loading...</> : <><i className="fas fa-eye" style={{ marginRight: 6 }} />Preview Close</>}
            </button>
          </div>

          {/* Preview panel */}
          {preview && (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
              {/* Summary bar */}
              <div style={{ background: '#f8fafc', padding: '14px 18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 3 }}>Total Revenue</div>
                  <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: '#166534' }}>{fmt(preview.totalRevenue)}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 3 }}>Total Expenses</div>
                  <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: '#991b1b' }}>{fmt(preview.totalExpenses)}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 3 }}>{preview.netIncome >= 0 ? 'Net Profit' : 'Net Loss'}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: preview.netIncome >= 0 ? '#166534' : '#dc2626' }}>{fmt(preview.netIncome)}</div>
                </div>
              </div>

              {/* Account list */}
              <div style={{ maxHeight: 260, overflow: 'auto' }}>
                <table style={{ width: '100%', minWidth: 480, borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', position: 'sticky', top: 0 }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Account</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Type</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Current Balance</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>After Close</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...preview.revenueAccounts, ...preview.expenseAccounts].map(a => (
                      <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '7px 12px' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 11, background: '#f1f5f9', padding: '1px 6px', borderRadius: 3, marginRight: 8, border: '1px solid #e2e8f0' }}>{a.account_number}</span>
                          {a.name}
                        </td>
                        <td style={{ padding: '7px 12px' }}>
                          <span style={{ padding: '1px 8px', borderRadius: 4, fontSize: 11, background: a.account_type === 'revenue' ? '#dcfce7' : '#fee2e2', color: a.account_type === 'revenue' ? '#166534' : '#991b1b', textTransform: 'capitalize' }}>
                            {a.account_type}
                          </span>
                        </td>
                        <td style={{ padding: '7px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{fmt(a.balance)}</td>
                        <td style={{ padding: '7px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#94a3b8' }}>0.00</td>
                      </tr>
                    ))}
                    {/* Retained Earnings row */}
                    <tr style={{ background: '#f0fdf4', fontWeight: 700, borderTop: '2px solid #e2e8f0' }}>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, background: '#f1f5f9', padding: '1px 6px', borderRadius: 3, marginRight: 8, border: '1px solid #e2e8f0' }}>3100</span>
                        Retained Earnings
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ padding: '1px 8px', borderRadius: 4, fontSize: 11, background: '#e0e7ff', color: '#3730a3' }}>equity</span>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#64748b' }}>—</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', color: preview.netIncome >= 0 ? '#166534' : '#dc2626' }}>
                        {preview.netIncome >= 0 ? `+${fmt(preview.netIncome)}` : fmt(preview.netIncome)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Confirmation */}
          {preview && (
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 20, padding: '12px 14px', background: '#fef9c3', borderRadius: 8, border: '1px solid #fde047' }}>
              <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} style={{ marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#713f12' }}>
                I confirm I want to perform the year-end close for fiscal year ending <strong>{formatDate(fiscalYearEnd)}</strong>.
                This will zero out all {preview.revenueAccounts.length + preview.expenseAccounts.length} P&L accounts and
                transfer <strong>{fmt(Math.abs(preview.netIncome))} {preview.netIncome >= 0 ? 'profit' : 'loss'}</strong> to Retained Earnings.
                <strong> This action posts a journal entry (YEC-{fiscalYearEnd?.substring(0,4)}) and cannot be undone without reversing it.</strong>
              </span>
            </label>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={onClose} style={{ padding: '8px 20px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>
              Close
            </button>
            {preview && (
              <button
                onClick={handleClose}
                disabled={saving || !confirmed}
                style={{ padding: '8px 24px', background: confirmed ? '#dc2626' : '#f87171', color: '#fff', border: 'none', borderRadius: 6, cursor: confirmed ? 'pointer' : 'not-allowed', fontWeight: 600, opacity: !confirmed ? 0.6 : 1 }}
              >
                {saving ? <><i className="fas fa-spinner fa-spin" /> Posting...</> : <><i className="fas fa-calendar-check" style={{ marginRight: 6 }} />Post Year-End Close</>}
              </button>
            )}
          </div>

          {/* History */}
          {history.length > 0 && (
            <div style={{ marginTop: 24, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
              <h4 style={{ margin: '0 0 12px', fontSize: 14, color: '#374151' }}>Previous Year-End Closes</h4>
              <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Entry No</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Fiscal Year End</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Posted</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Lines</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(h => (
                    <tr key={h.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '7px 12px', fontWeight: 600, color: '#2563eb', fontFamily: 'monospace' }}>{h.entry_no}</td>
                      <td style={{ padding: '7px 12px' }}>{formatDate(h.entry_date)}</td>
                      <td style={{ padding: '7px 12px', color: '#64748b', fontSize: 12 }}>{formatDate(h.created_at)}</td>
                      <td style={{ padding: '7px 12px', textAlign: 'right', color: '#64748b' }}>{h.line_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
