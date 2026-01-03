'use client'

import { useState, useEffect } from 'react'
import styles from './TaxPopup.module.css'

export default function ShipViaPopup({ isOpen, onClose, onSave, editShipVia }) {
  const [formData, setFormData] = useState({
    shipViaName: '',
    description: '',
    isActive: true
  })

  useEffect(() => {
    if (editShipVia) {
      setFormData({
        shipViaName: editShipVia.name || '',
        description: editShipVia.description || '',
        isActive: editShipVia.isActive !== undefined ? editShipVia.isActive : true
      })
    } else {
      setFormData({
        shipViaName: '',
        description: '',
        isActive: true
      })
    }
  }, [editShipVia, isOpen])

  if (!isOpen) return null

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const shipViaData = {
      id: editShipVia?.id || Date.now(),
      name: formData.shipViaName,
      description: formData.description,
      isActive: formData.isActive
    }
    onSave(shipViaData)
    // Reset form
    setFormData({
      shipViaName: '',
      description: '',
      isActive: true
    })
  }

  return (
    <div className={styles.popupOverlay} onClick={onClose}>
      <div className={styles.popupPanel} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.popupHeader}>
          <h2>{editShipVia ? 'Edit Ship Via' : 'Add New Ship Via'}</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Content */}
        <div className={styles.popupContent}>
          <form onSubmit={handleSubmit}>
            {/* Ship Via Information */}
            <div className={styles.section}>
              <h3>Ship Via Information</h3>
              <div className={styles.formGroup}>
                <label>Ship Via Name *</label>
                <input
                  type="text"
                  name="shipViaName"
                  className={styles.formControl}
                  value={formData.shipViaName}
                  onChange={handleChange}
                  placeholder="e.g., FedEx, UPS, DHL, Ground Shipping"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea
                  name="description"
                  className={styles.formControl}
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Optional description for this shipping method"
                ></textarea>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                  />
                  <span>Active (available for selection)</span>
                </label>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className={styles.popupFooter}>
          <button type="button" className={styles.btnCancel} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={styles.btnPrimary} onClick={handleSubmit}>
            <i className="fas fa-save"></i>
            {editShipVia ? 'Update Ship Via' : 'Save Ship Via'}
          </button>
        </div>
      </div>
    </div>
  )
}
