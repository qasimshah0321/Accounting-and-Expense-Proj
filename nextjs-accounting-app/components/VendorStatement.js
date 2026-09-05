'use client'

import { useState, useEffect, useRef } from 'react'
import styles from './VendorStatement.module.css'
import * as api from '@/lib/api'

const todayStr = () => new Date().toISOString().slice(0, 10)
const monthStartStr = () => {
  const d = new Date(); d.setDate(1)
  return d.toISOString().slice(0, 10)
}
const fmt = (n) => {
  const v = parseFloat(n) || 0
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
const fmtDate = (d) => {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })
}
const initials = (name = '') =>
  name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'

export default function VendorStatement({ isOpen, onClose, vendor: vendorProp }) {
  const [startDate, setStartDate] = useState(monthStartStr())
  const [endDate, setEndDate]     = useState(todayStr())
  const [statement, setStatement] = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const printRef = useRef(null)

  // Sidebar-mode state
  const [vendors, setVendors]               = useState([])
  const [vendorsLoading, setVendorsLoading] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState(null)
  const [search, setSearch]                 = useState('')

  const vendor     = vendorProp || selectedVendor
  const sidebarMode = !vendorProp  // true when opened from the menu with no pre-selected vendor

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
      setStatement(null); setSelectedVendor(null)
      setSearch(''); setError('')
    }
  }, [isOpen])

  // Load vendor list in sidebar mode
  useEffect(() => {
    if (isOpen && sidebarMode && vendors.length === 0) {
      setVendorsLoading(true)
      api.getVendors('').then(res => {
        setVendors(res.data?.vendors || res.vendors || [])
      }).catch(() => {}).finally(() => setVendorsLoading(false))
    }
  }, [isOpen, sidebarMode])

  // Auto-fetch when vendor changes
  useEffect(() => {
    if (isOpen && vendor?.id) { setStatement(null); runFetch() }
  }, [isOpen, vendor?.id])

  const runFetch = async () => {
    if (!vendor?.id) return
    setLoading(true); setError('')
    try {
      const res = await api.getVendorStatement(vendor.id, startDate, endDate)
      setStatement(res.data || res)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const handlePrint = () => {
    const content = printRef.current
    if (!content) return
    const win = window.open('', '_blank', 'width=900,height=700')
    win.document.write(`<html><head><title>Statement — ${vendor?.name}</title>
      <style>
        body{font-family:Arial,sans-serif;font-size:13px;color:#111;margin:32px}
        h1{font-size:20px;margin:0 0 4px}h2{font-size:14px;color:#555;font-weight:normal;margin:0 0 20px}
        table{width:100%;border-collapse:collapse;margin-bottom:20px}
        th{background:#f3f4f6;padding:8px 12px;text-align:left;font-size:12px;border-bottom:2px solid #d1d5db}
        td{padding:8px 12px;border-bottom:1px solid #e5e7eb}
        .r{text-align:right}.b{font-weight:700}.red{color:#dc2626}.green{color:#16a34a}
        .summary{display:flex;gap:16px;margin-bottom:20px}
        .sbox{border:1px solid #d1d5db;border-radius:6px;padding:12px 16px;flex:1}
        .slabel{font-size:11px;color:#6b7280;margin-bottom:4px}
        .svalue{font-size:18px;font-weight:700}
        .aging{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:20px}
        .acell{border:1px solid #d1d5db;padding:8px 12px;border-radius:6px;text-align:center}
        .alabel{font-size:11px;color:#6b7280}.avalue{font-size:15px;font-weight:700;margin-top:3px}
      </style></head><body>${content.innerHTML}</body></html>`)
    win.document.close(); win.focus()
    setTimeout(() => { win.print(); win.close() }, 400)
  }

  if (!isOpen) return null

  const st = statement
  const aging = st?.aging || {}
  const agingTotal    = Object.values(aging).reduce((s, v) => s + (parseFloat(v) || 0), 0)
  const totalBills    = (st?.transactions || []).reduce((s, t) => s + (t.debit  || 0), 0)
  const totalPayments = (st?.transactions || []).reduce((s, t) => s + (t.credit || 0), 0)

  const filteredVendors = vendors.filter(v =>
    !search ||
    (v.name  || '').toLowerCase().includes(search.toLowerCase()) ||
    (v.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (v.phone || '').includes(search)
  )

  /* ── VENDOR SELECTION SCREEN ── */
  if (sidebarMode && !selectedVendor) {
    return (
      <div className={styles.overlay}>
        <div className={styles.container}>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <button className={styles.backBtn} onClick={onClose}>
                <i className="fas fa-arrow-left"></i>
              </button>
              <div>
                <h2 className={styles.title}>Vendor Statement</h2>
                <span className={styles.subtitle}>Select a vendor to view their statement</span>
              </div>
            </div>
            <button className={styles.closeBtn} onClick={onClose}>
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className={styles.selectBody}>
            <div className={styles.selectSearchWrap}>
              <div className={styles.selectSearchBox}>
                <i className={`fas fa-search ${styles.selectSearchIcon}`}></i>
                <input
                  autoFocus
                  type="text"
                  className={styles.selectSearchInput}
                  placeholder="Search by name, email or phone…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {search && (
                  <button className={styles.selectSearchClear} onClick={() => setSearch('')}>
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>
              <span className={styles.selectCount}>
                {filteredVendors.length} vendor{filteredVendors.length !== 1 ? 's' : ''}
              </span>
            </div>

            {vendorsLoading ? (
              <div className={styles.selectLoading}>
                <i className="fas fa-spinner fa-spin"></i>
                <span>Loading vendors…</span>
              </div>
            ) : filteredVendors.length === 0 ? (
              <div className={styles.selectEmpty}>
                <i className="fas fa-building-slash"></i>
                <p>No vendors match your search.</p>
              </div>
            ) : (
              <div className={styles.selectList}>
                <div className={styles.selectListHeader}>
                  <span>Vendor</span>
                  <span className={styles.hideOnSmall}>Email</span>
                  <span className={styles.hideOnSmall}>Phone</span>
                  <span className={styles.selectBalCol}>Outstanding</span>
                </div>
                {filteredVendors.map(v => (
                  <div
                    key={v.id}
                    className={styles.selectRow}
                    onClick={() => setSelectedVendor(v)}
                  >
                    <div className={styles.selectVendorCell}>
                      <div className={styles.selectAvatar}>{initials(v.name)}</div>
                      <div className={styles.selectNameStack}>
                        <span className={styles.selectName}>{v.name}</span>
                        {v.vendor_no && <span className={styles.selectNo}>{v.vendor_no}</span>}
                      </div>
                    </div>
                    <span className={`${styles.selectMeta} ${styles.hideOnSmall}`}>{v.email || '—'}</span>
                    <span className={`${styles.selectMeta} ${styles.hideOnSmall}`}>{v.phone || '—'}</span>
                    <span className={`${styles.selectBal} ${parseFloat(v.outstanding_balance) > 0 ? styles.selectBalOwed : ''}`}>
                      ${fmt(v.outstanding_balance || 0)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  /* ── STATEMENT VIEW ── */
  return (
    <div className={styles.overlay}>
      <div className={styles.container}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <button
              className={styles.backBtn}
              onClick={sidebarMode ? () => { setSelectedVendor(null); setStatement(null); setError('') } : onClose}
              title={sidebarMode ? 'Back to vendor list' : 'Close'}
            >
              <i className="fas fa-arrow-left"></i>
            </button>
            <div className={styles.vendorBadge}>
              <div className={styles.vendorBadgeAvatar}>{initials(vendor?.name)}</div>
              <div>
                <h2 className={styles.title}>{vendor?.name}</h2>
                <span className={styles.subtitle}>Vendor Statement</span>
              </div>
            </div>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.dateRange}>
              <label className={styles.dateLabel}>From</label>
              <input type="date" className={styles.dateInput} value={startDate} onChange={e => setStartDate(e.target.value)} />
              <label className={styles.dateLabel}>To</label>
              <input type="date" className={styles.dateInput} value={endDate} onChange={e => setEndDate(e.target.value)} />
              <button className={styles.btnRun} onClick={runFetch} disabled={loading}>
                {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-play"></i>}
                Run
              </button>
            </div>
            <button className={styles.btnPrint} onClick={handlePrint} disabled={!st}>
              <i className="fas fa-print"></i> Print
            </button>
            <button className={styles.closeBtn} onClick={onClose}>
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        {error && (
          <div className={styles.errorBanner}>
            <i className="fas fa-exclamation-circle"></i> {error}
          </div>
        )}

        {/* Body */}
        {loading && !st ? (
          <div className={styles.loadingState}>
            <i className="fas fa-spinner fa-spin"></i>
            <p>Generating statement…</p>
          </div>
        ) : st ? (
          <div className={styles.body} ref={printRef}>

            {/* Print-only heading */}
            <div className={styles.printHeading}>
              <h1>{st.vendor?.name}</h1>
              <h2>Vendor Statement — {fmtDate(st.period?.start_date)} to {fmtDate(st.period?.end_date)}</h2>
              {st.vendor?.email && <p style={{margin:'2px 0',color:'#555'}}>{st.vendor.email}</p>}
              {st.vendor?.phone && <p style={{margin:'2px 0',color:'#555'}}>{st.vendor.phone}</p>}
            </div>

            {/* Summary Cards */}
            <div className={styles.summaryRow}>
              <div className={styles.summaryCard}>
                <div className={styles.cardLabel}>Opening Balance</div>
                <div className={`${styles.cardValue} ${parseFloat(st.opening_balance) > 0 ? styles.red : styles.muted}`}>
                  ${fmt(st.opening_balance)}
                </div>
              </div>
              <div className={styles.summaryCard}>
                <div className={styles.cardLabel}>Bills (Period)</div>
                <div className={`${styles.cardValue} ${totalBills > 0 ? styles.red : styles.muted}`}>${fmt(totalBills)}</div>
              </div>
              <div className={styles.summaryCard}>
                <div className={styles.cardLabel}>Payments (Period)</div>
                <div className={`${styles.cardValue} ${totalPayments > 0 ? styles.green : styles.muted}`}>${fmt(totalPayments)}</div>
              </div>
              <div className={`${styles.summaryCard} ${styles.summaryCardHighlight}`}>
                <div className={styles.cardLabel}>Closing Balance</div>
                <div className={`${styles.cardValue} ${parseFloat(st.closing_balance) > 0 ? styles.red : styles.green}`}>
                  ${fmt(st.closing_balance)}
                </div>
              </div>
            </div>

            {/* Aging */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}><i className="fas fa-clock"></i> Aging Summary (Overdue Bills)</h3>
              <div className={styles.agingGrid}>
                {[
                  { label: 'Current',    key: 'current' },
                  { label: '1–30 Days',  key: 'days_1_30' },
                  { label: '31–60 Days', key: 'days_31_60' },
                  { label: '61–90 Days', key: 'days_61_90' },
                  { label: '90+ Days',   key: 'days_over_90' },
                ].map(({ label, key }) => (
                  <div key={key} className={`${styles.agingCell} ${(aging[key] || 0) > 0 && key !== 'current' ? styles.agingCellOverdue : ''}`}>
                    <div className={styles.agingLabel}>{label}</div>
                    <div className={`${styles.agingValue} ${(aging[key] || 0) > 0 && key !== 'current' ? styles.red : ''}`}>
                      ${fmt(aging[key] || 0)}
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.agingTotal}>Total Outstanding: <strong>${fmt(agingTotal)}</strong></div>
            </div>

            {/* Transactions */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}><i className="fas fa-list"></i> Transaction Detail</h3>
              {st.transactions.length === 0 ? (
                <div className={styles.emptyTx}>
                  <i className="fas fa-inbox"></i>
                  <p>No transactions in this period.</p>
                </div>
              ) : (
                <div className={styles.tableScroll}>
                <table className={styles.txTable}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Reference</th>
                      <th>Type</th>
                      <th className={styles.right}>Bills</th>
                      <th className={styles.right}>Payments</th>
                      <th className={styles.right}>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className={styles.openingRow}>
                      <td>{fmtDate(st.period?.start_date)}</td>
                      <td colSpan={2}><em>Opening Balance</em></td>
                      <td className={styles.right}></td>
                      <td className={styles.right}></td>
                      <td className={`${styles.right} ${styles.bold}`}>${fmt(st.opening_balance)}</td>
                    </tr>
                    {st.transactions.map((tx, i) => (
                      <tr key={i} className={tx.type === 'Payment' ? styles.paymentRow : ''}>
                        <td className={styles.txDate}>{fmtDate(tx.date)}</td>
                        <td>
                          <span className={tx.type === 'Bill' ? styles.billRef : styles.paymentRef}>{tx.reference}</span>
                          {tx.notes ? <span className={styles.txNotes}> — {tx.notes}</span> : null}
                          {tx.payment_method ? <span className={styles.txNotes}> ({tx.payment_method})</span> : null}
                        </td>
                        <td>
                          <span className={tx.type === 'Bill' ? styles.badgeBill : styles.badgePayment}>{tx.type}</span>
                          {tx.payment_status && <span className={styles.payStatus}>{tx.payment_status.replace(/_/g, ' ')}</span>}
                        </td>
                        <td className={`${styles.right} ${tx.debit > 0 ? styles.chargeAmt : styles.dimAmt}`}>
                          {tx.debit > 0 ? `$${fmt(tx.debit)}` : '—'}
                        </td>
                        <td className={`${styles.right} ${tx.credit > 0 ? styles.creditAmt : styles.dimAmt}`}>
                          {tx.credit > 0 ? `$${fmt(tx.credit)}` : '—'}
                        </td>
                        <td className={`${styles.right} ${styles.bold} ${tx.balance > 0 ? styles.balRed : tx.balance < 0 ? styles.balGreen : ''}`}>
                          ${fmt(tx.balance)}
                        </td>
                      </tr>
                    ))}
                    <tr className={styles.closingRow}>
                      <td>{fmtDate(st.period?.end_date)}</td>
                      <td colSpan={2}><strong>Closing Balance</strong></td>
                      <td className={`${styles.right} ${styles.bold}`}>${fmt(totalBills)}</td>
                      <td className={`${styles.right} ${styles.bold}`}>${fmt(totalPayments)}</td>
                      <td className={`${styles.right} ${styles.bold} ${parseFloat(st.closing_balance) > 0 ? styles.balRed : styles.balGreen}`}>
                        ${fmt(st.closing_balance)}
                      </td>
                    </tr>
                  </tbody>
                </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.loadingState}>
            <i className="fas fa-file-invoice-dollar"></i>
            <p>Adjust the date range and click <strong>Run</strong> to generate the statement.</p>
          </div>
        )}
      </div>
    </div>
  )
}
