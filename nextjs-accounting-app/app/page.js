'use client'

import { useState, useEffect, useCallback } from 'react'
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
import BankingCenter from '@/components/BankingCenter'
import ChartOfAccounts from '@/components/ChartOfAccounts'
import JournalEntryCenter from '@/components/JournalEntryCenter'
import GeneralLedger from '@/components/GeneralLedger'
import TrialBalance from '@/components/TrialBalance'
import RecurringCenter from '@/components/RecurringCenter'
import CompanySettings from '@/components/CompanySettings'
import ERPFlowDiagram from '@/components/ERPFlowDiagram'
import UserManagement from '@/components/UserManagement'
import RolePermissions from '@/components/RolePermissions'
import Login from '@/components/Login'
import ToastContainer from '../components/Toast'
import styles from './page.module.css'
import * as api from '@/lib/api'
import { getCurrencySymbol } from '@/lib/currency'

// Map every menu name to its panel identifier
const MENU_PANEL_MAP = {
  'Invoices': 'Invoice', 'Invoice': 'Invoice',
  'Sales Order': 'SalesOrder', 'Sale Order': 'SalesOrder',
  'Estimate': 'Estimate', 'Estimates/Quotations': 'Estimate',
  'Delivery Note': 'DeliveryNote', 'Delivery Notes': 'DeliveryNote',
  'Customer Payments': 'CustomerPayments', 'Receive Payment': 'CustomerPayments',
  'Purchase Order': 'PurchaseOrder', 'Purchase Orders': 'PurchaseOrder',
  'Bills': 'BillCenter',
  'Expenses': 'ExpenseCenter',
  'Bill Payments': 'VendorPayments', 'Make Payment': 'VendorPayments',
  'Customer Center': 'CustomerCenter',
  'Vendor Center': 'VendorCenter',
  'Product Center': 'ProductCenter',
  'Stock Valuation': 'InventoryCenter', 'Stock Locations': 'InventoryCenter',
  'Stock Mobility': 'InventoryCenter', 'Reorder Planning': 'InventoryCenter',
  'Inventory Analytics': 'InventoryCenter',
  'Financial Statements': 'ReportsDashboard', 'Revenue & Sales Analysis': 'ReportsDashboard',
  'Cost & Expense Analytics': 'ReportsDashboard', 'Receivables & Payables': 'ReportsDashboard',
  'Planning & Performance Analysis': 'ReportsDashboard',
  'Banking Center': 'BankingCenter', 'Bank Accounts': 'BankingCenter',
  'Bank Transactions': 'BankingCenter', 'Bank Reconciliation': 'BankingCenter',
  'Transfers': 'BankingCenter', 'Cheque Management': 'BankingCenter',
  'Chart of Accounts': 'ChartOfAccounts', 'Accounting Center': 'ChartOfAccounts',
  'Journal Entries': 'JournalEntryCenter',
  'General Ledger': 'GeneralLedger',
  'Trial Balance': 'TrialBalance',
  'Recurring Documents': 'RecurringCenter', 'Recurring': 'RecurringCenter',
  'Company Settings': 'CompanySettings', 'Company': 'CompanySettings',
  'ERP Flow Guide': 'ERPFlowDiagram', 'ERP Flow': 'ERPFlowDiagram',
  'Tax': 'TaxConfiguration',
  'Ship Via': 'ShipViaConfiguration',
  'Users & Roles': 'UserManagement',
  'Role Permissions': 'RolePermissions',
}

