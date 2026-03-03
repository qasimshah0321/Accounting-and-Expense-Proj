'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import Dashboard from '@/components/Dashboard'
import CreateMenu from '@/components/CreateMenu'
import Invoice from '@/components/Invoice'
import SalesOrder from '@/components/SalesOrder'
import PurchaseOrder from '@/components/PurchaseOrder'
import Estimate from '@/components/Estimate'
import DeliveryNote from '@/components/DeliveryNote'
import CustomerCenter from '@/components/CustomerCenter'
import VendorCenter from '@/components/VendorCenter'
import ProductCenter from '@/components/ProductCenter'
import TaxConfiguration from '@/components/TaxConfiguration'
import ShipViaConfiguration from '@/components/ShipViaConfiguration'
import BillCenter from '@/components/BillCenter'
import ExpenseCenter from '@/components/ExpenseCenter'
import CustomerPayments from '@/components/CustomerPayments'
import VendorPayments from '@/components/VendorPayments'
import ReportsDashboard from '@/components/ReportsDashboard'
import InventoryCenter from '@/components/InventoryCenter'
import ChartOfAccounts from '@/components/ChartOfAccounts'
import JournalEntryCenter from '@/components/JournalEntryCenter'
import GeneralLedger from '@/components/GeneralLedger'
import TrialBalance from '@/components/TrialBalance'
import Login from '@/components/Login'
import styles from './page.module.css'
import * as api from '@/lib/api'

