'use client'

import { useState } from 'react'
import styles from './CustomerCenter.module.css'
import CustomerPopup from './CustomerPopup'

export default function CustomerCenter({ isOpen, onClose }) {
  const [customers, setCustomers] = useState([
    { id: 1, name: 'John Doe', email: 'john@example.com', phone: '123-456-7890' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', phone: '098-765-4321' },
    { id: 3, name: 'ABC Corporation', email: 'info@abc.com', phone: '555-123-4567' }
  ])

  const [isCustomerPopupOpen, setIsCustomerPopupOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  if (!isOpen) return null

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAddCustomerClick = () => {
    setIsCustomerPopupOpen(true)
  }

  const handleCustomerPopupClose = () => {
    setIsCustomerPopupOpen(false)
  }

  const handleCustomerSave = (newCustomer) => {
    setCustomers(prev => [...prev, newCustomer])
    setIsCustomerPopupOpen(false)
  }

  return (
    <div className={styles.customerCenterOverlay}>
      <div className={styles.customerCenterContainer}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2>Customer Center</h2>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.btnAddCustomer} onClick={handleAddCustomerClick}>
              <i className="fas fa-plus"></i>
              Add Customer
            </button>
            <button className={styles.closeBtn} onClick={onClose}>
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className={styles.searchSection}>
          <div className={styles.searchWrapper}>
            <i className="fas fa-search"></i>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Customer Grid Table */}
        <div className={styles.customerGridContainer}>
          {filteredCustomers.length > 0 ? (
            <table className={styles.customerTable}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <div className={styles.nameCell}>
                        <div className={styles.customerAvatar}>
                          <i className="fas fa-user"></i>
                        </div>
                        <span>{customer.name}</span>
                      </div>
                    </td>
                    <td>{customer.email || '-'}</td>
                    <td>{customer.phone || '-'}</td>
                    <td>
                      <div className={styles.actionButtons}>
                        <button className={styles.btnEdit} title="Edit">
                          <i className="fas fa-edit"></i>
                        </button>
                        <button className={styles.btnView} title="View">
                          <i className="fas fa-eye"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className={styles.emptyState}>
              <i className="fas fa-users"></i>
              <h3>No customers found</h3>
              <p>Try adjusting your search or add a new customer</p>
            </div>
          )}
        </div>
      </div>

      {/* Customer Creation Popup */}
      <CustomerPopup
        isOpen={isCustomerPopupOpen}
        onClose={handleCustomerPopupClose}
        onSave={handleCustomerSave}
      />
    </div>
  )
}
