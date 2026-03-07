'use client'

import { useState, useCallback, useEffect } from 'react'
import styles from './Invoice.module.css'
import * as api from '../lib/api'

const fmt = (amt) => '$' + (parseFloat(amt) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'

const KpiCard = ({ label, value, color = '#2563eb', bg = '#eff6ff', border = '#bfdbfe', icon }) => (
  <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: '16px 20px' }}>
    <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color, letterSpacing: '0.5px', marginBottom: 6 }}>
      {icon && <i className={`fas ${icon}`} style={{ marginRight: 6 }}></i>}{label}
    </div>
    <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
  </div>
)

export default function ReportsDashboard({ isOpen, onClose, currencySymbol = '$' }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Report data
  const [overviewData, setOverviewData] = useState(null)
  const [plData, setPlData] = useState(null)
  const [salesData, setSalesData] = useState(null)
  const [purchaseData, setPurchaseData] = useState(null)
  const [agingData, setAgingData] = useState(null)   // { receivables: [], payables: [] }
  const [inventoryData, setInventoryData] = useState(null)
  const [agingView, setAgingView] = useState('receivables')

  const loadReport = useCallback(async (tab, from, to) => {
    setLoading(true); setError('')
    try {
      switch (tab) {
        case 'overview': {
          const res = await api.getReportsDashboard()
          setOverviewData(res.data || res)
          break
        }
        case 'pl': {
          const res = await api.getProfitLossReport(from, to)
          setPlData(res.data || res)
          break
        }
        case 'sales': {
          const res = await api.getSalesSummaryReport(from, to)
          setSalesData(res.data || res)
          break
        }
        case 'purchases': {
          const res = await api.getExpenseSummaryReport(from, to)
          setPurchaseData(res.data || res)
          break
        }
        case 'aging': {
          const [recRes, payRes] = await Promise.all([
            api.getReceivablesAgingReport(),
            api.getPayablesAgingReport(),
          ])
          setAgingData({
            receivables: recRes.data || [],
            payables: payRes.data || [],
          })
          break
        }
        case 'inventory': {
          const res = await api.getInventoryValuationReport()
          setInventoryData(res.data || res)
          break
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen && activeTab === 'overview') loadReport('overview', startDate, endDate)
  }, [isOpen, loadReport, startDate, endDate, activeTab])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    loadReport(tab, startDate, endDate)
  }

  const fmt = (amt) => currencySymbol + (parseFloat(amt) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const handleRun = () => loadReport(activeTab, startDate, endDate)

  if (!isOpen) return null

  const TABS = [
    { id: 'overview',   label: 'Overview',   icon: 'fa-tachometer-alt' },
    { id: 'pl',         label: 'P & L',       icon: 'fa-chart-bar' },
    { id: 'sales',      label: 'Sales',       icon: 'fa-chart-line' },
    { id: 'purchases',  label: 'Purchases',   icon: 'fa-shopping-cart' },
    { id: 'aging',      label: 'Aging',       icon: 'fa-clock' },
    { id: 'inventory',  label: 'Inventory',   icon: 'fa-boxes' },
  ]

  return (
    <div className={styles.invoiceListOverlay}>
      <div className={styles.invoiceListContainer}>

        {/* Header */}
        <div className={styles.listHeader}>
          <div className={styles.listHeaderLeft}><h2>Reports</h2></div>
          <div className={styles.listHeaderRight}>
            <button className={styles.closeBtn} onClick={onClose}><i className="fas fa-times"></i></button>
          </div>
        </div>

        {/* Date controls + Run */}
        <div className={styles.searchSection} style={{ flexWrap: 'wrap', gap: 10, borderBottom: 'none', paddingBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', whiteSpace: 'nowrap' }}>From:</label>
            <input type="date" className={styles.searchInput} style={{ width: 155 }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', whiteSpace: 'nowrap' }}>To:</label>
            <input type="date" className={styles.searchInput} style={{ width: 155 }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <button className={styles.btnPrimary} onClick={handleRun} disabled={loading}>
            <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-play'}`}></i> Run Report
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, padding: '0 20px', borderBottom: '2px solid #e2e8f0' }}>
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => handleTabChange(tab.id)} style={{
              padding: '10px 14px', border: 'none', fontSize: 13, cursor: 'pointer', background: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
              marginBottom: -2,
              color: activeTab === tab.id ? '#3b82f6' : '#64748b',
              fontWeight: activeTab === tab.id ? 600 : 400,
              display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
            }}>
              <i className={`fas ${tab.icon}`}></i> {tab.label}
            </button>
          ))}
        </div>

        {error && <div className={styles.errorBanner} style={{ margin: '12px 20px 0' }}><i className="fas fa-exclamation-circle"></i> {error}</div>}

        {/* Content */}
        <div className={styles.invoiceGridContainer} style={{ padding: '20px' }}>
          {loading ? (
            <div className={styles.loadingState}><i className="fas fa-spinner fa-spin"></i><p>Loading report...</p></div>
          ) : (
            <>
              {/* ── Overview ─────────────────────────────────────────── */}
              {activeTab === 'overview' && (
                overviewData ? (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                      <KpiCard label="Sales This Month" value={fmt(overviewData.month_sales)} color="#15803d" bg="#f0fdf4" border="#bbf7d0" icon="fa-arrow-up" />
                      <KpiCard label="Expenses This Month" value={fmt(overviewData.month_expenses)} color="#b91c1c" bg="#fef2f2" border="#fecaca" icon="fa-arrow-down" />
                      <KpiCard label="Total Receivables" value={fmt(overviewData.total_receivables)} color="#1d4ed8" bg="#eff6ff" border="#bfdbfe" icon="fa-file-invoice" />
                      <KpiCard label="Total Payables" value={fmt(overviewData.total_payables)} color="#b45309" bg="#fef3c7" border="#fde68a" icon="fa-file-invoice-dollar" />
                      <KpiCard label="Invoices This Month" value={overviewData.invoice_count || 0} color="#7c3aed" bg="#f5f3ff" border="#ddd6fe" icon="fa-receipt" />
                      <KpiCard label="Overdue Invoices" value={overviewData.overdue_invoices || 0} color={overviewData.overdue_invoices > 0 ? '#b91c1c' : '#166534'} bg={overviewData.overdue_invoices > 0 ? '#fef2f2' : '#f0fdf4'} border={overviewData.overdue_invoices > 0 ? '#fecaca' : '#bbf7d0'} icon="fa-exclamation-circle" />
                      <KpiCard label="Overdue Bills" value={overviewData.overdue_bills || 0} color={overviewData.overdue_bills > 0 ? '#b91c1c' : '#166534'} bg={overviewData.overdue_bills > 0 ? '#fef2f2' : '#f0fdf4'} border={overviewData.overdue_bills > 0 ? '#fecaca' : '#bbf7d0'} icon="fa-exclamation-triangle" />
                    </div>
                    <p style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center' }}>
                      Sales & expenses figures are for the current calendar month. Use other tabs for custom date range reports.
                    </p>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    <i className="fas fa-tachometer-alt"></i>
                    <h3>Business Overview</h3>
                    <p>Click "Run Report" to load the overview</p>
                  </div>
                )
              )}

              {/* ── P&L ──────────────────────────────────────────────── */}
              {activeTab === 'pl' && (
                plData ? (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                      <KpiCard label="Total Revenue" value={fmt(plData.revenue?.total)} color="#15803d" bg="#f0fdf4" border="#bbf7d0" icon="fa-chart-line" />
                      <KpiCard label="Total Expenses" value={fmt(plData.expenses?.combined)} color="#b91c1c" bg="#fef2f2" border="#fecaca" icon="fa-minus-circle" />
                      <KpiCard
                        label="Net Profit"
                        value={`${fmt(plData.net_profit)} (${plData.profit_margin}%)`}
                        color={parseFloat(plData.net_profit) >= 0 ? '#15803d' : '#b91c1c'}
                        bg={parseFloat(plData.net_profit) >= 0 ? '#f0fdf4' : '#fef2f2'}
                        border={parseFloat(plData.net_profit) >= 0 ? '#bbf7d0' : '#fecaca'}
                        icon="fa-balance-scale"
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                      <div>
                        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 12 }}>Revenue</h3>
                        <table className={styles.invoiceTable}>
                          <tbody>
                            <tr><td>Gross Revenue</td><td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(plData.revenue?.total)}</td></tr>
                            <tr><td style={{ paddingLeft: 20, color: '#64748b' }}>Less: Discounts</td><td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#64748b' }}>({fmt(plData.revenue?.discounts)})</td></tr>
                            <tr><td style={{ paddingLeft: 20, color: '#64748b' }}>Taxes Collected</td><td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#64748b' }}>{fmt(plData.revenue?.tax)}</td></tr>
                          </tbody>
                        </table>
                      </div>
                      <div>
                        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 12 }}>Expenses</h3>
                        <table className={styles.invoiceTable}>
                          <tbody>
                            <tr><td>Direct Expenses</td><td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(plData.expenses?.total_expenses)}</td></tr>
                            <tr><td>Bills / Vendor Costs</td><td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(plData.expenses?.total_bills)}</td></tr>
                            <tr style={{ fontWeight: 700 }}><td>Total</td><td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(plData.expenses?.combined)}</td></tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}><i className="fas fa-chart-bar"></i><h3>Profit & Loss</h3><p>Select a date range and click "Run Report"</p></div>
                )
              )}

              {/* ── Sales ────────────────────────────────────────────── */}
              {activeTab === 'sales' && (
                salesData ? (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
                      <KpiCard label="Total Invoices" value={salesData.summary?.total_invoices || 0} color="#1d4ed8" bg="#eff6ff" border="#bfdbfe" icon="fa-file-invoice" />
                      <KpiCard label="Gross Sales" value={fmt(salesData.summary?.gross_sales)} color="#15803d" bg="#f0fdf4" border="#bbf7d0" icon="fa-dollar-sign" />
                      <KpiCard label="Collected" value={fmt(salesData.summary?.total_collected)} color="#7c3aed" bg="#f5f3ff" border="#ddd6fe" icon="fa-check-circle" />
                      <KpiCard label="Outstanding" value={fmt(salesData.summary?.total_outstanding)} color="#b45309" bg="#fef3c7" border="#fde68a" icon="fa-hourglass-half" />
                    </div>

                    {salesData.by_status?.length > 0 && (
                      <div style={{ marginBottom: 24 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 10 }}>By Status</h3>
                        <table className={styles.invoiceTable}>
                          <thead><tr><th>Status</th><th>Count</th><th>Total</th></tr></thead>
                          <tbody>
                            {salesData.by_status.map((s, i) => (
                              <tr key={i}>
                                <td style={{ textTransform: 'capitalize' }}>{s.status}</td>
                                <td>{s.count}</td>
                                <td style={{ fontFamily: 'monospace' }}>{fmt(s.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {salesData.top_customers?.length > 0 && (
                      <div>
                        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 10 }}>Top Customers</h3>
                        <table className={styles.invoiceTable}>
                          <thead><tr><th>Customer</th><th>Invoices</th><th>Total Sales</th></tr></thead>
                          <tbody>
                            {salesData.top_customers.map((c, i) => (
                              <tr key={i}>
                                <td><strong>{c.customer_name || 'Unknown'}</strong></td>
                                <td>{c.invoice_count}</td>
                                <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{fmt(c.total_sales)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={styles.emptyState}><i className="fas fa-chart-line"></i><h3>Sales Summary</h3><p>Select a date range and click "Run Report"</p></div>
                )
              )}

              {/* ── Purchases ────────────────────────────────────────── */}
              {activeTab === 'purchases' && (
                purchaseData ? (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
                      <KpiCard label="Total Expenses" value={fmt(purchaseData.expenses?.total_amount)} color="#b91c1c" bg="#fef2f2" border="#fecaca" icon="fa-receipt" />
                      <KpiCard label="Expenses Paid" value={fmt(purchaseData.expenses?.paid_amount)} color="#15803d" bg="#f0fdf4" border="#bbf7d0" icon="fa-check" />
                      <KpiCard label="Expenses Unpaid" value={fmt(purchaseData.expenses?.unpaid_amount)} color="#b45309" bg="#fef3c7" border="#fde68a" icon="fa-clock" />
                      <KpiCard label="Total Bills" value={fmt(purchaseData.bills?.total_amount)} color="#7c3aed" bg="#f5f3ff" border="#ddd6fe" icon="fa-file-invoice-dollar" />
                      <KpiCard label="Bills Paid" value={fmt(purchaseData.bills?.paid_amount)} color="#15803d" bg="#f0fdf4" border="#bbf7d0" icon="fa-check-double" />
                      <KpiCard label="Bills Outstanding" value={fmt(purchaseData.bills?.outstanding_amount)} color="#b91c1c" bg="#fef2f2" border="#fecaca" icon="fa-exclamation" />
                    </div>

                    {purchaseData.expenses_by_category?.length > 0 && (
                      <div>
                        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 10 }}>Expenses by Category</h3>
                        <table className={styles.invoiceTable}>
                          <thead><tr><th>Category</th><th>Count</th><th>Total</th></tr></thead>
                          <tbody>
                            {purchaseData.expenses_by_category.map((c, i) => (
                              <tr key={i}>
                                <td style={{ textTransform: 'capitalize' }}>{(c.expense_category || 'Uncategorized').replace(/_/g, ' ')}</td>
                                <td>{c.count}</td>
                                <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{fmt(c.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={styles.emptyState}><i className="fas fa-shopping-cart"></i><h3>Purchase Summary</h3><p>Select a date range and click "Run Report"</p></div>
                )
              )}

              {/* ── Aging ─────────────────────────────────────────────── */}
              {activeTab === 'aging' && (
                <div>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
                    {['receivables', 'payables'].map(v => (
                      <button key={v} onClick={() => setAgingView(v)} style={{
                        padding: '6px 16px', fontSize: 13, borderRadius: 6, cursor: 'pointer',
                        fontWeight: agingView === v ? 600 : 400,
                        color: agingView === v ? '#2563eb' : '#6b7280',
                        background: agingView === v ? '#eff6ff' : '#f9fafb',
                        border: `1px solid ${agingView === v ? '#bfdbfe' : '#e5e7eb'}`,
                      }}>
                        {v === 'receivables' ? 'Receivables' : 'Payables'}
                      </button>
                    ))}
                  </div>

                  {agingView === 'receivables' && (
                    agingData?.receivables?.length > 0 ? (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 16 }}>
                          {['current_due', 'overdue_1_30', 'overdue_31_60', 'overdue_61_90', 'overdue_90_plus'].map((k, i) => {
                            const labels = ['Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days']
                            const total = agingData.receivables.reduce((s, r) => s + (parseFloat(r[k]) || 0), 0)
                            return <KpiCard key={k} label={labels[i]} value={fmt(total)} color={i >= 3 ? '#b91c1c' : '#1d4ed8'} bg={i >= 3 ? '#fef2f2' : '#eff6ff'} border={i >= 3 ? '#fecaca' : '#bfdbfe'} />
                          })}
                        </div>
                        <table className={styles.invoiceTable}>
                          <thead><tr><th>Customer</th><th>Current</th><th>1-30</th><th>31-60</th><th>61-90</th><th>90+</th><th>Total</th></tr></thead>
                          <tbody>
                            {agingData.receivables.map((r, i) => (
                              <tr key={i}>
                                <td><strong>{r.customer_name}</strong></td>
                                <td style={{ fontFamily: 'monospace' }}>{fmt(r.current_due)}</td>
                                <td style={{ fontFamily: 'monospace' }}>{fmt(r.overdue_1_30)}</td>
                                <td style={{ fontFamily: 'monospace' }}>{fmt(r.overdue_31_60)}</td>
                                <td style={{ fontFamily: 'monospace', color: parseFloat(r.overdue_61_90) > 0 ? '#dc2626' : undefined }}>{fmt(r.overdue_61_90)}</td>
                                <td style={{ fontFamily: 'monospace', color: parseFloat(r.overdue_90_plus) > 0 ? '#dc2626' : undefined, fontWeight: parseFloat(r.overdue_90_plus) > 0 ? 600 : 400 }}>{fmt(r.overdue_90_plus)}</td>
                                <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{fmt(r.total_outstanding)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </>
                    ) : (
                      <div className={styles.emptyState}><i className="fas fa-file-invoice"></i><h3>No outstanding receivables</h3><p>{agingData ? 'All invoices are paid' : 'Click "Run Report" to load'}</p></div>
                    )
                  )}

                  {agingView === 'payables' && (
                    agingData?.payables?.length > 0 ? (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 16 }}>
                          {['current_due', 'overdue_1_30', 'overdue_31_60', 'overdue_61_90', 'overdue_90_plus'].map((k, i) => {
                            const labels = ['Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days']
                            const total = agingData.payables.reduce((s, r) => s + (parseFloat(r[k]) || 0), 0)
                            return <KpiCard key={k} label={labels[i]} value={fmt(total)} color={i >= 3 ? '#b91c1c' : '#b45309'} bg={i >= 3 ? '#fef2f2' : '#fef3c7'} border={i >= 3 ? '#fecaca' : '#fde68a'} />
                          })}
                        </div>
                        <table className={styles.invoiceTable}>
                          <thead><tr><th>Vendor</th><th>Current</th><th>1-30</th><th>31-60</th><th>61-90</th><th>90+</th><th>Total</th></tr></thead>
                          <tbody>
                            {agingData.payables.map((r, i) => (
                              <tr key={i}>
                                <td><strong>{r.vendor_name}</strong></td>
                                <td style={{ fontFamily: 'monospace' }}>{fmt(r.current_due)}</td>
                                <td style={{ fontFamily: 'monospace' }}>{fmt(r.overdue_1_30)}</td>
                                <td style={{ fontFamily: 'monospace' }}>{fmt(r.overdue_31_60)}</td>
                                <td style={{ fontFamily: 'monospace', color: parseFloat(r.overdue_61_90) > 0 ? '#dc2626' : undefined }}>{fmt(r.overdue_61_90)}</td>
                                <td style={{ fontFamily: 'monospace', color: parseFloat(r.overdue_90_plus) > 0 ? '#dc2626' : undefined, fontWeight: parseFloat(r.overdue_90_plus) > 0 ? 600 : 400 }}>{fmt(r.overdue_90_plus)}</td>
                                <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{fmt(r.total_outstanding)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </>
                    ) : (
                      <div className={styles.emptyState}><i className="fas fa-file-invoice-dollar"></i><h3>No outstanding payables</h3><p>{agingData ? 'All bills are paid' : 'Click "Run Report" to load'}</p></div>
                    )
                  )}
                </div>
              )}

              {/* ── Inventory Valuation ───────────────────────────────── */}
              {activeTab === 'inventory' && (
                inventoryData ? (
                  <div>
                    <div style={{ marginBottom: 20 }}>
                      <KpiCard label="Total Inventory Value" value={fmt(inventoryData.total_inventory_value)} color="#7c3aed" bg="#f5f3ff" border="#ddd6fe" icon="fa-boxes" />
                    </div>
                    {inventoryData.products?.length > 0 ? (
                      <table className={styles.invoiceTable}>
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>SKU</th>
                            <th>UOM</th>
                            <th style={{ textAlign: 'right' }}>On Hand</th>
                            <th style={{ textAlign: 'right' }}>Unit Cost</th>
                            <th style={{ textAlign: 'right' }}>Total Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inventoryData.products.map((p, i) => (
                            <tr key={i}>
                              <td><strong>{p.name}</strong></td>
                              <td style={{ fontFamily: 'monospace', color: '#64748b' }}>{p.sku || '-'}</td>
                              <td>{p.unit_of_measure || '-'}</td>
                              <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{p.current_stock ?? 0}</td>
                              <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(p.unit_cost)}</td>
                              <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{fmt(p.total_value)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ borderTop: '2px solid #e2e8f0', background: '#f8fafc' }}>
                            <td colSpan={5} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>Total Inventory Value</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: 15 }}>{fmt(inventoryData.total_inventory_value)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    ) : (
                      <div className={styles.emptyState}><i className="fas fa-box-open"></i><h3>No tracked inventory products</h3><p>Enable inventory tracking on products to see valuation</p></div>
                    )}
                  </div>
                ) : (
                  <div className={styles.emptyState}><i className="fas fa-boxes"></i><h3>Inventory Valuation</h3><p>Click "Run Report" to load current stock values</p></div>
                )
              )}
            </>
          )}
        </div>

      </div>
    </div>
  )
}
