'use client'

import { useState, useEffect } from 'react'
import styles from './TaxPopup.module.css'
import * as api from '@/lib/api'

export default function ShipViaPopup({ isOpen, onClose, onSave, editShipVia }) {
  const [formData, setFormData] = useState({ shipViaName: '', description: '', isActive: true })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (editShipVia) {
      setFormData({
        shipViaName: editShipVia.name || '',
        description: editShipVia.description || '',
        isActive: editShipVia.is_active !== false,
      })
    } else {
      setFormData({ shipViaName: '', description: '', isActive: true })
    }
    setError('')
  }, [editShipVia, isOpen])

  if (!isOpen) return null

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const payload = { name: formData.shipViaName, description: formData.description, is_active: formData.isActive }
    try {
      let res
      if (editShipVia) {
        res = await api.updateShipVia(editShipVia.id, payload)
      } else {
        res = await api.createShipVia(payload)
      }
      const saved = res.data || res
      onSave(saved)
      setFormData({ shipViaName: '', description: '', isActive: true })
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
          <h2>{editShipVia ? 'Edit Ship Via' : 'Add New Ship Via'}</h2>
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
              <h3>Ship Via Information</h3>
              <div className={styles.formGroup}>
                <label>Ship Via Name *</label>
                <input type="text" name="shipViaName" className={styles.formControl} value={formData.shipViaName} onChange={handleChange} placeholder="e.g., FedEx, UPS, DHL" required />
              </div>
              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea name="description" className={styles.formControl} value={formData.description} onChange={handleChange} rows="3" placeholder="Optional description"></textarea>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} />
                  <span>Active (available for selection)</span>
                </label>
              </div>
            </div>
          </form>
        </div>

        <div className={styles.popupFooter}>
          <button type="button" className={styles.btnCancel} onClick={onClose}>Cancel</button>
          <button type="submit" className={styles.btnPrimary} onClick={handleSubmit} disabled={saving}>
            {saving ? <><i className="fas fa-spinner fa-spin"></i> Saving...</> : <><i className="fas fa-save"></i> {editShipVia ? 'Update Ship Via' : 'Save Ship Via'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}
