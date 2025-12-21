'use client'

import { useState } from 'react'
import styles from './ProductCenter.module.css'
import ProductPopup from './ProductPopup'

export default function ProductCenter({ isOpen, onClose }) {
  const [products, setProducts] = useState([
    { id: 1, name: 'Consulting Service', salesDescription: 'Business consulting', qtyOnHand: 0, category: 'Services', sku: 'CONS-001', type: 'Services', price: 150.00, cost: 0, image: null },
    { id: 2, name: 'Office Chair', salesDescription: 'Ergonomic office chair', qtyOnHand: 25, category: 'Furniture', sku: 'FURN-001', type: 'Inventory item', price: 299.99, cost: 150.00, image: null },
    { id: 3, name: 'Software License', salesDescription: 'Annual software subscription', qtyOnHand: 100, category: 'Software', sku: 'SOFT-001', type: 'Non-Inventory', price: 999.00, cost: 500.00, image: null }
  ])

  const [isProductPopupOpen, setIsProductPopupOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  if (!isOpen) return null

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAddProductClick = () => {
    setIsProductPopupOpen(true)
  }

  const handleProductPopupClose = () => {
    setIsProductPopupOpen(false)
  }

  const handleProductSave = (newProduct) => {
    setProducts(prev => [...prev, newProduct])
    setIsProductPopupOpen(false)
  }

  const handleDeleteProduct = (id) => {
    if (confirm('Are you sure you want to delete this product?')) {
      setProducts(products.filter(product => product.id !== id))
    }
  }

  return (
    <div className={styles.productCenterOverlay}>
      <div className={styles.productCenterContainer}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2>Product Center</h2>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.btnAddProduct} onClick={handleAddProductClick}>
              <i className="fas fa-plus"></i>
              Add Product
            </button>
            <button className={styles.closeBtn} onClick={onClose}>
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className={styles.searchSection}>
          <div className={styles.searchWrapper}>
            <i className="fas fa-search"></i>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Product Grid Table */}
        <div className={styles.productGridContainer}>
          {filteredProducts.length > 0 ? (
            <table className={styles.productTable}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Sales Description</th>
                  <th>QTY ON Hand</th>
                  <th>Category</th>
                  <th>SKU</th>
                  <th>TYPE</th>
                  <th>PRICE</th>
                  <th>COST</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className={styles.nameCell}>
                        <div className={styles.productImage}>
                          {product.image ? (
                            <img src={product.image} alt={product.name} />
                          ) : (
                            <i className="fas fa-box"></i>
                          )}
                        </div>
                        <span>{product.name}</span>
                      </div>
                    </td>
                    <td>{product.salesDescription || '-'}</td>
                    <td className={styles.qtyCell}>{product.qtyOnHand}</td>
                    <td>{product.category || '-'}</td>
                    <td>{product.sku || '-'}</td>
                    <td>{product.type}</td>
                    <td className={styles.priceCell}>${product.price.toFixed(2)}</td>
                    <td className={styles.costCell}>${product.cost.toFixed(2)}</td>
                    <td>
                      <div className={styles.actionButtons}>
                        <button className={styles.btnEdit} title="Edit">
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          className={styles.btnDelete}
                          title="Delete"
                          onClick={() => handleDeleteProduct(product.id)}
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className={styles.emptyState}>
              <i className="fas fa-box-open"></i>
              <h3>No products found</h3>
              <p>Try adjusting your search or add a new product</p>
            </div>
          )}
        </div>
      </div>

      {/* Product Creation Popup */}
      <ProductPopup
        isOpen={isProductPopupOpen}
        onClose={handleProductPopupClose}
        onSave={handleProductSave}
      />
    </div>
  )
}
