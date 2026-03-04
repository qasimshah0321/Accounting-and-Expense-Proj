'use client'

import { useState, useEffect, useCallback } from 'react'
import styles from './Invoice.module.css'
import * as api from '../lib/api'

export default function GeneralLedger({ isOpen, onClose }) {
  const [accounts, setAccounts] = useState([])
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-01-01`
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadAccounts = useCallback(async () => {
    try {
      const res = await api.getAccounts()
      setAccounts(res.data?.accounts || res.accounts || res.data || [])
    } catch (err) {
      console.error('Failed to load accounts:', err)
    }
  }, [])

  useEffect(() => {
    if (isOpen) loadAccounts()
  }, [isOpen, loadAccounts])

  const handleRunReport = async () => {
    if (!selectedAccountId) {
      setError('Please select an account.')
      return
    }
    setLoading(true)
    setError('')
    setReport(null)
    try {
      const res = await api.getGeneralLedger(selectedAccountId, startDate, endDate)
      setReport(res.data || res)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatAmount = (val) => {
    const num = parseFloat(val) || 0
    if (num === 0) return ''
    return '$' + Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const formatBalance = (val) => {
    const num = parseFloat(val) || 0
    const prefix = num < 0 ? '-' : ''
    return prefix + '$' + Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const formatDate = (d) => {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  if (!isOpen) return null

  return (
    <div className={styles.invoicePopupOverlay} onClick={onClose}>
      <div className={styles.invoicePopup} onClick={e => e.stopPropagation()} style={{ maxWidth: 1000, width: '95%' }}>
        <div className={styles.popupHeader}>
          <h2>General Ledger</h2>
          <button className={styles.closeBtn} onClick={onClose}><i className="fas fa-times" /></button>
        </div>

        <div className={styles.popupContent}>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 2, minWidth: 250 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 13 }}>Account</label>
              <select
                value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6 }}
              >
                <option value="">Select an account...</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.account_number} - {a.name}</option>)}
              </select>
            </div>
            <div style={{ minWidth: 140 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 13 }}>Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6 }} />
            </div>
            <div style={{ minWidth: 140 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 13 }}>End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6 }} />
            </div>
            <button onClick={handleRunReport} disabled={loading} className={styles.btnPrimary} style={{ padding: '8px 20px', height: 40 }}>
              {loading ? <><i className="fas fa-spinner fa-spin" /> Running...</> : 'Run Report'}
            </button>
          </div>

          {error && <div style={{ color: '#dc2626', marginBottom: 10, padding: '8px 12px', background: '#fef2f2', borderRadius: 6 }}>{error}</div>}

          {report && (
            <>
              {/* Account Info Card */}
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: 16, marginBottom: 20, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{report.account.account_number} - {report.account.name}</div>
                    <div style={{ color: '#64748b', fontSize: 13, textTransform: 'capitalize' }}>{report.account.account_type} | Normal: {report.account.normal_balance}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, color: '#64748b' }}>Opening Balance</div>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace' }}>{formatBalance(report.opening_balance)}</div>
                  </div>
                </div>
              </div>

              {/* Transactions Table */}
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Date</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>JE #</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Reference</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Description</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Debit</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Credit</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Opening balance row */}
                    <tr style={{ background: '#fffbeb', fontStyle: 'italic' }}>
                      <td colSpan={6} style={{ padding: '8px 12px', color: '#92400e' }}>Opening Balance</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{formatBalance(report.opening_balance)}</td>
                    </tr>
                    {(report.transactions || []).map((t, i) => (
                      <tr key={t.id || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px' }}>{formatDate(t.entry_date)}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: '#2563eb' }}>{t.entry_no}</td>
                        <td style={{ padding: '8px 12px', color: '#64748b', fontSize: 13 }}>{t.reference_no || t.reference_type || '-'}</td>
                        <td style={{ padding: '8px 12px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.line_description || t.description || '-'}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>{formatAmount(t.debit)}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>{formatAmount(t.credit)}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{formatBalance(t.running_balance)}</td>
                      </tr>
                    ))}
                    {(!report.transactions || !report.transactions.length) && (
                      <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>No transactions in this period</td></tr>
                    )}
                    {/* Closing balance row */}
                    <tr style={{ borderTop: '2px solid #e2e8f0', background: '#f0fdf4', fontWeight: 700 }}>
                      <td colSpan={6} style={{ padding: '10px 12px', color: '#166534' }}>Closing Balance</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', fontSize: 16 }}>{formatBalance(report.closing_balance)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}

          {!report && !loading && (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
              <i className="fas fa-book" style={{ fontSize: 40, marginBottom: 12 }} /><br />
              Select an account and date range, then click "Run Report"
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
