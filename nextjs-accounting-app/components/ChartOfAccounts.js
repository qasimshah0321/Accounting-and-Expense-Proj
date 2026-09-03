'use client'

import { useState, useEffect, useCallback } from 'react'
import styles from './Invoice.module.css'
import * as api from '../lib/api'

const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'revenue', 'expense']
const TYPE_LABELS = { asset: 'Assets', liability: 'Liabilities', equity: 'Equity', revenue: 'Revenue', expense: 'Expenses' }

export default function ChartOfAccounts({ isOpen, onClose, currencySymbol = '$', onOpenLedger, onOpeningBalance, onYearEndClose }) {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [formData, setFormData] = useState({
    account_number: '', name: '', account_type: 'asset', sub_type: '', parent_id: '', description: '', normal_balance: '', is_active: true
  })

  const loadAccounts = useCallback(async () => {
    setLoading(true)
    setListError('')
    try {
      const res = await api.getAccounts(filterType)
      const data = res.data?.accounts || res.accounts || res.data || []
      setAccounts(data)
    } catch (err) {
      setListError(err.message)
    } finally {
      setLoading(false)
    }
  }, [filterType])

  useEffect(() => {
    if (isOpen) loadAccounts()
  }, [isOpen, loadAccounts])

  const resetForm = () => {
    setFormData({ account_number: '', name: '', account_type: 'asset', sub_type: '', parent_id: '', description: '', normal_balance: '', is_active: true })
    setEditingAccount(null)
    setError('')
  }

  const handleNewAccount = () => {
    resetForm()
    setShowForm(true)
  }

  const handleEdit = (acct) => {
    setFormData({
      account_number: acct.account_number,
      name: acct.name,
      account_type: acct.account_type,
      sub_type: acct.sub_type || '',
      parent_id: acct.parent_id || '',
      description: acct.description || '',
      normal_balance: acct.normal_balance,
      is_active: !!acct.is_active
    })
    setEditingAccount(acct)
    setShowForm(true)
  }

  const handleDelete = async (acct) => {
    if (!confirm(`Delete account ${acct.account_number} - ${acct.name}?`)) return
    try {
      await api.deleteAccount(acct.id)
      loadAccounts()
    } catch (err) {
      alert(err.message)
    }
  }

  const inferNormalBalance = (type) => {
    if (type === 'asset' || type === 'expense') return 'debit'
    return 'credit'
  }

  const handleSave = async () => {
    if (!formData.account_number.trim()) {
      setError('Account number is required.')
      return
    }
    if (!editingAccount && formData.account_number.trim() === '0') {
      setError('Account number cannot be "0". Please use a meaningful account number (e.g. 1010).')
      return
    }
    if (!formData.name.trim()) {
      setError('Account name is required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...formData,
        normal_balance: formData.normal_balance || inferNormalBalance(formData.account_type),
        parent_id: formData.parent_id || null,
        sub_type: formData.sub_type || null,
        description: formData.description || null,
        is_active: !!formData.is_active
      }
      if (editingAccount) {
        await api.updateAccount(editingAccount.id, payload)
      } else {
        await api.createAccount(payload)
      }
      setShowForm(false)
      resetForm()
      loadAccounts()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const filteredAccounts = accounts.filter(a => {
    if (searchTerm) {
      const s = searchTerm.toLowerCase()
      return (a.name || '').toLowerCase().includes(s) || (a.account_number || '').toLowerCase().includes(s)
    }
    return true
  })

  const groupedAccounts = {}
  for (const type of ACCOUNT_TYPES) {
    groupedAccounts[type] = filteredAccounts.filter(a => a.account_type === type)
  }

  const formatBalance = (balance) => {
    const num = parseFloat(balance) || 0
    return currencySymbol + Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  if (!isOpen) return null

  return (
    <div className={styles.invoicePopupOverlay} onClick={onClose}>
      <div className={styles.invoicePopup} onClick={e => e.stopPropagation()} style={{ maxWidth: 1100, width: '95%' }}>
        <div className={styles.popupHeader}>
          <h2>Chart of Accounts</h2>
          <button className={styles.closeBtn} onClick={onClose}><i className="fas fa-times" /></button>
        </div>

        {!showForm ? (
          <div className={styles.popupContent}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text" placeholder="Search accounts..."
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                style={{ flex: 1, minWidth: 200, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6 }}
              />
              <select
                value={filterType} onChange={e => setFilterType(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6 }}
              >
                <option value="">All Types</option>
                {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
              {onOpeningBalance && (
                <button onClick={onOpeningBalance} style={{ padding: '8px 16px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <i className="fas fa-balance-scale" /> Opening Balance
                </button>
              )}
              {onYearEndClose && (
                <button onClick={onYearEndClose} style={{ padding: '8px 16px', background: '#b45309', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <i className="fas fa-calendar-check" /> Year-End Close
                </button>
              )}
              <button onClick={handleNewAccount} className={styles.btnPrimary} style={{ padding: '8px 16px' }}>
                <i className="fas fa-plus" style={{ marginRight: 6 }} /> New Account
              </button>
            </div>

            {listError && <div style={{ color: '#dc2626', marginBottom: 10 }}>{listError}</div>}
            {loading && <div style={{ textAlign: 'center', padding: 20 }}><i className="fas fa-spinner fa-spin" /> Loading...</div>}

            {!loading && (
              <div style={{ maxHeight: 500, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Account #</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Name</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Type</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Sub-type</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Normal</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Balance</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Status</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(filterType ? [filterType] : ACCOUNT_TYPES).map(type => {
                      const typeAccounts = groupedAccounts[type] || []
                      if (!typeAccounts.length) return null
                      return [
                        <tr key={`header-${type}`}>
                          <td colSpan={8} style={{ padding: '10px 12px', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', color: '#475569', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                            {TYPE_LABELS[type]} ({typeAccounts.length})
                          </td>
                        </tr>,
                        ...typeAccounts.map(acct => (
                          <tr key={acct.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 12px' }}>
                              <span style={{ background: '#f1f5f9', color: '#374151', fontFamily: 'monospace', fontWeight: 700, fontSize: 12, padding: '2px 7px', borderRadius: 4, border: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                                {acct.account_number}
                              </span>
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              {acct.is_system && <i className="fas fa-lock" style={{ color: '#94a3b8', marginRight: 6, fontSize: 11 }} title="System account" />}
                              {acct.name}
                            </td>
                            <td style={{ padding: '8px 12px', textTransform: 'capitalize' }}>{acct.account_type}</td>
                            <td style={{ padding: '8px 12px', color: '#64748b', fontSize: 13 }}>{(acct.sub_type || '').replace(/_/g, ' ')}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 12, background: acct.normal_balance === 'debit' ? '#dbeafe' : '#fce7f3', color: acct.normal_balance === 'debit' ? '#1e40af' : '#9d174d' }}>
                                {acct.normal_balance}
                              </span>
                            </td>
                            <td
                              style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', cursor: onOpenLedger ? 'pointer' : undefined, color: onOpenLedger ? '#2563eb' : undefined }}
                              onClick={() => onOpenLedger && onOpenLedger(acct)}
                              title={onOpenLedger ? 'View in General Ledger' : undefined}
                            >
                              {formatBalance(acct.balance)}
                              {onOpenLedger && <i className="fas fa-chart-line" style={{ fontSize: 10, marginLeft: 5, color: '#94a3b8' }} />}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 12, background: acct.is_active ? '#dcfce7' : '#fef2f2', color: acct.is_active ? '#166534' : '#991b1b' }}>
                                {acct.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              <button onClick={() => handleEdit(acct)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', marginRight: 8 }} title="Edit">
                                <i className="fas fa-edit" />
                              </button>
                              {!acct.is_system && (
                                <button onClick={() => handleDelete(acct)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }} title="Delete">
                                  <i className="fas fa-trash" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      ]
                    })}
                    {!filteredAccounts.length && !loading && (
                      <tr><td colSpan={8} style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>No accounts found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.popupContent}>
            <h3 style={{ marginBottom: 16 }}>{editingAccount ? 'Edit Account' : 'New Account'}</h3>
            {error && <div style={{ color: '#dc2626', marginBottom: 10, padding: '8px 12px', background: '#fef2f2', borderRadius: 6 }}>{error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 13 }}>Account Number *</label>
                <input
                  type="text" value={formData.account_number}
                  onChange={e => setFormData({ ...formData, account_number: e.target.value })}
                  disabled={editingAccount?.is_system}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6 }}
                  placeholder="e.g. 1050"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 13 }}>Account Name *</label>
                <input
                  type="text" value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6 }}
                  placeholder="e.g. Checking Account"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 13 }}>Account Type *</label>
                <select
                  value={formData.account_type}
                  onChange={e => {
                    const type = e.target.value
                    setFormData({ ...formData, account_type: type, normal_balance: inferNormalBalance(type) })
                  }}
                  disabled={editingAccount?.is_system}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6 }}
                >
                  {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 13 }}>Sub-type</label>
                <input
                  type="text" value={formData.sub_type}
                  onChange={e => setFormData({ ...formData, sub_type: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6 }}
                  placeholder="e.g. current_asset"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 13 }}>Normal Balance</label>
                <select
                  value={formData.normal_balance || inferNormalBalance(formData.account_type)}
                  onChange={e => setFormData({ ...formData, normal_balance: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6 }}
                >
                  <option value="debit">Debit</option>
                  <option value="credit">Credit</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 13 }}>Parent Account</label>
                <select
                  value={formData.parent_id}
                  onChange={e => setFormData({ ...formData, parent_id: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6 }}
                >
                  <option value="">None</option>
                  {accounts.filter(a => a.id !== editingAccount?.id).map(a => (
                    <option key={a.id} value={a.id}>{a.account_number} - {a.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 13 }}>Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, minHeight: 60 }}
                />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox" checked={formData.is_active}
                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <span style={{ fontWeight: 600, fontSize: 13 }}>Active</span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button onClick={() => { setShowForm(false); resetForm() }} style={{ padding: '8px 20px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} className={styles.btnPrimary} style={{ padding: '8px 20px' }}>
                {saving ? <><i className="fas fa-spinner fa-spin" /> Saving...</> : (editingAccount ? 'Update Account' : 'Create Account')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
