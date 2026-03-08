'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import styles from './Dashboard.module.css'
import * as api from '@/lib/api'

const AGING_COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#06B6D4', '#F59E0B']
const EXPENSE_COLORS = ['#1E3A8A', '#3B82F6', '#8B5CF6', '#06B6D4', '#F59E0B', '#10B981', '#EF4444']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function Dashboard({ currencySymbol = '$' }) {
  const [loading, setLoading] = useState(true)
  const [dashData, setDashData] = useState(null)
  const [plData, setPlData] = useState(null)
  const [expData, setExpData] = useState(null)
  const [arData, setArData] = useState([])
  const [apData, setApData] = useState([])
  const [bankData, setBankData] = useState(null)
  const [invoices, setInvoices] = useState([])

  useEffect(() => {
    const load = async () => {
      const now = new Date()
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      const today = now.toISOString().split('T')[0]

      const [dash, pl, exp, ar, ap, bank, invRes] = await Promise.allSettled([
        api.getReportsDashboard(),
        api.getProfitLossReport(monthStart, today),
        api.getExpenseSummaryReport(monthStart, today),
        api.getReceivablesAgingReport(),
        api.getPayablesAgingReport(),
        api.getBankSummary(),
        api.getInvoices(),
      ])

      if (dash.status === 'fulfilled') setDashData(dash.value?.data || null)
      if (pl.status === 'fulfilled') setPlData(pl.value?.data || null)
      if (exp.status === 'fulfilled') setExpData(exp.value?.data || null)
      if (ar.status === 'fulfilled') setArData(Array.isArray(ar.value?.data) ? ar.value.data : [])
      if (ap.status === 'fulfilled') setApData(Array.isArray(ap.value?.data) ? ap.value.data : [])
      if (bank.status === 'fulfilled') setBankData(bank.value?.data || null)
      if (invRes.status === 'fulfilled') setInvoices(invRes.value?.data?.invoices || [])

      setLoading(false)
    }
    load()
  }, [])

  const fmt = (n) =>
    currencySymbol + (parseFloat(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const fmtShort = (n) => {
    const v = parseFloat(n) || 0
    if (v >= 1_000_000) return currencySymbol + (v / 1_000_000).toFixed(1) + 'M'
    if (v >= 1_000) return currencySymbol + (v / 1_000).toFixed(1) + 'K'
    return fmt(v)
  }

  // ── Profit & Loss ──────────────────────────────────────────────────────────
  const income = parseFloat(plData?.revenue?.total || 0)
  const totalExpenses = parseFloat(plData?.expenses?.combined || 0)
  const netProfit = parseFloat(plData?.net_profit || 0)
  const maxBar = Math.max(income, totalExpenses, 1)
  const now = new Date()
  const monthLabel = now.toLocaleString('default', { month: 'long' })

  // ── Expenses donut ─────────────────────────────────────────────────────────
  const expTotal = parseFloat(expData?.expenses?.total_amount || 0)
  const expByCategory = (expData?.expenses_by_category || []).slice(0, 7).map((cat, i) => ({
    name: cat.expense_category || 'Other',
    value: parseFloat(cat.total || 0),
    color: EXPENSE_COLORS[i % EXPENSE_COLORS.length],
  })).filter(c => c.value > 0)

  // ── Invoice stats ──────────────────────────────────────────────────────────
  const unpaidTotal = invoices
    .filter(i => i.payment_status !== 'paid')
    .reduce((s, i) => s + parseFloat(i.amount_due || 0), 0)
  const overdueTotal = invoices
    .filter(i => i.payment_status !== 'paid' && i.due_date && new Date(i.due_date) < now)
    .reduce((s, i) => s + parseFloat(i.amount_due || 0), 0)
  const paidLast30 = invoices
    .filter(i => {
      if (i.payment_status !== 'paid') return false
      const d = new Date(i.invoice_date)
      return (now - d) / (1000 * 60 * 60 * 24) <= 30
    })
    .reduce((s, i) => s + parseFloat(i.grand_total || 0), 0)
  const overduePercent = unpaidTotal > 0 ? Math.min(100, Math.round((overdueTotal / unpaidTotal) * 100)) : 0

  // ── Sales line chart (current year, by month) ──────────────────────────────
  const salesByMonth = Array.from({ length: 12 }, (_, i) => ({ month: MONTH_NAMES[i], amount: 0 }))
  invoices.forEach(inv => {
    if (!inv.invoice_date) return
    const d = new Date(inv.invoice_date)
    if (d.getFullYear() !== now.getFullYear()) return
    salesByMonth[d.getMonth()].amount += parseFloat(inv.grand_total || 0)
  })
  const salesChartData = salesByMonth.slice(0, now.getMonth() + 1)
  const totalYearSales = salesChartData.reduce((s, m) => s + m.amount, 0)

  // ── AR aging pie ───────────────────────────────────────────────────────────
  const sumAging = (data, key) => data.reduce((s, r) => s + parseFloat(r[key] || 0), 0)
  const arTotal = parseFloat(dashData?.total_receivables || 0)
  const arPieData = [
    { name: 'Current', value: sumAging(arData, 'current_due'), color: AGING_COLORS[0] },
    { name: '1-30 days', value: sumAging(arData, 'overdue_1_30'), color: AGING_COLORS[1] },
    { name: '31-60 days', value: sumAging(arData, 'overdue_31_60'), color: AGING_COLORS[2] },
    { name: '61-90 days', value: sumAging(arData, 'overdue_61_90'), color: AGING_COLORS[3] },
    { name: '91+ days', value: sumAging(arData, 'overdue_90_plus'), color: AGING_COLORS[4] },
  ].filter(d => d.value > 0)

  // ── AP aging pie ───────────────────────────────────────────────────────────
  const apTotal = parseFloat(dashData?.total_payables || 0)
  const apPieData = [
    { name: 'Current', value: sumAging(apData, 'current_due'), color: AGING_COLORS[0] },
    { name: '1-30 days', value: sumAging(apData, 'overdue_1_30'), color: AGING_COLORS[1] },
    { name: '31-60 days', value: sumAging(apData, 'overdue_31_60'), color: AGING_COLORS[2] },
    { name: '61-90 days', value: sumAging(apData, 'overdue_61_90'), color: AGING_COLORS[3] },
    { name: '91+ days', value: sumAging(apData, 'overdue_90_plus'), color: AGING_COLORS[4] },
  ].filter(d => d.value > 0)

  // ── Bank accounts ──────────────────────────────────────────────────────────
  const totalBankBalance = parseFloat(bankData?.total_balance || 0)
  const bankAccounts = bankData?.accounts || []

  if (loading) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.dashboardHeader}><h2>Business at a glance</h2></div>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px', color: '#64748b' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: 28 }}></i>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.dashboardHeader}>
        <h2>Business at a glance</h2>
      </div>

      <div className={styles.dashboardGrid}>

        {/* ── Profit & Loss ── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h3>PROFIT & LOSS</h3>
              <p className={styles.cardSubtitle}>Net profit for {monthLabel}</p>
            </div>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.mainStat}>
              <span className={styles.amount} style={{ color: netProfit >= 0 ? '#10B981' : '#EF4444' }}>
                {netProfit < 0 ? '-' : ''}{fmt(Math.abs(netProfit))}
              </span>
            </div>
            {income > 0 || totalExpenses > 0 ? (
              <div className={styles.barChart}>
                <div className={styles.barItem}>
                  <span className={styles.barLabel}>{fmtShort(income)}</span>
                  <div className={styles.barWrapper}>
                    <div className={styles.barIncome} style={{ width: `${(income / maxBar) * 100}%` }}></div>
                  </div>
                  <span className={styles.barCategory}>Income</span>
                </div>
                <div className={styles.barItem}>
                  <span className={styles.barLabel}>{fmtShort(totalExpenses)}</span>
                  <div className={styles.barWrapper}>
                    <div className={styles.barExpense} style={{ width: `${(totalExpenses / maxBar) * 100}%` }}></div>
                  </div>
                  <span className={styles.barCategory}>Expenses</span>
                </div>
              </div>
            ) : (
              <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 12 }}>No data for this month</p>
            )}
          </div>
        </div>

        {/* ── Expenses ── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h3>EXPENSES</h3>
              <p className={styles.cardSubtitle}>Spending this month</p>
            </div>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.mainStat}>
              <span className={styles.amount}>{fmt(expTotal)}</span>
            </div>
            {expByCategory.length > 0 ? (
              <div className={styles.donutChart}>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={expByCategory} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                      {expByCategory.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className={styles.legend}>
                  {expByCategory.map((item, i) => (
                    <div key={i} className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ backgroundColor: item.color }}></span>
                      <span className={styles.legendText}>{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 12 }}>No expenses this month</p>
            )}
          </div>
        </div>

        {/* ── Invoices ── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>INVOICES</h3>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.invoiceSection}>
              <div className={styles.invoiceHeader}>
                <span>{fmt(unpaidTotal)} Unpaid</span>
                <span>{invoices.filter(i => i.payment_status !== 'paid').length} invoices</span>
              </div>
              <div className={styles.invoiceAmount}>{fmt(overdueTotal)}</div>
              <div className={styles.invoiceLabel}>Overdue</div>
              <div className={styles.progressBar}>
                <div className={styles.progressOverdue} style={{ width: `${overduePercent}%` }}></div>
              </div>
            </div>
            <div className={styles.invoiceSection}>
              <div className={styles.invoiceHeader}>
                <span>{fmt(paidLast30)} Paid</span>
                <span>Last 30 days</span>
              </div>
              <div className={styles.invoiceAmount}>{dashData?.overdue_invoices ?? 0}</div>
              <div className={styles.invoiceLabel}>Overdue invoices (count)</div>
              <div className={styles.progressBar}>
                <div className={styles.progressPaid} style={{ width: paidLast30 > 0 ? '100%' : '0%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bank Accounts ── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h3>BANK ACCOUNTS</h3>
              <p className={styles.cardSubtitle}>Current balance</p>
            </div>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.mainStat}>
              <span className={styles.amount}>{fmt(totalBankBalance)}</span>
            </div>
            {bankAccounts.length > 0 ? (
              <div className={styles.accountsList}>
                {bankAccounts.slice(0, 4).map(account => (
                  <div key={account.id} className={styles.accountItem}>
                    <div className={styles.accountInfo}>
                      <i className="fas fa-university" style={{ color: '#3B82F6' }}></i>
                      <div>
                        <div className={styles.accountName}>{account.account_name}</div>
                        <div className={styles.accountBank}>{account.bank_name || account.account_type}</div>
                      </div>
                    </div>
                    <div className={styles.accountBalance}>{fmt(account.current_balance)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 12 }}>No bank accounts connected</p>
            )}
          </div>
        </div>

        {/* ── Sales ── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h3>SALES</h3>
              <p className={styles.cardSubtitle}>Year to date ({now.getFullYear()})</p>
            </div>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.mainStat}>
              <span className={styles.amount}>{fmt(totalYearSales)}</span>
            </div>
            <div className={styles.lineChart}>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={salesChartData}>
                  <XAxis dataKey="month" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} tickFormatter={v => fmtShort(v)} />
                  <Tooltip formatter={(v) => [fmt(v), 'Sales']} />
                  <Line type="monotone" dataKey="amount" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── Accounts Receivable ── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h3>ACCOUNTS RECEIVABLE</h3>
              <p className={styles.cardSubtitle}>Outstanding balance</p>
            </div>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.mainStat}>
              <span className={styles.amount}>{fmt(arTotal)}</span>
            </div>
            {arPieData.length > 0 ? (
              <div className={styles.donutChart}>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={arPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                      {arPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className={styles.legend}>
                  {arPieData.map((item, i) => (
                    <div key={i} className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ backgroundColor: item.color }}></span>
                      <span className={styles.legendText}>{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 12 }}>No outstanding receivables</p>
            )}
          </div>
        </div>

        {/* ── Accounts Payable ── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h3>ACCOUNTS PAYABLE</h3>
              <p className={styles.cardSubtitle}>Outstanding balance</p>
            </div>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.mainStat}>
              <span className={styles.amount}>{fmt(apTotal)}</span>
            </div>
            {apPieData.length > 0 ? (
              <div className={styles.donutChart}>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={apPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                      {apPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className={styles.legend}>
                  {apPieData.map((item, i) => (
                    <div key={i} className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ backgroundColor: item.color }}></span>
                      <span className={styles.legendText}>{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 12 }}>No outstanding payables</p>
            )}
          </div>
        </div>

        {/* ── Quick Stats ── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h3>THIS MONTH</h3>
              <p className={styles.cardSubtitle}>Activity summary</p>
            </div>
          </div>
          <div className={styles.cardBody}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>
                  <i className="fas fa-file-invoice" style={{ marginRight: 8, color: '#3B82F6' }}></i>Invoices issued
                </span>
                <strong style={{ fontSize: 14 }}>{dashData?.invoice_count ?? 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>
                  <i className="fas fa-dollar-sign" style={{ marginRight: 8, color: '#10B981' }}></i>Month sales
                </span>
                <strong style={{ fontSize: 14 }}>{fmt(dashData?.month_sales)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>
                  <i className="fas fa-receipt" style={{ marginRight: 8, color: '#8B5CF6' }}></i>Month expenses
                </span>
                <strong style={{ fontSize: 14 }}>{fmt(dashData?.month_expenses)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>
                  <i className="fas fa-exclamation-circle" style={{ marginRight: 8, color: '#EF4444' }}></i>Overdue invoices
                </span>
                <strong style={{ fontSize: 14, color: (dashData?.overdue_invoices ?? 0) > 0 ? '#EF4444' : 'inherit' }}>
                  {dashData?.overdue_invoices ?? 0}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>
                  <i className="fas fa-exclamation-triangle" style={{ marginRight: 8, color: '#F59E0B' }}></i>Overdue bills
                </span>
                <strong style={{ fontSize: 14, color: (dashData?.overdue_bills ?? 0) > 0 ? '#F59E0B' : 'inherit' }}>
                  {dashData?.overdue_bills ?? 0}
                </strong>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
