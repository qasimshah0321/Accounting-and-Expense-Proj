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
    ]
  },
  {
    id: 'purchases',
    name: 'Purchases',
    icon: 'fa-file-invoice-dollar',
    submenus: [
      { id: 'bills', name: 'Bills' },
      { id: 'request-for-quotation', name: 'Request for Quotation' },
      { id: 'vendor-credits', name: 'Vendor Credits' },
      { id: 'bill-payments', name: 'Bill Payments' },
    ]
  },
  { id: 'payments', name: 'Payments', icon: 'fa-credit-card' },
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
  { id: 'vendors', name: 'Vendors', icon: 'fa-truck' },
  { id: 'inventory', name: 'Inventory', icon: 'fa-boxes' },
  { id: 'payroll', name: 'Payroll', icon: 'fa-money-check-alt' },
  { id: 'banking', name: 'Banking', icon: 'fa-university' },
  { id: 'accounting', name: 'Accounting', icon: 'fa-calculator' },
  { id: 'reports', name: 'Reports', icon: 'fa-chart-line' },
  { id: 'settings', name: 'Settings', icon: 'fa-sliders-h' },
]

export default function Sidebar({ isOpen, activeMenu, onMenuClick, onCreateClick }) {
  const [expandedMenus, setExpandedMenus] = useState({})

  const toggleSubmenu = (menuId) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }))
  }

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.active : ''}`}>
      <div className={styles.sidebarHeader}>
        <button className={styles.createBtn} onClick={onCreateClick}>
          <i className="fas fa-plus-circle"></i>
          <span>Create</span>
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
                    onClick={() => toggleSubmenu(item.id)}
                  >
                    <div className={styles.menuItemContent}>
                      <i className={`fas ${item.icon}`}></i>
                      <span>{item.name}</span>
                      <i className={`fas fa-chevron-down ${styles.submenuArrow}`}></i>
                    </div>
                  </div>
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
                </>
              ) : (
                // Regular menu item without submenus
                <div
                  className={`${styles.menuItem} ${
                    activeMenu === item.name ? styles.active : ''
                  }`}
                  onClick={() => onMenuClick(item.name)}
                >
                  <i className={`fas ${item.icon}`}></i>
                  <span>{item.name}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <div className={styles.sidebarFooter}>
        <div className={styles.menuItem}>
          <i className="fas fa-star"></i>
          <span>Bookmarks</span>
        </div>
      </div>
    </aside>
  )
}
