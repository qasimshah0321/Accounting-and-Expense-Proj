'use client'

import { useState, useEffect } from 'react'
import styles from './CustomerPopup.module.css'
import * as api from '@/lib/api'

const emptyForm = {
  customerName: '',
  displayName: '',
  email: '',
  phone: '',
  mobile: '',
  website: '',
  billingAddress: '',
  billingCity: '',
  billingState: '',
  billingPostalCode: '',
  billingCountry: '',
  shippingAddress: '',
  shippingCity: '',
  shippingState: '',
  shippingPostalCode: '',
  shippingCountry: '',
  taxNumber: '',
  paymentTerms: 'Net 30',
  creditLimit: '',
  notes: '',
}

export default function CustomerPopup({ isOpen, onClose, onSave, editCustomer }) {
  const [formData, setFormData] = useState(emptyForm)
  const [sameAsShipping, setSameAsShipping] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (editCustomer) {
      setFormData({
        customerName: editCustomer.name || '',
        displayName: editCustomer.contact_person || '',
        email: editCustomer.email || '',
        phone: editCustomer.phone || '',
        mobile: editCustomer.mobile || '',
        website: editCustomer.website || '',
        billingAddress: editCustomer.billing_address || '',
        billingCity: editCustomer.billing_city || '',
        billingState: editCustomer.billing_state || '',
        billingPostalCode: editCustomer.billing_postal_code || '',
        billingCountry: editCustomer.billing_country || '',
        shippingAddress: editCustomer.shipping_address || '',
        shippingCity: editCustomer.shipping_city || '',
        shippingState: editCustomer.shipping_state || '',
        shippingPostalCode: editCustomer.shipping_postal_code || '',
        shippingCountry: editCustomer.shipping_country || '',
        taxNumber: editCustomer.tax_id || '',
        paymentTerms: api.numberToPaymentTerms(editCustomer.payment_terms),
        creditLimit: editCustomer.credit_limit ?? '',
        notes: editCustomer.notes || '',
      })
    } else {
      setFormData(emptyForm)
    }
    setSameAsShipping(false)
    setError('')
  }, [editCustomer, isOpen])

  if (!isOpen) return null

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSameAsShipping = (e) => {
    const checked = e.target.checked
    setSameAsShipping(checked)
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        shippingAddress: prev.billingAddress,
        shippingCity: prev.billingCity,
        shippingState: prev.billingState,
        shippingPostalCode: prev.billingPostalCode,
        shippingCountry: prev.billingCountry,
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const payload = {
      name: formData.customerName,
      contact_person: formData.displayName,
      email: formData.email,
      phone: formData.phone,
      mobile: formData.mobile,
      website: formData.website,
      billing_address: formData.billingAddress,
      billing_city: formData.billingCity,
      billing_state: formData.billingState,
      billing_postal_code: formData.billingPostalCode,
      billing_country: formData.billingCountry,
      shipping_address: formData.shippingAddress,
      shipping_city: formData.shippingCity,
      shipping_state: formData.shippingState,
      shipping_postal_code: formData.shippingPostalCode,
      shipping_country: formData.shippingCountry,
      tax_id: formData.taxNumber,
      payment_terms: api.paymentTermsToNumber(formData.paymentTerms),
      credit_limit: formData.creditLimit ? parseFloat(formData.creditLimit) : 0,
      notes: formData.notes,
    }
    try {
      let res
      if (editCustomer) {
        res = await api.updateCustomer(editCustomer.id, payload)
      } else {
        res = await api.createCustomer(payload)
      }
      const saved = res.data || res
      onSave(saved)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.popupOverlay} onClick={onClose}>
      <div className={styles.popupPanel} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.popupHeader}>
          <h2>{editCustomer ? 'Edit Customer' : 'Add New Customer'}</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Content */}
        <div className={styles.popupContent}>
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
              <i className="fas fa-exclamation-circle"></i> {error}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            {/* Basic Information */}
            <div className={styles.section}>
              <h3>Basic Information</h3>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Customer Name *</label>
                  <input type="text" name="customerName" className={styles.formControl} value={formData.customerName} onChange={handleChange} required />
                </div>
                <div className={styles.formGroup}>
                  <label>Display Name</label>
                  <input type="text" name="displayName" className={styles.formControl} value={formData.displayName} onChange={handleChange} />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Email</label>
                  <input type="email" name="email" className={styles.formControl} value={formData.email} onChange={handleChange} />
                </div>
                <div className={styles.formGroup}>
                  <label>Phone</label>
                  <input type="tel" name="phone" className={styles.formControl} value={formData.phone} onChange={handleChange} />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Mobile</label>
                  <input type="tel" name="mobile" className={styles.formControl} value={formData.mobile} onChange={handleChange} />
                </div>
                <div className={styles.formGroup}>
                  <label>Website</label>
                  <input type="text" name="website" className={styles.formControl} value={formData.website} onChange={handleChange} />
                </div>
              </div>
            </div>

            {/* Billing Address */}
            <div className={styles.section}>
              <h3>Billing Address</h3>
              <div className={styles.formGroup}>
                <label>Address</label>
                <input type="text" name="billingAddress" className={styles.formControl} value={formData.billingAddress} onChange={handleChange} />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>City</label>
                  <input type="text" name="billingCity" className={styles.formControl} value={formData.billingCity} onChange={handleChange} />
                </div>
                <div className={styles.formGroup}>
                  <label>State/Province</label>
                  <input type="text" name="billingState" className={styles.formControl} value={formData.billingState} onChange={handleChange} />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Postal Code</label>
                  <input type="text" name="billingPostalCode" className={styles.formControl} value={formData.billingPostalCode} onChange={handleChange} />
                </div>
                <div className={styles.formGroup}>
                  <label>Country</label>
                  <input type="text" name="billingCountry" className={styles.formControl} value={formData.billingCountry} onChange={handleChange} />
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className={styles.section}>
              <div className={styles.sectionHeaderWithCheckbox}>
                <h3>Shipping Address</h3>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={sameAsShipping} onChange={handleSameAsShipping} />
                  Same as Billing
                </label>
              </div>
              <div className={styles.formGroup}>
                <label>Address</label>
                <input type="text" name="shippingAddress" className={styles.formControl} value={formData.shippingAddress} onChange={handleChange} disabled={sameAsShipping} />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>City</label>
                  <input type="text" name="shippingCity" className={styles.formControl} value={formData.shippingCity} onChange={handleChange} disabled={sameAsShipping} />
                </div>
                <div className={styles.formGroup}>
                  <label>State/Province</label>
                  <input type="text" name="shippingState" className={styles.formControl} value={formData.shippingState} onChange={handleChange} disabled={sameAsShipping} />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Postal Code</label>
                  <input type="text" name="shippingPostalCode" className={styles.formControl} value={formData.shippingPostalCode} onChange={handleChange} disabled={sameAsShipping} />
                </div>
                <div className={styles.formGroup}>
                  <label>Country</label>
                  <input type="text" name="shippingCountry" className={styles.formControl} value={formData.shippingCountry} onChange={handleChange} disabled={sameAsShipping} />
                </div>
              </div>
            </div>

            {/* Additional Details */}
            <div className={styles.section}>
              <h3>Additional Details</h3>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Tax/VAT Number</label>
                  <input type="text" name="taxNumber" className={styles.formControl} value={formData.taxNumber} onChange={handleChange} />
                </div>
                <div className={styles.formGroup}>
                  <label>Payment Terms</label>
                  <select name="paymentTerms" className={styles.formControl} value={formData.paymentTerms} onChange={handleChange}>
                    <option>Net 15</option>
                    <option>Net 30</option>
                    <option>Net 60</option>
                    <option>Due on Receipt</option>
                  </select>
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Credit Limit</label>
                  <input type="number" name="creditLimit" className={styles.formControl} value={formData.creditLimit} onChange={handleChange} step="0.01" />
                </div>
                <div className={styles.formGroup}>
                  <label>Notes</label>
                  <textarea name="notes" className={styles.formControl} value={formData.notes} onChange={handleChange} rows="3"></textarea>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className={styles.popupFooter}>
          <button type="button" className={styles.btnCancel} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={styles.btnPrimary} onClick={handleSubmit} disabled={saving}>
            {saving ? <><i className="fas fa-spinner fa-spin"></i> Saving...</> : <><i className="fas fa-save"></i> {editCustomer ? 'Update Customer' : 'Save Customer'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}
