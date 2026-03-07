'use client'

import { useState, useEffect } from 'react'
import * as api from '@/lib/api'

const roleBadgeColors = {
  admin: { bg: '#f3e8ff', color: '#7c3aed' },
  salesperson: { bg: '#dbeafe', color: '#2563eb' },
  customer: { bg: '#dcfce7', color: '#16a34a' },
}

export default function UserManagement({ isOpen, onClose }) {
  const [users, setUsers] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editRole, setEditRole] = useState('')
  const [editActive, setEditActive] = useState(true)
  const [linkingUserId, setLinkingUserId] = useState(null)
  const [linkCustomerId, setLinkCustomerId] = useState('')

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    username: '',
    role: 'salesperson',
    customer_id: '',
  })

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const [usersRes, custRes] = await Promise.all([api.getUsers(), api.getCustomers()])
      setUsers(usersRes.data?.users || [])
      const custList = custRes.data?.customers || custRes.data || []
      setCustomers(Array.isArray(custList) ? custList : [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) fetchData()
  }, [isOpen])

  if (!isOpen) return null

  const clearMessages = () => { setError(''); setSuccess('') }

  const handleFormChange = (field, value) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value }
      if (field === 'email' && !prev._usernameManual) {
        updated.username = value.split('@')[0]
      }
      return updated
    })
  }

  const handleCreate = async () => {
    clearMessages()
    try {
      const payload = {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        password: form.password,
        username: form.username,
        role: form.role,
      }
      if (form.customer_id) payload.customer_id = form.customer_id
      await api.createUser(payload)
      setSuccess('User created successfully')
      setShowForm(false)
      setForm({ first_name: '', last_name: '', email: '', password: '', username: '', role: 'salesperson', customer_id: '' })
      fetchData()
    } catch (err) {
      setError(err.message)
    }
  }

  const startEdit = (user) => {
    setEditingId(user.id)
    setEditRole(user.role)
    setEditActive(user.is_active !== false)
  }

  const saveEdit = async (userId) => {
    clearMessages()
    try {
      await api.updateUser(userId, { role: editRole, is_active: editActive })
      setSuccess('User updated')
      setEditingId(null)
      fetchData()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (userId, userName) => {
    if (!confirm(`Delete user "${userName}"? This cannot be undone.`)) return
    clearMessages()
    try {
      await api.deleteUser(userId)
      setSuccess('User deleted')
      fetchData()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleLink = async () => {
    clearMessages()
    try {
      await api.linkCustomer(linkingUserId, linkCustomerId)
      setSuccess('Customer linked')
      setLinkingUserId(null)
      setLinkCustomerId('')
      fetchData()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleUnlink = async (userId) => {
    clearMessages()
    try {
      await api.unlinkCustomer(userId)
      setSuccess('Customer unlinked')
      fetchData()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
      paddingTop: 60, overflowY: 'auto',
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, width: '95%', maxWidth: 1000,
        maxHeight: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 24px', borderBottom: '1px solid #e2e8f0',
        }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e293b' }}>
            <i className="fas fa-users-cog" style={{ marginRight: 10, color: '#7c3aed' }}></i>
            Users &amp; Roles
          </h2>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={() => { setShowForm(!showForm); clearMessages() }} style={{
              padding: '8px 16px', background: '#7c3aed', color: '#fff', border: 'none',
              borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}>
              <i className="fas fa-plus" style={{ marginRight: 6 }}></i>
              New User
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

        {/* Create Form */}
        {showForm && (
          <div style={{ margin: '16px 24px 0', padding: 20, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: '#334155' }}>Create New User</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>First Name</label>
                <input style={inputStyle} value={form.first_name} onChange={e => handleFormChange('first_name', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Last Name</label>
                <input style={inputStyle} value={form.last_name} onChange={e => handleFormChange('last_name', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input style={inputStyle} type="email" value={form.email} onChange={e => handleFormChange('email', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <input style={inputStyle} type="password" value={form.password} onChange={e => handleFormChange('password', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Username</label>
                <input style={inputStyle} value={form.username} onChange={e => { setForm(prev => ({ ...prev, username: e.target.value, _usernameManual: true })) }} />
              </div>
              <div>
                <label style={labelStyle}>Role</label>
                <select style={inputStyle} value={form.role} onChange={e => handleFormChange('role', e.target.value)}>
                  <option value="salesperson">Salesperson</option>
                  <option value="customer">Customer</option>
                </select>
              </div>
              {form.role === 'customer' && (
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={labelStyle}>Link to Customer (optional)</label>
                  <select style={inputStyle} value={form.customer_id} onChange={e => handleFormChange('customer_id', e.target.value)}>
                    <option value="">-- Select Customer --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name || c.customerName}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowForm(false)} style={{ padding: '8px 18px', border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={handleCreate} style={{ padding: '8px 18px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Create User</button>
            </div>
          </div>
        )}

        {/* Link Customer Dialog */}
        {linkingUserId && (
          <div style={{ margin: '16px 24px 0', padding: 16, background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe' }}>
            <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600, color: '#1e40af' }}>Link Customer to User</h4>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <select style={{ ...inputStyle, flex: 1 }} value={linkCustomerId} onChange={e => setLinkCustomerId(e.target.value)}>
                <option value="">-- Select Customer --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name || c.customerName}</option>
                ))}
              </select>
              <button onClick={handleLink} disabled={!linkCustomerId} style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: linkCustomerId ? 1 : 0.5 }}>Link</button>
              <button onClick={() => { setLinkingUserId(null); setLinkCustomerId('') }} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: 24 }}></i>
              <p>Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
              <i className="fas fa-users" style={{ fontSize: 40, marginBottom: 12 }}></i>
              <p>No users found</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Role</th>
                  <th style={thStyle}>Linked Customer</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => {
                  const badge = roleBadgeColors[user.role] || roleBadgeColors.salesperson
                  const isEditing = editingId === user.id
                  return (
                    <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={tdStyle}>{user.first_name} {user.last_name}</td>
                      <td style={tdStyle}>{user.email}</td>
                      <td style={tdStyle}>
                        {isEditing ? (
                          <select value={editRole} onChange={e => setEditRole(e.target.value)} style={{ ...inputStyle, padding: '4px 8px', fontSize: 12 }}>
                            <option value="admin">Admin</option>
                            <option value="salesperson">Salesperson</option>
                            <option value="customer">Customer</option>
                          </select>
                        ) : (
                          <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: badge.bg, color: badge.color }}>
                            {user.role}
                          </span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        {user.linked_customer_name || user.linked_customer_id ? (
                          <span style={{ color: '#16a34a', fontSize: 12 }}>
                            <i className="fas fa-link" style={{ marginRight: 4 }}></i>
                            {user.linked_customer_name || `#${user.linked_customer_id}`}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: 12 }}>--</span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        {isEditing ? (
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12 }}>
                            <input type="checkbox" checked={editActive} onChange={e => setEditActive(e.target.checked)} />
                            {editActive ? 'Active' : 'Inactive'}
                          </label>
                        ) : (
                          <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: user.is_active !== false ? '#dcfce7' : '#fee2e2', color: user.is_active !== false ? '#16a34a' : '#dc2626' }}>
                            {user.is_active !== false ? 'Active' : 'Inactive'}
                          </span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {isEditing ? (
                            <>
                              <button onClick={() => saveEdit(user.id)} title="Save" style={actionBtnStyle('#16a34a')}>
                                <i className="fas fa-check"></i>
                              </button>
                              <button onClick={() => setEditingId(null)} title="Cancel" style={actionBtnStyle('#94a3b8')}>
                                <i className="fas fa-times"></i>
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startEdit(user)} title="Edit" style={actionBtnStyle('#2563eb')}>
                                <i className="fas fa-edit"></i>
                              </button>
                              {user.linked_customer_id ? (
                                <button onClick={() => handleUnlink(user.id)} title="Unlink Customer" style={actionBtnStyle('#f59e0b')}>
                                  <i className="fas fa-unlink"></i>
                                </button>
                              ) : (
                                <button onClick={() => { setLinkingUserId(user.id); setLinkCustomerId('') }} title="Link Customer" style={actionBtnStyle('#7c3aed')}>
                                  <i className="fas fa-link"></i>
                                </button>
                              )}
                              <button onClick={() => handleDelete(user.id, `${user.first_name} ${user.last_name}`)} title="Delete" style={actionBtnStyle('#dc2626')}>
                                <i className="fas fa-trash"></i>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }
const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }
const thStyle = { textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }
const tdStyle = { padding: '12px 12px', verticalAlign: 'middle' }
const actionBtnStyle = (color) => ({ width: 30, height: 30, border: 'none', borderRadius: 6, background: `${color}11`, color, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' })
