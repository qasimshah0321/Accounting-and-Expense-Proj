'use client'

import styles from './Invoice.module.css'

// ─── Data ────────────────────────────────────────────────────────────────────

const CUSTOMER_FLOW = [
  {
    step: 1,
    icon: 'fa-file-alt',
    title: 'Estimate / Quotation',
    desc: 'Send a price quote to the customer before commitment',
    menu: 'Estimate',
    color: '#3b82f6',
    bg: '#eff6ff',
    border: '#bfdbfe',
  },
  {
    step: 2,
    icon: 'fa-clipboard-list',
    title: 'Sales Order',
    desc: 'Confirm the customer order once quote is accepted',
    menu: 'Sales Order',
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
  },
  {
    step: 3,
    icon: 'fa-truck',
    title: 'Delivery Note',
    desc: 'Record goods shipped / delivered to the customer',
    menu: 'Delivery Note',
    color: '#0891b2',
    bg: '#ecfeff',
    border: '#a5f3fc',
  },
  {
    step: 4,
    icon: 'fa-file-invoice',
    title: 'Invoice',
    desc: 'Bill the customer for goods or services rendered',
    menu: 'Invoices',
    color: '#d97706',
    bg: '#fef3c7',
    border: '#fde68a',
  },
  {
    step: 5,
    icon: 'fa-money-bill-wave',
    title: 'Customer Payment',
    desc: 'Receive & record payment from the customer',
    menu: 'Customer Payments',
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
  },
]

const VENDOR_FLOW = [
  {
    step: 1,
    icon: 'fa-shopping-basket',
    title: 'Purchase Order',
    desc: 'Place an official order with your supplier',
    menu: 'Purchase Order',
    color: '#dc2626',
    bg: '#fef2f2',
    border: '#fecaca',
  },
  {
    step: 2,
    icon: 'fa-file-invoice-dollar',
    title: 'Bill (Vendor Invoice)',
    desc: "Record the supplier's invoice when goods are received",
    menu: 'Bills',
    color: '#ea580c',
    bg: '#fff7ed',
    border: '#fed7aa',
  },
  {
    step: 3,
    icon: 'fa-hand-holding-usd',
    title: 'Vendor Payment',
    desc: 'Pay the supplier and record the transaction',
    menu: 'Bill Payments',
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
  },
]

const MASTER_DATA = [
  { icon: 'fa-users', label: 'Customer Center', menu: 'Customer Center', color: '#3b82f6' },
  { icon: 'fa-truck', label: 'Vendor Center', menu: 'Vendor Center', color: '#dc2626' },
  { icon: 'fa-boxes', label: 'Product Center', menu: 'Product Center', color: '#7c3aed' },
  { icon: 'fa-warehouse', label: 'Inventory', menu: 'Stock Valuation', color: '#0891b2' },
  { icon: 'fa-percent', label: 'Tax Configuration', menu: 'Tax', color: '#d97706' },
  { icon: 'fa-shipping-fast', label: 'Ship Via', menu: 'Ship Via', color: '#16a34a' },
  { icon: 'fa-redo-alt', label: 'Recurring Docs', menu: 'Recurring', color: '#f59e0b' },
  { icon: 'fa-bolt', label: 'Quick Order', menu: 'Quick Order', color: '#f59e0b' },
  { icon: 'fa-users-cog', label: 'Users & Roles', menu: 'Users & Roles', color: '#64748b' },
  { icon: 'fa-shield-alt', label: 'Role Permissions', menu: 'Role Permissions', color: '#64748b' },
  { icon: 'fa-building', label: 'Company Settings', menu: 'Company Settings', color: '#64748b' },
]

const GL_MODULES = [
  { icon: 'fa-list-alt', label: 'Chart of Accounts', menu: 'Chart of Accounts', color: '#16a34a' },
  { icon: 'fa-book', label: 'Journal Entries', menu: 'Journal Entries', color: '#16a34a' },
  { icon: 'fa-book-open', label: 'General Ledger', menu: 'General Ledger', color: '#16a34a' },
  { icon: 'fa-balance-scale', label: 'Trial Balance', menu: 'Trial Balance', color: '#16a34a' },
]

const BANKING_REPORTS = [
  { icon: 'fa-university', label: 'Banking Center', menu: 'Banking Center', color: '#0891b2' },
  { icon: 'fa-chart-bar', label: 'P&L Report', menu: 'Financial Statements', color: '#0891b2' },
  { icon: 'fa-chart-line', label: 'Sales Report', menu: 'Revenue & Sales Analysis', color: '#0891b2' },
  { icon: 'fa-receipt', label: 'Expense Report', menu: 'Cost & Expense Analytics', color: '#0891b2' },
  { icon: 'fa-clock', label: 'Aging Report', menu: 'Receivables & Payables', color: '#0891b2' },
]

