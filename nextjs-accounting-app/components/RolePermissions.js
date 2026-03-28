'use client'

import { useState, useEffect, Fragment } from 'react'
import * as api from '@/lib/api'

const MENU_GROUPS = [
  { group: 'General', items: ['Dashboard'] },
  { group: 'Sales', items: ['Invoices', 'Sales Order', 'Delivery Notes', 'Estimates/Quotations', 'Customer Payments', 'Quick Order'] },
  { group: 'Purchases', items: ['Bills', 'Expenses', 'Purchase Order', 'Bill Payments'] },
  { group: 'Contacts', items: ['Customer Center', 'Vendor Center'] },
  { group: 'Inventory', items: ['Product Center', 'Stock Valuation', 'Stock Mobility'] },
  { group: 'Reports', items: ['Financial Statements', 'Revenue & Sales Analysis', 'Cost & Expense Analytics', 'Receivables & Payables', 'Planning & Performance Analysis'] },
  { group: 'Banking', items: ['Banking Center'] },
  { group: 'Accounting', items: ['Chart of Accounts', 'Journal Entries', 'General Ledger', 'Trial Balance'] },
  { group: 'Settings', items: ['Recurring Documents', 'Company Settings', 'ERP Flow Guide', 'Tax', 'Ship Via', 'Users & Roles', 'Role Permissions'] },
]

const ROLES = ['admin', 'salesperson', 'customer']

export default function RolePermissions({ isOpen, onClose }) {
  const [matrix, setMatrix] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (isOpen) loadPermissions()
  }, [isOpen])

  const loadPermissions = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.getAllRolePermissions()
      const perms = res.data || []
      const m = {}
      // Initialize all cells
      for (const role of ROLES) {
        for (const g of MENU_GROUPS) {
          for (const item of g.items) {
            const key = `${role}::${item}`
            m[key] = { can_access: role === 'admin', display_name: '' }
          }
        }
      }
      // Overlay backend data
      for (const p of perms) {
        const key = `${p.role}::${p.menu_name}`
        m[key] = { can_access: p.can_access, display_name: p.display_name || '' }
      }
      // Admin always has access
      for (const g of MENU_GROUPS) {
        for (const item of g.items) {
          m[`admin::${item}`] = { ...m[`admin::${item}`], can_access: true }
        }
      }
      setMatrix(m)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleAccess = (role, menuName) => {
    if (role === 'admin') return
    const key = `${role}::${menuName}`
    setMatrix(prev => ({ ...prev, [key]: { ...prev[key], can_access: !prev[key]?.can_access } }))
  }

  const setDisplayName = (role, menuName, value) => {
    const key = `${role}::${menuName}`
    setMatrix(prev => ({ ...prev, [key]: { ...prev[key], display_name: value } }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const payload = []
      for (const role of ROLES) {
        for (const g of MENU_GROUPS) {
          for (const item of g.items) {
            const key = `${role}::${item}`
            const cell = matrix[key] || {}
            payload.push({
              role,
              menu_name: item,
              can_access: cell.can_access ?? (role === 'admin'),
              display_name: cell.display_name || '',
            })
          }
        }
      }
      await api.updateRolePermissions(payload)
      setSuccess('Permissions saved successfully')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
      paddingTop: 60, overflowY: 'auto',
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, width: '95%', maxWidth: 1100,
        maxHeight: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 24px', borderBottom: '1px solid #e2e8f0',
        }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e293b' }}>
            <i className="fas fa-shield-alt" style={{ marginRight: 10, color: '#2563eb' }}></i>
            Role Permissions
          </h2>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={handleSave} disabled={saving} style={{
              padding: '8px 20px', background: '#2563eb', color: '#fff', border: 'none',
              borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
              opacity: saving ? 0.6 : 1,
            }}>
              <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-save'}`} style={{ marginRight: 6 }}></i>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button onClick={onClose} style={{
              width: 36, height: 36, border: 'none', background: '#f1f5f9',
              borderRadius: 8, cursor: 'pointer', fontSize: 16, color: '#64748b',
            }}>
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div style={{ margin: '12px 24px 0', padding: '10px 14px', background: '#fef2f2', color: '#dc2626', borderRadius: 8, fontSize: 13 }}>
            <i className="fas fa-exclamation-circle" style={{ marginRight: 6 }}></i>{error}
          </div>
        )}
        {success && (
          <div style={{ margin: '12px 24px 0', padding: '10px 14px', background: '#f0fdf4', color: '#16a34a', borderRadius: 8, fontSize: 13 }}>
            <i className="fas fa-check-circle" style={{ marginRight: 6 }}></i>{success}
          </div>
        )}

        {/* Matrix Table */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: 24 }}></i>
              <p>Loading permissions...</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                  <th style={{ ...thStyle, width: '28%' }}>Menu Item</th>
                  {ROLES.map(role => (
                    <th key={role} style={{ ...thStyle, textAlign: 'center', width: '24%' }}>
                      <span style={{
                        padding: '3px 12px', borderRadius: 12, fontSize: 11, fontWeight: 700, textTransform: 'capitalize',
                        background: role === 'admin' ? '#f3e8ff' : role === 'salesperson' ? '#dbeafe' : '#dcfce7',
                        color: role === 'admin' ? '#7c3aed' : role === 'salesperson' ? '#2563eb' : '#16a34a',
                      }}>
                        {role}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MENU_GROUPS.map(group => (
                  <Fragment key={group.group}>
                    <tr>
                      <td colSpan={4} style={{
                        padding: '10px 12px 6px', fontWeight: 700, fontSize: 12,
                        color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em',
                        borderTop: '1px solid #e2e8f0', background: '#f8fafc',
                      }}>
                        {group.group}
                      </td>
                    </tr>
                    {group.items.map(menuName => (
                      <tr key={menuName} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px 8px 24px', color: '#334155', fontWeight: 500 }}>
                          {menuName}
                        </td>
                        {ROLES.map(role => {
                          const key = `${role}::${menuName}`
                          const cell = matrix[key] || { can_access: role === 'admin', display_name: '' }
                          const isAdmin = role === 'admin'
                          return (
                            <td key={role} style={{ padding: '6px 12px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                <input
                                  type="checkbox"
                                  checked={cell.can_access}
                                  disabled={isAdmin}
                                  onChange={() => toggleAccess(role, menuName)}
                                  style={{ cursor: isAdmin ? 'not-allowed' : 'pointer', accentColor: '#2563eb' }}
                                />
                                <input
                                  type="text"
                                  placeholder="label"
                                  value={cell.display_name}
                                  onChange={e => setDisplayName(role, menuName, e.target.value)}
                                  style={{
                                    width: 80, padding: '3px 6px', border: '1px solid #e2e8f0',
                                    borderRadius: 4, fontSize: 11, color: '#64748b', outline: 'none',
                                  }}
                                />
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

const thStyle = { textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }
