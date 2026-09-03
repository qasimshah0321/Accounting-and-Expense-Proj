'use client'

import { useState, useEffect, useCallback } from 'react'
import styles from './Invoice.module.css'
import * as api from '../lib/api'

export default function GeneralLedger({ isOpen, onClose, currencySymbol = '$', initialAccount = null }) {
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

  const isAllReport = Array.isArray(report)
  const reportList = isAllReport ? report : (report ? [report] : [])

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

  // Auto-run when opened from Chart of Accounts with a specific account
  useEffect(() => {
    if (!isOpen || !initialAccount) return
    setSelectedAccountId(initialAccount.id.toString())
    setReport(null)
    setLoading(true)
    setError('')
    api.getGeneralLedger(initialAccount.id.toString(), startDate, endDate)
      .then(res => setReport(res.data || res))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [isOpen, initialAccount]) // eslint-disable-line react-hooks/exhaustive-deps

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
    return currencySymbol + Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const formatBalance = (val) => {
    const num = parseFloat(val) || 0
    const prefix = num < 0 ? '-' : ''
    return prefix + currencySymbol + Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const formatDate = (d) => {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  // ─── Export to Excel ───────────────────────────────────────────────────────
  const handleExportExcel = async () => {
    if (!report) return
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()

    reportList.forEach(r => {
      const rows = [
        [`General Ledger: ${r.account.account_number} - ${r.account.name}`],
        [`Period: ${startDate} to ${endDate}`],
        [],
        ['Date', 'JE #', 'Reference', 'Description', 'Debit', 'Credit', 'Balance'],
        ['Opening Balance', '', '', '', '', '', parseFloat(r.opening_balance) || 0],
        ...(r.transactions || []).map(t => [
          formatDate(t.entry_date),
          t.entry_no || '',
          t.reference_no || t.reference_type || '',
          t.line_description || t.description || '',
          parseFloat(t.debit) || 0,
          parseFloat(t.credit) || 0,
          parseFloat(t.running_balance) || 0,
        ]),
        ['Closing Balance', '', '', '', '', '', parseFloat(r.closing_balance) || 0],
      ]
      const ws = XLSX.utils.aoa_to_sheet(rows)
      // Column widths
      ws['!cols'] = [{ wch: 14 }, { wch: 12 }, { wch: 18 }, { wch: 36 }, { wch: 14 }, { wch: 14 }, { wch: 14 }]
      const sheetName = r.account.account_number.toString().slice(0, 31)
      XLSX.utils.book_append_sheet(wb, ws, sheetName)
    })

    XLSX.writeFile(wb, `General_Ledger_${startDate}_to_${endDate}.xlsx`)
  }

  // ─── Export to PDF ─────────────────────────────────────────────────────────
  const handleExportPDF = () => {
    if (!report) return

    const accountSections = reportList.map(r => {
      const txRows = (r.transactions || []).map(t => `
        <tr>
          <td>${formatDate(t.entry_date)}</td>
          <td style="color:#2563eb;font-weight:600">${t.entry_no || ''}</td>
          <td style="color:#64748b">${t.reference_no || t.reference_type || '-'}</td>
          <td>${t.line_description || t.description || '-'}</td>
          <td style="text-align:right;font-family:monospace">${formatAmount(t.debit)}</td>
          <td style="text-align:right;font-family:monospace">${formatAmount(t.credit)}</td>
          <td style="text-align:right;font-family:monospace;font-weight:600">${formatBalance(t.running_balance)}</td>
        </tr>`).join('')

      const emptyRow = (!r.transactions || !r.transactions.length)
        ? `<tr><td colspan="7" style="padding:12px;text-align:center;color:#94a3b8">No transactions in this period</td></tr>`
        : ''

      return `
        <div style="margin-bottom:40px;page-break-inside:avoid;">
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:14px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="font-size:15px;font-weight:700">${r.account.account_number} - ${r.account.name}</div>
              <div style="color:#64748b;font-size:11px;text-transform:capitalize">${r.account.account_type} | Normal: ${r.account.normal_balance}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:11px;color:#64748b">Opening Balance</div>
              <div style="font-size:15px;font-weight:700;font-family:monospace">${formatBalance(r.opening_balance)}</div>
            </div>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:11px;">
            <thead>
              <tr style="background:#f8fafc">
                <th style="padding:7px 8px;text-align:left;border-bottom:2px solid #e2e8f0">Date</th>
                <th style="padding:7px 8px;text-align:left;border-bottom:2px solid #e2e8f0">JE #</th>
                <th style="padding:7px 8px;text-align:left;border-bottom:2px solid #e2e8f0">Reference</th>
                <th style="padding:7px 8px;text-align:left;border-bottom:2px solid #e2e8f0">Description</th>
                <th style="padding:7px 8px;text-align:right;border-bottom:2px solid #e2e8f0">Debit</th>
                <th style="padding:7px 8px;text-align:right;border-bottom:2px solid #e2e8f0">Credit</th>
                <th style="padding:7px 8px;text-align:right;border-bottom:2px solid #e2e8f0">Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr style="background:#fffbeb;font-style:italic">
                <td colspan="6" style="padding:6px 8px;color:#92400e">Opening Balance</td>
                <td style="padding:6px 8px;text-align:right;font-family:monospace;font-weight:600">${formatBalance(r.opening_balance)}</td>
              </tr>
              ${txRows}${emptyRow}
              <tr style="border-top:2px solid #e2e8f0;background:#f0fdf4;font-weight:700">
                <td colspan="6" style="padding:7px 8px;color:#166534">Closing Balance</td>
                <td style="padding:7px 8px;text-align:right;font-family:monospace;font-size:13px">${formatBalance(r.closing_balance)}</td>
              </tr>
            </tbody>
          </table>
        </div>`
    }).join('')

    const title = isAllReport
      ? 'General Ledger — All Accounts'
      : `General Ledger — ${reportList[0]?.account?.account_number} - ${reportList[0]?.account?.name}`

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>General Ledger</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; font-size: 12px; color: #1e293b; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    .subtitle { color: #64748b; font-size: 12px; margin-bottom: 24px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="subtitle">Period: ${startDate} &nbsp;to&nbsp; ${endDate}</div>
  ${accountSections}
  <script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`

    const w = window.open('', '_blank', 'width=1000,height=750')
    if (w) { w.document.write(html); w.document.close() }
  }

  if (!isOpen) return null

  return (
    <div className={styles.invoicePopupOverlay} onClick={onClose}>
      <div className={styles.invoicePopup} onClick={e => e.stopPropagation()} style={{ maxWidth: 1100, width: '95%' }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className={styles.popupHeader}>
          <h2>General Ledger</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {report && (
              <>
                <button
                  onClick={handleExportExcel}
                  style={{ padding: '6px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  title="Export to Excel"
                >
                  <i className="fas fa-file-excel" /> Excel
                </button>
                <button
                  onClick={handleExportPDF}
                  style={{ padding: '6px 14px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  title="Export to PDF"
                >
                  <i className="fas fa-file-pdf" /> PDF
                </button>
              </>
            )}
            <button className={styles.closeBtn} onClick={onClose}><i className="fas fa-times" /></button>
          </div>
        </div>

        <div className={styles.popupContent}>

          {/* ── Filters ─────────────────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 2, minWidth: 250 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 13 }}>Account</label>
              <select
                value={selectedAccountId}
                onChange={e => { setSelectedAccountId(e.target.value); setReport(null) }}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6 }}
              >
                <option value="">Select an account...</option>
                <option value="all">— All Accounts —</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.account_number} - {a.name}</option>
                ))}
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
              {loading
                ? <><i className="fas fa-spinner fa-spin" /> Running…</>
                : 'Run Report'}
            </button>
          </div>

          {error && (
            <div style={{ color: '#dc2626', marginBottom: 10, padding: '8px 12px', background: '#fef2f2', borderRadius: 6 }}>
              {error}
            </div>
          )}

          {/* ── Report ──────────────────────────────────────────────────── */}
          {report && (
            <>
              {isAllReport && report.length === 0 && (
                <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>
                  No accounts with activity found for this period.
                </div>
              )}

              <div style={{ maxHeight: 560, overflowY: 'auto' }}>
                {reportList.map((r, idx) => (
                  <div
                    key={r.account?.id || idx}
                    style={{ marginBottom: isAllReport && idx < reportList.length - 1 ? 40 : 0 }}
                  >
                    {/* Account card */}
                    <div style={{ background: '#f8fafc', borderRadius: 8, padding: 16, marginBottom: 12, border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 700 }}>
                            {r.account.account_number} - {r.account.name}
                          </div>
                          <div style={{ color: '#64748b', fontSize: 13, textTransform: 'capitalize' }}>
                            {r.account.account_type} | Normal: {r.account.normal_balance}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 13, color: '#64748b' }}>Opening Balance</div>
                          <div style={{ fontSize: 17, fontWeight: 700, fontFamily: 'monospace' }}>
                            {formatBalance(r.opening_balance)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Transactions table */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          <th style={{ padding: '9px 12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Date</th>
                          <th style={{ padding: '9px 12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>JE #</th>
                          <th style={{ padding: '9px 12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Reference</th>
                          <th style={{ padding: '9px 12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Description</th>
                          <th style={{ padding: '9px 12px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Debit</th>
                          <th style={{ padding: '9px 12px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Credit</th>
                          <th style={{ padding: '9px 12px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ background: '#fffbeb', fontStyle: 'italic' }}>
                          <td colSpan={6} style={{ padding: '7px 12px', color: '#92400e' }}>Opening Balance</td>
                          <td style={{ padding: '7px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                            {formatBalance(r.opening_balance)}
                          </td>
                        </tr>
                        {(r.transactions || []).map((t, i) => (
                          <tr key={t.id || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '7px 12px' }}>{formatDate(t.entry_date)}</td>
                            <td style={{ padding: '7px 12px', fontWeight: 600, color: '#2563eb' }}>{t.entry_no}</td>
                            <td style={{ padding: '7px 12px', color: '#64748b', fontSize: 12 }}>
                              {t.reference_no || t.reference_type || '-'}
                            </td>
                            <td style={{ padding: '7px 12px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {t.line_description || t.description || '-'}
                            </td>
                            <td style={{ padding: '7px 12px', textAlign: 'right', fontFamily: 'monospace' }}>{formatAmount(t.debit)}</td>
                            <td style={{ padding: '7px 12px', textAlign: 'right', fontFamily: 'monospace' }}>{formatAmount(t.credit)}</td>
                            <td style={{ padding: '7px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                              {formatBalance(t.running_balance)}
                            </td>
                          </tr>
                        ))}
                        {(!r.transactions || !r.transactions.length) && (
                          <tr>
                            <td colSpan={7} style={{ padding: 16, textAlign: 'center', color: '#94a3b8' }}>
                              No transactions in this period
                            </td>
                          </tr>
                        )}
                        <tr style={{ borderTop: '2px solid #e2e8f0', background: '#f0fdf4', fontWeight: 700 }}>
                          <td colSpan={6} style={{ padding: '9px 12px', color: '#166534' }}>Closing Balance</td>
                          <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: 'monospace', fontSize: 15 }}>
                            {formatBalance(r.closing_balance)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ))}
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