// ─── Sub-components ──────────────────────────────────────────────────────────

const Arrow = ({ color = '#94a3b8' }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '2px 0' }}>
    <div style={{ width: 2, height: 20, background: color, opacity: 0.5 }} />
    <div style={{
      width: 0, height: 0,
      borderLeft: '6px solid transparent',
      borderRight: '6px solid transparent',
      borderTop: `8px solid ${color}`,
      opacity: 0.6,
    }} />
  </div>
)

const StepCard = ({ step, icon, title, desc, menu, color, bg, border, onClick }) => (
  <div
    onClick={() => onClick(menu)}
    title={`Open ${title}`}
    style={{
      background: bg,
      border: `1.5px solid ${border}`,
      borderRadius: 10,
      padding: '12px 16px',
      cursor: 'pointer',
      transition: 'transform 0.15s, box-shadow 0.15s',
      position: 'relative',
      minWidth: 220,
      maxWidth: 260,
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 20px ${color}30` }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
  >
    {/* Step badge */}
    <div style={{
      position: 'absolute', top: -11, left: 14,
      background: color, color: '#fff',
      fontSize: 11, fontWeight: 700, padding: '2px 10px',
      borderRadius: 20, letterSpacing: '0.5px',
    }}>
      STEP {step}
    </div>
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginTop: 4 }}>
      <div style={{
        width: 38, height: 38, borderRadius: 8, flexShrink: 0,
        background: color, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16,
      }}>
        <i className={`fas ${icon}`}></i>
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', lineHeight: 1.3 }}>{title}</div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 3, lineHeight: 1.4 }}>{desc}</div>
      </div>
    </div>
    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4, color, fontSize: 11, fontWeight: 600 }}>
      <i className="fas fa-external-link-alt" style={{ fontSize: 10 }}></i> Open Module
    </div>
  </div>
)

const ModuleChip = ({ icon, label, menu, color, onClick }) => (
  <div
    onClick={() => onClick(menu)}
    title={`Open ${label}`}
    style={{
      display: 'flex', alignItems: 'center', gap: 7,
      padding: '8px 14px', borderRadius: 8,
      background: '#fff', border: `1.5px solid #e2e8f0`,
      cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#374151',
      transition: 'border-color 0.15s, color 0.15s, background 0.15s',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.borderColor = color
      e.currentTarget.style.color = color
      e.currentTarget.style.background = color + '0d'
    }}
    onMouseLeave={e => {
      e.currentTarget.style.borderColor = '#e2e8f0'
      e.currentTarget.style.color = '#374151'
      e.currentTarget.style.background = '#fff'
    }}
  >
    <i className={`fas ${icon}`} style={{ color, fontSize: 14 }}></i>
    {label}
  </div>
)

