'use client'

import { useState } from 'react'
import styles from './Sidebar.module.css'

const menuItems = [
  { id: 'dashboard', name: 'Dashboard', icon: 'fa-th-large' },
  {
    id: 'sales',
    name: 'Sales',
    icon: 'fa-shopping-cart',
    submenus: [
      { id: 'invoices', name: 'Invoices' },
      { id: 'delivery-notes', name: 'Delivery Notes' },
      { id: 'sales-order', name: 'Sales Order' },
      { id: 'estimates-quotations', name: 'Estimates/Quotations' },
      { id: 'sale-receipts', name: 'Sale Receipts' },
      { id: 'customer-payments', name: 'Customer Payments' },
      { id: 'refunds', name: 'Refunds' },
    ]
  },
  {
    id: 'purchases',
    name: 'Purchases',
    icon: 'fa-file-invoice-dollar',
    submenus: [
      { id: 'bills', name: 'Bills' },
      { id: 'expenses', name: 'Expenses' },
      { id: 'request-for-quotation', name: 'Request for Quotation' },
      { id: 'purchase-order', name: 'Purchase Order' },
      { id: 'vendor-credits', name: 'Vendor Credits' },
      { id: 'bill-payments', name: 'Bill Payments' },
      { id: 'refunds-purchases', name: 'Refunds' },
    ]
  },
  {
    id: 'payments',
    name: 'Payments',
    icon: 'fa-credit-card',
    submenus: [
      { id: 'receive-payment', name: 'Receive Payment' },
      { id: 'make-payment', name: 'Make Payment' },
    ]
  },
  {
    id: 'customers',
    name: 'Customers',
    icon: 'fa-users',
    submenus: [
      { id: 'customer-center', name: 'Customer Center' },
      { id: 'customer-statements', name: 'Customer Statements' },
      { id: 'aging-account-receivables', name: 'Aging (Account Receivables)' },
      { id: 'credit-limits-terms', name: 'Credit Limits and Terms' },
      { id: 'customer-groups-segment', name: 'Customer Groups/Segment' },
      { id: 'customer-list', name: 'Customer List' },
      { id: 'document-attachments', name: 'Document & Attachments' },
    ]
  },
  {
    id: 'vendors',
    name: 'Vendors',
    icon: 'fa-truck',
    submenus: [
      { id: 'vendor-center', name: 'Vendor Center' },
      { id: 'contact-list', name: 'Contact List' },
      { id: 'vendor-groups-segments', name: 'Vendor Group/Segments' },
      { id: 'payment-terms-method', name: 'Payments Terms & Method' },
      { id: 'vendor-statements', name: 'Vendor Statements' },
      { id: 'aging-accounts-payables', name: 'Aging (Accounts Payables)' },
      { id: 'documents-attachments-vendors', name: 'Documents & Attachments' },
    ]
  },
  {
    id: 'product-services',
    name: 'Product & Services',
    icon: 'fa-boxes',
    submenus: [
      { id: 'inventory-center', name: 'Product Center' },
      { id: 'inventory-list', name: 'Product List' },
      { id: 'products-master-data', name: 'Products & Master Data' },
      { id: 'stock-locations', name: 'Stock Locations' },
      { id: 'stock-mobility', name: 'Stock Mobility' },
      { id: 'inventory-valuation', name: 'Stock Valuation' },
      { id: 'reorder-planning', name: 'Reorder Planning' },
      { id: 'documents-attachments-inventory', name: 'Documents & Attachments' },
    ]
  },
  {
    id: 'payroll',
    name: 'Payroll',
    icon: 'fa-money-check-alt',
    submenus: [
      { id: 'payroll-center', name: 'Payroll Center' },
      { id: 'employee-list', name: 'Employee List' },
      { id: 'pay-runs', name: 'Pay Runs' },
      { id: 'earnings-deductions', name: 'Earnings & Deductions' },
      { id: 'time-attendance', name: 'Time & Attendance' },
      { id: 'payroll-payments', name: 'Payroll Payments' },
      { id: 'documents-attachments-payroll', name: 'Documents & Attachments' },
    ]
  },
  {
    id: 'banking',
    name: 'Banking',
    icon: 'fa-university',
    submenus: [
      { id: 'banking-center', name: 'Banking Center' },
      { id: 'bank-accounts', name: 'Bank Accounts' },
      { id: 'bank-transactions', name: 'Bank Transactions' },
      { id: 'bank-reconciliation', name: 'Bank Reconciliation' },
      { id: 'transfers', name: 'Transfers' },
      { id: 'cheque-management', name: 'Cheque Management' },
      { id: 'documents-attachments-banking', name: 'Documents & Attachments' },
    ]
  },
  {
    id: 'accounting',
    name: 'Accounting',
    icon: 'fa-calculator',
    submenus: [
      { id: 'accounting-center', name: 'Accounting Center' },
      { id: 'chart-of-accounts', name: 'Chart of Accounts' },
      { id: 'journal-entries', name: 'Journal Entries' },
      { id: 'general-ledger', name: 'General Ledger' },
      { id: 'trial-balance', name: 'Trial Balance' },
      { id: 'documents-attachments-accounting', name: 'Documents & Attachments' },
    ]
  },
  {
    id: 'reports',
    name: 'Reports',
    icon: 'fa-chart-line',
    submenus: [
      { id: 'financial-statements', name: 'Financial Statements' },
      { id: 'planning-performance-analysis', name: 'Planning & Performance Analysis' },
      { id: 'revenue-sales-analysis', name: 'Revenue & Sales Analysis' },
      { id: 'cost-expense-analytics', name: 'Cost & Expense Analytics' },
      { id: 'receivables-payables', name: 'Receivables & Payables' },
      { id: 'inventory-analytics', name: 'Inventory Analytics' },
      { id: 'payroll-workforce-costs', name: 'Payroll & Workforce Costs' },
      { id: 'cash-banking', name: 'Cash & Banking' },
      { id: 'tax-compliances', name: 'Tax & Compliances' },
      { id: 'management-performance', name: 'Management & Performance' },
      { id: 'audit-risk', name: 'Audit & Risk' },
    ]
  },
  { id: 'settings', name: 'Settings', icon: 'fa-sliders-h' },
]

