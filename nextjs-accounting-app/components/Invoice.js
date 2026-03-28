'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './Invoice.module.css'
import CustomerPopup from './CustomerPopup'
import TaxPopup from './TaxPopup'
import * as api from '../lib/api'

export default function Invoice({ isOpen, onClose, taxes, onTaxUpdate, onDirtyChange = () => {}, user, currencySymbol = '$', companyProfile = null }) {
  const isCustomerRole = user?.role === 'customer'

  // ─── List state ───────────────────────────────────────────────────────────
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [viewMode, setViewMode] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState(null)

  // ─── Form state ───────────────────────────────────────────────────────────
  const [lineItems, setLineItems] = useState([
    { id: 1, sku: '', description: '', quantity: 1, rate: 0, discount: 0, amount: 0 }
  ])
  const [customers, setCustomers] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState(null)
  const [customerSearchText, setCustomerSearchText] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [isCustomerPopupOpen, setIsCustomerPopupOpen] = useState(false)
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [terms, setTerms] = useState('Net 30')
  const [billTo, setBillTo] = useState('')
  const [shipTo, setShipTo] = useState('')
  const [referenceNo, setReferenceNo] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedTax, setSelectedTax] = useState(null)
  const [isTaxPopupOpen, setIsTaxPopupOpen] = useState(false)
  const [showTaxDropdown, setShowTaxDropdown] = useState(false)
  const [invoiceNo, setInvoiceNo] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [products, setProducts] = useState([])
  const [activeItemId, setActiveItemId] = useState(null)
  const [activeField, setActiveField] = useState(null)

  // ─── DN Picker state ──────────────────────────────────────────────────────
  const [linkedDeliveryNoteId, setLinkedDeliveryNoteId] = useState(null)
  const [showDnPicker, setShowDnPicker] = useState(false)
  const [dnPickerNotes, setDnPickerNotes] = useState([])
  const [dnPickerLoading, setDnPickerLoading] = useState(false)

  const autocompleteRef = useRef(null)
  const taxDropdownRef = useRef(null)

  // ─── Data loading ─────────────────────────────────────────────────────────
  const loadInvoices = useCallback(async () => {
    setLoading(true)
    setListError('')
    try {
      const res = await api.getInvoices()
      setInvoices(res.data?.invoices || res.invoices || res.data || [])
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
      loadInvoices()
      loadCustomers()
      api.getProducts().then(res => setProducts(res.data?.products || res.products || [])).catch(() => {})
    }
  }, [isOpen, loadInvoices, loadCustomers])

  // ─── Auto-calculate due date only for new invoices ────────────────────────
  const calculateDueDate = (selectedTerms, selectedInvoiceDate) => {
    if (!selectedInvoiceDate) return ''
    const date = new Date(selectedInvoiceDate)
    switch (selectedTerms) {
      case 'Net 15': date.setDate(date.getDate() + 15); break
      case 'Net 30': date.setDate(date.getDate() + 30); break
      case 'Net 60': date.setDate(date.getDate() + 60); break
      case 'Due on Receipt': break
      default: date.setDate(date.getDate() + 30)
    }
    return date.toISOString().split('T')[0]
  }

  useEffect(() => {
    if (!editingInvoice) {
      setDueDate(calculateDueDate(terms, invoiceDate))
    }
  }, [terms, invoiceDate])

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

  // ─── Set default tax when opening new invoice form ────────────────────────
  useEffect(() => {
    if (showForm && !editingInvoice && taxes && taxes.length > 0 && !selectedTax) {
      const defaultTax = taxes.find(tax => tax.is_default)
      setSelectedTax(defaultTax || taxes[0])
    }
  }, [showForm, taxes])

  if (!isOpen) return null

  // ─── Form helpers ─────────────────────────────────────────────────────────
  const formatAddress = (address, city, state, postalCode, country) => {
    const parts = [address, city, state, postalCode, country].filter(p => p && p.trim() !== '')
    return parts.join(', ')
  }

  const resetForm = async () => {
    setLineItems([{ id: 1, sku: '', description: '', quantity: 1, rate: 0, discount: 0, amount: 0 }])
    setSelectedCustomer('')
    setSelectedCustomerId(null)
    setCustomerSearchText('')
    setInvoiceDate(new Date().toISOString().split('T')[0])
    setDueDate('')
    setTerms('Net 30')
    setBillTo('')
    setShipTo('')
    setReferenceNo('')
    setNotes('')
    setSelectedTax(taxes.find(t => t.is_default) || taxes[0] || null)
    setError('')
    setLinkedDeliveryNoteId(null)
    setShowDnPicker(false)
    try {
      const res = await api.getNextInvoiceNumber()
      setInvoiceNo(res.data?.invoice_no || res.invoice_no || '')
    } catch { setInvoiceNo('') }
  }

  const populateForm = (invoice) => {
    setInvoiceNo(invoice.invoice_no || '')
    setSelectedCustomer(invoice.customer_name || '')
    setSelectedCustomerId(invoice.customer_id)
    setCustomerSearchText(invoice.customer_name || '')
    setInvoiceDate(invoice.invoice_date ? invoice.invoice_date.split('T')[0] : new Date().toISOString().split('T')[0])
    setDueDate(invoice.due_date ? invoice.due_date.split('T')[0] : '')
    setBillTo(invoice.bill_to || '')
    setShipTo(invoice.ship_to || '')
    setReferenceNo(invoice.reference_no || '')
    setNotes(invoice.notes || '')
    setTerms('Net 30')
    if (invoice.line_items && invoice.line_items.length > 0) {
      setLineItems(invoice.line_items.map((item, idx) => ({
        id: idx + 1,
        sku: item.sku || '',
        description: item.description || '',
        quantity: parseFloat(item.quantity) || 1,
        rate: parseFloat(item.rate) || 0,
        discount: parseFloat(item.discount_per_item) || 0,
        amount: (parseFloat(item.quantity) || 1) * (parseFloat(item.rate) || 0) - (parseFloat(item.discount_per_item) || 0),
      })))
    } else {
      setLineItems([{ id: 1, sku: '', description: '', quantity: 1, rate: 0, discount: 0, amount: 0 }])
    }
    if (invoice.tax_id) {
      const tax = taxes.find(t => t.id === invoice.tax_id)
      setSelectedTax(tax || null)
    } else {
      setSelectedTax(null)
    }
    setError('')
  }

  // ─── List actions ─────────────────────────────────────────────────────────
  const handleNewInvoice = async () => {
    await resetForm()
    setEditingInvoice(null)
    onDirtyChange(false)
    setShowForm(true)
  }

  const handleEditInvoice = async (invoice) => {
    setListError('')
    try {
      const res = await api.getInvoice(invoice.id)
      const full = res.data || res
      setEditingInvoice(full)
      populateForm(full)
      onDirtyChange(false)
      setShowForm(true)
    } catch (err) {
      setListError('Failed to load invoice: ' + err.message)
    }
  }

  const handleViewInvoice = async (invoice) => {
    setListError('')
    try {
      const res = await api.getInvoice(invoice.id)
      const full = res.data || res
      setEditingInvoice(full)
      populateForm(full)
      setViewMode(true)
      onDirtyChange(false)
      setShowForm(true)
    } catch (err) {
      setListError('Failed to load invoice: ' + err.message)
    }
  }

  const handleDeleteInvoice = async (id) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return
    setListError('')
    try {
      await api.deleteInvoice(id)
      setInvoices(prev => prev.filter(inv => inv.id !== id))
    } catch (err) {
      setListError('Delete failed: ' + err.message)
    }
  }

  const handleFormClose = () => {
    onDirtyChange(false)
    setShowForm(false)
    setViewMode(false)
    setEditingInvoice(null)
    setLinkedDeliveryNoteId(null)
    setShowDnPicker(false)
  }

  // ─── Form event handlers ──────────────────────────────────────────────────
  const handleCustomerInputChange = (e) => {
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
    setLinkedDeliveryNoteId(null)
    if (customer) {
      setBillTo(formatAddress(customer.billing_address, customer.billing_city, customer.billing_state, customer.billing_postal_code, customer.billing_country))
      setShipTo(formatAddress(customer.shipping_address, customer.shipping_city, customer.shipping_state, customer.shipping_postal_code, customer.shipping_country))
      if (!editingInvoice) fetchCustomerDeliveryNotes(customer.id)
    }
  }

  const fetchCustomerDeliveryNotes = async (customerId) => {
    setDnPickerLoading(true)
    try {
      const res = await api.getDeliveryNotesForCustomer(customerId)
      const notes = res.data?.delivery_notes || res.data || []
      const available = notes.filter(n =>
        (n.status === 'shipped' || n.status === 'delivered') && !n.invoiced
      )
      if (available.length > 0) {
        setDnPickerNotes(available)
        setShowDnPicker(true)
      }
    } catch {}
    finally { setDnPickerLoading(false) }
  }

  const handleDnSelect = async (dn) => {
    setShowDnPicker(false)
    setLinkedDeliveryNoteId(dn.id)
    try {
      const res = await api.getDeliveryNote(dn.id)
      const full = res.data || res
      setReferenceNo(full.delivery_note_no || '')
      if (full.ship_to) setShipTo(full.ship_to)
      if (full.bill_to) setBillTo(full.bill_to)
      if (full.line_items && full.line_items.length > 0) {
        // Fetch linked SO rates if available
        let soRateMap = {}
        if (full.sales_order_id) {
          try {
            const soRes = await api.getSalesOrder(full.sales_order_id)
            const soFull = soRes.data || soRes
            ;(soFull.line_items || []).forEach(li => {
              soRateMap[li.id] = parseFloat(li.rate) || 0
            })
          } catch {}
        }
        setLineItems(full.line_items.map((li, idx) => {
          const rate = soRateMap[li.sales_order_line_item_id] || parseFloat(li.rate) || 0
          const qty = parseFloat(li.shipped_qty) || parseFloat(li.quantity) || 1
          return {
            id: idx + 1,
            sku: li.sku || '',
            description: li.description || '',
            quantity: qty,
            rate,
            discount: 0,
            amount: qty * rate,
          }
        }))
      }
    } catch (err) { console.error('DN select error:', err) }
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
    setLineItems([...lineItems, { id: newId, sku: '', description: '', quantity: 1, rate: 0, discount: 0, amount: 0 }])
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
      if (field === 'quantity' || field === 'rate' || field === 'discount') {
        updated.amount = (updated.quantity * updated.rate) - updated.discount
      }
      return updated
    }))
  }

  const calculateSubtotal = () => lineItems.reduce((sum, item) => sum + item.amount, 0)
  const calculateDiscount = () => lineItems.reduce((sum, item) => sum + (item.discount || 0), 0)
  const calculateTax = () => selectedTax ? calculateSubtotal() * Number(selectedTax.rate) / 100 : 0
  const calculateTotal = () => calculateSubtotal() + calculateTax()

  const handleSave = async () => {
    setError('')
    if (!selectedCustomerId) { setError('Please select a customer'); return }
    const validItems = lineItems.filter(item => item.description.trim())
    if (validItems.length === 0) { setError('Add at least one line item with a description'); return }
    if (!invoiceDate) { setError('Invoice date is required'); return }
    if (!dueDate) { setError('Due date is required'); return }
    setSaving(true)
    const taxRate = selectedTax ? Number(selectedTax.rate) || 0 : 0
    const payload = {
      customer_id: selectedCustomerId,
      invoice_date: invoiceDate,
      due_date: dueDate,
      reference_no: referenceNo || undefined,
      bill_to: billTo,
      ship_to: shipTo,
      tax_id: selectedTax?.id || null,
      tax_rate: taxRate,
      discount_amount: calculateDiscount(),
      notes: notes || undefined,
      ...(linkedDeliveryNoteId && !editingInvoice ? { delivery_note_id: linkedDeliveryNoteId } : {}),
      line_items: validItems.map(item => ({
        sku: item.sku || undefined,
        description: item.description,
        quantity: Number(item.quantity) || 1,
        rate: Number(item.rate) || 0,
        discount_per_item: Number(item.discount) || 0,
        tax_id: selectedTax?.id || null,
        tax_rate: taxRate,
        tax_amount: selectedTax ? Number((item.amount * taxRate / 100).toFixed(4)) : 0,
      })),
    }
    try {
      if (editingInvoice) {
        await api.updateInvoice(editingInvoice.id, payload)
      } else {
        await api.createInvoice(payload)
      }
      onDirtyChange(false)
      setShowForm(false)
      setEditingInvoice(null)
      loadInvoices()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ─── List display helpers ─────────────────────────────────────────────────
  const filteredInvoices = invoices.filter(inv =>
    (inv.invoice_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inv.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

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
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right;">${fmtMoney(item.amount)}</td>
      </tr>`).join('')

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Invoice ${invoiceNo}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; background: #fff; padding: 30px; }
    .page { max-width: 780px; margin: 0 auto; }
    .doc-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .logo-area { display: flex; align-items: center; gap: 10px; }
    .logo-icon { width: 38px; height: 38px; border-radius: 50%; background: #2CA01C; display: flex; align-items: center; justify-content: center; }
    .logo-icon svg { width: 20px; height: 20px; }
    .company-name-logo { font-size: 20px; font-weight: 800; }
    .doc-title { font-size: 28px; font-weight: 700; }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #2CA01C; }
    .company-info p { margin-bottom: 3px; font-size: 12.5px; line-height: 1.5; }
    .company-info strong { font-size: 14px; }
    .doc-meta table { margin-left: auto; }
    .doc-meta td { padding: 2px 0 2px 16px; font-size: 12.5px; }
    .doc-meta td:first-child { color: #6b7280; }
    .doc-meta td:last-child { font-weight: 600; }
    .address-row { display: flex; gap: 20px; margin-bottom: 20px; }
    .address-box { flex: 1; border: 1px solid #d1d5db; border-radius: 4px; padding: 12px 14px; min-height: 70px; }
    .address-box h4 { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 6px; }
    .address-box p { font-size: 12.5px; line-height: 1.6; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .items-table thead tr { background: #2CA01C; color: white; }
    .items-table thead th { padding: 9px 10px; text-align: left; font-size: 12px; font-weight: 600; }
    .items-table thead th:not(:first-child):not(:nth-child(2)) { text-align: right; }
    .items-table tbody tr:nth-child(even) { background: #f9fafb; }
    .bottom-row { display: flex; gap: 24px; align-items: flex-start; }
    .notes-col { flex: 1; font-size: 12px; color: #374151; }
    .notes-col strong { display: block; color: #6b7280; text-transform: uppercase; letter-spacing: .5px; font-size: 11px; margin-bottom: 4px; }
    .totals-col { min-width: 240px; }
    .totals-table { width: 100%; border-collapse: collapse; }
    .totals-table td { padding: 5px 10px; font-size: 13px; }
    .totals-table td:last-child { text-align: right; font-weight: 600; }
    .totals-table .grand-row td { background: #2CA01C; color: white; font-size: 14px; font-weight: 700; padding: 8px 10px; }
    .signature-row { display: flex; gap: 40px; margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 16px; }
    .sig-field { flex: 1; }
    .sig-field .sig-line { border-bottom: 1px solid #374151; margin-bottom: 6px; height: 32px; }
    .sig-field span { font-size: 11px; color: #6b7280; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
<div class="page">
  <div class="doc-header">
    <div class="logo-area">
      <div class="logo-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3,17 8,12 12,15 17,8 21,11"/><polyline points="17,8 21,8 21,12"/>
        </svg>
      </div>
      <span class="company-name-logo">${coName}</span>
    </div>
    <div class="doc-title">Invoice</div>
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
        <tr><td>Invoice #:</td><td>${invoiceNo}</td></tr>
        <tr><td>Invoice Date:</td><td>${fmtDate(invoiceDate)}</td></tr>
        <tr><td>Due Date:</td><td>${fmtDate(dueDate)}</td></tr>
        <tr><td>Terms:</td><td>${terms || ''}</td></tr>
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
      <h4>Customer</h4>
      <p><strong>${selectedCustomer || ''}</strong></p>
    </div>
  </div>
  <table class="items-table">
    <thead>
      <tr>
        <th style="width:70px;">Qty</th>
        <th>Description</th>
        <th style="width:130px;">Unit Price</th>
        <th style="width:130px;">Amount</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>
  <div class="bottom-row">
    <div class="notes-col">${notes ? `<strong>Notes</strong>${notes}` : ''}</div>
    <div class="totals-col">
      <table class="totals-table">
        <tr><td>Subtotal:</td><td>${fmtMoney(subtotal)}</td></tr>
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

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString()
  }

  const formatCurrency = (amount) => currencySymbol + (parseFloat(amount) || 0).toFixed(2)

  const getStatusClass = (status) => {
    switch (status) {
      case 'paid': return styles.statusPaid
      case 'sent': return styles.statusSent
      case 'approved': return styles.statusApproved
      case 'overdue': return styles.statusOverdue
      case 'cancelled': return styles.statusCancelled
      default: return styles.statusDraft
    }
  }

  const handleApprove = async (id) => {
    try {
      await api.updateInvoiceStatus(id, 'approved')
      await loadInvoices()
    } catch (err) {
      setListError(err.message)
    }
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
    setLineItems(prev => prev.map(item => {
      if (item.id !== targetId) return item
      const updated = {
        ...item,
        sku: product.sku || '',
        description: product.description || product.name || '',
        rate: price,
      }
      if ('amount' in updated) updated.amount = (updated.quantity || 1) * price - (updated.discount || 0)
      return updated
    }))
    onDirtyChange(true)
    setActiveItemId(null)
    setActiveField(null)
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Invoice List View ─────────────────────────────────────────────── */}
      <div className={styles.invoiceListOverlay}>
        <div className={styles.invoiceListContainer}>

          {/* Header */}
          <div className={styles.listHeader}>
            <div className={styles.listHeaderLeft}>
              <h2>Invoices</h2>
            </div>
            <div className={styles.listHeaderRight}>
              <button className={styles.btnNewInvoice} onClick={handleNewInvoice}>
                <i className="fas fa-plus"></i> New Invoice
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
                placeholder="Search by invoice # or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className={styles.btnRefresh} onClick={loadInvoices} title="Refresh">
              <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
            </button>
          </div>

          {listError && (
            <div className={styles.errorBanner}>
              <i className="fas fa-exclamation-circle"></i> {listError}
            </div>
          )}

          {/* Invoice Table */}
          <div className={styles.invoiceGridContainer}>
            {loading ? (
              <div className={styles.loadingState}>
                <i className="fas fa-spinner fa-spin"></i>
                <p>Loading invoices...</p>
              </div>
            ) : filteredInvoices.length > 0 ? (
              <table className={styles.invoiceTable}>
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Due Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id}>
                      <td><strong>{inv.invoice_no || '-'}</strong></td>
                      <td>{inv.customer_name || '-'}</td>
                      <td>{formatDate(inv.invoice_date)}</td>
                      <td>{formatDate(inv.due_date)}</td>
                      <td>{formatCurrency(inv.grand_total)}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${getStatusClass(inv.status)}`}>
                          {inv.status || 'draft'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actionButtons}>
                          {(inv.status === 'draft' || inv.status === 'sent') && (
                            <button
                              className={styles.btnApprove}
                              title="Approve Invoice"
                              onClick={() => handleApprove(inv.id)}
                            >
                              <i className="fas fa-check"></i>
                            </button>
                          )}
                          {(inv.status === 'draft' || inv.status === 'sent') ? (
                            <>
                              <button
                                className={styles.btnEdit}
                                title="Edit"
                                onClick={() => handleEditInvoice(inv)}
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button
                                className={styles.btnDelete}
                                title="Delete"
                                onClick={() => handleDeleteInvoice(inv.id)}
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </>
                          ) : (
                            <button
                              className={styles.btnEdit}
                              title="View"
                              onClick={() => handleViewInvoice(inv)}
                            >
                              <i className="fas fa-eye"></i>
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
                  <i className="fas fa-file-invoice" style={{fontSize:'48px',color:'#e2e8f0'}} />
                  <h3 style={{margin:'8px 0 4px',fontSize:'18px',fontWeight:600,color:'#4a5568'}}>No Invoices Yet</h3>
                  <p style={{margin:0,color:'#a0aec0',fontSize:'14px'}}>{searchTerm ? 'Try adjusting your search' : 'Create your first invoice to get started'}</p>
                  {!searchTerm && (
                    <button
                      style={{marginTop:'12px',background:'#2CA01C',color:'white',border:'none',padding:'9px 20px',borderRadius:'6px',cursor:'pointer',fontSize:'14px',fontWeight:500}}
                      onClick={handleNewInvoice}
                    >
                      + New Invoice
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Invoice Form Popup ────────────────────────────────────────────── */}
      {showForm && (
        <div className={styles.invoicePopupOverlay}>
          <div className={styles.invoicePopup}>

            {/* Header */}
            <div className={styles.popupHeader}>
              <div className={styles.headerLeft}>
                <h2>{viewMode ? `View Invoice ${editingInvoice?.invoice_no || ''}` : editingInvoice ? `Edit Invoice ${editingInvoice.invoice_no || ''}` : 'Create Invoice'}</h2>
              </div>
              <div className={styles.headerRight}>
                <button className={styles.closeBtn} onClick={handleFormClose}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className={styles.popupContent}>

              {/* Upper Section */}
              <div className={styles.invoiceUpperSection}>
                <div className={styles.sectionCard}>
                  <div className={styles.invoiceHeaderRow}>
                    {/* Left Side - Customer */}
                    <div className={styles.customerSection}>
                      <div className={styles.formGroup}>
                        <label>Customer</label>
                        <div className={styles.autocompleteWrapper} ref={autocompleteRef}>
                          <input
                            type="text"
                            className={styles.formControlStandard}
                            placeholder="Search or select customer"
                            value={customerSearchText}
                            onChange={viewMode ? undefined : handleCustomerInputChange}
                            onFocus={() => !viewMode && setShowCustomerDropdown(true)}
                            readOnly={viewMode}
                            style={viewMode ? { backgroundColor: '#f5f5f5', cursor: 'default' } : {}}
                          />
                          {showCustomerDropdown && (
                            <div className={styles.autocompleteDropdown}>
                              <div
                                className={styles.autocompleteOption + ' ' + styles.addNewOption}
                                onClick={handleAddNewCustomer}
                              >
                                <i className="fas fa-plus"></i> Add New
                              </div>
                              {filteredCustomers.length > 0 ? (
                                filteredCustomers.map(customer => (
                                  <div
                                    key={customer.id}
                                    className={styles.autocompleteOption}
                                    onClick={() => handleCustomerSelect(customer.name)}
                                  >
                                    {customer.name}
                                  </div>
                                ))
                              ) : (
                                customerSearchText && (
                                  <div className={styles.autocompleteOption + ' ' + styles.noResults}>
                                    No customers found
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className={styles.formGroup}>
                        <label>Bill To</label>
                        <textarea
                          className={styles.formControlStandard}
                          placeholder="Billing address will populate automatically"
                          value={billTo}
                          onChange={(e) => setBillTo(e.target.value)}
                          rows="3"
                          readOnly={viewMode}
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label>Ship To</label>
                        <textarea
                          className={styles.formControlStandard}
                          placeholder="Shipping address will populate automatically"
                          value={shipTo}
                          onChange={(e) => setShipTo(e.target.value)}
                          rows="3"
                          readOnly={viewMode}
                        />
                      </div>
                    </div>

                    {/* Right Side - Invoice Details */}
                    <div className={styles.invoiceDetailsColumn}>
                      <div className={styles.formGroup}>
                        <label>Invoice Number</label>
                        <input
                          type="text"
                          className={styles.formControlStandard}
                          value={invoiceNo || 'Auto-generated'}
                          readOnly
                          style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Terms</label>
                        <select
                          className={styles.formControlStandard}
                          value={terms}
                          onChange={(e) => setTerms(e.target.value)}
                          disabled={viewMode}
                        >
                          <option>Net 30</option>
                          <option>Net 15</option>
                          <option>Due on Receipt</option>
                          <option>Net 60</option>
                        </select>
                      </div>
                      <div className={styles.formGroup}>
                        <label>Invoice Date</label>
                        <input
                          type="date"
                          className={styles.formControlStandard}
                          value={invoiceDate}
                          onChange={(e) => setInvoiceDate(e.target.value)}
                          readOnly={viewMode}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Reference Number</label>
                        <input
                          type="text"
                          className={styles.formControlStandard}
                          placeholder="PO-12345"
                          value={referenceNo}
                          onChange={(e) => setReferenceNo(e.target.value)}
                          readOnly={viewMode}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Due Date</label>
                        <input
                          type="date"
                          className={styles.formControlStandard}
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          readOnly={viewMode}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Section - Line Items */}
              <div className={styles.invoiceBottomSection}>
                <div className={styles.sectionCard}>
                  <div className={styles.sectionHeader}>
                    <h3>Items</h3>
                  </div>

                  <div className={styles.tableContainer}>
                    <table className={styles.itemsTable}>
                      <thead>
                        <tr>
                          <th className={styles.colSku}>SKU</th>
                          <th className={styles.colDescription}>Description</th>
                          <th className={styles.colQuantity}>Quantity</th>
                          <th className={styles.colRate}>Rate</th>
                          <th className={styles.colDiscount}>Discount</th>
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
                            <td>
                              <input
                                type="number"
                                className={styles.formControlTable}
                                value={item.quantity}
                                min="1"
                                onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                onFocus={() => !viewMode && handleFieldFocus(item.id)}
                                readOnly={viewMode}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                className={styles.formControlTable}
                                value={item.rate}
                                min="0"
                                step="0.01"
                                readOnly={isCustomerRole || viewMode}
                                onChange={(e) => updateLineItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                                onFocus={() => handleFieldFocus(item.id)}
                                style={isCustomerRole || viewMode ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                className={styles.formControlTable}
                                value={item.discount}
                                min="0"
                                step="0.01"
                                onChange={(e) => updateLineItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                                onFocus={() => !viewMode && handleFieldFocus(item.id)}
                                readOnly={viewMode}
                              />
                            </td>
                            <td className={styles.amountCell}>
                              {currencySymbol}{item.amount.toFixed(2)}
                            </td>
                            <td className={styles.actionCell}>
                              <button
                                className={styles.btnRemove}
                                onClick={() => removeLineItem(item.id)}
                                disabled={lineItems.length === 1 || viewMode}
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Bottom Row - Notes and Totals */}
                  <div className={styles.bottomRow}>
                    {/* Left - Notes and Attachments */}
                    <div className={styles.notesAttachmentsSection}>
                      <div className={styles.formGroup}>
                        <label>Notes</label>
                        <textarea
                          className={styles.formControlStandard}
                          rows="3"
                          placeholder="Add any additional notes or instructions..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          readOnly={viewMode}
                        ></textarea>
                      </div>
                      <div className={styles.formGroup}>
                        <label>Attachments</label>
                        <div className={styles.attachmentArea}>
                          <input
                            type="file"
                            id="invoiceFileUpload"
                            className={styles.fileInput}
                            multiple
                          />
                          <label htmlFor="invoiceFileUpload" className={styles.fileUploadLabel}>
                            <i className="fas fa-cloud-upload-alt"></i>
                            <span>Click to upload or drag and drop</span>
                            <small>PDF, DOC, JPG, PNG (Max 10MB each)</small>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Right - Totals */}
                    <div className={styles.totalsSection}>
                      <div className={styles.totalsGrid}>
                        <div className={styles.totalRow}>
                          <span className={styles.totalLabel}>Subtotal:</span>
                          <span className={styles.totalValue}>{currencySymbol}{calculateSubtotal().toFixed(2)}</span>
                        </div>

                        {/* Tax Dropdown */}
                        <div className={styles.totalRow}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className={styles.totalLabel}>Tax:</span>
                            <div className={styles.taxSelectWrapper} style={{ position: 'relative', width: '200px' }} ref={taxDropdownRef}>
                              <div
                                className={styles.taxSelectButton}
                                onClick={() => !viewMode && setShowTaxDropdown(true)}
                                style={viewMode ? { cursor: 'default' } : {}}
                              >
                                <span>{selectedTax ? `${selectedTax.name} (${selectedTax.rate}%)` : 'Select tax'}</span>
                                <i className="fas fa-chevron-down"></i>
                              </div>
                              {showTaxDropdown && (
                                <div className={styles.autocompleteDropdown}>
                                  <div
                                    className={styles.autocompleteOption + ' ' + styles.addNewOption}
                                    onClick={handleAddNewTax}
                                  >
                                    <i className="fas fa-plus"></i> Add New
                                  </div>
                                  {taxes.map((t) => (
                                    <div
                                      key={t.id}
                                      className={styles.autocompleteOption}
                                      onClick={() => handleTaxSelect(t)}
                                    >
                                      {t.name} ({t.rate}%)
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <span className={styles.totalValue}>{currencySymbol}{calculateTax().toFixed(2)}</span>
                        </div>

                        <div className={styles.totalRow}>
                          <span className={styles.totalLabel}>Discount:</span>
                          <span className={styles.totalValue}>{currencySymbol}{calculateDiscount().toFixed(2)}</span>
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

            {/* Fixed Footer */}
            <div className={styles.popupFooter}>
              <div className={styles.footerLeft}>
                {!viewMode && error && <span style={{ color: '#ef4444', fontSize: '14px' }}>{error}</span>}
                <button className={styles.btnCancel} onClick={handleFormClose}>{viewMode ? 'Close' : 'Cancel'}</button>
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
                    {saving ? 'Saving...' : editingInvoice ? 'Update' : 'Save'}
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Customer Popup */}
          <CustomerPopup
            isOpen={isCustomerPopupOpen}
            onClose={handleCustomerPopupClose}
            onSave={handleCustomerSave}
          />

          {/* Tax Popup */}
          <TaxPopup
            isOpen={isTaxPopupOpen}
            onClose={handleTaxPopupClose}
            onSave={handleTaxSave}
          />
        </div>
      )}

      {/* ── Delivery Note Picker Modal ─────────────────────────────────────── */}
      {showDnPicker && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 28, minWidth: 420, maxWidth: 560, maxHeight: '70vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.22)' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 16, color: '#111' }}>Link a Delivery Note</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>Select a shipped delivery note to auto-fill this invoice, or skip to enter manually.</p>
            {dnPickerLoading ? (
              <p style={{ color: '#6b7280', fontSize: 13 }}>Loading…</p>
            ) : dnPickerNotes.map(n => (
              <div
                key={n.id}
                onClick={() => handleDnSelect(n)}
                style={{ padding: '10px 14px', borderRadius: 6, border: '1px solid #e5e7eb', marginBottom: 8, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
              >
                <div>
                  <span style={{ fontWeight: 600, color: '#0891b2' }}>{n.delivery_note_no}</span>
                  {n.source_so_no && <span style={{ marginLeft: 8, fontSize: 12, color: '#6b7280' }}>SO: {n.source_so_no}</span>}
                </div>
                <span style={{ fontSize: 12, color: '#6b7280', textTransform: 'capitalize' }}>{n.status}</span>
              </div>
            ))}
            <button
              onClick={() => setShowDnPicker(false)}
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
