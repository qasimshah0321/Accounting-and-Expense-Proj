'use client'

import { useState, useEffect, useRef } from 'react'
import * as api from '@/lib/api'

const ROLE_COLORS = {
  admin: { bg: '#f3e8ff', color: '#7c3aed' },
  salesperson: { bg: '#dbeafe', color: '#2563eb' },
  customer: { bg: '#dcfce7', color: '#16a34a' },
}
const ROLE_COLOR_POOL = [
  { bg:'#dbeafe', color:'#2563eb' }, { bg:'#dcfce7', color:'#16a34a' },
  { bg:'#fef3c7', color:'#d97706' }, { bg:'#fce7f3', color:'#db2777' },
  { bg:'#e0f2fe', color:'#0891b2' }, { bg:'#f0fdf4', color:'#15803d' },
]
const roleColor = (code) => ROLE_COLORS[code] || ROLE_COLOR_POOL[code.charCodeAt(0) % ROLE_COLOR_POOL.length]

const DEPT_PALETTE = ['#4f46e5','#7c3aed','#2563eb','#0891b2','#059669','#d97706','#dc2626','#db2777']

const ALL_CATEGORIES = [
  'General','Sales','Purchases','Contacts','Inventory','Reports','Banking','Accounting','Settings',
]

// ─── Shared UI helpers ─────────────────────────────────────────────────────────
const labelStyle = { display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:4 }
const inputStyle = { width:'100%', padding:'8px 12px', border:'1px solid #d1d5db', borderRadius:8, fontSize:13, outline:'none', boxSizing:'border-box' }
const thStyle = { textAlign:'left', padding:'10px 12px', fontSize:12, fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.05em' }
const tdStyle = { padding:'10px 12px', verticalAlign:'middle', fontSize:13 }
const btn = (bg, color='#fff') => ({ padding:'8px 16px', background:bg, color, border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600 })
const iconBtn = (color) => ({ width:30, height:30, border:'none', borderRadius:6, background:`${color}18`, color, cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center' })

// ─── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t) }, [])
  const bg = type === 'error' ? '#fef2f2' : '#f0fdf4'
  const color = type === 'error' ? '#dc2626' : '#16a34a'
  const icon = type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'
  return (
    <div style={{ position:'fixed', top:20, right:24, zIndex:99999, background:bg, color, border:`1px solid ${color}44`, borderRadius:10, padding:'12px 18px', fontSize:13, boxShadow:'0 4px 20px rgba(0,0,0,0.1)', display:'flex', alignItems:'center', gap:8, maxWidth:400 }}>
      <i className={`fas ${icon}`}></i>{msg}
    </div>
  )
}

// ─── Permission Matrix ──────────────────────────────────────────────────────────
function PermissionMatrix({ permissions, onChange, readonly=false }) {
  const byCategory = {}
  for (const p of permissions) {
    if (!byCategory[p.category]) byCategory[p.category] = []
    byCategory[p.category].push(p)
  }
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {ALL_CATEGORIES.map(cat => {
        const items = byCategory[cat]
        if (!items) return null
        return (
          <div key={cat}>
            <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>{cat}</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px,1fr))', gap:6 }}>
              {items.map(p => (
                <label key={p.menu_name} style={{ display:'flex', alignItems:'center', gap:8, cursor: readonly ? 'default' : 'pointer', padding:'6px 10px', borderRadius:8, background: p.can_access ? '#f0fdf4' : '#f8fafc', border:`1px solid ${p.can_access ? '#86efac' : '#e2e8f0'}`, fontSize:12 }}>
                  <input
                    type="checkbox"
                    checked={!!p.can_access}
                    disabled={readonly}
                    onChange={() => !readonly && onChange(p.menu_name, !p.can_access)}
                    style={{ accentColor:'#7c3aed' }}
                  />
                  <span style={{ color: p.can_access ? '#15803d' : '#94a3b8', fontWeight: p.can_access ? 600 : 400 }}>{p.display_name || p.menu_name}</span>
                </label>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Users Tab ─────────────────────────────────────────────────────────────────
function UsersTab({ toast }) {
  const [users, setUsers] = useState([])
  const [customers, setCustomers] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editRole, setEditRole] = useState('')
  const [editActive, setEditActive] = useState(true)
  const [linkingUserId, setLinkingUserId] = useState(null)
  const [linkCustomerId, setLinkCustomerId] = useState('')
  const [permUserId, setPermUserId] = useState(null)
  const [permData, setPermData] = useState([])
  const [form, setForm] = useState({ first_name:'', last_name:'', email:'', password:'', username:'', role:'', customer_id:'' })

  const load = async () => {
    setLoading(true)
    try {
      const [ur, cr, rr] = await Promise.all([api.getUsers(), api.getCustomers(), api.getRoles()])
      setUsers(ur.data?.users || [])
      const cl = cr.data?.customers || cr.data || []
      setCustomers(Array.isArray(cl) ? cl : [])
      const rl = rr.data || []
      setRoles(rl)
      // Set default role to first active role if not set
      if (rl.length) setForm(p => ({ ...p, role: p.role || rl[0].role_code }))
    } catch (e) { toast(e.message, 'error') }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openPermissions = async (userId) => {
    try {
      const res = await api.getUserPermissions(userId)
      const existing = res.data?.permissions || []
      const allMenus = [
        {name:'Dashboard',category:'General'},{name:'Invoices',category:'Sales'},{name:'Sales Order',category:'Sales'},
        {name:'Delivery Notes',category:'Sales'},{name:'Estimates/Quotations',category:'Sales'},{name:'Customer Payments',category:'Sales'},
        {name:'Bills',category:'Purchases'},{name:'Expenses',category:'Purchases'},{name:'Purchase Order',category:'Purchases'},{name:'Bill Payments',category:'Purchases'},
        {name:'Customer Center',category:'Contacts'},{name:'Vendor Center',category:'Contacts'},
        {name:'Product Center',category:'Inventory'},{name:'Stock Valuation',category:'Inventory'},{name:'Stock Mobility',category:'Inventory'},
        {name:'Financial Statements',category:'Reports'},{name:'Revenue & Sales Analysis',category:'Reports'},{name:'Cost & Expense Analytics',category:'Reports'},{name:'Receivables & Payables',category:'Reports'},{name:'Planning & Performance Analysis',category:'Reports'},
        {name:'Banking Center',category:'Banking'},
        {name:'Chart of Accounts',category:'Accounting'},{name:'Journal Entries',category:'Accounting'},{name:'General Ledger',category:'Accounting'},{name:'Trial Balance',category:'Accounting'},
        {name:'Recurring Documents',category:'Settings'},{name:'Company Settings',category:'Settings'},{name:'ERP Flow Guide',category:'Settings'},{name:'Tax',category:'Settings'},{name:'Ship Via',category:'Settings'},{name:'Users & Roles',category:'Settings'},{name:'Role Permissions',category:'Settings'},
      ]
      const permMap = {}
      for (const p of existing) permMap[p.menu_name] = p
      const merged = allMenus.map(m => ({
        menu_name: m.name, category: m.category,
        display_name: permMap[m.name]?.display_name || m.name,
        can_access: permMap[m.name] ? Boolean(permMap[m.name].can_access) : false,
      }))
      setPermData(merged)
      setPermUserId(userId)
    } catch (e) { toast(e.message, 'error') }
  }

  const savePermissions = async () => {
    try {
      // Only persist menus explicitly granted — user permissions are additive on
      // top of department permissions, so we only need to store the extras (can_access=true).
      const updates = permData
        .filter(p => p.can_access)
        .map(p => ({ menu_name: p.menu_name, can_access: true, display_name: p.display_name }))
      await api.updateUserPermissions(permUserId, updates)
      toast('Additional permissions saved')
      setPermUserId(null)
    } catch (e) { toast(e.message, 'error') }
  }

  const handleCreate = async () => {
    try {
      const payload = { first_name:form.first_name, last_name:form.last_name, email:form.email, password:form.password, username:form.username, role:form.role }
      if (form.customer_id) payload.customer_id = form.customer_id
      await api.createUser(payload)
      toast('User created')
      setShowForm(false)
      setForm({ first_name:'', last_name:'', email:'', password:'', username:'', role:'salesperson', customer_id:'' })
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  const saveEdit = async (id) => {
    try {
      await api.updateUser(id, { role:editRole, is_active:editActive })
      toast('User updated')
      setEditingId(null)
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete user "${name}"?`)) return
    try { await api.deleteUser(id); toast('User deleted'); load() }
    catch (e) { toast(e.message, 'error') }
  }

  const handleLink = async () => {
    try { await api.linkCustomer(linkingUserId, linkCustomerId); toast('Customer linked'); setLinkingUserId(null); load() }
    catch (e) { toast(e.message, 'error') }
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <span style={{ fontSize:14, color:'#64748b' }}>{users.length} user{users.length !== 1 ? 's' : ''}</span>
        <button onClick={() => setShowForm(!showForm)} style={btn('#7c3aed')}>
          <i className="fas fa-plus" style={{ marginRight:6 }}></i>New User
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div style={{ marginBottom:20, padding:20, background:'#f8fafc', borderRadius:10, border:'1px solid #e2e8f0' }}>
          <div style={{ fontSize:14, fontWeight:600, color:'#334155', marginBottom:14 }}>Create New User</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {[['first_name','First Name'],['last_name','Last Name'],['email','Email','email'],['password','Password','password'],['username','Username']].map(([f, label, type='text']) => (
              <div key={f}>
                <label style={labelStyle}>{label}</label>
                <input style={inputStyle} type={type} value={form[f]} onChange={e => {
                  const v = e.target.value
                  setForm(prev => {
                    const u = { ...prev, [f]: v }
                    if (f === 'email' && !prev._userManual) u.username = v.split('@')[0]
                    return u
                  })
                }} />
              </div>
            ))}
            <div>
              <label style={labelStyle}>Role</label>
              <select style={inputStyle} value={form.role} onChange={e => setForm(p => ({ ...p, role:e.target.value }))}>
                <option value="">-- Select Role --</option>
                {roles.filter(r => r.is_active).map(r => (
                  <option key={r.id} value={r.role_code}>{r.role_name}</option>
                ))}
              </select>
            </div>
            {form.role === 'customer' && (
              <div style={{ gridColumn:'span 2' }}>
                <label style={labelStyle}>Link to Customer (optional)</label>
                <select style={inputStyle} value={form.customer_id} onChange={e => setForm(p => ({ ...p, customer_id:e.target.value }))}>
                  <option value="">-- Select Customer --</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <div style={{ display:'flex', gap:10, marginTop:14, justifyContent:'flex-end' }}>
            <button onClick={() => setShowForm(false)} style={{ ...btn('#fff','#475569'), border:'1px solid #d1d5db' }}>Cancel</button>
            <button onClick={handleCreate} style={btn('#7c3aed')}>Create User</button>
          </div>
        </div>
      )}

      {/* Link Dialog */}
      {linkingUserId && (
        <div style={{ marginBottom:16, padding:14, background:'#eff6ff', borderRadius:10, border:'1px solid #bfdbfe', display:'flex', gap:10, alignItems:'center' }}>
          <select style={{ ...inputStyle, flex:1 }} value={linkCustomerId} onChange={e => setLinkCustomerId(e.target.value)}>
            <option value="">-- Select Customer --</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={handleLink} disabled={!linkCustomerId} style={{ ...btn('#2563eb'), opacity: linkCustomerId ? 1 : 0.5 }}>Link</button>
          <button onClick={() => setLinkingUserId(null)} style={{ ...btn('#fff','#475569'), border:'1px solid #d1d5db' }}>Cancel</button>
        </div>
      )}

      {/* User Permissions Side Panel */}
      {permUserId && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:10001, display:'flex', justifyContent:'flex-end' }}>
          <div style={{ width:'min(620px, 95vw)', background:'#fff', height:'100%', display:'flex', flexDirection:'column', boxShadow:'-4px 0 24px rgba(0,0,0,0.12)' }}>
            <div style={{ padding:'18px 24px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:16, fontWeight:700, color:'#1e293b' }}>Additional Permissions</div>
                <div style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>Grant extra access on top of department permissions — both apply together</div>
              </div>
              <button onClick={() => setPermUserId(null)} style={{ ...iconBtn('#64748b'), width:36, height:36 }}><i className="fas fa-times"></i></button>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
              <PermissionMatrix
                permissions={permData}
                onChange={(name, val) => setPermData(prev => prev.map(p => p.menu_name === name ? { ...p, can_access: val } : p))}
              />
            </div>
            <div style={{ padding:'16px 24px', borderTop:'1px solid #e2e8f0', display:'flex', justifyContent:'flex-end', gap:10 }}>
              <button onClick={() => setPermUserId(null)} style={{ ...btn('#fff','#475569'), border:'1px solid #d1d5db' }}>Cancel</button>
              <button onClick={savePermissions} style={btn('#7c3aed')}>Save Permissions</button>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      {loading ? (
        <div style={{ textAlign:'center', padding:40, color:'#64748b' }}><i className="fas fa-spinner fa-spin" style={{ fontSize:22 }}></i></div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
        <table style={{ width:'100%', minWidth: 640, borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ borderBottom:'2px solid #e2e8f0' }}>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Role</th>
              <th style={thStyle}>Department</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => {
              const roleObj = roles.find(r => r.role_code === user.role)
              const badge = roleColor(user.role)
              const isEditing = editingId === user.id
              return (
                <tr key={user.id} style={{ borderBottom:'1px solid #f1f5f9' }}>
                  <td style={tdStyle}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:30, height:30, borderRadius:'50%', background:'#ede9fe', color:'#7c3aed', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:12, flexShrink:0 }}>
                        {(user.first_name?.[0] || user.username?.[0] || '?').toUpperCase()}
                      </div>
                      <span>{user.first_name} {user.last_name}</span>
                    </div>
                  </td>
                  <td style={tdStyle}>{user.email}</td>
                  <td style={tdStyle}>
                    {isEditing ? (
                      <select value={editRole} onChange={e => setEditRole(e.target.value)} style={{ ...inputStyle, padding:'4px 8px', fontSize:12 }}>
                        {roles.filter(r => r.is_active).map(r => (
                          <option key={r.id} value={r.role_code}>{r.role_name}</option>
                        ))}
                      </select>
                    ) : (
                      <span style={{ padding:'3px 10px', borderRadius:12, fontSize:11, fontWeight:600, background:badge.bg, color:badge.color }}>{roleObj?.role_name || user.role}</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {user.department_name ? (
                      <span style={{ fontSize:12, color:'#4f46e5', fontWeight:500 }}><i className="fas fa-layer-group" style={{ marginRight:4 }}></i>{user.department_name}</span>
                    ) : <span style={{ color:'#cbd5e1', fontSize:12 }}>—</span>}
                  </td>
                  <td style={tdStyle}>
                    {isEditing ? (
                      <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:12 }}>
                        <input type="checkbox" checked={editActive} onChange={e => setEditActive(e.target.checked)} />
                        {editActive ? 'Active' : 'Inactive'}
                      </label>
                    ) : (
                      <span style={{ padding:'3px 10px', borderRadius:12, fontSize:11, fontWeight:600, background: user.is_active !== false ? '#dcfce7' : '#fee2e2', color: user.is_active !== false ? '#16a34a' : '#dc2626' }}>
                        {user.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display:'flex', gap:5 }}>
                      {isEditing ? (
                        <>
                          <button onClick={() => saveEdit(user.id)} title="Save" style={iconBtn('#16a34a')}><i className="fas fa-check"></i></button>
                          <button onClick={() => setEditingId(null)} title="Cancel" style={iconBtn('#94a3b8')}><i className="fas fa-times"></i></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditingId(user.id); setEditRole(user.role); setEditActive(user.is_active !== false) }} title="Edit" style={iconBtn('#2563eb')}><i className="fas fa-edit"></i></button>
                          <button onClick={() => openPermissions(user.id)} title="User Permissions" style={iconBtn('#7c3aed')}><i className="fas fa-shield-alt"></i></button>
                          {user.linked_customer_id ? (
                            <button onClick={async () => { try { await api.unlinkCustomer(user.id); toast('Unlinked'); load() } catch(e){ toast(e.message,'error') }}} title="Unlink Customer" style={iconBtn('#f59e0b')}><i className="fas fa-unlink"></i></button>
                          ) : (
                            <button onClick={() => { setLinkingUserId(user.id); setLinkCustomerId('') }} title="Link Customer" style={iconBtn('#0891b2')}><i className="fas fa-link"></i></button>
                          )}
                          {user.role !== 'admin' && (
                            <button onClick={() => handleDelete(user.id, `${user.first_name} ${user.last_name}`)} title="Delete" style={iconBtn('#dc2626')}><i className="fas fa-trash"></i></button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      )}
    </div>
  )
}

// ─── Departments Tab ────────────────────────────────────────────────────────────
function DepartmentsTab({ toast }) {
  const [depts, setDepts] = useState([])
  const [unassigned, setUnassigned] = useState([])
  const [selectedDept, setSelectedDept] = useState(null)
  const [deptDetail, setDeptDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newDept, setNewDept] = useState({ name:'', description:'', color:'#4f46e5' })
  const [dragOver, setDragOver] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadDepts = async () => {
    setLoading(true)
    try {
      const [dr, ur] = await Promise.all([api.getDepartments(), api.getUnassignedUsers()])
      setDepts(dr.data || [])
      setUnassigned(ur.data || [])
    } catch (e) { toast(e.message, 'error') }
    setLoading(false)
  }

  const loadDetail = async (deptId) => {
    try {
      const res = await api.getDepartment(deptId)
      setDeptDetail(res.data)
    } catch (e) { toast(e.message, 'error') }
  }

  useEffect(() => { loadDepts() }, [])

  const selectDept = (dept) => {
    setSelectedDept(dept)
    loadDetail(dept.id)
  }

  const handleCreate = async () => {
    if (!newDept.name.trim()) return toast('Department name is required', 'error')
    try {
      await api.createDepartment(newDept)
      toast('Department created')
      setShowCreate(false)
      setNewDept({ name:'', description:'', color:'#4f46e5' })
      loadDepts()
    } catch (e) { toast(e.message, 'error') }
  }

  const handleDelete = async (dept) => {
    if (!confirm(`Delete department "${dept.name}"? All members will be unassigned.`)) return
    try {
      await api.deleteDepartment(dept.id)
      toast('Department deleted')
      if (selectedDept?.id === dept.id) { setSelectedDept(null); setDeptDetail(null) }
      loadDepts()
    } catch (e) { toast(e.message, 'error') }
  }

  // Drag-and-drop: assign user to selected department
  const onDragStart = (e, user) => {
    e.dataTransfer.setData('user_id', user.id)
    e.dataTransfer.setData('user_json', JSON.stringify(user))
  }

  const onDropToDept = async (e) => {
    e.preventDefault()
    setDragOver(false)
    if (!selectedDept) return
    const userId = e.dataTransfer.getData('user_id')
    if (!userId) return
    try {
      await api.assignUserToDepartment(userId, selectedDept.id)
      toast('User added to department')
      await Promise.all([loadDepts(), loadDetail(selectedDept.id)])
      const ur = await api.getUnassignedUsers()
      setUnassigned(ur.data || [])
    } catch (e2) { toast(e2.message, 'error') }
  }

  const removeFromDept = async (userId) => {
    try {
      await api.assignUserToDepartment(userId, null)
      toast('User removed from department')
      await Promise.all([loadDepts(), loadDetail(selectedDept.id)])
      const ur = await api.getUnassignedUsers()
      setUnassigned(ur.data || [])
    } catch (e) { toast(e.message, 'error') }
  }

  const togglePerm = (menuName, val) => {
    setDeptDetail(prev => ({
      ...prev,
      permissions: prev.permissions.map(p => p.menu_name === menuName ? { ...p, can_access: val } : p)
    }))
  }

  const savePermissions = async () => {
    setSaving(true)
    try {
      await api.updateDepartmentPermissions(selectedDept.id, deptDetail.permissions.map(p => ({
        menu_name: p.menu_name, can_access: p.can_access, display_name: p.display_name
      })))
      toast('Department permissions saved')
    } catch (e) { toast(e.message, 'error') }
    setSaving(false)
  }

  if (loading) return <div style={{ textAlign:'center', padding:40, color:'#64748b' }}><i className="fas fa-spinner fa-spin" style={{ fontSize:22 }}></i></div>

  return (
    <div style={{ display:'grid', gridTemplateColumns:'260px 1fr', gap:20, minHeight:400 }}>
      {/* Left: Department List */}
      <div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <span style={{ fontSize:13, fontWeight:600, color:'#334155' }}>Departments</span>
          <button onClick={() => setShowCreate(!showCreate)} style={{ ...iconBtn('#4f46e5'), width:28, height:28, fontSize:13 }}><i className="fas fa-plus"></i></button>
        </div>

        {showCreate && (
          <div style={{ marginBottom:12, padding:14, background:'#f8fafc', borderRadius:10, border:'1px solid #e2e8f0' }}>
            <input style={{ ...inputStyle, marginBottom:8 }} placeholder="Department name" value={newDept.name} onChange={e => setNewDept(p => ({ ...p, name:e.target.value }))} />
            <input style={{ ...inputStyle, marginBottom:8 }} placeholder="Description (optional)" value={newDept.description} onChange={e => setNewDept(p => ({ ...p, description:e.target.value }))} />
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:11, color:'#94a3b8', marginBottom:6 }}>Color</div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {DEPT_PALETTE.map(c => (
                  <div key={c} onClick={() => setNewDept(p => ({ ...p, color:c }))} style={{ width:22, height:22, borderRadius:'50%', background:c, cursor:'pointer', border: newDept.color === c ? '3px solid #1e293b' : '2px solid transparent' }}></div>
                ))}
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setShowCreate(false)} style={{ flex:1, ...btn('#fff','#475569'), border:'1px solid #d1d5db', fontSize:12 }}>Cancel</button>
              <button onClick={handleCreate} style={{ flex:1, ...btn('#4f46e5'), fontSize:12 }}>Create</button>
            </div>
          </div>
        )}

        {depts.length === 0 ? (
          <div style={{ textAlign:'center', padding:30, color:'#cbd5e1', fontSize:13 }}>
            <i className="fas fa-layer-group" style={{ fontSize:28, display:'block', marginBottom:8 }}></i>
            No departments yet
          </div>
        ) : (
          depts.map(dept => (
            <div
              key={dept.id}
              onClick={() => selectDept(dept)}
              style={{ padding:'12px 14px', borderRadius:10, border:`2px solid ${selectedDept?.id === dept.id ? dept.color : '#e2e8f0'}`, background: selectedDept?.id === dept.id ? `${dept.color}0d` : '#fff', cursor:'pointer', marginBottom:8, position:'relative', transition:'all 0.15s' }}
            >
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:dept.color, flexShrink:0 }}></div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#1e293b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{dept.name}</div>
                  <div style={{ fontSize:11, color:'#94a3b8', marginTop:1 }}>{dept.member_count} member{dept.member_count !== 1 ? 's' : ''}</div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(dept) }}
                  style={{ ...iconBtn('#dc2626'), width:24, height:24, fontSize:11, opacity:0.6 }}
                  title="Delete department"
                ><i className="fas fa-trash"></i></button>
              </div>
            </div>
          ))
        )}

        {/* Unassigned Users Pool */}
        <div style={{ marginTop:20 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Unassigned Users</div>
          {unassigned.length === 0 ? (
            <div style={{ fontSize:12, color:'#cbd5e1', textAlign:'center', padding:12 }}>All users assigned</div>
          ) : (
            unassigned.map(u => (
              <div
                key={u.id}
                draggable
                onDragStart={e => onDragStart(e, u)}
                style={{ padding:'8px 12px', borderRadius:8, border:'1px dashed #c7d2fe', background:'#f5f3ff', marginBottom:6, cursor:'grab', display:'flex', alignItems:'center', gap:8, fontSize:12 }}
                title="Drag to a department"
              >
                <i className="fas fa-grip-vertical" style={{ color:'#a5b4fc', fontSize:10 }}></i>
                <div style={{ width:26, height:26, borderRadius:'50%', background:'#ede9fe', color:'#7c3aed', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:11, flexShrink:0 }}>
                  {(u.first_name?.[0] || u.username?.[0] || '?').toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, color:'#1e293b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.first_name} {u.last_name}</div>
                  <div style={{ color:'#94a3b8', fontSize:10 }}>{u.role}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right: Department Detail */}
      {!selectedDept ? (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'#cbd5e1', border:'2px dashed #e2e8f0', borderRadius:12 }}>
          <i className="fas fa-arrow-left" style={{ fontSize:22, marginBottom:10 }}></i>
          <div style={{ fontSize:14 }}>Select a department</div>
          <div style={{ fontSize:12, marginTop:4 }}>to manage members and permissions</div>
        </div>
      ) : !deptDetail ? (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8' }}><i className="fas fa-spinner fa-spin" style={{ fontSize:22 }}></i></div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {/* Dept Header */}
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', background:`${selectedDept.color}0d`, border:`1px solid ${selectedDept.color}33`, borderRadius:12 }}>
            <div style={{ width:14, height:14, borderRadius:'50%', background:selectedDept.color, flexShrink:0 }}></div>
            <div>
              <div style={{ fontSize:17, fontWeight:700, color:'#1e293b' }}>{deptDetail.name}</div>
              {deptDetail.description && <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>{deptDetail.description}</div>}
            </div>
            <div style={{ marginLeft:'auto', fontSize:12, color:'#94a3b8', fontWeight:500 }}>{deptDetail.members?.length || 0} member{(deptDetail.members?.length || 0) !== 1 ? 's' : ''}</div>
          </div>

          {/* Members Drop Zone */}
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:'#334155', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.05em' }}>
              <i className="fas fa-users" style={{ marginRight:6, color:selectedDept.color }}></i>Members
              <span style={{ fontSize:10, color:'#94a3b8', fontWeight:400, marginLeft:8 }}>Drag users from the left panel here</span>
            </div>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDropToDept}
              style={{ minHeight:80, border:`2px dashed ${dragOver ? selectedDept.color : '#e2e8f0'}`, borderRadius:12, padding:12, background: dragOver ? `${selectedDept.color}08` : '#f8fafc', transition:'all 0.15s', display:'flex', flexWrap:'wrap', gap:8, alignContent:'flex-start' }}
            >
              {(deptDetail.members || []).length === 0 && !dragOver && (
                <div style={{ width:'100%', textAlign:'center', color:'#cbd5e1', fontSize:13, padding:'16px 0' }}>
                  <i className="fas fa-hand-pointer" style={{ marginRight:6 }}></i>Drag users here to assign
                </div>
              )}
              {(deptDetail.members || []).map(m => (
                <div key={m.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 12px', background:'#fff', border:'1px solid #e2e8f0', borderRadius:8, fontSize:12 }}>
                  <div style={{ width:26, height:26, borderRadius:'50%', background:`${selectedDept.color}20`, color:selectedDept.color, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:11, flexShrink:0 }}>
                    {(m.first_name?.[0] || m.username?.[0] || '?').toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight:600, color:'#1e293b' }}>{m.first_name} {m.last_name}</div>
                    <div style={{ color:'#94a3b8', fontSize:10 }}>{m.role}</div>
                  </div>
                  <button onClick={() => removeFromDept(m.id)} style={{ ...iconBtn('#dc2626'), width:22, height:22, fontSize:10, marginLeft:4 }} title="Remove from department"><i className="fas fa-times"></i></button>
                </div>
              ))}
            </div>
          </div>

          {/* Permissions */}
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#334155', textTransform:'uppercase', letterSpacing:'0.05em' }}>
                <i className="fas fa-shield-alt" style={{ marginRight:6, color:selectedDept.color }}></i>Department Menu Access
              </div>
              <button onClick={savePermissions} disabled={saving} style={{ ...btn(selectedDept.color), fontSize:12, opacity: saving ? 0.7 : 1 }}>
                {saving ? <><i className="fas fa-spinner fa-spin" style={{ marginRight:6 }}></i>Saving…</> : <><i className="fas fa-save" style={{ marginRight:6 }}></i>Save Permissions</>}
              </button>
            </div>
            <PermissionMatrix
              permissions={deptDetail.permissions || []}
              onChange={togglePerm}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Roles Tab ──────────────────────────────────────────────────────────────────
function RolesTab({ toast }) {
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ role_code:'', role_name:'', description:'' })
  const [editForm, setEditForm] = useState({ role_name:'', description:'' })

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.getRoles()
      setRoles(res.data || [])
    } catch (e) { toast(e.message, 'error') }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!form.role_code.trim() || !form.role_name.trim()) return toast('Role Code and Role Name are required', 'error')
    try {
      await api.createRole({ role_code: form.role_code.trim().toLowerCase().replace(/\s+/g,'_'), role_name: form.role_name.trim(), description: form.description.trim() })
      toast('Role created')
      setShowForm(false)
      setForm({ role_code:'', role_name:'', description:'' })
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  const startEdit = (role) => {
    setEditingId(role.id)
    setEditForm({ role_name: role.role_name, description: role.description || '' })
  }

  const saveEdit = async (id) => {
    try {
      await api.updateRole(id, editForm)
      toast('Role updated')
      setEditingId(null)
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  const toggleActive = async (role) => {
    try {
      await api.updateRole(role.id, { is_active: !role.is_active })
      toast(role.is_active ? 'Role deactivated' : 'Role activated')
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  const handleDelete = async (role) => {
    if (!confirm(`Delete role "${role.role_name}"?`)) return
    try {
      await api.deleteRole(role.id)
      toast('Role deleted')
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ fontSize:13, color:'#64748b' }}>Define company roles — users are assigned these roles when created</div>
        <button onClick={() => setShowForm(!showForm)} style={btn('#7c3aed')}>
          <i className="fas fa-plus" style={{ marginRight:6 }}></i>New Role
        </button>
      </div>

      {showForm && (
        <div style={{ marginBottom:20, padding:20, background:'#f8fafc', borderRadius:10, border:'1px solid #e2e8f0' }}>
          <div style={{ fontSize:14, fontWeight:600, color:'#334155', marginBottom:14 }}>Create New Role</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={labelStyle}>Role Code <span style={{ color:'#94a3b8', fontWeight:400 }}>(unique identifier, e.g. "sales_mgr")</span></label>
              <input
                style={inputStyle}
                placeholder="e.g. sales_manager"
                value={form.role_code}
                onChange={e => setForm(p => ({ ...p, role_code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,'') }))}
              />
            </div>
            <div>
              <label style={labelStyle}>Role Name <span style={{ color:'#94a3b8', fontWeight:400 }}>(display name)</span></label>
              <input style={inputStyle} placeholder="e.g. Sales Manager" value={form.role_name} onChange={e => setForm(p => ({ ...p, role_name: e.target.value }))} />
            </div>
            <div style={{ gridColumn:'span 2' }}>
              <label style={labelStyle}>Description</label>
              <input style={inputStyle} placeholder="Brief description of this role's responsibilities" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:14, justifyContent:'flex-end' }}>
            <button onClick={() => setShowForm(false)} style={{ ...btn('#fff','#475569'), border:'1px solid #d1d5db' }}>Cancel</button>
            <button onClick={handleCreate} style={btn('#7c3aed')}>Create Role</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign:'center', padding:40, color:'#64748b' }}><i className="fas fa-spinner fa-spin" style={{ fontSize:22 }}></i></div>
      ) : roles.length === 0 ? (
        <div style={{ textAlign:'center', padding:48, color:'#94a3b8' }}>
          <i className="fas fa-id-badge" style={{ fontSize:36, display:'block', marginBottom:10 }}></i>
          No roles defined yet. Create your first role above.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
        <table style={{ width:'100%', minWidth: 560, borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ borderBottom:'2px solid #e2e8f0' }}>
              <th style={thStyle}>Role Code</th>
              <th style={thStyle}>Role Name</th>
              <th style={thStyle}>Description</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.map(role => {
              const isEditing = editingId === role.id
              const badge = roleColor(role.role_code)
              return (
                <tr key={role.id} style={{ borderBottom:'1px solid #f1f5f9' }}>
                  <td style={tdStyle}>
                    <span style={{ fontFamily:'monospace', fontSize:12, padding:'3px 8px', background:'#f1f5f9', borderRadius:6, color:'#334155' }}>{role.role_code}</span>
                  </td>
                  <td style={tdStyle}>
                    {isEditing ? (
                      <input style={{ ...inputStyle, padding:'5px 8px', fontSize:12 }} value={editForm.role_name} onChange={e => setEditForm(p => ({ ...p, role_name: e.target.value }))} />
                    ) : (
                      <span style={{ padding:'3px 10px', borderRadius:12, fontSize:11, fontWeight:600, background:badge.bg, color:badge.color }}>{role.role_name}</span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, color:'#64748b' }}>
                    {isEditing ? (
                      <input style={{ ...inputStyle, padding:'5px 8px', fontSize:12 }} value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} />
                    ) : (
                      role.description || <span style={{ color:'#cbd5e1' }}>—</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ padding:'3px 10px', borderRadius:12, fontSize:11, fontWeight:600, background: role.is_active ? '#dcfce7' : '#f1f5f9', color: role.is_active ? '#16a34a' : '#94a3b8' }}>
                      {role.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display:'flex', gap:5 }}>
                      {isEditing ? (
                        <>
                          <button onClick={() => saveEdit(role.id)} title="Save" style={iconBtn('#16a34a')}><i className="fas fa-check"></i></button>
                          <button onClick={() => setEditingId(null)} title="Cancel" style={iconBtn('#94a3b8')}><i className="fas fa-times"></i></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(role)} title="Edit" style={iconBtn('#2563eb')}><i className="fas fa-edit"></i></button>
                          <button onClick={() => toggleActive(role)} title={role.is_active ? 'Deactivate' : 'Activate'} style={iconBtn(role.is_active ? '#f59e0b' : '#16a34a')}>
                            <i className={`fas ${role.is_active ? 'fa-ban' : 'fa-check-circle'}`}></i>
                          </button>
                          <button onClick={() => handleDelete(role)} title="Delete" style={iconBtn('#dc2626')}><i className="fas fa-trash"></i></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      )}

      <div style={{ marginTop:20, padding:14, background:'#f0f9ff', borderRadius:10, border:'1px solid #bae6fd', fontSize:12, color:'#0369a1' }}>
        <i className="fas fa-info-circle" style={{ marginRight:6 }}></i>
        <strong>Note:</strong> Role is used as a label only. Access is controlled via <strong>Departments</strong> (assign users to departments with menu permissions) and <strong>Additional Permissions</strong> per user. Deleting a role is blocked if users are assigned to it.
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function UserManagement({ isOpen, onClose }) {
  const [tab, setTab] = useState('users')
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => setToast({ msg, type })

  if (!isOpen) return null

  const TABS = [
    { key: 'users', label: 'Users', icon: 'fa-users' },
    { key: 'departments', label: 'Departments', icon: 'fa-layer-group' },
    { key: 'roles', label: 'Roles', icon: 'fa-id-badge' },
  ]

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:9999, display:'flex', justifyContent:'center', alignItems:'flex-start', paddingTop:40, overflowY:'auto' }}>
        <div style={{ background:'#fff', borderRadius:14, width:'97%', maxWidth:1100, maxHeight:'calc(100vh - 60px)', display:'flex', flexDirection:'column', boxShadow:'0 24px 60px rgba(0,0,0,0.15)' }}>
          {/* Header */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'18px 24px', borderBottom:'1px solid #e2e8f0', flexShrink:0 }}>
            <h2 style={{ margin:0, fontSize:20, fontWeight:700, color:'#1e293b' }}>
              <i className="fas fa-users-cog" style={{ marginRight:10, color:'#7c3aed' }}></i>
              Users &amp; Permissions
            </h2>
            <button onClick={onClose} style={{ width:36, height:36, border:'none', background:'#f1f5f9', borderRadius:8, cursor:'pointer', fontSize:16, color:'#64748b' }}>
              <i className="fas fa-times"></i>
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display:'flex', gap:0, borderBottom:'1px solid #e2e8f0', padding:'0 24px', flexShrink:0 }}>
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{ padding:'12px 20px', border:'none', borderBottom: tab === t.key ? '2px solid #7c3aed' : '2px solid transparent', background:'none', cursor:'pointer', fontSize:13, fontWeight: tab === t.key ? 700 : 500, color: tab === t.key ? '#7c3aed' : '#64748b', display:'flex', alignItems:'center', gap:7, transition:'all 0.15s', marginBottom:'-1px' }}
              >
                <i className={`fas ${t.icon}`}></i>{t.label}
              </button>
            ))}
          </div>

          {/* Body */}
          <div style={{ flex:1, overflowY:'auto', padding:'24px' }}>
            {tab === 'users' && <UsersTab toast={showToast} />}
            {tab === 'departments' && <DepartmentsTab toast={showToast} />}
            {tab === 'roles' && <RolesTab toast={showToast} />}
          </div>
        </div>
      </div>
    </>
  )
}
