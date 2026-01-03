'use client'

import styles from './CreateMenu.module.css'

const createMenuData = [
  {
    id: 'sales',
    title: 'Sales',
    icon: 'fa-shopping-cart',
    items: [
      { id: 'invoices', name: 'Invoice' },
      { id: 'sales-order', name: 'Sales Order' },
      { id: 'delivery-notes', name: 'Delivery Note' },
      { id: 'estimates', name: 'Estimate' },
    ]
  },
  {
    id: 'purchases',
    title: 'Purchases',
    icon: 'fa-file-invoice-dollar',
    items: [
      { id: 'bills', name: 'Bill' },
      { id: 'expenses', name: 'Expense' },
      { id: 'purchase-order', name: 'Purchase Order' },
    ]
  },
  {
    id: 'payments',
    title: 'Payments',
    icon: 'fa-credit-card',
    items: [
      { id: 'receive-payment', name: 'Receive Payment' },
      { id: 'make-payment', name: 'Make Payment' },
    ]
  },
  {
    id: 'accounting',
    title: 'Accounting',
    icon: 'fa-calculator',
    items: [
      { id: 'journal-entry', name: 'Journal Entry' },
    ]
  },
]

export default function CreateMenu({ isOpen, onClose, onMenuClick }) {
  if (!isOpen) return null

  const handleItemClick = (itemName) => {
    onMenuClick(itemName)
    onClose()
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className={styles.createMenuOverlay} onClick={handleOverlayClick}>
      <div className={styles.createMenuModal}>
        <div className={styles.createMenuHeader}>
          <h3>Create New</h3>
          <button className={styles.closeCreateMenu} onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className={styles.createMenuContent}>
          {createMenuData.map((section, index) => (
            <div key={section.id}>
              {index > 0 && <div className={styles.createMenuDivider}></div>}
              <div className={styles.createMenuSection}>
                <div className={styles.createMenuTitle}>
                  <i className={`fas ${section.icon}`}></i>
                  <span>{section.title}</span>
                </div>
                <ul className={styles.createSubmenuList}>
                  {section.items.map((item) => (
                    <li
                      key={item.id}
                      className={styles.createSubmenuItem}
                      onClick={() => handleItemClick(item.name)}
                    >
                      {item.name}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
