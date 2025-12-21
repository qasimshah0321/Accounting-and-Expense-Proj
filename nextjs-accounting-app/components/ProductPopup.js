'use client'

import { useState, useRef } from 'react'
import styles from './ProductPopup.module.css'

export default function ProductPopup({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
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
    preferredVendor: ''
  })

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

  const fileInputRef = useRef(null)

  if (!isOpen) return null

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          image: reader.result
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAddNewCategory = () => {
    const newCategory = prompt('Enter new category name:')
    if (newCategory && newCategory.trim()) {
      setCategories(prev => [...prev, newCategory.trim()])
      setFormData(prev => ({ ...prev, category: newCategory.trim() }))
      setShowCategoryDropdown(false)
    }
  }

  const handleAddNewClass = () => {
    const newClass = prompt('Enter new class name:')
    if (newClass && newClass.trim()) {
      setClasses(prev => [...prev, newClass.trim()])
      setFormData(prev => ({ ...prev, class: newClass.trim() }))
      setShowClassDropdown(false)
    }
  }

  const handleAddNewIncomeAccount = () => {
    const newAccount = prompt('Enter new income account name:')
    if (newAccount && newAccount.trim()) {
      setIncomeAccounts(prev => [...prev, newAccount.trim()])
      setFormData(prev => ({ ...prev, incomeAccount: newAccount.trim() }))
      setShowIncomeDropdown(false)
    }
  }

  const handleAddNewExpenseAccount = () => {
    const newAccount = prompt('Enter new expense account name:')
    if (newAccount && newAccount.trim()) {
      setExpenseAccounts(prev => [...prev, newAccount.trim()])
      setFormData(prev => ({ ...prev, expenseAccount: newAccount.trim() }))
      setShowExpenseDropdown(false)
    }
  }

  const handleAddNewVendor = () => {
    const newVendor = prompt('Enter new vendor name:')
    if (newVendor && newVendor.trim()) {
      setVendors(prev => [...prev, newVendor.trim()])
      setFormData(prev => ({ ...prev, preferredVendor: newVendor.trim() }))
      setShowVendorDropdown(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const newProduct = {
      id: Date.now(),
      name: formData.name,
      salesDescription: formData.salesDescription,
      qtyOnHand: 0,
      category: formData.category,
      sku: formData.sku,
      type: formData.itemType,
      price: parseFloat(formData.price) || 0,
      cost: parseFloat(formData.purchaseCost) || 0,
      ...formData
    }
    onSave(newProduct)
    // Reset form
    setFormData({
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
      preferredVendor: ''
    })
  }

  return (
    <div className={styles.popupOverlay} onClick={onClose}>
      <div className={styles.popupPanel} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.popupHeader}>
          <h2>Add New Product</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Content */}
        <div className={styles.popupContent}>
          <form onSubmit={handleSubmit}>
            {/* Basic Info */}
            <div className={styles.section}>
              <h3>Basic Info</h3>

              <div className={styles.nameImageRow}>
                {/* Name Field on Left */}
                <div className={styles.nameSection}>
                  <div className={styles.formGroup}>
                    <label>Name *</label>
                    <input
                      type="text"
                      name="name"
                      className={styles.formControl}
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                {/* Image Upload on Right */}
                <div className={styles.imageSection}>
                  <label>Image</label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className={styles.fileInput}
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                  <div
                    className={styles.imagePreviewLarge}
                    onClick={() => fileInputRef.current?.click()}
                    title="Click to upload image"
                  >
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

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Item Type</label>
                  <select
                    name="itemType"
                    className={styles.formControl}
                    value={formData.itemType}
                    onChange={handleChange}
                  >
                    <option>Services</option>
                    <option>Inventory item</option>
                    <option>Non-Inventory</option>
                    <option>Bundle</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Category</label>
                  <div className={styles.dropdownWrapper}>
                    <select
                      name="category"
                      className={styles.formControl}
                      value={formData.category}
                      onChange={handleChange}
                      onFocus={() => setShowCategoryDropdown(true)}
                      onBlur={() => setTimeout(() => setShowCategoryDropdown(false), 200)}
                    >
                      <option value="">Select Category</option>
                      {showCategoryDropdown && (
                        <option value="add_new" onClick={handleAddNewCategory}>+ Add New</option>
                      )}
                      {categories.map((cat, idx) => (
                        <option key={idx} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>SKU</label>
                  <input
                    type="text"
                    name="sku"
                    className={styles.formControl}
                    value={formData.sku}
                    onChange={handleChange}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Class</label>
                  <div className={styles.dropdownWrapper}>
                    <select
                      name="class"
                      className={styles.formControl}
                      value={formData.class}
                      onChange={handleChange}
                      onFocus={() => setShowClassDropdown(true)}
                      onBlur={() => setTimeout(() => setShowClassDropdown(false), 200)}
                    >
                      <option value="">Select Class</option>
                      {showClassDropdown && (
                        <option value="add_new" onClick={handleAddNewClass}>+ Add New</option>
                      )}
                      {classes.map((cls, idx) => (
                        <option key={idx} value={cls}>{cls}</option>
                      ))}
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
                  <input
                    type="checkbox"
                    name="sellToCustomer"
                    checked={formData.sellToCustomer}
                    onChange={handleChange}
                  />
                  I sell this service to my customer
                </label>
              </div>

              {formData.sellToCustomer && (
                <>
                  <div className={styles.formGroup}>
                    <label>Description</label>
                    <textarea
                      name="salesDescription"
                      className={styles.formControl}
                      value={formData.salesDescription}
                      onChange={handleChange}
                      rows="3"
                    ></textarea>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Price/Rate</label>
                      <input
                        type="number"
                        name="price"
                        className={styles.formControl}
                        value={formData.price}
                        onChange={handleChange}
                        step="0.01"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Income Account</label>
                      <div className={styles.dropdownWrapper}>
                        <select
                          name="incomeAccount"
                          className={styles.formControl}
                          value={formData.incomeAccount}
                          onChange={handleChange}
                          onFocus={() => setShowIncomeDropdown(true)}
                          onBlur={() => setTimeout(() => setShowIncomeDropdown(false), 200)}
                        >
                          <option value="">Select Income Account</option>
                          {showIncomeDropdown && (
                            <option value="add_new" onClick={handleAddNewIncomeAccount}>+ Add New</option>
                          )}
                          {incomeAccounts.map((acc, idx) => (
                            <option key={idx} value={acc}>{acc}</option>
                          ))}
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
                  <input
                    type="checkbox"
                    name="purchaseFromVendor"
                    checked={formData.purchaseFromVendor}
                    onChange={handleChange}
                  />
                  I purchase this service from a vendor
                </label>
              </div>

              {formData.purchaseFromVendor && (
                <>
                  <div className={styles.formGroup}>
                    <label>Purchase Description</label>
                    <textarea
                      name="purchaseDescription"
                      className={styles.formControl}
                      value={formData.purchaseDescription}
                      onChange={handleChange}
                      rows="3"
                    ></textarea>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Purchase Cost</label>
                      <input
                        type="number"
                        name="purchaseCost"
                        className={styles.formControl}
                        value={formData.purchaseCost}
                        onChange={handleChange}
                        step="0.01"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Expense Account</label>
                      <div className={styles.dropdownWrapper}>
                        <select
                          name="expenseAccount"
                          className={styles.formControl}
                          value={formData.expenseAccount}
                          onChange={handleChange}
                          onFocus={() => setShowExpenseDropdown(true)}
                          onBlur={() => setTimeout(() => setShowExpenseDropdown(false), 200)}
                        >
                          <option value="">Select Expense Account</option>
                          {showExpenseDropdown && (
                            <option value="add_new" onClick={handleAddNewExpenseAccount}>+ Add New</option>
                          )}
                          {expenseAccounts.map((acc, idx) => (
                            <option key={idx} value={acc}>{acc}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Preferred Vendor</label>
                    <div className={styles.dropdownWrapper}>
                      <select
                        name="preferredVendor"
                        className={styles.formControl}
                        value={formData.preferredVendor}
                        onChange={handleChange}
                        onFocus={() => setShowVendorDropdown(true)}
                        onBlur={() => setTimeout(() => setShowVendorDropdown(false), 200)}
                      >
                        <option value="">Select Vendor</option>
                        {showVendorDropdown && (
                          <option value="add_new" onClick={handleAddNewVendor}>+ Add New</option>
                        )}
                        {vendors.map((vendor, idx) => (
                          <option key={idx} value={vendor}>{vendor}</option>
                        ))}
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
          <button type="button" className={styles.btnCancel} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={styles.btnPrimary} onClick={handleSubmit}>
            <i className="fas fa-save"></i>
            Save Product
          </button>
        </div>
      </div>
    </div>
  )
}
