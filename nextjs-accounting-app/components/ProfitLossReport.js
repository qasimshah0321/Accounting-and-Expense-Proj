'use client'

/**
 * Profit & Loss (Income Statement)
 *
 * Renders a full sectioned P&L statement:
 *   REVENUE
 *     Sales Revenue
 *     Service Revenue
 *     Other Revenue
 *     Less: Discounts
 *     ─ Net Revenue ─
 *   COST OF GOODS SOLD
 *     COGS from inventory bills
 *     Direct COGS expenses
 *     ─ Total COGS ─
 *   GROSS PROFIT (= Net Revenue − Total COGS)
 *   OPERATING EXPENSES
 *     Vendor bills (non-inventory)
 *     Operating expenses by category
 *     ─ Total Operating Expenses ─
 *   OPERATING INCOME (= Gross Profit − Operating Expenses)
 *   OTHER INCOME / EXPENSE
 *   NET INCOME (= Operating Income + Other Income − Other Expense)
 *
 * Props:
 *   startDate, endDate   ISO date strings (YYYY-MM-DD), controlled by parent
 *   data                 The P&L payload from `api.getProfitAndLossReport()`
 *   loading              boolean
 *   error                string | null
 *   currencySymbol       defaults to '$'
 *   onChangeStartDate    handler
 *   onChangeEndDate      handler
 *   onRun                triggers refresh
 */

import { useMemo, useRef } from 'react'

