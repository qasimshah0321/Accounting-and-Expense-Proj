'use client'

import { useState, useEffect, useRef } from 'react'
import styles from './Header.module.css'
import usePushNotifications from '../hooks/usePushNotifications'

export default function Header({ onMenuToggle, onLogout, user, companyName, onOpenSettings }) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifMenu, setShowNotifMenu] = useState(false)
  const menuRef = useRef(null)
  const notifRef = useRef(null)

  const { isSupported, isSubscribed, permission, loading, subscribe, unsubscribe } = usePushNotifications()

  // Auto-subscribe on mount if permission already granted and user is logged in
  useEffect(() => {
    if (user && isSupported && permission === 'granted' && !isSubscribed && !loading) {
      subscribe()
    }
  }, [user, isSupported, permission, isSubscribed]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowUserMenu(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleBellClick = async () => {
    if (!isSupported) {
      setShowNotifMenu(v => !v)
      return
    }
    if (!isSubscribed) {
      const ok = await subscribe()
      if (!ok) setShowNotifMenu(true)
    } else {
      setShowNotifMenu(v => !v)
    }
  }

  const handleToggleNotifications = async () => {
    if (isSubscribed) {
      await unsubscribe()
    } else {
      await subscribe()
    }
    setShowNotifMenu(false)
  }

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
        <div className={styles.notifWrapper} ref={notifRef}>
          <button
            className={styles.iconBtn}
            onClick={handleBellClick}
            title={isSubscribed ? 'Notifications enabled' : 'Enable notifications'}
          >
            <i className={`fas fa-bell${isSubscribed ? '' : '-slash'}`} style={isSubscribed ? {} : { opacity: 0.5 }} />
          </button>
          {isSubscribed && <div className={styles.notifBadge} />}

          {showNotifMenu && (
            <div className={styles.notifDropdown}>
              {!isSupported ? (
                <div className={styles.notifDropdownMsg}>
                  Push notifications are not supported in this browser.
                </div>
              ) : permission === 'denied' ? (
                <div className={styles.notifDropdownMsg}>
                  Notifications are blocked. Please enable them in your browser settings.
                </div>
              ) : (
                <>
                  <div className={styles.notifDropdownMsg}>
                    {isSubscribed
                      ? 'You are receiving push notifications.'
                      : 'Enable push notifications to get instant updates on your orders.'}
                  </div>
                  <button
                    className={styles.notifToggleBtn}
                    onClick={handleToggleNotifications}
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : isSubscribed ? 'Disable Notifications' : 'Enable Notifications'}
                  </button>
                </>
              )}
            </div>
          )}
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
