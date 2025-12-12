'use client'

import styles from './Header.module.css'

export default function Header({ onMenuToggle }) {
  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <i className="fas fa-circle"></i>
          </div>
          <span className={styles.logoText}>AccountPro</span>
        </div>
        <div className={styles.companyName}>My Company Inc.</div>
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

      <div className={styles.headerRight}>
        <button className={styles.iconBtn}>
          <i className="fas fa-user-circle"></i>
        </button>
        <button className={styles.iconBtn}>
          <i className="fas fa-clipboard-list"></i>
        </button>
        <button className={styles.iconBtn}>
          <i className="fas fa-comments"></i>
        </button>
        <button className={styles.iconBtn}>
          <i className="fas fa-bell"></i>
        </button>
        <button className={styles.iconBtn}>
          <i className="fas fa-cog"></i>
        </button>
        <button className={styles.iconBtn}>
          <i className="fas fa-question-circle"></i>
        </button>
      </div>

      <button className={styles.mobileMenuToggle} onClick={onMenuToggle}>
        <i className="fas fa-bars"></i>
      </button>
    </header>
  )
}