const fmtMoney = (sym) => (amt) => {
  const n = parseFloat(amt) || 0
  const sign = n < 0 ? '-' : ''
  return `${sign}${sym}${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const fmtPct = (n) => `${(parseFloat(n) || 0).toFixed(2)}%`

const fmtDateLabel = (d) => {
  if (!d) return ''
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) }
  catch { return d }
}

// ── small presentational helpers ──────────────────────────────────────────────
const SectionHeader = ({ children }) => (
  <tr>
    <td colSpan={2} style={{
      padding: '14px 12px 6px',
      fontWeight: 700,
      fontSize: 12,
      letterSpacing: '0.6px',
      textTransform: 'uppercase',
      color: '#0f172a',
      borderBottom: '1px solid #cbd5e1',
      background: '#f8fafc',
    }}>{children}</td>
  </tr>
)

const Row = ({ label, value, indent = 0, faded = false, italic = false }) => (
  <tr>
    <td style={{ padding: '6px 12px', paddingLeft: 12 + indent * 18, color: faded ? '#64748b' : '#1e293b', fontStyle: italic ? 'italic' : 'normal' }}>
      {label}
    </td>
    <td style={{ padding: '6px 12px', textAlign: 'right', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', color: faded ? '#64748b' : '#1e293b', fontStyle: italic ? 'italic' : 'normal' }}>
      {value}
    </td>
  </tr>
)

const SubtotalRow = ({ label, value, color = '#0f172a', bg = '#f1f5f9' }) => (
  <tr style={{ background: bg }}>
    <td style={{ padding: '8px 12px', fontWeight: 600, color, borderTop: '1px solid #cbd5e1' }}>{label}</td>
    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color, borderTop: '1px solid #cbd5e1', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{value}</td>
  </tr>
)

const TotalRow = ({ label, value, color }) => (
  <tr>
    <td style={{ padding: '12px', fontWeight: 700, fontSize: 14, color, borderTop: '2px solid #0f172a', borderBottom: '3px double #0f172a' }}>{label}</td>
    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, fontSize: 14, color, borderTop: '2px solid #0f172a', borderBottom: '3px double #0f172a', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{value}</td>
  </tr>
)

// ── main component ────────────────────────────────────────────────────────────
export default function ProfitLossReport({
  startDate,
  endDate,
  data,
  loading,
  error,
  currencySymbol = '$',
  onChangeStartDate,
  onChangeEndDate,
  onRun,
  companyName = 'Your Company',
}) {
  const fmt = useMemo(() => fmtMoney(currencySymbol), [currencySymbol])
  const printRef = useRef(null)

  const handlePrint = () => {
    if (typeof window === 'undefined') return
    const node = printRef.current
    if (!node) return window.print()
    const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1100')
    if (!w) return
    const html = `<!DOCTYPE html><html><head><title>Profit & Loss</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #0f172a; }
        h1, h2, h3 { margin: 0; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 6px 12px; }
        .header { text-align: center; margin-bottom: 24px; }
        .header h1 { font-size: 22px; font-weight: 700; }
        .header h2 { font-size: 16px; font-weight: 600; color: #475569; margin-top: 4px; }
        .header h3 { font-size: 13px; font-weight: 400; color: #64748b; margin-top: 4px; }
      </style>
      </head><body>${node.innerHTML}</body></html>`
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); }, 300)
  }

  const handleExportCsv = () => {
    if (!data) return
    const rows = []
    rows.push(['Profit & Loss Statement'])
    rows.push([`Period: ${fmtDateLabel(startDate)} to ${fmtDateLabel(endDate)}`])
    rows.push([])
    rows.push(['Section', 'Line', 'Amount'])
    rows.push(['Revenue', 'Sales Revenue',    data.revenue?.sales_revenue ?? 0])
    rows.push(['Revenue', 'Service Revenue',  data.revenue?.service_revenue ?? 0])
    rows.push(['Revenue', 'Other Revenue',    data.revenue?.other_revenue ?? 0])
    rows.push(['Revenue', 'Less: Discounts', -(data.revenue?.discounts ?? 0)])
    rows.push(['Revenue', 'Net Revenue',      data.revenue?.net_revenue ?? 0])
    rows.push(['COGS',    'COGS — Bills',     data.cogs?.from_bills ?? 0])
    rows.push(['COGS',    'COGS — Expenses',  data.cogs?.from_expenses ?? 0])
    rows.push(['COGS',    'Total COGS',       data.cogs?.total ?? 0])
    rows.push(['',        'Gross Profit',     data.gross_profit ?? 0])
    rows.push(['Opex',    'Vendor Bills (non-inventory)', data.operating_expenses?.from_bills ?? 0])
    for (const c of (data.operating_expenses?.by_category || [])) {
      rows.push(['Opex', c.category, c.amount])
    }
    rows.push(['Opex',    'Total Operating Expenses', data.operating_expenses?.total ?? 0])
    rows.push(['',        'Operating Income', data.operating_income ?? 0])
    rows.push(['Other',   'Other Income',     data.other_income ?? 0])
    rows.push(['Other',   'Other Expense',    data.other_expense ?? 0])
    rows.push(['',        'NET INCOME',       data.net_income ?? 0])

    const csv = rows.map(r => r.map(v => {
      const s = String(v ?? '')
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }).join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `profit-loss_${startDate}_to_${endDate}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Toolbar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center',
        padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>From</label>
          <input
            type="date"
            value={startDate || ''}
            onChange={(e) => onChangeStartDate?.(e.target.value)}
            style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13 }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>To</label>
          <input
            type="date"
            value={endDate || ''}
            onChange={(e) => onChangeEndDate?.(e.target.value)}
            style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13 }}
          />
        </div>
        <button
          onClick={onRun}
          disabled={loading}
          style={{
            padding: '7px 14px', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600,
            background: loading ? '#94a3b8' : '#2563eb', color: '#fff',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}
        >
          <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-play'}`}></i>
          {loading ? 'Loading…' : 'Run Report'}
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={handleExportCsv}
          disabled={!data || loading}
          title="Export to CSV"
          style={{
            padding: '7px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13,
            background: '#fff', color: '#0f172a', cursor: (!data || loading) ? 'not-allowed' : 'pointer',
            opacity: (!data || loading) ? 0.5 : 1,
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}
        >
          <i className="fas fa-file-csv"></i> Export CSV
        </button>
        <button
          onClick={handlePrint}
          disabled={!data || loading}
          title="Print or save as PDF"
          style={{
            padding: '7px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13,
            background: '#fff', color: '#0f172a', cursor: (!data || loading) ? 'not-allowed' : 'pointer',
            opacity: (!data || loading) ? 0.5 : 1,
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}
        >
          <i className="fas fa-print"></i> Print
        </button>
      </div>

      {error && (
        <div style={{
          padding: '10px 14px', marginBottom: 16,
          background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c',
          borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      )}

      {loading && !data && (
        <div style={{
          padding: 60, textAlign: 'center', color: '#64748b',
          background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8,
        }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: 28, marginBottom: 12 }}></i>
          <p>Generating Profit &amp; Loss statement…</p>
        </div>
      )}

      {!loading && !data && !error && (
        <div style={{
          padding: 60, textAlign: 'center', color: '#64748b',
          background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8,
        }}>
          <i className="fas fa-chart-bar" style={{ fontSize: 32, marginBottom: 12 }}></i>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#0f172a' }}>Profit &amp; Loss</h3>
          <p style={{ fontSize: 13, marginTop: 6 }}>Pick a date range and click "Run Report" to generate.</p>
        </div>
      )}

      {data && (
        <div ref={printRef} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 28 }}>
          {/* Statement header */}
          <div className="header" style={{ textAlign: 'center', marginBottom: 22 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a' }}>{companyName}</h1>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#475569', marginTop: 4 }}>Profit &amp; Loss Statement</h2>
            <h3 style={{ fontSize: 13, fontWeight: 400, color: '#64748b', marginTop: 4 }}>
              For the period {fmtDateLabel(startDate)} &nbsp;to&nbsp; {fmtDateLabel(endDate)}
            </h3>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <colgroup>
              <col />
              <col style={{ width: '180px' }} />
            </colgroup>
            <tbody>
              {/* ── REVENUE ──────────────────────────────────── */}
              <SectionHeader>Revenue</SectionHeader>
              <Row label="Sales Revenue"   value={fmt(data.revenue?.sales_revenue)} indent={1} />
              <Row label="Service Revenue" value={fmt(data.revenue?.service_revenue)} indent={1} />
              <Row label="Other Revenue"   value={fmt(data.revenue?.other_revenue)} indent={1} />
              {parseFloat(data.revenue?.discounts) > 0 && (
                <Row
                  label="Less: Customer Discounts"
                  value={`(${fmt(data.revenue?.discounts)})`}
                  indent={1}
                  faded
                  italic
                />
              )}
              <SubtotalRow label="Net Revenue" value={fmt(data.revenue?.net_revenue)} bg="#ecfdf5" color="#15803d" />

              {/* ── COGS ─────────────────────────────────────── */}
              <SectionHeader>Cost of Goods Sold</SectionHeader>
              <Row label="Inventory Purchases (Bills)" value={fmt(data.cogs?.from_bills)}    indent={1} />
              <Row label="Direct COGS Expenses"        value={fmt(data.cogs?.from_expenses)} indent={1} />
              <SubtotalRow label="Total Cost of Goods Sold" value={`(${fmt(data.cogs?.total)})`} bg="#fef2f2" color="#b91c1c" />

              {/* ── GROSS PROFIT ─────────────────────────────── */}
              <SubtotalRow
                label={`Gross Profit  (${fmtPct(data.gross_margin)} margin)`}
                value={fmt(data.gross_profit)}
                bg="#eff6ff"
                color={parseFloat(data.gross_profit) >= 0 ? '#1d4ed8' : '#b91c1c'}
              />

              {/* ── OPERATING EXPENSES ──────────────────────── */}
              <SectionHeader>Operating Expenses</SectionHeader>
              {parseFloat(data.operating_expenses?.from_bills) > 0 && (
                <Row label="Vendor Bills (non-inventory)" value={fmt(data.operating_expenses?.from_bills)} indent={1} />
              )}
              {(data.operating_expenses?.by_category || []).map((c, i) => (
                <Row
                  key={i}
                  indent={1}
                  label={(c.category || 'Uncategorized').replace(/_/g, ' ').replace(/\b\w/g, m => m.toUpperCase())}
                  value={fmt(c.amount)}
                />
              ))}
              {(!(data.operating_expenses?.by_category?.length) && !(parseFloat(data.operating_expenses?.from_bills) > 0)) && (
                <Row indent={1} label="No operating expenses recorded" value={fmt(0)} faded italic />
              )}
              <SubtotalRow
                label="Total Operating Expenses"
                value={`(${fmt(data.operating_expenses?.total)})`}
                bg="#fef2f2"
                color="#b91c1c"
              />

              {/* ── OPERATING INCOME ────────────────────────── */}
              <SubtotalRow
                label={`Operating Income  (${fmtPct(data.operating_margin)} margin)`}
                value={fmt(data.operating_income)}
                bg="#eff6ff"
                color={parseFloat(data.operating_income) >= 0 ? '#1d4ed8' : '#b91c1c'}
              />

              {/* ── OTHER INCOME / EXPENSE ──────────────────── */}
              {(parseFloat(data.other_income) !== 0 || parseFloat(data.other_expense) !== 0) && (
                <>
                  <SectionHeader>Other Income / (Expense)</SectionHeader>
                  <Row label="Other Income"    value={fmt(data.other_income)}        indent={1} />
                  <Row label="Other Expenses"  value={`(${fmt(data.other_expense)})`} indent={1} />
                </>
              )}

              {/* ── NET INCOME ──────────────────────────────── */}
              <TotalRow
                label={`Net Income  (${fmtPct(data.net_margin)} margin)`}
                value={fmt(data.net_income)}
                color={parseFloat(data.net_income) >= 0 ? '#15803d' : '#b91c1c'}
              />
            </tbody>
          </table>

          {/* Footer notes */}
          <div style={{ marginTop: 20, padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 11, color: '#64748b' }}>
            <strong>Notes:</strong> Revenue is net of taxes collected ({fmt(data.revenue?.tax_collected)}).
            COGS includes inventory bill line items and direct COGS expenses.
            Only invoices with status <em>sent / approved / posted</em> and bills/expenses with status <em>approved / posted</em> are included.
          </div>
        </div>
      )}
    </div>
  )
}