const SectionHeading = ({ icon, label, color, bg }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 8,
    fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px',
    color, padding: '6px 14px', background: bg,
    borderRadius: 20, marginBottom: 14, alignSelf: 'flex-start',
  }}>
    <i className={`fas ${icon}`}></i> {label}
  </div>
)

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ERPFlowDiagram({ isOpen, onClose, onNavigate }) {
  if (!isOpen) return null

  const go = (menuName) => {
    onNavigate(menuName)
    onClose()
  }

  return (
    <div className={styles.invoiceListOverlay}>
      <div className={styles.invoiceListContainer}>

        {/* Header */}
        <div className={styles.listHeader}>
          <div className={styles.listHeaderLeft}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 34, height: 34, background: 'linear-gradient(135deg,#3b82f6,#7c3aed)', borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-sitemap" style={{ color: '#fff', fontSize: 16 }}></i>
              </span>
              ERP Workflow Guide
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b', fontWeight: 400 }}>
              Click any step or module to open it directly
            </p>
          </div>
          <div className={styles.listHeaderRight}>
            <button className={styles.closeBtn} onClick={onClose}><i className="fas fa-times"></i></button>
          </div>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '24px 28px 32px' }}>

          {/* ── Legend ─────────────────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 20, marginBottom: 28, flexWrap: 'wrap' }}>
            {[
              { color: '#3b82f6', label: 'Customer / Sales Cycle' },
              { color: '#dc2626', label: 'Vendor / Purchase Cycle' },
              { color: '#16a34a', label: 'Accounting & GL' },
              { color: '#0891b2', label: 'Banking & Reports' },
              { color: '#64748b', label: 'Master Data & Config' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: l.color }}></div>
                {l.label}
              </div>
            ))}
          </div>

          {/* ── Two main flows ──────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginBottom: 36 }}>

            {/* Customer Flow */}
            <div>
              <SectionHeading icon="fa-user-tie" label="Customer / Sales Cycle" color="#3b82f6" bg="#eff6ff" />

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0 }}>
                {CUSTOMER_FLOW.map((item, idx) => (
                  <div key={item.step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <StepCard {...item} onClick={go} />
                    {idx < CUSTOMER_FLOW.length - 1 && (
                      <div style={{ paddingLeft: 24 }}>
                        <Arrow color={CUSTOMER_FLOW[idx + 1].color} />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Optional steps note */}
              <div style={{ marginTop: 16, fontSize: 12, color: '#94a3b8', paddingLeft: 4 }}>
                <i className="fas fa-info-circle" style={{ marginRight: 5 }}></i>
                Steps 1-3 are optional. You can go directly to Invoice if no quote/order is needed.
              </div>
            </div>

            {/* Vendor Flow */}
            <div>
              <SectionHeading icon="fa-building" label="Vendor / Purchase Cycle" color="#dc2626" bg="#fef2f2" />

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0 }}>
                {VENDOR_FLOW.map((item, idx) => (
                  <div key={item.step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <StepCard {...item} onClick={go} />
                    {idx < VENDOR_FLOW.length - 1 && (
                      <div style={{ paddingLeft: 24 }}>
                        <Arrow color={VENDOR_FLOW[idx + 1].color} />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 16, fontSize: 12, color: '#94a3b8', paddingLeft: 4 }}>
                <i className="fas fa-info-circle" style={{ marginRight: 5 }}></i>
                Purchase Order is optional. You may skip directly to Bills for ad-hoc purchases.
              </div>

              {/* Expense shortcut */}
              <div style={{ marginTop: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <i className="fas fa-receipt" style={{ marginRight: 6 }}></i>Expense (Direct Cost)
                </div>
                <div
                  onClick={() => go('Expenses')}
                  style={{
                    background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 10,
                    padding: '12px 16px', cursor: 'pointer', maxWidth: 260,
                    transition: 'transform 0.15s, box-shadow 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px #ea580c30' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: '#ea580c', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className="fas fa-receipt" style={{ fontSize: 15 }}></i>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>Expense</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>Record direct costs without a PO/Bill</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11, fontWeight: 600, color: '#ea580c' }}>
                    <i className="fas fa-external-link-alt" style={{ fontSize: 10, marginRight: 4 }}></i>Open Module
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Divider ─────────────────────────────────────────────────── */}
          <div style={{ borderTop: '2px dashed #e2e8f0', marginBottom: 28 }} />

          {/* ── Master Data ──────────────────────────────────────────────── */}
          <div style={{ marginBottom: 28 }}>
            <SectionHeading icon="fa-database" label="Master Data & Configuration" color="#64748b" bg="#f8fafc" />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {MASTER_DATA.map(m => <ModuleChip key={m.menu} {...m} onClick={go} />)}
            </div>
          </div>

          {/* ── GL / Accounting ──────────────────────────────────────────── */}
          <div style={{ marginBottom: 28 }}>
            <SectionHeading icon="fa-calculator" label="Accounting & General Ledger" color="#16a34a" bg="#f0fdf4" />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {GL_MODULES.map(m => <ModuleChip key={m.menu} {...m} onClick={go} />)}
            </div>
          </div>

          {/* ── Banking & Reports ─────────────────────────────────────────── */}
          <div style={{ marginBottom: 16 }}>
            <SectionHeading icon="fa-chart-line" label="Banking & Reports" color="#0891b2" bg="#ecfeff" />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {BANKING_REPORTS.map(m => <ModuleChip key={m.menu} {...m} onClick={go} />)}
            </div>
          </div>

          {/* ── GL auto-posting note ──────────────────────────────────────── */}
          <div style={{
            marginTop: 28, padding: '14px 18px',
            background: 'linear-gradient(135deg, #f0fdf4, #ecfeff)',
            border: '1px solid #a7f3d0', borderRadius: 10,
            display: 'flex', alignItems: 'flex-start', gap: 12,
          }}>
            <i className="fas fa-magic" style={{ color: '#16a34a', fontSize: 18, marginTop: 2 }}></i>
            <div>
              <div style={{ fontWeight: 700, color: '#166534', fontSize: 14, marginBottom: 4 }}>Automatic GL Posting</div>
              <div style={{ fontSize: 13, color: '#166534', lineHeight: 1.6 }}>
                Every Invoice, Bill, Expense, Customer Payment, Vendor Payment and Bank Transaction automatically posts
                the corresponding double-entry journal entries to the General Ledger — no manual posting required.
                All entries can be reviewed in <strong>Journal Entries</strong> or <strong>General Ledger</strong>.
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
