'use client'

import styles from './Sidebar.module.css'

const menuItems = [
  { id: 'dashboard', name: 'Dashboard', icon: 'fa-th-large' },
  { id: 'sales', name: 'Sales', icon: 'fa-shopping-cart' },
  { id: 'customers', name: 'Customers', icon: 'fa-users' },
  { id: 'purchases', name: 'Purchases', icon: 'fa-file-invoice-dollar' },
  { id: 'vendors', name: 'Vendors', icon: 'fa-truck' },
  { id: 'reports', name: 'Reports', icon: 'fa-chart-line' },
  { id: 'settings', name: 'Settings', icon: 'fa-sliders-h' },
]

export default function Sidebar({ isOpen, activeMenu, onMenuClick }) {
  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.active : ''}`}>
      <div className={styles.sidebarHeader}>
        <button className={styles.createBtn}>
          <i className="fas fa-plus-circle"></i>
          <span>Create</span>
        </button>
      </div>

      <nav className={styles.sidebarNav}>
        <ul className={styles.menuList}>
          {menuItems.map((item) => (
            <li
              key={item.id}
              className={`${styles.menuItem} ${
                activeMenu === item.name ? styles.active : ''
              }`}
              onClick={() => onMenuClick(item.name)}
            >
              <i className={`fas ${item.icon}`}></i>
              <span>{item.name}</span>
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