export default function Home() {
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)

  // Shared data loaded from backend
  const [taxes, setTaxes] = useState([])
  const [shipVias, setShipVias] = useState([])
  const [permittedMenus, setPermittedMenus] = useState(null)
  const [currencySymbol, setCurrencySymbol] = useState('$')
  const [companyProfile, setCompanyProfile] = useState(null)

  // UI state
  const [activeMenu, setActiveMenu] = useState('Dashboard')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  // Single active panel — only one panel open at a time
  const [activePanel, setActivePanel] = useState(null)

  // Toast notifications
  const [toasts, setToasts] = useState([])
  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Pending navigation: { panel, menu } when user tries to navigate away with unsaved changes
  const [pendingPanel, setPendingPanel] = useState(null)

  // Dirty flag: set by form components when they have unsaved changes
  const [isDirty, setIsDirty] = useState(false)

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
          setUser(null)
        })
        .finally(() => setAuthChecked(true))
    } else {
      setAuthChecked(true)
    }
  }, [])

  // Listen for auth:expired events dispatched by api.js on any 401 response
  // This replaces the old window.location.reload() approach which caused a race condition
  // where the token was cleared but the reload hadn't happened yet
  useEffect(() => {
    const handleAuthExpired = () => {
      localStorage.removeItem('auth_token')
      setUser(null)
      setActivePanel(null)
      setIsDirty(false)
    }
    window.addEventListener('auth:expired', handleAuthExpired)
    return () => window.removeEventListener('auth:expired', handleAuthExpired)
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

      api.getMyMenus()
        .then((res) => setPermittedMenus(res.data?.menus ?? null))
        .catch(() => {})

      api.getCompanyProfile()
        .then((res) => {
          setCompanyProfile(res.data || null)
          setCurrencySymbol(getCurrencySymbol(res.data?.currency))
        })
        .catch(() => {})

      // Customer users land on Orders instead of Dashboard
      if (user.role === 'customer') {
        setActiveMenu('Sales Order')
        setActivePanel('SalesOrder')
      }
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
    const panelName = MENU_PANEL_MAP[menuName]

    // If user has unsaved changes and is navigating to a different panel, show confirm dialog
    if (isDirty && panelName && panelName !== activePanel) {
      setPendingPanel({ panel: panelName, menu: menuName })
      return
    }

    setActiveMenu(menuName)
    if (panelName) {
      setActivePanel(panelName)
      setIsDirty(false)
    } else {
      // Dashboard or unmapped menu items — close any open panel
      setActivePanel(null)
      setIsDirty(false)
    }

    if (window.innerWidth <= 768) setIsSidebarOpen(false)
    setIsCreateMenuOpen(false)
  }

  // Called by each component's close button
  const closePanel = () => {
    setActivePanel(null)
    setActiveMenu('Dashboard')
    setIsDirty(false)
  }

  // User confirmed: discard changes and navigate to the pending panel
  const confirmDiscard = () => {
    setActiveMenu(pendingPanel.menu)
    setActivePanel(pendingPanel.panel)
    setIsDirty(false)
    setPendingPanel(null)
    if (window.innerWidth <= 768) setIsSidebarOpen(false)
    setIsCreateMenuOpen(false)
  }

  // User cancelled: stay on current page
  const cancelNavigation = () => {
    setPendingPanel(null)
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
      <Header
        onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        onLogout={handleLogout}
        user={user}
        companyName={companyProfile?.name || ''}
        onOpenSettings={() => { setActiveMenu('Company Settings'); setActivePanel('CompanySettings'); }}
      />

      <CreateMenu
        isOpen={isCreateMenuOpen}
        onClose={() => setIsCreateMenuOpen(false)}
        onMenuClick={handleMenuClick}
        permittedMenus={permittedMenus}
      />

      <div className={styles.mainContainer}>
        <Sidebar
          isOpen={isSidebarOpen}
          isCollapsed={isSidebarCollapsed}
          activeMenu={activeMenu}
          onMenuClick={handleMenuClick}
          onCreateClick={() => setIsCreateMenuOpen(true)}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          permittedMenus={permittedMenus}
          userRole={user?.role}
        />

        <main className={`${styles.mainContent} ${isSidebarCollapsed ? styles.collapsed : ''}`}>

          {/* ── All panels open inside the main area ── */}

          {/* Sales */}
          <Invoice
            isOpen={activePanel === 'Invoice'}
            onClose={closePanel}
            taxes={taxes}
            onTaxUpdate={setTaxes}
            onDirtyChange={setIsDirty}
            user={user}
            currencySymbol={currencySymbol}
          />
          <SalesOrder
            isOpen={activePanel === 'SalesOrder'}
            onClose={closePanel}
            taxes={taxes}
            onTaxUpdate={setTaxes}
            onDirtyChange={setIsDirty}
            user={user}
            currencySymbol={currencySymbol}
          />
          <Estimate
            isOpen={activePanel === 'Estimate'}
            onClose={closePanel}
            taxes={taxes}
            onTaxUpdate={setTaxes}
            onDirtyChange={setIsDirty}
            user={user}
            currencySymbol={currencySymbol}
          />
          <DeliveryNote
            isOpen={activePanel === 'DeliveryNote'}
            onClose={closePanel}
            shipVias={shipVias}
            onShipViaUpdate={setShipVias}
            onDirtyChange={setIsDirty}
            user={user}
          />

          {/* Purchases */}
          <PurchaseOrder
            isOpen={activePanel === 'PurchaseOrder'}
            onClose={closePanel}
            taxes={taxes}
            onTaxUpdate={setTaxes}
            onDirtyChange={setIsDirty}
            user={user}
            currencySymbol={currencySymbol}
          />
          <BillCenter
            isOpen={activePanel === 'BillCenter'}
            onClose={closePanel}
            taxes={taxes}
            onTaxUpdate={setTaxes}
            onDirtyChange={setIsDirty}
            currencySymbol={currencySymbol}
          />
          <ExpenseCenter
            isOpen={activePanel === 'ExpenseCenter'}
            onClose={closePanel}
            taxes={taxes}
            onDirtyChange={setIsDirty}
            currencySymbol={currencySymbol}
          />

          {/* Payments */}
          <CustomerPayments
            isOpen={activePanel === 'CustomerPayments'}
            onClose={closePanel}
            currencySymbol={currencySymbol}
          />
          <VendorPayments
            isOpen={activePanel === 'VendorPayments'}
            onClose={closePanel}
            currencySymbol={currencySymbol}
          />

          {/* Centers */}
          <CustomerCenter isOpen={activePanel === 'CustomerCenter'} onClose={closePanel} />
          <VendorCenter isOpen={activePanel === 'VendorCenter'} onClose={closePanel} />
          <ProductCenter isOpen={activePanel === 'ProductCenter'} onClose={closePanel} currencySymbol={currencySymbol} />
          <InventoryCenter isOpen={activePanel === 'InventoryCenter'} onClose={closePanel} />

          {/* Settings */}
          <TaxConfiguration
            isOpen={activePanel === 'TaxConfiguration'}
            onClose={closePanel}
            onTaxesLoaded={setTaxes}
          />
          <ShipViaConfiguration
            isOpen={activePanel === 'ShipViaConfiguration'}
            onClose={closePanel}
            onShipViasLoaded={setShipVias}
          />

          {/* Banking */}
          <BankingCenter isOpen={activePanel === 'BankingCenter'} onClose={closePanel} />

          {/* Accounting / GL */}
          <ChartOfAccounts isOpen={activePanel === 'ChartOfAccounts'} onClose={closePanel} currencySymbol={currencySymbol} />
          <JournalEntryCenter isOpen={activePanel === 'JournalEntryCenter'} onClose={closePanel} currencySymbol={currencySymbol} />
          <GeneralLedger isOpen={activePanel === 'GeneralLedger'} onClose={closePanel} currencySymbol={currencySymbol} />
          <TrialBalance isOpen={activePanel === 'TrialBalance'} onClose={closePanel} currencySymbol={currencySymbol} />

          {/* Recurring */}
          <RecurringCenter isOpen={activePanel === 'RecurringCenter'} onClose={closePanel} />

          {/* Company Settings */}
          <CompanySettings
            isOpen={activePanel === 'CompanySettings'}
            onClose={closePanel}
            onCurrencyChange={(code) => setCurrencySymbol(getCurrencySymbol(code))}
            showToast={showToast}
          />

          {/* RBAC */}
          <UserManagement isOpen={activePanel === 'UserManagement'} onClose={closePanel} />
          <RolePermissions isOpen={activePanel === 'RolePermissions'} onClose={closePanel} />

          {/* ERP Flow */}
          <ERPFlowDiagram
            isOpen={activePanel === 'ERPFlowDiagram'}
            onClose={closePanel}
            onNavigate={(menuName) => { handleMenuClick(menuName) }}
          />

          {/* Reports */}
          <ReportsDashboard
            isOpen={activePanel === 'ReportsDashboard'}
            onClose={closePanel}
            currencySymbol={currencySymbol}
          />

          {/* ── Dashboard ── */}
          {activeMenu === 'Dashboard' && <Dashboard currencySymbol={currencySymbol} />}
        </main>
      </div>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div className={styles.overlay} onClick={() => setIsSidebarOpen(false)}></div>
      )}

      {/* ── Unsaved Changes Confirm Dialog ── */}
      {pendingPanel && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: '32px',
            maxWidth: 420, width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', background: '#fef2f2',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <i className="fas fa-exclamation-triangle" style={{ color: '#ef4444', fontSize: 16 }}></i>
              </div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1e293b' }}>Unsaved Changes</h3>
            </div>
            <p style={{ margin: '0 0 24px', color: '#64748b', lineHeight: 1.6, fontSize: 14 }}>
              You have unsaved changes on this page. Opening a new page will discard them. Do you want to continue?
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={cancelNavigation}
                style={{
                  padding: '9px 20px', border: '1px solid #d1d5db', borderRadius: 8,
                  background: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#374151'
                }}
              >
                Stay on Page
              </button>
              <button
                onClick={confirmDiscard}
                style={{
                  padding: '9px 20px', border: 'none', borderRadius: 8,
                  background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600
                }}
              >
                Discard &amp; Continue
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  )
}
