'use client'

import { useState } from 'react'
import styles from './TaxConfiguration.module.css'
import TaxPopup from './TaxPopup'

export default function TaxConfiguration({ isOpen, onClose, taxes, onTaxUpdate }) {
  const [isTaxPopupOpen, setIsTaxPopupOpen] = useState(false)
  const [editingTax, setEditingTax] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  if (!isOpen) return null

  const filteredTaxes = taxes.filter(tax =>
    tax.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAddTaxClick = () => {
    setEditingTax(null)
    setIsTaxPopupOpen(true)
  }

  const handleEditTaxClick = (tax) => {
    setEditingTax(tax)
    setIsTaxPopupOpen(true)
  }

  const handleTaxPopupClose = () => {
    setIsTaxPopupOpen(false)
    setEditingTax(null)
  }

  const handleTaxSave = (taxData) => {
    if (editingTax) {
      // Update existing tax
      const updatedTaxes = taxes.map(t => t.id === taxData.id ? taxData : t)
      onTaxUpdate(updatedTaxes)
    } else {
      // Add new tax
      onTaxUpdate([...taxes, taxData])
    }
    setIsTaxPopupOpen(false)
    setEditingTax(null)
  }

  const handleDeleteTax = (id) => {
    if (confirm('Are you sure you want to delete this tax?')) {
      const updatedTaxes = taxes.filter(t => t.id !== id)
      onTaxUpdate(updatedTaxes)
    }
  }

  return (
    <div className={styles.taxConfigOverlay}>
      <div className={styles.taxConfigContainer}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2>Tax Configuration</h2>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.btnAddTax} onClick={handleAddTaxClick}>
              <i className="fas fa-plus"></i>
              Add Tax
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
              placeholder="Search taxes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Tax Table */}
        <div className={styles.taxGridContainer}>
          {filteredTaxes.length > 0 ? (
            <table className={styles.taxTable}>
              <thead>
                <tr>
                  <th>Tax Name</th>
                  <th>Rate (%)</th>
                  <th>Description</th>
                  <th>Default</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTaxes.map((tax) => (
                  <tr key={tax.id}>
                    <td>
                      <div className={styles.nameCell}>
                        <div className={styles.taxIcon}>
                          <i className="fas fa-percentage"></i>
                        </div>
                        <span>{tax.name}</span>
                      </div>
                    </td>
                    <td>{tax.rate}%</td>
                    <td>{tax.description || '-'}</td>
                    <td>
                      {tax.isDefault && (
                        <span className={styles.defaultBadge}>
                          <i className="fas fa-check-circle"></i> Default
                        </span>
                      )}
                    </td>
                    <td>
                      <div className={styles.actionButtons}>
                        <button
                          className={styles.btnEdit}
                          title="Edit"
                          onClick={() => handleEditTaxClick(tax)}
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          className={styles.btnDelete}
                          title="Delete"
                          onClick={() => handleDeleteTax(tax.id)}
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
              <i className="fas fa-percentage"></i>
              <p>No taxes found</p>
              <button className={styles.btnAddTax} onClick={handleAddTaxClick}>
                <i className="fas fa-plus"></i>
                Add Your First Tax
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tax Popup */}
      <TaxPopup
        isOpen={isTaxPopupOpen}
        onClose={handleTaxPopupClose}
        onSave={handleTaxSave}
        editTax={editingTax}
      />
    </div>
  )
}
