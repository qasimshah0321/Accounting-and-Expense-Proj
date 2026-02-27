'use client'

import { useState, useEffect, useCallback } from 'react'
import styles from './CustomerCenter.module.css'
import CustomerPopup from './CustomerPopup'
import * as api from '@/lib/api'

export default function CustomerCenter({ isOpen, onClose }) {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isCustomerPopupOpen, setIsCustomerPopupOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.getCustomers(searchTerm)
      const list = res.data?.customers || res.customers || []
      setCustomers(list)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [searchTerm])

  useEffect(() => {
    if (isOpen) fetchCustomers()
  }, [isOpen, fetchCustomers])

  if (!isOpen) return null

  const handleAddCustomerClick = () => {
    setEditingCustomer(null)
    setIsCustomerPopupOpen(true)
  }

  const handleEditCustomer = (customer) => {
    setEditingCustomer(customer)
    setIsCustomerPopupOpen(true)
  }

  const handleCustomerPopupClose = () => {
    setIsCustomerPopupOpen(false)
    setEditingCustomer(null)
  }

  const handleCustomerSave = (savedCustomer) => {
    if (editingCustomer) {
      setCustomers((prev) => prev.map((c) => (c.id === savedCustomer.id ? savedCustomer : c)))
    } else {
      setCustomers((prev) => [...prev, savedCustomer])
    }
    setIsCustomerPopupOpen(false)
    setEditingCustomer(null)
  }

  const handleDeleteCustomer = async (id) => {
    if (!confirm('Are you sure you want to delete this customer?')) return
    try {
      await api.deleteCustomer(id)
      setCustomers((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      alert('Delete failed: ' + err.message)
    }
  }

  const filteredCustomers = customers.filter(
    (c) =>
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
          <button className={styles.btnRefresh} onClick={fetchCustomers} title="Refresh">
            <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
          </button>
        </div>

        {error && (
          <div className={styles.errorBanner}>
            <i className="fas fa-exclamation-circle"></i> {error}
          </div>
        )}

        {/* Customer Grid Table */}
        <div className={styles.customerGridContainer}>
          {loading ? (
            <div className={styles.loadingState}>
              <i className="fas fa-spinner fa-spin"></i>
              <p>Loading customers...</p>
            </div>
          ) : filteredCustomers.length > 0 ? (
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
                        <button
                          className={styles.btnEdit}
                          title="Edit"
                          onClick={() => handleEditCustomer(customer)}
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          className={styles.btnDelete}
                          title="Delete"
                          onClick={() => handleDeleteCustomer(customer.id)}
                        >
                          <i className="fas fa-trash"></i>
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

      {/* Customer Creation / Edit Popup */}
      <CustomerPopup
        isOpen={isCustomerPopupOpen}
        onClose={handleCustomerPopupClose}
        onSave={handleCustomerSave}
        editCustomer={editingCustomer}
      />
    </div>
  )
}
