'use client'

import { useState, useEffect, useCallback } from 'react'
import styles from './CompanySettings.module.css'
import * as api from '../lib/api'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'AED', 'PKR', 'INR', 'SGD']

const emptyProfile = {
  name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  postal_code: '',
  country: '',
  currency: 'USD',
  website: '',
  tax_number: '',
}

export default function CompanySettings({ isOpen, onClose, onCurrencyChange }) {
  const [form, setForm] = useState({ ...emptyProfile })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const loadProfile = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.getCompanyProfile()
      const data = res.data || {}
      setForm({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        postal_code: data.postal_code || '',
        country: data.country || '',
        currency: data.currency || 'USD',
        website: data.website || '',
        tax_number: data.tax_number || '',
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadProfile()
      setSuccessMsg('')
    }
  }, [isOpen, loadProfile])

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 4000)
      return () => clearTimeout(timer)
    }
  }, [successMsg])

  if (!isOpen) return null

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      await api.updateCompanyProfile(form)
      setSuccessMsg('Company settings saved')
      if (onCurrencyChange) onCurrencyChange(form.currency)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Company Settings</h2>
          <button className={styles.closeBtn} onClick={onClose}><i className="fas fa-times" /></button>
        </div>

        <div className={styles.body}>
          {loading && (
            <div className={styles.loadingState}><i className="fas fa-spinner fa-spin"></i> Loading...</div>
          )}

          {error && (
            <div className={`${styles.banner} ${styles.bannerError}`}>
              <i className="fas fa-times-circle" />
              {error}
            </div>
          )}
          {successMsg && (
            <div className={`${styles.banner} ${styles.bannerSuccess}`}>
              <i className="fas fa-check-circle" />
              {successMsg}
            </div>
          )}

          {!loading && (
            <>
              {/* Avatar + Company Identity */}
              <div className={styles.avatarSection}>
                <div className={styles.avatar}>
                  {(form.name || 'Z').substring(0, 2).toUpperCase()}
                  <div className={styles.avatarOverlay}><i className="fas fa-camera" /></div>
                </div>
                <div className={styles.avatarInfo}>
                  <h3>{form.name || 'Your Company'}</h3>
                  <p>Click avatar to change logo (coming soon)</p>
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <i className="fas fa-building" />
                  <span className={styles.sectionTitle}>Company Identity</span>
                </div>
                <div className={styles.fieldFull}>
                  <label>Company Name</label>
                  <input value={form.name || ''} onChange={e => handleChange('name', e.target.value)} placeholder="Your Company Name" />
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <i className="fas fa-phone" />
                  <span className={styles.sectionTitle}>Contact Details</span>
                </div>
                <div className={styles.grid3}>
                  <div className={styles.field}>
                    <label>Email</label>
                    <input type="email" value={form.email || ''} onChange={e => handleChange('email', e.target.value)} placeholder="contact@company.com" />
                  </div>
                  <div className={styles.field}>
                    <label>Phone</label>
                    <input value={form.phone || ''} onChange={e => handleChange('phone', e.target.value)} placeholder="+1 555-0100" />
                  </div>
                  <div className={styles.field}>
                    <label>Website</label>
                    <input value={form.website || ''} onChange={e => handleChange('website', e.target.value)} placeholder="www.company.com" />
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <i className="fas fa-map-marker-alt" />
                  <span className={styles.sectionTitle}>Address</span>
                </div>
                <div className={styles.fieldFull} style={{marginBottom:'12px'}}>
                  <label>Street Address</label>
                  <input value={form.address || ''} onChange={e => handleChange('address', e.target.value)} placeholder="123 Main Street" />
                </div>
                <div className={styles.grid3} style={{marginBottom:'12px'}}>
                  <div className={styles.field}>
                    <label>City</label>
                    <input value={form.city || ''} onChange={e => handleChange('city', e.target.value)} placeholder="New York" />
                  </div>
                  <div className={styles.field}>
                    <label>State</label>
                    <input value={form.state || ''} onChange={e => handleChange('state', e.target.value)} placeholder="NY" />
                  </div>
                  <div className={styles.field}>
                    <label>Postal Code</label>
                    <input value={form.postal_code || ''} onChange={e => handleChange('postal_code', e.target.value)} placeholder="10001" />
                  </div>
                </div>
                <div className={styles.fieldFull}>
                  <label>Country</label>
                  <input value={form.country || ''} onChange={e => handleChange('country', e.target.value)} placeholder="United States" />
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <i className="fas fa-dollar-sign" />
                  <span className={styles.sectionTitle}>Financial</span>
                </div>
                <div className={styles.grid2}>
                  <div className={styles.field}>
                    <label>Currency</label>
                    <select value={form.currency || 'USD'} onChange={e => handleChange('currency', e.target.value)}>
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label>Tax ID / Registration No.</label>
                    <input value={form.tax_number || ''} onChange={e => handleChange('tax_number', e.target.value)} placeholder="12-3456789" />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.btnCancel} onClick={onClose}>Cancel</button>
          <button className={styles.btnSave} onClick={handleSave} disabled={saving}>
            {saving ? <><i className="fas fa-spinner fa-spin" /> Saving...</> : <><i className="fas fa-save" /> Save Settings</>}
          </button>
        </div>
      </div>
    </div>
  )
}
