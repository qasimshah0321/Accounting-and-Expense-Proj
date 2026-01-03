'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import Dashboard from '@/components/Dashboard'
import CreateMenu from '@/components/CreateMenu'
import Invoice from '@/components/Invoice'
import SalesOrder from '@/components/SalesOrder'
import Estimate from '@/components/Estimate'
import DeliveryNote from '@/components/DeliveryNote'
import CustomerCenter from '@/components/CustomerCenter'
import VendorCenter from '@/components/VendorCenter'
import ProductCenter from '@/components/ProductCenter'
import TaxConfiguration from '@/components/TaxConfiguration'
import ShipViaConfiguration from '@/components/ShipViaConfiguration'
import styles from './page.module.css'

export default function Home() {
  const [activeMenu, setActiveMenu] = useState('Dashboard')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false)
  const [isSalesOrderOpen, setIsSalesOrderOpen] = useState(false)
  const [isEstimateOpen, setIsEstimateOpen] = useState(false)
  const [isDeliveryNoteOpen, setIsDeliveryNoteOpen] = useState(false)
  const [isCustomerCenterOpen, setIsCustomerCenterOpen] = useState(false)
  const [isVendorCenterOpen, setIsVendorCenterOpen] = useState(false)
  const [isProductCenterOpen, setIsProductCenterOpen] = useState(false)
  const [isTaxConfigOpen, setIsTaxConfigOpen] = useState(false)
  const [isShipViaConfigOpen, setIsShipViaConfigOpen] = useState(false)
  const [taxes, setTaxes] = useState([
    { id: 1, name: 'Sales Tax', rate: 10, description: 'Standard sales tax', isDefault: true },
    { id: 2, name: 'VAT', rate: 15, description: 'Value Added Tax', isDefault: false },
  ])
  const [shipVias, setShipVias] = useState([
    { id: 1, name: 'FedEx', description: 'FedEx Express Shipping', isActive: true },
    { id: 2, name: 'UPS', description: 'UPS Ground Shipping', isActive: true },
    { id: 3, name: 'DHL', description: 'DHL International', isActive: false },
  ])

  const handleMenuClick = (menuName) => {
    setActiveMenu(menuName)

    // Open invoice popup if Invoices or Invoice is clicked
    if (menuName === 'Invoices' || menuName === 'Invoice') {
      setIsInvoiceOpen(true)
    }

    // Open sales order popup if Sales Order or Sale Order is clicked
    if (menuName === 'Sales Order' || menuName === 'Sale Order') {
      setIsSalesOrderOpen(true)
    }

    // Open estimate popup if Estimate or Estimates/Quotations is clicked
    if (menuName === 'Estimate' || menuName === 'Estimates/Quotations') {
      setIsEstimateOpen(true)
    }

    // Open delivery note popup if Delivery Note or Delivery Notes is clicked
    if (menuName === 'Delivery Note' || menuName === 'Delivery Notes') {
      setIsDeliveryNoteOpen(true)
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

    // Open tax configuration if Tax is clicked
    if (menuName === 'Tax') {
      setIsTaxConfigOpen(true)
    }

    // Open ship via configuration if Ship Via is clicked
    if (menuName === 'Ship Via') {
      setIsShipViaConfigOpen(true)
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

  const handleSalesOrderClose = () => {
    setIsSalesOrderOpen(false)
  }

  const handleEstimateClose = () => {
    setIsEstimateOpen(false)
  }

  const handleDeliveryNoteClose = () => {
    setIsDeliveryNoteOpen(false)
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

  const handleTaxConfigClose = () => {
    setIsTaxConfigOpen(false)
  }

  const handleShipViaConfigClose = () => {
    setIsShipViaConfigOpen(false)
  }

  const handleTaxUpdate = (updatedTaxes) => {
    setTaxes(updatedTaxes)
  }

  const handleShipViaUpdate = (updatedShipVias) => {
    setShipVias(updatedShipVias)
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

      <Invoice isOpen={isInvoiceOpen} onClose={handleInvoiceClose} taxes={taxes} onTaxUpdate={handleTaxUpdate} />

      <SalesOrder isOpen={isSalesOrderOpen} onClose={handleSalesOrderClose} taxes={taxes} onTaxUpdate={handleTaxUpdate} />

      <Estimate isOpen={isEstimateOpen} onClose={handleEstimateClose} taxes={taxes} onTaxUpdate={handleTaxUpdate} />

      <DeliveryNote isOpen={isDeliveryNoteOpen} onClose={handleDeliveryNoteClose} shipVias={shipVias} onShipViaUpdate={handleShipViaUpdate} />

      <CustomerCenter isOpen={isCustomerCenterOpen} onClose={handleCustomerCenterClose} />

      <VendorCenter isOpen={isVendorCenterOpen} onClose={handleVendorCenterClose} />

      <ProductCenter isOpen={isProductCenterOpen} onClose={handleProductCenterClose} />

      <TaxConfiguration isOpen={isTaxConfigOpen} onClose={handleTaxConfigClose} taxes={taxes} onTaxUpdate={handleTaxUpdate} />

      <ShipViaConfiguration isOpen={isShipViaConfigOpen} onClose={handleShipViaConfigClose} shipVias={shipVias} onShipViaUpdate={handleShipViaUpdate} />

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
