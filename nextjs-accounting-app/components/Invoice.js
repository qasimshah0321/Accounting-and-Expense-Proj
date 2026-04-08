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

  // ─── SO Picker state ──────────────────────────────────────────────────────
  const [showSoPicker, setShowSoPicker] = useState(false)
  const [soPickerItems, setSoPickerItems] = useState([])
  const [soPickerLoading, setSoPickerLoading] = useState(false)
  const [selectedSoIds, setSelectedSoIds] = useState([])
  const [showInvoiceTypeModal, setShowInvoiceTypeModal] = useState(false)
  const [showPartialModal, setShowPartialModal] = useState(false)
  const [partialItems, setPartialItems] = useState([])
  const [linkedSoData, setLinkedSoData] = useState([])

  // ─── DN Picker state (mandatory mode) ──────────────────────────────────
  const [dnRequirement, setDnRequirement] = useState('optional')
  const [showDnPicker, setShowDnPicker] = useState(false)
  const [dnPickerItems, setDnPickerItems] = useState([])
  const [dnPickerLoading, setDnPickerLoading] = useState(false)
  const [selectedDnId, setSelectedDnId] = useState(null)
  const [linkedDnData, setLinkedDnData] = useState(null)

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
      // Load DN requirement setting
      api.getCompanyProfile().then(res => {
        const data = res.data || {}
        setDnRequirement(data.dn_requirement || 'optional')
      }).catch(() => {})
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
    setShowSoPicker(false)
    setSoPickerItems([])
    setSelectedSoIds([])
    setShowInvoiceTypeModal(false)
    setShowPartialModal(false)
    setPartialItems([])
    setLinkedSoData([])
    setShowDnPicker(false)
    setDnPickerItems([])
    setSelectedDnId(null)
    setLinkedDnData(null)
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
    setShowSoPicker(false)
    setSelectedSoIds([])
    setShowInvoiceTypeModal(false)
    setShowPartialModal(false)
    setPartialItems([])
    setLinkedSoData([])
    setShowDnPicker(false)
    setDnPickerItems([])
    setSelectedDnId(null)
    setLinkedDnData(null)
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
    if (customer) {
      setBillTo(formatAddress(customer.billing_address, customer.billing_city, customer.billing_state, customer.billing_postal_code, customer.billing_country))
      setShipTo(formatAddress(customer.shipping_address, customer.shipping_city, customer.shipping_state, customer.shipping_postal_code, customer.shipping_country))
      if (!editingInvoice) {
        if (dnRequirement === 'mandatory') {
          fetchCustomerDeliveryNotes(customer.id)
        } else {
          fetchCustomerSalesOrders(customer.id)
        }
      }
    }
  }

  const fetchCustomerSalesOrders = async (customerId) => {
    setSoPickerLoading(true)
    try {
      const res = await api.getSalesOrdersForCustomer(customerId)
      const orders = res.data?.sales_orders || res.data?.orders || res.data || []
      const confirmed = orders.filter(o =>
        (o.status === 'confirmed' || o.status === 'in_progress') && o.status !== 'completed'
      )
      if (confirmed.length === 0) return
      // Fetch full details to check invoiced quantities and filter fully-invoiced SOs
      const detailed = await Promise.all(
        confirmed.map(o => api.getSalesOrder(o.id).then(r => r.data || r).catch(() => null))
      )
      const withBacklog = detailed.filter(so => {
        if (!so) return false
        const items = so.line_items || []
        return items.some(li =>
          (parseFloat(li.ordered_qty) || 0) > (parseFloat(li.invoiced_qty) || 0)
        )
      })
      if (withBacklog.length > 0) {
        setSoPickerItems(withBacklog)
        setSelectedSoIds([])
        setShowSoPicker(true)
      }
    } catch {}
    finally { setSoPickerLoading(false) }
  }

  // ─── DN Picker flow (mandatory mode) ──────────────────────────────────────
  const fetchCustomerDeliveryNotes = async (customerId) => {
    setDnPickerLoading(true)
    try {
      const res = await api.getDeliveryNotesForCustomer(customerId)
      const notes = res.data?.delivery_notes || res.data || []
      // Show shipped/delivered DNs that are not yet fully invoiced
      const eligible = notes.filter(dn =>
        ['shipped', 'in_transit', 'delivered', 'partially_invoiced'].includes(dn.status) && !dn.invoiced
      )
      if (eligible.length > 0) {
        setDnPickerItems(eligible)
        setSelectedDnId(null)
        setShowDnPicker(true)
      }
    } catch {}
    finally { setDnPickerLoading(false) }
  }

  const handleDnSelect = (dnId) => {
    setSelectedDnId(dnId === selectedDnId ? null : dnId)
  }

  const handleDnPickerProceed = async () => {
    if (!selectedDnId) return
    setShowDnPicker(false)
    setDnPickerLoading(true)
    try {
      const res = await api.getDeliveryNote(selectedDnId)
      const dn = res.data || res
      setLinkedDnData(dn)

      // Fetch SO pricing if available
      let soLineItemByProductId = new Map()
      let soLineItemBySku = new Map()
      let soLineItemsByPosition = []
      if (dn.sales_order_id) {
        try {
          const soRes = await api.getSalesOrder(dn.sales_order_id)
          const so = soRes.data || soRes
          if (so && so.line_items) {
            for (const soli of so.line_items) {
              if (soli.product_id) soLineItemByProductId.set(soli.product_id, soli)
              if (soli.sku) soLineItemBySku.set(soli.sku.toLowerCase(), soli)
              soLineItemsByPosition.push(soli)
            }
          }
          if (so.sales_order_no) setReferenceNo(so.sales_order_no)
        } catch {}
      }

      // Build line items from DN shipped quantities with SO pricing
      const items = (dn.line_items || []).map((li, idx) => {
        let rate = 0, taxRate = 0
        // Match to SO line items for pricing
        let soli = null
        if (li.product_id && soLineItemByProductId.has(li.product_id)) {
          soli = soLineItemByProductId.get(li.product_id)
        } else if (li.sku && soLineItemBySku.has(li.sku.toLowerCase())) {
          soli = soLineItemBySku.get(li.sku.toLowerCase())
        } else if (soLineItemsByPosition[idx]) {
          soli = soLineItemsByPosition[idx]
        }
        if (soli) {
          rate = parseFloat(soli.rate) || 0
          taxRate = parseFloat(soli.tax_rate) || 0
        }
        const qty = parseFloat(li.shipped_qty) || 0
        return {
          id: idx + 1,
          sku: li.sku || '',
          description: li.description || '',
          quantity: qty,
          rate,
          discount: 0,
          amount: qty * rate,
          dn_line_item_id: li.id,
        }
      }).filter(item => item.quantity > 0)

      if (items.length > 0) setLineItems(items)
      onDirtyChange(true)
    } catch (err) {
      setError('Failed to load delivery note details: ' + err.message)
    } finally {
      setDnPickerLoading(false)
    }
  }

  const toggleSoSelection = (soId) => {
    setSelectedSoIds(prev =>
      prev.includes(soId) ? prev.filter(id => id !== soId) : [...prev, soId]
    )
  }

  const handleSoPickerProceed = () => {
    if (selectedSoIds.length === 0) return
    setShowSoPicker(false)
    // Use already-fetched detailed SO data from soPickerItems
    const selected = soPickerItems.filter(so => selectedSoIds.includes(so.id))
    setLinkedSoData(selected)
    if (selected[0]?.sales_order_no) setReferenceNo(selected[0].sales_order_no)
    setShowInvoiceTypeModal(true)
  }

  const handleFullInvoice = () => {
    setShowInvoiceTypeModal(false)
    const items = []
    let idx = 1
    for (const so of linkedSoData) {
      for (const li of (so.line_items || [])) {
        const ordered = parseFloat(li.ordered_qty) || 0
        const invoiced = parseFloat(li.invoiced_qty || 0)
        const qty = ordered - invoiced
        if (qty > 0) {
          items.push({
            id: idx++,
            sku: li.sku || '',
            description: li.description || '',
            quantity: qty,
            rate: parseFloat(li.rate) || 0,
            discount: 0,
            amount: qty * (parseFloat(li.rate) || 0),
            sales_order_line_item_id: li.id,
          })
        }
      }
    }
    if (items.length > 0) setLineItems(items)
    onDirtyChange(true)
  }

  const handlePartialInvoice = () => {
    setShowInvoiceTypeModal(false)
    const items = []
    for (const so of linkedSoData) {
      for (const li of (so.line_items || [])) {
        const ordered = parseFloat(li.ordered_qty) || 0
        const invoiced = parseFloat(li.invoiced_qty || 0)
        const backlog = ordered - invoiced
        if (backlog > 0) {
          items.push({
            key: `${so.id}_${li.id}`,
            soNo: so.sales_order_no,
            sku: li.sku || '',
            description: li.description || '',
            orderedQty: ordered,
            invoicedQty: invoiced,
            backlog,
            invoiceQty: backlog,
            rate: parseFloat(li.rate) || 0,
            soLineItemId: li.id,
          })
        }
      }
    }
    setPartialItems(items)
    setShowPartialModal(true)
  }

  const handleApplyPartial = () => {
    setShowPartialModal(false)
    const items = partialItems
      .filter(pi => parseFloat(pi.invoiceQty) > 0)
      .map((pi, idx) => ({
        id: idx + 1,
        sku: pi.sku,
        description: pi.description,
        quantity: parseFloat(pi.invoiceQty) || 0,
        rate: pi.rate,
        discount: 0,
        amount: (parseFloat(pi.invoiceQty) || 0) * pi.rate,
        sales_order_line_item_id: pi.soLineItemId,
      }))
    if (items.length > 0) setLineItems(items)
    onDirtyChange(true)
  }

  const handlePrintDeliveryNotes = () => {
    if (!linkedSoData || linkedSoData.length === 0) {
      alert('No linked sales orders. Select customer and sales orders first.')
      return
    }
    const co = companyProfile || {}
    const coName = co.name || 'My Company'
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-CA') : ''
    const today = new Date().toLocaleDateString('en-CA')

    // Build a map of SO line item id → current invoice qty from the active line items
    const currentInvoiceQtyMap = {}
    lineItems.forEach(li => {
      if (li.sales_order_line_item_id) {
        currentInvoiceQtyMap[li.sales_order_line_item_id] = (currentInvoiceQtyMap[li.sales_order_line_item_id] || 0) + (parseFloat(li.quantity) || 0)
      }
    })

    const soRows = linkedSoData.map(so => {
      const itemRows = (so.line_items || []).map(li => {
        const ordered = parseFloat(li.ordered_qty) || 0
        const prevInvoiced = parseFloat(li.invoiced_qty || 0)
        const thisInvoiceQty = currentInvoiceQtyMap[li.id] || 0
        const backlogAfter = ordered - prevInvoiced - thisInvoiceQty
        return `<tr>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">${li.sku || '-'}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">${li.description || ''}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;">${ordered}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:600;color:#7c3aed;">${prevInvoiced}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:600;color:#2563eb;">${thisInvoiceQty}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:600;color:${backlogAfter > 0 ? '#dc2626' : '#16a34a'};">${backlogAfter}</td>
        </tr>`
      }).join('')
      return `
        <div style="margin-bottom:28px;page-break-inside:avoid;">
          <h3 style="margin:0 0 6px;font-size:15px;color:#374151;border-left:4px solid #2CA01C;padding-left:10px;">Sales Order: ${so.sales_order_no}</h3>
          <p style="margin:0 0 10px;font-size:12px;color:#6b7280;">Customer: ${so.customer_name || ''} &nbsp;|&nbsp; Date: ${fmtDate(so.order_date)}</p>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#2CA01C;color:white;">
                <th style="padding:9px 10px;text-align:left;font-size:12px;font-weight:600;">SKU</th>
                <th style="padding:9px 10px;text-align:left;font-size:12px;font-weight:600;">Description</th>
                <th style="padding:9px 10px;text-align:center;font-size:12px;font-weight:600;">Total Ordered</th>
                <th style="padding:9px 10px;text-align:center;font-size:12px;font-weight:600;">Prev Invoiced</th>
                <th style="padding:9px 10px;text-align:center;font-size:12px;font-weight:600;">This Invoice</th>
                <th style="padding:9px 10px;text-align:center;font-size:12px;font-weight:600;">Backlog</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
        </div>`
    }).join('')

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Delivery Notes - ${selectedCustomer}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; background: #fff; padding: 30px; }
    .page { max-width: 780px; margin: 0 auto; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
<div class="page">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #2CA01C;">
    <div>
      <h1 style="font-size:24px;font-weight:700;margin-bottom:4px;">Delivery Notes</h1>
      <p style="font-size:13px;color:#6b7280;">${coName} &nbsp;|&nbsp; Printed: ${today}</p>
    </div>
    <div style="text-align:right;">
      <p style="font-size:13px;margin-bottom:4px;"><strong>Customer:</strong> ${selectedCustomer}</p>
      <p style="font-size:13px;"><strong>Invoice Ref:</strong> ${referenceNo || 'Draft'}</p>
    </div>
  </div>
  ${soRows}
</div>
<script>window.onload = function(){ window.print(); }</script>
</body>
</html>`
    const win = window.open('', '_blank', 'width=900,height=700')
    win.document.write(html)
    win.document.close()
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
      // Pass delivery_note_id when using DN flow (mandatory mode)
      delivery_note_id: linkedDnData?.id || undefined,

      line_items: validItems.map(item => ({
        sku: item.sku || undefined,
        description: item.description,
        quantity: Number(item.quantity) || 1,
        rate: Number(item.rate) || 0,
        discount_per_item: Number(item.discount) || 0,
        tax_id: selectedTax?.id || null,
        tax_rate: taxRate,
        tax_amount: selectedTax ? Number((item.amount * taxRate / 100).toFixed(4)) : 0,
        sales_order_line_item_id: item.sales_order_line_item_id || undefined,
        dn_line_item_id: item.dn_line_item_id || undefined,
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

              {/* DN Mode Banner */}
              {dnRequirement === 'mandatory' && !editingInvoice && (
                <div style={{
                  margin: '0 0 12px', padding: '10px 16px', borderRadius: 6,
                  background: linkedDnData ? '#faf5ff' : '#fef3c7',
                  border: `1px solid ${linkedDnData ? '#c4b5fd' : '#fcd34d'}`,
                  display: 'flex', alignItems: 'center', gap: 10, fontSize: 13
                }}>
                  <i className={`fas ${linkedDnData ? 'fa-check-circle' : 'fa-info-circle'}`} style={{ color: linkedDnData ? '#7c3aed' : '#d97706' }}></i>
                  {linkedDnData ? (
                    <span>
                      Invoicing from <strong style={{ color: '#7c3aed' }}>{linkedDnData.delivery_note_no}</strong>
                      {linkedDnData.customer_name && <span> - {linkedDnData.customer_name}</span>}
                      <span style={{ marginLeft: 8, fontSize: 11, color: '#6b7280' }}>({linkedDnData.total_shipped_qty || 0} items shipped)</span>
                    </span>
                  ) : (
                    <span>Mandatory DN mode: Select a customer to choose a shipped Delivery Note for invoicing.</span>
                  )}
                </div>
              )}

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
                {user?.role === 'admin' && linkedSoData.length > 0 && (
                  <button
                    onClick={handlePrintDeliveryNotes}
                    style={{ marginLeft: 8, padding: '8px 18px', background: '#7c3aed', color: '#fff',
                             border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600,
                             display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    title="Print Delivery Notes"
                  >
                    <i className="fas fa-truck"></i> Print DN
                  </button>
                )}
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

      {/* ── Sales Order Picker Modal ──────────────────────────────────────── */}
      {showSoPicker && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 28, minWidth: 480, maxWidth: 600, maxHeight: '75vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.22)' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#111' }}>Select Sales Orders</h3>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: '#6b7280' }}>Select one or more confirmed sales orders to invoice, or skip to enter manually.</p>
            {soPickerLoading ? (
              <p style={{ color: '#6b7280', fontSize: 13 }}>Loading…</p>
            ) : (
              <div style={{ overflowY: 'auto', flex: 1, marginBottom: 14 }}>
                {soPickerItems.map(so => {
                  const isSelected = selectedSoIds.includes(so.id)
                  return (
                    <div
                      key={so.id}
                      onClick={() => toggleSoSelection(so.id)}
                      style={{
                        padding: '10px 14px', borderRadius: 6, marginBottom: 8, cursor: 'pointer',
                        border: `2px solid ${isSelected ? '#2CA01C' : '#e5e7eb'}`,
                        background: isSelected ? '#f0fdf4' : '#fff',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input type="checkbox" checked={isSelected} onChange={() => {}} style={{ width: 16, height: 16, accentColor: '#2CA01C' }} />
                        <div>
                          <span style={{ fontWeight: 600, color: '#2CA01C' }}>{so.sales_order_no}</span>
                          <span style={{ marginLeft: 10, fontSize: 12, color: '#6b7280' }}>{so.customer_name}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 12, color: '#374151', display: 'block' }}>{so.order_date ? new Date(so.order_date).toLocaleDateString() : ''}</span>
                        <span style={{ fontSize: 12, color: '#6b7280', textTransform: 'capitalize' }}>{so.status}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleSoPickerProceed}
                disabled={selectedSoIds.length === 0 || soPickerLoading}
                style={{ flex: 1, padding: '9px 0', background: selectedSoIds.length > 0 ? '#2CA01C' : '#d1d5db', color: '#fff', border: 'none', borderRadius: 6, cursor: selectedSoIds.length > 0 ? 'pointer' : 'not-allowed', fontSize: 14, fontWeight: 600 }}
              >
                {soPickerLoading ? 'Loading…' : `Proceed with ${selectedSoIds.length} Order${selectedSoIds.length !== 1 ? 's' : ''}`}
              </button>
              <button
                onClick={() => setShowSoPicker(false)}
                style={{ padding: '9px 18px', background: '#f3f4f6', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, color: '#374151' }}
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Invoice Type Modal ────────────────────────────────────────────── */}
      {showInvoiceTypeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 32, minWidth: 380, maxWidth: 460, boxShadow: '0 8px 32px rgba(0,0,0,0.22)', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, color: '#111' }}>Invoice Type</h3>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: '#6b7280' }}>How would you like to invoice the selected {linkedSoData.length} sales order{linkedSoData.length !== 1 ? 's' : ''}?</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={handleFullInvoice}
                style={{ flex: 1, padding: '14px 0', background: '#2CA01C', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 15, fontWeight: 700 }}
              >
                <i className="fas fa-file-invoice" style={{ marginRight: 8 }}></i>
                Full Invoice
              </button>
              <button
                onClick={handlePartialInvoice}
                style={{ flex: 1, padding: '14px 0', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 15, fontWeight: 700 }}
              >
                <i className="fas fa-file-alt" style={{ marginRight: 8 }}></i>
                Partial Invoice
              </button>
            </div>
            <button
              onClick={() => setShowInvoiceTypeModal(false)}
              style={{ marginTop: 14, width: '100%', padding: '8px 0', background: '#f3f4f6', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, color: '#374151' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Partial Invoice Modal ─────────────────────────────────────────── */}
      {showPartialModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 28, minWidth: 640, maxWidth: 820, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.22)' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#111' }}>Partial Invoice — Set Quantities</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>Enter the quantity to invoice for each item. Backlog is the remaining undelivered quantity.</p>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '9px 10px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '2px solid #e5e7eb' }}>SO #</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Description</th>
                    <th style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 600, color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Ordered</th>
                    <th style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 600, color: '#7c3aed', borderBottom: '2px solid #e5e7eb' }}>Invoiced</th>
                    <th style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 600, color: '#dc2626', borderBottom: '2px solid #e5e7eb' }}>Backlog</th>
                    <th style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 600, color: '#2563eb', borderBottom: '2px solid #e5e7eb' }}>Invoice Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {partialItems.map((pi) => (
                    <tr key={pi.key}>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', fontSize: 12, color: '#6b7280' }}>{pi.soNo}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ fontWeight: 500 }}>{pi.description}</div>
                        {pi.sku && <div style={{ fontSize: 11, color: '#94a3b8' }}>SKU: {pi.sku}</div>}
                      </td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>{pi.orderedQty}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', fontWeight: 600, color: '#7c3aed' }}>{pi.invoicedQty || 0}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', fontWeight: 600, color: '#dc2626' }}>{pi.backlog}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                        <input
                          type="number"
                          min="0"
                          max={pi.backlog}
                          value={pi.invoiceQty}
                          onChange={(e) => {
                            const val = Math.min(parseFloat(e.target.value) || 0, pi.backlog)
                            setPartialItems(prev => prev.map(p => p.key === pi.key ? { ...p, invoiceQty: val } : p))
                          }}
                          style={{ width: 80, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#2563eb' }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button
                onClick={handleApplyPartial}
                style={{ flex: 1, padding: '10px 0', background: '#2CA01C', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 700 }}
              >
                Apply to Invoice
              </button>
              <button
                onClick={() => { setShowPartialModal(false); setShowInvoiceTypeModal(true) }}
                style={{ padding: '10px 18px', background: '#f3f4f6', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, color: '#374151' }}
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delivery Note Picker Modal (mandatory DN mode) ─────────────────── */}
      {showDnPicker && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 28, minWidth: 480, maxWidth: 600, maxHeight: '75vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.22)' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#111' }}>
              <i className="fas fa-truck" style={{ marginRight: 8, color: '#7c3aed' }}></i>
              Select Delivery Note
            </h3>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: '#6b7280' }}>Your company requires invoices to be created from shipped Delivery Notes. Select one below.</p>
            {dnPickerLoading ? (
              <p style={{ color: '#6b7280', fontSize: 13 }}><i className="fas fa-spinner fa-spin"></i> Loading...</p>
            ) : dnPickerItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#6b7280' }}>
                <i className="fas fa-inbox" style={{ fontSize: 32, color: '#e2e8f0', marginBottom: 8, display: 'block' }}></i>
                <p style={{ margin: 0, fontSize: 13 }}>No eligible Delivery Notes found for this customer.</p>
                <p style={{ margin: '4px 0 0', fontSize: 12 }}>Create and ship a Delivery Note first.</p>
              </div>
            ) : (
              <div style={{ overflowY: 'auto', flex: 1, marginBottom: 14 }}>
                {dnPickerItems.map(dn => {
                  const isSelected = selectedDnId === dn.id
                  return (
                    <div
                      key={dn.id}
                      onClick={() => handleDnSelect(dn.id)}
                      style={{
                        padding: '10px 14px', borderRadius: 6, marginBottom: 8, cursor: 'pointer',
                        border: `2px solid ${isSelected ? '#7c3aed' : '#e5e7eb'}`,
                        background: isSelected ? '#faf5ff' : '#fff',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input type="radio" checked={isSelected} onChange={() => {}} style={{ width: 16, height: 16, accentColor: '#7c3aed' }} />
                        <div>
                          <span style={{ fontWeight: 600, color: '#7c3aed' }}>{dn.delivery_note_no}</span>
                          <span style={{ marginLeft: 10, fontSize: 12, color: '#6b7280' }}>{dn.customer_name}</span>
                          {dn.source_so_no && <span style={{ marginLeft: 8, fontSize: 11, color: '#94a3b8' }}>SO: {dn.source_so_no}</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 12, color: '#374151', display: 'block' }}>{dn.delivery_date ? new Date(dn.delivery_date).toLocaleDateString() : ''}</span>
                        <span style={{ fontSize: 12, color: dn.status === 'partially_invoiced' ? '#d97706' : '#16a34a', textTransform: 'capitalize', fontWeight: 600 }}>{dn.status.replace(/_/g, ' ')}</span>
                        <span style={{ fontSize: 11, color: '#6b7280', display: 'block' }}>Shipped: {dn.total_shipped_qty || 0} items</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleDnPickerProceed}
                disabled={!selectedDnId || dnPickerLoading}
                style={{ flex: 1, padding: '9px 0', background: selectedDnId ? '#7c3aed' : '#d1d5db', color: '#fff', border: 'none', borderRadius: 6, cursor: selectedDnId ? 'pointer' : 'not-allowed', fontSize: 14, fontWeight: 600 }}
              >
                {dnPickerLoading ? 'Loading...' : 'Create Invoice from DN'}
              </button>
              <button
                onClick={() => setShowDnPicker(false)}
                style={{ padding: '9px 18px', background: '#f3f4f6', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, color: '#374151' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
