'use client'

import { useState, useEffect, useCallback } from 'react'
import styles from './RecurringCenter.module.css'
import * as api from '../lib/api'

const FREQ_LABELS = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
}

const TYPE_LABELS = {
  invoice: 'Invoice',
  bill: 'Bill',
  expense: 'Expense',
}

const emptyForm = {
  name: '',
  document_type: 'invoice',
  frequency: 'monthly',
  start_date: '',
  end_date: '',
  max_runs: '',
  description: '',
  notes: '',
}

export default function RecurringCenter({ isOpen, onClose }) {
  const [activeTab, setActiveTab]   = useState('active')
  const [documents, setDocuments]   = useState([])
  const [loading, setLoading]       = useState(false)
  const [listError, setListError]   = useState('')
  const [form, setForm]             = useState({ ...emptyForm })
  const [editingId, setEditingId]   = useState(null)
  const [saving, setSaving]         = useState(false)
  const [formError, setFormError]   = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [generating, setGenerating] = useState(null)

  const loadDocuments = useCallback(async () => {
    setLoading(true)
    setListError('')
    try {
      const res = await api.getRecurringDocuments()
      setDocuments(res.data || [])
    } catch (err) {
      setListError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (isOpen) loadDocuments() }, [isOpen, loadDocuments])

  useEffect(() => {
    if (!successMsg) return
    const t = setTimeout(() => setSuccessMsg(''), 4000)
    return () => clearTimeout(t)
  }, [successMsg])

  if (!isOpen) return null

  const activeDocs   = documents.filter(d =>  d.is_active)
  const inactiveDocs = documents.filter(d => !d.is_active)

  const resetForm = () => { setForm({ ...emptyForm }); setEditingId(null); setFormError('') }

  const handleNew = () => { resetForm(); setActiveTab('form') }

  const handleEdit = (doc) => {
    setForm({
      name:          doc.name || '',
      document_type: doc.document_type || 'invoice',
      frequency:     doc.frequency || 'monthly',
      start_date:    doc.start_date ? doc.start_date.split('T')[0] : '',
      end_date:      doc.end_date   ? doc.end_date.split('T')[0]   : '',
      max_runs:      doc.max_runs   || '',
      description:   doc.description || '',
      notes:         doc.template_data?.notes || '',
    })
    setEditingId(doc.id)
    setFormError('')
    setActiveTab('form')
  }

  const handleSave = async () => {
    if (!form.name.trim())  { setFormError('Name is required');       return }
    if (!form.start_date)   { setFormError('Start date is required'); return }

    setSaving(true)
    setFormError('')
    try {
      const payload = {
        name:          form.name.trim(),
        document_type: form.document_type,
        frequency:     form.frequency,
        start_date:    form.start_date,
        end_date:      form.end_date || null,
        max_runs:      form.max_runs ? parseInt(form.max_runs, 10) : null,
        description:   form.description || null,
        template_data: { notes: form.notes || '' },
      }

      if (editingId) {
        await api.updateRecurringDocument(editingId, payload)
        setSuccessMsg('Recurring document updated successfully')
      } else {
        await api.createRecurringDocument(payload)
        setSuccessMsg('Recurring document created successfully')
      }
      resetForm()
      setActiveTab('active')
      loadDocuments()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this recurring document?')) return
    try {
      await api.deleteRecurringDocument(id)
      setSuccessMsg('Recurring document deleted')
      loadDocuments()
    } catch (err) {
      setListError(err.message)
    }
  }

  const handleToggleActive = async (doc) => {
    try {
      await api.updateRecurringDocument(doc.id, { is_active: !doc.is_active })
      setSuccessMsg(doc.is_active ? 'Schedule paused' : 'Schedule resumed')
      loadDocuments()
    } catch (err) {
      setListError(err.message)
    }
  }

  const handleGenerate = async (id) => {
    setGenerating(id)
    try {
      const res    = await api.generateRecurringDocument(id)
      const result = res.data || {}
      const label  = TYPE_LABELS[result.document_type] || result.document_type
      setSuccessMsg(`${label} generated successfully (Run #${result.total_runs})`)
      loadDocuments()
    } catch (err) {
      setListError(err.message)
    } finally {
      setGenerating(null)
    }
  }

  const fmt = (d) => d ? new Date(d).toLocaleDateString() : '—'

  const typeBadgeClass = (type) =>
    type === 'invoice' ? styles.badgeInvoice :
    type === 'bill'    ? styles.badgeBill    : styles.badgeExpense

  const renderList = (docs) => {
    if (loading) {
      return (
        <div className={styles.loadingState}>
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading recurring documents…</p>
        </div>
      )
    }
    if (!docs.length) {
      return (
        <div className={styles.emptyState}>
          <i className="fas fa-sync-alt"></i>
          <h3>No recurring documents</h3>
          <p>Set up templates that automatically generate invoices, bills, or expenses on a schedule.</p>
          <button className={styles.btnPrimary} onClick={handleNew}>
            <i className="fas fa-plus"></i> Create First Template
          </button>
        </div>
      )
    }

    return (
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Frequency</th>
              <th>Last Run</th>
              <th>Next Run</th>
              <th>Runs</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((doc) => (
              <tr key={doc.id}>
                <td>{doc.name}</td>
                <td>
                  <span className={`${styles.badge} ${typeBadgeClass(doc.document_type)}`}>
                    {TYPE_LABELS[doc.document_type] || doc.document_type}
                  </span>
                </td>
                <td>{FREQ_LABELS[doc.frequency] || doc.frequency}</td>
                <td>{fmt(doc.last_run_date)}</td>
                <td>{fmt(doc.next_run_date)}</td>
                <td>{doc.total_runs}{doc.max_runs ? ` / ${doc.max_runs}` : ''}</td>
                <td>
                  <div className={styles.actionCell}>
                    <button
                      className={`${styles.btnIcon} ${styles.btnIconEdit}`}
                      title="Edit"
                      onClick={() => handleEdit(doc)}
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button
                      className={`${styles.btnIcon} ${styles.btnIconPause}`}
                      title={doc.is_active ? 'Pause schedule' : 'Resume schedule'}
                      onClick={() => handleToggleActive(doc)}
                    >
                      <i className={`fas fa-${doc.is_active ? 'pause' : 'play'}`}></i>
                    </button>
                    {doc.is_active && (
                      <button
                        className={styles.btnGenerate}
                        title="Generate document now"
                        onClick={() => handleGenerate(doc.id)}
                        disabled={generating === doc.id}
                      >
                        {generating === doc.id
                          ? <i className="fas fa-spinner fa-spin"></i>
                          : <i className="fas fa-bolt"></i>}
                        Generate
                      </button>
                    )}
                    <button
                      className={`${styles.btnIcon} ${styles.btnIconDanger}`}
                      title="Delete"
                      onClick={() => handleDelete(doc.id)}
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2>Recurring Documents</h2>
            <p>Automate invoices, bills, and expenses on a repeating schedule</p>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.btnPrimary} onClick={handleNew}>
              <i className="fas fa-plus"></i> New Template
            </button>
            <button className={styles.closeBtn} onClick={onClose} title="Close">
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        {/* ── Tab Navigation ──────────────────────────────────────────────── */}
        <div className={styles.tabBar}>
          <button
            className={`${styles.tab} ${activeTab === 'active' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('active')}
          >
            Active ({activeDocs.length})
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'inactive' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('inactive')}
          >
            Inactive ({inactiveDocs.length})
          </button>
          {activeTab === 'form' && (
            <button className={`${styles.tab} ${styles.tabActive}`}>
              {editingId ? 'Edit Template' : 'New Template'}
            </button>
          )}
        </div>

        {/* ── Global messages ─────────────────────────────────────────────── */}
        {listError  && <div className={styles.errorBanner}><i className="fas fa-exclamation-circle"></i> {listError}</div>}
        {successMsg && <div className={styles.successBanner}><i className="fas fa-check-circle"></i> {successMsg}</div>}

        {/* ── Content ─────────────────────────────────────────────────────── */}
        <div className={styles.contentArea}>

          {/* List views */}
          {activeTab === 'active'   && renderList(activeDocs)}
          {activeTab === 'inactive' && renderList(inactiveDocs)}

          {/* Form view */}
          {activeTab === 'form' && (
            <div className={styles.formCard}>
              <div className={styles.formCardHeader}>
                <h3>{editingId ? 'Edit Recurring Template' : 'New Recurring Template'}</h3>
                <p>Configure the schedule and document type that will be auto-generated</p>
              </div>

              <div className={styles.formCardBody}>
                {formError && (
                  <div className={styles.formError}>
                    <i className="fas fa-exclamation-circle"></i> {formError}
                  </div>
                )}

                {/* Schedule settings */}
                <div>
                  <p className={styles.sectionTitle}>Schedule Settings</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className={styles.field}>
                      <label>Template Name *</label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        placeholder="e.g. Monthly Office Rent Invoice"
                      />
                    </div>

                    <div className={styles.grid2}>
                      <div className={styles.field}>
                        <label>Document Type</label>
                        <select
                          value={form.document_type}
                          onChange={e => setForm({ ...form, document_type: e.target.value })}
                        >
                          <option value="invoice">Invoice</option>
                          <option value="bill">Bill</option>
                          <option value="expense">Expense</option>
                        </select>
                      </div>
                      <div className={styles.field}>
                        <label>Frequency</label>
                        <select
                          value={form.frequency}
                          onChange={e => setForm({ ...form, frequency: e.target.value })}
                        >
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                          <option value="annually">Annually</option>
                        </select>
                      </div>
                    </div>

                    <div className={styles.grid2}>
                      <div className={styles.field}>
                        <label>Start Date *</label>
                        <input
                          type="date"
                          value={form.start_date}
                          onChange={e => setForm({ ...form, start_date: e.target.value })}
                        />
                      </div>
                      <div className={styles.field}>
                        <label>End Date <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span></label>
                        <input
                          type="date"
                          value={form.end_date}
                          onChange={e => setForm({ ...form, end_date: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className={styles.field} style={{ maxWidth: 260 }}>
                      <label>Max Runs <span style={{ fontWeight: 400, color: '#9ca3af' }}>(blank = unlimited)</span></label>
                      <input
                        type="number"
                        min="1"
                        value={form.max_runs}
                        onChange={e => setForm({ ...form, max_runs: e.target.value })}
                        placeholder="Unlimited"
                      />
                    </div>
                  </div>
                </div>

                {/* Template details */}
                <div>
                  <p className={styles.sectionTitle}>Template Details</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className={styles.field}>
                      <label>Description <span style={{ fontWeight: 400, color: '#9ca3af' }}>(internal reference)</span></label>
                      <textarea
                        rows={2}
                        value={form.description}
                        onChange={e => setForm({ ...form, description: e.target.value })}
                        placeholder="Optional internal notes about this template"
                      />
                    </div>
                    <div className={styles.field}>
                      <label>Document Notes <span style={{ fontWeight: 400, color: '#9ca3af' }}>(appears on generated documents)</span></label>
                      <textarea
                        rows={3}
                        value={form.notes}
                        onChange={e => setForm({ ...form, notes: e.target.value })}
                        placeholder="Notes to include on every generated document"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.formFooter}>
                <button className={styles.btnPrimary} onClick={handleSave} disabled={saving}>
                  {saving
                    ? <><i className="fas fa-spinner fa-spin"></i> Saving…</>
                    : editingId ? 'Update Template' : 'Create Template'}
                </button>
                <button
                  className={styles.btnSecondary}
                  onClick={() => { resetForm(); setActiveTab('active') }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
