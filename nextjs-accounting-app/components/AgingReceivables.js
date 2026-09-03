'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './AgingReceivables.module.css'
import * as api from '@/lib/api'

const todayStr = () => new Date().toISOString().slice(0, 10)

const fmt = (n) => (parseFloat(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '—'
const initials = (name = '') => name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'

const BUCKETS = [
  { key: 'current_due',    label: 'Current',    color: '#16a34a' },
  { key: 'overdue_1_30',   label: '1–30 Days',  color: '#ca8a04' },
  { key: 'overdue_31_60',  label: '31–60 Days', color: '#ea580c' },
  { key: 'overdue_61_90',  label: '61–90 Days', color: '#dc2626' },
  { key: 'overdue_90_plus',label: '90+ Days',   color: '#7f1d1d' },
]

export default function AgingReceivables({ isOpen, onClose }) {
  const [asOf, setAsOf]         = useState(todayStr())
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [search, setSearch]     = useState('')
  const [sortKey, setSortKey]   = useState('total_outstanding')
  const [sortDir, setSortDir]   = useState('desc')
  const [drillCustomer, setDrillCustomer] = useState(null) // { customer, invoices }
  const printRef = useRef(null)

  const load = useCallback(async (date) => {
    setLoading(true); setError('')
    try {
      const res = await api.getReceivablesAgingReport(date)
      setData(res.data || res)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (isOpen) load(asOf)
    else { setData(null); setSearch(''); setDrillCustomer(null) }
  }, [isOpen])

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <i className={`fas fa-sort ${styles.sortIcon}`}></i>
    return <i className={`fas fa-sort-${sortDir === 'asc' ? 'up' : 'down'} ${styles.sortIconActive}`}></i>
  }

  const handlePrint = () => {
    const el = printRef.current
    if (!el) return
    const win = window.open('', '_blank', 'width=1000,height=700')
    win.document.write(`<html><head><title>Aging — Account Receivables</title>
      <style>
        body{font-family:Arial,sans-serif;font-size:12px;color:#111;margin:28px}
        h1{font-size:18px;margin:0 0 4px}p{margin:0 0 16px;color:#555;font-size:12px}
        table{width:100%;border-collapse:collapse;margin-bottom:16px}
        th{background:#f3f4f6;padding:7px 10px;text-align:left;font-size:11px;border-bottom:2px solid #d1d5db;white-space:nowrap}
        td{padding:7px 10px;border-bottom:1px solid #e5e7eb;vertical-align:middle}
        .r{text-align:right}.b{font-weight:700}
        .cur{color:#16a34a}.d30{color:#ca8a04}.d60{color:#ea580c}.d90{color:#dc2626}.d90p{color:#7f1d1d}
        .total-row td{background:#f1f5f9;font-weight:700;border-top:2px solid #d1d5db}
        .summary{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:20px}
        .sbox{border:1px solid #d1d5db;border-radius:6px;padding:10px 14px}
        .slabel{font-size:10px;color:#6b7280;margin-bottom:3px;text-transform:uppercase}
        .svalue{font-size:15px;font-weight:700}
      </style></head><body>${el.innerHTML}</body></html>`)
    win.document.close(); win.focus()
    setTimeout(() => { win.print(); win.close() }, 400)
  }

  if (!isOpen) return null

  const summary = data?.summary || {}
  const allCustomers = data?.customers || []
  const invoicesByCustomer = data?.invoices_by_customer || {}

  // Filter + sort
  const filtered = allCustomers
    .filter(c => !search || (c.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.customer_email || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const av = parseFloat(a[sortKey]) || 0
      const bv = parseFloat(b[sortKey]) || 0
      if (sortKey === 'customer_name') {
        return sortDir === 'asc'
          ? (a.customer_name || '').localeCompare(b.customer_name || '')
          : (b.customer_name || '').localeCompare(a.customer_name || '')
      }
      return sortDir === 'asc' ? av - bv : bv - av
    })

  // Totals for visible rows
  const totals = filtered.reduce((acc, c) => {
    BUCKETS.forEach(b => { acc[b.key] = (acc[b.key] || 0) + (parseFloat(c[b.key]) || 0) })
    acc.total_outstanding = (acc.total_outstanding || 0) + (parseFloat(c.total_outstanding) || 0)
    return acc
  }, {})

  /* ── Drill-down view ── */
  if (drillCustomer) {
    const { customer, invoices } = drillCustomer
    return (
      <div className={styles.overlay}>
        <div className={styles.container}>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <button className={styles.backBtn} onClick={() => setDrillCustomer(null)}>
                <i className="fas fa-arrow-left"></i>
              </button>
              <div className={styles.drillBadge}>
                <div className={styles.drillAvatar}>{initials(customer.customer_name)}</div>
                <div>
                  <h2 className={styles.title}>{customer.customer_name}</h2>
                  <span className={styles.subtitle}>Outstanding Invoices · {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
            <button className={styles.closeBtn} onClick={onClose}><i className="fas fa-times"></i></button>
          </div>

          {/* Customer aging summary strip */}
          <div className={styles.drillStrip}>
            {BUCKETS.map(b => (
              <div key={b.key} className={styles.drillStripCard} style={{ borderTopColor: b.color }}>
                <div className={styles.drillStripLabel}>{b.label}</div>
                <div className={styles.drillStripValue} style={{ color: b.color }}>
                  ${fmt(customer[b.key])}
                </div>
              </div>
            ))}
            <div className={styles.drillStripCard} style={{ borderTopColor: '#1d4ed8', background: '#eff6ff' }}>
              <div className={styles.drillStripLabel}>Total Outstanding</div>
              <div className={styles.drillStripValue} style={{ color: '#1d4ed8' }}>${fmt(customer.total_outstanding)}</div>
            </div>
          </div>

          {/* Invoice table */}
          <div className={styles.body}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Invoice Date</th>
                  <th>Due Date</th>
                  <th className={styles.right}>Invoice Amount</th>
                  <th className={styles.right}>Amount Paid</th>
                  <th className={styles.right}>Balance Due</th>
                  <th>Status</th>
                  <th className={styles.right}>Days Overdue</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => {
                  const daysOver = parseInt(inv.days_overdue) || 0
                  const bucket = daysOver <= 0 ? 'cur' : daysOver <= 30 ? 'd30' : daysOver <= 60 ? 'd60' : daysOver <= 90 ? 'd90' : 'd90p'
                  const bucketColor = { cur: '#16a34a', d30: '#ca8a04', d60: '#ea580c', d90: '#dc2626', d90p: '#7f1d1d' }[bucket]
                  return (
                    <tr key={inv.id}>
                      <td><span className={styles.invoiceRef}>{inv.invoice_no}</span></td>
                      <td className={styles.dateCell}>{fmtDate(inv.invoice_date)}</td>
                      <td className={styles.dateCell}>{fmtDate(inv.due_date)}</td>
                      <td className={`${styles.right} ${styles.amtCell}`}>${fmt(inv.grand_total)}</td>
                      <td className={`${styles.right} ${styles.paidCell}`}>${fmt(inv.amount_paid)}</td>
                      <td className={`${styles.right} ${styles.dueCell}`}>${fmt(inv.amount_due)}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${styles['status_' + inv.payment_status]}`}>
                          {(inv.payment_status || '').replace('_', ' ')}
                        </span>
                      </td>
                      <td className={styles.right}>
                        {daysOver > 0
                          ? <span className={styles.daysOverdue} style={{ color: bucketColor }}>{daysOver}d</span>
                          : <span className={styles.dayCurrent}>Current</span>
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className={styles.totalRow}>
                  <td colSpan={3}><strong>Total</strong></td>
                  <td className={`${styles.right} ${styles.bold}`}>${fmt(invoices.reduce((s,i) => s + (parseFloat(i.grand_total)||0), 0))}</td>
                  <td className={`${styles.right} ${styles.bold}`}>${fmt(invoices.reduce((s,i) => s + (parseFloat(i.amount_paid)||0), 0))}</td>
                  <td className={`${styles.right} ${styles.bold} ${styles.dueCell}`}>${fmt(customer.total_outstanding)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    )
  }

  /* ── Main aging report ── */
  return (
    <div className={styles.overlay}>
      <div className={styles.container}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <button className={styles.backBtn} onClick={onClose}>
              <i className="fas fa-arrow-left"></i>
            </button>
            <div>
              <h2 className={styles.title}>Aging — Account Receivables</h2>
              <span className={styles.subtitle}>Outstanding invoices by customer and age bucket</span>
            </div>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.asOfWrap}>
              <label className={styles.asOfLabel}>As of</label>
              <input
                type="date"
                className={styles.dateInput}
                value={asOf}
                onChange={e => setAsOf(e.target.value)}
              />
              <button className={styles.btnRun} onClick={() => load(asOf)} disabled={loading}>
                {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-sync-alt"></i>}
                Refresh
              </button>
            </div>
            <button className={styles.btnPrint} onClick={handlePrint} disabled={!data}>
              <i className="fas fa-print"></i> Print
            </button>
            <button className={styles.closeBtn} onClick={onClose}><i className="fas fa-times"></i></button>
          </div>
        </div>

        {error && (
          <div className={styles.errorBanner}>
            <i className="fas fa-exclamation-circle"></i> {error}
          </div>
        )}

        {loading && !data ? (
          <div className={styles.loadingState}>
            <i className="fas fa-spinner fa-spin"></i>
            <p>Loading aging report…</p>
          </div>
        ) : data ? (
          <div className={styles.body} ref={printRef}>

            {/* Print heading */}
            <div className={styles.printHeading}>
              <h1>Aging — Account Receivables</h1>
              <p>As of {fmtDate(data.as_of)} &nbsp;·&nbsp; {summary.customer_count} customer{summary.customer_count !== 1 ? 's' : ''} with outstanding balances</p>
            </div>

            {/* Summary cards */}
            <div className={styles.summaryRow}>
              <div className={`${styles.summaryCard} ${styles.summaryCardTotal}`}>
                <div className={styles.cardIcon}><i className="fas fa-dollar-sign"></i></div>
                <div>
                  <div className={styles.cardLabel}>Total Outstanding</div>
                  <div className={`${styles.cardValue} ${styles.totalColor}`}>${fmt(summary.total_outstanding)}</div>
                </div>
              </div>
              {BUCKETS.map(b => (
                <div key={b.key} className={styles.summaryCard} style={{ borderTopColor: b.color }}>
                  <div className={styles.cardLabel}>{b.label}</div>
                  <div className={styles.cardValue} style={{ color: b.color }}>${fmt(summary[b.key])}</div>
                  {summary.total_outstanding > 0 && (
                    <div className={styles.cardPct}>
                      {(((parseFloat(summary[b.key]) || 0) / summary.total_outstanding) * 100).toFixed(1)}%
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Search + count */}
            <div className={styles.toolbar}>
              <div className={styles.searchBox}>
                <i className={`fas fa-search ${styles.searchIcon}`}></i>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Search customer…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {search && (
                  <button className={styles.searchClear} onClick={() => setSearch('')}>
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>
              <span className={styles.rowCount}>
                {filtered.length} of {allCustomers.length} customer{allCustomers.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Table */}
            {filtered.length === 0 ? (
              <div className={styles.emptyState}>
                <i className="fas fa-check-circle"></i>
                <h3>No outstanding receivables</h3>
                <p>{search ? 'No customers match your search.' : 'All invoices are paid up to date.'}</p>
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.sortable} onClick={() => handleSort('customer_name')}>
                        Customer <SortIcon col="customer_name" />
                      </th>
                      <th className={`${styles.right} ${styles.sortable}`} onClick={() => handleSort('current_due')}>
                        Current <SortIcon col="current_due" />
                      </th>
                      <th className={`${styles.right} ${styles.sortable}`} onClick={() => handleSort('overdue_1_30')}>
                        1–30 Days <SortIcon col="overdue_1_30" />
                      </th>
                      <th className={`${styles.right} ${styles.sortable}`} onClick={() => handleSort('overdue_31_60')}>
                        31–60 Days <SortIcon col="overdue_31_60" />
                      </th>
                      <th className={`${styles.right} ${styles.sortable}`} onClick={() => handleSort('overdue_61_90')}>
                        61–90 Days <SortIcon col="overdue_61_90" />
                      </th>
                      <th className={`${styles.right} ${styles.sortable}`} onClick={() => handleSort('overdue_90_plus')}>
                        90+ Days <SortIcon col="overdue_90_plus" />
                      </th>
                      <th className={`${styles.right} ${styles.sortable}`} onClick={() => handleSort('total_outstanding')}>
                        Total <SortIcon col="total_outstanding" />
                      </th>
                      <th className={styles.center}>Invoices</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(c => {
                      const invs = invoicesByCustomer[c.customer_id] || []
                      return (
                        <tr
                          key={c.customer_id}
                          className={styles.dataRow}
                          onClick={() => setDrillCustomer({ customer: c, invoices: invs })}
                          title="Click to view invoices"
                        >
                          <td>
                            <div className={styles.customerCell}>
                              <div className={styles.avatar}>{initials(c.customer_name)}</div>
                              <div className={styles.nameStack}>
                                <span className={styles.customerName}>{c.customer_name}</span>
                                {c.customer_email && <span className={styles.customerEmail}>{c.customer_email}</span>}
                              </div>
                            </div>
                          </td>
                          {BUCKETS.map(b => (
                            <td key={b.key} className={styles.right}>
                              {parseFloat(c[b.key]) > 0
                                ? <span className={styles.bucketAmt} style={{ color: b.color }}>${fmt(c[b.key])}</span>
                                : <span className={styles.zeroAmt}>—</span>
                              }
                            </td>
                          ))}
                          <td className={`${styles.right} ${styles.totalAmt}`}>${fmt(c.total_outstanding)}</td>
                          <td className={styles.center}>
                            <span className={styles.invoiceCount}>{c.invoice_count}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className={styles.totalRow}>
                      <td><strong>Total ({filtered.length})</strong></td>
                      {BUCKETS.map(b => (
                        <td key={b.key} className={`${styles.right} ${styles.bold}`} style={{ color: b.color }}>
                          ${fmt(totals[b.key] || 0)}
                        </td>
                      ))}
                      <td className={`${styles.right} ${styles.bold} ${styles.totalColor}`}>${fmt(totals.total_outstanding || 0)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
