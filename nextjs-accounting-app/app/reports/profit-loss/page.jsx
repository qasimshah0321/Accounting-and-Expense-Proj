'use client'

/**
 * Standalone Profit & Loss page — visit at  /reports/profit-loss
 *
 * Uses the same <ProfitLossReport /> component that's mounted inside the
 * ReportsDashboard modal, so the statement looks identical whether opened
 * standalone or via the in-app dashboard.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import * as api from '../../../lib/api'
import ProfitLossReport from '../../../components/ProfitLossReport'

const isoToday  = () => new Date().toISOString().slice(0, 10)
const monthAgo  = () => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 10) }

export default function ProfitLossPage() {
  const [startDate, setStartDate] = useState(monthAgo())
  const [endDate, setEndDate]     = useState(isoToday())
  const [data, setData]           = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [companyName, setCompanyName] = useState('Your Company')

  // Load the company name from /auth/me so the statement header is correct.
  useEffect(() => {
    let cancelled = false
    api.getMe().then((res) => {
      if (cancelled) return
      const name = res?.data?.company?.name || res?.data?.user?.company_name || res?.data?.companyName
      if (name) setCompanyName(name)
    }).catch(() => { /* not authenticated — leave default */ })
    return () => { cancelled = true }
  }, [])

  const run = useCallback(async () => {
    if (!startDate || !endDate) {
      setError('Please select both a start date and an end date')
      return
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError('Start date must be on or before end date')
      return
    }
    setLoading(true); setError('')
    try {
      const res = await api.getProfitAndLossReport(startDate, endDate)
      setData(res.data || res)
    } catch (e) {
      setError(e?.message || 'Failed to load profit & loss')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => { run() }, []) // initial load

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <Link href="/" style={{ color: '#2563eb', fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <i className="fas fa-arrow-left"></i> Back to Dashboard
        </Link>
        <span style={{ color: '#cbd5e1' }}>/</span>
        <span style={{ color: '#64748b', fontSize: 13 }}>Reports</span>
        <span style={{ color: '#cbd5e1' }}>/</span>
        <span style={{ color: '#0f172a', fontSize: 13, fontWeight: 600 }}>Profit &amp; Loss</span>
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
        Profit &amp; Loss Statement
      </h1>
      <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px' }}>
        Generate an income statement for any date range. Revenue, COGS, operating expenses, and net income are computed from posted invoices, bills, and expenses.
      </p>

      <ProfitLossReport
        startDate={startDate}
        endDate={endDate}
        data={data}
        loading={loading}
        error={error}
        currencySymbol="$"
        companyName={companyName}
        onChangeStartDate={setStartDate}
        onChangeEndDate={setEndDate}
        onRun={run}
      />
    </div>
  )
}
