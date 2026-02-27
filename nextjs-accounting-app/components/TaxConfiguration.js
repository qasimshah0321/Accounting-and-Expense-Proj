'use client'

import { useState, useEffect } from 'react'
import styles from './TaxConfiguration.module.css'
import TaxPopup from './TaxPopup'
import * as api from '@/lib/api'

export default function TaxConfiguration({ isOpen, onClose, onTaxesLoaded }) {
  const [taxes, setTaxes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isTaxPopupOpen, setIsTaxPopupOpen] = useState(false)
  const [editingTax, setEditingTax] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchTaxes = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.getTaxes()
      const list = res.data || []
      setTaxes(list)
      if (onTaxesLoaded) onTaxesLoaded(list)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) fetchTaxes()
  }, [isOpen])

  if (!isOpen) return null

  const filteredTaxes = taxes.filter((t) => t.name?.toLowerCase().includes(searchTerm.toLowerCase()))

  const handleAddTaxClick = () => { setEditingTax(null); setIsTaxPopupOpen(true) }

  const handleEditTaxClick = (tax) => { setEditingTax(tax); setIsTaxPopupOpen(true) }

  const handleTaxPopupClose = () => { setIsTaxPopupOpen(false); setEditingTax(null) }

  const handleTaxSave = (savedTax) => {
    setTaxes((prev) => {
      const updated = editingTax
        ? prev.map((t) => (t.id === savedTax.id ? savedTax : t))
        : [...prev, savedTax]
      if (onTaxesLoaded) onTaxesLoaded(updated)
      return updated
    })
    setIsTaxPopupOpen(false)
    setEditingTax(null)
  }

  const handleDeleteTax = async (id) => {
    if (!confirm('Are you sure you want to delete this tax?')) return
    try {
      await api.deleteTax(id)
      setTaxes((prev) => {
        const updated = prev.filter((t) => t.id !== id)
        if (onTaxesLoaded) onTaxesLoaded(updated)
        return updated
      })
    } catch (err) {
      alert('Delete failed: ' + err.message)
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
          <button className={styles.btnRefresh} onClick={fetchTaxes} title="Refresh">
            <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
          </button>
        </div>

        {error && (
          <div className={styles.errorBanner}>
            <i className="fas fa-exclamation-circle"></i> {error}
          </div>
        )}

        {/* Tax Table */}
        <div className={styles.taxGridContainer}>
          {loading ? (
            <div className={styles.loadingState}>
              <i className="fas fa-spinner fa-spin"></i>
              <p>Loading taxes...</p>
            </div>
          ) : filteredTaxes.length > 0 ? (
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
                        <div className={styles.taxIcon}><i className="fas fa-percentage"></i></div>
                        <span>{tax.name}</span>
                      </div>
                    </td>
                    <td>{tax.rate}%</td>
                    <td>{tax.description || '-'}</td>
                    <td>
                      {tax.is_default && (
                        <span className={styles.defaultBadge}>
                          <i className="fas fa-check-circle"></i> Default
                        </span>
                      )}
                    </td>
                    <td>
                      <div className={styles.actionButtons}>
                        <button className={styles.btnEdit} title="Edit" onClick={() => handleEditTaxClick(tax)}>
                          <i className="fas fa-edit"></i>
                        </button>
                        <button className={styles.btnDelete} title="Delete" onClick={() => handleDeleteTax(tax.id)}>
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
