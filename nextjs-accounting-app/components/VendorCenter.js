'use client'

import { useState } from 'react'
import styles from './VendorCenter.module.css'
import VendorPopup from './VendorPopup'

export default function VendorCenter({ isOpen, onClose }) {
  const [vendors, setVendors] = useState([
    { id: 1, name: 'Tech Suppliers Inc', email: 'contact@techsuppliers.com', phone: '555-100-2000' },
    { id: 2, name: 'Office Solutions Ltd', email: 'info@officesolutions.com', phone: '555-200-3000' },
    { id: 3, name: 'Global Parts Co', email: 'sales@globalparts.com', phone: '555-300-4000' }
  ])

  const [isVendorPopupOpen, setIsVendorPopupOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  if (!isOpen) return null

  const filteredVendors = vendors.filter(vendor =>
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAddVendorClick = () => {
    setIsVendorPopupOpen(true)
  }

  const handleVendorPopupClose = () => {
    setIsVendorPopupOpen(false)
  }

  const handleVendorSave = (newVendor) => {
    setVendors(prev => [...prev, newVendor])
    setIsVendorPopupOpen(false)
  }

  return (
    <div className={styles.vendorCenterOverlay}>
      <div className={styles.vendorCenterContainer}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2>Vendor Center</h2>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.btnAddVendor} onClick={handleAddVendorClick}>
              <i className="fas fa-plus"></i>
              Add Vendor
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
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Vendor Grid Table */}
        <div className={styles.vendorGridContainer}>
          {filteredVendors.length > 0 ? (
            <table className={styles.vendorTable}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVendors.map((vendor) => (
                  <tr key={vendor.id}>
                    <td>
                      <div className={styles.nameCell}>
                        <div className={styles.vendorAvatar}>
                          <i className="fas fa-building"></i>
                        </div>
                        <span>{vendor.name}</span>
                      </div>
                    </td>
                    <td>{vendor.email || '-'}</td>
                    <td>{vendor.phone || '-'}</td>
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
              <i className="fas fa-building"></i>
              <h3>No vendors found</h3>
              <p>Try adjusting your search or add a new vendor</p>
            </div>
          )}
        </div>
      </div>

      {/* Vendor Creation Popup */}
      <VendorPopup
        isOpen={isVendorPopupOpen}
        onClose={handleVendorPopupClose}
        onSave={handleVendorSave}
      />
    </div>
  )
}
