'use client'

import { useState, useEffect } from 'react'
import styles from './TaxConfiguration.module.css'
import popupStyles from './TaxPopup.module.css'
import * as api from '@/lib/api'

const DOCUMENT_TYPES = [
  { value: 'purchase_order', label: 'Purchase Order' },
  { value: 'bill', label: 'Bill' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'expense', label: 'Expense' },
]

const docTypeLabel = (v) => DOCUMENT_TYPES.find((d) => d.value === v)?.label || v

const emptyForm = {
  document_type: 'purchase_order',
  min_amount: '0',
  max_amount: '',
  approver_role: '',
  step_order: '1',
  is_active: true,
}

export default function ApprovalWorkflowConfig({ isOpen, onClose }) {
  const [rules, setRules] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const fetchRules = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.getApprovalRules()
      setRules(res.data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchRoles = async () => {
    try {
      const res = await api.getRoles()
      setRoles(res.data || [])
    } catch {
      // non-fatal — admin can type a role manually
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchRules()
      fetchRoles()
    }
  }, [isOpen])

  if (!isOpen) return null

  const filtered = rules.filter((r) => {
    const t = searchTerm.toLowerCase()
    return (
      docTypeLabel(r.document_type).toLowerCase().includes(t) ||
      (r.approver_role || '').toLowerCase().includes(t)
    )
  })

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setFormError('')
    setFormOpen(true)
  }

  const openEdit = (rule) => {
    setEditingId(rule.id)
    setForm({
      document_type: rule.document_type,
      min_amount: String(rule.min_amount ?? '0'),
      max_amount: rule.max_amount == null ? '' : String(rule.max_amount),
      approver_role: rule.approver_role || '',
      step_order: String(rule.step_order ?? '1'),
      is_active: !!rule.is_active,
    })
    setFormError('')
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingId(null)
    setForm(emptyForm)
    setFormError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    if (!form.approver_role.trim()) {
      setFormError('Approver role is required')
      return
    }
    const minAmt = parseFloat(form.min_amount || '0')
    if (isNaN(minAmt) || minAmt < 0) {
      setFormError('Min amount must be a non-negative number')
      return
    }
    let maxAmt = null
    if (form.max_amount !== '' && form.max_amount != null) {
      maxAmt = parseFloat(form.max_amount)
      if (isNaN(maxAmt) || maxAmt < 0) {
        setFormError('Max amount must be a non-negative number or blank')
        return
      }
      if (maxAmt < minAmt) {
        setFormError('Max amount must be greater than or equal to min amount')
        return
      }
    }
    const payload = {
      document_type: form.document_type,
      min_amount: minAmt,
      max_amount: maxAmt,
      approver_role: form.approver_role.trim(),
      step_order: parseInt(form.step_order || '1', 10) || 1,
      is_active: !!form.is_active,
    }
    setSaving(true)
    try {
      if (editingId) {
        await api.updateApprovalRule(editingId, payload)
      } else {
        await api.createApprovalRule(payload)
      }
      await fetchRules()
      closeForm()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Deactivate this approval rule? Existing pending requests are preserved.')) return
    try {
      await api.deleteApprovalRule(id)
      await fetchRules()
    } catch (err) {
      alert('Delete failed: ' + err.message)
    }
  }

  const handleToggleActive = async (rule) => {
    try {
      await api.updateApprovalRule(rule.id, { is_active: !rule.is_active })
      await fetchRules()
    } catch (err) {
      alert('Toggle failed: ' + err.message)
    }
  }

  const renderAmountRange = (r) => {
    const min = Number(r.min_amount || 0)
    if (r.max_amount == null) return `≥ ${min.toFixed(2)}`
    const max = Number(r.max_amount)
    return `${min.toFixed(2)} – ${max.toFixed(2)}`
  }

  return (
    <>
      <div className={styles.taxConfigOverlay}>
        <div className={styles.taxConfigContainer}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <h2>Approval Workflows</h2>
            </div>
            <div className={styles.headerRight}>
              <button className={styles.btnAddTax} onClick={openAdd}>
                <i className="fas fa-plus"></i>
                Add Rule
              </button>
              <button className={styles.closeBtn} onClick={onClose}>
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>

          {/* Search */}
          <div className={styles.searchSection}>
            <div className={styles.searchWrapper}>
              <i className="fas fa-search"></i>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search by document type or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className={styles.btnRefresh} onClick={fetchRules} title="Refresh">
              <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
            </button>
          </div>

          {error && (
            <div className={styles.errorBanner}>
              <i className="fas fa-exclamation-circle"></i> {error}
            </div>
          )}

          {/* Table */}
          <div className={styles.taxGridContainer}>
            {loading ? (
              <div className={styles.loadingState}>
                <i className="fas fa-spinner fa-spin"></i>
                <p>Loading rules...</p>
              </div>
            ) : filtered.length > 0 ? (
              <table className={styles.taxTable}>
                <thead>
                  <tr>
                    <th>Document Type</th>
                    <th>Amount Range</th>
                    <th>Approver Role</th>
                    <th>Step</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div className={styles.nameCell}>
                          <div className={styles.taxIcon}><i className="fas fa-file-signature"></i></div>
                          <span>{docTypeLabel(r.document_type)}</span>
                        </div>
                      </td>
                      <td>{renderAmountRange(r)}</td>
                      <td>{r.approver_role}</td>
                      <td>{r.step_order}</td>
                      <td>
                        <button
                          className={`${styles.statusBadge} ${r.is_active ? styles.statusActive : styles.statusInactive}`}
                          onClick={() => handleToggleActive(r)}
                          title="Click to toggle status"
                        >
                          {r.is_active ? (
                            <><i className="fas fa-check-circle"></i> Active</>
                          ) : (
                            <><i className="fas fa-times-circle"></i> Inactive</>
                          )}
                        </button>
                      </td>
                      <td>
                        <div className={styles.actionButtons}>
                          <button className={styles.btnEdit} title="Edit" onClick={() => openEdit(r)}>
                            <i className="fas fa-edit"></i>
                          </button>
                          <button className={styles.btnDelete} title="Delete" onClick={() => handleDelete(r.id)}>
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
                <i className="fas fa-file-signature"></i>
                <p>No approval rules configured</p>
                <button className={styles.btnAddTax} onClick={openAdd}>
                  <i className="fas fa-plus"></i>
                  Create Your First Rule
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit side panel — matches TaxPopup pattern */}
      {formOpen && (
        <div className={popupStyles.popupOverlay} onClick={closeForm}>
          <div className={popupStyles.popupPanel} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className={popupStyles.popupHeader}>
              <h2>{editingId ? 'Edit Approval Rule' : 'New Approval Rule'}</h2>
              <button className={popupStyles.closeBtn} onClick={closeForm}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Content */}
            <div className={popupStyles.popupContent}>
              <form id="approval-form" onSubmit={handleSubmit}>
                {formError && (
                  <div className={styles.errorBanner} style={{ marginBottom: 16 }}>
                    <i className="fas fa-exclamation-circle"></i> {formError}
                  </div>
                )}

                <div className={popupStyles.section}>
                  <h3>Rule Details</h3>

                  <div className={popupStyles.formGroup} style={{ marginBottom: 15 }}>
                    <label>Document Type *</label>
                    <select
                      className={popupStyles.formControl}
                      value={form.document_type}
                      onChange={(e) => setForm({ ...form, document_type: e.target.value })}
                    >
                      {DOCUMENT_TYPES.map((d) => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className={popupStyles.formRow}>
                    <div className={popupStyles.formGroup}>
                      <label>Min Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className={popupStyles.formControl}
                        value={form.min_amount}
                        onChange={(e) => setForm({ ...form, min_amount: e.target.value })}
                      />
                    </div>
                    <div className={popupStyles.formGroup}>
                      <label>Max Amount <span style={{ color: '#94a3b8', fontWeight: 400 }}>(blank = no limit)</span></label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className={popupStyles.formControl}
                        value={form.max_amount}
                        onChange={(e) => setForm({ ...form, max_amount: e.target.value })}
                        placeholder="No limit"
                      />
                    </div>
                  </div>

                  <div className={popupStyles.formGroup} style={{ marginBottom: 15 }}>
                    <label>Approver Role *</label>
                    {roles.length > 0 ? (
                      <select
                        className={popupStyles.formControl}
                        value={form.approver_role}
                        onChange={(e) => setForm({ ...form, approver_role: e.target.value })}
                      >
                        <option value="">— Select role —</option>
                        <option value="admin">admin</option>
                        {roles.map((r) => (
                          <option key={r.id} value={r.role_code}>{r.role_name} ({r.role_code})</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        className={popupStyles.formControl}
                        value={form.approver_role}
                        onChange={(e) => setForm({ ...form, approver_role: e.target.value })}
                        placeholder="e.g., admin, accountant, manager"
                      />
                    )}
                  </div>

                  <div className={popupStyles.formRow}>
                    <div className={popupStyles.formGroup}>
                      <label>Step Order</label>
                      <input
                        type="number"
                        min="1"
                        className={popupStyles.formControl}
                        value={form.step_order}
                        onChange={(e) => setForm({ ...form, step_order: e.target.value })}
                      />
                    </div>
                    <div className={popupStyles.formGroup} style={{ justifyContent: 'flex-end' }}>
                      <label>&nbsp;</label>
                      <label className={popupStyles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={form.is_active}
                          onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                        />
                        <span>Active</span>
                      </label>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className={popupStyles.popupFooter}>
              <button type="button" className={popupStyles.btnCancel} onClick={closeForm}>
                Cancel
              </button>
              <button
                type="submit"
                form="approval-form"
                className={popupStyles.btnPrimary}
                disabled={saving}
              >
                {saving ? <><i className="fas fa-spinner fa-spin"></i> Saving…</> : editingId ? 'Save Changes' : 'Create Rule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
