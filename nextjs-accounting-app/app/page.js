'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import Dashboard from '@/components/Dashboard'
import CreateMenu from '@/components/CreateMenu'
import Invoice from '@/components/Invoice'
import CustomerCenter from '@/components/CustomerCenter'
import VendorCenter from '@/components/VendorCenter'
import ProductCenter from '@/components/ProductCenter'
import styles from './page.module.css'

export default function Home() {
  const [activeMenu, setActiveMenu] = useState('Dashboard')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false)
  const [isCustomerCenterOpen, setIsCustomerCenterOpen] = useState(false)
  const [isVendorCenterOpen, setIsVendorCenterOpen] = useState(false)
  const [isProductCenterOpen, setIsProductCenterOpen] = useState(false)

  const handleMenuClick = (menuName) => {
    setActiveMenu(menuName)

    // Open invoice popup if Invoices or Invoice is clicked
    if (menuName === 'Invoices' || menuName === 'Invoice') {
      setIsInvoiceOpen(true)
    }

    // Open customer center if Customer Center is clicked
    if (menuName === 'Customer Center') {
      setIsCustomerCenterOpen(true)
    }

    // Open vendor center if Vendor Center is clicked
    if (menuName === 'Vendor Center') {
      setIsVendorCenterOpen(true)
    }

    // Open product center if Product Center is clicked
    if (menuName === 'Product Center') {
      setIsProductCenterOpen(true)
    }

    // Close sidebar and create menu on mobile after selection
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(false)
    }

    // Close create menu after item is clicked
    setIsCreateMenuOpen(false)
  }

  const handleInvoiceClose = () => {
    setIsInvoiceOpen(false)
  }

  const handleCustomerCenterClose = () => {
    setIsCustomerCenterOpen(false)
  }

  const handleVendorCenterClose = () => {
    setIsVendorCenterOpen(false)
  }

  const handleProductCenterClose = () => {
    setIsProductCenterOpen(false)
  }

  const handleMenuToggle = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const handleCreateClick = () => {
    setIsCreateMenuOpen(true)
  }

  const handleCreateMenuClose = () => {
    setIsCreateMenuOpen(false)
  }

  const handleToggleCollapse = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed)
  }

  return (
    <>
      <Header onMenuToggle={handleMenuToggle} />

      <CreateMenu
        isOpen={isCreateMenuOpen}
        onClose={handleCreateMenuClose}
        onMenuClick={handleMenuClick}
      />

      <Invoice isOpen={isInvoiceOpen} onClose={handleInvoiceClose} />

      <CustomerCenter isOpen={isCustomerCenterOpen} onClose={handleCustomerCenterClose} />

      <VendorCenter isOpen={isVendorCenterOpen} onClose={handleVendorCenterClose} />

      <ProductCenter isOpen={isProductCenterOpen} onClose={handleProductCenterClose} />

      <div className={styles.mainContainer}>
        <Sidebar
          isOpen={isSidebarOpen}
          isCollapsed={isSidebarCollapsed}
          activeMenu={activeMenu}
          onMenuClick={handleMenuClick}
          onCreateClick={handleCreateClick}
          onToggleCollapse={handleToggleCollapse}
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
        <div
          className={styles.overlay}
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
    </>
  )
}
