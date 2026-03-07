'use client'

import styles from './CreateMenu.module.css'

// permissionKey maps to the menu_name used in role_menu_permissions
const createMenuData = [
  {
    id: 'sales',
    title: 'Sales',
    icon: 'fa-shopping-cart',
    items: [
      { id: 'invoices', name: 'Invoice', permissionKey: 'Invoices' },
      { id: 'sales-order', name: 'Sales Order', permissionKey: 'Sales Order' },
      { id: 'delivery-notes', name: 'Delivery Note', permissionKey: 'Delivery Notes' },
      { id: 'estimates', name: 'Estimate', permissionKey: 'Estimates/Quotations' },
    ]
  },
  {
    id: 'purchases',
    title: 'Purchases',
    icon: 'fa-file-invoice-dollar',
    items: [
      { id: 'bills', name: 'Bill', permissionKey: 'Bills' },
      { id: 'expenses', name: 'Expense', permissionKey: 'Expenses' },
      { id: 'purchase-order', name: 'Purchase Order', permissionKey: 'Purchase Order' },
    ]
  },
  {
    id: 'payments',
    title: 'Payments',
    icon: 'fa-credit-card',
    items: [
      { id: 'receive-payment', name: 'Receive Payment', permissionKey: 'Customer Payments' },
      { id: 'make-payment', name: 'Make Payment', permissionKey: 'Bill Payments' },
    ]
  },
  {
    id: 'accounting',
    title: 'Accounting',
    icon: 'fa-calculator',
    items: [
      { id: 'journal-entry', name: 'Journal Entry', permissionKey: 'Journal Entries' },
    ]
  },
]

export default function CreateMenu({ isOpen, onClose, onMenuClick, permittedMenus }) {
  if (!isOpen) return null

  // Build lookup structures from permittedMenus (null = admin / full access)
  const allowed = permittedMenus ? new Set(permittedMenus.map(m => m.name)) : null
  const labels = Object.fromEntries((permittedMenus || []).map(m => [m.name, m.display_name]))

  const handleItemClick = (menuName) => {
    onMenuClick(menuName)
    onClose()
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // Filter sections and items by permissions
  const visibleSections = createMenuData
    .map(section => ({
      ...section,
      items: section.items.filter(item => !allowed || allowed.has(item.permissionKey)),
    }))
    .filter(section => section.items.length > 0)

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
          {visibleSections.map((section, index) => (
            <div key={section.id}>
              {index > 0 && <div className={styles.createMenuDivider}></div>}
              <div className={styles.createMenuSection}>
                <div className={styles.createMenuTitle}>
                  <i className={`fas ${section.icon}`}></i>
                  <span>{section.title}</span>
                </div>
                <ul className={styles.createSubmenuList}>
                  {section.items.map((item) => {
                    // Use the renamed label from permissions (e.g. "Orders" for customer)
                    const displayName = labels[item.permissionKey] || item.name
                    // onMenuClick uses the sidebar menu name to open the right panel
                    const menuName = item.permissionKey
                    return (
                      <li
                        key={item.id}
                        className={styles.createSubmenuItem}
                        onClick={() => handleItemClick(menuName)}
                      >
                        {displayName}
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
