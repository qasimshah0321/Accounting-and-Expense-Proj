'use client'

import { useState, useRef, useEffect } from 'react'
import styles from './ProductPopup.module.css'
import * as api from '@/lib/api'

const emptyForm = {
  name: '',
  image: null,
  itemType: 'Services',
  category: '',
  sku: '',
  class: '',
  sellToCustomer: true,
  salesDescription: '',
  price: '',
  incomeAccount: '',
  purchaseFromVendor: false,
  purchaseDescription: '',
  purchaseCost: '',
  expenseAccount: '',
  preferredVendor: '',
}

export default function ProductPopup({ isOpen, onClose, onSave, editProduct }) {
  const [formData, setFormData] = useState(emptyForm)
  const [categories, setCategories] = useState(['Services', 'Products', 'Furniture', 'Software'])
  const [classes, setClasses] = useState(['Class A', 'Class B', 'Premium'])
  const [incomeAccounts, setIncomeAccounts] = useState(['Sales Revenue', 'Service Revenue', 'Other Income'])
  const [expenseAccounts, setExpenseAccounts] = useState(['Cost of Goods Sold', 'Operating Expenses', 'Purchase Expenses'])
  const [vendors, setVendors] = useState(['Tech Suppliers Inc', 'Office Solutions Ltd', 'Global Parts Co'])
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [showClassDropdown, setShowClassDropdown] = useState(false)
  const [showIncomeDropdown, setShowIncomeDropdown] = useState(false)
  const [showExpenseDropdown, setShowExpenseDropdown] = useState(false)
  const [showVendorDropdown, setShowVendorDropdown] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fileInputRef = useRef(null)

  useEffect(() => {
    if (editProduct) {
      setFormData({
        name: editProduct.name || '',
        image: editProduct.image_url || null,
        itemType: api.productTypeToFrontend(editProduct.product_type),
        category: editProduct.category || '',
        sku: editProduct.sku || '',
        class: editProduct.subcategory || '',
        sellToCustomer: editProduct.is_for_sale !== false,
        salesDescription: editProduct.description || '',
        price: editProduct.selling_price ?? '',
        incomeAccount: '',
        purchaseFromVendor: editProduct.is_for_purchase !== false,
        purchaseDescription: '',
        purchaseCost: editProduct.cost_price ?? '',
        expenseAccount: '',
        preferredVendor: '',
      })
    } else {
      setFormData(emptyForm)
    }
    setError('')
  }, [editProduct, isOpen])

  if (!isOpen) return null

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setFormData((prev) => ({ ...prev, image: reader.result }))
      reader.readAsDataURL(file)
    }
  }

  const handleAddNewCategory = () => {
    const n = prompt('Enter new category name:')
    if (n?.trim()) { setCategories((p) => [...p, n.trim()]); setFormData((p) => ({ ...p, category: n.trim() })); setShowCategoryDropdown(false) }
  }

  const handleAddNewClass = () => {
    const n = prompt('Enter new class name:')
    if (n?.trim()) { setClasses((p) => [...p, n.trim()]); setFormData((p) => ({ ...p, class: n.trim() })); setShowClassDropdown(false) }
  }

  const handleAddNewIncomeAccount = () => {
    const n = prompt('Enter new income account name:')
    if (n?.trim()) { setIncomeAccounts((p) => [...p, n.trim()]); setFormData((p) => ({ ...p, incomeAccount: n.trim() })); setShowIncomeDropdown(false) }
  }

  const handleAddNewExpenseAccount = () => {
    const n = prompt('Enter new expense account name:')
    if (n?.trim()) { setExpenseAccounts((p) => [...p, n.trim()]); setFormData((p) => ({ ...p, expenseAccount: n.trim() })); setShowExpenseDropdown(false) }
  }

  const handleAddNewVendor = () => {
    const n = prompt('Enter new vendor name:')
    if (n?.trim()) { setVendors((p) => [...p, n.trim()]); setFormData((p) => ({ ...p, preferredVendor: n.trim() })); setShowVendorDropdown(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    if (!formData.sku) {
      setError('SKU is required')
      setSaving(false)
      return
    }

    const payload = {
      name: formData.name,
      sku: formData.sku,
      description: formData.salesDescription,
      product_type: api.productTypeToBackend(formData.itemType),
      category: formData.category,
      subcategory: formData.class,
      selling_price: parseFloat(formData.price) || 0,
      cost_price: parseFloat(formData.purchaseCost) || 0,
      is_for_sale: formData.sellToCustomer,
      is_for_purchase: formData.purchaseFromVendor,
      is_active: true,
      track_inventory: formData.itemType === 'Inventory item',
    }

    try {
      let res
      if (editProduct) {
        res = await api.updateProduct(editProduct.id, payload)
      } else {
        res = await api.createProduct(payload)
      }
      const saved = res.data || res
      onSave(saved)
      setFormData(emptyForm)
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
          <h2>{editProduct ? 'Edit Product' : 'Add New Product'}</h2>
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
            {/* Basic Info */}
            <div className={styles.section}>
              <h3>Basic Info</h3>

              <div className={styles.nameImageRow}>
                <div className={styles.nameItemTypeSection}>
                  <div className={styles.formGroup}>
                    <label>Name *</label>
                    <input type="text" name="name" className={styles.formControl} value={formData.name} onChange={handleChange} required />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Item Type</label>
                    <select name="itemType" className={styles.formControl} value={formData.itemType} onChange={handleChange}>
                      <option>Services</option>
                      <option>Inventory item</option>
                      <option>Non-Inventory</option>
                    </select>
                  </div>
                </div>

                <div className={styles.imageSection}>
                  <label>Image</label>
                  <input type="file" ref={fileInputRef} className={styles.fileInput} accept="image/*" onChange={handleImageChange} />
                  <div className={styles.imagePreviewLarge} onClick={() => fileInputRef.current?.click()} title="Click to upload image">
                    {formData.image ? (
                      <img src={formData.image} alt="Product preview" />
                    ) : (
                      <div className={styles.imagePlaceholder}>
                        <i className="fas fa-upload"></i>
                        <span>Click to upload</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SKU Field */}
              <div className={styles.formGroup}>
                <label>SKU *</label>
                <input type="text" name="sku" className={styles.formControl} value={formData.sku} onChange={handleChange} required />
              </div>

              {/* Category and Class */}
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Category</label>
                  <div className={styles.dropdownWrapper}>
                    <select name="category" className={styles.formControl} value={formData.category} onChange={handleChange}
                      onFocus={() => setShowCategoryDropdown(true)} onBlur={() => setTimeout(() => setShowCategoryDropdown(false), 200)}>
                      <option value="">Select Category</option>
                      {showCategoryDropdown && <option value="add_new" onClick={handleAddNewCategory}>+ Add New</option>}
                      {categories.map((cat, idx) => <option key={idx} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label>Class</label>
                  <div className={styles.dropdownWrapper}>
                    <select name="class" className={styles.formControl} value={formData.class} onChange={handleChange}
                      onFocus={() => setShowClassDropdown(true)} onBlur={() => setTimeout(() => setShowClassDropdown(false), 200)}>
                      <option value="">Select Class</option>
                      {showClassDropdown && <option value="add_new" onClick={handleAddNewClass}>+ Add New</option>}
                      {classes.map((cls, idx) => <option key={idx} value={cls}>{cls}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Sales */}
            <div className={styles.section}>
              <h3>Sales</h3>
              <div className={styles.checkboxGroup}>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" name="sellToCustomer" checked={formData.sellToCustomer} onChange={handleChange} />
                  I sell this service to my customer
                </label>
              </div>
              {formData.sellToCustomer && (
                <>
                  <div className={styles.formGroup}>
                    <label>Description</label>
                    <textarea name="salesDescription" className={styles.formControl} value={formData.salesDescription} onChange={handleChange} rows="3"></textarea>
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Price/Rate</label>
                      <input type="number" name="price" className={styles.formControl} value={formData.price} onChange={handleChange} step="0.01" />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Income Account</label>
                      <div className={styles.dropdownWrapper}>
                        <select name="incomeAccount" className={styles.formControl} value={formData.incomeAccount} onChange={handleChange}
                          onFocus={() => setShowIncomeDropdown(true)} onBlur={() => setTimeout(() => setShowIncomeDropdown(false), 200)}>
                          <option value="">Select Income Account</option>
                          {showIncomeDropdown && <option value="add_new" onClick={handleAddNewIncomeAccount}>+ Add New</option>}
                          {incomeAccounts.map((acc, idx) => <option key={idx} value={acc}>{acc}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Purchasing */}
            <div className={styles.section}>
              <h3>Purchasing</h3>
              <div className={styles.checkboxGroup}>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" name="purchaseFromVendor" checked={formData.purchaseFromVendor} onChange={handleChange} />
                  I purchase this service from a vendor
                </label>
              </div>
              {formData.purchaseFromVendor && (
                <>
                  <div className={styles.formGroup}>
                    <label>Purchase Description</label>
                    <textarea name="purchaseDescription" className={styles.formControl} value={formData.purchaseDescription} onChange={handleChange} rows="3"></textarea>
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Purchase Cost</label>
                      <input type="number" name="purchaseCost" className={styles.formControl} value={formData.purchaseCost} onChange={handleChange} step="0.01" />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Expense Account</label>
                      <div className={styles.dropdownWrapper}>
                        <select name="expenseAccount" className={styles.formControl} value={formData.expenseAccount} onChange={handleChange}
                          onFocus={() => setShowExpenseDropdown(true)} onBlur={() => setTimeout(() => setShowExpenseDropdown(false), 200)}>
                          <option value="">Select Expense Account</option>
                          {showExpenseDropdown && <option value="add_new" onClick={handleAddNewExpenseAccount}>+ Add New</option>}
                          {expenseAccounts.map((acc, idx) => <option key={idx} value={acc}>{acc}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Preferred Vendor</label>
                    <div className={styles.dropdownWrapper}>
                      <select name="preferredVendor" className={styles.formControl} value={formData.preferredVendor} onChange={handleChange}
                        onFocus={() => setShowVendorDropdown(true)} onBlur={() => setTimeout(() => setShowVendorDropdown(false), 200)}>
                        <option value="">Select Vendor</option>
                        {showVendorDropdown && <option value="add_new" onClick={handleAddNewVendor}>+ Add New</option>}
                        {vendors.map((vendor, idx) => <option key={idx} value={vendor}>{vendor}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className={styles.popupFooter}>
          <button type="button" className={styles.btnCancel} onClick={onClose}>Cancel</button>
          <button type="submit" className={styles.btnPrimary} onClick={handleSubmit} disabled={saving}>
            {saving ? <><i className="fas fa-spinner fa-spin"></i> Saving...</> : <><i className="fas fa-save"></i> {editProduct ? 'Update Product' : 'Save Product'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}
