'use client'

import { useState, useEffect, useCallback } from 'react'
import styles from './Invoice.module.css'
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
    <div className={styles.invoicePopupOverlay}>
      <div className={styles.invoicePopup} style={{ maxWidth: 640 }}>
        <div className={styles.popupHeader}>
          <h3>Company Settings</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className={styles.popupContent}>
          {loading && (
            <div className={styles.loadingState}><i className="fas fa-spinner fa-spin"></i> Loading...</div>
          )}

          {error && <div className={styles.errorBanner}>{error}</div>}
          {successMsg && <div style={{ background: '#dcfce7', color: '#166534', padding: '8px 16px', borderRadius: 6, marginBottom: 12 }}>{successMsg}</div>}

          {!loading && (
            <>
              <div className={styles.formGroup}>
                <label>Company Name</label>
                <input className={styles.formControlStandard} value={form.name}
                  onChange={e => handleChange('name', e.target.value)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className={styles.formGroup}>
                  <label>Email</label>
                  <input type="email" className={styles.formControlStandard} value={form.email}
                    onChange={e => handleChange('email', e.target.value)} />
                </div>
                <div className={styles.formGroup}>
                  <label>Phone</label>
                  <input className={styles.formControlStandard} value={form.phone}
                    onChange={e => handleChange('phone', e.target.value)} />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Address</label>
                <input className={styles.formControlStandard} value={form.address}
                  onChange={e => handleChange('address', e.target.value)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div className={styles.formGroup}>
                  <label>City</label>
                  <input className={styles.formControlStandard} value={form.city}
                    onChange={e => handleChange('city', e.target.value)} />
                </div>
                <div className={styles.formGroup}>
                  <label>State</label>
                  <input className={styles.formControlStandard} value={form.state}
                    onChange={e => handleChange('state', e.target.value)} />
                </div>
                <div className={styles.formGroup}>
                  <label>Postal Code</label>
                  <input className={styles.formControlStandard} value={form.postal_code}
                    onChange={e => handleChange('postal_code', e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className={styles.formGroup}>
                  <label>Country</label>
                  <input className={styles.formControlStandard} value={form.country}
                    onChange={e => handleChange('country', e.target.value)} />
                </div>
                <div className={styles.formGroup}>
                  <label>Currency</label>
                  <select className={styles.formControlStandard} value={form.currency}
                    onChange={e => handleChange('currency', e.target.value)}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className={styles.formGroup}>
                  <label>Website</label>
                  <input className={styles.formControlStandard} value={form.website}
                    onChange={e => handleChange('website', e.target.value)} placeholder="https://" />
                </div>
                <div className={styles.formGroup}>
                  <label>Tax ID / Registration No.</label>
                  <input className={styles.formControlStandard} value={form.tax_number}
                    onChange={e => handleChange('tax_number', e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
                <button className={styles.btnCancel} onClick={onClose}>Cancel</button>
                <button className={styles.btnPrimary} onClick={handleSave} disabled={saving}>
                  {saving ? <><i className="fas fa-spinner fa-spin"></i> Saving...</> : 'Save Settings'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
