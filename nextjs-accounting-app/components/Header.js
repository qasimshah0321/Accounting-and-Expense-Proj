'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './Header.module.css'
import usePushNotifications from '../hooks/usePushNotifications'
import * as api from '../lib/api'

const POLL_INTERVAL_MS = 30000 // poll every 30 s

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function Header({ onMenuToggle, onLogout, user, companyName, onOpenSettings, onNavigate }) {
  const [showUserMenu,  setShowUserMenu]  = useState(false)
  const [showNotifMenu, setShowNotifMenu] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount,   setUnreadCount]   = useState(0)
  const menuRef  = useRef(null)
  const notifRef = useRef(null)

  const { isSupported, isSubscribed, permission, loading, subscribe, unsubscribe } = usePushNotifications()

  // ─── Fetch notifications ─────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!user) return
    try {
      const res = await api.getNotifications(30)
      const data = res?.data || res
      setNotifications(data?.notifications || [])
      setUnreadCount(data?.unread_count ?? 0)
    } catch {
      // fail silently — notifications are non-critical
    }
  }, [user])

  // Fetch on mount + poll
  useEffect(() => {
    fetchNotifications()
    const id = setInterval(fetchNotifications, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [fetchNotifications])

  // Auto-subscribe on mount if permission already granted
  useEffect(() => {
    if (user && isSupported && permission === 'granted' && !isSubscribed && !loading) {
      subscribe()
    }
  }, [user, isSupported, permission, isSubscribed]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current  && !menuRef.current.contains(e.target))  setShowUserMenu(false)
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleBellClick = () => {
    const opening = !showNotifMenu
    setShowNotifMenu(opening)
    if (opening) fetchNotifications() // refresh on open
  }

  const handleNotifClick = async (notif) => {
    // Mark as read
    if (!notif.is_read) {
      await api.markNotificationRead(notif.id).catch(() => {})
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: 1 } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
    // Navigate to the relevant panel
    const data = notif.data ? (typeof notif.data === 'string' ? JSON.parse(notif.data) : notif.data) : {}
    if (data.type === 'sales_order' && onNavigate) {
      onNavigate('SalesOrder')
    }
    setShowNotifMenu(false)
  }

  const handleMarkAllRead = async () => {
    await api.markAllNotificationsRead().catch(() => {})
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })))
    setUnreadCount(0)
  }

  const handleTogglePush = async () => {
    if (isSubscribed) await unsubscribe()
    else await subscribe()
  }

  const initials = (user?.name || user?.email || 'U').substring(0, 2).toUpperCase()

  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <i className="fas fa-circle"></i>
          </div>
          <span className={styles.logoText}>AccountPro</span>
        </div>
        <div className={styles.companyName}>{companyName || 'My Company'}</div>
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
        {/* ── Bell icon ──────────────────────────────────────── */}
        <div className={styles.notifWrapper} ref={notifRef}>
          <button
            className={styles.iconBtn}
            onClick={handleBellClick}
            title="Notifications"
          >
            <i className="fas fa-bell" />
          </button>

          {/* Unread count badge */}
          {unreadCount > 0 && (
            <div className={styles.notifCountBadge}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </div>
          )}

          {/* Notification dropdown */}
          {showNotifMenu && (
            <div className={styles.notifDropdown}>
              {/* Header row */}
              <div className={styles.notifDropdownHeader}>
                <span className={styles.notifDropdownTitle}>Notifications</span>
                {unreadCount > 0 && (
                  <button className={styles.markAllBtn} onClick={handleMarkAllRead}>
                    Mark all read
                  </button>
                )}
              </div>

              {/* Notification list */}
              <div className={styles.notifList}>
                {notifications.length === 0 ? (
                  <div className={styles.notifEmpty}>
                    <i className="fas fa-bell-slash" />
                    <span>No notifications yet</span>
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div
                      key={notif.id}
                      className={`${styles.notifItem} ${!notif.is_read ? styles.notifUnread : ''}`}
                      onClick={() => handleNotifClick(notif)}
                    >
                      <div className={styles.notifItemIcon}>
                        <i className={
                          notif.type === 'sales_order' ? 'fas fa-shopping-cart' : 'fas fa-bell'
                        } />
                      </div>
                      <div className={styles.notifItemContent}>
                        <div className={styles.notifItemTitle}>{notif.title}</div>
                        <div className={styles.notifItemBody}>{notif.body}</div>
                        <div className={styles.notifItemTime}>{timeAgo(notif.created_at)}</div>
                      </div>
                      {!notif.is_read && <div className={styles.notifDot} />}
                    </div>
                  ))
                )}
              </div>

              {/* Push subscription toggle at bottom */}
              {isSupported && (
                <div className={styles.notifPushRow}>
                  <i className={`fas fa-${isSubscribed ? 'bell' : 'bell-slash'}`} style={{ color: isSubscribed ? '#2CA01C' : '#94a3b8', fontSize: 13 }} />
                  <span className={styles.notifPushLabel}>
                    {isSubscribed ? 'Browser alerts on' : 'Browser alerts off'}
                  </span>
                  <button
                    className={styles.notifPushToggle}
                    onClick={handleTogglePush}
                    disabled={loading}
                  >
                    {loading ? '...' : isSubscribed ? 'Disable' : 'Enable'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── User avatar ────────────────────────────────────── */}
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
              {user?.role !== 'customer' && (
                <button className={styles.dropdownItem} onClick={() => { onOpenSettings?.(); setShowUserMenu(false) }}>
                  <i className="fas fa-cog" /> Company Settings
                </button>
              )}
              <button className={`${styles.dropdownItem} ${styles.dropdownSignOut}`} onClick={() => { setShowUserMenu(false); onLogout?.() }}>
                <i className="fas fa-sign-out-alt" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {user?.role !== 'customer' && (
        <button className={styles.mobileMenuToggle} onClick={onMenuToggle}>
          <i className="fas fa-bars"></i>
        </button>
      )}
    </header>
  )
}
