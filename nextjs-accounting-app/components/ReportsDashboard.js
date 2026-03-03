'use client'

import { useState, useCallback } from 'react'
import styles from './Invoice.module.css'
import * as api from '../lib/api'

export default function ReportsDashboard({ isOpen, onClose }) {
  // ─── State ────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('pl')
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ─── Report data ──────────────────────────────────────────────────────────
  const [plData, setPlData] = useState(null)
  const [salesData, setSalesData] = useState(null)
  const [expenseData, setExpenseData] = useState(null)
  const [receivablesData, setReceivablesData] = useState(null)
  const [payablesData, setPayablesData] = useState(null)
  const [agingView, setAgingView] = useState('receivables')

  // ─── Load reports ─────────────────────────────────────────────────────────
  const loadReport = useCallback(async (tab) => {
    setLoading(true)
    setError('')
    try {
      switch (tab) {
        case 'pl': {
          const res = await api.getProfitLossReport(startDate, endDate)
          setPlData(res.data || res)
          break
        }
        case 'sales': {
          const res = await api.getSalesSummaryReport(startDate, endDate)
          setSalesData(res.data || res)
          break
        }
        case 'expenses': {
          const res = await api.getExpenseSummaryReport(startDate, endDate)
          setExpenseData(res.data || res)
          break
        }
        case 'aging': {
          const [recRes, payRes] = await Promise.all([
            api.getReceivablesAgingReport(),
            api.getPayablesAgingReport(),
          ])
          setReceivablesData(recRes.data || recRes)
          setPayablesData(payRes.data || payRes)
          break
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    loadReport(tab)
  }

  const handleRunReport = () => {
    loadReport(activeTab)
  }

  if (!isOpen) return null

  const formatCurrency = (amt) => '$' + (parseFloat(amt) || 0).toFixed(2)

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className={styles.invoiceListOverlay}>
      <div className={styles.invoiceListContainer}>

        {/* Header */}
        <div className={styles.listHeader}>
          <div className={styles.listHeaderLeft}>
            <h2>Reports</h2>
          </div>
          <div className={styles.listHeaderRight}>
            <button className={styles.closeBtn} onClick={onClose}>
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        {/* Date Range + Run */}
        <div className={styles.searchSection} style={{ flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>From:</label>
            <input
              type="date"
              className={styles.searchInput}
              style={{ width: '160px' }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>To:</label>
            <input
              type="date"
              className={styles.searchInput}
              style={{ width: '160px' }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <button className={styles.btnNewInvoice} onClick={handleRunReport}>
            <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-play'}`}></i> Run Report
          </button>
        </div>

        {/* Tab Buttons */}
        <div style={{ display: 'flex', gap: '4px', padding: '0 20px 10px', borderBottom: '1px solid #e5e7eb' }}>
          {[
            { id: 'pl', label: 'P&L' },
            { id: 'sales', label: 'Sales Summary' },
            { id: 'expenses', label: 'Expenses' },
            { id: 'aging', label: 'Aging' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: activeTab === tab.id ? 600 : 400,
                color: activeTab === tab.id ? '#2563eb' : '#6b7280',
                background: activeTab === tab.id ? '#eff6ff' : 'transparent',
                border: '1px solid',
                borderColor: activeTab === tab.id ? '#bfdbfe' : 'transparent',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className={styles.errorBanner}>
            <i className="fas fa-exclamation-circle"></i> {error}
          </div>
        )}

        {/* Report Content */}
        <div className={styles.invoiceGridContainer} style={{ padding: '20px' }}>
          {loading ? (
            <div className={styles.loadingState}>
              <i className="fas fa-spinner fa-spin"></i>
              <p>Loading report...</p>
            </div>
          ) : (
            <>
              {/* ── P&L Tab ─────────────────────────────────────────────── */}
              {activeTab === 'pl' && (
                plData ? (
                  <div>
                    {/* Summary Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '16px' }}>
                        <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 500, textTransform: 'uppercase' }}>Total Revenue</div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#15803d', marginTop: '4px' }}>{formatCurrency(plData.total_revenue)}</div>
                      </div>
                      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '16px' }}>
                        <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: 500, textTransform: 'uppercase' }}>Total Expenses</div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#b91c1c', marginTop: '4px' }}>{formatCurrency(plData.total_expenses)}</div>
                      </div>
                      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '16px' }}>
                        <div style={{ fontSize: '12px', color: '#2563eb', fontWeight: 500, textTransform: 'uppercase' }}>Net Profit</div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: parseFloat(plData.net_profit) >= 0 ? '#15803d' : '#b91c1c', marginTop: '4px' }}>{formatCurrency(plData.net_profit)}</div>
                      </div>
                    </div>

                    {/* Revenue Breakdown */}
                    {plData.revenue_breakdown && plData.revenue_breakdown.length > 0 && (
                      <div style={{ marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '10px' }}>Revenue Breakdown</h3>
                        <table className={styles.invoiceTable}>
                          <thead>
                            <tr>
                              <th>Category</th>
                              <th>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {plData.revenue_breakdown.map((item, idx) => (
                              <tr key={idx}>
                                <td>{item.category || item.name || '-'}</td>
                                <td>{formatCurrency(item.amount || item.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Expense Breakdown */}
                    {plData.expense_breakdown && plData.expense_breakdown.length > 0 && (
                      <div>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '10px' }}>Expense Breakdown</h3>
                        <table className={styles.invoiceTable}>
                          <thead>
                            <tr>
                              <th>Category</th>
                              <th>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {plData.expense_breakdown.map((item, idx) => (
                              <tr key={idx}>
                                <td>{item.category || item.name || '-'}</td>
                                <td>{formatCurrency(item.amount || item.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    <i className="fas fa-chart-bar"></i>
                    <h3>Profit & Loss Report</h3>
                    <p>Select a date range and click "Run Report" to generate</p>
                  </div>
                )
              )}

              {/* ── Sales Summary Tab ───────────────────────────────────── */}
              {activeTab === 'sales' && (
                salesData ? (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '16px' }}>
                        <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 500, textTransform: 'uppercase' }}>Total Sales</div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: '#15803d', marginTop: '4px' }}>{formatCurrency(salesData.total_sales)}</div>
                      </div>
                      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '16px' }}>
                        <div style={{ fontSize: '12px', color: '#2563eb', fontWeight: 500, textTransform: 'uppercase' }}>Total Invoices</div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: '#1d4ed8', marginTop: '4px' }}>{salesData.total_invoices || 0}</div>
                      </div>
                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '16px' }}>
                        <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 500, textTransform: 'uppercase' }}>Paid Amount</div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: '#15803d', marginTop: '4px' }}>{formatCurrency(salesData.paid_amount)}</div>
                      </div>
                      <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '16px' }}>
                        <div style={{ fontSize: '12px', color: '#d97706', fontWeight: 500, textTransform: 'uppercase' }}>Outstanding</div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: '#b45309', marginTop: '4px' }}>{formatCurrency(salesData.outstanding_amount)}</div>
                      </div>
                    </div>

                    {salesData.by_customer && salesData.by_customer.length > 0 && (
                      <div>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '10px' }}>By Customer</h3>
                        <table className={styles.invoiceTable}>
                          <thead>
                            <tr>
                              <th>Customer</th>
                              <th>Invoices</th>
                              <th>Total</th>
                              <th>Paid</th>
                              <th>Outstanding</th>
                            </tr>
                          </thead>
                          <tbody>
                            {salesData.by_customer.map((item, idx) => (
                              <tr key={idx}>
                                <td>{item.customer_name || '-'}</td>
                                <td>{item.invoice_count || item.total_invoices || 0}</td>
                                <td>{formatCurrency(item.total_sales || item.total)}</td>
                                <td>{formatCurrency(item.paid_amount || item.paid)}</td>
                                <td style={{ color: '#ef4444', fontWeight: 500 }}>{formatCurrency(item.outstanding_amount || item.outstanding)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    <i className="fas fa-chart-line"></i>
                    <h3>Sales Summary Report</h3>
                    <p>Select a date range and click "Run Report" to generate</p>
                  </div>
                )
              )}

              {/* ── Expenses Tab ────────────────────────────────────────── */}
              {activeTab === 'expenses' && (
                expenseData ? (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '24px', maxWidth: '300px' }}>
                      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '16px' }}>
                        <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: 500, textTransform: 'uppercase' }}>Total Expenses</div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#b91c1c', marginTop: '4px' }}>{formatCurrency(expenseData.total_expenses)}</div>
                      </div>
                    </div>

                    {expenseData.by_category && expenseData.by_category.length > 0 && (
                      <div>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '10px' }}>By Category</h3>
                        <table className={styles.invoiceTable}>
                          <thead>
                            <tr>
                              <th>Category</th>
                              <th>Count</th>
                              <th>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {expenseData.by_category.map((item, idx) => (
                              <tr key={idx}>
                                <td>{item.category || '-'}</td>
                                <td>{item.count || item.expense_count || 0}</td>
                                <td>{formatCurrency(item.total || item.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    <i className="fas fa-receipt"></i>
                    <h3>Expense Summary Report</h3>
                    <p>Select a date range and click "Run Report" to generate</p>
                  </div>
                )
              )}

              {/* ── Aging Tab ───────────────────────────────────────────── */}
              {activeTab === 'aging' && (
                <div>
                  {/* Toggle between Receivables and Payables */}
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
                    <button
                      onClick={() => setAgingView('receivables')}
                      style={{
                        padding: '6px 14px',
                        fontSize: '13px',
                        fontWeight: agingView === 'receivables' ? 600 : 400,
                        color: agingView === 'receivables' ? '#2563eb' : '#6b7280',
                        background: agingView === 'receivables' ? '#eff6ff' : '#f9fafb',
                        border: '1px solid',
                        borderColor: agingView === 'receivables' ? '#bfdbfe' : '#e5e7eb',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      Receivables
                    </button>
                    <button
                      onClick={() => setAgingView('payables')}
                      style={{
                        padding: '6px 14px',
                        fontSize: '13px',
                        fontWeight: agingView === 'payables' ? 600 : 400,
                        color: agingView === 'payables' ? '#2563eb' : '#6b7280',
                        background: agingView === 'payables' ? '#eff6ff' : '#f9fafb',
                        border: '1px solid',
                        borderColor: agingView === 'payables' ? '#bfdbfe' : '#e5e7eb',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      Payables
                    </button>
                  </div>

                  {agingView === 'receivables' && (
                    receivablesData && receivablesData.aging && receivablesData.aging.length > 0 ? (
                      <table className={styles.invoiceTable}>
                        <thead>
                          <tr>
                            <th>Customer</th>
                            <th>Current</th>
                            <th>1-30 Days</th>
                            <th>31-60 Days</th>
                            <th>61-90 Days</th>
                            <th>Over 90</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {receivablesData.aging.map((item, idx) => (
                            <tr key={idx}>
                              <td>{item.customer_name || '-'}</td>
                              <td>{formatCurrency(item.current)}</td>
                              <td>{formatCurrency(item.days_1_30)}</td>
                              <td>{formatCurrency(item.days_31_60)}</td>
                              <td>{formatCurrency(item.days_61_90)}</td>
                              <td style={{ color: parseFloat(item.over_90) > 0 ? '#ef4444' : 'inherit', fontWeight: parseFloat(item.over_90) > 0 ? 600 : 400 }}>{formatCurrency(item.over_90)}</td>
                              <td style={{ fontWeight: 600 }}>{formatCurrency(item.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className={styles.emptyState}>
                        <i className="fas fa-file-invoice"></i>
                        <h3>Receivables Aging</h3>
                        <p>{receivablesData ? 'No outstanding receivables' : 'Click "Run Report" to generate'}</p>
                      </div>
                    )
                  )}

                  {agingView === 'payables' && (
                    payablesData && payablesData.aging && payablesData.aging.length > 0 ? (
                      <table className={styles.invoiceTable}>
                        <thead>
                          <tr>
                            <th>Vendor</th>
                            <th>Current</th>
                            <th>1-30 Days</th>
                            <th>31-60 Days</th>
                            <th>61-90 Days</th>
                            <th>Over 90</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payablesData.aging.map((item, idx) => (
                            <tr key={idx}>
                              <td>{item.vendor_name || '-'}</td>
                              <td>{formatCurrency(item.current)}</td>
                              <td>{formatCurrency(item.days_1_30)}</td>
                              <td>{formatCurrency(item.days_31_60)}</td>
                              <td>{formatCurrency(item.days_61_90)}</td>
                              <td style={{ color: parseFloat(item.over_90) > 0 ? '#ef4444' : 'inherit', fontWeight: parseFloat(item.over_90) > 0 ? 600 : 400 }}>{formatCurrency(item.over_90)}</td>
                              <td style={{ fontWeight: 600 }}>{formatCurrency(item.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className={styles.emptyState}>
                        <i className="fas fa-file-invoice-dollar"></i>
                        <h3>Payables Aging</h3>
                        <p>{payablesData ? 'No outstanding payables' : 'Click "Run Report" to generate'}</p>
                      </div>
                    )
                  )}
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  )
}
