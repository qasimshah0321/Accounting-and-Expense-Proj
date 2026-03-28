'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './Invoice.module.css'
import CustomerPopup from './CustomerPopup'
import TaxPopup from './TaxPopup'
import ProductSelectorPopup from './ProductSelectorPopup'
import * as api from '../lib/api'

export default function SalesOrder({ isOpen, onClose, taxes, onTaxUpdate, onDirtyChange = () => {}, user, currencySymbol = '$', sidebarCollapsed = false, companyProfile = null }) {
  // ─── List state ───────────────────────────────────────────────────────────
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingOrder, setEditingOrder] = useState(null)
  const [viewMode, setViewMode] = useState(false)

  // ─── Form state ───────────────────────────────────────────────────────────
  const [lineItems, setLineItems] = useState([
    { id: 1, sku: '', description: '', quantity: 1, rate: 0, amount: 0 }
  ])
  const [customers, setCustomers] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState(null)
  const [customerSearchText, setCustomerSearchText] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [isCustomerPopupOpen, setIsCustomerPopupOpen] = useState(false)
  const [salesOrderDate, setSalesOrderDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [poNumber, setPoNumber] = useState('')
  const [billTo, setBillTo] = useState('')
  const [shipTo, setShipTo] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedTax, setSelectedTax] = useState(null)
  const [isTaxPopupOpen, setIsTaxPopupOpen] = useState(false)
  const [showTaxDropdown, setShowTaxDropdown] = useState(false)
  const [orderNo, setOrderNo] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [products, setProducts] = useState([])
  const [activeItemId, setActiveItemId] = useState(null)
  const [activeField, setActiveField] = useState(null)

  // ─── Product Selector Popup ───────────────────────────────────────────────
  const [showProductSelector, setShowProductSelector] = useState(false)

  // ─── Estimate Picker state ────────────────────────────────────────────────
  const [showEstimatePicker, setShowEstimatePicker] = useState(false)
  const [estimatePickerItems, setEstimatePickerItems] = useState([])
  const [estimatePickerLoading, setEstimatePickerLoading] = useState(false)

  const autocompleteRef = useRef(null)
  const taxDropdownRef = useRef(null)

  // ─── Data loading ─────────────────────────────────────────────────────────
  const loadOrders = useCallback(async () => {
    setLoading(true)
    setListError('')
    try {
      const res = await api.getSalesOrders()
      setOrders(res.data?.sales_orders || res.data?.orders || res.data || [])
    } catch (err) {
      setListError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadCustomers = useCallback(async () => {
    try {
      const res = await api.getCustomers()
      setCustomers(res.data?.customers || res.customers || [])
    } catch {}
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadOrders()
      loadCustomers()
      api.getProducts().then(res => {
        const prods = res.data?.products || res.products || []
        setProducts(prods)
        // Customer role: auto-open new order form + product selector
        if (user?.role === 'customer') {
          setShowForm(true)
          setEditingOrder(null)
          if (user?.linked_customer_id) {
            setSelectedCustomer(user.linked_customer_name || '')
            setSelectedCustomerId(user.linked_customer_id)
            setCustomerSearchText(user.linked_customer_name || '')
          }
          setShowProductSelector(true)
        }
      }).catch(() => {})
    }
  }, [isOpen, loadOrders, loadCustomers])

  // ─── Click-outside handlers ───────────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        setShowCustomerDropdown(false)
      }
    }
    if (showCustomerDropdown) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showCustomerDropdown])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (taxDropdownRef.current && !taxDropdownRef.current.contains(event.target)) {
        setShowTaxDropdown(false)
      }
    }
    if (showTaxDropdown) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showTaxDropdown])

  useEffect(() => {
    if (showForm && !editingOrder && taxes && taxes.length > 0 && !selectedTax) {
      const defaultTax = taxes.find(tax => tax.is_default)
      setSelectedTax(defaultTax || taxes[0])
    }
  }, [showForm, taxes])

  const isCustomerRole = user?.role === 'customer'

  if (!isOpen) return null

  // ─── Form helpers ─────────────────────────────────────────────────────────
  const formatAddress = (address, city, state, postalCode, country) => {
    const parts = [address, city, state, postalCode, country].filter(p => p && p.trim() !== '')
    return parts.join(', ')
  }

  const resetForm = async () => {
    setLineItems([{ id: 1, sku: '', description: '', quantity: 1, rate: 0, amount: 0 }])
    setSelectedCustomer('')
    setSelectedCustomerId(null)
    setCustomerSearchText('')
    setSalesOrderDate(new Date().toISOString().split('T')[0])
    setDueDate('')
    setPoNumber('')
    setBillTo('')
    setShipTo('')
    setNotes('')
    setSelectedTax(taxes.find(t => t.is_default) || taxes[0] || null)
    setError('')
    setShowEstimatePicker(false)
    try {
      const res = await api.getNextSalesOrderNumber()
      setOrderNo(res.data?.sales_order_no || res.sales_order_no || '')
    } catch { setOrderNo('') }
  }

  const populateForm = (order) => {
    setOrderNo(order.sales_order_no || '')
    setSelectedCustomer(order.customer_name || '')
    setSelectedCustomerId(order.customer_id)
    setCustomerSearchText(order.customer_name || '')
    setSalesOrderDate(order.order_date ? order.order_date.split('T')[0] : new Date().toISOString().split('T')[0])
    setDueDate(order.due_date ? order.due_date.split('T')[0] : '')
    setPoNumber(order.po_number || '')
    setBillTo(order.bill_to || '')
    setShipTo(order.ship_to || '')
    setNotes(order.notes || '')
    if (order.line_items && order.line_items.length > 0) {
      setLineItems(order.line_items.map((item, idx) => ({
        id: idx + 1,
        sku: item.sku || '',
        description: item.description || '',
        quantity: parseInt(item.ordered_qty) || 1,
        rate: parseFloat(item.rate) || 0,
        amount: (parseInt(item.ordered_qty) || 1) * (parseFloat(item.rate) || 0),
      })))
    } else {
      setLineItems([{ id: 1, sku: '', description: '', quantity: 1, rate: 0, amount: 0 }])
    }
    if (order.tax_id) {
      setSelectedTax(taxes.find(t => t.id === order.tax_id) || null)
    } else {
      setSelectedTax(null)
    }
    setError('')
  }

  // ─── List actions ─────────────────────────────────────────────────────────
  const handleNewOrder = async () => {
    await resetForm()
    if (isCustomerRole && user?.linked_customer_id) {
      setSelectedCustomer(user.linked_customer_name || '')
      setSelectedCustomerId(user.linked_customer_id)
      setCustomerSearchText(user.linked_customer_name || '')
    }
    setEditingOrder(null)
    onDirtyChange(false)
    setShowForm(true)
  }

  const handleEditOrder = async (order) => {
    setListError('')
    try {
      const res = await api.getSalesOrder(order.id)
      const full = res.data || res
      setEditingOrder(full)
      populateForm(full)
      onDirtyChange(false)
      setViewMode(false)
      setShowForm(true)
    } catch (err) {
      setListError('Failed to load sales order: ' + err.message)
    }
  }

  const handleViewOrder = async (order) => {
    setListError('')
    try {
      const res = await api.getSalesOrder(order.id)
      const full = res.data || res
      setEditingOrder(full)
      populateForm(full)
      setViewMode(true)
      setShowForm(true)
    } catch (err) {
      setListError('Failed to load order: ' + err.message)
    }
  }

  const handleDeleteOrder = async (id) => {
    if (!confirm('Are you sure you want to delete this sales order?')) return
    setListError('')
    try {
      await api.deleteSalesOrder(id)
      setOrders(prev => prev.filter(o => o.id !== id))
    } catch (err) {
      setListError('Delete failed: ' + err.message)
    }
  }

  const handleFormClose = () => {
    onDirtyChange(false)
    setShowForm(false)
    setEditingOrder(null)
    setViewMode(false)
    setShowEstimatePicker(false)
  }

  const handleOrderStatus = async (id, newStatus) => {
    setListError('')
    try {
      await api.updateSalesOrderStatus(id, newStatus)
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o))
    } catch (err) {
      setListError('Status update failed: ' + err.message)
    }
  }

  const handleCreateDeliveryNote = async (o) => {
    setListError('')
    try {
      const res = await api.getSalesOrder(o.id)
      const full = res.data || res
      const lineItems = (full.line_items || []).map(li => ({
        sales_order_line_item_id: li.id,
        shipped_qty: parseFloat(li.ordered_qty) - parseFloat(li.delivered_qty || 0),
      })).filter(li => li.shipped_qty > 0)
      if (lineItems.length === 0) {
        setListError('All quantities on this order are already delivered')
        return
      }
      await api.convertSalesOrderToDeliveryNote(o.id, {
        delivery_date: new Date().toISOString().split('T')[0],
        line_items: lineItems,
      })
      loadOrders()
    } catch (err) {
      setListError('Create DN failed: ' + err.message)
    }
  }

  // ─── Form event handlers ──────────────────────────────────────────────────
  const handleCustomerInputChange = (e) => {
    if (isCustomerRole) return
    const value = e.target.value
    setCustomerSearchText(value)
    setShowCustomerDropdown(true)
    if (value === '') {
      setSelectedCustomer('')
      setSelectedCustomerId(null)
    }
  }

  const handleCustomerSelect = (customerName) => {
    const customer = customers.find(c => c.name === customerName)
    setSelectedCustomer(customerName)
    setSelectedCustomerId(customer?.id || null)
    setCustomerSearchText(customerName)
    setShowCustomerDropdown(false)
    if (customer) {
      setBillTo(formatAddress(customer.billing_address, customer.billing_city, customer.billing_state, customer.billing_postal_code, customer.billing_country))
      setShipTo(formatAddress(customer.shipping_address, customer.shipping_city, customer.shipping_state, customer.shipping_postal_code, customer.shipping_country))
      if (!editingOrder && !viewMode && !isCustomerRole) fetchCustomerEstimates(customer.id)
    }
  }

  const fetchCustomerEstimates = async (customerId) => {
    setEstimatePickerLoading(true)
    try {
      const res = await api.getEstimatesForCustomer(customerId)
      const estimates = res.data?.estimates || res.data || []
      const available = estimates.filter(e =>
        ['draft', 'sent', 'accepted'].includes(e.status) && !e.converted_to_sales_order
      )
      if (available.length > 0) {
        setEstimatePickerItems(available)
        setShowEstimatePicker(true)
      }
    } catch {}
    finally { setEstimatePickerLoading(false) }
  }

  const handleEstimateSelect = async (est) => {
    setShowEstimatePicker(false)
    try {
      const res = await api.getEstimate(est.id)
      const full = res.data || res
      if (full.bill_to) setBillTo(full.bill_to)
      if (full.ship_to) setShipTo(full.ship_to)
      if (full.notes) setNotes(full.notes)
      if (full.tax_id) {
        const tax = taxes.find(t => t.id === full.tax_id)
        if (tax) setSelectedTax(tax)
      }
      if (full.line_items && full.line_items.length > 0) {
        setLineItems(full.line_items.map((li, idx) => ({
          id: idx + 1,
          sku: li.sku || '',
          description: li.description || '',
          quantity: parseFloat(li.quantity) || 1,
          rate: parseFloat(li.rate) || 0,
          amount: (parseFloat(li.quantity) || 1) * (parseFloat(li.rate) || 0),
        })))
      }
    } catch (err) { console.error('Estimate select error:', err) }
  }

  const handleAddNewCustomer = () => {
    setIsCustomerPopupOpen(true)
    setShowCustomerDropdown(false)
  }

  const filteredCustomers = customers.filter(c =>
    (c.name || '').toLowerCase().includes(customerSearchText.toLowerCase())
  )

  const handleCustomerSave = (newCustomer) => {
    setCustomers(prev => [...prev, newCustomer])
    setSelectedCustomer(newCustomer.name)
    setSelectedCustomerId(newCustomer.id)
    setCustomerSearchText(newCustomer.name)
    setIsCustomerPopupOpen(false)
    setBillTo(formatAddress(newCustomer.billing_address, newCustomer.billing_city, newCustomer.billing_state, newCustomer.billing_postal_code, newCustomer.billing_country))
    setShipTo(formatAddress(newCustomer.shipping_address, newCustomer.shipping_city, newCustomer.shipping_state, newCustomer.shipping_postal_code, newCustomer.shipping_country))
  }

  const handleCustomerPopupClose = () => setIsCustomerPopupOpen(false)

  const addLineItem = () => {
    const newId = lineItems.length > 0 ? Math.max(...lineItems.map(item => item.id)) + 1 : 1
    setLineItems([...lineItems, { id: newId, sku: '', description: '', quantity: 1, rate: 0, amount: 0 }])
  }

  const handleFieldFocus = (itemId) => {
    if (lineItems[lineItems.length - 1].id === itemId) addLineItem()
  }

  const removeLineItem = (id) => {
    if (lineItems.length > 1) setLineItems(lineItems.filter(item => item.id !== id))
  }

  const handleTaxSelect = (tax) => {
    setSelectedTax(tax)
    setShowTaxDropdown(false)
  }

  const handleAddNewTax = () => {
    setIsTaxPopupOpen(true)
    setShowTaxDropdown(false)
  }

  const handleTaxPopupClose = () => setIsTaxPopupOpen(false)

  const handleTaxSave = (newTax) => {
    onTaxUpdate([...taxes, newTax])
    setSelectedTax(newTax)
    setIsTaxPopupOpen(false)
  }

  const updateLineItem = (id, field, value) => {
    onDirtyChange(true)
    setLineItems(lineItems.map(item => {
      if (item.id !== id) return item
      const updated = { ...item, [field]: value }
      if (field === 'quantity' || field === 'rate') {
        updated.amount = updated.quantity * updated.rate
      }
      return updated
    }))
  }

  // ─── Add products from ProductSelectorPopup ──────────────────────────────
  const handleAddFromSelector = (product, qty) => {
    const rate = parseFloat(product.selling_price || product.unit_price || 0)
    const tgtPrice = parseFloat(product.target_price) || 0
    setLineItems(prev => {
      const existing = prev.find(i => i.product_id === product.id || (i.sku && i.sku === product.sku))
      if (existing) {
        return prev.map(i =>
          (i.product_id === product.id || (i.sku && i.sku === product.sku))
            ? { ...i, quantity: i.quantity + qty, amount: (i.quantity + qty) * i.rate }
            : i
        )
      }
      // Replace the first empty placeholder row if present
      const emptyIdx = prev.findIndex(i => !i.sku && !i.description && i.quantity === 1 && i.rate === 0)
      const newItem = {
        id: Date.now() + Math.random(),
        product_id: product.id,
        sku: product.sku || '',
        description: product.name || '',
        quantity: qty,
        rate,
        target_price: tgtPrice,
        amount: qty * rate,
      }
      if (emptyIdx !== -1) {
        const updated = [...prev]
        updated[emptyIdx] = newItem
        return updated
      }
      return [...prev, newItem]
    })
    onDirtyChange(true)
  }

  const getProductSuggestions = (itemId, field) => {
    const item = lineItems.find(i => i.id === itemId)
    if (!item || !products.length) return []
    const q = (field === 'sku' ? item.sku : item.description).toLowerCase()
    if (!q) return []
    return products.filter(p =>
      (p.sku || '').toLowerCase().includes(q) ||
      (p.name || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
    ).slice(0, 8)
  }

  const handleProductSelect = (product, itemId) => {
    const targetId = itemId ?? activeItemId
    const price = parseFloat(product.selling_price) || parseFloat(product.unit_price) || 0
    const tgtPrice = parseFloat(product.target_price) || 0
    setLineItems(prev => prev.map(item => {
      if (item.id !== targetId) return item
      const updated = {
        ...item,
        sku: product.sku || '',
        description: product.description || product.name || '',
        rate: price,
        target_price: tgtPrice,
      }
      if ('amount' in updated) updated.amount = (updated.quantity || 1) * price - (updated.discount || 0)
      return updated
    }))
    onDirtyChange(true)
    setActiveItemId(null)
    setActiveField(null)
  }

  const calculateSubtotal = () => lineItems.reduce((sum, item) => sum + item.amount, 0)
  const calculateTax = () => selectedTax ? calculateSubtotal() * Number(selectedTax.rate) / 100 : 0
  const calculateTotal = () => calculateSubtotal() + calculateTax()

  const handleSave = async () => {
    setError('')
    if (!selectedCustomerId) { setError('Please select a customer'); return }
    const validItems = lineItems.filter(item => item.description.trim())
    if (validItems.length === 0) { setError('Add at least one line item with a description'); return }
    if (!salesOrderDate) { setError('Order date is required'); return }
    setSaving(true)
    const taxRate = selectedTax ? Number(selectedTax.rate) || 0 : 0
    const payload = {
      customer_id: selectedCustomerId,
      order_date: salesOrderDate,
      due_date: dueDate || undefined,
      po_number: poNumber || undefined,
      bill_to: billTo,
      ship_to: shipTo,
      tax_id: selectedTax?.id || null,
      tax_rate: taxRate,
      notes: notes || undefined,
      line_items: validItems.map(item => ({
        sku: item.sku || undefined,
        description: item.description,
        ordered_qty: Number(item.quantity) || 1,
        rate: Number(item.rate) || 0,
        tax_id: selectedTax?.id || null,
        tax_rate: taxRate,
        tax_amount: selectedTax ? Number((item.amount * taxRate / 100).toFixed(4)) : 0,
      })),
    }
    try {
      if (editingOrder) {
        await api.updateSalesOrder(editingOrder.id, payload)
      } else {
        await api.createSalesOrder(payload)
      }
      onDirtyChange(false)
      setShowForm(false)
      setEditingOrder(null)
      loadOrders()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ─── Print / PDF ──────────────────────────────────────────────────────────
  const handlePrint = () => {
    const co = companyProfile || {}
    const coName = co.name || 'My Company'
    const coAddress = [co.address, co.city, co.state, co.postal_code].filter(Boolean).join(', ')
    const coEmail = co.email || ''
    const coPhone = co.phone || ''
    const coWebsite = co.website || ''
    const coGst = co.tax_number || co.gst_number || ''

    const validItems = lineItems.filter(i => i.description?.trim())
    const subtotal = calculateSubtotal()
    const taxAmt = calculateTax()
    const total = calculateTotal()
    const taxLabel = selectedTax ? `${selectedTax.name} (${selectedTax.rate}%)` : 'Tax'

    const fmtMoney = (v) => `${currencySymbol}${(parseFloat(v) || 0).toFixed(2)}`
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-CA') : ''

    const itemRows = validItems.map(item => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.quantity}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">
          <strong>${item.description}</strong>
          ${item.sku ? `<br/><span style="font-size:11px;color:#6b7280;">SKU: ${item.sku}</span>` : ''}
        </td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right;">${fmtMoney(item.rate)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right;">0.00%</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right;">${fmtMoney(item.rate)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">${fmtMoney(item.amount)}</td>
      </tr>`).join('')

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Sales Order ${orderNo}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; background: #fff; padding: 30px; }
    .page { max-width: 780px; margin: 0 auto; }
    /* Header */
    .doc-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .logo-area { display: flex; align-items: center; gap: 10px; }
    .logo-icon { width: 38px; height: 38px; border-radius: 50%; background: #2CA01C; display: flex; align-items: center; justify-content: center; }
    .logo-icon svg { width: 20px; height: 20px; }
    .company-name-logo { font-size: 20px; font-weight: 800; color: #1a1a1a; }
    .doc-title { font-size: 28px; font-weight: 700; color: #1a1a1a; }
    /* Company + Meta */
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #2CA01C; }
    .company-info p { margin-bottom: 3px; font-size: 12.5px; line-height: 1.5; }
    .company-info strong { font-size: 14px; }
    .doc-meta { text-align: right; }
    .doc-meta table { margin-left: auto; }
    .doc-meta td { padding: 2px 0 2px 16px; font-size: 12.5px; }
    .doc-meta td:first-child { color: #6b7280; }
    .doc-meta td:last-child { font-weight: 600; }
    /* Bill/Ship */
    .address-row { display: flex; gap: 20px; margin-bottom: 20px; }
    .address-box { flex: 1; border: 1px solid #d1d5db; border-radius: 4px; padding: 12px 14px; min-height: 80px; }
    .address-box h4 { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 6px; }
    .address-box p { font-size: 12.5px; line-height: 1.6; }
    /* Items table */
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .items-table thead tr { background: #2CA01C; color: white; }
    .items-table thead th { padding: 9px 10px; text-align: left; font-size: 12px; font-weight: 600; }
    .items-table thead th:not(:first-child):not(:nth-child(2)) { text-align: right; }
    .items-table tbody tr:nth-child(even) { background: #f9fafb; }
    /* Bottom */
    .bottom-row { display: flex; gap: 24px; align-items: flex-start; }
    .payments-col { flex: 1; }
    .payments-col h4 { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 8px; }
    .totals-col { min-width: 240px; }
    .totals-table { width: 100%; border-collapse: collapse; }
    .totals-table td { padding: 5px 10px; font-size: 13px; }
    .totals-table td:last-child { text-align: right; font-weight: 600; }
    .totals-table .grand-row td { background: #2CA01C; color: white; font-size: 14px; font-weight: 700; padding: 8px 10px; }
    .notes-section { margin-top: 16px; font-size: 12px; color: #374151; }
    .notes-section strong { display: block; color: #6b7280; text-transform: uppercase; letter-spacing: .5px; font-size: 11px; margin-bottom: 4px; }
    /* Signature */
    .signature-row { display: flex; gap: 40px; margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 16px; }
    .sig-field { flex: 1; }
    .sig-field .sig-line { border-bottom: 1px solid #374151; margin-bottom: 6px; height: 32px; }
    .sig-field span { font-size: 11px; color: #6b7280; }
    @media print { body { padding: 0; } .page { max-width: 100%; } }
  </style>
</head>
<body>
<div class="page">

  <div class="doc-header">
    <div class="logo-area">
      <div class="logo-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3,17 8,12 12,15 17,8 21,11"/>
          <polyline points="17,8 21,8 21,12"/>
        </svg>
      </div>
      <span class="company-name-logo">${coName}</span>
    </div>
    <div class="doc-title">Sales Order</div>
  </div>

  <div class="meta-row">
    <div class="company-info">
      <p><strong>${coName}</strong></p>
      ${coAddress ? `<p>${coAddress}</p>` : ''}
      ${coEmail ? `<p>Email: ${coEmail}</p>` : ''}
      ${coPhone ? `<p>Phone: ${coPhone}</p>` : ''}
      ${coWebsite ? `<p>Website: ${coWebsite}</p>` : ''}
    </div>
    <div class="doc-meta">
      <table>
        <tr><td>Associate:</td><td>${user?.name || user?.email || ''}</td></tr>
        <tr><td>Date:</td><td>${fmtDate(salesOrderDate)}</td></tr>
        <tr><td>Sales Order #:</td><td>${orderNo}</td></tr>
        ${poNumber ? `<tr><td>Ref No:</td><td>${poNumber}</td></tr>` : ''}
        ${coGst ? `<tr><td>GST #:</td><td>${coGst}</td></tr>` : ''}
      </table>
    </div>
  </div>

  <div class="address-row">
    <div class="address-box">
      <h4>Bill To</h4>
      <p>${(billTo || selectedCustomer || '').replace(/\n/g, '<br/>')}</p>
    </div>
    <div class="address-box">
      <h4>Ship To</h4>
      <p>${(shipTo || selectedCustomer || '').replace(/\n/g, '<br/>')}</p>
    </div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th style="width:70px;">Quantity</th>
        <th>Product / Description</th>
        <th style="width:110px;">Original Price</th>
        <th style="width:80px;">Discount</th>
        <th style="width:110px;">Unit Price</th>
        <th style="width:110px;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="bottom-row">
    <div class="payments-col">
      ${notes ? `<div class="notes-section"><strong>Notes / Terms</strong>${notes}</div>` : ''}
    </div>
    <div class="totals-col">
      <table class="totals-table">
        <tr><td>Sub Total:</td><td>${fmtMoney(subtotal)}</td></tr>
        ${taxAmt > 0 ? `<tr><td>${taxLabel}:</td><td>${fmtMoney(taxAmt)}</td></tr>` : ''}
        <tr class="grand-row"><td>Total:</td><td>${fmtMoney(total)}</td></tr>
      </table>
    </div>
  </div>

  <div class="signature-row">
    <div class="sig-field"><div class="sig-line"></div><span>Signature</span></div>
    <div class="sig-field"><div class="sig-line"></div><span>Name (print)</span></div>
    <div class="sig-field"><div class="sig-line"></div><span>Date</span></div>
  </div>

</div>
<script>window.onload = function(){ window.print(); }</script>
</body>
</html>`

    const win = window.open('', '_blank', 'width=900,height=700')
    win.document.write(html)
    win.document.close()
  }

  // ─── List display helpers ─────────────────────────────────────────────────
  const filteredOrders = orders.filter(o =>
    (o.sales_order_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString()
  }

  const formatCurrency = (amount) => currencySymbol + (parseFloat(amount) || 0).toFixed(2)

  const getStatusClass = (status) => {
    switch (status) {
      case 'confirmed': return styles.statusSent
      case 'shipped': return styles.statusPaid
      case 'completed': return styles.statusPaid
      case 'cancelled': return styles.statusCancelled
      default: return styles.statusDraft
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Sales Order List View ─────────────────────────────────────────── */}
      <div
        className={styles.invoiceListOverlay}
        style={isCustomerRole ? {
          left: sidebarCollapsed ? '70px' : 'var(--sidebar-width)',
          top: 'var(--header-height)'
        } : {}}
      >
        <div className={styles.invoiceListContainer}>

          <div className={styles.listHeader}>
            <div className={styles.listHeaderLeft}>
              <h2>{isCustomerRole ? 'Orders' : 'Sales Orders'}</h2>
            </div>
            <div className={styles.listHeaderRight}>
              <button className={styles.btnNewInvoice} onClick={handleNewOrder}>
                <i className="fas fa-plus"></i> {isCustomerRole ? 'Create Order' : 'New Sales Order'}
              </button>
              <button className={styles.closeBtn} onClick={onClose}>
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>

          <div className={styles.searchSection}>
            <div className={styles.searchWrapper}>
              <i className="fas fa-search"></i>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search by order # or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className={styles.btnRefresh} onClick={loadOrders} title="Refresh">
              <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
            </button>
          </div>

          {listError && (
            <div className={styles.errorBanner}>
              <i className="fas fa-exclamation-circle"></i> {listError}
            </div>
          )}

          <div className={styles.invoiceGridContainer}>
            {loading ? (
              <div className={styles.loadingState}>
                <i className="fas fa-spinner fa-spin"></i>
                <p>Loading sales orders...</p>
              </div>
            ) : filteredOrders.length > 0 ? (
              <table className={styles.invoiceTable}>
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Due Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((o) => (
                    <tr key={o.id}>
                      <td><strong>{o.sales_order_no || '-'}</strong></td>
                      <td>{o.customer_name || '-'}</td>
                      <td>{formatDate(o.order_date)}</td>
                      <td>{formatDate(o.due_date)}</td>
                      <td>{formatCurrency(o.grand_total)}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${getStatusClass(o.status)}`}>
                          {o.status || 'draft'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actionButtons}>
                          {o.status !== 'draft' && (
                            <button title="View order" onClick={() => handleViewOrder(o)}
                              style={{ fontSize: 11, padding: '2px 8px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                              <i className="fas fa-eye"></i>
                            </button>
                          )}
                          {o.status === 'draft' && (user?.role === 'admin' || user?.role === 'salesperson') && (
                            <button title="Confirm order" onClick={() => handleOrderStatus(o.id, 'confirmed')} style={{ fontSize: 11, padding: '2px 8px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                              Confirm
                            </button>
                          )}
                          {(o.status === 'confirmed' || o.status === 'in_progress') && !isCustomerRole && (
                            <button title="Create Delivery Note" onClick={() => handleCreateDeliveryNote(o)}
                              style={{ fontSize: 11, padding: '2px 8px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                              <i className="fas fa-truck"></i> Create DN
                            </button>
                          )}
                          {o.status === 'draft' && (
                            <button className={styles.btnEdit} title="Edit" onClick={() => handleEditOrder(o)}>
                              <i className="fas fa-edit"></i>
                            </button>
                          )}
                          {o.status === 'draft' && (
                            <button className={styles.btnDelete} title="Delete" onClick={() => handleDeleteOrder(o.id)}>
                              <i className="fas fa-trash"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.emptyState} style={{textAlign:'center',padding:'48px 20px'}}>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'8px'}}>
                  <i className="fas fa-shopping-cart" style={{fontSize:'48px',color:'#e2e8f0'}} />
                  <h3 style={{margin:'8px 0 4px',fontSize:'18px',fontWeight:600,color:'#4a5568'}}>No Sales Orders Yet</h3>
                  <p style={{margin:0,color:'#a0aec0',fontSize:'14px'}}>{searchTerm ? 'Try adjusting your search' : 'Create your first sales order to get started'}</p>
                  {!searchTerm && (
                    <button
                      style={{marginTop:'12px',background:'#2CA01C',color:'white',border:'none',padding:'9px 20px',borderRadius:'6px',cursor:'pointer',fontSize:'14px',fontWeight:500}}
                      onClick={handleNewOrder}
                    >
                      + New Sales Order
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Sales Order Form Popup ────────────────────────────────────────── */}
      {showForm && (
        <div className={styles.invoicePopupOverlay}>
          <div className={styles.invoicePopup}>

            <div className={styles.popupHeader}>
              <div className={styles.headerLeft}>
                <h2>
                  {viewMode
                    ? `Sales Order ${editingOrder?.sales_order_no || ''} — ${editingOrder?.status || ''}`
                    : editingOrder
                      ? `Edit ${isCustomerRole ? 'Order' : 'Sales Order'} ${editingOrder.sales_order_no || ''}`
                      : isCustomerRole ? 'Create Order' : 'Create Sales Order'}
                </h2>
              </div>
              <div className={styles.headerRight}>
                {!viewMode && (
                  <button
                    onClick={() => setShowProductSelector(true)}
                    style={{ marginRight: 10, padding: '6px 14px', background: '#0066cc', color: '#fff',
                             border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                  >
                    <i className="fas fa-th-list" style={{ marginRight: 6 }}></i>Browse Products
                  </button>
                )}
                <button className={styles.closeBtn} onClick={handleFormClose}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>

            <div className={styles.popupContent}>
              <div className={styles.invoiceUpperSection}>
                <div className={styles.sectionCard}>
                  <div className={styles.invoiceHeaderRow}>
                    <div className={styles.customerSection}>
                      <div className={styles.formGroup}>
                        <label>Customer</label>
                        <div className={styles.autocompleteWrapper} ref={autocompleteRef}>
                          <input
                            type="text"
                            className={styles.formControlStandard}
                            placeholder="Search or select customer"
                            value={customerSearchText}
                            onChange={handleCustomerInputChange}
                            onFocus={() => !isCustomerRole && !viewMode && setShowCustomerDropdown(true)}
                            readOnly={isCustomerRole || viewMode}
                            style={isCustomerRole || viewMode ? { backgroundColor: '#f5f5f5', cursor: 'default' } : {}}
                          />
                          {!isCustomerRole && showCustomerDropdown && (
                            <div className={styles.autocompleteDropdown}>
                              <div className={styles.autocompleteOption + ' ' + styles.addNewOption} onClick={handleAddNewCustomer}>
                                <i className="fas fa-plus"></i> Add New
                              </div>
                              {filteredCustomers.length > 0 ? (
                                filteredCustomers.map(customer => (
                                  <div key={customer.id} className={styles.autocompleteOption} onClick={() => handleCustomerSelect(customer.name)}>
                                    {customer.name}
                                  </div>
                                ))
                              ) : (
                                customerSearchText && (
                                  <div className={styles.autocompleteOption + ' ' + styles.noResults}>No customers found</div>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className={styles.formGroup}>
                        <label>Bill To</label>
                        <textarea className={styles.formControlStandard} placeholder="Billing address will populate automatically" value={billTo} onChange={(e) => setBillTo(e.target.value)} rows="3" readOnly={viewMode} />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Ship To</label>
                        <textarea className={styles.formControlStandard} placeholder="Shipping address will populate automatically" value={shipTo} onChange={(e) => setShipTo(e.target.value)} rows="3" readOnly={viewMode} />
                      </div>
                    </div>

                    <div className={styles.invoiceDetailsColumn}>
                      <div className={styles.formGroup}>
                        <label>Sales Order No.</label>
                        <input type="text" className={styles.formControlStandard} value={orderNo || 'Auto-generated'} readOnly style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }} />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Date</label>
                        <input type="date" className={styles.formControlStandard} value={salesOrderDate} onChange={(e) => setSalesOrderDate(e.target.value)} readOnly={viewMode} />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Due Date</label>
                        <input type="date" className={styles.formControlStandard} value={dueDate} onChange={(e) => setDueDate(e.target.value)} readOnly={viewMode} />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Ref. No.</label>
                        <input type="text" className={styles.formControlStandard} placeholder="REF-12345" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} readOnly={viewMode} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.invoiceBottomSection}>
                <div className={styles.sectionCard}>
                  <div className={styles.sectionHeader}><h3>Items</h3></div>
                  <div className={styles.tableContainer}>
                    <table className={styles.itemsTable}>
                      <thead>
                        <tr>
                          <th className={styles.colSku}>SKU</th>
                          <th className={styles.colDescription}>Description</th>
                          <th className={styles.colQuantity}>Ordered</th>
                          <th className={styles.colRate}>Rate</th>
                          <th className={styles.colRate}>Target Price</th>
                          <th className={styles.colAmount}>Amount</th>
                          <th className={styles.colAction}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map((item) => (
                          <tr key={item.id}>
                            <td>
                              <div style={{ position: 'relative' }}>
                                <input
                                  type="text"
                                  className={styles.formControlTable}
                                  placeholder="SKU"
                                  value={item.sku}
                                  onChange={(e) => updateLineItem(item.id, 'sku', e.target.value)}
                                  onFocus={() => { if (!viewMode) { handleFieldFocus(item.id); setActiveItemId(item.id); setActiveField('sku') } }}
                                  onBlur={() => setTimeout(() => { setActiveItemId(null); setActiveField(null) }, 150)}
                                  readOnly={viewMode}
                                />
                                {activeItemId === item.id && activeField === 'sku' &&
                                  getProductSuggestions(item.id, 'sku').length > 0 && (
                                    <div style={{
                                      position: 'absolute', top: '100%', left: 0, zIndex: 9999,
                                      background: '#fff', border: '1px solid #d1d5db', borderRadius: 6,
                                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: 280,
                                      maxHeight: 220, overflowY: 'auto'
                                    }}>
                                      {getProductSuggestions(item.id, 'sku').map(product => (
                                        <div
                                          key={product.id}
                                          onMouseDown={() => handleProductSelect(product, item.id)}
                                          style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
                                                   display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                          onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                                        >
                                          <div>
                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{product.name}</div>
                                            {product.sku && <div style={{ fontSize: 11, color: '#64748b' }}>SKU: {product.sku}</div>}
                                            {product.description && <div style={{ fontSize: 11, color: '#94a3b8' }}>{product.description.slice(0, 50)}</div>}
                                          </div>
                                          <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, marginLeft: 8 }}>
                                            {currencySymbol}{parseFloat(product.selling_price || 0).toFixed(2)}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                )}
                              </div>
                            </td>
                            <td>
                              <div style={{ position: 'relative' }}>
                                <input
                                  type="text"
                                  className={styles.formControlTable}
                                  placeholder="Item description"
                                  value={item.description}
                                  onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                                  onFocus={() => { if (!viewMode) { handleFieldFocus(item.id); setActiveItemId(item.id); setActiveField('description') } }}
                                  onBlur={() => setTimeout(() => { setActiveItemId(null); setActiveField(null) }, 150)}
                                  readOnly={viewMode}
                                />
                                {activeItemId === item.id && activeField === 'description' &&
                                  getProductSuggestions(item.id, 'description').length > 0 && (
                                    <div style={{
                                      position: 'absolute', top: '100%', left: 0, zIndex: 9999,
                                      background: '#fff', border: '1px solid #d1d5db', borderRadius: 6,
                                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: 280,
                                      maxHeight: 220, overflowY: 'auto'
                                    }}>
                                      {getProductSuggestions(item.id, 'description').map(product => (
                                        <div
                                          key={product.id}
                                          onMouseDown={() => handleProductSelect(product, item.id)}
                                          style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
                                                   display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                          onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                                        >
                                          <div>
                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{product.name}</div>
                                            {product.sku && <div style={{ fontSize: 11, color: '#64748b' }}>SKU: {product.sku}</div>}
                                            {product.description && <div style={{ fontSize: 11, color: '#94a3b8' }}>{product.description.slice(0, 50)}</div>}
                                          </div>
                                          <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, marginLeft: 8 }}>
                                            {currencySymbol}{parseFloat(product.selling_price || 0).toFixed(2)}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                )}
                              </div>
                            </td>
                            <td><input type="number" className={styles.formControlTable} value={item.quantity} min="1" step="1" onChange={(e) => updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 0)} onFocus={() => !viewMode && handleFieldFocus(item.id)} readOnly={viewMode} /></td>
                            <td><input type="number" className={styles.formControlTable} value={item.rate} min="0" step="0.01" readOnly={isCustomerRole || viewMode} onChange={(e) => updateLineItem(item.id, 'rate', parseFloat(e.target.value) || 0)} onFocus={() => !(isCustomerRole || viewMode) && handleFieldFocus(item.id)} style={isCustomerRole || viewMode ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}} /></td>
                            <td><input type="number" className={styles.formControlTable} value={parseFloat(item.target_price || 0).toFixed(2)} readOnly style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }} /></td>
                            <td className={styles.amountCell}>{currencySymbol}{item.amount.toFixed(2)}</td>
                            <td className={styles.actionCell}>
                              <button className={styles.btnRemove} onClick={() => removeLineItem(item.id)} disabled={lineItems.length === 1 || viewMode}>
                                <i className="fas fa-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className={styles.bottomRow}>
                    <div className={styles.notesAttachmentsSection}>
                      <div className={styles.formGroup}>
                        <label>Notes</label>
                        <textarea className={styles.formControlStandard} rows="3" placeholder="Add any additional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} readOnly={viewMode}></textarea>
                      </div>
                      <div className={styles.formGroup}>
                        <label>Attachments</label>
                        <div className={styles.attachmentArea}>
                          <input type="file" id="soFileUpload" className={styles.fileInput} multiple />
                          <label htmlFor="soFileUpload" className={styles.fileUploadLabel}>
                            <i className="fas fa-cloud-upload-alt"></i>
                            <span>Click to upload or drag and drop</span>
                            <small>PDF, DOC, JPG, PNG (Max 10MB each)</small>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className={styles.totalsSection}>
                      <div className={styles.totalsGrid}>
                        <div className={styles.totalRow}>
                          <span className={styles.totalLabel}>Subtotal:</span>
                          <span className={styles.totalValue}>{currencySymbol}{calculateSubtotal().toFixed(2)}</span>
                        </div>
                        <div className={styles.totalRow}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className={styles.totalLabel}>Tax:</span>
                            <div className={styles.taxSelectWrapper} style={{ position: 'relative', width: '200px' }} ref={taxDropdownRef}>
                              <div className={styles.taxSelectButton} onClick={() => !viewMode && setShowTaxDropdown(true)}>
                                <span>{selectedTax ? `${selectedTax.name} (${selectedTax.rate}%)` : 'Select tax'}</span>
                                <i className="fas fa-chevron-down"></i>
                              </div>
                              {showTaxDropdown && (
                                <div className={styles.autocompleteDropdown}>
                                  <div className={styles.autocompleteOption + ' ' + styles.addNewOption} onClick={handleAddNewTax}>
                                    <i className="fas fa-plus"></i> Add New
                                  </div>
                                  {taxes.map((t) => (
                                    <div key={t.id} className={styles.autocompleteOption} onClick={() => handleTaxSelect(t)}>
                                      {t.name} ({t.rate}%)
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <span className={styles.totalValue}>{currencySymbol}{calculateTax().toFixed(2)}</span>
                        </div>
                        <div className={`${styles.totalRow} ${styles.grandTotal}`}>
                          <span className={styles.totalLabel}>Total:</span>
                          <span className={styles.totalValue}>{currencySymbol}{calculateTotal().toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.popupFooter}>
              <div className={styles.footerLeft}>
                {!viewMode && error && <span style={{ color: '#ef4444', fontSize: '14px' }}>{error}</span>}
                <button className={styles.btnCancel} onClick={handleFormClose}>
                  {viewMode ? 'Close' : 'Cancel'}
                </button>
              </div>
              {!viewMode && (
                <div className={styles.footerRight}>
                  {user?.role === 'admin' && (
                    <button
                      onClick={handlePrint}
                      style={{ marginRight: 8, padding: '8px 18px', background: '#6b7280', color: '#fff',
                               border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600,
                               display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      title="Print / Save as PDF"
                    >
                      <i className="fas fa-print"></i> Print
                    </button>
                  )}
                  <button className={styles.btnSecondary} onClick={handleSave} disabled={saving}>
                    <i className={saving ? 'fas fa-spinner fa-spin' : 'fas fa-save'}></i>
                    {saving ? 'Saving...' : editingOrder ? 'Update' : 'Save'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <CustomerPopup isOpen={isCustomerPopupOpen} onClose={handleCustomerPopupClose} onSave={handleCustomerSave} />
          <TaxPopup isOpen={isTaxPopupOpen} onClose={handleTaxPopupClose} onSave={handleTaxSave} />
          <ProductSelectorPopup
            isOpen={showProductSelector}
            onClose={() => setShowProductSelector(false)}
            products={products}
            onAdd={handleAddFromSelector}
            currencySymbol={currencySymbol}
          />
        </div>
      )}

      {/* ── Estimate Picker Modal ──────────────────────────────────────────── */}
      {showEstimatePicker && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 28, minWidth: 420, maxWidth: 560, maxHeight: '70vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.22)' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 16, color: '#111' }}>Link an Estimate</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>Select an estimate to auto-fill this sales order, or skip to enter manually.</p>
            {estimatePickerLoading ? (
              <p style={{ color: '#6b7280', fontSize: 13 }}>Loading…</p>
            ) : estimatePickerItems.map(e => (
              <div
                key={e.id}
                onClick={() => handleEstimateSelect(e)}
                style={{ padding: '10px 14px', borderRadius: 6, border: '1px solid #e5e7eb', marginBottom: 8, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onMouseEnter={ev => ev.currentTarget.style.background = '#f0fdf4'}
                onMouseLeave={ev => ev.currentTarget.style.background = '#fff'}
              >
                <div>
                  <span style={{ fontWeight: 600, color: '#16a34a' }}>{e.estimate_no}</span>
                  {e.customer_name && <span style={{ marginLeft: 8, fontSize: 12, color: '#6b7280' }}>{e.customer_name}</span>}
                </div>
                <span style={{ fontSize: 12, color: '#6b7280', textTransform: 'capitalize' }}>{e.status}</span>
              </div>
            ))}
            <button
              onClick={() => setShowEstimatePicker(false)}
              style={{ marginTop: 8, width: '100%', padding: '8px 0', background: '#f3f4f6', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, color: '#374151' }}
            >
              Skip — Manual Entry
            </button>
          </div>
        </div>
      )}
    </>
  )
}
