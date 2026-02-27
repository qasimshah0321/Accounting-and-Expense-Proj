'use client'

import { useState, useEffect, useCallback } from 'react'
import styles from './VendorCenter.module.css'
import VendorPopup from './VendorPopup'
import * as api from '@/lib/api'

export default function VendorCenter({ isOpen, onClose }) {
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isVendorPopupOpen, setIsVendorPopupOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchVendors = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.getVendors(searchTerm)
      const list = res.data?.vendors || res.vendors || []
      setVendors(list)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [searchTerm])

  useEffect(() => {
    if (isOpen) fetchVendors()
  }, [isOpen, fetchVendors])

  if (!isOpen) return null

  const handleAddVendorClick = () => {
    setEditingVendor(null)
    setIsVendorPopupOpen(true)
  }

  const handleEditVendor = (vendor) => {
    setEditingVendor(vendor)
    setIsVendorPopupOpen(true)
  }

  const handleVendorPopupClose = () => {
    setIsVendorPopupOpen(false)
    setEditingVendor(null)
  }

  const handleVendorSave = (savedVendor) => {
    if (editingVendor) {
      setVendors((prev) => prev.map((v) => (v.id === savedVendor.id ? savedVendor : v)))
    } else {
      setVendors((prev) => [...prev, savedVendor])
    }
    setIsVendorPopupOpen(false)
    setEditingVendor(null)
  }

  const handleDeleteVendor = async (id) => {
    if (!confirm('Are you sure you want to delete this vendor?')) return
    try {
      await api.deleteVendor(id)
      setVendors((prev) => prev.filter((v) => v.id !== id))
    } catch (err) {
      alert('Delete failed: ' + err.message)
    }
  }

  const filteredVendors = vendors.filter(
    (v) =>
      v.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
          <button className={styles.btnRefresh} onClick={fetchVendors} title="Refresh">
            <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
          </button>
        </div>

        {error && (
          <div className={styles.errorBanner}>
            <i className="fas fa-exclamation-circle"></i> {error}
          </div>
        )}

        {/* Vendor Grid Table */}
        <div className={styles.vendorGridContainer}>
          {loading ? (
            <div className={styles.loadingState}>
              <i className="fas fa-spinner fa-spin"></i>
              <p>Loading vendors...</p>
            </div>
          ) : filteredVendors.length > 0 ? (
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
                        <button className={styles.btnEdit} title="Edit" onClick={() => handleEditVendor(vendor)}>
                          <i className="fas fa-edit"></i>
                        </button>
                        <button className={styles.btnDelete} title="Delete" onClick={() => handleDeleteVendor(vendor.id)}>
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
              <i className="fas fa-building"></i>
              <h3>No vendors found</h3>
              <p>Try adjusting your search or add a new vendor</p>
            </div>
          )}
        </div>
      </div>

      {/* Vendor Creation / Edit Popup */}
      <VendorPopup
        isOpen={isVendorPopupOpen}
        onClose={handleVendorPopupClose}
        onSave={handleVendorSave}
        editVendor={editingVendor}
      />
    </div>
  )
}
