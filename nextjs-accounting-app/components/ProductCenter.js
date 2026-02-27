'use client'

import { useState, useEffect, useCallback } from 'react'
import styles from './ProductCenter.module.css'
import ProductPopup from './ProductPopup'
import * as api from '@/lib/api'

export default function ProductCenter({ isOpen, onClose }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isProductPopupOpen, setIsProductPopupOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.getProducts(searchTerm)
      const list = res.data?.products || res.products || []
      setProducts(list)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [searchTerm])

  useEffect(() => {
    if (isOpen) fetchProducts()
  }, [isOpen, fetchProducts])

  if (!isOpen) return null

  const handleAddProductClick = () => {
    setEditingProduct(null)
    setIsProductPopupOpen(true)
  }

  const handleEditProduct = (product) => {
    setEditingProduct(product)
    setIsProductPopupOpen(true)
  }

  const handleProductPopupClose = () => {
    setIsProductPopupOpen(false)
    setEditingProduct(null)
  }

  const handleProductSave = (savedProduct) => {
    if (editingProduct) {
      setProducts((prev) => prev.map((p) => (p.id === savedProduct.id ? savedProduct : p)))
    } else {
      setProducts((prev) => [...prev, savedProduct])
    }
    setIsProductPopupOpen(false)
    setEditingProduct(null)
  }

  const handleDeleteProduct = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return
    try {
      await api.deleteProduct(id)
      setProducts((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      alert('Delete failed: ' + err.message)
    }
  }

  const filteredProducts = products.filter(
    (p) =>
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
          <button className={styles.btnRefresh} onClick={fetchProducts} title="Refresh">
            <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
          </button>
        </div>

        {error && (
          <div className={styles.errorBanner}>
            <i className="fas fa-exclamation-circle"></i> {error}
          </div>
        )}

        {/* Product Grid Table */}
        <div className={styles.productGridContainer}>
          {loading ? (
            <div className={styles.loadingState}>
              <i className="fas fa-spinner fa-spin"></i>
              <p>Loading products...</p>
            </div>
          ) : filteredProducts.length > 0 ? (
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
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} />
                          ) : (
                            <i className="fas fa-box"></i>
                          )}
                        </div>
                        <span>{product.name}</span>
                      </div>
                    </td>
                    <td>{product.description || '-'}</td>
                    <td className={styles.qtyCell}>{product.current_stock ?? 0}</td>
                    <td>{product.category || '-'}</td>
                    <td>{product.sku || '-'}</td>
                    <td>{api.productTypeToFrontend(product.product_type)}</td>
                    <td className={styles.priceCell}>${parseFloat(product.selling_price || 0).toFixed(2)}</td>
                    <td className={styles.costCell}>${parseFloat(product.cost_price || 0).toFixed(2)}</td>
                    <td>
                      <div className={styles.actionButtons}>
                        <button className={styles.btnEdit} title="Edit" onClick={() => handleEditProduct(product)}>
                          <i className="fas fa-edit"></i>
                        </button>
                        <button className={styles.btnDelete} title="Delete" onClick={() => handleDeleteProduct(product.id)}>
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

      {/* Product Creation / Edit Popup */}
      <ProductPopup
        isOpen={isProductPopupOpen}
        onClose={handleProductPopupClose}
        onSave={handleProductSave}
        editProduct={editingProduct}
      />
    </div>
  )
}
