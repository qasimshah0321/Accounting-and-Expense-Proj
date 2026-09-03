'use client'

import { useState, useCallback, useEffect } from 'react'
import styles from './Invoice.module.css'
import * as api from '../lib/api'
import ProfitLossReport from './ProfitLossReport'

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

  // Report data — existing
  const [overviewData, setOverviewData] = useState(null)
  const [plData, setPlData] = useState(null)
  const [salesData, setSalesData] = useState(null)
  const [purchaseData, setPurchaseData] = useState(null)
  const [agingData, setAgingData] = useState(null)
  const [inventoryData, setInventoryData] = useState(null)
  const [taxData, setTaxData] = useState(null)
  const [bsData, setBsData] = useState(null)
  const [cfData, setCfData] = useState(null)
  const [agingView, setAgingView] = useState('receivables')

  // Report data — enhanced financial statements (Section 2.1)
  const [plCompData, setPlCompData] = useState(null)
  const [plCompMode, setPlCompMode] = useState('prior_period')
  const [bsCompDate1, setBsCompDate1] = useState(() => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d.toISOString().split('T')[0] })
  const [bsCompDate2, setBsCompDate2] = useState(new Date().toISOString().split('T')[0])
  const [bsCompData, setBsCompData] = useState(null)
  const [equityData, setEquityData] = useState(null)
  const [forecastData, setForecastData] = useState(null)
  const [plDeptData, setPlDeptData] = useState(null)
  const [budgetData, setBudgetData] = useState(null)
  const [budgetPeriods, setBudgetPeriods] = useState([])
  const [selectedBudgetPeriod, setSelectedBudgetPeriod] = useState('')

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
          // Use the new full P&L endpoint (sectioned statement); fall back to legacy if missing.
          try {
            const res = await api.getProfitAndLossReport(from, to)
            setPlData(res.data || res)
          } catch (e) {
            const res = await api.getProfitLossReport(from, to)
            setPlData(res.data || res)
          }
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
        case 'aging':
        case 'aging_ar':
        case 'aging_ap': {
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
        case 'tax': {
          const res = await api.getTaxSummaryReport(from, to)
          setTaxData(res.data || res)
          break
        }
        case 'bs': {
          const res = await api.getBalanceSheetReport(to)
          setBsData(res.data || res)
          break
        }
        case 'cf': {
          const res = await api.getCashFlowReport(from, to)
          setCfData(res.data || res)
          break
        }
        case 'pl_comparison': {
          const res = await api.getPLComparisonReport(from, to, plCompMode)
          setPlCompData(res.data || res)
          break
        }
        case 'bs_comparison': {
          const res = await api.getBSComparisonReport(bsCompDate1, bsCompDate2)
          setBsCompData(res.data || res)
          break
        }
        case 'equity_changes': {
          const res = await api.getEquityChangesReport(from, to)
          setEquityData(res.data || res)
          break
        }
        case 'cf_forecast': {
          const res = await api.getCashFlowForecastReport()
          setForecastData(res.data || res)
          break
        }
        case 'pl_by_dept': {
          const res = await api.getPLByDepartmentReport(from, to)
          setPlDeptData(res.data || res)
          break
        }
        case 'pl_budget': {
          const [bpRes, bvaRes] = await Promise.all([
            api.getBudgetPeriods(),
            api.getBudgetVsActualReport(from, to, selectedBudgetPeriod || undefined),
          ])
          setBudgetPeriods((bpRes.data || []))
          setBudgetData(bvaRes.data || bvaRes)
          break
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [plCompMode, bsCompDate1, bsCompDate2, selectedBudgetPeriod])

  useEffect(() => {
    if (isOpen && activeTab === 'overview') loadReport('overview', startDate, endDate)
  }, [isOpen, loadReport, startDate, endDate, activeTab])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    if (tab === 'aging_ar') setAgingView('receivables')
    else if (tab === 'aging_ap') setAgingView('payables')
    loadReport(tab, startDate, endDate)
  }

  const fmt = (amt) => currencySymbol + (parseFloat(amt) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const handleRun = () => loadReport(activeTab, startDate, endDate)

  if (!isOpen) return null

  const GROUPS = [
    {
      label: null,
      tabs: [{ id: 'overview', label: 'Overview', icon: 'fa-tachometer-alt' }],
    },
    {
      label: 'Financial Statements',
      tabs: [
        { id: 'pl',  label: 'Profit & Loss',  icon: 'fa-chart-bar' },
        { id: 'bs',  label: 'Balance Sheet',  icon: 'fa-balance-scale' },
        { id: 'cf',  label: 'Cash Flow',      icon: 'fa-water' },
      ],
    },
    {
      label: 'Sales & Receivables',
      tabs: [
        { id: 'sales',    label: 'Sales Summary', icon: 'fa-chart-line' },
        { id: 'aging_ar', label: 'AR Aging',      icon: 'fa-users' },
      ],
    },
    {
      label: 'Purchases & Payables',
      tabs: [
        { id: 'purchases', label: 'Purchases', icon: 'fa-shopping-cart' },
        { id: 'aging_ap',  label: 'AP Aging',  icon: 'fa-store' },
      ],
    },
    {
      label: 'Operations',
      tabs: [
        { id: 'inventory', label: 'Inventory',   icon: 'fa-boxes' },
        { id: 'tax',       label: 'Tax Summary', icon: 'fa-percent' },
      ],
    },
    {
      label: 'Enhanced Statements',
      tabs: [
        { id: 'pl_comparison', label: 'P&L Comparison',     icon: 'fa-code-branch' },
        { id: 'pl_by_dept',    label: 'P&L by Department',  icon: 'fa-sitemap' },
        { id: 'pl_budget',     label: 'Budget vs Actual',   icon: 'fa-tasks' },
        { id: 'bs_comparison', label: 'BS Comparison',      icon: 'fa-columns' },
        { id: 'equity_changes',label: 'Equity Changes',     icon: 'fa-chart-pie' },
        { id: 'cf_forecast',   label: 'Cash Flow Forecast', icon: 'fa-calendar-alt' },
      ],
    },
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

        {/* Body: sidebar nav + report content */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', borderTop: '1px solid #e2e8f0' }}>

          {/* Left sidebar */}
          <div style={{ width: 210, borderRight: '1px solid #e2e8f0', overflowY: 'auto', flexShrink: 0, paddingTop: 8, paddingBottom: 12 }}>
            {GROUPS.map((group, gi) => (
              <div key={gi} style={{ marginBottom: group.label ? 4 : 0 }}>
                {group.label && (
                  <div style={{ padding: '12px 16px 5px', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', color: '#94a3b8' }}>
                    {group.label}
                  </div>
                )}
                {group.tabs.map(tab => (
                  <button key={tab.id} onClick={() => handleTabChange(tab.id)} style={{
                    width: '100%', textAlign: 'left', padding: '8px 16px',
                    border: 'none', cursor: 'pointer', fontSize: 13,
                    background: activeTab === tab.id ? '#eff6ff' : 'transparent',
                    color: activeTab === tab.id ? '#2563eb' : '#374151',
                    fontWeight: activeTab === tab.id ? 600 : 400,
                    borderRight: activeTab === tab.id ? '3px solid #2563eb' : '3px solid transparent',
                    display: 'flex', alignItems: 'center', gap: 9,
                    transition: 'background 0.1s',
                  }}>
                    <i className={`fas ${tab.icon}`} style={{ width: 15, textAlign: 'center', fontSize: 12, color: activeTab === tab.id ? '#2563eb' : '#9ca3af' }}></i>
                    {tab.label}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Report content panel */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
            {error && <div className={styles.errorBanner} style={{ marginBottom: 16 }}><i className="fas fa-exclamation-circle"></i> {error}</div>}
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
                // The new full Income Statement uses keys like `revenue.net_revenue`,
                // `cogs.total`, `gross_profit`, etc. The legacy endpoint returns
                // `revenue.total` / `net_profit`. We detect which payload we have and
                // render the rich statement when possible.
                (plData && (plData.gross_profit !== undefined || plData.cogs)) ? (
                  <ProfitLossReport
                    startDate={startDate}
                    endDate={endDate}
                    data={plData}
                    loading={loading}
                    error={null}
                    currencySymbol={currencySymbol}
                    onChangeStartDate={setStartDate}
                    onChangeEndDate={setEndDate}
                    onRun={() => loadReport('pl', startDate, endDate)}
                  />
                ) : plData ? (
                  // Legacy fallback (older deployments without /profit-and-loss)
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
              {(activeTab === 'aging_ar' || activeTab === 'aging_ap' || activeTab === 'aging') && (
                <div>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
                    {['receivables', 'payables'].map(v => (
                      <button key={v} onClick={() => { setAgingView(v); setActiveTab(v === 'receivables' ? 'aging_ar' : 'aging_ap') }} style={{
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
              {/* ── Tax Summary ──────────────────────────────────────── */}
              {activeTab === 'tax' && (
                taxData ? (
                  <div>
                    {/* Net Tax Payable highlight */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
                      <KpiCard label="Output Tax (Sales)" value={fmt(taxData.output_tax?.tax_amount)} color="#166534" bg="#f0fdf4" border="#bbf7d0" icon="fa-arrow-up" />
                      <KpiCard label="Input Tax (Purchases)" value={fmt(taxData.input_tax?.total)} color="#1e40af" bg="#eff6ff" border="#bfdbfe" icon="fa-arrow-down" />
                      <KpiCard
                        label={taxData.net_tax_payable >= 0 ? 'Net Tax Payable' : 'Net Tax Refundable'}
                        value={fmt(Math.abs(taxData.net_tax_payable))}
                        color={taxData.net_tax_payable >= 0 ? '#dc2626' : '#7c3aed'}
                        bg={taxData.net_tax_payable >= 0 ? '#fef2f2' : '#f5f3ff'}
                        border={taxData.net_tax_payable >= 0 ? '#fecaca' : '#ddd6fe'}
                        icon="fa-balance-scale"
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                      {/* Output Tax detail */}
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                        <div style={{ background: '#f0fdf4', padding: '10px 14px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, fontSize: 13, color: '#166534' }}>
                          <i className="fas fa-file-invoice" style={{ marginRight: 6 }} />Output Tax — Sales ({taxData.output_tax?.invoice_count} invoices)
                        </div>
                        <div style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                            <span style={{ color: '#64748b' }}>Gross Revenue</span>
                            <span style={{ fontFamily: 'monospace' }}>{fmt(taxData.output_tax?.gross_revenue)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14, borderTop: '1px solid #e2e8f0', paddingTop: 8 }}>
                            <span>Output Tax</span>
                            <span style={{ fontFamily: 'monospace', color: '#166534' }}>{fmt(taxData.output_tax?.tax_amount)}</span>
                          </div>
                          {taxData.output_tax?.breakdown?.length > 0 && (
                            <div style={{ marginTop: 12 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 6, textTransform: 'uppercase' }}>By Tax Rate</div>
                              {taxData.output_tax.breakdown.map((b, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                                  <span>{b.tax_name || 'Tax'} ({b.tax_rate}%)</span>
                                  <span style={{ fontFamily: 'monospace' }}>{fmt(b.tax_amount)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Input Tax detail */}
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                        <div style={{ background: '#eff6ff', padding: '10px 14px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, fontSize: 13, color: '#1e40af' }}>
                          <i className="fas fa-receipt" style={{ marginRight: 6 }} />Input Tax — Purchases
                        </div>
                        <div style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                            <span style={{ color: '#64748b' }}>Bills ({taxData.input_tax?.from_bills?.count})</span>
                            <span style={{ fontFamily: 'monospace' }}>{fmt(taxData.input_tax?.from_bills?.tax_amount)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                            <span style={{ color: '#64748b' }}>Expenses ({taxData.input_tax?.from_expenses?.count})</span>
                            <span style={{ fontFamily: 'monospace' }}>{fmt(taxData.input_tax?.from_expenses?.tax_amount)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14, borderTop: '1px solid #e2e8f0', paddingTop: 8 }}>
                            <span>Total Input Tax</span>
                            <span style={{ fontFamily: 'monospace', color: '#1e40af' }}>{fmt(taxData.input_tax?.total)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Tax Return summary */}
                    <div style={{ marginTop: 20, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                      <div style={{ background: '#f8fafc', padding: '10px 14px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, fontSize: 13 }}>
                        <i className="fas fa-calculator" style={{ marginRight: 6 }} />Tax Return Computation
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px 16px', color: '#64748b' }}>Output Tax (Sales Tax Collected)</td>
                            <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(taxData.output_tax?.tax_amount)}</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px 16px', color: '#64748b' }}>Less: Input Tax Recoverable (Purchases)</td>
                            <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'monospace', color: '#1e40af' }}>({fmt(taxData.input_tax?.total)})</td>
                          </tr>
                          <tr style={{ background: taxData.net_tax_payable >= 0 ? '#fef2f2' : '#f5f3ff', fontWeight: 700 }}>
                            <td style={{ padding: '12px 16px', fontSize: 15 }}>
                              {taxData.net_tax_payable >= 0 ? 'Net Tax Payable to Authority' : 'Net Tax Refund Due'}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontSize: 16, color: taxData.net_tax_payable >= 0 ? '#dc2626' : '#7c3aed' }}>
                              {fmt(Math.abs(taxData.net_tax_payable))}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}><i className="fas fa-percent"></i><h3>Tax Summary</h3><p>Select a date range and click "Run Report" to compute Output Tax, Input Tax, and Net Tax Payable</p></div>
                )
              )}

              {/* ── Balance Sheet ─────────────────────────────────────── */}
              {activeTab === 'bs' && (
                bsData ? (() => {
                  const Section = ({ title, accounts, total, color = '#1d4ed8' }) => (
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.5px', color, borderBottom: `2px solid ${color}`, paddingBottom: 6, marginBottom: 8 }}>{title}</div>
                      {accounts.length === 0
                        ? <div style={{ color: '#94a3b8', fontSize: 13, padding: '4px 0' }}>No accounts with balance</div>
                        : accounts.map(a => (
                          <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                            <span style={{ color: '#374151' }}>
                              <span style={{ background: '#f1f5f9', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontFamily: 'monospace', marginRight: 8 }}>{a.account_number}</span>
                              {a.name}
                            </span>
                            <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{fmt(a.balance)}</span>
                          </div>
                        ))
                      }
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontWeight: 700, fontSize: 14, borderTop: `2px solid ${color}`, marginTop: 4 }}>
                        <span style={{ color }}>Total {title}</span>
                        <span style={{ fontFamily: 'monospace', color }}>{fmt(total)}</span>
                      </div>
                    </div>
                  )

                  return (
                    <div>
                      {/* Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
                        <div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Balance Sheet</div>
                          <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>As of {new Date(bsData.as_of + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          {bsData.balanced
                            ? <span style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}><i className="fas fa-check-circle" style={{ marginRight: 5 }}></i>Balanced</span>
                            : <span style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}><i className="fas fa-exclamation-circle" style={{ marginRight: 5 }}></i>Out of Balance</span>
                          }
                        </div>
                      </div>

                      {/* KPI row */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 28 }}>
                        <KpiCard label="Total Assets" value={fmt(bsData.assets.total)} color="#15803d" bg="#f0fdf4" border="#bbf7d0" icon="fa-university" />
                        <KpiCard label="Total Liabilities" value={fmt(bsData.liabilities.total)} color="#b91c1c" bg="#fef2f2" border="#fecaca" icon="fa-hand-holding-usd" />
                        <KpiCard label="Total Equity" value={fmt(bsData.equity.total)} color="#7c3aed" bg="#f5f3ff" border="#ddd6fe" icon="fa-chart-pie" />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
                        {/* Left — Assets */}
                        <div>
                          <Section title="Current Assets"  accounts={bsData.assets.current} total={bsData.assets.current.reduce((s,a)=>s+a.balance,0)} color="#15803d" />
                          <Section title="Fixed Assets"    accounts={bsData.assets.fixed}   total={bsData.assets.fixed.reduce((s,a)=>s+a.balance,0)}   color="#0369a1" />
                          {/* Grand Total Assets */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontWeight: 800, fontSize: 15, borderTop: '3px double #1e293b' }}>
                            <span>TOTAL ASSETS</span>
                            <span style={{ fontFamily: 'monospace' }}>{fmt(bsData.assets.total)}</span>
                          </div>
                        </div>

                        {/* Right — Liabilities + Equity */}
                        <div>
                          <Section title="Current Liabilities"   accounts={bsData.liabilities.current}   total={bsData.liabilities.current.reduce((s,a)=>s+a.balance,0)}   color="#b91c1c" />
                          <Section title="Long-Term Liabilities"  accounts={bsData.liabilities.long_term} total={bsData.liabilities.long_term.reduce((s,a)=>s+a.balance,0)} color="#9a3412" />
                          {/* Equity */}
                          <div style={{ marginBottom: 24 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#7c3aed', borderBottom: '2px solid #7c3aed', paddingBottom: 6, marginBottom: 8 }}>Equity</div>
                            {bsData.equity.accounts.map(a => (
                              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                                <span style={{ color: '#374151' }}>
                                  <span style={{ background: '#f1f5f9', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontFamily: 'monospace', marginRight: 8 }}>{a.account_number}</span>
                                  {a.name}
                                </span>
                                <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{fmt(a.balance)}</span>
                              </div>
                            ))}
                            {/* Current Year Net Income */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                              <span style={{ color: '#374151', fontStyle: 'italic' }}>Current Year Net Income</span>
                              <span style={{ fontFamily: 'monospace', fontWeight: 500, color: bsData.equity.current_year_net_income >= 0 ? '#15803d' : '#b91c1c' }}>
                                {bsData.equity.current_year_net_income < 0 ? '(' + fmt(Math.abs(bsData.equity.current_year_net_income)) + ')' : fmt(bsData.equity.current_year_net_income)}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontWeight: 700, fontSize: 14, borderTop: '2px solid #7c3aed', marginTop: 4 }}>
                              <span style={{ color: '#7c3aed' }}>Total Equity</span>
                              <span style={{ fontFamily: 'monospace', color: '#7c3aed' }}>{fmt(bsData.equity.total)}</span>
                            </div>
                          </div>
                          {/* Grand Total */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontWeight: 800, fontSize: 15, borderTop: '3px double #1e293b' }}>
                            <span>TOTAL LIABILITIES &amp; EQUITY</span>
                            <span style={{ fontFamily: 'monospace' }}>{fmt(bsData.total_liabilities_and_equity)}</span>
                          </div>
                        </div>
                      </div>

                      {!bsData.balanced && (
                        <div style={{ marginTop: 16, padding: '10px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#b91c1c', fontSize: 13 }}>
                          <i className="fas fa-exclamation-triangle" style={{ marginRight: 8 }}></i>
                          The balance sheet does not balance — Assets ({fmt(bsData.assets.total)}) ≠ Liabilities + Equity ({fmt(bsData.total_liabilities_and_equity)}). Check for missing journal entries or unposted opening balances.
                        </div>
                      )}
                    </div>
                  )
                })() : (
                  <div className={styles.emptyState}><i className="fas fa-balance-scale"></i><h3>Balance Sheet</h3><p>Select an "As of" date (use the To date) and click "Run Report"</p></div>
                )
              )}

              {/* ── Cash Flow Statement ──────────────────────────────── */}
              {activeTab === 'cf' && (
                cfData ? (() => {
                  const fmtAmt = (amt) => {
                    const n = parseFloat(amt) || 0
                    const s = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    return n < 0 ? `(${currencySymbol}${s})` : `${currencySymbol}${s}`
                  }

                  const SectionHeader = ({ title, color = '#1d4ed8' }) => (
                    <div style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.5px', color, borderBottom: `2px solid ${color}`, paddingBottom: 6, marginBottom: 10, marginTop: 20 }}>{title}</div>
                  )
                  const Line = ({ label, amount, bold, indent, color }) => (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f1f5f9', fontSize: bold ? 14 : 13, fontWeight: bold ? 700 : 400 }}>
                      <span style={{ color: color || '#374151', paddingLeft: indent ? 24 : 0 }}>{label}</span>
                      <span style={{ fontFamily: 'monospace', color: color || (parseFloat(amount) < 0 ? '#b91c1c' : '#1e293b') }}>{fmtAmt(amount)}</span>
                    </div>
                  )
                  const TotalLine = ({ label, amount, color = '#1d4ed8' }) => (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', fontWeight: 700, fontSize: 14, borderTop: `2px solid ${color}`, marginTop: 4 }}>
                      <span style={{ color }}>{label}</span>
                      <span style={{ fontFamily: 'monospace', color }}>{fmtAmt(amount)}</span>
                    </div>
                  )

                  const reconcOk = Math.abs(cfData.summary.reconciliation_variance) < 0.02

                  return (
                    <div style={{ maxWidth: 720 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Statement of Cash Flows</div>
                          <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                            {new Date(cfData.period.start_date + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} — {new Date(cfData.period.end_date + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                        <span style={{ background: reconcOk ? '#f0fdf4' : '#fef2f2', color: reconcOk ? '#15803d' : '#b91c1c', border: `1px solid ${reconcOk ? '#bbf7d0' : '#fecaca'}`, borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>
                          <i className={`fas ${reconcOk ? 'fa-check-circle' : 'fa-exclamation-circle'}`} style={{ marginRight: 5 }}></i>
                          {reconcOk ? 'Reconciled' : 'Variance Detected'}
                        </span>
                      </div>

                      {/* KPI strip */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
                        <KpiCard label="Operating" value={fmtAmt(cfData.operating.net_cash)} color={cfData.operating.net_cash >= 0 ? '#15803d' : '#b91c1c'} bg={cfData.operating.net_cash >= 0 ? '#f0fdf4' : '#fef2f2'} border={cfData.operating.net_cash >= 0 ? '#bbf7d0' : '#fecaca'} icon="fa-cogs" />
                        <KpiCard label="Investing"  value={fmtAmt(cfData.investing.net_cash)}  color={cfData.investing.net_cash  >= 0 ? '#15803d' : '#b91c1c'} bg={cfData.investing.net_cash  >= 0 ? '#f0fdf4' : '#fef2f2'} border={cfData.investing.net_cash  >= 0 ? '#bbf7d0' : '#fecaca'} icon="fa-chart-line" />
                        <KpiCard label="Financing"  value={fmtAmt(cfData.financing.net_cash)}  color={cfData.financing.net_cash  >= 0 ? '#15803d' : '#b91c1c'} bg={cfData.financing.net_cash  >= 0 ? '#f0fdf4' : '#fef2f2'} border={cfData.financing.net_cash  >= 0 ? '#bbf7d0' : '#fecaca'} icon="fa-hand-holding-usd" />
                      </div>

                      {/* OPERATING */}
                      <SectionHeader title="A. Operating Activities" color="#15803d" />
                      <Line label="Net Income" amount={cfData.operating.net_income} bold />
                      <div style={{ marginTop: 8, marginBottom: 4, fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Working Capital Adjustments</div>
                      {cfData.operating.working_capital_adjustments.length === 0
                        ? <div style={{ fontSize: 13, color: '#94a3b8', padding: '4px 0 4px 24px' }}>No working capital movements in this period</div>
                        : cfData.operating.working_capital_adjustments.map((it, i) => <Line key={i} label={it.label} amount={it.amount} indent />)
                      }
                      <TotalLine label="Net Cash from Operating Activities" amount={cfData.operating.net_cash} color="#15803d" />

                      {/* INVESTING */}
                      <SectionHeader title="B. Investing Activities" color="#0369a1" />
                      {cfData.investing.activities.length === 0
                        ? <div style={{ fontSize: 13, color: '#94a3b8', padding: '4px 0' }}>No investing activity in this period</div>
                        : cfData.investing.activities.map((it, i) => <Line key={i} label={it.label} amount={it.amount} />)
                      }
                      <TotalLine label="Net Cash from Investing Activities" amount={cfData.investing.net_cash} color="#0369a1" />

                      {/* FINANCING */}
                      <SectionHeader title="C. Financing Activities" color="#7c3aed" />
                      {cfData.financing.activities.length === 0
                        ? <div style={{ fontSize: 13, color: '#94a3b8', padding: '4px 0' }}>No financing activity in this period</div>
                        : cfData.financing.activities.map((it, i) => <Line key={i} label={it.label} amount={it.amount} />)
                      }
                      <TotalLine label="Net Cash from Financing Activities" amount={cfData.financing.net_cash} color="#7c3aed" />

                      {/* SUMMARY */}
                      <SectionHeader title="Summary" color="#1e293b" />
                      <Line label="Opening Cash Balance"   amount={cfData.summary.opening_cash_balance} />
                      <Line label="Net Change in Cash (A + B + C)" amount={cfData.summary.net_change_in_cash} bold />
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontWeight: 800, fontSize: 15, borderTop: '3px double #1e293b', marginTop: 4 }}>
                        <span>Closing Cash Balance</span>
                        <span style={{ fontFamily: 'monospace' }}>{fmtAmt(cfData.summary.closing_cash_balance)}</span>
                      </div>

                      {!reconcOk && (
                        <div style={{ marginTop: 14, padding: '10px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#b91c1c', fontSize: 13 }}>
                          <i className="fas fa-exclamation-triangle" style={{ marginRight: 8 }}></i>
                          Reconciliation variance of {fmtAmt(cfData.summary.reconciliation_variance)}. This usually means journal entries exist that move cash without going through a tracked transaction. Review GL account 1000.
                        </div>
                      )}
                    </div>
                  )
                })() : (
                  <div className={styles.emptyState}><i className="fas fa-water"></i><h3>Cash Flow Statement</h3><p>Select a date range and click "Run Report"</p></div>
                )
              )}

              {/* ── P&L Comparison ───────────────────────────────────── */}
              {activeTab === 'pl_comparison' && (
                <div>
                  {/* Controls */}
                  <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Compare mode:</span>
                    {[['prior_period', 'Prior Period'], ['prior_year', 'Prior Year']].map(([val, label]) => (
                      <button key={val} onClick={() => { setPlCompMode(val); setPlCompData(null) }} style={{
                        padding: '6px 14px', fontSize: 13, borderRadius: 6, cursor: 'pointer',
                        fontWeight: plCompMode === val ? 600 : 400,
                        background: plCompMode === val ? '#eff6ff' : '#f9fafb',
                        color: plCompMode === val ? '#2563eb' : '#6b7280',
                        border: `1px solid ${plCompMode === val ? '#bfdbfe' : '#e5e7eb'}`,
                      }}>{label}</button>
                    ))}
                    <button className={styles.btnPrimary} onClick={handleRun} disabled={loading} style={{ marginLeft: 'auto' }}>
                      <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-play'}`}></i> Run
                    </button>
                  </div>

                  {plCompData ? (() => {
                    const { current: c, comparison: p, changes, period, compare_period } = plCompData
                    const pLabel = `${compare_period.start_date} — ${compare_period.end_date}`
                    const cLabel = `${period.start_date} — ${period.end_date}`
                    const fmtChg = (chg) => {
                      if (!chg) return { val: '—', pct: '—', color: '#374151' }
                      const color = chg.value > 0 ? '#15803d' : chg.value < 0 ? '#b91c1c' : '#64748b'
                      return { val: (chg.value >= 0 ? '+' : '') + fmt(chg.value), pct: chg.pct !== null ? `${chg.pct > 0 ? '+' : ''}${chg.pct}%` : '—', color }
                    }

                    const Row = ({ label, curr, comp, chg, bold, border }) => {
                      const fc = fmtChg(chg)
                      return (
                        <tr style={{ borderTop: border ? '2px solid #e2e8f0' : undefined, background: bold ? '#f8fafc' : undefined }}>
                          <td style={{ padding: '10px 16px', fontSize: bold ? 14 : 13, fontWeight: bold ? 700 : 400 }}>{label}</td>
                          <td style={{ padding: '10px 16px', fontFamily: 'monospace', textAlign: 'right', fontSize: 13 }}>{fmt(comp)}</td>
                          <td style={{ padding: '10px 16px', fontFamily: 'monospace', textAlign: 'right', fontSize: 13, fontWeight: bold ? 700 : 400 }}>{fmt(curr)}</td>
                          <td style={{ padding: '10px 16px', fontFamily: 'monospace', textAlign: 'right', fontSize: 13, color: fc.color }}>{fc.val}</td>
                          <td style={{ padding: '10px 16px', fontFamily: 'monospace', textAlign: 'right', fontSize: 12, color: fc.color }}>{fc.pct}</td>
                        </tr>
                      )
                    }

                    return (
                      <div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
                          <KpiCard label="Net Income (Current)" value={fmt(c.net_income)} color={c.net_income >= 0 ? '#15803d' : '#b91c1c'} bg={c.net_income >= 0 ? '#f0fdf4' : '#fef2f2'} border={c.net_income >= 0 ? '#bbf7d0' : '#fecaca'} icon="fa-chart-bar" />
                          <KpiCard label="Net Income (Prior)" value={fmt(p.net_income)} color="#6b7280" bg="#f9fafb" border="#e5e7eb" icon="fa-chart-bar" />
                          <KpiCard label="Net Income Change" value={fmtChg(changes?.net_income).val} color={changes?.net_income?.value >= 0 ? '#15803d' : '#b91c1c'} bg={changes?.net_income?.value >= 0 ? '#f0fdf4' : '#fef2f2'} border={changes?.net_income?.value >= 0 ? '#bbf7d0' : '#fecaca'} icon="fa-code-branch" />
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                          <thead style={{ background: '#f8fafc' }}>
                            <tr>
                              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 700 }}>Account / Line</th>
                              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#64748b' }}>{pLabel}</th>
                              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#2563eb' }}>{cLabel}</th>
                              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, fontWeight: 700 }}>$ Change</th>
                              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, fontWeight: 700 }}>% Change</th>
                            </tr>
                          </thead>
                          <tbody>
                            <Row label="Net Revenue"          curr={c.revenue.net_revenue}        comp={p.revenue.net_revenue}        chg={changes?.net_revenue}        bold />
                            <Row label="Cost of Goods Sold"   curr={c.cogs.total}                 comp={p.cogs.total}                 chg={changes?.cogs} />
                            <Row label="Gross Profit"         curr={c.gross_profit}               comp={p.gross_profit}               chg={changes?.gross_profit}       bold border />
                            <Row label="Operating Expenses"   curr={c.operating_expenses.total}   comp={p.operating_expenses.total}   chg={changes?.operating_expenses} />
                            <Row label="Operating Income"     curr={c.operating_income}           comp={p.operating_income}           chg={changes?.operating_income}   bold border />
                            <Row label="Other Income"         curr={c.other_income}               comp={p.other_income}               chg={null} />
                            <Row label="Other Expense"        curr={c.other_expense}              comp={p.other_expense}              chg={null} />
                            <Row label="Net Income"           curr={c.net_income}                 comp={p.net_income}                 chg={changes?.net_income}         bold border />
                          </tbody>
                        </table>
                      </div>
                    )
                  })() : (
                    <div className={styles.emptyState}><i className="fas fa-code-branch"></i><h3>P&L Comparison</h3><p>Select a date range, choose comparison mode, then click "Run"</p></div>
                  )}
                </div>
              )}

              {/* ── P&L by Department ────────────────────────────────── */}
              {activeTab === 'pl_by_dept' && (
                plDeptData ? (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
                      <KpiCard label="Total Revenue" value={fmt(plDeptData.total_revenue)} color="#15803d" bg="#f0fdf4" border="#bbf7d0" icon="fa-chart-line" />
                      <KpiCard label="Total Expenses" value={fmt(plDeptData.total_expenses)} color="#b91c1c" bg="#fef2f2" border="#fecaca" icon="fa-minus-circle" />
                      <KpiCard label="Net Income" value={fmt(plDeptData.net_income)} color={plDeptData.net_income >= 0 ? '#15803d' : '#b91c1c'} bg={plDeptData.net_income >= 0 ? '#f0fdf4' : '#fef2f2'} border={plDeptData.net_income >= 0 ? '#bbf7d0' : '#fecaca'} icon="fa-sitemap" />
                    </div>
                    {plDeptData.departments?.length > 0 ? (
                      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <thead style={{ background: '#f8fafc' }}>
                          <tr>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 700 }}>Department</th>
                            <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, fontWeight: 700 }}>Expenses</th>
                            <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, fontWeight: 700 }}>Bills</th>
                            <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, fontWeight: 700 }}>Total Spend</th>
                            <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, fontWeight: 700 }}>% of Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {plDeptData.departments.map((d, i) => (
                            <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#4f46e5', marginRight: 8 }}></span>
                                {d.dept_name}
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(d.expenses)}</td>
                              <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(d.bills)}</td>
                              <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>{fmt(d.total_expenses)}</td>
                              <td style={{ padding: '12px 16px', textAlign: 'right', color: '#64748b' }}>
                                {plDeptData.total_expenses > 0 ? `${((d.total_expenses / plDeptData.total_expenses) * 100).toFixed(1)}%` : '—'}
                              </td>
                            </tr>
                          ))}
                          <tr style={{ borderTop: '2px solid #e2e8f0', background: '#f8fafc', fontWeight: 700 }}>
                            <td style={{ padding: '12px 16px' }}>Total</td>
                            <td colSpan={2}></td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(plDeptData.total_expenses)}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>100%</td>
                          </tr>
                        </tbody>
                      </table>
                    ) : (
                      <div className={styles.emptyState}><i className="fas fa-sitemap"></i><h3>No department data</h3><p>Assign users to departments and record expenses to see department-level P&L</p></div>
                    )}
                  </div>
                ) : (
                  <div className={styles.emptyState}><i className="fas fa-sitemap"></i><h3>P&L by Department</h3><p>Select a date range and click "Run Report"</p></div>
                )
              )}

              {/* ── Budget vs Actual ─────────────────────────────────── */}
              {activeTab === 'pl_budget' && (
                <div>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Budget Period:</span>
                    <select
                      value={selectedBudgetPeriod}
                      onChange={e => { setSelectedBudgetPeriod(e.target.value); setBudgetData(null) }}
                      style={{ padding: '7px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, color: '#374151' }}
                    >
                      <option value="">— Auto (active budget) —</option>
                      {budgetPeriods.map(bp => <option key={bp.id} value={bp.id}>{bp.name} ({bp.fiscal_year})</option>)}
                    </select>
                    <button className={styles.btnPrimary} onClick={handleRun} disabled={loading} style={{ marginLeft: 'auto' }}>
                      <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-play'}`}></i> Run
                    </button>
                  </div>

                  {budgetData ? (
                    <div>
                      {!budgetData.has_budget && (
                        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#92400e', fontSize: 13 }}>
                          <i className="fas fa-info-circle" style={{ marginRight: 8 }}></i>
                          No budget data found. Create a budget period at <strong>Settings → Budgets</strong> and enter budget amounts per account to see variance analysis.
                        </div>
                      )}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
                        <KpiCard label="Budgeted Net Income" value={fmt(budgetData.summary?.budgeted_net)} color="#7c3aed" bg="#f5f3ff" border="#ddd6fe" icon="fa-tasks" />
                        <KpiCard label="Actual Net Income" value={fmt(budgetData.summary?.actual_net)} color={budgetData.summary?.actual_net >= 0 ? '#15803d' : '#b91c1c'} bg={budgetData.summary?.actual_net >= 0 ? '#f0fdf4' : '#fef2f2'} border={budgetData.summary?.actual_net >= 0 ? '#bbf7d0' : '#fecaca'} icon="fa-chart-bar" />
                        <KpiCard label="Net Variance" value={fmt(budgetData.summary?.net_variance)} color={budgetData.summary?.net_variance >= 0 ? '#15803d' : '#b91c1c'} bg={budgetData.summary?.net_variance >= 0 ? '#f0fdf4' : '#fef2f2'} border={budgetData.summary?.net_variance >= 0 ? '#bbf7d0' : '#fecaca'} icon="fa-balance-scale" />
                      </div>
                      {[['Revenue', budgetData.revenue_lines], ['Expenses', budgetData.expense_lines]].map(([section, lines]) => (
                        lines?.length > 0 && (
                          <div key={section} style={{ marginBottom: 24 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', color: section === 'Revenue' ? '#15803d' : '#b91c1c', marginBottom: 8, borderBottom: `2px solid ${section === 'Revenue' ? '#bbf7d0' : '#fecaca'}`, paddingBottom: 6 }}>{section}</div>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <thead><tr>
                                {['Account', 'Budget', 'Actual', '$ Variance', '% Variance'].map(h => (
                                  <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Account' ? 'left' : 'right', fontSize: 12, fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                                ))}
                              </tr></thead>
                              <tbody>
                                {lines.map((l, i) => {
                                  const isPos = l.variance >= 0
                                  return (
                                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                      <td style={{ padding: '9px 12px', fontSize: 13 }}>
                                        <span style={{ background: '#f1f5f9', borderRadius: 4, padding: '1px 5px', fontSize: 11, fontFamily: 'monospace', marginRight: 6 }}>{l.account_number}</span>
                                        {l.account_name}
                                      </td>
                                      <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: 'monospace', fontSize: 13 }}>{fmt(l.budgeted)}</td>
                                      <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: 'monospace', fontSize: 13, fontWeight: 600 }}>{fmt(l.actual)}</td>
                                      <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: 'monospace', fontSize: 13, color: isPos ? '#15803d' : '#b91c1c' }}>{l.variance >= 0 ? '+' : ''}{fmt(l.variance)}</td>
                                      <td style={{ padding: '9px 12px', textAlign: 'right', fontSize: 12, color: isPos ? '#15803d' : '#b91c1c' }}>{l.variance_pct !== null ? `${l.variance_pct > 0 ? '+' : ''}${l.variance_pct}%` : '—'}</td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        )
                      ))}
                    </div>
                  ) : (
                    <div className={styles.emptyState}><i className="fas fa-tasks"></i><h3>Budget vs Actual</h3><p>Select a date range and click "Run Report"</p></div>
                  )}
                </div>
              )}

              {/* ── Balance Sheet Comparison ──────────────────────────── */}
              {activeTab === 'bs_comparison' && (
                <div>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Date 1:</span>
                    <input type="date" value={bsCompDate1} onChange={e => { setBsCompDate1(e.target.value); setBsCompData(null) }} style={{ padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Date 2:</span>
                    <input type="date" value={bsCompDate2} onChange={e => { setBsCompDate2(e.target.value); setBsCompData(null) }} style={{ padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }} />
                    <button className={styles.btnPrimary} onClick={handleRun} disabled={loading} style={{ marginLeft: 'auto' }}>
                      <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-play'}`}></i> Run
                    </button>
                  </div>

                  {bsCompData ? (() => {
                    const { date1: bs1, date2: bs2, changes } = bsCompData
                    const mergeAccounts = (list1, list2) => {
                      const map = {}
                      for (const a of (list1 || [])) map[a.id] = { ...a, bal1: a.balance, bal2: 0 }
                      for (const a of (list2 || [])) {
                        if (map[a.id]) map[a.id].bal2 = a.balance
                        else map[a.id] = { ...a, bal1: 0, bal2: a.balance }
                      }
                      return Object.values(map).sort((a, b) => (a.account_number || '').localeCompare(b.account_number || ''))
                    }

                    const BSSection = ({ title, accounts, color = '#15803d' }) => (
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.6px', color, borderBottom: `2px solid ${color}`, paddingBottom: 5, marginBottom: 8 }}>{title}</div>
                        {accounts.map((a, i) => (
                          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 100px', gap: 8, padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                            <span>
                              <span style={{ background: '#f1f5f9', borderRadius: 3, padding: '1px 5px', fontSize: 11, fontFamily: 'monospace', marginRight: 6 }}>{a.account_number}</span>
                              {a.name}
                            </span>
                            <span style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(a.bal1)}</span>
                            <span style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{fmt(a.bal2)}</span>
                            <span style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 12, color: (a.bal2 - a.bal1) > 0 ? '#15803d' : (a.bal2 - a.bal1) < 0 ? '#b91c1c' : '#64748b' }}>
                              {(a.bal2 - a.bal1) >= 0 ? '+' : ''}{fmt(a.bal2 - a.bal1)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )

                    return (
                      <div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
                          <KpiCard label={`Assets (${bsCompDate2})`} value={fmt(bs2.assets.total)} color="#15803d" bg="#f0fdf4" border="#bbf7d0" icon="fa-university" />
                          <KpiCard label="Asset Change" value={(changes.total_assets.value >= 0 ? '+' : '') + fmt(changes.total_assets.value)} color={changes.total_assets.value >= 0 ? '#15803d' : '#b91c1c'} bg={changes.total_assets.value >= 0 ? '#f0fdf4' : '#fef2f2'} border={changes.total_assets.value >= 0 ? '#bbf7d0' : '#fecaca'} icon="fa-arrow-right" />
                          <KpiCard label={`Equity (${bsCompDate2})`} value={fmt(bs2.equity.total)} color="#7c3aed" bg="#f5f3ff" border="#ddd6fe" icon="fa-chart-pie" />
                        </div>
                        <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 100px', gap: 8, padding: '10px 16px', background: '#f8fafc', fontWeight: 700, fontSize: 12, color: '#64748b' }}>
                            <span>Account</span>
                            <span style={{ textAlign: 'right' }}>{bsCompDate1}</span>
                            <span style={{ textAlign: 'right', color: '#2563eb' }}>{bsCompDate2}</span>
                            <span style={{ textAlign: 'right' }}>Change</span>
                          </div>
                          <div style={{ padding: '12px 16px' }}>
                            <BSSection title="Current Assets"      accounts={mergeAccounts(bs1.assets.current, bs2.assets.current)} color="#15803d" />
                            <BSSection title="Fixed Assets"        accounts={mergeAccounts(bs1.assets.fixed, bs2.assets.fixed)} color="#0369a1" />
                            <BSSection title="Current Liabilities" accounts={mergeAccounts(bs1.liabilities.current, bs2.liabilities.current)} color="#b91c1c" />
                            <BSSection title="Long-Term Liabilities" accounts={mergeAccounts(bs1.liabilities.long_term, bs2.liabilities.long_term)} color="#9a3412" />
                            <BSSection title="Equity"              accounts={mergeAccounts(bs1.equity.accounts, bs2.equity.accounts)} color="#7c3aed" />
                          </div>
                        </div>
                      </div>
                    )
                  })() : (
                    <div className={styles.emptyState}><i className="fas fa-columns"></i><h3>Balance Sheet Comparison</h3><p>Pick two dates and click "Run"</p></div>
                  )}
                </div>
              )}

              {/* ── Statement of Changes in Equity ───────────────────── */}
              {activeTab === 'equity_changes' && (
                equityData ? (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
                      <KpiCard label="Opening Equity" value={fmt(equityData.totals?.opening_balance)} color="#7c3aed" bg="#f5f3ff" border="#ddd6fe" icon="fa-door-open" />
                      <KpiCard label="Period Net Income" value={fmt(equityData.period_net_income)} color={equityData.period_net_income >= 0 ? '#15803d' : '#b91c1c'} bg={equityData.period_net_income >= 0 ? '#f0fdf4' : '#fef2f2'} border={equityData.period_net_income >= 0 ? '#bbf7d0' : '#fecaca'} icon="fa-chart-bar" />
                      <KpiCard label="Closing Equity" value={fmt(equityData.totals?.closing_balance)} color="#7c3aed" bg="#f5f3ff" border="#ddd6fe" icon="fa-door-closed" />
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                      <thead style={{ background: '#f8fafc' }}>
                        <tr>
                          {['Account', 'Opening Balance', 'Net Income', 'Other Movements', 'Closing Balance'].map(h => (
                            <th key={h} style={{ padding: '12px 16px', textAlign: h === 'Account' ? 'left' : 'right', fontSize: 12, fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {equityData.accounts?.map((a, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '11px 16px', fontSize: 13 }}>
                              <span style={{ background: '#f1f5f9', borderRadius: 4, padding: '1px 5px', fontSize: 11, fontFamily: 'monospace', marginRight: 6 }}>{a.account_number}</span>
                              {a.name}
                            </td>
                            <td style={{ padding: '11px 16px', textAlign: 'right', fontFamily: 'monospace', fontSize: 13 }}>{fmt(a.opening_balance)}</td>
                            <td style={{ padding: '11px 16px', textAlign: 'right', fontFamily: 'monospace', fontSize: 13, color: a.net_income_allocated !== 0 ? '#15803d' : '#64748b' }}>{a.net_income_allocated !== 0 ? fmt(a.net_income_allocated) : '—'}</td>
                            <td style={{ padding: '11px 16px', textAlign: 'right', fontFamily: 'monospace', fontSize: 13, color: a.other_movements !== 0 ? '#374151' : '#64748b' }}>{a.other_movements !== 0 ? fmt(a.other_movements) : '—'}</td>
                            <td style={{ padding: '11px 16px', textAlign: 'right', fontFamily: 'monospace', fontSize: 13, fontWeight: 700 }}>{fmt(a.closing_balance)}</td>
                          </tr>
                        ))}
                        <tr style={{ borderTop: '2px solid #e2e8f0', background: '#f8fafc', fontWeight: 700 }}>
                          <td style={{ padding: '12px 16px' }}>Total Equity</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(equityData.totals?.opening_balance)}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', color: '#15803d' }}>{fmt(equityData.period_net_income)}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(equityData.totals?.net_change - equityData.period_net_income)}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', color: '#7c3aed' }}>{fmt(equityData.totals?.closing_balance)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className={styles.emptyState}><i className="fas fa-chart-pie"></i><h3>Statement of Changes in Equity</h3><p>Select a date range and click "Run Report"</p></div>
                )
              )}

              {/* ── Cash Flow Forecast ────────────────────────────────── */}
              {activeTab === 'cf_forecast' && (
                forecastData ? (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
                      <KpiCard label="Current Cash Balance" value={fmt(forecastData.current_cash)} color="#15803d" bg="#f0fdf4" border="#bbf7d0" icon="fa-wallet" />
                      <KpiCard label="13-Week Inflows" value={fmt(forecastData.summary?.total_inflows)} color="#1d4ed8" bg="#eff6ff" border="#bfdbfe" icon="fa-arrow-down" />
                      <KpiCard label="Projected Closing Cash" value={fmt(forecastData.summary?.closing_cash)} color={forecastData.summary?.closing_cash >= 0 ? '#7c3aed' : '#b91c1c'} bg={forecastData.summary?.closing_cash >= 0 ? '#f5f3ff' : '#fef2f2'} border={forecastData.summary?.closing_cash >= 0 ? '#ddd6fe' : '#fecaca'} icon="fa-calendar-alt" />
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                      <thead style={{ background: '#f8fafc' }}>
                        <tr>
                          {['Week', 'Period', 'Expected Inflows', 'Expected Outflows', 'Net Flow', 'Running Balance'].map(h => (
                            <th key={h} style={{ padding: '11px 14px', textAlign: h === 'Week' || h === 'Period' ? 'left' : 'right', fontSize: 12, fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {forecastData.weeks?.map((w, i) => {
                          const isNeg = w.running_balance < 0
                          return (
                            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: isNeg ? '#fef2f2' : undefined }}>
                              <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600 }}>Wk {w.week_number}</td>
                              <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748b' }}>{w.week_start} – {w.week_end}</td>
                              <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', fontSize: 13, color: '#15803d' }}>{w.expected_inflows > 0 ? fmt(w.expected_inflows) : '—'}</td>
                              <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', fontSize: 13, color: w.expected_outflows > 0 ? '#b91c1c' : '#64748b' }}>{w.expected_outflows > 0 ? fmt(w.expected_outflows) : '—'}</td>
                              <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', fontSize: 13, color: w.net_flow >= 0 ? '#15803d' : '#b91c1c', fontWeight: 600 }}>
                                {w.net_flow >= 0 ? '+' : ''}{fmt(w.net_flow)}
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: isNeg ? '#b91c1c' : '#1e293b' }}>
                                {fmt(w.running_balance)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop: '2px solid #e2e8f0', background: '#f8fafc', fontWeight: 700 }}>
                          <td colSpan={2} style={{ padding: '12px 14px' }}>13-Week Total</td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace', color: '#15803d' }}>{fmt(forecastData.summary?.total_inflows)}</td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace', color: '#b91c1c' }}>{fmt(forecastData.summary?.total_outflows)}</td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(forecastData.summary?.total_inflows - forecastData.summary?.total_outflows)}</td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace', color: '#7c3aed' }}>{fmt(forecastData.summary?.closing_cash)}</td>
                        </tr>
                      </tfoot>
                    </table>
                    <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 12 }}>
                      * Inflows = open invoice balances due each week. Outflows = open bill balances due each week. Actuals will differ based on payment timing.
                    </p>
                  </div>
                ) : (
                  <div className={styles.emptyState}><i className="fas fa-calendar-alt"></i><h3>Cash Flow Forecast</h3><p>Click "Run Report" to generate 13-week forward cash projection</p></div>
                )
              )}

            </>
            )}
          </div>{/* end content panel */}
        </div>{/* end body flex row */}

      </div>
    </div>
  )
}
