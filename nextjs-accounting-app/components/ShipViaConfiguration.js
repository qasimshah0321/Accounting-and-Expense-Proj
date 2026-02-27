'use client'

import { useState, useEffect } from 'react'
import styles from './TaxConfiguration.module.css'
import ShipViaPopup from './ShipViaPopup'
import * as api from '@/lib/api'

export default function ShipViaConfiguration({ isOpen, onClose, onShipViasLoaded }) {
  const [shipVias, setShipVias] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isShipViaPopupOpen, setIsShipViaPopupOpen] = useState(false)
  const [editingShipVia, setEditingShipVia] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchShipVias = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.getShipVias()
      const list = res.data || []
      setShipVias(list)
      if (onShipViasLoaded) onShipViasLoaded(list)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) fetchShipVias()
  }, [isOpen])

  if (!isOpen) return null

  const filteredShipVias = shipVias.filter((s) => s.name?.toLowerCase().includes(searchTerm.toLowerCase()))

  const handleAddShipViaClick = () => { setEditingShipVia(null); setIsShipViaPopupOpen(true) }
  const handleEditShipViaClick = (s) => { setEditingShipVia(s); setIsShipViaPopupOpen(true) }
  const handleShipViaPopupClose = () => { setIsShipViaPopupOpen(false); setEditingShipVia(null) }

  const handleShipViaSave = (saved) => {
    setShipVias((prev) => {
      const updated = editingShipVia
        ? prev.map((s) => (s.id === saved.id ? saved : s))
        : [...prev, saved]
      if (onShipViasLoaded) onShipViasLoaded(updated)
      return updated
    })
    setIsShipViaPopupOpen(false)
    setEditingShipVia(null)
  }

  const handleDeleteShipVia = async (id) => {
    if (!confirm('Are you sure you want to delete this shipping method?')) return
    try {
      await api.deleteShipVia(id)
      setShipVias((prev) => {
        const updated = prev.filter((s) => s.id !== id)
        if (onShipViasLoaded) onShipViasLoaded(updated)
        return updated
      })
    } catch (err) {
      alert('Delete failed: ' + err.message)
    }
  }

  const handleToggleActive = async (id) => {
    try {
      const res = await api.toggleShipViaActive(id)
      const updated_item = res.data || res
      setShipVias((prev) => {
        const updated = prev.map((s) => (s.id === id ? { ...s, is_active: updated_item.is_active } : s))
        if (onShipViasLoaded) onShipViasLoaded(updated)
        return updated
      })
    } catch (err) {
      alert('Toggle failed: ' + err.message)
    }
  }

  return (
    <div className={styles.taxConfigOverlay}>
      <div className={styles.taxConfigContainer}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2>Ship Via Configuration</h2>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.btnAddTax} onClick={handleAddShipViaClick}>
              <i className="fas fa-plus"></i>
              Add Ship Via
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
              placeholder="Search shipping methods..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className={styles.btnRefresh} onClick={fetchShipVias} title="Refresh">
            <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
          </button>
        </div>

        {error && (
          <div className={styles.errorBanner}>
            <i className="fas fa-exclamation-circle"></i> {error}
          </div>
        )}

        {/* Ship Via Table */}
        <div className={styles.taxGridContainer}>
          {loading ? (
            <div className={styles.loadingState}>
              <i className="fas fa-spinner fa-spin"></i>
              <p>Loading shipping methods...</p>
            </div>
          ) : filteredShipVias.length > 0 ? (
            <table className={styles.taxTable}>
              <thead>
                <tr>
                  <th>Ship Via Name</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredShipVias.map((shipVia) => (
                  <tr key={shipVia.id}>
                    <td>
                      <div className={styles.nameCell}>
                        <div className={styles.taxIcon}><i className="fas fa-shipping-fast"></i></div>
                        <span>{shipVia.name}</span>
                      </div>
                    </td>
                    <td>{shipVia.description || '-'}</td>
                    <td>
                      <button
                        className={`${styles.statusBadge} ${shipVia.is_active ? styles.statusActive : styles.statusInactive}`}
                        onClick={() => handleToggleActive(shipVia.id)}
                        title="Click to toggle status"
                      >
                        {shipVia.is_active ? (
                          <><i className="fas fa-check-circle"></i> Active</>
                        ) : (
                          <><i className="fas fa-times-circle"></i> Inactive</>
                        )}
                      </button>
                    </td>
                    <td>
                      <div className={styles.actionButtons}>
                        <button className={styles.btnEdit} title="Edit" onClick={() => handleEditShipViaClick(shipVia)}>
                          <i className="fas fa-edit"></i>
                        </button>
                        <button className={styles.btnDelete} title="Delete" onClick={() => handleDeleteShipVia(shipVia.id)}>
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
              <i className="fas fa-shipping-fast"></i>
              <p>No shipping methods found</p>
              <button className={styles.btnAddTax} onClick={handleAddShipViaClick}>
                <i className="fas fa-plus"></i>
                Add Your First Shipping Method
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Ship Via Popup */}
      <ShipViaPopup
        isOpen={isShipViaPopupOpen}
        onClose={handleShipViaPopupClose}
        onSave={handleShipViaSave}
        editShipVia={editingShipVia}
      />
    </div>
  )
}