export default function Home() {
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)

  // Shared data loaded from backend
  const [taxes, setTaxes] = useState([])
  const [shipVias, setShipVias] = useState([])

  // UI state
  const [activeMenu, setActiveMenu] = useState('Dashboard')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  // Sales
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false)
  const [isSalesOrderOpen, setIsSalesOrderOpen] = useState(false)
  const [isEstimateOpen, setIsEstimateOpen] = useState(false)
  const [isDeliveryNoteOpen, setIsDeliveryNoteOpen] = useState(false)

  // Purchases
  const [isPurchaseOrderOpen, setIsPurchaseOrderOpen] = useState(false)
  const [isBillCenterOpen, setIsBillCenterOpen] = useState(false)
  const [isExpenseCenterOpen, setIsExpenseCenterOpen] = useState(false)

  // Payments
  const [isCustomerPaymentsOpen, setIsCustomerPaymentsOpen] = useState(false)
  const [isVendorPaymentsOpen, setIsVendorPaymentsOpen] = useState(false)

  // Centers
  const [isCustomerCenterOpen, setIsCustomerCenterOpen] = useState(false)
  const [isVendorCenterOpen, setIsVendorCenterOpen] = useState(false)
  const [isProductCenterOpen, setIsProductCenterOpen] = useState(false)
  const [isInventoryCenterOpen, setIsInventoryCenterOpen] = useState(false)

  // Settings
  const [isTaxConfigOpen, setIsTaxConfigOpen] = useState(false)
  const [isShipViaConfigOpen, setIsShipViaConfigOpen] = useState(false)

  // Accounting / GL
  const [isChartOfAccountsOpen, setIsChartOfAccountsOpen] = useState(false)
  const [isJournalEntryCenterOpen, setIsJournalEntryCenterOpen] = useState(false)
  const [isGeneralLedgerOpen, setIsGeneralLedgerOpen] = useState(false)
  const [isTrialBalanceOpen, setIsTrialBalanceOpen] = useState(false)

  // Reports
  const [isReportsDashboardOpen, setIsReportsDashboardOpen] = useState(false)

  // Check for existing auth token on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      api.getMe()
        .then((res) => {
          setUser(res.data || res.user || { email: 'user' })
        })
        .catch(() => {
          localStorage.removeItem('auth_token')
        })
        .finally(() => setAuthChecked(true))
    } else {
      setAuthChecked(true)
    }
  }, [])

  // Load taxes and ship vias once authenticated
  useEffect(() => {
    if (user) {
      api.getTaxes()
        .then((res) => setTaxes(res.data || []))
        .catch(() => {})

      api.getShipVias()
        .then((res) => setShipVias(res.data || []))
        .catch(() => {})
    }
  }, [user])

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser)
  }

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    setUser(null)
  }

  const handleMenuClick = (menuName) => {
    setActiveMenu(menuName)

    // Sales
    if (menuName === 'Invoices' || menuName === 'Invoice') setIsInvoiceOpen(true)
    if (menuName === 'Sales Order' || menuName === 'Sale Order') setIsSalesOrderOpen(true)
    if (menuName === 'Estimate' || menuName === 'Estimates/Quotations') setIsEstimateOpen(true)
    if (menuName === 'Delivery Note' || menuName === 'Delivery Notes') setIsDeliveryNoteOpen(true)
    if (menuName === 'Customer Payments') setIsCustomerPaymentsOpen(true)

    // Purchases
    if (menuName === 'Purchase Order' || menuName === 'Purchase Orders') setIsPurchaseOrderOpen(true)
    if (menuName === 'Bills') setIsBillCenterOpen(true)
    if (menuName === 'Expenses') setIsExpenseCenterOpen(true)
    if (menuName === 'Bill Payments') setIsVendorPaymentsOpen(true)

    // Payments
    if (menuName === 'Receive Payment') setIsCustomerPaymentsOpen(true)
    if (menuName === 'Make Payment') setIsVendorPaymentsOpen(true)

    // Centers
    if (menuName === 'Customer Center') setIsCustomerCenterOpen(true)
    if (menuName === 'Vendor Center') setIsVendorCenterOpen(true)
    if (menuName === 'Product Center') setIsProductCenterOpen(true)

    // Inventory
    if (
      menuName === 'Stock Valuation' ||
      menuName === 'Stock Locations' ||
      menuName === 'Stock Mobility' ||
      menuName === 'Reorder Planning' ||
      menuName === 'Inventory Analytics'
    ) setIsInventoryCenterOpen(true)

    // Reports
    if (
      menuName === 'Financial Statements' ||
      menuName === 'Revenue & Sales Analysis' ||
      menuName === 'Cost & Expense Analytics' ||
      menuName === 'Receivables & Payables' ||
      menuName === 'Planning & Performance Analysis'
    ) setIsReportsDashboardOpen(true)

    // Accounting / GL
    if (menuName === 'Chart of Accounts' || menuName === 'Accounting Center') setIsChartOfAccountsOpen(true)
    if (menuName === 'Journal Entries') setIsJournalEntryCenterOpen(true)
    if (menuName === 'General Ledger') setIsGeneralLedgerOpen(true)
    if (menuName === 'Trial Balance') setIsTrialBalanceOpen(true)

    // Settings
    if (menuName === 'Tax') setIsTaxConfigOpen(true)
    if (menuName === 'Ship Via') setIsShipViaConfigOpen(true)

    if (window.innerWidth <= 768) setIsSidebarOpen(false)
    setIsCreateMenuOpen(false)
  }

  // Show loading spinner while checking token
  if (!authChecked) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f1f5f9', fontSize: 18, color: '#64748b' }}>
        <i className="fas fa-spinner fa-spin" style={{ marginRight: 10 }}></i> Loading...
      </div>
    )
  }

  // Show login if not authenticated
  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <>
      <Header onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} onLogout={handleLogout} user={user} />

      <CreateMenu
        isOpen={isCreateMenuOpen}
        onClose={() => setIsCreateMenuOpen(false)}
        onMenuClick={handleMenuClick}
      />

      {/* Sales */}
      <Invoice
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
        taxes={taxes}
        onTaxUpdate={setTaxes}
      />
      <SalesOrder
        isOpen={isSalesOrderOpen}
        onClose={() => setIsSalesOrderOpen(false)}
        taxes={taxes}
        onTaxUpdate={setTaxes}
      />
      <Estimate
        isOpen={isEstimateOpen}
        onClose={() => setIsEstimateOpen(false)}
        taxes={taxes}
        onTaxUpdate={setTaxes}
      />
      <DeliveryNote
        isOpen={isDeliveryNoteOpen}
        onClose={() => setIsDeliveryNoteOpen(false)}
        shipVias={shipVias}
        onShipViaUpdate={setShipVias}
      />

      {/* Purchases */}
      <PurchaseOrder
        isOpen={isPurchaseOrderOpen}
        onClose={() => setIsPurchaseOrderOpen(false)}
        taxes={taxes}
        onTaxUpdate={setTaxes}
      />
      <BillCenter
        isOpen={isBillCenterOpen}
        onClose={() => setIsBillCenterOpen(false)}
        taxes={taxes}
        onTaxUpdate={setTaxes}
      />
      <ExpenseCenter
        isOpen={isExpenseCenterOpen}
        onClose={() => setIsExpenseCenterOpen(false)}
        taxes={taxes}
      />

      {/* Payments */}
      <CustomerPayments
        isOpen={isCustomerPaymentsOpen}
        onClose={() => setIsCustomerPaymentsOpen(false)}
      />
      <VendorPayments
        isOpen={isVendorPaymentsOpen}
        onClose={() => setIsVendorPaymentsOpen(false)}
      />

      {/* Centers */}
      <CustomerCenter isOpen={isCustomerCenterOpen} onClose={() => setIsCustomerCenterOpen(false)} />
      <VendorCenter isOpen={isVendorCenterOpen} onClose={() => setIsVendorCenterOpen(false)} />
      <ProductCenter isOpen={isProductCenterOpen} onClose={() => setIsProductCenterOpen(false)} />
      <InventoryCenter isOpen={isInventoryCenterOpen} onClose={() => setIsInventoryCenterOpen(false)} />

      {/* Settings */}
      <TaxConfiguration
        isOpen={isTaxConfigOpen}
        onClose={() => setIsTaxConfigOpen(false)}
        onTaxesLoaded={setTaxes}
      />
      <ShipViaConfiguration
        isOpen={isShipViaConfigOpen}
        onClose={() => setIsShipViaConfigOpen(false)}
        onShipViasLoaded={setShipVias}
      />

      {/* Accounting / GL */}
      <ChartOfAccounts isOpen={isChartOfAccountsOpen} onClose={() => setIsChartOfAccountsOpen(false)} />
      <JournalEntryCenter isOpen={isJournalEntryCenterOpen} onClose={() => setIsJournalEntryCenterOpen(false)} />
      <GeneralLedger isOpen={isGeneralLedgerOpen} onClose={() => setIsGeneralLedgerOpen(false)} />
      <TrialBalance isOpen={isTrialBalanceOpen} onClose={() => setIsTrialBalanceOpen(false)} />

      {/* Reports */}
      <ReportsDashboard
        isOpen={isReportsDashboardOpen}
        onClose={() => setIsReportsDashboardOpen(false)}
      />

      <div className={styles.mainContainer}>
        <Sidebar
          isOpen={isSidebarOpen}
          isCollapsed={isSidebarCollapsed}
          activeMenu={activeMenu}
          onMenuClick={handleMenuClick}
          onCreateClick={() => setIsCreateMenuOpen(true)}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        <main className={`${styles.mainContent} ${isSidebarCollapsed ? styles.collapsed : ''}`}>
          {activeMenu === 'Dashboard' ? (
            <Dashboard />
          ) : (
            <>
              <div className={styles.contentHeader}>
                <h1>{activeMenu}</h1>
              </div>
              <div className={styles.contentBody}>
                <div className={styles.contentDisplay}>
                  <h2>{activeMenu}</h2>
                  <p>You clicked on {activeMenu}</p>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div className={styles.overlay} onClick={() => setIsSidebarOpen(false)}></div>
      )}
    </>
  )
}
