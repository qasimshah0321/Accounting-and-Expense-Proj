'use client'

import { useState } from 'react'
import styles from './Invoice.module.css'
import * as api from '../lib/api'

const SECTION_LABELS = {
  asset: 'ASSETS',
  liability: 'LIABILITIES',
  equity: 'EQUITY',
  revenue: 'REVENUE',
  expense: 'EXPENSES'
}

const SECTION_ORDER = ['asset', 'liability', 'equity', 'revenue', 'expense']

export default function TrialBalance({ isOpen, onClose }) {
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0])
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGenerate = async () => {
    setLoading(true)
    setError('')
    setReport(null)
    try {
      const res = await api.getTrialBalance(asOfDate)
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
    return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.popup} onClick={e => e.stopPropagation()} style={{ maxWidth: 800, width: '95%' }}>
        <div className={styles.popupHeader}>
          <h2>Trial Balance</h2>
          <button className={styles.closeBtn} onClick={onClose}><i className="fas fa-times" /></button>
        </div>

        <div className={styles.popupBody}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'flex-end' }}>
            <div style={{ minWidth: 180 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 13 }}>As of Date</label>
              <input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6 }} />
            </div>
            <button onClick={handleGenerate} disabled={loading} className={styles.saveBtn} style={{ padding: '8px 20px', height: 40 }}>
              {loading ? <><i className="fas fa-spinner fa-spin" /> Generating...</> : 'Generate'}
            </button>
          </div>

          {error && <div style={{ color: '#dc2626', marginBottom: 10, padding: '8px 12px', background: '#fef2f2', borderRadius: 6 }}>{error}</div>}

          {report && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Trial Balance</div>
                <div style={{ color: '#64748b', fontSize: 13 }}>
                  As of {new Date(asOfDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>

              <div style={{ maxHeight: 450, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Account #</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Account Name</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Debit</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SECTION_ORDER.map(section => {
                      const sectionAccounts = (report.accounts?.[section] || [])
                      if (!sectionAccounts.length) return null
                      const sectionDebit = sectionAccounts.reduce((s, a) => s + (parseFloat(a.debit_balance) || 0), 0)
                      const sectionCredit = sectionAccounts.reduce((s, a) => s + (parseFloat(a.credit_balance) || 0), 0)
                      return [
                        <tr key={`header-${section}`}>
                          <td colSpan={4} style={{ padding: '10px 12px', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, color: '#475569', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                            {SECTION_LABELS[section]}
                          </td>
                        </tr>,
                        ...sectionAccounts.map(acct => (
                          <tr key={acct.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 12px', fontFamily: 'monospace', paddingLeft: 24 }}>{acct.account_number}</td>
                            <td style={{ padding: '8px 12px' }}>{acct.name}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>{formatAmount(acct.debit_balance)}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>{formatAmount(acct.credit_balance)}</td>
                          </tr>
                        )),
                        <tr key={`subtotal-${section}`} style={{ borderBottom: '2px solid #e2e8f0' }}>
                          <td colSpan={2} style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 600, fontSize: 13, color: '#64748b', paddingRight: 20 }}>
                            Subtotal {SECTION_LABELS[section]}
                          </td>
                          <td style={{ padding: '6px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, fontSize: 13 }}>{formatAmount(sectionDebit)}</td>
                          <td style={{ padding: '6px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, fontSize: 13 }}>{formatAmount(sectionCredit)}</td>
                        </tr>
                      ]
                    })}

                    {/* Grand Totals */}
                    <tr style={{ borderTop: '3px double #1e293b', background: '#f8fafc' }}>
                      <td colSpan={2} style={{ padding: '12px', textAlign: 'right', fontWeight: 700, fontSize: 15 }}>TOTALS</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: 15 }}>
                        {formatAmount(report.totals?.total_debits)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: 15 }}>
                        {formatAmount(report.totals?.total_credits)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={4} style={{ padding: '10px 12px', textAlign: 'center' }}>
                        {report.totals?.is_balanced ? (
                          <span style={{ color: '#166534', fontWeight: 600 }}>
                            <i className="fas fa-check-circle" style={{ marginRight: 6 }} /> Balanced
                          </span>
                        ) : (
                          <span style={{ color: '#dc2626', fontWeight: 600 }}>
                            <i className="fas fa-exclamation-triangle" style={{ marginRight: 6 }} />
                            Out of balance by ${Math.abs((report.totals?.total_debits || 0) - (report.totals?.total_credits || 0)).toFixed(2)}
                          </span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}

          {!report && !loading && (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
              <i className="fas fa-balance-scale" style={{ fontSize: 40, marginBottom: 12 }} /><br />
              Select a date and click "Generate" to view the trial balance
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
