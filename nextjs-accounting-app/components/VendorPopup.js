'use client'

import { useState } from 'react'
import styles from './VendorPopup.module.css'

export default function VendorPopup({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    vendorName: '',
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
    notes: ''
  })

  const [sameAsShipping, setSameAsShipping] = useState(false)

  if (!isOpen) return null

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSameAsShipping = (e) => {
    const checked = e.target.checked
    setSameAsShipping(checked)

    if (checked) {
      setFormData(prev => ({
        ...prev,
        shippingAddress: prev.billingAddress,
        shippingCity: prev.billingCity,
        shippingState: prev.billingState,
        shippingPostalCode: prev.billingPostalCode,
        shippingCountry: prev.billingCountry
      }))
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const newVendor = {
      id: Date.now(),
      name: formData.vendorName,
      ...formData
    }
    onSave(newVendor)
    // Reset form
    setFormData({
      vendorName: '',
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
      notes: ''
    })
    setSameAsShipping(false)
  }

  return (
    <div className={styles.popupOverlay} onClick={onClose}>
      <div className={styles.popupPanel} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.popupHeader}>
          <h2>Add New</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Content */}
        <div className={styles.popupContent}>
          <form onSubmit={handleSubmit}>
            {/* Basic Information */}
            <div className={styles.section}>
              <h3>Basic Information</h3>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Vendor Name *</label>
                  <input
                    type="text"
                    name="vendorName"
                    className={styles.formControl}
                    value={formData.vendorName}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Display Name</label>
                  <input
                    type="text"
                    name="displayName"
                    className={styles.formControl}
                    value={formData.displayName}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    className={styles.formControl}
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    className={styles.formControl}
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Mobile</label>
                  <input
                    type="tel"
                    name="mobile"
                    className={styles.formControl}
                    value={formData.mobile}
                    onChange={handleChange}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Website</label>
                  <input
                    type="url"
                    name="website"
                    className={styles.formControl}
                    value={formData.website}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Billing Address */}
            <div className={styles.section}>
              <h3>Billing Address</h3>
              <div className={styles.formGroup}>
                <label>Address</label>
                <input
                  type="text"
                  name="billingAddress"
                  className={styles.formControl}
                  value={formData.billingAddress}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>City</label>
                  <input
                    type="text"
                    name="billingCity"
                    className={styles.formControl}
                    value={formData.billingCity}
                    onChange={handleChange}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>State/Province</label>
                  <input
                    type="text"
                    name="billingState"
                    className={styles.formControl}
                    value={formData.billingState}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Postal Code</label>
                  <input
                    type="text"
                    name="billingPostalCode"
                    className={styles.formControl}
                    value={formData.billingPostalCode}
                    onChange={handleChange}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Country</label>
                  <input
                    type="text"
                    name="billingCountry"
                    className={styles.formControl}
                    value={formData.billingCountry}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className={styles.section}>
              <div className={styles.sectionHeaderWithCheckbox}>
                <h3>Shipping Address</h3>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={sameAsShipping}
                    onChange={handleSameAsShipping}
                  />
                  Same as Billing
                </label>
              </div>

              <div className={styles.formGroup}>
                <label>Address</label>
                <input
                  type="text"
                  name="shippingAddress"
                  className={styles.formControl}
                  value={formData.shippingAddress}
                  onChange={handleChange}
                  disabled={sameAsShipping}
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>City</label>
                  <input
                    type="text"
                    name="shippingCity"
                    className={styles.formControl}
                    value={formData.shippingCity}
                    onChange={handleChange}
                    disabled={sameAsShipping}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>State/Province</label>
                  <input
                    type="text"
                    name="shippingState"
                    className={styles.formControl}
                    value={formData.shippingState}
                    onChange={handleChange}
                    disabled={sameAsShipping}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Postal Code</label>
                  <input
                    type="text"
                    name="shippingPostalCode"
                    className={styles.formControl}
                    value={formData.shippingPostalCode}
                    onChange={handleChange}
                    disabled={sameAsShipping}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Country</label>
                  <input
                    type="text"
                    name="shippingCountry"
                    className={styles.formControl}
                    value={formData.shippingCountry}
                    onChange={handleChange}
                    disabled={sameAsShipping}
                  />
                </div>
              </div>
            </div>

            {/* Additional Details */}
            <div className={styles.section}>
              <h3>Additional Details</h3>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Tax/VAT Number</label>
                  <input
                    type="text"
                    name="taxNumber"
                    className={styles.formControl}
                    value={formData.taxNumber}
                    onChange={handleChange}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Payment Terms</label>
                  <select
                    name="paymentTerms"
                    className={styles.formControl}
                    value={formData.paymentTerms}
                    onChange={handleChange}
                  >
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
                  <input
                    type="number"
                    name="creditLimit"
                    className={styles.formControl}
                    value={formData.creditLimit}
                    onChange={handleChange}
                    step="0.01"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Notes</label>
                  <textarea
                    name="notes"
                    className={styles.formControl}
                    value={formData.notes}
                    onChange={handleChange}
                    rows="3"
                  ></textarea>
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
          <button type="submit" className={styles.btnPrimary} onClick={handleSubmit}>
            <i className="fas fa-save"></i>
            Save Vendor
          </button>
        </div>
      </div>
    </div>
  )
}
