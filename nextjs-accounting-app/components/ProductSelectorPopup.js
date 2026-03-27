'use client'
import { useState, useEffect, useMemo } from 'react'
import styles from './ProductSelectorPopup.module.css'

export default function ProductSelectorPopup({ isOpen, onClose, products = [], onAdd, currencySymbol = '$' }) {
  const [search, setSearch] = useState('')
  const [quantities, setQuantities] = useState({})
  const [addedFlash, setAddedFlash] = useState({}) // productId → true for brief flash

  useEffect(() => {
    if (isOpen) {
      setSearch('')
      setQuantities({})
      setAddedFlash({})
    }
  }, [isOpen])

  const filtered = useMemo(() => {
    const active = products.filter(p => p.is_active !== false && p.is_for_sale !== false)
    if (!search.trim()) return active
    const q = search.toLowerCase()
    return active.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    )
  }, [products, search])

  const getQty = (id) => quantities[id] ?? 1

  const setQty = (id, val) => {
    const n = Math.max(1, parseInt(val) || 1)
    setQuantities(prev => ({ ...prev, [id]: n }))
  }

  const handleAdd = (product) => {
    onAdd(product, getQty(product.id))
    // flash feedback
    setAddedFlash(prev => ({ ...prev, [product.id]: true }))
    setTimeout(() => setAddedFlash(prev => ({ ...prev, [product.id]: false })), 800)
    // reset qty for this product
    setQuantities(prev => ({ ...prev, [product.id]: 1 }))
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2 className={styles.title}>Browse Products</h2>
            <span className={styles.count}>{filtered.length} products</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Search */}
        <div className={styles.searchBar}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by name, SKU, or category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          {search && (
            <button className={styles.clearSearch} onClick={() => setSearch('')}>✕</button>
          )}
        </div>

        {/* Column headers */}
        <div className={styles.listHeader}>
          <span className={styles.colThumb}></span>
          <span className={styles.colProduct}>Product</span>
          <span className={styles.colPrice}>Price</span>
          <span className={styles.colTargetPrice}>Target Price</span>
          <span className={styles.colQty}>Quantity</span>
          <span className={styles.colAction}></span>
        </div>

        {/* Product list */}
        <div className={styles.productList}>
          {filtered.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>📦</div>
              <p>No products found{search ? ` for "${search}"` : ''}</p>
            </div>
          ) : (
            filtered.map(p => (
              <div key={p.id} className={`${styles.productRow} ${addedFlash[p.id] ? styles.flashRow : ''}`}>
                <div className={styles.productThumb}>
                  {p.image_url
                    ? <img src={p.image_url} alt={p.name} className={styles.thumbImg} />
                    : <div className={styles.thumbPlaceholder}><i className="fas fa-box" /></div>
                  }
                </div>
                <div className={styles.productInfo}>
                  <div className={styles.productName}>{p.name}</div>
                  <div className={styles.productMeta}>
                    {p.sku && <span className={styles.skuTag}>{p.sku}</span>}
                    {p.category && <span className={styles.catTag}>{p.category}</span>}
                    {p.product_type && (
                      <span className={styles.typeTag}>{p.product_type}</span>
                    )}
                  </div>
                </div>

                <div className={styles.productPrice}>
                  {currencySymbol}{parseFloat(p.selling_price || 0).toFixed(2)}
                </div>

                <div className={styles.productTargetPrice}>
                  {currencySymbol}{parseFloat(p.target_price || 0).toFixed(2)}
                </div>

                <div className={styles.qtyControl}>
                  <button
                    className={styles.qtyBtn}
                    onClick={() => setQty(p.id, getQty(p.id) - 1)}
                  >−</button>
                  <input
                    type="number"
                    className={styles.qtyInput}
                    value={getQty(p.id)}
                    onChange={e => setQty(p.id, e.target.value)}
                    min="1"
                  />
                  <button
                    className={styles.qtyBtn}
                    onClick={() => setQty(p.id, getQty(p.id) + 1)}
                  >+</button>
                </div>

                <button
                  className={`${styles.addBtn} ${addedFlash[p.id] ? styles.addedBtn : ''}`}
                  onClick={() => handleAdd(p)}
                >
                  {addedFlash[p.id] ? '✓ Added' : '+ Add'}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <span className={styles.footerHint}>Products are added to your order — close when done</span>
          <button className={styles.doneBtn} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}
