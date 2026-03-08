'use client'

import { useState, useEffect, useRef } from 'react'
import styles from './Header.module.css'

export default function Header({ onMenuToggle, onLogout, user, companyName, onOpenSettings }) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const initials = (user?.name || user?.email || 'U').substring(0, 2).toUpperCase()
  const displayCompanyName = companyName || 'My Company'

  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <i className="fas fa-circle"></i>
          </div>
          <span className={styles.logoText}>AccountPro</span>
        </div>
        <div className={styles.companyName}>{displayCompanyName}</div>
      </div>

      <div className={styles.headerCenter}>
        <div className={styles.searchBar}>
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Navigate or search for transactions, contacts, reports, and more"
          />
        </div>
      </div>

      <div className={styles.rightActions}>
        <div className={styles.notifWrapper}>
          <button className={styles.iconBtn}>
            <i className="fas fa-bell" />
          </button>
        </div>

        <div className={styles.userAvatarWrap} ref={menuRef}>
          <div className={styles.userAvatar} onClick={() => setShowUserMenu(v => !v)}>
            {initials}
          </div>
          {showUserMenu && (
            <div className={styles.userDropdown}>
              <div className={styles.dropdownUserInfo}>
                <div className={styles.dropdownUserName}>{user?.name || 'User'}</div>
                <div className={styles.dropdownUserEmail}>{user?.email || ''}</div>
              </div>
              <button className={styles.dropdownItem} onClick={() => { onOpenSettings?.(); setShowUserMenu(false); }}>
                <i className="fas fa-cog" /> Company Settings
              </button>
              <button className={`${styles.dropdownItem} ${styles.dropdownSignOut}`} onClick={() => { setShowUserMenu(false); onLogout?.(); }}>
                <i className="fas fa-sign-out-alt" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      <button className={styles.mobileMenuToggle} onClick={onMenuToggle}>
        <i className="fas fa-bars"></i>
      </button>
    </header>
  )
}
