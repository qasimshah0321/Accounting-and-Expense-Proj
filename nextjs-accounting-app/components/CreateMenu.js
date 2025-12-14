'use client'

import styles from './CreateMenu.module.css'

const createMenuData = [
  {
    id: 'sales',
    title: 'Sales',
    icon: 'fa-shopping-cart',
    items: [
      { id: 'invoices', name: 'Invoices' },
      { id: 'delivery-notes', name: 'Delivery Notes' },
      { id: 'sales-order', name: 'Sales Order' },
      { id: 'estimates-quotations', name: 'Estimates/Quotations' },
      { id: 'sale-receipts', name: 'Sale Receipts' },
      { id: 'customer-payments', name: 'Customer Payments' },
      { id: 'refunds', name: 'Refunds' },
    ]
  },
  {
    id: 'purchases',
    title: 'Purchases',
    icon: 'fa-file-invoice-dollar',
    items: [
      { id: 'bills', name: 'Bills' },
      { id: 'expenses', name: 'Expenses' },
      { id: 'request-for-quotation', name: 'Request for Quotation' },
      { id: 'vendor-credits', name: 'Vendor Credits' },
      { id: 'bill-payments', name: 'Bill Payments' },
      { id: 'refunds-purchases', name: 'Refunds' },
    ]
  },
  {
    id: 'payments',
    title: 'Payments',
    icon: 'fa-credit-card',
    items: [
      { id: 'new-payment', name: 'New Payment' },
    ]
  },
  {
    id: 'customers',
    title: 'Customers',
    icon: 'fa-users',
    items: [
      { id: 'customer-center', name: 'Customer Center' },
      { id: 'customer-statements', name: 'Customer Statements' },
      { id: 'aging-account-receivables', name: 'Aging (Account Receivables)' },
      { id: 'credit-limits-terms', name: 'Credit Limits and Terms' },
      { id: 'customer-groups-segment', name: 'Customer Groups/Segment' },
      { id: 'customer-list', name: 'Customer List' },
      { id: 'document-attachments', name: 'Document & Attachments' },
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
