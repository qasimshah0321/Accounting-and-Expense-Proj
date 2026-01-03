'use client'

import { useState } from 'react'
import styles from './TaxConfiguration.module.css'
import ShipViaPopup from './ShipViaPopup'

export default function ShipViaConfiguration({ isOpen, onClose, shipVias, onShipViaUpdate }) {
  const [isShipViaPopupOpen, setIsShipViaPopupOpen] = useState(false)
  const [editingShipVia, setEditingShipVia] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  if (!isOpen) return null

  const filteredShipVias = shipVias.filter(shipVia =>
    shipVia.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAddShipViaClick = () => {
    setEditingShipVia(null)
    setIsShipViaPopupOpen(true)
  }

  const handleEditShipViaClick = (shipVia) => {
    setEditingShipVia(shipVia)
    setIsShipViaPopupOpen(true)
  }

  const handleShipViaPopupClose = () => {
    setIsShipViaPopupOpen(false)
    setEditingShipVia(null)
  }

  const handleShipViaSave = (shipViaData) => {
    if (editingShipVia) {
      // Update existing ship via
      const updatedShipVias = shipVias.map(s => s.id === shipViaData.id ? shipViaData : s)
      onShipViaUpdate(updatedShipVias)
    } else {
      // Add new ship via
      onShipViaUpdate([...shipVias, shipViaData])
    }
    setIsShipViaPopupOpen(false)
    setEditingShipVia(null)
  }

  const handleDeleteShipVia = (id) => {
    if (confirm('Are you sure you want to delete this shipping method?')) {
      const updatedShipVias = shipVias.filter(s => s.id !== id)
      onShipViaUpdate(updatedShipVias)
    }
  }

  const handleToggleActive = (id) => {
    const updatedShipVias = shipVias.map(s =>
      s.id === id ? { ...s, isActive: !s.isActive } : s
    )
    onShipViaUpdate(updatedShipVias)
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
        </div>

        {/* Ship Via Table */}
        <div className={styles.taxGridContainer}>
          {filteredShipVias.length > 0 ? (
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
                        <div className={styles.taxIcon}>
                          <i className="fas fa-shipping-fast"></i>
                        </div>
                        <span>{shipVia.name}</span>
                      </div>
                    </td>
                    <td>{shipVia.description || '-'}</td>
                    <td>
                      <button
                        className={`${styles.statusBadge} ${shipVia.isActive ? styles.statusActive : styles.statusInactive}`}
                        onClick={() => handleToggleActive(shipVia.id)}
                        title="Click to toggle status"
                      >
                        {shipVia.isActive ? (
                          <>
                            <i className="fas fa-check-circle"></i> Active
                          </>
                        ) : (
                          <>
                            <i className="fas fa-times-circle"></i> Inactive
                          </>
                        )}
                      </button>
                    </td>
                    <td>
                      <div className={styles.actionButtons}>
                        <button
                          className={styles.btnEdit}
                          title="Edit"
                          onClick={() => handleEditShipViaClick(shipVia)}
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          className={styles.btnDelete}
                          title="Delete"
                          onClick={() => handleDeleteShipVia(shipVia.id)}
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
