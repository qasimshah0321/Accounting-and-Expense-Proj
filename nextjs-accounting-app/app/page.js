'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import Dashboard from '@/components/Dashboard'
import CreateMenu from '@/components/CreateMenu'
import styles from './page.module.css'

export default function Home() {
  const [activeMenu, setActiveMenu] = useState('Dashboard')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const handleMenuClick = (menuName) => {
    setActiveMenu(menuName)
    // Close sidebar on mobile after selection
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(false)
    }
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