export default function Sidebar({ isOpen, isCollapsed, activeMenu, onMenuClick, onCreateClick, onToggleCollapse }) {
  const [expandedMenus, setExpandedMenus] = useState({})

  const toggleSubmenu = (menuId) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }))
  }

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.active : ''} ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.sidebarHeader}>
        <button
          className={styles.toggleBtn}
          onClick={onToggleCollapse}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <i className={`fas ${isCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
        </button>
        <button
          className={styles.createBtn}
          onClick={onCreateClick}
          title={isCollapsed ? "Create New" : ""}
        >
          <i className="fas fa-plus-circle"></i>
          {!isCollapsed && <span>Create</span>}
        </button>
      </div>

      <nav className={styles.sidebarNav}>
        <ul className={styles.menuList}>
          {menuItems.map((item) => (
            <li key={item.id} className={styles.menuItemWrapper}>
              {item.submenus ? (
                // Menu item with submenus
                <>
                  <div
                    className={`${styles.menuItem} ${styles.hasSubmenu} ${
                      expandedMenus[item.id] ? styles.expanded : ''
                    }`}
                    onClick={() => !isCollapsed && toggleSubmenu(item.id)}
                    title={isCollapsed ? item.name : ''}
                  >
                    <div className={styles.menuItemContent}>
                      <i className={`fas ${item.icon}`}></i>
                      {!isCollapsed && (
                        <>
                          <span>{item.name}</span>
                          <i className={`fas fa-chevron-down ${styles.submenuArrow}`}></i>
                        </>
                      )}
                    </div>
                  </div>
                  {!isCollapsed && (
                    <ul className={`${styles.submenu} ${
                      expandedMenus[item.id] ? styles.expanded : ''
                    }`}>
                      {item.submenus.map((submenu) => (
                        <li
                          key={submenu.id}
                          className={`${styles.submenuItem} ${
                            activeMenu === submenu.name ? styles.active : ''
                          }`}
                          onClick={() => onMenuClick(submenu.name)}
                        >
                          {submenu.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                // Regular menu item without submenus
                <div
                  className={`${styles.menuItem} ${
                    activeMenu === item.name ? styles.active : ''
                  }`}
                  onClick={() => onMenuClick(item.name)}
                  title={isCollapsed ? item.name : ''}
                >
                  <i className={`fas ${item.icon}`}></i>
                  {!isCollapsed && <span>{item.name}</span>}
                </div>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <div className={styles.sidebarFooter}>
        <div className={styles.menuItem} title={isCollapsed ? 'Bookmarks' : ''}>
          <i className="fas fa-star"></i>
          {!isCollapsed && <span>Bookmarks</span>}
        </div>
      </div>
    </aside>
  )
}
