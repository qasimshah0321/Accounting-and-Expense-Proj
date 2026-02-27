'use client'

import { useState, useEffect } from 'react'
import styles from './TaxPopup.module.css'
import * as api from '@/lib/api'

export default function TaxPopup({ isOpen, onClose, onSave, editTax }) {
  const [formData, setFormData] = useState({ taxName: '', taxRate: '', description: '', isDefault: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (editTax) {
      setFormData({
        taxName: editTax.name || '',
        taxRate: editTax.rate ?? '',
        description: editTax.description || '',
        isDefault: editTax.is_default || false,
      })
    } else {
      setFormData({ taxName: '', taxRate: '', description: '', isDefault: false })
    }
    setError('')
  }, [editTax, isOpen])

  if (!isOpen) return null

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const payload = {
      name: formData.taxName,
      rate: parseFloat(formData.taxRate),
      description: formData.description,
      is_default: formData.isDefault,
    }
    try {
      let res
      if (editTax) {
        res = await api.updateTax(editTax.id, payload)
      } else {
        res = await api.createTax(payload)
      }
      const saved = res.data || res
      onSave(saved)
      setFormData({ taxName: '', taxRate: '', description: '', isDefault: false })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.popupOverlay} onClick={onClose}>
      <div className={styles.popupPanel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.popupHeader}>
          <h2>{editTax ? 'Edit Tax' : 'Add New Tax'}</h2>
          <button className={styles.closeBtn} onClick={onClose}><i className="fas fa-times"></i></button>
        </div>

        <div className={styles.popupContent}>
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
              <i className="fas fa-exclamation-circle"></i> {error}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className={styles.section}>
              <h3>Tax Information</h3>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Tax Name *</label>
                  <input type="text" name="taxName" className={styles.formControl} value={formData.taxName} onChange={handleChange} placeholder="e.g., Sales Tax, VAT, GST" required />
                </div>
                <div className={styles.formGroup}>
                  <label>Tax Rate (%) *</label>
                  <input type="number" name="taxRate" className={styles.formControl} value={formData.taxRate} onChange={handleChange} placeholder="e.g., 10" step="0.01" min="0" max="100" required />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea name="description" className={styles.formControl} value={formData.description} onChange={handleChange} rows="3" placeholder="Optional description for this tax"></textarea>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" name="isDefault" checked={formData.isDefault} onChange={handleChange} />
                  <span>Set as default tax</span>
                </label>
              </div>
            </div>
          </form>
        </div>

        <div className={styles.popupFooter}>
          <button type="button" className={styles.btnCancel} onClick={onClose}>Cancel</button>
          <button type="submit" className={styles.btnPrimary} onClick={handleSubmit} disabled={saving}>
            {saving ? <><i className="fas fa-spinner fa-spin"></i> Saving...</> : <><i className="fas fa-save"></i> {editTax ? 'Update Tax' : 'Save Tax'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}
