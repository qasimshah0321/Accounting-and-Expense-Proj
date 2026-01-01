'use client'

import { useState, useEffect } from 'react'
import styles from './TaxPopup.module.css'

export default function TaxPopup({ isOpen, onClose, onSave, editTax }) {
  const [formData, setFormData] = useState({
    taxName: '',
    taxRate: '',
    description: '',
    isDefault: false
  })

  useEffect(() => {
    if (editTax) {
      setFormData({
        taxName: editTax.name || '',
        taxRate: editTax.rate || '',
        description: editTax.description || '',
        isDefault: editTax.isDefault || false
      })
    } else {
      setFormData({
        taxName: '',
        taxRate: '',
        description: '',
        isDefault: false
      })
    }
  }, [editTax, isOpen])

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
    const taxData = {
      id: editTax?.id || Date.now(),
      name: formData.taxName,
      rate: parseFloat(formData.taxRate),
      description: formData.description,
      isDefault: formData.isDefault
    }
    onSave(taxData)
    // Reset form
    setFormData({
      taxName: '',
      taxRate: '',
      description: '',
      isDefault: false
    })
  }

  return (
    <div className={styles.popupOverlay} onClick={onClose}>
      <div className={styles.popupPanel} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.popupHeader}>
          <h2>{editTax ? 'Edit Tax' : 'Add New Tax'}</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Content */}
        <div className={styles.popupContent}>
          <form onSubmit={handleSubmit}>
            {/* Tax Information */}
            <div className={styles.section}>
              <h3>Tax Information</h3>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Tax Name *</label>
                  <input
                    type="text"
                    name="taxName"
                    className={styles.formControl}
                    value={formData.taxName}
                    onChange={handleChange}
                    placeholder="e.g., Sales Tax, VAT, GST"
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Tax Rate (%) *</label>
                  <input
                    type="number"
                    name="taxRate"
                    className={styles.formControl}
                    value={formData.taxRate}
                    onChange={handleChange}
                    placeholder="e.g., 10"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea
                  name="description"
                  className={styles.formControl}
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Optional description for this tax"
                ></textarea>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="isDefault"
                    checked={formData.isDefault}
                    onChange={handleChange}
                  />
                  <span>Set as default tax</span>
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
            {editTax ? 'Update Tax' : 'Save Tax'}
          </button>
        </div>
      </div>
    </div>
  )
}
